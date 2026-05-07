// Build script — compiles TypeScript source to dist/ and copies static files.
// Run: node build.mjs          (one-shot build)
//      node build.mjs --watch  (rebuild on every file change)

import * as esbuild from 'esbuild'
import { cpSync, mkdirSync, readFileSync, rmSync } from 'fs'

const isWatch = process.argv.includes('--watch')

function parseEnvFile(path) {
  try {
    const env = {}
    const raw = readFileSync(path, 'utf8')

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const eq = trimmed.indexOf('=')
      if (eq === -1) continue

      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      env[key] = value
    }

    return env
  } catch {
    return {}
  }
}

const env = parseEnvFile('.env')

// Wipe and recreate dist/
rmSync('dist', { recursive: true, force: true })
mkdirSync('dist/background', { recursive: true })
mkdirSync('dist/content',    { recursive: true })
mkdirSync('dist/popup',      { recursive: true })

// Copy static files that don't need compilation
;[
  ['src/manifest.json', 'dist/manifest.json'],
  ['src/popup/popup.html', 'dist/popup/popup.html'],
  ['src/popup/popup.css',  'dist/popup/popup.css'],
].forEach(([src, dest]) => cpSync(src, dest))

// Compile all three TypeScript entry points
const ctx = await esbuild.context({
  entryPoints: [
    'src/background/service-worker.ts',
    'src/content/content.ts',
    'src/popup/popup.ts',
  ],
  define: {
    __AZURE_SPEECH_KEY__: JSON.stringify(env.AZURE_SPEECH_KEY ?? ''),
    __AZURE_SPEECH_REGION__: JSON.stringify(env.AZURE_SPEECH_REGION ?? ''),
    __AUDIO_CACHE_TTL_DAYS__: JSON.stringify(env.AUDIO_CACHE_TTL_DAYS ?? '30'),
  },
  bundle: true,   // inline imports so each output is a single self-contained file
  outdir: 'dist',
  outbase: 'src', // preserves background/ content/ popup/ subdirectory structure
  format: 'iife', // immediately-invoked function — safe for both content scripts and service workers
  target: 'chrome120',
  sourcemap: isWatch ? 'inline' : false,
  logLevel: 'info',
})

if (isWatch) {
  await ctx.watch()
  console.log('Watching for changes…')
} else {
  await ctx.rebuild()
  await ctx.dispose()
  console.log('Build complete.')
}
