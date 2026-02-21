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
  pauseGame,
  resumeGame,
  finishRound,
  endRound,
  endSession,
  addCoffee,
  removeCoffee,
  generateTriangulationSet,
  createEmptySet,
  updateSetRow,
  deleteSet,
} from '@/actions/rooms'
import { getRoomSyncChannel, getUserInvitationsChannel, CUP_TASTERS_EVENTS, INVITATION_EVENTS } from '@cuppingtraining/shared/constants'
import type { Room, RoomPlayer, RoomInvitation, PublicProfile, RoomCoffee, RoomSet, RoomSetRow } from '@cuppingtraining/shared/types'

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
  const realtime = useMemo(() => getRealtimeClient(), [])
  const roomId = params.id as string

  const [room, setRoom] = useState<RoomWithDetails | null>(null)
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null)
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
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)

  // Game state
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownFrom, setCountdownFrom] = useState(5)
  const [waitingForTimer, setWaitingForTimer] = useState(false)
  const [gamePhase, setGamePhase] = useState<'playing' | 'inputting' | 'finished'>('playing')
  const [answers, setAnswers] = useState<(number | null)[]>(Array(8).fill(null))
  const [correctAnswers, setCorrectAnswers] = useState<(number | null)[]>(Array(8).fill(null))
  const [isPaused, setIsPaused] = useState(false)
  const [isOvertime, setIsOvertime] = useState(false)
  const [overtimeRows, setOvertimeRows] = useState<Set<number>>(new Set())
  const [finishWarning, setFinishWarning] = useState(false)
  const [pauseLoading, setPauseLoading] = useState(false)
  const [finishedPlayers, setFinishedPlayers] = useState<Array<{ userId: string; username: string; elapsedMs: number }>>([])
  const [myElapsedMs, setMyElapsedMs] = useState<number | null>(null)
  const [finishLoading, setFinishLoading] = useState(false)
  const [endingSession, setEndingSession] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [completedRoundsCount, setCompletedRoundsCount] = useState(0)

  const loadRoom = useCallback(async () => {
    const result = await getRoomDetails(roomId)
    if (result.error) {
      setError(result.error)
    } else if (result.room) {
      setRoom(result.room)
      if (result.currentUserProfileId) {
        setCurrentUserProfileId(result.currentUserProfileId)
      }
      setActiveSessionId(result.activeSessionId ?? null)
      setCompletedRoundsCount(result.completedRoundsCount ?? 0)
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
  const [roomChannel, setRoomChannel] = useState<ReturnType<typeof realtime.channel> | null>(null)
  const [channelReady, setChannelReady] = useState(false)

  // Real-time subscription using Broadcast (anon client, no auth needed)
  useEffect(() => {
    if (!roomId) return

    let cancelled = false
    let currentChannel: ReturnType<typeof realtime.channel> | null = null
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    let retryCount = 0
    const MAX_RETRIES = 5

    const setupChannel = () => {
      if (cancelled) return

      console.log('[Realtime] Setting up channel for room:', roomId, retryCount > 0 ? `(retry ${retryCount})` : '')

      const channel = realtime.channel(getRoomSyncChannel(roomId), {
        config: {
          broadcast: { self: true },
        },
      })
      currentChannel = channel

      // Listen for game events via broadcast (instant, no RLS needed)
      channel.on('broadcast', { event: CUP_TASTERS_EVENTS.GAME_START }, (payload) => {
        console.log('[Realtime] Received game_start broadcast:', payload)
        const { startedAt } = payload.payload as { startedAt: number }
        const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000)
        const remaining = 5 - elapsedSeconds

        if (remaining > 0) {
          setCountdownFrom(remaining)
          setShowCountdown(true)
        } else {
          setWaitingForTimer(true)
          setAnswers(Array(8).fill(null))
          setCorrectAnswers(Array(8).fill(null))
          setGamePhase('playing')
        }
      })

      channel.on('broadcast', { event: CUP_TASTERS_EVENTS.GAME_PLAYING }, (payload) => {
        console.log('[Realtime] Received game_playing broadcast:', payload)
        const { timerStartedAt } = payload.payload as { timerStartedAt: string }
        setShowCountdown(false)
        setWaitingForTimer(false)
        setIsPaused(false)
        setIsOvertime(false)
        setOvertimeRows(new Set())
        setFinishedPlayers([])
        setMyElapsedMs(null)
        setAnswers(Array(8).fill(null))
        setCorrectAnswers(Array(8).fill(null))
        setGamePhase('playing')
        setRoom((prev) => prev ? { ...prev, status: 'playing' as const, timer_started_at: timerStartedAt, paused_at: null } : prev)
      })

      channel.on('broadcast', { event: CUP_TASTERS_EVENTS.GAME_PAUSE }, (payload) => {
        console.log('[Realtime] Received game_pause broadcast:', payload)
        setIsPaused(true)
        setRoom((prev) => prev ? { ...prev, status: 'paused' as const } : prev)
      })

      channel.on('broadcast', { event: CUP_TASTERS_EVENTS.GAME_RESUME }, (payload) => {
        console.log('[Realtime] Received game_resume broadcast:', payload)
        const { newTimerStartedAt } = payload.payload as { newTimerStartedAt: string }
        setIsPaused(false)
        setRoom((prev) => prev ? { ...prev, status: 'playing' as const, timer_started_at: newTimerStartedAt, paused_at: null } : prev)
      })

      channel.on('broadcast', { event: CUP_TASTERS_EVENTS.PLAYER_FINISHED }, (payload) => {
        console.log('[Realtime] Received player_finished broadcast:', payload)
        const { userId: finishedUserId, username, elapsedMs } = payload.payload as { userId: string; username: string; elapsedMs: number }
        setFinishedPlayers((prev) => {
          if (prev.some((p) => p.userId === finishedUserId)) return prev
          return [...prev, { userId: finishedUserId, username, elapsedMs }]
        })
      })

      channel.on('broadcast', { event: CUP_TASTERS_EVENTS.ROUND_ENDED }, async () => {
        console.log('[Realtime] Received round_ended broadcast')
        setGamePhase('playing')
        setAnswers(Array(8).fill(null))
        setCorrectAnswers(Array(8).fill(null))
        setFinishedPlayers([])
        setMyElapsedMs(null)
        setIsPaused(false)
        setIsOvertime(false)
        setOvertimeRows(new Set())
        setShowCountdown(false)
        setWaitingForTimer(false)
        const result = await getRoomDetails(roomId)
        if (!result.error && result.room) {
          setRoom(result.room)
        }
      })

      channel.on('broadcast', { event: CUP_TASTERS_EVENTS.SESSION_ENDED }, (payload) => {
        console.log('[Realtime] Received session_ended broadcast:', payload)
        const { sessionId } = payload.payload as { sessionId: string }
        router.push(`/sessions/${sessionId}`)
      })

      channel.on('broadcast', { event: CUP_TASTERS_EVENTS.ROOM_UPDATED }, async (payload) => {
        console.log('[Realtime] Received room_updated broadcast:', payload)
        const result = await getRoomDetails(roomId)
        if (!result.error && result.room) {
          setRoom(result.room)
        }
      })

      channel.subscribe((status, err) => {
        console.log('[Realtime] Channel status:', status, err ? `Error: ${err.message}` : '')
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Channel subscribed successfully!')
          retryCount = 0
          setRoomChannel(channel)
          setChannelReady(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[Realtime] Channel ${status}:`, err?.message)
          setRoomChannel(null)
          setChannelReady(false)

          // Clean up failed channel and retry with backoff
          realtime.removeChannel(channel)
          currentChannel = null

          if (!cancelled && retryCount < MAX_RETRIES) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 15000)
            console.log(`[Realtime] Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)
            retryCount++
            retryTimeout = setTimeout(setupChannel, delay)
          } else if (retryCount >= MAX_RETRIES) {
            console.error('[Realtime] Max retries reached, giving up')
          }
        }
      })
    }

    setupChannel()

    return () => {
      console.log('[Realtime] Cleaning up channel')
      cancelled = true
      if (retryTimeout) clearTimeout(retryTimeout)
      if (currentChannel) realtime.removeChannel(currentChannel)
      setRoomChannel(null)
      setChannelReady(false)
    }
  }, [roomId, realtime])

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
      // Broadcast update to all players in the room
      roomChannel?.send({ type: 'broadcast', event: CUP_TASTERS_EVENTS.ROOM_UPDATED, payload: {} })
      // Notify the invited user so their invitation list updates in real time
      if (result.invitedClerkId) {
        const notifyChannel = realtime.channel(getUserInvitationsChannel(result.invitedClerkId))
        notifyChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            notifyChannel.send({ type: 'broadcast', event: INVITATION_EVENTS.NEW_INVITATION, payload: {} })
            // Clean up after sending
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
      roomChannel?.send({ type: 'broadcast', event: CUP_TASTERS_EVENTS.ROOM_UPDATED, payload: {} })
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
    if (!selectedSetId) return
    setStartingGame(true)

    // Try to set status to 'countdown' in database
    const result = await startGame(roomId, selectedSetId)

    if (result.error) {
      console.warn('Start game error:', result.error)
      setStartingGame(false)
      return
    }

    // Show countdown immediately for host
    const countdownStartedAt = Date.now()
    setCountdownFrom(5)
    setShowCountdown(true)

    // Broadcast game_start to all other players in the room
    console.log('[Realtime] Broadcasting game_start, channel ready:', channelReady, 'channel:', !!roomChannel)
    if (roomChannel) {
      const sendResult = await roomChannel.send({
        type: 'broadcast',
        event: CUP_TASTERS_EVENTS.GAME_START,
        payload: { startedAt: countdownStartedAt },
      })
      console.log('[Realtime] Broadcast send result:', sendResult)
    } else {
      console.warn('[Realtime] Channel not ready, cannot broadcast')
    }

    setStartingGame(false)
  }

  const handleCountdownComplete = async () => {
    if (currentUserProfileId === room?.host_id) {
      // Host: write to DB, get exact timestamp, broadcast to all players
      const result = await beginPlaying(roomId)
      if (result.error) {
        console.error('Begin playing error:', result.error)
        return
      }

      const timerStartedAt = result.timerStartedAt!

      // Update own state
      setShowCountdown(false)
      setFinishedPlayers([])
      setMyElapsedMs(null)
      setAnswers(Array(8).fill(null))
      setCorrectAnswers(Array(8).fill(null))
      setGamePhase('playing')
      setRoom((prev) => prev ? { ...prev, status: 'playing' as const, timer_started_at: timerStartedAt } : prev)

      // Broadcast the exact timestamp to all other players
      roomChannel?.send({
        type: 'broadcast',
        event: CUP_TASTERS_EVENTS.GAME_PLAYING,
        payload: { timerStartedAt },
      })
    } else {
      // Non-host: hide countdown but wait for game_playing broadcast
      // to get the exact timer timestamp before showing the playing view.
      setShowCountdown(false)
      setWaitingForTimer(true)
      setAnswers(Array(8).fill(null))
      setCorrectAnswers(Array(8).fill(null))
      setGamePhase('playing')
    }
  }

  const handlePauseGame = async () => {
    setPauseLoading(true)
    const result = await pauseGame(roomId)
    if (result.error) {
      console.error('Pause error:', result.error)
    } else {
      setIsPaused(true)
      setRoom((prev) => prev ? { ...prev, status: 'paused' as const } : prev)
      roomChannel?.send({
        type: 'broadcast',
        event: CUP_TASTERS_EVENTS.GAME_PAUSE,
        payload: {},
      })
    }
    setPauseLoading(false)
  }

  const handleResumeGame = async () => {
    setPauseLoading(true)
    const result = await resumeGame(roomId)
    if (result.error) {
      console.error('Resume error:', result.error)
    } else {
      const newTimerStartedAt = result.newTimerStartedAt!
      setIsPaused(false)
      setRoom((prev) => prev ? { ...prev, status: 'playing' as const, timer_started_at: newTimerStartedAt, paused_at: null } : prev)
      roomChannel?.send({
        type: 'broadcast',
        event: CUP_TASTERS_EVENTS.GAME_RESUME,
        payload: { newTimerStartedAt },
      })
    }
    setPauseLoading(false)
  }

  const handleFinish = async (force = false) => {
    if (myElapsedMs !== null) {
      // Already finished, just go to inputting
      setGamePhase('inputting')
      return
    }

    const unanswered = answers.filter((a) => a === null).length
    if (unanswered > 0 && !force) {
      setFinishWarning(true)
      return
    }
    setFinishWarning(false)

    setFinishLoading(true)
    const result = await finishRound(roomId, answers)
    if (result.error) {
      console.error('Finish error:', result.error)
      // If the game is no longer in progress (e.g. host ended round while
      // our realtime channel was disconnected), resync room state
      if (result.error === 'Game is not in progress') {
        setFinishLoading(false)
        setGamePhase('playing')
        setAnswers(Array(8).fill(null))
        setCorrectAnswers(Array(8).fill(null))
        setFinishedPlayers([])
        setMyElapsedMs(null)
        setIsPaused(false)
        setShowCountdown(false)
        setWaitingForTimer(false)
        await loadRoom()
        return
      }
    } else if (result.elapsedMs !== undefined) {
      setMyElapsedMs(result.elapsedMs)
      // Broadcast to all players
      const username = user?.username || user?.firstName || 'Unknown'
      roomChannel?.send({
        type: 'broadcast',
        event: CUP_TASTERS_EVENTS.PLAYER_FINISHED,
        payload: { userId: currentUserProfileId, username, elapsedMs: result.elapsedMs },
      })
    }
    setFinishLoading(false)
    setGamePhase('inputting')
  }

  const handleTimeUp = () => {
    setIsOvertime(true)
  }

  const handleAnswerChange = (rowIndex: number, position: number) => {
    setFinishWarning(false)
    setAnswers((prev) => {
      const newAnswers = [...prev]
      newAnswers[rowIndex] = prev[rowIndex] === position ? null : position
      return newAnswers
    })
    if (isOvertime) {
      setOvertimeRows((prev) => {
        const next = new Set(prev)
        next.add(rowIndex)
        return next
      })
    }
  }

  const handleCorrectAnswerChange = (rowIndex: number, position: number) => {
    setCorrectAnswers((prev) => {
      const newCorrect = [...prev]
      newCorrect[rowIndex] = prev[rowIndex] === position ? null : position
      return newCorrect
    })
  }

  const handleEndRound = async () => {
    const result = await endRound(roomId)
    if (result.error) {
      console.error('End round error:', result.error)
      return
    }

    // Reset local state
    setGamePhase('playing')
    setAnswers(Array(8).fill(null))
    setCorrectAnswers(Array(8).fill(null))
    setFinishedPlayers([])
    setMyElapsedMs(null)
    setIsPaused(false)
    setIsOvertime(false)
    setOvertimeRows(new Set())
    setFinishWarning(false)

    // Broadcast to all players
    roomChannel?.send({
      type: 'broadcast',
      event: CUP_TASTERS_EVENTS.ROUND_ENDED,
      payload: {},
    })

    loadRoom()
  }

  const handleEndSession = async () => {
    setEndingSession(true)
    const result = await endSession(roomId)
    if (result.error) {
      console.error('End session error:', result.error)
      setEndingSession(false)
      return
    }

    // Broadcast to all players
    roomChannel?.send({
      type: 'broadcast',
      event: CUP_TASTERS_EVENTS.SESSION_ENDED,
      payload: { sessionId: result.sessionId },
    })

    // Navigate host to summary page
    router.push(`/sessions/${result.sessionId}`)
  }

  // Helper to broadcast room updates
  const broadcastUpdate = () => {
    roomChannel?.send({ type: 'broadcast', event: CUP_TASTERS_EVENTS.ROOM_UPDATED, payload: {} })
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

  // Format milliseconds to mm:ss
  const formatElapsedMs = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

  const isHost = currentUserProfileId === room.host_id
  const pendingInvitations = room.invitations.filter((i) => i.status === 'pending')
  const answeredCount = answers.filter((a) => a !== null).length
  const correctCount = correctAnswers.filter((a) => a !== null).length
  const allRevealed = correctCount === 8

  // Countdown view - shown when host starts the game
  if (showCountdown) {
    return <Countdown from={countdownFrom} onComplete={handleCountdownComplete} />
  }

  // Waiting for host to set the timer (non-host only)
  if (waitingForTimer) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl font-bold text-primary animate-pulse">
            GO!
          </div>
          <p className="text-lg text-muted-foreground">Starting...</p>
        </div>
      </div>
    )
  }

  // Playing view - tasting and marking guesses
  // Show playing view when game is active (playing status OR countdown finished locally)
  const isGameActive = room.status === 'playing' || room.status === 'paused' || (room.status === 'countdown' && !showCountdown)
  if (isGameActive && gamePhase === 'playing') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{room.name || 'Training Room'}</h1>
          </div>

          <Timer
            initialMinutes={room.timer_minutes}
            onTimeUp={handleTimeUp}
            startTime={room.timer_started_at || undefined}
            hideControls
            isPaused={isPaused}
          />

          {isHost && (
            <div className="flex justify-center">
              {isPaused ? (
                <Button
                  onClick={handleResumeGame}
                  disabled={pauseLoading}
                  size="sm"
                >
                  {pauseLoading ? 'Resuming...' : 'Resume'}
                </Button>
              ) : (
                <Button
                  onClick={handlePauseGame}
                  disabled={pauseLoading}
                  variant="secondary"
                  size="sm"
                >
                  {pauseLoading ? 'Pausing...' : 'Pause'}
                </Button>
              )}
            </div>
          )}

          {/* Finished players */}
          {finishedPlayers.length > 0 && (
            <div className="space-y-1">
              {finishedPlayers.map((p) => (
                <p key={p.userId} className="text-sm text-muted-foreground text-center">
                  @{p.username} finished in {formatElapsedMs(p.elapsedMs)}
                </p>
              ))}
            </div>
          )}

          <AnswerSheet
            answers={answers}
            onSelect={handleAnswerChange}
            mode="guess"
            overtimeRows={overtimeRows}
          />

          <Button
            onClick={() => handleFinish()}
            className="w-full"
            disabled={finishLoading}
          >
            {finishLoading ? 'Finishing...' : `Finish (${answeredCount}/8)`}
          </Button>

          {finishWarning && (
            <Card className="border-orange-400 bg-orange-50">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-orange-700 mb-2">
                  You haven&apos;t answered all rows. Missing:
                </p>
                <div className="flex flex-wrap gap-2">
                  {answers.map((a, i) =>
                    a === null ? (
                      <span
                        key={i}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-200 text-orange-800 text-sm font-semibold"
                      >
                        {i + 1}
                      </span>
                    ) : null
                  )}
                </div>
                <Button
                  onClick={() => handleFinish(true)}
                  variant="outline"
                  className="w-full mt-3 border-orange-400 text-orange-700 hover:bg-orange-100"
                  size="sm"
                  disabled={finishLoading}
                >
                  {finishLoading ? 'Finishing...' : 'Finish Anyway'}
                </Button>
              </CardContent>
            </Card>
          )}
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
          </div>

          {/* Show finish time */}
          {myElapsedMs !== null && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <p className="text-center font-medium">
                  Finished in <span className="text-primary font-bold">{formatElapsedMs(myElapsedMs)}</span>
                </p>
              </CardContent>
            </Card>
          )}

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

          {allRevealed && isHost && (
            <Button onClick={handleEndRound} className="w-full">
              End Round
            </Button>
          )}

          {allRevealed && !isHost && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Waiting for host to start next round...
            </p>
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
              <CardDescription>Select a set to play, or create new ones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Set list */}
              {room.sets.map((set) => {
                const isSelected = selectedSetId === set.id
                return (
                  <div
                    key={set.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => {
                      if (editingSetId !== set.id) setSelectedSetId(isSelected ? null : set.id)
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Set {set.set_number}</span>
                        {isSelected && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
                          onClick={() => {
                            if (selectedSetId === set.id) setSelectedSetId(null)
                            handleDeleteSet(set.id)
                          }}
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
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
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
                )
              })}

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
                disabled={startingGame || room.coffees.length < 2 || !selectedSetId}
              >
                {startingGame
                  ? 'Starting...'
                  : selectedSetId
                    ? `Start Round (Set ${room.sets.find(s => s.id === selectedSetId)?.set_number})`
                    : 'Select a Set to Start'}
              </Button>
              {room.coffees.length < 2 && (
                <p className="text-xs text-muted-foreground text-center">
                  Add at least 2 coffees
                </p>
              )}
              {room.coffees.length >= 2 && room.sets.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Generate at least 1 triangulation set
                </p>
              )}
              {room.sets.length > 0 && !selectedSetId && (
                <p className="text-xs text-muted-foreground text-center">
                  Tap a set above to select it
                </p>
              )}
            </>
          )}

          {isHost && completedRoundsCount > 0 && room.status === 'waiting' && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleEndSession}
              disabled={endingSession}
            >
              {endingSession ? 'Ending Session...' : `End Session (${completedRoundsCount} round${completedRoundsCount === 1 ? '' : 's'})`}
            </Button>
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
