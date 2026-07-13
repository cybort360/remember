import type { WebClient } from '@slack/web-api';

jest.mock('../../services/rtsClient', () => ({ searchContext: jest.fn() }));

jest.mock('../../services/rosterService', () => ({
  findVolunteerBySlackId: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { searchMemory } from '../../services/memorySearch';
import { searchContext } from '../../services/rtsClient';
import { findVolunteerBySlackId } from '../../services/rosterService';
import { MemorySearchError } from '../../utils/errors';
import type { RtsMessage, VolunteerRecord } from '../../types';

const mockSearchContext = searchContext as jest.MockedFunction<typeof searchContext>;
const mockFindVolunteer = findVolunteerBySlackId as jest.MockedFunction<typeof findVolunteerBySlackId>;

const mockApiCall = jest.fn();
const fakeClient = { apiCall: mockApiCall } as unknown as WebClient;

const RECENT_TS = (Date.now() / 1000).toFixed(6);

const activeVolunteer: VolunteerRecord = {
  name: 'Jane Rivera',
  slackUserId: 'U123ABC',
  role: 'Shelter Coordinator',
  status: 'Active',
  joinDate: new Date('2024-01-15'),
  lastActiveDate: new Date('2024-06-01'),
};

function sampleMessage(): RtsMessage {
  return {
    authorUserId: 'U123ABC',
    channelId: 'C1',
    channelName: 'disaster-ops',
    messageTs: RECENT_TS,
    content: 'Decision: shelter keys stay with Jane.',
    permalink: 'https://acme.slack.com/archives/C1/p123',
    contextBefore: [],
    contextAfter: ['Confirmed.'],
  };
}

describe('searchMemory', () => {
  beforeEach(() => {
    mockSearchContext.mockReset();
    mockApiCall.mockReset();
    mockFindVolunteer.mockReset();

    mockApiCall.mockResolvedValue({ ok: true, summary: 'Shelter keys are held by Jane Rivera.' });
    mockFindVolunteer.mockResolvedValue(activeVolunteer);
  });

  it('returns an empty array when no results are found', async () => {
    mockSearchContext.mockResolvedValue([]);

    const results = await searchMemory('shelter keys', 'U999USER', fakeClient);

    expect(results).toEqual([]);
  });

  it('maps an RTS message to a SearchResult correctly', async () => {
    mockSearchContext.mockResolvedValue([sampleMessage()]);

    const results = await searchMemory('shelter keys', 'U999USER', fakeClient);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      threadLink: 'https://acme.slack.com/archives/C1/p123',
      summary: 'Shelter keys are held by Jane Rivera.',
      decisionOwner: activeVolunteer,
      ownerIsActive: true,
      freshnessScore: 'GREEN',
      lastVerified: new Date(parseFloat(RECENT_TS) * 1000),
      rawExcerpt: 'Decision: shelter keys stay with Jane.\nConfirmed.',
    });
  });

  it("excludes the asker's own message from the results", async () => {
    const askerMessage: RtsMessage = { ...sampleMessage(), authorUserId: 'U999USER', content: 'my own question' };
    mockSearchContext.mockResolvedValue([askerMessage, sampleMessage()]);

    const results = await searchMemory('shelter keys', 'U999USER', fakeClient);

    expect(results).toHaveLength(1);
    expect(results[0].rawExcerpt).toContain('shelter keys stay with Jane');
  });

  it('collapses multiple hits from the same thread into one result', async () => {
    mockSearchContext.mockResolvedValue([sampleMessage(), sampleMessage()]);

    const results = await searchMemory('shelter keys', 'U999USER', fakeClient);

    expect(results).toHaveLength(1);
  });

  it('throws MemorySearchError when the RTS search fails', async () => {
    mockSearchContext.mockRejectedValue(new Error('rts unavailable'));

    await expect(searchMemory('shelter keys', 'U999USER', fakeClient)).rejects.toThrow(MemorySearchError);
  });

  it('degrades gracefully when the roster service throws', async () => {
    mockSearchContext.mockResolvedValue([sampleMessage()]);
    mockFindVolunteer.mockRejectedValue(new Error('Airtable unavailable'));

    const results = await searchMemory('shelter keys', 'U999USER', fakeClient);

    expect(results).toHaveLength(1);
    expect(results[0].decisionOwner).toBeNull();
    expect(results[0].ownerIsActive).toBe(false);
    expect(results[0].summary).toBe('Shelter keys are held by Jane Rivera.');
  });

  it('falls back to the raw excerpt when summarization fails', async () => {
    mockSearchContext.mockResolvedValue([sampleMessage()]);
    mockApiCall.mockRejectedValue(new Error('assistant.threads.summarize failed'));

    const results = await searchMemory('shelter keys', 'U999USER', fakeClient);

    expect(results[0].summary).toBe('');
    expect(results[0].rawExcerpt).toBe('Decision: shelter keys stay with Jane.\nConfirmed.');
  });
});
