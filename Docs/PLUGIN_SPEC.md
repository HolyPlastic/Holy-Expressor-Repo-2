# Holy Expressor -- Plugin Specification

Holy Expressor is a CEP panel for Adobe After Effects that provides an expression editor, apply system, search & replace, snippet management, and supporting tools for working with After Effects expressions at scale.

---

## 1. Expression Editor

The expression editor is a CodeMirror 6 instance embedded in the main panel's Express mode view. It serves as the single source of truth for expression text before apply operations.

The editor lifecycle begins at startup when `main_DEV_INIT.js` calls `loadJSX()`, initialises the UI modules, and then `Holy.State.bindEditor()` hydrates the CodeMirror instance with any previously persisted expression text. As the user types, a debounced capture listener (180 ms) syncs the current document text into `Holy.State`, which schedules a disk save and broadcasts the change to other panels.

`PORTAL_getCurrentExpression()` is the central read gate. Every apply path--Blue Apply, Orange Apply, and snippet "express to editor"--reads from this function. It pulls the current `doc.toString()` from the CodeMirror state, treating the placeholder string `"// Type your expression here..."` as empty. If the CodeMirror instance is unavailable it falls back to a hidden `#exprInput` textarea.

`EDITOR_insertText()` is the central write gate. It sanitises incoming strings (strips wrapping quotes, collapses double-escaped quotes), clears the placeholder if present, and dispatches a CodeMirror transaction. When the editor is focused the text is inserted at the current selection; otherwise it is appended at the end of the document.

The editor text is also broadcast across panels via a `com.holy.expressor.editor.sync` CSEvent so that any secondary panel sharing the editor context stays in lockstep.

The editor can be maximised via `#editorMaximizeBtn`, which toggles `body.editor-maximized` and calls `editor.requestMeasure()` to reflow CodeMirror geometry.

**Citations:**
- `js/main_EXPRESS.js` -> `PORTAL_getCurrentExpression()`, `EDITOR_insertText()`, `broadcastEditorText()`
- `js/main_DEV_INIT.js` -> `loadJSX()`, `init()`
- `js/main_STATE.js` -> `bindEditor()`, `captureAndSync()`
- `js/main_UI.js` -> `setMode()`, editor maximize handler

---

## 2. Apply System

The apply system has two primary paths, referred to internally as "Blue Apply" (standard) and "Orange Apply" (Custom Search / Target List). Both originate from `wirePanelButtons()` in `main_BUTTON_LOGIC_1.js`.

### Blue Apply (standard Express-mode apply)

When the user clicks `#applyBtn` in Express mode, `onApply()` fires. It first checks whether Custom Search is active (`#useCustomSearch` checkbox). If Custom Search is off, it reads the expression from `PORTAL_getCurrentExpression()` and calls the ExtendScript function `he_S_SS_applyExpressionToSelection()` via `evalScript`. This function (the "Selection Striker") writes the expression to every selected property in the active composition, returning a JSON report with applied count and any errors. The CEP side toasts a summary and logs the operation.

If Custom Search is on, Blue Apply instead delegates to `HE_applyByStrictSearch()`, which packages the expression text and the Custom Search term into a JSON payload and calls `he_P_SC_applyExpressionBySearch()` on the host side. This is the "Search Captain" path: it traverses all selected layers, matches properties by name token path, and applies the expression only to matching properties. After a successful Custom Search apply, the checkbox is automatically unchecked via `setCustomSearchActive(false)`.

Custom Search text is persisted in session memory only (`Holy.sessionCustomSearchText`), so it survives panel redraws within a single AE session but resets on restart.

### Orange Apply (Target List / Custom Search)

`#applyTargetBtn` offers two sub-paths:

1. **Custom Search path** -- When `#useCustomSearch` is checked, the flow is identical to the Blue Custom Search path: build an expression (or use the editor text) and call `he_P_SC_applyExpressionBySearch()`.

2. **Target List path** -- When Custom Search is off, the system reads data-path attributes from `#TargetList` items (populated by the Target Selected button). It then calls `he_S_LS_applyExpressionToTargetList()` on the host side, which resolves each stored path and writes the expression to those specific properties.

### Target capture

