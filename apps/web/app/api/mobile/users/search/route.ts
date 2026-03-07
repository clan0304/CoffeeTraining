import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const { profileId } = await getAuthenticatedProfile(request)
    if (!profileId) {
      return NextResponse.json({ users: [] })
    }

    const url = new URL(request.url)
    const query = (url.searchParams.get('q') ?? '').trim()
    if (!query) {
      return NextResponse.json({ users: [] })
    }

    const supabase = createAdminSupabaseClient()
    const { data } = await supabase
      .from('user_profiles')
      .select('id, username, photo_url')
      .ilike('username', `${query}%`)
      .neq('id', profileId)
      .limit(10)

    return NextResponse.json({ users: data ?? [] })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
