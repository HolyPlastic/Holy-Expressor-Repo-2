# Delete Expressions

**Files:** `jsx/Modules/host_UTILS.jsx` (`cy_deleteExpressions`, `disableExpressionOnProperty`, `traverseNode`, `findLayerForNode`, `trackLayerState`, `enableTrackedLayers`, `restoreLayerVisibility`) | `js/main_EXPRESS.js` (`cy_deleteExpressions` CEP wrapper) | `js/main_BUTTON_LOGIC_1.js` (click handler wiring for `#deleteExpressionsBtn`)
**UI Section:** Main Panel -- Delete button area (`#deleteExpressionsBtn` in `index.html`)

Delete Expressions removes all expression text and disables expression evaluation on selected After Effects properties or layers. The user selects one or more properties, property groups, or entire layers in the AE timeline, then clicks the delete button. The system traverses the selection roots depth-first, clearing every expression-capable leaf property it encounters. The operation is wrapped in a single AE undo group ("Holy Delete Expressions"), and owning layers are temporarily enabled during traversal to ensure hidden/disabled layers can still have their expressions cleared. The entire pipeline uses live object references -- no path strings, no re-resolution, no cross-layer inference.

*For scope alignment with the Apply system, see `Docs/features/02-apply-system.md`. For cross-cutting systems, see `Docs/ARCHITECTURE.md`.*

---

## 9.1 Selection-Root Traversal Model

