import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local')
  }

  // Get headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  // Get body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create svix instance
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  // Verify webhook
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createAdminSupabaseClient()

  // Handle events
  switch (evt.type) {
    case 'user.created': {
      const { id, email_addresses, primary_email_address_id } = evt.data

      // Get primary email
      const primaryEmail = email_addresses.find(
        (email) => email.id === primary_email_address_id
      )

      if (!primaryEmail) {
        console.error('No primary email found for user:', id)
        return new Response('No primary email', { status: 400 })
      }

      // Create user profile in Supabase
      const { error } = await supabase.from('user_profiles').insert({
        clerk_id: id,
        email: primaryEmail.email_address,
        onboarding_completed: false,
      })

      if (error) {
        console.error('Failed to create user profile:', error)
        return new Response('Failed to create profile', { status: 500 })
      }

      console.log('User profile created:', id)
      break
    }

    case 'user.deleted': {
      const { id } = evt.data

      if (!id) {
        return new Response('No user id', { status: 400 })
      }

      // Delete user profile from Supabase
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('clerk_id', id)

      if (error) {
        console.error('Failed to delete user profile:', error)
        return new Response('Failed to delete profile', { status: 500 })
      }

      console.log('User profile deleted:', id)
      break
    }

    default:
      console.log('Unhandled webhook event:', evt.type)
  }

  return new Response('Webhook processed', { status: 200 })
}
