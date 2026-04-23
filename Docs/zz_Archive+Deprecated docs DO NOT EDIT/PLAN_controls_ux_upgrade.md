# PLAN: Controls UX Upgrade — Snippet Manager + Visual Indicators

**Status:** READY TO IMPLEMENT  
**Scope:** `main_SNIPPETS.js`, `index.html`, `css/styles.css`  
**Goal:** Make the Controls system visible, discoverable, and manageable.

---

## Overview of Changes

Three discrete deliverables:

1. **Controls icon** — SVG icon sits next to the `snipLoadControls` checkbox. Styled with the theme's midlight colour.
2. **Snippet button indicator bar** — a slim bottom bar on any snippet button that has controls data saved. Colour derived from theme. Edge buttons get curved corners.
3. **Snippet Manager overlay** — launched by a new icon button to the right of the checkbox. Full foreground panel showing all snippets per bank with editable fields and controls data.

---

## Deliverable 1: Controls Icon + Manager Launch Button

### Where
`index.html`, inside `#bankHeader`, wrapping the existing `<label class="checkbox-layercontrols ...">` and a new manager button.

### What
Wrap both into a flex group:

```html
<div class="controls-toggle-group">

  <!-- existing checkbox label — no internal changes -->
  <label class="checkbox-layercontrols checkbox-Diamond" title="Load controls with snippet">
    <input id="snipLoadControls" type="checkbox">
    <!-- existing SVG unchanged -->
  </label>

  <!-- NEW: open Snippet Manager -->
  <button id="openSnippetManager" class="btn-icon-only controls-manager-btn" title="Snippet Manager">
    <svg class="btn-icon" viewBox="0 0 10 10" fill="none" stroke="currentColor"
         stroke-width="1.1" stroke-linecap="round">
      <line x1="1" y1="2.5" x2="9" y2="2.5"/>
      <circle cx="3.5" cy="2.5" r="1" fill="currentColor" stroke="none"/>
      <line x1="1" y1="5" x2="9" y2="5"/>
      <circle cx="6.5" cy="5" r="1" fill="currentColor" stroke="none"/>
      <line x1="1" y1="7.5" x2="9" y2="7.5"/>
      <circle cx="4" cy="7.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  </button>

</div>
```

The icon is a three-line "sliders" motif — three horizontal rules each with a small filled circle at a different x position. Visually signals "controls" / "adjustable parameters". Agent may refine the SVG path if a better icon is available.

### Colour
Both the checkbox icon and manager button inherit `currentColor` from their parent region. No special override needed — they'll render at the same muted tone as the other bank header icons. On hover the manager button brightens to `--G-color-1` (same as `bankSelectBtn`).

### CSS (add to `styles.css`)
```css
.controls-toggle-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.controls-manager-btn {
  color: var(--G-color-1-midlight);
}
.controls-manager-btn:hover {
  color: var(--G-color-1);
}
```

---

## Deliverable 2: Snippet Button — Has-Controls Indicator Bar

### Concept
A slim (2px) horizontal bar pinned to the bottom of each `.snippet-btn` that has at least one effect saved. Colour: `--G-color-1-midlight` — a slightly lighter/more saturated tone derived from the theme's HSL values, not a hard-coded alien colour. It's tonally consistent with the plugin but visually distinct enough to be read at a glance.

On the first button (index 0) the bar has `border-bottom-left-radius` matching the container. On the last button (index 2) it has `border-bottom-right-radius`. Middle button: square ends.

### CSS (add to `styles.css`)
```css
/* === Controls-loaded indicator bar === */
.snippet-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--G-color-1-midlight);
  opacity: 0;
  transition: opacity var(--transition);
  pointer-events: none;
  border-radius: 0;
}

.snippet-btn.has-controls::after {
  opacity: 1;
}

.snippet-btn:first-child::after {
  border-bottom-left-radius: var(--radius-sm);
}

.snippet-btn:last-child::after {
  border-bottom-right-radius: var(--radius-sm);
}
```

> ⚠️ `.snippet-btn` already has `position: relative` and `overflow: hidden`. If the bar gets clipped, add `overflow: visible` to `.snippet-btn` — but verify first; `overflow: hidden` may be needed for label text overflow, in which case keep it and just accept the bar is flush to the edge without radius.

### JS (`main_SNIPPETS.js` — inside `renderSnippets()`)

In the `renderable.forEach(...)` loop, immediately after `btn.dataset.id = snippetId;`:

