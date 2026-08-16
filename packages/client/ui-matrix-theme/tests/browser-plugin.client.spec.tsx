/**
 * ui-matrix-theme browser half on a real cordis Context with the real
 * ThemeRuntime (stubbed settings scope), real slot registry, and real locale
 * service: the plugin registers the `matrix` theme, contributes the General
 * toggle row and the `shell.backdrop` rain entry, mirrors `theme/change`
 * snapshots into the shared store, and routes toggle writes back through
 * `ctx.theme.setTheme` while remembering the replaced preference. Theme and
 * slot registrations dispose with the plugin fiber (HMR safety). The node
 * half and the invariant companion are exercised over the same Context.
 */
// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { stubSettingsScope, usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import { ThemeRuntime } from '@deepseek-ai/dsh-client-ui-theme/client'
import type { ThemeSettings } from '@deepseek-ai/dsh-client-ui-theme/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as nodeApply } from '../src/index.ts'
import { MATRIX_THEME, THEME_ID } from '../src/client/matrix-tokens.ts'
import { MatrixRow } from '../src/client/MatrixRow.tsx'
import type { MatrixRowInjected } from '../src/client/MatrixRow.tsx'
import { MatrixRain } from '../src/client/MatrixRain.tsx'
import type { createMatrixThemeStore } from '../src/client/store.ts'

// The specs assert the shipped Chinese copy, so they state the browser they assume.
usePinnedBrowserLanguages('zh-CN')

afterEach(cleanup)

const ROW_SLOT = 'settings.general.item'
const RAIN_SLOT = 'shell.backdrop'

/** Boot the plugin over a real theme/slots/locale stack with both slots declared. */
async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  const theme = new ThemeRuntime(ctx, stubSettingsScope<ThemeSettings>().scope)
  ctx.provide('theme', theme)
  const declare = ctx.slots.register({
    name: 'root',
    children: {
      [ROW_SLOT]: { kind: 'list', scope: 'root' },
      [RAIN_SLOT]: { kind: 'list', scope: 'root' },
    },
  } as never, (() => null) as never)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  return { ctx, locale, theme, declare, fiber, slots: ctx.slots }
}

/** Bake the row entry's real store instance and call its inject factory, mirroring the renderer choreography. */
function rowFace(b: Awaited<ReturnType<typeof bench>>) {
  const entry = b.slots.entries(ROW_SLOT).find(e => e.component === MatrixRow)!
  const handle = entry.store as ReturnType<typeof createMatrixThemeStore>
  const instance = handle.create()
  const face = (entry.inject as unknown as (a: typeof instance.actions) => MatrixRowInjected)(instance.actions)
  return { entry, instance, face }
}

/** The rain entry's store is the same shared handle; call its inject factory the same way. */
function rainFace(b: Awaited<ReturnType<typeof bench>>) {
  const entry = b.slots.entries(RAIN_SLOT).find(e => e.component === MatrixRain)!
  const handle = entry.store as ReturnType<typeof createMatrixThemeStore>
  const instance = handle.create()
  ;(entry.inject as unknown as (a: typeof instance.actions) => Record<string, never>)(instance.actions)
  return { entry, instance }
}

