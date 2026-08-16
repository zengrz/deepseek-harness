// @vitest-environment jsdom
/**
 * RainEngine: the ported glyph-wall backdrop from
 * https://github.com/zengrz/zengrz.github.io. rAF lifetime (start/double-start/
 * dispose, cursor-listener cleanup), the opaque background fill, the
 * full-height per-column glyph grid, the per-frame glyph churn, the
 * depth-based alpha, the cursor spotlight, the marching selected-cell
 * highlight, the cursor-delta 3D tilt (persistent, deltas settled per frame),
 * and the rebuild-on-resize layout. Frames are driven synchronously through a
 * stubbed requestAnimationFrame; Math.random is pinned so the glyph/churn/
 * depth/march draws are reproducible. The specs pin the 20px column grid and
 * the per-glyph font pair (canvas default for plain glyphs, 15px serif for
 * marked ones), which are the engine's drawing contract.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { depthAlpha, RainEngine } from '../src/client/rain-engine.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const CELLS = 15 // 100x60 canvas: 5 columns × 3 rows

interface Driven {
  engine: RainEngine
  canvas: HTMLCanvasElement
  ctx: { fillRect: ReturnType<typeof vi.fn>; fillText: ReturnType<typeof vi.fn>; fillStyle: string; font: string }
  /** Every fillStyle assignment, in order (the frame's background fill first). */
  styles: string[]
  /** Every font assignment, in order. */
  fonts: string[]
  raf: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
  /** The callbacks the stubbed rAF captured, oldest first. */
  pending: FrameRequestCallback[]
  /** Run the next scheduled frame. */
  drive: () => void
}

