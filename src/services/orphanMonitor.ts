import type { WebClient } from '@slack/web-api';
import { searchContext } from './rtsClient';
import { getInactiveVolunteers } from './rosterService';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { OrphanMonitorError } from '../utils/errors';
import { buildOrphanAlertCard } from '../ui/orphanAlertCard';
import type { DecisionRecord, OrphanedDecision, RtsMessage, VolunteerRecord } from '../types';

const MAX_RESULTS_PER_VOLUNTEER = 5;
const MAX_TITLE_LENGTH = 120;
const MILLISECONDS_PER_SECOND = 1000;
const DECISION_SEARCH_TERMS = 'decided OR approved';
const DEFAULT_DECISION_CATEGORY: DecisionRecord['category'] = 'Policy';
const UNTITLED_DECISION_TEXT = 'Untitled decision';
const ORPHAN_ALERT_FALLBACK_TEXT = 'Orphaned decisions need a new owner.';

function deriveDecisionTitle(message: RtsMessage): string {
  const firstLine = message.content.split('\n')[0].trim();
  const title = firstLine.length > 0 ? firstLine : UNTITLED_DECISION_TEXT;
  return title.length > MAX_TITLE_LENGTH ? `${title.slice(0, MAX_TITLE_LENGTH).trimEnd()}…` : title;
}

function deriveLastVerified(message: RtsMessage): Date | null {
  return message.messageTs.length > 0
    ? new Date(parseFloat(message.messageTs) * MILLISECONDS_PER_SECOND)
    : null;
}

function buildOrphanedDecision(message: RtsMessage, volunteer: VolunteerRecord): OrphanedDecision {
  const decision: DecisionRecord = {
    decisionTitle: deriveDecisionTitle(message),
    slackThreadLink: message.permalink,
    ownerSlackId: volunteer.slackUserId,
    category: DEFAULT_DECISION_CATEGORY,
    lastVerified: deriveLastVerified(message),
    status: 'Orphaned',
  };
  return {
    decision,
    formerOwnerName: volunteer.name,
    formerOwnerSlackId: volunteer.slackUserId,
  };
}

function threadTextOf(message: RtsMessage): string {
  return [...message.contextBefore, message.content, ...message.contextAfter].join('\n').trim();
}

async function searchVolunteerDecisions(volunteer: VolunteerRecord): Promise<RtsMessage[]> {
  try {
    return await searchContext(`${volunteer.name} ${DECISION_SEARCH_TERMS}`, {
      limit: MAX_RESULTS_PER_VOLUNTEER,
      includeContext: true,
    });
  } catch (error) {
    logger.warn('RTS search failed for inactive volunteer, continuing', {
      volunteer: volunteer.slackUserId,
      error,
    });
    return [];
  }
}

async function collectOrphanedDecisions(volunteers: VolunteerRecord[]): Promise<OrphanedDecision[]> {
  const orphaned: OrphanedDecision[] = [];
  const seenThreads = new Set<string>();
  for (const volunteer of volunteers) {
    const messages = await searchVolunteerDecisions(volunteer);
    for (const message of messages) {
      const threadText = threadTextOf(message);
      const threadKey = `${message.channelId}:${threadText}`;
      if (threadText.length === 0 || seenThreads.has(threadKey)) {
        continue;
      }
      seenThreads.add(threadKey);
      orphaned.push(buildOrphanedDecision(message, volunteer));
    }
  }
  return orphaned;
}

export async function runOrphanCheck(client: WebClient): Promise<void> {
  try {
    const inactiveVolunteers = await getInactiveVolunteers();
    if (inactiveVolunteers.length === 0) {
      logger.info('No inactive volunteers found, skipping orphan check', {});
      return;
    }

    const orphanedDecisions = await collectOrphanedDecisions(inactiveVolunteers);
    if (orphanedDecisions.length === 0) {
      logger.info('No orphaned decisions found for inactive volunteers', {
        inactiveCount: inactiveVolunteers.length,
      });
      return;
    }

    await client.chat.postMessage({
      channel: config.channels.operations,
      blocks: buildOrphanAlertCard(orphanedDecisions),
      text: ORPHAN_ALERT_FALLBACK_TEXT,
    });
    logger.info('Orphan alert posted to operations channel', {
      orphanCount: orphanedDecisions.length,
    });
  } catch (error) {
    logger.error('Orphan check failed', { error });
    throw new OrphanMonitorError('Orphan decision check failed.');
  }
}
