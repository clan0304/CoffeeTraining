'use client'

import { useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import type { ScaCuppingScores } from '@/types/database'
import { calculateScaTotalScore } from '@/lib/cupping/sca-utils'

interface ScaFormProps {
  scores: ScaCuppingScores
  onChange: (scores: ScaCuppingScores) => void
  readOnly?: boolean
}

/* ── Score slider (6.00–10.00, step 0.25) ─────────────────── */
function ScoreSlider({
  value,
  onChange,
  readOnly,
}: {
  value: number
  onChange: (v: number) => void
  readOnly?: boolean
}) {
  const fill = ((value - 6) / 4) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground tabular-nums">6</span>
      <input
        type="range"
        min={6}
        max={10}
        step={0.25}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={readOnly}
        className="score-slider flex-1"
        style={{ '--fill': `${fill}%` } as React.CSSProperties}
      />
      <span className="text-[10px] text-muted-foreground tabular-nums">10</span>
    </div>
  )
}

/* ── Intensity sub-slider (1–5) ───────────────────────────── */
function IntensitySlider({
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
  const fill = ((value - 1) / 4) * 100
  return (
    <div className="space-y-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-muted-foreground shrink-0">{labels[0]}</span>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={readOnly}
          className="score-slider score-slider-sm flex-1"
          style={{ '--fill': `${fill}%` } as React.CSSProperties}
        />
        <span className="text-[9px] text-muted-foreground shrink-0">{labels[1]}</span>
      </div>
    </div>
  )
}

/* ── Scored attribute box ─────────────────────────────────── */
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
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-2xl font-bold tabular-nums tracking-tight">
          {score.toFixed(2)}
        </span>
      </div>
      <ScoreSlider value={score} onChange={onScoreChange} readOnly={readOnly} />
      {children}
      <Input
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        readOnly={readOnly}
        placeholder="Notes..."
        className="text-xs h-7 border-dashed mt-auto"
      />
    </div>
  )
}

/* ── Cup checkboxes box ──────────────────────────────────── */
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
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-lg font-bold tabular-nums">{score}<span className="text-xs font-normal text-muted-foreground">/10</span></span>
      </div>
      <div className="flex gap-1.5">
        {cups.map((checked, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (readOnly) return
              const next = [...cups]
              next[i] = !next[i]
              onChange(next)
            }}
            disabled={readOnly}
            className={`flex-1 h-9 rounded-md text-xs font-medium transition-all ${
              checked
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            } ${readOnly ? 'opacity-60' : ''}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <Input
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        readOnly={readOnly}
        placeholder="Notes..."
        className="text-xs h-7 border-dashed mt-auto"
      />
    </div>
  )
}

/* ── Defect box ──────────────────────────────────────────── */
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
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">{label}</span>
          <span className="text-[10px] text-muted-foreground ml-1">({sublabel})</span>
        </div>
        <span className="text-lg font-bold tabular-nums text-destructive">
          &minus;{cups * intensity * multiplier}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Cups</span>
          <Input
            type="number"
            min={0}
            max={5}
            value={cups}
            onChange={(e) => onCupsChange(Math.max(0, Math.min(5, Number(e.target.value) || 0)))}
            readOnly={readOnly}
            className="w-14 h-7 text-xs text-center"
          />
        </div>
        <span className="text-muted-foreground text-xs">&times;</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Intensity</span>
          <Input
            type="number"
            min={0}
            max={4}
            value={intensity}
            onChange={(e) => onIntensityChange(Math.max(0, Math.min(4, Number(e.target.value) || 0)))}
            readOnly={readOnly}
            className="w-14 h-7 text-xs text-center"
          />
        </div>
        <span className="text-[10px] text-muted-foreground">&times; {multiplier}</span>
      </div>
    </div>
  )
}

/* ── Section header ───────────────────────────────────────── */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
      {children}
    </h3>
  )
}

/* ── Main form ────────────────────────────────────────────── */
export function ScaForm({ scores, onChange, readOnly }: ScaFormProps) {
  const update = useCallback(
    (partial: Partial<ScaCuppingScores>) => {
      onChange({ ...scores, ...partial })
    },
    [scores, onChange]
  )

  const totalScore = useMemo(() => calculateScaTotalScore(scores), [scores])

  return (
    <div className="space-y-4">
      {/* ── Total Score Hero ── */}
      <div className="text-center py-6 rounded-xl bg-gradient-to-b from-primary/10 to-transparent border border-primary/15">
        <div className="text-5xl font-black tabular-nums tracking-tight">
          {totalScore.toFixed(2)}
        </div>
      </div>

      {/* ── Scored Attributes ── */}
      <SectionHeader>Scored Attributes</SectionHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AttributeBox
          label="Fragrance / Aroma"
          score={scores.fragrance_score}
          onScoreChange={(v) => update({ fragrance_score: v })}
          notes={scores.fragrance_notes}
          onNotesChange={(v) => update({ fragrance_notes: v })}
          readOnly={readOnly}
        >
          <div className="grid grid-cols-2 gap-3">
            <IntensitySlider
              label="Dry"
              value={scores.fragrance_dry}
              onChange={(v) => update({ fragrance_dry: v })}
              labels={['Low', 'High']}
              readOnly={readOnly}
            />
            <IntensitySlider
              label="Break"
              value={scores.fragrance_break}
              onChange={(v) => update({ fragrance_break: v })}
              labels={['Low', 'High']}
              readOnly={readOnly}
            />
          </div>
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
          <IntensitySlider
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
          <IntensitySlider
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
      </div>

      {/* ── Cup Evaluation ── */}
      <SectionHeader>Cup Evaluation</SectionHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
      </div>

      {/* ── Defects ── */}
      <SectionHeader>Defects</SectionHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
      </div>
    </div>
  )
}
