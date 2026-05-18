// Watches text selection on web pages and mounts or removes the floating Shadow Bar.
import { isBarEventTarget, removeBar, showBar } from './shadow-bar'

document.addEventListener('mouseup', (event: MouseEvent) => {
  if (isBarEventTarget(event.target)) return

  setTimeout(() => {
    const text = window.getSelection()?.toString().trim()
    if (text) {
      showBar(text)
    } else {
      removeBar()
    }
  }, 10)
})

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') removeBar()
})
