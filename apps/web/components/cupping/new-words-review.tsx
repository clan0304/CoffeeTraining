'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFlavorWords } from './flavor-words-provider'
import { COMMON_FLAVOR_WORDS, extractNewWordsFromSamples } from '@cuppingtraining/shared/flavor-words'
import type { ScaCuppingScores, SimpleCuppingScores, CuppingFormType } from '@cuppingtraining/shared/types'

interface NewWordsReviewProps {
  sampleScores: Array<{ scores: ScaCuppingScores | SimpleCuppingScores }>
  formType: CuppingFormType
}

export function NewWordsReview({ sampleScores, formType }: NewWordsReviewProps) {
  const { words: customWords, addWord } = useFlavorWords()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const newWords = useMemo(
    () => extractNewWordsFromSamples(sampleScores, formType, COMMON_FLAVOR_WORDS, customWords),
    [sampleScores, formType, customWords]
  )

  if (newWords.length === 0 || saved) return null

  const toggleWord = (word: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(word)) next.delete(word)
      else next.add(word)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(newWords))

  const handleSave = async () => {
    setSaving(true)
    for (const word of selected) {
      await addWord(word)
    }
    setSaving(false)
    setSaved(true)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">New Words Used</CardTitle>
        <p className="text-sm text-muted-foreground">
          Save new tasting notes to your vocabulary for future sessions
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {newWords.map((word) => {
            const isSelected = selected.has(word)
            return (
              <button
                key={word}
                type="button"
                onClick={() => toggleWord(word)}
                className={`px-3 py-1 rounded-full text-sm transition-colors border ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-transparent hover:border-muted-foreground/30'
                }`}
              >
                {word}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={selectAll}
            disabled={selected.size === newWords.length}
          >
            Select All
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={selected.size === 0 || saving}
          >
            {saving ? 'Saving...' : `Save ${selected.size} Word${selected.size === 1 ? '' : 's'}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
