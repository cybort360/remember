import { calculateFreshness } from '../../services/freshnessScorer';

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * MILLISECONDS_PER_DAY);
}

describe('calculateFreshness', () => {
  it('returns RED when lastVerified is null', () => {
    expect(calculateFreshness(null)).toBe('RED');
  });

  it('returns GREEN when verified 10 days ago', () => {
    expect(calculateFreshness(daysAgo(10))).toBe('GREEN');
  });

  it('returns GREEN when verified today', () => {
    expect(calculateFreshness(new Date())).toBe('GREEN');
  });

  it('returns YELLOW when verified exactly 30 days ago', () => {
    expect(calculateFreshness(daysAgo(30))).toBe('YELLOW');
  });

  it('returns YELLOW when verified exactly 180 days ago', () => {
    expect(calculateFreshness(daysAgo(180))).toBe('YELLOW');
  });

  it('returns RED when verified 181 days ago', () => {
    expect(calculateFreshness(daysAgo(181))).toBe('RED');
  });
});
