# Holy Expressor — Pre-Ship Code Review

I've done a full read of: `index.html`, `quickpanel.html`, `styles.css`, `quickpanel.js`, `main_SEARCH_REPLACE.js`, `main_UI.js`, `main_SNIPPETS.js`, and all AGENTS docs. What follows is every issue I found, organised by severity and area.

---

## 🔴 CRITICAL — Ship-blockers

### 1. `main_UI.js` runs a debug dialog in AE on every panel load

Right inside `DOMContentLoaded`, this is executing unconditionally:

```javascript
const safe = encodeURIComponent("TEST_LOG");
cs.evalScript('NEW_log_showDialog("' + safe + '")', function(r) {
    console.log("[NEW_log] static test result:", r);
});
```

This will fire `NEW_log_showDialog` in After Effects every single time the main panel opens. If that JSX function exists, it will show a dialog in AE for every user. **Delete this block before shipping.**

---

### 2. `main_FLYO.js` is referenced but doesn't exist

Both `index.html` and `quickpanel.html` load `<script defer src="js/main_FLYO.js">`. This file is not in the project. Every panel load generates a silent 404. Similarly, `quickpanel.js` tries to evalFile `host_FLYO.jsx` which also doesn't exist.

**Fix:** Remove both `<script>` tags and remove `"/jsx/modules/host_FLYO.jsx"` from the `hostModules` array in `quickpanel.js`. If Flyover is future scope, stub them; if it's dead, bury it.

---

### 3. Duplicate `id="pickClickVeil"` in `index.html`

There are two elements with `id="pickClickVeil"` — one near the top of `<body>` and one inside `#modePanel`. Duplicate IDs are invalid HTML and will cause `document.getElementById('pickClickVeil')` to return the wrong one depending on context. **Remove the one that isn't wired to the current PickClick veil system.**

---

### 4. `#matchCase` checkbox doesn't exist

`main_SEARCH_REPLACE.js` calls `getCheckboxState("#matchCase", true)` but there is no `#matchCase` element anywhere in `index.html`. The function falls back to `true`, meaning **match-case is hardcoded on silently**. Either add the checkbox to the Rewrite UI, or remove the parameter and hard-code the intended default explicitly.

---

### 5. `persistent-store.js` not loaded in `quickpanel.html`

`quickpanel.html` does not include `persistent-store.js`, but `main_STATE.js` (which is loaded) depends on `Holy.PERSIST`. State saves in the quick panel silently fail — the bank selection and any per-session state aren't persisted. **Add `<script src="js/persistent-store.js">` before `main_STATE.js` in `quickpanel.html`'s script chain.**

---

## 🟠 HIGH — Causes visible bugs or broken behaviour

### 6. Express area overlay buttons — the jumbled layout

You flagged this yourself. The root cause is that `.express-editor-overlay` uses stacked `transform` hacks instead of a coherent flex layout. The structure is:

```
.express-editor-overlay (translateY(39%) translateX(17px))
  ├── #loadFromSelectionBtn  → standalone, translateX(6px)
  ├── .express-editor-overlay-checkbox → translateX(31.5px) translateY(4px) [z-index:10]
  └── .express-editor-overlay-buttons
        ├── #loadPathFromSelectionBtn → translateX(18px) [z-index:10]
        └── #editorClearBtn → translateY(-7px), height: 45px !important
```

`#loadFromSelectionBtn` is a sibling to the checkbox and buttons container rather than being inside `.express-editor-overlay-buttons` with the others. The checkbox uses `translateX(31.5px)` to jump right over the buttons, but that hardcoded pixel value breaks if the button sizes change. The `editorClearBtn` has `height: 45px !important` overriding the `--size: 20px` from the bespoke rule — resulting in an oversized hit area.

**The fix:** Put all three buttons into `.express-editor-overlay-buttons`. Replace all the `translateX`/`translateY` hacks on individual elements with `gap` and `align-items: center` on the flex container. The parent overlay's `translateY(39%) translateX(17px)` can stay since it positions the whole group, but the internals should be straight flex.

---

### 7. Search & Replace UI — CodeMirror fields too large and clear button off-position

The main panel's `#modeViewRewrite` has `height: 97px` — a fixed magic number. With two CodeMirror instances each having `minHeight: 24px` and `padding-top: 20px` on both wrappers, the fields are cramped but then the `#rewriteOverlay` (the clear button) is positioned with `transform: translateY(52px) translateX(38.4px) scale(0.7)` which pushes it off-panel and scales it down to 70%.

Concrete issues:

