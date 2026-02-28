/**
 * Extract the text fragment currently being typed (after the last comma).
 */
export function getCurrentFragment(input: string): string {
  const parts = input.split(',')
  return (parts[parts.length - 1] || '').trimStart()
}

/**
 * Get words already entered (comma-separated, trimmed, lowercased).
 */
export function getEnteredWords(input: string): Set<string> {
  return new Set(
    input
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean)
  )
}

export interface Suggestion {
  word: string
  isCustom: boolean
}

/**
 * Get autocomplete suggestions for the current fragment.
 * Custom words are ranked first; starts-with matches before contains.
 */
export function getSuggestions(
  fragment: string,
  commonWords: string[],
  customWords: string[],
  enteredWords: Set<string>,
  limit = 8
): Suggestion[] {
  if (!fragment) return []

  const query = fragment.toLowerCase()
  const results: Suggestion[] = []

  // Helper to check and add a word
  const tryAdd = (word: string, isCustom: boolean, startsWithPhase: boolean) => {
    if (results.length >= limit) return
    const lower = word.toLowerCase()
    if (enteredWords.has(lower)) return
    if (results.some((r) => r.word.toLowerCase() === lower)) return
    if (startsWithPhase) {
      if (lower.startsWith(query)) results.push({ word, isCustom })
    } else {
      if (lower.includes(query) && !lower.startsWith(query)) {
        results.push({ word, isCustom })
      }
    }
  }

  // Phase 1: starts-with matches (custom first, then common)
  for (const w of customWords) tryAdd(w, true, true)
  for (const w of commonWords) tryAdd(w, false, true)

  // Phase 2: contains matches (custom first, then common)
  for (const w of customWords) tryAdd(w, true, false)
  for (const w of commonWords) tryAdd(w, false, false)

  return results.slice(0, limit)
}

/**
 * Replace the current fragment with the selected word + comma separator.
 */
export function applySelection(input: string, selectedWord: string): string {
  const parts = input.split(',')
  parts[parts.length - 1] = ` ${selectedWord}`
  // If first part, no leading space
  if (parts.length === 1) parts[0] = selectedWord
  return parts.join(',') + ', '
}
