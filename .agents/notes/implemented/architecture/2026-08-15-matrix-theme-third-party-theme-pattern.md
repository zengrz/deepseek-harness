# Agent Note: The Matrix theme as the third-party-theme pattern

Status: implemented

English | [中文](2026-08-15-matrix-theme-third-party-theme-pattern.zh.md)

## Problem

The theme service accepts third-party theme registrations, but before the Matrix theme no plugin exercised the extension point: nothing defined what a third-party theme's token surface, selection UI, ambient presentation, and preference lifetime look like, and the built-in Appearance row deliberately lists only `light`/`dark`/`system`.

## Decision

`@deepseek-ai/dsh-client-ui-matrix-theme` provides the Matrix movie aesthetic theme and doubles as the template for third-party theme contributions:

- It registers `matrix` (`colorScheme: 'dark'`) with a token override for every alias the dark palette declares in ui-theme's design-platform.css, so no surface falls back to the default bluish dark palette while the theme is active.
- A theme's selection surface belongs to the theme's own package, never the Appearance row: the plugin registers its own `settings.general.item` row (id `matrix`, order 11, directly under Appearance) with a switch toggle, applying ui-theme's "a feature owns its settings surface" rule to third-party themes.
- Ambient presentation rides ui-layout's `shell.backdrop` slot, which the theme work added to the frame: a frame-wide, click-through layer BELOW every column — the frame isolates a stacking context and the backdrop carries `z-index: -1`, because DOM order alone cannot keep it below the columns (absolutely-positioned entry children paint after static column backgrounds and would cover the sidebar otherwise). The backdrop IS the digital rain from https://github.com/zengrz/zengrz.github.io: `rain-engine.ts` is a faithful port of that page's live effect (js/matrix3d.js + js/util.js) — an opaque black fill plus full-height glyph columns (hiragana/katakana/hangul at the canvas default font, white marked glyphs at a smaller serif) with per-frame glyph churn, depth-based alpha, the white cursor spotlight, the marching selected-cell highlight, and the cursor-delta 3D tilt (the upstream falling `DropText` characters are commented out in the reference's own loop and are not part of its live effect). An earlier falling-rain engine was replaced by the port. The matrix theme makes the base background translucent (rgba black) while keeping the sidebar fill solid, so the base surface is the translucent layer between the app content and the backdrop and sidebar controls stay readable, and a translucent veil stacked above the canvas inside the entry dims the effect where surfaces are transparent. The entry renders nothing under `prefers-reduced-motion: reduce`.
- Both surfaces read one shared mirror store of `theme/change` (the apply-world listener is the only writer); the toggle remembers the preference it replaced and restores it on off, falling back to `system` when an external writer enabled matrix directly.
- The theme preference stays process-local: third-party ids do not cross the built-in settings schema (the [host-backed preferences note](../bug-fix/2026-08-06-host-backed-web-preferences.md) owns that boundary), so a reload resets the selection; disposing the registration while matrix is active resets the preference to `system` (the theme service's guarantee).

## Alternatives considered

**A matrix cube in the Appearance row** — extending the built-in row would make ui-theme enumerate third-party themes; the three cubes are a product-owned list, and a per-feature settings row keeps the extension point additive without changing the theme package.

**Rain in `shell.overlay` above the columns** — the original placement drew glyphs over text and interfered with reading; a dimmer canvas there would not separate the layers. Moving the rain below the columns through the new backdrop slot plus translucent base surfaces gives the requested text-over-translucent-layer-over-rain sandwich without touching per-surface opacity elsewhere.

**A document-level background canvas** — a body-attached canvas behind the frame would be invisible under the opaque frame background and would bypass the slot system; the backdrop slot keeps the composition inside ui-layout's declared frame structure.

**A durable matrix preference** — the built-in settings schema carries only the built-in preference union; widening it for one theme would make third-party ids first-class persistence objects with a migration cost the theme system has not signed up for.

## Consequences

- ui-layout gained a generic `shell.backdrop` extension point (below the columns, above the frame background, pinned by the frame's isolated stacking context plus the backdrop's negative z-index); future ambient-background entries share it, and their visibility depends on the active theme's surface translucency.
- The token override set pins the dark alias layer at snapshot time: a new alias added to ui-theme's dark palette is missed until this package updates — the completeness gap every third-party theme shares, recorded in the package README's limitations.
- The matrix theme's base surfaces are translucent, so backdrop entries read through at reduced strength; opaque surfaces (cards, dialogs, popovers) hide the backdrop as before.
- Reduced-motion environments get the theme colors without the animation; the rain conveys no content (`aria-hidden`).
- The theme delivers as an installable profile plugin — `@deepseek-ai/dsh-matrix-theme` via `dsh plugin --profile <name> add @deepseek-ai/dsh-matrix-theme` — never as an in-box web-app roster row; the [standalone-bundle note](../feature/2026-08-16-matrix-theme-standalone-bundle.md) owns the delivery, this note owns the pattern.
- Future theme contributions copy this package's shape: register, a settings row, an optional ambient backdrop entry, and a process-local preference.
