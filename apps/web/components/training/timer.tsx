'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface TimerProps {
  initialMinutes?: number
  onTimeUp?: () => void
  onStart?: () => void
  onPause?: () => void
  onReset?: () => void
  startTime?: string  // ISO timestamp when timer was started (for room sync)
  autoStart?: boolean // Auto-start on mount
  hideControls?: boolean // Hide Start/Pause/Reset buttons (for multiplayer)
  isPaused?: boolean // Externally controlled pause (for multiplayer)
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

  // Format time display
  const formatTime = () => {
    const absSeconds = Math.abs(totalSeconds)
    const mins = Math.floor(absSeconds / 60)
    const secs = absSeconds % 60
    const prefix = isOvertime ? '+' : ''
    return `${prefix}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Auto-start when startTime arrives (e.g., from broadcast after mount)
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

    // Immediate sync on effect start (handles resume / visibility return)
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

    // Recalculate immediately when tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const r = computeRemaining()
        setTotalSeconds(r)
        if (r <= 0 && !timeUpFiredRef.current) {
          timeUpFiredRef.current = true
          onTimeUpRef.current?.()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isRunning, isPaused, computeRemaining])

  const handleStart = useCallback(() => {
    if (!hasStarted) {
      // First start — record wall-clock reference
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

  // Determine timer color based on remaining time
  const getTimerColor = () => {
    if (isOvertime) return 'text-pink-500'
    if (totalSeconds <= 60) return 'text-destructive animate-pulse'
    if (totalSeconds <= 120) return 'text-orange-500'
    return 'text-foreground'
  }

  const progress = isOvertime ? 0 : (totalSeconds / totalDuration) * 100

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {/* Timer Display */}
          <div
            className={`text-6xl font-mono font-bold tabular-nums ${getTimerColor()}`}
          >
            {formatTime()}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-1000"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          {/* Controls */}
          {!hideControls && (
            <div className="flex justify-center gap-2">
              {!isRunning ? (
                <Button
                  onClick={handleStart}
                  className="w-24"
                >
                  {hasStarted ? 'Resume' : 'Start'}
                </Button>
              ) : (
                <Button
                  onClick={handlePause}
                  variant="secondary"
                  className="w-24"
                >
                  Pause
                </Button>
              )}
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-24"
              >
                Reset
              </Button>
            </div>
          )}

          {/* Paused message (multiplayer) */}
          {isPaused && hideControls && (
            <div className="text-orange-500 font-semibold animate-pulse">
              PAUSED
            </div>
          )}

          {/* Overtime indicator */}
          {isOvertime && (
            <div className="text-pink-500 font-semibold animate-pulse">
              OVERTIME
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
