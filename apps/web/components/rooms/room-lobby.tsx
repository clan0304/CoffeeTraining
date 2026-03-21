'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FriendInvitePicker } from '@/components/rooms/friend-invite-picker'
import type { RoomWithDetails } from '@/types/room'

interface RoomLobbyProps {
  room: RoomWithDetails
  isHost: boolean
  currentUserProfileId: string | null
  completedRoundsCount: number
  // Invite handlers
  inviteUsername: string
  setInviteUsername: (username: string) => void
  inviteLoading: boolean
  inviteError: string | null
  inviteSuccess: string | null
  onInvite: (e: React.FormEvent) => void
  onCancelInvitation: (invitationId: string) => void
  onQuickInvite: (username: string) => void
  // Coffee management
  coffeeName: string
  setCoffeeName: (name: string) => void
  coffeeLoading: boolean
  editingCoffeeId: string | null
  setEditingCoffeeId: (id: string | null) => void
  editingCoffeeName: string
  setEditingCoffeeName: (name: string) => void
  onAddCoffee: (e: React.FormEvent) => void
  onRemoveCoffee: (coffeeId: string) => void
  onUpdateCoffee: (coffeeId: string) => void
  // Set management
  generatingSet: boolean
  creatingManualSet: boolean
  editingSetId: string | null
  setEditingSetId: (id: string | null) => void
  selectedSetId: string | null
  setSelectedSetId: (id: string | null) => void
  onGenerateSet: () => void
  onCreateManualSet: () => void
  onDeleteSet: (setId: string) => void
  onUpdateRow: (rowId: string, pairCoffeeId: string, oddCoffeeId: string, oddPosition: number) => void
  // Actions
  startingGame: boolean
  onStartGame: () => void
  onLeaveRoom: () => void
  onDeleteRoom: () => void
  onTransferHost: (playerId: string) => void
  onCopyRoomCode: () => void
  // Session management
  endSessionConfirm: boolean
  setEndSessionConfirm: (confirm: boolean) => void
  endingSession: boolean
  onEndSession: () => void
  // Leave state
  leaveLoading: boolean
}

