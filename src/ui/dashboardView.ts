import type { KnownBlock, View } from '@slack/types';
import type { FreshnessScore, OrphanedDecision } from '../types';

const HOME_HEADER = 'REMEMBER — Disaster Response Memory';
const HEALTH_HEADER = 'Memory Health';
const ORPHAN_HEADER = 'Orphaned Decisions Needing Reassignment';
const NO_ORPHANS_TEXT = '✅ No orphaned decisions — every decision has an active owner.';
const HURRICANE_BRIEF_LABEL = 'Run Hurricane Brief';
const HURRICANE_BRIEF_ACTION_ID = 'run_hurricane_brief';

const FRESHNESS_INDICATORS: Record<FreshnessScore, string> = {
  GREEN: '🟢',
  YELLOW: '🟡',
  RED: '🔴',
};

function countByFreshness(freshnessScores: FreshnessScore[]): Record<FreshnessScore, number> {
  const counts: Record<FreshnessScore, number> = { GREEN: 0, YELLOW: 0, RED: 0 };
  for (const score of freshnessScores) {
    counts[score] += 1;
  }
  return counts;
}

function buildHealthBlock(freshnessScores: FreshnessScore[]): KnownBlock {
  const counts = countByFreshness(freshnessScores);
  const summary = `${FRESHNESS_INDICATORS.GREEN} *${counts.GREEN}* fresh   `
    + `${FRESHNESS_INDICATORS.YELLOW} *${counts.YELLOW}* aging   `
    + `${FRESHNESS_INDICATORS.RED} *${counts.RED}* stale`;
  return { type: 'section', text: { type: 'mrkdwn', text: summary } };
}

function buildOrphanBlock(orphan: OrphanedDecision): KnownBlock {
  const text = `*${orphan.decision.decisionTitle}*\n`
    + `Category: ${orphan.decision.category}  •  Former owner: ${orphan.formerOwnerName}\n`
    + `<${orphan.decision.slackThreadLink}|View original thread>`;
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

function buildOrphanSection(orphanedDecisions: OrphanedDecision[]): KnownBlock[] {
  if (orphanedDecisions.length === 0) {
    return [{ type: 'section', text: { type: 'mrkdwn', text: NO_ORPHANS_TEXT } }];
  }
  return orphanedDecisions.map(buildOrphanBlock);
}

export function buildDashboardView(
  decisionFreshness: FreshnessScore[],
  orphanedDecisions: OrphanedDecision[],
): View {
  const blocks: KnownBlock[] = [
    { type: 'header', text: { type: 'plain_text', text: HOME_HEADER } },
    { type: 'header', text: { type: 'plain_text', text: HEALTH_HEADER } },
    buildHealthBlock(decisionFreshness),
    { type: 'divider' },
    { type: 'header', text: { type: 'plain_text', text: ORPHAN_HEADER } },
    ...buildOrphanSection(orphanedDecisions),
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: HURRICANE_BRIEF_LABEL },
          action_id: HURRICANE_BRIEF_ACTION_ID,
        },
      ],
    },
  ];

  return { type: 'home', blocks };
}