```js
// Mark button if snippet has saved controls
const hasControls = snippet.controls
  && Array.isArray(snippet.controls.effects)
  && snippet.controls.effects.length > 0;
if (hasControls) btn.classList.add("has-controls");
```

This is the only JS change for this deliverable. Because `renderSnippets()` is already called by `cy_setActiveBank`, `cy_loadBanksFromDisk`, and the Holy Agent `banksUpdated` listener — all those paths will automatically reflect controls state. No extra wiring needed.

---

## Deliverable 3: Snippet Manager Overlay

### Launch
Wire `#openSnippetManager` click in the `DOMContentLoaded` block inside `main_SNIPPETS.js`, alongside the existing `bankBinder()` and `renderBankHeader()` calls:

```js
const managerBtn = doc.getElementById("openSnippetManager");
if (managerBtn && !managerBtn.dataset.cyBound) {
  managerBtn.dataset.cyBound = "1";
  managerBtn.addEventListener("click", () => cy_openSnippetManager());
}
```

### `cy_openSnippetManager()` — new function

Place near `openSnippetEditUI` in `main_SNIPPETS.js`. Uses the existing `Holy.UTILS.cy_createForegroundPanel(id, opts)` factory (defined in `main_UTILS.js:34`).

#### Panel skeleton

```js
function cy_openSnippetManager() {
  const doc = cy_resolveDoc();

  const bankOptions = Holy.SNIPPETS.banks.map(b =>
    `<option value="${b.id}" ${b.id === Holy.SNIPPETS.activeBankId ? 'selected' : ''}>${b.name}</option>`
  ).join('');

  const panel = Holy.UTILS.cy_createForegroundPanel("snippetManagerPanel", {
    title: "Snippet Manager",
    width: "340px",
    innerHTML: `
      <div class="sm-bank-row">
        <label class="sm-section-label">Bank</label>
        <select id="smBankSelect" class="sm-bank-select">${bankOptions}</select>
      </div>
      <div id="smSnippetRows"></div>
      <div class="sm-manager-footer">
        <button id="smCancelBtn" class="button">Cancel</button>
        <button id="smSaveBtn" class="btn snippet-editor-save">Save</button>
      </div>
    `
  });

  function smRenderRows(bankId) {
    const bank = Holy.SNIPPETS.banks.find(b => b.id === bankId);
    if (!bank) return;
    normalizeBankSnippets(bank);
    const container = panel.querySelector("#smSnippetRows");
    container.innerHTML = "";
    bank.snippets.forEach((snip, si) => {
      cy_normalizeSnippet(snip);
      container.appendChild(smBuildSnippetRow(snip, si));
    });
  }

  smRenderRows(Holy.SNIPPETS.activeBankId);

  panel.querySelector("#smBankSelect").addEventListener("change", function () {
    smRenderRows(Number(this.value));
  });

  panel.querySelector("#smSaveBtn").addEventListener("click", () => {
    smCommitChanges(panel);
    cy_saveBanksToDisk();
    Holy.SNIPPETS.renderSnippets();
    panel.remove();
    if (Holy.UI && Holy.UI.toast) Holy.UI.toast("Snippet Manager: saved");
  });

  panel.querySelector("#smCancelBtn").addEventListener("click", () => panel.remove());
}
```

#### `smBuildSnippetRow(snip, index)` — helper

