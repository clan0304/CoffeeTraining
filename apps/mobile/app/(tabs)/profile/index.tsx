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
})
