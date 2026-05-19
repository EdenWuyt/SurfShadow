import {
  assertAllowedOrigin,
  corsPreflight,
  getCaughtErrorStatus,
  getServiceClient,
  json,
  normalizeLanguage,
  normalizeText,
  requireUserId,
} from '../_shared/snippet-write.ts'

Deno.serve(async (request) => {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    assertAllowedOrigin(request)
    const userId = await requireUserId(request)
    const input = await request.json() as {
      snippetId?: string
      text?: string
      language?: string
    }

    const snippetId = input.snippetId?.trim() ?? ''
    const text = normalizeText(input.text ?? '')
    const language = normalizeLanguage(input.language ?? '')
    const supabase = getServiceClient()

    if (snippetId) {
      const { error } = await supabase
        .from('snippets')
        .delete()
        .eq('id', snippetId)
        .eq('user_id', userId)

      if (error) throw error
      return json(request, { success: true })
    }

    if (!text || !language) {
      return json(request, { error: 'Missing snippetId or text/language' }, 400)
    }

    const { error } = await supabase
      .from('snippets')
      .delete()
      .eq('user_id', userId)
      .eq('text', text)
      .eq('language', language)

    if (error) throw error
    return json(request, { success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete snippet failed'
    return json(request, { error: message }, getCaughtErrorStatus(error))
  }
})
