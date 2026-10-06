/**
 * Device profile: a pure classification of the current viewport into the categories a game's layout
 * actually branches on. Every input is injectable so the classification unit-tests without a browser
 * and so a native shell can feed it platform facts (Capacitor `Device.getInfo()`).
 */

/** `compact` lays a HUD out for a phone; `expanded` has room for side panels. */
export type FrameClass = 'compact' | 'expanded'
export type ViewOrientation = 'portrait' | 'landscape'
/**
 * The form factor a layout targets. `foldable-open` is an unfolded book-style foldable (OnePlus Open,
 * Galaxy Z Fold, Pixel Fold): touch-primary, tablet-sized and near-square, so it plays in either
 * orientation and needs a layout of its own rather than a stretched phone or a squashed tablet one.
 */
export type FormFactor = 'phone' | 'foldable-open' | 'tablet' | 'desktop'
/** Platform names as Capacitor's `Device.getInfo().platform` reports them. */
export type DevicePlatform = 'web' | 'android' | 'ios' | 'electron'

export interface ViewportFacts {
  /** CSS pixels (`window.innerWidth`). */
  width: number
  /** CSS pixels (`window.innerHeight`). */
  height: number
  devicePixelRatio: number
  /** True when the primary input is touch (`maxTouchPoints > 0`). */
  touch: boolean
  platform: DevicePlatform
  /** Native model string; used only to recognise iPads, which report a phone-like platform. */
  model: string
}

export type DeviceProfile = Readonly<{
  frame: FrameClass
  formFactor: FormFactor
  orientation: ViewOrientation
  platform: DevicePlatform
  native: boolean
  touch: boolean
  shortEdge: number
  longEdge: number
  /** Long edge divided by short edge; 1 is square. */
  aspect: number
  devicePixelRatio: number
}>

/** Short edge (CSS px) at which a frame counts as expanded. Phones stay below ~480. */
export const EXPANDED_MIN_SHORT_EDGE = 700
/** Short edge (CSS px) from which a touch screen is tablet-sized rather than a phone. */
export const TABLET_MIN_SHORT_EDGE = 600
/**
 * Long/short aspect at or below which a screen is near-square. A phone in portrait is ~2.1, a 4:3
 * tablet 1.33, an unfolded OnePlus Open ~1.08.
 */
export const NEAR_SQUARE_MAX_ASPECT = 1.3

export function classifyOrientation(width: number, height: number): ViewOrientation {
  return height > width ? 'portrait' : 'landscape'
}

/** True for an unfolded book-style foldable: near-square and tablet-sized, on a touch screen. */
export function isFoldableOpen(facts: Pick<ViewportFacts, 'width' | 'height' | 'touch'>): boolean {
  if (!facts.touch) return false
  const shortEdge = Math.min(facts.width, facts.height)
  const longEdge = Math.max(facts.width, facts.height)
  if (shortEdge <= 0) return false
  return longEdge / shortEdge <= NEAR_SQUARE_MAX_ASPECT && shortEdge >= TABLET_MIN_SHORT_EDGE
}

export function classifyFormFactor(facts: ViewportFacts): FormFactor {
  const shortEdge = Math.min(facts.width, facts.height)
  if (facts.platform === 'ios' && /ipad/i.test(facts.model)) return 'tablet'
  if (isFoldableOpen(facts)) return 'foldable-open'
  if (!facts.touch && facts.platform === 'web') return 'desktop'
  if (facts.platform === 'electron') return 'desktop'
  return shortEdge >= TABLET_MIN_SHORT_EDGE ? 'tablet' : 'phone'
}

export function classifyFrame(facts: ViewportFacts): FrameClass {
  if (facts.platform === 'ios') return /ipad/i.test(facts.model) ? 'expanded' : 'compact'
  return Math.min(facts.width, facts.height) >= EXPANDED_MIN_SHORT_EDGE ? 'expanded' : 'compact'
}

export function classifyDevice(facts: ViewportFacts): DeviceProfile {
  const shortEdge = Math.min(facts.width, facts.height)
  const longEdge = Math.max(facts.width, facts.height)
  const native = facts.platform === 'android' || facts.platform === 'ios'
  return {
    frame: classifyFrame(facts),
    formFactor: classifyFormFactor(facts),
    orientation: classifyOrientation(facts.width, facts.height),
    platform: facts.platform,
    native,
    touch: facts.touch || native,
    shortEdge,
    longEdge,
    aspect: shortEdge > 0 ? longEdge / shortEdge : 1,
    devicePixelRatio: facts.devicePixelRatio,
  }
}

interface BrowserLike {
  innerWidth: number
  innerHeight: number
  devicePixelRatio?: number
  navigator?: { maxTouchPoints?: number }
}

/**
 * Reads viewport facts from a window (`null` outside a browser gives a 1280x720 desktop default).
 * Platform facts default to `web` until a native shell says otherwise.
 */
export function readViewportFacts(
  win: BrowserLike | null = typeof window === 'undefined' ? null : window,
  platform: Pick<ViewportFacts, 'platform' | 'model'> = { platform: 'web', model: '' },
): ViewportFacts {
  if (!win) {
    return { width: 1280, height: 720, devicePixelRatio: 1, touch: false, ...platform }
  }
  return {
    width: win.innerWidth,
    height: win.innerHeight,
    devicePixelRatio: win.devicePixelRatio ?? 1,
    touch: (win.navigator?.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in win,
    ...platform,
  }
}
