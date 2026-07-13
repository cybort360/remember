import { ConfigError } from './errors';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new ConfigError(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  slack: {
    botToken: requireEnv('SLACK_BOT_TOKEN'),
    appToken: requireEnv('SLACK_APP_TOKEN'),
    signingSecret: requireEnv('SLACK_SIGNING_SECRET'),
    userToken: requireEnv('SLACK_USER_TOKEN'),
  },
  airtable: {
    apiKey: requireEnv('AIRTABLE_API_KEY'),
    baseId: requireEnv('AIRTABLE_BASE_ID'),
    volunteersTableId: requireEnv('AIRTABLE_VOLUNTEERS_TABLE_ID'),
    decisionsTableId: requireEnv('AIRTABLE_DECISIONS_TABLE_ID'),
  },
  channels: {
    operations: requireEnv('OPERATIONS_CHANNEL_ID'),
    hurricaneBrief: requireEnv('HURRICANE_BRIEF_CHANNEL_ID'),
  },
};
