/** randomUuid: prefers crypto.randomUUID; the fallback formats a v4 UUID from getRandomValues. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomUuid } from '../src/index.ts'

const V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('randomUuid', () => {
  it('prefers crypto.randomUUID when the environment provides it', () => {
    const native = vi.fn(() => 'native-uuid')
    vi.stubGlobal('crypto', { randomUUID: native, getRandomValues: vi.fn() })
    expect(randomUuid()).toBe('native-uuid')
    expect(native).toHaveBeenCalledOnce()
  })

  it('formats a v4 UUID from getRandomValues when randomUUID is missing', () => {
    vi.stubGlobal('crypto', {
      randomUUID: undefined,
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0xab)
        return bytes
      },
    })
    // Every raw byte is 0xab; the version nibble (4, byte 6) and the variant
    // nibble (b, byte 8) are applied at formatting time.
    expect(randomUuid()).toBe('abababab-abab-4bab-abab-abababababab')
    expect(randomUuid()).toMatch(V4_PATTERN)
  })
})
