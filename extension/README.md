# SurfShadow Extension

SurfShadow is a Chrome extension for language shadowing practice. When you highlight text on a webpage, it opens a floating "Shadow Bar" that lets you:

- play the text with the browser's built-in speech synthesis
- play higher-quality Azure Neural TTS audio
- save the snippet to Supabase
- record yourself and play the recording back

This README describes the extension code in `extension/` as it exists now.

## Current scope

Implemented today:

- Manifest V3 Chrome extension
- content script injected on all pages
- floating Shadow Bar near the current text selection
- Web Speech API playback
- Azure Neural TTS playback
- Supabase Storage audio caching
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
  Handles Azure TTS requests, Supabase requests, auth flow, audio cache lookup/upload, and storage-backed settings.
- `src/popup/popup.ts`
  Powers the browser action popup for sign-in and default language selection.

Shared types live in `src/types.ts`, and Supabase client constants live in `src/config.ts`.

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
- Supabase Storage for cached MP3 files
- build-time Azure Speech config for neural playback

Neural playback flow:

1. Hash `(text, language, voice, speed)`
2. Check the public `audio-cache` bucket for an existing MP3
3. If missing, call Azure TTS
4. Return audio to the content script
5. Upload the MP3 to Supabase Storage
6. Update the user's monthly quota count in `profiles`

## Development

### Requirements

- Node.js
- Google Chrome
- Azure Speech resource for Neural TTS
- Supabase project configured to match the planned schema
- `extension/.env` with Azure Speech credentials

### Install

```bash
npm install
```

### Commands

```bash
npm run build
npm run watch
npm run typecheck
```

Build output is written to `dist/`.

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

- The manifest requests `storage` and `identity` permissions plus host access for Supabase and Azure Speech endpoints.
- The content script runs on `<all_urls>`.
- The current repo hardcodes Supabase public project values in `src/config.ts`.
- Azure Speech credentials are injected at build time from `extension/.env`.
- If microphone permission is denied, recording is disabled but listening and saving still work.

## TODO

- Move Azure Neural TTS behind a Supabase Edge Function so the extension no longer ships the Azure key.
- Store only a short-lived access token in the extension and require sign-in again on expiry instead of persisting refresh-token-style session renewal client-side.

## Relation to the project plan

`Project_Planning.md` describes a larger product: extension + synced PWA practice app. The extension folder currently covers the Phase 1 browser-extension side and already includes the core shadowing loop, but not the Phase 2 web app.
