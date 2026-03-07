'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSupabaseClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  username: string | null
  bio: string | null
  photo_url: string | null
}

export function useUserProfile() {
  const { user, isLoaded } = useUser()
  const supabase = useSupabaseClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false)
      return
    }

    async function fetchProfile() {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('id, username, bio, photo_url')
          .eq('clerk_id', user.id)
          .single<UserProfile>()

        setProfile(data)
      } catch (error) {
        console.error('Error fetching user profile:', error)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, isLoaded, supabase])

  return { profile, loading, isLoaded }
}