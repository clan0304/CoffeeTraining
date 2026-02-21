import type { SimpleCuppingScores } from '../types/database'

export function getDefaultSimpleScores(): SimpleCuppingScores {
  return {
    aroma_score: 3,
    aroma_notes: '',
    acidity_score: 3,
    acidity_notes: '',
    sweetness_score: 3,
    sweetness_notes: '',
    body_score: 3,
    body_notes: '',
    aftertaste_score: 3,
    aftertaste_notes: '',
    overall_notes: '',
  }
}

/**
 * Calculate the simple total score.
 * Average of the 5 attribute scores (result: 1.0–5.0).
 */
export function calculateSimpleTotalScore(scores: SimpleCuppingScores): number {
  const sum =
    scores.aroma_score +
    scores.acidity_score +
    scores.sweetness_score +
    scores.body_score +
    scores.aftertaste_score

  return Math.round((sum / 5) * 100) / 100
}
