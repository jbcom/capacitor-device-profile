# Changelog

## [0.4.0](https://github.com/jbcom/capacitor-device-profile/compare/v0.3.2...v0.4.0) (2026-11-24)


### Features

* **gesture-insets:** report system gesture insets alongside the safe area ([55dc67f](https://github.com/jbcom/capacitor-device-profile/commit/55dc67f4acc0f13648a07a3e21a389bf928fba4a))
* **gesture-insets:** report system gesture insets alongside the safe area ([4a42ce0](https://github.com/jbcom/capacitor-device-profile/commit/4a42ce0cdf6cea43bbc5c05b5b018b4a1bd4b1e4))


### Bug Fixes

* **gesture-insets:** keep an answer older than the newest read but newer than the last applied ([d96005a](https://github.com/jbcom/capacitor-device-profile/commit/d96005a1101c650e9bd2d5cdaf5790558bf43e1b))

## [0.3.2](https://github.com/jbcom/capacitor-device-profile/compare/v0.3.1...v0.3.2) (2026-11-24)


### Bug Fixes

* **deps:** override vulnerable transitive docs-toolchain packages ([700aa73](https://github.com/jbcom/capacitor-device-profile/commit/700aa737d1f9dd1f4bcb13cf7e1732678712a5ac))
* **deps:** override vulnerable transitive docs-toolchain packages ([ef292c3](https://github.com/jbcom/capacitor-device-profile/commit/ef292c31ff62ebc46b13af94bd8b160ea17bf9f5))

## [0.3.1](https://github.com/jbcom/capacitor-device-profile/compare/v0.3.0...v0.3.1) (2026-11-24)


### Bug Fixes

* **lint:** adopt biome 2.6 and hoist components; declare sourcey link types ([1178e78](https://github.com/jbcom/capacitor-device-profile/commit/1178e78923d71f019e52e72d1a9d78fe3b8a4fac))

## [0.3.0](https://github.com/jbcom/capacitor-device-profile/compare/v0.2.0...v0.3.0) (2026-11-24)


### Features

* **haptics:** fall back to navigator.vibrate on the web ([5ff04f1](https://github.com/jbcom/capacitor-device-profile/commit/5ff04f1540272939f66969ce9dd1554e138ef3d6))
* **haptics:** fall back to navigator.vibrate on the web ([3153dc9](https://github.com/jbcom/capacitor-device-profile/commit/3153dc9f75602c801b41bd6c0e2a150ec8858462)), closes [#28](https://github.com/jbcom/capacitor-device-profile/issues/28)

## [0.2.0](https://github.com/jbcom/capacitor-device-profile/compare/v0.1.4...v0.2.0) (2026-10-10)


### Features

* **lifecycle:** subscribe to pause and resume, many listeners each with its own unsubscribe ([a1371f5](https://github.com/jbcom/capacitor-device-profile/commit/a1371f5807bbd49bce3c49a84d2d80edae4a8ae3))
* **lifecycle:** subscribe to pause and resume, many listeners each with its own unsubscribe ([8fe78a9](https://github.com/jbcom/capacitor-device-profile/commit/8fe78a9e24e638358a96faa7f51edd38b3932fb1))

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
