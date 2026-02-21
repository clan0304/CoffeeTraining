import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/clerk-expo'
import { useMemo, useRef, useEffect } from 'react'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Authenticated Supabase client — passes Clerk JWT via accessToken (native third-party auth)
export function useSupabaseClient(): SupabaseClient {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const supabase = useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      accessToken: async () => {
        const token = await getTokenRef.current()
        return token ?? null
      },
    })
  }, [])

  return supabase
}

// Unauthenticated client for Broadcast/Presence only (no JWT needed)
let realtimeInstance: SupabaseClient | null = null

export function getRealtimeClient(): SupabaseClient {
  if (!realtimeInstance) {
    realtimeInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return realtimeInstance
}
