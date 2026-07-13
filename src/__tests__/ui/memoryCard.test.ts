import { buildMemoryCard } from '../../ui/memoryCard';
import type { SearchResult, VolunteerRecord } from '../../types';

const activeOwner: VolunteerRecord = {
  name: 'Maria Santos',
  slackUserId: 'U1',
  role: 'Shelter Coordinator',
  status: 'Active',
  joinDate: new Date('2024-01-01'),
  lastActiveDate: new Date('2026-06-01'),
};

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    threadLink: 'https://acme.slack.com/archives/C1/p1',
    summary: 'Keys are held by Maria Santos.',
    decisionOwner: activeOwner,
    ownerIsActive: true,
    freshnessScore: 'GREEN',
    lastVerified: new Date('2026-06-01'),
    rawExcerpt: 'raw excerpt fallback text',
    ...overrides,
  };
}

function render(result: SearchResult): string {
  return JSON.stringify(buildMemoryCard(result));
}

describe('buildMemoryCard', () => {
  it('renders the AI summary when one is present', () => {
    expect(render(makeResult())).toContain('Keys are held by Maria Santos.');
  });

  it('falls back to the raw excerpt when the summary is empty', () => {
    const json = render(makeResult({ summary: '' }));
    expect(json).toContain('raw excerpt fallback text');
  });

  it('shows the freshness indicator and score', () => {
    expect(render(makeResult({ freshnessScore: 'GREEN' }))).toContain('🟢 GREEN');
    expect(render(makeResult({ freshnessScore: 'RED' }))).toContain('🔴 RED');
  });

  it('shows the decision owner name and role when present', () => {
    const json = render(makeResult());
    expect(json).toContain('Maria Santos');
    expect(json).toContain('Shelter Coordinator');
  });

  it('shows "Unknown — check roster manually" when the owner is null', () => {
    const json = render(makeResult({ decisionOwner: null, ownerIsActive: false }));
    expect(json).toContain('Unknown — check roster manually');
  });

  it('shows the Active badge for an active owner and Inactive otherwise', () => {
    expect(render(makeResult({ ownerIsActive: true }))).toContain('🟢 Active');
    expect(render(makeResult({ ownerIsActive: false }))).toContain('⚪ Inactive');
  });

  it('includes a View original thread button when a threadLink is set', () => {
    const json = render(makeResult());
    expect(json).toContain('view_original_thread');
    expect(json).toContain('https://acme.slack.com/archives/C1/p1');
  });

  it('omits the button when threadLink is empty', () => {
    expect(render(makeResult({ threadLink: '' }))).not.toContain('view_original_thread');
  });

  it('shows "Never verified" when lastVerified is null', () => {
    expect(render(makeResult({ lastVerified: null }))).toContain('Never verified');
  });
});
