const mockAll = jest.fn();
const mockSelect = jest.fn(() => ({ all: mockAll, firstPage: mockAll }));

jest.mock('airtable', () =>
  jest.fn().mockImplementation(() => ({
    base: () => () => ({ select: mockSelect }),
  })),
);

jest.mock('../../utils/config', () => ({
  config: {
    airtable: {
      apiKey: 'test-key',
      baseId: 'test-base',
      volunteersTableId: 'test-volunteers-table',
      decisionsTableId: 'test-decisions-table',
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { getAllDecisions } from '../../services/decisionsService';
import { DecisionServiceError } from '../../utils/errors';

function fakeRecord(fields: Record<string, unknown>): { get: (name: string) => unknown } {
  return { get: (name: string): unknown => fields[name] };
}

describe('getAllDecisions', () => {
  beforeEach(() => {
    mockAll.mockReset();
  });

  it('maps Airtable records to DecisionRecords', async () => {
    mockAll.mockResolvedValue([
      fakeRecord({
        DecisionTitle: 'Pet policy at Westside shelter',
        SlackThreadLink: 'https://acme.slack.com/archives/C1/p1',
        OwnerSlackId: 'U1',
        Category: 'Policy',
        LastVerified: '2026-06-08',
        Status: 'Active',
      }),
    ]);

    const decisions = await getAllDecisions();

    expect(decisions).toEqual([
      {
        decisionTitle: 'Pet policy at Westside shelter',
        slackThreadLink: 'https://acme.slack.com/archives/C1/p1',
        ownerSlackId: 'U1',
        category: 'Policy',
        lastVerified: new Date('2026-06-08'),
        status: 'Active',
      },
    ]);
  });

  it('defaults unknown category/status and null lastVerified', async () => {
    mockAll.mockResolvedValue([
      fakeRecord({ DecisionTitle: 'Untitled', Category: 'Bogus', Status: 'Bogus' }),
    ]);

    const decisions = await getAllDecisions();

    expect(decisions[0].category).toBe('Policy');
    expect(decisions[0].status).toBe('Active');
    expect(decisions[0].lastVerified).toBeNull();
  });

  it('throws DecisionServiceError when the Airtable call fails', async () => {
    mockAll.mockRejectedValue(new Error('Airtable returned 503'));

    await expect(getAllDecisions()).rejects.toThrow(DecisionServiceError);
  });
});
