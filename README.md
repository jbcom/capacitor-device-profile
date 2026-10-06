# @arcade-cabinet/mobile

Thin fleet glue between a game and the Capacitor plugins it runs on: one device classification, one
orientation rule, live safe-area insets, an app lifecycle with a back-button stack, and a haptics
facade. It has no runtime dependencies. Capacitor plugins are passed in, so the package carries no
Capacitor version, and every module unit-tests without a device.

Provenance: the device profile comes from grave-shift (`src/platform/deviceProfile.ts`), the
orientation rule from hawthorne-house (`src/stage/orientation.ts`), and the lifecycle from
infinite-headaches (`src/platform/app-lifecycle.ts`). The `foldable-open` class and its thresholds
were measured on a OnePlus Open for curse-of-the-mummy, which incubates the package in
`packages/mobile`.

## API

| Export | What it does |
| --- | --- |
| `classifyDevice(facts)` | `phone`, `foldable-open`, `tablet` or `desktop`, plus a `compact`/`expanded` frame, orientation, short/long edge, aspect and DPR |
| `isFoldableOpen(facts)` | Touch, aspect at most 1.3 and short edge at least 600 CSS px (OnePlus Open unfolded: 821x765, aspect 1.07) |
| `readViewportFacts(window, platform?)` | Reads `innerWidth`/`innerHeight`/DPR/touch; `null` gives a desktop default |
| `decideOrientation(profile, preferred)` | Which orientations to accept and whether to show a "turn the device" hint. Never force-rotates; tablets and foldables accept both |
| `watchSafeArea(options)` / `readSafeAreaInsets()` | Measures `env(safe-area-inset-*)` through a probe and publishes `--safe-top/right/bottom/left` px variables, re-measured on resize, orientation change, visual-viewport resize and fold posture change |
| `createAppLifecycle({ app, native, onPause, onResume })` | Pause/resume from Capacitor `App` (native) or page visibility (web); `pushBackHandler` stack; an unconsumed back press minimises instead of exiting |
| `createHaptics({ plugin, native })` | `impact`, `notify`, `selection`; no-ops on the web and while disabled; plugin failures never throw |
| `@arcade-cabinet/mobile/react`: `useDeviceProfile`, `useSafeAreaInsets`, `subscribeViewportGeometry` | Live bindings: a fold or unfold re-classifies without a reload |

```ts
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { Haptics } from '@capacitor/haptics'
import { createAppLifecycle, createHaptics } from '@arcade-cabinet/mobile'
import { useDeviceProfile } from '@arcade-cabinet/mobile/react'

const native = Capacitor.isNativePlatform()
const lifecycle = createAppLifecycle({ app: App, native, onPause: pauseGame })
const haptics = createHaptics({ plugin: Haptics, native })
const profile = useDeviceProfile({ loadPlatform: () => Device.getInfo() })
```

## Develop and release

`pnpm --filter @arcade-cabinet/mobile verify` runs typecheck, tests (jsdom), the dual ESM/CJS build
and a built-tarball consumer smoke. Publishing runs in the `mobile-package` job of the host repository's `release.yml`
against the immutable `mobile-v<version>` tag release-please creates, then verifies the
exact version anonymously from the registry.
