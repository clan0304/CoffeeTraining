'use client'

import { useEffect } from 'react'
import { useUser, useSession } from '@clerk/nextjs'

export function SessionKeeper() {
  const { user } = useUser()
  const { session } = useSession()

  // Global session keep-alive - refresh every 30 minutes
  useEffect(() => {
    if (!user || !session) return

    const keepAlive = setInterval(async () => {
      try {
        // Touch Clerk session to keep it alive
        await session.touch()
        console.log('Session refreshed:', new Date().toLocaleTimeString())
      } catch (error) {
        console.error('Global session keep-alive error:', error)
      }
    }, 30 * 60 * 1000) // Every 30 minutes

    return () => clearInterval(keepAlive)
  }, [user, session])

  // Activity-based session refresh removed - was causing UX issues
  // Session is maintained via periodic refresh and visibility change only

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