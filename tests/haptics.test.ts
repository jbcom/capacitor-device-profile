import { describe, expect, it, vi } from 'vitest'
import { createHaptics, type HapticsPluginLike } from '../src/index.js'

function fakePlugin() {
  return {
    impact: vi.fn(async () => undefined),
    notification: vi.fn(async () => undefined),
    selectionChanged: vi.fn(async () => undefined),
  } satisfies HapticsPluginLike
}

describe('createHaptics', () => {
  it('forwards to the native plugin with Capacitor enum values', () => {
    const plugin = fakePlugin()
    const haptics = createHaptics({ plugin, native: true })
    haptics.impact()
    haptics.impact('heavy')
    haptics.notify('warning')
    haptics.selection()
    expect(plugin.impact.mock.calls).toEqual([[{ style: 'LIGHT' }], [{ style: 'HEAVY' }]])
    expect(plugin.notification).toHaveBeenCalledWith({ type: 'WARNING' })
    expect(plugin.selectionChanged).toHaveBeenCalledTimes(1)
  })

  it('is a no-op on the web and while disabled', () => {
    const plugin = fakePlugin()
    createHaptics({ plugin, native: false }).impact()
    const haptics = createHaptics({ plugin, native: true, enabled: false })
    haptics.impact()
    expect(plugin.impact).not.toHaveBeenCalled()
    haptics.setEnabled(true)
    haptics.impact('medium')
    expect(plugin.impact).toHaveBeenCalledWith({ style: 'MEDIUM' })
    expect(haptics.enabled).toBe(true)
  })

  it('swallows plugin failures', async () => {
    const plugin = fakePlugin()
    plugin.impact.mockRejectedValueOnce(new Error('no vibrator'))
    expect(() => createHaptics({ plugin, native: true }).impact()).not.toThrow()
    await Promise.resolve()
  })
})
