export const VISUALGO_SORTING_URL = 'https://visualgo.net/en/sorting'

export function openSortingVisualizer() {
  if (typeof window === 'undefined') return
  const opened = window.open(VISUALGO_SORTING_URL, '_blank', 'noopener,noreferrer')
  if (!opened) {
    window.location.href = VISUALGO_SORTING_URL
  }
}
