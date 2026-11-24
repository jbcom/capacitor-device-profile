// @vitest-environment node
// With no window or document (server rendering, a test runner, a worker) every entry point must
// degrade to a safe default instead of throwing.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  classifyDevice,
  createAppLifecycle,
  type FormFactor,
  type GestureInsetsReading,
  readGestureInsets,
  readSafeAreaInsets,
  readViewportFacts,
  type SafeAreaInsets,
  watchGestureInsets,
  watchSafeArea,
  ZERO_GESTURE_INSETS,
  ZERO_INSETS,
} from '../src/index.js'
import { useDeviceProfile, useGestureInsets, useSafeAreaInsets } from '../src/react.js'

function Probe({ onRead }: { onRead: (formFactor: FormFactor, insets: SafeAreaInsets) => void }) {
  onRead(useDeviceProfile().formFactor, useSafeAreaInsets())
  return null
}

function GesturesProbe({
  platform,
  onRead,
}: {
  platform: 'web' | 'ios'
  onRead: (reading: GestureInsetsReading) => void
}) {
  onRead(useGestureInsets({ platform }))
  return null
}

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
    renderToString(<Probe onRead={(formFactor, insets) => seen.push(formFactor, insets)} />)
    expect(seen).toEqual(['desktop', { ...ZERO_INSETS }])
  })

  it('reports no gesture insets, and watching them is a no-op', async () => {
    expect(watchGestureInsets()()).toBeUndefined()
    expect(await readGestureInsets()).toEqual({
      source: 'none',
      insets: { ...ZERO_GESTURE_INSETS },
      mandatory: { ...ZERO_GESTURE_INSETS },
    })
    expect(await readGestureInsets({ platform: 'ios' })).toMatchObject({
      source: 'safe-area',
      insets: { bottom: 0 },
    })
  })

  it('renders the gesture hook on the server with the platform fallback', () => {
    const seen: GestureInsetsReading[] = []
    const onRead = (reading: GestureInsetsReading) => seen.push(reading)
    renderToString(<GesturesProbe platform="web" onRead={onRead} />)
    renderToString(<GesturesProbe platform="ios" onRead={onRead} />)
    expect(seen.map((reading) => reading.source)).toEqual(['none', 'safe-area'])
  })
})
