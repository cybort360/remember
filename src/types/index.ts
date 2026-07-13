import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
  SlackEventMiddlewareArgs,
} from '@slack/bolt';

export type FreshnessScore = 'GREEN' | 'YELLOW' | 'RED';

export interface VolunteerRecord {
  name: string;
  slackUserId: string;
  role: string;
  status: 'Active' | 'Inactive';
  joinDate: Date;
  lastActiveDate: Date;
}

export interface DecisionRecord {
  decisionTitle: string;
  slackThreadLink: string;
  ownerSlackId: string;
  category: 'Shelter' | 'Supply' | 'Policy' | 'Logistics' | 'Medical';
  lastVerified: Date | null;
  status: 'Active' | 'Orphaned' | 'Resolved';
}

export interface SearchResult {
  threadLink: string;
  summary: string;
  decisionOwner: VolunteerRecord | null;
  ownerIsActive: boolean;
  freshnessScore: FreshnessScore;
  lastVerified: Date | null;
  rawExcerpt: string;
}

export interface OrphanedDecision {
  decision: DecisionRecord;
  formerOwnerName: string;
  formerOwnerSlackId: string;
}

export interface RtsMessage {
  authorUserId: string;
  channelId: string;
  channelName: string;
  messageTs: string;
  content: string;
  permalink: string;
  contextBefore: string[];
  contextAfter: string[];
}

export interface SeasonalBriefItem {
  topic: string;
  summary: string;
  freshnessScore: FreshnessScore;
  threadLink: string;
}

export type AppMentionArgs = SlackEventMiddlewareArgs<'app_mention'> & AllMiddlewareArgs;

export type AppHomeOpenedArgs = SlackEventMiddlewareArgs<'app_home_opened'> & AllMiddlewareArgs;

export type SlashCommandArgs = SlackCommandMiddlewareArgs & AllMiddlewareArgs;
