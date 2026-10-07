# Changelog

## [0.1.2](https://github.com/jbcom/capacitor-device-profile/compare/v0.1.1...v0.1.2) (2026-10-07)


### Bug Fixes

* ship the TypeScript sources that the declaration maps point at ([35e596c](https://github.com/jbcom/capacitor-device-profile/commit/35e596c0879fbeb4b42e47cdccb9bd4ba0b68555))
* ship the TypeScript sources that the declaration maps point at ([d20ba08](https://github.com/jbcom/capacitor-device-profile/commit/d20ba08522d4573c1a86ef6c7ced769257312367))

## 0.1.1 (2026-10-07)

First release on npmjs, as `capacitor-device-profile`, MIT licensed, from `github.com/jbcom/capacitor-device-profile`.

### Features

* device profile (phone, foldable-open, tablet, desktop) that re-classifies live on fold and unfold
* orientation rule that never force-rotates, live safe-area insets, app lifecycle with a back-button stack, and a haptics facade
* dual ESM and CommonJS builds with format-correct declarations

### Build

* TypeScript 7 with `moduleResolution: bundler`, Node 26 and pnpm 12
