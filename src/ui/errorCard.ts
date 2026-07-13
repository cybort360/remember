import type { Block, KnownBlock, View } from '@slack/types';

const ERROR_INDICATOR = '🔴';

export function buildErrorCard(message: string, suggestion?: string): Block[] {
  const blocks: KnownBlock[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `${ERROR_INDICATOR} ${message}` },
    },
  ];

  if (suggestion && suggestion.trim().length > 0) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: suggestion }],
    });
  }

  return blocks;
}

export function buildErrorView(message: string, suggestion?: string): View {
  return { type: 'home', blocks: buildErrorCard(message, suggestion) };
}
