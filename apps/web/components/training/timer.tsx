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

  // Calculate initial seconds based on startTime if provided
  const calculateRemainingSeconds = useCallback(() => {
    if (startTime) {
      const startMs = new Date(startTime).getTime()
      const nowMs = Date.now()
      const elapsedSeconds = Math.floor((nowMs - startMs) / 1000)
      const remaining = (initialMinutes * 60) - elapsedSeconds
      return remaining // allow negative
    }
    return initialMinutes * 60
  }, [startTime, initialMinutes])

  const [totalSeconds, setTotalSeconds] = useState(calculateRemainingSeconds)
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
    let interval: NodeJS.Timeout | null = null

    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTotalSeconds((prev) => {
          const next = prev - 1
          // Fire onTimeUp exactly once when crossing from 1 to 0
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

  // Determine timer color based on remaining time
  const getTimerColor = () => {
    if (isOvertime) return 'text-pink-500'
    if (totalSeconds <= 60) return 'text-destructive animate-pulse'
    if (totalSeconds <= 120) return 'text-orange-500'
    return 'text-foreground'
  }

  const progress = isOvertime ? 0 : (totalSeconds / (initialMinutes * 60)) * 100

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
