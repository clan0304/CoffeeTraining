import { createClient } from '@supabase/supabase-js'

// Service role client for server-side operations (webhooks, admin tasks)
// WARNING: Only use this on the server side, never expose to client
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
