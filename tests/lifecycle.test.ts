import { describe, expect, it, vi } from 'vitest'
import { type AppPluginLike, createAppLifecycle } from '../src/index.js'

function fakeApp() {
  const listeners = new Map<string, (payload: never) => void>()
  const removed: string[] = []
  const app = {
    addListener: vi.fn(async (event: string, listener: (payload: never) => void) => {
      listeners.set(event, listener)
      return { remove: async () => void removed.push(event) }
    }),
    minimizeApp: vi.fn(async () => undefined),
  }
  const emit = (event: string, payload: unknown) =>
    (listeners.get(event) as ((value: unknown) => void) | undefined)?.(payload)
  return { app: app as unknown as AppPluginLike & typeof app, emit, removed }
}

describe('createAppLifecycle (native)', () => {
  it('runs the newest back handler first and minimises when none consumes the press', async () => {
    const { app, emit } = fakeApp()
    const lifecycle = createAppLifecycle({ app, native: true })
    await Promise.resolve()
    const calls: string[] = []
    lifecycle.pushBackHandler(() => {
      calls.push('menu')
      return false
    })
    const removeModal = lifecycle.pushBackHandler(() => {
      calls.push('modal')
      return true
    })

    emit('backButton', { canGoBack: false })
    expect(calls).toEqual(['modal'])
    expect(app.minimizeApp).not.toHaveBeenCalled()

    removeModal()
    emit('backButton', { canGoBack: false })
    expect(calls).toEqual(['modal', 'menu'])
    expect(app.minimizeApp).toHaveBeenCalledTimes(1)
  })

  it('lets many parts subscribe to pause and resume, each removing only its own', async () => {
    const { app, emit } = fakeApp()
    const order: string[] = []
    const lifecycle = createAppLifecycle({
      app,
      native: true,
      onPause: () => order.push('option'),
    })
    const stopSave = lifecycle.onPause(() => order.push('save'))
    lifecycle.onPause(() => order.push('audio'))
    const resumed = vi.fn()
    const stopResume = lifecycle.onResume(resumed)

    emit('appStateChange', { isActive: false })
    expect(order).toEqual(['option', 'save', 'audio'])

    stopSave()
    emit('appStateChange', { isActive: true })
    emit('appStateChange', { isActive: false })
    expect(order).toEqual(['option', 'save', 'audio', 'option', 'audio'])
    expect(resumed).toHaveBeenCalledTimes(1)

    stopResume()
    emit('appStateChange', { isActive: true })
    expect(resumed).toHaveBeenCalledTimes(1)

    await lifecycle.dispose()
    emit('appStateChange', { isActive: false })
    expect(order).toHaveLength(5)
  })

  it('treats the same listener subscribed twice as two subscriptions', () => {
    const { app, emit } = fakeApp()
    const lifecycle = createAppLifecycle({ app, native: true })
    const heard = vi.fn()
    const first = lifecycle.onPause(heard)
    lifecycle.onPause(heard)
    first()
    emit('appStateChange', { isActive: false })
    expect(heard).toHaveBeenCalledTimes(1)
  })

  it('reports pause and resume once per transition and removes its listeners on dispose', async () => {
    const { app, emit, removed } = fakeApp()
    const onPause = vi.fn()
    const onResume = vi.fn()
    const lifecycle = createAppLifecycle({ app, native: true, onPause, onResume })
    emit('appStateChange', { isActive: false })
    emit('appStateChange', { isActive: false })
    expect(lifecycle.state).toBe('background')
    emit('appStateChange', { isActive: true })
    expect(onPause).toHaveBeenCalledTimes(1)
    expect(onResume).toHaveBeenCalledTimes(1)

    await lifecycle.dispose()
    expect(removed.sort()).toEqual(['appStateChange', 'backButton'])
    emit('appStateChange', { isActive: false })
    expect(onPause).toHaveBeenCalledTimes(1)
  })
})

describe('createAppLifecycle (web)', () => {
  it('maps page visibility and pagehide/pageshow to pause and resume', async () => {
    const onPause = vi.fn()
    const onResume = vi.fn()
    const lifecycle = createAppLifecycle({ native: false, onPause, onResume })
    window.dispatchEvent(new Event('pagehide'))
    expect(lifecycle.state).toBe('background')
    window.dispatchEvent(new Event('pageshow'))
    expect(lifecycle.state).toBe('active')
    expect(onPause).toHaveBeenCalledTimes(1)
    expect(onResume).toHaveBeenCalledTimes(1)
    expect(lifecycle.handleBack()).toBe(false)

    await lifecycle.dispose()
    window.dispatchEvent(new Event('pagehide'))
    expect(onPause).toHaveBeenCalledTimes(1)
  })
})
