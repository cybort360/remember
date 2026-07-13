# CLAUDE.md — REMEMBER Project Standards

## Project Context

REMEMBER is a Slack agent for disaster response volunteer organizations. It preserves institutional memory by surfacing past decisions, flagging stale knowledge, and alerting teams when decision owners leave.

- Stack: TypeScript, Slack Bolt, Slack RTS API, Slack AI, Airtable MCP
- Entry point: `src/app.ts`
- Architecture reference: `architecture.md`

Read `architecture.md` before writing any code. Every file you create must fit the structure defined there.

---

## TypeScript Rules

- Strict mode is on. Never use `any`. Use `unknown` when the type is genuinely unknown, then narrow it with a type guard before use.
- Every function must have an explicit return type annotation. No inferred returns.
- Use `interface` for object shapes. Use `type` for unions, aliases, and utility types.
- Prefer `const` over `let`. Never use `var`.
- No unused variables or imports. Fix compiler errors before moving on.
- No non-null assertions (`!`) unless you have just checked the value is not null above it.

---

## Naming Conventions

### Files
`camelCase.ts` — descriptive, no abbreviations.

```
// Good
memorySearch.ts
freshnessScorer.ts
orphanMonitor.ts

// Bad
ms.ts
helper.ts
utils2.ts
search.ts
```

### Functions
`camelCase`, verb-first, descriptive. A function name should tell you what it does without reading the body.

```typescript
// Good
async function searchMemory(query: string): Promise<SearchResult[]>
function calculateFreshness(lastVerified: Date): FreshnessScore
function buildMemoryCard(result: SearchResult): Block[]

// Bad
async function search(q: string)
function calc(d: Date)
function card(r: any)
```

### Variables
`camelCase`, descriptive names. No single-letter variables except loop indices (`i`, `j`). No generic names like `data`, `result`, `res`, `temp`, `val`.

```typescript
// Good
const volunteerRecord = await rosterService.findBySlackId(userId);
const threadResults = await searchMemory(query);
const freshnessScore = calculateFreshness(decision.lastVerified);

// Bad
const data = await rosterService.findBySlackId(userId);
const r = await searchMemory(query);
const s = calculateFreshness(decision.lastVerified);
```

### Types and Interfaces
`PascalCase`, noun-first. No `I` prefix on interfaces.

```typescript
// Good
interface VolunteerRecord { ... }
interface SearchResult { ... }
type FreshnessScore = 'GREEN' | 'YELLOW' | 'RED';

// Bad
interface IVolunteer { ... }
type searchResultType = { ... }
```

### Constants
`SCREAMING_SNAKE_CASE` for values that never change at runtime.

```typescript
// Good
const FRESHNESS_THRESHOLDS = { GREEN: 30, YELLOW: 180 } as const;
const MAX_SEARCH_RESULTS = 5;

// Bad
const threshold = { green: 30, yellow: 180 };
const max = 5;
```

### Environment Variables
`SCREAMING_SNAKE_CASE` with a service prefix. Always access via a validated config object, not directly from `process.env`.

```
SLACK_BOT_TOKEN
SLACK_APP_TOKEN
SLACK_SIGNING_SECRET
AIRTABLE_API_KEY
AIRTABLE_BASE_ID
AIRTABLE_VOLUNTEERS_TABLE_ID
AIRTABLE_DECISIONS_TABLE_ID
OPERATIONS_CHANNEL_ID
HURRICANE_BRIEF_CHANNEL_ID
```

---

## File Structure Rules

- One responsibility per file. If a file does two distinct things, split it.
- **Handlers only route.** They receive Slack events and call services. Zero business logic in handlers.
- **Services contain all business logic.** They do not import from handlers or UI builders.
- **All Block Kit JSON lives in `src/ui/`.** No Block Kit objects outside that folder.
- **All shared types live in `src/types/index.ts`.** No inline type definitions in service files.
- **All secrets come from `.env`.** No hardcoded tokens, IDs, or API keys anywhere.

---

## Error Handling

Every async function that calls an external API must follow this pattern:

```typescript
import { logger } from '../utils/logger';
import { buildErrorCard } from '../ui/errorCard';

async function searchMemory(query: string, userId: string): Promise<SearchResult[]> {
  try {
    const results = await rtsClient.search(query);
    return results;
  } catch (error) {
    logger.error('RTS search failed', { query, userId, error });
    throw new MemorySearchError('Search is temporarily unavailable.');
  }
}
```

Rules:
1. Wrap every external call in try/catch.
2. Log the error with context before throwing or handling it.
3. Throw a typed custom error (from `src/utils/errors.ts`), not a raw `Error`.
4. Never surface raw error messages, stack traces, or API error codes to the user in Slack.

### User-Facing Error Messages
All errors shown to users in Slack must:
- Use plain language ("Search is temporarily unavailable" not "RTS API returned 503")
- Suggest a next action where possible ("Try again in a moment, or search Slack directly.")
- Be built with `buildErrorCard()` from `src/ui/errorCard.ts`

### Graceful Degradation
When a dependency is down, the agent degrades gracefully rather than failing completely:

