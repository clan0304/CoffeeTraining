import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../../lib/colors'

interface TriangulationRowProps {
  rowNumber: number
  selectedPosition: number | null
  correctPosition?: number | null
  onSelect: (position: number) => void
  disabled?: boolean
  showResult?: boolean
  isInputMode?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  isGuessMode?: boolean
  maybePositions?: Set<number>
  isOvertime?: boolean
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
  const shouldShowResult = showResult || (isInputMode && correctPosition !== null)
  const isCollapsed = isGuessMode && !isExpanded && !shouldShowResult

  const getCupStyle = (position: number) => {
    const isSelected = selectedPosition === position
    const isCorrect = correctPosition === position
    const isMaybe = maybePositions.has(position)

    if (shouldShowResult && correctPosition !== null) {
      if (isCorrect && isSelected) {
        return { bg: colors.success, border: colors.success, text: '#fff' }
      }
      if (isCorrect && !isSelected) {
        return { bg: colors.successLight, border: colors.success, text: '#166534' }
      }
      if (isSelected && !isCorrect) {
        return { bg: colors.error, border: colors.error, text: '#fff' }
      }
      if (isMaybe) {
        return { bg: colors.warningLight, border: colors.warning, text: '#92400e' }
      }
      return { bg: colors.borderLight, border: colors.border, text: colors.muted }
    }

    if (isInputMode && correctPosition === null) {
      if (isSelected) {
        return { bg: '#00000020', border: '#00000050', text: colors.foreground }
      }
      if (isMaybe) {
        return { bg: colors.warningLight, border: colors.warning, text: '#92400e' }
      }
      return { bg: colors.background, border: colors.border, text: colors.foreground }
    }

    if (isSelected && isOvertime) {
      return { bg: colors.pink, border: colors.pink, text: '#fff' }
    }
    if (isSelected) {
      return { bg: colors.primary, border: colors.primary, text: colors.primaryForeground }
    }
    if (isMaybe) {
      return { bg: '#fef08a', border: colors.warning, text: '#92400e' }
    }
    return { bg: colors.background, border: colors.border, text: colors.foreground }
  }

  const getRowBadgeStyle = () => {
    if (shouldShowResult && correctPosition !== null) {
      return selectedPosition === correctPosition
        ? { bg: colors.success, text: '#fff' }
        : { bg: colors.error, text: '#fff' }
    }
    if (isGuessMode && !shouldShowResult && selectedPosition !== null && isOvertime) {
      return { bg: colors.pink, text: '#fff' }
    }
    if (isGuessMode && !shouldShowResult) {
      return { bg: colors.primary, text: colors.primaryForeground }
    }
    return { bg: colors.borderLight, text: colors.muted }
  }

  const badge = getRowBadgeStyle()

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={isGuessMode && !shouldShowResult ? onToggleExpand : undefined}
        activeOpacity={isGuessMode ? 0.7 : 1}
        style={[
          styles.badge,
          { backgroundColor: badge.bg },
        ]}
      >
        <Text style={[styles.badgeText, { color: badge.text }]}>
          {rowNumber}
        </Text>
      </TouchableOpacity>

      {isCollapsed ? (
        <View style={styles.collapsedContent}>
          <Text style={[styles.collapsedText, selectedPosition !== null && isOvertime && { color: colors.pink }]}>
            {selectedPosition !== null && isOvertime
              ? 'Answered (overtime)'
              : selectedPosition !== null
              ? 'Answered'
              : maybePositions.size > 0
              ? 'Maybe marked'
              : 'Tap number to answer'}
          </Text>
        </View>
      ) : (
        <View style={styles.cups}>
          {cups.map((position) => {
            const cupStyle = getCupStyle(position)
            return (
              <TouchableOpacity
                key={position}
                onPress={() => onSelect(position)}
                disabled={disabled && !isInputMode}
                activeOpacity={0.7}
                style={[
                  styles.cup,
                  {
                    backgroundColor: cupStyle.bg,
                    borderColor: cupStyle.border,
                  },
                  disabled && !isInputMode && styles.disabledCup,
                ]}
              >
                {shouldShowResult && correctPosition === position && (
                  <Text style={[styles.cupIcon, { color: cupStyle.text }]}>
                    ✓
                  </Text>
                )}
                {shouldShowResult &&
                  selectedPosition === position &&
                  correctPosition !== position && (
                    <Text style={[styles.cupIcon, { color: cupStyle.text }]}>
                      ✕
                    </Text>
                  )}
                {!shouldShowResult &&
                  maybePositions.has(position) &&
                  selectedPosition !== position && (
                    <Text style={[styles.cupIcon, { color: cupStyle.text }]}>
                      ?
                    </Text>
                  )}
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {shouldShowResult && correctPosition !== null && (
        <View style={styles.resultIcon}>
          {selectedPosition === correctPosition ? (
            <Text style={{ color: colors.success, fontSize: 18 }}>✓</Text>
          ) : selectedPosition !== null ? (
            <Text style={{ color: colors.error, fontSize: 18 }}>✕</Text>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 18 }}>-</Text>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cups: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  cup: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cupIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  disabledCup: {
    opacity: 0.5,
  },
  collapsedContent: {
    flex: 1,
    justifyContent: 'center',
  },
  collapsedText: {
    fontSize: 13,
    color: colors.muted,
  },
  resultIcon: {
    width: 32,
    alignItems: 'center',
  },
})
