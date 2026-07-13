import { searchMemory } from '../services/memorySearch';
import { buildMemoryCard } from '../ui/memoryCard';
import { buildErrorCard } from '../ui/errorCard';
import { logger } from '../utils/logger';
import type { AppMentionArgs } from '../types';

const BOT_MENTION_PATTERN = /<@[^>]+>/g;
const NO_MEMORY_FOUND_TEXT =
  'No memory found. Consider adding this to the decision registry so it can be recalled later.';
const MEMORY_RESULTS_FALLBACK_TEXT = 'Here is what I found in past decisions.';
const SEARCH_UNAVAILABLE_MESSAGE = 'Search is temporarily unavailable.';
const SEARCH_UNAVAILABLE_SUGGESTION = 'Try again in a moment, or search Slack directly.';

function extractQuery(text: string): string {
  return text.replace(BOT_MENTION_PATTERN, '').trim();
}

export async function handleMention({ event, client, say }: AppMentionArgs): Promise<void> {
  const userId = event.user ?? '';
  const query = extractQuery(event.text);

  try {
    const results = await searchMemory(query, userId, client);

    if (results.length === 0) {
      await say({ text: NO_MEMORY_FOUND_TEXT, thread_ts: event.ts });
      return;
    }

    const blocks = results.flatMap(buildMemoryCard);
    await say({ blocks, text: MEMORY_RESULTS_FALLBACK_TEXT, thread_ts: event.ts });
  } catch (error) {
    logger.error('Mention handler failed', { userId, query, error });
    await say({
      blocks: buildErrorCard(SEARCH_UNAVAILABLE_MESSAGE, SEARCH_UNAVAILABLE_SUGGESTION),
      text: SEARCH_UNAVAILABLE_MESSAGE,
      thread_ts: event.ts,
    });
  }
}
