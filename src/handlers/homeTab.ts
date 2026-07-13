import { getAllDecisions } from '../services/decisionsService';
import { getInactiveVolunteers } from '../services/rosterService';
import { calculateFreshness } from '../services/freshnessScorer';
import { buildDashboardView } from '../ui/dashboardView';
import { buildErrorView } from '../ui/errorCard';
import { logger } from '../utils/logger';
import type { AppHomeOpenedArgs, OrphanedDecision, VolunteerRecord } from '../types';

const DASHBOARD_ERROR_MESSAGE = 'The dashboard is temporarily unavailable.';
const DASHBOARD_ERROR_SUGGESTION = 'Try reopening the Home tab in a moment.';
const ORPHANED_DECISION_CATEGORY: OrphanedDecision['decision']['category'] = 'Policy';

function toOrphanedDecisions(inactiveVolunteers: VolunteerRecord[]): OrphanedDecision[] {
  return inactiveVolunteers.map((volunteer) => ({
    decision: {
      decisionTitle: `Decisions previously owned by ${volunteer.name}`,
      slackThreadLink: '',
      ownerSlackId: volunteer.slackUserId,
      category: ORPHANED_DECISION_CATEGORY,
      lastVerified: null,
      status: 'Orphaned',
    },
    formerOwnerName: volunteer.name,
    formerOwnerSlackId: volunteer.slackUserId,
  }));
}

export async function handleHomeTab({ event, client }: AppHomeOpenedArgs): Promise<void> {
  try {
    const decisions = await getAllDecisions();
    const inactiveVolunteers = await getInactiveVolunteers();
    const decisionFreshness = decisions.map((decision) => calculateFreshness(decision.lastVerified));
    const orphanedDecisions = toOrphanedDecisions(inactiveVolunteers);

    await client.views.publish({
      user_id: event.user,
      view: buildDashboardView(decisionFreshness, orphanedDecisions),
    });
  } catch (error) {
    logger.error('Home tab handler failed', { userId: event.user, error });
    try {
      await client.views.publish({
        user_id: event.user,
        view: buildErrorView(DASHBOARD_ERROR_MESSAGE, DASHBOARD_ERROR_SUGGESTION),
      });
    } catch (publishError) {
      logger.error('Failed to publish home tab error view', { userId: event.user, error: publishError });
    }
  }
}
