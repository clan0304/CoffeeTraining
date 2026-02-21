'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { Room, RoomPlayer, RoomInvitation, PublicProfile, RoomCoffee, CuppingSession, CuppingSample, CuppingScore, ScaCuppingScores, SimpleCuppingScores, CuppingFormType, CuppingDashboardData, CuppingSessionDetailData } from '@cuppingtraining/shared/types'

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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// =============================================
// CREATE CUPPING ROOM
// =============================================

export async function createCuppingRoom(input: {
  name: string | null
  formType?: CuppingFormType
}): Promise<{ room?: Room; error?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

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

  // Create the room with type='cupping'
  const formType = input.formType || 'sca'
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      host_id: profileId,
      code,
      name: input.name?.trim() || null,
      type: 'cupping',
      settings: { form_type: formType },
      timer_minutes: 0,
      status: 'waiting',
    })
    .select()
    .single<Room>()

  if (roomError) {
    console.error('Error creating cupping room:', roomError)
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
// UPDATE CUPPING FORM TYPE (host only, waiting)
// =============================================

export async function updateCuppingFormType(
  roomId: string,
  formType: CuppingFormType
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status, settings')
    .eq('id', roomId)
    .single<{ host_id: string; status: string; settings: Record<string, unknown> }>()

  if (!room) return { error: 'Room not found' }
  if (room.host_id !== profileId) return { error: 'Only the host can change settings' }
  if (room.status !== 'waiting') return { error: 'Cannot change settings after session started' }

  const { error } = await supabase
    .from('rooms')
    .update({
      settings: { ...room.settings, form_type: formType },
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)

  if (error) {
    console.error('Error updating form type:', error)
    return { error: 'Failed to update form type' }
  }

  return { success: true }
}

// =============================================
// GET CUPPING ROOM DETAILS
// =============================================

export async function getCuppingRoomDetails(roomId: string): Promise<{
  room?: Room & {
    players: Array<RoomPlayer & { profile: PublicProfile | null }>
    invitations: Array<RoomInvitation & { invited_profile: PublicProfile | null }>
    coffees: RoomCoffee[]
  }
  currentUserProfileId?: string
  coffeeCount?: number
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
    return { error: 'Room not found' }
  }

  const isHost = room.host_id === profileId

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

  // Get all user profiles for players and invitations
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

  const playersWithProfiles = players?.map((p) => ({
    ...p,
    profile: profileMap.get(p.user_id) || null,
  })) || []

  const invitationsWithProfiles = invitations?.map((i) => ({
    ...i,
    invited_profile: profileMap.get(i.invited_user_id) || null,
  })) || []

  // Non-host: hide coffee names (only return count)
  const coffeeList = (coffees || []) as RoomCoffee[]

  return {
    room: {
      ...room,
      players: playersWithProfiles as Array<RoomPlayer & { profile: PublicProfile | null }>,
      invitations: invitationsWithProfiles as Array<RoomInvitation & { invited_profile: PublicProfile | null }>,
      coffees: isHost ? coffeeList : coffeeList.map((c) => ({ ...c, name: '', description: null })),
    },
    currentUserProfileId: profileId,
    coffeeCount: coffeeList.length,
  }
}

// =============================================
// START CUPPING SESSION (host only)
// =============================================

export async function startCuppingSession(
  roomId: string
): Promise<{ sessionId?: string; error?: string }> {
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

  if (!room) return { error: 'Room not found' }
  if (room.host_id !== profileId) return { error: 'Only the host can start a session' }
  if (room.status !== 'waiting') return { error: 'Session already in progress' }

  // Get coffees
  const { data: coffees } = await supabase
    .from('room_coffees')
    .select('id, label')
    .eq('room_id', roomId)
    .order('label', { ascending: true })

  if (!coffees || coffees.length === 0) {
    return { error: 'Add at least 1 coffee to start' }
  }

  // Create cupping session
  const { data: session, error: sessionError } = await supabase
    .from('cupping_sessions')
    .insert({
      user_id: profileId,
      room_id: roomId,
    })
    .select('id')
    .single<{ id: string }>()

  if (sessionError || !session) {
    console.error('Error creating cupping session:', sessionError)
    return { error: 'Failed to create session' }
  }

  // Create one sample per coffee
  const sampleInserts = coffees.map((coffee, index) => ({
    session_id: session.id,
    sample_number: index + 1,
    sample_label: coffee.label,
  }))

  const { error: sampleError } = await supabase
    .from('cupping_samples')
    .insert(sampleInserts)

  if (sampleError) {
    console.error('Error creating cupping samples:', sampleError)
    await supabase.from('cupping_sessions').delete().eq('id', session.id)
    return { error: 'Failed to create samples' }
  }

  // Set room status to playing
  const { error: updateError } = await supabase
    .from('rooms')
    .update({
      status: 'playing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)

  if (updateError) {
    console.error('Error updating room status:', updateError)
    return { error: 'Failed to start session' }
  }

  return { sessionId: session.id }
}

// =============================================
// SUBMIT CUPPING SCORES (any player)
// =============================================

export async function submitCuppingScores(
  roomId: string,
  scores: Array<{ sampleNumber: number; scores: ScaCuppingScores | SimpleCuppingScores; totalScore: number }>
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  // Verify player is in the room
  const { data: player } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', profileId)
    .maybeSingle()

  if (!player) return { error: 'You are not in this room' }

  // Verify room is playing
  const { data: room } = await supabase
    .from('rooms')
    .select('status, settings')
    .eq('id', roomId)
    .single<{ status: string; settings: { form_type?: string } }>()

  if (!room || room.status !== 'playing') {
    return { error: 'Session is not in progress' }
  }

  const formType = room.settings?.form_type || 'sca'

  // Find active cupping session for this room
  const { data: session } = await supabase
    .from('cupping_sessions')
    .select('id')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single<{ id: string }>()

  if (!session) return { error: 'No active session found' }

  // Get samples for this session
  const { data: samples } = await supabase
    .from('cupping_samples')
    .select('id, sample_number')
    .eq('session_id', session.id)
    .order('sample_number', { ascending: true })

  if (!samples) return { error: 'No samples found' }

  const sampleMap = new Map(samples.map((s) => [s.sample_number, s.id]))

  // Upsert scores
  const scoreInserts = scores.map((s) => ({
    sample_id: sampleMap.get(s.sampleNumber)!,
    user_id: profileId,
    form_type: formType,
    scores: s.scores as unknown as Record<string, unknown>,
    total_score: s.totalScore,
  })).filter((s) => s.sample_id)

  if (scoreInserts.length === 0) {
    return { error: 'No valid scores to submit' }
  }

  const { error } = await supabase
    .from('cupping_scores')
    .upsert(scoreInserts, { onConflict: 'sample_id,user_id' })

  if (error) {
    console.error('Error submitting scores:', error)
    return { error: 'Failed to submit scores' }
  }

  return { success: true }
}

// =============================================
// END CUPPING SESSION (host only)
// =============================================

export async function endCuppingSession(
  roomId: string
): Promise<{ sessionId?: string; error?: string }> {
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

  if (!room) return { error: 'Room not found' }
  if (room.host_id !== profileId) return { error: 'Only the host can end the session' }

  // Find the latest cupping session
  const { data: session } = await supabase
    .from('cupping_sessions')
    .select('id')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single<{ id: string }>()

  if (!session) return { error: 'No session found' }

  // Set room back to waiting
  const { error } = await supabase
    .from('rooms')
    .update({
      status: 'waiting',
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)

  if (error) {
    console.error('Error ending cupping session:', error)
    return { error: 'Failed to end session' }
  }

  return { sessionId: session.id }
}

// =============================================
// GET CUPPING RESULTS
// =============================================

export async function getCuppingResults(
  roomId: string,
  sessionId: string
): Promise<{
  results?: {
    session: CuppingSession
    samples: Array<CuppingSample & { coffeeName: string; coffeeLabel: string }>
    scores: Array<CuppingScore & { username: string; sampleNumber: number }>
  }
  error?: string
}> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  // Verify user is a member of the room
  const { data: player } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', profileId)
    .maybeSingle()

  if (!player) return { error: 'You are not in this room' }

  // Get session
  const { data: session } = await supabase
    .from('cupping_sessions')
    .select('*')
    .eq('id', sessionId)
    .single<CuppingSession>()

  if (!session) return { error: 'Session not found' }

  // Get samples
  const { data: samples } = await supabase
    .from('cupping_samples')
    .select('*')
    .eq('session_id', sessionId)
    .order('sample_number', { ascending: true })

  if (!samples) return { error: 'No samples found' }

  // Get coffees for the room to reveal names
  const { data: coffees } = await supabase
    .from('room_coffees')
    .select('id, label, name')
    .eq('room_id', roomId)
    .order('label', { ascending: true })

  const coffeeByLabel = new Map(coffees?.map((c) => [c.label, c]) || [])

  const samplesWithCoffees = samples.map((s) => {
    const coffee = coffeeByLabel.get(s.sample_label)
    return {
      ...s,
      coffeeName: coffee?.name || 'Unknown',
      coffeeLabel: coffee?.label || s.sample_label,
    }
  })

  // Get all scores for these samples
  const sampleIds = samples.map((s) => s.id)
  const { data: scores } = await supabase
    .from('cupping_scores')
    .select('*')
    .in('sample_id', sampleIds)

  // Get usernames for scorers
  const scorerIds = [...new Set(scores?.map((s) => s.user_id) || [])]
  const { data: scorerProfiles } = await supabase
    .from('user_profiles')
    .select('id, username')
    .in('id', scorerIds)

  const usernameMap = new Map(scorerProfiles?.map((p) => [p.id, p.username || 'Unknown']) || [])
  const sampleNumberMap = new Map(samples.map((s) => [s.id, s.sample_number]))

  const scoresWithDetails = (scores || []).map((s) => ({
    ...s,
    scores: s.scores as unknown as ScaCuppingScores | SimpleCuppingScores,
    username: usernameMap.get(s.user_id) || 'Unknown',
    sampleNumber: sampleNumberMap.get(s.sample_id) || 0,
  }))

  return {
    results: {
      session,
      samples: samplesWithCoffees as Array<CuppingSample & { coffeeName: string; coffeeLabel: string }>,
      scores: scoresWithDetails as Array<CuppingScore & { username: string; sampleNumber: number }>,
    },
  }
}

// =============================================
// GET CUPPING DASHBOARD
// =============================================

export async function getCuppingDashboard(): Promise<{
  data?: CuppingDashboardData
  error?: string
}> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  // Get all cupping scores for this user
  const { data: userScores } = await supabase
    .from('cupping_scores')
    .select('id, sample_id, total_score')
    .eq('user_id', profileId)

  if (!userScores || userScores.length === 0) {
    return {
      data: {
        overallStats: {
          totalSessions: 0,
          totalSamplesScored: 0,
          avgTotalScore: null,
          highestScore: null,
          lowestScore: null,
        },
        sessionHistory: [],
      },
    }
  }

  // Get sample IDs to find sessions
  const sampleIds = userScores.map((s) => s.sample_id)

  // Get samples with session info
  const { data: samples } = await supabase
    .from('cupping_samples')
    .select('id, session_id, sample_number, sample_label')
    .in('id', sampleIds)

  if (!samples) return { error: 'Failed to load samples' }

  // Get unique session IDs
  const sessionIds = [...new Set(samples.map((s) => s.session_id))]

  // Get sessions with room info
  const { data: sessions } = await supabase
    .from('cupping_sessions')
    .select('id, room_id, created_at')
    .in('id', sessionIds)
    .order('created_at', { ascending: false })

  if (!sessions) return { error: 'Failed to load sessions' }

  // Get room info for sessions that have rooms
  const roomIds = sessions.map((s) => s.room_id).filter(Boolean) as string[]
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, code')
    .in('id', roomIds)

  const roomMap = new Map(rooms?.map((r) => [r.id, r]) || [])

  // Get all scores for the samples (to count distinct players per session)
  const { data: allScores } = await supabase
    .from('cupping_scores')
    .select('id, sample_id, user_id, total_score')
    .in('sample_id', sampleIds)

  // Build per-session sample map
  const sessionSampleMap = new Map<string, string[]>()
  for (const sample of samples) {
    const existing = sessionSampleMap.get(sample.session_id) || []
    existing.push(sample.id)
    sessionSampleMap.set(sample.session_id, existing)
  }

  // Overall stats from user's scores
  const totalScores = userScores
    .map((s) => s.total_score)
    .filter((s): s is number => s !== null)

  const overallStats = {
    totalSessions: sessionIds.length,
    totalSamplesScored: userScores.length,
    avgTotalScore:
      totalScores.length > 0
        ? Math.round((totalScores.reduce((a, b) => a + b, 0) / totalScores.length) * 100) / 100
        : null,
    highestScore: totalScores.length > 0 ? Math.max(...totalScores) : null,
    lowestScore: totalScores.length > 0 ? Math.min(...totalScores) : null,
  }

  // Build session history
  const sessionHistory = sessions.map((session) => {
    const sessionSampleIds = sessionSampleMap.get(session.id) || []
    const room = session.room_id ? roomMap.get(session.room_id) : null

    // User's scores for this session
    const sessionUserScores = userScores.filter((s) =>
      sessionSampleIds.includes(s.sample_id)
    )
    const sessionTotalScores = sessionUserScores
      .map((s) => s.total_score)
      .filter((s): s is number => s !== null)

    // Distinct players from all scores for these samples
    const playerIds = new Set(
      (allScores || [])
        .filter((s) => sessionSampleIds.includes(s.sample_id))
        .map((s) => s.user_id)
    )

    return {
      id: session.id,
      room_name: room?.name || null,
      room_code: room?.code || null,
      created_at: session.created_at,
      sample_count: sessionSampleIds.length,
      avg_score:
        sessionTotalScores.length > 0
          ? Math.round(
              (sessionTotalScores.reduce((a, b) => a + b, 0) / sessionTotalScores.length) * 100
            ) / 100
          : null,
      player_count: playerIds.size,
    }
  })

  return { data: { overallStats, sessionHistory } }
}

// =============================================
// GET CUPPING SESSION DETAIL
// =============================================

export async function getCuppingSessionDetail(
  sessionId: string
): Promise<{ data?: CuppingSessionDetailData; error?: string }> {
  const profile = await getProfileId()
  if (!profile) return { error: 'Not authenticated' }
  const { profileId } = profile

  const supabase = createAdminSupabaseClient()

  // Get session
  const { data: session } = await supabase
    .from('cupping_sessions')
    .select('*')
    .eq('id', sessionId)
    .single<CuppingSession>()

  if (!session) return { error: 'Session not found' }

  // Get samples
  const { data: samples } = await supabase
    .from('cupping_samples')
    .select('*')
    .eq('session_id', sessionId)
    .order('sample_number', { ascending: true })

  if (!samples || samples.length === 0) return { error: 'No samples found' }

  const sampleIds = samples.map((s) => s.id)

  // Get all scores for these samples
  const { data: scores } = await supabase
    .from('cupping_scores')
    .select('*')
    .in('sample_id', sampleIds)

  // Verify user has access (has scores or is room member)
  const userHasScores = scores?.some((s) => s.user_id === profileId)
  let hasAccess = userHasScores

  if (!hasAccess && session.room_id) {
    const { data: player } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', session.room_id)
      .eq('user_id', profileId)
      .maybeSingle()
    hasAccess = !!player
  }

  if (!hasAccess) return { error: 'You do not have access to this session' }

  // Get room info
  let roomName: string | null = null
  let roomCode: string | null = null
  if (session.room_id) {
    const { data: room } = await supabase
      .from('rooms')
      .select('name, code')
      .eq('id', session.room_id)
      .single<{ name: string | null; code: string }>()
    if (room) {
      roomName = room.name
      roomCode = room.code
    }
  }

  // Get coffees for label→name mapping
  let coffeeByLabel = new Map<string, { name: string; label: string }>()
  if (session.room_id) {
    const { data: coffees } = await supabase
      .from('room_coffees')
      .select('id, label, name')
      .eq('room_id', session.room_id)
      .order('label', { ascending: true })
    coffeeByLabel = new Map(coffees?.map((c) => [c.label, c]) || [])
  }

  const samplesWithCoffees = samples.map((s) => {
    const coffee = coffeeByLabel.get(s.sample_label)
    return {
      ...s,
      coffeeName: coffee?.name || 'Unknown',
      coffeeLabel: coffee?.label || s.sample_label,
    }
  })

  // Get usernames for scorers
  const scorerIds = [...new Set(scores?.map((s) => s.user_id) || [])]
  const { data: scorerProfiles } = await supabase
    .from('user_profiles')
    .select('id, username')
    .in('id', scorerIds)

  const usernameMap = new Map(scorerProfiles?.map((p) => [p.id, p.username || 'Unknown']) || [])
  const sampleNumberMap = new Map(samples.map((s) => [s.id, s.sample_number]))

  const scoresWithDetails = (scores || []).map((s) => ({
    ...s,
    scores: s.scores as unknown as ScaCuppingScores | SimpleCuppingScores,
    username: usernameMap.get(s.user_id) || 'Unknown',
    sampleNumber: sampleNumberMap.get(s.sample_id) || 0,
  }))

  return {
    data: {
      session: { ...session, room_name: roomName, room_code: roomCode },
      samples: samplesWithCoffees as Array<CuppingSample & { coffeeName: string; coffeeLabel: string }>,
      scores: scoresWithDetails as Array<CuppingScore & { username: string; sampleNumber: number }>,
      playerCount: scorerIds.length,
    },
  }
}