```js
function smBuildSnippetRow(snip, index) {
  const doc = cy_resolveDoc();
  const row = doc.createElement("div");
  row.className = "sm-snippet-row";
  row.dataset.snipId = snip.id;

  const nameLabel = doc.createElement("div");
  nameLabel.className = "sm-section-label";
  nameLabel.textContent = `Snippet ${index + 1}`;
  row.appendChild(nameLabel);

  const nameInput = doc.createElement("input");
  nameInput.type = "text";
  nameInput.className = "sm-snip-name snippet-editor-input";
  nameInput.value = snip.name;
  nameInput.dataset.snipId = snip.id;
  row.appendChild(nameInput);

  const exprLabel = doc.createElement("div");
  exprLabel.className = "sm-section-label";
  exprLabel.textContent = "Expression";
  row.appendChild(exprLabel);

  const exprInput = doc.createElement("textarea");
  exprInput.className = "sm-snip-expr snippet-editor-textarea";
  exprInput.value = snip.expr;
  exprInput.dataset.snipId = snip.id;
  exprInput.rows = 2;
  row.appendChild(exprInput);

  const ctrlLabel = doc.createElement("div");
  ctrlLabel.className = "sm-section-label";
  ctrlLabel.textContent = "Controls";
  row.appendChild(ctrlLabel);

  const effects = (snip.controls && Array.isArray(snip.controls.effects))
    ? snip.controls.effects : [];

  if (effects.length === 0) {
    const noCtrl = doc.createElement("span");
    noCtrl.className = "sm-no-controls";
    noCtrl.textContent = "No controls saved";
    row.appendChild(noCtrl);
  } else {
    effects.forEach((fx, ei) => {
      const fxEl = doc.createElement("div");
      fxEl.className = "sm-effect-entry";

      const fxName = doc.createElement("div");
      fxName.className = "sm-effect-name";
      fxName.textContent = fx.name || fx.matchName;
      fxEl.appendChild(fxName);

      (fx.properties || []).forEach((prop, pi) => {
        const propRow = doc.createElement("div");
        propRow.className = "sm-prop-row";

        const propName = doc.createElement("span");
        propName.className = "sm-prop-name";
        propName.textContent = prop.name;
        propRow.appendChild(propName);

        const isNumeric = typeof prop.value === "number";
        const valInput = doc.createElement("input");
        valInput.type = isNumeric ? "number" : "text";
        valInput.className = "sm-prop-value";
        valInput.value = isNumeric ? prop.value : JSON.stringify(prop.value);
        valInput.dataset.effectIdx = ei;
        valInput.dataset.propIdx = pi;
        valInput.dataset.snipId = snip.id;
        propRow.appendChild(valInput);

        if (prop.expression) {
          const exprLbl = doc.createElement("span");
          exprLbl.className = "sm-prop-expr-label";
          exprLbl.textContent = "expr:";
          propRow.appendChild(exprLbl);

          const exprIn = doc.createElement("input");
          exprIn.type = "text";
          exprIn.className = "sm-prop-expr";
          exprIn.value = prop.expression;
          exprIn.dataset.effectIdx = ei;
          exprIn.dataset.propIdx = pi;
          exprIn.dataset.snipId = snip.id;
          propRow.appendChild(exprIn);
        }

        fxEl.appendChild(propRow);
      });

      row.appendChild(fxEl);
    });
  }

  return row;
}
```

#### `smCommitChanges(panel)` — write inputs back to in-memory data

```js
function smCommitChanges(panel) {
  const selectedBankId = Number(panel.querySelector("#smBankSelect").value);
  const bank = Holy.SNIPPETS.banks.find(b => b.id === selectedBankId);
  if (!bank) return;

  panel.querySelectorAll(".sm-snippet-row").forEach(row => {
    const snipId = row.dataset.snipId;
    const snip = bank.snippets.find(s => String(s.id) === String(snipId));
    if (!snip) return;

    const nameEl = row.querySelector(".sm-snip-name");
    if (nameEl && nameEl.value.trim()) snip.name = nameEl.value.trim();

    const exprEl = row.querySelector(".sm-snip-expr");
    if (exprEl) snip.expr = exprEl.value;

    row.querySelectorAll(".sm-prop-value").forEach(input => {
      const ei = Number(input.dataset.effectIdx);
      const pi = Number(input.dataset.propIdx);
      const fx = snip.controls && snip.controls.effects && snip.controls.effects[ei];
      const prop = fx && fx.properties && fx.properties[pi];
      if (!prop) return;
      prop.value = input.type === "number" ? Number(input.value) : input.value;
    });

    row.querySelectorAll(".sm-prop-expr").forEach(input => {
      const ei = Number(input.dataset.effectIdx);
      const pi = Number(input.dataset.propIdx);
      const fx = snip.controls && snip.controls.effects && snip.controls.effects[ei];
      const prop = fx && fx.properties && fx.properties[pi];
      if (!prop) return;
      prop.expression = input.value;
    });
  });
}
```

### CSS for Snippet Manager (add to `styles.css`)

```css
/* ===================================================== */
/* Snippet Manager overlay                               */
/* ===================================================== */

.sm-bank-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.sm-bank-select {
  flex: 1;
  padding: 3px 6px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 11px;
}

.sm-snippet-row {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: var(--G-color-1-lowsatdark-bg);
}

.sm-snippet-row + .sm-snippet-row { margin-top: 6px; }

.sm-section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.sm-no-controls {
  font-size: 10px;
  color: var(--text-faint);
  font-style: italic;
}

.sm-effect-entry {
  padding-top: 4px;
  border-top: 1px solid var(--border-subtle);
}

.sm-effect-name {
  font-size: 10px;
  font-weight: 600;
  color: var(--G-color-1-midlight);
  margin-bottom: 3px;
}

.sm-prop-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.sm-prop-name {
  color: var(--text-muted);
  min-width: 80px;
  flex-shrink: 0;
}

.sm-prop-value {
  width: 60px;
  padding: 2px 4px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 10px;
}

.sm-prop-expr-label { color: var(--text-faint); font-size: 9px; }

.sm-prop-expr {
  flex: 1;
  min-width: 80px;
  padding: 2px 4px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--G-color-1-midlight);
  font-size: 10px;
  font-family: monospace;
}

.sm-manager-footer {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
}
```

