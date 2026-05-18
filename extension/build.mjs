// Build script - compiles TypeScript source to dist/ and copies static files.
// Run: node build.mjs          (one-shot build)
//      node build.mjs --watch  (rebuild on every file change)

import * as esbuild from 'esbuild'
import { cpSync, mkdirSync, rmSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const isWatch = process.argv.includes('--watch')
const rootDir = dirname(fileURLToPath(import.meta.url))

const distDir = resolve(rootDir, 'dist')
const staticFiles = [
  ['src/manifest.json', 'dist/manifest.json'],
  ['src/popup/popup.html', 'dist/popup/popup.html'],
  ['src/popup/popup.css', 'dist/popup/popup.css'],
]

function prepareDist() {
  rmSync(distDir, { recursive: true, force: true })
  mkdirSync(resolve(distDir, 'background'), { recursive: true })
  mkdirSync(resolve(distDir, 'content'), { recursive: true })
  mkdirSync(resolve(distDir, 'popup'), { recursive: true })

  staticFiles.forEach(([src, dest]) => cpSync(resolve(rootDir, src), resolve(rootDir, dest)))
}

prepareDist()

const buildOptions = {
  absWorkingDir: rootDir,
  entryPoints: {
    'background/service-worker': './src/background/service-worker.ts',
    'content/content': './src/content/content.ts',
    'popup/popup': './src/popup/popup.ts',
  },
  bundle: true,
  outdir: './dist',
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  sourcemap: isWatch ? 'inline' : false,
  logLevel: 'info',
  tsconfigRaw: {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
    },
  },
}

const ctx = await esbuild.context(buildOptions)

if (isWatch) {
  await ctx.rebuild()
  await ctx.watch()
  console.log('Watching for changes...')
} else {
  await ctx.rebuild()
  await ctx.dispose()
  console.log('Build complete.')
}
