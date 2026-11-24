import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyGestureInsetVariables,
  fallbackGestureInsets,
  type GestureInsetsPluginLike,
  gestureInsetsFromNative,
  type NativeGestureInsets,
  readGestureInsets,
  watchGestureInsets,
  ZERO_GESTURE_INSETS,
} from '../src/index.js'

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.removeAttribute('style')
})

/** What Android holds for a CSS-px strip at a display density: physical = css * density. */
function physical(css: number, density: number): number {
  return css * density
}

/** Lets every already-resolved promise chain run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('gestureInsetsFromNative', () => {
  it('divides physical pixels by the density to give CSS pixels', () => {
    const density = 2.5
    const native: NativeGestureInsets = {
      left: physical(24, density),
      right: physical(30, density),
      bottom: physical(16, density),
      mandatory: { left: 0, right: 0, bottom: physical(16, density) },
      density,
    }
    expect(gestureInsetsFromNative(native)).toEqual({
      source: 'native',
      insets: { left: 24, right: 30, bottom: 16 },
      mandatory: { left: 0, right: 0, bottom: 16 },
    })
  })

  it('falls back to the supplied density, then to a density of 1', () => {
    const native: NativeGestureInsets = { left: physical(20, 2), right: 0, bottom: physical(8, 2) }
    expect(gestureInsetsFromNative(native, 2)?.insets).toEqual({ left: 20, right: 0, bottom: 8 })
    expect(gestureInsetsFromNative({ left: 20, right: 0, bottom: 8 })?.insets).toEqual({
      left: 20,
      right: 0,
      bottom: 8,
    })
  })

  it('treats a missing mandatory reading as the whole reading, in its own object', () => {
    const reading = gestureInsetsFromNative({ left: 4, right: 6, bottom: 8, density: 2 })
    expect(reading?.mandatory).toEqual({ left: 2, right: 3, bottom: 4 })
    expect(reading?.mandatory).not.toBe(reading?.insets)
  })

  it('clamps a negative strip to zero', () => {
    const reading = gestureInsetsFromNative({ left: -10, right: 0, bottom: 5, density: 1 })
    expect(reading?.insets).toEqual({ left: 0, right: 0, bottom: 5 })
  })

  it('rejects an unusable density or a non-finite value', () => {
    const good = { left: 1, right: 1, bottom: 1 }
    expect(gestureInsetsFromNative({ ...good, density: 0 })).toBeNull()
    expect(gestureInsetsFromNative({ ...good, density: -1 })).toBeNull()
    expect(gestureInsetsFromNative({ ...good, density: Number.NaN })).toBeNull()
    expect(gestureInsetsFromNative(good, Number.POSITIVE_INFINITY)).toBeNull()
    expect(gestureInsetsFromNative({ ...good, bottom: Number.NaN })).toBeNull()
    expect(
      gestureInsetsFromNative({ ...good, mandatory: { ...good, left: Number.POSITIVE_INFINITY } }),
    ).toBeNull()
  })
})

describe('fallbackGestureInsets', () => {
  it('uses the bottom safe-area inset on iOS and no side strips', () => {
    const reading = fallbackGestureInsets('ios', { bottom: 21 })
    expect(reading).toEqual({
      source: 'safe-area',
      insets: { left: 0, right: 0, bottom: 21 },
      mandatory: { left: 0, right: 0, bottom: 21 },
    })
    expect(reading.mandatory).not.toBe(reading.insets)
  })

  it.each(['web', 'android', 'electron'] as const)('reports nothing on %s', (platform) => {
    const reading = fallbackGestureInsets(platform, { bottom: 34 })
    expect(reading.source).toBe('none')
    expect(reading.insets).toEqual(ZERO_GESTURE_INSETS)
    expect(reading.mandatory).toEqual(ZERO_GESTURE_INSETS)
    expect(reading.insets).not.toBe(ZERO_GESTURE_INSETS)
  })
})

describe('readGestureInsets', () => {
  const plugin = (result: () => Promise<NativeGestureInsets>): GestureInsetsPluginLike => ({
    getGestureInsets: vi.fn(result),
  })

  it('converts the plugin answer with the density the plugin reports', async () => {
    const answer = plugin(async () => ({ left: 48, right: 48, bottom: 32, density: 2 }))
    const reading = await readGestureInsets({ plugin: answer, platform: 'android' })
    expect(reading.source).toBe('native')
    expect(reading.insets).toEqual({ left: 24, right: 24, bottom: 16 })
  })

  it('uses the window devicePixelRatio when the plugin sends no density', async () => {
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(4)
    const answer = plugin(async () => ({ left: 96, right: 0, bottom: 48 }))
    const reading = await readGestureInsets({ plugin: answer, platform: 'android' })
    expect(reading.insets).toEqual({ left: 24, right: 0, bottom: 12 })
  })

  it('uses a density of 1 when the document has no window', async () => {
    const answer = plugin(async () => ({ left: 7, right: 0, bottom: 9 }))
    const doc = { defaultView: null } as unknown as Document
    const reading = await readGestureInsets({ plugin: answer, document: doc })
    expect(reading.insets).toEqual({ left: 7, right: 0, bottom: 9 })
  })

  it('falls back when the plugin rejects, throws or answers with garbage', async () => {
    const rejecting = plugin(() => Promise.reject(new Error('unavailable')))
    expect((await readGestureInsets({ plugin: rejecting, platform: 'android' })).source).toBe(
      'none',
    )
    const throwing: GestureInsetsPluginLike = {
      getGestureInsets: () => {
        throw new Error('not registered')
      },
    }
    expect((await readGestureInsets({ plugin: throwing })).source).toBe('none')
    const garbage = plugin(async () => ({ left: Number.NaN, right: 0, bottom: 0 }))
    expect((await readGestureInsets({ plugin: garbage })).source).toBe('none')
    const empty = plugin(async () => null as unknown as NativeGestureInsets)
    expect((await readGestureInsets({ plugin: empty })).source).toBe('none')
  })

  it('reads nothing on the web and on Android without a plugin', async () => {
    expect((await readGestureInsets()).source).toBe('none')
    expect((await readGestureInsets({ platform: 'android' })).insets).toEqual(ZERO_GESTURE_INSETS)
  })

  it('measures the bottom safe area on iOS, with or without a plugin answer', async () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      paddingTop: '0px',
      paddingRight: '0px',
      paddingBottom: '34px',
      paddingLeft: '0px',
    } as CSSStyleDeclaration)
    const reading = await readGestureInsets({ platform: 'ios' })
    expect(reading).toMatchObject({ source: 'safe-area', insets: { bottom: 34 } })
    const failed = plugin(() => Promise.reject(new Error('unavailable')))
    expect((await readGestureInsets({ platform: 'ios', plugin: failed })).insets.bottom).toBe(34)
  })
})

describe('applyGestureInsetVariables', () => {
  it('publishes px variables with a configurable prefix', () => {
    const target = document.createElement('div')
    applyGestureInsetVariables({ left: 24, right: 12.5, bottom: 0 }, target)
    expect(target.style.getPropertyValue('--gesture-left')).toBe('24px')
    expect(target.style.getPropertyValue('--gesture-right')).toBe('12.5px')
    applyGestureInsetVariables({ left: 1, right: 2, bottom: 3 }, target, '--edge-')
    expect(target.style.getPropertyValue('--edge-bottom')).toBe('3px')
  })
})

describe('watchGestureInsets', () => {
  it('publishes variables and a reading now, coalesces geometry events, and stops on dispose', async () => {
    const onChange = vi.fn()
    const getGestureInsets = vi.fn(async () => ({ left: 48, right: 48, bottom: 32, density: 2 }))
    const dispose = watchGestureInsets({ plugin: { getGestureInsets }, onChange })
    await settle()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ source: 'native' })
    expect(document.documentElement.style.getPropertyValue('--gesture-left')).toBe('24px')
    expect(document.documentElement.style.getPropertyValue('--gesture-bottom')).toBe('16px')

    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('orientationchange'))
    await frame()
    await settle()
    expect(getGestureInsets).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenCalledTimes(2)

    dispose()
    window.dispatchEvent(new Event('resize'))
    await frame()
    expect(getGestureInsets).toHaveBeenCalledTimes(2)
  })

  it('drops an answer that resolves after a newer read started', async () => {
    const first = deferred<NativeGestureInsets>()
    const second = deferred<NativeGestureInsets>()
    const queue = [first, second]
    const onChange = vi.fn()
    const dispose = watchGestureInsets({
      plugin: { getGestureInsets: () => queue.shift()?.promise as Promise<NativeGestureInsets> },
      onChange,
    })
    window.dispatchEvent(new Event('resize'))
    await frame()
    second.resolve({ left: 8, right: 8, bottom: 8, density: 1 })
    await settle()
    first.resolve({ left: 99, right: 99, bottom: 99, density: 1 })
    await settle()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]?.[0].insets).toEqual({ left: 8, right: 8, bottom: 8 })
    dispose()
  })

  it('drops an answer that resolves after dispose, and cancels a pending frame', async () => {
    const pending = deferred<NativeGestureInsets>()
    const onChange = vi.fn()
    const cancel = vi.spyOn(window, 'cancelAnimationFrame')
    const dispose = watchGestureInsets({
      plugin: { getGestureInsets: () => pending.promise },
      onChange,
    })
    window.dispatchEvent(new Event('resize'))
    dispose()
    expect(cancel).toHaveBeenCalledTimes(1)
    pending.resolve({ left: 8, right: 8, bottom: 8, density: 1 })
    await settle()
    expect(onChange).not.toHaveBeenCalled()
    expect(document.documentElement.style.getPropertyValue('--gesture-left')).toBe('')
  })

  it('reports the fallback with no plugin, to a chosen target and prefix, without onChange', async () => {
    const target = document.createElement('div')
    const dispose = watchGestureInsets({ target, prefix: '--edge-', platform: 'android' })
    await settle()
    expect(target.style.getPropertyValue('--edge-left')).toBe('0px')
    expect(target.style.getPropertyValue('--edge-bottom')).toBe('0px')
    dispose()
  })
})
