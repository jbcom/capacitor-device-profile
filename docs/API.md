---
title: API reference
description: Every export of capacitor-device-profile with signatures and the exact classification rules.
---

All exports come from `capacitor-device-profile` unless stated; the React bindings come from
`capacitor-device-profile/react`.

## Device profile

### `classifyDevice(facts: ViewportFacts): DeviceProfile`

Pure classification. `ViewportFacts` is `{ width, height, devicePixelRatio, touch, platform, model }`
with sizes in CSS pixels and `platform` one of `web`, `android`, `ios`, `electron`. The result:

| Field | Meaning |
| --- | --- |
| `formFactor` | `phone`, `foldable-open`, `tablet` or `desktop` |
| `frame` | `compact` (a phone-sized layout) or `expanded` (room for side panels) |
| `orientation` | `portrait` when height exceeds width, otherwise `landscape` |
| `shortEdge`, `longEdge`, `aspect` | Edges in CSS px; `aspect` is long over short (`1` when square or empty) |
| `native` | True on `android` and `ios` |
| `touch` | `facts.touch`, or true on any native platform |
| `platform`, `devicePixelRatio` | Passed through |

### Rules

Applied in this order by `classifyFormFactor`:

1. iOS with an iPad model string is a `tablet`.
2. `isFoldableOpen(facts)` is `foldable-open`.
3. A non-touch web page, or any `electron` shell, is a `desktop`.
4. Otherwise a short edge of at least `TABLET_MIN_SHORT_EDGE` (600) is a `tablet`, else a `phone`.

`isFoldableOpen` requires touch, a long/short aspect of at most `NEAR_SQUARE_MAX_ASPECT` (1.3) and a
short edge of at least 600. An unfolded OnePlus Open is 821 by 765 CSS px (aspect 1.07). A phone in
portrait is about 2.1; a 4:3 tablet is 1.33.

`classifyFrame` is `expanded` from a short edge of `EXPANDED_MIN_SHORT_EDGE` (700), except on iOS where
only an iPad is expanded.

### `readViewportFacts(win?, platform?)`

Reads `innerWidth`, `innerHeight`, `devicePixelRatio` and touch support from a window. `platform`
defaults to `{ platform: 'web', model: '' }`; a native shell supplies the real values (for example
from `Device.getInfo()`). Passing `null`, or running without a `window`, returns a 1280 by 720
non-touch desktop default.

## Orientation

### `decideOrientation(profile, preferred): OrientationDecision`

`preferred` is `portrait`, `landscape` or `any`. Returns `{ allowed, promptRotate, target }`. Tablets,
desktops, unfolded foldables, non-touch devices and `any` accept both orientations and never prompt.
A phone that is not in the preferred orientation gets `promptRotate: true` and the orientation to
ask for in `target`. The decision drives a hint only: the package never locks or forces rotation.

## Safe area

### `readSafeAreaInsets(doc?): SafeAreaInsets`

Measures `env(safe-area-inset-*)` through a hidden, fixed-position probe element and returns
`{ top, right, bottom, left }` in px. Returns `ZERO_INSETS` values without a document body.

### `applySafeAreaVariables(insets, target, prefix?)`

Writes `--safe-top`, `--safe-right`, `--safe-bottom` and `--safe-left` (px) on `target`. The default
prefix is `--safe-`.

### `watchSafeArea(options?): () => void`

Measures now and again, on the next animation frame, after every `resize`, `orientationchange`,
visual-viewport `resize` and fold-posture media-query change. Options: `target` (default
`document.documentElement`), `prefix`, `onChange(insets)`. Returns a disposer that removes every
listener; outside a browser it returns a no-op.

## System gesture insets

The strips along the screen edges where the operating system owns a swipe: Android's home and
quick-switch gesture (bottom, cannot be opted out of) and its back gesture (an inward swipe from
either side), and iOS's home indicator. A touch that goes down inside one starts a system gesture
instead of reaching the page, so a game starts its touch zones inside them. All values are CSS
pixels. There is no `top`: the top edge is the status bar, not a swipe.

