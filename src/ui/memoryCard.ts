import type { Block, KnownBlock } from '@slack/types';
import type { FreshnessScore, SearchResult } from '../types';

const FRESHNESS_INDICATORS: Record<FreshnessScore, string> = {
  GREEN: '🟢',
  YELLOW: '🟡',
  RED: '🔴',
};

const UNKNOWN_OWNER_TEXT = 'Unknown — check roster manually';
const ACTIVE_BADGE = '🟢 Active';
const INACTIVE_BADGE = '⚪ Inactive';
const NO_BADGE_TEXT = '—';
const NEVER_VERIFIED_TEXT = 'Never verified';
const VIEW_THREAD_LABEL = 'View original thread';
const VIEW_THREAD_ACTION_ID = 'view_original_thread';

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

function resolveSummary(result: SearchResult): string {
  return result.summary.trim().length > 0 ? result.summary : result.rawExcerpt;
}

function formatVerifiedDate(lastVerified: Date | null): string {
  if (lastVerified === null) {
    return NEVER_VERIFIED_TEXT;
  }
  return new Intl.DateTimeFormat('en-US', DATE_FORMAT_OPTIONS).format(lastVerified);
}

function formatOwner(result: SearchResult): string {
  if (result.decisionOwner === null) {
    return UNKNOWN_OWNER_TEXT;
  }
  return `${result.decisionOwner.name} — ${result.decisionOwner.role}`;
}

function formatOwnerBadge(result: SearchResult): string {
  if (result.decisionOwner === null) {
    return NO_BADGE_TEXT;
  }
  return result.ownerIsActive ? ACTIVE_BADGE : INACTIVE_BADGE;
}

export function buildMemoryCard(result: SearchResult): Block[] {
  const blocks: KnownBlock[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: resolveSummary(result) },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Freshness:*\n${FRESHNESS_INDICATORS[result.freshnessScore]} ${result.freshnessScore}`,
        },
        { type: 'mrkdwn', text: `*Last verified:*\n${formatVerifiedDate(result.lastVerified)}` },
        { type: 'mrkdwn', text: `*Decision owner:*\n${formatOwner(result)}` },
        { type: 'mrkdwn', text: `*Owner status:*\n${formatOwnerBadge(result)}` },
      ],
    },
  ];

  if (result.threadLink.trim().length > 0) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: VIEW_THREAD_LABEL },
          url: result.threadLink,
          action_id: VIEW_THREAD_ACTION_ID,
        },
      ],
    });
  }

  blocks.push({ type: 'divider' });

  return blocks;
}
