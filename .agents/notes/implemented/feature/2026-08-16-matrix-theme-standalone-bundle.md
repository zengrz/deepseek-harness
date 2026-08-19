# Agent Note: The Matrix theme as an installable profile bundle

Status: implemented

English | [中文](2026-08-16-matrix-theme-standalone-bundle.zh.md)

## Problem

A browser-surface profile gains the Matrix theme only through an install path it adds itself: the `dsh-web-app` bundle does not register the `ui-matrix-theme` browser roster row, so stock web profiles carry no theme and custom rosters get nothing unless they add it.

## Decision

`@deepseek-ai/dsh-matrix-theme` (packages/bundle/matrix-theme) publishes the theme as a patch-only profile bundle: its `cordis.patch.yml` is one `insert` adding the `ui-matrix-theme` row mounting `@deepseek-ai/dsh-client-ui-matrix-theme`, which the bundle declares as a dependency so the profile's node resolution finds the plugin for the browser registry (`dsh plugin --profile <name> add @deepseek-ai/dsh-matrix-theme`). The package has no runtime API; it follows the dsh-base bundle shape (patch field, invariant companion with a no-runtime reason, patch-contract spec).

Two contracts are documented rather than worked around, because the patch engine offers no upsert:

- **Insert appends, never dedupes.** A profile whose layers already register the row (a double add, or a custom roster that registers its own theme row) mounts a duplicate loader entry id and fails the load; the bundle's README and spec pin that behavior.
- **The row rides the profile's client stack.** The plugin registers into the `shell.backdrop` slot that the same-release ui-layout declares, so the bundle requires a client stack at least that recent without pinning those versions itself.

## Alternatives considered

**The in-box row instead of a bundle** — ships the theme into every stock web profile with no opt-out; rejected because a theme is a per-profile presentation choice, and an in-box row carries it into every web surface without asking.

**An override-form patch (`- id` without `insert`)** — idempotent against layers that already have the row, but silently skips when the row is absent, which is exactly the profile the bundle exists for.

**A runtime glue plugin deduping the row at boot** — patch application happens before any plugin can run, so no boot code can remove a duplicate row; the loader's duplicate-id throw is the only enforcement and the README contract is the only defense.

## Consequences

- The publish set grows by the bundle (the plugin package already rode the family); both publish together under the dsh family release, and stock web profiles gain the theme only by adding the bundle.
- `check-workspace-constraints` gained the bundle's `cordis.patch.yml` publication extra, the same entry every profile bundle carries.
- The bundle spec pins the patch parse, the resolver dependency, and the insert no-dedupe semantics, so the documented duplicate-id contract cannot drift silently.
