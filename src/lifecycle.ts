/**
 * App lifecycle: pause/resume and the Android back button, on native shells and in the browser.
 *
 * The Capacitor `App` plugin is passed in rather than imported, so this package carries no runtime
 * dependency on Capacitor and the logic unit-tests with a fake. On the web, pause/resume comes from
 * `visibilitychange`, `pagehide` and `pageshow`.
 *
 * Back handling is a stack: the most recently pushed handler (an open modal, then the pause menu)
 * runs first, and returning `true` consumes the press. An unconsumed press minimises the app instead
 * of exiting it, so a stray back never throws away a run.
 */

export type LifecycleState = 'active' | 'background'

export interface PluginListenerHandleLike {
  remove(): Promise<void>
}

/** The subset of Capacitor's `App` plugin this module uses. */
export interface AppPluginLike {
  addListener(
    event: 'appStateChange',
    listener: (state: { isActive: boolean }) => void,
  ): Promise<PluginListenerHandleLike>
  addListener(
    event: 'backButton',
    listener: (event: { canGoBack: boolean }) => void,
  ): Promise<PluginListenerHandleLike>
  minimizeApp(): Promise<void>
}

/** Returns true when it handled the press. */
export type BackHandler = () => boolean

export interface AppLifecycleOptions {
  /** Capacitor's `App` plugin; required for native back-button and state events. */
  app?: AppPluginLike
  /** True inside a native shell (`Capacitor.isNativePlatform()`). */
  native: boolean
  onPause?: () => void
  onResume?: () => void
  /** Window and document for the web path; default to the globals. */
  window?: Window
  document?: Document
}

export interface AppLifecycle {
  readonly state: LifecycleState
  /** Pushes a back handler; the returned function removes it. */
  pushBackHandler(handler: BackHandler): () => void
  /** Runs the back stack as a hardware back press would. Returns true when a handler consumed it. */
  handleBack(): boolean
  dispose(): Promise<void>
}

export function createAppLifecycle(options: AppLifecycleOptions): AppLifecycle {
  const handlers: BackHandler[] = []
  const handles: Promise<PluginListenerHandleLike>[] = []
  const removers: Array<() => void> = []
  let state: LifecycleState = 'active'
  let disposed = false

  const transition = (next: LifecycleState) => {
    if (disposed || next === state) return
    state = next
    if (next === 'active') options.onResume?.()
    else options.onPause?.()
  }

  const handleBack = (): boolean => {
    for (let index = handlers.length - 1; index >= 0; index -= 1) {
      const handler = handlers[index]
      if (handler?.()) return true
    }
    return false
  }

  if (options.native && options.app) {
    const app = options.app
    handles.push(
      app.addListener('appStateChange', ({ isActive }) =>
        transition(isActive ? 'active' : 'background'),
      ),
    )
    handles.push(
      app.addListener('backButton', () => {
        if (!handleBack()) void app.minimizeApp().catch(() => undefined)
      }),
    )
  } else {
    const win = options.window ?? (typeof window === 'undefined' ? undefined : window)
    const doc = options.document ?? (typeof document === 'undefined' ? undefined : document)
    if (win && doc) {
      const onVisibility = () => transition(doc.hidden ? 'background' : 'active')
      const onHide = () => transition('background')
      const onShow = () => transition('active')
      doc.addEventListener('visibilitychange', onVisibility)
      win.addEventListener('pagehide', onHide)
      win.addEventListener('pageshow', onShow)
      removers.push(() => {
        doc.removeEventListener('visibilitychange', onVisibility)
        win.removeEventListener('pagehide', onHide)
        win.removeEventListener('pageshow', onShow)
      })
    }
  }

  return {
    get state() {
      return state
    },
    pushBackHandler(handler) {
      handlers.push(handler)
      return () => {
        const index = handlers.lastIndexOf(handler)
        if (index >= 0) handlers.splice(index, 1)
      }
    },
    handleBack,
    async dispose() {
      disposed = true
      handlers.length = 0
      for (const remove of removers.splice(0)) remove()
      const settled = await Promise.allSettled(handles.splice(0))
      await Promise.allSettled(
        settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value.remove()] : [])),
      )
    },
  }
}
