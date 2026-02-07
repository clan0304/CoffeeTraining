'use client'

import { useState, useEffect } from 'react'

interface CountdownProps {
  from?: number
  onComplete: () => void
}

export function Countdown({ from = 5, onComplete }: CountdownProps) {
  const [count, setCount] = useState(from)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (count === 0) {
      // Short delay before completing
      const timeout = setTimeout(() => {
        onComplete()
      }, 500)
      return () => clearTimeout(timeout)
    }

    // Trigger animation
    setAnimate(true)
    const animTimeout = setTimeout(() => setAnimate(false), 200)

    // Count down
    const interval = setTimeout(() => {
      setCount((prev) => prev - 1)
    }, 1000)

    return () => {
      clearTimeout(interval)
      clearTimeout(animTimeout)
    }
  }, [count, onComplete])

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      <div className="text-center">
        {count > 0 ? (
          <>
            <div
              className={`text-[12rem] font-bold leading-none transition-all duration-200 ${
                animate ? 'scale-125 text-primary' : 'scale-100 text-foreground'
              }`}
            >
              {count}
            </div>
            <p className="text-2xl text-muted-foreground mt-4">Get Ready!</p>
          </>
        ) : (
          <div className="text-6xl font-bold text-primary animate-pulse">
            GO!
          </div>
        )}
      </div>

      {/* Animated rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {count > 0 && (
          <>
            <div
              className={`absolute w-64 h-64 rounded-full border-4 border-primary/20 transition-all duration-1000 ${
                animate ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
              }`}
            />
            <div
              className={`absolute w-48 h-48 rounded-full border-2 border-primary/30 transition-all duration-700 ${
                animate ? 'scale-125 opacity-0' : 'scale-100 opacity-100'
              }`}
            />
          </>
        )}
      </div>
    </div>
  )
}
