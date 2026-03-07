import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// GET — sent pending friend requests
export async function GET(request: Request) {
  try {
    const { profileId } = await getAuthenticatedProfile(request)
    if (!profileId) {
      return NextResponse.json({ requests: [] })
    }

    const supabase = createAdminSupabaseClient()
    const { data } = await supabase
      .from('user_friend_requests')
      .select('id, sender_id, recipient_id, status, created_at, updated_at, recipient:user_profiles!user_friend_requests_recipient_id_fkey(username, photo_url)')
      .eq('sender_id', profileId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const requests = (data ?? []).map((row: any) => ({
      id: row.id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      recipient_username: row.recipient?.username ?? 'Unknown',
      recipient_photo_url: row.recipient?.photo_url ?? null,
    }))

    return NextResponse.json({ requests })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
