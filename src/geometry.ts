/**
 * The one subscription every geometry-dependent module shares: resize, orientation change,
 * visual-viewport resize and fold posture change. A foldable that folds or unfolds fires the
 * posture query, so nothing needs a reload.
 */

/** Media query that flips when a foldable changes posture; `null` where unsupported. */
function foldPostureMedia(win: Window): MediaQueryList | null {
  if (typeof win.matchMedia !== 'function') return null
  return win.matchMedia('(horizontal-viewport-segments: 2), (vertical-viewport-segments: 2)')
}

/** Calls `callback` on every viewport geometry change. Returns the function that removes them all. */
export function subscribeGeometry(win: Window, callback: () => void): () => void {
  const fold = foldPostureMedia(win)
  win.addEventListener('resize', callback)
  win.addEventListener('orientationchange', callback)
  win.visualViewport?.addEventListener('resize', callback)
  fold?.addEventListener('change', callback)
  return () => {
    win.removeEventListener('resize', callback)
    win.removeEventListener('orientationchange', callback)
    win.visualViewport?.removeEventListener('resize', callback)
    fold?.removeEventListener('change', callback)
  }
}
