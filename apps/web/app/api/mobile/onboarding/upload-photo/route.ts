import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { clerkId } = await getAuthenticatedProfile(request)

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${clerkId}/${Date.now()}.${fileExt}`

    // Convert File to Buffer for server-side upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (error) {
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(data.path)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
