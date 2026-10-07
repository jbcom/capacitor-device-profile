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

Options: `native`, `plugin` (Capacitor's `Haptics` plugin), `enabled` (default `true`). Methods:
`impact(strength?)` with `light`, `medium` or `heavy`; `notify(kind)` with `success`, `warning` or
`error`; `selection()`; `setEnabled(boolean)` and the `enabled` getter. Off the native platform, or
while disabled, every call does nothing. A rejected plugin call is swallowed.

## React bindings

### `useDeviceProfile(options?): DeviceProfile`

Returns the live profile and updates on every geometry event, so folding or unfolding re-classifies
without a reload. Options: `platform` (facts known synchronously) and `loadPlatform` (async lookup such
as `() => Device.getInfo()`; the profile re-classifies when it resolves).

### `useSafeAreaInsets(): SafeAreaInsets`

Live insets from `watchSafeArea`; also publishes the `--safe-*` variables on the root element.

### `subscribeViewportGeometry(callback): () => void`

Subscribes to `resize`, `orientationchange`, visual-viewport `resize` and the fold-posture media query.
Returns the unsubscribe function.

## Capacitor compatibility

`AppPluginLike`, `HapticsPluginLike` and `PluginListenerHandleLike` are the structural subsets of the
Capacitor 8 plugins this package uses. A type test keeps the real `@capacitor/app` and
`@capacitor/haptics` plugin types assignable to them.
