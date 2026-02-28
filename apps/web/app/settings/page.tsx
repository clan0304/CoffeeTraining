'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getUserFlavorWords, addFlavorWord, removeFlavorWord } from '@/actions/flavor-words'

export default function SettingsPage() {
  const [words, setWords] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    getUserFlavorWords()
      .then((res) => setWords(res.words))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = useCallback(async () => {
    const word = draft.trim().toLowerCase()
    if (!word) return
    setAdding(true)
    const result = await addFlavorWord(word)
    if (!result.error) {
      setWords((prev) => (prev.includes(word) ? prev : [...prev, word].sort()))
      setDraft('')
    }
    setAdding(false)
  }, [draft])

  const handleRemove = useCallback(async (word: string) => {
    const result = await removeFlavorWord(word)
    if (!result.error) {
      setWords((prev) => prev.filter((w) => w !== word))
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAdd()
      }
    },
    [handleAdd]
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Flavor Vocabulary</h2>
          <p className="text-sm text-muted-foreground">
            Add custom flavor words that will appear in autocomplete suggestions when taking cupping notes.
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a flavor word..."
            className="flex-1"
            maxLength={100}
          />
          <Button onClick={handleAdd} disabled={adding || !draft.trim()}>
            {adding ? 'Adding...' : 'Add'}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : words.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom words yet. Common SCA Flavor Wheel words are always available in autocomplete.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {words.map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-3 py-1 text-sm"
              >
                {word}
                <button
                  type="button"
                  onClick={() => handleRemove(word)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${word}`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
