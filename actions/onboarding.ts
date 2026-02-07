'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const onboardingSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').nullable(),
  photoUrl: z.string().url().nullable().optional(),
})

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (error) {
    console.error('Error checking username:', error)
    return false
  }

  return data === null
}

export async function uploadProfilePhoto(
  file: File,
  supabaseToken: string
): Promise<{ url?: string; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  try {
    // Create Supabase client with user's token
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${supabaseToken}`,
          },
        },
      }
    )

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, file, {
        upsert: true,
      })

    if (error) {
      console.error('Upload error:', error)
      return { error: 'Failed to upload photo' }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(data.path)

    return { url: urlData.publicUrl }
  } catch (error) {
    console.error('Upload error:', error)
    return { error: 'Failed to upload photo' }
  }
}

export async function completeOnboarding(input: {
  username: string
  bio: string | null
  photoUrl: string | null
}): Promise<{ success?: boolean; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  // Validate input
  const result = onboardingSchema.safeParse(input)
  if (!result.success) {
    return { error: result.error.issues[0]?.message || 'Invalid input' }
  }

  const { username, bio, photoUrl } = result.data

  // Check username availability
  const isAvailable = await checkUsernameAvailability(username)
  if (!isAvailable) {
    return { error: 'Username is already taken' }
  }

  // Update Supabase profile
  const supabase = createAdminSupabaseClient()

  const { error: dbError } = await supabase
    .from('user_profiles')
    .update({
      username,
      bio,
      photo_url: photoUrl,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (dbError) {
    console.error('Database error:', dbError)
    return { error: 'Failed to update profile' }
  }

  // Update Clerk user metadata
  try {
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        onboardingComplete: true,
      },
    })
  } catch (error) {
    console.error('Clerk update error:', error)
    // Don't fail the whole operation, the DB is already updated
  }

  return { success: true }
}
