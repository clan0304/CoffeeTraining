import { verifyToken } from '@clerk/backend'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

interface AuthResult {
  profileId: string
  clerkId: string
}

/**
 * Verify Bearer token from mobile app and resolve to profile UUID.
 * Throws Response with 401 if invalid.
 */
export async function getAuthenticatedProfile(
  request: Request
): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.slice(7)

  // Verify the JWT with Clerk
  let clerkId: string
  try {
    const { sub } = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    clerkId = sub
  } catch {
    throw new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Resolve Clerk ID → user_profiles.id UUID
  const supabase = createAdminSupabaseClient()
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_id', clerkId)
    .maybeSingle()

  if (error) {
    throw new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!profile) {
    // Profile doesn't exist yet — return clerkId so caller can create it
    return { profileId: '', clerkId }
  }

  return { profileId: profile.id, clerkId }
}
