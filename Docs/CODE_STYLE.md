# Code Style

Read this when creating or editing HTML, CSS, or JS files.

---

## Region Markers

All HTML and CSS files use emoji `#region` / `#endregion` markers. Apply to every file.

**HTML:**
```html
<!-- ────────────────────────────────────────────── -->
<!-- #region 🟢🟢🟢 SECTION NAME
─────────────────────────────────────────────────── -->

<!-- content -->

<!-- #endregion
───────────────
─────────────────────────────────────────────────── -->
```

**CSS:**
```css
/* ────────────────────────────────────────────── */
/* #region 🎨🎨🎨 SECTION NAME
─────────────────────────────────────────────────── */

/* #endregion
───────────────
─────────────────────────────────────────────────── */
```

Rules: three identical emojis, vary emoji between sections, name in CAPS, regions stack directly (no blank lines between `#endregion` and next `#region`).

**Standard CSS section order:**
1. `🎨🎨🎨 COLOR VARIABLES`
2. `📐📐📐 LAYOUT TOKENS`
3. `🌍🌍🌍 BASE ELEMENTS`
4. `🔘🔘🔘 BUTTON STYLES`
5. `⚡️⚡️⚡️ ANIMATIONS & EFFECTS`

---

## CSS Architecture

- All colours in `:root` as `var(--holy-*)` tokens. No inline hex/rgb/hsl in classes.
- Variable names describe **slot**, not value: `--holy-primary`, not `--holy-pink`.
- Exception: monochrome values may be named descriptively (`--holy-void`, `--holy-white`).
- Three-variant pattern for every interactive element:
  ```css
  --holy-[slot]-base     /* primary state */
  --holy-[slot]-dark     /* dark fill */
  --holy-[slot]-boost    /* hover/active */
  ```
- `border-radius: 0px` everywhere. No exceptions.
- Button default: bright stroke + dark fill + bright icon.
- Button hover: bright fill + boosted stroke + dark icon.
- Theme colours derive from a single root hex `--G-color-1`. Derived HSL/RGB tokens (`--G-colour-1-RGB`, `--G-color-1-H`, etc.) are computed at boot and on `holy.color.change` events. Never hard-code a derived value — always reference the token.

---

## SVG

- Flat structure only — no `<g>` tags (exception: checkbox SVGs may use a single `<g>` for grouping the checked/unchecked states).
- Every `<svg>` gets `id="[category]-[descriptor]"`.
- `fill` / `stroke` set as attributes; overridden via CSS vars at runtime.
- All SVGs originate from **Adobe Illustrator** exports. Preserve structural attributes (`stroke-linecap`, `stroke-linejoin`, `stroke-miterlimit`) exactly as exported. Only `fill`, `stroke`, and `stroke-width` are overridden.
- `btn-icon` goes in the SVG class for button icons.
- Use `fill="currentColor"` for solid elements. Use `fill="none"` for transparent backgrounds. Lines do not require fills.
- `stroke-width` and `stroke` must never appear in inline HTML — handle exclusively in CSS.
- `.btn-clearSVG` is the standard class for SVG buttons. Do not edit its CSS directly. If further rules are needed, add an appendage class below the existing block:
  ```css
  .btn-clearSVG .new-class-example {
    example contents;
  }
  ```
- Coordinate attributes (`x`, `y`, `width`, `height`, `d`) stay compact on **one line** per shape. Only split when defining multiple distinct coordinate sets.

### Three-Part SVG Elements

Used for scalable frames (e.g., the custom search box). Structure: three independent `<svg>` elements in a flex row — fixed left cap, flexible mid section, fixed right cap. Never merge into a single SVG or use `<g>` groups.

- Left/right caps: `flex: 0 0 auto;` with fixed Illustrator widths.
- Mid section: `flex: 1 1 auto; min-width: 0;` with `preserveAspectRatio="none"`.
- Mid lines require `vector-effect="non-scaling-stroke"` and `shape-rendering="geometricPrecision"`.
- No JS-driven resizing — all geometry is CSS flex-driven.
- Class naming: `[identifier]-left`, `[identifier]-mid`, `[identifier]-right`.

See `EXAMPLES.md` for full three-part SVG markup and CSS patterns.

---

## Spacing

- Grid base unit: `4px`.
- Top-level containers: `0px` margin/padding.
- Internal sub-elements: `4px` or `8px` gaps only.
- Minimum hit target: `32x32px`.

---

## Typography

- UI / data text: `JetBrains Mono`
- Display / headers: `Arial Black`

---

## JavaScript Conventions

### Module Pattern

Every JS file is an **IIFE** that attaches exports to the global `Holy` namespace. No ESModules, `import`/`export`, or bundlers.

