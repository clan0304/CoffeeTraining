'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Room, RoomInvitation, RoomPlayer, PublicProfile, RoomCoffee, RoomSet, RoomSetRow } from '@/types/database'

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
    coffees: RoomCoffee[]
    sets: Array<RoomSet & { rows: Array<RoomSetRow & { pair_coffee: RoomCoffee; odd_coffee: RoomCoffee }> }>
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

  // Get coffees
  const { data: coffees } = await supabase
    .from('room_coffees')
    .select('*')
    .eq('room_id', roomId)
    .order('label', { ascending: true })

  // Get sets and rows
  const { data: sets } = await supabase
    .from('room_sets')
    .select('*')
    .eq('room_id', roomId)
    .order('set_number', { ascending: true })

  let setsWithRows: Array<RoomSet & { rows: Array<RoomSetRow & { pair_coffee: RoomCoffee; odd_coffee: RoomCoffee }> }> = []

  if (sets && sets.length > 0) {
    const setIds = sets.map((s) => s.id)
    const { data: rows } = await supabase
      .from('room_set_rows')
      .select('*')
      .in('set_id', setIds)
      .order('row_number', { ascending: true })

    const coffeeMap = new Map(coffees?.map((c) => [c.id, c]) || [])

    setsWithRows = sets.map((set) => ({
      ...set,
      rows: (rows || [])
        .filter((r) => r.set_id === set.id)
        .map((r) => ({
          ...r,
          pair_coffee: coffeeMap.get(r.pair_coffee_id)!,
          odd_coffee: coffeeMap.get(r.odd_coffee_id)!,
        })),
    }))
  }

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
      coffees: (coffees || []) as RoomCoffee[],
      sets: setsWithRows,
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
// COFFEE MANAGEMENT
// =============================================

export async function addCoffee(
  roomId: string,
  name: string,
  description?: string
): Promise<{ coffee?: RoomCoffee; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Verify the user is the host
  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status')
    .eq('id', roomId)
    .single<{ host_id: string; status: string }>()

  if (!room || room.host_id !== userId) {
    return { error: 'Only the host can add coffees' }
  }

  if (room.status !== 'waiting') {
    return { error: 'Cannot add coffees after game has started' }
  }

  // Get current coffee count to determine label
  const { data: existingCoffees } = await supabase
    .from('room_coffees')
    .select('label')
    .eq('room_id', roomId)
    .order('label', { ascending: false })
    .limit(1)

  // Generate next label (A, B, C, ...)
  let nextLabel = 'A'
  if (existingCoffees && existingCoffees.length > 0) {
    const lastLabel = existingCoffees[0].label
    nextLabel = String.fromCharCode(lastLabel.charCodeAt(0) + 1)
  }

  const { data: coffee, error } = await supabase
    .from('room_coffees')
    .insert({
      room_id: roomId,
      label: nextLabel,
      name: name.trim(),
      description: description?.trim() || null,
    })
    .select()
    .single<RoomCoffee>()

  if (error) {
    console.error('Error adding coffee:', error)
    return { error: 'Failed to add coffee' }
  }

  return { coffee }
}

export async function removeCoffee(
  coffeeId: string
): Promise<{ success?: boolean; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Get coffee and verify host
  const { data: coffee } = await supabase
    .from('room_coffees')
    .select('room_id')
    .eq('id', coffeeId)
    .single<{ room_id: string }>()

  if (!coffee) {
    return { error: 'Coffee not found' }
  }

  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status')
    .eq('id', coffee.room_id)
    .single<{ host_id: string; status: string }>()

  if (!room || room.host_id !== userId) {
    return { error: 'Only the host can remove coffees' }
  }

  if (room.status !== 'waiting') {
    return { error: 'Cannot remove coffees after game has started' }
  }

  const { error } = await supabase
    .from('room_coffees')
    .delete()
    .eq('id', coffeeId)

  if (error) {
    console.error('Error removing coffee:', error)
    return { error: 'Failed to remove coffee' }
  }

  return { success: true }
}

