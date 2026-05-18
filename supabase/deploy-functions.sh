#!/usr/bin/env sh

set -eu

PROJECT_REF="${1:-}"
ENV_FILE="${2:-supabase/functions/.env}"

if [ -z "$PROJECT_REF" ]; then
  echo "Usage: ./supabase/deploy-functions.sh <project-ref> [env-file]" >&2
  exit 1
fi

npx supabase secrets set --env-file "$ENV_FILE" --project-ref "$PROJECT_REF"

for fn in \
  request-tts-audio \
  create-snippet \
  update-snippet \
  delete-snippet \
  extract-snippet-ocr \
  cleanup-audio-cache
do
  npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
done
