'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Room, RoomInvitation, RoomPlayer, PublicProfile } from '@/types/database'

// Generate a unique 6-character room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed I, O, 1, 0 to avoid confusion
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const createRoomSchema = z.object({
  name: z.string().max(100, 'Room name must be less than 100 characters').nullable(),
  timerMinutes: z.number().min(1).max(30).default(8),
})

// =============================================
// CREATE ROOM
// =============================================

export async function createRoom(input: {
  name: string | null
  timerMinutes?: number
}): Promise<{ room?: Room; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const result = createRoomSchema.safeParse(input)
  if (!result.success) {
    return { error: result.error.issues[0]?.message || 'Invalid input' }
  }

  const supabase = createAdminSupabaseClient()

  // Generate unique room code
  let code = generateRoomCode()
  let attempts = 0
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', code)
      .maybeSingle()

    if (!existing) break
    code = generateRoomCode()
    attempts++
  }

  // Create the room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      host_id: userId,
      code,
      name: result.data.name,
      timer_minutes: result.data.timerMinutes || 8,
      status: 'waiting',
    })
    .select()
    .single<Room>()

  if (roomError) {
    console.error('Error creating room:', roomError)
    return { error: 'Failed to create room' }
  }

  // Add host as a player
  await supabase.from('room_players').insert({
    room_id: room.id,
    user_id: userId,
  })

  return { room }
}

// =============================================
// INVITE USER BY USERNAME
// =============================================

export async function inviteUserByUsername(
  roomId: string,
  username: string
): Promise<{ invitation?: RoomInvitation; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Verify the user is the host of this room
  const { data: room } = await supabase
    .from('rooms')
    .select('host_id')
    .eq('id', roomId)
    .single<{ host_id: string }>()

  if (!room) {
    return { error: 'Room not found' }
  }

  if (room.host_id !== userId) {
    return { error: 'Only the host can invite users' }
  }

  // Find the user by username
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_id, username')
    .eq('username', username)
    .single<{ user_id: string; username: string }>()

  if (!profile) {
    return { error: 'User not found' }
  }

  if (profile.user_id === userId) {
    return { error: 'You cannot invite yourself' }
  }

  // Check if already invited
  const { data: existingInvite } = await supabase
    .from('room_invitations')
    .select('id, status')
    .eq('room_id', roomId)
    .eq('invited_user_id', profile.user_id)
    .maybeSingle()

  if (existingInvite) {
    return { error: `User already ${existingInvite.status === 'pending' ? 'has a pending invitation' : 'responded to invitation'}` }
  }

  // Check if already a player
  const { data: existingPlayer } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', profile.user_id)
    .maybeSingle()

  if (existingPlayer) {
    return { error: 'User is already in this room' }
  }

  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('room_invitations')
    .insert({
      room_id: roomId,
      invited_user_id: profile.user_id,
      invited_by: userId,
      status: 'pending',
    })
    .select()
    .single<RoomInvitation>()

  if (inviteError) {
    console.error('Error creating invitation:', inviteError)
    return { error: 'Failed to send invitation' }
  }

  return { invitation }
}

// =============================================
// RESPOND TO INVITATION
// =============================================

export async function respondToInvitation(
  invitationId: string,
  accept: boolean
): Promise<{ success?: boolean; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Get the invitation
  const { data: invitation } = await supabase
    .from('room_invitations')
    .select('*')
    .eq('id', invitationId)
    .single<RoomInvitation>()

  if (!invitation) {
    return { error: 'Invitation not found' }
  }

  if (invitation.invited_user_id !== userId) {
    return { error: 'This invitation is not for you' }
  }

  if (invitation.status !== 'pending') {
    return { error: 'Invitation has already been responded to' }
  }

  // Update invitation status
  const { error: updateError } = await supabase
    .from('room_invitations')
    .update({
      status: accept ? 'accepted' : 'declined',
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitationId)

  if (updateError) {
    console.error('Error updating invitation:', updateError)
    return { error: 'Failed to respond to invitation' }
  }

  // If accepted, add as player
  if (accept) {
    const { error: playerError } = await supabase
      .from('room_players')
      .insert({
        room_id: invitation.room_id,
        user_id: userId,
      })

    if (playerError) {
      console.error('Error adding player:', playerError)
      return { error: 'Failed to join room' }
    }
  }

  return { success: true }
}

// =============================================
// JOIN ROOM BY CODE
// =============================================

export async function joinRoomByCode(
  code: string
): Promise<{ room?: Room; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Find room by code
  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single<Room>()

  if (!room) {
    return { error: 'Room not found. Check the code and try again.' }
  }

  if (room.status !== 'waiting') {
    return { error: 'This room is no longer accepting players' }
  }

  // Check if already a player
  const { data: existingPlayer } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', room.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingPlayer) {
    return { room } // Already in room, just return it
  }

  // Add as player
  const { error: playerError } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      user_id: userId,
    })

  if (playerError) {
    console.error('Error joining room:', playerError)
    return { error: 'Failed to join room' }
  }

  return { room }
}

// =============================================
// GET USER'S INVITATIONS
// =============================================

