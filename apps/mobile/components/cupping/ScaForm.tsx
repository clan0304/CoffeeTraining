import { useCallback, useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import type { ScaCuppingScores } from '@cuppingtraining/shared/types'
import { calculateScaTotalScore } from '@cuppingtraining/shared/cupping'
import { Button } from '../ui/Button'
import { colors } from '../../lib/colors'

interface ScaFormProps {
  scores: ScaCuppingScores
  onChange: (scores: ScaCuppingScores) => void
  readOnly?: boolean
}

/* ── Score Stepper (6.00–10.00, step 0.25) ── */
function ScoreStepper({
  value,
  onChange,
  readOnly,
}: {
  value: number
  onChange: (v: number) => void
  readOnly?: boolean
}) {
  const decrement = () => {
    const next = Math.max(6, Math.round((value - 0.25) * 100) / 100)
    onChange(next)
  }
  const increment = () => {
    const next = Math.min(10, Math.round((value + 0.25) * 100) / 100)
    onChange(next)
  }

  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        onPress={decrement}
        disabled={readOnly || value <= 6}
        style={[styles.stepperBtn, (readOnly || value <= 6) && styles.stepperDisabled]}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value.toFixed(2)}</Text>
      <TouchableOpacity
        onPress={increment}
        disabled={readOnly || value >= 10}
        style={[styles.stepperBtn, (readOnly || value >= 10) && styles.stepperDisabled]}
      >
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

/* ── Intensity Stepper (1–5) ── */
function IntensityStepper({
  label,
  value,
  onChange,
  labels,
  readOnly,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  labels: [string, string]
  readOnly?: boolean
}) {
  return (
    <View style={styles.intensityContainer}>
      <Text style={styles.intensityLabel}>{label}</Text>
      <View style={styles.intensityRow}>
        <Text style={styles.intensityEnd}>{labels[0]}</Text>
        {[1, 2, 3, 4, 5].map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => !readOnly && onChange(v)}
            disabled={readOnly}
            style={[
              styles.intensityDot,
              v === value && styles.intensityDotActive,
            ]}
          >
            <Text
              style={[
                styles.intensityDotText,
                v === value && styles.intensityDotTextActive,
              ]}
            >
              {v}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.intensityEnd}>{labels[1]}</Text>
      </View>
    </View>
  )
}

/* ── Scored Attribute Box ── */
function AttributeBox({
  label,
  score,
  onScoreChange,
  notes,
  onNotesChange,
  readOnly,
  children,
}: {
  label: string
  score: number
  onScoreChange: (v: number) => void
  notes: string
  onNotesChange: (v: string) => void
  readOnly?: boolean
  children?: React.ReactNode
}) {
  return (
    <View style={styles.attrBox}>
      <View style={styles.attrBoxHeader}>
        <Text style={styles.attrBoxLabel}>{label}</Text>
        <Text style={styles.attrBoxScore}>{score.toFixed(2)}</Text>
      </View>
      <ScoreStepper value={score} onChange={onScoreChange} readOnly={readOnly} />
      {children}
      <TextInput
        style={styles.notesInput}
        value={notes}
        onChangeText={onNotesChange}
        editable={!readOnly}
        placeholder="Notes..."
        placeholderTextColor={colors.mutedLight}
      />
    </View>
  )
}

