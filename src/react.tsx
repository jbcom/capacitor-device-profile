/**
 * React bindings: a live device profile and live safe-area insets. Both re-read on resize,
 * orientation change, visual-viewport resize and fold posture change, so a foldable switches layout
 * when it is folded or unfolded without a reload.
 */
import { useEffect, useState } from 'react'
import {
  classifyDevice,
  type DeviceProfile,
  readViewportFacts,
  type ViewportFacts,
} from './profile.js'
import { readSafeAreaInsets, type SafeAreaInsets, watchSafeArea, ZERO_INSETS } from './safeArea.js'

type PlatformFacts = Pick<ViewportFacts, 'platform' | 'model'>

export interface UseDeviceProfileOptions {
  /** Platform facts known synchronously, e.g. `{ platform: Capacitor.getPlatform(), model: '' }`. */
  platform?: PlatformFacts
  /** Async platform lookup, e.g. `() => Device.getInfo()` from `@capacitor/device`. */
  loadPlatform?: () => Promise<PlatformFacts>
}

const WEB: PlatformFacts = { platform: 'web', model: '' }

/** Subscribes to every event that changes viewport geometry, including fold posture changes. */
export function subscribeViewportGeometry(callback: () => void): () => void {
  const fold =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(horizontal-viewport-segments: 2), (vertical-viewport-segments: 2)')
      : null
  window.addEventListener('resize', callback)
  window.addEventListener('orientationchange', callback)
  window.visualViewport?.addEventListener('resize', callback)
  fold?.addEventListener('change', callback)
  return () => {
    window.removeEventListener('resize', callback)
    window.removeEventListener('orientationchange', callback)
    window.visualViewport?.removeEventListener('resize', callback)
    fold?.removeEventListener('change', callback)
  }
}

export function useDeviceProfile(options: UseDeviceProfileOptions = {}): DeviceProfile {
  const [platform, setPlatform] = useState<PlatformFacts>(options.platform ?? WEB)
  const [profile, setProfile] = useState(() =>
    classifyDevice(readViewportFacts(typeof window === 'undefined' ? null : window, platform)),
  )
  const loadPlatform = options.loadPlatform

  useEffect(() => {
    if (!loadPlatform) return
    let cancelled = false
    loadPlatform()
      .then((info) => {
        if (!cancelled) setPlatform({ platform: info.platform, model: info.model })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [loadPlatform])

  useEffect(() => {
    const update = () => setProfile(classifyDevice(readViewportFacts(window, platform)))
    update()
    return subscribeViewportGeometry(update)
  }, [platform])

  return profile
}

/** Live safe-area insets; also publishes `--safe-*` CSS variables on the root element. */
export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>(() =>
    typeof document === 'undefined' ? { ...ZERO_INSETS } : readSafeAreaInsets(document),
  )
  useEffect(() => watchSafeArea({ onChange: setInsets }), [])
  return insets
}
