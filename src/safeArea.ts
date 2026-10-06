/**
 * Safe-area insets as numbers and as CSS variables.
 *
 * `env(safe-area-inset-*)` already works inside CSS, but JavaScript layout (canvas HUDs, joystick
 * placement) needs the numbers, and some Android WebViews do not refresh `env()` consumers after a
 * fold, an orientation change or a cut-out change. `watchSafeArea` measures the insets through a
 * hidden probe element and republishes them as `--safe-top/right/bottom/left` px variables on every
 * resize, orientation change, visual-viewport resize and fold posture change.
 */

export interface SafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export const ZERO_INSETS: Readonly<SafeAreaInsets> = Object.freeze({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
})

const SIDES = ['top', 'right', 'bottom', 'left'] as const

export interface SafeAreaWatchOptions {
  /** Element that receives the CSS variables. Defaults to `document.documentElement`. */
  target?: HTMLElement
  /** CSS variable prefix. Defaults to `--safe-` (so `--safe-top` ...). */
  prefix?: string
  /** Called with fresh insets after every measurement. */
  onChange?: (insets: SafeAreaInsets) => void
}

function parsePx(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Measures the current safe-area insets through a temporary probe element. */
export function readSafeAreaInsets(doc: Document = document): SafeAreaInsets {
  const view = doc.defaultView
  if (!view || !doc.body) return { ...ZERO_INSETS }
  const probe = doc.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = [
    'position:fixed',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top,0px)',
    'padding-right:env(safe-area-inset-right,0px)',
    'padding-bottom:env(safe-area-inset-bottom,0px)',
    'padding-left:env(safe-area-inset-left,0px)',
  ].join(';')
  doc.body.appendChild(probe)
  const style = view.getComputedStyle(probe)
  const insets = {
    top: parsePx(style.paddingTop),
    right: parsePx(style.paddingRight),
    bottom: parsePx(style.paddingBottom),
    left: parsePx(style.paddingLeft),
  }
  probe.remove()
  return insets
}

export function applySafeAreaVariables(
  insets: SafeAreaInsets,
  target: HTMLElement,
  prefix = '--safe-',
): void {
  for (const side of SIDES) target.style.setProperty(`${prefix}${side}`, `${insets[side]}px`)
}

/**
 * Measures the insets now and again after every geometry change. Returns a disposer that removes all
 * listeners. Measurement runs on the next animation frame so a fold reports post-layout values.
 */
export function watchSafeArea(options: SafeAreaWatchOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined
  const target = options.target ?? document.documentElement
  const prefix = options.prefix ?? '--safe-'
  let frame = 0
  const measure = () => {
    frame = 0
    const insets = readSafeAreaInsets(document)
    applySafeAreaVariables(insets, target, prefix)
    options.onChange?.(insets)
  }
  const schedule = () => {
    if (frame !== 0) return
    frame = window.requestAnimationFrame(measure)
  }
  measure()
  window.addEventListener('resize', schedule)
  window.addEventListener('orientationchange', schedule)
  window.visualViewport?.addEventListener('resize', schedule)
  const fold = foldPostureMedia(window)
  fold?.addEventListener('change', schedule)
  return () => {
    if (frame !== 0) window.cancelAnimationFrame(frame)
    window.removeEventListener('resize', schedule)
    window.removeEventListener('orientationchange', schedule)
    window.visualViewport?.removeEventListener('resize', schedule)
    fold?.removeEventListener('change', schedule)
  }
}

/** Media query that flips when a foldable changes posture; `null` where unsupported. */
function foldPostureMedia(win: Window): MediaQueryList | null {
  if (typeof win.matchMedia !== 'function') return null
  return win.matchMedia('(horizontal-viewport-segments: 2), (vertical-viewport-segments: 2)')
}
