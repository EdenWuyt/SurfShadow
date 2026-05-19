import type { Page } from '@playwright/test'

const SUPABASE_URL = 'https://test-ref.supabase.co'
const STORAGE_KEY = 'sb-test-ref-auth-token'

const user = {
  id: 'user-1',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'surfshadow@example.com',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: {},
  created_at: '2025-01-01T00:00:00.000Z',
}

const profile = {
  id: 'user-1',
  default_language: 'ja-JP',
  quota_used: 0,
  quota_reset_at: null,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
}

const baseTags = [
  {
    id: 'tag-1',
    user_id: 'user-1',
    name: 'travel',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
]

const baseSnippet = {
  id: 'snippet-1',
  user_id: 'user-1',
  text: 'Hello from library',
  language: 'en-US',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
}

const session = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: 4070908800,
  token_type: 'bearer',
  user,
}

export async function seedAuthenticatedSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value))
      window.localStorage.setItem(`${key}-user`, JSON.stringify(value.user))
    },
    { key: STORAGE_KEY, value: session },
  )
}

export async function mockSupabase(page: Page): Promise<void> {
  let snippetDeleted = false

  await page.route(`${SUPABASE_URL}/auth/v1/user`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...user }),
    })
  })

  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname
    const accept = request.headers()['accept'] ?? ''

    if (pathname.endsWith('/profiles')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(profile),
      })
      return
    }

    if (pathname.endsWith('/tags')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(baseTags),
      })
      return
    }

    if (pathname.endsWith('/snippet_tags')) {
      const rows = snippetDeleted
        ? []
        : [{ snippet_id: 'snippet-1', tag_id: 'tag-1' }]
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rows),
      })
      return
    }

    if (pathname.endsWith('/snippets')) {
      const querySearch = url.searchParams.toString()
      const search = querySearch.match(/text=ilike\.\*([^*]+)\*/)?.[1] ?? ''
      const requestedLanguage = querySearch.match(/language=in\.\(([^)]+)\)/)?.[1]
      const requestedSnippetId = querySearch.match(/id=eq\.([^&]+)/)?.[1]
      const selectedTagIds = querySearch.match(/id=in\.\(([^)]+)\)/)?.[1]

      const snippetList = snippetDeleted
        ? []
        : [{ ...baseSnippet, tags: baseTags }]

      const filtered = snippetList.filter((snippet) => {
        if (requestedSnippetId && snippet.id !== requestedSnippetId) return false
        if (requestedLanguage && !requestedLanguage.split(',').includes(snippet.language)) return false
        if (search && !snippet.text.toLowerCase().includes(decodeURIComponent(search).toLowerCase())) return false
        if (selectedTagIds && !selectedTagIds.split(',').includes(snippet.id)) return false
        return true
      })

      const body = accept.includes('application/vnd.pgrst.object+json')
        ? JSON.stringify(filtered[0] ?? null)
        : JSON.stringify(filtered)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'content-range': filtered.length ? `0-${filtered.length - 1}/${filtered.length}` : '*/0',
        },
        body,
      })
      return
    }

    await route.fulfill({ status: 404, body: 'Unhandled REST route' })
  })

  await page.route(`${SUPABASE_URL}/functions/v1/**`, async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname.endsWith('/create-snippet')) {
      const body = route.request().postDataJSON() as { text?: string; language?: string; tagNames?: string[] }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          snippet: {
            ...baseSnippet,
            text: body.text ?? baseSnippet.text,
            language: body.language ?? baseSnippet.language,
            tags: baseTags.filter((tag) => (body.tagNames ?? []).includes(tag.name)),
          },
        }),
      })
      return
    }

    if (url.pathname.endsWith('/delete-snippet')) {
      snippetDeleted = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
      return
    }

    if (url.pathname.endsWith('/extract-snippet-ocr')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'OCR imported text',
          detectedLanguage: 'ja-JP',
        }),
      })
      return
    }

    await route.fulfill({ status: 404, body: 'Unhandled function route' })
  })
}