/* ── Cup Checkboxes ── */
function CupBox({
  label,
  cups,
  onChange,
  notes,
  onNotesChange,
  readOnly,
}: {
  label: string
  cups: boolean[]
  onChange: (cups: boolean[]) => void
  notes: string
  onNotesChange: (v: string) => void
  readOnly?: boolean
}) {
  const score = cups.filter(Boolean).length * 2
  return (
    <View style={styles.attrBox}>
      <View style={styles.attrBoxHeader}>
        <Text style={styles.attrBoxLabel}>{label}</Text>
        <Text style={styles.attrBoxScore}>
          {score}
          <Text style={styles.scoreMax}>/10</Text>
        </Text>
      </View>
      <View style={styles.cupRow}>
        {cups.map((checked, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => {
              if (readOnly) return
              const next = [...cups]
              next[i] = !next[i]
              onChange(next)
            }}
            disabled={readOnly}
            style={[
              styles.cupBtn,
              checked && styles.cupBtnActive,
              readOnly && styles.cupBtnReadOnly,
            ]}
          >
            <Text
              style={[
                styles.cupBtnText,
                checked && styles.cupBtnTextActive,
              ]}
            >
              {i + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.notesInput}
        value={notes}
        onChangeText={onNotesChange}
        editable={!readOnly}
        placeholder="Notes..."
        placeholderTextColor={colors.mutedLight}
      />
    </View>
  )
}

/* ── Defect Box ── */
function DefectBox({
  label,
  sublabel,
  cups,
  intensity,
  multiplier,
  onCupsChange,
  onIntensityChange,
  readOnly,
}: {
  label: string
  sublabel: string
  cups: number
  intensity: number
  multiplier: number
  onCupsChange: (v: number) => void
  onIntensityChange: (v: number) => void
  readOnly?: boolean
}) {
  const total = cups * intensity * multiplier
  return (
    <View style={styles.attrBox}>
      <View style={styles.attrBoxHeader}>
        <View style={styles.defectLabelRow}>
          <Text style={styles.attrBoxLabel}>{label}</Text>
          <Text style={styles.defectSublabel}>({sublabel})</Text>
        </View>
        <Text style={[styles.attrBoxScore, { color: colors.error }]}>
          −{total}
        </Text>
      </View>
      <View style={styles.defectInputRow}>
        <View style={styles.defectField}>
          <Text style={styles.defectFieldLabel}>Cups</Text>
          <View style={styles.defectStepperRow}>
            <TouchableOpacity
              onPress={() => onCupsChange(Math.max(0, cups - 1))}
              disabled={readOnly || cups <= 0}
              style={[styles.miniStepBtn, (readOnly || cups <= 0) && styles.stepperDisabled]}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.defectValue}>{cups}</Text>
            <TouchableOpacity
              onPress={() => onCupsChange(Math.min(5, cups + 1))}
              disabled={readOnly || cups >= 5}
              style={[styles.miniStepBtn, (readOnly || cups >= 5) && styles.stepperDisabled]}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.defectMultSign}>×</Text>
        <View style={styles.defectField}>
          <Text style={styles.defectFieldLabel}>Intensity</Text>
          <View style={styles.defectStepperRow}>
            <TouchableOpacity
              onPress={() => onIntensityChange(Math.max(0, intensity - 1))}
              disabled={readOnly || intensity <= 0}
              style={[styles.miniStepBtn, (readOnly || intensity <= 0) && styles.stepperDisabled]}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.defectValue}>{intensity}</Text>
            <TouchableOpacity
              onPress={() => onIntensityChange(Math.min(4, intensity + 1))}
              disabled={readOnly || intensity >= 4}
              style={[styles.miniStepBtn, (readOnly || intensity >= 4) && styles.stepperDisabled]}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.defectMultNote}>× {multiplier}</Text>
      </View>
    </View>
  )
}

/* ── Section Header ── */
function SectionHeader({ children }: { children: string }) {
  return <Text style={styles.sectionHeader}>{children}</Text>
}

