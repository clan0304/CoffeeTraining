'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getRoomDetails, inviteUserByUsername, cancelInvitation, deleteRoom } from '@/actions/rooms'
import type { Room, RoomPlayer, RoomInvitation, PublicProfile } from '@/types/database'

type RoomWithDetails = Room & {
  players: Array<RoomPlayer & { profile: PublicProfile | null }>
  invitations: Array<RoomInvitation & { invited_profile: PublicProfile | null }>
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const roomId = params.id as string

  const [room, setRoom] = useState<RoomWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const loadRoom = useCallback(async () => {
    const result = await getRoomDetails(roomId)
    if (result.error) {
      setError(result.error)
    } else if (result.room) {
      setRoom(result.room)
    }
    setLoading(false)
  }, [roomId])

  useEffect(() => {
    loadRoom()
  }, [loadRoom])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteUsername.trim()) return

    setInviteLoading(true)
    setInviteError(null)
    setInviteSuccess(null)

    const result = await inviteUserByUsername(roomId, inviteUsername.trim())

    if (result.error) {
      setInviteError(result.error)
    } else {
      setInviteSuccess(`Invitation sent to @${inviteUsername}`)
      setInviteUsername('')
      loadRoom() // Refresh room data
    }

    setInviteLoading(false)
  }

  const handleCancelInvitation = async (invitationId: string) => {
    const result = await cancelInvitation(invitationId)
    if (!result.error) {
      loadRoom()
    }
  }

  const handleDeleteRoom = async () => {
    if (!confirm('Are you sure you want to delete this room?')) return

    const result = await deleteRoom(roomId)
    if (result.success) {
      router.push('/')
    }
  }

  const copyRoomCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.code)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading room...</p>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-8 text-center">
          <h1 className="text-2xl font-bold">Room Not Found</h1>
          <p className="text-muted-foreground">{error || 'This room does not exist.'}</p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isHost = user?.id === room.host_id
  const pendingInvitations = room.invitations.filter((i) => i.status === 'pending')

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{room.name || 'Training Room'}</h1>
            <p className="text-sm text-muted-foreground">
              {room.status === 'waiting' ? 'Waiting for players' : room.status}
            </p>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm">Exit</Button>
          </Link>
        </div>

        {/* Room Code */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Room Code</CardTitle>
            <CardDescription>Share this code with others to join</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center text-3xl font-mono font-bold tracking-widest bg-muted rounded-lg py-4">
                {room.code}
              </div>
              <Button variant="outline" onClick={copyRoomCode}>
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invite by Username (Host only) */}
        {isHost && room.status === 'waiting' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Invite Player</CardTitle>
              <CardDescription>Invite someone by their username</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter username"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    disabled={inviteLoading}
                  />
                  <Button type="submit" disabled={inviteLoading || !inviteUsername.trim()}>
                    {inviteLoading ? '...' : 'Invite'}
                  </Button>
                </div>
                {inviteError && (
                  <p className="text-sm text-red-500">{inviteError}</p>
                )}
                {inviteSuccess && (
                  <p className="text-sm text-green-600">{inviteSuccess}</p>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {/* Pending Invitations */}
        {isHost && pendingInvitations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={invitation.invited_profile?.photo_url || undefined}
                        alt={invitation.invited_profile?.username || 'User'}
                      />
                      <AvatarFallback>
                        {invitation.invited_profile?.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      @{invitation.invited_profile?.username || 'Unknown'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Players */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              Players ({room.players.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {room.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 py-2 border-b last:border-0"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={player.profile?.photo_url || undefined}
                    alt={player.profile?.username || 'User'}
                  />
                  <AvatarFallback>
                    {player.profile?.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    @{player.profile?.username || 'Unknown'}
                    {player.user_id === room.host_id && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Host
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}

            {room.players.length === 1 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Invite players or share the room code
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timer Info */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Timer Duration</span>
              <span className="font-medium">{room.timer_minutes} minutes</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {isHost && room.status === 'waiting' && (
            <>
              <Button
                className="w-full"
                size="lg"
                disabled={room.players.length < 2}
              >
                Start Game
              </Button>
              {room.players.length < 2 && (
                <p className="text-xs text-muted-foreground text-center">
                  Need at least 2 players to start
                </p>
              )}
            </>
          )}

          {isHost && (
            <Button
              variant="outline"
              className="w-full text-red-500 hover:text-red-600"
              onClick={handleDeleteRoom}
            >
              Delete Room
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
