// Channel name builders
export const getRoomSyncChannel = (roomId: string) => `room_sync_${roomId}`
export const getUserInvitationsChannel = (clerkId: string) => `user_invitations_${clerkId}`

// Cup Tasters broadcast events
export const CUP_TASTERS_EVENTS = {
  GAME_START: 'game_start',
  GAME_PLAYING: 'game_playing',
  GAME_PAUSE: 'game_pause',
  GAME_RESUME: 'game_resume',
  PLAYER_FINISHED: 'player_finished',
  ROUND_ENDED: 'round_ended',
  SESSION_ENDED: 'session_ended',
  ROOM_UPDATED: 'room_updated',
} as const

// Cupping broadcast events
export const CUPPING_EVENTS = {
  CUPPING_STARTED: 'cupping_started',
  PLAYER_SUBMITTED: 'player_submitted',
  CUPPING_ENDED: 'cupping_ended',
  ROOM_UPDATED: 'room_updated',
} as const

// Invitation broadcast events
export const INVITATION_EVENTS = {
  NEW_INVITATION: 'new_invitation',
} as const
