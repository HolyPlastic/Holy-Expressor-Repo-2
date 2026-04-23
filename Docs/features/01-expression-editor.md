# Expression Editor

**Files:** `js/main_EXPRESS.js` -> `PORTAL_getCurrentExpression`, `EDITOR_insertText`, `HE_applyByStrictSearch`, `initPresets`, `buildExpressionForSelection`, `buildExpressionForSearch`, `cy_collectExprTargets`, `cy_safeApplyExpressionBatch`, `cy_replaceInExpressions`, `cy_deleteExpressions`, `cy_filterEntriesByCustomSearch` | `js/main_DEV_INIT.js` -> `loadJSX`, `init`, CodeMirror setup | `js/main_BUTTON_LOGIC_1.js` -> `onApply` (Blue Apply), Orange Apply handler, `loadExpressionFromSelectionItems`, Load Path handler | `jsx/Modules/host_APPLY.jsx` -> `he_S_SS_applyExpressionToSelection`, `he_P_SC_applyExpressionBySearch`, `he_EX_applyExpressionBatch` | `jsx/Modules/host_GET.jsx` -> `he_GET_SelPath_Simple`, `he_U_TS_peekSelectionType`, `he_U_TP_peekTypeForSearch`, `he_EX_collectExpressionsForLayer` | `jsx/Modules/host_UTILS.jsx` -> `cy_deleteExpressions`
**UI Section:** Main Panel -- Editor Area (`#codeEditor` inside `#expressArea`)

The expression editor is the primary feature of Holy Expressor. It provides a CodeMirror 6-based code editor embedded in the main CEP panel, enabling After Effects users to write, capture, and apply JavaScript expressions to layer properties. Users can type expressions directly in the editor with full syntax highlighting and line wrapping, load existing expressions from selected AE properties via PickClick, load expression-ready property paths from the current selection, and apply expressions back to layers through multiple routing strategies: direct selection apply ("Blue Apply"), custom property-name search apply, target list apply ("Orange Apply"), and batch search-and-replace across selected layers.

*For cross-cutting systems (host bridge, storage), see `Docs/ARCHITECTURE.md`.*

---

## 1.1 Capture (Reading Expressions)

Two capture mechanisms populate the editor from After Effects:

**Load Expression from Selection** (`#loadFromSelectionBtn` in `main_BUTTON_LOGIC_1.js`):
- Click arms the PickClick subsystem via `Holy.PICKCLICK.arm()` with intent `"loadExpressionFromSelection"`.
- On resolve, the PickClick payload delivers an `items` array where each item contains `path`, `expr`, `matchName`, `classification`, and `pickedIsLeaf` fields.
- `loadExpressionFromSelectionItems()` deduplicates items by expression path, preferring directly picked leaves and items that carry an expression over those that do not.
- The sentinel value `"__NO_EXPRESSION__"` (defined as `HE_SENTINEL_NO_EXPR` in `host_MAPS.jsx`) marks properties that have no expression; these are filtered out.
- ShapePath entries (`ADBE Vector Shape`) are included only when no non-Path expressions exist, the item was directly picked, or `pickedMatchName` explicitly matches.
- Final expression strings are joined with `"\n"` and inserted into the editor via `Holy.EXPRESS.EDITOR_insertText()`.

**Load Path from Selection** (`#loadPathFromSelectionBtn` in `main_BUTTON_LOGIC_1.js`):
- Click arms PickClick with intent `"load-path"`.
- On resolve, calls `cs.evalScript('he_GET_SelPath_Simple(...)')` in `host_GET.jsx`.
- `he_GET_SelPath_Simple` walks the selected property's parent chain to build a deterministic expression path string. It handles shape layers (using `.content("...")` accessors), effects (`.effect("...")`), transforms (`.transform`), masks (`.mask("...")`), layer styles (mapped via `LAYER_STYLE_GROUP_MAP`), and stroke subgroups (via `DOT_GROUP_ACTION` for taper/dash/wave).
- The resulting path string is inserted into the editor via `EDITOR_insertText()`.

