import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { useApiClient } from '../lib/api'
import { colors } from '../lib/colors'

export default function OnboardingScreen() {
  const router = useRouter()
  const { apiFetch } = useApiClient()
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced username check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (username.length < 3) {
      setUsernameAvailable(null)
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameAvailable(null)
      return
    }

    setCheckingUsername(true)
    debounceRef.current = setTimeout(() => {
      apiFetch<{ available: boolean }>(
        `/onboarding/check-username?username=${encodeURIComponent(username)}`
      )
        .then((res) => setUsernameAvailable(res.available))
        .catch(() => setUsernameAvailable(null))
        .finally(() => setCheckingUsername(false))
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [username, apiFetch])

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (result.canceled || !result.assets[0]) return

    setUploading(true)
    try {
      const asset = result.assets[0]
      const formData = new FormData()

      const filename = asset.uri.split('/').pop() || 'photo.jpg'
      const ext = filename.split('.').pop() || 'jpg'

      formData.append('file', {
        uri: asset.uri,
        name: filename,
        type: `image/${ext}`,
      } as unknown as Blob)

      const res = await apiFetch<{ url: string }>('/onboarding/upload-photo', {
        method: 'POST',
        body: formData,
      })
      setPhotoUrl(res.url)
    } catch {
      Alert.alert('Error', 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }, [apiFetch])

  const handleSubmit = useCallback(async () => {
    if (!username || username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters')
      return
    }

    setSubmitting(true)
    try {
      await apiFetch('/onboarding/complete', {
        method: 'POST',
        json: {
          username,
          bio: bio || null,
          photoUrl,
        },
      })
      router.replace('/(tabs)')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to complete onboarding')
    } finally {
      setSubmitting(false)
    }
  }, [username, bio, photoUrl, apiFetch, router])

  const isValid =
    username.length >= 3 &&
    /^[a-zA-Z0-9_]+$/.test(username) &&
    usernameAvailable === true

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Set Up Your Profile</Text>
            <Text style={styles.subtitle}>
              Choose a username and personalize your profile
            </Text>
          </View>

          {/* Photo */}
          <View style={styles.photoSection}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Text style={styles.photoPlaceholderText}>📷</Text>
              </View>
            )}
            <Button
              variant="outline"
              size="sm"
              onPress={pickImage}
              loading={uploading}
            >
              {photoUrl ? 'Change Photo' : 'Add Photo'}
            </Button>
          </View>

          {/* Username */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 16 }}>Username</CardTitle>
            </CardHeader>
            <CardContent>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
              />
              {username.length > 0 && username.length < 3 && (
                <Text style={styles.hint}>Must be at least 3 characters</Text>
              )}
              {username.length >= 3 && !/^[a-zA-Z0-9_]+$/.test(username) && (
                <Text style={styles.errorText}>
                  Only letters, numbers, and underscores
                </Text>
              )}
              {checkingUsername && (
                <Text style={styles.hint}>Checking availability...</Text>
              )}
              {!checkingUsername && usernameAvailable === true && (
                <Text style={styles.successText}>Username is available</Text>
              )}
              {!checkingUsername && usernameAvailable === false && (
                <Text style={styles.errorText}>Username is taken</Text>
              )}
            </CardContent>
          </Card>

          {/* Bio */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 16 }}>Bio (optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                multiline
                maxLength={500}
              />
            </CardContent>
          </Card>

          <Button
            onPress={handleSubmit}
            disabled={!isValid}
            loading={submitting}
            size="lg"
          >
            Complete Setup
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 20,
    gap: 16,
  },
  header: {
    paddingTop: 24,
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  photoSection: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoPlaceholder: {
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 36,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.foreground,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: colors.success,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
})
