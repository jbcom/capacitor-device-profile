#!/usr/bin/env node
// Built-tarball consumer smoke (fleet package contract): pack the package, install the tarball into a
// clean scratch consumer, then load every entry point through both ESM import and CommonJS require
// and exercise one call per module. Proves the exports map, the .cjs rewrite and the files list.
// With MOBILE_CONSUMER_SOURCE=@arcade-cabinet/mobile@<version> it installs that published version
// from the registry instead, with no credential in reach (the release workflow's last step).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REGISTRY = 'https://registry.npmjs.org/'
const pkgRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const scratch = mkdtempSync(path.join(tmpdir(), 'arcade-mobile-smoke-'))
const registrySource = process.env.MOBILE_CONSUMER_SOURCE

try {
  if (
    registrySource &&
    !/^@arcade-cabinet\/mobile@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(registrySource)
  ) {
    throw new Error('MOBILE_CONSUMER_SOURCE must be an exact @arcade-cabinet/mobile@<version> spec')
  }
  let source = registrySource
  if (!source) {
    execFileSync('npm', ['pack', '--pack-destination', scratch], { cwd: pkgRoot, stdio: 'inherit' })
    const tarball = readdirSync(scratch).find((file) => file.endsWith('.tgz'))
    if (!tarball) throw new Error('npm pack produced no tarball')
    source = path.join(scratch, tarball)
  }

  const consumer = path.join(scratch, 'consumer')
  execFileSync('mkdir', ['-p', consumer])
  writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify({ name: 'mobile-smoke-consumer', private: true, type: 'module' }),
  )
  // An anonymous user config: the public registry plus the fleet scope, and nothing else.
  const userConfig = path.join(scratch, 'anonymous.npmrc')
  writeFileSync(
    userConfig,
    `registry=https://registry.npmjs.org/\n@arcade-cabinet:registry=${REGISTRY}\n`,
  )
  execFileSync(
    'npm',
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--ignore-scripts',
      '--userconfig',
      userConfig,
      source,
      'react@19',
    ],
    { cwd: consumer, stdio: 'inherit' },
  )

  const esm = `
    import { classifyDevice, decideOrientation, createHaptics, createAppLifecycle } from '@arcade-cabinet/mobile'
    import { useDeviceProfile, useSafeAreaInsets, subscribeViewportGeometry } from '@arcade-cabinet/mobile/react'
    const profile = classifyDevice({ width: 821, height: 765, devicePixelRatio: 2.7625, touch: true, platform: 'web', model: '' })
    if (profile.formFactor !== 'foldable-open') throw new Error('ESM classify: ' + profile.formFactor)
    if (decideOrientation(profile, 'landscape').promptRotate) throw new Error('ESM orientation')
    createHaptics({ native: false }).impact()
    await createAppLifecycle({ native: false }).dispose()
    for (const fn of [useDeviceProfile, useSafeAreaInsets, subscribeViewportGeometry]) {
      if (typeof fn !== 'function') throw new Error('ESM react export missing')
    }
    console.log('esm ok')
  `
  const cjs = `
    const { classifyDevice } = require('@arcade-cabinet/mobile')
    const { useDeviceProfile } = require('@arcade-cabinet/mobile/react')
    const profile = classifyDevice({ width: 404, height: 797, devicePixelRatio: 2.7625, touch: true, platform: 'web', model: '' })
    if (profile.formFactor !== 'phone') throw new Error('CJS classify: ' + profile.formFactor)
    if (typeof useDeviceProfile !== 'function') throw new Error('CJS react export missing')
    console.log('cjs ok')
  `
  writeFileSync(path.join(consumer, 'esm.mjs'), esm)
  writeFileSync(path.join(consumer, 'cjs.cjs'), cjs)
  execFileSync(process.execPath, ['esm.mjs'], { cwd: consumer, stdio: 'inherit' })
  execFileSync(process.execPath, ['cjs.cjs'], { cwd: consumer, stdio: 'inherit' })
  console.info(
    `@arcade-cabinet/mobile: consumer smoke passed (ESM + CJS) from ${registrySource ?? 'the packed tarball'}`,
  )
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
