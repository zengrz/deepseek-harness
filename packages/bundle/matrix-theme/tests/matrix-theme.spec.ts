/**
 * The bundle's substance is its patch file: the `dsh.bundle.patch` manifest
 * field must name a real, parseable patch list, the layer must insert exactly
 * the theme row this package names, and the resolver contract must hold (the
 * row's plugin package is a declared dependency, so the profile's node
 * resolution finds it for the browser registry). The insert form's no-dedupe
 * semantics are pinned too: applying the layer over a roster that already
 * registers the row yields two rows, which the loader rejects at mount — the
 * documented reason this bundle is for rosters that lack the row.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { applyEntryPatches, entryListSchema, type PatchOptions } from '@deepseek-ai/cordis-plugin-include'

describe('dsh-matrix-theme bundle', () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
    name?: string
    dependencies?: Record<string, string>
    dsh?: { bundle?: { patch?: string } }
  }

  it('declares a parseable patch list through the dsh.bundle.patch manifest field', () => {
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    const parsed = yaml.load(readFileSync(resolve(root, manifest.dsh!.bundle!.patch!), 'utf8'), { schema: entryListSchema })
    expect(Array.isArray(parsed)).toBe(true)
    const rows = (parsed as { insert?: { id?: string; name?: string }[] }[]).flatMap(patch => patch.insert ?? [])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: 'ui-matrix-theme', name: '@deepseek-ai/dsh-client-ui-matrix-theme' })
  })

  it('declares the inserted row package as a dependency, so the profile resolves the browser bundle', () => {
    expect(manifest.dependencies).toHaveProperty('@deepseek-ai/dsh-client-ui-matrix-theme')
  })

  it('inserts the row into a roster that lacks it and appends (never dedupes) onto one that has it', () => {
    const patch = yaml.load(readFileSync(resolve(root, 'cordis.patch.yml'), 'utf8'), { schema: entryListSchema }) as PatchOptions[]
    const without = applyEntryPatches([{ id: 'locale', name: '@deepseek-ai/dsh-client-locale' }], patch, () => {})
    expect(without.filter(entry => entry.id === 'ui-matrix-theme')).toHaveLength(1)
    const withRow = applyEntryPatches(
      [{ id: 'ui-matrix-theme', name: '@deepseek-ai/dsh-client-ui-matrix-theme' }],
      patch,
      () => {},
    )
    // The documented contract: insert appends, so a layer that already
    // registers the row would mount a duplicate loader entry id.
    expect(withRow.filter(entry => entry.id === 'ui-matrix-theme')).toHaveLength(2)
  })
})
