import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
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

  const calculateRemainingSeconds = useCallback(() => {
    if (startTime) {
      const startMs = new Date(startTime).getTime()
      const nowMs = Date.now()
      const elapsedSeconds = Math.floor((nowMs - startMs) / 1000)
      const remaining = initialMinutes * 60 - elapsedSeconds
      return remaining // allow negative
    }
    return initialMinutes * 60
  }, [startTime, initialMinutes])

  const [totalSeconds, setTotalSeconds] = useState(calculateRemainingSeconds)
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
    if (startTime && !isRunning) {
      const remaining = calculateRemainingSeconds()
      setTotalSeconds(remaining)
      setIsRunning(true)
      setHasStarted(true)
      timeUpFiredRef.current = remaining <= 0
    }
  }, [startTime]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer countdown (continues past 0 into overtime)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTotalSeconds((prev) => {
          const next = prev - 1
          if (prev === 1 && !timeUpFiredRef.current) {
            timeUpFiredRef.current = true
            onTimeUpRef.current?.()
          }
          return next
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, isPaused])

  const handleStart = useCallback(() => {
    setIsRunning(true)
    setHasStarted(true)
    onStart?.()
  }, [onStart])

  const handlePause = useCallback(() => {
    setIsRunning(false)
    onPause?.()
  }, [onPause])

  const handleReset = useCallback(() => {
    setIsRunning(false)
    setHasStarted(false)
    setTotalSeconds(initialMinutes * 60)
    timeUpFiredRef.current = false
    onReset?.()
  }, [initialMinutes, onReset])

  const getTimerColor = () => {
    if (isOvertime) return colors.pink
    if (totalSeconds <= 60) return colors.error
    if (totalSeconds <= 120) return colors.orange
    return colors.foreground
  }

  const progress = isOvertime ? 0 : totalSeconds / (initialMinutes * 60)

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
