import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, AppState } from 'react-native'
import { Button } from '../ui/Button'
import { Card, CardContent } from '../ui/Card'
import { colors } from '../../lib/colors'

interface TimerProps {
  initialMinutes?: number
  onTimeUp?: () => void
  onStart?: () => void
  onPause?: () => void
  onReset?: () => void
  startTime?: string
  autoStart?: boolean
  hideControls?: boolean
  isPaused?: boolean
}

export function Timer({
  initialMinutes = 8,
  onTimeUp,
  onStart,
  onPause,
  onReset,
  startTime,
  autoStart = false,
  hideControls = false,
  isPaused = false,
}: TimerProps) {
  const onTimeUpRef = useRef(onTimeUp)
  onTimeUpRef.current = onTimeUp
  const timeUpFiredRef = useRef(false)

  // Wall-clock reference for accurate time calculation
  const startedAtRef = useRef<number | null>(null)
  const pauseStartRef = useRef<number | null>(null)

  const totalDuration = initialMinutes * 60

  // Compute remaining seconds from wall clock
  const computeRemaining = useCallback(() => {
    if (!startedAtRef.current) return totalDuration
    const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000)
    return totalDuration - elapsed
  }, [totalDuration])

  const [totalSeconds, setTotalSeconds] = useState(() => {
    if (startTime) {
      startedAtRef.current = new Date(startTime).getTime()
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000)
      const remaining = totalDuration - elapsed
      if (remaining <= 0) timeUpFiredRef.current = true
      return remaining
    }
    return totalDuration
  })
  const [isRunning, setIsRunning] = useState(!!startTime || autoStart)
  const [hasStarted, setHasStarted] = useState(!!startTime || autoStart)

  const isOvertime = totalSeconds <= 0

  const formatTime = () => {
    const absSeconds = Math.abs(totalSeconds)
    const mins = Math.floor(absSeconds / 60)
    const secs = absSeconds % 60
    const prefix = isOvertime ? '+' : ''
    return `${prefix}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Auto-start when startTime arrives
  useEffect(() => {
    if (startTime) {
      startedAtRef.current = new Date(startTime).getTime()
      const remaining = computeRemaining()
      setTotalSeconds(remaining)
      setIsRunning(true)
      setHasStarted(true)
      timeUpFiredRef.current = remaining <= 0
    }
  }, [startTime]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer tick — always compute from wall clock, never prev - 1
  useEffect(() => {
    if (!isRunning || isPaused || !startedAtRef.current) return

    // Immediate sync on effect start
    const remaining = computeRemaining()
    setTotalSeconds(remaining)
    if (remaining <= 0 && !timeUpFiredRef.current) {
      timeUpFiredRef.current = true
      onTimeUpRef.current?.()
    }

    const interval = setInterval(() => {
      const r = computeRemaining()
      setTotalSeconds(r)
      if (r <= 0 && !timeUpFiredRef.current) {
        timeUpFiredRef.current = true
        onTimeUpRef.current?.()
      }
    }, 1000)

    // Recalculate immediately when app returns to foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const r = computeRemaining()
        setTotalSeconds(r)
        if (r <= 0 && !timeUpFiredRef.current) {
          timeUpFiredRef.current = true
          onTimeUpRef.current?.()
        }
      }
    })

    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [isRunning, isPaused, computeRemaining])

  const handleStart = useCallback(() => {
    if (!hasStarted) {
      startedAtRef.current = Date.now()
    } else {
      // Resume from pause — shift reference forward by pause duration
      if (pauseStartRef.current && startedAtRef.current) {
        startedAtRef.current += Date.now() - pauseStartRef.current
        pauseStartRef.current = null
      }
    }
    setIsRunning(true)
    setHasStarted(true)
    onStart?.()
  }, [hasStarted, onStart])

  const handlePause = useCallback(() => {
    pauseStartRef.current = Date.now()
    setIsRunning(false)
    onPause?.()
  }, [onPause])

  const handleReset = useCallback(() => {
    setIsRunning(false)
    setHasStarted(false)
    startedAtRef.current = null
    pauseStartRef.current = null
    setTotalSeconds(totalDuration)
    timeUpFiredRef.current = false
    onReset?.()
  }, [totalDuration, onReset])

  const getTimerColor = () => {
    if (isOvertime) return colors.pink
    if (totalSeconds <= 60) return colors.error
    if (totalSeconds <= 120) return colors.orange
    return colors.foreground
  }

  const progress = isOvertime ? 0 : totalSeconds / totalDuration

  return (
    <Card>
      <CardContent style={styles.content}>
        <Text
          style={[
            styles.time,
            { color: getTimerColor() },
            !isOvertime && totalSeconds <= 60 && totalSeconds > 0 && styles.pulse,
          ]}
        >
          {formatTime()}
        </Text>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%` },
            ]}
          />
        </View>

        {/* Controls */}
        {!hideControls && (
          <View style={styles.controls}>
            {!isRunning ? (
              <Button
                onPress={handleStart}
                style={styles.controlButton}
              >
                {hasStarted ? 'Resume' : 'Start'}
              </Button>
            ) : (
              <Button
                onPress={handlePause}
                variant="outline"
                style={styles.controlButton}
              >
                Pause
              </Button>
            )}
            <Button
              onPress={handleReset}
              variant="outline"
              style={styles.controlButton}
            >
              Reset
            </Button>
          </View>
        )}

        {isPaused && hideControls && (
          <Text style={styles.pausedText}>PAUSED</Text>
        )}

        {isOvertime && (
          <Text style={styles.overtimeText}>OVERTIME</Text>
        )}
      </CardContent>
    </Card>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  time: {
    fontSize: 56,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  pulse: {
    opacity: 0.9,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    minWidth: 90,
  },
  pausedText: {
    color: colors.orange,
    fontWeight: '600',
    fontSize: 16,
  },
  overtimeText: {
    color: colors.pink,
    fontWeight: '600',
    fontSize: 18,
  },
})