---

## Implementation Order & File Touch Map

| Step | File | What to do |
|------|------|------------|
| 1 | `index.html` | Wrap existing checkbox label + add `#openSnippetManager` button inside a new `.controls-toggle-group` div |
| 2 | `css/styles.css` | Add: `.controls-toggle-group`, `.controls-manager-btn`, `.snippet-btn::after` / `.has-controls::after`, edge-radius rules, all `.sm-*` rules |
| 3 | `main_SNIPPETS.js` | In `renderSnippets()` forEach loop — add 3-line `has-controls` class check after `btn.dataset.id = snippetId` |
| 4 | `main_SNIPPETS.js` | Add `smBuildSnippetRow()`, `smCommitChanges()`, `cy_openSnippetManager()` functions near `openSnippetEditUI` |
| 5 | `main_SNIPPETS.js` | In `DOMContentLoaded` block — wire `#openSnippetManager` click alongside `bankBinder()` |
| 6 | `main_SNIPPETS.js` | Add to module export block: `Holy.SNIPPETS.cy_openSnippetManager = cy_openSnippetManager` |

---

## Key Existing Hooks

| Symbol | Location | Notes |
|--------|----------|-------|
| `cy_createForegroundPanel(id, opts)` | `main_UTILS.js:34`, exported as `Holy.UTILS.cy_createForegroundPanel` | Modal factory. Pass `opts.width = "340px"` for the manager. |
| `cy_getActiveBank()` | `main_SNIPPETS.js`, exposed as `window.cy_getActiveBank` | Use to seed initial bank dropdown selection. |
| `Holy.SNIPPETS.banks` | `main_SNIPPETS.js` | Full bank array for the dropdown. |
| `cy_saveBanksToDisk()` | `main_SNIPPETS.js`, exported as `Holy.SNIPPETS.cy_saveBanksToDisk` | Call after save. |
| `Holy.SNIPPETS.renderSnippets()` | `main_SNIPPETS.js` | Call after save to refresh buttons + has-controls indicators. |
| `cy_normalizeSnippet(snip)` | in-scope within IIFE | Call before reading any snippet to guard controls object. |
| `normalizeBankSnippets(bank)` | in-scope within IIFE | Call on bank before iterating snippets. |
| `cy_resolveDoc()` | in-scope within IIFE | Use for all DOM queries inside manager to stay panel-safe. |

---

## Edge Cases & Gotchas

- **`#openSnippetManager` is main-panel only.** Do not add to `quickpanel.html`. Consistent with `snipLoadControls` being absent there too.
- **`overflow: hidden` on `.snippet-btn`** may clip the `::after` bar. If so, set `overflow: visible` on `.snippet-btn`. Verify label text still truncates with `text-overflow: ellipsis` (it will, because the label has its own `overflow: hidden`).
- **Manager bank dropdown vs active bank:** The manager opens showing the currently active bank. Changing the dropdown re-renders the rows for a different bank — but it does NOT switch `Holy.SNIPPETS.activeBankId`. Only the Save button commits those rows back into their bank.
- **Multi-bank save:** `smCommitChanges` reads the dropdown's current value, so it only saves the bank currently shown. If the user flipped banks without saving, only the visible bank's edits persist. This is acceptable and simpler than tracking all banks simultaneously.
- **Numeric prop values:** `typeof prop.value === "number"` handles simple 1D values (blur amount, opacity). Non-scalar values (2D point arrays, colour arrays) would stringify — they're rare in saved controls but the stringify fallback handles them gracefully.
- **Blast radius check:** `renderSnippets()` is called from `cy_setActiveBank`, `cy_loadBanksFromDisk`, and the Holy Agent `banksUpdated` CSEvent listener. All three will inherit the `has-controls` class logic once it's added to the forEach loop — zero additional wiring.
- **`holy_applySnippet` stub** in `main_SNIPPETS.js` (the one using `$.writeln`) is dead JS code. This plan doesn't touch it, but it can be removed as a separate cleanup task.
