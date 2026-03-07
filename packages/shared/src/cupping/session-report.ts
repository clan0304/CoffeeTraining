import type {
  CuppingSample,
  CuppingScore,
  ScaCuppingScores,
  SimpleCuppingScores,
  DomsCuppingScores,
  CuppingFormType,
} from '../types/database'

export interface WordFrequency {
  word: string
  count: number
}

export interface CoffeePlayerScore {
  username: string
  totalScore: number
}

export interface CoffeePlayerNotes {
  username: string
  notes: string[]
}

export interface CoffeeSummary {
  coffeeLabel: string
  coffeeName: string
  avgScore: number
  highestScore: number
  lowestScore: number
  scoreRange: number
  playerScores: CoffeePlayerScore[]
}

export interface CoffeeNotes {
  coffeeLabel: string
  coffeeName: string
  topWords: WordFrequency[]
  playerNotes: CoffeePlayerNotes[]
}

export interface AttributeAverage {
  attribute: string
  average: number
}

export interface ScoreDistribution {
  min: number
  max: number
  avg: number
  median: number
}

export interface SessionReport {
  totalCoffees: number
  playerCount: number
  formType: CuppingFormType
  coffeeSummaries: CoffeeSummary[]
  attributeAverages: AttributeAverage[]
  coffeeNotes: CoffeeNotes[]
  overallScoreDistribution: ScoreDistribution
}

const SIMPLE_SCORE_ATTRS: { key: keyof SimpleCuppingScores; label: string }[] = [
  { key: 'aroma_score', label: 'Aroma' },
  { key: 'acidity_score', label: 'Acidity' },
  { key: 'sweetness_score', label: 'Sweetness' },
  { key: 'body_score', label: 'Body' },
  { key: 'aftertaste_score', label: 'Aftertaste' },
]

const SCA_SCORE_ATTRS: { key: keyof ScaCuppingScores; label: string }[] = [
  { key: 'fragrance_score', label: 'Fragrance/Aroma' },
  { key: 'flavor_score', label: 'Flavor' },
  { key: 'aftertaste_score', label: 'Aftertaste' },
  { key: 'acidity_score', label: 'Acidity' },
  { key: 'body_score', label: 'Body' },
  { key: 'balance_score', label: 'Balance' },
  { key: 'overall_score', label: 'Overall' },
]

const SIMPLE_NOTES_KEYS: (keyof SimpleCuppingScores)[] = [
  'aroma_notes', 'acidity_notes', 'sweetness_notes',
  'body_notes', 'aftertaste_notes', 'overall_notes',
]

const SCA_NOTES_KEYS: (keyof ScaCuppingScores)[] = [
  'fragrance_notes', 'flavor_notes', 'aftertaste_notes',
  'acidity_notes', 'body_notes', 'balance_notes',
  'overall_notes', 'uniformity_notes', 'clean_cup_notes', 'sweetness_notes',
]

