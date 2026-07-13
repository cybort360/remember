import { schedule } from 'node-cron';
import type { WebClient } from '@slack/web-api';
import { searchContext } from '../services/rtsClient';
import { calculateFreshness } from '../services/freshnessScorer';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { SeasonalTriggerError } from '../utils/errors';
import { buildSeasonalBriefCard } from '../ui/seasonalBriefCard';
import type { RtsMessage, SeasonalBriefItem } from '../types';

const MAX_BRIEF_RESULTS = 10;
const MONTHS_LOOKBACK = 18;
const MAX_TOPIC_LENGTH = 120;
const MAX_SUMMARY_LENGTH = 300;
const MILLISECONDS_PER_SECOND = 1000;
// RTS is a semantic search, not a boolean engine — use a natural-language query
// (OR / quoted operators return no results).
const SEASONAL_SEARCH_TERMS = 'hurricane shelter protocol';
const SEASONAL_BRIEF_FALLBACK_TEXT = 'Hurricane Season Protocol Review';
const HURRICANE_BRIEF_CRON = '0 9 1 9 *';

function lookbackAfter(): number {
  const date = new Date();
  date.setMonth(date.getMonth() - MONTHS_LOOKBACK);
  return Math.floor(date.getTime() / MILLISECONDS_PER_SECOND);
}

function deriveTopic(message: RtsMessage): string {
  const firstLine = message.content.split('\n')[0].trim();
  if (firstLine.length === 0) {
    return 'Untitled thread';
  }
  return firstLine.length > MAX_TOPIC_LENGTH
    ? `${firstLine.slice(0, MAX_TOPIC_LENGTH).trimEnd()}…`
    : firstLine;
}

function deriveLastVerified(message: RtsMessage): Date | null {
  return message.messageTs.length > 0
    ? new Date(parseFloat(message.messageTs) * MILLISECONDS_PER_SECOND)
    : null;
}

function toSeasonalBriefItem(message: RtsMessage): SeasonalBriefItem {
  return {
    topic: deriveTopic(message),
    summary: message.content.slice(0, MAX_SUMMARY_LENGTH),
    freshnessScore: calculateFreshness(deriveLastVerified(message)),
    threadLink: message.permalink,
  };
}

export async function runHurricaneBrief(client: WebClient): Promise<void> {
  try {
    const messages = await searchContext(SEASONAL_SEARCH_TERMS, {
      limit: MAX_BRIEF_RESULTS,
      after: lookbackAfter(),
      includeContext: true,
    });
    const seenThreads = new Set<string>();
    const items = messages
      .filter((message) => {
        const threadText = [...message.contextBefore, message.content, ...message.contextAfter]
          .join('\n')
          .trim();
        const threadKey = `${message.channelId}:${threadText}`;
        if (threadText.length === 0 || seenThreads.has(threadKey)) {
          return false;
        }
        seenThreads.add(threadKey);
        return true;
      })
      .map(toSeasonalBriefItem);

    await client.chat.postMessage({
      channel: config.channels.hurricaneBrief,
      blocks: buildSeasonalBriefCard(items),
      text: SEASONAL_BRIEF_FALLBACK_TEXT,
    });

    logger.info('Hurricane brief posted to channel', { itemCount: items.length });
  } catch (error) {
    logger.error('Hurricane brief generation failed', { error });
    throw new SeasonalTriggerError('Hurricane brief generation failed.');
  }
}

async function runScheduledBrief(client: WebClient): Promise<void> {
  try {
    await runHurricaneBrief(client);
  } catch (error) {
    logger.error('Scheduled hurricane brief failed', { error });
  }
}

export function scheduleHurricaneBrief(client: WebClient): void {
  schedule(HURRICANE_BRIEF_CRON, () => {
    void runScheduledBrief(client);
  });
  logger.info('Hurricane brief scheduler started', { cron: HURRICANE_BRIEF_CRON });
}
