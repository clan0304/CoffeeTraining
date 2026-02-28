import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const { profileId } = await getAuthenticatedProfile(request)
    if (!profileId) {
      return NextResponse.json({ words: [] })
    }

    const supabase = createAdminSupabaseClient()
    const { data } = await supabase
      .from('user_flavor_words')
      .select('word')
      .eq('user_id', profileId)
      .order('word')

    return NextResponse.json({ words: (data ?? []).map((r) => r.word) })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { profileId } = await getAuthenticatedProfile(request)
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const word = (body.word ?? '').trim().toLowerCase()
    if (!word || word.length > 100) {
      return NextResponse.json({ error: 'Invalid word' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { error } = await supabase
      .from('user_flavor_words')
      .upsert({ user_id: profileId, word }, { onConflict: 'user_id,word' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
