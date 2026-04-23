# Snippets

**Files:** `js/main_SNIPPETS.js` -> `renderSnippets()`, `cy_saveBanksToDisk()`, `cy_loadBanksFromDisk()`, `cy_evalApplyExpression()`, `cy_sendToExpressArea()`, `openSnippetEditUI()`, `cy_openSnippetManager()`, `smBuildSnippetRow()`, `smCommitChanges()`, `smAutoResize()`, `contextM_SNIPPETS_actionHandler()`, `contextM_BANKS_actionHandler()` | `js/main_UTILS.js` -> `cy_getBanksPaths()`, `cy_readJSONFile()`, `cy_writeJSONFile()`, `cy_createForegroundPanel()` | `js/main_MENU.js` -> `contextM_menuBuilder()`
**UI Section:** Main Panel -- Snippet bar (bank header + 3 snippet buttons) / Snippet Manager overlay / Controls area

Snippets are the primary reuse mechanism in Holy Expressor. Each snippet stores an expression string and an optional controls payload (effects with property values). Users organize snippets into banks, with each bank holding a fixed set of 3 snippets (`SNIPPETS_PER_BANK`). Left-clicking a snippet button applies its expression (and optionally its controls) to the current AE selection. Right-clicking opens a context menu with actions including Express (send to editor), Edit, Save Controls, and Clear. The Snippet Manager overlay provides a tabbed editing interface for all snippets in a bank, with editable name, expression, and controls fields.

*For persistence mechanics (banks.json format, disk paths, read/write utilities), see `Docs/features/10-persistence-state.md`. For the Quick Panel (alternate snippet access from a separate CEP window), see `Docs/features/07-quick-panel.md`.*

---

## 4.1 Snippet Save & Recall

**Recall (apply) workflow -- left-click a snippet button:**

1. `renderSnippets()` builds the snippet bar for the active bank. Each `.snippet-btn` gets a click listener.
2. On click, the handler resolves the snippet from `Holy.SNIPPETS.banks` by ID.
3. If the `#snipLoadControls` checkbox is checked and the snippet has `controls.effects`, a `host_APPLY_CONTROLS` ExtendScript call applies the controls payload first.
4. `cy_evalApplyExpression(snippet.expr, cb)` sends the expression to ExtendScript via `he_S_SS_applyExpressionToSelection()`, which writes the expression to all selected properties.
5. A toast confirms success or reports errors.

**Express workflow -- right-click > "Express":**

1. Right-click fires a context menu via `Holy.MENU.contextM_menuBuilder()`.
2. Selecting "Express" calls `cy_sendToExpressArea(snip.expr)`, which inserts the expression text into the CodeMirror editor via `Holy.EXPRESS.EDITOR_insertText`.

**Save workflow -- foreground edit panel:**

1. Right-click > "Edit" opens `openSnippetEditUI()`, a foreground panel built with `Holy.UTILS.cy_createForegroundPanel()`.
2. The panel shows editable name and expression fields pre-filled from the snippet.
3. The Save button writes values back to the in-memory snippet object and calls `cy_saveBanksToDisk()` to persist.
4. `renderSnippets()` is called to refresh the button labels.

**Save Controls workflow -- right-click > "Save Controls":**

1. Captures the current AE effect/property state from the selected layer via ExtendScript.
2. Writes the captured payload into `snippet.controls`.
3. Calls `cy_saveBanksToDisk()` to persist.

**Bank management -- right-click the bank header:**

- `contextM_BANKS_actionHandler()` handles: Add Bank, Rename Bank, Delete Bank, Duplicate Bank.
- All bank mutations normalize the collection, persist to disk, re-render the header and snippet bar, and broadcast a `banksChanged` LiveSync event.

---

## 4.2 Controls UX

The Controls UX upgrade adds visual indicators and a management surface for the controls system.

### Controls toggle group

`.controls-toggle-group` is a flex container in `#bankHeader` that wraps:

