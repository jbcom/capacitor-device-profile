import { describe, expect, it } from 'vitest'
import {
  classifyDevice,
  classifyFormFactor,
  isFoldableOpen,
  readViewportFacts,
  type ViewportFacts,
} from '../src/index.js'

const touchWeb = (width: number, height: number): ViewportFacts => ({
  width,
  height,
  devicePixelRatio: 2.7625,
  touch: true,
  platform: 'web',
  model: '',
})

describe('classifyDevice', () => {
  it('classifies the measured OnePlus Open unfolded postures as foldable-open, expanded', () => {
    // Measured on device, Chrome 154: portrait 821x765, landscape 883x703.
    const portrait = classifyDevice(touchWeb(821, 765))
    expect(portrait.formFactor).toBe('foldable-open')
    expect(portrait.frame).toBe('expanded')
    expect(portrait.orientation).toBe('landscape')
    expect(portrait.aspect).toBeCloseTo(821 / 765, 5)
    expect(classifyDevice(touchWeb(883, 703)).formFactor).toBe('foldable-open')
    // Capacitor fullscreen WebView: the whole screen.
    expect(classifyDevice(touchWeb(821, 884)).formFactor).toBe('foldable-open')
    expect(classifyDevice(touchWeb(884, 821)).formFactor).toBe('foldable-open')
  })

  it('reports the folded cover screen as a compact phone (no folded layout yet)', () => {
    const folded = classifyDevice(touchWeb(404, 797))
    expect(folded.formFactor).toBe('phone')
    expect(folded.frame).toBe('compact')
    expect(folded.orientation).toBe('portrait')
  })

  it('switches classification live as the same window folds and unfolds', () => {
    const sizes: Array<[number, number]> = [
      [821, 765],
      [404, 797],
      [883, 703],
    ]
    expect(sizes.map(([w, h]) => classifyDevice(touchWeb(w, h)).formFactor)).toEqual([
      'foldable-open',
      'phone',
      'foldable-open',
    ])
  })

  it('keeps a 4:3 tablet a tablet and a mouse desktop a desktop', () => {
    expect(classifyFormFactor(touchWeb(768, 1024))).toBe('tablet')
    expect(classifyFormFactor({ ...touchWeb(1280, 1280), touch: false })).toBe('desktop')
  })

  it('recognises iPads by model and treats native shells as touch', () => {
    const ipad = classifyDevice({ ...touchWeb(1024, 1366), platform: 'ios', model: 'iPad13,8' })
    expect(ipad.formFactor).toBe('tablet')
    expect(ipad.frame).toBe('expanded')
    const iphone = classifyDevice({
      ...touchWeb(390, 844),
      touch: false,
      platform: 'ios',
      model: 'iPhone15,2',
    })
    expect(iphone.native).toBe(true)
    expect(iphone.touch).toBe(true)
    expect(iphone.frame).toBe('compact')
  })
})

describe('isFoldableOpen', () => {
  it('needs touch, a near-square aspect and a tablet-sized short edge', () => {
    expect(isFoldableOpen({ width: 821, height: 765, touch: false })).toBe(false)
    expect(isFoldableOpen({ width: 500, height: 520, touch: true })).toBe(false)
    expect(isFoldableOpen({ width: 1024, height: 768, touch: true })).toBe(false)
    expect(isFoldableOpen({ width: 0, height: 0, touch: true })).toBe(false)
  })
})

describe('readViewportFacts', () => {
  it('reads a window and falls back to a desktop default without one', () => {
    const facts = readViewportFacts({
      innerWidth: 821,
      innerHeight: 765,
      devicePixelRatio: 2.7625,
      navigator: { maxTouchPoints: 5 },
    })
    expect(facts).toEqual({ ...touchWeb(821, 765) })
    expect(readViewportFacts(null).width).toBe(1280)
  })
})
