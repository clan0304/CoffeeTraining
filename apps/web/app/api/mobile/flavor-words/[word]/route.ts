import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ word: string }> }
) {
  try {
    const { profileId } = await getAuthenticatedProfile(request)
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { word: rawWord } = await params
    const word = decodeURIComponent(rawWord).trim().toLowerCase()
    if (!word) {
      return NextResponse.json({ error: 'Invalid word' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { error } = await supabase
      .from('user_flavor_words')
      .delete()
      .eq('user_id', profileId)
      .eq('word', word)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
