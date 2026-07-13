import { buildOrphanAlertCard } from '../../ui/orphanAlertCard';
import type { OrphanedDecision } from '../../types';

function orphan(title: string, formerOwnerName: string): OrphanedDecision {
  return {
    decision: {
      decisionTitle: title,
      slackThreadLink: 'https://acme.slack.com/archives/C1/p1',
      ownerSlackId: 'U2',
      category: 'Shelter',
      lastVerified: null,
      status: 'Orphaned',
    },
    formerOwnerName,
    formerOwnerSlackId: 'U2',
  };
}

describe('buildOrphanAlertCard', () => {
  it('renders the alert header', () => {
    expect(JSON.stringify(buildOrphanAlertCard([]))).toContain('Orphaned Decisions Need a New Owner');
  });

  it('lists each decision with title, former owner, and the reassign prompt', () => {
    const json = JSON.stringify(buildOrphanAlertCard([orphan('Shelter keyholder — Westside', 'James Webb')]));
    expect(json).toContain('Shelter keyholder — Westside');
    expect(json).toContain('James Webb');
    expect(json).toContain('Who owns this now? Reply in thread.');
    expect(json).toContain('https://acme.slack.com/archives/C1/p1');
  });

  it('renders one section per decision', () => {
    const blocks = buildOrphanAlertCard([orphan('A', 'Owner A'), orphan('B', 'Owner B')]);
    const sections = blocks.filter((block) => block.type === 'section');
    expect(sections).toHaveLength(2);
  });
});
