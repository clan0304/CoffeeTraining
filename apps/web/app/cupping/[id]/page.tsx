'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
import { DomsForm } from '@/components/cupping/doms-form'
import { SaveWordModal } from '@/components/cupping/save-word-modal'
import { SessionReportCard } from '@/components/cupping/session-report-card'
import { getDefaultScaScores, calculateScaTotalScore, getDefaultSimpleScores, calculateSimpleTotalScore, getDefaultDomsScores, calculateDomsTotalScore } from '@cuppingtraining/shared/cupping'
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
  leaveRoom,
  rejoinRoom,
  addCoffee,
  removeCoffee,
  transferHost,
  updateCoffee,
} from '@/actions/rooms'
import { getRoomSyncChannel, getUserInvitationsChannel, CUPPING_EVENTS, INVITATION_EVENTS } from '@cuppingtraining/shared/constants'
import { FriendInvitePicker } from '@/components/rooms/friend-invite-picker'
import type { Room, RoomPlayer, RoomInvitation, PublicProfile, RoomCoffee, CuppingSample, CuppingScore, ScaCuppingScores, SimpleCuppingScores, DomsCuppingScores, CuppingFormType, CuppingSettings } from '@cuppingtraining/shared/types'

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

function CuppingRoomContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [editingCoffeeId, setEditingCoffeeId] = useState<string | null>(null)
  const [editingCoffeeName, setEditingCoffeeName] = useState('')

  // Game state - initialize from URL params
  const [gamePhase, setGamePhase] = useState<GamePhase>(() => {
    const phase = searchParams.get('phase') as GamePhase
    return ['lobby', 'scoring', 'submitted', 'results'].includes(phase) ? phase : 'lobby'
  })
  const [startingSession, setStartingSession] = useState(false)
  const [submittingScores, setSubmittingScores] = useState(false)
  const [endingSession, setEndingSession] = useState(false)
  const [submittedPlayers, setSubmittedPlayers] = useState<Array<{ userId: string; username: string }>>([])

  // Leave/rejoin state
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [rejoinLoading, setRejoinLoading] = useState(false)

  // Scoring state
  const [sampleScores, setSampleScores] = useState<SampleScoreState[]>([])
  const [activeTab, setActiveTab] = useState<string>('')

  // Results state - initialize from URL params
  const [resultSessionId, setResultSessionId] = useState<string | null>(() => {
    return searchParams.get('sessionId')
  })
  const [resultSamples, setResultSamples] = useState<Array<CuppingSample & { coffeeName: string; coffeeLabel: string }>>([])
  const [resultScores, setResultScores] = useState<Array<CuppingScore & { username: string; sampleNumber: number }>>([])

  // Save word modal state
  const [showSaveWordModal, setShowSaveWordModal] = useState(false)

  // Coffee name reveal state - track which coffee names are revealed
  const [revealedCoffees, setRevealedCoffees] = useState<Set<string>>(new Set())
  const [animatingCoffees, setAnimatingCoffees] = useState<Set<string>>(new Set())

  // Channel ref
  const [roomChannel, setRoomChannel] = useState<ReturnType<typeof realtime.channel> | null>(null)

  // Update URL when game phase changes
  const updateGamePhase = useCallback((newPhase: GamePhase, sessionId?: string) => {
    setGamePhase(newPhase)
    const url = new URL(window.location.href)
    
    if (newPhase === 'lobby') {
      url.searchParams.delete('phase')
      url.searchParams.delete('sessionId')
    } else {
      url.searchParams.set('phase', newPhase)
      if (sessionId) {
        url.searchParams.set('sessionId', sessionId)
      }
    }
    
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router])

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
    const defaultScores = ft === 'simple' ? getDefaultSimpleScores() : ft === 'doms' ? getDefaultDomsScores() : getDefaultScaScores()
    const scores: SampleScoreState[] = []
    for (let i = 1; i <= count; i++) {
      scores.push({ sampleNumber: i, scores: defaultScores })
    }
    setSampleScores(scores)
    setActiveTab('1')
    updateGamePhase('scoring')
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
        updateGamePhase('results', sessionId)
      })

      channel.on('broadcast', { event: CUPPING_EVENTS.PLAYER_LEFT }, async () => {
        const result = await getCuppingRoomDetails(roomId)
        if (!result.error && result.room) {
          setRoom(result.room)
          setCoffeeCount(result.coffeeCount ?? 0)
        }
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

  // Handle invalid scoring state on page load
  useEffect(() => {
    if (gamePhase === 'scoring' && sampleScores.length === 0 && !loading && room) {
      // Check if there's an active session that should be restored
      if (room.status === 'playing' && coffeeCount > 0) {
        // Restore scoring session
        const initializeScoring = async () => {
          const roomFormType = (room.settings as CuppingSettings)?.form_type || 'sca'
          const defaultScores = roomFormType === 'simple' ? getDefaultSimpleScores() : 
                               roomFormType === 'doms' ? getDefaultDomsScores() :
                               getDefaultScaScores()
          
          const scores: SampleScoreState[] = []
          for (let i = 1; i <= coffeeCount; i++) {
            scores.push({ sampleNumber: i, scores: defaultScores })
          }
          setSampleScores(scores)
          setActiveTab('1')
        }
        initializeScoring()
      } else {
        // No active session, redirect to lobby
        updateGamePhase('lobby')
      }
    }
    
    // Handle invalid submitted state on page load
    if (gamePhase === 'submitted' && !loading && room && room.status !== 'playing') {
      updateGamePhase('lobby')
    }
  }, [gamePhase, sampleScores.length, loading, room, coffeeCount, updateGamePhase])

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

  const handleUpdateCoffee = async (coffeeId: string) => {
    if (!editingCoffeeName.trim()) return
    const result = await updateCoffee(coffeeId, editingCoffeeName.trim())
    if (!result.error) {
      setEditingCoffeeId(null)
      setEditingCoffeeName('')
      loadRoom()
      broadcastUpdate()
    }
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
        : roomFormType === 'doms'
          ? calculateDomsTotalScore(s.scores as DomsCuppingScores)
          : calculateScaTotalScore(s.scores as ScaCuppingScores),
    }))

    const result = await submitCuppingScores(roomId, scoresToSubmit)

    if (result.error) {
      console.error('Submit scores error:', result.error)
      setSubmittingScores(false)
      return
    }

    updateGamePhase('submitted')

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
    updateGamePhase('results', result.sessionId!)

    // Broadcast to all players
    roomChannel?.send({
      type: 'broadcast',
      event: CUPPING_EVENTS.CUPPING_ENDED,
      payload: { sessionId: result.sessionId },
    })

    setEndingSession(false)
  }

  const handleBackToLobby = async () => {
    updateGamePhase('lobby')
    setSubmittedPlayers([])
    setSampleScores([])
    setResultSessionId(null)
    setResultSamples([])
    setResultScores([])
    await loadRoom()
  }

  const handleEditScores = async () => {
    if (!room || room.status !== 'playing') return
    
    // Find active cupping session for this room
    const supabase = getRealtimeClient()
    const { data: session } = await supabase
      .from('cupping_sessions')
      .select('id')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!session) {
      console.error('No active session found')
      return
    }

    // Get samples for this session
    const { data: samples } = await supabase
      .from('cupping_samples')
      .select('id, sample_number')
      .eq('session_id', session.id)
      .order('sample_number', { ascending: true })

    if (!samples) {
      console.error('No samples found')
      return
    }

    // Get current user's scores
    const { data: existingScores } = await supabase
      .from('cupping_scores')
      .select('*')
      .in('sample_id', samples.map(s => s.id))
      .eq('user_id', currentUserProfileId)

    if (!existingScores) {
      console.error('No existing scores found')
      return
    }

    // Build score map by sample number
    const sampleIdMap = new Map(samples.map(s => [s.id, s.sample_number]))
    const scoresMap = new Map<number, ScaCuppingScores | SimpleCuppingScores | DomsCuppingScores>()
    
    for (const score of existingScores) {
      const sampleNumber = sampleIdMap.get(score.sample_id)
      if (sampleNumber) {
        scoresMap.set(sampleNumber, score.scores as ScaCuppingScores | SimpleCuppingScores | DomsCuppingScores)
      }
    }

    // Restore scoring state with existing scores
    const formType = (room.settings as CuppingSettings)?.form_type || 'sca'
    const defaultScores = formType === 'simple' ? getDefaultSimpleScores() : 
                         formType === 'doms' ? getDefaultDomsScores() :
                         getDefaultScaScores()
    
    const scores: SampleScoreState[] = []
    for (let i = 1; i <= coffeeCount; i++) {
      const existingScore = scoresMap.get(i)
      scores.push({ 
        sampleNumber: i, 
        scores: existingScore || defaultScores 
      })
    }
    
    setSampleScores(scores)
    setActiveTab('1')
    updateGamePhase('scoring')
  }

  const handleEndSessionAndNavigate = async () => {
    if (!resultSessionId || !room) return
    try {
      await endCuppingSession(room.id)
      // Broadcast session ended event
      roomChannel?.send({
        type: 'broadcast',
        event: CUPPING_EVENTS.CUPPING_ENDED,
        payload: { sessionId: resultSessionId }
      })
      // Navigate to session detail page to view the completed session
      window.location.href = `/cupping/sessions/${resultSessionId}`
    } catch (error) {
      console.error('Failed to end session:', error)
      // Fallback: still navigate even if broadcast fails
      window.location.href = `/cupping/sessions/${resultSessionId}`
    }
  }

  const handleLeaveRoom = async () => {
    setLeaveLoading(true)
    const result = await leaveRoom(roomId)
    if (result.error) {
      console.error('Leave room error:', result.error)
      setLeaveLoading(false)
      return
    }
    roomChannel?.send({
      type: 'broadcast',
      event: CUPPING_EVENTS.PLAYER_LEFT,
      payload: {},
    })
    router.push('/cupping')
  }

  const handleRejoinRoom = async () => {
    setRejoinLoading(true)
    const result = await rejoinRoom(roomId)
    if (result.error) {
      console.error('Rejoin error:', result.error)
      setRejoinLoading(false)
      return
    }
    roomChannel?.send({
      type: 'broadcast',
      event: CUPPING_EVENTS.ROOM_UPDATED,
      payload: {},
    })
    await loadRoom()
    setRejoinLoading(false)
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
  const isMember = room.players.some((p) => p.user_id === currentUserProfileId)
  const pendingInvitations = room.invitations.filter((i) => i.status === 'pending')

  // Not a member — show rejoin UI or redirect
  if (!isMember && !loading) {
    const isInProgress = room.status === 'playing'
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-8 text-center">
          <h1 className="text-2xl font-bold">{room.name || 'Cupping Room'}</h1>
          {isInProgress ? (
            <>
              <p className="text-muted-foreground">A cupping session is in progress. Rejoin to continue scoring.</p>
              <Button onClick={handleRejoinRoom} disabled={rejoinLoading}>
                {rejoinLoading ? 'Rejoining...' : 'Rejoin Session'}
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">You are not a member of this room.</p>
          )}
          <div>
            <Button variant="ghost" onClick={() => router.push('/cupping')}>
              Back to Cupping
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // =========================================
  // RESULTS VIEW
  // =========================================
  if (gamePhase === 'results' && resultSamples.length > 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto space-y-4 pt-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Cupping Results</h1>
          </div>


          {/* Coffee containers with player tabs for each coffee */}
          <div className="space-y-6">
            {resultSamples.map((sample) => {
              const sampleScores = resultScores.filter((s) => s.sampleNumber === sample.sample_number)
              const players = Array.from(
                new Map(sampleScores.map((score) => [score.user_id, { userId: score.user_id, username: score.username }]))
                .values()
              )

              return (
                <Card key={sample.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-primary">{sample.coffeeLabel}</span>
                        <div className="relative min-w-[160px] h-12 flex items-center justify-center">
                          {revealedCoffees.has(sample.id) ? (
                            <span 
                              key={`revealed-${sample.id}`}
                              className="text-lg font-medium animate-in fade-in slide-in-from-bottom-2 duration-1000 fill-mode-both"
                            >
                              {sample.coffeeName}
                            </span>
                          ) : animatingCoffees.has(sample.id) ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                              {/* Scattered particle animation */}
                              {[...Array(8)].map((_, i) => (
                                <div
                                  key={i}
                                  className="absolute w-2 h-2 bg-primary rounded-full animate-ping"
                                  style={{
                                    left: `${25 + (i % 4) * 15}%`,
                                    top: `${25 + Math.floor(i / 4) * 25}%`,
                                    animationDelay: `${i * 100}ms`,
                                    animationDuration: '1200ms'
                                  }}
                                />
                              ))}
                              {/* Central sparkle */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-6 h-6 text-primary animate-spin">
                                  ✨
                                </div>
                              </div>
                              {/* Coffee name fading in */}
                              <span 
                                className="absolute inset-0 flex items-center justify-center text-lg font-medium opacity-0 animate-in fade-in duration-1000 delay-800 fill-mode-forwards"
                                style={{ animationFillMode: 'forwards' }}
                              >
                                {sample.coffeeName}
                              </span>
                            </div>
                          ) : (
                            <button
                              key={`button-${sample.id}`}
                              onClick={() => {
                                setAnimatingCoffees(prev => new Set([...prev, sample.id]))
                                setTimeout(() => {
                                  setRevealedCoffees(prev => new Set([...prev, sample.id]))
                                  setAnimatingCoffees(prev => {
                                    const newSet = new Set(prev)
                                    newSet.delete(sample.id)
                                    return newSet
                                  })
                                }, 1800)
                              }}
                              className="group relative px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                            >
                              <span className="relative z-10 font-medium">✨ Reveal</span>
                              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </button>
                          )}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {players.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No scores submitted for this coffee.</p>
                      </div>
                    ) : (
                      <Tabs defaultValue={players[0]?.userId}>
                        <div className="overflow-x-auto mb-4">
                          <TabsList className="w-max min-w-full">
                            {players.map((player) => {
                              const playerScore = sampleScores.find((s) => s.user_id === player.userId)
                              return (
                                <TabsTrigger
                                  key={player.userId}
                                  value={player.userId}
                                  className="flex-none min-w-fit px-4"
                                >
                                  <span>@{player.username}</span>
                                  {playerScore && (
                                    <span className="ml-2 text-xs text-primary font-bold">
                                      {(playerScore.total_score || 0).toFixed(2)}
                                    </span>
                                  )}
                                </TabsTrigger>
                              )
                            })}
                          </TabsList>
                        </div>

                        {players.map((player) => {
                          const score = sampleScores.find((s) => s.user_id === player.userId)
                          return (
                            <TabsContent key={player.userId} value={player.userId}>
                              {score ? (
                                score.form_type === 'simple' ? (
                                  <SimpleForm
                                    scores={score.scores as SimpleCuppingScores}
                                    onChange={() => {}}
                                    readOnly
                                  />
                                ) : score.form_type === 'doms' ? (
                                  <DomsForm
                                    scores={score.scores as DomsCuppingScores}
                                    onChange={() => {}}
                                    readOnly
                                  />
                                ) : (
                                  <ScaForm
                                    scores={score.scores as ScaCuppingScores}
                                    onChange={() => {}}
                                    readOnly
                                  />
                                )
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No score submitted by this player
                                </p>
                              )}
                            </TabsContent>
                          )
                        })}
                      </Tabs>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Statistics section - shown after individual reviews */}
          <div className="text-center py-4">
            <p className="text-muted-foreground text-lg font-medium">Coffee names revealed</p>
          </div>
          
          {/* Summary card with average scores */}
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

          <SessionReportCard samples={resultSamples} scores={resultScores} />

          <div className="space-y-3">
            {isHost ? (
              <Button 
                onClick={handleEndSessionAndNavigate} 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                🏁 End Session & Save Results
              </Button>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Waiting for host to end the session...
                </p>
              </div>
            )}
            <Button onClick={handleBackToLobby} variant="outline" className="w-full">
              Back to Lobby
            </Button>
          </div>

          {/* Floating Save Word Button - only in results view */}
          {gamePhase === 'results' && (
            <button
              onClick={() => setShowSaveWordModal(true)}
              className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
              </svg>
              Save New Word
            </button>
          )}
          
          <SaveWordModal 
            isOpen={showSaveWordModal} 
            onClose={() => setShowSaveWordModal(false)} 
          />
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

          <Button
            onClick={handleEditScores}
            variant="outline"
            className="w-full"
            size="lg"
          >
            ✏️ Edit My Scores
          </Button>

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
            {!isHost && (
              <Button variant="ghost" size="sm" onClick={() => setLeaveConfirm(true)}>
                Exit
              </Button>
            )}
          </div>

          {leaveConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setLeaveConfirm(false)}>
              <Card className="w-[90%] max-w-sm relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setLeaveConfirm(false)}
                  className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <CardContent className="pt-6 pb-4">
                  <p className="font-medium mb-1">Leave session?</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    You can rejoin by navigating back to this room.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setLeaveConfirm(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={() => { setLeaveConfirm(false); handleLeaveRoom() }} disabled={leaveLoading}>
                      {leaveLoading ? 'Leaving...' : 'Leave'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
            <div className="overflow-x-auto">
              <TabsList className="w-max min-w-full">
                {sampleScores.map((sample) => (
                  <TabsTrigger
                    key={sample.sampleNumber}
                    value={sample.sampleNumber.toString()}
                    className="flex-none min-w-fit px-4"
                  >
                    <span>Sample {sample.sampleNumber}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {sampleScores.map((sample) => (
              <TabsContent key={sample.sampleNumber} value={sample.sampleNumber.toString()}>
                {roomFormType === 'simple' ? (
                  <SimpleForm
                    scores={sample.scores as SimpleCuppingScores}
                    onChange={(scores) => updateSampleScores(sample.sampleNumber, scores)}
                  />
                ) : roomFormType === 'doms' ? (
                  <DomsForm
                    scores={sample.scores as DomsCuppingScores}
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
          {!isHost && (
            <Button variant="ghost" size="sm" onClick={handleLeaveRoom} disabled={leaveLoading}>
              {leaveLoading ? 'Leaving...' : 'Exit'}
            </Button>
          )}
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
            <CardContent className="space-y-3">
              <FriendInvitePicker
                playerIds={room.players.map((p) => p.user_id)}
                pendingInviteIds={pendingInvitations.map((i) => i.invited_user_id)}
                onInvite={(username) => {
                  setInviteUsername(username)
                  setInviteError(null)
                  setInviteSuccess(null)
                  setInviteLoading(true)
                  inviteUserByUsername(roomId, username).then((result) => {
                    if (result.error) {
                      setInviteError(result.error)
                    } else {
                      setInviteSuccess(`Invitation sent to @${username}`)
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
                  })
                }}
                disabled={inviteLoading}
              />
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
                    {player.profile?.username || 'Unknown'}
                    {player.user_id === room.host_id && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Host
                      </span>
                    )}
                  </p>
                </div>
                {isHost && room.status === 'waiting' && player.user_id !== room.host_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={async () => {
                      const result = await transferHost(roomId, player.user_id)
                      if (!result.error) {
                        broadcastUpdate()
                        loadRoom()
                      }
                    }}
                  >
                    Make Host
                  </Button>
                )}
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
                      {editingCoffeeId === coffee.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-bold text-primary">{coffee.label}</span>
                          <Input
                            value={editingCoffeeName}
                            onChange={(e) => setEditingCoffeeName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); handleUpdateCoffee(coffee.id) }
                              if (e.key === 'Escape') { setEditingCoffeeId(null); setEditingCoffeeName('') }
                            }}
                            className="h-8 flex-1"
                            autoFocus
                          />
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateCoffee(coffee.id)} disabled={!editingCoffeeName.trim()}>
                            Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingCoffeeId(null); setEditingCoffeeName('') }}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-primary">{coffee.label}</span>
                            <span className="font-medium">{coffee.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditingCoffeeId(coffee.id); setEditingCoffeeName(coffee.name) }}
                              className="text-muted-foreground"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCoffee(coffee.id)}
                              className="text-muted-foreground hover:text-red-500"
                            >
                              Remove
                            </Button>
                          </div>
                        </>
                      )}
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
                { value: 'doms', label: "Dom's Form", description: 'SCA + Sweetness, Complexity, Freshness' },
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

export default function CuppingRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading room...</p>
      </div>
    }>
      <CuppingRoomContent />
    </Suspense>
  )
}
