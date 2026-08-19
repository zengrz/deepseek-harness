/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-matrix-theme`.
 * @module @deepseek-ai/dsh-client-ui-matrix-theme/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-matrix-theme'

/** Cordis companion plugin name. */
export const name = 'client-ui-matrix-theme-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the theme registry owns the matrix theme definition
 * (registration and disposal), and this package holds no cross-plugin
 * mutable state — its two slot entries subscribe to the shared mirror store
 * whose agreement with `theme/change` is covered by the browser-plugin spec.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