The `#targetSelectedBtn` button calls `onTarget()` in `main_UI.js`, which invokes `he_U_SS_getSelectionSummary()` to snapshot the current AE selection as a list of property paths, layer names, display names, and array type metadata. These are rendered as `.target-item` divs inside `#TargetList`.

### Load from Selection / Load Path

`#loadFromSelectionBtn` arms a PickClick session. When the user confirms their selection, `loadExpressionFromSelectionItems()` deduplicates by path (preferring directly picked leaves), filters ShapePath entries, and inserts the expression text(s) into the editor.

`#loadPathFromSelectionBtn` also uses PickClick. On resolve it calls `he_GET_SelPath_Simple()` to build a deterministic property path reference string and inserts it into the editor.

### Apply logging

Every apply operation is recorded by `updateApplyReport()`, which formats a timestamped log entry, pushes it into an in-memory ring buffer (max 250 entries), and broadcasts via `com.holy.expressor.applyLog.update` CSEvent to the optional log panel.

**Citations:**
- `js/main_BUTTON_LOGIC_1.js` -> `wirePanelButtons()`, `onApply()`, `loadExpressionFromSelectionItems()`, `updateApplyReport()`, `setCustomSearchActive()`
- `js/main_EXPRESS.js` -> `HE_applyByStrictSearch()`, `PORTAL_getCurrentExpression()`
- `js/main_UI.js` -> `onTarget()`
- `jsx/Modules/host_APPLY.jsx` -> `he_S_SS_applyExpressionToSelection()`, `he_P_SC_applyExpressionBySearch()`, `he_S_LS_applyExpressionToTargetList()`
- `jsx/Modules/host_GET.jsx` -> `he_GET_SelPath_Simple()`, `he_U_SS_getSelectionSummary()`

---

## 3. Search & Replace

Search & Replace operates in the Rewrite mode view. The panel provides a Search field, a Replace field, and a Match Case toggle, all wired through `main_SEARCH_REPLACE.js`.

When the user activates the Apply button (labelled "REWRITE" in this mode), `onApply()` detects `mode === "rewrite"` and delegates to `Holy.SEARCH.runSearchReplace()`. This function reads the Search and Replace values from their respective CodeMirror mini-editors (or textarea fallbacks), collects the Match Case state, and optionally reads the Custom Search filter term.

The core engine is `cy_replaceInExpressions()` in `main_EXPRESS.js`. It:

1. Calls `cy_getSelectedLayers()` to enumerate selected layers (via `he_EX_getSelectedLayers()` on the host side).
2. For each layer, calls `cy_collectExprTargets()` to retrieve every expressioned property (via `he_EX_collectExpressionsForLayer()` on the host side).
3. If Custom Search is active, filters the collected entries using `cy_filterEntriesByCustomSearch()`, which performs right-anchored token-path matching on `>` delimited segments.
4. Builds a regex from the literal search string (escaped to be safe), applies it with the appropriate case sensitivity flag, and produces replacement entries.
5. Batches all replacement entries into `cy_safeApplyExpressionBatch()`, which calls `he_EX_applyExpressionBatch()` on the host side. This host function writes each new expression within a single undo group, temporarily unhides hidden layers for safe access, and restores their visibility afterward.

Line endings are normalised to LF before matching, so CRLF or CR in AE expressions cannot cause pattern misses.

Apply errors are categorised: "Expression Disabled" and "ReferenceError" warnings are treated as benign and suppressed; critical errors are surfaced. The user receives a toast summarising how many expressions were rewritten.

The Search and Replace fields use their own CodeMirror instances (initialised in `initRewriteEditors()`) with JavaScript syntax highlighting and the oneDark theme, capped at 80 px height with auto-scrolling.

**Citations:**
- `js/main_SEARCH_REPLACE.js` -> `runSearchReplace()`, `init()`, `initRewriteEditors()`
- `js/main_EXPRESS.js` -> `cy_replaceInExpressions()`, `cy_collectExprTargets()`, `cy_safeApplyExpressionBatch()`, `cy_filterEntriesByCustomSearch()`
- `js/main_BUTTON_LOGIC_1.js` -> `onApply()` (rewrite mode branch)
- `jsx/Modules/host_GET.jsx` -> `he_EX_getSelectedLayers()`, `he_EX_collectExpressionsForLayer()`
- `jsx/Modules/host_APPLY.jsx` -> `he_EX_applyExpressionBatch()`