export async function getRoomCoffees(
  roomId: string
): Promise<{ coffees?: RoomCoffee[]; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  const { data: coffees, error } = await supabase
    .from('room_coffees')
    .select('*')
    .eq('room_id', roomId)
    .order('label', { ascending: true })

  if (error) {
    console.error('Error fetching coffees:', error)
    return { error: 'Failed to load coffees' }
  }

  return { coffees: coffees as RoomCoffee[] }
}

// =============================================
// SET GENERATION
// =============================================

export async function generateTriangulationSet(
  roomId: string
): Promise<{ set?: RoomSet; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Verify host
  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status')
    .eq('id', roomId)
    .single<{ host_id: string; status: string }>()

  if (!room || room.host_id !== userId) {
    return { error: 'Only the host can generate sets' }
  }

  if (room.status !== 'waiting') {
    return { error: 'Cannot generate sets after game has started' }
  }

  // Get coffees
  const { data: coffees } = await supabase
    .from('room_coffees')
    .select('*')
    .eq('room_id', roomId)
    .order('label', { ascending: true })

  if (!coffees || coffees.length < 2) {
    return { error: 'Need at least 2 coffees to generate a set' }
  }

  // Get current set count
  const { data: existingSets } = await supabase
    .from('room_sets')
    .select('set_number')
    .eq('room_id', roomId)
    .order('set_number', { ascending: false })
    .limit(1)

  const nextSetNumber = existingSets && existingSets.length > 0
    ? existingSets[0].set_number + 1
    : 1

  // Create the set
  const { data: newSet, error: setError } = await supabase
    .from('room_sets')
    .insert({
      room_id: roomId,
      set_number: nextSetNumber,
    })
    .select()
    .single<RoomSet>()

  if (setError || !newSet) {
    console.error('Error creating set:', setError)
    return { error: 'Failed to create set' }
  }

  // Generate 8 rows with balanced coffee pairings
  // Create unique unordered pairs (A-B is same as B-A)
  const uniquePairs: Array<{ coffee1: RoomCoffee; coffee2: RoomCoffee }> = []
  for (let i = 0; i < coffees.length; i++) {
    for (let j = i + 1; j < coffees.length; j++) {
      uniquePairs.push({ coffee1: coffees[i], coffee2: coffees[j] })
    }
  }

  // Shuffle unique pairs
  const shuffledUniquePairs = uniquePairs.sort(() => Math.random() - 0.5)

  // Build rows from unique pairs, repeating only if necessary
  const selectedRows: Array<{ pair: RoomCoffee; odd: RoomCoffee; oddPosition: number }> = []

  for (let row = 0; row < 8; row++) {
    // Get pair from shuffled list, cycling if we have fewer than 8 unique pairs
    const pairIndex = row % shuffledUniquePairs.length
    const { coffee1, coffee2 } = shuffledUniquePairs[pairIndex]

    // Randomly decide which coffee is the pair and which is the odd
    // But only randomize on first use of each pair to avoid duplicates like A-B and B-A
    let pair: RoomCoffee
    let odd: RoomCoffee

    if (row < shuffledUniquePairs.length) {
      // First time using this pair - randomly assign
      if (Math.random() < 0.5) {
        pair = coffee1
        odd = coffee2
      } else {
        pair = coffee2
        odd = coffee1
      }
    } else {
      // Repeating pairs - use opposite assignment from first use
      const firstUseIndex = pairIndex
      const firstRow = selectedRows[firstUseIndex]
      // Swap the roles
      if (firstRow.pair.id === coffee1.id) {
        pair = coffee2
        odd = coffee1
      } else {
        pair = coffee1
        odd = coffee2
      }
    }

    // Random odd position (1, 2, or 3)
    const oddPosition = Math.floor(Math.random() * 3) + 1

    selectedRows.push({
      pair,
      odd,
      oddPosition,
    })
  }

  // Insert rows
  const rowInserts = selectedRows.map((row, index) => ({
    set_id: newSet.id,
    row_number: index + 1,
    pair_coffee_id: row.pair.id,
    odd_coffee_id: row.odd.id,
    odd_position: row.oddPosition,
  }))

  const { error: rowError } = await supabase
    .from('room_set_rows')
    .insert(rowInserts)

  if (rowError) {
    console.error('Error creating rows:', rowError)
    // Clean up the set
    await supabase.from('room_sets').delete().eq('id', newSet.id)
    return { error: 'Failed to create set rows' }
  }

  return { set: newSet }
}

