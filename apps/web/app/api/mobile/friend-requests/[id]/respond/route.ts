import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// POST — respond to a friend request { accept: boolean }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profileId } = await getAuthenticatedProfile(request)
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { id: requestId } = await params
    const body = await request.json()
    const accept = body.accept === true

    const supabase = createAdminSupabaseClient()

    // Fetch the request
    const { data: req } = await supabase
      .from('user_friend_requests')
      .select('id, sender_id, recipient_id, status')
      .eq('id', requestId)
      .eq('recipient_id', profileId)
      .eq('status', 'pending')
      .single()

    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const newStatus = accept ? 'accepted' : 'declined'

    // Update request status
    const { error: updateError } = await supabase
      .from('user_friend_requests')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (accept) {
      // Insert bidirectional friend rows
      const { error: insertError } = await supabase
        .from('user_friends')
        .upsert([
          { user_id: req.sender_id, friend_id: req.recipient_id },
          { user_id: req.recipient_id, friend_id: req.sender_id },
        ], { onConflict: 'user_id,friend_id' })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    // Get sender's clerk_id for broadcast
    const { data: sender } = await supabase
      .from('user_profiles')
      .select('clerk_id')
      .eq('id', req.sender_id)
      .single()

    return NextResponse.json({ ok: true, senderClerkId: sender?.clerk_id })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