---

## 4. Snippet Management

Snippets are organised into banks. Each bank contains exactly three snippet slots (enforced by `SNIPPETS_PER_BANK = 3`). A snippet record holds an `id`, `name`, `expr` (expression text), and `controls` (optional captured AE effect metadata).

### Storage

Banks are stored as a JSON file at `<USER_DATA>/HolyExpressor/banks.json`. On load, `cy_loadBanksFromDisk()` reads this file, normalises all records (ensuring every snippet has a stable ID, non-null controls object, and string fields), and sets the active bank pointer. On any mutation, `cy_saveBanksToDisk()` writes back the full bank collection.

### Rendering

`renderSnippets()` clears `#snippetsRow`, iterates over the active bank's snippets, and creates a button for each. Buttons that have saved controls are marked with `has-controls`.

### Applying a snippet

Left-clicking a snippet button triggers one of two paths:
- If the "Load Controls" checkbox (`#snipLoadControls`) is checked and the snippet has saved controls, it calls `holy_applyControlsJSON()` via ExtendScript to restore AE layer effects before applying the expression.
- Otherwise it calls `holy_applySnippet()` on the host side.

In both cases, `cy_evalApplyExpression()` also fires to apply the snippet's expression text to the current selection via `he_S_SS_applyExpressionToSelection()`.

### Editing a snippet

Right-clicking a snippet button opens a context menu (rendered by `Holy.MENU.contextM_menuBuilder`). The context actions are:
- **Edit** -- Opens a foreground panel (`openSnippetEditUI()`) with Name/Expression fields and Save/Save Controls/Cancel buttons. Save Controls captures the current AE selection's effect metadata via `holy_captureControlsJSON()`.
- **Express** -- Sends the snippet's expression to the CodeMirror editor via `cy_sendToExpressArea()`.

### Bank management

The bank header shows the active bank name (click to rename inline). The bank selector dropdown (`#bankSelectBtn`) lists all banks with actions:
- **Select** -- Switches the active bank via `cy_setActiveBank()`.
- **New** -- Creates a new bank with empty snippet slots.
- **Rename** -- Prompts for a new name.
- **Duplicate** -- Deep-copies a bank with an auto-numbered name.
- **Delete** -- Removes the bank (Bank 1 is protected).

All bank mutations save to disk, re-render the header and snippet row, and broadcast a `banksChanged` LiveSync event to other panels.

**Citations:**
- `js/main_SNIPPETS.js` -> `renderSnippets()`, `cy_saveBanksToDisk()`, `cy_loadBanksFromDisk()`, `cy_evalApplyExpression()`, `cy_sendToExpressArea()`, `openSnippetEditUI()`, `contextM_SNIPPETS_actionHandler()`, `contextM_BANKS_actionHandler()`, `cy_getActiveBank()`, `cy_setActiveBank()`, `normalizeBankSnippets()`
- `js/main_UTILS.js` -> `cy_getBanksPaths()`, `cy_readJSONFile()`, `cy_writeJSONFile()`, `cy_createForegroundPanel()`
- `js/main_MENU.js` -> `contextM_menuBuilder()`

---

## 5. Delete Expressions

The Delete Expressions feature removes expressions from selected properties while respecting the same scoping rules as Search Captain (Custom Search).

When the user clicks `#deleteExpressionsBtn`, the handler in `wirePanelButtons()` calls `cy_deleteExpressions()` in `main_EXPRESS.js`. This function invokes the ExtendScript function `cy_deleteExpressions()` in `host_UTILS.jsx`, which:

1. Resolves the active composition and its selected layers.
2. Builds allowed group signatures using `he_U_SC_buildAllowedGroupSignatures()` so that group and Contents scoping is honoured, matching the same ancestry-based filtering used by the apply system.
3. Traverses each layer's property tree, collecting properties that have expressions.
4. Resolves each property's expression path, then clears the expression.
5. Returns a JSON report with deleted count, any errors, and a toast-friendly message.

On the CEP side, the result is logged to the apply report, a summary toast is shown, and the operation count is emitted to the customer-facing log via `NEW_forCustomer_emit()`.

The button is disabled during execution and re-enabled on completion or failure to prevent double-clicks.