- `#rewriteOverlay`'s `scale(0.7)` makes it visually inconsistent with every other button in the panel. Remove the scale, use proper sizing.
- The `97px` fixed height on `#modeViewRewrite` will clip content on smaller panels. Change to `min-height: 97px` or let it be `height: auto`.
- Both `#rewriteSearchWrapper` and `#rewriteReplaceWrapper` have `padding-top: 20px` but their `>label.block-label` is visually hidden via `clip-path: inset(50%)` — the label is hidden but still consuming layout space. If the label is supposed to be screen-reader only, use `.sr-only`. If it should be visible, show it.

---

### 8. QuickPanel — `#quickPanelRoot` doesn't exist

`quickpanel.js` calls `document.getElementById("quickPanelRoot")` in both `forcePanelRepaint()` and `verifyPanelContainerVisibility()`. That ID is not in `quickpanel.html`. Both functions silently do nothing on every call. The entire cold-start repaint recovery system is disabled because the root element it targets doesn't exist.

**Fix:** Either add `id="quickPanelRoot"` to the `<body>` or the top-level wrapper in `quickpanel.html`, or target `document.body` in the repaint functions.

---

### 9. Quick panel opens twice on button click

In `main_UI.js`, the `quickAccessLaunchBtn` click handler calls `cs.requestOpenExtension("com.holy.expressor.quickpanel")` immediately and then again 800ms later via `setTimeout`. If the panel isn't open, this fires the open command twice — which in CEP is at minimum wasteful and at worst causes a double-init. The 800ms call was a warm-wake workaround. The proper solution is to check if the panel is already open before calling again.

---

### 10. The snippet sync between main panel and quick panel is one-directional and fragile

The quick panel's LiveSync listener watches for `com.holy.expressor.stateChanged` with `type === "banksChanged"`. You'd need to confirm the main panel actually dispatches this event with exactly that shape whenever banks are modified. From the code visible, it's plausible this event is dispatched, but the payload shape isn't guaranteed — and if the main panel's dispatch uses a different type string, the quick panel never updates. This is the root of the async behaviour you described.

**My recommendation on the quick panel question:** The concept is sound (proximity to cursor, quick fire), but the implementation has too many moving parts (separate module initialisation, bridge re-priming, state sync events, layout recovery timers). Given you're going to ship the main plugin first — cut the quick panel from the initial release. Add it in v1.1 properly. The QckPnl button can remain but show a "coming soon" toast or stay hidden. The complexity-to-value ratio right now is unfavourable.

---

## 🟡 MEDIUM — Polish & correctness issues

### 11. `.customSearch-Master` CSS class case mismatch

In `styles.css`:

```css
.customSearch-Master { position: relative; transform: translateY(-30px); }
```

In `index.html`:

```html
<div id="customSearch-Master" class="customSearch-master">
```

CSS class names are case-sensitive. `.customSearch-Master` ≠ `.customSearch-master`. The `translateY(-30px)` is never applied. Fix the CSS to `.customSearch-master` (lowercase m).

---

### 12. `.circle-btn` has an invalid hex colour

```css
border: solid #8a8a8ab !important;
```

`#8a8a8ab` is 7 characters — not a valid hex. The extra `b` is a typo. Should be `#8a8a8a`.

---

### 13. `.foreground-panel-box` has `max-width: -135px`

```css
max-width: -135px;
```

Negative `max-width` is invalid CSS and will be ignored. This is likely a leftover from an old `-135px` margin or offset that got into the wrong property. The box presumably has no effective width constraint, which may be fine, but the rule should be removed or corrected.

---

### 14. Duplicate CSS rules — `rewrite-label-replace` and `rewrite-label-search`

Both `.rewrite-label-search` and `.rewrite-label-replace` are each defined twice in `styles.css` with identical rules. The second definition silently overrides the first. Clean these up to one definition each.

---

### 15. Redundant CSS variable — `--G-color-1-mid-4` is a clone of `--G-color-1-mid-2`

```css
--G-color-1-mid-2: hsl(..., calc(var(--G-color-1-L) * 2 * 0.18));
--G-color-1-mid-4: hsl(..., calc(var(--G-color-1-L) * 2 * 0.18));
```

Same formula. One of these is dead. Similarly `--G-colour-1-light` is an alias of `--G-color-1-light` — the `colour` (British) vs `color` (American) split in naming is inconsistent throughout. Pick one and consolidate.

---

### 16. Broken SVG `xmlns` in expand/collapse button

In `index.html`, the expand icon SVG:

```html
<svg xmlns="http://www.w3 .org/2000/svg" ...>
```

There's a space in the URL (`www.w3 .org`). The SVG will likely still render in the CEP Chromium runtime, but it's technically malformed. Remove the space.

---

### 17. `SNIPPETS_PER_BANK` leaks to global scope

In `main_SNIPPETS.js`:

```javascript
const SNIPPETS_PER_BANK = 3;  // declared OUTSIDE the IIFE
```