/* ── Main Form ── */
export function ScaForm({ scores, onChange, readOnly }: ScaFormProps) {
  const update = useCallback(
    (partial: Partial<ScaCuppingScores>) => {
      onChange({ ...scores, ...partial })
    },
    [scores, onChange]
  )

  const totalScore = useMemo(() => calculateScaTotalScore(scores), [scores])

  return (
    <View style={styles.container}>
      {/* Total */}
      <View style={styles.totalCard}>
        <Text style={styles.totalScore}>{totalScore.toFixed(2)}</Text>
      </View>

      {/* Scored Attributes */}
      <SectionHeader>SCORED ATTRIBUTES</SectionHeader>

      <AttributeBox
        label="Fragrance / Aroma"
        score={scores.fragrance_score}
        onScoreChange={(v) => update({ fragrance_score: v })}
        notes={scores.fragrance_notes}
        onNotesChange={(v) => update({ fragrance_notes: v })}
        readOnly={readOnly}
      >
        <View style={styles.intensityGrid}>
          <IntensityStepper
            label="Dry"
            value={scores.fragrance_dry}
            onChange={(v) => update({ fragrance_dry: v })}
            labels={['Low', 'High']}
            readOnly={readOnly}
          />
          <IntensityStepper
            label="Break"
            value={scores.fragrance_break}
            onChange={(v) => update({ fragrance_break: v })}
            labels={['Low', 'High']}
            readOnly={readOnly}
          />
        </View>
      </AttributeBox>

      <AttributeBox
        label="Flavor"
        score={scores.flavor_score}
        onScoreChange={(v) => update({ flavor_score: v })}
        notes={scores.flavor_notes}
        onNotesChange={(v) => update({ flavor_notes: v })}
        readOnly={readOnly}
      />

      <AttributeBox
        label="Aftertaste"
        score={scores.aftertaste_score}
        onScoreChange={(v) => update({ aftertaste_score: v })}
        notes={scores.aftertaste_notes}
        onNotesChange={(v) => update({ aftertaste_notes: v })}
        readOnly={readOnly}
      />

      <AttributeBox
        label="Acidity"
        score={scores.acidity_score}
        onScoreChange={(v) => update({ acidity_score: v })}
        notes={scores.acidity_notes}
        onNotesChange={(v) => update({ acidity_notes: v })}
        readOnly={readOnly}
      >
        <IntensityStepper
          label="Intensity"
          value={scores.acidity_intensity}
          onChange={(v) => update({ acidity_intensity: v })}
          labels={['Low', 'High']}
          readOnly={readOnly}
        />
      </AttributeBox>

      <AttributeBox
        label="Body"
        score={scores.body_score}
        onScoreChange={(v) => update({ body_score: v })}
        notes={scores.body_notes}
        onNotesChange={(v) => update({ body_notes: v })}
        readOnly={readOnly}
      >
        <IntensityStepper
          label="Level"
          value={scores.body_level}
          onChange={(v) => update({ body_level: v })}
          labels={['Thin', 'Heavy']}
          readOnly={readOnly}
        />
      </AttributeBox>

      <AttributeBox
        label="Balance"
        score={scores.balance_score}
        onScoreChange={(v) => update({ balance_score: v })}
        notes={scores.balance_notes}
        onNotesChange={(v) => update({ balance_notes: v })}
        readOnly={readOnly}
      />

      <AttributeBox
        label="Overall"
        score={scores.overall_score}
        onScoreChange={(v) => update({ overall_score: v })}
        notes={scores.overall_notes}
        onNotesChange={(v) => update({ overall_notes: v })}
        readOnly={readOnly}
      />

      {/* Cup Evaluation */}
      <SectionHeader>CUP EVALUATION</SectionHeader>

      <CupBox
        label="Uniformity"
        cups={scores.uniformity_cups}
        onChange={(cups) => update({ uniformity_cups: cups })}
        notes={scores.uniformity_notes}
        onNotesChange={(v) => update({ uniformity_notes: v })}
        readOnly={readOnly}
      />
      <CupBox
        label="Clean Cup"
        cups={scores.clean_cup_cups}
        onChange={(cups) => update({ clean_cup_cups: cups })}
        notes={scores.clean_cup_notes}
        onNotesChange={(v) => update({ clean_cup_notes: v })}
        readOnly={readOnly}
      />
      <CupBox
        label="Sweetness"
        cups={scores.sweetness_cups}
        onChange={(cups) => update({ sweetness_cups: cups })}
        notes={scores.sweetness_notes}
        onNotesChange={(v) => update({ sweetness_notes: v })}
        readOnly={readOnly}
      />

      {/* Defects */}
      <SectionHeader>DEFECTS</SectionHeader>

      <DefectBox
        label="Taint"
        sublabel="slight"
        cups={scores.defects_taint_cups}
        intensity={scores.defects_taint_intensity}
        multiplier={2}
        onCupsChange={(v) => update({ defects_taint_cups: v })}
        onIntensityChange={(v) => update({ defects_taint_intensity: v })}
        readOnly={readOnly}
      />
      <DefectBox
        label="Fault"
        sublabel="serious"
        cups={scores.defects_fault_cups}
        intensity={scores.defects_fault_intensity}
        multiplier={4}
        onCupsChange={(v) => update({ defects_fault_cups: v })}
        onIntensityChange={(v) => update({ defects_fault_intensity: v })}
        readOnly={readOnly}
      />
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
  scoreMax: {
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
    marginTop: 'auto' as unknown as number,
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
    minWidth: 60,
    textAlign: 'center',
    color: colors.foreground,
  },
  intensityContainer: {
    gap: 2,
  },
  intensityLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  intensityEnd: {
    fontSize: 10,
    color: colors.muted,
    width: 30,
  },
  intensityDot: {
    flex: 1,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityDotActive: {
    backgroundColor: colors.primary,
  },
  intensityDotText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
  },
  intensityDotTextActive: {
    color: colors.primaryForeground,
  },
  intensityGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  cupRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cupBtn: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cupBtnActive: {
    backgroundColor: colors.primary,
  },
  cupBtnReadOnly: {
    opacity: 0.6,
  },
  cupBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.muted,
  },
  cupBtnTextActive: {
    color: colors.primaryForeground,
  },
  defectLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  defectSublabel: {
    fontSize: 11,
    color: colors.muted,
  },
  defectInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defectField: {
    gap: 2,
  },
  defectFieldLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  defectStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniStepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defectValue: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 20,
    textAlign: 'center',
    color: colors.foreground,
  },
  defectMultSign: {
    fontSize: 14,
    color: colors.muted,
  },
  defectMultNote: {
    fontSize: 11,
    color: colors.muted,
    marginLeft: 'auto',
  },
})