**Citations:**
- `js/main_EXPRESS.js` -> `cy_deleteExpressions()`
- `js/main_BUTTON_LOGIC_1.js` -> `wirePanelButtons()` (delete button handler)
- `jsx/Modules/host_UTILS.jsx` -> `cy_deleteExpressions()`
- `jsx/Modules/host_APPLY.jsx` -> `he_U_SC_buildAllowedGroupSignatures()`, `he_U_SC_buildGroupSignature()`, `he_U_SC_owningLayer()`

---

## 6. Color Theming

The entire visual system is driven by a single accent color variable `--G-color-1` defined on `:root` in `css/styles.css`. At startup, the default is `#7c6cfa`.

The CSS architecture works in two layers:

1. **Root seed variables** -- JavaScript writes `--G-color-1-H`, `--G-color-1-S`, `--G-color-1-L` (HSL components) and `--G-colour-1-RGB` (comma-separated RGB) onto `:root` at runtime.

2. **Derived token scale** -- Pure CSS `calc()` expressions produce a full palette from the seed values: `--G-color-1-mid`, `--G-color-1-dark-bg`, `--G-color-1-deepdark-bg`, `--G-color-1-offwhite`, `--G-color-1-midlight`, and several others at varying saturation and lightness ratios. This means the entire panel recolors live when the seed values change.

Additionally, a design-system token layer maps these generated colours into semantic names (`--bg-surface`, `--bg-input`, `--accent`, `--text-primary`, etc.) consumed by component styles.

Theme changes propagate across panels through `holy.color.change` CSEvents. When any panel updates the accent color, it dispatches the new HSL/RGB values as a JSON payload. Receiving panels parse the event and update their own `:root` variables.

The color picker panel (`colorpicker.html` + `js/colorpicker.js`) provides a modeless floating UI with a native system color picker trigger, hex input, and swatch grid. It uses `HLMColorPicker.init()` with `onApply`/`onReset`/`onPreview` callbacks to write the chosen color back to the theme variable system.

`cy_getThemeVars()` in `main_UTILS.js` reads the computed values of all theme variables for use by external bridges.

All inline SVGs use `currentColor` so they inherit the accent color automatically through the CSS cascade.

**Citations:**
- `css/styles.css` -> `:root` variable definitions, derived token scale
- `js/main_UTILS.js` -> `cy_getThemeVars()`
- `js/colorpicker.js` -> `HLMColorPicker.init()`, `_build()`, `_bindEvents()`
- `colorpicker.html` -> color picker panel entry

---

## 7. Quick Panel

> Available but may remain deprecated. Deferred to post-ship.

The Quick Panel (`com.holy.expressor.quickpanel`) is a lightweight secondary CEP panel focused on snippet access. It is launched from the main panel via `cs.requestOpenExtension("com.holy.expressor.quickpanel")` with an `ensureHostReady()` pre-check.

The Quick Panel runs in its own isolated CEP JavaScript context. It boots through `quickpanel.html`, which loads a subset of the main panel's modules (UTILS, MENU, UI, SNIPPETS, STATE) plus `js/quickpanel.js`. On `DOMContentLoaded`, it:

1. Installs a console log proxy that forwards all `console.log/warn/error` calls to the main panel via `com.holy.expressor.quickpanel.log` CSEvent, so developers can debug from a single DevTools window.
2. Primes its own host bridge by calling `$.evalFile()` for each JSX module, then verifies readiness by checking `typeof he_S_SS_applyExpressionToSelection`.
3. Waits for `Holy.SNIPPETS`, `Holy.UI`, and `Holy.State` modules to be available (up to 15 attempts with 120 ms intervals).
4. Initialises snippets, renders them, rebinds the bank UI, and attaches state panel bindings.
5. Kicks off cold-start recovery timers that re-render and rebind if the panel initially appears blank (a known CEP compositor issue).
6. Attaches a LiveSync listener for `com.holy.expressor.stateChanged` so that bank changes from the main panel trigger a `Holy.SNIPPETS.init()` refresh.

Panel focus triggers state rehydration via `Holy.State.reload()` so that switching between panels always shows the latest data.

The panel includes a close button that calls `cs.closeExtension()`.

