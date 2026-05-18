# SurfShadow Extension

SurfShadow is a Chrome extension for language shadowing practice. When you highlight text on a webpage, it opens a floating "Shadow Bar" that lets you:

- play the text with the browser's built-in speech synthesis
- play higher-quality Azure TTS audio
- save the snippet to Supabase
- record yourself and play the recording back

This README describes the extension code in `extension/` as it exists now.

## Current scope

Implemented today:

- Manifest V3 Chrome extension
- content script injected on all pages
- floating Shadow Bar near the current text selection
- Web Speech API playback
- Supabase Edge Function TTS playback
- Supabase snippet saving
- popup UI for Google sign-in and default language
- microphone recording with graceful fallback when permission is denied
- selectable language and playback speed in the Shadow Bar

Not implemented yet:

- options page separate from the popup
- full monthly quota enforcement from the UI side
- PWA/mobile practice app from the project plan
- snippet browsing, deletion, and search UI
- offline support

## How it works

The extension has three runtime pieces:

- `src/content/content.ts`
  Injects the Shadow Bar into web pages, handles text selection, plays free TTS, manages recording, and sends background messages for neural audio and saving.
- `src/background/service-worker.ts`
  Handles TTS requests, Supabase requests, auth flow, and storage-backed settings.
- `src/popup/popup.ts`
  Powers the browser action popup for sign-in and default language selection.

Shared types live in `src/types.ts`, Supabase client constants live in `src/config.ts`, and the background auth/session helpers live under `src/background/`.

## Shadow Bar behavior

Selecting text on any page shows a floating bar with:

- `System`: browser `speechSynthesis`
- `Neutral` / `Oral`: Azure TTS via the background worker
- `Save text`: inserts a snippet row in Supabase
- `Record`: records microphone audio with `MediaRecorder`
- `Play rec`: replays the latest recording
- speed selector: `0.75x` to `2x`
- language selector: English, Japanese, Chinese, Korean, Spanish, French, German

The bar is rendered inside a Shadow DOM so host page CSS does not break it.

## Auth, storage, and backend

The extension uses:

- `chrome.storage.local` for auth state and default language
- `chrome.identity.launchWebAuthFlow` for Google OAuth through Supabase
- Supabase REST endpoints for snippet and profile operations
- Supabase Edge Functions for protected TTS and snippet writes

TTS playback flow:

1. The content script asks the background worker for TTS audio.
2. The background worker calls the protected `request-tts-audio` Edge Function.
3. Supabase verifies the JWT before Azure is called.
4. The Edge Function handles caching and returns audio bytes to the extension.

Session behavior:

1. The popup/background stores Supabase access and refresh tokens in `chrome.storage.local`.
2. `GET_SETTINGS` validates the current access token with Supabase and refreshes when needed.
3. Background Supabase requests retry once on `401` / `403`.
4. If refresh fails or the retried request is still unauthorized, the extension clears stored auth tokens and returns `auth_required`.

## Development

### Requirements

- Node.js
- Google Chrome
- Supabase project configured to match the planned schema

### Install

```bash
npm install
```

### Commands

```bash
npm run build
npm run watch
npm run typecheck
npm run test
```

Build output is written to `dist/`.

### Tests

Run the background unit tests with:

```bash
npm run test
```

Current test coverage focuses on the extension's critical background behavior:

- session validation and refresh logic
- unauthorized-response handling
- Supabase request retry behavior
- snippet save/delete/check error mapping
- shared helper behavior for response parsing and snippet lookup paths

## Load in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click "Load unpacked".
5. Select the `extension/dist` folder.

After loading:

1. Open the extension popup.
2. Sign in with Google.
3. Choose a default language and save.
4. Highlight text on a webpage to open the Shadow Bar.

## Project structure

```text
extension/
  src/
    background/
      service-worker.ts
    content/
      content.ts
    popup/
      popup.ts
      popup.html
      popup.css
    config.ts
    manifest.json
    types.ts
  dist/
  build.mjs
  package.json
  tsconfig.json
```

## Notes

- The manifest requests `storage` and `identity` permissions plus host access for Supabase endpoints.
- The content script runs on `<all_urls>`.
- The current repo hardcodes Supabase public project values in `src/config.ts`.
- If microphone permission is denied, recording is disabled but listening and saving still work.
