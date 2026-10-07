---
title: Getting started
description: Install capacitor-device-profile and wire it to Capacitor.
---

## Install

```sh
pnpm add capacitor-device-profile
pnpm add @capacitor/app @capacitor/device @capacitor/haptics @capacitor/core
```

Use maintained Node.js 22, 24 or 26 for tooling. React 18 or 19 is an optional peer dependency, needed only for
`capacitor-device-profile/react`. The package ships native ESM and CommonJS entry points with
format-correct TypeScript declarations.

## Classify the device

```ts
import { classifyDevice, readViewportFacts } from 'capacitor-device-profile'

const profile = classifyDevice(readViewportFacts(window))
// { formFactor: 'phone' | 'foldable-open' | 'tablet' | 'desktop', frame, orientation, ... }
```

In React, `useDeviceProfile` keeps the profile live, so a fold or unfold re-classifies without a reload:

```tsx
import { Device } from '@capacitor/device'
import { useDeviceProfile } from 'capacitor-device-profile/react'

function App() {
  const profile = useDeviceProfile({ loadPlatform: () => Device.getInfo() })
  return <Layout form={profile.formFactor} />
}
```

## Respect the orientation rule

```ts
import { decideOrientation } from 'capacitor-device-profile'

const { promptRotate, target } = decideOrientation(profile, 'landscape')
if (promptRotate) showRotateHint(target)
```

## Track the safe area

```ts
import { watchSafeArea } from 'capacitor-device-profile'

const stop = watchSafeArea({ onChange: (insets) => layoutToolbar(insets) })
// CSS: padding-top: var(--safe-top);
```

## Lifecycle and haptics

```ts
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Haptics } from '@capacitor/haptics'
import { createAppLifecycle, createHaptics } from 'capacitor-device-profile'

const native = Capacitor.isNativePlatform()
const lifecycle = createAppLifecycle({ app: App, native, onPause: saveDraft, onResume: refresh })
const haptics = createHaptics({ plugin: Haptics, native })

const removeBackHandler = lifecycle.pushBackHandler(() => {
  if (!menu.isOpen) return false
  menu.close()
  return true
})

haptics.impact('medium')
```

Call `lifecycle.dispose()` and the safe-area disposer when the app tears down.
