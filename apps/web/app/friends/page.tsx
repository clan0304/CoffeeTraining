'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  getFriends,
  removeFriend,
  sendFriendRequest,
  getMyFriendRequests,
  respondToFriendRequest,
  getSentFriendRequests,
  cancelFriendRequest,
} from '@/actions/friends'
import type { FriendProfile, FriendRequestWithSender, FriendRequestWithRecipient } from '@cuppingtraining/shared/types'
import { useSupabaseClient } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'
import { getUserFriendRequestsChannel, FRIEND_REQUEST_EVENTS } from '@cuppingtraining/shared/constants'

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [friendDraft, setFriendDraft] = useState('')
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [sendingRequest, setSendingRequest] = useState(false)
  const [friendError, setFriendError] = useState<string | null>(null)
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null)

  const [incomingRequests, setIncomingRequests] = useState<FriendRequestWithSender[]>([])
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set())

  const [sentRequests, setSentRequests] = useState<FriendRequestWithRecipient[]>([])
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set())

  const supabase = useSupabaseClient()
  const { user } = useUser()

  useEffect(() => {
    getFriends()
      .then((res) => setFriends(res.friends))
      .catch(() => {})
      .finally(() => setFriendsLoading(false))
  }, [])

  useEffect(() => {
    getMyFriendRequests()
      .then((res) => setIncomingRequests(res.requests))
      .catch(() => {})
  }, [])

  useEffect(() => {
    getSentFriendRequests()
      .then((res) => setSentRequests(res.requests))
      .catch(() => {})
  }, [])

  // Subscribe to friend request broadcasts
  useEffect(() => {
    if (!supabase || !user?.id) return

    const channel = supabase.channel(getUserFriendRequestsChannel(user.id))
    channel
      .on('broadcast', { event: FRIEND_REQUEST_EVENTS.NEW_REQUEST }, () => {
        getMyFriendRequests().then((res) => setIncomingRequests(res.requests)).catch(() => {})
      })
      .on('broadcast', { event: FRIEND_REQUEST_EVENTS.REQUEST_ACCEPTED }, () => {
        getFriends().then((res) => setFriends(res.friends)).catch(() => {})
        getSentFriendRequests().then((res) => setSentRequests(res.requests)).catch(() => {})
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user?.id])

  const handleSendRequest = useCallback(async () => {
    const username = friendDraft.trim()
    if (!username) return
    setSendingRequest(true)
    setFriendError(null)
    setFriendSuccess(null)

    const result = await sendFriendRequest(username)
    if (result.error) {
      setFriendError(result.error)
    } else {
      setFriendSuccess(`Request sent to @${username}`)
      setFriendDraft('')
      getSentFriendRequests().then((res) => setSentRequests(res.requests)).catch(() => {})

      if (result.recipientClerkId && supabase) {
        const channel = supabase.channel(getUserFriendRequestsChannel(result.recipientClerkId))
        await channel.subscribe()
        await channel.send({
          type: 'broadcast',
          event: FRIEND_REQUEST_EVENTS.NEW_REQUEST,
          payload: {},
        })
        supabase.removeChannel(channel)
      }
    }
    setSendingRequest(false)
  }, [friendDraft, supabase])

  const handleRespondToRequest = useCallback(async (requestId: string, accept: boolean) => {
    setRespondingIds((prev) => new Set(prev).add(requestId))
    const result = await respondToFriendRequest(requestId, accept)
    if (!result.error) {
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId))
      if (accept) {
        getFriends().then((res) => setFriends(res.friends)).catch(() => {})

        if (result.senderClerkId && supabase) {
          const channel = supabase.channel(getUserFriendRequestsChannel(result.senderClerkId))
          await channel.subscribe()
          await channel.send({
            type: 'broadcast',
            event: FRIEND_REQUEST_EVENTS.REQUEST_ACCEPTED,
            payload: {},
          })
          supabase.removeChannel(channel)
        }
      }
    }
    setRespondingIds((prev) => {
      const next = new Set(prev)
      next.delete(requestId)
      return next
    })
  }, [supabase])

  const handleCancelRequest = useCallback(async (requestId: string) => {
    setCancellingIds((prev) => new Set(prev).add(requestId))
    const result = await cancelFriendRequest(requestId)
    if (!result.error) {
      setSentRequests((prev) => prev.filter((r) => r.id !== requestId))
    }
    setCancellingIds((prev) => {
      const next = new Set(prev)
      next.delete(requestId)
      return next
    })
  }, [])

  const handleRemoveFriend = useCallback(async (friendId: string) => {
    const result = await removeFriend(friendId)
    if (!result.error) {
      setFriends((prev) => prev.filter((f) => f.friend_id !== friendId))
    }
  }, [])

  const handleFriendKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSendRequest()
      }
    },
    [handleSendRequest]
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Friends</h1>
        <p className="text-sm text-muted-foreground">
          Send a friend request by username. Accepted friends appear in room invite quick-pick.
        </p>
      </div>

      {/* Send Request */}
      <div className="flex gap-2">
        <Input
          value={friendDraft}
          onChange={(e) => {
            setFriendDraft(e.target.value)
            setFriendError(null)
            setFriendSuccess(null)
          }}
          onKeyDown={handleFriendKeyDown}
          placeholder="Enter username..."
          className="flex-1"
        />
        <Button onClick={handleSendRequest} disabled={sendingRequest || !friendDraft.trim()}>
          {sendingRequest ? 'Sending...' : 'Send Request'}
        </Button>
      </div>

      {friendError && (
        <p className="text-sm text-red-500">{friendError}</p>
      )}
      {friendSuccess && (
        <p className="text-sm text-green-600">{friendSuccess}</p>
      )}

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Incoming Requests</h3>
          <div className="space-y-2">
            {incomingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={req.sender_photo_url || undefined} alt={req.sender_username} />
                    <AvatarFallback className="text-[10px]">
                      {req.sender_username[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">@{req.sender_username}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRespondToRequest(req.id, false)}
                    disabled={respondingIds.has(req.id)}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRespondToRequest(req.id, true)}
                    disabled={respondingIds.has(req.id)}
                  >
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Sent Requests</h3>
          <div className="flex flex-wrap gap-2">
            {sentRequests.map((req) => (
              <span
                key={req.id}
                className="inline-flex items-center gap-2 rounded-full border bg-muted/50 pl-1 pr-3 py-1 text-sm"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={req.recipient_photo_url || undefined} alt={req.recipient_username} />
                  <AvatarFallback className="text-[10px]">
                    {req.recipient_username[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                @{req.recipient_username}
                <span className="text-xs text-muted-foreground">pending</span>
                <button
                  type="button"
                  onClick={() => handleCancelRequest(req.id)}
                  disabled={cancellingIds.has(req.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  aria-label={`Cancel request to ${req.recipient_username}`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      {friendsLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : friends.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No friends yet. Send a request to get started.
        </p>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">My Friends</h3>
          <div className="flex flex-wrap gap-2">
            {friends.map((friend) => (
              <span
                key={friend.friend_id}
                className="inline-flex items-center gap-2 rounded-full border bg-muted/50 pl-1 pr-3 py-1 text-sm"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={friend.photo_url || undefined} alt={friend.username} />
                  <AvatarFallback className="text-[10px]">
                    {friend.username[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                @{friend.username}
                <button
                  type="button"
                  onClick={() => handleRemoveFriend(friend.friend_id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${friend.username}`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
