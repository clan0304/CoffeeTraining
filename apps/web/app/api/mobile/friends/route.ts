import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const { profileId } = await getAuthenticatedProfile(request)
    if (!profileId) {
      return NextResponse.json({ friends: [] })
    }

    const supabase = createAdminSupabaseClient()
    const { data } = await supabase
      .from('user_friends')
      .select('id, friend_id, created_at, friend:user_profiles!user_friends_friend_id_fkey(username, photo_url)')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })

    const friends = (data ?? []).map((row: any) => ({
      id: row.id,
      friend_id: row.friend_id,
      username: row.friend?.username ?? 'Unknown',
      photo_url: row.friend?.photo_url ?? null,
      created_at: row.created_at,
    }))

    return NextResponse.json({ friends })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
