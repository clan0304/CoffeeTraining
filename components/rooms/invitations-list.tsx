'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getMyInvitations, respondToInvitation } from '@/actions/rooms'
import type { Room, RoomInvitation, PublicProfile } from '@/types/database'

type InvitationWithDetails = RoomInvitation & {
  room: Room
  inviter: PublicProfile | null
}

export function InvitationsList() {
  const router = useRouter()
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState<string | null>(null)

  const loadInvitations = useCallback(async () => {
    const result = await getMyInvitations()
    if (result.invitations) {
      setInvitations(result.invitations)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadInvitations()
  }, [loadInvitations])

  const handleRespond = async (invitationId: string, accept: boolean) => {
    setRespondingId(invitationId)

    const result = await respondToInvitation(invitationId, accept)

    if (result.success) {
      if (accept) {
        // Find the invitation to get the room ID
        const invitation = invitations.find((i) => i.id === invitationId)
        if (invitation) {
          router.push(`/rooms/${invitation.room_id}`)
          return
        }
      }
      // Remove from list
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId))
    }

    setRespondingId(null)
  }

  if (loading) {
    return null // Don't show anything while loading
  }

  if (invitations.length === 0) {
    return null // Don't show empty section
  }

  return (
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Pending Invitations ({invitations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between py-3 border-b last:border-0"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={invitation.inviter?.photo_url || undefined}
                    alt={invitation.inviter?.username || 'Host'}
                  />
                  <AvatarFallback>
                    {invitation.inviter?.username?.[0]?.toUpperCase() || 'H'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {invitation.room.name || 'Training Room'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    From @{invitation.inviter?.username || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRespond(invitation.id, false)}
                  disabled={respondingId === invitation.id}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRespond(invitation.id, true)}
                  disabled={respondingId === invitation.id}
                >
                  {respondingId === invitation.id ? '...' : 'Accept'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
