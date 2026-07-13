# REMEMBER — System Architecture

## What It Is

REMEMBER is a Slack agent that preserves institutional memory for disaster response volunteer organizations. Volunteer turnover wipes out critical knowledge every year — who holds the shelter keys, what the pet policy is, whether the generator was fixed. REMEMBER makes that knowledge searchable, freshness-scored, and self-maintaining.

Built for the Slack Agent Builder Challenge — Agent for Good track.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Slack Framework | Slack Bolt for JavaScript (Socket Mode) |
| Search / AI retrieval | Real-Time Search (RTS) API — `assistant.search.context` (semantic) |
| UI | Block Kit (cards, Home tab) |
| Data Store | Airtable (volunteer roster + decision registry), via the Airtable API |
| Scheduling | node-cron (seasonal trigger) |
| Runtime | Node.js 20+ |
| Deployment | Railway (or local via ngrok for dev) |

> **Implementation note:** the hackathon technology used is the **RTS API**. Airtable is accessed through the Airtable API (not an MCP server), and AI thread summarization (`assistant.threads.summarize`) is a planned enhancement — cards currently render the raw thread excerpt.

---

## System Components

### 1. Slack Bolt App (`src/app.ts`)
Entry point. Initializes the Bolt app, registers all event listeners, middleware, and scheduled jobs. Does not contain business logic.

### 2. Memory Search Engine (`src/services/memorySearch.ts`)
The core feature. Takes a natural language query, calls the RTS API to search past Slack threads, enriches each result with the decision owner (from Airtable) and a freshness score, and returns a structured result object. This is the component everything else depends on.

### 3. Volunteer Roster Service (`src/services/rosterService.ts`)
Connects to Airtable via the Airtable API. Looks up volunteers by Slack user ID. Checks whether a decision owner is currently active. Returns volunteer metadata attached to search results.

### 4. Freshness Scorer (`src/services/freshnessScorer.ts`)
Stateless utility. Takes a date, returns a freshness score (GREEN / YELLOW / RED) based on how old the information is. Applied to every search result before rendering.

### 5. Orphan Monitor (`src/services/orphanMonitor.ts`)
Background service. Triggered when a volunteer's status in Airtable changes to "Inactive." Uses RTS to find all threads where they were a decision owner. Posts an alert to `#operations` with a reassignment prompt.

### 6. Seasonal Trigger (`src/triggers/seasonalTrigger.ts`)
Scheduled job (every September 1, plus on-demand via `/hurricane-brief`). Pulls last year's hurricane response threads via RTS, generates a protocol review brief, and posts it to the designated channel.

### 7. Block Kit UI Builders (`src/ui/`)
All Block Kit JSON construction lives here. `memoryCard.ts` builds search result cards. `dashboardView.ts` builds the Home tab. No Block Kit JSON appears anywhere else in the codebase.

---

## Data Flow

### Memory Search Flow
```
User @mentions REMEMBER or uses /remember-search
        │
        ▼
mention.ts handler (routes only, no logic)
        │
        ▼
memorySearch.ts → RTS API (semantic search over Slack history)
        │
        ▼
rosterService.ts → Airtable API (check if decision owner is active)
        │
        ▼
freshnessScorer.ts (calculate GREEN / YELLOW / RED per result)
        │
        ▼
Slack AI (summarize thread results into plain-language answer)
        │
        ▼
memoryCard.ts (build Block Kit response)
        │
        ▼
Post to channel thread
```

### Orphaned Decision Flow
```
Airtable webhook → volunteer status → "Inactive"
        │
        ▼
orphanMonitor.ts → RTS API (find threads owned by this volunteer)
        │
        ▼
Build alert with list of orphaned decisions
        │
        ▼
Post to #operations with reassignment prompt buttons
```

### Seasonal Trigger Flow
```
Cron job fires (September 1) OR user runs /hurricane-brief
        │
        ▼
seasonalTrigger.ts → RTS API (search hurricane* threads from past 18 months)
        │
        ▼
Slack AI (summarize into protocol review brief)
        │
        ▼
freshnessScorer.ts (score each protocol item)
        │
        ▼
Post to #hurricane-ops with full review brief
```

---

## File Structure

