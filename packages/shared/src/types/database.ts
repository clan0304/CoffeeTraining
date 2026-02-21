export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// =============================================
// USER PROFILES
// =============================================

export interface UserProfile {
  id: string
  clerk_id: string
  email: string
  username: string | null
  bio: string | null
  photo_url: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

// Public view - email & onboarding_completed are null for other users
export interface PublicProfile {
  id: string
  clerk_id: string
  email: string | null
  username: string | null
  bio: string | null
  photo_url: string | null
  onboarding_completed: boolean | null
  created_at: string
  updated_at: string
}

// =============================================
// ROOMS
// =============================================

export type RoomStatus = 'waiting' | 'countdown' | 'playing' | 'paused' | 'finished'
export type RoomType = 'cup_tasters' | 'cupping'

// Type-specific settings stored in JSONB
export interface CupTastersSettings {
  // timer_minutes lives as a column for backward compat
}

export interface CuppingSettings {
  form_type: CuppingFormType
}

export type RoomSettings = CupTastersSettings | CuppingSettings

export interface Room {
  id: string
  host_id: string
  code: string
  name: string | null
  type: RoomType
  settings: RoomSettings
  status: RoomStatus
  timer_minutes: number
  timer_started_at: string | null
  paused_at: string | null
  active_set_id: string | null
  created_at: string
  updated_at: string
}

export interface RoomPlayer {
  id: string
  room_id: string
  user_id: string
  joined_at: string
}

export interface RoomCoffee {
  id: string
  room_id: string
  label: string  // A, B, C, D, E...
  name: string
  description: string | null
  created_at: string
}

export interface RoomSet {
  id: string
  room_id: string
  set_number: number
  created_at: string
}

export interface RoomSetRow {
  id: string
  set_id: string
  row_number: number  // 1-8
  pair_coffee_id: string
  odd_coffee_id: string
  odd_position: number  // 1, 2, or 3
  created_at: string
}

export interface PlayerAnswer {
  id: string
  set_id: string
  user_id: string
  row_number: number  // 1-8
  selected_position: number  // 1, 2, or 3
  is_correct: boolean | null
  session_round_id: string | null
  answered_at: string
}

// =============================================
// ROUND RESULTS
// =============================================

export interface RoundResult {
  id: string
  room_id: string
  user_id: string
  timer_started_at: string  // Identifies which round
  finished_at: string
  elapsed_ms: number
  session_round_id: string | null
  created_at: string
}

// =============================================
// GAME SESSIONS
// =============================================

export interface GameSession {
  id: string
  room_id: string
  started_at: string
  ended_at: string | null  // null = active
  created_at: string
}

export interface SessionRound {
  id: string
  session_id: string
  round_number: number
  set_id: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface RoundParticipant {
  id: string
  round_id: string
  user_id: string
}

// =============================================
// ROOM INVITATIONS
// =============================================

export type InvitationStatus = 'pending' | 'accepted' | 'declined'

export interface RoomInvitation {
  id: string
  room_id: string
  invited_user_id: string
  invited_by: string
  status: InvitationStatus
  created_at: string
  updated_at: string
}

// =============================================
// JOINED TYPES (for queries with relations)
// =============================================

export interface RoomWithPlayers extends Room {
  room_players: RoomPlayer[]
}

export interface RoomSetRowWithCoffees extends RoomSetRow {
  pair_coffee: RoomCoffee
  odd_coffee: RoomCoffee
}

export interface RoomSetWithRows extends RoomSet {
  room_set_rows: RoomSetRowWithCoffees[]
}

export interface PlayerAnswerWithCorrect extends PlayerAnswer {
  is_correct: boolean
}

export interface RoomInvitationWithProfile extends RoomInvitation {
  invited_profile?: PublicProfile
  inviter_profile?: PublicProfile
}

export interface RoomWithInvitations extends Room {
  room_invitations: RoomInvitation[]
}

export interface RoomWithPlayersAndInvitations extends Room {
  room_players: RoomPlayer[]
  room_invitations: RoomInvitation[]
}

// =============================================
// DASHBOARD
// =============================================

export interface DashboardOverallStats {
  totalSessions: number
  totalRounds: number
  totalAnswers: number
  correctAnswers: number
  overallAccuracy: number // 0-100
  bestTimeMs: number | null
  avgTimeMs: number | null
}

export interface DashboardAccuracyPoint {
  roundId: string
  roundNumber: number
  sessionStartedAt: string
  correct: number
  total: number
  accuracy: number // 0-100
}

export interface DashboardCoffeeStat {
  coffeeId: string
  coffeeName: string
  coffeeLabel: string
  timesSeenAsOdd: number
  correctWhenOdd: number
  accuracyWhenOdd: number // 0-100
  timesSeenAsPair: number
}

export interface DashboardSessionHistory {
  id: string
  room_name: string | null
  room_code: string
  started_at: string
  ended_at: string
  round_count: number
  best_time_ms: number | null
  accuracy: number | null // 0-100
}

export interface PlayerDashboardData {
  overallStats: DashboardOverallStats
  accuracyTrend: DashboardAccuracyPoint[]
  coffeeStats: DashboardCoffeeStat[]
  sessionHistory: DashboardSessionHistory[]
}

// =============================================
// CUPPING
// =============================================

export type CuppingFormType = 'sca' | 'simple'

export interface ScaCuppingScores {
  fragrance_dry: number
  fragrance_break: number
  fragrance_score: number
  fragrance_notes: string
  flavor_score: number
  flavor_notes: string
  aftertaste_score: number
  aftertaste_notes: string
  acidity_score: number
  acidity_intensity: number // 1-5 low to high
  acidity_notes: string
  body_score: number
  body_level: number // 1-5 thin to heavy
  body_notes: string
  balance_score: number
  balance_notes: string
  overall_score: number
  overall_notes: string
  uniformity_cups: boolean[] // 5 cups
  uniformity_notes: string
  clean_cup_cups: boolean[] // 5 cups
  clean_cup_notes: string
  sweetness_cups: boolean[] // 5 cups
  sweetness_notes: string
  defects_taint_cups: number
  defects_taint_intensity: number
  defects_fault_cups: number
  defects_fault_intensity: number
}

export interface SimpleCuppingScores {
  aroma_score: number       // 1-5
  aroma_notes: string
  acidity_score: number     // 1-5
  acidity_notes: string
  sweetness_score: number   // 1-5
  sweetness_notes: string
  body_score: number        // 1-5
  body_notes: string
  aftertaste_score: number  // 1-5
  aftertaste_notes: string
  overall_notes: string
}

export interface CuppingSession {
  id: string
  user_id: string
  room_id: string | null
  name: string | null
  created_at: string
}

export interface CuppingSample {
  id: string
  session_id: string
  sample_number: number
  sample_label: string
  roast_level: number | null
  created_at: string
}

export interface CuppingScore {
  id: string
  sample_id: string
  user_id: string
  form_type: CuppingFormType
  scores: ScaCuppingScores | SimpleCuppingScores
  total_score: number | null
  notes: string | null
  created_at: string
}

// =============================================
// CUPPING DASHBOARD
// =============================================

export interface CuppingDashboardOverallStats {
  totalSessions: number
  totalSamplesScored: number
  avgTotalScore: number | null
  highestScore: number | null
  lowestScore: number | null
}

export interface CuppingDashboardSessionHistory {
  id: string              // cupping_sessions.id
  room_name: string | null
  room_code: string | null
  created_at: string
  sample_count: number
  avg_score: number | null
  player_count: number
}

export interface CuppingDashboardData {
  overallStats: CuppingDashboardOverallStats
  sessionHistory: CuppingDashboardSessionHistory[]
}

export interface CuppingSessionDetailData {
  session: CuppingSession & { room_name: string | null; room_code: string | null }
  samples: Array<CuppingSample & { coffeeName: string; coffeeLabel: string }>
  scores: Array<CuppingScore & { username: string; sampleNumber: number }>
  playerCount: number
}