export async function getRoomSets(
  roomId: string
): Promise<{
  sets?: Array<RoomSet & { rows: Array<RoomSetRow & { pair_coffee: RoomCoffee; odd_coffee: RoomCoffee }> }>
  error?: string
}> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Get sets with rows
  const { data: sets, error } = await supabase
    .from('room_sets')
    .select('*')
    .eq('room_id', roomId)
    .order('set_number', { ascending: true })

  if (error) {
    console.error('Error fetching sets:', error)
    return { error: 'Failed to load sets' }
  }

  if (!sets || sets.length === 0) {
    return { sets: [] }
  }

  // Get all rows for these sets
  const setIds = sets.map((s) => s.id)
  const { data: rows } = await supabase
    .from('room_set_rows')
    .select('*')
    .in('set_id', setIds)
    .order('row_number', { ascending: true })

  // Get all coffees for this room
  const { data: coffees } = await supabase
    .from('room_coffees')
    .select('*')
    .eq('room_id', roomId)

  const coffeeMap = new Map(coffees?.map((c) => [c.id, c]) || [])

  // Combine data
  const setsWithRows = sets.map((set) => ({
    ...set,
    rows: (rows || [])
      .filter((r) => r.set_id === set.id)
      .map((r) => ({
        ...r,
        pair_coffee: coffeeMap.get(r.pair_coffee_id)!,
        odd_coffee: coffeeMap.get(r.odd_coffee_id)!,
      })),
  }))

  return { sets: setsWithRows }
}

// Create an empty set for manual configuration
export async function createEmptySet(
  roomId: string
): Promise<{ set?: RoomSet; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Verify host
  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status')
    .eq('id', roomId)
    .single<{ host_id: string; status: string }>()

  if (!room || room.host_id !== userId) {
    return { error: 'Only the host can create sets' }
  }

  if (room.status !== 'waiting') {
    return { error: 'Cannot create sets after game has started' }
  }

  // Get coffees
  const { data: coffees } = await supabase
    .from('room_coffees')
    .select('*')
    .eq('room_id', roomId)
    .order('label', { ascending: true })

  if (!coffees || coffees.length < 2) {
    return { error: 'Need at least 2 coffees to create a set' }
  }

  // Get current set count
  const { data: existingSets } = await supabase
    .from('room_sets')
    .select('set_number')
    .eq('room_id', roomId)
    .order('set_number', { ascending: false })
    .limit(1)

  const nextSetNumber = existingSets && existingSets.length > 0
    ? existingSets[0].set_number + 1
    : 1

  // Create the set
  const { data: newSet, error: setError } = await supabase
    .from('room_sets')
    .insert({
      room_id: roomId,
      set_number: nextSetNumber,
    })
    .select()
    .single<RoomSet>()

  if (setError || !newSet) {
    console.error('Error creating set:', setError)
    return { error: 'Failed to create set' }
  }

  // Create 8 empty rows with default values (first two coffees, random positions)
  const defaultPair = coffees[0]
  const defaultOdd = coffees[1]

  const rowInserts = Array.from({ length: 8 }, (_, index) => ({
    set_id: newSet.id,
    row_number: index + 1,
    pair_coffee_id: defaultPair.id,
    odd_coffee_id: defaultOdd.id,
    odd_position: Math.floor(Math.random() * 3) + 1,
  }))

  const { error: rowError } = await supabase
    .from('room_set_rows')
    .insert(rowInserts)

  if (rowError) {
    console.error('Error creating rows:', rowError)
    await supabase.from('room_sets').delete().eq('id', newSet.id)
    return { error: 'Failed to create set rows' }
  }

  return { set: newSet }
}

