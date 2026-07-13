import 'dotenv/config';
import Airtable from 'airtable';

// Standalone demo seeder. Reads only the Airtable credentials directly (not the
// app's full config) so it can run without Slack tokens being set yet.

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
}

function monthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

// Placeholder Slack user IDs — update these with real IDs from your sandbox.
const SLACK_USER_IDS = {
  maria: 'U000000001',
  james: 'U000000002',
  priya: 'U000000003',
  carlos: 'U000000004',
  tasha: 'U000000005',
  derek: 'U000000006',
} as const;

interface VolunteerSeed extends Airtable.FieldSet {
  Name: string;
  SlackUserId: string;
  Role: string;
  Status: 'Active' | 'Inactive';
  JoinDate: string;
  LastActiveDate: string;
}

interface DecisionSeed extends Airtable.FieldSet {
  DecisionTitle: string;
  SlackThreadLink: string;
  OwnerSlackId: string;
  Category: 'Shelter' | 'Supply' | 'Policy' | 'Logistics' | 'Medical';
  LastVerified: string;
  Status: 'Active' | 'Orphaned' | 'Resolved';
}

const VOLUNTEERS: VolunteerSeed[] = [
  {
    Name: 'Maria Santos',
    SlackUserId: SLACK_USER_IDS.maria,
    Role: 'Shelter Coordinator',
    Status: 'Active',
    JoinDate: monthsAgo(26),
    LastActiveDate: daysAgo(2),
  },
  {
    Name: 'James Webb',
    SlackUserId: SLACK_USER_IDS.james,
    Role: 'Supply Chain Lead',
    Status: 'Inactive',
    JoinDate: monthsAgo(30),
    LastActiveDate: monthsAgo(3),
  },
  {
    Name: 'Priya Nair',
    SlackUserId: SLACK_USER_IDS.priya,
    Role: 'Medical Liaison',
    Status: 'Active',
    JoinDate: monthsAgo(20),
    LastActiveDate: daysAgo(1),
  },
  {
    Name: 'Carlos Rivera',
    SlackUserId: SLACK_USER_IDS.carlos,
    Role: 'Logistics Coordinator',
    Status: 'Inactive',
    JoinDate: monthsAgo(28),
    LastActiveDate: monthsAgo(8),
  },
  {
    Name: 'Tasha Monroe',
    SlackUserId: SLACK_USER_IDS.tasha,
    Role: 'Communications Lead',
    Status: 'Active',
    JoinDate: monthsAgo(18),
    LastActiveDate: daysAgo(3),
  },
  {
    Name: 'Derek Okafor',
    SlackUserId: SLACK_USER_IDS.derek,
    Role: 'Generator & Utilities',
    Status: 'Inactive',
    JoinDate: monthsAgo(34),
    LastActiveDate: monthsAgo(14),
  },
];

const DECISIONS: DecisionSeed[] = [
  {
    DecisionTitle: 'Pet policy at Westside shelter',
    SlackThreadLink: 'https://remember-demo.slack.com/archives/C0SHELTER/p1700000001',
    OwnerSlackId: SLACK_USER_IDS.maria,
    Category: 'Policy',
    LastVerified: daysAgo(15),
    Status: 'Active',
  },
  {
    DecisionTitle: 'Backup generator maintenance contract',
    SlackThreadLink: 'https://remember-demo.slack.com/archives/C0UTILS/p1700000002',
    OwnerSlackId: SLACK_USER_IDS.derek,
    Category: 'Logistics',
    LastVerified: monthsAgo(14),
    Status: 'Orphaned',
  },
  {
    DecisionTitle: 'Insulin cooler storage protocol',
    SlackThreadLink: 'https://remember-demo.slack.com/archives/C0MEDICAL/p1700000003',
    OwnerSlackId: SLACK_USER_IDS.priya,
    Category: 'Medical',
    LastVerified: daysAgo(45),
    Status: 'Active',
  },
  {
    DecisionTitle: 'Shelter keyholder — Westside',
    SlackThreadLink: 'https://remember-demo.slack.com/archives/C0SHELTER/p1700000004',
    OwnerSlackId: SLACK_USER_IDS.james,
    Category: 'Shelter',
    LastVerified: monthsAgo(8),
    Status: 'Orphaned',
  },
  {
    DecisionTitle: 'Emergency supply truck routes',
    SlackThreadLink: 'https://remember-demo.slack.com/archives/C0LOGISTICS/p1700000005',
    OwnerSlackId: SLACK_USER_IDS.carlos,
    Category: 'Logistics',
    LastVerified: monthsAgo(8),
    Status: 'Orphaned',
  },
  {
    DecisionTitle: 'Volunteer check-in procedure',
    SlackThreadLink: 'https://remember-demo.slack.com/archives/C0POLICY/p1700000006',
    OwnerSlackId: SLACK_USER_IDS.tasha,
    Category: 'Policy',
    LastVerified: daysAgo(20),
    Status: 'Active',
  },
];

async function seedTable<T extends Airtable.FieldSet>(
  table: Airtable.Table<T>,
  rows: T[],
  label: string,
): Promise<void> {
  await table.create(rows.map((fields) => ({ fields })));
  console.log(`  ✓ created ${rows.length} ${label}`);
}

async function main(): Promise<void> {
  try {
    const base = new Airtable({ apiKey: requireEnv('AIRTABLE_API_KEY') }).base(
      requireEnv('AIRTABLE_BASE_ID'),
    );
    const volunteersTable = base<VolunteerSeed>(requireEnv('AIRTABLE_VOLUNTEERS_TABLE_ID'));
    const decisionsTable = base<DecisionSeed>(requireEnv('AIRTABLE_DECISIONS_TABLE_ID'));

    console.log('Seeding Airtable with hurricane response demo data...');
    await seedTable(volunteersTable, VOLUNTEERS, 'volunteers');
    await seedTable(decisionsTable, DECISIONS, 'decisions');
    console.log('Seed complete.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

void main();