export function RoomLobby({
  room,
  isHost,
  currentUserProfileId,
  completedRoundsCount,
  inviteUsername,
  setInviteUsername,
  inviteLoading,
  inviteError,
  inviteSuccess,
  onInvite,
  onCancelInvitation,
  onQuickInvite,
  coffeeName,
  setCoffeeName,
  coffeeLoading,
  editingCoffeeId,
  setEditingCoffeeId,
  editingCoffeeName,
  setEditingCoffeeName,
  onAddCoffee,
  onRemoveCoffee,
  onUpdateCoffee,
  generatingSet,
  creatingManualSet,
  editingSetId,
  setEditingSetId,
  selectedSetId,
  setSelectedSetId,
  onGenerateSet,
  onCreateManualSet,
  onDeleteSet,
  onUpdateRow,
  startingGame,
  onStartGame,
  onLeaveRoom,
  onDeleteRoom,
  onTransferHost,
  onCopyRoomCode,
  endSessionConfirm,
  setEndSessionConfirm,
  endingSession,
  onEndSession,
  leaveLoading
}: RoomLobbyProps) {
  const pendingInvitations = room.invitations.filter((i) => i.status === 'pending')

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{room.name || 'Training Room'}</h1>
            <p className="text-sm text-muted-foreground">
              {room.status === 'waiting' ? 'Waiting for players' : room.status}
            </p>
          </div>
          {!isHost && (
            <Button variant="ghost" size="sm" onClick={onLeaveRoom} disabled={leaveLoading}>
              {leaveLoading ? 'Leaving...' : 'Exit'}
            </Button>
          )}
        </div>

        {/* Room Code */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Room Code</CardTitle>
            <CardDescription>Share this code with others to join</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center text-3xl font-mono font-bold tracking-widest bg-muted rounded-lg py-4">
                {room.code}
              </div>
              <Button variant="outline" onClick={onCopyRoomCode}>
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invite by Username (Host only) */}
        {isHost && room.status === 'waiting' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Invite Player</CardTitle>
              <CardDescription>Invite someone by their username</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <FriendInvitePicker
                playerIds={room.players.map((p) => p.user_id)}
                pendingInviteIds={pendingInvitations.map((i) => i.invited_user_id)}
                onInvite={onQuickInvite}
                disabled={inviteLoading}
              />
              <form onSubmit={onInvite} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter username"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    disabled={inviteLoading}
                  />
                  <Button type="submit" disabled={inviteLoading || !inviteUsername.trim()}>
                    {inviteLoading ? '...' : 'Invite'}
                  </Button>
                </div>
                {inviteError && (
                  <p className="text-sm text-red-500">{inviteError}</p>
                )}
                {inviteSuccess && (
                  <p className="text-sm text-green-600">{inviteSuccess}</p>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {/* Pending Invitations */}
        {isHost && pendingInvitations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={invitation.invited_profile?.photo_url || undefined}
                        alt={invitation.invited_profile?.username || 'User'}
                      />
                      <AvatarFallback>
                        {invitation.invited_profile?.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      @{invitation.invited_profile?.username || 'Unknown'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelInvitation(invitation.id)}
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Players */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              Players ({room.players.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {room.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 py-2 border-b last:border-0"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={player.profile?.photo_url || undefined}
                    alt={player.profile?.username || 'User'}
                  />
                  <AvatarFallback>
                    {player.profile?.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {player.profile?.username || 'Unknown'}
                    {player.user_id === room.host_id && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Host
                      </span>
                    )}
                  </p>
                </div>
                {isHost && room.status === 'waiting' && player.user_id !== room.host_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => onTransferHost(player.user_id)}
                  >
                    Make Host
                  </Button>
                )}
              </div>
            ))}

            {room.players.length === 1 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Invite players or share the room code
              </p>
            )}
          </CardContent>
        </Card>

        {/* Coffee Setup (Host only) */}
        {isHost && room.status === 'waiting' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Coffees ({room.coffees.length})</CardTitle>
              <CardDescription>Add at least 2 coffees for triangulation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Coffee list */}
              {room.coffees.length > 0 && (
                <div className="space-y-2">
                  {room.coffees.map((coffee) => (
                    <div
                      key={coffee.id}
                      className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg"
                    >
                      {editingCoffeeId === coffee.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-bold text-primary">{coffee.label}</span>
                          <Input
                            value={editingCoffeeName}
                            onChange={(e) => setEditingCoffeeName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); onUpdateCoffee(coffee.id) }
                              if (e.key === 'Escape') { setEditingCoffeeId(null); setEditingCoffeeName('') }
                            }}
                            className="h-8 flex-1"
                            autoFocus
                          />
                          <Button variant="ghost" size="sm" onClick={() => onUpdateCoffee(coffee.id)} disabled={!editingCoffeeName.trim()}>
                            Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingCoffeeId(null); setEditingCoffeeName('') }}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-primary">{coffee.label}</span>
                            <span className="font-medium">{coffee.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditingCoffeeId(coffee.id); setEditingCoffeeName(coffee.name) }}
                              className="text-muted-foreground"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveCoffee(coffee.id)}
                              className="text-muted-foreground hover:text-red-500"
                            >
                              Remove
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add coffee form */}
              <form onSubmit={onAddCoffee} className="flex gap-2">
                <Input
                  placeholder="Coffee name (e.g., Ethiopia Yirgacheffe)"
                  value={coffeeName}
                  onChange={(e) => setCoffeeName(e.target.value)}
                  disabled={coffeeLoading}
                />
                <Button type="submit" disabled={coffeeLoading || !coffeeName.trim()}>
                  Add
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Triangulation Sets (Host only) */}
        {isHost && room.status === 'waiting' && room.coffees.length >= 2 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Triangulation Sets ({room.sets.length})</CardTitle>
              <CardDescription>Select a set to play, or create new ones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Set list */}
              {room.sets.map((set) => {
                const isSelected = selectedSetId === set.id
                return (
                  <div
                    key={set.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => {
                      if (editingSetId !== set.id) setSelectedSetId(isSelected ? null : set.id)
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Set {set.set_number}</span>
                        {isSelected && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSetId(editingSetId === set.id ? null : set.id)}
                          className="text-muted-foreground"
                        >
                          {editingSetId === set.id ? 'Done' : 'Edit'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (selectedSetId === set.id) setSelectedSetId(null)
                            onDeleteSet(set.id)
                          }}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* View mode */}
                    {editingSetId !== set.id && (
                      <div className="space-y-1 text-sm">
                        {set.rows.map((row) => (
                          <div key={row.id} className="flex items-center gap-2 text-muted-foreground">
                            <span className="w-6">{row.row_number}.</span>
                            <span className="font-mono">
                              <span>{row.pair_coffee.label}</span>
                              <span className="mx-1">{row.pair_coffee.label}</span>
                              <span className="text-primary font-bold">{row.odd_coffee.label}</span>
                            </span>
                            <span className="text-xs">
                              (odd at cup {row.odd_position})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Edit mode */}
                    {editingSetId === set.id && (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        {set.rows.map((row) => (
                          <div key={row.id} className="flex items-center gap-2 py-1 border-b last:border-0">
                            <span className="w-6 text-sm font-medium">{row.row_number}.</span>
                            <select
                              value={row.pair_coffee.id}
                              onChange={(e) => onUpdateRow(row.id, e.target.value, row.odd_coffee.id, row.odd_position)}
                              className="flex-1 text-sm p-1 border rounded bg-background"
                            >
                              {room.coffees.filter(c => c.id !== row.odd_coffee.id).map((coffee) => (
                                <option key={coffee.id} value={coffee.id}>
                                  {coffee.label}: {coffee.name} (pair)
                                </option>
                              ))}
                            </select>
                            <select
                              value={row.odd_coffee.id}
                              onChange={(e) => onUpdateRow(row.id, row.pair_coffee.id, e.target.value, row.odd_position)}
                              className="flex-1 text-sm p-1 border rounded bg-background"
                            >
                              {room.coffees.filter(c => c.id !== row.pair_coffee.id).map((coffee) => (
                                <option key={coffee.id} value={coffee.id}>
                                  {coffee.label}: {coffee.name} (odd)
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              <div className="flex gap-2">
                <Button
                  onClick={onGenerateSet}
                  disabled={generatingSet}
                  variant="outline"
                  className="flex-1"
                >
                  {generatingSet ? 'Generating...' : 'Auto Generate'}
                </Button>
                <Button
                  onClick={onCreateManualSet}
                  disabled={creatingManualSet}
                  variant="outline"
                  className="flex-1"
                >
                  {creatingManualSet ? 'Creating...' : 'Manual Create'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timer Info */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Timer Duration</span>
              <span className="font-medium">{room.timer_minutes} minutes</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {isHost && room.status === 'waiting' && (
            <>
              <Button
                className="w-full"
                size="lg"
                onClick={onStartGame}
                disabled={startingGame || room.coffees.length < 2 || !selectedSetId}
              >
                {startingGame
                  ? 'Starting...'
                  : selectedSetId
                    ? `Start Round (Set ${room.sets.find(s => s.id === selectedSetId)?.set_number})`
                    : 'Select a Set to Start'}
              </Button>
              {room.coffees.length < 2 && (
                <p className="text-xs text-muted-foreground text-center">
                  Add at least 2 coffees
                </p>
              )}
              {room.coffees.length >= 2 && room.sets.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Generate at least 1 triangulation set
                </p>
              )}
              {room.sets.length > 0 && !selectedSetId && (
                <p className="text-xs text-muted-foreground text-center">
                  Tap a set above to select it
                </p>
              )}
            </>
          )}

          {!isHost && room.status === 'waiting' && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Waiting for host to start the game...
            </p>
          )}

          {isHost && completedRoundsCount > 0 && room.status === 'waiting' && (
            <>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setEndSessionConfirm(true)}
                disabled={endingSession}
              >
                {endingSession ? 'Ending Session...' : `End Session (${completedRoundsCount} round${completedRoundsCount === 1 ? '' : 's'})`}
              </Button>
              {endSessionConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEndSessionConfirm(false)}>
                  <Card className="w-[90%] max-w-sm relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEndSessionConfirm(false)}
                      className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <CardContent className="pt-6 pb-4">
                      <p className="font-medium mb-1">End this session?</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        This will finalize the session with {completedRoundsCount} round{completedRoundsCount === 1 ? '' : 's'}. You can view the summary afterwards.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setEndSessionConfirm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => {
                            setEndSessionConfirm(false)
                            onEndSession()
                          }}
                        >
                          End Session
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}

          {isHost && (
            <Button
              variant="outline"
              className="w-full text-red-500 hover:text-red-600"
              onClick={onDeleteRoom}
            >
              Delete Room
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}