'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getFriends } from '@/actions/friends'
import type { FriendProfile } from '@cuppingtraining/shared/types'

interface FriendInvitePickerProps {
  /** Profile IDs of players already in the room */
  playerIds: string[]
  /** Profile IDs of users with pending invitations */
  pendingInviteIds: string[]
  /** Called when a friend pill is clicked. Receives the friend's username. */
  onInvite: (username: string) => void
  disabled?: boolean
}

export function FriendInvitePicker({
  playerIds,
  pendingInviteIds,
  onInvite,
  disabled,
}: FriendInvitePickerProps) {
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getFriends()
      .then((res) => setFriends(res.friends))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  if (!loaded || friends.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Quick invite</p>
      <div className="flex flex-wrap gap-2">
        {friends.map((friend) => {
          const isInRoom = playerIds.includes(friend.friend_id)
          const isPending = pendingInviteIds.includes(friend.friend_id)
          const isDisabled = disabled || isInRoom || isPending

          return (
            <button
              key={friend.friend_id}
              type="button"
              disabled={isDisabled}
              onClick={() => onInvite(friend.username)}
              className={`inline-flex items-center gap-1.5 rounded-full border pl-1 pr-2.5 py-1 text-sm transition-colors ${
                isDisabled
                  ? 'opacity-40 cursor-default'
                  : 'hover:border-primary hover:bg-primary/5 cursor-pointer'
              }`}
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={friend.photo_url || undefined} alt={friend.username} />
                <AvatarFallback className="text-[10px]">
                  {friend.username[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span>@{friend.username}</span>
              {isInRoom && <span className="text-[10px] text-muted-foreground">(joined)</span>}
              {isPending && <span className="text-[10px] text-muted-foreground">(pending)</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
