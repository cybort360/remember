# REMEMBER

A Slack agent that preserves **institutional memory** for disaster response volunteer organizations.

Volunteer turnover wipes out critical knowledge every year — who holds the shelter keys, what the pet policy is, whether the generator was fixed. REMEMBER makes that knowledge **searchable, freshness-scored, and self-maintaining**.

> Built for the Slack Agent Builder Challenge — Agent for Good track.

---

## What it does

| Capability | Description |
|---|---|
| 🔎 **Memory search** | `@REMEMBER` a question or run `/remember-search`. It searches past Slack threads via the RTS API and returns Block Kit cards with the thread excerpt, the decision owner, and a link to the original thread. |
| 🟢🟡🔴 **Freshness scoring** | Every decision is scored GREEN / YELLOW / RED by how long ago it was verified, so stale knowledge is visible at a glance. |
| 🚨 **Orphan monitor** | When a volunteer goes inactive, REMEMBER finds the decisions they owned and posts a reassignment alert to `#operations`. |
| 🌀 **Seasonal brief** | Every September 1 (and on demand via `/hurricane-brief`), it posts a hurricane-season protocol review built from last season's decisions. |
| 🏠 **Home tab dashboard** | A memory-health summary (GREEN/YELLOW/RED counts) plus the current orphaned decisions, for the operations lead. |

### Hackathon technology
REMEMBER is built on Slack's **Real-Time Search (RTS) API** (`assistant.search.context`): semantic, in-workspace retrieval powers all three agentic features — memory search, the orphan monitor, and the seasonal brief.

Supporting pieces: **Airtable** (volunteer roster + decision registry, via the Airtable API) drives freshness scoring and the Home-tab dashboard; **Block Kit** renders the agent's responses, cards, and Home tab.

> Note: thread summarization is a planned enhancement — cards currently show the raw thread excerpt rather than an AI-generated summary.

---

## Tech stack

TypeScript (strict) · Slack Bolt (Socket Mode) · Slack Web API · Airtable · pino · node-cron · Jest.

See [`architecture.md`](./architecture.md) for the full system design, data flows, and Airtable schema.

---

## Project structure

```
src/
  app.ts              # Bolt wiring + entry point (no business logic)
  handlers/           # Thin routers: mention, homeTab, slashCommands
  services/           # Business logic: memorySearch, rosterService, freshnessScorer, orphanMonitor
  triggers/           # seasonalTrigger (node-cron)
  ui/                 # All Block Kit builders (and only here)
  utils/              # config, logger, errors
  types/              # Shared types
  __tests__/          # Jest unit tests (services + ui)
scripts/              # Demo seeders (Airtable + Slack) and reconciliation
```

Conventions are defined in [`CLAUDE.md`](./CLAUDE.md).

---

## Setup

1. **Join the Slack Developer Program** and provision a sandbox workspace.
2. **Create the Slack app** (Socket Mode). Bot scopes: `app_mentions:read`, `chat:write`, `chat:write.customize`, `users:read`, `commands`. User scopes: `search:read.public`, `search:read.private` (for the RTS memory search). Event subscriptions: `app_mention`, `app_home_opened`. Slash commands: `/remember-search`, `/hurricane-brief`.
3. **Install dependencies:**
   ```
   npm install
   ```
4. **Configure environment:** copy `.env.example` to `.env` and fill in every value.

   | Variable | Purpose |
   |---|---|
   | `SLACK_BOT_TOKEN` | Bot OAuth token (`xoxb-`) |
   | `SLACK_APP_TOKEN` | App-level token for Socket Mode (`xapp-`) |
   | `SLACK_SIGNING_SECRET` | Request signing secret |
   | `SLACK_USER_TOKEN` | User token (`xoxp-`) with `search:read.public`/`search:read.private` — required for RTS memory search |
   | `AIRTABLE_API_KEY` | Airtable personal access token |
   | `AIRTABLE_BASE_ID` | Base ID (`appXXXXXXXX`) |
   | `AIRTABLE_VOLUNTEERS_TABLE_ID` | Volunteers table ID |
   | `AIRTABLE_DECISIONS_TABLE_ID` | Decisions table ID |
   | `OPERATIONS_CHANNEL_ID` | Channel for orphan alerts |
   | `HURRICANE_BRIEF_CHANNEL_ID` | Channel for the seasonal brief |
   | `SEED_CHANNEL_ID` | Demo-only: channel for `seed:slack` |

---

## Running

```
npm run dev      # ts-node + nodemon (development)
npm run build    # compile to dist/
npm start        # run the compiled app
npm test         # run the Jest suite
```

On a successful start you'll see `REMEMBER is running`.

---

## Demo data

Seed realistic hurricane-response data for a demo (run in this order):

```
npm run seed         # Airtable: 6 volunteers + 6 decisions (mixed freshness)
npm run seed:slack   # Slack #disaster-ops: 5 decision threads (posted as the bot)
npm run seed:link    # points Maria Santos's roster entry at the bot's user id
```

`seed:link` exists because the Slack seed posts as the bot; it runs `auth.test` and maps Maria's `SlackUserId` to the bot so her memory card resolves cleanly (others intentionally show "Unknown — check roster manually", which motivates the orphan-alert feature).

> ⚠️ Re-running a seed script **adds** rows (no upsert). Clear old demo data before re-seeding.

See [`DEMO.md`](./DEMO.md) for the full recording script.

---

## Scripts reference

| Script | What it does |
|---|---|
| `npm run dev` | Run in development with reload |
| `npm run build` | Type-check + compile to `dist/` |
| `npm start` | Run compiled output |
| `npm test` | Jest unit tests (12 suites, 59 tests) |
| `npm run boot-check` | Dummy-credential boot check (no real tokens needed) |
| `npm run seed` | Seed Airtable demo data |
| `npm run seed:slack` | Seed Slack demo threads |
| `npm run seed:link` | Map Maria's roster entry to the bot user |
