'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { getRealtimeClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getMyInvitations, respondToInvitation } from '@/actions/rooms'
import { getUserInvitationsChannel, getRoomSyncChannel, INVITATION_EVENTS, CUP_TASTERS_EVENTS } from '@cuppingtraining/shared/constants'
import type { Room, RoomInvitation, PublicProfile } from '@cuppingtraining/shared/types'

type InvitationWithDetails = RoomInvitation & {
  room: Room
  inviter: PublicProfile | null
}

const AUTO_DISMISS_MS = 30_000

// Paths where we skip showing notifications (user is already in a room)
const SUPPRESSED_PATHS = ['/rooms/', '/cupping/']

export function GlobalInvitationNotifier() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()
  const realtime = useMemo(() => getRealtimeClient(), [])
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([])
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isSuppressed = SUPPRESSED_PATHS.some((p) => pathname.startsWith(p))

  const loadInvitations = useCallback(async () => {
    const result = await getMyInvitations()
    if (result.invitations && result.invitations.length > 0) {
      setInvitations(result.invitations)
      setDismissed(false)
    }
  }, [])

  // Subscribe to broadcast channel for new invitations
  useEffect(() => {
    if (!user?.id) return

    const channel = realtime
      .channel(getUserInvitationsChannel(user.id))
      .on('broadcast', { event: INVITATION_EVENTS.NEW_INVITATION }, () => {
        loadInvitations()
      })
      .subscribe()

    return () => {
      realtime.removeChannel(channel)
    }
  }, [user?.id, realtime, loadInvitations])

  // Auto-dismiss timer: reset whenever invitations change
  useEffect(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }

    if (invitations.length > 0 && !dismissed) {
      dismissTimerRef.current = setTimeout(() => {
        setDismissed(true)
      }, AUTO_DISMISS_MS)
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }
    }
  }, [invitations, dismissed])

  const handleRespond = async (invitationId: string, accept: boolean) => {
    setRespondingId(invitationId)

    const result = await respondToInvitation(invitationId, accept)

    if (result.success) {
      if (accept) {
        const invitation = invitations.find((i) => i.id === invitationId)
        if (invitation) {
          // Broadcast room_updated so the host's room page refreshes
          const notifyChannel = realtime.channel(getRoomSyncChannel(invitation.room_id))
          notifyChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              notifyChannel.send({ type: 'broadcast', event: CUP_TASTERS_EVENTS.ROOM_UPDATED, payload: {} })
              setTimeout(() => realtime.removeChannel(notifyChannel), 1000)
            }
          })
          const path = invitation.room.type === 'cupping'
            ? `/cupping/${invitation.room_id}`
            : `/rooms/${invitation.room_id}`
          setInvitations([])
          router.push(path)
          return
        }
      }
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId))
    }

    setRespondingId(null)
  }

  const handleDismissAll = () => {
    setDismissed(true)
  }

  // Don't render if: not signed in, suppressed path, no invitations, or dismissed
  if (!user || isSuppressed || invitations.length === 0 || dismissed) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="w-80 max-h-[80vh] overflow-y-auto rounded-xl border bg-background shadow-2xl p-5 space-y-3 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Room Invitations</p>
          <button
            onClick={handleDismissAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
          >
            Dismiss
          </button>
        </div>

        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="rounded-lg border bg-muted/30 p-4"
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-9 w-9 mt-0.5">
                <AvatarImage
                  src={invitation.inviter?.photo_url || undefined}
                  alt={invitation.inviter?.username || 'Host'}
                />
                <AvatarFallback>
                  {invitation.inviter?.username?.[0]?.toUpperCase() || 'H'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {invitation.room.name || 'Training Room'}
                </p>
                <p className="text-xs text-muted-foreground">
                  From @{invitation.inviter?.username || 'Unknown'}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs flex-1"
                    onClick={() => handleRespond(invitation.id, false)}
                    disabled={respondingId === invitation.id}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs flex-1"
                    onClick={() => handleRespond(invitation.id, true)}
                    disabled={respondingId === invitation.id}
                  >
                    {respondingId === invitation.id ? '...' : 'Accept'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
