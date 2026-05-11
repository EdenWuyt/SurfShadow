# Supabase Functions

This folder holds the server-side Supabase Edge Functions used by SurfShadow.

## Functions

- `functions/request-tts-audio`
  Authenticated Azure AI TTS proxy with shared cache lookup in `audio_cache`.
- `functions/create-snippet`
  Authenticated snippet creation endpoint with tag normalization and dedupe handling.
- `functions/update-snippet`
  Authenticated snippet update endpoint with server-side tag normalization.
- `functions/delete-snippet`
  Authenticated snippet deletion endpoint for web and extension write flows.
- `functions/extract-snippet-ocr`
  Authenticated OCR proxy for uploaded images used by the web snippet intake flow.
- `functions/cleanup-audio-cache`
  Deletes expired cache rows and matching Storage objects.

## Architecture: Edge Functions vs. Client SDK

SurfShadow follows the Supabase best practice of **using the client SDK with Row Level Security (RLS) directly whenever possible**. Edge Functions are only introduced when the client cannot securely or efficiently perform an action.

- **Why TTS and OCR use Edge Functions**: These require private API keys (`AZURE_SPEECH_KEY`, `AZURE_VISION_KEY`). Exposing these keys in the frontend code would allow anyone to exploit your Azure billing. The Edge Function acts as a secure, authenticated proxy.
- **Why Snippet Writes use Edge Functions**: Creating or updating a snippet with tags is a complex "transaction." It requires inserting a snippet, deduplicating tags, creating new tags, and mapping them in `snippet_tags`. Doing this on the frontend requires 4-5 network round trips, which is slow and risks race conditions.
- **Why Practice Recordings use the Client SDK directly**: Uploading a recording is a simple two-step process: upload an audio file, then insert a single row into `practice_recordings`. Both the Storage Bucket and Database Table are fully secured by RLS to guarantee users can only write their own data. Migrating this to an Edge Function would introduce a massive **double-upload penalty** (the browser uploads the audio file to the Edge Function, which then buffers and uploads the exact same file to Storage). Direct client uploads are faster and completely secure.
- **Why Snippet Reads use the Client SDK directly**: Listing snippets, filters, and paginated reads are handled through direct Supabase queries in the browser with RLS. The current web app uses PostgREST range queries for server-side pagination rather than an additional read Edge Function.

## Required secrets

Set these in Supabase Edge Functions:

- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`
- `AZURE_VISION_ENDPOINT`
- `AZURE_VISION_KEY`
- optional: `AUDIO_CACHE_BUCKET=audio-cache`
- optional: `AUDIO_CACHE_TTL_DAYS=30`
- optional: `AUDIO_CACHE_CLEANUP_BATCH_SIZE=100`

For local development, create `supabase/functions/.env` from `supabase/functions/.env.example`.

## CLI setup

Windows PowerShell:

```bash
npm.cmd install
npx.cmd supabase login
```

If `npx` works normally in your shell, `npx supabase ...` is equivalent. On Windows PowerShell, `npx.cmd` avoids script execution policy issues.

## Project ref

Use your own project ref in deploy commands:

- In the Supabase dashboard URL or project settings
- Or from `SUPABASE_URL` by taking the subdomain before `.supabase.co`

Example:

```text
https://your-project-ref.supabase.co
```

The project ref is:

```text
your-project-ref
```

## Deploy

From the repo root:

```bash
npx.cmd supabase secrets set --env-file supabase/functions/.env --project-ref <your-project-ref>
npx.cmd supabase functions deploy request-tts-audio --project-ref <your-project-ref>
npx.cmd supabase functions deploy create-snippet --project-ref <your-project-ref>
npx.cmd supabase functions deploy update-snippet --project-ref <your-project-ref>
npx.cmd supabase functions deploy delete-snippet --project-ref <your-project-ref>
npx.cmd supabase functions deploy extract-snippet-ocr --project-ref <your-project-ref>
npx.cmd supabase functions deploy cleanup-audio-cache --project-ref <your-project-ref>
```

## Local env

Example local `supabase/functions/.env`:

```bash
AZURE_SPEECH_KEY=your_azure_speech_key_here
AZURE_SPEECH_REGION=your_azure_speech_region_here
AZURE_VISION_ENDPOINT=https://your-vision-resource.cognitiveservices.azure.com
AZURE_VISION_KEY=your_azure_vision_key_here
AUDIO_CACHE_BUCKET=audio-cache
AUDIO_CACHE_TTL_DAYS=30
AUDIO_CACHE_CLEANUP_BATCH_SIZE=100
```

Do not commit `supabase/functions/.env`.

To serve functions locally with the same env file:

```bash
npx.cmd supabase functions serve request-tts-audio --env-file supabase/functions/.env
npx.cmd supabase functions serve create-snippet --env-file supabase/functions/.env
npx.cmd supabase functions serve update-snippet --env-file supabase/functions/.env
npx.cmd supabase functions serve delete-snippet --env-file supabase/functions/.env
npx.cmd supabase functions serve extract-snippet-ocr --env-file supabase/functions/.env
npx.cmd supabase functions serve cleanup-audio-cache --env-file supabase/functions/.env
```

## Invoke contract

### `request-tts-audio`

Request body:

```json
{
  "text": "Hello world",
  "language": "en-US",
  "voice": "en-US-JennyNeural",
  "speed": 1
}
```

Successful response:

```json
{
  "audio": [1, 2, 3]
}
```

This function requires a valid Supabase bearer token in `Authorization`.

### `create-snippet`

Request body:

```json
{
  "text": "Hello world",
  "language": "en-US",
  "tagNames": ["travel", "greeting"]
}
```

Successful response:

```json
{
  "snippet": {
    "id": "uuid",
    "user_id": "uuid",
    "text": "Hello world",
    "language": "en-US",
    "created_at": "2026-05-08T00:00:00Z",
    "updated_at": "2026-05-08T00:00:00Z",
    "tags": [{ "id": "uuid", "user_id": "uuid", "name": "travel", "created_at": "2026-05-08T00:00:00Z", "updated_at": "2026-05-08T00:00:00Z" }]
  },
  "deduped": false
}
```

### `update-snippet`

Request body:

```json
{
  "snippetId": "uuid",
  "text": "Updated text",
  "language": "en-US",
  "tagNames": ["travel"]
}
```

Successful response:

```json
{
  "snippet": {
    "id": "uuid",
    "user_id": "uuid",
    "text": "Updated text",
    "language": "en-US",
    "created_at": "2026-05-08T00:00:00Z",
    "updated_at": "2026-05-08T00:00:00Z",
    "tags": [{ "id": "uuid", "user_id": "uuid", "name": "travel", "created_at": "2026-05-08T00:00:00Z", "updated_at": "2026-05-08T00:00:00Z" }]
  }
}
```

### `delete-snippet`

Request body for web:

```json
{
  "snippetId": "uuid"
}
```

Request body for the extension compatibility path:

```json
{
  "text": "Hello world",
  "language": "en-US"
}
```

Successful response:

```json
{
  "success": true
}
```

### `extract-snippet-ocr`

Send `multipart/form-data` with an `image` file field.

Successful response:

```json
{
  "text": "The extracted text",
  "detectedLanguage": null
}
```

This function requires a valid Supabase bearer token in `Authorization`.

### `cleanup-audio-cache`

No request body required.

Successful response:

```json
{
  "ok": true,
  "connected": true,
  "deleted_rows": 3,
  "deleted_objects": 3,
  "bucket": "audio-cache"
}
```

## Scheduling cleanup

The `cleanup-audio-cache` Edge Function needs to run on a schedule to delete expired audio files and free up Storage space. 

This repository includes a GitHub Actions workflow (`.github/workflows/cleanup.yaml`) that runs automatically every hour to trigger this cleanup.

To use the GitHub Actions cron job, you must set the following **Repository Secret** in your GitHub repository settings (`Settings -> Secrets and variables -> Actions`):

- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

The action makes an HTTP GET request to the Edge Function using this key for authorization. Make sure to update the URL in `.github/workflows/cleanup.yaml` to match your own Supabase project URL.

## Required SQL

To set up your Supabase project, execute the following SQL in the Supabase SQL Editor. This includes all the tables, Row Level Security (RLS) policies, and triggers needed for both the extension and the web app.

### 1. Updated At Trigger

Use a shared trigger function to automatically update the `updated_at` column:

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

### 2. Audio Cache

Used by the TTS Edge Function to avoid hitting Azure multiple times for the same text.

```sql
create table if not exists audio_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique not null,
  storage_path text not null,
  char_count integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table audio_cache enable row level security;
