import type { ScaCuppingScores, SimpleCuppingScores, DomsCuppingScores, CuppingFormType } from '../types/database'

const SIMPLE_NOTES_KEYS: (keyof SimpleCuppingScores)[] = [
  'aroma_notes',
  'acidity_notes',
  'sweetness_notes',
  'body_notes',
  'aftertaste_notes',
  'overall_notes',
]

const SCA_NOTES_KEYS: (keyof ScaCuppingScores)[] = [
  'fragrance_notes',
  'flavor_notes',
  'aftertaste_notes',
  'acidity_notes',
  'body_notes',
  'balance_notes',
  'overall_notes',
  'uniformity_notes',
  'clean_cup_notes',
  'sweetness_notes',
]

const DOMS_NOTES_KEYS: string[] = [
  ...SCA_NOTES_KEYS,
  'doms_flavor_notes',
  'doms_aroma_notes',
]

function parseNotes(text: string): string[] {
  return text
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0)
}

/**
 * Extract all unique words from a score object's notes fields.
 */
export function extractWordsFromScores(
  scores: ScaCuppingScores | SimpleCuppingScores | DomsCuppingScores,
  formType: CuppingFormType
): string[] {
  const keys = formType === 'simple' ? SIMPLE_NOTES_KEYS : formType === 'doms' ? DOMS_NOTES_KEYS : SCA_NOTES_KEYS
  const allWords = new Set<string>()

  for (const key of keys) {
    const value = (scores as unknown as Record<string, unknown>)[key]
    if (typeof value === 'string' && value.trim()) {
      for (const word of parseNotes(value)) {
        allWords.add(word)
      }
    }
  }

  return Array.from(allWords).sort()
}

/**
 * Extract words from scores that are NOT in common or custom word lists.
 */
export function extractNewWords(
  scores: ScaCuppingScores | SimpleCuppingScores | DomsCuppingScores,
  formType: CuppingFormType,
  commonWords: string[],
  customWords: string[]
): string[] {
  const allUsed = extractWordsFromScores(scores, formType)
  const knownSet = new Set([
    ...commonWords.map((w) => w.toLowerCase()),
    ...customWords.map((w) => w.toLowerCase()),
  ])

  return allUsed.filter((w) => !knownSet.has(w))
}

/**
 * Extract new words across multiple sample scores.
 */
export function extractNewWordsFromSamples(
  sampleScores: Array<{ scores: ScaCuppingScores | SimpleCuppingScores | DomsCuppingScores }>,
  formType: CuppingFormType,
  commonWords: string[],
  customWords: string[]
): string[] {
  const knownSet = new Set([
    ...commonWords.map((w) => w.toLowerCase()),
    ...customWords.map((w) => w.toLowerCase()),
  ])

  const newWords = new Set<string>()

  for (const sample of sampleScores) {
    for (const word of extractWordsFromScores(sample.scores, formType)) {
      if (!knownSet.has(word)) {
        newWords.add(word)
      }
    }
  }

  return Array.from(newWords).sort()
}
