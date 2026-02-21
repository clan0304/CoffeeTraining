import { useCallback, useMemo } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import type { SimpleCuppingScores } from '@cuppingtraining/shared/types'
import { calculateSimpleTotalScore } from '@cuppingtraining/shared/cupping'
import { StarRating } from './StarRating'
import { colors } from '../../lib/colors'

interface SimpleFormProps {
  scores: SimpleCuppingScores
  onChange: (scores: SimpleCuppingScores) => void
  readOnly?: boolean
}

const ATTRIBUTES = [
  { key: 'aroma', label: 'Aroma', placeholder: 'e.g., floral, nutty, chocolate' },
  { key: 'acidity', label: 'Acidity', placeholder: 'e.g., bright, citric, mellow' },
  { key: 'sweetness', label: 'Sweetness', placeholder: 'e.g., caramel, honey, fruity' },
  { key: 'body', label: 'Body', placeholder: 'e.g., light, medium, heavy' },
  { key: 'aftertaste', label: 'Aftertaste', placeholder: 'e.g., clean, lingering, dry' },
] as const

type AttributeKey = (typeof ATTRIBUTES)[number]['key']

function AttributeRow({
  label,
  score,
  onScoreChange,
  notes,
  onNotesChange,
  placeholder,
  readOnly,
}: {
  label: string
  score: number
  onScoreChange: (v: number) => void
  notes: string
  onNotesChange: (v: string) => void
  placeholder: string
  readOnly?: boolean
}) {
  return (
    <View style={styles.attrCard}>
      <View style={styles.attrHeader}>
        <Text style={styles.attrLabel}>{label}</Text>
        <Text style={styles.attrScore}>
          {score}
          <Text style={styles.attrScoreMax}>/5</Text>
        </Text>
      </View>
      <StarRating value={score} onChange={onScoreChange} readOnly={readOnly} />
      <TextInput
        style={styles.notesInput}
        value={notes}
        onChangeText={onNotesChange}
        editable={!readOnly}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedLight}
      />
    </View>
  )
}

export function SimpleForm({ scores, onChange, readOnly }: SimpleFormProps) {
  const update = useCallback(
    (partial: Partial<SimpleCuppingScores>) => {
      onChange({ ...scores, ...partial })
    },
    [scores, onChange]
  )

  const totalScore = useMemo(() => calculateSimpleTotalScore(scores), [scores])

  return (
    <View style={styles.container}>
      {/* Total Score */}
      <View style={styles.totalCard}>
        <Text style={styles.totalScore}>{totalScore.toFixed(1)}</Text>
        <Text style={styles.totalLabel}>out of 5.0</Text>
      </View>

      {/* Attributes */}
      {ATTRIBUTES.map((attr) => (
        <AttributeRow
          key={attr.key}
          label={attr.label}
          score={scores[`${attr.key}_score` as `${AttributeKey}_score`]}
          onScoreChange={(v) =>
            update({ [`${attr.key}_score`]: v } as Partial<SimpleCuppingScores>)
          }
          notes={scores[`${attr.key}_notes` as `${AttributeKey}_notes`]}
          onNotesChange={(v) =>
            update({ [`${attr.key}_notes`]: v } as Partial<SimpleCuppingScores>)
          }
          placeholder={attr.placeholder}
          readOnly={readOnly}
        />
      ))}

      {/* Overall Notes */}
      <View style={styles.attrCard}>
        <Text style={styles.attrLabel}>Overall Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={scores.overall_notes}
          onChangeText={(v) => update({ overall_notes: v })}
          editable={!readOnly}
          placeholder="General impressions..."
          placeholderTextColor={colors.mutedLight}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  totalCard: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00000015',
    backgroundColor: '#00000008',
  },
  totalScore: {
    fontSize: 48,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    color: colors.foreground,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  attrCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 8,
  },
  attrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attrLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
  },
  attrScore: {
    fontSize: 18,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    color: colors.foreground,
  },
  attrScoreMax: {
    fontSize: 12,
    fontWeight: 'normal',
    color: colors.muted,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.foreground,
  },
})
