import 'dotenv/config';
import Airtable from 'airtable';

// One-shot demo reconciliation. The Slack seed posts every thread AS THE BOT with
// a custom username, and Slack's RTS API (assistant.search.context) tags such
// app-authored messages with the synthetic author id "U00" — NOT the bot's real
// user id. So to make the memory card's owner resolve, MARIA SANTOS is pointed at
// "U00". Every seeded thread then resolves to Maria; the other volunteers stay on
// placeholder ids. Idempotent: safe to re-run (matches Maria by name).

const MARIA_PLACEHOLDER_ID = 'U000000001';
const MARIA_NAME = 'Maria Santos';
const RTS_BOT_AUTHOR_ID = 'U00';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  try {
    const base = new Airtable({ apiKey: requireEnv('AIRTABLE_API_KEY') }).base(
      requireEnv('AIRTABLE_BASE_ID'),
    );
    const volunteers = base(requireEnv('AIRTABLE_VOLUNTEERS_TABLE_ID'));

    const matches = await volunteers
      .select({
        filterByFormula: `OR({SlackUserId} = '${MARIA_PLACEHOLDER_ID}', {Name} = '${MARIA_NAME}')`,
        maxRecords: 1,
      })
      .firstPage();

    if (matches.length === 0) {
      throw new Error(`Could not find ${MARIA_NAME} in the volunteers table — run "npm run seed" first.`);
    }

    await volunteers.update(matches[0].id, { SlackUserId: RTS_BOT_AUTHOR_ID });
    console.log(`  ✓ ${MARIA_NAME} SlackUserId -> ${RTS_BOT_AUTHOR_ID} (RTS bot-author id; other volunteers left as placeholders)`);
    console.log("Done. Maria's memory card will now resolve for the bot-authored seed threads.");
  } catch (error) {
    console.error('Link failed:', error);
    process.exit(1);
  }
}

void main();