export async function getMyInvitations(): Promise<{
  invitations?: Array<RoomInvitation & { room: Room; inviter: PublicProfile | null }>
  error?: string
}> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Get invitations
  const { data: invitations, error } = await supabase
    .from('room_invitations')
    .select('*, room:rooms(*)')
    .eq('invited_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invitations:', error)
    return { error: 'Failed to load invitations' }
  }

  // Fetch inviter profiles separately
  const inviterIds = [...new Set(invitations?.map((i) => i.invited_by) || [])]
  const { data: inviters } = await supabase
    .from('user_profiles')
    .select('user_id, username, photo_url, bio')
    .in('user_id', inviterIds)

  const inviterMap = new Map(inviters?.map((p) => [p.user_id, p]) || [])

  const result = invitations?.map((inv) => ({
    ...inv,
    inviter: inviterMap.get(inv.invited_by) || null,
  }))

  return { invitations: result as Array<RoomInvitation & { room: Room; inviter: PublicProfile | null }> }
}

// =============================================
// GET ROOM DETAILS (for host dashboard)
// =============================================

export async function getRoomDetails(roomId: string): Promise<{
  room?: Room & {
    players: Array<RoomPlayer & { profile: PublicProfile | null }>
    invitations: Array<RoomInvitation & { invited_profile: PublicProfile | null }>
  }
  error?: string
}> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Get room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single<Room>()

  if (roomError || !room) {
    console.error('Error fetching room:', roomError)
    return { error: 'Room not found' }
  }

  // Get players
  const { data: players } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)

  // Get invitations
  const { data: invitations } = await supabase
    .from('room_invitations')
    .select('*')
    .eq('room_id', roomId)

  // Get all user profiles for players and invitations
  const userIds = [
    ...(players?.map((p) => p.user_id) || []),
    ...(invitations?.map((i) => i.invited_user_id) || []),
  ]
  const uniqueUserIds = [...new Set(userIds)]

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, username, photo_url, bio')
    .in('user_id', uniqueUserIds)

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || [])

  // Combine data
  const playersWithProfiles = players?.map((p) => ({
    ...p,
    profile: profileMap.get(p.user_id) || null,
  })) || []

  const invitationsWithProfiles = invitations?.map((i) => ({
    ...i,
    invited_profile: profileMap.get(i.invited_user_id) || null,
  })) || []

  return {
    room: {
      ...room,
      players: playersWithProfiles as Array<RoomPlayer & { profile: PublicProfile | null }>,
      invitations: invitationsWithProfiles as Array<RoomInvitation & { invited_profile: PublicProfile | null }>,
    },
  }
}

// =============================================
// GET USER'S ROOMS
// =============================================

export async function getMyRooms(): Promise<{
  hosted?: Room[]
  joined?: Room[]
  error?: string
}> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Get rooms where user is host
  const { data: hostedRooms, error: hostedError } = await supabase
    .from('rooms')
    .select('*')
    .eq('host_id', userId)
    .order('created_at', { ascending: false })

  if (hostedError) {
    console.error('Error fetching hosted rooms:', hostedError)
    return { error: 'Failed to load rooms' }
  }

  // Get rooms where user is a player
  const { data: playerRecords, error: playerError } = await supabase
    .from('room_players')
    .select('room_id')
    .eq('user_id', userId)

  if (playerError) {
    console.error('Error fetching player rooms:', playerError)
    return { error: 'Failed to load rooms' }
  }

  // Get the actual rooms for player records (excluding hosted)
  const hostedIds = new Set(hostedRooms?.map((r) => r.id) || [])
  const joinedRoomIds = playerRecords
    ?.map((p) => p.room_id)
    .filter((id) => !hostedIds.has(id)) || []

  let joined: Room[] = []
  if (joinedRoomIds.length > 0) {
    const { data: joinedRooms } = await supabase
      .from('rooms')
      .select('*')
      .in('id', joinedRoomIds)
      .order('created_at', { ascending: false })
    joined = (joinedRooms as Room[]) || []
  }

  return {
    hosted: hostedRooms as Room[],
    joined,
  }
}

// =============================================
// DELETE ROOM (host only)
// =============================================

export async function deleteRoom(
  roomId: string
): Promise<{ success?: boolean; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Verify the user is the host
  const { data: room } = await supabase
    .from('rooms')
    .select('host_id')
    .eq('id', roomId)
    .single<{ host_id: string }>()

  if (!room) {
    return { error: 'Room not found' }
  }

  if (room.host_id !== userId) {
    return { error: 'Only the host can delete the room' }
  }

  // Delete room (cascade will handle players, invitations, etc.)
  const { error } = await supabase.from('rooms').delete().eq('id', roomId)

  if (error) {
    console.error('Error deleting room:', error)
    return { error: 'Failed to delete room' }
  }

  return { success: true }
}

// =============================================
// CANCEL INVITATION (host only)
// =============================================

export async function cancelInvitation(
  invitationId: string
): Promise<{ success?: boolean; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Get invitation and verify host
  const { data: invitation } = await supabase
    .from('room_invitations')
    .select('room_id, invited_by')
    .eq('id', invitationId)
    .single<{ room_id: string; invited_by: string }>()

  if (!invitation) {
    return { error: 'Invitation not found' }
  }

  if (invitation.invited_by !== userId) {
    return { error: 'Only the person who sent the invitation can cancel it' }
  }

  const { error } = await supabase
    .from('room_invitations')
    .delete()
    .eq('id', invitationId)

  if (error) {
    console.error('Error canceling invitation:', error)
    return { error: 'Failed to cancel invitation' }
  }

  return { success: true }
}
