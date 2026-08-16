# @deepseek-ai/dsh-client-ui-matrix-theme

English | [中文](README.zh.md)

Matrix movie aesthetic theme plugin for the web GUI, browser half. It registers the selectable `matrix` theme into the theme service (`colorScheme: 'dark'` plus alias-token overrides covering the complete dark alias layer that ui-theme's design-platform.css declares, so no surface falls back to the default bluish dark palette while the theme is active) and contributes its two surfaces: the General-section toggle row (`settings.general.item` id `matrix`, order 11, directly under the Appearance row) and the digital-rain ambient backdrop (`shell.backdrop` id `matrix-rain`, order 0, below every column). Both surfaces read one shared mirror store whose only writer is the apply-world `theme/change` listener; the toggle's inject face routes preference writes back through `ctx.theme.setTheme`, remembering the preference it replaced so switching off restores it (default `system`). The theme registration and every subscription ride the plugin fiber, so HMR disposal removes both entries, the theme, and the listeners together.

The backdrop renders only while the resolved active theme is `matrix`: its engine is a faithful port of the digital rain at https://github.com/zengrz/zengrz.github.io (js/matrix3d.js + js/util.js), so the background IS that page's effect — an opaque black fill plus full-height glyph columns (hiragana/katakana/hangul at the canvas default font, white marked glyphs at a smaller serif) with per-frame glyph churn, depth-based alpha, the white cursor spotlight, the marching selected-cell highlight, and the cursor-delta 3D tilt. It never paints over content: the frame columns stack above the backdrop, and the theme makes the base background translucent (rgba black) while keeping the sidebar fill solid, so the base surface is the translucent layer between the app content and the rain — the backdrop reads through the main surfaces at reduced strength, sidebar controls stay readable, and text stays opaque on top. A translucent veil stacked above the canvas inside the entry dims the rain where surfaces are transparent. Under `prefers-reduced-motion: reduce` the entry renders nothing at all. Like every third-party theme id, `matrix` is an in-process extension: the built-in settings schema carries only `light`/`dark`/`system`, so the selection does not survive a page reload, and disposing the registration while matrix is active resets the preference to `system` (the theme service's own guarantee).

## Model Experience

None, as the theme service manages a browser preference; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **The override set pins the dark alias layer at snapshot time** — a new alias added to ui-theme's dark palette is missed until this package adds a matrix value for it, the same completeness gap every third-party theme shares.
- **The matrix preference is process-local** — it resets on reload because third-party theme ids do not cross the built-in settings schema; a durable third-party-theme preference would be a ui-theme extension.
- **The rain is purely decorative** — the canvas carries `aria-hidden` and conveys no content; reduced-motion environments get the theme colors without the animation.
