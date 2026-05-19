# SurfShadow Web

Mobile-first practice app for SurfShadow. This app is designed to work with the existing Chrome extension and Supabase backend.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS v4
- CVA / clsx / tailwind-merge
- Radix primitives
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

## Frontend structure

The app is organized around feature ownership and shared UI primitives:

- `src/features/auth`
  auth gate, provider, and the landing screen
- `src/features/library`
  library page hooks and library-owned cards, pagination, and search controls
- `src/features/practice`
  practice session orchestration and practice-owned panels
- `src/features/snippets`
  snippet form, snippet CRUD orchestration, and OCR entry points
- `src/features/tags`
  shared tag-editing behavior reused across library, snippets, and practice
- `src/lib`
  only shared app wiring, shared config, and pure cross-feature helpers; feature-specific helper logic lives under its feature
- `src/components/feedback`
  shared app-level banners and loading states
- `src/components/ui`
  reusable primitives such as buttons, cards, dialogs, confirmation dialogs, notices, inputs, selects, and page messages
- `src/components`
  only app-wide shared shell/navigation/feedback infrastructure; feature-owned UI should not live here
- `src/styles`
  global design tokens in `index.css` and reusable Tailwind recipe strings in `recipes.ts`

Styling is intentionally token-driven:

- no feature component should introduce hardcoded color literals
- theme colors, overlays, shadows, and brand colors live in shared CSS variables
- repeated Tailwind surface/field patterns are centralized as shared utilities or recipe exports
- destructive flows share one `ConfirmDialog` wrapper so delete behavior stays consistent across features
- common lazy-route entry points expose preload helpers so next-page navigation can warm route chunks on hover, focus, or touch

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

Useful scripts:

```bash
npm run dev
npm run dev:host
npm run typecheck
npm run build
npm run build:debug
npm run build:analyze
npm run test
npm run test:watch
npm run test:e2e
```

## Testing

The web app has two test layers:

- `npm run test`
  runs the Vitest unit/component suite in `tests/unit`
- `npm run test:e2e`
  runs the Playwright browser suite in `tests/e2e`

The Playwright suite starts the app in `test` mode and mocks Supabase/Auth/OCR responses so it can exercise:

- auth gating
- library search flow
- OCR-assisted snippet creation
- edit route hydration
- delete confirmation flow

Repo-level security automation is defined in `.github/workflows/security.yml` and runs dependency review, CodeQL, workflow linting, and npm audit checks in GitHub Actions.

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

The web client also applies matching OCR guardrails before upload:

- allowed image types: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`
- max image size: `5 MiB`

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
