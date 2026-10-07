import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type AppPluginLike,
  classifyDevice,
  createAppLifecycle,
  readViewportFacts,
  watchSafeArea,
} from '../src/index.js'
import { subscribeViewportGeometry, useDeviceProfile } from '../src/react.js'

const FOLD_QUERY = '(horizontal-viewport-segments: 2), (vertical-viewport-segments: 2)'

/** A minimal MediaQueryList whose `change` event the test fires by hand. */
function stubFoldMedia() {
  const target = new EventTarget()
  const queries: string[] = []
  const matchMedia = vi.fn((query: string) => {
    queries.push(query)
    return target as unknown as MediaQueryList
  })
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia })
  return { fold: () => target.dispatchEvent(new Event('change')), queries }
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
  Object.defineProperty(window.navigator, 'maxTouchPoints', { configurable: true, value: 5 })
}

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
  setViewport(1024, 768)
})

describe('fold posture changes', () => {
  it('re-measures the safe area when the posture media query changes', async () => {
    const { fold, queries } = stubFoldMedia()
    const onChange = vi.fn()
    const dispose = watchSafeArea({ onChange })
    expect(queries).toEqual([FOLD_QUERY])
    expect(onChange).toHaveBeenCalledTimes(1)

    fold()
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(onChange).toHaveBeenCalledTimes(2)

    dispose()
    fold()
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('cancels a pending measurement when disposed before the next frame', () => {
    const onChange = vi.fn()
    const dispose = watchSafeArea({ onChange })
    window.dispatchEvent(new Event('resize'))
    dispose()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('re-classifies a foldable when its posture changes, without a resize event', () => {
    const { fold } = stubFoldMedia()
    setViewport(404, 797)
    const { result } = renderHook(() => useDeviceProfile())
    expect(result.current.formFactor).toBe('phone')

    act(() => {
      setViewport(821, 765)
      fold()
    })
    expect(result.current.formFactor).toBe('foldable-open')
  })

  it('stops notifying after unsubscribe', () => {
    const { fold } = stubFoldMedia()
    const callback = vi.fn()
    const unsubscribe = subscribeViewportGeometry(callback)
    fold()
    expect(callback).toHaveBeenCalledTimes(1)
    unsubscribe()
    fold()
    window.dispatchEvent(new Event('resize'))
    expect(callback).toHaveBeenCalledTimes(1)
  })
})

describe('useDeviceProfile platform lookup', () => {
  it('stays on the web platform when the lookup rejects', async () => {
    setViewport(404, 797)
    const loadPlatform = vi.fn(async () => {
      throw new Error('plugin unavailable')
    })
    const { result } = renderHook(() => useDeviceProfile({ loadPlatform }))
    await act(async () => {
      await Promise.resolve()
    })
    expect(loadPlatform).toHaveBeenCalledTimes(1)
    expect(result.current.platform).toBe('web')
    expect(result.current.formFactor).toBe('phone')
  })

  it('ignores a lookup that resolves after unmount', async () => {
    let resolve: (facts: { platform: 'ios'; model: string }) => void = () => undefined
    const loadPlatform = () =>
      new Promise<{ platform: 'ios'; model: string }>((done) => {
        resolve = done
      })
    const { unmount } = renderHook(() => useDeviceProfile({ loadPlatform }))
    unmount()
    await act(async () => {
      resolve({ platform: 'ios', model: 'iPad13,8' })
      await Promise.resolve()
    })
  })

  it('classifies from a synchronously known platform', () => {
    setViewport(1024, 1366)
    const { result } = renderHook(() =>
      useDeviceProfile({ platform: { platform: 'ios', model: 'iPad13,8' } }),
    )
    expect(result.current.formFactor).toBe('tablet')
    expect(result.current.frame).toBe('expanded')
  })
})

describe('viewport facts and classification edges', () => {
  it('reads the global window when none is passed', () => {
    setViewport(821, 765)
    expect(readViewportFacts()).toMatchObject({ width: 821, height: 765, touch: true })
  })

  it('reads facts from a plain window-like object, defaulting missing fields', () => {
    expect(readViewportFacts({ innerWidth: 400, innerHeight: 800 })).toMatchObject({
      width: 400,
      height: 800,
      devicePixelRatio: 1,
      touch: false,
    })
    expect(
      readViewportFacts({
        innerWidth: 400,
        innerHeight: 800,
        devicePixelRatio: 3,
        navigator: { maxTouchPoints: 2 },
      }),
    ).toMatchObject({ devicePixelRatio: 3, touch: true })
    expect(
      readViewportFacts({ innerWidth: 400, innerHeight: 800, ontouchstart: null } as never),
    ).toMatchObject({ touch: true })
  })

  it('treats an electron shell as a desktop even on a touch screen', () => {
    const profile = classifyDevice({
      width: 1280,
      height: 800,
      devicePixelRatio: 2,
      touch: true,
      platform: 'electron',
      model: '',
    })
    expect(profile.formFactor).toBe('desktop')
  })

  it('reports a square aspect for an empty viewport instead of dividing by zero', () => {
    const profile = classifyDevice({
      width: 0,
      height: 0,
      devicePixelRatio: 1,
      touch: true,
      platform: 'web',
      model: '',
    })
    expect(profile.aspect).toBe(1)
    expect(profile.formFactor).toBe('phone')
  })
})

describe('createAppLifecycle edges', () => {
  it('removes a back handler once, however many times its remover is called', () => {
    const lifecycle = createAppLifecycle({ native: false })
    const remove = lifecycle.pushBackHandler(() => true)
    lifecycle.pushBackHandler(() => false)
    remove()
    remove()
    expect(lifecycle.handleBack()).toBe(false)
  })

  it('disposes cleanly when a native listener failed to register', async () => {
    const app = {
      addListener: vi.fn(async () => {
        throw new Error('no listener')
      }),
      minimizeApp: vi.fn(async () => undefined),
    } as unknown as AppPluginLike
    const lifecycle = createAppLifecycle({ app, native: true })
    await expect(lifecycle.dispose()).resolves.toBeUndefined()
  })

  it('does not throw into the back press when minimising fails', async () => {
    const listeners = new Map<string, (payload: never) => void>()
    const app = {
      addListener: vi.fn(async (event: string, listener: (payload: never) => void) => {
        listeners.set(event, listener)
        return { remove: async () => undefined }
      }),
      minimizeApp: vi.fn(async () => {
        throw new Error('cannot minimise')
      }),
    } as unknown as AppPluginLike
    createAppLifecycle({ app, native: true })
    const press = listeners.get('backButton') as (payload: unknown) => void
    expect(() => press({ canGoBack: false })).not.toThrow()
    await Promise.resolve()
  })

  it('follows document visibility on the web', () => {
    const onPause = vi.fn()
    const onResume = vi.fn()
    createAppLifecycle({ native: false, onPause, onResume })
    const hidden = vi.spyOn(document, 'hidden', 'get')
    hidden.mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(onPause).toHaveBeenCalledTimes(1)
    expect(onResume).toHaveBeenCalledTimes(1)
    hidden.mockRestore()
  })
})
