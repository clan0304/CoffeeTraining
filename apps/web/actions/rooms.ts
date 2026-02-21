'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import type { Room, RoomInvitation, RoomPlayer, PublicProfile, RoomCoffee, RoomSet, RoomSetRow, RoundResult, GameSession, SessionRound, PlayerDashboardData, DashboardOverallStats, DashboardAccuracyPoint, DashboardCoffeeStat, DashboardSessionHistory } from '@cuppingtraining/shared/types'

// =============================================
// HELPER: Resolve Clerk auth to user_profiles UUID
// =============================================

async function getProfileId(): Promise<{ profileId: string; clerkId: string } | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null
  const supabase = createAdminSupabaseClient()
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()
  if (!data) return null
  return { profileId: data.id, clerkId }
}

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
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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
      host_id: profileId,
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
    user_id: profileId,
  })

  return { room }
}

// =============================================
// INVITE USER BY USERNAME
// =============================================

export async function inviteUserByUsername(
  roomId: string,
  username: string
): Promise<{ invitation?: RoomInvitation; invitedClerkId?: string; error?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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

  if (room.host_id !== profileId) {
    return { error: 'Only the host can invite users' }
  }

  // Find the user by username (case-insensitive) — select both id (UUID) and clerk_id
  const { data: invitedProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, clerk_id, username')
    .ilike('username', username)
    .single<{ id: string; clerk_id: string; username: string }>()

  if (profileError) {
    console.error('Error finding user:', profileError)
  }

  if (!invitedProfile) {
    return { error: 'User not found' }
  }

  if (invitedProfile.id === profileId) {
    return { error: 'You cannot invite yourself' }
  }

  // Check if already invited
  const { data: existingInvite } = await supabase
    .from('room_invitations')
    .select('id, status')
    .eq('room_id', roomId)
    .eq('invited_user_id', invitedProfile.id)
    .maybeSingle()

  if (existingInvite) {
    return { error: `User already ${existingInvite.status === 'pending' ? 'has a pending invitation' : 'responded to invitation'}` }
  }

  // Check if already a player
  const { data: existingPlayer } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', invitedProfile.id)
    .maybeSingle()

  if (existingPlayer) {
    return { error: 'User is already in this room' }
  }

  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('room_invitations')
    .insert({
      room_id: roomId,
      invited_user_id: invitedProfile.id,
      invited_by: profileId,
      status: 'pending',
    })
    .select()
    .single<RoomInvitation>()

  if (inviteError) {
    console.error('Error creating invitation:', inviteError)
    return { error: 'Failed to send invitation' }
  }

  return { invitation, invitedClerkId: invitedProfile.clerk_id }
}

// =============================================
// RESPOND TO INVITATION
// =============================================

export async function respondToInvitation(
  invitationId: string,
  accept: boolean
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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

  if (invitation.invited_user_id !== profileId) {
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
        user_id: profileId,
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
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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
    .eq('user_id', profileId)
    .maybeSingle()

  if (existingPlayer) {
    return { room } // Already in room, just return it
  }

  // Add as player
  const { error: playerError } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      user_id: profileId,
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
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  // Get invitations
  const { data: invitations, error } = await supabase
    .from('room_invitations')
    .select('*, room:rooms(*)')
    .eq('invited_user_id', profileId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invitations:', error)
    return { error: 'Failed to load invitations' }
  }

  // Fetch inviter profiles separately (key by UUID id)
  const inviterIds = [...new Set(invitations?.map((i) => i.invited_by) || [])]
  const { data: inviters } = await supabase
    .from('user_profiles')
    .select('id, username, photo_url, bio')
    .in('id', inviterIds)

  const inviterMap = new Map(inviters?.map((p) => [p.id, p]) || [])

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
  currentUserProfileId?: string
  activeSessionId?: string | null
  completedRoundsCount?: number
  error?: string
}> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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

  // Get all user profiles for players and invitations (key by UUID id)
  const userIds = [
    ...(players?.map((p) => p.user_id) || []),
    ...(invitations?.map((i) => i.invited_user_id) || []),
  ]
  const uniqueUserIds = [...new Set(userIds)]

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, username, photo_url, bio')
    .in('id', uniqueUserIds)

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

  // Combine data
  const playersWithProfiles = players?.map((p) => ({
    ...p,
    profile: profileMap.get(p.user_id) || null,
  })) || []

  const invitationsWithProfiles = invitations?.map((i) => ({
    ...i,
    invited_profile: profileMap.get(i.invited_user_id) || null,
  })) || []

  // Get active game session info
  let activeSessionId: string | null = null
  let completedRoundsCount = 0

  const { data: activeSession } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('room_id', roomId)
    .is('ended_at', null)
    .maybeSingle<{ id: string }>()

  if (activeSession) {
    activeSessionId = activeSession.id
    const { count } = await supabase
      .from('session_rounds')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', activeSession.id)
      .not('ended_at', 'is', null)

    completedRoundsCount = count || 0
  }

  return {
    room: {
      ...room,
      players: playersWithProfiles as Array<RoomPlayer & { profile: PublicProfile | null }>,
      invitations: invitationsWithProfiles as Array<RoomInvitation & { invited_profile: PublicProfile | null }>,
      coffees: (coffees || []) as RoomCoffee[],
      sets: setsWithRows,
    },
    currentUserProfileId: profileId,
    activeSessionId,
    completedRoundsCount,
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
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  // Get rooms where user is host
  const { data: hostedRooms, error: hostedError } = await supabase
    .from('rooms')
    .select('*')
    .eq('host_id', profileId)
    .order('created_at', { ascending: false })

  if (hostedError) {
    console.error('Error fetching hosted rooms:', hostedError)
    return { error: 'Failed to load rooms' }
  }

  // Get rooms where user is a player
  const { data: playerRecords, error: playerError } = await supabase
    .from('room_players')
    .select('room_id')
    .eq('user_id', profileId)

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
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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

  if (room.host_id !== profileId) {
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
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  // Verify the user is the host
  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status')
    .eq('id', roomId)
    .single<{ host_id: string; status: string }>()

  if (!room || room.host_id !== profileId) {
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
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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

  if (!room || room.host_id !== profileId) {
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
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }

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
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  // Verify host
  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status')
    .eq('id', roomId)
    .single<{ host_id: string; status: string }>()

  if (!room || room.host_id !== profileId) {
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

  // Get existing sets with their rows to avoid duplicate pair/odd combos across sets
  const { data: existingSets } = await supabase
    .from('room_sets')
    .select('set_number, room_set_rows(pair_coffee_id, odd_coffee_id)')
    .eq('room_id', roomId)
    .order('set_number', { ascending: false })

  const nextSetNumber = existingSets && existingSets.length > 0
    ? existingSets[0].set_number + 1
    : 1

  // Collect directed pair/odd combos already used in previous sets
  const previouslyUsedCombos = new Set<string>()
  if (existingSets) {
    for (const s of existingSets) {
      const rows = (s as Record<string, unknown>).room_set_rows as Array<{ pair_coffee_id: string; odd_coffee_id: string }> | undefined
      if (rows) {
        for (const r of rows) {
          previouslyUsedCombos.add(`${r.pair_coffee_id}:${r.odd_coffee_id}`)
        }
      }
    }
  }

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

  // Generate 8 rows with BALANCED coffee usage
  // Total cups = 8 rows x 3 cups = 24 cups
  // Each coffee should appear roughly equally (e.g., 5 coffees -> 5,5,5,5,4)

  // Track usage count for each coffee
  const usageCount = new Map<string, number>()
  coffees.forEach(c => usageCount.set(c.id, 0))

  // Track used pairs within this set to avoid duplicates like (A,B) and (B,A)
  const usedPairs = new Set<string>()
  const makePairKey = (c1: string, c2: string) => [c1, c2].sort().join('-')
  // Directed combo key: pair->odd (different from odd->pair)
  const makeComboKey = (pairId: string, oddId: string) => `${pairId}:${oddId}`

  const selectedRows: Array<{ pair: RoomCoffee; odd: RoomCoffee; oddPosition: number }> = []

  for (let row = 0; row < 8; row++) {
    // Sort coffees by usage (least used first)
    const sortedByUsage = [...coffees].sort((a, b) => {
      const usageA = usageCount.get(a.id) || 0
      const usageB = usageCount.get(b.id) || 0
      if (usageA !== usageB) return usageA - usageB
      return Math.random() - 0.5 // Randomize if equal
    })

    // Find the best pair (pair coffee appears 2x, odd coffee appears 1x)
    // Priority: 1) totally new — neither A->B nor B->A used in previous sets
    //           2) similar — reverse (B->A) exists but exact (A->B) doesn't
    //           3) exact duplicate — last resort fallback
    let pair: RoomCoffee = sortedByUsage[0]
    let odd: RoomCoffee = sortedByUsage[1]
    let similarFallback: { pair: RoomCoffee; odd: RoomCoffee } | null = null
    let exactFallback: { pair: RoomCoffee; odd: RoomCoffee } | null = null

    outerLoop:
    for (let i = 0; i < sortedByUsage.length; i++) {
      for (let j = 0; j < sortedByUsage.length; j++) {
        if (i === j) continue

        const pairCandidate = sortedByUsage[i]
        const oddCandidate = sortedByUsage[j]
        const pairKey = makePairKey(pairCandidate.id, oddCandidate.id)

        if (!usedPairs.has(pairKey)) {
          const exactKey = makeComboKey(pairCandidate.id, oddCandidate.id)
          const reverseKey = makeComboKey(oddCandidate.id, pairCandidate.id)
          const hasExact = previouslyUsedCombos.has(exactKey)
          const hasReverse = previouslyUsedCombos.has(reverseKey)

          if (!hasExact && !hasReverse) {
            // Best: totally new coffee pair
            pair = pairCandidate
            odd = oddCandidate
            usedPairs.add(pairKey)
            similarFallback = null
            exactFallback = null
            break outerLoop
          } else if (!hasExact && hasReverse && !similarFallback) {
            // Similar: reverse was used, but this exact direction is new
            similarFallback = { pair: pairCandidate, odd: oddCandidate }
          } else if (hasExact && !exactFallback) {
            // Exact duplicate — last resort
            exactFallback = { pair: pairCandidate, odd: oddCandidate }
          }
        }
      }
    }

    if (similarFallback) {
      pair = similarFallback.pair
      odd = similarFallback.odd
      usedPairs.add(makePairKey(pair.id, odd.id))
    } else if (exactFallback) {
      pair = exactFallback.pair
      odd = exactFallback.odd
      usedPairs.add(makePairKey(pair.id, odd.id))
    }

    // Update usage counts (pair appears 2x, odd appears 1x)
    usageCount.set(pair.id, (usageCount.get(pair.id) || 0) + 2)
    usageCount.set(odd.id, (usageCount.get(odd.id) || 0) + 1)

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
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }

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
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  // Verify host
  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status')
    .eq('id', roomId)
    .single<{ host_id: string; status: string }>()

  if (!room || room.host_id !== profileId) {
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
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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

  if (!room || room.host_id !== profileId) {
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
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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

  if (!room || room.host_id !== profileId) {
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
  roomId: string,
  setId: string
): Promise<{ success?: boolean; sessionRoundId?: string; error?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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

  if (room.host_id !== profileId) {
    return { error: 'Only the host can start the game' }
  }

  if (room.status !== 'waiting') {
    return { error: 'Game has already started' }
  }

  // Verify the set exists and belongs to this room
  const { data: set } = await supabase
    .from('room_sets')
    .select('id')
    .eq('id', setId)
    .eq('room_id', roomId)
    .maybeSingle()

  if (!set) {
    return { error: 'Set not found' }
  }

  // Get or create active game session
  let { data: activeSession } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('room_id', roomId)
    .is('ended_at', null)
    .maybeSingle<{ id: string }>()

  if (!activeSession) {
    const { data: newSession, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({ room_id: roomId })
      .select('id')
      .single<{ id: string }>()

    if (sessionError || !newSession) {
      console.error('Error creating session:', sessionError)
      return { error: 'Failed to create session' }
    }
    activeSession = newSession
  }

  // Count existing rounds in this session to determine round_number
  const { count: roundCount } = await supabase
    .from('session_rounds')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', activeSession.id)

  // Create session round
  const { data: sessionRound, error: roundError } = await supabase
    .from('session_rounds')
    .insert({
      session_id: activeSession.id,
      round_number: (roundCount || 0) + 1,
      set_id: setId,
    })
    .select('id')
    .single<{ id: string }>()

  if (roundError || !sessionRound) {
    console.error('Error creating session round:', roundError)
    return { error: 'Failed to create session round' }
  }

  // Snapshot current room players as round participants
  const { data: players } = await supabase
    .from('room_players')
    .select('user_id')
    .eq('room_id', roomId)

  if (players && players.length > 0) {
    await supabase
      .from('round_participants')
      .insert(players.map((p) => ({ round_id: sessionRound.id, user_id: p.user_id })))
  }

  // Set status to countdown with active set
  const { error } = await supabase
    .from('rooms')
    .update({
      status: 'countdown',
      active_set_id: setId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)

  if (error) {
    console.error('Error starting countdown:', error)
    return { error: 'Failed to start game' }
  }

  return { success: true, sessionRoundId: sessionRound.id }
}

// =============================================
// BEGIN PLAYING (called after countdown)
// =============================================

export async function beginPlaying(
  roomId: string
): Promise<{ success?: boolean; error?: string; timerStartedAt?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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

  if (room.host_id !== profileId) {
    return { error: 'Only the host can control the game' }
  }

  if (room.status === 'playing') {
    return { success: true } // Already playing
  }

  if (room.status !== 'waiting' && room.status !== 'countdown') {
    return { error: 'Game cannot be started from current state' }
  }

  // Capture timestamp before writing so we can return the exact value
  const timerStartedAt = new Date().toISOString()

  // Start the actual game timer
  const { error } = await supabase
    .from('rooms')
    .update({
      status: 'playing',
      timer_started_at: timerStartedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)

  if (error) {
    console.error('Error starting game:', error)
    return { error: 'Failed to start game' }
  }

  // Update the active session_round's started_at with the exact timer timestamp
  const { data: activeSession } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('room_id', roomId)
    .is('ended_at', null)
    .maybeSingle<{ id: string }>()

  if (activeSession) {
    await supabase
      .from('session_rounds')
      .update({ started_at: timerStartedAt })
      .eq('session_id', activeSession.id)
      .is('ended_at', null)
      .is('started_at', null)
  }

  return { success: true, timerStartedAt }
}

// =============================================
// PAUSE GAME (host only)
// =============================================

export async function pauseGame(
  roomId: string
): Promise<{ pausedAt?: string; error?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status')
    .eq('id', roomId)
    .single<{ host_id: string; status: string }>()

  if (!room) {
    return { error: 'Room not found' }
  }

  if (room.host_id !== profileId) {
    return { error: 'Only the host can pause the game' }
  }

  if (room.status !== 'playing') {
    return { error: 'Game is not currently playing' }
  }

  const pausedAt = new Date().toISOString()

  const { error } = await supabase
    .from('rooms')
    .update({
      status: 'paused',
      paused_at: pausedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)

  if (error) {
    console.error('Error pausing game:', error)
    return { error: 'Failed to pause game' }
  }

  return { pausedAt }
}

// =============================================
// RESUME GAME (host only)
// =============================================

export async function resumeGame(
  roomId: string
): Promise<{ newTimerStartedAt?: string; error?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status, timer_started_at, paused_at')
    .eq('id', roomId)
    .single<{ host_id: string; status: string; timer_started_at: string | null; paused_at: string | null }>()

  if (!room) {
    return { error: 'Room not found' }
  }

  if (room.host_id !== profileId) {
    return { error: 'Only the host can resume the game' }
  }

  if (room.status !== 'paused') {
    return { error: 'Game is not paused' }
  }

  if (!room.timer_started_at || !room.paused_at) {
    return { error: 'Missing timer data' }
  }

  // Shift timer_started_at forward by the pause duration
  const pauseDurationMs = Date.now() - new Date(room.paused_at).getTime()
  const newTimerStartedAt = new Date(
    new Date(room.timer_started_at).getTime() + pauseDurationMs
  ).toISOString()

  const { error } = await supabase
    .from('rooms')
    .update({
      status: 'playing',
      timer_started_at: newTimerStartedAt,
      paused_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)

  if (error) {
    console.error('Error resuming game:', error)
    return { error: 'Failed to resume game' }
  }

  return { newTimerStartedAt }
}

// =============================================
// END ROUND (host only) — reset room to waiting for next round
// =============================================

export async function endRound(
  roomId: string
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status')
    .eq('id', roomId)
    .single<{ host_id: string; status: string }>()

  if (!room) {
    return { error: 'Room not found' }
  }

  if (room.host_id !== profileId) {
    return { error: 'Only the host can end the round' }
  }

  if (room.status === 'waiting') {
    return { success: true } // Already waiting
  }

  // End the active session round
  const { data: activeSession } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('room_id', roomId)
    .is('ended_at', null)
    .maybeSingle<{ id: string }>()

  if (activeSession) {
    await supabase
      .from('session_rounds')
      .update({ ended_at: new Date().toISOString() })
      .eq('session_id', activeSession.id)
      .is('ended_at', null)
      .not('started_at', 'is', null)
  }

  const { error } = await supabase
    .from('rooms')
    .update({
      status: 'waiting',
      timer_started_at: null,
      paused_at: null,
      active_set_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)

  if (error) {
    console.error('Error ending round:', error)
    return { error: 'Failed to end round' }
  }

  return { success: true }
}

// =============================================
// FINISH ROUND (any player)
// =============================================

export async function finishRound(
  roomId: string,
  answers?: (number | null)[]
): Promise<{ elapsedMs?: number; error?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('status, timer_started_at, paused_at')
    .eq('id', roomId)
    .single<{ status: string; timer_started_at: string | null; paused_at: string | null }>()

  if (!room) {
    return { error: 'Room not found' }
  }

  if (room.status !== 'playing' && room.status !== 'paused') {
    return { error: 'Game is not in progress' }
  }

  if (!room.timer_started_at) {
    return { error: 'Timer has not started' }
  }

  // Verify the user is a player in this room
  const { data: player } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', profileId)
    .maybeSingle()

  if (!player) {
    return { error: 'You are not a player in this room' }
  }

  // Check if already finished this round
  const { data: existing } = await supabase
    .from('round_results')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', profileId)
    .eq('timer_started_at', room.timer_started_at)
    .maybeSingle()

  if (existing) {
    return { error: 'Already finished this round' }
  }

  // Calculate elapsed time (pause-aware)
  // If paused: elapsed = paused_at - timer_started_at
  // If playing: elapsed = now - timer_started_at
  const now = Date.now()
  const timerStart = new Date(room.timer_started_at).getTime()
  const elapsedMs = room.status === 'paused' && room.paused_at
    ? new Date(room.paused_at).getTime() - timerStart
    : now - timerStart

  const finishedAt = new Date().toISOString()

  // Find the active session round for this room
  let sessionRoundId: string | null = null
  const { data: activeSession } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('room_id', roomId)
    .is('ended_at', null)
    .maybeSingle<{ id: string }>()

  if (activeSession) {
    const { data: activeRound } = await supabase
      .from('session_rounds')
      .select('id')
      .eq('session_id', activeSession.id)
      .is('ended_at', null)
      .not('started_at', 'is', null)
      .maybeSingle<{ id: string }>()

    if (activeRound) {
      sessionRoundId = activeRound.id
    }
  }

  const { error } = await supabase
    .from('round_results')
    .insert({
      room_id: roomId,
      user_id: profileId,
      timer_started_at: room.timer_started_at,
      finished_at: finishedAt,
      elapsed_ms: Math.max(0, Math.round(elapsedMs)),
      session_round_id: sessionRoundId,
    })

  if (error) {
    console.error('Error recording finish:', error)
    return { error: 'Failed to record finish time' }
  }

  // Save player answers if provided
  if (answers && answers.length > 0 && sessionRoundId) {
    // Get the room's active set to look up correct answers
    const { data: roomData } = await supabase
      .from('rooms')
      .select('active_set_id')
      .eq('id', roomId)
      .single<{ active_set_id: string | null }>()

    if (roomData?.active_set_id) {
      const { data: setRows } = await supabase
        .from('room_set_rows')
        .select('row_number, odd_position')
        .eq('set_id', roomData.active_set_id)
        .order('row_number', { ascending: true })

      if (setRows) {
        const oddPositionMap = new Map(setRows.map((r) => [r.row_number, r.odd_position]))

        const answerInserts = answers
          .map((selectedPosition, index) => {
            if (selectedPosition === null) return null
            const rowNumber = index + 1
            const correctPosition = oddPositionMap.get(rowNumber)
            return {
              set_id: roomData.active_set_id!,
              session_round_id: sessionRoundId,
              user_id: profileId,
              row_number: rowNumber,
              selected_position: selectedPosition,
              is_correct: correctPosition !== undefined ? selectedPosition === correctPosition : null,
            }
          })
          .filter((a): a is NonNullable<typeof a> => a !== null)

        if (answerInserts.length > 0) {
          const { error: answerError } = await supabase
            .from('player_answers')
            .upsert(answerInserts, { onConflict: 'session_round_id,user_id,row_number' })

          if (answerError) {
            console.error('Error saving answers:', answerError)
            // Non-fatal — finish time is already recorded
          }
        }
      }
    }
  }

  return { elapsedMs: Math.max(0, Math.round(elapsedMs)) }
}

// =============================================
// CANCEL INVITATION (host only)
// =============================================

export async function cancelInvitation(
  invitationId: string
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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

  if (invitation.invited_by !== profileId) {
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

// =============================================
// END SESSION (host only) — end the active game session
// =============================================

export async function endSession(
  roomId: string
): Promise<{ sessionId?: string; error?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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

  if (room.host_id !== profileId) {
    return { error: 'Only the host can end the session' }
  }

  // Find active session
  const { data: activeSession } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('room_id', roomId)
    .is('ended_at', null)
    .maybeSingle<{ id: string }>()

  if (!activeSession) {
    return { error: 'No active session' }
  }

  // End any still-open session rounds
  await supabase
    .from('session_rounds')
    .update({ ended_at: new Date().toISOString() })
    .eq('session_id', activeSession.id)
    .is('ended_at', null)

  // End the session
  const { error } = await supabase
    .from('game_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', activeSession.id)

  if (error) {
    console.error('Error ending session:', error)
    return { error: 'Failed to end session' }
  }

  return { sessionId: activeSession.id }
}

// =============================================
// GET SESSION SUMMARY
// =============================================

export async function getSessionSummary(sessionId: string): Promise<{
  session?: GameSession & {
    room: { id: string; name: string | null; code: string }
    rounds: Array<SessionRound & {
      participants: Array<{ user_id: string; username: string | null; photo_url: string | null }>
      results: Array<{ user_id: string; elapsed_ms: number }>
      coffees: Array<{ label: string; name: string }>
      setRows: Array<{ row_number: number; pair_coffee_label: string; pair_coffee_name: string; odd_coffee_label: string; odd_coffee_name: string; odd_position: number }>
      playerAnswers: Array<{ user_id: string; row_number: number; selected_position: number; is_correct: boolean | null }>
    }>
  }
  error?: string
}> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }

  const supabase = createAdminSupabaseClient()

  // Get the session
  const { data: session } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .single<GameSession>()

  if (!session) {
    return { error: 'Session not found' }
  }

  // Get the room
  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, code')
    .eq('id', session.room_id)
    .single<{ id: string; name: string | null; code: string }>()

  if (!room) {
    return { error: 'Room not found' }
  }

  // Get session rounds
  const { data: rounds } = await supabase
    .from('session_rounds')
    .select('*')
    .eq('session_id', sessionId)
    .order('round_number', { ascending: true })

  if (!rounds || rounds.length === 0) {
    return {
      session: {
        ...session,
        room,
        rounds: [],
      },
    }
  }

  const roundIds = rounds.map((r) => r.id)

  // Get all participants for these rounds
  const { data: participants } = await supabase
    .from('round_participants')
    .select('round_id, user_id')
    .in('round_id', roundIds)

  // Get all round results for these rounds
  const { data: results } = await supabase
    .from('round_results')
    .select('session_round_id, user_id, elapsed_ms')
    .in('session_round_id', roundIds)

  // Get user profiles
  const allUserIds = [
    ...new Set([
      ...(participants?.map((p) => p.user_id) || []),
      ...(results?.map((r) => r.user_id) || []),
    ]),
  ]

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, username, photo_url')
    .in('id', allUserIds)

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

  // Fetch set details and player answers for rounds that have a set_id
  const setIds = [...new Set(rounds.filter((r) => r.set_id).map((r) => r.set_id!))]

  let allSetRows: Array<{ set_id: string; row_number: number; pair_coffee_id: string; odd_coffee_id: string; odd_position: number }> = []
  let allCoffees: Array<{ id: string; room_id: string; label: string; name: string }> = []
  let allPlayerAnswers: Array<{ session_round_id: string; user_id: string; row_number: number; selected_position: number; is_correct: boolean | null }> = []

  if (setIds.length > 0) {
    const { data: setRows } = await supabase
      .from('room_set_rows')
      .select('set_id, row_number, pair_coffee_id, odd_coffee_id, odd_position')
      .in('set_id', setIds)
      .order('row_number', { ascending: true })

    allSetRows = setRows || []

    // Get coffees for the room
    const { data: coffees } = await supabase
      .from('room_coffees')
      .select('id, room_id, label, name')
      .eq('room_id', session.room_id)
      .order('label', { ascending: true })

    allCoffees = coffees || []

    // Get player answers for these rounds
    const { data: playerAnswers } = await supabase
      .from('player_answers')
      .select('session_round_id, user_id, row_number, selected_position, is_correct')
      .in('session_round_id', roundIds)

    allPlayerAnswers = playerAnswers || []
  }

  const coffeeMap = new Map(allCoffees.map((c) => [c.id, c]))

  // Assemble rounds with participants, results, and answer details
  const roundsWithDetails = (rounds as SessionRound[]).map((round) => {
    // Get set rows for this round's set
    const roundSetRows = round.set_id
      ? allSetRows
          .filter((r) => r.set_id === round.set_id)
          .map((r) => {
            const pairCoffee = coffeeMap.get(r.pair_coffee_id)
            const oddCoffee = coffeeMap.get(r.odd_coffee_id)
            return {
              row_number: r.row_number,
              pair_coffee_label: pairCoffee?.label || '?',
              pair_coffee_name: pairCoffee?.name || 'Unknown',
              odd_coffee_label: oddCoffee?.label || '?',
              odd_coffee_name: oddCoffee?.name || 'Unknown',
              odd_position: r.odd_position,
            }
          })
      : []

    // Get unique coffees used in this round's set rows
    const usedCoffeeIds = new Set<string>()
    if (round.set_id) {
      allSetRows
        .filter((r) => r.set_id === round.set_id)
        .forEach((r) => {
          usedCoffeeIds.add(r.pair_coffee_id)
          usedCoffeeIds.add(r.odd_coffee_id)
        })
    }
    const roundCoffees = allCoffees
      .filter((c) => usedCoffeeIds.has(c.id))
      .map((c) => ({ label: c.label, name: c.name }))

    return {
      ...round,
      participants: (participants || [])
        .filter((p) => p.round_id === round.id)
        .map((p) => {
          const prof = profileMap.get(p.user_id)
          return {
            user_id: p.user_id,
            username: prof?.username || null,
            photo_url: prof?.photo_url || null,
          }
        }),
      results: (results || [])
        .filter((r) => r.session_round_id === round.id)
        .map((r) => ({
          user_id: r.user_id,
          elapsed_ms: r.elapsed_ms,
        })),
      coffees: roundCoffees,
      setRows: roundSetRows,
      playerAnswers: allPlayerAnswers
        .filter((a) => a.session_round_id === round.id)
        .map((a) => ({
          user_id: a.user_id,
          row_number: a.row_number,
          selected_position: a.selected_position,
          is_correct: a.is_correct,
        })),
    }
  })

  return {
    session: {
      ...session,
      room,
      rounds: roundsWithDetails,
    },
  }
}

// =============================================
// GET MY SESSION HISTORY
// =============================================

export async function getMySessionHistory(): Promise<{
  sessions?: Array<{
    id: string
    room_name: string | null
    room_code: string
    started_at: string
    ended_at: string
    round_count: number
    best_time_ms: number | null
  }>
  error?: string
}> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  // Find all session rounds where the user was a participant
  const { data: participations } = await supabase
    .from('round_participants')
    .select('round_id')
    .eq('user_id', profileId)

  if (!participations || participations.length === 0) {
    return { sessions: [] }
  }

  const roundIds = participations.map((p) => p.round_id)

  // Get the session_rounds to find session_ids
  const { data: sessionRounds } = await supabase
    .from('session_rounds')
    .select('id, session_id')
    .in('id', roundIds)

  if (!sessionRounds || sessionRounds.length === 0) {
    return { sessions: [] }
  }

  const sessionIds = [...new Set(sessionRounds.map((r) => r.session_id))]

  // Get completed sessions
  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('*')
    .in('id', sessionIds)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })

  if (!sessions || sessions.length === 0) {
    return { sessions: [] }
  }

  // Get rooms for these sessions
  const roomIds = [...new Set(sessions.map((s) => s.room_id))]
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, code')
    .in('id', roomIds)

  const roomMap = new Map(rooms?.map((r) => [r.id, r]) || [])

  // Get all rounds for these sessions to count them
  const { data: allRounds } = await supabase
    .from('session_rounds')
    .select('id, session_id')
    .in('session_id', sessionIds)

  // Get user's results for these rounds
  const allRoundIds = allRounds?.map((r) => r.id) || []
  const { data: userResults } = await supabase
    .from('round_results')
    .select('session_round_id, elapsed_ms')
    .eq('user_id', profileId)
    .in('session_round_id', allRoundIds)

  // Build session summaries
  const result = (sessions as GameSession[]).map((session) => {
    const room = roomMap.get(session.room_id)
    const roundsInSession = allRounds?.filter((r) => r.session_id === session.id) || []
    const roundIdsInSession = roundsInSession.map((r) => r.id)
    const userResultsInSession = userResults?.filter(
      (r) => r.session_round_id && roundIdsInSession.includes(r.session_round_id)
    ) || []
    const bestTime = userResultsInSession.length > 0
      ? Math.min(...userResultsInSession.map((r) => r.elapsed_ms))
      : null

    return {
      id: session.id,
      room_name: room?.name || null,
      room_code: room?.code || '',
      started_at: session.started_at,
      ended_at: session.ended_at!,
      round_count: roundsInSession.length,
      best_time_ms: bestTime,
    }
  })

  return { sessions: result }
}

// =============================================
// GET PLAYER DASHBOARD
// =============================================

export async function getPlayerDashboard(): Promise<{
  data?: PlayerDashboardData
  error?: string
}> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  // Step 1: Fetch user's answers, results, and participations in parallel
  const [answersRes, resultsRes, participationsRes] = await Promise.all([
    supabase
      .from('player_answers')
      .select('id, set_id, row_number, selected_position, is_correct, session_round_id')
      .eq('user_id', profileId),
    supabase
      .from('round_results')
      .select('id, room_id, elapsed_ms, session_round_id')
      .eq('user_id', profileId),
    supabase
      .from('round_participants')
      .select('round_id')
      .eq('user_id', profileId),
  ])

  const answers = answersRes.data || []
  const results = resultsRes.data || []
  const participations = participationsRes.data || []

  // If no data at all, return empty dashboard
  if (answers.length === 0 && results.length === 0 && participations.length === 0) {
    return {
      data: {
        overallStats: {
          totalSessions: 0, totalRounds: 0, totalAnswers: 0,
          correctAnswers: 0, overallAccuracy: 0,
          bestTimeMs: null, avgTimeMs: null,
        },
        accuracyTrend: [],
        coffeeStats: [],
        sessionHistory: [],
      },
    }
  }

  // Step 2: Fetch session_rounds and room_set_rows in parallel
  const roundIds = [...new Set(participations.map((p) => p.round_id))]
  const setIds = [...new Set(answers.map((a) => a.set_id))]

  const [roundsRes, setRowsRes] = await Promise.all([
    roundIds.length > 0
      ? supabase
          .from('session_rounds')
          .select('id, session_id, round_number, set_id, started_at')
          .in('id', roundIds)
      : Promise.resolve({ data: [] as Array<{ id: string; session_id: string; round_number: number; set_id: string | null; started_at: string | null }> }),
    setIds.length > 0
      ? supabase
          .from('room_set_rows')
          .select('id, set_id, row_number, pair_coffee_id, odd_coffee_id')
          .in('set_id', setIds)
      : Promise.resolve({ data: [] as Array<{ id: string; set_id: string; row_number: number; pair_coffee_id: string; odd_coffee_id: string }> }),
  ])

  const sessionRounds = (roundsRes.data || []) as Array<{ id: string; session_id: string; round_number: number; set_id: string | null; started_at: string | null }>
  const setRows = (setRowsRes.data || []) as Array<{ id: string; set_id: string; row_number: number; pair_coffee_id: string; odd_coffee_id: string }>

  // Step 3: Fetch game_sessions and room_coffees in parallel
  const sessionIds = [...new Set(sessionRounds.map((r) => r.session_id))]
  const coffeeIds = new Set<string>()
  for (const row of setRows) {
    coffeeIds.add(row.pair_coffee_id)
    coffeeIds.add(row.odd_coffee_id)
  }
  const coffeeIdArray = [...coffeeIds]

  const [sessionsRes, coffeesRes] = await Promise.all([
    sessionIds.length > 0
      ? supabase
          .from('game_sessions')
          .select('id, room_id, started_at, ended_at')
          .in('id', sessionIds)
      : Promise.resolve({ data: [] as Array<{ id: string; room_id: string; started_at: string; ended_at: string | null }> }),
    coffeeIdArray.length > 0
      ? supabase
          .from('room_coffees')
          .select('id, label, name')
          .in('id', coffeeIdArray)
      : Promise.resolve({ data: [] as Array<{ id: string; label: string; name: string }> }),
  ])

  const sessions = (sessionsRes.data || []) as Array<{ id: string; room_id: string; started_at: string; ended_at: string | null }>
  const coffees = (coffeesRes.data || []) as Array<{ id: string; label: string; name: string }>

  // Step 4: Fetch rooms
  const roomIds = [...new Set(sessions.map((s) => s.room_id))]
  let rooms: Array<{ id: string; name: string | null; code: string }> = []
  if (roomIds.length > 0) {
    const roomsRes = await supabase
      .from('rooms')
      .select('id, name, code')
      .in('id', roomIds)
    rooms = (roomsRes.data || []) as Array<{ id: string; name: string | null; code: string }>
  }

  // Build lookup maps
  const coffeeMap = new Map(coffees.map((c) => [c.id, c]))
  const sessionMap = new Map(sessions.map((s) => [s.id, s]))
  const roomMap = new Map(rooms.map((r) => [r.id, r]))
  const roundMap = new Map(sessionRounds.map((r) => [r.id, r]))

  // ---- Compute Overall Stats ----
  const totalAnswers = answers.length
  const correctAnswers = answers.filter((a) => a.is_correct === true).length
  const overallAccuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0
  const completedSessions = sessions.filter((s) => s.ended_at !== null)
  const bestTimeMs = results.length > 0 ? Math.min(...results.map((r) => r.elapsed_ms)) : null
  const avgTimeMs = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.elapsed_ms, 0) / results.length)
    : null

  const overallStats: DashboardOverallStats = {
    totalSessions: completedSessions.length,
    totalRounds: roundIds.length,
    totalAnswers,
    correctAnswers,
    overallAccuracy,
    bestTimeMs,
    avgTimeMs,
  }

  // ---- Compute Accuracy Trend (last 20 rounds) ----
  // Group answers by session_round_id
  const answersByRound = new Map<string, typeof answers>()
  for (const a of answers) {
    if (!a.session_round_id) continue
    const arr = answersByRound.get(a.session_round_id) || []
    arr.push(a)
    answersByRound.set(a.session_round_id, arr)
  }

  const accuracyPoints: DashboardAccuracyPoint[] = []
  for (const [roundId, roundAnswers] of answersByRound) {
    const round = roundMap.get(roundId)
    if (!round) continue
    const session = sessionMap.get(round.session_id)
    if (!session) continue

    const total = roundAnswers.length
    const correct = roundAnswers.filter((a) => a.is_correct === true).length
    accuracyPoints.push({
      roundId,
      roundNumber: round.round_number,
      sessionStartedAt: session.started_at,
      correct,
      total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    })
  }

  // Sort chronologically and take last 20
  accuracyPoints.sort((a, b) => a.sessionStartedAt.localeCompare(b.sessionStartedAt))
  const accuracyTrend = accuracyPoints.slice(-20)

  // ---- Compute Per-Coffee Stats ----
  // For each answer, look up the set_row to find which coffee was the odd one
  const setRowsBySetAndRow = new Map<string, typeof setRows[0]>()
  for (const row of setRows) {
    setRowsBySetAndRow.set(`${row.set_id}:${row.row_number}`, row)
  }

  const coffeeStatsMap = new Map<string, {
    coffeeId: string; coffeeName: string; coffeeLabel: string
    timesSeenAsOdd: number; correctWhenOdd: number; timesSeenAsPair: number
  }>()

  for (const a of answers) {
    const setRow = setRowsBySetAndRow.get(`${a.set_id}:${a.row_number}`)
    if (!setRow) continue

    const oddCoffee = coffeeMap.get(setRow.odd_coffee_id)
    const pairCoffee = coffeeMap.get(setRow.pair_coffee_id)

    // Track odd coffee
    if (oddCoffee) {
      const existing = coffeeStatsMap.get(oddCoffee.id) || {
        coffeeId: oddCoffee.id, coffeeName: oddCoffee.name, coffeeLabel: oddCoffee.label,
        timesSeenAsOdd: 0, correctWhenOdd: 0, timesSeenAsPair: 0,
      }
      existing.timesSeenAsOdd++
      if (a.is_correct === true) existing.correctWhenOdd++
      coffeeStatsMap.set(oddCoffee.id, existing)
    }

    // Track pair coffee
    if (pairCoffee) {
      const existing = coffeeStatsMap.get(pairCoffee.id) || {
        coffeeId: pairCoffee.id, coffeeName: pairCoffee.name, coffeeLabel: pairCoffee.label,
        timesSeenAsOdd: 0, correctWhenOdd: 0, timesSeenAsPair: 0,
      }
      existing.timesSeenAsPair++
      coffeeStatsMap.set(pairCoffee.id, existing)
    }
  }

  const coffeeStats: DashboardCoffeeStat[] = [...coffeeStatsMap.values()].map((c) => ({
    ...c,
    accuracyWhenOdd: c.timesSeenAsOdd > 0 ? Math.round((c.correctWhenOdd / c.timesSeenAsOdd) * 100) : 0,
  }))

  // ---- Compute Session History (with accuracy) ----
  // Group rounds by session
  const roundsBySession = new Map<string, typeof sessionRounds>()
  for (const r of sessionRounds) {
    const arr = roundsBySession.get(r.session_id) || []
    arr.push(r)
    roundsBySession.set(r.session_id, arr)
  }

  // Group results by session_round_id
  const resultsByRound = new Map<string, typeof results>()
  for (const r of results) {
    if (!r.session_round_id) continue
    const arr = resultsByRound.get(r.session_round_id) || []
    arr.push(r)
    resultsByRound.set(r.session_round_id, arr)
  }

  const sessionHistory: DashboardSessionHistory[] = completedSessions.map((session) => {
    const room = roomMap.get(session.room_id)
    const rounds = roundsBySession.get(session.id) || []
    const roundIdsInSession = rounds.map((r) => r.id)

    // Accuracy for this session: all answers in these rounds
    let sessionCorrect = 0
    let sessionTotal = 0
    for (const rId of roundIdsInSession) {
      const roundAnswers = answersByRound.get(rId) || []
      sessionTotal += roundAnswers.length
      sessionCorrect += roundAnswers.filter((a) => a.is_correct === true).length
    }

    // Best time for this session
    const sessionResults = roundIdsInSession.flatMap((rId) => resultsByRound.get(rId) || [])
    const bestTime = sessionResults.length > 0
      ? Math.min(...sessionResults.map((r) => r.elapsed_ms))
      : null

    return {
      id: session.id,
      room_name: room?.name || null,
      room_code: room?.code || '',
      started_at: session.started_at,
      ended_at: session.ended_at!,
      round_count: rounds.length,
      best_time_ms: bestTime,
      accuracy: sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : null,
    }
  }).sort((a, b) => b.started_at.localeCompare(a.started_at))

  return {
    data: {
      overallStats,
      accuracyTrend,
      coffeeStats,
      sessionHistory,
    },
  }
}
