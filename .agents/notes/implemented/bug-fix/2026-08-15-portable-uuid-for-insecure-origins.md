# Agent Note: Portable UUID generation for insecure-origin Web serving

Status: implemented

English | [中文](2026-08-15-portable-uuid-for-insecure-origins.zh.md)

## Problem

Wire-layer code minted RPC ids with `crypto.randomUUID`, which browsers expose only in secure contexts. Loopback serving (`localhost` counts as secure) hid the gap; the first time the Web GUI was served to a browser over plain HTTP on a LAN interface literal (`dsh web --host <interface-ip>`, the specific-interface bind this repo added), every RPC from that browser threw `crypto.randomUUID is not a function` — the visible symptom was the workspace "Select Workspace Directory" window failing, since the directory-browse dialog issues RPCs to list folders. The attachment draft id in ui-conversation carried the same latent failure.

## Decision

`@deepseek-ai/dsh-uuid` (packages/util/uuid) owns one portable primitive, `randomUuid()`: it prefers `crypto.randomUUID` where present and otherwise builds the RFC 4122 v4 format from `crypto.getRandomValues`, applying the version and variant nibbles at formatting time. `getRandomValues` exists in every browser regardless of context and across the supported Node range, so the fallback is total for the environments this harness serves.

Consumers mint through the package: the API fetch client's `mintRpcId` (`dsh-host-apiproxy`), the attachment draft id (`dsh-client-ui-conversation`), and the connection client's own id minting, whose package-local `random-uuid.ts` was folded into `dsh-uuid` rather than kept as a second copy. The package is a library, not a service: no `ctx`, no state, no events.

## Alternatives considered

**A package-local fallback in each consumer** — three copies of the same v4 formatting; the single package keeps one tested home for the fact that UUID minting must not depend on secure-context APIs, and gives future consumers one import.

**Always use `crypto.getRandomValues`** — the connection package's original helper did exactly this and works everywhere, but it skips the OS-backed `randomUUID` path for no benefit; preferring it costs one feature check and keeps the common case on the platform API.

**A third-party uuid dependency** — deletes nothing this 30-line primitive does not already own, and adds a bundle weight this wire layer does not need.

## Consequences

- RPC id minting, attachment draft ids, and connection fixture ids work identically in secure and insecure browser contexts; plain-HTTP LAN/Tailscale serving is fully functional for browsers.
- The connection package lost its private helper; `dsh-uuid` is the single home, recorded in the module graph.
- The client-bundle preset moved from tsdown's deprecated `external`/`noExternal` pair to `deps.neverBundle`/`deps.alwaysBundle`, so non-table peers (like `dsh-uuid`) inline deterministically across both the per-package and the root build passes.
- The unit spec pins the v4 formatting contract byte-for-byte from a deterministic `getRandomValues` fill.
