export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context, defaultResolve)
  } catch (error) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../')
    const hasKnownExtension = /\.[a-z]+$/i.test(specifier)

    if (isRelative && !hasKnownExtension) {
      return defaultResolve(`${specifier}.ts`, context, defaultResolve)
    }

    throw error
  }
}