/** Engine over a jsdom canvas with a stubbed 2D context and captured rAF callbacks. */
function bench(geometry: { width: number; height: number }): Driven {
  const canvas = document.createElement('canvas')
  Object.defineProperty(canvas, 'clientWidth', { value: geometry.width, configurable: true })
  Object.defineProperty(canvas, 'clientHeight', { value: geometry.height, configurable: true })
  const styles: string[] = []
  const fonts: string[] = []
  const ctx = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    font: '',
  }
  Object.defineProperty(ctx, 'fillStyle', {
    set: (value: string) => { styles.push(value) },
    get: () => styles[styles.length - 1] ?? '',
  })
  Object.defineProperty(ctx, 'font', {
    set: (value: string) => { fonts.push(value) },
    get: () => fonts[fonts.length - 1] ?? '',
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
  const pending: FrameRequestCallback[] = []
  const raf = vi.fn((cb: FrameRequestCallback) => { pending.push(cb); return pending.length })
  const cancel = vi.fn()
  vi.stubGlobal('requestAnimationFrame', raf)
  vi.stubGlobal('cancelAnimationFrame', cancel)
  const engine = new RainEngine(canvas)
  return { engine, canvas, ctx, styles, fonts, raf, cancel, pending, drive: () => { pending.shift()?.(0) } }
}

/** The fillStyle assigned right before fillText call `callIndex` (each frame leads with the background fill). */
function styleOf(b: Driven, callIndex: number): string {
  return b.styles[callIndex + Math.floor(callIndex / CELLS) + 1] ?? ''
}

/** The font assigned right before fillText call `callIndex`. */
function fontOf(b: Driven, callIndex: number): string {
  return b.fonts[callIndex] ?? ''
}

/** Queue an exact random sequence; the fallback value answers any draw past the queue. */
function randomQueue(...values: number[]): ReturnType<typeof vi.fn> {
  const spy = vi.spyOn(Math, 'random')
  for (const value of values) spy.mockReturnValueOnce(value)
  return spy
}

describe('RainEngine', () => {
  it('is inert without a 2D context: start, resize, and dispose are quiet no-ops', () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const raf = vi.fn()
    const cancel = vi.fn()
    vi.stubGlobal('requestAnimationFrame', raf)
    vi.stubGlobal('cancelAnimationFrame', cancel)
    const engine = new RainEngine(canvas)
    engine.start()
    engine.resize()
    engine.dispose()
    expect(raf).not.toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
    expect(canvas.width).toBe(300) // jsdom default, untouched by a skipped layout
  })

  it('starts exactly one frame loop and one cursor listener; a second start and a second dispose are no-ops', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const b = bench({ width: 100, height: 60 })
    b.engine.start()
    b.engine.start()
    expect(b.raf).toHaveBeenCalledOnce()
    expect(b.pending).toHaveLength(1)
    expect(add).toHaveBeenCalledOnce()
    expect(add).toHaveBeenCalledWith('mousemove', expect.any(Function))
    b.engine.dispose()
    b.engine.dispose()
    expect(b.cancel).toHaveBeenCalledOnce()
    expect(b.cancel).toHaveBeenCalledWith(1)
    expect(remove).toHaveBeenCalledWith('mousemove', expect.any(Function))
  })

  it('paints the opaque black background and the full glyph grid at depth alpha', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // z = 0 → alpha 0.5; moveDelay 6; no churn
    const b = bench({ width: 100, height: 60 }) // 5 columns × 3 rows
    b.engine.start()
    b.drive()
    expect(b.styles[0]).toBe('#000')
    expect(b.ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 60)
    expect(b.ctx.fillText).toHaveBeenCalledTimes(CELLS)
    // Columns span the width at 20px; rows stack top to bottom.
    const xs = (b.ctx.fillText.mock.calls as unknown[][]).map(call => call[1] as number)
    const ys = (b.ctx.fillText.mock.calls as unknown[][]).map(call => call[2] as number)
    expect([...new Set(xs)]).toEqual([0, 20, 40, 60, 80])
    expect([...new Set(ys)]).toEqual([0, 20, 40])
    // Column 0's bottom cell sits off the selected row and outside the
    // cursor radius, so it draws the plain depth-alpha phosphor at the
    // canvas default font (the reference never assigns one to wall glyphs).
    expect(styleOf(b, 2)).toBe('rgba(0, 255, 0, 0.5)')
    expect(fontOf(b, 2)).toBe('10px sans-serif')
    expect(depthAlpha(-90)).toBe(0)
    expect(depthAlpha(0)).toBe(0.5)
    expect(depthAlpha(90)).toBe(1)
  })

  it('lights glyphs white at the smaller size inside the cursor spotlight only', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const b = bench({ width: 100, height: 60 })
    b.engine.start()
    // Cursor at the canvas center: column 0's bottom cell (0, 40) sits outside
    // the 50px radius and off the selected row, so it keeps its phosphor color.
    b.drive()
    expect(styleOf(b, 2)).toBe('rgba(0, 255, 0, 0.5)')
    // Cursor near cell (20, 20). The move event's delta tilts the next frame;
    // the frame after that settles the delta, so its alpha is exact again.
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 22, clientY: 22 }))
    b.drive()
    b.drive()
    expect(styleOf(b, 2 * CELLS + 4)).toMatch(/^rgba\(255, 255, 255, /)
    expect(fontOf(b, 2 * CELLS + 4)).toBe('15px serif')
    expect(styleOf(b, 3 * CELLS - 1)).toMatch(/^rgba\(0, 255, 0, /)
    expect(fontOf(b, 3 * CELLS - 1)).toBe('10px sans-serif')
  })

  it('marches the white selected cell down each column and wraps at the bottom', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // moveDelay = 6 frames
    const b = bench({ width: 100, height: 60 })
    b.engine.start()
    // Frame 7 draws with selected 0 (advance happens after drawing), frame 13
    // with selected 1, frame 19 with selected 2; the modulo wrap returns
    // frame 20 to selected 0.
    for (let i = 0; i < 20; i += 1) b.drive()
    const frameStart = (frame: number): number => (frame - 1) * CELLS
    expect(styleOf(b, frameStart(7))).toBe('rgba(255, 255, 255, 0.5)')
    expect(styleOf(b, frameStart(13) + 1)).toBe('rgba(255, 255, 255, 0.5)')
    expect(styleOf(b, frameStart(19) + 2)).toBe('rgba(255, 255, 255, 0.5)')
    expect(styleOf(b, frameStart(20))).toBe('rgba(255, 255, 255, 0.5)')
    expect(styleOf(b, frameStart(20) + 1)).toBe('rgba(0, 255, 0, 0.5)')
  })

  it('replaces a glyph when its churn draw wins', () => {
    // Layout consumes 5 draws per column (z, 3 glyphs, moveDelay) for 25;
    // frame 1 draws 15 cells with no churn; frame 2's first cell churns and
    // replaces its glyph with the pick at 0.1.
    randomQueue(...new Array<number>(25 + CELLS).fill(0.5), 0.995, 0.1)
      .mockReturnValue(0.5)
    const b = bench({ width: 100, height: 60 })
    b.engine.start()
    b.drive()
    const first = (b.ctx.fillText.mock.calls[0] as unknown[])[0] as string
    b.drive()
    const second = (b.ctx.fillText.mock.calls[CELLS] as unknown[])[0] as string
    expect(second).not.toBe(first)
  })

  it('tilts every column by the cursor delta and settles the delta after the frame', () => {
    // Per column: z draw 1 (z = 90), glyphs and moveDelay at 0.5.
    const layout: number[] = []
    for (let i = 0; i < 5; i += 1) layout.push(1, 0.5, 0.5, 0.5, 0.5)
    randomQueue(...layout).mockReturnValue(0.5)
    const b = bench({ width: 100, height: 60 })
    b.engine.start()
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 300 })) // dx 450, dy 270
    b.drive()
    // Column 4 (x 80, z 90) rotates around the center (50, 30): x ≈ 82.53.
    const x1 = (b.ctx.fillText.mock.calls[12] as unknown[])[1] as number
    expect(x1).toBeCloseTo(82.532, 2)
    // The rotation persists (columns keep their tilted position), but the
    // settled delta produces no further tilt on the next frame.
    b.drive()
    const x2 = (b.ctx.fillText.mock.calls[CELLS + 12] as unknown[])[1] as number
    expect(x2).toBeCloseTo(82.532, 2)
  })

  it('rebuilds the full grid on resize', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const b = bench({ width: 100, height: 60 }) // 5 columns × 3 rows
    b.engine.start()
    b.drive()
    expect(b.ctx.fillText).toHaveBeenCalledTimes(CELLS)
    Object.defineProperty(b.canvas, 'clientWidth', { value: 60, configurable: true })
    Object.defineProperty(b.canvas, 'clientHeight', { value: 40, configurable: true })
    b.engine.resize()
    expect(b.canvas.width).toBe(60)
    b.drive() // 3 columns × 2 rows
    expect(b.ctx.fillText).toHaveBeenCalledTimes(CELLS + 6)
    const last = b.ctx.fillText.mock.calls.slice(-6) as unknown[][]
    expect([...new Set(last.map(call => call[1] as number))]).toEqual([0, 20, 40])
  })
})
