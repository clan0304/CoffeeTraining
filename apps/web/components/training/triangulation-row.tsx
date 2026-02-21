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
  isExpanded?: boolean   // Whether the cups are visible
  onToggleExpand?: () => void  // Callback to toggle expand
  isGuessMode?: boolean  // Whether we're in guess mode (cups hidden by default)
  maybePositions?: Set<number>  // Positions marked as "maybe" (yellow)
  isOvertime?: boolean  // Whether this row was answered during overtime
}

export function TriangulationRow({
  rowNumber,
  selectedPosition,
  correctPosition,
  onSelect,
  disabled = false,
  showResult = false,
  isInputMode = false,
  isExpanded = true,
  onToggleExpand,
  isGuessMode = false,
  maybePositions = new Set(),
  isOvertime = false,
}: TriangulationRowProps) {
  const cups = [1, 2, 3]

  // In input mode, show result as soon as correct answer is set
  const shouldShowResult = showResult || (isInputMode && correctPosition !== null)

  const getCupStyle = (position: number) => {
    const isSelected = selectedPosition === position  // User's guess
    const isCorrect = correctPosition === position    // Actual correct
    const isMaybe = maybePositions.has(position)

    if (shouldShowResult && correctPosition !== null) {
      // Show comparison
      if (isCorrect && isSelected) {
        return 'bg-green-500 border-green-600 text-white'
      }
      if (isCorrect && !isSelected && isMaybe) {
        // Maybe + correct → half yellow / half green
        return 'bg-gradient-to-br from-yellow-300 from-50% to-green-500 to-50% border-green-500 text-white'
      }
      if (isCorrect && !isSelected) {
        return 'bg-green-200 border-green-400 text-green-800'
      }
      if (isSelected && !isCorrect && isMaybe) {
        // Maybe + selected but wrong → half yellow / half red
        return 'bg-gradient-to-br from-yellow-300 from-50% to-red-500 to-50% border-red-500 text-white'
      }
      if (isSelected && !isCorrect) {
        return 'bg-red-500 border-red-600 text-white'
      }
      // Maybe but not correct and not selected → still show yellow
      if (isMaybe) {
        return 'bg-yellow-100 border-yellow-400 text-yellow-800'
      }
      return 'bg-muted border-muted-foreground/20'
    }

    // Input mode - waiting for correct answer input (no result yet)
    if (isInputMode && correctPosition === null) {
      if (isSelected) {
        return 'bg-primary/30 border-primary/50'
      }
      if (isMaybe) {
        return 'bg-yellow-100 border-yellow-400 text-yellow-800'
      }
      return 'bg-background border-border hover:border-primary hover:bg-accent'
    }

    // Normal guess mode
    if (isSelected && isOvertime) {
      return 'bg-pink-500 border-pink-500 text-white'
    }
    if (isSelected) {
      return 'bg-primary border-primary text-primary-foreground'
    }

    // Maybe (yellow)
    if (isMaybe) {
      return 'bg-yellow-200 border-yellow-400 text-yellow-800'
    }

    return 'bg-background border-border hover:border-primary/50 hover:bg-accent'
  }

  // In guess mode when collapsed, show a compact row
  const isCollapsed = isGuessMode && !isExpanded && !shouldShowResult

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Row number - clickable in guess mode to expand/collapse */}
      <button
        type="button"
        onClick={isGuessMode && !shouldShowResult ? onToggleExpand : undefined}
        className={cn(
          'w-8 h-8 flex items-center justify-center rounded-full font-semibold text-sm transition-all duration-200',
          shouldShowResult && correctPosition !== null
            ? selectedPosition === correctPosition
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
            : isGuessMode && !shouldShowResult && selectedPosition !== null && isOvertime
              ? 'bg-pink-500 text-white cursor-pointer hover:opacity-80 active:scale-95'
            : isGuessMode && !shouldShowResult
              ? selectedPosition !== null
                ? 'bg-primary text-primary-foreground cursor-pointer hover:opacity-80 active:scale-95'
                : 'bg-primary text-primary-foreground cursor-pointer hover:opacity-80 active:scale-95'
              : 'bg-muted text-muted-foreground'
        )}
      >
        {rowNumber}
      </button>

      {/* Three cups - hidden when collapsed in guess mode */}
      {isCollapsed ? (
        <div className="flex gap-2 flex-1 items-center">
          {selectedPosition !== null && isOvertime ? (
            <span className="text-sm text-pink-500">Answered (overtime)</span>
          ) : selectedPosition !== null ? (
            <span className="text-sm text-muted-foreground">Answered</span>
          ) : maybePositions.size > 0 ? (
            <span className="text-sm text-yellow-600">Maybe marked</span>
          ) : (
            <span className="text-sm text-muted-foreground">Tap number to answer</span>
          )}
        </div>
      ) : (
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
              {!shouldShowResult && maybePositions.has(position) && selectedPosition !== position && (
                <span className="text-lg">?</span>
              )}
            </button>
          ))}
        </div>
      )}

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
