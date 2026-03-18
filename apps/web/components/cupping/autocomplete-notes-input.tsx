'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { ExpandableText } from '@/components/ui/expandable-text'
import { useFlavorWords } from './flavor-words-provider'
import {
  COMMON_FLAVOR_WORDS,
  getCurrentFragment,
  getEnteredWords,
  getSuggestions,
  applySelection,
  type Suggestion,
} from '@cuppingtraining/shared/flavor-words'

interface AutocompleteNotesInputProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  placeholder?: string
  className?: string
}

export function AutocompleteNotesInput({
  value,
  onChange,
  readOnly,
  placeholder,
  className = 'text-xs min-h-16 max-h-32 border-dashed resize-none overflow-y-auto break-words',
}: AutocompleteNotesInputProps) {
  const { words: customWords } = useFlavorWords()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Compute suggestions when value changes
  const updateSuggestions = useCallback(
    (input: string) => {
      const fragment = getCurrentFragment(input)
      if (fragment.length < 1) {
        setSuggestions([])
        setOpen(false)
        return
      }
      const entered = getEnteredWords(input)
      const results = getSuggestions(fragment, COMMON_FLAVOR_WORDS, customWords, entered)
      setSuggestions(results)
      setActiveIndex(0)
      setOpen(results.length > 0)
    },
    [customWords]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      onChange(newValue)
      updateSuggestions(newValue)
    },
    [onChange, updateSuggestions]
  )

  const selectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      const newValue = applySelection(value, suggestion.word)
      onChange(newValue)
      setOpen(false)
      setSuggestions([])
      textareaRef.current?.focus()
    },
    [value, onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || suggestions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % suggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        selectSuggestion(suggestions[activeIndex])
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    },
    [open, suggestions, activeIndex, selectSuggestion]
  )

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (readOnly) {
    const safeValue = value || ''
    
    if (!safeValue) {
      return (
        <Textarea
          value=""
          readOnly
          placeholder={placeholder}
          className={className}
        />
      )
    }
    
    return (
      <div className={`px-3 py-2 bg-muted/50 border rounded-md min-h-16 max-h-32 overflow-y-auto ${className}`}>
        <div className="text-xs leading-relaxed w-full break-words">
          {safeValue}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => updateSuggestions(value)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-md border bg-popover shadow-md">
          {suggestions.map((s, i) => (
            <button
              key={s.word}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                selectSuggestion(s)
              }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                i === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              }`}
            >
              <span>{s.word}</span>
              {s.isCustom && (
                <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                  custom
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
