'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { getRealtimeClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScaForm } from '@/components/cupping/sca-form'
import { SimpleForm } from '@/components/cupping/simple-form'
import { getDefaultScaScores, calculateScaTotalScore, getDefaultSimpleScores, calculateSimpleTotalScore } from '@cuppingtraining/shared/cupping'
import {
  getCuppingRoomDetails,
  startCuppingSession,
  submitCuppingScores,
  endCuppingSession,
  getCuppingResults,
  updateCuppingFormType,
} from '@/actions/cupping'
import {
  inviteUserByUsername,
  cancelInvitation,
  deleteRoom,
  addCoffee,
  removeCoffee,
} from '@/actions/rooms'
import { getRoomSyncChannel, getUserInvitationsChannel, CUPPING_EVENTS, INVITATION_EVENTS } from '@cuppingtraining/shared/constants'
import type { Room, RoomPlayer, RoomInvitation, PublicProfile, RoomCoffee, CuppingSample, CuppingScore, ScaCuppingScores, SimpleCuppingScores, CuppingFormType, CuppingSettings } from '@cuppingtraining/shared/types'

type RoomWithDetails = Room & {
  players: Array<RoomPlayer & { profile: PublicProfile | null }>
  invitations: Array<RoomInvitation & { invited_profile: PublicProfile | null }>
  coffees: RoomCoffee[]
}

type GamePhase = 'lobby' | 'scoring' | 'submitted' | 'results'

interface SampleScoreState {
  sampleNumber: number
  scores: ScaCuppingScores | SimpleCuppingScores
}

