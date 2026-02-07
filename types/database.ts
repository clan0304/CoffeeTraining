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
  user_id: string
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
  user_id: string
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

export type RoomStatus = 'waiting' | 'playing' | 'finished'

export interface Room {
  id: string
  host_id: string
  code: string
  name: string | null
  status: RoomStatus
  timer_minutes: number
  timer_started_at: string | null
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
  answered_at: string
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
