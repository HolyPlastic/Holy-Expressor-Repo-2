# Color Theming

**Files:** `css/styles.css` (`:root` variable declarations, derived colour scale), `colorpicker.html` (standalone color picker panel), `js/colorpicker.js` (`HLMColorPicker` module), `index.html` (`STYLE_boot`, `APPLY_SAVED_THEME_COLOR`, `applyThemeColor`, `holy.color.change` listener, `HLMColorPicker.init`), `js/main_UTILS.js` (`cy_getThemeVars`), `js/persistent-store.js` (`Holy.PERSIST` adapter), `js/panel_state.js` (`Holy.PanelState`)
**UI Section:** `#openThemePicker` button in the main panel controls bar opens the inline `HLMColorPicker` popup.

Holy Expressor uses an accent-driven CSS variable architecture where a single user-chosen hex color (`--G-color-1`) is decomposed into HSL components (`--G-color-1-H`, `-S`, `-L`) and an RGB triplet (`--G-colour-1-RGB`) at runtime via JavaScript. These primitives feed a derived colour scale of ~15 HSL/RGBA variants declared in `:root` that automatically cascade through every UI surface -- backgrounds, borders, text highlights, glows, and opacity layers -- across all three panels (main, quick access, color picker). When the user changes the accent color, JS writes the new primitives onto `document.documentElement.style`, and the CSS `calc()`-based derived variables update instantly without a stylesheet swap.

*For CSS variable naming conventions, see `Docs/CODE_STYLE.md`. For cross-panel state, see `Docs/ARCHITECTURE.md`.*

---

## 6.1 CSS Variable Architecture

The theming system is defined in the `:root` block of `css/styles.css` (lines 7-76). It operates on two tiers:

**Tier 1 -- JS-managed primitives (set at runtime, do not rename):**

| Variable | Role | Default |
|---|---|---|
| `--G-color-1` | Raw accent hex | `#7c6cfa` |
| `--G-color-1-H` | Hue (0-360) | `0` (overwritten by JS) |
| `--G-color-1-S` | Saturation (%) | `0%` (overwritten by JS) |
| `--G-color-1-L` | Lightness (%) | `0%` (overwritten by JS) |
| `--G-colour-1-RGB` | Comma-separated R, G, B | `0, 0, 0` (overwritten by JS) |

The CSS defaults of `0` are intentional placeholders; the `STYLE_boot` IIFE in each panel's HTML reads `--G-color-1`, converts it via `hexToRgb()` / `rgbToHsl()`, and writes the real values onto `document.documentElement.style` before first paint.

**Tier 2 -- Derived colour scale (pure CSS, auto-update):**

All derived variables use `hsl()` or `rgba()` with `calc()` multipliers against the Tier 1 primitives. The pattern is `hsl(H, S * factor, L * 2 * factor)` where the `* 2` accounts for the midpoint-relative lightness arithmetic:

- **Dark backgrounds:** `--G-color-1-dark-bg` (S*0.9, L*0.04), `--G-color-1-deepdark-bg` (S*1, L*0.02), `--G-color-1-lowsatdark-bg` (S*0.1, L*0.04)
- **Mid tones:** `--G-color-1-mid` (S*0.75, L*0.08), `--G-color-1-mid-2` (S*0.45, L*0.18), `--G-color-1-mid-3` (S*0, L*0.15), `--G-color-1-midup` (S*0.75, L*0.2)
- **Light tones:** `--G-color-1-midlight` (full S, L*0.3), `--G-color-1-midlight2` (full S, L*0.65), `--G-color-1-light` / `--G-color-1-offwhite` (full S, L*0.8)
- **Opacity layers (via RGB triplet):** `--G-colour-1-opac-75` through `--G-colour-1-opac-10`, `--G-colour-1-veil` (0.12 alpha)

**Design system tokens** live below the colour scale and reference it where needed:
- `--border-accent: rgba(var(--G-colour-1-RGB), 0.28)` -- the only design token that derives from the accent colour.
- Fixed tokens (`--bg-base`, `--bg-panel`, `--bg-surface`, `--text-primary`, etc.) are accent-independent and do not change with theme color.

