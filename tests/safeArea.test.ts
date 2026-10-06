import { afterEach, describe, expect, it, vi } from 'vitest'
import { applySafeAreaVariables, readSafeAreaInsets, watchSafeArea } from '../src/index.js'

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.removeAttribute('style')
})

describe('safe-area insets', () => {
  it('measures through a probe element and removes it again', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      paddingTop: '0px',
      paddingRight: '12px',
      paddingBottom: '17px',
      paddingLeft: 'auto',
    } as CSSStyleDeclaration)
    const before = document.body.childElementCount
    expect(readSafeAreaInsets(document)).toEqual({ top: 0, right: 12, bottom: 17, left: 0 })
    expect(document.body.childElementCount).toBe(before)
  })

  it('publishes px variables with a configurable prefix', () => {
    const target = document.createElement('div')
    applySafeAreaVariables({ top: 1, right: 2, bottom: 17, left: 0 }, target, '--inset-')
    expect(target.style.getPropertyValue('--inset-bottom')).toBe('17px')
    expect(target.style.getPropertyValue('--inset-top')).toBe('1px')
  })

  it('re-measures after resize and orientation change, then stops after dispose', async () => {
    const onChange = vi.fn()
    const dispose = watchSafeArea({ onChange })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(document.documentElement.style.getPropertyValue('--safe-top')).toBe('0px')

    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('orientationchange'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    // Both events coalesce into one measurement on the next frame.
    expect(onChange).toHaveBeenCalledTimes(2)

    dispose()
    window.dispatchEvent(new Event('resize'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(onChange).toHaveBeenCalledTimes(2)
  })
})
