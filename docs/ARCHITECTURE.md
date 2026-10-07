---
title: Architecture
description: Module boundaries, invariants and intentional limits of capacitor-device-profile.
---

## Modules

| Module | Responsibility |
| --- | --- |
| `profile` | Pure viewport classification. No DOM access except in `readViewportFacts`. |
| `orientation` | Pure policy over a profile. Never touches the screen. |
| `safeArea` | Measures insets and publishes CSS variables. The only module that creates DOM nodes. |
| `lifecycle` | Pause/resume and the back-button stack over an injected `App` plugin or page events. |
| `haptics` | A guarded facade over an injected `Haptics` plugin. |
| `react` | Thin hooks over the modules above. The only module that imports React. |

## Invariants

1. **No runtime dependencies, no Capacitor import.** Plugins are passed in and described by `*Like`
   structural interfaces, so the package pins no Capacitor version and every module unit-tests with a
   fake. A type test keeps the real plugin types assignable.
2. **Classification is a pure function of facts.** Everything environmental (window, platform,
   model) is read once into `ViewportFacts` and injected, so a thresholds change is a unit test.
3. **Never force-rotate.** `decideOrientation` produces a hint. Tablets and unfolded foldables are
   never nagged.
4. **A foldable is its own class.** An unfolded book-style foldable is touch-primary, tablet-sized and
   near-square, so it gets `foldable-open` instead of being stretched from a phone or squashed from a
   tablet. The thresholds come from a measured device and move only with a measurement.
5. **Geometry changes re-classify live.** Fold posture, resize, orientation change and visual-viewport
   resize all feed the same subscription, so no reload is needed after a fold.
6. **Failures never reach a frame loop.** A rejected haptics or `minimizeApp` call is swallowed.
7. **Everything disposes.** Each subscription returns a disposer, and `dispose()` on the lifecycle also
   removes the native listener handles.

## Dual build

`tsc` emits ESM with declarations, and CommonJS with its own declarations, from two tsconfigs, both
with `moduleResolution: bundler`. `scripts/build.mjs` renames the CommonJS output to `.cjs` and
`.d.cts`, rewrites relative specifiers to match, and writes a `{ "type": "commonjs" }` manifest into
`dist/cjs`, so Node and TypeScript each see the correct module format. `publint` and
`@arethetypeswrong/cli` gate the result, and `scripts/verify-package.mjs` plus `scripts/consumer-smoke.mjs`
install the packed tarball into an empty project against npmjs only.

## Intentional limits

- No orientation locking and no screen-wake or status-bar control.
- No Capacitor plugin wrappers beyond the structural subsets above.
- Thresholds are CSS-pixel based; they do not read the Window Segments API geometry beyond using its
  media query as a change signal.
