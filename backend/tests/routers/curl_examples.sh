#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# curl_examples.sh — manual smoke tests for the v2 /notes endpoints
#
# Usage:
#   1. Start the API:  docker compose up   (or uvicorn app.main:app --reload)
#   2. Run this file:  bash tests/routers/curl_examples.sh
#
# Requirements: curl, jq (optional — used for pretty-printing only)
# ─────────────────────────────────────────────────────────────────────────────

BASE="${API_BASE:-http://localhost:8000}"
JQ=$(command -v jq 2>/dev/null && echo "jq ." || echo "cat")

echo
echo "══════════════════════════════════════════"
echo "  0. Health check"
echo "══════════════════════════════════════════"
curl -s "${BASE}/health" | ${JQ}

echo
echo "══════════════════════════════════════════"
echo "  1. POST /notes — ingest a new note"
echo "══════════════════════════════════════════"
POST_RESP=$(curl -s -X POST "${BASE}/notes/" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Transformer models use self-attention to process all tokens in parallel. BERT is bidirectional; GPT is autoregressive. Both require large datasets and significant compute."
  }')
echo "${POST_RESP}" | ${JQ}

# Extract the note id for subsequent requests
NOTE_ID=$(echo "${POST_RESP}" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "1")
echo "→ Created note id: ${NOTE_ID}"

echo
echo "══════════════════════════════════════════"
echo "  2. GET /notes — list notes"
echo "══════════════════════════════════════════"
curl -s "${BASE}/notes/" | ${JQ}

echo
echo "══════════════════════════════════════════"
echo "  3. GET /notes/${NOTE_ID} — fetch single note"
echo "══════════════════════════════════════════"
curl -s "${BASE}/notes/${NOTE_ID}" | ${JQ}

echo
echo "══════════════════════════════════════════"
echo "  4. PATCH /notes/${NOTE_ID} — update title"
echo "══════════════════════════════════════════"
curl -s -X PATCH "${BASE}/notes/${NOTE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"title": "My Edited Title About Transformers"}' | ${JQ}

echo
echo "══════════════════════════════════════════"
echo "  5. GET /notes/search?q=attention"
echo "══════════════════════════════════════════"
curl -s "${BASE}/notes/search?q=attention+mechanisms" | ${JQ}

echo
echo "══════════════════════════════════════════"
echo "  5b. GET /notes/search with threshold"
echo "══════════════════════════════════════════"
curl -s "${BASE}/notes/search?q=transformer+training&threshold=0.3&limit=5" | ${JQ}

echo
echo "══════════════════════════════════════════"
echo "  6. GET /search/related/${NOTE_ID}"
echo "══════════════════════════════════════════"
curl -s "${BASE}/search/related/${NOTE_ID}" | ${JQ}

echo
echo "══════════════════════════════════════════"
echo "  7. DELETE /notes/${NOTE_ID}"
echo "══════════════════════════════════════════"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${BASE}/notes/${NOTE_ID}")
echo "→ HTTP ${HTTP_STATUS}  (expected 204)"

echo
echo "══════════════════════════════════════════"
echo "  8. GET /notes after delete (expect empty)"
echo "══════════════════════════════════════════"
curl -s "${BASE}/notes/" | ${JQ}

echo
echo "Done."
