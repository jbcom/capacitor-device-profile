# Changelog

## [0.1.4](https://github.com/jbcom/capacitor-device-profile/compare/v0.1.3...v0.1.4) (2026-10-08)


### Bug Fixes

* **release:** recover publication after fixture repair ([cd88516](https://github.com/jbcom/capacitor-device-profile/commit/cd88516a128d265c593af1c623d6e2051cde1190))
* **release:** recover publication after fixture repair ([ae82c04](https://github.com/jbcom/capacitor-device-profile/commit/ae82c04c4792f1fac617f86d4233dad26e7f1ff9))

## [0.1.3](https://github.com/jbcom/capacitor-device-profile/compare/v0.1.2...v0.1.3) (2026-10-07)


### Bug Fixes

* support every maintained Node line (22, 24 and 26) ([661acb9](https://github.com/jbcom/capacitor-device-profile/commit/661acb929e91958327b0106910a22fa452002781))
* support maintained Node lines and align house CI policy ([2656d44](https://github.com/jbcom/capacitor-device-profile/commit/2656d445ac3cb432a76d4854305207ea2851dcad))

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
