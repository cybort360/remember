import type { Block, KnownBlock } from '@slack/types';
import type { FreshnessScore, SeasonalBriefItem } from '../types';

const BRIEF_HEADER = '🌀 Hurricane Season Protocol Review';
const BRIEF_FOOTER = 'This brief was generated automatically by REMEMBER';
const NO_ITEMS_TEXT = 'No hurricane-related decisions found in the last 18 months.';
const NO_THREAD_LINK_TEXT = 'No thread link available';

const FRESHNESS_INDICATORS: Record<FreshnessScore, string> = {
  GREEN: '🟢',
  YELLOW: '🟡',
  RED: '🔴',
};

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

function buildSubheaderBlock(): KnownBlock {
  const today = new Intl.DateTimeFormat('en-US', DATE_FORMAT_OPTIONS).format(new Date());
  return { type: 'context', elements: [{ type: 'mrkdwn', text: `Generated ${today}` }] };
}

function buildThreadLink(threadLink: string): string {
  return threadLink.trim().length > 0
    ? `<${threadLink}|View original thread>`
    : NO_THREAD_LINK_TEXT;
}

function buildItemBlock(item: SeasonalBriefItem): KnownBlock {
  const text = `*${item.topic}*\n`
    + `${item.summary}\n`
    + `${FRESHNESS_INDICATORS[item.freshnessScore]} ${item.freshnessScore}  •  ${buildThreadLink(item.threadLink)}`;
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

export function buildSeasonalBriefCard(items: SeasonalBriefItem[]): Block[] {
  const blocks: KnownBlock[] = [
    { type: 'header', text: { type: 'plain_text', text: BRIEF_HEADER } },
    buildSubheaderBlock(),
    { type: 'divider' },
  ];

  if (items.length === 0) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: NO_ITEMS_TEXT } });
  } else {
    for (const item of items) {
      blocks.push(buildItemBlock(item));
    }
  }

  blocks.push({ type: 'divider' });
  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: BRIEF_FOOTER }] });

  return blocks;
}
