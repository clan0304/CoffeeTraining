import { useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import type { DomsCuppingScores, ScaCuppingScores } from '@cuppingtraining/shared/types'
import { ScaForm } from './ScaForm'
import { AutocompleteNotesInput } from './AutocompleteNotesInput'
import { colors } from '../../lib/colors'

interface DomsFormProps {
  scores: DomsCuppingScores
  onChange: (scores: DomsCuppingScores) => void
  readOnly?: boolean
}

function SectionHeader({ children }: { children: string }) {
  return <Text style={styles.sectionHeader}>{children}</Text>
}

function DomsStepper({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  readOnly?: boolean
}) {
  const decrement = () => onChange(Math.max(1, value - 1))
  const increment = () => onChange(Math.min(10, value + 1))

  return (
    <View style={styles.attrBox}>
      <View style={styles.attrBoxHeader}>
        <Text style={styles.attrBoxLabel}>{label}</Text>
        <Text style={styles.attrBoxScore}>{value}</Text>
      </View>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          onPress={decrement}
          disabled={readOnly || value <= 1}
          style={[styles.stepperBtn, (readOnly || value <= 1) && styles.stepperDisabled]}
        >
          <Text style={styles.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity
          onPress={increment}
          disabled={readOnly || value >= 10}
          style={[styles.stepperBtn, (readOnly || value >= 10) && styles.stepperDisabled]}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export function DomsForm({ scores, onChange, readOnly }: DomsFormProps) {
  const handleScaChange = useCallback(
    (scaScores: ScaCuppingScores) => {
      onChange({ ...scores, ...scaScores })
    },
    [scores, onChange]
  )

  const update = useCallback(
    (partial: Partial<DomsCuppingScores>) => {
      onChange({ ...scores, ...partial })
    },
    [scores, onChange]
  )

  return (
    <View style={styles.container}>
      {/* SCA portion */}
      <ScaForm scores={scores} onChange={handleScaChange} readOnly={readOnly} />

      {/* Dom's Extra Attributes */}
      <SectionHeader>DOM&apos;S EXTRA ATTRIBUTES</SectionHeader>

      <DomsStepper
        label="Sweetness"
        value={scores.doms_sweetness_score}
        onChange={(v) => update({ doms_sweetness_score: v })}
        readOnly={readOnly}
      />
      <DomsStepper
        label="Complexity"
        value={scores.doms_complexity_score}
        onChange={(v) => update({ doms_complexity_score: v })}
        readOnly={readOnly}
      />
      <DomsStepper
        label="Freshness"
        value={scores.doms_freshness_score}
        onChange={(v) => update({ doms_freshness_score: v })}
        readOnly={readOnly}
      />

      {/* Roast Level */}
      <SectionHeader>ROAST LEVEL</SectionHeader>
      <View style={styles.attrBox}>
        <View style={styles.roastRow}>
          <Text style={styles.attrBoxLabel}>Agtron</Text>
          <TextInput
            value={scores.doms_roast_level.toString()}
            onChangeText={(text) => {
              const value = parseInt(text) || 0
              update({ doms_roast_level: Math.max(0, Math.min(100, value)) })
            }}
            editable={!readOnly}
            keyboardType="numeric"
            style={styles.roastInput}
            textAlign="center"
          />
        </View>
      </View>

      {/* General Notes */}
      <SectionHeader>GENERAL NOTES</SectionHeader>
      <View style={styles.attrBox}>
        <Text style={styles.attrBoxLabel}>F (Flavor)</Text>
        <AutocompleteNotesInput
          value={scores.doms_flavor_notes}
          onChangeText={(v) => update({ doms_flavor_notes: v })}
          editable={!readOnly}
          placeholder="Flavor notes..."
          style={styles.notesInput}
        />
      </View>
      <View style={styles.attrBox}>
        <Text style={styles.attrBoxLabel}>A (Aroma)</Text>
        <AutocompleteNotesInput
          value={scores.doms_aroma_notes}
          onChangeText={(v) => update({ doms_aroma_notes: v })}
          editable={!readOnly}
          placeholder="Aroma notes..."
          style={styles.notesInput}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    color: colors.muted,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  attrBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 8,
  },
  attrBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  attrBoxLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
  },
  attrBoxScore: {
    fontSize: 22,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    color: colors.foreground,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  stepperDisabled: {
    opacity: 0.3,
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'center',
    color: colors.foreground,
  },
  roastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roastInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.background,
    minWidth: 60,
    maxWidth: 80,
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
