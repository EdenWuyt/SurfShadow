// Shared Tailwind recipe strings keep feature JSX focused on structure instead of long visual class lists.
export const appShellClass =
  'flex min-h-dvh flex-col bg-[color:var(--bg)] px-3 pt-0 text-[color:var(--foreground)] sm:px-4 md:px-6'

export const appContentClass = 'mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col'

// AppShell owns the floating create button animation/placement across routes.
export const floatingActionButtonClass =
  'fixed bottom-3 right-3 z-30 h-12 w-12 transition-all duration-200 shadow-floating sm:bottom-4 sm:right-4 sm:h-14 sm:w-14'

// Library page uses this compact metadata text for total counts and compact control labels.
export const pageMetaClass = 'meta-label'

// SnippetForm keeps field labels recipe-based so the form JSX reads as sections instead of repeated typography classes.
export const fieldLabelClass =
  'text-sm font-medium text-[color:var(--foreground)]'

// SnippetForm uses this for empty helper copy under tag selection.
export const helperTextClass = 'page-status'

// Library card owns this inline playback-mode select sizing.
export const inlineSelectClass = 'field-select h-9 min-w-0 flex-1'

// Library page owns this smaller sort-order select variant.
export const compactSelectClass = 'field-select h-9 text-xs sm:text-sm'

// Library card action menus keep their item chrome centralized here instead of repeating menu hover classes inline.
export const menuItemClass =
  'block w-full rounded-xl px-3 py-2 text-left text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-2)]'

export const destructiveMenuItemClass =
  'block w-full rounded-xl px-3 py-2 text-left text-sm text-[color:var(--danger)] transition-colors hover:bg-[color:var(--surface-2)]'

// ConfirmDialog preview blocks in library/practice/tags share this wrapper instead of rebuilding preview spacing.
export const modalPreviewClass = 'surface-preview space-y-3'

export const chipBaseClass =
  'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs'

// Tag chips are reused by the snippet form and editable tag chips, so the selected/unselected states stay recipe-based.
export const chipSelectedClass = `${chipBaseClass} bg-[color:var(--accent)] text-[color:var(--accent-foreground)]`

export const chipUnselectedClass = `${chipBaseClass} bg-[color:var(--surface-2)] text-[color:var(--foreground)]`

// Library search owns the sticky footer action strip.
export const searchFooterClass =
  'mt-auto bg-[color:var(--bg)] py-3'

// SearchField owns this wrapper and input pairing so the icon spacing stays consistent with the custom search surface.
export const searchFieldWrapperClass = 'relative p-1'

export const searchFieldInputClass = 'surface-search h-12 rounded-full !pl-10 pr-4'

// Expandable library filters share one disclosure header/body layout.
export const filterSectionSummaryClass =
  'flex list-none items-center justify-between gap-3 py-1 text-sm font-medium text-[color:var(--foreground)]'

export const filterSectionBodyClass = 'pt-3'

// Library search choice groups reuse the same wrapping layout for languages and tags.
export const filterChoiceGroupClass = 'flex flex-wrap gap-2'

// Snippet form owns these stable layout wrappers so the component can focus on field wiring instead of repeated spacing classes.
export const snippetFormTextCardContentClass = 'space-y-3 p-4'

export const snippetFormMetaCardContentClass = 'space-y-4 p-4'

export const snippetFormLanguageSectionClass = 'space-y-2.5'

export const snippetFormTagSectionClass = 'space-y-3'

export const snippetFormTagInputRowClass = 'mt-2 flex items-center gap-2'

export const snippetFormSelectedTagListClass = 'flex flex-wrap gap-2'

export const snippetFormSelectedTagClass = `${chipSelectedClass} relative pr-6`

export const snippetFormSelectedTagRemoveBadgeClass =
  'absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--accent-foreground)]/18 text-[10px] font-semibold leading-none text-[color:var(--accent-foreground)]'

export const snippetFormOcrActionsClass = 'flex flex-wrap gap-3'

export const snippetFormActionRowClass = 'flex gap-3 pb-2'

// Library card owns these compact header/menu wrappers instead of carrying long utility chains inline.
export const libraryCardHeaderClass =
  'flex items-center justify-between gap-3 text-xs text-[color:var(--muted-foreground)] sm:text-sm'

export const libraryCardMenuTriggerClass =
  'flex list-none cursor-pointer items-center rounded-full p-1 text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-2)]'

// Search page keeps the scrollable filter body as a named recipe because it is page-specific rather than a global utility.
export const librarySearchLayoutClass = 'flex min-h-0 flex-1 flex-col pt-2 sm:pt-3'

export const librarySearchBodyClass = 'flex-1 space-y-5 overflow-y-auto pb-24'
