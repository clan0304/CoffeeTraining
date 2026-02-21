import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createClerkClient } from '@clerk/nextjs/server'

export async function POST(request: Request) {
  try {
    const { clerkId } = await getAuthenticatedProfile(request)

    const body = await request.json()
    const { username, bio, photoUrl } = body as {
      username: string
      bio: string | null
      photoUrl: string | null
    }

    // Validate username
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

    // Check username availability
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      )
    }

    // Get email from Clerk
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    const clerkUser = await clerk.users.getUser(clerkId)
    const email =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress || ''

    // Upsert profile
    const { error: dbError } = await supabase.from('user_profiles').upsert(
      {
        clerk_id: clerkId,
        email,
        username,
        bio: bio || null,
        photo_url: photoUrl || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'clerk_id' }
    )

    if (dbError) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Update Clerk metadata
    try {
      await clerk.users.updateUserMetadata(clerkId, {
        publicMetadata: { onboardingComplete: true },
      })
    } catch {
      // Non-fatal — DB is already updated
    }

    return NextResponse.json({ success: true })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
