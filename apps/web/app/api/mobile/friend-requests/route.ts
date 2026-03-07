import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// GET — received pending friend requests
export async function GET(request: Request) {
  try {
    const { profileId } = await getAuthenticatedProfile(request)
    if (!profileId) {
      return NextResponse.json({ requests: [] })
    }

    const supabase = createAdminSupabaseClient()
    const { data } = await supabase
      .from('user_friend_requests')
      .select('id, sender_id, recipient_id, status, created_at, updated_at, sender:user_profiles!user_friend_requests_sender_id_fkey(username, photo_url)')
      .eq('recipient_id', profileId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const requests = (data ?? []).map((row: any) => ({
      id: row.id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      sender_username: row.sender?.username ?? 'Unknown',
      sender_photo_url: row.sender?.photo_url ?? null,
    }))

    return NextResponse.json({ requests })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST — send a friend request { username }
export async function POST(request: Request) {
  try {
    const { profileId } = await getAuthenticatedProfile(request)
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const username = (body.username ?? '').trim()
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Find the recipient
    const { data: target } = await supabase
      .from('user_profiles')
      .select('id, clerk_id')
      .eq('username', username)
      .maybeSingle()

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (target.id === profileId) {
      return NextResponse.json({ error: "You can't add yourself" }, { status: 400 })
    }

    // Check if already friends
    const { data: existing } = await supabase
      .from('user_friends')
      .select('id')
      .eq('user_id', profileId)
      .eq('friend_id', target.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Already friends' }, { status: 400 })
    }

    // Check if there's already a pending request in either direction
    const { data: pendingRequest } = await supabase
      .from('user_friend_requests')
      .select('id, sender_id')
      .or(`and(sender_id.eq.${profileId},recipient_id.eq.${target.id}),and(sender_id.eq.${target.id},recipient_id.eq.${profileId})`)
      .eq('status', 'pending')
      .maybeSingle()

    if (pendingRequest) {
      if (pendingRequest.sender_id === profileId) {
        return NextResponse.json({ error: 'Request already pending' }, { status: 400 })
      } else {
        return NextResponse.json({ error: 'This user already sent you a request — check your incoming requests' }, { status: 400 })
      }
    }

    // Create the friend request
    const { error } = await supabase
      .from('user_friend_requests')
      .upsert(
        { sender_id: profileId, recipient_id: target.id, status: 'pending', updated_at: new Date().toISOString() },
        { onConflict: 'sender_id,recipient_id' }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, recipientClerkId: target.clerk_id })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