**Expression Source Portal** (`PORTAL_getCurrentExpression` in `main_EXPRESS.js`):
- Central function that reads the current editor content. Checks `window.editor.state.doc.toString()` (CodeMirror 6 API).
- Treats the placeholder text `"// Type your expression here..."` as empty.
- Falls back to reading a legacy `#exprInput` textarea via `Holy.UI.DOM("#exprInput")` if CodeMirror is unavailable.

---

## 1.2 Editor Configuration

**CodeMirror 6 Setup** (in `main_DEV_INIT.js`, inside the `DOMContentLoaded` listener):

- **Bundle:** A pre-built CodeMirror 6 bundle loaded from `js/codemirror/codemirror-bundle.js` via a deferred `<script>` tag in `index.html`. The bundle exposes itself on `window.codemirror`.
- **Guard:** Initialization only proceeds if `window.codemirror` and `window.codemirror.EditorState` exist; otherwise logs a warning and returns.
- **Extensions:**
  - `window.codemirror.basicSetup` -- standard keybindings, line numbers, bracket matching, etc.
  - `window.codemirror.javascript()` -- JavaScript syntax mode (covers AE expression syntax).
  - `window.codemirror.oneDark` -- One Dark theme.
  - `window.codemirror.EditorView.lineWrapping` -- enables word wrap.
- **Mount point:** `document.getElementById("codeEditor")` (a `<div>` inside `#expressArea`).
- **Global reference:** The editor instance is stored as `window.editor`, used across modules.
- **Placeholder:** Initial doc content is `"// Type your expression here..."`. A focus listener on `window.editor.contentDOM` clears this placeholder text on first interaction.
- **State binding:** After mount, `Holy.State.bindEditor(window.editor)` is called (if available) to connect the editor to the app state persistence system.
- **Clear button:** `#editorClearBtn` dispatches a full-document replacement with an empty string, refocuses the editor, and updates `Holy.State` with `{ expressionText: "" }`.
- **Custom CSS:** `css/codemirror_styles.css` provides theme-aligned overrides (gutter padding, active-line highlight, etc.). Loads globals from `css/styles.css`.

**Editor Text Insertion** (`EDITOR_insertText` in `main_EXPRESS.js`):
- Sanitizes incoming strings: trims whitespace, strips wrapping quotes from JSON-stringified values, collapses double-escaped quotes.
- If the editor is focused, inserts at the current cursor/selection position; otherwise appends to the end of the document.
- Clears placeholder text before inserting if it is the only content.

**Cross-Panel Editor Sync** (`broadcastEditorText` + listener in `main_EXPRESS.js`):
- Dispatches a `com.holy.expressor.editor.sync` CSEvent containing the full editor text as JSON.
- A listener on the same event updates the editor if the received text differs from the current content, enabling cross-panel synchronization.

---

## 1.3 Expression Application

Expression text from the editor is applied to AE properties through several routing paths:

**Blue Apply -- Direct Selection** (`onApply` in `main_BUTTON_LOGIC_1.js`):
- Reads editor text via `PORTAL_getCurrentExpression()`.
- If Custom Search is active (`#useCustomSearch` checked), routes to `HE_applyByStrictSearch(expr, searchVal)` in `main_EXPRESS.js`, which calls `he_P_SC_applyExpressionBySearch()` on the host side (Search Captain in `host_APPLY.jsx`).
- Otherwise, serializes `{ expressionText: expr }` and calls `he_S_SS_applyExpressionToSelection()` ("Selection Striker" in `host_APPLY.jsx`), which applies the expression to all selected animatable properties with visibility toggling for hidden layers and undo grouping.
- Toast feedback reports applied count or error messages.

**Orange Apply -- Target List / Custom Search** (`#applyTargetBtn` in `main_BUTTON_LOGIC_1.js`):
- When Custom Search is active, builds an expression via `buildExpressionForSearch()` (which calls `he_U_TP_peekTypeForSearch()` to detect value type), then routes to `he_P_SC_applyExpressionBySearch()`.
- When using Target List mode, collects paths from `#TargetList` DOM items and applies via `he_S_LS_applyExpressionToTargetList()`.

**Presets** (`initPresets`, `buildExpressionForSelection` in `main_EXPRESS.js`):
- A `PRESETS` array contains expression templates with dimension-aware variants (`OneD`, `TwoD`, `ThreeD`, `Color`).
- `buildExpressionForSelection()` calls `he_U_TS_peekSelectionType()` on the host to detect the selected property's value type, selects the matching variant, and substitutes parameter values.

