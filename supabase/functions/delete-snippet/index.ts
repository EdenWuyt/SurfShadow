import { getServiceClient, json, normalizeLanguage, normalizeText, requireUserId } from '../_shared/snippet-write.ts'

Deno.serve(async (request) => {
  try {
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
      return json({ success: true })
    }

    if (!text || !language) {
      return json({ error: 'Missing snippetId or text/language' }, 400)
    }

    const { error } = await supabase
      .from('snippets')
      .delete()
      .eq('user_id', userId)
      .eq('text', text)
      .eq('language', language)

    if (error) throw error
    return json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete snippet failed'
    const status = message === 'auth_required' ? 401 : 500
    return json({ error: message }, status)
  }
})
