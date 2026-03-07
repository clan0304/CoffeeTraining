import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ friendId: string }> }
) {
  try {
    const { profileId } = await getAuthenticatedProfile(request)
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { friendId } = await params
    const supabase = createAdminSupabaseClient()

    // Delete both directions (A→B and B→A)
    await supabase
      .from('user_friends')
      .delete()
      .eq('user_id', profileId)
      .eq('friend_id', friendId)

    await supabase
      .from('user_friends')
      .delete()
      .eq('user_id', friendId)
      .eq('friend_id', profileId)

    // Also delete related friend requests so they can re-request later
    await supabase
      .from('user_friend_requests')
      .delete()
      .or(`and(sender_id.eq.${profileId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${profileId})`)

    return NextResponse.json({ ok: true })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
