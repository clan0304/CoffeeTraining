'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@clerk/nextjs'
import { getRealtimeClient } from '@/lib/supabase/client'
import { getRoomSyncChannel, getUserInvitationsChannel, CUP_TASTERS_EVENTS, INVITATION_EVENTS } from '@cuppingtraining/shared/constants'
import { getRoomDetails } from '@/actions/rooms'
import { callWithAuthRetry } from '@/lib/auth-retry'
import { GamePhase } from './use-room-game-state'

interface UseRoomRealtimeProps {
  roomId: string
  updateGameState: (phase: GamePhase | 'lobby', params?: Record<string, string>) => void
  setAnswers: (answers: (number | null)[]) => void
  setCorrectAnswers: (answers: (number | null)[]) => void
  setFinishedPlayers: React.Dispatch<React.SetStateAction<Array<{ userId: string; username: string; elapsedMs: number }>>>
  setMyElapsedMs: (ms: number | null) => void
  setIsPaused: (paused: boolean) => void
  setIsOvertime: (overtime: boolean) => void
  setOvertimeRows: (rows: Set<number>) => void
  setShowCountdown: (show: boolean) => void
  setWaitingForTimer: (waiting: boolean) => void
  setCountdownFrom: (count: number) => void
  setRoom: React.Dispatch<React.SetStateAction<any>>
}

export function useRoomRealtime({
  roomId,
  updateGameState,
  setAnswers,
  setCorrectAnswers,
  setFinishedPlayers,
  setMyElapsedMs,
  setIsPaused,
  setIsOvertime,
  setOvertimeRows,
  setShowCountdown,
  setWaitingForTimer,
  setCountdownFrom,
  setRoom
}: UseRoomRealtimeProps) {
  const router = useRouter()
  const { session } = useSession()
  const sessionRef = useRef(session)
  useEffect(() => {
    sessionRef.current = session
  }, [session])
  const realtime = useMemo(() => getRealtimeClient(), [])
  const [roomChannel, setRoomChannel] = useState<ReturnType<typeof realtime.channel> | null>(null)
  const [channelReady, setChannelReady] = useState(false)
  // Bumping this forces the channel setup effect to re-run (e.g. after tab
  // focus when the channel gave up retrying while hidden).
  const [reconnectTrigger, setReconnectTrigger] = useState(0)

  const reloadRoom = () =>
    callWithAuthRetry(
      () => getRoomDetails(roomId),
      { onRetry: () => sessionRef.current?.touch() }
    )

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
          updateGameState('playing')
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
        updateGameState('playing', { timer: timerStartedAt })
        setRoom((prev: any) => prev ? { ...prev, status: 'playing' as const, timer_started_at: timerStartedAt, paused_at: null } : prev)
      })

      channel.on('broadcast', { event: CUP_TASTERS_EVENTS.GAME_PAUSE }, (payload) => {
        console.log('[Realtime] Received game_pause broadcast:', payload)
        setIsPaused(true)
        setRoom((prev: any) => prev ? { ...prev, status: 'paused' as const } : prev)
      })

      channel.on('broadcast', { event: CUP_TASTERS_EVENTS.GAME_RESUME }, (payload) => {
        console.log('[Realtime] Received game_resume broadcast:', payload)
        const { newTimerStartedAt } = payload.payload as { newTimerStartedAt: string }
        setIsPaused(false)
        setRoom((prev: any) => prev ? { ...prev, status: 'playing' as const, timer_started_at: newTimerStartedAt, paused_at: null } : prev)
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
        updateGameState('lobby')
        setAnswers(Array(8).fill(null))
        setCorrectAnswers(Array(8).fill(null))
        setFinishedPlayers([])
        setMyElapsedMs(null)
        setIsPaused(false)
        setIsOvertime(false)
        setOvertimeRows(new Set())
        setShowCountdown(false)
        setWaitingForTimer(false)
        const result = await reloadRoom()
        if (!result.error && result.room) {
          setRoom(result.room)
        }
      })

      channel.on('broadcast', { event: CUP_TASTERS_EVENTS.SESSION_ENDED }, (payload) => {
        console.log('[Realtime] Received session_ended broadcast:', payload)
        const { sessionId } = payload.payload as { sessionId: string }
        router.push(`/sessions/${sessionId}`)
      })

      channel.on('broadcast', { event: CUP_TASTERS_EVENTS.PLAYER_LEFT }, async () => {
        console.log('[Realtime] Received player_left broadcast')
        const result = await reloadRoom()
        if (!result.error && result.room) {
          setRoom(result.room)
        }
      })

      channel.on('broadcast', { event: CUP_TASTERS_EVENTS.ROOM_UPDATED }, async (payload) => {
        console.log('[Realtime] Received room_updated broadcast:', payload)
        const result = await reloadRoom()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, updateGameState, router, reconnectTrigger])

  // If the channel died while the tab was hidden (Supabase realtime gives up
  // after MAX_RETRIES), reconnect when the user returns. Also trigger a fresh
  // room load so state is current post-reconnect.
  useEffect(() => {
    if (!roomId) return

    const maybeReconnect = () => {
      if (document.hidden) return
      if (!channelReady) {
        console.log('[Realtime] Tab active but channel not ready — reconnecting')
        setReconnectTrigger((v) => v + 1)
      }
    }

    window.addEventListener('focus', maybeReconnect)
    document.addEventListener('visibilitychange', maybeReconnect)
    return () => {
      window.removeEventListener('focus', maybeReconnect)
      document.removeEventListener('visibilitychange', maybeReconnect)
    }
  }, [roomId, channelReady])

  const broadcastUpdate = () => {
    roomChannel?.send({ type: 'broadcast', event: CUP_TASTERS_EVENTS.ROOM_UPDATED, payload: {} })
  }

  const sendInviteNotification = (invitedClerkId: string) => {
    if (invitedClerkId) {
      const notifyChannel = realtime.channel(getUserInvitationsChannel(invitedClerkId))
      notifyChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          notifyChannel.send({ type: 'broadcast', event: INVITATION_EVENTS.NEW_INVITATION, payload: {} })
          setTimeout(() => realtime.removeChannel(notifyChannel), 1000)
        }
      })
    }
  }

  return {
    roomChannel,
    channelReady,
    broadcastUpdate,
    sendInviteNotification,
    realtime
  }
}