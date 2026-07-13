import { buildDashboardView } from '../../ui/dashboardView';
import type { OrphanedDecision } from '../../types';

const orphan: OrphanedDecision = {
  decision: {
    decisionTitle: 'Shelter keyholder — Westside',
    slackThreadLink: 'https://acme.slack.com/archives/C1/p1',
    ownerSlackId: 'U2',
    category: 'Shelter',
    lastVerified: null,
    status: 'Orphaned',
  },
  formerOwnerName: 'James Webb',
  formerOwnerSlackId: 'U2',
};

describe('buildDashboardView', () => {
  it('returns a home view with the header and brief button', () => {
    const view = buildDashboardView([], []);
    expect(view.type).toBe('home');
    const json = JSON.stringify(view);
    expect(json).toContain('REMEMBER — Disaster Response Memory');
    expect(json).toContain('run_hurricane_brief');
    expect(json).toContain('Run Hurricane Brief');
  });

  it('counts decision freshness scores', () => {
    const json = JSON.stringify(buildDashboardView(['GREEN', 'GREEN', 'RED'], []));
    expect(json).toContain('🟢 *2*');
    expect(json).toContain('🟡 *0*');
    expect(json).toContain('🔴 *1*');
  });

  it('shows the all-clear message when there are no orphaned decisions', () => {
    expect(JSON.stringify(buildDashboardView([], []))).toContain('No orphaned decisions');
  });

  it('lists orphaned decisions with title and former owner', () => {
    const json = JSON.stringify(buildDashboardView([], [orphan]));
    expect(json).toContain('Shelter keyholder — Westside');
    expect(json).toContain('James Webb');
    expect(json).not.toContain('No orphaned decisions');
  });
});
