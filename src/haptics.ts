/**
 * Haptics facade. Native shells pass Capacitor's `Haptics` plugin. Everywhere else the browser's
 * Vibration API (`navigator.vibrate`) stands in where the browser has it; on a browser without it,
 * such as iOS Safari, or with no `navigator` at all (server rendering), every call
 * is a quiet no-op. Game code calls `haptics.impact()` unconditionally. A player setting can switch it
 * off at runtime through `setEnabled`, and failures are swallowed: a missing buzz must never throw
 * into a frame loop.
 */

export type ImpactStrength = 'light' | 'medium' | 'heavy'
export type NotificationKind = 'success' | 'warning' | 'error'

/**
 * The subset of Capacitor's `Haptics` plugin this module uses. The values sent are the string values
 * of Capacitor's `ImpactStyle` and `NotificationType` enums; the fields are typed `string` so the real
 * plugin (whose parameters are those enums) is assignable without this package importing Capacitor.
 */
export interface HapticsPluginLike {
  impact(options?: { style?: string }): Promise<void>
  notification(options?: { type?: string }): Promise<void>
  selectionChanged(): Promise<void>
}

export interface Haptics {
  readonly enabled: boolean
  setEnabled(enabled: boolean): void
  impact(strength?: ImpactStrength): void
  notify(kind: NotificationKind): void
  selection(): void
}

/**
 * The shape of `navigator.vibrate`: a duration in milliseconds, or an alternating vibrate/pause
 * pattern, answered with whether the browser accepted it.
 */
export type VibrateFunction = (pattern: number | number[]) => boolean

export interface HapticsOptions {
  /** Capacitor's `Haptics` plugin; used only when `native` is true. */
  plugin?: HapticsPluginLike
  native: boolean
  enabled?: boolean
  /**
   * The web fallback, used whenever the native plugin is not (`native` is false, or no `plugin` was
   * passed). Defaults to `navigator.vibrate` when the browser has one, looked up at call time; with
   * neither, every call does nothing. Never used while a native plugin is in play.
   */
  vibrate?: VibrateFunction
}

const IMPACT_STYLE = { light: 'LIGHT', medium: 'MEDIUM', heavy: 'HEAVY' } as const
const NOTIFICATION_TYPE = { success: 'SUCCESS', warning: 'WARNING', error: 'ERROR' } as const

/** Web fallback pulse lengths in milliseconds, by impact weight. */
const IMPACT_MS = { light: 12, medium: 24, heavy: 40 } as const
/** Web fallback patterns (vibrate, pause, vibrate, ...) in milliseconds, by notification kind. */
const NOTIFICATION_PATTERN = {
  success: [20, 40, 40],
  warning: [30, 60, 30],
  error: [50, 40, 50, 40, 50],
} as const
/** Web fallback tick for a selection change, in milliseconds. */
const SELECTION_MS = 8

/** `navigator.vibrate` bound to `navigator`, or undefined where there is none (iOS Safari, servers). */
function navigatorVibrate(): VibrateFunction | undefined {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return undefined
  return navigator.vibrate.bind(navigator)
}

export function createHaptics(options: HapticsOptions): Haptics {
  let enabled = options.enabled ?? true
  const plugin = options.native ? options.plugin : undefined
  const fire = (
    call: (target: HapticsPluginLike) => Promise<void>,
    buzz: number | readonly number[],
  ) => {
    if (!enabled) return
    if (plugin) {
      void call(plugin).catch(() => undefined)
      return
    }
    try {
      const vibrate = options.vibrate ?? navigatorVibrate()
      // vibrate() answers false when the browser declines (no user activation yet, or the setting is
      // off); that is not an error, the buzz is simply skipped.
      vibrate?.(typeof buzz === 'number' ? buzz : [...buzz])
    } catch {
      // A browser may also throw (blocked by policy or an embedded frame); never into the caller.
    }
  }
  return {
    get enabled() {
      return enabled
    },
    setEnabled(next) {
      enabled = next
    },
    impact(strength = 'light') {
      fire((target) => target.impact({ style: IMPACT_STYLE[strength] }), IMPACT_MS[strength])
    },
    notify(kind) {
      fire(
        (target) => target.notification({ type: NOTIFICATION_TYPE[kind] }),
        NOTIFICATION_PATTERN[kind],
      )
    },
    selection() {
      fire((target) => target.selectionChanged(), SELECTION_MS)
    },
  }
}
