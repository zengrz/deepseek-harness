/** Matrix theme mirror store: init shape, sync mirroring, and the revision guard. */
import { describe, expect, it } from 'vitest'
import { createMatrixThemeStore } from '../src/client/store.ts'

describe('createMatrixThemeStore', () => {
  it('init shape: both flags false with revision at -1', () => {
    const store = createMatrixThemeStore().create()
    expect(store.getSnapshot()).toEqual({ preference: false, active: false, revision: -1 })
  })

  it('sync mirrors both flags and advances the revision', () => {
    const store = createMatrixThemeStore().create()
    store.actions.sync(true, true, 0)
    expect(store.getSnapshot()).toEqual({ preference: true, active: true, revision: 0 })
    store.actions.sync(false, false, 2)
    expect(store.getSnapshot()).toEqual({ preference: false, active: false, revision: 2 })
  })

  it('revision guard drops stale and duplicate writes', () => {
    const store = createMatrixThemeStore().create()
    store.actions.sync(true, true, 3)
    store.actions.sync(false, false, 2)
    store.actions.sync(false, false, 3)
    expect(store.getSnapshot()).toEqual({ preference: true, active: true, revision: 3 })
  })
})
