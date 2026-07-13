import { buildSeasonalBriefCard } from '../../ui/seasonalBriefCard';
import type { SeasonalBriefItem } from '../../types';

const item: SeasonalBriefItem = {
  topic: 'Backup generator maintenance contract',
  summary: 'Signed with PowerGrid Solutions, 2-hour emergency callout.',
  freshnessScore: 'RED',
  threadLink: 'https://acme.slack.com/archives/C1/p1',
};

describe('buildSeasonalBriefCard', () => {
  it('renders the header and auto-generated footer', () => {
    const json = JSON.stringify(buildSeasonalBriefCard([]));
    expect(json).toContain('Hurricane Season Protocol Review');
    expect(json).toContain('This brief was generated automatically by REMEMBER');
  });

  it('shows an empty-state message when there are no items', () => {
    expect(JSON.stringify(buildSeasonalBriefCard([]))).toContain('No hurricane-related decisions');
  });

  it('renders each item with topic, summary, freshness, and thread link', () => {
    const json = JSON.stringify(buildSeasonalBriefCard([item]));
    expect(json).toContain('Backup generator maintenance contract');
    expect(json).toContain('PowerGrid Solutions');
    expect(json).toContain('🔴 RED');
    expect(json).toContain('https://acme.slack.com/archives/C1/p1');
  });
});
