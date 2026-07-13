# REMEMBER — Slack App Setup (manual / Socket Mode)

This sets up the Slack app our existing Bolt project connects to. ~10 minutes.
You do these steps in the browser + terminal; they can't be automated for you
(they need your Slack login).

---

## 1. Create the app from the manifest

1. Go to **https://api.slack.com/apps** → **Create New App** → **From a manifest**.
2. Pick your **sandbox workspace**.
3. Paste the contents of [`manifest.json`](./manifest.json) (switch the editor to JSON), review, **Create**.

This provisions: bot user, Home tab, the 3 slash commands, event subscriptions
(`app_mention`, `app_home_opened`), Socket Mode, interactivity, and scopes
(bot + the RTS `search:read.public` / `search:read.private` **user** scopes).

## 2. Install to the workspace + grab tokens

1. **Install App** (left nav) → **Install to Workspace** → Allow.
2. From **OAuth & Permissions**, copy:
   - **Bot User OAuth Token** → `xoxb-…` → `SLACK_BOT_TOKEN`
   - **User OAuth Token** → `xoxp-…` (has `search:read`) → `SLACK_USER_TOKEN`
3. **Basic Information → App-Level Tokens → Generate Token and Scopes**: add scope
   `connections:write`, generate → `xapp-…` → `SLACK_APP_TOKEN` (powers Socket Mode).
4. **Basic Information → Signing Secret** → `SLACK_SIGNING_SECRET`.

## 3. Create channels + get their IDs

Create these channels and invite the bot to each (`/invite @REMEMBER`):
- `#disaster-ops` → `SEED_CHANNEL_ID`
- `#operations` → `OPERATIONS_CHANNEL_ID`
- a hurricane channel (e.g. `#hurricane-ops`) → `HURRICANE_BRIEF_CHANNEL_ID`

To get a channel ID: open the channel → click its name → the **Channel ID**
(`C…`) is at the bottom of the dialog.

## 4. Fill `.env`

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...
SLACK_USER_TOKEN=xoxp-...        # required for memory search (see note below)
AIRTABLE_API_KEY=...
AIRTABLE_BASE_ID=app...
AIRTABLE_VOLUNTEERS_TABLE_ID=tbl...
AIRTABLE_DECISIONS_TABLE_ID=tbl...
OPERATIONS_CHANNEL_ID=C...
HURRICANE_BRIEF_CHANNEL_ID=C...
SEED_CHANNEL_ID=C...
```

## 5. Seed demo data + run

```
npm run seed         # Airtable volunteers + decisions
npm run seed:slack   # Slack threads in #disaster-ops
npm run seed:link    # map Maria to the bot user
npm run dev          # → "REMEMBER is running"
```

---

## Memory search uses the RTS API + your user token

Memory search (`@mention` / `/remember-search`), the orphan check, and the
hurricane brief all use Slack's **Real-Time Search API** (`assistant.search.context`),
which requires a **user token** with `search:read.public` / `search:read.private`.
This is already wired in the code (see `src/services/rtsClient.ts`) — just make
sure `SLACK_USER_TOKEN` (the `xoxp-` token from step 2) is set in `.env`.
