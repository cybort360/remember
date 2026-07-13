const mockFirstPage = jest.fn();
const mockSelect = jest.fn(() => ({ firstPage: mockFirstPage, all: mockFirstPage }));

jest.mock('airtable', () =>
  jest.fn().mockImplementation(() => ({
    base: () => () => ({ select: mockSelect }),
  }))
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

import { findVolunteerBySlackId } from '../../services/rosterService';
import { RosterServiceError } from '../../utils/errors';

function fakeRecord(fields: Record<string, unknown>): { get: (name: string) => unknown } {
  return { get: (name: string): unknown => fields[name] };
}

describe('findVolunteerBySlackId', () => {
  beforeEach(() => {
    mockFirstPage.mockReset();
  });

  it('returns null when the volunteer is not found', async () => {
    mockFirstPage.mockResolvedValue([]);

    const volunteer = await findVolunteerBySlackId('U000NOTFOUND');

    expect(volunteer).toBeNull();
  });

  it('returns a mapped VolunteerRecord when the volunteer is found', async () => {
    mockFirstPage.mockResolvedValue([
      fakeRecord({
        Name: 'Jane Rivera',
        SlackUserId: 'U123ABC',
        Role: 'Shelter Coordinator',
        Status: 'Active',
        JoinDate: '2024-01-15',
        LastActiveDate: '2024-06-01',
      }),
    ]);

    const volunteer = await findVolunteerBySlackId('U123ABC');

    expect(volunteer).toEqual({
      name: 'Jane Rivera',
      slackUserId: 'U123ABC',
      role: 'Shelter Coordinator',
      status: 'Active',
      joinDate: new Date('2024-01-15'),
      lastActiveDate: new Date('2024-06-01'),
    });
  });

  it('throws RosterServiceError when the Airtable call fails', async () => {
    mockFirstPage.mockRejectedValue(new Error('Airtable returned 503'));

    await expect(findVolunteerBySlackId('U123ABC')).rejects.toThrow(RosterServiceError);
  });
});
