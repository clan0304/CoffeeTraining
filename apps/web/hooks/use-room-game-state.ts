'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Room } from '@cuppingtraining/shared/types'

export type GamePhase = 'playing' | 'inputting' | 'finished'

type RoomSyncState = Pick<Room, 'status' | 'timer_started_at' | 'paused_at' | 'updated_at'>

const DEFAULT_ROW_COUNT = 8
const MIN_ROW_COUNT = 3
const MAX_ROW_COUNT = 12

function parseAnswersParam(value: string | null) {
  if (!value) return null

  try {
    const parsed = value.split(',').map((answer) => answer === 'null' ? null : parseInt(answer, 10))
    return parsed.length >= MIN_ROW_COUNT && parsed.length <= MAX_ROW_COUNT ? parsed : null
  } catch {
    return null
  }
}

function timersMatch(left: string | null, right: string | null) {
  if (!left || !right) return false

  const leftMs = new Date(left).getTime()
  const rightMs = new Date(right).getTime()

  if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) return false

  return Math.abs(leftMs - rightMs) < 5000
}

function hasRoundUrlParams() {
  if (typeof window === 'undefined') return false

  const url = new URL(window.location.href)
  return ['phase', 'answers', 'timer', 'sessionId'].some((key) => url.searchParams.has(key))
}

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
  // Rows in the current round's set ("sets" in cup tasters terms). Updated by
  // the page from the active set / room settings; answer arrays follow it.
  const rowCountRef = useRef(DEFAULT_ROW_COUNT)
  const [answers, setAnswers] = useState<(number | null)[]>(() => {
    const parsed = parseAnswersParam(searchParams.get('answers'))
    return parsed ?? Array(DEFAULT_ROW_COUNT).fill(null)
  })
  const [correctAnswers, setCorrectAnswers] = useState<(number | null)[]>(Array(DEFAULT_ROW_COUNT).fill(null))
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
  const activeRoundKeyRef = useRef<string | null>(null)
  const lastRoomStatusRef = useRef<RoomSyncState['status'] | null>(null)
  const stateRef = useRef({
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
    finishedPlayers,
    myElapsedMs,
  })

  useEffect(() => {
    stateRef.current = {
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
      finishedPlayers,
      myElapsedMs,
    }
  }, [
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
    finishedPlayers,
    myElapsedMs,
  ])

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

  const setRoundRowCount = useCallback((count: number) => {
    if (Number.isFinite(count)) {
      rowCountRef.current = Math.min(MAX_ROW_COUNT, Math.max(MIN_ROW_COUNT, count))
    }
  }, [])

  const makeEmptyAnswers = useCallback(
    () => Array<number | null>(rowCountRef.current).fill(null),
    []
  )

  // An answers array needs resetting if it has marks OR its length no longer
  // matches the current round's row count.
  const answersNeedReset = useCallback(
    (arr: (number | null)[]) =>
      arr.length !== rowCountRef.current || arr.some((answer) => answer !== null),
    []
  )

  const resetGameState = useCallback(() => {
    updateGameState('lobby')
    activeRoundKeyRef.current = null
    lastRoomStatusRef.current = 'waiting'
    setAnswers(makeEmptyAnswers())
    setCorrectAnswers(makeEmptyAnswers())
    setFinishedPlayers([])
    setMyElapsedMs(null)
    setIsPaused(false)
    setIsOvertime(false)
    setOvertimeRows(new Set())
    setFinishWarning(false)
    setEndRoundConfirm(false)
    setShowCountdown(false)
    setWaitingForTimer(false)
  }, [updateGameState, makeEmptyAnswers])

  const clearRoundStateForLobby = useCallback(() => {
    const state = stateRef.current

    activeRoundKeyRef.current = null

    if (hasRoundUrlParams() || state.gamePhase !== 'playing') {
      updateGameState('lobby')
    }

    if (answersNeedReset(state.answers)) setAnswers(makeEmptyAnswers())
    if (answersNeedReset(state.correctAnswers)) setCorrectAnswers(makeEmptyAnswers())
    if (state.finishedPlayers.length > 0) setFinishedPlayers([])
    if (state.myElapsedMs !== null) setMyElapsedMs(null)
    if (state.isPaused) setIsPaused(false)
    if (state.isOvertime) setIsOvertime(false)
    if (state.overtimeRows.size > 0) setOvertimeRows(new Set())
    if (state.finishWarning) setFinishWarning(false)
    if (state.endRoundConfirm) setEndRoundConfirm(false)
    if (state.showCountdown) setShowCountdown(false)
    if (state.waitingForTimer) setWaitingForTimer(false)
  }, [updateGameState, makeEmptyAnswers, answersNeedReset])

  const syncFromRoom = useCallback((room: RoomSyncState, rowCount?: number) => {
    if (typeof window === 'undefined') return

    if (rowCount !== undefined) setRoundRowCount(rowCount)

    const state = stateRef.current

    if (room.status === 'waiting' || room.status === 'finished') {
      lastRoomStatusRef.current = room.status
      clearRoundStateForLobby()
      return
    }

    if (room.status === 'countdown') {
      if (lastRoomStatusRef.current !== 'countdown') {
        activeRoundKeyRef.current = null
        if (answersNeedReset(state.answers)) setAnswers(makeEmptyAnswers())
        if (answersNeedReset(state.correctAnswers)) setCorrectAnswers(makeEmptyAnswers())
        if (state.finishedPlayers.length > 0) setFinishedPlayers([])
        if (state.myElapsedMs !== null) setMyElapsedMs(null)
        if (state.isOvertime) setIsOvertime(false)
        if (state.overtimeRows.size > 0) setOvertimeRows(new Set())
      }

      const countdownStartedAt = new Date(room.updated_at).getTime()
      const elapsedMs = Number.isFinite(countdownStartedAt)
        ? Math.max(0, Date.now() - countdownStartedAt)
        : 0
      const remaining = Math.ceil((5000 - elapsedMs) / 1000)

      if (remaining > 0) {
        const nextCount = Math.min(5, Math.max(1, remaining))
        if (state.countdownFrom !== nextCount) setCountdownFrom(nextCount)
        if (!state.showCountdown) setShowCountdown(true)
        if (state.waitingForTimer) setWaitingForTimer(false)
      } else {
        if (state.showCountdown) setShowCountdown(false)
        if (!state.waitingForTimer) setWaitingForTimer(true)
        if (state.gamePhase !== 'playing') updateGameState('playing')
      }

      if (state.isPaused) setIsPaused(false)
      lastRoomStatusRef.current = room.status
      return
    }

    const isPausedByRoom = room.status === 'paused'
    if (state.showCountdown) setShowCountdown(false)
    if (state.isPaused !== isPausedByRoom) setIsPaused(isPausedByRoom)

    if (!room.timer_started_at) {
      if (!state.waitingForTimer) setWaitingForTimer(true)
      lastRoomStatusRef.current = room.status
      return
    }

    if (state.waitingForTimer) setWaitingForTimer(false)

    const url = new URL(window.location.href)
    const urlPhase = url.searchParams.get('phase') as GamePhase | null
    const urlTimer = url.searchParams.get('timer')
    const urlAnswers = parseAnswersParam(url.searchParams.get('answers'))
    const urlTimerMatches = timersMatch(urlTimer, room.timer_started_at)
    const urlPhaseIsValid = !!urlPhase && ['playing', 'inputting', 'finished'].includes(urlPhase)
    const roundChanged = activeRoundKeyRef.current !== room.timer_started_at

    if (roundChanged) {
      activeRoundKeyRef.current = room.timer_started_at
      if (state.finishedPlayers.length > 0) setFinishedPlayers([])
      if (state.myElapsedMs !== null) setMyElapsedMs(null)
      if (state.isOvertime) setIsOvertime(false)
      if (state.overtimeRows.size > 0) setOvertimeRows(new Set())
      if (state.finishWarning) setFinishWarning(false)
      if (state.endRoundConfirm) setEndRoundConfirm(false)

      if (urlTimerMatches && urlPhaseIsValid) {
        setGamePhase(urlPhase)
        // Restore URL answers only if they match this round's row count
        setAnswers(
          urlAnswers && urlAnswers.length === rowCountRef.current
            ? urlAnswers
            : makeEmptyAnswers()
        )
        if (urlPhase === 'playing' || state.correctAnswers.length !== rowCountRef.current) {
          setCorrectAnswers(makeEmptyAnswers())
        }
      } else {
        setAnswers(makeEmptyAnswers())
        setCorrectAnswers(makeEmptyAnswers())
        updateGameState('playing', { timer: room.timer_started_at })
      }
    } else if (state.gamePhase === 'playing' && !urlTimerMatches) {
      updateGameState('playing', { timer: room.timer_started_at })
    }

    lastRoomStatusRef.current = room.status
  }, [clearRoundStateForLobby, updateGameState, makeEmptyAnswers, answersNeedReset, setRoundRowCount])

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
    syncFromRoom,
    setRoundRowCount,
    makeEmptyAnswers,
  }
}
