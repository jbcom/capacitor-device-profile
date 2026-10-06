/**
 * Orientation policy. A game declares the orientation it is designed around; the policy decides, per
 * device, which orientations are acceptable and whether to ask a phone player to rotate. Tablets and
 * unfolded foldables are usable either way, so they are never nagged (the hawthorne-house rule).
 *
 * Fleet rule: never force-rotate. The decision drives a per-screen "turn the device" hint only; the
 * native shell leaves the screen orientation unlocked.
 */
import type { DeviceProfile, ViewOrientation } from './profile.js'

/** `any` means the game lays out in both orientations on every device. */
export type PreferredOrientation = ViewOrientation | 'any'

export interface OrientationDecision {
  /** Orientations the game should accept on this device. */
  allowed: readonly ViewOrientation[]
  /** True when the player should be asked to rotate the device. */
  promptRotate: boolean
  /** The orientation to ask for when `promptRotate` is true. */
  target: ViewOrientation | null
}

const BOTH: readonly ViewOrientation[] = ['portrait', 'landscape']

export function decideOrientation(
  profile: Pick<DeviceProfile, 'formFactor' | 'orientation' | 'touch'>,
  preferred: PreferredOrientation,
): OrientationDecision {
  const flexible =
    preferred === 'any' ||
    !profile.touch ||
    profile.formFactor === 'desktop' ||
    profile.formFactor === 'tablet' ||
    profile.formFactor === 'foldable-open'
  if (flexible) return { allowed: BOTH, promptRotate: false, target: null }
  const allowed: readonly ViewOrientation[] = [preferred]
  const promptRotate = profile.orientation !== preferred
  return { allowed, promptRotate, target: promptRotate ? preferred : null }
}
