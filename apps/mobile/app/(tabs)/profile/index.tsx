import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../../components/ui/Button'
import { Card, CardContent } from '../../../components/ui/Card'
import { useApiClient } from '../../../lib/api'
import { colors } from '../../../lib/colors'

interface ProfileData {
  username: string | null
  bio: string | null
  photo_url: string | null
  email: string | null
}

interface FriendData {
  friend_id: string
  username: string
  photo_url: string | null
}

interface IncomingRequest {
  id: string
  sender_username: string
  sender_photo_url: string | null
}

interface SentRequest {
  id: string
  recipient_username: string
  recipient_photo_url: string | null
}

export default function ProfileTab() {
  const { signOut } = useAuth()
  const { user } = useUser()
  const { apiFetch } = useApiClient()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // Username editing state
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Flavor words state
  const [flavorWords, setFlavorWords] = useState<string[]>([])
  const [flavorDraft, setFlavorDraft] = useState('')
  const [addingFlavor, setAddingFlavor] = useState(false)

  // Friends state
  const [friends, setFriends] = useState<FriendData[]>([])
  const [friendDraft, setFriendDraft] = useState('')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [friendError, setFriendError] = useState<string | null>(null)
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null)

  // Friend requests state
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([])
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([])
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set())
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set())

  const fetchProfile = useCallback(() => {
    setLoading(true)
    apiFetch<ProfileData>('/profile')
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apiFetch])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Debounced availability check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // Skip check if unchanged, too short, or invalid
    if (
      draft === profile?.username ||
      draft.length < 3 ||
      !/^[a-zA-Z0-9_]+$/.test(draft)
    ) {
      setAvailable(draft === profile?.username ? null : null)
      setChecking(false)
      return
    }

    setChecking(true)
    debounceRef.current = setTimeout(() => {
      apiFetch<{ available: boolean }>(
        `/onboarding/check-username?username=${encodeURIComponent(draft)}`
      )
        .then((res) => setAvailable(res.available))
        .catch(() => setAvailable(null))
        .finally(() => setChecking(false))
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [draft, profile?.username, apiFetch])

  const startEditing = useCallback(() => {
    setDraft(profile?.username || '')
    setAvailable(null)
    setEditing(true)
  }, [profile?.username])

  const cancelEditing = useCallback(() => {
    setEditing(false)
    setDraft('')
    setAvailable(null)
  }, [])

  const saveUsername = useCallback(async () => {
    if (!draft || draft.length < 3) return
    if (draft === profile?.username) {
      setEditing(false)
      return
    }

    setSaving(true)
    try {
      await apiFetch('/profile/update-username', {
        method: 'POST',
        json: { username: draft },
      })
      setProfile((prev) => (prev ? { ...prev, username: draft } : prev))
      setEditing(false)
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to update username'
      )
    } finally {
      setSaving(false)
    }
  }, [draft, profile?.username, apiFetch])

  // Flavor words handlers
  const fetchFlavorWords = useCallback(() => {
    apiFetch<{ words: string[] }>('/flavor-words')
      .then((res) => setFlavorWords(res.words))
      .catch(() => {})
  }, [apiFetch])

  useEffect(() => {
    fetchFlavorWords()
  }, [fetchFlavorWords])

  const addFlavorWord = useCallback(async () => {
    const word = flavorDraft.trim().toLowerCase()
    if (!word) return
    setAddingFlavor(true)
    try {
      await apiFetch('/flavor-words', { method: 'POST', json: { word } })
      setFlavorWords((prev) => (prev.includes(word) ? prev : [...prev, word].sort()))
      setFlavorDraft('')
    } catch {
      Alert.alert('Error', 'Failed to add word')
    } finally {
      setAddingFlavor(false)
    }
  }, [flavorDraft, apiFetch])

  const removeFlavorWord = useCallback(
    async (word: string) => {
      try {
        await apiFetch(`/flavor-words/${encodeURIComponent(word)}`, {
          method: 'DELETE',
        })
        setFlavorWords((prev) => prev.filter((w) => w !== word))
      } catch {
        Alert.alert('Error', 'Failed to remove word')
      }
    },
    [apiFetch]
  )

  // Friends handlers
  const fetchFriends = useCallback(() => {
    apiFetch<{ friends: FriendData[] }>('/friends')
      .then((res) => setFriends(res.friends))
      .catch(() => {})
  }, [apiFetch])

  const fetchIncomingRequests = useCallback(() => {
    apiFetch<{ requests: IncomingRequest[] }>('/friend-requests')
      .then((res) => setIncomingRequests(res.requests))
      .catch(() => {})
  }, [apiFetch])

  const fetchSentRequests = useCallback(() => {
    apiFetch<{ requests: SentRequest[] }>('/friend-requests/sent')
      .then((res) => setSentRequests(res.requests))
      .catch(() => {})
  }, [apiFetch])

  useEffect(() => {
    fetchFriends()
  }, [fetchFriends])

  useEffect(() => {
    fetchIncomingRequests()
  }, [fetchIncomingRequests])

  useEffect(() => {
    fetchSentRequests()
  }, [fetchSentRequests])

  const handleSendRequest = useCallback(async () => {
    const username = friendDraft.trim()
    if (!username) return
    setSendingRequest(true)
    setFriendError(null)
    setFriendSuccess(null)
    try {
      await apiFetch('/friend-requests', { method: 'POST', json: { username } })
      setFriendSuccess(`Request sent to @${username}`)
      setFriendDraft('')
      fetchSentRequests()
    } catch (e) {
      setFriendError(e instanceof Error ? e.message : 'Failed to send request')
    } finally {
      setSendingRequest(false)
    }
  }, [friendDraft, apiFetch, fetchSentRequests])

  const handleRespondToRequest = useCallback(
    async (requestId: string, accept: boolean) => {
      setRespondingIds((prev) => new Set(prev).add(requestId))
      try {
        await apiFetch(`/friend-requests/${requestId}/respond`, {
          method: 'POST',
          json: { accept },
        })
        setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId))
        if (accept) {
          fetchFriends()
        }
      } catch {
        Alert.alert('Error', 'Failed to respond to request')
      } finally {
        setRespondingIds((prev) => {
          const next = new Set(prev)
          next.delete(requestId)
          return next
        })
      }
    },
    [apiFetch, fetchFriends]
  )

  const handleCancelRequest = useCallback(
    async (requestId: string) => {
      setCancellingIds((prev) => new Set(prev).add(requestId))
      try {
        await apiFetch(`/friend-requests/${requestId}`, { method: 'DELETE' })
        setSentRequests((prev) => prev.filter((r) => r.id !== requestId))
      } catch {
        Alert.alert('Error', 'Failed to cancel request')
      } finally {
        setCancellingIds((prev) => {
          const next = new Set(prev)
          next.delete(requestId)
          return next
        })
      }
    },
    [apiFetch]
  )

  const handleRemoveFriend = useCallback(
    async (friendId: string) => {
      try {
        await apiFetch(`/friends/${friendId}`, { method: 'DELETE' })
        setFriends((prev) => prev.filter((f) => f.friend_id !== friendId))
      } catch {
        Alert.alert('Error', 'Failed to remove friend')
      }
    },
    [apiFetch]
  )

  const canSave =
    draft.length >= 3 &&
    /^[a-zA-Z0-9_]+$/.test(draft) &&
    draft !== profile?.username &&
    available === true

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Profile</Text>

        <View style={styles.avatarSection}>
          {profile?.photo_url ? (
            <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(
                  profile?.username ||
                  user?.emailAddresses[0]?.emailAddress ||
                  '?'
                )[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <Card>
          <CardContent style={styles.infoContent}>
            {/* Username row */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              {editing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.editInput}
                    value={draft}
                    onChangeText={setDraft}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    maxLength={30}
                  />
                  {/* Validation feedback */}
                  {draft.length > 0 && draft.length < 3 && (
                    <Text style={styles.hintText}>
                      Must be at least 3 characters
                    </Text>
                  )}
                  {draft.length >= 3 &&
                    !/^[a-zA-Z0-9_]+$/.test(draft) && (
                      <Text style={styles.errorText}>
                        Only letters, numbers, and underscores
                      </Text>
                    )}
                  {checking && (
                    <Text style={styles.hintText}>
                      Checking availability...
                    </Text>
                  )}
                  {!checking &&
                    available === true &&
                    draft !== profile?.username && (
                      <Text style={styles.successText}>Available</Text>
                    )}
                  {!checking && available === false && (
                    <Text style={styles.errorText}>Already taken</Text>
                  )}
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      onPress={cancelEditing}
                      style={styles.editActionBtn}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={saveUsername}
                      disabled={!canSave || saving}
                      style={[
                        styles.editActionBtn,
                        styles.saveBtn,
                        (!canSave || saving) && styles.saveBtnDisabled,
                      ]}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={startEditing}
                  style={styles.editableRow}
                  activeOpacity={0.6}
                >
                  <Text style={styles.infoValue}>
                    {profile?.username || 'Not set'}
                  </Text>
                  <Text style={styles.editHint}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.divider} />

            {/* Email row */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>
                {profile?.email ||
                  user?.emailAddresses[0]?.emailAddress ||
                  '—'}
              </Text>
            </View>

            {/* Bio row */}
            {profile?.bio ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Bio</Text>
                  <Text style={styles.infoValue}>{profile.bio}</Text>
                </View>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Flavor Words */}
        <Card>
          <CardContent style={styles.infoContent}>
            <Text style={styles.sectionTitle}>Flavor Vocabulary</Text>
            <Text style={styles.sectionDescription}>
              Custom words for cupping note autocomplete
            </Text>
            <View style={styles.flavorAddRow}>
              <TextInput
                style={styles.flavorInput}
                value={flavorDraft}
                onChangeText={setFlavorDraft}
                placeholder="Add a flavor word..."
                placeholderTextColor={colors.mutedLight}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={100}
                onSubmitEditing={addFlavorWord}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={addFlavorWord}
                disabled={addingFlavor || !flavorDraft.trim()}
                style={[
                  styles.flavorAddBtn,
                  (addingFlavor || !flavorDraft.trim()) && styles.flavorAddBtnDisabled,
                ]}
              >
                <Text style={styles.flavorAddBtnText}>
                  {addingFlavor ? '...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
            {flavorWords.length === 0 ? (
              <Text style={styles.flavorEmpty}>
                No custom words yet. Common SCA words are always available.
              </Text>
            ) : (
              <View style={styles.flavorPills}>
                {flavorWords.map((word) => (
                  <View key={word} style={styles.flavorPill}>
                    <Text style={styles.flavorPillText}>{word}</Text>
                    <TouchableOpacity
                      onPress={() => removeFlavorWord(word)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.flavorPillRemove}>&times;</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </CardContent>
        </Card>

        {/* Friends */}
        <Card>
          <CardContent style={styles.infoContent}>
            <Text style={styles.sectionTitle}>Friends</Text>
            <Text style={styles.sectionDescription}>
              Send a friend request by username
            </Text>

            {/* Send Request */}
            <View style={styles.flavorAddRow}>
              <TextInput
                style={styles.flavorInput}
                value={friendDraft}
                onChangeText={(text) => {
                  setFriendDraft(text)
                  setFriendError(null)
                  setFriendSuccess(null)
                }}
                placeholder="Enter username..."
                placeholderTextColor={colors.mutedLight}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleSendRequest}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={handleSendRequest}
                disabled={sendingRequest || !friendDraft.trim()}
                style={[
                  styles.flavorAddBtn,
                  (sendingRequest || !friendDraft.trim()) && styles.flavorAddBtnDisabled,
                ]}
              >
                <Text style={styles.flavorAddBtnText}>
                  {sendingRequest ? '...' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>

            {friendError ? (
              <Text style={styles.friendErrorText}>{friendError}</Text>
            ) : null}
            {friendSuccess ? (
              <Text style={styles.friendSuccessText}>{friendSuccess}</Text>
            ) : null}

            {/* Incoming Requests */}
            {incomingRequests.length > 0 && (
              <View style={styles.requestsSection}>
                <Text style={styles.subsectionTitle}>Incoming Requests</Text>
                {incomingRequests.map((req) => (
                  <View key={req.id} style={styles.requestRow}>
                    <Text style={styles.requestUsername}>@{req.sender_username}</Text>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        onPress={() => handleRespondToRequest(req.id, false)}
                        disabled={respondingIds.has(req.id)}
                        style={styles.declineBtn}
                      >
                        <Text style={styles.declineBtnText}>
                          {respondingIds.has(req.id) ? '...' : 'Decline'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRespondToRequest(req.id, true)}
                        disabled={respondingIds.has(req.id)}
                        style={[
                          styles.acceptBtn,
                          respondingIds.has(req.id) && styles.flavorAddBtnDisabled,
                        ]}
                      >
                        <Text style={styles.acceptBtnText}>
                          {respondingIds.has(req.id) ? '...' : 'Accept'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Sent Requests */}
            {sentRequests.length > 0 && (
              <View style={styles.requestsSection}>
                <Text style={styles.subsectionTitle}>Sent Requests</Text>
                <View style={styles.flavorPills}>
                  {sentRequests.map((req) => (
                    <View key={req.id} style={styles.flavorPill}>
                      <Text style={styles.flavorPillText}>@{req.recipient_username}</Text>
                      <Text style={styles.pendingLabel}>pending</Text>
                      <TouchableOpacity
                        onPress={() => handleCancelRequest(req.id)}
                        disabled={cancellingIds.has(req.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.flavorPillRemove}>&times;</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Friends List */}
            {friends.length === 0 ? (
              <Text style={styles.flavorEmpty}>
                No friends yet. Send a request to get started.
              </Text>
            ) : (
              <View style={styles.requestsSection}>
                <Text style={styles.subsectionTitle}>My Friends</Text>
                <View style={styles.flavorPills}>
                  {friends.map((friend) => (
                    <View key={friend.friend_id} style={styles.flavorPill}>
                      <Text style={styles.flavorPillText}>@{friend.username}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveFriend(friend.friend_id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.flavorPillRemove}>&times;</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </CardContent>
        </Card>

        <Button
          variant="outline"
          onPress={() => signOut()}
          style={styles.signOutButton}
        >
          Sign Out
        </Button>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 20,
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.foreground,
    paddingTop: 12,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.primaryForeground,
    fontSize: 32,
    fontWeight: '600',
  },
  infoContent: {
    padding: 16,
  },
  infoRow: {
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: colors.foreground,
  },
  editableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editHint: {
    fontSize: 14,
    color: colors.muted,
  },
  editContainer: {
    gap: 8,
    marginTop: 4,
  },
  editInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.foreground,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 15,
    color: colors.muted,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveText: {
    fontSize: 15,
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    color: colors.muted,
  },
  successText: {
    fontSize: 12,
    color: colors.success,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  signOutButton: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
  },
  flavorAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  flavorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.foreground,
  },
  flavorAddBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flavorAddBtnDisabled: {
    opacity: 0.4,
  },
  flavorAddBtnText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: '600',
  },
  flavorEmpty: {
    fontSize: 13,
    color: colors.muted,
  },
  flavorPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flavorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  flavorPillText: {
    fontSize: 13,
    color: colors.foreground,
  },
  flavorPillRemove: {
    fontSize: 16,
    color: colors.muted,
    lineHeight: 18,
    marginLeft: 2,
  },
  friendErrorText: {
    fontSize: 13,
    color: colors.error,
    marginBottom: 8,
  },
  friendSuccessText: {
    fontSize: 13,
    color: colors.success,
    marginBottom: 8,
  },
  requestsSection: {
    marginTop: 12,
    gap: 8,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.muted,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  requestUsername: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  declineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineBtnText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  acceptBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  acceptBtnText: {
    fontSize: 13,
    color: colors.primaryForeground,
    fontWeight: '500',
  },
  pendingLabel: {
    fontSize: 11,
    color: colors.muted,
  },
})
