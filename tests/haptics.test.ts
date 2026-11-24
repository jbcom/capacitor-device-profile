import { afterEach, describe, expect, it, vi } from 'vitest'
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

  it('ignores the plugin off native and while disabled', () => {
    const plugin = fakePlugin()
    createHaptics({ plugin, native: false, vibrate: vi.fn(() => true) }).impact()
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

describe('createHaptics web vibration fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps impact weight to a pulse length, light by default', () => {
    const vibrate = vi.fn(() => true)
    const haptics = createHaptics({ native: false, vibrate })
    haptics.impact()
    haptics.impact('light')
    haptics.impact('medium')
    haptics.impact('heavy')
    expect(vibrate.mock.calls).toEqual([[12], [12], [24], [40]])
  })

  it('maps each notification kind to its own pattern', () => {
    const vibrate = vi.fn(() => true)
    const haptics = createHaptics({ native: false, vibrate })
    haptics.notify('success')
    haptics.notify('warning')
    haptics.notify('error')
    expect(vibrate.mock.calls).toEqual([[[20, 40, 40]], [[30, 60, 30]], [[50, 40, 50, 40, 50]]])
  })

  it('maps a selection to a short tick', () => {
    const vibrate = vi.fn(() => true)
    createHaptics({ native: false, vibrate }).selection()
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(8)
  })

  it('stays silent while disabled and resumes when re-enabled', () => {
    const vibrate = vi.fn(() => true)
    const haptics = createHaptics({ native: false, vibrate, enabled: false })
    haptics.impact('heavy')
    haptics.notify('error')
    haptics.selection()
    expect(vibrate).not.toHaveBeenCalled()
    haptics.setEnabled(true)
    haptics.impact('heavy')
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(40)
    haptics.setEnabled(false)
    haptics.selection()
    expect(vibrate).toHaveBeenCalledTimes(1)
  })

  it('uses the fallback when native is requested without a plugin', () => {
    const vibrate = vi.fn(() => true)
    createHaptics({ native: true, vibrate }).impact('medium')
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(24)
  })

  it('lets the native plugin take precedence over the fallback', () => {
    const plugin = fakePlugin()
    const vibrate = vi.fn(() => true)
    const haptics = createHaptics({ plugin, native: true, vibrate })
    haptics.impact('heavy')
    haptics.notify('error')
    haptics.selection()
    expect(plugin.impact).toHaveBeenCalledWith({ style: 'HEAVY' })
    expect(plugin.notification).toHaveBeenCalledWith({ type: 'ERROR' })
    expect(plugin.selectionChanged).toHaveBeenCalledTimes(1)
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('does not vibrate in place of a native plugin that fails', async () => {
    const plugin = fakePlugin()
    plugin.impact.mockRejectedValueOnce(new Error('no vibrator'))
    const vibrate = vi.fn(() => true)
    createHaptics({ plugin, native: true, vibrate }).impact()
    await Promise.resolve()
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('ignores a plugin when native is false and vibrates instead', () => {
    const plugin = fakePlugin()
    const vibrate = vi.fn(() => true)
    createHaptics({ plugin, native: false, vibrate }).selection()
    expect(plugin.selectionChanged).not.toHaveBeenCalled()
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(8)
  })

  it('defaults to navigator.vibrate, called as a method of navigator', () => {
    const vibrate = vi.fn(function (this: unknown) {
      expect(this).toBe(navigator)
      return true
    })
    vi.stubGlobal('navigator', { vibrate })
    createHaptics({ native: false }).impact('heavy')
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(40)
  })

  it('reads navigator.vibrate when a call is made, not when the facade is created', () => {
    vi.stubGlobal('navigator', {})
    const haptics = createHaptics({ native: false })
    const vibrate = vi.fn(() => true)
    vi.stubGlobal('navigator', { vibrate })
    haptics.selection()
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(8)
  })

  it('prefers an injected vibrate over navigator.vibrate', () => {
    const own = vi.fn(() => true)
    const global = vi.fn(() => true)
    vi.stubGlobal('navigator', { vibrate: global })
    createHaptics({ native: false, vibrate: own }).selection()
    expect(own).toHaveBeenCalledTimes(1)
    expect(global).not.toHaveBeenCalled()
  })

  it('is a quiet no-op when navigator is absent', () => {
    vi.stubGlobal('navigator', undefined)
    const haptics = createHaptics({ native: false })
    expect(() => {
      haptics.impact('heavy')
      haptics.notify('warning')
      haptics.selection()
    }).not.toThrow()
  })

  it.each([
    ['absent', {}],
    ['not callable', { vibrate: true }],
  ])('is a quiet no-op when navigator.vibrate is %s (iOS Safari)', (_name, stub) => {
    vi.stubGlobal('navigator', stub)
    const haptics = createHaptics({ native: false })
    expect(() => {
      haptics.impact('heavy')
      haptics.notify('error')
      haptics.selection()
    }).not.toThrow()
  })

  it('never throws when vibrate throws', () => {
    const vibrate = vi.fn(() => {
      throw new DOMException('Blocked by the user agent', 'NotAllowedError')
    })
    const haptics = createHaptics({ native: false, vibrate })
    expect(() => {
      haptics.impact()
      haptics.notify('success')
      haptics.selection()
    }).not.toThrow()
    expect(vibrate).toHaveBeenCalledTimes(3)
  })

  it('never throws when reading navigator.vibrate throws', () => {
    vi.stubGlobal('navigator', {
      get vibrate(): never {
        throw new Error('blocked')
      },
    })
    expect(() => createHaptics({ native: false }).impact()).not.toThrow()
  })

  it('never throws when vibrate refuses (returns false, no user activation)', () => {
    const vibrate = vi.fn(() => false)
    const haptics = createHaptics({ native: false, vibrate })
    expect(() => haptics.impact('medium')).not.toThrow()
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(24)
  })
})
