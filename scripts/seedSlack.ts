import 'dotenv/config';
import { WebClient } from '@slack/web-api';

// Standalone demo seeder. Posts realistic hurricane-response threads to the
// sandbox channel so the memory search (RTS / search.messages) has real Slack
// history to find during the demo. Reads only the Slack bot token + seed
// channel directly so it can run without the rest of the app config.
//
// NOTE: a bot token posts every message AS THE BOT. We pass `username` /
// `icon_emoji` so each message DISPLAYS the right person, but the underlying
// author id is the bot's. The `authorId` fields below are the intended
// volunteer ids for reference / Airtable reconciliation, not the real authors.

const THREAD_DELAY_MS = 2000;
const SPEAKER_ICON = ':bust_in_silhouette:';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SeedMessage {
  author: string;
  authorId: string;
  text: string;
}

interface SeedThread {
  label: string;
  parent: SeedMessage;
  replies: SeedMessage[];
}

const MARIA = 'U000000001';
const JAMES = 'U000000002';
const PRIYA = 'U000000003';
const CARLOS = 'U000000004';
const TASHA = 'U000000005';
const DEREK = 'U000000006';

const THREADS: SeedThread[] = [
  {
    label: 'Shelter Keys',
    parent: {
      author: 'Maria Santos',
      authorId: MARIA,
      text: 'Quick question for the team — who is the primary keyholder for Westside shelter? We need to confirm before hurricane season.',
    },
    replies: [
      {
        author: 'James Webb',
        authorId: JAMES,
        text: 'I have a set. Also the backup key is in the lockbox at HQ, combination is logged in the binder.',
      },
      {
        author: 'Maria Santos',
        authorId: MARIA,
        text: 'Confirmed. James Webb is primary keyholder for Westside shelter. Backup at HQ lockbox. Logging this as official.',
      },
    ],
  },
  {
    label: 'Pet Policy',
    parent: {
      author: 'Tasha Monroe',
      authorId: TASHA,
      text: "Following up on last year's no-pets policy issue. We had 12 families leave the shelter rather than give up their animals. Proposing we allow small pets in crates in the east wing.",
    },
    replies: [
      {
        author: 'Priya Nair',
        authorId: PRIYA,
        text: 'Medically supportable as long as we keep them away from the medical station. I approve.',
      },
      {
        author: 'Maria Santos',
        authorId: MARIA,
        text: 'Motion passed. Westside shelter pet policy updated: small pets in crates allowed in east wing. Families with larger animals directed to Pinewood overflow site.',
      },
      {
        author: 'Tasha Monroe',
        authorId: TASHA,
        text: 'Posting this to #policy-updates. This is now official protocol.',
      },
    ],
  },
  {
    label: 'Generator',
    parent: {
      author: 'Derek Okafor',
      authorId: DEREK,
      text: 'Generator at Westside failed during the Maria response. Got quotes from three contractors. Recommending PowerGrid Solutions — they can do emergency callout within 2 hours.',
    },
    replies: [
      {
        author: 'Carlos Rivera',
        authorId: CARLOS,
        text: 'Agreed. They handled the Northside shelter last year with no issues.',
      },
      {
        author: 'Derek Okafor',
        authorId: DEREK,
        text: 'Contract signed with PowerGrid Solutions. Emergency number: in the ops binder. Annual maintenance is scheduled for March.',
      },
    ],
  },
  {
    label: 'Insulin Coolers',
    parent: {
      author: 'Priya Nair',
      authorId: PRIYA,
      text: 'Medical supply reminder: insulin and temperature-sensitive medications go in the blue coolers stored in room 4B at Westside. Coolers are checked and restocked every 90 days.',
    },
    replies: [
      {
        author: 'Maria Santos',
        authorId: MARIA,
        text: 'Added to shelter setup checklist. Room 4B, blue coolers, Priya owns this protocol.',
      },
    ],
  },
  {
    label: 'Truck Routes',
    parent: {
      author: 'Carlos Rivera',
      authorId: CARLOS,
      text: 'Supply routes during flood response were a mess last time. Bridge on Route 9 closes when water levels exceed 4ft. Alt route: take Highway 17 North to Miller Road.',
    },
    replies: [
      {
        author: 'Carlos Rivera',
        authorId: CARLOS,
        text: 'Updating the logistics manual. Primary route: Route 9. Flood contingency: Highway 17 North to Miller Road. I own this decision.',
      },
    ],
  },
];

async function postThread(client: WebClient, channel: string, thread: SeedThread): Promise<void> {
  const parent = await client.chat.postMessage({
    channel,
    text: thread.parent.text,
    username: thread.parent.author,
    icon_emoji: SPEAKER_ICON,
  });

  if (!parent.ts) {
    throw new Error(`Slack returned no timestamp for parent of thread: ${thread.label}`);
  }

  for (const reply of thread.replies) {
    await client.chat.postMessage({
      channel,
      text: reply.text,
      username: reply.author,
      icon_emoji: SPEAKER_ICON,
      thread_ts: parent.ts,
    });
  }

  console.log(`  ✓ posted "${thread.label}" (${thread.replies.length + 1} messages)`);
}

async function main(): Promise<void> {
  try {
    const client = new WebClient(requireEnv('SLACK_BOT_TOKEN'));
    const channel = requireEnv('SEED_CHANNEL_ID');

    console.log('Seeding Slack with hurricane response threads...');
    for (const [index, thread] of THREADS.entries()) {
      await postThread(client, channel, thread);
      if (index < THREADS.length - 1) {
        await delay(THREAD_DELAY_MS);
      }
    }
    console.log('Slack seed complete.');
  } catch (error) {
    console.error('Slack seed failed:', error);
    process.exit(1);
  }
}

void main();