Delete Expressions uses a Phase 1 minimal traversal model that operates exclusively on live AE DOM objects. The design was an intentional departure from reusing the Search Captain collector (Orange Apply's traversal system); instead, it implements its own local traversal to keep destructive operations simple and auditable.

**Selection precedence** is explicit and non-inferring:
1. `comp.selectedProperties.length > 0` -- property/group intent. Each selected property or group becomes a traversal root.
2. Else `comp.selectedLayers.length > 0` -- layer intent. Each selected layer becomes a traversal root.
3. Else -- early exit with toast: "Select properties or layers to delete expressions".

There is no fallback, no "active comp means all layers" inference. If nothing is selected, nothing happens.

**Traversal characteristics:**
- **Live objects only.** Roots are the actual AE property/layer references from `comp.selectedProperties` or `comp.selectedLayers`. No paths are built, no string-based re-resolution occurs.
- **Depth-first recursion.** `traverseNode(node)` checks `node.canSetExpression` (clears if true), then recurses into `node.numProperties` children via `node.property(ci)`.
- **Ancestry-bounded mutation.** Traversal is strictly scoped to the subtree rooted at each selection root. Properties outside the selected subtrees are never touched.
- **Immediate mutation.** `disableExpressionOnProperty(prop, state, layerMap)` sets `prop.expression = ""` and `prop.expressionEnabled = false` inline during traversal.

**Layer state management:**
- Before traversal begins, `findLayerForNode(rootNode)` walks `propertyGroup(d)` from `propertyDepth` down to 1 to locate the owning `AVLayer` for each selection root. A heuristic fallback checks `typeof rootNode.index === "number"` for bare layer objects where `instanceof AVLayer` fails.
- `trackLayerState(layer)` records each unique owning layer's `enabled` state.
- `enableTrackedLayers()` temporarily enables all tracked layers so AE allows expression mutation on disabled layers.
- `restoreLayerVisibility()` runs in the `finally` block, restoring every layer to its original `enabled` state. A `visibilityRestored` flag prevents double-restore.

---

## 9.2 Scope Alignment with Apply

Delete Expressions and the Apply system (both Blue Apply and Orange Apply / Custom Search) share consistent traversal semantics while remaining logically independent implementations:

- **Same selection precedence rule.** Both systems resolve `comp.selectedProperties` first, falling back to `comp.selectedLayers`. The explicit-selection guard from Apply (recursion gated to only descend into explicitly selected groups) is mirrored in Delete's traversal roots.
- **Same leaf test.** Both systems gate on `canSetExpression === true` to identify expression-capable properties. Both skip phantom Layer Style properties (`he_U_PB_isPhantomLayerStyleProp`) and disabled Layer Style groups (`he_U_Ls_1_isLayerStyleProp` + `he_U_Ls_2_styleEnabledForLeaf`).
- **Intentional divergence on visibility.** Apply calls `he_U_VS_isTrulyHidden(prop)` to skip hidden properties. Delete intentionally does NOT call this guard -- the design choice is that destructive cleanup should reach expressions on hidden/disabled layers too. This is documented inline in `host_UTILS.jsx` at the `disableExpressionOnProperty` function.
- **No shared collector.** Delete does not reuse Search Captain (`he_U_SC_buildAllowedGroupSignatures`) or the GS3 token-walker. It uses its own minimal `traverseNode` recursion. This keeps the destructive path isolated from search/apply complexity.

---

## 9.3 Delete Pipeline

**Step 1: Button click (CEP -- `main_BUTTON_LOGIC_1.js`)**
- `#deleteExpressionsBtn` click handler checks `Holy.EXPRESS.cy_deleteExpressions` exists.
- Button is immediately disabled (`deleteExpressionsBtn.disabled = true`) to prevent double-fire. Re-enabled in both `.then()` and `.catch()` via a `release()` closure.

**Step 2: CEP bridge (`main_EXPRESS.js` -- `cy_deleteExpressions`)**
- Returns a `Promise`.
- Calls `cs.evalScript('cy_deleteExpressions()')` to invoke the ExtendScript backend.
- Logs raw response to `CY_DELETE_DIAGNOSTICS` console group for Chrome DevTools debugging.
- Parses the JSON response. On `result.ok === false`, rejects with `result.err`. On success, resolves with the full result object.
- Emits to the history/customer log via `Holy.UTILS.NEW_forCustomer_emit("Delete Expressions: N expressions")` when available.

**Step 3: Host-side execution (`host_UTILS.jsx` -- `cy_deleteExpressions`)**
1. Validates `app.project` and `app.project.activeItem` is a `CompItem`.
2. Reads `comp.selectedProperties` and `comp.selectedLayers` to determine selection roots and `selectionType` ("properties" or "layers").
3. Opens `app.beginUndoGroup("Holy Delete Expressions")`.
4. For each root, resolves the owning layer via `findLayerForNode()` and records its state via `trackLayerState()`.
5. `enableTrackedLayers()` -- temporarily enables all owning layers.
6. For each root, calls `traverseNode(root)`:
   - If `node.canSetExpression === true`, calls `disableExpressionOnProperty(node, result, layerMap)`.
   - If `node.numProperties > 0`, recurses into children `node.property(1)` through `node.property(numProperties)`.
7. `disableExpressionOnProperty` performs safety checks (phantom Layer Style, disabled Layer Style group), then sets `prop.expression = ""` and `prop.expressionEnabled = false`. Increments `result.clearedProperties` on success. On failure, pushes `{ path, err }` to `result.errors`.
8. Counts affected layers from `layerMap` (keyed by layer ID or index+name).
9. Sets `result.ok = true`, serializes result as JSON string.
10. `finally` block: `restoreLayerVisibility()` restores all layer `enabled` states; `app.endUndoGroup()` closes the undo group.

**Step 4: Result handling (CEP -- `main_BUTTON_LOGIC_1.js`)**
- `.then()`: logs `result.consoleMessage`, warns on `result.hadErrors`, shows toast with `result.toastMessage`.
- `.catch()`: logs error, shows toast with `err.userMessage` or fallback "Delete expressions failed".

**Result object shape** (returned as JSON string from host):
```
{
  ok: Boolean,
  selectionType: "properties" | "layers" | "",
  clearedProperties: Number,
  clearedLayers: Number,
  layers: [],
  errors: [{ path: String, err: String }],
  hadErrors: Boolean,
  toastMessage: String,
  consoleMessage: String
}
```

---

## Open Bugs

*When a bug is resolved: apply `~~strikethrough~~` and add a Dev Log entry noting the fix. Do not delete.*

- No known bugs.

---

## Dev Log

- 1: Initial feature documentation created from AGENTS/ migration. Extracted from `_ARCHIVE_EXTRACTION.md` (section `FOR: 09-delete-expressions`, lines 1922-2004 of original DEV ARCHIVE). Documented full pipeline from button click through CEP bridge to host-side traversal, selection-root model, scope alignment with Apply, and layer state management.