1. **`#snipLoadControls` checkbox** -- existing toggle that gates whether controls are applied alongside the expression on snippet click.
2. **Controls icon** -- `assets/buttons/Controls_Icon.svg` (ellipse `fill=currentColor`, paths stroke only). Styled at `--G-color-1-midlight`.
3. **Vertical divider** -- visual separator between the checkbox area and the manager button.
4. **`#openSnippetManager` button** -- `assets/buttons/snippets-mgr.svg` (three diagonal lines, `stroke-width: 4`). Launches the Snippet Manager overlay on click. Hover brightens to `--G-color-1`.

### Has-Controls indicator bar

Each `.snippet-btn` has a `::after` pseudo-element: a 2px bottom bar colored `--G-color-1-midlight`, hidden by default (`opacity: 0`). When a snippet has saved controls data (`snippet.controls.effects` is a non-empty array), `renderSnippets()` adds the `.has-controls` class to the button, which sets `opacity: 1` on the bar.

Edge treatment: the first button's bar gets `border-bottom-left-radius` matching the container radius; the last button's bar gets `border-bottom-right-radius`. Middle buttons have square ends.

JS change in `renderSnippets()` forEach loop, after `btn.dataset.id = snippetId`:

```js
const hasControls = snippet.controls
  && Array.isArray(snippet.controls.effects)
  && snippet.controls.effects.length > 0;
if (hasControls) btn.classList.add("has-controls");
```

This inherits all existing render paths (`cy_setActiveBank`, `cy_loadBanksFromDisk`, Holy Agent `banksUpdated` listener) with zero extra wiring.

---

## 4.3 Snippet Manager Tabs

The Snippet Manager overlay (`cy_openSnippetManager()`) uses a tabbed interface to show one snippet at a time, replacing the earlier vertically-stacked layout.

### Structure

```
.sm-tabs-container          (wrapper: outer border + radius + overflow:hidden)
  #smTabBar                 (tab buttons: one per snippet in the bank)
  #smSnippetRows            (contains all .sm-snippet-row elements; only active one visible)
```

### Tab behavior

- `smRenderRows(bankId)` builds all `.sm-snippet-row` elements and appends them to `#smSnippetRows`. Only the first row is visible initially (`display: ""` vs `display: "none"`).
- Tab buttons are numbered 1, 2, 3 (matching `SNIPPETS_PER_BANK`). Clicking a tab hides all rows and shows the corresponding one.
- The wrapper pattern (`.sm-tabs-container`) provides a unified outer border and radius with `overflow: hidden`. The tab bar and snippet rows appear as a single cohesive unit.

### Tab styling

- **Inactive tabs:** transparent borders to reserve space, preventing layout shift on activation.
- **Active tab:** `border-left/right-color` set to accent color, `border-bottom-color` set to `--bg-surface` to visually erase the shelf line between the tab and the content area below.
- **Edge tabs:** flatten the wrapper-adjacent corner radius so they sit flush with the container border.

### Auto-resize textarea

`smAutoResize(el)` adjusts textarea height to fit content, clamped to a maximum of 5 lines (calculated as `18px * 5 + 12px` padding = 102px max). If content exceeds the max, `overflow-y` switches to `auto` for scrolling.

Critical: `smAutoResize` must be called on tab switch because hidden rows have `scrollHeight === 0`. The tab click handler calls `smAutoResize(ta)` on the newly-shown row's textarea.

### Each snippet row contains

- **Name input** (`.sm-snip-name`) -- editable text field, pre-filled with `snip.name`.
- **Expression textarea** (`.sm-snip-expr`) -- editable, auto-resizing, pre-filled with `snip.expr`.
- **Controls section** -- if `snip.controls.effects` is empty, shows "No controls saved" in italic. Otherwise, renders each effect as a `.sm-effect-entry` with effect name and per-property rows showing name, value input (numeric or text), and optional expression input.

### Commit flow

