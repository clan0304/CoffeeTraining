import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    await getAuthenticatedProfile(request)

    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ available: data === null })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
