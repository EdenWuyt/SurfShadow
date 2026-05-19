import {
  assertAllowedOrigin,
  corsPreflight,
  ensureTags,
  findDuplicateSnippet,
  getCaughtErrorStatus,
  getServiceClient,
  hydrateSnippet,
  json,
  normalizeLanguage,
  normalizeText,
  replaceSnippetTags,
  requireUserId,
  type SnippetInput,
} from '../_shared/snippet-write.ts'

Deno.serve(async (request) => {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    assertAllowedOrigin(request)
    const userId = await requireUserId(request)
    const input = await request.json() as Partial<SnippetInput>
    const text = normalizeText(input.text ?? '')
    const language = normalizeLanguage(input.language ?? '')
    const tagNames = input.tagNames ?? []

    if (!text || !language) {
      return json(request, { error: 'Missing required fields' }, 400)
    }

    const supabase = getServiceClient()
    const tags = await ensureTags(supabase, userId, tagNames)
    const duplicate = await findDuplicateSnippet(supabase, userId, text, language)

    let snippetId = duplicate?.id ?? ''
    if (!duplicate) {
      const { data, error } = await supabase
        .from('snippets')
        .insert({
          user_id: userId,
          text,
          language,
        })
        .select('id')
        .single()

      if (error) throw error
      snippetId = data.id
    }

    await replaceSnippetTags(supabase, snippetId, tags.map((tag) => tag.id))
    const snippet = await hydrateSnippet(supabase, snippetId)

    return json(request, {
      snippet,
      deduped: Boolean(duplicate),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create snippet failed'
    return json(request, { error: message }, getCaughtErrorStatus(error))
  }
})
