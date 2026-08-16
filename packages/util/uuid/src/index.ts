/**
 * @deepseek-ai/dsh-uuid — a zero-dependency portable UUID primitive.
 *
 * `crypto.randomUUID` exists only in secure browser contexts and modern Node,
 * so plain-HTTP serving (a LAN or Tailscale bind) must not rely on it. This
 * package prefers it where present and otherwise builds the UUID from
 * `crypto.getRandomValues`, which every browser and the supported Node range
 * provide.
 */

/** Bytes per UUID. */
const UUID_BYTES = 16
/** RFC 4122 v4 version nibble (bits 48-51). */
const VERSION_NIBBLE = 0x40
/** RFC 4122 variant nibble (bits 64-65). */
const VARIANT_NIBBLE = 0x80

const HEX = '0123456789abcdef'

/**
 * Generate a random RFC 4122 v4 UUID string in the browser and in Node.
 * Prefers `crypto.randomUUID`; where it is unavailable (non-secure browser
 * contexts) builds the same format from `crypto.getRandomValues`.
 * @returns a lowercase v4 UUID string.
 */
export function randomUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = new Uint8Array(UUID_BYTES)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const [i, byte] of bytes.entries()) {
    // The version and variant nibbles are applied at formatting time, so the
    // raw bytes stay untouched and the string always parses as v4.
    const value = i === 6 ? (byte & 0x0f) | VERSION_NIBBLE : i === 8 ? (byte & 0x3f) | VARIANT_NIBBLE : byte
    out += HEX.charAt(Math.floor(value / 16)) + HEX.charAt(value % 16)
    if (i === 3 || i === 5 || i === 7 || i === 9) out += '-'
  }
  return out
}
