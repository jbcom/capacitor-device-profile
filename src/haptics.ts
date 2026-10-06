/**
 * Haptics facade. Native shells pass Capacitor's `Haptics` plugin; everywhere else every call is a
 * no-op, so game code calls `haptics.impact()` unconditionally. A player setting can switch it off at
 * runtime through `setEnabled`, and plugin failures are swallowed: a missing buzz must never throw
 * into a frame loop.
 */

export type ImpactStrength = 'light' | 'medium' | 'heavy'
export type NotificationKind = 'success' | 'warning' | 'error'

/** The subset of Capacitor's `Haptics` plugin this module uses. Values match its enums. */
export interface HapticsPluginLike {
  impact(options: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }): Promise<void>
  notification(options: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }): Promise<void>
  selectionChanged(): Promise<void>
}

export interface Haptics {
  readonly enabled: boolean
  setEnabled(enabled: boolean): void
  impact(strength?: ImpactStrength): void
  notify(kind: NotificationKind): void
  selection(): void
}

export interface HapticsOptions {
  plugin?: HapticsPluginLike
  native: boolean
  enabled?: boolean
}

const IMPACT_STYLE = { light: 'LIGHT', medium: 'MEDIUM', heavy: 'HEAVY' } as const
const NOTIFICATION_TYPE = { success: 'SUCCESS', warning: 'WARNING', error: 'ERROR' } as const

export function createHaptics(options: HapticsOptions): Haptics {
  let enabled = options.enabled ?? true
  const plugin = options.native ? options.plugin : undefined
  const fire = (call: (target: HapticsPluginLike) => Promise<void>) => {
    if (!enabled || !plugin) return
    void call(plugin).catch(() => undefined)
  }
  return {
    get enabled() {
      return enabled
    },
    setEnabled(next) {
      enabled = next
    },
    impact(strength = 'light') {
      fire((target) => target.impact({ style: IMPACT_STYLE[strength] }))
    },
    notify(kind) {
      fire((target) => target.notification({ type: NOTIFICATION_TYPE[kind] }))
    },
    selection() {
      fire((target) => target.selectionChanged())
    },
  }
}
