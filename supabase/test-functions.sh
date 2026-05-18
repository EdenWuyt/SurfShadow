#!/usr/bin/env sh

set -eu

BASE_URL="${1:-}"
ACCESS_TOKEN="${2:-}"
IMAGE_PATH="${3:-}"

if [ -z "$BASE_URL" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "Usage: ./supabase/test-functions.sh <functions-base-url> <access-token> [image-path]" >&2
  echo "Example: ./supabase/test-functions.sh https://your-project-ref.supabase.co/functions/v1 <token> ./sample.png" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

CREATE_PAYLOAD="$TMP_DIR/create.json"
UPDATE_PAYLOAD="$TMP_DIR/update.json"
DELETE_PAYLOAD="$TMP_DIR/delete.json"
TTS_PAYLOAD="$TMP_DIR/tts.json"
CREATE_RESPONSE="$TMP_DIR/create-response.json"
UPDATE_RESPONSE="$TMP_DIR/update-response.json"
DELETE_RESPONSE="$TMP_DIR/delete-response.json"
TTS_RESPONSE="$TMP_DIR/tts-response.json"
OCR_RESPONSE="$TMP_DIR/ocr-response.json"
CLEANUP_RESPONSE="$TMP_DIR/cleanup-response.json"

TEXT_VALUE="Smoke test snippet $(date +%s)"
UPDATED_TEXT_VALUE="${TEXT_VALUE} updated"

cat >"$CREATE_PAYLOAD" <<EOF
{"text":"$TEXT_VALUE","language":"en-US","tagNames":["smoke-test"]}
EOF

cat >"$TTS_PAYLOAD" <<EOF
{"text":"$TEXT_VALUE","language":"en-US","voice":"en-US-JennyNeural","speed":1}
EOF

post_json() {
  url="$1"
  payload_file="$2"
  output_file="$3"

  http_code="$(curl -sS -o "$output_file" -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    --data @"$payload_file" \
    "$url")"

  if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
    echo "Request failed: $url ($http_code)" >&2
    cat "$output_file" >&2
    exit 1
  fi
}

post_form() {
  url="$1"
  image_file="$2"
  output_file="$3"

  http_code="$(curl -sS -o "$output_file" -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "image=@$image_file" \
    "$url")"

  if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
    echo "Request failed: $url ($http_code)" >&2
    cat "$output_file" >&2
    exit 1
  fi
}

get_json() {
  url="$1"
  output_file="$2"

  http_code="$(curl -sS -o "$output_file" -w "%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "$url")"

  if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
    echo "Request failed: $url ($http_code)" >&2
    cat "$output_file" >&2
    exit 1
  fi
}

json_field() {
  file_path="$1"
  field_path="$2"

  node -e "
    const fs = require('fs')
    const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'))
    const value = process.argv[2].split('.').reduce((current, key) => current?.[key], data)
    if (value === undefined || value === null) process.exit(1)
    process.stdout.write(String(value))
  " "$file_path" "$field_path"
}

echo "Testing create-snippet..."
post_json "$BASE_URL/create-snippet" "$CREATE_PAYLOAD" "$CREATE_RESPONSE"
SNIPPET_ID="$(json_field "$CREATE_RESPONSE" "snippet.id")"

cat >"$UPDATE_PAYLOAD" <<EOF
{"snippetId":"$SNIPPET_ID","text":"$UPDATED_TEXT_VALUE","language":"en-US","tagNames":["smoke-test","updated"]}
EOF

cat >"$DELETE_PAYLOAD" <<EOF
{"snippetId":"$SNIPPET_ID"}
EOF

echo "Testing update-snippet..."
post_json "$BASE_URL/update-snippet" "$UPDATE_PAYLOAD" "$UPDATE_RESPONSE"

echo "Testing request-tts-audio..."
post_json "$BASE_URL/request-tts-audio" "$TTS_PAYLOAD" "$TTS_RESPONSE"
TTS_AUDIO_COUNT="$(node -e "
  const fs = require('fs')
  const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'))
  if (!Array.isArray(data.audio) || data.audio.length === 0) process.exit(1)
  process.stdout.write(String(data.audio.length))
" "$TTS_RESPONSE")"

if [ -n "$IMAGE_PATH" ]; then
  echo "Testing extract-snippet-ocr..."
  post_form "$BASE_URL/extract-snippet-ocr" "$IMAGE_PATH" "$OCR_RESPONSE"
else
  echo "Skipping extract-snippet-ocr (no image path provided)."
fi

echo "Testing delete-snippet..."
post_json "$BASE_URL/delete-snippet" "$DELETE_PAYLOAD" "$DELETE_RESPONSE"

echo "Testing cleanup-audio-cache..."
get_json "$BASE_URL/cleanup-audio-cache" "$CLEANUP_RESPONSE"

echo ""
echo "Smoke test completed."
echo "Created snippet id: $SNIPPET_ID"
echo "TTS audio bytes returned: $TTS_AUDIO_COUNT"
if [ -n "$IMAGE_PATH" ]; then
  echo "OCR text preview: $(json_field "$OCR_RESPONSE" "text" | cut -c1-80)"
fi
