/**
 * System gesture insets: the strips along the screen edges where the operating system, not the app,
 * owns a swipe. A touch that goes down inside one starts a system gesture (home, quick switch, back)
 * instead of reaching the page, so a game starts its touch zones inside them.
 *
 * No web API reports these. On Android the numbers exist only natively
 * (`WindowInsets.Type.systemGestures()`), so a native plugin the app owns is passed in, the same way
 * the Capacitor plugins are, and this module converts its physical pixels to CSS pixels. Without a
 * plugin the answer is a fallback, and `source` says which kind of answer it is so a layout never
 * mistakes "nothing reported" for "the system takes no edge":
 *
 * - `native`: the platform reported these, converted to CSS px.
 * - `safe-area`: iOS. The home indicator's swipe-up strip is the bottom safe-area inset, and iOS
 *   reports no side strips here, so `bottom` is the safe-area bottom and `left` and `right` are 0.
 * - `none`: web, desktop, and Android without a plugin (or when the plugin cannot answer). All 0.
 *   Three-button navigation also reports 0 sides natively, but then `source` is `native`.
 */
import { subscribeGeometry } from './geometry.js'
import type { DevicePlatform } from './profile.js'
import { readSafeAreaInsets, type SafeAreaInsets } from './safeArea.js'

/** Edge strips in CSS pixels. There is no `top`: the system's top edge is the status bar, not a swipe. */
export interface GestureInsets {
  left: number
  right: number
  bottom: number
}

export const ZERO_GESTURE_INSETS: Readonly<GestureInsets> = Object.freeze({
  left: 0,
  right: 0,
  bottom: 0,
})

/** Where a reading came from; see the module comment for what each one means. */
export type GestureInsetsSource = 'native' | 'safe-area' | 'none'

export interface GestureInsetsReading {
  source: GestureInsetsSource
  /** Every system gesture strip, including the back swipe an app may exclude. CSS px. */
  insets: GestureInsets
  /**
   * The strips an app cannot opt out of (Android's home and quick-switch gesture). A subset of
   * `insets`. When the plugin does not report them separately this equals `insets`, the safe
   * over-estimate. CSS px.
   */
  mandatory: GestureInsets
}

/**
 * What the app's native plugin returns, in physical pixels exactly as Android's `Insets` holds them.
 * `density` is `DisplayMetrics.density`; when it is missing the window's `devicePixelRatio` is used.
 */
export interface NativeGestureInsets extends GestureInsets {
  mandatory?: GestureInsets
  density?: number
}

/**
 * The plugin the app registers (`registerPlugin('SystemGestureInsets')` in Capacitor). It rejects
 * when the platform cannot answer, which is treated as "unreported".
 */
export interface GestureInsetsPluginLike {
  getGestureInsets(): Promise<NativeGestureInsets>
}

export interface GestureInsetsOptions {
  /** The native plugin; pass it only inside a native shell that has it. */
  plugin?: GestureInsetsPluginLike | undefined
  /** Capacitor's platform name. Defaults to `web`. Selects the fallback when there is no answer. */
  platform?: DevicePlatform
  /** Document for the fallback's safe-area read and the density. Defaults to the global. */
  document?: Document
}

export interface GestureInsetsWatchOptions extends GestureInsetsOptions {
  /** Element that receives the CSS variables. Defaults to `document.documentElement`. */
  target?: HTMLElement
  /** CSS variable prefix. Defaults to `--gesture-` (so `--gesture-left` ...). */
  prefix?: string
  /** Called with every fresh reading. */
  onChange?: (reading: GestureInsetsReading) => void
}

const SIDES = ['left', 'right', 'bottom'] as const

function toCssPx(raw: GestureInsets, density: number): GestureInsets | null {
  if (!SIDES.every((side) => Number.isFinite(raw[side]))) return null
  return {
    left: Math.max(0, raw.left) / density,
    right: Math.max(0, raw.right) / density,
    bottom: Math.max(0, raw.bottom) / density,
  }
}

