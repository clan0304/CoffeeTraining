'use client'

import { getRealtimeClient } from '@/lib/supabase/client'
import { getRoomSyncChannel, CUP_TASTERS_EVENTS, CUPPING_EVENTS } from '@cuppingtraining/shared/constants'
import type { RoomType } from '@cuppingtraining/shared/types'

export function notifyRoomUpdated(roomId: string, roomType: RoomType = 'cup_tasters') {
  const realtime = getRealtimeClient()
  const channel = realtime.channel(getRoomSyncChannel(roomId))
  const event = roomType === 'cupping'
    ? CUPPING_EVENTS.ROOM_UPDATED
    : CUP_TASTERS_EVENTS.ROOM_UPDATED

  return new Promise<void>((resolve) => {
    let settled = false

    const cleanup = () => {
      if (settled) return
      settled = true
      realtime.removeChannel(channel)
      resolve()
    }

    const timeout = setTimeout(cleanup, 1500)

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel
          .send({ type: 'broadcast', event, payload: {} })
          .finally(() => {
            clearTimeout(timeout)
            setTimeout(cleanup, 250)
          })
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(timeout)
        cleanup()
      }
    })
  })
}