```
remember/
├── src/
│   ├── app.ts                    # Bolt app entry point, event registration
│   ├── handlers/
│   │   ├── mention.ts            # App mention handler (@REMEMBER ...)
│   │   ├── homeTab.ts            # Home tab opened event
│   │   └── slashCommands.ts      # /remember-search, /hurricane-brief
│   ├── services/
│   │   ├── memorySearch.ts       # RTS query + owner/freshness enrichment
│   │   ├── rosterService.ts      # Airtable volunteer lookups
│   │   ├── freshnessScorer.ts    # Date-based freshness calculation
│   │   └── orphanMonitor.ts      # Inactive volunteer decision scan + alert
│   ├── triggers/
│   │   └── seasonalTrigger.ts    # Hurricane season scheduled brief
│   ├── ui/
│   │   ├── memoryCard.ts         # Block Kit search result card builder
│   │   ├── dashboardView.ts      # Block Kit Home tab view builder
│   │   └── errorCard.ts          # Block Kit error state builder
│   ├── utils/
│   │   ├── logger.ts             # Structured logger (wraps pino or winston)
│   │   └── errors.ts             # Custom error classes
│   └── types/
│       └── index.ts              # All shared TypeScript interfaces and types
├── src/__tests__/
│   ├── services/
│   │   ├── memorySearch.test.ts
│   │   ├── rosterService.test.ts
│   │   ├── freshnessScorer.test.ts
│   │   └── orphanMonitor.test.ts
│   └── ui/
│       └── memoryCard.test.ts
├── .env
├── .env.example
├── CLAUDE.md
├── architecture.md
├── package.json
└── tsconfig.json
```

---

## Airtable Schema

### Volunteers Table

| Field | Type | Notes |
|---|---|---|
| Name | Single line text | Full name |
| SlackUserId | Single line text | Slack user ID (Uxxxxxxxx format) |
| Role | Single line text | e.g., "Shelter Coordinator" |
| Status | Single select | Active / Inactive |
| JoinDate | Date | When they joined the org |
| LastActiveDate | Date | Last confirmed active |

### Decisions Table

| Field | Type | Notes |
|---|---|---|
| DecisionTitle | Single line text | Brief description of the decision |
| SlackThreadLink | URL | Permalink to the original Slack thread |
| OwnerSlackId | Single line text | Slack user ID of the decision owner |
| Category | Single select | Shelter / Supply / Policy / Logistics / Medical |
| LastVerified | Date | When this was last confirmed accurate |
| Status | Single select | Active / Orphaned / Resolved |

---

## Freshness Score Logic

Calculated at render time. Not stored.

| Age of Information | Score | Block Kit Color |
|---|---|---|
| Verified within 30 days | GREEN | `#2EB67D` |
| 30 to 180 days old | YELLOW | `#ECB22E` |
| Over 180 days, or never verified | RED | `#E01E5A` |

The `LastVerified` field in the Decisions table is the source of truth. If it is null, score defaults to RED.

---

## Graceful Degradation Rules

| Failure | Behavior |
|---|---|
| RTS API unavailable | Return error card with manual Slack search link |
| Airtable unavailable | Search still works; ownership shows "Unknown — check roster manually" |
| Slack AI summarization fails | Return raw thread excerpts with a note that summarization is unavailable |
| No search results found | Return a "No memory found" card with suggestion to add this to the decision registry |

---

## Environment Variables

```
SLACK_BOT_TOKEN=           # Bot OAuth token (xoxb-)
SLACK_APP_TOKEN=           # App-level token for Socket Mode (xapp-)
SLACK_SIGNING_SECRET=      # Request signing secret
AIRTABLE_API_KEY=          # Airtable personal access token
AIRTABLE_BASE_ID=          # Base ID (appXXXXXXXX)
AIRTABLE_VOLUNTEERS_TABLE_ID=
AIRTABLE_DECISIONS_TABLE_ID=
OPERATIONS_CHANNEL_ID=     # Channel ID for orphan decision alerts
HURRICANE_BRIEF_CHANNEL_ID= # Channel ID for seasonal trigger posts
```

---

## Prize Target Alignment

| Prize | How REMEMBER Targets It |
|---|---|
| 1st Place — Agent for Good ($8K) | Life-critical problem, nonprofit focus, concrete measurable impact |
| Most Innovative ($2K) | Seasonal memory + knowledge decay are category-new concepts for Slack |
| Best Tech Implementation ($2K) | Built on the RTS API (semantic search) with a clean, fully-tested TypeScript codebase; Airtable + Block Kit complete the implementation |
| Best UX ($2K) | Block Kit freshness scoring, Home tab dashboard, inline reassignment prompts |