This is the only `const` in the file that lives outside the module's IIFE, polluting the global scope. Move it inside the IIFE, or attach it as `Holy.SNIPPETS.SNIPPETS_PER_BANK` (which is already done redundantly later).

---

### 18. Empty skeleton elements in `index.html`

These exist in the DOM but contain nothing and serve no function:

- `<header class="hdr hide-when-editor-maximized"><h2></h2></header>` — empty heading
- `<section class="tabs hide-when-editor-maximized">` — completely empty section

If they're placeholders, comment them as such. If they're dead, remove them.

---

### 19. `#modeViewExpress` panel div is empty

`<div id="modeViewExpress" ...>` is an empty panel. The actual code editor (`#codeEditor`) is a sibling outside it in `.he-mode-views`. This `div` may be a layout relic from an earlier iteration when express content lived inside it. Verify whether it's needed for any JS selector or `aria-controls` attribute, and remove it if not.

---

### 20. `btn-clearSVG #bankSelectBtn` selector does nothing

In `styles.css`:

```css
.btn-clearSVG #bankSelectBtn {
  transform: scale(10px) translateZ(0);
}
```

`#bankSelectBtn` **is** the `.btn-clearSVG` element in `index.html` — it's not a descendant of another one. This descendant selector will never match anything. Additionally `scale(10px)` is not a valid value for `scale()` — it takes a unitless number. This entire rule block is dead.

---

## 🔵 LOW — Minor polish, housekeeping

**21.** The large commented-out blocks in `index.html` (`<!-- #TargetBox -->`, `<!-- #expressMisc -->`, the rewrite underlay fragment, `<!-- applyTargetBtn -->`) should be deleted rather than commented out. They add ~60 lines of noise to the HTML.

**22.** The `quickpanel.html` bank header uses `class="Dd-blank"` for the bank selector button (triangle dropdown icon), while the main panel uses `class="btn-clearSVG"` with a diamond icon. These are inconsistently styled. The quick panel looks different from the main panel for the same UI element. Harmonise them.

**23.** `window.HX_LOG_MODE = "verbose"` is set in `main_UI.js` and read in `main_SNIPPETS.js` as `var HX_LOG_MODE = window.HX_LOG_MODE || "verbose"`. This is a global flag for logging verbosity. Before shipping, this should be set to `"silent"` or removed, unless you want verbose console output in production.

**24.** The `main_UI.js` `ensureHostReady` function uses default parameter syntax (`attempts = 0`) which is ES6. The AGENTS doc warns about ES3 reserved-word traps but doesn't address the broader ES3/ES5 question for ExtendScript. This is in the CEP JS side (not JSX), so it's fine — Chromium handles ES6 — but worth noting for consistency if there's ever a copy-paste into JSX.

**25.** The `#deleteExpressionsBtn` has `transform: translateX(24px)` — another positional hack. It should be placed correctly in the DOM layout rather than translated manually.

**26.** `apply-btn` class exists in CSS but the button in `index.html` uses `btn-primary` — the old `apply-btn` class is dead CSS.

---

## Summary hit-list for shipping

|Priority|Fix|
|---|---|
|🔴|Delete the `NEW_log_showDialog` test call in `main_UI.js`|
|🔴|Remove both `main_FLYO.js` references from HTML and `host_FLYO.jsx` from quickpanel.js|
|🔴|Fix or remove duplicate `#pickClickVeil`|
|🔴|Fix or add `#matchCase` checkbox in rewrite panel|
|🔴|Add `persistent-store.js` to `quickpanel.html`|
|🟠|Refactor express overlay button layout to proper flex (no stacked transforms)|
|🟠|Fix search/replace `#rewriteOverlay` position (remove `scale(0.7)`, fix fixed height)|
|🟠|Add `id="quickPanelRoot"` to `quickpanel.html` or retarget repaint functions|
|🟠|Eliminate the double `requestOpenExtension` call|
|🟡|Fix `.customSearch-Master` → `.customSearch-master` case|
|🟡|Fix `#8a8a8ab` hex typo in `.circle-btn`|
|🟡|Remove `max-width: -135px` from `.foreground-panel-box`|
|🟡|Deduplicate `rewrite-label-*` CSS rules|
|🟡|Remove empty `<header>`, `<section class="tabs">`, `#modeViewExpress` if dead|
|🟡|Move `SNIPPETS_PER_BANK` inside its IIFE|
|🔵|Set `HX_LOG_MODE = "silent"` for production|
|🔵|Delete commented-out dead HTML blocks|
|🔵|Fix `xmlns` space typo in expand button SVG|
|🔵|Harmonise quick panel bank button styling with main panel|

The five 🔴 items are the only true ship-blockers. The 🟠 items include your three flagged UX problems. The rest are polish that can ship or follow quickly in a patch. Want me to start cutting fixes? I'd suggest starting with the 🔴 block and the overlay button refactor.