**Citations:**
- `quickpanel.html` -> panel DOM and script load chain
- `js/quickpanel.js` -> `primeHostBridge()`, `ensureHostBridge()`, `waitForQuickPanelModules()`, `initSnippets()`, `installLogProxy()`, `scheduleColdStartRecovery()`, `guaranteePanelLayout()`

---

## 8. Persistence & State

Holy Expressor uses a multi-layer persistence architecture to ensure settings survive across panel sessions, AE restarts, and multi-panel scenarios.

### Persistent Store (`Holy.PERSIST`)

`persistent-store.js` provides a universal key-value adapter with a three-tier fallback chain:

1. **CSInterface persistent data** (`csInstance.getPersistentData/setPersistentData`) -- preferred path, uses Adobe's built-in cross-session storage scoped to the extension.
2. **CEP native API** (`window.__adobe_cep__.getPersistentData`) -- fallback if the CSInterface method is unavailable; attempts scoped then unscoped calls.
3. **localStorage** -- last-resort fallback for environments where CEP APIs are unavailable.

All reads cascade through the chain; writes use the first available tier.

### Panel State (`Holy.State`)

`main_STATE.js` manages the runtime state object and its synchronisation. The default state shape is:

```
{
  expressionText: "",
  useCustomSearch: false,
  customSearch: "",
  useAbsoluteComp: false
}
```

**Disk persistence:** State is serialised to `<USER_DATA>/HolyExpressor/panel-state.json` (alongside `banks.json`). Saves are debounced at 220 ms. On load, the system checks whether the stored project path matches the current AE project; if not, it discards project-specific fields (`expressionText`, `useCustomSearch`) to avoid stale data leaking across projects.

**Cross-panel sync:** State changes are broadcast via `com.holy.expressor.sync.state` CSEvent. Each panel instance has a unique `instanceId`; incoming events from the same instance are ignored to prevent echo loops. A separate `com.holy.expressor.stateChanged` LiveSync event triggers snippet reinitialisation across panels when banks change.

**Panel bindings:** `attachPanelBindings()` wires DOM elements (`#useCustomSearch`, `#customSearch`, `#useAbsoluteComp`, `#exprInput`) to the state object bidirectionally. Changes from the DOM update state and broadcast; incoming state updates from other panels update the DOM. Duplicate binding is prevented by `dataset.holyStateBound` guards.

**Editor binding:** `bindEditor()` installs a CodeMirror `updateListener` extension that captures document changes on a 180 ms debounce, syncing the text into `state.expressionText`. On hydration, if stored text differs from the editor's current content, it dispatches a replacement transaction.

**Focus rehydration:** Both the main panel and Quick Panel listen for `window.focus` events and call `Holy.State.reload()` to re-read state from disk, ensuring the freshest data is always displayed when the user switches panels.

### Panel Geometry (`Holy.PanelState`)

`panel_state.js` saves and restores window position and size for each panel (main, quickpanel, colorpicker) using `localStorage` keyed by `holyExpressor_panel_<id>_pos`. Position is saved on `beforeunload` and restored on `DOMContentLoaded`.

### Snippet Banks

Bank data is stored separately from panel state at `<USER_DATA>/HolyExpressor/banks.json` via `cy_saveBanksToDisk()` / `cy_loadBanksFromDisk()` in `main_SNIPPETS.js`, using the CEP filesystem API (`window.cep.fs.readFile/writeFile`). The file schema includes a `version` field, the `activeBankId`, and the full `banks` array.

**Citations:**
- `js/persistent-store.js` -> `Holy.PERSIST.get()`, `Holy.PERSIST.set()`, `Holy.PERSIST.remove()`, `buildAdapter()`
- `js/main_STATE.js` -> `Holy.State.init()`, `Holy.State.update()`, `Holy.State.subscribe()`, `Holy.State.attachPanelBindings()`, `Holy.State.bindEditor()`, `Holy.State.reload()`, `persistState()`, `readStateFromDisk()`, `broadcastState()`, `dispatchLiveSyncEvent()`
- `js/panel_state.js` -> `Holy.PanelState.save()`, `Holy.PanelState.restore()`
- `js/main_SNIPPETS.js` -> `cy_saveBanksToDisk()`, `cy_loadBanksFromDisk()`
- `js/main_UTILS.js` -> `cy_getBanksPaths()`, `cy_readJSONFile()`, `cy_writeJSONFile()`