```js
if (typeof Holy !== "object") Holy = {};

(function () {
  "use strict";

  var cs = new CSInterface();
  var HX_LOG_MODE = window.HX_LOG_MODE || "verbose";

  // ... internal logic ...

  Holy.MODULE_NAME = { publicFn1, publicFn2 };
})();
```

Rules:
- Always check `if (typeof Holy !== "object") Holy = {};` before the IIFE.
- Attach exports with `Holy.<ModuleName> = { ... }`.
- Never assign to `window` or create global vars (exception: `window.HX_LOG_MODE`, `window.editor`, `window.updateDerivedVariables` are established globals).
- Expose only what other modules need.
- `"use strict"` at the top of every IIFE.

### Naming

- Module names on `Holy` are **UPPER_CASE**: `Holy.UTILS`, `Holy.EXPRESS`, `Holy.SNIPPETS`, `Holy.UI`, `Holy.MENU`, `Holy.BUTTONS`, `Holy.DEV_INIT`.
- Internal/private functions use `cy_` or `PORTAL_` prefixes for scoped helpers (e.g., `cy_createForegroundPanel`, `PORTAL_getCurrentExpression`).
- Public functions accessed cross-module use descriptive camelCase: `Holy.UTILS.cy_getThemeVars()`, `Holy.EXPRESS.HE_applyByStrictSearch()`.
- DOM helper shorthands: `DOM(sel)` wraps `document.querySelector`, `allDOM(sel)` wraps `document.querySelectorAll`.
- Constants within IIFEs use `UPPER_SNAKE_CASE` (e.g., `SNIPPETS_PER_BANK`).
- ID generators produce prefixed unique strings: `"snip-" + Date.now().toString(36) + ...`.

### Accessing Other Modules

```js
Holy.UTILS.cy_getThemeVars();
Holy.EXPRESS.HE_applyByStrictSearch();
Holy.MENU.contextM_disableNative();
Holy.UI.toast("message");
Holy.UI.DOM("#elementId");
```

### Logging

- Use `console.log()` / `console.warn()` — visible only in Chrome DevTools (CEP debug port).
- Never use `$.writeln()` or AE Console targets from CEP JS.
- `window.HX_LOG_MODE` controls log density: `"verbose"` for full tracing, `"quiet"` or `"silent"` for minimal output. Check before emitting non-critical logs.
- Debug messages from the host side arrive via the `com.holyexpressor.debug` CSEvent.

### Error Handling

- Wrap risky operations in `try/catch`. Never let an error propagate to break the panel.
- Fallback silently or show a toast via `Holy.UI.toast()` — never use blocking `alert()` or `confirm()` dialogs in CEP.
- Customer-facing log helper (`NEW_forCustomer_emit`) must never throw — wrap its body in `try/catch`.
- Host readiness is not guaranteed at panel load. Use retry patterns (e.g., `ensureHostReady()`) when calling `evalScript` at startup.

### Load Order

Scripts load sequentially from `index.html`. The order matters — each module may depend on earlier ones.

```
CSInterface.js          (Adobe SDK — never modify)
persistent-store.js     (persistence adapter)
json2.js                (ExtendScript JSON polyfill — never modify)
codemirror-bundle.js    (CodeMirror 6 editor)
main_UTILS.js           (utility + I/O helpers)
main_STATE.js           (state management)
main_MENU.js            (context menus)
main_UI.js              (DOM binding, CSInterface, mode switching)
main_EXPRESS.js         (expression + CodeMirror logic)
main_PICKCLICK.js       (selection-driven pick mode)
main_BUTTON_LOGIC_1.js  (button handlers)
main_SNIPPETS.js        (snippet banks + presets)
main_SEARCH_REPLACE.js  (search & replace in expressions)
colorpicker.js          (color picker support)
main_BG.js              (background tasks)
main_DEV_INIT.js        (bootstrap — loads JSX, inits UI + CodeMirror)
main.js                 (legacy placeholder — do not modify)
```

New modules go **before** `main_DEV_INIT.js` and export via `Holy`.

### Event System

- Internal communication uses DOM events or CSInterface events.
- Custom events follow namespace `com.holy.expressor.*` (e.g., `com.holyexpressor.debug`, `com.holy.expressor.applyLog.update`).
- Theme changes propagate through `holy.color.change` CSEvents.
- Register listeners via `window.addEventListener()` or `cs.addEventListener()`.
- Use single-run guards to prevent duplicate listener binding.

---

## CEP-to-ExtendScript Bridge (`evalScript`)

### Calling Pattern

All host communication goes through `CSInterface.evalScript()`:

```js
var cs = new CSInterface();
cs.evalScript("hostFunctionName(arg1, arg2)", function (result) {
  // result is always a string — parse if JSON
});
```

