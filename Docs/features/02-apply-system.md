# Apply System

**Files:** `jsx/Modules/host_APPLY.jsx` (Selection Striker, List Striker, Token Striker, Search Captain), `jsx/Modules/host_GET.jsx` (`he_P_GS3_findPropsByTokenPath`), `js/main_BUTTON_LOGIC_1.js` (`onApply`, `wirePanelButtons`), `js/main_EXPRESS.js` (`HE_applyByStrictSearch`, `PORTAL_getCurrentExpression`), `js/main_UI.js` (`onTarget`)
**UI Section:** Main Panel -- Apply buttons area (`#applyBtn`, `#targetSelectedBtn`, `#selectTargetBtn`)

The apply system writes expressions to After Effects layer properties. It has two modes: Blue Apply (standard, without Custom Search) and Orange Apply (with Custom Search or Target List). Blue Apply operates directly on the user's current AE property selection. Orange Apply uses Search Captain to scan layers for properties matching a Custom Search term, or applies to a pre-captured Target List of property paths. Both modes route through `evalScript` to ExtendScript functions in `host_APPLY.jsx`, and both wrap mutations in an AE undo group with layer-visibility tracking (temporarily enabling layers so expressions can be written, then restoring original state).

*For cross-cutting systems (host bridge, storage), see `Docs/ARCHITECTURE.md`.*

---

## 2.1 Blue Apply (Standard)

Blue Apply is the default apply path. It fires when `#applyBtn` is clicked and Custom Search is not active.

**CEP side:**
1. `onApply()` in `main_BUTTON_LOGIC_1.js` reads the editor contents via `Holy.EXPRESS.PORTAL_getCurrentExpression()`.
2. If Custom Search (`#useCustomSearch`) is unchecked, the expression text is JSON-serialized as `{ expressionText }` and sent to the host via `evalScript('he_S_SS_applyExpressionToSelection(...)')`.
3. The response is parsed and routed through `updateApplyReport("Blue Apply", report)` for the apply log, followed by a `Holy.UI.toast()` for user feedback.

**Host side -- Selection Striker (`he_S_SS_applyExpressionToSelection`):**
1. Reads `comp.selectedProperties` to determine targets.
2. For each selected item: if it is a property group (`INDEXED_GROUP` / `NAMED_GROUP`), the function recurses into it via `recurseGroup()`, applying only to children that are themselves selected. If it is a leaf property with `canSetExpression`, it applies directly.
3. Recursion is gated to explicitly selected groups only -- leaf properties outside the selection scope are ignored. There is no user control over recursion depth beyond this guard.
4. Deduplication uses `he_P_MM_getExprPath()` expression-path strings stored in a `visited` map.
5. Layer Style properties are silently skipped when the owning style is not enabled (`he_U_Ls_1_isLayerStyleProp` + `he_U_Ls_2_styleEnabledForLeaf` guards).
6. Results are returned as `{ ok, applied, written, skipped, errors }`.

---

## 2.2 Orange Apply (Custom Search / Target List)

Orange Apply covers two sub-modes, both visually distinguished by an orange flash on the apply button.

### Custom Search (Search Captain)

When `#useCustomSearch` is checked and `#customSearch` contains a search term:

**CEP side:**
1. `onApply()` detects the active checkbox and calls `Holy.EXPRESS.HE_applyByStrictSearch(expr, searchVal)` in `main_EXPRESS.js`.
2. `HE_applyByStrictSearch` serializes `{ expressionText, searchTerm, strictMode: true }` and calls `evalScript('he_P_SC_applyExpressionBySearch(...)')`.
3. Results are routed through `updateApplyReport("Blue Apply by Custom Search", report)` and toast feedback.

**Host side -- Search Captain (`he_P_SC_applyExpressionBySearch`):**
1. Tokenizes the search term on `>` (e.g. `"Rectangle 1 > Stroke Width"` becomes `["Rectangle 1", "Stroke Width"]`). Tokens are whitespace-trimmed using regex `replace(/^\s+|\s+$/g, "")` -- **not** `.trim()`, which is unavailable in ExtendScript.
2. Builds layer scope from `comp.selectedLayers` (preferred) or falls back to layers owning `comp.selectedProperties`.
3. Calls `he_U_SC_buildAllowedGroupSignatures(comp)` to compute group scoping. Returns `null` for whole-layer scope; returns an object map of signatures when specific groups are selected.
4. When groups are selected, traversal starts from those group roots (`selectedGroupRoots`). Otherwise traversal starts from full layers.
5. For multi-token paths, `he_P_GS3_findPropsByTokenPath()` (in `host_GET.jsx`) walks group tokens via GS1 (`he_P_GS1_collectGroupsByTokenDeep`) and leaf tokens via GS2 (`he_P_GS2_collectPropsByTokenDeep`).
6. For single-token searches, `he_P_GS3_findPropsByTokenPath` is also used (wrapping the single token in an array). An older function `he_S_TS_collectAndApply` (Token Striker) exists but is **not used by Search Captain** -- it applied during traversal and exited early per branch, causing "only Rectangle 1 gets hit" regressions.
7. Collected targets are post-filtered through `he_U_SC_isDescendantOfAllowedGroup()` when group scoping is active.
8. Expression application happens in a second pass after collection (collect-then-apply pattern).

### Target List

The Target List flow captures property paths first, then applies to those stored paths:

**Capture:**
1. `#targetSelectedBtn` calls `Holy.UI.onTarget()` in `main_UI.js`.
2. `onTarget()` invokes `he_U_SS_getSelectionSummary()` on the host, which snapshots the current selection as an array of `{ path, layerName, displayName, isArray, length }` items.
3. Results are rendered as `.target-item` divs inside `#TargetList`, each carrying a `data-path` attribute.

