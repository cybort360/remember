const REQUIRED_ENV: Record<string, string> = {
  SLACK_BOT_TOKEN: 'xoxb-test-token',
  SLACK_APP_TOKEN: 'xapp-test-token',
  SLACK_SIGNING_SECRET: 'test-signing-secret',
  SLACK_USER_TOKEN: 'xoxp-test-token',
  AIRTABLE_API_KEY: 'test-airtable-key',
  AIRTABLE_BASE_ID: 'appTestBase',
  AIRTABLE_VOLUNTEERS_TABLE_ID: 'tblVolunteers',
  AIRTABLE_DECISIONS_TABLE_ID: 'tblDecisions',
  OPERATIONS_CHANNEL_ID: 'C0OPERATIONS',
  HURRICANE_BRIEF_CHANNEL_ID: 'C0HURRICANE',
};

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, ...REQUIRED_ENV };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws ConfigError when a required env variable is missing', () => {
    delete process.env.AIRTABLE_API_KEY;
    const { ConfigError } = require('../../utils/errors') as typeof import('../../utils/errors');
    expect(() => require('../../utils/config')).toThrow(ConfigError);
  });

  it('includes the missing variable name in the thrown error message', () => {
    delete process.env.SLACK_BOT_TOKEN;
    expect(() => require('../../utils/config')).toThrow('SLACK_BOT_TOKEN');
  });

  it('builds the config object when every required env variable is present', () => {
    const { config } = require('../../utils/config') as typeof import('../../utils/config');
    expect(config.slack.botToken).toBe(REQUIRED_ENV.SLACK_BOT_TOKEN);
    expect(config.airtable.decisionsTableId).toBe(REQUIRED_ENV.AIRTABLE_DECISIONS_TABLE_ID);
    expect(config.channels.hurricaneBrief).toBe(REQUIRED_ENV.HURRICANE_BRIEF_CHANNEL_ID);
  });
});
