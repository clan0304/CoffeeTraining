import { useSignIn, useOAuth } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useState, useCallback } from 'react'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'

WebBrowser.maybeCompleteAuthSession()

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' })
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSendCode = useCallback(async () => {
    if (!isLoaded) return
    setLoading(true)

    try {
      const result = await signIn.create({ identifier: email })

      const emailCodeFactor = result.supportedFirstFactors?.find(
        (f) => f.strategy === 'email_code'
      )

      if (!emailCodeFactor || emailCodeFactor.strategy !== 'email_code') {
        Alert.alert('Error', 'Email code sign-in is not available')
        return
      }

      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: emailCodeFactor.emailAddressId,
      })

      setPendingVerification(true)
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message ?? 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }, [isLoaded, email, signIn])

  const onVerify = useCallback(async () => {
    if (!isLoaded) return
    setLoading(true)

    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message ?? 'Verification failed')
    } finally {
      setLoading(false)
    }
  }, [isLoaded, code, signIn, setActive])

  const onGoogleSignIn = useCallback(async () => {
    try {
      const { createdSessionId, setActive: oauthSetActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/(auth)/sign-in'),
      })

      if (createdSessionId && oauthSetActive) {
        await oauthSetActive({ session: createdSessionId })
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message ?? 'Google sign-in failed')
    }
  }, [startOAuthFlow])

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check Your Email</Text>
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
      <Text style={styles.title}>Cupping Training</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity style={styles.button} onPress={onSendCode} disabled={loading}>
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

      <TouchableOpacity style={styles.googleButton} onPress={onGoogleSignIn}>
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
        <Text style={styles.link}>Don't have an account? Sign Up</Text>
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
