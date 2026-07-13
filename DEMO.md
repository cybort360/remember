# REMEMBER — Demo Script

A four-beat recording flow. The two knowledge stories are split **deliberately**:
the **@mention** beat is "it found the answer," the **Home tab** beat is "it knows
what's stale."

Don't try to show freshness decay in the @mention flow — seeded Slack threads are
posted live, so their search-derived freshness is always 🟢 GREEN. Decay
(🔴/🟡) is shown **exclusively** through the Home tab, which reads `LastVerified`
from the Airtable Decisions registry.

## How retrieval works (so the narration is accurate)
Search uses Slack's **Real-Time Search (RTS) API** (`assistant.search.context`),
which is **semantic**, not keyword/boolean. Two consequences:
- Phrase demo queries in natural language (no `AND`/`OR`/quotes).
- The "AI" angle is **semantic, agentic retrieval via the RTS API** over the
  workspace (Airtable backs the decision registry / freshness) — **not** thread
  summarization. Slack's `assistant.threads.summarize` isn't a live method, so
  cards show the real thread **excerpt**, not an AI summary — don't claim "it
  summarized."

---

## One-time setup (before recording)

1. Fill `.env` with real sandbox values — all keys, including `SLACK_USER_TOKEN`
   (the `xoxp-` token RTS runs on) and `SEED_CHANNEL_ID`.
2. Slack app (created from `manifest.json`): Socket Mode on; **bot** scopes
   `app_mentions:read`, `chat:write`, `chat:write.customize`, `commands`; **user**
   scopes `search:read.public`, `search:read.private`; events `app_mention`,
   `app_home_opened`; slash commands `/remember-search`, `/hurricane-brief`,
   `/orphan-check`. Invite the bot to `#disaster-ops`, `#operations`, and the
   hurricane-brief channel.
3. Seed data, in order:
   ```
   npm run seed         # Airtable: 6 volunteers + 6 decisions (freshness spread)
   npm run seed:slack   # Slack #disaster-ops: 5 hurricane-response threads
   npm run seed:link    # points Maria Santos at the RTS bot-author id
   ```
4. `npm run dev` → wait for `REMEMBER is running`.

**Why `seed:link`:** the Slack seed posts every thread as the bot (with a custom
username), and RTS tags those app-authored messages with the synthetic author id
`U00` — not the bot's real user id. `seed:link` sets **Maria Santos**'s
`SlackUserId` to `U00`, so the seeded-thread cards resolve to her. Other volunteers
stay on placeholder ids; their cards read "Unknown — check roster manually," which
sets up the orphan-alert beat.

---

## Beat 1 — "It found the answer" (@mention)

> "First, let's see REMEMBER answer a real question."

In a channel the bot is in (e.g. `#disaster-ops`):

```
@REMEMBER Who has the keys to Westside shelter and what's the pet policy?
```

**Show:** the reply cards in-thread — semantic retrieval across past decision
threads (one card per thread), the **owner resolving to Maria Santos / 🟢 Active**,
and "View original thread" links back to `#disaster-ops`.

> "It searched the team's past conversations, pulled the actual decision threads,
> and tied them to the person who owns them — Maria."

Don't mention freshness colors here (they'll be GREEN — that's the next beat), and
don't say "summarized" (the card shows the real thread excerpt).

---

## Beat 2 — "It knows what's stale" (Home tab)

> "Now here's what the Home tab shows the operations lead every morning."

Open the REMEMBER **App Home** tab.

**Show:** the Memory Health line — **🟢 2 fresh · 🟡 1 aging · 🔴 3 stale** — scored
from Airtable `LastVerified`:
- 🟢 Pet policy (15d), Volunteer check-in (20d)
- 🟡 Insulin cooler storage (45d)
- 🔴 Backup generator (14mo), Shelter keyholder (8mo), Supply truck routes (8mo)

> "Every decision is freshness-scored. The red ones haven't been verified in
> months — institutional knowledge quietly going stale."

---

## Beat 3 — "It catches knowledge walking out the door" (orphan alert)

> "Watch what happens when someone leaves."

Note: James/Carlos/Derek are **already** seeded inactive, so flip an **active**
volunteer live to show the transition.

1. In Airtable, set **Priya Nair**'s Status from `Active` → `Inactive`.
   *(Priya is named in the insulin-cooler thread, so RTS can attribute her
   decision. Maria works too; Tasha/Carlos/Derek aren't named in message text, so
   RTS attribution for them is weak.)*
2. In Slack, run `/orphan-check`.

**Show:** the alert posted to `#operations` — orphaned decisions with former owner,
thread link, and the "Who owns this now? Reply in thread." prompt.

> "The moment a volunteer goes inactive, REMEMBER finds the decisions they owned
> and asks the team to reassign them — before the knowledge is lost."

*(`/orphan-check` is a temporary demo command; remove it after recording.)*

---

## Beat 4 — "It shows up before the season does" (seasonal brief)

> "And it doesn't wait to be asked."

Run `/hurricane-brief`.

**Show:** the 🌀 Hurricane Season Protocol Review posted to the hurricane-brief
channel — protocol topics, excerpts, freshness, thread links, auto-generated
footer.

> "On September 1st every year this posts automatically — a protocol review built
> from last season's actual decisions."

---

## Before / after recording

**Clean the channels first** (test runs leave artifacts):
- `#operations` — keep one clean orphan alert; delete earlier/duplicate ones.
- the hurricane-brief channel — delete any empty "No hurricane-related decisions"
  brief; keep the one with items.
- `#disaster-ops` — delete test @mentions, the bot's reply cards, and any
  "message was deleted" lines; keep the 5 seeded threads.

**After recording:**
- Remove the temporary `/orphan-check` command (code in `app.ts` /
  `slashCommands.ts`, plus the Slack slash-command config) — or keep it
  intentionally.
- Re-running any seed script **adds** rows; clear old demo data first if you
  re-seed.
