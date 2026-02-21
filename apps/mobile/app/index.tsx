import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-expo'
import { Redirect } from 'expo-router'
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native'
import { useApiClient } from '../lib/api'

export default function Index() {
  const { isSignedIn } = useAuth()
  const { apiFetch } = useApiClient()
  const [checking, setChecking] = useState(true)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [error, setError] = useState(false)

  const checkProfile = useCallback(() => {
    if (!isSignedIn) {
      setChecking(false)
      return
    }

    setChecking(true)
    setError(false)
    apiFetch<{ onboarding_completed: boolean }>('/profile')
      .then((profile) => {
        setOnboardingComplete(profile.onboarding_completed)
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => setChecking(false))
  }, [isSignedIn, apiFetch])

  useEffect(() => {
    checkProfile()
  }, [checkProfile])

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />
  }

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Could not connect to server</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={checkProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />
  }

  return <Redirect href="/(tabs)" />
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
})
