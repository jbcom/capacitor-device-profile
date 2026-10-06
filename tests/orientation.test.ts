import { describe, expect, it } from 'vitest'
import { decideOrientation } from '../src/index.js'

describe('decideOrientation', () => {
  it('lets foldables, tablets and desktops play either way', () => {
    for (const formFactor of ['foldable-open', 'tablet', 'desktop'] as const) {
      const decision = decideOrientation(
        { formFactor, orientation: 'portrait', touch: true },
        'landscape',
      )
      expect(decision).toEqual({
        allowed: ['portrait', 'landscape'],
        promptRotate: false,
        target: null,
      })
    }
  })

  it('hints a phone held the wrong way toward the preferred orientation', () => {
    expect(
      decideOrientation({ formFactor: 'phone', orientation: 'portrait', touch: true }, 'landscape'),
    ).toEqual({ allowed: ['landscape'], promptRotate: true, target: 'landscape' })
    expect(
      decideOrientation({ formFactor: 'phone', orientation: 'landscape', touch: true }, 'landscape')
        .promptRotate,
    ).toBe(false)
  })

  it('never hints when the game supports any orientation or the device is not touch', () => {
    expect(
      decideOrientation({ formFactor: 'phone', orientation: 'portrait', touch: true }, 'any')
        .promptRotate,
    ).toBe(false)
    expect(
      decideOrientation({ formFactor: 'phone', orientation: 'portrait', touch: false }, 'landscape')
        .promptRotate,
    ).toBe(false)
  })
})
