# `@deepseek-ai/dsh-matrix-theme`

English | [中文](README.zh.md)

The Matrix movie theme as an installable profile plugin: [`cordis.patch.yml`](cordis.patch.yml) inserts one browser roster row — `ui-matrix-theme` mounting [`@deepseek-ai/dsh-client-ui-matrix-theme`](../../client/ui-matrix-theme/README.md) — so the profile gains the selectable `matrix` theme, its General-section toggle, and the digital-rain backdrop. The [`dsh-web-app`](../web-app/README.md) bundle does not register the theme; this bundle is the install path. Install it with `dsh plugin --profile <name> add @deepseek-ai/dsh-matrix-theme`; the package has no runtime API, and the profile composer resolves the patch through the `dsh.bundle.patch` manifest field, never through code.

The insert form appends and does not dedupe: adding the bundle to a profile whose layers already register `ui-matrix-theme` fails the load with `duplicate loader entry id: ui-matrix-theme`, so a profile must not add the bundle twice or pair it with a custom roster that registers the row itself. The row's plugin package is this bundle's dependency, so the profile's node resolution finds it for the browser registry, and the plugin's own service injections (theme, locale, slots, settings, layout) resolve from the profile's client stack.

## Model Experience

Indirectly, through the inserted row: this bundle selects nothing model-visible of its own; the theme package manages a browser-side preference and contributes no model-facing text.

#### KV Cache effect

None directly; the theme package assembles no provider request.

## Known Limitations and Deferred Work

- **No upsert in the patch engine** — `insert` appends and a bare `id` override skips a missing row, so no single patch form both adds the row and tolerates its presence; the bundle therefore documents rather than works around the duplicate-id failure for profiles whose layers already register the row.
- **The theme rides the profile's client stack** — the plugin registers into the `shell.backdrop` slot that the same-release ui-layout declares, so the bundle requires a client stack at least that recent; it does not pin those versions itself.
