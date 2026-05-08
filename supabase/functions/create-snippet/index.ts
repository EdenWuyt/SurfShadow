import {
  ensureTags,
  findDuplicateSnippet,
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
  try {
    const userId = await requireUserId(request)
    const input = await request.json() as Partial<SnippetInput>
    const text = normalizeText(input.text ?? '')
    const language = normalizeLanguage(input.language ?? '')
    const tagNames = input.tagNames ?? []

    if (!text || !language) {
      return json({ error: 'Missing required fields' }, 400)
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

    return json({
      snippet,
      deduped: Boolean(duplicate),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create snippet failed'
    const status = message === 'auth_required' ? 401 : 500
    return json({ error: message }, status)
  }
})
