'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export type GamePhase = 'playing' | 'inputting' | 'finished'

export function useRoomGameState() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Game state - initialize from URL params
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownFrom, setCountdownFrom] = useState(5)
  const [waitingForTimer, setWaitingForTimer] = useState(false)
  const [gamePhase, setGamePhase] = useState<GamePhase>(() => {
    const phase = searchParams.get('phase') as GamePhase
    return ['playing', 'inputting', 'finished'].includes(phase) ? phase : 'playing'
  })
  const [answers, setAnswers] = useState<(number | null)[]>(() => {
    const answersParam = searchParams.get('answers')
    if (answersParam) {
      try {
        const parsed = answersParam.split(',').map(a => a === 'null' ? null : parseInt(a))
        return parsed.length === 8 ? parsed : Array(8).fill(null)
      } catch {
        return Array(8).fill(null)
      }
    }
    return Array(8).fill(null)
  })
  const [correctAnswers, setCorrectAnswers] = useState<(number | null)[]>(Array(8).fill(null))
  const [isPaused, setIsPaused] = useState(false)
  const [isOvertime, setIsOvertime] = useState(false)
  const [overtimeRows, setOvertimeRows] = useState<Set<number>>(new Set())
  const [finishWarning, setFinishWarning] = useState(false)
  const [endRoundConfirm, setEndRoundConfirm] = useState(false)
  const [pauseLoading, setPauseLoading] = useState(false)
  const [finishedPlayers, setFinishedPlayers] = useState<Array<{ userId: string; username: string; elapsedMs: number }>>([])
  const [myElapsedMs, setMyElapsedMs] = useState<number | null>(null)
  const [finishLoading, setFinishLoading] = useState(false)
  const [endingSession, setEndingSession] = useState(false)
  const [endSessionConfirm, setEndSessionConfirm] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    return searchParams.get('sessionId')
  })
  const [completedRoundsCount, setCompletedRoundsCount] = useState(0)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [rejoinLoading, setRejoinLoading] = useState(false)

  // Update URL when game state changes
  const updateGameState = useCallback((newPhase: GamePhase | 'lobby', additionalParams?: Record<string, string>) => {
    setGamePhase(newPhase === 'lobby' ? 'playing' : newPhase)
    const url = new URL(window.location.href)
    
    if (newPhase === 'lobby') {
      // Clear all game state params when returning to lobby
      url.searchParams.delete('phase')
      url.searchParams.delete('answers')
      url.searchParams.delete('timer')
      url.searchParams.delete('sessionId')
    } else {
      url.searchParams.set('phase', newPhase)
      if (additionalParams) {
        Object.entries(additionalParams).forEach(([key, value]) => {
          if (value) {
            url.searchParams.set(key, value)
          } else {
            url.searchParams.delete(key)
          }
        })
      }
    }
    
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router])

  const resetGameState = useCallback(() => {
    updateGameState('lobby')
    setAnswers(Array(8).fill(null))
    setCorrectAnswers(Array(8).fill(null))
    setFinishedPlayers([])
    setMyElapsedMs(null)
    setIsPaused(false)
    setIsOvertime(false)
    setOvertimeRows(new Set())
    setFinishWarning(false)
    setEndRoundConfirm(false)
    setShowCountdown(false)
    setWaitingForTimer(false)
  }, [updateGameState])

  const restoreGameState = useCallback((room: any) => {
    // If room is playing and we have URL params indicating we're in a game, restore state
    if (room.status === 'playing' || room.status === 'paused') {
      const urlPhase = searchParams.get('phase')
      const urlTimer = searchParams.get('timer')
      
      if (urlPhase && ['playing', 'inputting', 'finished'].includes(urlPhase)) {
        console.log('[State Restore] Restoring game phase from URL:', urlPhase)
        setGamePhase(urlPhase as GamePhase)
        
        // Restore timer state if available
        if (urlTimer && room.timer_started_at) {
          const urlTimerTime = new Date(urlTimer).getTime()
          const roomTimerTime = new Date(room.timer_started_at).getTime()
          
          // Only restore if URL timer matches room timer (same game session)
          if (Math.abs(urlTimerTime - roomTimerTime) < 5000) { // 5 second tolerance
            console.log('[State Restore] Timer state validated and restored')
          } else {
            console.log('[State Restore] Timer mismatch, clearing URL params')
            updateGameState('playing', { timer: room.timer_started_at })
          }
        }
      }
    } else if (room.status === 'waiting') {
      // Room is back to waiting, clear any game state from URL
      const urlPhase = searchParams.get('phase')
      if (urlPhase && urlPhase !== 'lobby') {
        console.log('[State Restore] Room is waiting, clearing game state from URL')
        updateGameState('lobby')
      }
    }
  }, [searchParams, updateGameState])

  return {
    // State
    showCountdown,
    countdownFrom,
    waitingForTimer,
    gamePhase,
    answers,
    correctAnswers,
    isPaused,
    isOvertime,
    overtimeRows,
    finishWarning,
    endRoundConfirm,
    pauseLoading,
    finishedPlayers,
    myElapsedMs,
    finishLoading,
    endingSession,
    endSessionConfirm,
    activeSessionId,
    completedRoundsCount,
    leaveConfirm,
    leaveLoading,
    rejoinLoading,
    
    // Setters
    setShowCountdown,
    setCountdownFrom,
    setWaitingForTimer,
    setGamePhase,
    setAnswers,
    setCorrectAnswers,
    setIsPaused,
    setIsOvertime,
    setOvertimeRows,
    setFinishWarning,
    setEndRoundConfirm,
    setPauseLoading,
    setFinishedPlayers,
    setMyElapsedMs,
    setFinishLoading,
    setEndingSession,
    setEndSessionConfirm,
    setActiveSessionId,
    setCompletedRoundsCount,
    setLeaveConfirm,
    setLeaveLoading,
    setRejoinLoading,
    
    // Methods
    updateGameState,
    resetGameState,
    restoreGameState,
  }
}