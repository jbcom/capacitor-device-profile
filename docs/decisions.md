# Decisions

## 2026-10-07: open source under the owner's npm user, as `capacitor-device-profile`

**Decision.** The package is published to npmjs as `capacitor-device-profile`, from
`github.com/jbcom/capacitor-device-profile`, MIT licensed. The first npmjs version is 0.1.1.

**Why the name.** Packages publish unscoped, and the bare `mobile` is taken on npmjs by an unrelated
package, so a descriptive name was needed. `capacitor-device-profile` is free and names the package's
center: a device profile (phone, foldable-open, tablet, desktop, re-classified live on fold and
unfold) over Capacitor. Safe-area measurement, the orientation rule, lifecycle and haptics are the
supporting pieces a layout needs next to that profile. `capacitor-` also puts it next to the
Capacitor plugins in search. The API did not suggest a better free name.

**Why 0.1.1.** An earlier 0.1.0 was published to a private registry. The first public version must be
greater than anything already published, so no consumer resolving both registries can collide.

## Toolchain: Node 26, pnpm 12, TypeScript 7

Built on Node 26 and pnpm 12 with TypeScript 7 (native). TypeScript 7 removed
`moduleResolution: node10`, which the CommonJS build used. Every tsconfig now uses `bundler`; the CJS
build keeps `module: CommonJS` and emits its own `.d.cts` declarations, so a CommonJS consumer
resolves correct types (no "masquerading as ESM"). `engines.node` stays `>=24` with no ceiling and
`@types/node` stays on 24: a library must not reach for an API its oldest supported consumer lacks.
CI covers Node 24 and 26 on Linux; the package touches no paths or processes, so there is no Windows
job.

## Gates

`pnpm verify` runs Biome, markdownlint, `tsc`, Vitest with coverage, the dual build, `publint`,
`attw --pack`, a pack-content and ESM-versus-CommonJS equivalence check, and a packed-consumer smoke
that installs the tarball into an empty project against npmjs only. The first release is published
locally once with a token passed only through `--userconfig`; every later release publishes from
`cd.yml` by OIDC trusted publishing.

## The description does not advertise a `?probe=viewport` overlay

The package never shipped one; `safeArea.ts` measures through a hidden probe element.