| What's down | What to do |
|---|---|
| Airtable MCP | Search still works. Show "Unknown — check roster manually" for ownership. |
| RTS API | Return error card with link to search Slack manually. |
| Slack AI summarization | Return raw thread excerpts with a note. |
| No results found | Return "No memory found" card with suggestion to add to decision registry. |

### Custom Error Classes (`src/utils/errors.ts`)
Create a named error class for each service boundary:

```typescript
export class MemorySearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemorySearchError';
  }
}

export class RosterServiceError extends Error { ... }
export class OrphanMonitorError extends Error { ... }
```

---

## Logging

Use the structured logger from `src/utils/logger.ts`. Never use `console.log` in any file under `src/`.

### Log Levels

| Level | When to use |
|---|---|
| `logger.info` | Normal operations: search completed, volunteer flagged, brief posted |
| `logger.warn` | Degraded state: Airtable unavailable, no search results, skipping optional step |
| `logger.error` | Failures that need attention: API errors, handler crashes, unhandled exceptions |

### Log Format
Every log call takes a message string and a context object. The context object must include all relevant identifiers.

```typescript
// Good
logger.info('Memory search completed', { userId, query, resultCount: results.length });
logger.warn('Airtable unavailable, skipping ownership check', { userId, query });
logger.error('RTS search failed', { userId, query, error });

// Bad
logger.info('done');
logger.error(error.message);
console.log('search result:', result);
```

---

## Code Style

- Functions longer than 40 lines must be split into smaller functions.
- No magic numbers. Every numeric threshold must be a named constant.
- No commented-out code. Delete it. Use git to recover old code if needed.
- No TODO comments without a linked issue: `// TODO #12: add pagination to RTS results`
- Keep Block Kit JSON construction inside builder functions in `src/ui/`. Never build Block Kit objects inline in handlers or services.
- Async/await only. No `.then()` chains.

---

## Testing

Every service function gets at least one unit test.

### File Location
Tests mirror the source structure under `src/__tests__/`:
```
src/__tests__/services/memorySearch.test.ts
src/__tests__/services/freshnessScorer.test.ts
src/__tests__/services/rosterService.test.ts
src/__tests__/services/orphanMonitor.test.ts
src/__tests__/ui/memoryCard.test.ts
```

### Test Names
Use descriptive names that read as sentences:

```typescript
// Good
it('returns GREEN when decision was verified 10 days ago')
it('returns RED when lastVerified is null')
it('flags volunteer as inactive when Airtable status is Inactive')
it('builds error card when RTS API throws')

// Bad
it('works')
it('test freshness')
it('should return something')
```

### Mocking
Mock all external API calls. Never make real Slack or Airtable API calls in tests.

```typescript
jest.mock('../services/rtsClient');
jest.mock('../services/airtableClient');
```

---

## Environment Variables

All secrets and config live in `.env`. The `.env.example` file must be updated every time a new variable is added.

Never access `process.env` directly in service or handler files. Create a validated config object in `src/utils/config.ts` and import from there:

```typescript
// src/utils/config.ts
export const config = {
  slack: {
    botToken: requireEnv('SLACK_BOT_TOKEN'),
    appToken: requireEnv('SLACK_APP_TOKEN'),
    signingSecret: requireEnv('SLACK_SIGNING_SECRET'),
  },
  airtable: {
    apiKey: requireEnv('AIRTABLE_API_KEY'),
    baseId: requireEnv('AIRTABLE_BASE_ID'),
    volunteersTableId: requireEnv('AIRTABLE_VOLUNTEERS_TABLE_ID'),
    decisionsTableId: requireEnv('AIRTABLE_DECISIONS_TABLE_ID'),
  },
  channels: {
    operations: requireEnv('OPERATIONS_CHANNEL_ID'),
    hurricaneBrief: requireEnv('HURRICANE_BRIEF_CHANNEL_ID'),
  },
};

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}
```

If a required variable is missing, the app must throw at startup, not at runtime.

---

## Git Commit Style

Format: `type: short description in present tense`

| Type | When to use |
|---|---|
| `feat` | New feature or behavior |
| `fix` | Bug fix |
| `refactor` | Code change with no behavior change |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `chore` | Config, tooling, dependencies |

```
// Good
feat: add freshness score to memory card
fix: handle Airtable timeout in roster service
refactor: extract Block Kit card logic into memoryCard.ts
test: add unit tests for freshnessScorer

// Bad
update stuff
fixed bug
wip
```

One logical change per commit. Do not bundle unrelated changes in a single commit.

---

## What Good Code Looks Like in This Project

A well-written handler:
```typescript
// src/handlers/mention.ts
export async function handleMention({ event, say, client }: MentionArgs): Promise<void> {
  const query = extractQuery(event.text);

  try {
    const results = await searchMemory(query, event.user);
    const cards = results.map(buildMemoryCard);
    await say({ blocks: cards, thread_ts: event.ts });
  } catch (error) {
    logger.error('Mention handler failed', { userId: event.user, query, error });
    await say({ blocks: buildErrorCard('Search is temporarily unavailable.'), thread_ts: event.ts });
  }
}
```

What makes it good: thin handler, calls services, catches and degrades gracefully, logs with context, no Block Kit JSON inline, explicit types.
