# capacitor-device-profile

[![CI](https://github.com/jbcom/capacitor-device-profile/actions/workflows/ci.yml/badge.svg)](https://github.com/jbcom/capacitor-device-profile/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-17324d.svg)](./LICENSE)

A small mobile and foldable runtime for web apps and games that ship in a Capacitor shell: one device
classification that re-classifies live when a foldable folds or unfolds, one orientation rule, live
safe-area insets, an app lifecycle with a back-button stack, and a haptics facade.

It has no runtime dependencies. Capacitor plugins are passed in, so the package carries no Capacitor
version, and every module unit-tests without a device.

Full documentation: **[jonbogaty.com/capacitor-device-profile](https://jonbogaty.com/capacitor-device-profile/)**

## Install

```sh
pnpm add capacitor-device-profile
```

## Compatibility

- Node.js 22, 24 and 26 for tooling (`engines.node: >=22`; CI tests each maintained line)
- React 18 or 19 only if you use the optional `capacitor-device-profile/react` bindings
- The Capacitor plugins you want to drive (`@capacitor/app`, `@capacitor/haptics`,
  `@capacitor/device`) are installed by the application and passed in

The package ships native ESM and CommonJS entry points with format-correct TypeScript declarations.
Support follows maintained Node.js lines, rather than every historical patch or end-of-life release.

## Quick start

```ts
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { Haptics } from '@capacitor/haptics'
import { createAppLifecycle, createHaptics, decideOrientation } from 'capacitor-device-profile'
import { useDeviceProfile, useSafeAreaInsets } from 'capacitor-device-profile/react'

const native = Capacitor.isNativePlatform()
const lifecycle = createAppLifecycle({ app: App, native, onPause: pauseTimers })
const haptics = createHaptics({ plugin: Haptics, native })

// An open modal closes first on the Android back button; an unhandled press minimises the app.
const closeModal = lifecycle.pushBackHandler(() => dialog.close())

// Any part of the app can hear pause and resume for itself, and stop when it unmounts.
const stopSaving = lifecycle.onPause(() => void saveCheckpoint())

function Screen() {
  const profile = useDeviceProfile({ loadPlatform: () => Device.getInfo() })
  const insets = useSafeAreaInsets()
  const { promptRotate, target } = decideOrientation(profile, 'landscape')
  return promptRotate ? <RotateHint to={target} /> : <Layout form={profile.formFactor} inset={insets} />
}
```

## API

| Export | What it does |
| --- | --- |
| `classifyDevice(facts)` | `phone`, `foldable-open`, `tablet` or `desktop`, plus a `compact`/`expanded` frame, orientation, short/long edge, aspect and DPR |
| `isFoldableOpen(facts)` | Touch, aspect at most 1.3 and short edge at least 600 CSS px (OnePlus Open unfolded: 821x765, aspect 1.07) |
| `readViewportFacts(window, platform?)` | Reads `innerWidth`/`innerHeight`/DPR/touch; `null` gives a desktop default |
| `decideOrientation(profile, preferred)` | Which orientations to accept and whether to show a "turn the device" hint. Never force-rotates; tablets and foldables accept both |
| `watchSafeArea(options)` / `readSafeAreaInsets()` | Measures `env(safe-area-inset-*)` through a probe and publishes `--safe-top/right/bottom/left` px variables, re-measured on resize, orientation change, visual-viewport resize and fold posture change |
| `createAppLifecycle({ app, native, onPause, onResume })` | Pause/resume from Capacitor `App` (native) or page visibility (web); `onPause(listener)` / `onResume(listener)` subscriptions, each returning its unsubscribe; `pushBackHandler` stack; an unconsumed back press minimises instead of exiting |
| `createHaptics({ plugin, native })` | `impact`, `notify`, `selection`; no-ops on the web and while disabled; plugin failures never throw |
| `capacitor-device-profile/react`: `useDeviceProfile`, `useSafeAreaInsets`, `subscribeViewportGeometry` | Live bindings: a fold or unfold re-classifies without a reload |

The [API reference](./docs/API.md) has every signature and the exact classification rules.

## Develop

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify   # Biome, markdownlint, tsc, Vitest with coverage, the dual ESM/CJS build, publint, attw, a packed-consumer smoke
```

Built on Node 26 (`.nvmrc`), pnpm 12 and TypeScript 7. Conventional Commits drive release-please;
merging its release pull request tags `v<version>` and the `cd.yml` publish job releases to npm with
provenance. See [CONTRIBUTING.md](./CONTRIBUTING.md) and [AGENTS.md](./AGENTS.md).

## License

[MIT](./LICENSE)