describe('ui-matrix-theme browser plugin', () => {
  it('declares the inject edges and registers the matrix theme', async () => {
    expect(inject).toEqual(['slots', 'theme', 'locale'])
    const b = await bench()
    await b.fiber.await()
    const registered = b.theme.getTheme().themes.find(t => t.id === THEME_ID)!
    expect(registered).toMatchObject({ id: 'matrix', colorScheme: 'dark' })
    expect(registered.tokens['--dsw-alias-bg-base']).toBe('rgba(0, 0, 0, 0.75)')
    expect(MATRIX_THEME.tokens['--dsw-alias-brand-primary']).toBe('rgb(0, 255, 65)')
  })

  it('registers the toggle row and the rain overlay once their slots declare (declaration before or after apply)', async () => {
    const before = await bench()
    await before.fiber.await()
    expect(before.slots.entries(ROW_SLOT).find(e => e.component === MatrixRow)?.options).toMatchObject({ id: 'matrix', order: 11 })
    expect(before.slots.entries(ROW_SLOT).find(e => e.component === MatrixRow)?.locale).toBe('matrix')
    expect(before.slots.entries(RAIN_SLOT).find(e => e.component === MatrixRain)?.options).toMatchObject({ id: 'matrix-rain', order: 0 })

    // Undeclared slots: slots.inject parks the registrations until the declaration lands.
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    const locale = new LocaleRuntime(ctx)
    ctx.provide('locale', locale)
    ctx.provide('theme', new ThemeRuntime(ctx, stubSettingsScope<ThemeSettings>().scope))
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(ctx.slots.entries(ROW_SLOT)).toHaveLength(0)
    expect(ctx.slots.entries(RAIN_SLOT)).toHaveLength(0)
    ctx.slots.register({
      name: 'root',
      children: {
        [ROW_SLOT]: { kind: 'list', scope: 'root' },
        [RAIN_SLOT]: { kind: 'list', scope: 'root' },
      },
    } as never, (() => null) as never)
    await Promise.resolve()
    expect(ctx.slots.entries(ROW_SLOT).some(e => e.component === MatrixRow)).toBe(true)
    expect(ctx.slots.entries(RAIN_SLOT).some(e => e.component === MatrixRain)).toBe(true)
  })

  it('mirrors theme snapshots into the shared store, including the pre-binding window', async () => {
    const b = await bench()
    await b.fiber.await()
    // A change ahead of any inject hits the unbound arm without throwing.
    b.theme.setTheme('matrix')

    const row = rowFace(b)
    // The inject-time re-sync sealed the init window: the mirror is current.
    expect(row.instance.getSnapshot()).toMatchObject({ preference: true, active: true })

    b.theme.setTheme('dark')
    expect(row.instance.getSnapshot()).toMatchObject({ preference: false, active: false })

    // The rain entry binds the same shared store: its instance sees the same mirror.
    const rain = rainFace(b)
    b.theme.setTheme('matrix')
    expect(rain.instance.getSnapshot()).toMatchObject({ preference: true, active: true })
  })

  it('routes toggle writes back through the theme service and restores the replaced preference', async () => {
    const b = await bench()
    await b.fiber.await()
    b.theme.setTheme('dark')
    const { face } = rowFace(b)

    face.setMatrix(true)
    expect(b.theme.getTheme().preference).toBe('matrix')
    // Re-asserting on keeps the first capture: the restore target is the
    // preference this plugin replaced, not the current one.
    face.setMatrix(true)
    face.setMatrix(false)
    expect(b.theme.getTheme().preference).toBe('dark')

    // Without a captured preference, switching off restores the default.
    const fresh = await bench()
    await fresh.fiber.await()
    const { face: face2 } = rowFace(fresh)
    face2.setMatrix(true)
    face2.setMatrix(false)
    expect(fresh.theme.getTheme().preference).toBe('system')
  })

  it('switching off after an external writer enabled matrix falls back to the system preference', async () => {
    const b = await bench()
    await b.fiber.await()
    // The toggle never captured a replacement preference: another writer set
    // the theme id directly, so the row's off switch restores the default.
    b.theme.setTheme('matrix')
    const { face } = rowFace(b)
    face.setMatrix(false)
    expect(b.theme.getTheme().preference).toBe('system')
  })

  it('localizes the row copy through the plugin dictionary', async () => {
    const b = await bench()
    await b.fiber.await()
    expect(b.locale.bind('matrix')('matrix.title')).toBe('矩阵主题')
    expect(b.locale.bind('matrix')('matrix.on')).toBe('已开启')
    b.locale.setLocale('en')
    expect(b.locale.bind('matrix')('matrix.title')).toBe('Matrix theme')
    expect(b.locale.bind('matrix')('matrix.off')).toBe('Off')
  })

  it('drops both entries and the theme registration when the fiber unloads (HMR safety)', async () => {
    const b = await bench()
    await b.fiber.await()
    expect(b.slots.entries(ROW_SLOT).some(e => e.component === MatrixRow)).toBe(true)
    expect(b.slots.entries(RAIN_SLOT).some(e => e.component === MatrixRain)).toBe(true)
    await b.fiber.dispose()
    expect(b.slots.entries(ROW_SLOT)).toHaveLength(0)
    expect(b.slots.entries(RAIN_SLOT)).toHaveLength(0)
    expect(b.theme.getTheme().themes.some(t => t.id === THEME_ID)).toBe(false)
  })

  it('disposing the theme registration while matrix is active resets the preference to the default', async () => {
    const b = await bench()
    await b.fiber.await()
    b.theme.setTheme('matrix')
    await b.fiber.dispose()
    expect(b.theme.getTheme().preference).toBe('system')
    expect(b.theme.getTheme().active.id).toBe('light')
  })
})

describe('ui-matrix-theme node half', () => {
  it('the node apply is an inert loader seat', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })
})
