import type { WebClient } from '@slack/web-api';

jest.mock('../../services/rtsClient', () => ({ searchContext: jest.fn() }));

jest.mock('../../services/rosterService', () => ({
  getInactiveVolunteers: jest.fn(),
}));

jest.mock('../../utils/config', () => ({
  config: { channels: { operations: 'C_OPERATIONS' } },
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../ui/orphanAlertCard', () => ({
  buildOrphanAlertCard: jest.fn(() => [{ type: 'section' }]),
}));

import { runOrphanCheck } from '../../services/orphanMonitor';
import { searchContext } from '../../services/rtsClient';
import { getInactiveVolunteers } from '../../services/rosterService';
import { buildOrphanAlertCard } from '../../ui/orphanAlertCard';
import { OrphanMonitorError } from '../../utils/errors';
import type { RtsMessage, VolunteerRecord } from '../../types';

const mockSearchContext = searchContext as jest.MockedFunction<typeof searchContext>;
const mockGetInactive = getInactiveVolunteers as jest.MockedFunction<typeof getInactiveVolunteers>;
const mockBuildCard = buildOrphanAlertCard as jest.MockedFunction<typeof buildOrphanAlertCard>;

const mockPostMessage = jest.fn();
const fakeClient = { chat: { postMessage: mockPostMessage } } as unknown as WebClient;

const inactiveVolunteer: VolunteerRecord = {
  name: 'Sam Okafor',
  slackUserId: 'U_INACTIVE',
  role: 'Logistics Lead',
  status: 'Inactive',
  joinDate: new Date('2023-01-01'),
  lastActiveDate: new Date('2024-02-01'),
};

function sampleMessage(): RtsMessage {
  return {
    authorUserId: 'U_INACTIVE',
    channelId: 'C9',
    channelName: 'disaster-ops',
    messageTs: '1718000000.000100',
    content: 'We decided to relocate the shelter to Oak Street.',
    permalink: 'https://acme.slack.com/archives/C9/p9',
    contextBefore: [],
    contextAfter: [],
  };
}

describe('runOrphanCheck', () => {
  beforeEach(() => {
    mockGetInactive.mockReset();
    mockSearchContext.mockReset();
    mockPostMessage.mockReset();
    mockBuildCard.mockReset();
    mockBuildCard.mockReturnValue([{ type: 'section' }]);
  });

  it('logs info and returns early when there are no inactive volunteers', async () => {
    mockGetInactive.mockResolvedValue([]);

    await runOrphanCheck(fakeClient);

    expect(mockSearchContext).not.toHaveBeenCalled();
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('does not post an alert when no orphaned decisions are found', async () => {
    mockGetInactive.mockResolvedValue([inactiveVolunteer]);
    mockSearchContext.mockResolvedValue([]);

    await runOrphanCheck(fakeClient);

    expect(mockSearchContext).toHaveBeenCalledTimes(1);
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('posts an orphan alert with mapped decisions when matches are found', async () => {
    mockGetInactive.mockResolvedValue([inactiveVolunteer]);
    mockSearchContext.mockResolvedValue([sampleMessage()]);
    mockPostMessage.mockResolvedValue({ ok: true });

    await runOrphanCheck(fakeClient);

    expect(mockBuildCard).toHaveBeenCalledTimes(1);
    const decisions = mockBuildCard.mock.calls[0][0];
    expect(decisions).toHaveLength(1);
    expect(decisions[0].formerOwnerName).toBe('Sam Okafor');
    expect(decisions[0].decision.status).toBe('Orphaned');
    expect(decisions[0].decision.decisionTitle).toBe('We decided to relocate the shelter to Oak Street.');
    expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ channel: 'C_OPERATIONS' }));
  });

  it('deduplicates decisions from the same thread', async () => {
    mockGetInactive.mockResolvedValue([inactiveVolunteer]);
    mockSearchContext.mockResolvedValue([sampleMessage(), sampleMessage()]);
    mockPostMessage.mockResolvedValue({ ok: true });

    await runOrphanCheck(fakeClient);

    expect(mockBuildCard.mock.calls[0][0]).toHaveLength(1);
  });

  it('continues with other volunteers when search fails for one', async () => {
    const otherVolunteer: VolunteerRecord = { ...inactiveVolunteer, name: 'Lee Park', slackUserId: 'U_OTHER' };
    mockGetInactive.mockResolvedValue([inactiveVolunteer, otherVolunteer]);
    mockSearchContext
      .mockRejectedValueOnce(new Error('RTS 429'))
      .mockResolvedValueOnce([sampleMessage()]);
    mockPostMessage.mockResolvedValue({ ok: true });

    await runOrphanCheck(fakeClient);

    expect(mockSearchContext).toHaveBeenCalledTimes(2);
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    expect(mockBuildCard.mock.calls[0][0]).toHaveLength(1);
  });

  it('throws OrphanMonitorError when the roster lookup fails', async () => {
    mockGetInactive.mockRejectedValue(new Error('Airtable unavailable'));

    await expect(runOrphanCheck(fakeClient)).rejects.toThrow(OrphanMonitorError);
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('throws OrphanMonitorError when posting the alert fails', async () => {
    mockGetInactive.mockResolvedValue([inactiveVolunteer]);
    mockSearchContext.mockResolvedValue([sampleMessage()]);
    mockPostMessage.mockRejectedValue(new Error('channel_not_found'));

    await expect(runOrphanCheck(fakeClient)).rejects.toThrow(OrphanMonitorError);
  });
});
