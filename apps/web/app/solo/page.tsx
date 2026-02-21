'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Timer } from '@/components/training/timer'
import { AnswerSheet } from '@/components/training/answer-sheet'

type GameState = 'setup' | 'playing' | 'inputting' | 'finished'

export default function SoloPage() {
  const [gameState, setGameState] = useState<GameState>('setup')
  const [timerMinutes, setTimerMinutes] = useState(8)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(8).fill(null))
  const [correctAnswers, setCorrectAnswers] = useState<(number | null)[]>(Array(8).fill(null))
  const [isOvertime, setIsOvertime] = useState(false)
  const [overtimeRows, setOvertimeRows] = useState<Set<number>>(new Set())
  const [submitWarning, setSubmitWarning] = useState(false)

  const handleStart = useCallback(() => {
    setAnswers(Array(8).fill(null))
    setCorrectAnswers(Array(8).fill(null))
    setIsOvertime(false)
    setOvertimeRows(new Set())
    setGameState('playing')
  }, [])

  const handleTimeUp = useCallback(() => {
    setIsOvertime(true)
  }, [])

  const handleSubmitAnswers = useCallback(() => {
    const unanswered = answers.filter((a) => a === null).length
    if (unanswered > 0) {
      setSubmitWarning(true)
      return
    }
    setSubmitWarning(false)
    setGameState('inputting')
  }, [answers])

  const handleAnswerChange = useCallback((rowIndex: number, position: number) => {
    setSubmitWarning(false)
    setAnswers((prev) => {
      const newAnswers = [...prev]
      newAnswers[rowIndex] = prev[rowIndex] === position ? null : position
      return newAnswers
    })
    setIsOvertime((currentOvertime) => {
      if (currentOvertime) {
        setOvertimeRows((prev) => {
          const next = new Set(prev)
          next.add(rowIndex)
          return next
        })
      }
      return currentOvertime
    })
  }, [])

  const handleCorrectAnswerChange = useCallback((rowIndex: number, position: number) => {
    // Allow changing - tap same to clear, tap different to change
    setCorrectAnswers((prev) => {
      const newCorrect = [...prev]
      // Toggle off if tapping same position, otherwise set new position
      newCorrect[rowIndex] = prev[rowIndex] === position ? null : position
      return newCorrect
    })
  }, [])

  const handleReset = useCallback(() => {
    setGameState('setup')
    setAnswers(Array(8).fill(null))
    setCorrectAnswers(Array(8).fill(null))
    setIsOvertime(false)
    setOvertimeRows(new Set())
    setSubmitWarning(false)
  }, [])

  const answeredCount = answers.filter((a) => a !== null).length
  const correctCount = correctAnswers.filter((a) => a !== null).length
  const allRevealed = correctCount === 8

  // Setup screen
  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Solo Practice</h1>
            <p className="text-muted-foreground">
              Train your palate with triangulation tests
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Timer Duration</CardTitle>
              <CardDescription>
                Standard cupping time is 8 minutes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 justify-center">
                {[5, 8, 10, 12].map((mins) => (
                  <Button
                    key={mins}
                    variant={timerMinutes === mins ? 'default' : 'outline'}
                    onClick={() => setTimerMinutes(mins)}
                    className="w-16"
                  >
                    {mins}m
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>1. Taste</strong> - Start timer and taste your samples</p>
              <p><strong>2. Mark</strong> - Select which cup you think is odd for each row</p>
              <p><strong>3. Submit</strong> - Lock your answers when ready</p>
              <p><strong>4. Check</strong> - Check each cup and see your result instantly</p>
            </CardContent>
          </Card>

          <Button onClick={handleStart} className="w-full" size="lg">
            Start Practice
          </Button>

          <div className="text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Playing - marking guesses
  if (gameState === 'playing') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Taste & Mark</h1>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Exit
            </Button>
          </div>

          <Timer
            initialMinutes={timerMinutes}
            onTimeUp={handleTimeUp}
          />

          <AnswerSheet
            answers={answers}
            onSelect={handleAnswerChange}
            mode="guess"
            overtimeRows={overtimeRows}
          />

          <Button
            onClick={handleSubmitAnswers}
            className="w-full"
            disabled={answeredCount === 0}
          >
            Submit Answers ({answeredCount}/8)
          </Button>

          {submitWarning && (
            <Card className="border-orange-400 bg-orange-50">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-orange-700 mb-2">
                  You haven&apos;t answered all rows. Missing:
                </p>
                <div className="flex flex-wrap gap-2">
                  {answers.map((a, i) =>
                    a === null ? (
                      <span
                        key={i}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-200 text-orange-800 text-sm font-semibold"
                      >
                        {i + 1}
                      </span>
                    ) : null
                  )}
                </div>
                <Button
                  onClick={() => {
                    setSubmitWarning(false)
                    setGameState('inputting')
                  }}
                  variant="outline"
                  className="w-full mt-3 border-orange-400 text-orange-700 hover:bg-orange-100"
                  size="sm"
                >
                  Submit Anyway
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Inputting - checking cups and seeing results in real-time
  if (gameState === 'inputting') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Check Cups</h1>
            {allRevealed && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Done
              </Button>
            )}
          </div>

          {!allRevealed && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-center text-muted-foreground">
                  Tap the odd cup for each row to see if you were right
                </p>
              </CardContent>
            </Card>
          )}

          <AnswerSheet
            answers={answers}
            correctAnswers={correctAnswers}
            onSelect={handleCorrectAnswerChange}
            mode="input"
          />

          {allRevealed && (
            <div className="space-y-2">
              <Button onClick={handleReset} className="w-full">
                Practice Again
              </Button>
              <Link href="/" className="block">
                <Button variant="outline" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Finished - show final results (fallback, shouldn't normally reach here)
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6 pt-4">
        <AnswerSheet
          answers={answers}
          correctAnswers={correctAnswers}
          onSelect={() => {}}
          disabled
          showResults
          mode="result"
        />
        <div className="space-y-2">
          <Button onClick={handleReset} className="w-full">
            Practice Again
          </Button>
          <Link href="/" className="block">
            <Button variant="outline" className="w-full">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