const DOMS_EXTRA_SCORE_ATTRS: { key: keyof DomsCuppingScores; label: string }[] = [
  { key: 'doms_sweetness_score', label: 'Sweetness (Dom\'s)' },
  { key: 'doms_complexity_score', label: 'Complexity (Dom\'s)' },
  { key: 'doms_freshness_score', label: 'Freshness (Dom\'s)' },
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

function getNotesFromScore(
  scores: ScaCuppingScores | SimpleCuppingScores | DomsCuppingScores,
  formType: CuppingFormType
): string[] {
  const keys = formType === 'simple' ? SIMPLE_NOTES_KEYS : formType === 'doms' ? DOMS_NOTES_KEYS : SCA_NOTES_KEYS
  const words: string[] = []
  for (const key of keys) {
    const value = (scores as unknown as Record<string, unknown>)[key]
    if (typeof value === 'string' && value.trim()) {
      words.push(...parseNotes(value))
    }
  }
  return words
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

export function generateSessionReport(
  samples: Array<CuppingSample & { coffeeName: string; coffeeLabel: string }>,
  scores: Array<CuppingScore & { username: string; sampleNumber: number }>
): SessionReport {
  // Determine form type from first score
  const formType: CuppingFormType = scores[0]?.form_type || 'simple'
  const usernames = Array.from(new Set(scores.map((s) => s.username)))
  const playerCount = usernames.length
  const totalCoffees = samples.length

  // All total scores
  const allTotalScores = scores
    .map((s) => s.total_score)
    .filter((s): s is number => s !== null && s !== undefined)

  // Coffee summaries
  const coffeeSummaries: CoffeeSummary[] = samples.map((sample) => {
    const sampleScores = scores.filter(
      (s) => s.sampleNumber === sample.sample_number
    )
    const totals = sampleScores
      .map((s) => s.total_score)
      .filter((s): s is number => s !== null && s !== undefined)

    const avgScore = totals.length > 0
      ? totals.reduce((a, b) => a + b, 0) / totals.length
      : 0
    const highestScore = totals.length > 0 ? Math.max(...totals) : 0
    const lowestScore = totals.length > 0 ? Math.min(...totals) : 0

    return {
      coffeeLabel: sample.coffeeLabel,
      coffeeName: sample.coffeeName,
      avgScore: Math.round(avgScore * 100) / 100,
      highestScore,
      lowestScore,
      scoreRange: Math.round((highestScore - lowestScore) * 100) / 100,
      playerScores: sampleScores.map((s) => ({
        username: s.username,
        totalScore: s.total_score || 0,
      })),
    }
  })

  // Attribute averages (across all scores)
  const scoreAttrs = formType === 'simple'
    ? SIMPLE_SCORE_ATTRS
    : formType === 'doms'
      ? [...SCA_SCORE_ATTRS, ...DOMS_EXTRA_SCORE_ATTRS]
      : SCA_SCORE_ATTRS
  const attributeAverages: AttributeAverage[] = scoreAttrs.map(({ key, label }) => {
    const values: number[] = []
    for (const score of scores) {
      const val = (score.scores as unknown as Record<string, unknown>)[key]
      if (typeof val === 'number') {
        values.push(val)
      }
    }
    const avg = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0

    return {
      attribute: label,
      average: Math.round(avg * 100) / 100,
    }
  })

  // Coffee notes
  const coffeeNotes: CoffeeNotes[] = samples.map((sample) => {
    const sampleScores = scores.filter(
      (s) => s.sampleNumber === sample.sample_number
    )

    // Word frequency across all players for this sample
    const wordCounts = new Map<string, number>()
    const playerNotes: CoffeePlayerNotes[] = []

    for (const score of sampleScores) {
      const words = getNotesFromScore(score.scores, formType)
      const uniqueWords = Array.from(new Set(words))
      for (const word of uniqueWords) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      }
      if (words.length > 0) {
        playerNotes.push({
          username: score.username,
          notes: Array.from(new Set(words)),
        })
      }
    }

    const topWords = Array.from(wordCounts.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
      .slice(0, 10)

    return {
      coffeeLabel: sample.coffeeLabel,
      coffeeName: sample.coffeeName,
      topWords,
      playerNotes,
    }
  })

  // Overall score distribution
  const overallScoreDistribution: ScoreDistribution = {
    min: allTotalScores.length > 0 ? Math.min(...allTotalScores) : 0,
    max: allTotalScores.length > 0 ? Math.max(...allTotalScores) : 0,
    avg: allTotalScores.length > 0
      ? Math.round(
          (allTotalScores.reduce((a, b) => a + b, 0) / allTotalScores.length) * 100
        ) / 100
      : 0,
    median: Math.round(median(allTotalScores) * 100) / 100,
  }

  return {
    totalCoffees,
    playerCount,
    formType,
    coffeeSummaries,
    attributeAverages,
    coffeeNotes,
    overallScoreDistribution,
  }
}
