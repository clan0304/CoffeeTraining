'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { FriendProfile, FriendRequestWithSender, FriendRequestWithRecipient } from '@cuppingtraining/shared/types'

async function getProfileId(): Promise<string | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null
  const supabase = createAdminSupabaseClient()
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()
  return data?.id ?? null
}

export async function getFriends(): Promise<{ friends: FriendProfile[] }> {
  const profileId = await getProfileId()
  if (!profileId) return { friends: [] }

  const supabase = createAdminSupabaseClient()
  const { data } = await supabase
    .from('user_friends')
    .select('id, friend_id, created_at, friend:user_profiles!user_friends_friend_id_fkey(username, photo_url)')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })

  const friends: FriendProfile[] = (data ?? []).map((row: any) => ({
    id: row.id,
    friend_id: row.friend_id,
    username: row.friend?.username ?? 'Unknown',
    photo_url: row.friend?.photo_url ?? null,
    created_at: row.created_at,
  }))

  return { friends }
}

export async function removeFriend(
  friendId: string
): Promise<{ error?: string }> {
  const profileId = await getProfileId()
  if (!profileId) return { error: 'Not authenticated' }

  const supabase = createAdminSupabaseClient()

  // Delete both directions (A→B and B→A)
  const { error: err1 } = await supabase
    .from('user_friends')
    .delete()
    .eq('user_id', profileId)
    .eq('friend_id', friendId)

  if (err1) return { error: err1.message }

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

  return {}
}

export async function sendFriendRequest(
  username: string
): Promise<{ error?: string; recipientClerkId?: string }> {
  const profileId = await getProfileId()
  if (!profileId) return { error: 'Not authenticated' }

  const trimmed = username.trim()
  if (!trimmed) return { error: 'Username is required' }

  const supabase = createAdminSupabaseClient()

  // Find the recipient
  const { data: target } = await supabase
    .from('user_profiles')
    .select('id, clerk_id')
    .eq('username', trimmed)
    .maybeSingle()

  if (!target) return { error: 'User not found' }
  if (target.id === profileId) return { error: "You can't add yourself" }

  // Check if already friends
  const { data: existing } = await supabase
    .from('user_friends')
    .select('id')
    .eq('user_id', profileId)
    .eq('friend_id', target.id)
    .maybeSingle()

  if (existing) return { error: 'Already friends' }

  // Check if there's already a pending request in either direction
  const { data: pendingRequest } = await supabase
    .from('user_friend_requests')
    .select('id, sender_id')
    .or(`and(sender_id.eq.${profileId},recipient_id.eq.${target.id}),and(sender_id.eq.${target.id},recipient_id.eq.${profileId})`)
    .eq('status', 'pending')
    .maybeSingle()

  if (pendingRequest) {
    if (pendingRequest.sender_id === profileId) {
      return { error: 'Request already pending' }
    } else {
      return { error: 'This user already sent you a request — check your incoming requests' }
    }
  }

  // Create the friend request
  const { error } = await supabase
    .from('user_friend_requests')
    .upsert(
      { sender_id: profileId, recipient_id: target.id, status: 'pending', updated_at: new Date().toISOString() },
      { onConflict: 'sender_id,recipient_id' }
    )

  if (error) return { error: error.message }

  return { recipientClerkId: target.clerk_id }
}

export async function getMyFriendRequests(): Promise<{ requests: FriendRequestWithSender[] }> {
  const profileId = await getProfileId()
  if (!profileId) return { requests: [] }

  const supabase = createAdminSupabaseClient()
  const { data } = await supabase
    .from('user_friend_requests')
    .select('id, sender_id, recipient_id, status, created_at, updated_at, sender:user_profiles!user_friend_requests_sender_id_fkey(username, photo_url)')
    .eq('recipient_id', profileId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const requests: FriendRequestWithSender[] = (data ?? []).map((row: any) => ({
    id: row.id,
    sender_id: row.sender_id,
    recipient_id: row.recipient_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    sender_username: row.sender?.username ?? 'Unknown',
    sender_photo_url: row.sender?.photo_url ?? null,
  }))

  return { requests }
}

export async function getSentFriendRequests(): Promise<{ requests: FriendRequestWithRecipient[] }> {
  const profileId = await getProfileId()
  if (!profileId) return { requests: [] }

  const supabase = createAdminSupabaseClient()
  const { data } = await supabase
    .from('user_friend_requests')
    .select('id, sender_id, recipient_id, status, created_at, updated_at, recipient:user_profiles!user_friend_requests_recipient_id_fkey(username, photo_url)')
    .eq('sender_id', profileId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const requests: FriendRequestWithRecipient[] = (data ?? []).map((row: any) => ({
    id: row.id,
    sender_id: row.sender_id,
    recipient_id: row.recipient_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    recipient_username: row.recipient?.username ?? 'Unknown',
    recipient_photo_url: row.recipient?.photo_url ?? null,
  }))

  return { requests }
}

export async function respondToFriendRequest(
  requestId: string,
  accept: boolean
): Promise<{ error?: string; senderClerkId?: string }> {
  const profileId = await getProfileId()
  if (!profileId) return { error: 'Not authenticated' }

  const supabase = createAdminSupabaseClient()

  // Fetch the request
  const { data: request } = await supabase
    .from('user_friend_requests')
    .select('id, sender_id, recipient_id, status')
    .eq('id', requestId)
    .eq('recipient_id', profileId)
    .eq('status', 'pending')
    .single()

  if (!request) return { error: 'Request not found' }

  const newStatus = accept ? 'accepted' : 'declined'

  // Update request status
  const { error: updateError } = await supabase
    .from('user_friend_requests')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (updateError) return { error: updateError.message }

  if (accept) {
    // Insert bidirectional friend rows
    const { error: insertError } = await supabase
      .from('user_friends')
      .upsert([
        { user_id: request.sender_id, friend_id: request.recipient_id },
        { user_id: request.recipient_id, friend_id: request.sender_id },
      ], { onConflict: 'user_id,friend_id' })

    if (insertError) return { error: insertError.message }
  }

  // Get sender's clerk_id for broadcast
  const { data: sender } = await supabase
    .from('user_profiles')
    .select('clerk_id')
    .eq('id', request.sender_id)
    .single()

  return { senderClerkId: sender?.clerk_id }
}

export async function cancelFriendRequest(
  requestId: string
): Promise<{ error?: string }> {
  const profileId = await getProfileId()
  if (!profileId) return { error: 'Not authenticated' }

  const supabase = createAdminSupabaseClient()

  const { error } = await supabase
    .from('user_friend_requests')
    .delete()
    .eq('id', requestId)
    .eq('sender_id', profileId)
    .eq('status', 'pending')

  if (error) return { error: error.message }
  return {}
}

export async function searchUsers(
  query: string
): Promise<{ users: Array<{ id: string; username: string; photo_url: string | null }> }> {
  const profileId = await getProfileId()
  if (!profileId) return { users: [] }

  const trimmed = query.trim()
  if (!trimmed) return { users: [] }

  const supabase = createAdminSupabaseClient()
  const { data } = await supabase
    .from('user_profiles')
    .select('id, username, photo_url')
    .ilike('username', `${trimmed}%`)
    .neq('id', profileId)
    .limit(10)

  return { users: data ?? [] }
}