export default function CuppingRoomPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const realtime = useMemo(() => getRealtimeClient(), [])
  const roomId = params.id as string

  // Room state
  const [room, setRoom] = useState<RoomWithDetails | null>(null)
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null)
  const [coffeeCount, setCoffeeCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite state
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Coffee management
  const [coffeeName, setCoffeeName] = useState('')
  const [coffeeLoading, setCoffeeLoading] = useState(false)

  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby')
  const [startingSession, setStartingSession] = useState(false)
  const [submittingScores, setSubmittingScores] = useState(false)
  const [endingSession, setEndingSession] = useState(false)
  const [submittedPlayers, setSubmittedPlayers] = useState<Array<{ userId: string; username: string }>>([])

  // Scoring state
  const [sampleScores, setSampleScores] = useState<SampleScoreState[]>([])
  const [activeTab, setActiveTab] = useState<string>('')

  // Results state
  const [resultSessionId, setResultSessionId] = useState<string | null>(null)
  const [resultSamples, setResultSamples] = useState<Array<CuppingSample & { coffeeName: string; coffeeLabel: string }>>([])
  const [resultScores, setResultScores] = useState<Array<CuppingScore & { username: string; sampleNumber: number }>>([])

  // Channel ref
  const [roomChannel, setRoomChannel] = useState<ReturnType<typeof realtime.channel> | null>(null)

  const loadRoom = useCallback(async () => {
    const result = await getCuppingRoomDetails(roomId)
    if (result.error) {
      setError(result.error)
    } else if (result.room) {
      setRoom(result.room)
      if (result.currentUserProfileId) {
        setCurrentUserProfileId(result.currentUserProfileId)
      }
      setCoffeeCount(result.coffeeCount ?? 0)

      // If room is playing and we haven't started scoring yet, initialize
      if (result.room.status === 'playing' && gamePhase === 'lobby') {
        initScoring(result.coffeeCount ?? 0)
      }
    }
    setLoading(false)
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadRoom()
  }, [loadRoom])

  // Get the room's current form type
  const roomFormType: CuppingFormType = (room?.settings as CuppingSettings)?.form_type || 'sca'

  // Initialize scoring state
  const initScoring = (count: number) => {
    const ft: CuppingFormType = (room?.settings as CuppingSettings)?.form_type || 'sca'
    const defaultScores = ft === 'simple' ? getDefaultSimpleScores() : getDefaultScaScores()
    const scores: SampleScoreState[] = []
    for (let i = 1; i <= count; i++) {
      scores.push({ sampleNumber: i, scores: defaultScores })
    }
    setSampleScores(scores)
    setActiveTab('1')
    setGamePhase('scoring')
  }

  // Realtime broadcast channel
  useEffect(() => {
    if (!roomId) return

    let cancelled = false
    let currentChannel: ReturnType<typeof realtime.channel> | null = null
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    let retryCount = 0
    const MAX_RETRIES = 5

    const setupChannel = () => {
      if (cancelled) return

      const channel = realtime.channel(getRoomSyncChannel(roomId), {
        config: { broadcast: { self: true } },
      })
      currentChannel = channel

      channel.on('broadcast', { event: CUPPING_EVENTS.CUPPING_STARTED }, (payload) => {
        const { coffeeCount: count } = payload.payload as { coffeeCount: number }
        setSubmittedPlayers([])
        initScoring(count)
      })

      channel.on('broadcast', { event: CUPPING_EVENTS.PLAYER_SUBMITTED }, (payload) => {
        const { userId, username } = payload.payload as { userId: string; username: string }
        setSubmittedPlayers((prev) => {
          if (prev.some((p) => p.userId === userId)) return prev
          return [...prev, { userId, username }]
        })
      })

      channel.on('broadcast', { event: CUPPING_EVENTS.CUPPING_ENDED }, (payload) => {
        const { sessionId } = payload.payload as { sessionId: string }
        setResultSessionId(sessionId)
        setGamePhase('results')
      })

      channel.on('broadcast', { event: CUPPING_EVENTS.ROOM_UPDATED }, async () => {
        const result = await getCuppingRoomDetails(roomId)
        if (!result.error && result.room) {
          setRoom(result.room)
          setCoffeeCount(result.coffeeCount ?? 0)
        }
      })

      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          retryCount = 0
          setRoomChannel(channel)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[Cupping Realtime] Channel ${status}:`, err?.message)
          setRoomChannel(null)
          realtime.removeChannel(channel)
          currentChannel = null

          if (!cancelled && retryCount < MAX_RETRIES) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 15000)
            retryCount++
            retryTimeout = setTimeout(setupChannel, delay)
          }
        }
      })
    }

    setupChannel()

    return () => {
      cancelled = true
      if (retryTimeout) clearTimeout(retryTimeout)
      if (currentChannel) realtime.removeChannel(currentChannel)
      setRoomChannel(null)
    }
  }, [roomId, realtime]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load results when entering results phase
  useEffect(() => {
    if (gamePhase === 'results' && resultSessionId) {
      loadResults(resultSessionId)
    }
  }, [gamePhase, resultSessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadResults = async (sessionId: string) => {
    const result = await getCuppingResults(roomId, sessionId)
    if (result.results) {
      setResultSamples(result.results.samples)
      setResultScores(result.results.scores)
    }
  }

  const broadcastUpdate = () => {
    roomChannel?.send({ type: 'broadcast', event: CUPPING_EVENTS.ROOM_UPDATED, payload: {} })
  }

  // Handlers

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
      broadcastUpdate()
      if (result.invitedClerkId) {
        const notifyChannel = realtime.channel(getUserInvitationsChannel(result.invitedClerkId))
        notifyChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            notifyChannel.send({ type: 'broadcast', event: INVITATION_EVENTS.NEW_INVITATION, payload: {} })
            setTimeout(() => realtime.removeChannel(notifyChannel), 1000)
          }
        })
      }
    }

    setInviteLoading(false)
  }

  const handleCancelInvitation = async (invitationId: string) => {
    const result = await cancelInvitation(invitationId)
    if (!result.error) {
      loadRoom()
      broadcastUpdate()
    }
  }

  const handleDeleteRoom = async () => {
    if (!confirm('Are you sure you want to delete this room?')) return
    const result = await deleteRoom(roomId)
    if (result.success) {
      router.push('/cupping')
    }
  }

  const copyRoomCode = () => {
    if (room) navigator.clipboard.writeText(room.code)
  }

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

  const handleStartSession = async () => {
    setStartingSession(true)

    const result = await startCuppingSession(roomId)

    if (result.error) {
      console.error('Start session error:', result.error)
      setStartingSession(false)
      return
    }

    // Initialize scoring for host
    initScoring(coffeeCount)

    // Broadcast to all players
    roomChannel?.send({
      type: 'broadcast',
      event: CUPPING_EVENTS.CUPPING_STARTED,
      payload: { coffeeCount },
    })

    setStartingSession(false)
  }

  const updateSampleScores = useCallback((sampleNumber: number, scores: ScaCuppingScores | SimpleCuppingScores) => {
    setSampleScores((prev) =>
      prev.map((s) => (s.sampleNumber === sampleNumber ? { ...s, scores } : s))
    )
  }, [])

  const handleSubmitScores = async () => {
    setSubmittingScores(true)

    const scoresToSubmit = sampleScores.map((s) => ({
      sampleNumber: s.sampleNumber,
      scores: s.scores,
      totalScore: roomFormType === 'simple'
        ? calculateSimpleTotalScore(s.scores as SimpleCuppingScores)
        : calculateScaTotalScore(s.scores as ScaCuppingScores),
    }))

    const result = await submitCuppingScores(roomId, scoresToSubmit)

    if (result.error) {
      console.error('Submit scores error:', result.error)
      setSubmittingScores(false)
      return
    }

    setGamePhase('submitted')

    // Broadcast submission
    const username = user?.username || user?.firstName || 'Unknown'
    roomChannel?.send({
      type: 'broadcast',
      event: CUPPING_EVENTS.PLAYER_SUBMITTED,
      payload: { userId: currentUserProfileId, username },
    })

    setSubmittingScores(false)
  }

  const handleEndSession = async () => {
    setEndingSession(true)

    const result = await endCuppingSession(roomId)

    if (result.error) {
      console.error('End session error:', result.error)
      setEndingSession(false)
      return
    }

    setResultSessionId(result.sessionId!)
    setGamePhase('results')

    // Broadcast to all players
    roomChannel?.send({
      type: 'broadcast',
      event: CUPPING_EVENTS.CUPPING_ENDED,
      payload: { sessionId: result.sessionId },
    })

    setEndingSession(false)
  }

  const handleBackToLobby = async () => {
    setGamePhase('lobby')
    setSubmittedPlayers([])
    setSampleScores([])
    setResultSessionId(null)
    setResultSamples([])
    setResultScores([])
    await loadRoom()
  }

  // Loading / Error states
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
          <Link href="/cupping">
            <Button>Back to Cupping</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isHost = currentUserProfileId === room.host_id
  const pendingInvitations = room.invitations.filter((i) => i.status === 'pending')

  // =========================================
  // RESULTS VIEW
  // =========================================
  if (gamePhase === 'results' && resultSamples.length > 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto space-y-4 pt-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Cupping Results</h1>
            <p className="text-muted-foreground">Coffee names revealed</p>
          </div>

          {/* Summary card */}
          <Card>
            <CardContent className="py-4">
              <div className="space-y-2">
                {resultSamples.map((sample) => {
                  const sampleScoresForThis = resultScores.filter(
                    (s) => s.sampleNumber === sample.sample_number
                  )
                  const avgScore =
                    sampleScoresForThis.length > 0
                      ? sampleScoresForThis.reduce((sum, s) => sum + (s.total_score || 0), 0) /
                        sampleScoresForThis.length
                      : 0

                  return (
                    <div key={sample.id} className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-primary mr-2">{sample.coffeeLabel}</span>
                        <span className="font-medium">{sample.coffeeName}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{avgScore.toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Per-sample scores by player */}
          <Tabs defaultValue={resultSamples[0]?.sample_number.toString()}>
            <TabsList className="w-full">
              {resultSamples.map((sample) => (
                <TabsTrigger
                  key={sample.id}
                  value={sample.sample_number.toString()}
                  className="flex-1"
                >
                  <span className="font-bold mr-1">{sample.coffeeLabel}</span>
                  <span className="truncate text-xs">{sample.coffeeName}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {resultSamples.map((sample) => {
              const samplePlayerScores = resultScores.filter(
                (s) => s.sampleNumber === sample.sample_number
              )
              return (
                <TabsContent key={sample.id} value={sample.sample_number.toString()}>
                  <div className="space-y-3">
                    {samplePlayerScores.map((score) => (
                      <Card key={score.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>@{score.username}</span>
                            <span className="text-primary">{(score.total_score || 0).toFixed(2)}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {score.form_type === 'simple' ? (
                            <SimpleForm
                              scores={score.scores as SimpleCuppingScores}
                              onChange={() => {}}
                              readOnly
                            />
                          ) : (
                            <ScaForm
                              scores={score.scores as ScaCuppingScores}
                              onChange={() => {}}
                              readOnly
                            />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {samplePlayerScores.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No scores submitted for this sample
                      </p>
                    )}
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>

          <Button onClick={handleBackToLobby} className="w-full">
            Back to Lobby
          </Button>
        </div>
      </div>
    )
  }

  // =========================================
  // RESULTS VIEW (loading)
  // =========================================
  if (gamePhase === 'results') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading results...</p>
      </div>
    )
  }

  // =========================================
  // SUBMITTED VIEW (waiting for host to end)
  // =========================================
  if (gamePhase === 'submitted') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Scores Submitted</h1>
            <p className="text-muted-foreground">
              {isHost
                ? 'End the session when everyone is done'
                : 'Waiting for host to end the session...'}
            </p>
          </div>

          {/* Who has submitted */}
          {submittedPlayers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  Submitted ({submittedPlayers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {submittedPlayers.map((p) => (
                  <p key={p.userId} className="text-sm">@{p.username}</p>
                ))}
              </CardContent>
            </Card>
          )}

          {isHost && (
            <Button
              onClick={handleEndSession}
              className="w-full"
              size="lg"
              disabled={endingSession}
            >
              {endingSession ? 'Ending Session...' : 'End Session & Reveal Results'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // =========================================
  // SCORING VIEW
  // =========================================
  if (gamePhase === 'scoring') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Score Samples</h1>
          </div>

          {/* Who has submitted */}
          {submittedPlayers.length > 0 && (
            <div className="space-y-1">
              {submittedPlayers.map((p) => (
                <p key={p.userId} className="text-sm text-muted-foreground text-center">
                  @{p.username} submitted
                </p>
              ))}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              {sampleScores.map((sample) => {
                const total = roomFormType === 'simple'
                  ? calculateSimpleTotalScore(sample.scores as SimpleCuppingScores)
                  : calculateScaTotalScore(sample.scores as ScaCuppingScores)
                return (
                  <TabsTrigger
                    key={sample.sampleNumber}
                    value={sample.sampleNumber.toString()}
                    className="flex-1"
                  >
                    <span>Sample {sample.sampleNumber}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{total.toFixed(1)}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {sampleScores.map((sample) => (
              <TabsContent key={sample.sampleNumber} value={sample.sampleNumber.toString()}>
                {roomFormType === 'simple' ? (
                  <SimpleForm
                    scores={sample.scores as SimpleCuppingScores}
                    onChange={(scores) => updateSampleScores(sample.sampleNumber, scores)}
                  />
                ) : (
                  <ScaForm
                    scores={sample.scores as ScaCuppingScores}
                    onChange={(scores) => updateSampleScores(sample.sampleNumber, scores)}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>

          <Button
            onClick={handleSubmitScores}
            className="w-full"
            size="lg"
            disabled={submittingScores}
          >
            {submittingScores ? 'Submitting...' : 'Submit Scores'}
          </Button>

          {isHost && (
            <Button
              onClick={handleEndSession}
              variant="secondary"
              className="w-full"
              disabled={endingSession}
            >
              {endingSession ? 'Ending...' : 'End Session Early'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // =========================================
  // LOBBY VIEW
  // =========================================
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{room.name || 'Cupping Room'}</h1>
            <p className="text-sm text-muted-foreground">
              {room.status === 'waiting' ? 'Waiting for players' : room.status}
            </p>
          </div>
          <Link href="/cupping">
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
                {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
                {inviteSuccess && <p className="text-sm text-green-600">{inviteSuccess}</p>}
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

        {/* Coffees */}
        {isHost && room.status === 'waiting' ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Coffees ({room.coffees.length})</CardTitle>
              <CardDescription>Add coffees to score (names hidden from others)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
        ) : (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Samples to score</span>
                <span className="font-medium">{coffeeCount}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cupping Form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Cupping Form</CardTitle>
            <CardDescription>
              {isHost && room.status === 'waiting'
                ? 'Select the scoring form for this session'
                : 'Scoring form for this session'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const currentFormType = (room.settings as CuppingSettings)?.form_type || 'sca'
              const formOptions: Array<{ value: CuppingFormType; label: string; description: string }> = [
                { value: 'simple', label: 'Simple Form', description: '5 attributes rated 1-5 stars' },
                { value: 'sca', label: 'SCA Cupping Form', description: 'Standard SCA protocol with 11 attributes and 100-point scale' },
              ]

              return (
                <div className="space-y-2">
                  {formOptions.map((option) => {
                    const isSelected = currentFormType === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={!isHost || room.status !== 'waiting'}
                        onClick={async () => {
                          if (!isHost || room.status !== 'waiting' || isSelected) return
                          const result = await updateCuppingFormType(roomId, option.value)
                          if (!result.error) {
                            loadRoom()
                            broadcastUpdate()
                          }
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-muted-foreground/30'
                        } ${!isHost || room.status !== 'waiting' ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{option.label}</p>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                          {isSelected && (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0 ml-3">
                              <div className="h-2 w-2 rounded-full bg-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {isHost && room.status === 'waiting' && (
            <Button
              className="w-full"
              size="lg"
              onClick={handleStartSession}
              disabled={startingSession || coffeeCount === 0}
            >
              {startingSession
                ? 'Starting...'
                : coffeeCount === 0
                  ? 'Add coffees to start'
                  : `Start Session (${coffeeCount} sample${coffeeCount === 1 ? '' : 's'})`}
            </Button>
          )}

          {!isHost && room.status === 'waiting' && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Waiting for host to start the session...
            </p>
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