`smCommitChanges(panel)` reads the currently-selected bank from `#smBankSelect`, iterates all `.sm-snippet-row` elements in the panel, and writes input values back to the corresponding in-memory snippet objects. The Save button then calls `cy_saveBanksToDisk()` and `renderSnippets()`.

Note: only the currently-displayed bank is saved. If the user switches the bank dropdown without saving, only the last-visible bank's edits persist.

### Design variables

Two surface-level CSS custom properties support the tab/overlay design:

- `--bg-surface: #1c1d22`
- `--bg-surface-sub: #151516`

---

## 4.4 Snippet Storage

Snippet data is stored on disk as a single JSON file.

- **File path:** `{USER_DATA}/HolyExpressor/banks.json`, resolved via `Holy.UTILS.cy_getBanksPaths()`. The `USER_DATA` system path is obtained from `CSInterface.getSystemPath(SystemPath.USER_DATA)`.
- **Directory creation:** `cy_fsEnsureDir(dir)` ensures the `HolyExpressor` directory exists before any read/write.
- **File format:**
  ```json
  {
    "version": 1,
    "activeBankId": 1,
    "banks": [
      {
        "id": 1,
        "name": "Default",
        "snippets": [
          {
            "id": "snip-abc123-1-xyz789",
            "name": "Wiggle",
            "expr": "wiggle(2,20)",
            "controls": {
              "effects": [
                {
                  "name": "Gaussian Blur",
                  "matchName": "ADBE Gaussian Blur 2",
                  "properties": [
                    { "name": "Blurriness", "value": 10, "expression": "" }
                  ]
                }
              ]
            }
          }
        ]
      }
    ]
  }
  ```
- **Read:** `cy_loadBanksFromDisk()` runs as an IIFE on module load. Reads via `Holy.UTILS.cy_readJSONFile(file)` (which uses `window.cep.fs.readFile` + `JSON.parse`). On success, normalizes the bank collection and heals any structural issues before re-saving. On failure or first run, persists the in-memory defaults.
- **Write:** `cy_saveBanksToDisk()` normalizes the collection via `cy_normalizeBanksCollection()`, then writes via `Holy.UTILS.cy_writeJSONFile(file, payload)` (which uses `window.cep.fs.writeFile`).
- **Write triggers:** Every mutation path calls `cy_saveBanksToDisk()` -- snippet edit save, snippet manager save, bank add/rename/delete/duplicate, controls save, and snippet bar render (Patch 4 heal).
- **Cross-plugin sync:** `holyAPI_saveSnippet(jsonStr)` in `host_AGENT_API.jsx` dispatches a `com.holy.expressor.banksUpdated` CSEvent after writing. `main_SNIPPETS.js` listens for `com.holy.agent.banksUpdated` to reload banks from disk and re-render when Holy Agent modifies snippets externally.
- **Normalization:** `cy_normalizeBanksCollection()` ensures every bank has exactly `SNIPPETS_PER_BANK` snippets, each with a valid `id`, `name`, `expr`, and `controls` object. `cy_normalizeSnippet()` guards individual snippet structure.
- **Snippet IDs:** Generated by `generateSnippetId()` using a combination of `Date.now().toString(36)`, an incrementing counter, and `Math.random().toString(36)` for uniqueness.

*For full persistence architecture (Holy.State, Holy.PERSIST, cross-panel sync), see `Docs/features/10-persistence-state.md`.*

---

## Open Bugs

*When a bug is resolved: apply `~~strikethrough~~` and add a Dev Log entry noting the fix. Do not delete.*

- **Snippet Manager tab 2/3 rendering unverified** -- Tabs exist and CSS fix has been applied to the repo, but connected border rendering for tabs 2 and 3 has not been confirmed working in a live CEP panel reload. The active-tab shelf-line erasure and edge-tab corner flattening need visual verification.
- **LiveSync "Snippet Spam" loop** -- A feedback loop where LiveSync causes repeated snippet re-renders was noted as next priority after the Custom Search fix. No resolution entry exists in the archive. Status unclear.
- **Cross-panel LiveSync UI refresh** -- Persistence writes work (banks.json saved to disk), but CEP event broadcasts do not propagate reliably across window contexts. The Quick Panel UI does not auto-refresh after a snippet edit in the main panel without a manual reload. Root cause: each CEP window runs an isolated JS runtime. See also `Docs/features/10-persistence-state.md`.

