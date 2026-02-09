'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser, useSession } from '@clerk/nextjs'
import { useSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Timer } from '@/components/training/timer'
import { AnswerSheet } from '@/components/training/answer-sheet'
import { Countdown } from '@/components/training/countdown'
import {
  getRoomDetails,
  inviteUserByUsername,
  cancelInvitation,
  deleteRoom,
  startGame,
  beginPlaying,
  addCoffee,
  removeCoffee,
  generateTriangulationSet,
  createEmptySet,
  updateSetRow,
  deleteSet,
} from '@/actions/rooms'
import type { Room, RoomPlayer, RoomInvitation, PublicProfile, RoomCoffee, RoomSet, RoomSetRow } from '@/types/database'

type RoomWithDetails = Room & {
  players: Array<RoomPlayer & { profile: PublicProfile | null }>
  invitations: Array<RoomInvitation & { invited_profile: PublicProfile | null }>
  coffees: RoomCoffee[]
  sets: Array<RoomSet & { rows: Array<RoomSetRow & { pair_coffee: RoomCoffee; odd_coffee: RoomCoffee }> }>
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { session } = useSession()
  const supabase = useSupabaseClient()
  const roomId = params.id as string

  const [room, setRoom] = useState<RoomWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [startingGame, setStartingGame] = useState(false)

  // Coffee management
  const [coffeeName, setCoffeeName] = useState('')
  const [coffeeLoading, setCoffeeLoading] = useState(false)

  // Set management
  const [generatingSet, setGeneratingSet] = useState(false)
  const [creatingManualSet, setCreatingManualSet] = useState(false)
  const [editingSetId, setEditingSetId] = useState<string | null>(null)

  // Game state
  const [showCountdown, setShowCountdown] = useState(false)
  const [gamePhase, setGamePhase] = useState<'playing' | 'inputting' | 'finished'>('playing')
  const [answers, setAnswers] = useState<(number | null)[]>(Array(8).fill(null))
  const [correctAnswers, setCorrectAnswers] = useState<(number | null)[]>(Array(8).fill(null))

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

  // Watch room status and show countdown when status is 'countdown'
  // This is a fallback in case realtime doesn't trigger immediately
  useEffect(() => {
    if (room?.status === 'countdown' && !showCountdown) {
      setShowCountdown(true)
    }
  }, [room?.status, showCountdown])

  // Store channel ref for broadcasting
  const [roomChannel, setRoomChannel] = useState<ReturnType<typeof supabase.channel> | null>(null)
  const [channelReady, setChannelReady] = useState(false)

  // Real-time subscription using Broadcast (doesn't require RLS)
  useEffect(() => {
    if (!roomId || !supabase) return

    console.log('[Realtime] Setting up channel for room:', roomId)

    // Create a single channel for the room with broadcast capability
    const channel = supabase.channel(`room_sync_${roomId}`, {
      config: {
        broadcast: { self: true }, // Receive own broadcasts too
      },
    })

    // Listen for game events via broadcast (instant, no RLS needed)
    channel.on('broadcast', { event: 'game_start' }, (payload) => {
      console.log('[Realtime] Received game_start broadcast:', payload)
      setShowCountdown(true)
    })

    // Listen for game_playing event (host broadcasts exact timer start)
    channel.on('broadcast', { event: 'game_playing' }, (payload) => {
      console.log('[Realtime] Received game_playing broadcast:', payload)
      const { timerStartedAt } = payload.payload as { timerStartedAt: string }
      // End countdown if still showing
      setShowCountdown(false)
      // Reset game state
      setAnswers(Array(8).fill(null))
      setCorrectAnswers(Array(8).fill(null))
      setGamePhase('playing')
      // Update room state with the exact server timestamp
      setRoom((prev) => prev ? { ...prev, status: 'playing' as const, timer_started_at: timerStartedAt } : prev)
    })

    // Listen for room data changes via broadcast
    channel.on('broadcast', { event: 'room_updated' }, async (payload) => {
      console.log('[Realtime] Received room_updated broadcast:', payload)
      // Fetch fresh room data
      const result = await getRoomDetails(roomId)
      if (!result.error && result.room) {
        setRoom(result.room)
      }
    })

    channel.subscribe((status) => {
      console.log('[Realtime] Channel status:', status)
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Channel subscribed successfully!')
        setRoomChannel(channel)
        setChannelReady(true)
      }
    })

    return () => {
      console.log('[Realtime] Cleaning up channel')
      supabase.removeChannel(channel)
      setRoomChannel(null)
      setChannelReady(false)
    }
  }, [roomId, supabase]) // Removed loadRoom from deps to prevent recreation

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
      loadRoom()
      // Broadcast update to all players
      roomChannel?.send({ type: 'broadcast', event: 'room_updated', payload: {} })
    }

    setInviteLoading(false)
  }

  const handleCancelInvitation = async (invitationId: string) => {
    const result = await cancelInvitation(invitationId)
    if (!result.error) {
      loadRoom()
      roomChannel?.send({ type: 'broadcast', event: 'room_updated', payload: {} })
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

  const handleStartGame = async () => {
    setStartingGame(true)

    // Try to set status to 'countdown' in database
    const result = await startGame(roomId)

    if (result.error) {
      console.warn('Start game error:', result.error)
    }

    // Show countdown immediately for host
    setShowCountdown(true)

    // Broadcast game_start to all other players in the room
    console.log('[Realtime] Broadcasting game_start, channel ready:', channelReady, 'channel:', !!roomChannel)
    if (roomChannel) {
      const sendResult = await roomChannel.send({
        type: 'broadcast',
        event: 'game_start',
        payload: { startedAt: Date.now() },
      })
      console.log('[Realtime] Broadcast send result:', sendResult)
    } else {
      console.warn('[Realtime] Channel not ready, cannot broadcast')
    }

    setStartingGame(false)
  }

  const handleCountdownComplete = async () => {
    if (user?.id === room?.host_id) {
      // Host: write to DB, get exact timestamp, broadcast to all players
      const result = await beginPlaying(roomId)
      if (result.error) {
        console.error('Begin playing error:', result.error)
        return
      }

      const timerStartedAt = result.timerStartedAt!

      // Update own state
      setShowCountdown(false)
      setAnswers(Array(8).fill(null))
      setCorrectAnswers(Array(8).fill(null))
      setGamePhase('playing')
      setRoom((prev) => prev ? { ...prev, status: 'playing' as const, timer_started_at: timerStartedAt } : prev)

      // Broadcast the exact timestamp to all other players
      roomChannel?.send({
        type: 'broadcast',
        event: 'game_playing',
        payload: { timerStartedAt },
      })
    } else {
      // Non-host: just reset local countdown state.
      // The game_playing broadcast listener handles the rest.
      setShowCountdown(false)
      setAnswers(Array(8).fill(null))
      setCorrectAnswers(Array(8).fill(null))
      setGamePhase('playing')
    }
  }

  const handleTimeUp = () => {
    setGamePhase('inputting')
  }

  const handleSubmitAnswers = () => {
    setGamePhase('inputting')
  }

  const handleAnswerChange = (rowIndex: number, position: number) => {
    setAnswers((prev) => {
      const newAnswers = [...prev]
      newAnswers[rowIndex] = prev[rowIndex] === position ? null : position
      return newAnswers
    })
  }

  const handleCorrectAnswerChange = (rowIndex: number, position: number) => {
    setCorrectAnswers((prev) => {
      const newCorrect = [...prev]
      newCorrect[rowIndex] = prev[rowIndex] === position ? null : position
      return newCorrect
    })
  }

  const handleBackToLobby = () => {
    setGamePhase('playing')
    setAnswers(Array(8).fill(null))
    setCorrectAnswers(Array(8).fill(null))
    loadRoom()
  }

  // Helper to broadcast room updates
  const broadcastUpdate = () => {
    roomChannel?.send({ type: 'broadcast', event: 'room_updated', payload: {} })
  }

  // Coffee management
  const handleAddCoffee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coffeeName.trim()) return

    setCoffeeLoading(true)
    const result = await addCoffee(roomId, coffeeName.trim())
    if (!result.error) {
      setCoffeeName('')
      loadRoom()
      broadcastUpdate()
    }
    setCoffeeLoading(false)
  }

  const handleRemoveCoffee = async (coffeeId: string) => {
    await removeCoffee(coffeeId)
    loadRoom()
    broadcastUpdate()
  }

  // Set management
  const handleGenerateSet = async () => {
    setGeneratingSet(true)
    const result = await generateTriangulationSet(roomId)
    if (!result.error) {
      loadRoom()
      broadcastUpdate()
    }
    setGeneratingSet(false)
  }

  const handleDeleteSet = async (setId: string) => {
    await deleteSet(setId)
    loadRoom()
    broadcastUpdate()
  }

  const handleCreateManualSet = async () => {
    setCreatingManualSet(true)
    const result = await createEmptySet(roomId)
    if (!result.error && result.set) {
      setEditingSetId(result.set.id)
      loadRoom()
      broadcastUpdate()
    }
    setCreatingManualSet(false)
  }

  const handleUpdateRow = async (
    rowId: string,
    pairCoffeeId: string,
    oddCoffeeId: string,
    oddPosition: number
  ) => {
    await updateSetRow(rowId, pairCoffeeId, oddCoffeeId, oddPosition)
    loadRoom()
    broadcastUpdate()
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
  const answeredCount = answers.filter((a) => a !== null).length
  const correctCount = correctAnswers.filter((a) => a !== null).length
  const allRevealed = correctCount === 8

  // Countdown view - shown when host starts the game
  if (showCountdown) {
    return <Countdown from={5} onComplete={handleCountdownComplete} />
  }

  // Playing view - tasting and marking guesses
  // Show playing view when game is active (playing status OR countdown finished locally)
  const isGameActive = room.status === 'playing' || (room.status === 'countdown' && !showCountdown)
  if (isGameActive && gamePhase === 'playing') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{room.name || 'Training Room'}</h1>
            <Button variant="ghost" size="sm" onClick={handleSubmitAnswers}>
              Done
            </Button>
          </div>

          <Timer
            initialMinutes={room.timer_minutes}
            onTimeUp={handleTimeUp}
            startTime={room.timer_started_at || undefined}
            hideControls
          />

          <AnswerSheet
            answers={answers}
            onSelect={handleAnswerChange}
            mode="guess"
          />

          <Button
            onClick={handleSubmitAnswers}
            className="w-full"
            disabled={answeredCount === 0}
          >
            Submit Answers ({answeredCount}/8)
          </Button>
        </div>
      </div>
    )
  }

  // Inputting view - checking cups and seeing results
  if (isGameActive && gamePhase === 'inputting') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Check Cups</h1>
            {allRevealed && (
              <Button variant="ghost" size="sm" onClick={handleBackToLobby}>
                Done
              </Button>
            )}
          </div>

          {!allRevealed && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-center text-muted-foreground">
                  Tap the odd cup for each row to see if you were right
                </p>
              </CardContent>
            </Card>
          )}

          <AnswerSheet
            answers={answers}
            correctAnswers={correctAnswers}
            onSelect={handleCorrectAnswerChange}
            mode="input"
          />

          {allRevealed && (
            <div className="space-y-2">
              <Button onClick={handleBackToLobby} className="w-full">
                Back to Room
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Waiting lobby view
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

        {/* Coffee Setup (Host only) */}
        {isHost && room.status === 'waiting' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Coffees ({room.coffees.length})</CardTitle>
              <CardDescription>Add at least 2 coffees for triangulation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Coffee list */}
              {room.coffees.length > 0 && (
                <div className="space-y-2">
                  {room.coffees.map((coffee) => (
                    <div
                      key={coffee.id}
                      className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-primary">{coffee.label}</span>
                        <span className="font-medium">{coffee.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCoffee(coffee.id)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add coffee form */}
              <form onSubmit={handleAddCoffee} className="flex gap-2">
                <Input
                  placeholder="Coffee name (e.g., Ethiopia Yirgacheffe)"
                  value={coffeeName}
                  onChange={(e) => setCoffeeName(e.target.value)}
                  disabled={coffeeLoading}
                />
                <Button type="submit" disabled={coffeeLoading || !coffeeName.trim()}>
                  Add
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Triangulation Sets (Host only) */}
        {isHost && room.status === 'waiting' && room.coffees.length >= 2 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Triangulation Sets ({room.sets.length})</CardTitle>
              <CardDescription>Generate or manually create sets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Set list */}
              {room.sets.map((set) => (
                <div key={set.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Set {set.set_number}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSetId(editingSetId === set.id ? null : set.id)}
                        className="text-muted-foreground"
                      >
                        {editingSetId === set.id ? 'Done' : 'Edit'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSet(set.id)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* View mode */}
                  {editingSetId !== set.id && (
                    <div className="space-y-1 text-sm">
                      {set.rows.map((row) => (
                        <div key={row.id} className="flex items-center gap-2 text-muted-foreground">
                          <span className="w-6">{row.row_number}.</span>
                          <span className="font-mono">
                            <span>{row.pair_coffee.label}</span>
                            <span className="mx-1">{row.pair_coffee.label}</span>
                            <span className="text-primary font-bold">{row.odd_coffee.label}</span>
                          </span>
                          <span className="text-xs">
                            (odd at cup {row.odd_position})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Edit mode */}
                  {editingSetId === set.id && (
                    <div className="space-y-2">
                      {set.rows.map((row) => (
                        <div key={row.id} className="flex items-center gap-2 py-1 border-b last:border-0">
                          <span className="w-6 text-sm font-medium">{row.row_number}.</span>
                          <select
                            value={row.pair_coffee.id}
                            onChange={(e) => handleUpdateRow(row.id, e.target.value, row.odd_coffee.id, row.odd_position)}
                            className="flex-1 text-sm p-1 border rounded bg-background"
                          >
                            {room.coffees.filter(c => c.id !== row.odd_coffee.id).map((coffee) => (
                              <option key={coffee.id} value={coffee.id}>
                                {coffee.label}: {coffee.name} (pair)
                              </option>
                            ))}
                          </select>
                          <select
                            value={row.odd_coffee.id}
                            onChange={(e) => handleUpdateRow(row.id, row.pair_coffee.id, e.target.value, row.odd_position)}
                            className="flex-1 text-sm p-1 border rounded bg-background"
                          >
                            {room.coffees.filter(c => c.id !== row.pair_coffee.id).map((coffee) => (
                              <option key={coffee.id} value={coffee.id}>
                                {coffee.label}: {coffee.name} (odd)
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateSet}
                  disabled={generatingSet}
                  variant="outline"
                  className="flex-1"
                >
                  {generatingSet ? 'Generating...' : 'Auto Generate'}
                </Button>
                <Button
                  onClick={handleCreateManualSet}
                  disabled={creatingManualSet}
                  variant="outline"
                  className="flex-1"
                >
                  {creatingManualSet ? 'Creating...' : 'Manual Create'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                onClick={handleStartGame}
                disabled={startingGame || room.coffees.length < 2 || room.sets.length === 0}
              >
                {startingGame ? 'Starting...' : 'Start Game'}
              </Button>
              {(room.coffees.length < 2 || room.sets.length === 0) && (
                <p className="text-xs text-muted-foreground text-center">
                  {room.coffees.length < 2
                    ? 'Add at least 2 coffees'
                    : 'Generate at least 1 triangulation set'}
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
