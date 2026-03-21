'use client'

import { useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { AutocompleteNotesInput } from './autocomplete-notes-input'
import type { SimpleCuppingScores, OthersNotes } from '@cuppingtraining/shared/types'
import { calculateSimpleTotalScore } from '@cuppingtraining/shared/cupping'

interface SimpleFormProps {
  scores: SimpleCuppingScores
  onChange: (scores: SimpleCuppingScores) => void
  othersNotes?: OthersNotes | null
  onOthersNotesChange?: (notes: OthersNotes | null) => void
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

/* -- Star rating (1-5) --------------------------------------------------- */
function StarRating({
  value,
  onChange,
  readOnly,
}: {
  value: number
  onChange: (v: number) => void
  readOnly?: boolean
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange(star)}
          className={`text-2xl transition-colors ${
            readOnly ? 'cursor-default' : 'cursor-pointer'
          } ${star <= value ? 'text-amber-400' : 'text-muted-foreground/30'}`}
        >
          {star <= value ? '\u2605' : '\u2606'}
        </button>
      ))}
    </div>
  )
}

/* -- Attribute row -------------------------------------------------------- */
function AttributeRow({
  label,
  score,
  onScoreChange,
  notes,
  onNotesChange,
  placeholder,
  othersNotes,
  onOthersNotesChange,
  readOnly,
}: {
  label: string
  score: number
  onScoreChange: (v: number) => void
  notes: string
  onNotesChange: (v: string) => void
  placeholder: string
  othersNotes?: string
  onOthersNotesChange?: (v: string) => void
  readOnly?: boolean
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-lg font-bold tabular-nums">{score}<span className="text-xs font-normal text-muted-foreground">/5</span></span>
      </div>
      <div className="mb-2">
        <StarRating value={score} onChange={onScoreChange} readOnly={readOnly} />
      </div>
      <div className="space-y-3 mt-auto">
        {/* My Notes */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">My Notes</label>
          <AutocompleteNotesInput
            value={notes}
            onChange={onNotesChange}
            readOnly={readOnly}
            placeholder={placeholder}
          />
        </div>
        {/* Others' Notes */}
        {onOthersNotesChange && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Others' Notes</label>
            <textarea
              value={othersNotes || ''}
              onChange={(e) => onOthersNotesChange(e.target.value)}
              readOnly={readOnly}
              placeholder="e.g., John: citrus, bright\nSarah: chocolate notes"
              className="w-full min-h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </div>
    </div>
  )
}

/* -- Main form ------------------------------------------------------------ */
export function SimpleForm({ scores, onChange, othersNotes, onOthersNotesChange, readOnly }: SimpleFormProps) {
  const update = useCallback(
    (partial: Partial<SimpleCuppingScores>) => {
      onChange({ ...scores, ...partial })
    },
    [scores, onChange]
  )

  const updateOthersNotes = useCallback(
    (attribute: string, value: string) => {
      if (!onOthersNotesChange) return
      const key = `${attribute}_others` as keyof OthersNotes
      const newNotes = { ...(othersNotes || {}), [key]: value || undefined }
      // Clean up empty values
      Object.keys(newNotes).forEach(k => {
        if (!newNotes[k as keyof OthersNotes]) {
          delete newNotes[k as keyof OthersNotes]
        }
      })
      onOthersNotesChange(Object.keys(newNotes).length > 0 ? newNotes : null)
    },
    [othersNotes, onOthersNotesChange]
  )

  const totalScore = useMemo(() => calculateSimpleTotalScore(scores), [scores])

  return (
    <div className="space-y-4">
      {/* Total Score Hero (only show in readOnly mode) */}
      {readOnly && (
        <div className="text-center py-6 rounded-xl bg-gradient-to-b from-primary/10 to-transparent border border-primary/15">
          <div className="text-5xl font-black tabular-nums tracking-tight">
            {totalScore.toFixed(1)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">out of 5.0</div>
        </div>
      )}

      {/* Attribute rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:items-stretch">
        {ATTRIBUTES.map((attr) => (
          <AttributeRow
            key={attr.key}
            label={attr.label}
            score={scores[`${attr.key}_score` as `${AttributeKey}_score`]}
            onScoreChange={(v) => update({ [`${attr.key}_score`]: v } as Partial<SimpleCuppingScores>)}
            notes={scores[`${attr.key}_notes` as `${AttributeKey}_notes`]}
            onNotesChange={(v) => update({ [`${attr.key}_notes`]: v } as Partial<SimpleCuppingScores>)}
            othersNotes={othersNotes?.[`${attr.key}_others` as keyof OthersNotes]}
            onOthersNotesChange={onOthersNotesChange ? (v) => updateOthersNotes(attr.key, v) : undefined}
            placeholder={attr.placeholder}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* Overall notes */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <span className="text-sm font-medium">Overall Notes</span>
        
        {/* My Overall Notes */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">My Notes</label>
          <AutocompleteNotesInput
            value={scores.overall_notes}
            onChange={(v) => update({ overall_notes: v })}
            readOnly={readOnly}
            placeholder="General impressions..."
            className="text-xs min-h-16 border-dashed"
          />
        </div>

        {/* Others' Overall Notes */}
        {onOthersNotesChange && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Others' Notes</label>
            <textarea
              value={othersNotes?.overall_others || ''}
              onChange={(e) => updateOthersNotes('overall', e.target.value)}
              readOnly={readOnly}
              placeholder="e.g., John: well balanced\nSarah: a bit too acidic for me"
              className="w-full min-h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring border-dashed"
            />
          </div>
        )}
      </div>
    </div>
  )
}
