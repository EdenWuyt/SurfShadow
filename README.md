# SurfShadow

SurfShadow is a language-shadowing project with three main parts:

- `web`
  the React + Vite app for snippet management, OCR-assisted creation, and practice
- `extension`
  the browser extension for saving text from the web into the SurfShadow library
- `supabase`
  the database schema, Edge Functions, and deployment helpers

## Architecture

- The `web` app and `extension` both talk to a hosted Supabase project.
- Snippet reads are done directly through Supabase with RLS.
- Snippet writes, OCR, and Azure-backed TTS go through deployed Supabase Edge Functions.
- Practice recordings are stored in Supabase Storage.

## Repo Structure

- `web/`
  frontend app, tests, and Capacitor Android wrapper
- `extension/`
  browser extension source, tests, and build scripts
- `supabase/`
  SQL, Edge Functions, deploy/test scripts, and backend docs

## What Must Be Deployed

The web build can be bundled locally into a Capacitor app, but the backend must stay reachable:

- Supabase project
- Supabase Edge Functions
- Supabase Storage
- configured Google auth in Supabase

You do not need to deploy the frontend separately just to install the Android app on your phone.

## Common Workflows

### Web

```bash
cd web
npm install
npm run dev
```

### Extension

```bash
cd extension
npm install
npm run build
```

### Supabase

See [`supabase/README.md`](supabase/README.md) for schema, function deployment, and smoke-test steps.

## Android Wrapper

The Capacitor Android wrapper lives under `web/android`.

Typical flow:

```bash
cd web
npm run build:mobile
npm run cap:open:android
```

Then build/install a debug APK from Android Studio.

You will need:

- Android Studio
- Android SDK / emulator or a physical Android device with USB debugging enabled

## Quality Checks

### Web

```bash
cd web
npm run typecheck
npm run test
npm run build
```

### Extension

```bash
cd extension
npm run typecheck
npm run test
npm run build
```
