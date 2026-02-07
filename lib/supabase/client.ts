'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/nextjs'
import { useMemo } from 'react'

export function useSupabaseClient(): SupabaseClient {
  const { session } = useSession()

  return useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          fetch: async (url, options = {}) => {
            const clerkToken = await session?.getToken({ template: 'supabase' })
            const headers = new Headers(options.headers)
            if (clerkToken) {
              headers.set('Authorization', `Bearer ${clerkToken}`)
            }
            return fetch(url, { ...options, headers })
          },
        },
      }
    )
  }, [session])
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
