# dsh-uuid

English | [中文](README.zh.md)

A zero-dependency library of one pure function: `randomUuid()`, an RFC 4122 v4 UUID string. It prefers `crypto.randomUUID` and, where that API is absent (non-secure browser contexts — plain-HTTP serving such as a LAN or Tailscale bind — expose `crypto.getRandomValues` but not `randomUUID`), builds the same v4 format from `getRandomValues`, applying the version and variant nibbles at formatting time. It is a library, not a service: no `ctx`, registers nothing, holds no state. Wire layers mint RPC ids and draft handles through it so their identity generation never depends on secure-context APIs.

## Model Experience

None, as this package generates identity strings only; model-facing consumers own any rendered use.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.
