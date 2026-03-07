'use client'

import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { ScaForm } from './sca-form'
import { AutocompleteNotesInput } from './autocomplete-notes-input'
import type { DomsCuppingScores, ScaCuppingScores } from '@cuppingtraining/shared/types'

interface DomsFormProps {
  scores: DomsCuppingScores
  onChange: (scores: DomsCuppingScores) => void
  readOnly?: boolean
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
      {children}
    </h3>
  )
}

function DomsSlider({
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
  const fill = ((value - 1) / 9) * 100
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground tabular-nums">1</span>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={readOnly}
          className="score-slider flex-1"
          style={{ '--fill': `${fill}%` } as React.CSSProperties}
        />
        <span className="text-[10px] text-muted-foreground tabular-nums">10</span>
      </div>
    </div>
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
    <div className="space-y-4">
      {/* SCA portion */}
      <ScaForm scores={scores} onChange={handleScaChange} readOnly={readOnly} />

      {/* Dom's Extra Attributes */}
      <SectionHeader>Dom&apos;s Extra Attributes</SectionHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DomsSlider
          label="Sweetness"
          value={scores.doms_sweetness_score}
          onChange={(v) => update({ doms_sweetness_score: v })}
          readOnly={readOnly}
        />
        <DomsSlider
          label="Complexity"
          value={scores.doms_complexity_score}
          onChange={(v) => update({ doms_complexity_score: v })}
          readOnly={readOnly}
        />
        <DomsSlider
          label="Freshness"
          value={scores.doms_freshness_score}
          onChange={(v) => update({ doms_freshness_score: v })}
          readOnly={readOnly}
        />
      </div>

      {/* Roast Level */}
      <SectionHeader>Roast Level</SectionHeader>
      <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
        <span className="text-sm font-medium">Agtron</span>
        <Input
          type="number"
          min={0}
          max={100}
          value={scores.doms_roast_level}
          onChange={(e) => update({ doms_roast_level: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
          readOnly={readOnly}
          className="w-20 h-8 text-center text-sm"
        />
      </div>

      {/* General Notes */}
      <SectionHeader>General Notes</SectionHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border bg-card p-4 flex flex-col gap-2">
          <span className="text-sm font-medium">F (Flavor)</span>
          <AutocompleteNotesInput
            value={scores.doms_flavor_notes}
            onChange={(v) => update({ doms_flavor_notes: v })}
            readOnly={readOnly}
            placeholder="Flavor notes..."
            className="text-xs h-7 border-dashed"
          />
        </div>
        <div className="rounded-lg border bg-card p-4 flex flex-col gap-2">
          <span className="text-sm font-medium">A (Aroma)</span>
          <AutocompleteNotesInput
            value={scores.doms_aroma_notes}
            onChange={(v) => update({ doms_aroma_notes: v })}
            readOnly={readOnly}
            placeholder="Aroma notes..."
            className="text-xs h-7 border-dashed"
          />
        </div>
      </div>
    </div>
  )
}
