// @vitest-environment node
// The package's own repository is its only home: these assertions keep the manifest, the toolchain
// and the publish path pointing at it, so a copy-paste from a host repo cannot drift back in.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')
const read = (file: string) => readFileSync(path.join(root, file), 'utf8')
const manifest = JSON.parse(read('package.json')) as {
  repository: { type: string; url: string; directory?: string }
  packageManager: string
  engines: Record<string, string>
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}

describe('repository contract', () => {
  it('points at arcade-cabinet/mobile and builds on the fleet toolchain', () => {
    expect(manifest.repository).toEqual({
      type: 'git',
      url: 'https://github.com/jbcom/mobile.git',
    })
    expect(read('.node-version').trim()).toBe('26')
    expect(manifest.packageManager).toMatch(/^pnpm@12\.\d+\.\d+$/)
    expect(manifest.engines).toEqual({ node: '>=24' })
    expect(manifest.devDependencies['@types/node']).toMatch(/^\^?24\./)
  })

  it('verifies everything in CI, including the packed consumer', () => {
    expect(manifest.scripts.verify).toBe(
      'pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build && pnpm run smoke:consumer',
    )
    expect(read('.gitea/workflows/ci.yml')).toContain('run: pnpm verify')
  })

  it('publishes byte-identical packs with the package-only secret and proves them anonymously', () => {
    const release = read('.gitea/workflows/release.yml')
    expect(release).toContain('PACKAGE: "@arcade-cabinet/mobile"')
    // Without these labels release-please cannot find a merged release PR, so it never tags.
    expect(release).toContain("name: 'autorelease: pending'")
    expect(release).toContain("name: 'autorelease: tagged'")
    expect(release).toMatch(/git checkout --detach "refs\/tags\/[^"]+"[\s\S]+?pnpm verify/)
    expect(release).toMatch(/cmp "\$\{RUNNER_TEMP\}"\/a\/\*\.tgz "\$\{RUNNER_TEMP\}"\/b\/\*\.tgz/)
    expect(release).toContain('secrets.NPM_TOKEN')
    expect(release).toMatch(
      /MOBILE_CONSUMER_SOURCE="\$\{PACKAGE\}@\$\{\{ steps\.target\.outputs\.version \}\}" pnpm smoke:consumer/,
    )
  })
})
