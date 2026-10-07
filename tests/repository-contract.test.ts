// @vitest-environment node
// The package's own repository is its only home: these assertions keep the manifest, the toolchain
// and the publish path pointing at it, so a copy-paste from another repository cannot drift back in.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')
const read = (file: string) => readFileSync(path.join(root, file), 'utf8')
const manifest = JSON.parse(read('package.json')) as {
  name: string
  version: string
  license: string
  repository: { type: string; url: string }
  packageManager: string
  engines: Record<string, string>
  scripts: Record<string, string>
  publishConfig: Record<string, unknown>
  devDependencies: Record<string, string>
}

describe('repository contract', () => {
  it('is the open-source package on npmjs, MIT, published with provenance', () => {
    expect(manifest.name).toBe('capacitor-device-profile')
    expect(manifest.license).toBe('MIT')
    expect(manifest.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/jbcom/capacitor-device-profile.git',
    })
    expect(manifest.publishConfig).toEqual({ access: 'public', provenance: true })
    expect(read('.npmrc').trim().split('\n')).toEqual([
      'registry=https://registry.npmjs.org/',
      'provenance=true',
    ])
  })

  it('builds on Node 26, pnpm 12 and TypeScript 7, and supports maintained Node 22, 24 and 26', () => {
    expect(read('.nvmrc').trim()).toBe('26')
    expect(read('mise.toml')).toMatch(/node = "26"[\s\S]*pnpm = "12"/)
    expect(manifest.packageManager).toMatch(/^pnpm@12\.\d+\.\d+$/)
    expect(manifest.devDependencies.typescript).toMatch(/^\^?7\./)
    expect(manifest.engines).toEqual({ node: '>=22' })
    expect(manifest.devDependencies['@types/node']).toMatch(/^\^?24\./)
    const ci = read('.github/workflows/ci.yml')
    expect([...ci.matchAll(/^\s+node: "([^"]+)"$/gm)].map((match) => match[1])).toEqual([
      '22',
      '24',
      '26',
    ])
  })

  it('resolves modules the TypeScript 7 way: no node10 anywhere', () => {
    // tsconfig.esm.json inherits the base resolution; the CommonJS build sets its own.
    for (const file of ['tsconfig.json', 'tsconfig.cjs.json']) {
      expect(read(file), file).toContain('"moduleResolution": "bundler"')
    }
    for (const file of ['tsconfig.json', 'tsconfig.esm.json', 'tsconfig.cjs.json']) {
      expect(read(file), file).not.toMatch(/node10|"moduleResolution": "node"/)
    }
  })

  it('always gates every CI job and accepts only success or skipped results', () => {
    const ci = read('.github/workflows/ci.yml')
    const jobs = [...ci.slice(ci.indexOf('\njobs:')).matchAll(/^ {2}([\w-]+):$/gm)].map(
      (match) => match[1],
    )
    const gate = ci.slice(ci.indexOf('\n  gate:'))
    const needs = (gate.match(/needs: \[([^\]]+)\]/)?.[1] ?? '').split(',').map((job) => job.trim())
    expect(needs).toEqual(jobs.filter((job) => job !== 'gate'))
    expect(gate).toContain('name: CI / gate')
    expect(gate).toMatch(/^ {4}if: always\(\)$/m)
    expect(gate).toContain(`NEEDS: \${{ toJSON(needs) }}`)
    expect(gate).toContain('jq -e \'all(.[]; .result == "success" or .result == "skipped")\'')
  })

  it('defaults the canonical ruleset script to this repository and aggregate checks', () => {
    // Inspect only: running this administrative script would mutate GitHub rulesets.
    const script = read('scripts/apply-branch-ruleset.mjs')
    expect(script).toContain("repo = 'capacitor-device-profile'")
    expect(script).toContain(
      "checksArg = 'CI / gate;title;Repository Policy / gate;Dependency Review / gate'",
    )
    for (const name of ['main-integrity', 'conventional-commits', 'release-tag-integrity']) {
      expect(script).toContain(`name: '${name}'`)
    }
    expect(script).toContain('No Copilot review or Code Quality rule: both spend AI credits')
    expect(script).toContain('includes_parents=false')
    expect(script).toContain('required_review_thread_resolution: true')
    expect(script).toContain("allowed_merge_methods: ['merge']")
    expect(script).not.toMatch(/type: '(?:copilot|code_quality)/)
  })

  it('verifies everything, including the packed package and a packed consumer', () => {
    const verify = manifest.scripts.verify ?? ''
    for (const step of [
      'lint',
      'lint:docs',
      'typecheck',
      'coverage',
      'build',
      'package:check',
      'smoke:consumer',
    ]) {
      expect(verify, step).toContain(`pnpm run ${step}`)
    }
    expect(manifest.scripts['package:check']).toBe(
      'publint && attw --pack . && node scripts/verify-package.mjs',
    )
    expect(read('.github/workflows/ci.yml')).toContain('run: pnpm verify')
  })

  it('publishes from cd.yml by OIDC after verifying, with no token in the repository', () => {
    const cd = read('.github/workflows/cd.yml')
    expect(cd).toContain('id-token: write')
    expect(cd).toMatch(/pnpm verify[\s\S]+npm publish --access public --provenance/)
    expect(cd).not.toMatch(/NODE_AUTH_TOKEN|NPM_TOKEN|_authToken/)
    expect(read('.github/workflows/release.yml')).toContain('release-please-action')
  })

  it('keeps the first release at the manifest version and the tag pattern plain', () => {
    expect(JSON.parse(read('.release-please-manifest.json'))).toEqual({ '.': manifest.version })
    const config = JSON.parse(read('release-please-config.json')) as {
      packages: Record<string, Record<string, unknown>>
    }
    expect(config.packages['.']).toMatchObject({
      'package-name': manifest.name,
      'include-component-in-tag': false,
      'bump-minor-pre-major': true,
    })
  })

  it('carries no trace of the private Gitea home', () => {
    expect(existsSync(path.join(root, '.gitea'))).toBe(false)
    expect(existsSync(path.join(root, 'scripts/ensure-release-labels.mjs'))).toBe(false)
  })
})
