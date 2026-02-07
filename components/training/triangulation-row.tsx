'use client'

import { cn } from '@/lib/utils'

interface TriangulationRowProps {
  rowNumber: number
  selectedPosition: number | null  // User's guess
  correctPosition?: number | null  // The actual correct answer
  onSelect: (position: number) => void
  disabled?: boolean
  showResult?: boolean
  isInputMode?: boolean  // When true, clicking sets correct answer and shows result
}

export function TriangulationRow({
  rowNumber,
  selectedPosition,
  correctPosition,
  onSelect,
  disabled = false,
  showResult = false,
  isInputMode = false,
}: TriangulationRowProps) {
  const cups = [1, 2, 3]

  // In input mode, show result as soon as correct answer is set
  const shouldShowResult = showResult || (isInputMode && correctPosition !== null)

  const getCupStyle = (position: number) => {
    const isSelected = selectedPosition === position  // User's guess
    const isCorrect = correctPosition === position    // Actual correct

    if (shouldShowResult && correctPosition !== null) {
      // Show comparison
      if (isCorrect && isSelected) {
        // User guessed correctly
        return 'bg-green-500 border-green-600 text-white'
      }
      if (isCorrect && !isSelected) {
        // This was correct but user didn't select it
        return 'bg-green-200 border-green-400 text-green-800'
      }
      if (isSelected && !isCorrect) {
        // User selected wrong
        return 'bg-red-500 border-red-600 text-white'
      }
      return 'bg-muted border-muted-foreground/20'
    }

    // Input mode - waiting for correct answer input (no result yet)
    if (isInputMode && correctPosition === null) {
      // Show user's guess faded, highlight buttons for input
      if (isSelected) {
        return 'bg-primary/30 border-primary/50'
      }
      return 'bg-background border-border hover:border-primary hover:bg-accent'
    }

    // Normal guess mode
    if (isSelected) {
      return 'bg-primary border-primary text-primary-foreground'
    }

    return 'bg-background border-border hover:border-primary/50 hover:bg-accent'
  }

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Row number */}
      <div
        className={cn(
          'w-8 h-8 flex items-center justify-center rounded-full font-semibold text-sm',
          shouldShowResult && correctPosition !== null
            ? selectedPosition === correctPosition
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {rowNumber}
      </div>

      {/* Three cups */}
      <div className="flex gap-2 flex-1">
        {cups.map((position) => (
          <button
            key={position}
            onClick={() => onSelect(position)}
            disabled={disabled && !isInputMode}
            className={cn(
              'flex-1 h-14 rounded-lg border-2 transition-all duration-200',
              'flex items-center justify-center font-medium',
              'focus:outline-none focus:ring-2 focus:ring-primary/50',
              disabled && !isInputMode && 'opacity-50 cursor-not-allowed',
              getCupStyle(position)
            )}
          >
            {shouldShowResult && correctPosition === position && (
              <span className="text-lg">&#10003;</span>
            )}
            {shouldShowResult && selectedPosition === position && correctPosition !== position && (
              <span className="text-lg">&#10007;</span>
            )}
          </button>
        ))}
      </div>

      {/* Result indicator */}
      {shouldShowResult && correctPosition !== null && (
        <div className="w-8 flex justify-center">
          {selectedPosition === correctPosition ? (
            <span className="text-green-500 text-xl">&#10003;</span>
          ) : selectedPosition !== null ? (
            <span className="text-red-500 text-xl">&#10007;</span>
          ) : (
            <span className="text-muted-foreground text-xl">-</span>
          )}
        </div>
      )}
    </div>
  )
}