---

## Dev Log

- 1: Initial feature documentation created from AGENTS/ migration. Content sourced from `_ARCHIVE_EXTRACTION.md` (FOR: 04-snippets section) and `PLAN_controls_ux_upgrade.md`. Covers snippet save/recall workflow, controls UX upgrade (indicator bar, toggle group, Snippet Manager overlay), tab redesign with wrapper pattern, auto-resize textarea, storage format and persistence, and open bugs.

- 2: Snippet Manager overlay layout + tab border fixes (`css/styles.css`). (a) Tab bottom borders: replaced the `margin-bottom: -1px` transparency-overlap trick (which was silently failing) with explicit `border-bottom` control — inactive tabs now carry `border-bottom: 1px solid var(--G-color-1)` directly, active tab overrides with `border-bottom-color: var(--bg-surface)` so it bleeds seamlessly into the content area; `.sm-tab-bar` border-bottom removed as it is no longer needed. (b) Tab padding reduced from `5px 8px` to `2px`. (c) `.foreground-panel-box` padding reduced from `12px` to `10px` (global); `.foreground-panel-content` padding reduced from `3px` to `0` (global). (d) Snippet Manager overlay now anchors to the top of the viewport and grows downward: `#snippetManagerPanel` overrides `align-items: flex-start`; `.foreground-panel-box` inside it uses `width: calc(100% - 16px)` with `margin: 8px` to fill available panel width.

- 3: Snippet Manager button (`#openSnippetManager` / `.controls-manager-btn`) colour adjusted (`css/styles.css`). Idle state changed from `--G-color-1-midlight` (factor 0.3 — too dim) to `--G-color-1` (full accent); hover state changed from `--G-color-1` to `--G-color-1-midlight2` (factor 0.65 — slightly darker). Net effect: button sits at full accent at rest and dims slightly on hover, making it visually present without hover amplifying it further.

- 4: Controls toggle group — icon/checkbox swap, sizing, and shared hover (`index.html`, `css/styles.css`). (a) Introduced `.controls-cb-pair` wrapper div that groups `controls-indicator-icon` (left) and `checkbox-layercontrols` (right), replacing the previous order where the checkbox came first. Wrapper carries `margin-left: auto` so the pair stays right-aligned in `#bankHeader`. (b) Removed `margin-left: auto !important` and `transform: translateX(-10px) translateY(2px) translateZ(0)` positioning hacks from `.checkbox-layercontrols` — these are no longer needed with the wrapper approach. (c) Gap between icon and checkbox set to `3px` on `.controls-cb-pair`. (d) Shared hover: `.controls-cb-pair:hover` rules apply the same colour brightening (`--text-muted` + `--G-color-1` ring) to both the indicator icon and the diamond checkbox SVG simultaneously. (e) Added `transition: color var(--transition)` to `.controls-indicator-icon` so the hover colour change is smooth. (f) Diamond SVG size in `.checkbox-layercontrols` reduced from 14px to 11px via `.checkbox-layercontrols svg.btn-icon` CSS override.

- 5: Controls toggle group right-alignment fix (`css/styles.css`). Moved `margin-left: auto` from `.controls-cb-pair` (inner element) to `.controls-toggle-group` (the outer wrapper). The prior placement pushed the checkbox within the toggle group's own flex context but had no effect on the group's position within `#bankHeader` — the entire group was still left-aligned in the bank header row. Moving `margin-left: auto` to `.controls-toggle-group` correctly pushes the whole group (checkbox + divider + manager button) to the far right of the bank header.