Rules:
- `evalScript` returns are always **strings**. Parse JSON results explicitly.
- For string arguments, escape inner quotes: `cs.evalScript('hostFn("' + escaped + '")')`.
- Never chain synchronous evalScript calls expecting sequential execution — use callbacks.
- Invalid or empty ExtendScript return payloads should trigger error toasts, not silent failures.

### JSX Load Sequence

Handled by `main_DEV_INIT.js -> loadJSX()`. Files load via `$.evalFile()`:

```
host_UTILS.jsx
host_MAPS.jsx
host_GET.jsx
host_PICKCLICK.jsx
host_APPLY.jsx
host_DEV.jsx
host.jsx
host_AGENT_API.jsx
```

Maintain this order when editing `loadJSX()`. Path escaping for Windows uses `(base + rel).replace(/\\\\/g, "\\\\\\\\")`.

---

## ExtendScript (JSX) Conventions

### Naming

- Functions use a **prefix convention** that identifies the layer:
  - `he_P_` — Apply-layer functions (expression application, property writing)
  - `he_U_` — Utility-layer functions (helpers, lookups, property traversal)
  - `holyAPI_` — Agent API surface (callable from external integrations)
- Sub-prefixes add specificity: `he_U_SC_` (selection scope), `he_U_Ls_` (layer styles), `he_U_EX_` (expression utilities), `he_U_SS_` (selection summary).

### Language Constraints

- ExtendScript is **ES3**. No `let`, `const`, arrow functions, template literals, `.trim()`, `.includes()`, `.startsWith()`, destructuring, or spread.
- Use `var` for all declarations.
- String manipulation must use `indexOf`, `substring`, manual loops — no modern String methods.
- JSON operations require the `json2.js` polyfill (loaded first via `$.evalFile`).

### Error Handling

- Wrap all property access in `try/catch` — AE properties can throw on read.
- Layer/property iteration must guard against phantom (non-instantiated) properties.
- Nested `try/catch` with empty catch blocks is acceptable for defensive property reads:
  ```jsx
  var mm = ""; try { mm = g.matchName || ""; } catch(e) {}
  ```
- Never use blocking dialogs (`alert()`) from JSX in production — they freeze AE.
- Use `$.writeln()` only in dev/debug JSX modules, never from production host code.

### Structure

- JSX files do not use IIFEs or namespaces. Functions are declared at the global ExtendScript scope.
- Each `host_*.jsx` module covers a single responsibility (see module table in `ARCHITECTURE.md`).
- Shared helpers (e.g., scope utilities) are placed in whichever module loads first in the chain to ensure availability.

---

## HTML Structure

### Document Layout

- `index.html` is the single entry point for the main panel. It contains:
  1. `<head>` with CSS, CSInterface, inline boot scripts, CodeMirror bundle, then deferred JS modules.
  2. `<body>` with a root `<div id="appRoot" class="appRoot">` wrapping all panel content.
- Secondary panels (`quickpanel.html`, `colorpicker.html`) follow the same pattern with their own script loads.

### Conventions

- All `<script>` tags for plugin modules use the `defer` attribute (except CSInterface and inline boot scripts which are synchronous).
- CSS loads before any JS: `<link rel="stylesheet">` appears before `<script>` tags.
- Inline `<script>` blocks in `<head>` handle theme boot, color sync listeners, and derived variable setup. These are self-executing IIFEs, not module exports.

### Button Markup

Standard SVG button pattern:
```html
<button
id="[descriptive-id]"
class="btn-clearSVG"
type="button"
title="[tooltip text]"
aria-label="[accessible label]"
>
  <svg
  class="btn-icon"
  viewBox="[Illustrator viewBox]"
  >
    <path
      d="[coordinates on one line]"
      fill="currentColor"
      stroke-miterlimit="[value]">
    </path>
  </svg>
</button>
```

Rules:
- Each attribute on its own line for readability.
- Coordinate data stays compact (one line per shape).
- `aria-label` and `title` required on all interactive elements.
- Checkbox inputs wrap in `<label>` with the SVG icon adjacent to the `<input>`.

### ID and Class Naming

- IDs are descriptive camelCase: `bankSelectBtn`, `exprInput`, `pickClickVeil`.
- Layout wrappers use descriptive kebab-case classes: `controls-toggle-group`, `foreground-panel-backdrop`.
- Visibility classes: `hide-when-editor-maximized` for elements that collapse in maximized mode.
- Panel sections use semantic `id` attributes that match their JS references (e.g., `DOM("#snippetsBar")`).

### Formatting

- Match the indentation, line breaks, and element spacing shown in existing markup.
- Do not condense multiple tags or attributes onto a single line.
- Readability and visual hierarchy take priority over file size.
