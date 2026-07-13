import { buildErrorCard, buildErrorView } from '../../ui/errorCard';

describe('buildErrorCard', () => {
  it('renders a single section with a red indicator and the message', () => {
    const blocks = buildErrorCard('Search is temporarily unavailable.');
    expect(blocks).toHaveLength(1);
    const json = JSON.stringify(blocks);
    expect(json).toContain('🔴');
    expect(json).toContain('Search is temporarily unavailable.');
  });

  it('adds a context block when a suggestion is provided', () => {
    const blocks = buildErrorCard('Down.', 'Try again in a moment.');
    expect(blocks).toHaveLength(2);
    expect(JSON.stringify(blocks)).toContain('Try again in a moment.');
  });

  it('omits the suggestion block when the suggestion is empty', () => {
    expect(buildErrorCard('Down.', '')).toHaveLength(1);
  });
});

describe('buildErrorView', () => {
  it('wraps the error card in a home view', () => {
    const view = buildErrorView('Dashboard unavailable.', 'Reopen the Home tab.');
    expect(view.type).toBe('home');
    const json = JSON.stringify(view);
    expect(json).toContain('Dashboard unavailable.');
    expect(json).toContain('Reopen the Home tab.');
  });
});
