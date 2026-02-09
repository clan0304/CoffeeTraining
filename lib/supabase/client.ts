'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/nextjs'
import { useEffect, useRef, useMemo } from 'react'

export function useSupabaseClient(): SupabaseClient {
  const { session } = useSession()
  const sessionRef = useRef(session)

  // Keep ref in sync so the accessToken callback always uses the latest session
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        accessToken: async () => {
          const token = await sessionRef.current?.getToken()
          console.log('[Supabase] accessToken called, got:', token ? `${token.substring(0, 20)}...` : 'null')
          return token ?? null
        },
      }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Create once — session updates flow through the ref

  return supabase
}