**Delete Expressions** (`cy_deleteExpressions` in `main_EXPRESS.js` -> `cy_deleteExpressions` in `host_UTILS.jsx`):
- Removes expressions from the current selection scope, respecting Search Captain group scoping rules.

**Search & Replace** (`cy_replaceInExpressions` in `main_EXPRESS.js`):
- Iterates selected layers, collects expression targets via `cy_collectExprTargets()` -> `he_EX_collectExpressionsForLayer()`.
- Optionally filters entries by Custom Search term using `cy_filterEntriesByCustomSearch()` (right-to-left token matching on `>` delimited path segments).
- Performs regex-based literal replacement (with case sensitivity toggle) on each expression string.
- Applies modified expressions in batch via `cy_safeApplyExpressionBatch()` -> `he_EX_applyExpressionBatch()`.
- Categorizes apply errors into critical vs. suppressed (benign warnings like "Expression Disabled" or "ReferenceError").

---

## 1.4 Expression Validation

No dedicated pre-apply validation or linting step exists in the CEP layer. Validation occurs implicitly on the host side when AE evaluates the expression upon assignment. The host functions (`he_S_SS_applyExpressionToSelection`, `he_P_SC_applyExpressionBySearch`) return error payloads when expressions fail to evaluate, and these are surfaced to the user via toast messages.

The `categorizeApplyErrors()` helper inside `cy_replaceInExpressions` distinguishes benign AE warnings ("Expression Disabled", "ReferenceError") from critical failures, suppressing noise in the search-and-replace feedback path.

*A formal expression linting or pre-validation system (e.g., static analysis before apply) could be documented here if implemented in the future.*

---

## Open Bugs

*When a bug is resolved: apply `~~strikethrough~~` and add a Dev Log entry noting the fix. Do not delete.*

- **EXPRESS VISIBILITY (assumed-behaviour):** Hiding `#expressArea` with `display:none` is assumed to preserve CodeMirror integrity, but this has not been formally verified. Potential risk of editor state corruption on re-show.
- **CodeMirror bundle export shape:** Bundle export mismatches remain a risk if the CodeMirror bundle is rebuilt; initialization depends on `window.codemirror.EditorState` being present.
- **Double-apply path:** `cy_evalApplyExpression` (in `main_SNIPPETS.js`) coexists with the Blue Apply path; snippet playback and direct apply could theoretically produce overlapping calls if both are triggered in quick succession.
- **Gutter overflow:** Tightened gutter padding may cause digit overflow in documents with very high line counts (documented in Dev Notes 2025-10-30).

---

## Dev Log

- 1: Initial feature documentation created from AGENTS/ migration. Content sourced from `z_DEPRECATED_AGENTS.md`, `ROADMAP_CODE_MAP.md`, `KNOWLEDGE_BASE.md`, and direct inspection of `main_EXPRESS.js`, `main_DEV_INIT.js`, `main_BUTTON_LOGIC_1.js`, `host_APPLY.jsx`, `host_GET.jsx`, and `host_UTILS.jsx`.

- 2: Mode switcher bar layout — EXPRESS/REWRITE buttons stretch to fill available width (`css/styles.css`). `.mode-switch-cluster` given `flex: 1; min-width: 0` so the cluster expands to fill the space between the bar's left edge and the `#editorMaximizeBtn` on the right. Within the cluster, `.modeSwitchBar .mode-btn` (EXPRESS and REWRITE) given `flex: 1; min-width: 0` so they grow equally to fill cluster space. `#btnModeSwitch` (middle diamond switcher) carries no flex-grow, so it stays fixed-size. Net result: the EXPRESS and REWRITE labels stretch dynamically to fill all available horizontal space up to the maximize button, which remains right-aligned via its existing `margin-left: auto`.

