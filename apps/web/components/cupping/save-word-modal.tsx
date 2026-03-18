'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { addFlavorWord } from '@/actions/flavor-words'
import { useFlavorWords } from './flavor-words-provider'

interface SaveWordModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SaveWordModal({ isOpen, onClose }: SaveWordModalProps) {
  const { words, addWord } = useFlavorWords()
  const [newWord, setNewWord] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    const word = newWord.trim().toLowerCase()
    if (!word) return
    
    // Check for duplicates
    if (words.includes(word)) {
      setError('This word is already in your vocabulary')
      return
    }
    
    setSaving(true)
    setError(null)
    
    const result = await addFlavorWord(word)
    if (result.error) {
      setError(result.error)
    } else {
      await addWord(word)
      setNewWord('')
      onClose()
    }
    setSaving(false)
  }, [newWord, words, addWord, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [handleSave, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-[90%] max-w-sm relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Save New Word</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add a flavor descriptor to your vocabulary
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              value={newWord}
              onChange={(e) => {
                setNewWord(e.target.value)
                setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter flavor word..."
              autoFocus
              maxLength={100}
            />
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !newWord.trim()} 
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}