// Update a single row in a set
export async function updateSetRow(
  rowId: string,
  pairCoffeeId: string,
  oddCoffeeId: string,
  oddPosition: number
): Promise<{ success?: boolean; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  if (oddPosition < 1 || oddPosition > 3) {
    return { error: 'Odd position must be 1, 2, or 3' }
  }

  if (pairCoffeeId === oddCoffeeId) {
    return { error: 'Pair and odd coffee must be different' }
  }

  const supabase = createAdminSupabaseClient()

  // Get row and verify host
  const { data: row } = await supabase
    .from('room_set_rows')
    .select('set_id')
    .eq('id', rowId)
    .single<{ set_id: string }>()

  if (!row) {
    return { error: 'Row not found' }
  }

  const { data: set } = await supabase
    .from('room_sets')
    .select('room_id')
    .eq('id', row.set_id)
    .single<{ room_id: string }>()

  if (!set) {
    return { error: 'Set not found' }
  }

  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status')
    .eq('id', set.room_id)
    .single<{ host_id: string; status: string }>()

  if (!room || room.host_id !== userId) {
    return { error: 'Only the host can edit sets' }
  }

  if (room.status !== 'waiting') {
    return { error: 'Cannot edit sets after game has started' }
  }

  // Update the row
  const { error } = await supabase
    .from('room_set_rows')
    .update({
      pair_coffee_id: pairCoffeeId,
      odd_coffee_id: oddCoffeeId,
      odd_position: oddPosition,
    })
    .eq('id', rowId)

  if (error) {
    console.error('Error updating row:', error)
    return { error: 'Failed to update row' }
  }

  return { success: true }
}

export async function deleteSet(
  setId: string
): Promise<{ success?: boolean; error?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAdminSupabaseClient()

  // Get set and verify host
  const { data: set } = await supabase
    .from('room_sets')
    .select('room_id')
    .eq('id', setId)
    .single<{ room_id: string }>()

  if (!set) {
    return { error: 'Set not found' }
  }

  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status')
    .eq('id', set.room_id)
    .single<{ host_id: string; status: string }>()

  if (!room || room.host_id !== userId) {
    return { error: 'Only the host can delete sets' }
  }

  if (room.status !== 'waiting') {
    return { error: 'Cannot delete sets after game has started' }
  }

  // Delete set (cascade will handle rows)
  const { error } = await supabase
    .from('room_sets')
    .delete()
    .eq('id', setId)

  if (error) {
    console.error('Error deleting set:', error)
    return { error: 'Failed to delete set' }
  }

  return { success: true }
}

// =============================================
// START GAME (host only) - initiates countdown
// =============================================

export async function startGame(
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
    .select('host_id, status')
    .eq('id', roomId)
    .single<{ host_id: string; status: string }>()

  if (!room) {
    return { error: 'Room not found' }
  }

  if (room.host_id !== userId) {
    return { error: 'Only the host can start the game' }
  }

  if (room.status !== 'waiting') {
    return { error: 'Game has already started' }
  }

  // Set status to countdown (updated_at marks countdown start)
  const { error } = await supabase
    .from('rooms')
    .update({
      status: 'countdown',
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)

  if (error) {
    console.error('Error starting countdown:', error)
    return { error: 'Failed to start game' }
  }

  return { success: true }
}

// =============================================
// BEGIN PLAYING (called after countdown)
// =============================================

export async function beginPlaying(
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
    .select('host_id, status')
    .eq('id', roomId)
    .single<{ host_id: string; status: string }>()

  if (!room) {
    return { error: 'Room not found' }
  }

  if (room.host_id !== userId) {
    return { error: 'Only the host can control the game' }
  }

  if (room.status === 'playing') {
    return { success: true } // Already playing
  }

  if (room.status !== 'waiting' && room.status !== 'countdown') {
    return { error: 'Game cannot be started from current state' }
  }

  // Start the actual game timer
  const { error } = await supabase
    .from('rooms')
    .update({
      status: 'playing',
      timer_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)

  if (error) {
    console.error('Error starting game:', error)
    return { error: 'Failed to start game' }
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
