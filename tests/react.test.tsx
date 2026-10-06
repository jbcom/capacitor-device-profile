import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useDeviceProfile, useSafeAreaInsets } from '../src/react.js'

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
  Object.defineProperty(window.navigator, 'maxTouchPoints', { configurable: true, value: 5 })
}

afterEach(() => setViewport(1024, 768))

describe('useDeviceProfile', () => {
  it('re-classifies live when the window folds and unfolds, without a remount', () => {
    setViewport(821, 765)
    const { result } = renderHook(() => useDeviceProfile())
    expect(result.current.formFactor).toBe('foldable-open')

    act(() => {
      setViewport(404, 797)
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current.formFactor).toBe('phone')

    act(() => {
      setViewport(883, 703)
      window.dispatchEvent(new Event('orientationchange'))
    })
    expect(result.current.formFactor).toBe('foldable-open')
  })

  it('refines the platform from an async lookup', async () => {
    setViewport(1024, 1366)
    const { result } = renderHook(() =>
      useDeviceProfile({ loadPlatform: async () => ({ platform: 'ios', model: 'iPad13,8' }) }),
    )
    await waitFor(() => expect(result.current.platform).toBe('ios'))
    expect(result.current.native).toBe(true)
    expect(result.current.formFactor).toBe('tablet')
  })
})

describe('useSafeAreaInsets', () => {
  it('starts from a measurement and publishes the CSS variables', () => {
    const { result } = renderHook(() => useSafeAreaInsets())
    expect(result.current).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    expect(document.documentElement.style.getPropertyValue('--safe-bottom')).toBe('0px')
  })
})