No web API reports them, and `env(safe-area-inset-*)` does not include them. On Android they exist
only natively (`WindowInsets.Type.systemGestures()`), so the app passes in a small plugin of its own
(see [Getting started](./getting-started/)) and this package converts its answer. Without one, the
answer is a fallback, and `source` says which kind of answer it is:

| `source` | Where | Values |
| --- | --- | --- |
| `native` | The plugin answered | Reported by the platform, converted to CSS px. Three-button navigation reports 0 sides here; that is a real answer, not a missing one |
| `safe-area` | iOS with no usable plugin answer | `bottom` is the bottom safe-area inset (the home indicator's swipe-up strip); `left` and `right` are 0 |
| `none` | Web, desktop, Android without a plugin, or a plugin that cannot answer | All 0. Nothing was reported: apply your own guard |

Because `none` and a real zero look alike in the numbers, branch on `source`: a layout that wants a
side guard where nothing reports one applies it when `source !== 'native'`.

### `GestureInsetsReading`

`{ source, insets, mandatory }`. `insets` is every system gesture strip, including the back swipe an
app may ask the system to leave to it. `mandatory` is the strips an app cannot opt out of (a subset of
`insets`); when the plugin does not report them separately it equals `insets`, the safe over-estimate.
Each is `{ left, right, bottom }`. A game that excludes the side edges starts its zones inside
`mandatory` only; one that does not starts them inside `insets`.

### `GestureInsetsPluginLike`

`{ getGestureInsets(): Promise<NativeGestureInsets> }`, where `NativeGestureInsets` is
`{ left, right, bottom, mandatory?, density? }` in **physical** pixels, as Android's `Insets` holds
them, with `density` the display density (`DisplayMetrics.density`). The plugin rejects when the
platform cannot answer (before Android 11, or before the WebView has a window); that is treated as
`none`. The insets are the window's, so they match the WebView's edges only when the app draws edge
to edge (an app targeting Android 15 or later does by default).

### `gestureInsetsFromNative(native, fallbackDensity?): GestureInsetsReading | null`

The conversion, pure: `css = physical / density`, with a negative value clamped to 0. The density is
`native.density`, else `fallbackDensity` (default 1). Returns `null`, so a caller falls back, when the
density is not a positive finite number or any value is not finite.

### `fallbackGestureInsets(platform, safeArea): GestureInsetsReading`

The fallback, pure: `ios` gives the `safe-area` row above from `safeArea.bottom`; every other platform
gives the `none` row.

### `readGestureInsets(options?): Promise<GestureInsetsReading>`

Reads once. Options: `plugin`, `platform` (default `web`) and `document`. With a plugin, the answer is
converted using the plugin's density, else the window's `devicePixelRatio`. Never rejects: a missing,
rejecting, throwing or malformed plugin gives the fallback for `platform`.

### `watchGestureInsets(options?): () => void`

Reads now and again, on the next animation frame, after every `resize`, `orientationchange`,
visual-viewport `resize` and fold-posture change (the events `watchSafeArea` uses), then publishes
`--gesture-left`, `--gesture-right` and `--gesture-bottom` (px, from `insets`) and calls
`onChange(reading)`. Options: those of `readGestureInsets`, plus `target` (default
`document.documentElement`), `prefix` (default `--gesture-`) and `onChange`. The first reading arrives
when the first read resolves (the next microtask without a plugin). A reading that resolves after a
newer one was applied, or after dispose, is dropped. Returns a disposer that removes every listener; outside a browser it returns a no-op.

### `applyGestureInsetVariables(insets, target, prefix?)`

Writes the three variables (px) on `target`. `ZERO_GESTURE_INSETS` is the all-zero value.

## App lifecycle

### `createAppLifecycle(options): AppLifecycle`

Options: `native`, `app` (Capacitor's `App` plugin), `onPause`, `onResume`, and `window` / `document`
overrides for the web path.

- Native: pause and resume follow `appStateChange`; the Android `backButton` runs the back stack.
- Web: pause and resume follow `visibilitychange`, `pagehide` and `pageshow`.

The returned object has `state` (`active` or `background`), `pushBackHandler(handler)` (returns a
remover), `handleBack()` and `dispose()`. Handlers run newest first; a handler returns `true` to
consume the press. An unconsumed native back press calls `app.minimizeApp()` instead of exiting.
`dispose()` removes every listener, including the native listener handles, and stops further
callbacks.

## Haptics

### `createHaptics(options): Haptics`

Options: `native`, `plugin` (Capacitor's `Haptics` plugin), `enabled` (default `true`), `vibrate`
(a `VibrateFunction`, `(pattern: number | number[]) => boolean`; default `navigator.vibrate`). Methods:
`impact(strength?)` with `light`, `medium` or `heavy`; `notify(kind)` with `success`, `warning` or
`error`; `selection()`; `setEnabled(boolean)` and the `enabled` getter. While disabled, every call does
nothing. A rejected plugin call is swallowed.

The native plugin wins: when `native` is true and a `plugin` is passed, only the plugin is called and
`vibrate` is never used. Otherwise (`native` is false, or no plugin was passed) the web fallback runs
over `vibrate`. When `vibrate` is not passed it is `navigator.vibrate`, looked up at each call and
called as a method of `navigator`, and where the browser has none every call does nothing.

| Call | Vibration (ms) |
| --- | --- |
| `impact('light')` (the default) | `12` |
| `impact('medium')` | `24` |
| `impact('heavy')` | `40` |
| `notify('success')` | `[20, 40, 40]` |
| `notify('warning')` | `[30, 60, 30]` |
| `notify('error')` | `[50, 40, 50, 40, 50]` |
| `selection()` | `8` |

Array patterns alternate vibrate and pause, starting with a vibration. The fallback never throws: a
`false` return (the browser declined, usually because the page has had no user gesture yet or the
user turned vibration off) and a thrown error (blocked by policy or an embedded frame) are both
ignored.

The Vibration API is not Baseline: it exists only where the browser implements it (for example
Chromium on Android), and it needs sticky user activation, so a call made before the player has
touched the page is declined. iOS Safari has no `navigator.vibrate`, so on an iPhone or iPad web page
the fallback is a quiet no-op; haptics there need the native plugin in a Capacitor shell. A device
without a vibration motor ignores the call. Pass `vibrate` to supply your own function instead, for
example a test spy or a wrapper that applies your own rules.

## React bindings

### `useDeviceProfile(options?): DeviceProfile`

Returns the live profile and updates on every geometry event, so folding or unfolding re-classifies
without a reload. Options: `platform` (facts known synchronously) and `loadPlatform` (async lookup such
as `() => Device.getInfo()`; the profile re-classifies when it resolves).

### `useSafeAreaInsets(): SafeAreaInsets`

Live insets from `watchSafeArea`; also publishes the `--safe-*` variables on the root element.

### `useGestureInsets(options?): GestureInsetsReading`

Live gesture insets from `watchGestureInsets`; also publishes the `--gesture-*` variables on the root
element. Options: `plugin` and `platform`. The first render holds the fallback for `platform`, and a
native reading replaces it when the plugin answers. Keep `plugin` referentially stable (module scope
or `useMemo`): a new one restarts the watch.

### `subscribeViewportGeometry(callback): () => void`

Subscribes to `resize`, `orientationchange`, visual-viewport `resize` and the fold-posture media query.
Returns the unsubscribe function.

## Capacitor compatibility

`AppPluginLike`, `HapticsPluginLike` and `PluginListenerHandleLike` are the structural subsets of the
Capacitor 8 plugins this package uses. A type test keeps the real `@capacitor/app` and
`@capacitor/haptics` plugin types assignable to them. `GestureInsetsPluginLike` describes a plugin the
app writes itself; no published Capacitor plugin reports system gesture insets.