**Apply:**
1. The List Striker (`he_S_LS_applyExpressionToTargetList`) receives `{ expressionText, targetPaths }`.
2. For each path string, it resolves properties via `he_P_EX_findPropertiesByPath(comp, pathString)`.
3. Each resolved property is checked for `canSetExpression`, `enabled`, `active`, phantom Layer Style status (`he_U_PB_isPhantomLayerStyleProp`), and true hidden state (`he_U_VS_isTrulyHidden`).
4. Returns `{ ok, applied, skipped, errors }`.

---

## 2.3 Apply Pipeline

All apply paths follow the same structural pattern:

1. **Scope resolution** -- determine which layers and/or groups are in scope from the AE selection.
2. **Collection** -- gather target properties into an array. Search Captain uses `he_P_GS3_findPropsByTokenPath` for token-based traversal; Selection Striker walks `selectedProperties` directly; List Striker resolves stored path strings.
3. **Filtering** -- exclude phantom Layer Style properties, truly hidden properties, and (when group scoping is active) properties outside allowed group signatures.
4. **Deduplication** -- Search Captain uses ancestry-based `visitedKey` signatures (`buildPropSignature`): `ownerLayerIndex | matchName:propertyIndex > matchName:propertyIndex > ...`. This replaced an earlier `exprPath`-based short-circuit that caused collisions across repeated shape groups (e.g. multiple "Rectangle 1" instances). Selection Striker uses simpler `he_P_MM_getExprPath()` deduplication.
5. **Layer state tracking** -- `trackLayerState()` records each owning layer's `enabled` state. `enableTrackedLayers()` temporarily enables all tracked layers before writes. `restoreLayerVisibility()` restores original states in a `finally` block.
6. **Undo grouping** -- all writes are wrapped in `app.beginUndoGroup()` / `app.endUndoGroup()`, with `finally` guards to ensure the undo group closes even on errors.
7. **Result reporting** -- each striker returns a JSON manifest (`{ ok, applied, skipped, errors }`). The CEP side parses this, logs it via `updateApplyReport()`, emits customer-facing feedback via `Holy.UTILS.NEW_forCustomer_emit()`, and shows a toast.

**Scope alignment with Delete:** The shared scope helpers (`he_U_SC_owningLayer`, `he_U_SC_isContentsGroup`, `he_U_SC_buildGroupSignature`, `he_U_SC_buildAllowedGroupSignatures`, `he_U_SC_isDescendantOfAllowedGroup`) are defined at the top of `host_APPLY.jsx` and used by both Search Captain and Delete Expressions to ensure consistent traversal semantics.

---

## 2.4 Custom Search Details

### The `.trim()` resurrection fix

Custom Search was broken for months (prior to 2025-12-04). The root cause was an illegal `.trim()` call in ExtendScript on a non-string token after splitting the search term on `>`. ExtendScript's ES3 runtime does not have `String.prototype.trim()`. The exception was thrown inside the host but never propagated to CEP, so the feature silently failed with no error visible to the user.

**Fix:** Token whitespace trimming now uses `rt.replace(/^\s+|\s+$/g, "")` instead of `.trim()`. Token handling also guards against non-string values before processing.

After the fix, strict matching was verified working for: Stroke Width, Opacity, Fill Color, Roundness -- including nested/container-scoped queries via `>` (e.g. `"Rectangle 1 > Stroke Width"`).

### Scoping rules

- **`allowedGroupSignatures === null`** (no groups selected, or "Contents" selected): whole-layer scope. Search Captain traverses the entire layer tree.
- **`allowedGroupSignatures` is an object**: group-constrained scope. Only properties that are descendants of an allowed group pass the `isDescendantOfAllowedGroup()` post-filter.
- **Signature format**: `ownerLayerIndex | matchName#propertyIndex > matchName#propertyIndex > ...` -- built by walking `parentProperty` chains and reversing.
- **"Contents" override**: selecting the "Contents" group on a shape layer returns `null` from `buildAllowedGroupSignatures`, which means whole-layer scope. This is intentional -- "Contents" is the root vector group and selecting it signals "all of this layer."
- **Regression (fixed)**: `he_U_SC_isDescendantOfAllowedGroup` previously had an early return where any ancestor named "Contents" auto-accepted descendants, short-circuiting group scoping entirely for shape layers. Fix: the "Contents means whole layer" shortcut now only applies when `allowedGroupSignatures === null`.

### Key constraints

- DO NOT rely on expression-path strings as a hierarchy source for shape layer filtering (wrapper object identity is unreliable across calls in ExtendScript).
- Prefer the collect-then-apply pattern. The older Token Striker (`he_S_TS_collectAndApply`) applies during traversal and is retained only as a utility -- Search Captain does not call it.

---

## Open Bugs

*When a bug is resolved: apply `~~strikethrough~~` and add a Dev Log entry noting the fix. Do not delete.*

- **Target List flooding** -- Target List apply may flood when applied to many layers. One-level-deep recursion has been proposed but not implemented. Deduplication for Target List paths is not finalized. Unresolved.
- **Display-name-based target paths** -- Target List paths use display names, which are rename-sensitive and locale-unsafe. Full `matchName` migration has not started. Deferred.

---

## Dev Log

- 1: Initial feature documentation created from AGENTS/ migration. Covers Blue Apply (Selection Striker), Orange Apply (Search Captain + Target List / List Striker), apply pipeline, Custom Search `.trim()` fix, and scoping rules. Source: `_ARCHIVE_EXTRACTION.md` section `02-apply-system` + live code in `host_APPLY.jsx`, `main_BUTTON_LOGIC_1.js`, `main_EXPRESS.js`, `main_UI.js`.
