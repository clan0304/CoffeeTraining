'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'

// Singleton client to ensure stable instance across renders
let globalClient: SupabaseClient | null = null
let tokenGetterRef: (() => Promise<string | null>) | null = null

function getOrCreateClient(): SupabaseClient {
  if (!globalClient) {
    globalClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          fetch: async (url, options = {}) => {
            const headers = new Headers(options.headers)
            if (tokenGetterRef) {
              const token = await tokenGetterRef()
              if (token) {
                headers.set('Authorization', `Bearer ${token}`)
              }
            }
            return fetch(url, { ...options, headers })
          },
        },
      }
    )
  }
  return globalClient
}

export function useSupabaseClient(): SupabaseClient {
  const { session } = useSession()
  const supabase = getOrCreateClient()
  const hasSetAuth = useRef(false)

  // Update token getter when session changes
  useEffect(() => {
    if (session) {
      tokenGetterRef = () => session.getToken({ template: 'supabase' })

      // Set realtime auth token
      session.getToken({ template: 'supabase' }).then((token) => {
        if (token && !hasSetAuth.current) {
          supabase.realtime.setAuth(token)
          hasSetAuth.current = true
        }
      })
    }
  }, [session, supabase])

  return supabase
}

// For use outside of React components (e.g., in utility functions)
export function createSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (url, options = {}) => {
          const clerkToken = await getToken()
          const headers = new Headers(options.headers)
          if (clerkToken) {
            headers.set('Authorization', `Bearer ${clerkToken}`)
          }
          return fetch(url, { ...options, headers })
        },
      },
    }
  )
}