-- Service role key bypasses RLS, so no end-user policies are needed.
```

### 3. Profiles

```sql
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  default_language text not null default 'en-US',
  quota_used integer not null default 0,
  quota_reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create trigger profiles_set_updated_at
before update on profiles
for each row execute function public.set_updated_at();

create policy "Users can read own profile"
on profiles for select to authenticated using (auth.uid() = id);

create policy "Users can insert own profile"
on profiles for insert to authenticated with check (auth.uid() = id);

create policy "Users can update own profile"
on profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
```

### 4. Snippets and Tags

```sql
create table if not exists snippets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  language text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table snippets enable row level security;

create trigger snippets_set_updated_at
before update on snippets
for each row execute function public.set_updated_at();

create policy "Users can read own snippets"
on snippets for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert own snippets"
on snippets for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update own snippets"
on snippets for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own snippets"
on snippets for delete to authenticated using (auth.uid() = user_id);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table tags enable row level security;

create trigger tags_set_updated_at
before update on tags
for each row execute function public.set_updated_at();

create policy "Users can read own tags"
on tags for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert own tags"
on tags for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update own tags"
on tags for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own tags"
on tags for delete to authenticated using (auth.uid() = user_id);

create table if not exists snippet_tags (
  snippet_id uuid not null references snippets(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (snippet_id, tag_id)
);

alter table snippet_tags enable row level security;

create trigger snippet_tags_set_updated_at
before update on snippet_tags
for each row execute function public.set_updated_at();

create policy "Users can read own snippet tags"
on snippet_tags for select to authenticated using (
  exists (select 1 from snippets where snippets.id = snippet_tags.snippet_id and snippets.user_id = auth.uid())
);

create policy "Users can insert own snippet tags"
on snippet_tags for insert to authenticated with check (
  exists (select 1 from snippets where snippets.id = snippet_tags.snippet_id and snippets.user_id = auth.uid())
  and exists (select 1 from tags where tags.id = snippet_tags.tag_id and tags.user_id = auth.uid())
);

create policy "Users can delete own snippet tags"
on snippet_tags for delete to authenticated using (
  exists (select 1 from snippets where snippets.id = snippet_tags.snippet_id and snippets.user_id = auth.uid())
);
```

### 5. Practice Recordings

```sql
create table if not exists practice_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snippet_id uuid not null references snippets(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_at timestamptz not null default now()
);

alter table practice_recordings enable row level security;

create policy "Users can read own practice recordings"
on practice_recordings for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert own practice recordings"
on practice_recordings for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can delete own practice recordings"
on practice_recordings for delete to authenticated using (auth.uid() = user_id);
```

### 6. Storage Buckets

Create two private Storage buckets in your Supabase dashboard:
- `audio-cache` (for Azure Neural TTS caching)
- `practice-recordings` (for user microphone recordings)
