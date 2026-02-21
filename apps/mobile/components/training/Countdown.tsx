import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { colors } from '../../lib/colors'

interface CountdownProps {
  from?: number
  onComplete: () => void
}

export function Countdown({ from = 5, onComplete }: CountdownProps) {
  const [count, setCount] = useState(from)
  const scaleAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (count === 0) {
      const timeout = setTimeout(onComplete, 500)
      return () => clearTimeout(timeout)
    }

    // Animate scale
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start()

    const interval = setTimeout(() => {
      setCount((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(interval)
  }, [count, onComplete, scaleAnim])

  return (
    <View style={styles.overlay}>
      {count > 0 ? (
        <View style={styles.center}>
          <Animated.Text
            style={[styles.number, { transform: [{ scale: scaleAnim }] }]}
          >
            {count}
          </Animated.Text>
          <Text style={styles.subtitle}>Get Ready!</Text>
        </View>
      ) : (
        <Text style={styles.go}>GO!</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  center: {
    alignItems: 'center',
  },
  number: {
    fontSize: 140,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 24,
    color: colors.muted,
    marginTop: 16,
  },
  go: {
    fontSize: 64,
    fontWeight: 'bold',
    color: colors.primary,
  },
})
