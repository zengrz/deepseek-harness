/** The uuid invariant companion registers its explained empty runtime invariant. */
import { describe, expect, it, vi } from 'vitest'
import * as UuidInvariant from '../src/invariant.ts'

describe('uuid invariant companion', () => {
  it('registers under the package name with an empty installer', async () => {
    const register = vi.fn().mockReturnValue(() => {})
    const ctx = { invariants: { register } } as never
    const dispose = await (UuidInvariant as { apply: (ctx: never) => Promise<() => void> }).apply(ctx)
    expect(register).toHaveBeenCalledWith('@deepseek-ai/dsh-uuid', expect.any(Function))
    expect(() => { (register.mock.calls[0]![1] as (c: never) => void)(undefined as never) }).not.toThrow()
    expect(dispose).toBeTypeOf('function')
  })
})
