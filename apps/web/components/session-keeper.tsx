'use client'

import { useEffect } from 'react'
import { useUser, useSession } from '@clerk/nextjs'

export function SessionKeeper() {
  const { user } = useUser()
  const { session } = useSession()

  // Global session keep-alive
  useEffect(() => {
    if (!user || !session) return

    const keepAlive = setInterval(async () => {
      try {
        // Touch Clerk session to keep it alive
        await session.touch()
      } catch (error) {
        console.error('Global session keep-alive error:', error)
      }
    }, 10 * 60 * 1000) // Every 10 minutes

    return () => clearInterval(keepAlive)
  }, [user, session])

  // Activity-based session refresh
  useEffect(() => {
    if (!session) return

    const refreshSession = async () => {
      try {
        await session.touch()
      } catch (error) {
        console.error('Session refresh error:', error)
      }
    }

    // Refresh session on user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    let lastActivity = Date.now()

    const handleActivity = () => {
      const now = Date.now()
      // Only refresh if 5 minutes have passed since last refresh
      if (now - lastActivity > 5 * 60 * 1000) {
        lastActivity = now
        refreshSession()
      }
    }

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [session])

  // Visibility change handler
  useEffect(() => {
    if (!session) return

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
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

  return null // This component doesn't render anything
}