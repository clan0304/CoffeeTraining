'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser, useSession } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Countdown } from '@/components/training/countdown'
import { RoomLobby } from '@/components/rooms/room-lobby'
import { RoomPlaying } from '@/components/rooms/room-playing'
import { RoomInputting } from '@/components/rooms/room-inputting'
import { useRoomGameState } from '@/hooks/use-room-game-state'
import { useRoomRealtime } from '@/hooks/use-room-realtime'
import {
  getRoomDetails,
  inviteUserByUsername,
  cancelInvitation,
  deleteRoom,
  leaveRoom,
  rejoinRoom,
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
  saveCorrectAnswers,
  transferHost,
  updateCoffee,
} from '@/actions/rooms'
import { CUP_TASTERS_EVENTS } from '@cuppingtraining/shared/constants'
import type { RoomWithDetails } from '@/types/room'

function RoomPageContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { session } = useSession()
  const roomId = params.id as string

  // Room basic state
  const [room, setRoom] = useState<RoomWithDetails | null>(null)
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Session keep-alive during game
  useEffect(() => {
    if (!user || !session) return

    const keepAlive = setInterval(async () => {
      try {
        // Touch Clerk session to keep it alive
        await session.touch()
      } catch (error) {
        console.error('Keep-alive error:', error)
      }
    }, 5 * 60 * 1000) // Every 5 minutes

    return () => clearInterval(keepAlive)
  }, [user, session])

  // Visibility change handler to refresh session when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && session) {
        try {
          await session.touch()
        } catch (error) {
          console.error('Session refresh on visibility change:', error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session])

  // Invite state
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [startingGame, setStartingGame] = useState(false)

  // Coffee management
  const [coffeeName, setCoffeeName] = useState('')
  const [coffeeLoading, setCoffeeLoading] = useState(false)
  const [editingCoffeeId, setEditingCoffeeId] = useState<string | null>(null)
  const [editingCoffeeName, setEditingCoffeeName] = useState('')

  // Set management
  const [generatingSet, setGeneratingSet] = useState(false)
  const [creatingManualSet, setCreatingManualSet] = useState(false)
  const [editingSetId, setEditingSetId] = useState<string | null>(null)
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)

  // Game state hook
  const gameState = useRoomGameState()

  // Load room data
  const loadRoom = useCallback(async () => {
    const result = await getRoomDetails(roomId)
    if (result.error) {
      setError(result.error)
    } else if (result.room) {
      setRoom(result.room)
      if (result.currentUserProfileId) {
        setCurrentUserProfileId(result.currentUserProfileId)
      }
      gameState.setActiveSessionId(result.activeSessionId ?? null)
      gameState.setCompletedRoundsCount(result.completedRoundsCount ?? 0)
      
      // Restore game state if needed
      gameState.restoreGameState(result.room)
    }
    setLoading(false)
  }, [roomId, gameState])

  // Initialize room data on mount
  useEffect(() => {
    let cancelled = false
    
    const initializeRoom = async () => {
      const result = await getRoomDetails(roomId)
      if (cancelled) return
      
      if (result.error) {
        setError(result.error)
      } else if (result.room) {
        setRoom(result.room)
        if (result.currentUserProfileId) {
          setCurrentUserProfileId(result.currentUserProfileId)
        }
        gameState.setActiveSessionId(result.activeSessionId ?? null)
        gameState.setCompletedRoundsCount(result.completedRoundsCount ?? 0)
        
        // Restore game state if needed
        gameState.restoreGameState(result.room)
      }
      setLoading(false)
    }
    
    initializeRoom()
    
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]) // Only roomId to avoid re-running when gameState changes

  // Handle visibility change (mobile app switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && room) {
        console.log('[Mobile] App became visible, refreshing room state')
        loadRoom()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [room, loadRoom])

  // Handle page focus (desktop/mobile)
  useEffect(() => {
    const handleFocus = () => {
      if (room) {
        console.log('[Focus] Page focused, checking room state')
        loadRoom()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [room, loadRoom])

  // Watch room status and show countdown when status is 'countdown'
  useEffect(() => {
    if (room?.status === 'countdown' && !gameState.showCountdown) {
      gameState.setShowCountdown(true)
    }
  }, [room?.status, gameState])

  // Realtime hook
  const realtime = useRoomRealtime({
    roomId,
    updateGameState: gameState.updateGameState,
    setAnswers: gameState.setAnswers,
    setCorrectAnswers: gameState.setCorrectAnswers,
    setFinishedPlayers: gameState.setFinishedPlayers,
    setMyElapsedMs: gameState.setMyElapsedMs,
    setIsPaused: gameState.setIsPaused,
    setIsOvertime: gameState.setIsOvertime,
    setOvertimeRows: gameState.setOvertimeRows,
    setShowCountdown: gameState.setShowCountdown,
    setWaitingForTimer: gameState.setWaitingForTimer,
    setCountdownFrom: gameState.setCountdownFrom,
    setRoom,
    room
  })

  // Event handlers
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
      realtime.broadcastUpdate()
      if (result.invitedClerkId) {
        realtime.sendInviteNotification(result.invitedClerkId)
      }
    }

    setInviteLoading(false)
  }

  const handleQuickInvite = async (username: string) => {
    setInviteUsername(username)
    setInviteError(null)
    setInviteSuccess(null)
    setInviteLoading(true)
    
    const result = await inviteUserByUsername(roomId, username)
    if (result.error) {
      setInviteError(result.error)
    } else {
      setInviteSuccess(`Invitation sent to @${username}`)
      setInviteUsername('')
      loadRoom()
      realtime.broadcastUpdate()
      if (result.invitedClerkId) {
        realtime.sendInviteNotification(result.invitedClerkId)
      }
    }
    setInviteLoading(false)
  }

  const handleCancelInvitation = async (invitationId: string) => {
    const result = await cancelInvitation(invitationId)
    if (!result.error) {
      loadRoom()
      realtime.broadcastUpdate()
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

    const result = await startGame(roomId, selectedSetId)
    if (result.error) {
      console.warn('Start game error:', result.error)
      setStartingGame(false)
      return
    }

    const countdownStartedAt = Date.now()
    gameState.setCountdownFrom(5)
    gameState.setShowCountdown(true)

    if (realtime.roomChannel) {
      await realtime.roomChannel.send({
        type: 'broadcast',
        event: CUP_TASTERS_EVENTS.GAME_START,
        payload: { startedAt: countdownStartedAt },
      })
    }

    setStartingGame(false)
  }

  const handleCountdownComplete = async () => {
    if (currentUserProfileId === room?.host_id) {
      const result = await beginPlaying(roomId)
      if (result.error) {
        console.error('Begin playing error:', result.error)
        return
      }

      const timerStartedAt = result.timerStartedAt!
      gameState.setShowCountdown(false)
      gameState.setFinishedPlayers([])
      gameState.setMyElapsedMs(null)
      gameState.setAnswers(Array(8).fill(null))
      gameState.setCorrectAnswers(Array(8).fill(null))
      gameState.updateGameState('playing', { timer: timerStartedAt })
      setRoom((prev) => prev ? { ...prev, status: 'playing' as const, timer_started_at: timerStartedAt } : prev)

      realtime.roomChannel?.send({
        type: 'broadcast',
        event: CUP_TASTERS_EVENTS.GAME_PLAYING,
        payload: { timerStartedAt },
      })
    } else {
      gameState.setShowCountdown(false)
      gameState.setWaitingForTimer(true)
      gameState.setAnswers(Array(8).fill(null))
      gameState.setCorrectAnswers(Array(8).fill(null))
      gameState.updateGameState('playing')
    }
  }

  const handlePauseGame = async () => {
    gameState.setPauseLoading(true)
    const result = await pauseGame(roomId)
    if (result.error) {
      console.error('Pause error:', result.error)
    } else {
      gameState.setIsPaused(true)
      setRoom((prev) => prev ? { ...prev, status: 'paused' as const } : prev)
      realtime.roomChannel?.send({
        type: 'broadcast',
        event: CUP_TASTERS_EVENTS.GAME_PAUSE,
        payload: {},
      })
    }
    gameState.setPauseLoading(false)
  }

  const handleResumeGame = async () => {
    gameState.setPauseLoading(true)
    const result = await resumeGame(roomId)
    if (result.error) {
      console.error('Resume error:', result.error)
    } else {
      const newTimerStartedAt = result.newTimerStartedAt!
      gameState.setIsPaused(false)
      setRoom((prev) => prev ? { ...prev, status: 'playing' as const, timer_started_at: newTimerStartedAt, paused_at: null } : prev)
      realtime.roomChannel?.send({
        type: 'broadcast',
        event: CUP_TASTERS_EVENTS.GAME_RESUME,
        payload: { newTimerStartedAt },
      })
    }
    gameState.setPauseLoading(false)
  }

  const handleFinish = async (force = false) => {
    if (gameState.myElapsedMs !== null) {
      gameState.updateGameState('inputting', { 
        answers: gameState.answers.map(a => a?.toString() ?? 'null').join(','),
        ...(room?.timer_started_at && { timer: room.timer_started_at })
      })
      return
    }

    const unanswered = gameState.answers.filter((a) => a === null).length
    if (unanswered > 0 && !force) {
      gameState.setFinishWarning(true)
      return
    }
    gameState.setFinishWarning(false)

    gameState.setFinishLoading(true)
    const result = await finishRound(roomId, gameState.answers)
    if (result.error) {
      console.error('Finish error:', result.error)
      if (result.error === 'Game is not in progress') {
        gameState.setFinishLoading(false)
        gameState.updateGameState('lobby')
        gameState.setAnswers(Array(8).fill(null))
        gameState.setCorrectAnswers(Array(8).fill(null))
        gameState.setFinishedPlayers([])
        gameState.setMyElapsedMs(null)
        gameState.setIsPaused(false)
        gameState.setShowCountdown(false)
        gameState.setWaitingForTimer(false)
        await loadRoom()
        return
      }
    } else if (result.elapsedMs !== undefined) {
      gameState.setMyElapsedMs(result.elapsedMs)
      const username = user?.username || user?.firstName || 'Unknown'
      realtime.roomChannel?.send({
        type: 'broadcast',
        event: CUP_TASTERS_EVENTS.PLAYER_FINISHED,
        payload: { userId: currentUserProfileId, username, elapsedMs: result.elapsedMs },
      })
    }
    gameState.setFinishLoading(false)
    gameState.updateGameState('inputting', { 
      answers: gameState.answers.map(a => a?.toString() ?? 'null').join(','),
      ...(room?.timer_started_at && { timer: room.timer_started_at })
    })
  }

  const handleTimeUp = () => {
    gameState.setIsOvertime(true)
  }

  const handleAnswerChange = (rowIndex: number, position: number) => {
    gameState.setFinishWarning(false)
    gameState.setAnswers((prev) => {
      const newAnswers = [...prev]
      newAnswers[rowIndex] = prev[rowIndex] === position ? null : position
      
      const answersString = newAnswers.map(a => a?.toString() ?? 'null').join(',')
      gameState.updateGameState(gameState.gamePhase, { 
        answers: answersString,
        ...(room?.timer_started_at && { timer: room.timer_started_at })
      })
      
      return newAnswers
    })
    if (gameState.isOvertime) {
      gameState.setOvertimeRows((prev) => {
        const next = new Set(prev)
        next.add(rowIndex)
        return next
      })
    }
  }

  const handleCorrectAnswerChange = (rowIndex: number, position: number) => {
    const newCorrect = [...gameState.correctAnswers]
    newCorrect[rowIndex] = gameState.correctAnswers[rowIndex] === position ? null : position
    gameState.setCorrectAnswers(newCorrect)

    const revealedCount = newCorrect.filter((a) => a !== null).length
    if (revealedCount === 8) {
      saveCorrectAnswers(roomId, newCorrect)
    }
  }

  const handleEndRound = async () => {
    const result = await endRound(roomId)
    if (result.error) {
      console.error('End round error:', result.error)
      return
    }

    gameState.resetGameState()
    gameState.setEndRoundConfirm(false)

    realtime.roomChannel?.send({
      type: 'broadcast',
      event: CUP_TASTERS_EVENTS.ROUND_ENDED,
      payload: {},
    })

    loadRoom()
  }

  const handleEndSession = async () => {
    gameState.setEndingSession(true)
    const result = await endSession(roomId)
    if (result.error) {
      console.error('End session error:', result.error)
      gameState.setEndingSession(false)
      return
    }

    realtime.roomChannel?.send({
      type: 'broadcast',
      event: CUP_TASTERS_EVENTS.SESSION_ENDED,
      payload: { sessionId: result.sessionId },
    })

    gameState.updateGameState('lobby')
    router.push(`/sessions/${result.sessionId}`)
  }

  const handleLeaveRoom = async () => {
    gameState.setLeaveLoading(true)
    const result = await leaveRoom(roomId)
    if (result.error) {
      console.error('Leave room error:', result.error)
      gameState.setLeaveLoading(false)
      return
    }
    realtime.roomChannel?.send({
      type: 'broadcast',
      event: CUP_TASTERS_EVENTS.PLAYER_LEFT,
      payload: {},
    })
    router.push('/')
  }

  const handleRejoinRoom = async () => {
    gameState.setRejoinLoading(true)
    const result = await rejoinRoom(roomId)
    if (result.error) {
      console.error('Rejoin error:', result.error)
      gameState.setRejoinLoading(false)
      return
    }
    realtime.roomChannel?.send({
      type: 'broadcast',
      event: CUP_TASTERS_EVENTS.ROOM_UPDATED,
      payload: {},
    })
    await loadRoom()
    gameState.setRejoinLoading(false)
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
      realtime.broadcastUpdate()
    }
    setCoffeeLoading(false)
  }

  const handleRemoveCoffee = async (coffeeId: string) => {
    await removeCoffee(coffeeId)
    loadRoom()
    realtime.broadcastUpdate()
  }

  const handleUpdateCoffee = async (coffeeId: string) => {
    if (!editingCoffeeName.trim()) return
    const result = await updateCoffee(coffeeId, editingCoffeeName.trim())
    if (!result.error) {
      setEditingCoffeeId(null)
      setEditingCoffeeName('')
      loadRoom()
      realtime.broadcastUpdate()
    }
  }

  // Set management
  const handleGenerateSet = async () => {
    setGeneratingSet(true)
    const result = await generateTriangulationSet(roomId)
    if (!result.error) {
      loadRoom()
      realtime.broadcastUpdate()
    }
    setGeneratingSet(false)
  }

  const handleDeleteSet = async (setId: string) => {
    await deleteSet(setId)
    loadRoom()
    realtime.broadcastUpdate()
  }

  const handleCreateManualSet = async () => {
    setCreatingManualSet(true)
    const result = await createEmptySet(roomId)
    if (!result.error && result.set) {
      setEditingSetId(result.set.id)
      loadRoom()
      realtime.broadcastUpdate()
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
    realtime.broadcastUpdate()
  }

  const handleTransferHost = async (playerId: string) => {
    const result = await transferHost(roomId, playerId)
    if (!result.error) {
      realtime.broadcastUpdate()
      loadRoom()
    }
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
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isHost = currentUserProfileId === room.host_id
  const isMember = room.players.some((p) => p.user_id === currentUserProfileId)

  // Not a member — show rejoin UI or redirect
  if (!isMember && !loading) {
    const isInProgress = room.status === 'playing' || room.status === 'paused' || room.status === 'countdown'
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-8 text-center">
          <h1 className="text-2xl font-bold">{room.name || 'Training Room'}</h1>
          {isInProgress ? (
            <>
              <p className="text-muted-foreground">A game is in progress. Rejoin to continue playing.</p>
              <Button onClick={handleRejoinRoom} disabled={gameState.rejoinLoading}>
                {gameState.rejoinLoading ? 'Rejoining...' : 'Rejoin Game'}
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">You are not a member of this room.</p>
          )}
          <div>
            <Button variant="ghost" onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Countdown view - shown when host starts the game
  if (gameState.showCountdown) {
    return <Countdown from={gameState.countdownFrom} onComplete={handleCountdownComplete} />
  }

  // Waiting for host to set the timer (non-host only)
  if (gameState.waitingForTimer) {
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
  const isGameActive = room.status === 'playing' || room.status === 'paused' || (room.status === 'countdown' && !gameState.showCountdown)
  if (isGameActive && gameState.gamePhase === 'playing') {
    return (
      <RoomPlaying
        room={room}
        isHost={isHost}
        answers={gameState.answers}
        finishedPlayers={gameState.finishedPlayers}
        overtimeRows={gameState.overtimeRows}
        isPaused={gameState.isPaused}
        pauseLoading={gameState.pauseLoading}
        finishLoading={gameState.finishLoading}
        finishWarning={gameState.finishWarning}
        leaveConfirm={gameState.leaveConfirm}
        leaveLoading={gameState.leaveLoading}
        onAnswerChange={handleAnswerChange}
        onFinish={handleFinish}
        onPauseGame={handlePauseGame}
        onResumeGame={handleResumeGame}
        onTimeUp={handleTimeUp}
        setFinishWarning={gameState.setFinishWarning}
        setLeaveConfirm={gameState.setLeaveConfirm}
        onLeaveRoom={handleLeaveRoom}
      />
    )
  }

  // Inputting view - checking cups and seeing results
  if (isGameActive && gameState.gamePhase === 'inputting') {
    return (
      <RoomInputting
        room={room}
        isHost={isHost}
        answers={gameState.answers}
        correctAnswers={gameState.correctAnswers}
        myElapsedMs={gameState.myElapsedMs}
        endRoundConfirm={gameState.endRoundConfirm}
        leaveConfirm={gameState.leaveConfirm}
        leaveLoading={gameState.leaveLoading}
        onCorrectAnswerChange={handleCorrectAnswerChange}
        onEndRound={handleEndRound}
        setEndRoundConfirm={gameState.setEndRoundConfirm}
        setLeaveConfirm={gameState.setLeaveConfirm}
        onLeaveRoom={handleLeaveRoom}
      />
    )
  }

  // Waiting lobby view
  return (
    <RoomLobby
      room={room}
      isHost={isHost}
      currentUserProfileId={currentUserProfileId}
      completedRoundsCount={gameState.completedRoundsCount}
      inviteUsername={inviteUsername}
      setInviteUsername={setInviteUsername}
      inviteLoading={inviteLoading}
      inviteError={inviteError}
      inviteSuccess={inviteSuccess}
      onInvite={handleInvite}
      onCancelInvitation={handleCancelInvitation}
      onQuickInvite={handleQuickInvite}
      coffeeName={coffeeName}
      setCoffeeName={setCoffeeName}
      coffeeLoading={coffeeLoading}
      editingCoffeeId={editingCoffeeId}
      setEditingCoffeeId={setEditingCoffeeId}
      editingCoffeeName={editingCoffeeName}
      setEditingCoffeeName={setEditingCoffeeName}
      onAddCoffee={handleAddCoffee}
      onRemoveCoffee={handleRemoveCoffee}
      onUpdateCoffee={handleUpdateCoffee}
      generatingSet={generatingSet}
      creatingManualSet={creatingManualSet}
      editingSetId={editingSetId}
      setEditingSetId={setEditingSetId}
      selectedSetId={selectedSetId}
      setSelectedSetId={setSelectedSetId}
      onGenerateSet={handleGenerateSet}
      onCreateManualSet={handleCreateManualSet}
      onDeleteSet={handleDeleteSet}
      onUpdateRow={handleUpdateRow}
      startingGame={startingGame}
      onStartGame={handleStartGame}
      onLeaveRoom={handleLeaveRoom}
      onDeleteRoom={handleDeleteRoom}
      onTransferHost={handleTransferHost}
      onCopyRoomCode={copyRoomCode}
      endSessionConfirm={gameState.endSessionConfirm}
      setEndSessionConfirm={gameState.setEndSessionConfirm}
      endingSession={gameState.endingSession}
      onEndSession={handleEndSession}
      leaveLoading={gameState.leaveLoading}
    />
  )
}

export default function RoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading room...</p>
      </div>
    }>
      <RoomPageContent />
    </Suspense>
  )
}