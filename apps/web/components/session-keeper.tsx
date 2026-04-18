'use client'

import { useEffect, useRef } from 'react'
import { useUser, useSession } from '@clerk/nextjs'

// Clerk session tokens are short-lived (~60s). We proactively touch the session
// well before any practical expiry so long-running game rooms never see a
// transient "Not authenticated" during token rotation.
const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
const MIN_TOUCH_SPACING_MS = 15 * 1000 // coalesce bursts (focus + visibility)

export function SessionKeeper() {
  const { user } = useUser()
  const { session } = useSession()
  const lastTouchRef = useRef(0)
  const sessionRef = useRef(session)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  // Touches the session, but coalesces rapid-fire calls so focus/visibility/
  // storage events don't pile up on top of each other.
  const safeTouch = async (reason: string) => {
    const s = sessionRef.current
    if (!s) return
    const now = Date.now()
    if (now - lastTouchRef.current < MIN_TOUCH_SPACING_MS) return
    lastTouchRef.current = now
    try {
      await s.touch()
    } catch (err) {
      console.error(`[SessionKeeper] touch(${reason}) failed:`, err)
    }
  }

  // Periodic keep-alive.
  useEffect(() => {
    if (!user || !session) return
    // Touch once on mount so we start every page (especially room pages) with
    // a fresh token — avoids the race where a room loads right as Clerk is
    // between refreshes.
    safeTouch('mount')

    const interval = setInterval(() => {
      safeTouch('interval')
    }, KEEP_ALIVE_INTERVAL_MS)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session])

  // Refresh when the tab becomes visible or focused again. Both events fire
  // in some browsers; safeTouch coalesces them.
  useEffect(() => {
    if (!session) return

    const onVisibility = () => {
      if (!document.hidden) void safeTouch('visibility')
    }
    const onFocus = () => void safeTouch('focus')

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  return null
}
