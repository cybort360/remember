# REMEMBER — Architecture Diagram

Renderable Mermaid source for the submission. GitHub/Devpost preview it inline;
to get a PNG/SVG for upload, paste into **https://mermaid.live** → Actions → Export.

```mermaid
flowchart TB
  subgraph SLACK["Slack — sandbox workspace"]
    U["👤 Volunteer / Ops lead"]
    HOME["App Home tab"]
    OPS["#operations"]
    HUR["#hurricane-ops"]
    DISASTER["#disaster-ops<br/>(past decision threads)"]
  end

  subgraph APP["REMEMBER · Slack Bolt app — Socket Mode, strict TypeScript"]
    HANDLERS["Handlers (route only)<br/>mention · slashCommands · homeTab"]
    subgraph SVC["Services (business logic)"]
      MS["memorySearch"]
      OM["orphanMonitor"]
      RS["rosterService"]
      DS["decisionsService"]
      FS["freshnessScorer"]
    end
    ST["seasonalTrigger<br/>node-cron — Sep 1 / on demand"]
    RC["rtsClient"]
    UI["Block Kit builders"]
  end

  subgraph EXT["External services"]
    RTS["Slack RTS API<br/>assistant.search.context"]
    AT["Airtable<br/>Volunteers · Decisions"]
  end

  U -->|"@mention · /remember-search"| HANDLERS
  U -->|"/hurricane-brief · /orphan-check"| HANDLERS
  U -->|opens| HOME --> HANDLERS

  HANDLERS --> MS
  HANDLERS --> OM
  HANDLERS --> ST
  HANDLERS --> DS

  MS --> RC
  OM --> RC
  ST --> RC
  RC -->|user token| RTS
  DISASTER -. "indexed for search" .-> RTS

  MS --> RS
  OM --> RS
  RS --> AT
  DS --> AT
  MS --> FS
  DS --> FS

  MS --> UI
  OM --> UI
  ST --> UI
  DS --> UI

  UI -->|memory cards| U
  OM -->|orphan alert| OPS
  ST -->|seasonal brief| HUR
  HANDLERS -->|publish dashboard| HOME
```

## The four flows

1. **Memory search** — `@mention` / `/remember-search` → `memorySearch` queries the
   **RTS API** (semantic), enriches each result with the decision owner
   (`rosterService` → Airtable) and a freshness score (`freshnessScorer`), and
   replies with Block Kit cards.
2. **Freshness / decay dashboard (Home tab)** — `homeTab` reads the Decisions
   registry (`decisionsService` → Airtable), scores each by `LastVerified`, and
   publishes the 🟢/🟡/🔴 health view.
3. **Orphan monitor** — `/orphan-check` → `orphanMonitor` finds inactive
   volunteers (`rosterService`), searches their decisions via RTS, and posts a
   reassignment alert to `#operations`.
4. **Seasonal brief** — `node-cron` (Sep 1) or `/hurricane-brief` → `seasonalTrigger`
   pulls last-season threads via RTS and posts the protocol review to
   `#hurricane-ops`.

**Hackathon technology:** Slack **Real-Time Search (RTS) API** (`assistant.search.context`).
Airtable (via the Airtable API) backs the roster + decision registry; Block Kit
renders the UI.
