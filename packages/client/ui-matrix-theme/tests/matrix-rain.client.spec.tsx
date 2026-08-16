// @vitest-environment jsdom
/** MatrixRain wiring: renders the click-through canvas only while matrix is
 * the resolved active theme and motion is not reduced; owns the RainEngine
 * lifetime (start on mount, resize forwarding, cancel on unmount). */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { createSnapshotStore, type SessionListState, type WorkspaceListState } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { MatrixRain, prefersReducedMotion } from '../src/client/MatrixRain.tsx'
import type { MatrixRainProps } from '../src/client/MatrixRain.tsx'
import { createMatrixThemeStore } from '../src/client/store.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Empty global standard-kit hooks (the overlay reads neither). */
function emptySessions() {
  const store = createSnapshotStore<SessionListState>(
    { ids: [], byId: {}, current: undefined, phase: 'ready', subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined })
  return bindSnapshotSelector(store)
}
function emptyWorkspaces() {
  const store = createSnapshotStore<WorkspaceListState>({
    items: [], archivedSessionIds: [], state: 'idle', phase: 'ready', error: null,
    baselinesReady: true, recentWorkspaceId: undefined,
  })
  return bindSnapshotSelector(store)
}

function mount(active: boolean, raf: ReturnType<typeof vi.fn> = vi.fn(() => 7)) {
  const store = createMatrixThemeStore().create()
  store.actions.sync(active, active, 0)
  vi.stubGlobal('requestAnimationFrame', raf)
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    fillText: vi.fn(),
  } as never)
  const props: MatrixRainProps = {
    useSessions: emptySessions(),
    useWorkspaces: emptyWorkspaces(),
    useStore: bindSnapshotSelector(store),
    actions: store.actions,
  }
  const view = render(<MatrixRain {...props} />)
  return { store, raf, view }
}

describe('MatrixRain', () => {
  it('renders nothing while matrix is not the active theme', () => {
    mount(false)
    expect(document.querySelector('canvas')).toBeNull()
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('renders the decorative canvas under its translucent veil and starts the engine while matrix is active', () => {
    const { raf } = mount(true)
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    expect(canvas).toBeTruthy()
    // The veil stacks after the canvas inside the entry: the translucent
    // layer between the app content and the rain glyphs.
    const veil = canvas.nextElementSibling
    expect(veil).toBeInstanceOf(HTMLDivElement)
    expect(veil?.getAttribute('aria-hidden')).toBe('true')
    expect(raf).toHaveBeenCalledOnce()
  })

  it('starts the engine when the store flips active and disposes it on unmount', () => {
    const { store, raf } = mount(false)
    act(() => { store.actions.sync(true, true, 1) })
    expect(document.querySelector('canvas')).toBeTruthy()
    expect(raf).toHaveBeenCalledOnce()
    cleanup()
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7)
  })

  it('forwards window resizes to the engine relayout', () => {
    mount(true)
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    Object.defineProperty(canvas, 'clientWidth', { value: 140, configurable: true })
    Object.defineProperty(canvas, 'clientHeight', { value: 140, configurable: true })
    fireEvent(window, new Event('resize'))
    expect(canvas.width).toBe(140)
    expect(canvas.height).toBe(140)
  })

  it('renders nothing under prefers-reduced-motion even while matrix is active', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true }) as MediaQueryList))
    mount(true)
    expect(document.querySelector('canvas')).toBeNull()
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })
})

describe('prefersReducedMotion', () => {
  it('is false without matchMedia and true only when the query matches', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(prefersReducedMotion()).toBe(false)
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false }) as MediaQueryList))
    expect(prefersReducedMotion()).toBe(false)
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true }) as MediaQueryList))
    expect(prefersReducedMotion()).toBe(true)
  })
})
