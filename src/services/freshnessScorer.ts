import type { FreshnessScore } from '../types';

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

const FRESHNESS_THRESHOLDS = { GREEN: 30, YELLOW: 180 } as const;

export function calculateFreshness(lastVerified: Date | null): FreshnessScore {
  if (lastVerified === null) {
    return 'RED';
  }

  const ageInDays = Math.floor((Date.now() - lastVerified.getTime()) / MILLISECONDS_PER_DAY);

  if (ageInDays < FRESHNESS_THRESHOLDS.GREEN) {
    return 'GREEN';
  }

  if (ageInDays <= FRESHNESS_THRESHOLDS.YELLOW) {
    return 'YELLOW';
  }

  return 'RED';
}
