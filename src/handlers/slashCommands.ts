import { searchMemory } from '../services/memorySearch';
import { runHurricaneBrief } from '../triggers/seasonalTrigger';
import { runOrphanCheck } from '../services/orphanMonitor';
import { buildMemoryCard } from '../ui/memoryCard';
import { buildErrorCard } from '../ui/errorCard';
import { logger } from '../utils/logger';
import type { SlashCommandArgs } from '../types';

const NO_MEMORY_FOUND_TEXT =
  'No memory found. Consider adding this to the decision registry so it can be recalled later.';
const MEMORY_RESULTS_FALLBACK_TEXT = 'Here is what I found in past decisions.';
const SEARCH_UNAVAILABLE_MESSAGE = 'Search is temporarily unavailable.';
const SEARCH_UNAVAILABLE_SUGGESTION = 'Try again in a moment, or search Slack directly.';
const HURRICANE_BRIEF_STARTED_TEXT =
  'Hurricane brief is being generated and will post to #hurricane-ops.';
const HURRICANE_BRIEF_ERROR_TEXT =
  'Could not start the hurricane brief right now. Please try again shortly.';
const ORPHAN_CHECK_DONE_TEXT =
  'Orphan check complete. Any orphaned decisions were posted to the operations channel.';
const ORPHAN_CHECK_ERROR_TEXT = 'Orphan check failed. Please try again shortly.';

export async function handleRememberSearch({
  command,
  ack,
  respond,
  client,
}: SlashCommandArgs): Promise<void> {
  await ack();
  const query = command.text.trim();

  try {
    const results = await searchMemory(query, command.user_id, client);

    if (results.length === 0) {
      await respond({ text: NO_MEMORY_FOUND_TEXT });
      return;
    }

    const blocks = results.flatMap(buildMemoryCard);
    await respond({ blocks, text: MEMORY_RESULTS_FALLBACK_TEXT });
  } catch (error) {
    logger.error('Remember search command failed', { userId: command.user_id, query, error });
    await respond({
      blocks: buildErrorCard(SEARCH_UNAVAILABLE_MESSAGE, SEARCH_UNAVAILABLE_SUGGESTION),
      text: SEARCH_UNAVAILABLE_MESSAGE,
    });
  }
}

export async function handleHurricaneBrief({
  command,
  ack,
  respond,
  client,
}: SlashCommandArgs): Promise<void> {
  await ack();

  try {
    await runHurricaneBrief(client);
    await respond({ text: HURRICANE_BRIEF_STARTED_TEXT });
  } catch (error) {
    logger.error('Hurricane brief command failed', { userId: command.user_id, error });
    await respond({ text: HURRICANE_BRIEF_ERROR_TEXT });
  }
}

// Temporary command for on-demand testing of the orphan monitor during the demo.
export async function handleOrphanCheck({
  command,
  ack,
  respond,
  client,
}: SlashCommandArgs): Promise<void> {
  await ack();

  try {
    await runOrphanCheck(client);
    await respond({ text: ORPHAN_CHECK_DONE_TEXT });
  } catch (error) {
    logger.error('Orphan check command failed', { userId: command.user_id, error });
    await respond({ text: ORPHAN_CHECK_ERROR_TEXT });
  }
}
