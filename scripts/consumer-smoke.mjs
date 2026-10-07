#!/usr/bin/env node
// Built-tarball consumer smoke: pack the package, install the tarball into a clean scratch
// consumer against npmjs only (no scoped registry, no token), then load every entry point through
// both ESM import and CommonJS require and exercise one call per module. Proves the exports map,
// the .cjs rewrite and the files list.
// With DEVICE_PROFILE_CONSUMER_SOURCE=capacitor-device-profile@<version> it installs that published version
// from npmjs instead: the cold-install proof after a release.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const scratch = mkdtempSync(path.join(tmpdir(), 'capacitor-device-profile-smoke-'))
const registrySource = process.env.DEVICE_PROFILE_CONSUMER_SOURCE

// Anonymous: no inherited npm_config_* (pnpm run exports them into scripts) and no
// credential-looking variables, so no token on the machine can authenticate any npm call here.
const anonymousEnv = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !/^npm_config_/i.test(key) && !/auth|token|secret|password|credential/i.test(key),
    ),
  ),
  // `npm pack` runs the package's own `prepare` (the git-hook installer); hooks are irrelevant here.
  SKIP_INSTALL_SIMPLE_GIT_HOOKS: '1',
}

try {
  if (
    registrySource &&
    !/^capacitor-device-profile@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(registrySource)
  ) {
    throw new Error(
      'DEVICE_PROFILE_CONSUMER_SOURCE must be an exact capacitor-device-profile@<version> spec',
    )
  }
  let source = registrySource
  if (!source) {
    execFileSync('npm', ['pack', '--pack-destination', scratch], {
      cwd: pkgRoot,
      stdio: 'inherit',
      env: anonymousEnv,
    })
    const tarball = readdirSync(scratch).find((file) => file.endsWith('.tgz'))
    if (!tarball) throw new Error('npm pack produced no tarball')
    source = path.join(scratch, tarball)
  }

  const consumer = path.join(scratch, 'consumer')
  mkdirSync(consumer, { recursive: true })
  writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify({
      name: 'capacitor-device-profile-smoke-consumer',
      private: true,
      type: 'module',
    }),
  )
  const userConfig = path.join(scratch, 'anonymous.npmrc')
  const globalConfig = path.join(scratch, 'empty-global.npmrc')
  writeFileSync(userConfig, 'registry=https://registry.npmjs.org/\n')
  writeFileSync(globalConfig, '')
  execFileSync(
    'npm',
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--ignore-scripts',
      '--userconfig',
      userConfig,
      '--globalconfig',
      globalConfig,
      source,
      'react@19',
    ],
    { cwd: consumer, stdio: 'inherit', env: anonymousEnv },
  )

  const esm = `
    import { classifyDevice, decideOrientation, createHaptics, createAppLifecycle } from 'capacitor-device-profile'
    import { useDeviceProfile, useSafeAreaInsets, subscribeViewportGeometry } from 'capacitor-device-profile/react'
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
    const { classifyDevice } = require('capacitor-device-profile')
    const { useDeviceProfile } = require('capacitor-device-profile/react')
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
    `capacitor-device-profile: consumer smoke passed (ESM + CJS) from ${registrySource ?? 'the packed tarball'}`,
  )
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
