/**
 * The package never imports Capacitor at runtime, so this guards the structural contract instead:
 * the real Capacitor 8 plugins must be assignable to the `*Like` interfaces consumers pass them as.
 * (Haptics once failed: its enum-typed, optional `options` parameter rejected a required string one.)
 */
import type { AppPlugin } from '@capacitor/app'
import type { DeviceInfo } from '@capacitor/device'
import type { HapticsPlugin } from '@capacitor/haptics'
import { describe, expectTypeOf, it } from 'vitest'
import type { AppPluginLike, DevicePlatform, HapticsPluginLike } from '../src/index.js'

describe('Capacitor plugin compatibility', () => {
  it('accepts the real App and Haptics plugins and Device platforms', () => {
    expectTypeOf<AppPlugin>().toExtend<AppPluginLike>()
    expectTypeOf<HapticsPlugin>().toExtend<HapticsPluginLike>()
    expectTypeOf<DeviceInfo['platform']>().toExtend<DevicePlatform>()
  })
})