/**
 * Converts a native reading from physical to CSS pixels (`css = physical / density`, negatives
 * clamped to 0). Returns `null` when the density or any value is not a usable number, so a
 * malformed answer falls back instead of publishing `NaN`.
 */
export function gestureInsetsFromNative(
  native: NativeGestureInsets,
  fallbackDensity = 1,
): GestureInsetsReading | null {
  const density = native.density ?? fallbackDensity
  if (!Number.isFinite(density) || density <= 0) return null
  const insets = toCssPx(native, density)
  if (!insets) return null
  if (!native.mandatory) return { source: 'native', insets, mandatory: { ...insets } }
  const mandatory = toCssPx(native.mandatory, density)
  return mandatory ? { source: 'native', insets, mandatory } : null
}

/**
 * The answer when the platform cannot be asked. iOS uses the bottom safe-area inset (the home
 * indicator's strip); every other platform reports nothing, as zeros with source `none`.
 */
export function fallbackGestureInsets(
  platform: DevicePlatform,
  safeArea: Pick<SafeAreaInsets, 'bottom'>,
): GestureInsetsReading {
  if (platform === 'ios') {
    const edge = { left: 0, right: 0, bottom: safeArea.bottom }
    return { source: 'safe-area', insets: edge, mandatory: { ...edge } }
  }
  return {
    source: 'none',
    insets: { ...ZERO_GESTURE_INSETS },
    mandatory: { ...ZERO_GESTURE_INSETS },
  }
}

function defaultDocument(): Document | undefined {
  return typeof document === 'undefined' ? undefined : document
}

async function readNative(
  plugin: GestureInsetsPluginLike,
  density: number,
): Promise<GestureInsetsReading | null> {
  try {
    return gestureInsetsFromNative(await plugin.getGestureInsets(), density)
  } catch {
    return null
  }
}

/**
 * Reads the gesture insets once. Never rejects: a missing, rejecting or malformed plugin gives the
 * platform fallback.
 */
export async function readGestureInsets(
  options: GestureInsetsOptions = {},
): Promise<GestureInsetsReading> {
  const doc = options.document ?? defaultDocument()
  const platform = options.platform ?? 'web'
  if (options.plugin) {
    const native = await readNative(options.plugin, doc?.defaultView?.devicePixelRatio ?? 1)
    if (native) return native
  }
  const bottom = platform === 'ios' && doc ? readSafeAreaInsets(doc).bottom : 0
  return fallbackGestureInsets(platform, { bottom })
}

export function applyGestureInsetVariables(
  insets: GestureInsets,
  target: HTMLElement,
  prefix = '--gesture-',
): void {
  for (const side of SIDES) target.style.setProperty(`${prefix}${side}`, `${insets[side]}px`)
}

/**
 * Reads the insets now and again after every geometry change (the same events as `watchSafeArea`),
 * publishing `--gesture-left/right/bottom` px variables and calling `onChange`. The first reading
 * arrives on the next microtask, later ones after the next animation frame. A reading that resolves
 * after a newer one started, or after dispose, is dropped. Returns a disposer; outside a browser it
 * returns a no-op.
 */
export function watchGestureInsets(options: GestureInsetsWatchOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined
  const target = options.target ?? document.documentElement
  const prefix = options.prefix ?? '--gesture-'
  let frame = 0
  let turn = 0
  let disposed = false
  const measure = () => {
    frame = 0
    const mine = ++turn
    void readGestureInsets(options).then((reading) => {
      if (disposed || mine !== turn) return
      applyGestureInsetVariables(reading.insets, target, prefix)
      options.onChange?.(reading)
    })
  }
  const schedule = () => {
    if (frame !== 0) return
    frame = window.requestAnimationFrame(measure)
  }
  measure()
  const unsubscribe = subscribeGeometry(window, schedule)
  return () => {
    disposed = true
    if (frame !== 0) window.cancelAnimationFrame(frame)
    unsubscribe()
  }
}
