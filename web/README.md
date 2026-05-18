# SurfShadow Web

Mobile-first practice app for SurfShadow. This app is designed to work with the existing Chrome extension and Supabase backend.

## Stack

- Vite
- React
- TypeScript
- Supabase Auth / Database / Storage

## Current scope

- Google sign-in through Supabase
- Dedicated pre-login landing screen and authenticated app shell
- Snippet library with server-side pagination, search, language filtering, tag filtering, delete, and inline playback
- Web-based snippet creation and editing with tags
- OCR-assisted snippet creation from uploaded images or camera capture
- Practice screen for a single snippet
- Snippet writes handled through Supabase Edge Functions
- Azure-backed TTS requested through a Supabase Edge Function
- Azure-backed OCR requested through a Supabase Edge Function
- Persisted practice recordings stored in Supabase Storage
- TanStack Query used for snippet read caching and mutation invalidation
- Edge Function source lives in `../supabase/functions`

## Data flow

- Snippet reads are done directly from the browser with `@supabase/supabase-js` and RLS.
- Snippet list pagination is server-side through PostgREST range queries, not through an Edge Function.
- Snippet create, update, and delete go through Edge Functions so tag normalization and write rules stay server-side.
- OCR and Azure TTS also go through Edge Functions because they require private provider credentials.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in the public Supabase values and function names.
3. Install dependencies:

```bash
npm install
```

4. Run the app:

```bash
npm run dev
```

## Required Supabase additions

The PWA expects snippet CRUD with tags, plus practice recordings.

Please refer to [`../supabase/README.md`](../supabase/README.md) for the complete SQL schema, including tables, Row Level Security (RLS) policies, triggers, and Storage bucket policies.

The PWA assumes a Supabase Edge Function named by `VITE_TTS_FUNCTION_NAME` that accepts:

```json
{
  "text": "string",
  "language": "en-US",
  "voice": "en-US-JennyNeural",
  "speed": 1
}
```

and returns:

```json
{
  "audio": [1, 2, 3]
}
```

The OCR flow assumes a Supabase Edge Function named by `VITE_OCR_FUNCTION_NAME` that accepts
`multipart/form-data` with an `image` file field and returns:

```json
{
  "text": "string",
  "detectedLanguage": null
}
```

Snippet writes are expected to go through:

- `VITE_CREATE_SNIPPET_FUNCTION_NAME`
- `VITE_UPDATE_SNIPPET_FUNCTION_NAME`
- `VITE_DELETE_SNIPPET_FUNCTION_NAME`

## Pagination contract

The library read path currently uses direct Supabase queries with:

- text search via `ilike`
- language filtering via `eq`
- tag filtering resolved before the snippet query
- pagination via `.range(from, to)` plus `count: 'exact'`

This means server-side pagination is already in effect even though reads are not proxied through an Edge Function.
