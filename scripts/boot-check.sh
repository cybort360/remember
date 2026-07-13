#!/usr/bin/env bash
# Dummy-credential boot check.
#
# Verifies the app COMPILES and starts past config validation all the way to the
# Slack connection boundary, WITHOUT needing real credentials. Useful in CI or
# before a demo to catch TypeScript errors, missing env wiring, or broken
# startup — without a Slack workspace.
#
#   exit 0  → booted past config + started the scheduler (only the expected
#             invalid_auth remains, which real tokens resolve)
#   exit 1  → a real problem: TypeScript error, ConfigError, or no startup
#
# Run with: npm run boot-check
set -u

# Dummy values. dotenv does NOT override already-set process.env vars, so these
# take precedence over the blank .env during the check.
export SLACK_BOT_TOKEN=xoxb-dummy
export SLACK_APP_TOKEN=xapp-dummy
export SLACK_SIGNING_SECRET=dummy
export SLACK_USER_TOKEN=xoxp-dummy
export AIRTABLE_API_KEY=dummy
export AIRTABLE_BASE_ID=appDummy
export AIRTABLE_VOLUNTEERS_TABLE_ID=tblV
export AIRTABLE_DECISIONS_TABLE_ID=tblD
export OPERATIONS_CHANNEL_ID=C_DUMMY_OPS
export HURRICANE_BRIEF_CHANNEL_ID=C_DUMMY_HUR
export SEED_CHANNEL_ID=C_DUMMY_SEED

LOG="$(mktemp)"

# A healthy app keeps the socket open, so cap the run at 30s then terminate.
perl -e 'alarm shift; exec @ARGV' 30 npx ts-node src/app.ts > "$LOG" 2>&1

echo "----- boot output -----"
cat "$LOG"
echo "-----------------------"

if grep -qiE "ConfigError|TSError|error TS[0-9]" "$LOG"; then
  echo "❌ Boot check FAILED: TypeScript or config error (see output above)."
  rm -f "$LOG"
  exit 1
fi

if grep -q "Hurricane brief scheduler started" "$LOG"; then
  echo "✅ Boot check PASSED: compiled, passed config validation, started the scheduler."
  echo "   (invalid_auth from the dummy Slack token is expected — real tokens connect.)"
  rm -f "$LOG"
  exit 0
fi

echo "❌ Boot check FAILED: app never reached the scheduler-start marker."
rm -f "$LOG"
exit 1
