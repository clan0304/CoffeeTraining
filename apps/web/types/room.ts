import type { Room, RoomPlayer, RoomInvitation, PublicProfile, RoomCoffee, RoomSet, RoomSetRow } from '@cuppingtraining/shared/types'

export type RoomWithDetails = Room & {
  players: Array<RoomPlayer & { profile: PublicProfile | null }>
  invitations: Array<RoomInvitation & { invited_profile: PublicProfile | null }>
  coffees: RoomCoffee[]
  sets: Array<RoomSet & { rows: Array<RoomSetRow & { pair_coffee: RoomCoffee; odd_coffee: RoomCoffee }> }>
}