- 3: Express editor made content-sized (shrinks/grows with line count). Previously `#codeEditor` was `flex: 1 1 auto !important` in the `.he-mode-views` flex column, making the editor fill all available panel space regardless of content. Changed to `flex: 0 0 auto !important; height: auto !important` across all declaration sites in `styles.css` and `codemirror_styles.css`. `#codeEditor .cm-editor` changed from `height: 100%` to `height: auto`. Minimum 3-line height enforced by setting `min-height: 56px !important` on `.cm-content` and `.cm-gutter` via the `html.theme-default #codeEditor` selector (overrides the global 50px rule). Maximize mode preserved: `body.editor-maximized #codeEditor` now uses `!important` on `flex: 1 1 auto` and `height: 100%` to win against the content-sized override, and a matching `body.editor-maximized #codeEditor .cm-editor { height: 100% }` rule was added.

- 4: Maximize mode layout refinement — editor gutter now reaches the true top of the panel. Added `body.editor-maximized .modeSwitchBar { display: none !important; }` to hide the mode switcher bar completely (was relying on earlier `.hdr` hide rule which wasn't hitting it). Added `body.editor-maximized #modeViewExpress { display: none !important; }` to hide the (empty) mode view tab panel and prevent it from consuming ~36px of vertical space via erroneous `flex: 1 1 auto`. Added `body.editor-maximized #modePanel { margin-top: 0 !important; }` to eliminate the 5px top margin that was offsetting the entire container from the panel edge. Changed `body.editor-maximized #toast { display: block; }` to `display: none !important` to hide the empty footer element that was appearing as a mysterious lilac pill at the bottom center. Updated the actual toast notification element (`#toast` positioned fixed) to use `color: var(--G-color-1)` and added `border: 1px solid var(--G-color-1)` for text and outline styling per design. Optimized bottom-area spacing in maximize mode: reduced button gap from 8px to 4px, applied `transform: scale(0.9)` to Apply button and `scale(0.85)` to Delete/Settings buttons, reduced apply-row padding from `4px 8px 8px` to `2px 4px 4px`, and added `margin-top: 8px` to custom search to push it closer to the smaller buttons below. Net result: CodeMirror gutter now starts at y=1px (1px border offset only), and bottom button area uses space much more efficiently.

- 5: 2026-04-23 — **EDITOR_insertText cursor-position fix.** `EDITOR_insertText` in `js/main_EXPRESS.js` previously checked `isFocused` (whether the editor DOM had focus) before deciding where to insert text. When the editor lost focus — e.g. during PickClick when the user was clicking in AE — the function fell back to appending at `docLength` instead of inserting at the cursor position. This meant Load Path, Load Expression, and snippet insertion always appended to the end rather than inserting at the cursor or replacing a selection. Fix: removed the `isFocused` gate entirely. CodeMirror 6 preserves `state.selection.main` regardless of DOM focus, so the cursor/selection range is always valid. Text now inserts at the cursor position, or replaces highlighted text, even when the editor is unfocused. File edited: `js/main_EXPRESS.js`. **Verified in AE 2026-04-23.**

- 6: 2026-04-23 — **Editor scroll fix.** The CodeMirror editor could not be scrolled with the mouse wheel when content exceeded the panel's visible area. Root cause: `#codeEditor` had `flex: 0 0 auto !important; height: auto !important` (set in Dev Log entry 3), which made the container grow infinitely with content instead of being constrained by the flex layout. The `.cm-editor` had `height: auto`, also growing unconstrained. Since `.modePanel-inner` has `overflow: hidden`, the excess content was clipped with no scrollbar. Fix: changed `#codeEditor` to `flex: 1 1 0 !important; min-height: 56px` across both declaration sites in `css/styles.css` (the base rule and the `!important` override). Changed `#codeEditor .cm-editor` from `height: auto` to `height: 100%`. The editor now fills available flex space and is constrained by the panel height. CM6's internal `.cm-scroller` (already `overflow: auto` with custom scrollbar styling) handles content overflow. Maximize mode unaffected — its `!important` overrides already set the correct values. File edited: `css/styles.css`. **Verified in AE 2026-04-23.**

- 7: 2026-04-23 — **Selection highlight styling.** Added `.cm-selectionBackground` rule to `css/styles.css` using `rgba(var(--G-colour-1-RGB), 0.35)` — a translucent overlay of the user's accent color. Covers both focused and unfocused editor states. CM6's selection background renders behind text content by default, so text remains fully legible. Previously used CM6's default selection color which was nearly invisible against the dark editor background. File edited: `css/styles.css`. **Verified in AE 2026-04-23.**
