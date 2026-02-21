import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const { clerkId } = await getAuthenticatedProfile(request)

    const supabase = createAdminSupabaseClient()
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, username, bio, photo_url, onboarding_completed, email')
      .eq('clerk_id', clerkId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({
        username: null,
        bio: null,
        photo_url: null,
        onboarding_completed: false,
        email: null,
      })
    }

    return NextResponse.json(profile)
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
