import { createClient } from '@supabase/supabase-js'

// Service role client for server-side operations (webhooks, admin tasks)
// WARNING: Only use this on the server side, never expose to client
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('Missing Supabase config:', {
      hasUrl: !!url,
      hasServiceKey: !!serviceKey
    })
    throw new Error('Supabase configuration missing')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
