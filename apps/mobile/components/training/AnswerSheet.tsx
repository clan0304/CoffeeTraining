import { useState, useCallback } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { TriangulationRow } from './TriangulationRow'
import { colors } from '../../lib/colors'

interface AnswerSheetProps {
  answers: (number | null)[]
  correctAnswers?: (number | null)[]
  onSelect: (rowIndex: number, position: number) => void
  disabled?: boolean
  showResults?: boolean
  mode?: 'guess' | 'input' | 'result'
  overtimeRows?: Set<number>
}

export function AnswerSheet({
  answers,
  correctAnswers,
  onSelect,
  disabled = false,
  showResults = false,
  mode = 'guess',
  overtimeRows,
}: AnswerSheetProps) {
  const rows = [0, 1, 2, 3, 4, 5, 6, 7]
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [maybes, setMaybes] = useState<Set<number>[]>(
    () => Array.from({ length: 8 }, () => new Set())
  )

  const handleSelect = useCallback(
    (rowIndex: number, position: number) => {
      if (mode !== 'guess') {
        onSelect(rowIndex, position)
        return
      }

      const isCurrentAnswer = answers[rowIndex] === position
      const isMaybe = maybes[rowIndex].has(position)

      if (isCurrentAnswer) {
        onSelect(rowIndex, position)
        setMaybes((prev) => {
          const next = prev.map((s, i) => (i === rowIndex ? new Set(s) : s))
          next[rowIndex].add(position)
          return next
        })
      } else if (isMaybe) {
        setMaybes((prev) => {
          const next = prev.map((s, i) => (i === rowIndex ? new Set(s) : s))
          next[rowIndex].delete(position)
          return next
        })
      } else {
        onSelect(rowIndex, position)
      }
    },
    [onSelect, answers, maybes, mode]
  )

  const handleToggleExpand = useCallback((rowIndex: number) => {
    setExpandedRow((prev) => (prev === rowIndex ? null : rowIndex))
  }, [])

  const calculateScore = (): number => {
    if (!correctAnswers) return 0
    let count = 0
    for (let i = 0; i < 8; i++) {
      if (
        answers[i] !== null &&
        correctAnswers[i] !== null &&
        answers[i] === correctAnswers[i]
      ) {
        count++
      }
    }
    return count
  }

  const answeredCount =
    mode === 'input'
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
        return revealedCount > 0
          ? `${score}/${revealedCount} correct`
          : 'Tap the odd cup'
      case 'result':
        return `Score: ${score}/8`
      default:
        return ''
    }
  }

  return (
    <Card>
      <CardHeader style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text
            style={[
              styles.subtitle,
              (mode === 'result' || (mode === 'input' && revealedCount > 0)) &&
                styles.subtitleBold,
            ]}
          >
            {getSubtitle()}
          </Text>
        </View>
        {mode === 'input' && revealedCount === 0 && (
          <Text style={styles.hint}>
            Check each cup and tap which one was the odd one
          </Text>
        )}
        {mode === 'guess' && answeredCount === 0 && (
          <Text style={styles.hint}>Tap a row number to reveal cups</Text>
        )}
      </CardHeader>

      <CardContent style={styles.content}>
        {/* Column headers */}
        <View style={styles.columnHeaders}>
          <View style={styles.numCol}>
            <Text style={styles.colLabel}>#</Text>
          </View>
          <View style={styles.cupsCol}>
            <Text style={[styles.colLabel, styles.cupColLabel]}>1</Text>
            <Text style={[styles.colLabel, styles.cupColLabel]}>2</Text>
            <Text style={[styles.colLabel, styles.cupColLabel]}>3</Text>
          </View>
          {(mode === 'input' || showResults) && <View style={styles.resultCol} />}
        </View>

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
            maybePositions={maybes[rowIndex]}
            isOvertime={overtimeRows?.has(rowIndex)}
          />
        ))}

        {/* Score summary */}
        {(showResults || (mode === 'input' && revealedCount === 8)) && (
          <View style={styles.scoreSummary}>
            <Text style={styles.scoreNumber}>{score}/8</Text>
            <Text style={styles.scoreMessage}>
              {score === 8
                ? 'Perfect! '
                : score >= 6
                ? 'Great job! '
                : score >= 4
                ? 'Good effort! '
                : 'Keep practicing! '}
              ({Math.round((score / 8) * 100)}% correct)
            </Text>
          </View>
        )}
      </CardContent>
    </Card>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  subtitleBold: {
    fontWeight: '600',
    color: colors.foreground,
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  content: {
    paddingTop: 4,
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  numCol: {
    width: 32,
    alignItems: 'center',
  },
  cupsCol: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  cupColLabel: {
    flex: 1,
    textAlign: 'center',
  },
  colLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  resultCol: {
    width: 32,
  },
  scoreSummary: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 12,
    paddingTop: 16,
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  scoreMessage: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
})
