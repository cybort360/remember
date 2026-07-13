import type { WebClient } from '@slack/web-api';

jest.mock('node-cron', () => ({ schedule: jest.fn() }));

jest.mock('../../services/rtsClient', () => ({ searchContext: jest.fn() }));

jest.mock('../../utils/config', () => ({
  config: { channels: { hurricaneBrief: 'C_HURRICANE' } },
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../ui/seasonalBriefCard', () => ({
  buildSeasonalBriefCard: jest.fn(() => [{ type: 'section' }]),
}));

import { runHurricaneBrief, scheduleHurricaneBrief } from '../../triggers/seasonalTrigger';
import { schedule } from 'node-cron';
import { searchContext } from '../../services/rtsClient';
import { buildSeasonalBriefCard } from '../../ui/seasonalBriefCard';
import { SeasonalTriggerError } from '../../utils/errors';
import type { RtsMessage } from '../../types';

const mockSchedule = schedule as jest.MockedFunction<typeof schedule>;
const mockSearchContext = searchContext as jest.MockedFunction<typeof searchContext>;
const mockBuildCard = buildSeasonalBriefCard as jest.MockedFunction<typeof buildSeasonalBriefCard>;

const mockPostMessage = jest.fn();
const fakeClient = { chat: { postMessage: mockPostMessage } } as unknown as WebClient;

const RECENT_TS = (Date.now() / 1000).toFixed(6);

function sampleMessage(): RtsMessage {
  return {
    authorUserId: 'U1',
    channelId: 'C9',
    channelName: 'disaster-ops',
    messageTs: RECENT_TS,
    content: 'Hurricane shelter protocol: keep generators fueled.',
    permalink: 'https://acme.slack.com/archives/C9/p9',
    contextBefore: [],
    contextAfter: [],
  };
}

describe('runHurricaneBrief', () => {
  beforeEach(() => {
    mockSearchContext.mockReset();
    mockPostMessage.mockReset();
    mockBuildCard.mockReset();
    mockBuildCard.mockReturnValue([{ type: 'section' }]);
  });

  it('posts a brief to the hurricane channel with mapped seasonal items', async () => {
    mockSearchContext.mockResolvedValue([sampleMessage()]);
    mockPostMessage.mockResolvedValue({ ok: true });

    await runHurricaneBrief(fakeClient);

    expect(mockBuildCard).toHaveBeenCalledTimes(1);
    const items = mockBuildCard.mock.calls[0][0];
    expect(items).toHaveLength(1);
    expect(items[0].topic).toBe('Hurricane shelter protocol: keep generators fueled.');
    expect(items[0].freshnessScore).toBe('GREEN');
    expect(items[0].threadLink).toBe('https://acme.slack.com/archives/C9/p9');
    expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ channel: 'C_HURRICANE' }));
  });

  it('deduplicates items from the same thread', async () => {
    mockSearchContext.mockResolvedValue([sampleMessage(), sampleMessage()]);
    mockPostMessage.mockResolvedValue({ ok: true });

    await runHurricaneBrief(fakeClient);

    expect(mockBuildCard.mock.calls[0][0]).toHaveLength(1);
  });

  it('builds an empty brief when no threads are found', async () => {
    mockSearchContext.mockResolvedValue([]);
    mockPostMessage.mockResolvedValue({ ok: true });

    await runHurricaneBrief(fakeClient);

    expect(mockBuildCard.mock.calls[0][0]).toHaveLength(0);
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
  });

  it('throws SeasonalTriggerError when the RTS search fails', async () => {
    mockSearchContext.mockRejectedValue(new Error('rts unavailable'));

    await expect(runHurricaneBrief(fakeClient)).rejects.toThrow(SeasonalTriggerError);
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('throws SeasonalTriggerError when posting the brief fails', async () => {
    mockSearchContext.mockResolvedValue([sampleMessage()]);
    mockPostMessage.mockRejectedValue(new Error('channel_not_found'));

    await expect(runHurricaneBrief(fakeClient)).rejects.toThrow(SeasonalTriggerError);
  });
});

describe('scheduleHurricaneBrief', () => {
  beforeEach(() => {
    mockSchedule.mockReset();
    mockSearchContext.mockReset();
    mockPostMessage.mockReset();
    mockBuildCard.mockReset();
    mockBuildCard.mockReturnValue([{ type: 'section' }]);
  });

  it('registers a cron job for 9:00 AM on September 1st', () => {
    scheduleHurricaneBrief(fakeClient);

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledWith('0 9 1 9 *', expect.any(Function));
  });

  it('runs the hurricane brief when the scheduled callback fires', async () => {
    mockSearchContext.mockResolvedValue([sampleMessage()]);
    mockPostMessage.mockResolvedValue({ ok: true });

    scheduleHurricaneBrief(fakeClient);
    const scheduledCallback = mockSchedule.mock.calls[0][1] as () => void;
    scheduledCallback();
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ channel: 'C_HURRICANE' }));
  });
});
