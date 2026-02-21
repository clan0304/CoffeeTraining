import { useSignUp, useOAuth } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useState, useCallback } from 'react'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'

WebBrowser.maybeCompleteAuthSession()

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp()
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' })
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSignUp = useCallback(async () => {
    if (!isLoaded) return
    setLoading(true)

    try {
      await signUp.create({ emailAddress: email })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setPendingVerification(true)
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message ?? 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }, [isLoaded, email, signUp])

  const onVerify = useCallback(async () => {
    if (!isLoaded) return
    setLoading(true)

    try {
      const result = await signUp.attemptEmailAddressVerification({ code })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message ?? 'Verification failed')
    } finally {
      setLoading(false)
    }
  }, [isLoaded, code, signUp, setActive])

  const onGoogleSignUp = useCallback(async () => {
    try {
      const { createdSessionId, setActive: oauthSetActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/(auth)/sign-up'),
      })

      if (createdSessionId && oauthSetActive) {
        await oauthSetActive({ session: createdSessionId })
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message ?? 'Google sign-up failed')
    }
  }, [startOAuthFlow])

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>Enter the code sent to {email}</Text>

        <TextInput
          style={styles.input}
          placeholder="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoFocus
        />

        <TouchableOpacity style={styles.button} onPress={onVerify} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setPendingVerification(false); setCode('') }}>
          <Text style={styles.link}>Use a different email</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Sign up to get started</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity style={styles.button} onPress={onSignUp} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send Code</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity style={styles.googleButton} onPress={onGoogleSignUp}>
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#999',
    fontSize: 14,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  link: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
})
