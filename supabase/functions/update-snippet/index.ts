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
    const input = await request.json() as Partial<SnippetInput> & { snippetId?: string }
    const snippetId = input.snippetId?.trim() ?? ''
    const text = normalizeText(input.text ?? '')
    const language = normalizeLanguage(input.language ?? '')
    const tagNames = input.tagNames ?? []

    if (!snippetId || !text || !language) {
      return json({ error: 'Missing required fields' }, 400)
    }

    const supabase = getServiceClient()
    const { data: currentSnippet, error: currentError } = await supabase
      .from('snippets')
      .select('id')
      .eq('id', snippetId)
      .eq('user_id', userId)
      .maybeSingle()

    if (currentError) throw currentError
    if (!currentSnippet) {
      return json({ error: 'Snippet not found' }, 404)
    }

    const duplicate = await findDuplicateSnippet(supabase, userId, text, language)
    if (duplicate && duplicate.id !== snippetId) {
      return json({ error: 'Duplicate snippet already exists' }, 409)
    }

    const { error: updateError } = await supabase
      .from('snippets')
      .update({
        text,
        language,
      })
      .eq('id', snippetId)
      .eq('user_id', userId)

    if (updateError) throw updateError

    const tags = await ensureTags(supabase, userId, tagNames)
    await replaceSnippetTags(supabase, snippetId, tags.map((tag) => tag.id))
    const snippet = await hydrateSnippet(supabase, snippetId)

    return json({ snippet })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update snippet failed'
    const status = message === 'auth_required' ? 401 : 500
    return json({ error: message }, status)
  }
})
