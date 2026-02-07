'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TriangulationRow } from './triangulation-row'

interface AnswerSheetProps {
  answers: (number | null)[]  // User's guesses
  correctAnswers?: (number | null)[]  // Actual correct answers
  onSelect: (rowIndex: number, position: number) => void
  disabled?: boolean
  showResults?: boolean
  mode?: 'guess' | 'input' | 'result'
}

export function AnswerSheet({
  answers,
  correctAnswers,
  onSelect,
  disabled = false,
  showResults = false,
  mode = 'guess',
}: AnswerSheetProps) {
  const rows = [0, 1, 2, 3, 4, 5, 6, 7]

  // Calculate score from revealed answers
  const calculateScore = (): number => {
    if (!correctAnswers) return 0
    let count = 0
    for (let i = 0; i < 8; i++) {
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
        return `${answeredCount}/8 marked`
      case 'input':
        return revealedCount > 0 ? `${score}/${revealedCount} correct` : 'Tap the odd cup'
      case 'result':
        return `Score: ${score}/8`
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
            onSelect={(position) => onSelect(rowIndex, position)}
            disabled={disabled}
            showResult={showResults}
            isInputMode={mode === 'input'}
          />
        ))}

        {/* Score summary - only show when all rows are revealed */}
        {(showResults || (mode === 'input' && revealedCount === 8)) && (
          <div className="pt-4 border-t mt-4">
            <div className="text-center">
              <div className="text-3xl font-bold">
                {score}/8
              </div>
              <div className="text-sm text-muted-foreground">
                {score === 8 && 'Perfect! '}
                {score >= 6 && score < 8 && 'Great job! '}
                {score >= 4 && score < 6 && 'Good effort! '}
                {score < 4 && 'Keep practicing! '}
                ({Math.round((score / 8) * 100)}% correct)
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
