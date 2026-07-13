import type { Block, KnownBlock } from '@slack/types';
import type { OrphanedDecision } from '../types';

const ALERT_HEADER = '🚨 Orphaned Decisions Need a New Owner';
const REASSIGN_PROMPT = 'Who owns this now? Reply in thread.';
const NO_THREAD_LINK_TEXT = 'No thread link available';

function buildThreadLink(slackThreadLink: string): string {
  return slackThreadLink.trim().length > 0
    ? `<${slackThreadLink}|View original thread>`
    : NO_THREAD_LINK_TEXT;
}

function buildDecisionBlock(orphan: OrphanedDecision): KnownBlock {
  const text = `*${orphan.decision.decisionTitle}*\n`
    + `Former owner: ${orphan.formerOwnerName}\n`
    + `${buildThreadLink(orphan.decision.slackThreadLink)}\n`
    + REASSIGN_PROMPT;
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

export function buildOrphanAlertCard(decisions: OrphanedDecision[]): Block[] {
  const blocks: KnownBlock[] = [
    { type: 'header', text: { type: 'plain_text', text: ALERT_HEADER } },
  ];

  for (const orphan of decisions) {
    blocks.push(buildDecisionBlock(orphan));
    blocks.push({ type: 'divider' });
  }

  return blocks;
}