Note: the codebase uses mixed British/American spelling (`colour` vs `color`). Both forms are load-bearing and must be preserved.

---

## 6.2 Color Picker Panel

There are two separate color picker implementations:

### 6.2.1 Inline HLMColorPicker (main panel)

`js/colorpicker.js` exports a global `HLMColorPicker` object with a drop-in API:

- **`HLMColorPicker.init(options)`** -- configures callbacks: `fetchSwatches(callback)`, `onApply(targetId, hex)`, `onReset(targetId)`, `onPreview(targetId, hex)`. Builds the popup DOM on first call (appended to `document.body`).
- **`HLMColorPicker.open(targetId, anchorEl, currentHex)`** -- shows the popup anchored below the given element, loads swatches, pre-fills the hex input.
- **`HLMColorPicker.close()`** -- hides the popup.
- **`HLMColorPicker.clearSwatchCache()`** -- invalidates cached swatch data.

In `index.html` (line ~692), on `DOMContentLoaded`, the `#openThemePicker` button initializes `HLMColorPicker` with:
- `onApply` / `onReset` / `onPreview` all route to `applyThemeColor(hex)`, which writes the five Tier 1 CSS variables onto `:root` and persists the hex to `localStorage` under key `he_themeColor`.

The popup layout (top to bottom): OK + Reset buttons, native OS color picker trigger + hex text input, swatch grid. Positioning spans full panel width with a 4px margin; flips above the anchor if insufficient vertical space.

### 6.2.2 Standalone Color Picker Panel (colorpicker.html)

`colorpicker.html` is registered as a separate CEP panel (`com.holy.expressor.colorpicker`) in `CSXS/manifest.xml`. It loads `css/styles.css`, `js/persistent-store.js`, `js/panel_state.js`, and `js/colorpicker.js`, plus its own inline `<script>` block.

The inline script defines local `hexToRgb()`, `rgbToHsl()`, `applyColor(hex)`, `resetColor()`, and `previewColor(hex)` functions. `applyColor()` writes CSS variables to the local panel's `:root` and then reaches back to the opener panel:

```js
if (window.opener && window.opener.Holy && window.opener.Holy.UI) {
  window.opener.Holy.UI.applyColorTheme(hex);
}
```

The default/reset color is `#7c6cfa`.

### 6.2.3 Cross-panel color sync via CSEvent

`index.html` registers a `CSInterface` listener on the `holy.color.change` event (two separate registrations at lines ~155 and ~819). When a `holy.color.change` event arrives with `{ hex: '#RRGGBB' }` payload:

1. Sets `--G-color-1` on `:root`.
2. Calls `window.updateDerivedVariables(root, hex)` to recalculate `--G-colour-1-RGB`, `--G-color-1-H/S/L`.
3. Persists via `Holy.PERSIST.set('he_themeColor', hex)` with `localStorage` fallback.

The quick access panel (`quickpanel.html`) does **not** currently listen for `holy.color.change` events. It applies the theme class (`theme-default`) from `localStorage` at boot via its own `STYLE_boot` IIFE but has no runtime color update listener.

---

## 6.3 Theme Persistence

Theme color is persisted under the key **`he_themeColor`** using a tiered storage strategy:

1. **`Holy.PERSIST`** (`js/persistent-store.js`) -- tries `CSInterface.setPersistentData()` first, then `window.__adobe_cep__.setPersistentData()`, then `localStorage`. The `get()` path follows the same fallback chain in priority order.
2. **Direct `localStorage`** fallback -- used in `colorpicker.html` and as a catch-all in `index.html` when `Holy.PERSIST` is unavailable.

**Boot sequence (index.html):**

1. `STYLE_boot` IIFE reads `--G-color-1` from CSS, converts to RGB/HSL, writes Tier 1 primitives. Exposes `assignDerivedVariables` as `window.updateDerivedVariables`.
2. `APPLY_SAVED_THEME_COLOR` IIFE reads `he_themeColor` from `Holy.PERSIST` (or `localStorage` fallback), sets `--G-color-1`, and calls `updateDerivedVariables()` to recalculate derived vars.

