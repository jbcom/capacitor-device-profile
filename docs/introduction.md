---
title: "capacitor-device-profile"
description: Device profile, orientation, safe area, app lifecycle and haptics for Capacitor apps, with live fold and unfold handling.
---

`capacitor-device-profile` is a small runtime for web apps and games that ship inside a Capacitor shell. It
answers the questions a layout actually branches on: what kind of device is this, which way should it
be held, how much room does the notch and the gesture bar take, did the app just go to the
background, and did the player press Back.

It has no runtime dependencies. Capacitor plugins are passed in, so the package carries no Capacitor
version and every module is unit-testable without a device.

## Why use it?

| Problem | Convention |
| --- | --- |
| An unfolded foldable gets a stretched phone layout or a squashed tablet layout | A `foldable-open` form factor that re-classifies live on fold and unfold |
| Rotating a phone is demanded or forced | A hint-only orientation decision; tablets and foldables are never nagged |
| `env(safe-area-inset-*)` is stale after a fold or a cut-out change | Probe-measured insets republished as `--safe-*` variables on every geometry change |
| A stray Android Back press exits the app | A back-handler stack; an unconsumed press minimises |
| A missing buzz throws into the frame loop | A haptics facade that no-ops off native and swallows plugin failures |

Start with [Getting started](./getting-started/), then use the [API reference](./API/) for signatures
and the [architecture notes](./ARCHITECTURE/) for the invariants behind them.
