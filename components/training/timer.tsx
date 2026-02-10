'use client'

import { useState, useEffect, useCallback } from 'react'
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
  // Calculate initial seconds based on startTime if provided
  const calculateRemainingSeconds = useCallback(() => {
    if (startTime) {
      const startMs = new Date(startTime).getTime()
      const nowMs = Date.now()
      const elapsedSeconds = Math.floor((nowMs - startMs) / 1000)
      const remaining = (initialMinutes * 60) - elapsedSeconds
      return Math.max(0, remaining)
    }
    return initialMinutes * 60
  }, [startTime, initialMinutes])

  const [totalSeconds, setTotalSeconds] = useState(calculateRemainingSeconds)
  const [isRunning, setIsRunning] = useState(!!startTime || autoStart)
  const [hasStarted, setHasStarted] = useState(!!startTime || autoStart)

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  // Format time display
  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Auto-start when startTime arrives (e.g., from broadcast after mount)
  useEffect(() => {
    if (startTime && !isRunning) {
      const remaining = calculateRemainingSeconds()
      setTotalSeconds(remaining)
      if (remaining > 0) {
        setIsRunning(true)
        setHasStarted(true)
      }
    }
  }, [startTime]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && !isPaused && totalSeconds > 0) {
      interval = setInterval(() => {
        setTotalSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            onTimeUp?.()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, isPaused, totalSeconds, onTimeUp])

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
    onReset?.()
  }, [initialMinutes, onReset])

  // Determine timer color based on remaining time
  const getTimerColor = () => {
    if (totalSeconds === 0) return 'text-destructive'
    if (totalSeconds <= 60) return 'text-destructive animate-pulse'
    if (totalSeconds <= 120) return 'text-orange-500'
    return 'text-foreground'
  }

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {/* Timer Display */}
          <div
            className={`text-6xl font-mono font-bold tabular-nums ${getTimerColor()}`}
          >
            {formatTime(minutes, seconds)}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-1000"
              style={{
                width: `${(totalSeconds / (initialMinutes * 60)) * 100}%`,
              }}
            />
          </div>

          {/* Controls */}
          {!hideControls && (
            <div className="flex justify-center gap-2">
              {!isRunning ? (
                <Button
                  onClick={handleStart}
                  disabled={totalSeconds === 0}
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

          {/* Time up message */}
          {totalSeconds === 0 && (
            <div className="text-destructive font-semibold animate-bounce">
              Time&apos;s Up!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
