import { WebClient } from '@slack/web-api';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { RtsSearchError } from '../utils/errors';
import type { RtsMessage } from '../types';

// Thin wrapper around Slack's Real-Time Search (RTS) API method
// `assistant.search.context`. RTS requires a user token (search:read.*), so this
// uses a dedicated user-token client, separate from the bot client used for
// posting. Lazily constructed so importing the module is side-effect-free.

const RTS_METHOD = 'assistant.search.context';
const DEFAULT_SEARCH_LIMIT = 20;

let cachedSearchClient: WebClient | undefined;

function getSearchClient(): WebClient {
  if (cachedSearchClient === undefined) {
    cachedSearchClient = new WebClient(config.slack.userToken);
  }
  return cachedSearchClient;
}

export interface SearchContextOptions {
  limit?: number;
  after?: number;
  includeContext?: boolean;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function readContext(contextMessages: unknown, side: 'before' | 'after'): string[] {
  if (typeof contextMessages !== 'object' || contextMessages === null) {
    return [];
  }
  const list = (contextMessages as Record<string, unknown>)[side];
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((entry) =>
      typeof entry === 'object' && entry !== null
        ? readString(entry as Record<string, unknown>, 'text')
        : '',
    )
    .filter((text) => text.length > 0);
}

function toRtsMessage(raw: unknown): RtsMessage {
  const record = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    authorUserId: readString(record, 'author_user_id'),
    channelId: readString(record, 'channel_id'),
    channelName: readString(record, 'channel_name'),
    messageTs: readString(record, 'message_ts'),
    content: readString(record, 'content'),
    permalink: readString(record, 'permalink'),
    contextBefore: readContext(record.context_messages, 'before'),
    contextAfter: readContext(record.context_messages, 'after'),
  };
}

function parseMessages(response: unknown): RtsMessage[] {
  if (typeof response !== 'object' || response === null) {
    return [];
  }
  const results = (response as Record<string, unknown>).results;
  if (typeof results !== 'object' || results === null) {
    return [];
  }
  const messages = (results as Record<string, unknown>).messages;
  return Array.isArray(messages) ? messages.map(toRtsMessage) : [];
}

export async function searchContext(
  query: string,
  options: SearchContextOptions = {},
): Promise<RtsMessage[]> {
  try {
    const response = await getSearchClient().apiCall(RTS_METHOD, {
      query,
      content_types: ['messages'],
      include_context_messages: options.includeContext ?? false,
      limit: options.limit ?? DEFAULT_SEARCH_LIMIT,
      ...(options.after !== undefined ? { after: options.after } : {}),
    });
    return parseMessages(response);
  } catch (error) {
    logger.error('RTS search failed', { query, error });
    throw new RtsSearchError('Real-time search is unavailable.');
  }
}
