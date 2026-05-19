// Shared Tailwind recipe strings keep feature JSX focused on structure instead of long visual class lists.
export const appShellClass =
  'flex min-h-dvh flex-col bg-[color:var(--bg)] px-3 pt-0 text-[color:var(--foreground)] sm:px-4 md:px-6'

export const appContentClass = 'mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col'

export const floatingActionButtonClass =
  'fixed bottom-3 right-3 z-30 h-12 w-12 transition-all duration-200 shadow-floating sm:bottom-4 sm:right-4 sm:h-14 sm:w-14'

export const pageMetaClass = 'meta-label'

export const fieldLabelClass =
  'text-sm font-medium text-[color:var(--foreground)]'

export const helperTextClass = 'page-status'

export const inlineSelectClass = 'field-select h-9 min-w-0 flex-1'

export const compactSelectClass = 'field-select h-9 text-xs sm:text-sm'

export const menuItemClass =
  'block w-full rounded-xl px-3 py-2 text-left text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-2)]'

export const destructiveMenuItemClass =
  'block w-full rounded-xl px-3 py-2 text-left text-sm text-[color:var(--danger)] transition-colors hover:bg-[color:var(--surface-2)]'

export const modalPreviewClass = 'surface-preview space-y-3'

export const chipBaseClass =
  'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs'

export const chipSelectedClass = `${chipBaseClass} bg-[color:var(--accent)] text-[color:var(--accent-foreground)]`

export const chipUnselectedClass = `${chipBaseClass} bg-[color:var(--surface-2)] text-[color:var(--foreground)]`

export const searchFooterClass =
  'mt-auto bg-[color:var(--bg)] py-3'
