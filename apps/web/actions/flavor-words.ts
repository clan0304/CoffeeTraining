'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

async function getProfileId(): Promise<string | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null
  const supabase = createAdminSupabaseClient()
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()
  return data?.id ?? null
}

export async function getUserFlavorWords(): Promise<{ words: string[] }> {
  const profileId = await getProfileId()
  if (!profileId) return { words: [] }

  const supabase = createAdminSupabaseClient()
  const { data } = await supabase
    .from('user_flavor_words')
    .select('word')
    .eq('user_id', profileId)
    .order('word')

  return { words: (data ?? []).map((r) => r.word) }
}

export async function addFlavorWord(
  word: string
): Promise<{ error?: string }> {
  const profileId = await getProfileId()
  if (!profileId) return { error: 'Not authenticated' }

  const normalized = word.trim().toLowerCase()
  if (!normalized || normalized.length > 100) {
    return { error: 'Invalid word' }
  }

  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('user_flavor_words')
    .upsert({ user_id: profileId, word: normalized }, { onConflict: 'user_id,word' })

  if (error) return { error: error.message }
  return {}
}

export async function removeFlavorWord(
  word: string
): Promise<{ error?: string }> {
  const profileId = await getProfileId()
  if (!profileId) return { error: 'Not authenticated' }

  const normalized = word.trim().toLowerCase()

  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('user_flavor_words')
    .delete()
    .eq('user_id', profileId)
    .eq('word', normalized)

  if (error) return { error: error.message }
  return {}
}
