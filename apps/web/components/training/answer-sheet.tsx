'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TriangulationRow } from './triangulation-row'

interface AnswerSheetProps {
  answers: (number | null)[]  // User's guesses
  correctAnswers?: (number | null)[]  // Actual correct answers
  onSelect: (rowIndex: number, position: number) => void
  disabled?: boolean
  showResults?: boolean
  mode?: 'guess' | 'input' | 'result'
  overtimeRows?: Set<number>  // Row indices whose answers were set/changed during overtime
}

const EMPTY_MAYBES: Set<number> = new Set()

export function AnswerSheet({
  answers,
  correctAnswers,
  onSelect,
  disabled = false,
  showResults = false,
  mode = 'guess',
  overtimeRows,
}: AnswerSheetProps) {
  // Row count follows the answers array (3/5/8 depending on room settings)
  const rowCount = answers.length
  const rows = Array.from({ length: rowCount }, (_, i) => i)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [maybes, setMaybes] = useState<Set<number>[]>(
    () => Array.from({ length: rowCount }, () => new Set())
  )

  const handleSelect = useCallback((rowIndex: number, position: number) => {
    // Maybe cycle only applies in guess mode
    if (mode !== 'guess') {
      onSelect(rowIndex, position)
      return
    }

    const isCurrentAnswer = answers[rowIndex] === position
    const isMaybe = (maybes[rowIndex] ?? EMPTY_MAYBES).has(position)

    // Rebuild at the current row count in case the round's row count changed
    // after mount (maybes state was sized at initial render).
    const remapMaybes = (prev: Set<number>[], mutate: (target: Set<number>) => void) => {
      const next = Array.from({ length: rowCount }, (_, i) =>
        i === rowIndex ? new Set(prev[i] ?? []) : prev[i] ?? new Set<number>()
      )
      mutate(next[rowIndex])
      return next
    }

    if (isCurrentAnswer) {
      // Answer → Maybe (yellow): deselect answer, add to maybes
      onSelect(rowIndex, position) // toggles off in parent
      setMaybes((prev) => remapMaybes(prev, (target) => target.add(position)))
    } else if (isMaybe) {
      // Maybe → None: remove maybe mark
      setMaybes((prev) => remapMaybes(prev, (target) => target.delete(position)))
    } else {
      // None → Answer: set as answer
      onSelect(rowIndex, position)
    }
  }, [onSelect, answers, maybes, mode, rowCount])

  const handleToggleExpand = useCallback((rowIndex: number) => {
    setExpandedRow((prev) => (prev === rowIndex ? null : rowIndex))
  }, [])

  // Calculate score from revealed answers
  const calculateScore = (): number => {
    if (!correctAnswers) return 0
    let count = 0
    for (let i = 0; i < rowCount; i++) {
      if (answers[i] !== null && correctAnswers[i] !== null && answers[i] === correctAnswers[i]) {
        count++
      }
    }
    return count
  }

  const answeredCount = mode === 'input'
    ? (correctAnswers?.filter((a) => a !== null).length ?? 0)
    : answers.filter((a) => a !== null).length

  const score = calculateScore()
  const revealedCount = correctAnswers?.filter((a) => a !== null).length ?? 0

  const getTitle = () => {
    switch (mode) {
      case 'guess':
        return 'Your Answers'
      case 'input':
        return 'Check Cups'
      case 'result':
        return 'Results'
      default:
        return 'Answer Sheet'
    }
  }

  const getSubtitle = () => {
    switch (mode) {
      case 'guess':
        return `${answeredCount}/${rowCount} marked`
      case 'input':
        return revealedCount > 0 ? `${score}/${revealedCount} correct` : 'Tap the odd cup'
      case 'result':
        return `Score: ${score}/${rowCount}`
      default:
        return ''
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{getTitle()}</CardTitle>
          <div className="text-sm text-muted-foreground">
            {mode === 'result' || (mode === 'input' && revealedCount > 0) ? (
              <span className="font-semibold text-foreground">{getSubtitle()}</span>
            ) : (
              <span>{getSubtitle()}</span>
            )}
          </div>
        </div>
        {mode === 'input' && revealedCount === 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Check each cup and tap which one was the odd one
          </p>
        )}
        {mode === 'guess' && answeredCount === 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Tap a row number to reveal cups
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2 border-b text-xs text-muted-foreground">
          <div className="w-8 text-center">#</div>
          <div className="flex gap-2 flex-1">
            <div className="flex-1 text-center">1</div>
            <div className="flex-1 text-center">2</div>
            <div className="flex-1 text-center">3</div>
          </div>
          {(mode === 'input' || showResults) && <div className="w-8" />}
        </div>

        {/* Rows */}
        {rows.map((rowIndex) => (
          <TriangulationRow
            key={rowIndex}
            rowNumber={rowIndex + 1}
            selectedPosition={answers[rowIndex]}
            correctPosition={correctAnswers?.[rowIndex]}
            onSelect={(position) => handleSelect(rowIndex, position)}
            disabled={disabled}
            showResult={showResults}
            isInputMode={mode === 'input'}
            isExpanded={mode === 'guess' ? expandedRow === rowIndex : true}
            onToggleExpand={() => handleToggleExpand(rowIndex)}
            isGuessMode={mode === 'guess'}
            maybePositions={maybes[rowIndex] ?? EMPTY_MAYBES}
            isOvertime={overtimeRows?.has(rowIndex)}
          />
        ))}

        {/* Score summary - only show when all rows are revealed */}
        {(showResults || (mode === 'input' && revealedCount === rowCount)) && (
          <div className="pt-4 border-t mt-4">
            <div className="text-center">
              <div className="text-3xl font-bold">
                {score}/{rowCount}
              </div>
              <div className="text-sm text-muted-foreground">
                {score === rowCount && 'Perfect! '}
                {score < rowCount && score / rowCount >= 0.75 && 'Great job! '}
                {score / rowCount >= 0.5 && score / rowCount < 0.75 && 'Good effort! '}
                {score / rowCount < 0.5 && 'Keep practicing! '}
                ({Math.round((score / rowCount) * 100)}% correct)
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
