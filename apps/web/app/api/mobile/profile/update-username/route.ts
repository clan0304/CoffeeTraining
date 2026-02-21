import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { clerkId } = await getAuthenticatedProfile(request)

    const body = await request.json()
    const { username } = body as { username: string }

    // Validate
    if (!username || username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { error: 'Username must be 3-30 characters' },
        { status: 400 }
      )
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Check availability (excluding current user)
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id, clerk_id')
      .eq('username', username)
      .maybeSingle()

    if (existing && existing.clerk_id !== clerkId) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      )
    }

    // Update
    const { error: dbError } = await supabase
      .from('user_profiles')
      .update({ username, updated_at: new Date().toISOString() })
      .eq('clerk_id', clerkId)

    if (dbError) {
      return NextResponse.json(
        { error: 'Failed to update username' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
