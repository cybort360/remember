import type { WebClient } from '@slack/web-api';
import { searchContext } from './rtsClient';
import { findVolunteerBySlackId } from './rosterService';
import { calculateFreshness } from './freshnessScorer';
import { logger } from '../utils/logger';
import { MemorySearchError } from '../utils/errors';
import type { RtsMessage, SearchResult, VolunteerRecord } from '../types';

const MAX_SEARCH_RESULTS = 5;
const RAW_EXCERPT_LENGTH = 300;
const MILLISECONDS_PER_SECOND = 1000;
const SLACK_SUMMARIZE_METHOD = 'assistant.threads.summarize';

function slackTsToDate(ts: string): Date {
  return new Date(parseFloat(ts) * MILLISECONDS_PER_SECOND);
}

function buildThreadText(message: RtsMessage): string {
  return [...message.contextBefore, message.content, ...message.contextAfter].join('\n').trim();
}

function buildRawExcerpt(threadText: string): string {
  return threadText.slice(0, RAW_EXCERPT_LENGTH);
}

function extractSummaryText(response: unknown): string | null {
  if (typeof response !== 'object' || response === null) {
    return null;
  }
  const summary: unknown = (response as Record<string, unknown>).summary;
  return typeof summary === 'string' && summary.trim().length > 0 ? summary : null;
}

async function runMemorySearch(query: string, userId: string): Promise<RtsMessage[]> {
  try {
    return await searchContext(query, { limit: MAX_SEARCH_RESULTS, includeContext: true });
  } catch (error) {
    logger.error('Memory search failed', { userId, query, error });
    throw new MemorySearchError('Search is temporarily unavailable.');
  }
}

async function resolveDecisionOwner(
  ownerSlackId: string,
  query: string,
  userId: string,
): Promise<{ owner: VolunteerRecord | null; isActive: boolean }> {
  if (ownerSlackId.length === 0) {
    return { owner: null, isActive: false };
  }
  try {
    const owner = await findVolunteerBySlackId(ownerSlackId);
    return { owner, isActive: owner?.status === 'Active' };
  } catch (error) {
    logger.warn('Roster lookup failed, continuing without owner', { userId, query, ownerSlackId, error });
    return { owner: null, isActive: false };
  }
}

async function summarizeThread(
  client: WebClient,
  threadText: string,
  query: string,
  userId: string,
): Promise<string | null> {
  if (threadText.trim().length === 0) {
    return null;
  }
  try {
    const response = await client.apiCall(SLACK_SUMMARIZE_METHOD, { content: threadText });
    return extractSummaryText(response);
  } catch (error) {
    logger.warn('Slack AI summarization failed, falling back to raw excerpt', { userId, query, error });
    return null;
  }
}

async function buildSearchResult(
  client: WebClient,
  message: RtsMessage,
  query: string,
  userId: string,
): Promise<SearchResult> {
  const threadText = buildThreadText(message);
  const { owner, isActive } = await resolveDecisionOwner(message.authorUserId, query, userId);
  const lastVerified = message.messageTs.length > 0 ? slackTsToDate(message.messageTs) : null;
  const summary = await summarizeThread(client, threadText, query, userId);

  return {
    threadLink: message.permalink,
    summary: summary ?? '',
    decisionOwner: owner,
    ownerIsActive: isActive,
    freshnessScore: calculateFreshness(lastVerified),
    lastVerified,
    rawExcerpt: buildRawExcerpt(threadText),
  };
}

export async function searchMemory(
  query: string,
  userId: string,
  client: WebClient,
): Promise<SearchResult[]> {
  const messages = await runMemorySearch(query, userId);
  // Filter the raw RTS hits down to distinct, useful memories:
  //  - drop the asker's own message (e.g. the @mention that triggered this search)
  //  - drop empty-content hits (e.g. the bot's own Block Kit answer posts)
  //  - collapse multiple hits from the same thread (RTS returns no thread_ts, but
  //    context-expanded hits from one thread share the same rebuilt thread text)
  const seenThreads = new Set<string>();
  const memories = messages.filter((message) => {
    if (message.authorUserId === userId) {
      return false;
    }
    const threadText = buildThreadText(message);
    if (threadText.length === 0) {
      return false;
    }
    const threadKey = `${message.channelId}:${threadText}`;
    if (seenThreads.has(threadKey)) {
      return false;
    }
    seenThreads.add(threadKey);
    return true;
  });

  if (memories.length === 0) {
    logger.info('Memory search returned no results', { userId, query });
    return [];
  }

  const results = await Promise.all(
    memories.map((message) => buildSearchResult(client, message, query, userId)),
  );
  logger.info('Memory search completed', { userId, query, resultCount: results.length });
  return results;
}
