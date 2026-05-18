// Builds Supabase REST query paths for snippet lookup operations.
export function buildSnippetLookupPath(text: string, language: string): string {
  const params = new URLSearchParams({
    select: 'id',
    text: `eq.${text}`,
    language: `eq.${language}`,
    limit: '1',
  })

  return `/rest/v1/snippets?${params.toString()}`
}
