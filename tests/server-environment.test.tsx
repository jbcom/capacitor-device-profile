// @vitest-environment node
// With no window or document (server rendering, a test runner, a worker) every entry point must
// degrade to a safe default instead of throwing.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  classifyDevice,
  createAppLifecycle,
  readSafeAreaInsets,
  readViewportFacts,
  watchSafeArea,
  ZERO_INSETS,
} from '../src/index.js'
import { useDeviceProfile, useSafeAreaInsets } from '../src/react.js'

describe('without a browser', () => {
  it('reads a 1280x720 non-touch desktop default', () => {
    const facts = readViewportFacts()
    expect(facts).toEqual({
      width: 1280,
      height: 720,
      devicePixelRatio: 1,
      touch: false,
      platform: 'web',
      model: '',
    })
    expect(classifyDevice(facts).formFactor).toBe('desktop')
  })

  it('measures zero insets when there is no document body, and watching is a no-op', () => {
    expect(readSafeAreaInsets({ defaultView: null, body: null } as unknown as Document)).toEqual(
      ZERO_INSETS,
    )
    expect(watchSafeArea()()).toBeUndefined()
  })

  it('starts an inert lifecycle that still keeps a back stack', async () => {
    const lifecycle = createAppLifecycle({ native: false })
    expect(lifecycle.state).toBe('active')
    const remove = lifecycle.pushBackHandler(() => true)
    expect(lifecycle.handleBack()).toBe(true)
    remove()
    expect(lifecycle.handleBack()).toBe(false)
    await lifecycle.dispose()
  })

  it('registers no page events when only a window is supplied', async () => {
    const lifecycle = createAppLifecycle({ native: false, window: {} as Window })
    expect(lifecycle.state).toBe('active')
    await lifecycle.dispose()
  })

  it('falls back to page events when native is requested without the App plugin', async () => {
    const lifecycle = createAppLifecycle({ native: true })
    expect(lifecycle.state).toBe('active')
    await lifecycle.dispose()
  })

  it('renders the hooks on the server with desktop and zero-inset defaults', () => {
    const seen: unknown[] = []
    function Probe() {
      seen.push(useDeviceProfile().formFactor, useSafeAreaInsets())
      return null
    }
    renderToString(<Probe />)
    expect(seen).toEqual(['desktop', { ...ZERO_INSETS }])
  })
})
