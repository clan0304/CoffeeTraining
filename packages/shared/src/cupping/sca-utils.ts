import type { ScaCuppingScores } from '../types/database'

export function getDefaultScaScores(): ScaCuppingScores {
  return {
    fragrance_dry: 0,
    fragrance_break: 0,
    fragrance_score: 6,
    fragrance_notes: '',
    flavor_score: 6,
    flavor_notes: '',
    aftertaste_score: 6,
    aftertaste_notes: '',
    acidity_score: 6,
    acidity_intensity: 3,
    acidity_notes: '',
    body_score: 6,
    body_level: 3,
    body_notes: '',
    balance_score: 6,
    balance_notes: '',
    overall_score: 6,
    overall_notes: '',
    uniformity_cups: [true, true, true, true, true],
    uniformity_notes: '',
    clean_cup_cups: [true, true, true, true, true],
    clean_cup_notes: '',
    sweetness_cups: [true, true, true, true, true],
    sweetness_notes: '',
    defects_taint_cups: 0,
    defects_taint_intensity: 0,
    defects_fault_cups: 0,
    defects_fault_intensity: 0,
  }
}

/**
 * Calculate the SCA total score.
 *
 * Total = sum of 7 scored attributes
 *       + uniformity (count true × 2)
 *       + clean cup (count true × 2)
 *       + sweetness (count true × 2)
 *       − taint defects (cups × intensity × 2)
 *       − fault defects (cups × intensity × 4)
 */
export function calculateScaTotalScore(scores: ScaCuppingScores): number {
  const scoredAttributes =
    scores.fragrance_score +
    scores.flavor_score +
    scores.aftertaste_score +
    scores.acidity_score +
    scores.body_score +
    scores.balance_score +
    scores.overall_score

  const uniformity = scores.uniformity_cups.filter(Boolean).length * 2
  const cleanCup = scores.clean_cup_cups.filter(Boolean).length * 2
  const sweetness = scores.sweetness_cups.filter(Boolean).length * 2

  const taintDefects = scores.defects_taint_cups * scores.defects_taint_intensity * 2
  const faultDefects = scores.defects_fault_cups * scores.defects_fault_intensity * 4

  return scoredAttributes + uniformity + cleanCup + sweetness - taintDefects - faultDefects
}

/** Score quality descriptor */
export function getScoreDescriptor(total: number): string {
  if (total >= 90) return 'Outstanding'
  if (total >= 85) return 'Excellent'
  if (total >= 80) return 'Very Good'
  if (total >= 75) return 'Good'
  if (total >= 70) return 'Fair'
  if (total >= 60) return 'Average'
  return 'Below Average'
}

/** Generate the 0.25-step score options from 6.00 to 10.00 */
export function getScoreOptions(): number[] {
  const options: number[] = []
  for (let i = 600; i <= 1000; i += 25) {
    options.push(i / 100)
  }
  return options
}