**Boot sequence (colorpicker.html / quickpanel.html):**

1. `STYLE_boot` reads `he_theme` from `localStorage`, adds class `theme-<name>` to `<html>`.
2. `colorpicker.html` additionally reads `he_themeColor` from `localStorage` to pre-fill the hex input.

**Theme class:** A separate key `he_theme` (distinct from `he_themeColor`) stores a theme class name (default: `'default'`). All three panels read this at boot and apply `theme-${name}` to `document.documentElement`. No UI currently exposes switching this value -- it is a forward-looking hook.

**Panel window position** is persisted separately by `js/panel_state.js` via `Holy.PanelState`. It saves `screenX`, `screenY`, `outerWidth`, `outerHeight` to `localStorage` under `holyExpressor_panel_<panelId>_pos` on `beforeunload` and restores on `DOMContentLoaded`. Panel ID is resolved from `document.title` (`'panel'`, `'quickpanel'`, or `'colorpicker'`).

**Flyover theming:** `cy_getThemeVars()` in `js/main_UTILS.js` reads computed CSS variables (`--G-color-1`, `-H`, `-S`, `-L`, `--G-colour-1-RGB`, `--G-color-1-deepdark-bg`, `--G-color-1-offwhite`) and returns them as a plain object for passing theme data to the external flyover panel.

---

## Open Bugs

*When a bug is resolved: apply `~~strikethrough~~` and add a Dev Log entry noting the fix. Do not delete.*

- Quick access panel (`quickpanel.html`) does not listen for `holy.color.change` CSEvents and has no `APPLY_SAVED_THEME_COLOR` boot step, so it will not reflect accent color changes made after panel open. It only picks up the theme class at boot.
- Duplicate `holy.color.change` listeners in `index.html` (lines ~155 and ~819) -- both fire on the same event, causing double processing of color updates. The first listener also persists to storage, the second does not, creating inconsistent side effects.
- `colorpicker.html` uses `window.opener.Holy.UI.applyColorTheme(hex)` for cross-panel communication, but `Holy.UI` (exported in `main_UI.js`) does not define an `applyColorTheme` method. This call will silently fail in the standalone color picker panel.

---

## Dev Log

- 1: Initial feature documentation created from AGENTS/ migration.
- 2: Moved color picker trigger out of the main panel. `#openThemePicker` button removed from `index.html` snippets controls bar. Color picker init block (`HLMColorPicker.init`, `applyThemeColor`, `hexToRgb`, `rgbToHsl`) and `colorpicker.js` defer-load removed from `index.html`. The VIBE button in `settings.html` now owns the picker: it loads `colorpicker.js`, initializes `HLMColorPicker`, applies color vars locally, persists to `localStorage`, and broadcasts `holy.color.change` CSEvent so the main panel updates live. The `connectColorSyncOnce` listener in `index.html` (and `__HolyExpressorColorChange`) remain intact and continue to handle the incoming event.
- 3: Replaced `HLMColorPicker` popup in `settings.html` with a fully embedded canvas-based HSV color picker. `colorpicker.js` removed from `settings.html` load order. Color broadcasting split into two functions: `_broadcastColor(hex)` (CSS var update + CSEvent, no persist — used for live drag preview) and `applyVibeColor(hex)` (same + `localStorage.setItem` — used only on final Apply). This ensures localStorage is never written during drag, only on explicit user confirmation. The `holy.color.change` CSEvent listener in `index.html` is unchanged and continues to receive all preview and apply events identically.

- 4: 2026-04-23 — **CodeMirror selection highlight uses accent color.** Added `.cm-selectionBackground` rule in `css/styles.css` using `rgba(var(--G-colour-1-RGB), 0.35)`. Previously the editor used CM6's default selection color (nearly invisible on the dark background). The highlight now follows the user's chosen accent color and updates live when the accent changes. Covers both `cm-focused` and unfocused states.
