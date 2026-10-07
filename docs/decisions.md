# Decisions

## 2026-10-07: moved out of curse-of-the-mummy into its own repository

**Decision.** `@arcade-cabinet/mobile` left `curse-of-the-mummy/packages/mobile` for
`arcade-cabinet/mobile`, with its history (`git filter-repo --subdirectory-filter`).
curse-of-the-mummy now installs it from the registry like any other consumer.

**Why.** The owner: "You shouldn't need other games as dependencies for shared packages",
and "that should be moved OUT of the game repo and into the arcade-cabinet like yuka-kit
and others". Inside the game it could only be released through the game's lockfile and
its two-component release-please, and it had never been published.

## The repository shape is the fleet package shape

Same as `arcade-cabinet/persistence-save` and `lifecycle-kit`: `ci.yml` runs `pnpm verify`
on every push and pull request; `release.yml` runs release-please and a publish job that
reconciles the manifest version against tags and the registry, packs twice for byte
identity and proves the published version anonymously. That reconcile job is the one this
package already had in curse-of-the-mummy (`mobile-package`), now owned here. Tags are
plain `v<version>`; the `mobile-v` component prefix only existed to share a tag namespace
with the game.

Biome uses the style the source was written in (single quotes, no semicolons, trailing
commas), so the move did not reformat it. `prepack` builds, so a bare `npm pack` can never
ship a stale or missing `dist`.

## Toolchain: Node 26 and pnpm 12 to build, Node 24 as the floor to run

Built where the fleet is moving (curse-of-the-mummy's toolchain lane). `engines` stays
`>=24` with no ceiling and `@types/node` stays on 24: a library must not reach for an API
its oldest supported consumer lacks.

## First release is 0.1.0

0.1.0 was never published from the game. The manifest starts at 0.0.0 with
`bootstrap-sha` on the last imported commit. release-please reads 0.0.0 as "never released"
and falls back to its default initial version, 1.0.0 (it proposed exactly that), so the
config sets `initial-version: 0.1.0`: a pre-1.0 package keeps a pre-1.0 first release.

## The description no longer advertises a `?probe=viewport` overlay

The package never shipped one; `safeArea.ts`'s probe is a hidden measuring element.
curse-of-the-mummy's `/probe` route is the game's own.
