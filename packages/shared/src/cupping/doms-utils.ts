import type { DomsCuppingScores } from '../types/database'
import { getDefaultScaScores, calculateScaTotalScore } from './sca-utils'

export function getDefaultDomsScores(): DomsCuppingScores {
  return {
    ...getDefaultScaScores(),
    doms_sweetness_score: 5,
    doms_complexity_score: 5,
    doms_freshness_score: 5,
    doms_roast_level: 0,
    doms_flavor_notes: '',
    doms_aroma_notes: '',
  }
}

/**
 * Calculate the Dom's total score.
 * Same as SCA 100-point total — extra attributes are displayed separately.
 */
export function calculateDomsTotalScore(scores: DomsCuppingScores): number {
  return calculateScaTotalScore(scores)
}
