# Expression Load Paths

**Files:** `jsx/Modules/host_GET.jsx` (path builder, leaf accessors, group maps) | `js/main_BUTTON_LOGIC_1.js` (CEP trigger, PickClick arm/resolve) | `AGENTS/LOAD PATHS SPECIFIC/EXPRESSION FRIENDLY PATH BANK.csv` (source truth for path patterns) | `AGENTS/LOAD PATHS SPECIFIC/PATH BANK GUIDE.md` (grammar rules for the bank)
**Key functions:** `he_GET_SelPath_Simple` (canonical path builder), `he_P_MM_getExprPathHybrid` (legacy fallback, un-quarantined)
**UI Section:** `#loadPathFromSelectionBtn` in `.express-editor-overlay-buttons` (`index.html` line ~461). The `#useAbsoluteComp` checkbox (same flex container) toggles between `comp("...")` and `thisComp` preambles.

Load paths are the mechanism by which Holy Expressor translates a user's After Effects timeline selection into a valid expression-path string that can reference that property programmatically. When the user selects a single leaf property in AE and clicks "Load path from selection," the CEP side arms a PickClick session with intent `"load-path"`, and on resolve calls `he_GET_SelPath_Simple` via `evalScript`. The host function walks the property's parent chain, classifies it as shape or non-shape mode, maps each ancestor group and the leaf itself through deterministic allow-lists (`SHAPE_MODIFIER_ALLOW`, `DOT_GROUP_ACTION`, `LAYER_STYLE_GROUP_MAP`, `LEAF_ACCESSORS`), and assembles a complete expression string. The result is returned as JSON (`{ ok, expr }` or `{ ok: false, error, matchName, displayName }`). Separately, the Expression Friendly Path Bank (EFPB) is a structural grammar registry that standardises self-relative path patterns across all AE property domains -- it serves as the source of truth from which `LEAF_ACCESSORS` and group maps were derived.

*For the host bridge and evalScript patterns, see `Docs/ARCHITECTURE.md`.*

---

## 8.1 Path Resolution

### Canonical builder: `he_GET_SelPath_Simple`

Located in `jsx/Modules/host_GET.jsx` (line 41). This is the **only** path builder that should be used for new work. All legacy builders (`he_GET_SelPath_Engage`, `he_GET_SelPath_Build`, `he_U_getSelectedPaths`, `he_P_MM_getExprPathHybrid`) are quarantined/deprecated -- do not resurrect them.

**Selection validation:**

1. Requires an active `CompItem`.
2. Filters `comp.selectedProperties` to entries where `propertyType === PropertyType.PROPERTY` (leaf nodes only).
3. Hard-requires **exactly one** leaf property. Zero or multiple selections are rejected with clear error JSON.
4. Containers (`propertyType !== PROPERTY`) are rejected early.
5. Properties where `canSetExpression === false` are rejected.

**Parent chain extraction:**

The function reads `leaf.propertyDepth` and iterates `leaf.propertyGroup(d)` for `d = 1` to `depth - 1`, collecting every ancestor into `parentChain[]`. This chain is **leaf-to-root** order (closest ancestor first). The owning layer is resolved separately via `propertyGroup(depth)`.

**Shape vs non-shape mode split:**

Detected by scanning `parentChain` for any group whose `matchName` starts with `"ADBE Vector"`. This is a structural check, not an assumption based on layer type.

**Shape mode traversal:**

- `parentChain` is reversed to root-to-leaf order (`shapeChain = parentChain.slice().reverse()`).
- `"Contents"` nodes and `"ADBE Root Vectors Group"` are explicitly skipped.
- Shape modifiers are validated against `SHAPE_MODIFIER_ALLOW` (Taper, Trim, Round Corners, Repeater, Offset). Unknown modifiers return an error.
- Stroke subgroups use `DOT_GROUP_ACTION`: `ADBE Vector Stroke Dashes` emits `.dash`, `ADBE Vector Stroke Taper` emits `.taper`, `ADBE Vector Stroke Wave` / `ADBE Vector Taper Wave` are skipped (leaf accessors handle the dot path directly, e.g. `.wave.amount`).
- All other shape groups emit `.content("<display name>")`.

**Non-shape mode traversal:**

Iterates `parentChain` in reverse (root-to-leaf). Each group is classified by `matchName`:

| matchName | Emits | Notes |
|---|---|---|
| `ADBE Transform Group` | `.transform` | |
| `ADBE Audio Group` | `.audio` | |
| `ADBE Camera Options Group` | `.cameraOption` | |
| `ADBE Light Options Group` | `.lightOption` | |
| `ADBE Material Options Group` | `.materialOption` | |
| `ADBE Mask Parade` | (sets `pendingMask` flag) | Next group emits `.mask("<name>")` |
| `ADBE Effect Parade` | (sets `pendingEffect` flag) | Next group emits `.effect("<name>")` |
| `ADBE Layer Styles` | `.layerStyle` | Sets `pendingLayerStyle`; sub-groups resolved via `LAYER_STYLE_GROUP_MAP` |

Any group not matching these patterns returns an error with its `matchName` and `displayName` for diagnostic refinement.

**Leaf accessor resolution:**

After group segments are assembled, `LEAF_ACCESSORS[leaf.matchName]` provides the final dot-access token (e.g. `.strokeWidth`, `.opacity`, `.path`). If no mapping exists, the function returns an error including the unrecognised `matchName` -- this is the mechanism for discovering gaps.

**Final assembly:**

```
base + groupSegments.join("") + leafAccessor
```

Where `base` is either `comp("<compName>").layer("<layerName>")` (absolute) or `thisComp.layer("<layerName>")` (relative), controlled by the `useAbsoluteComp` parameter. Display names are escaped via `he_escapeExprString`.

### Legacy fallback: `he_P_MM_getExprPathHybrid`

Still present in `host_GET.jsx` (line 538) and callable at runtime as a regression guard. Uses a different structural skip list (`ADBE Root Vectors Group`, `ADBE Vector Group`, `ADBE Vector Shape - Group`). **Do not extend or rely on this function for new features** -- it exists solely to prevent regressions in code paths that have not yet been migrated.

---

## 8.2 Path Bank

### What it is

The Expression Friendly Path Bank (EFPB) is a **grammar registry for self-relative expression paths**, stored as `AGENTS/LOAD PATHS SPECIFIC/EXPRESSION FRIENDLY PATH BANK.csv`. It is not a property enumeration -- it is a structural taxonomy where each row defines a **namespace pattern**, not an individual property.

### Table structure

| Column | Meaning |
|---|---|
| **Category ID** | Stable internal identifier (e.g. `T-01`, `S-03`). Do not repurpose. |
| **Category (Immediate Parent Group Path)** | The structural location defining the namespace. |
| **Applies To / Siblings** | Properties sharing the same grammar pattern. |
| **FEP Format** | Reusable self-relative path template. |
| **Concrete Example** | Verified working expression path. |

All paths are **self-relative** -- no `thisLayer`, `thisComp`, `layer()`, or comp references. Paths begin at the property's immediate expression root (e.g. `transform.scale`, not `thisLayer.transform.scale`).

### Five primary structural systems

- **Text** (`text.*`) -- source text, animators, selectors, more options.
- **Effects** (`effect("<name>")("<prop>")`) -- generic, never enumerated per-effect.
- **Layer Core** (`transform.*`) -- position, scale, rotation, opacity, anchor point, 3D transforms.
- **Shape Contents** (`content("<group>").*`) -- fills, strokes, stroke subgroups (dashes, taper, wave), shape modifiers.
- **Layer Styles** (`layerStyle.<style>.<property>`) -- drop shadow, inner shadow, glows, bevel, satin, overlays, stroke.

Each system has its own root grammar. They do not mix.

### `LAYER_STYLE_GROUP_MAP`

Defined in `host_GET.jsx` (line 147). Maps AE layer style sub-group `matchName` values to expression dot-access segments:

| matchName | Expression accessor |
|---|---|
| `dropShadow` | `.dropShadow` |
| `innerShadow` | `.innerShadow` |
| `outerGlow` | `.outerGlow` |
| `innerGlow` | `.innerGlow` |
| `bevelEmboss` | `.bevelAndEmboss` |
| `chromeFX` | `.satin` |
| `solidFill` | `.colorOverlay` |
| `gradientFill` | `.gradientOverlay` |
| `frameFX` | `.stroke` |
| `ADBE Blend Options Group` | `.blendingOption` |
| `ADBE Adv Blend Group` | `.advancedBlending` |

Note: `ADBE Blend Options Group` and `ADBE Adv Blend Group` mappings are best-guess. The toast error now includes the actual `matchName` when these fail, enabling refinement from live AE feedback.

### How to extend the bank

From `PATH BANK GUIDE.md`:

1. **Categories are defined by immediate parent**, not by concept. If `Stroke > Dashes` and `Stroke > Taper` have different grammar, they are separate categories.
2. **Siblings share grammar.** `transform.anchorPoint`, `transform.position`, `transform.scale` all fit `transform.<property>` -- one row, not three.
3. **Generic domains stay generic.** Effects, shape modifiers, and layer styles each have a single template row. Do not enumerate individual effects or styles unless grammar diverges.
4. **Only add rows when grammar changes** -- new namespace root, new sub-group dot-chain segment, or new access pattern.
5. **Verify expression output directly from AE.** Do not infer. Do not assume symmetry. Do not generalise without evidence.

### Relationship to code

`LEAF_ACCESSORS` in `host_GET.jsx` (~200 entries) was populated from the EFPB CSV. When a new property domain is added to the bank, the corresponding `matchName -> accessor` entry must also be added to `LEAF_ACCESSORS`, and if it introduces a new group traversal pattern, to the non-shape walker's `matchName` classification block.

---

## 8.3 Agent Rules for Path Work

These rules are extracted from hard-won debugging sessions. They are non-negotiable.

1. **Determinism beats coverage. Always.** A path builder that handles 20 properties correctly is better than one that handles 200 with edge-case failures. Extend via allow-lists only.

2. **Assume selection is hostile. Validate aggressively.** Users will select containers, multiple properties, properties without expression access, or nothing at all. Every case must return a clear error, not a corrupted path.

3. **Property groups are leaf-to-root; expressions are root-to-leaf.** `propertyGroup(d)` returns ancestors from closest to farthest. Expression paths read from farthest to closest. The reversal happens exactly once. If you forget this, you will waste hours debugging inverted paths.

4. **Never auto-skip groups you don't understand -- fail loudly.** Unknown `matchName` values must return an error with the matchName included. Silent skipping produces paths that "almost work," which is the most dangerous state.

5. **If a path "almost works," it is wrong.** Partial correctness means a structural misunderstanding exists. A path that resolves to `undefined` instead of throwing is harder to debug than one that fails outright.

6. **Shape vs non-shape is detected structurally, not assumed.** The `matchName` prefix `"ADBE Vector"` determines shape mode. Do not infer shape mode from layer type or selection context.

7. **Do not resurrect legacy builders.** `he_GET_SelPath_Engage`, `he_GET_SelPath_Build`, `he_U_getSelectedPaths` are quarantined. `he_P_MM_getExprPathHybrid` is retained only as a regression guard. All new path work must extend `he_GET_SelPath_Simple`.

8. **Structural skipping is minimal and explicit.** Only `"Contents"` and `"ADBE Root Vectors Group"` are skipped in shape mode. The old rewrite tables (`GROUP_TOKENS`, `STRUCTURAL_SKIP`, `LIL_NAME_GROUPS`) are not carried over.

---

## Open Bugs

*When a bug is resolved: apply `~~strikethrough~~` and add a Dev Log entry noting the fix. Do not delete.*

- ~~**OPEN-5:** `he_GET_SelPath_Simple` has incomplete property coverage. Many properties still lack formal accessor mapping in `LEAF_ACCESSORS`. The breadcrumb fallback in `he_PICK_LeafProp_Snapshot` mitigates for PickClick display but does not produce valid expression paths.~~ PARTIALLY FIXED — effect properties (including all expression controls: Slider, Checkbox, Color, Point, Angle, Layer, Dropdown) now use `("displayName")` syntax via an `insideEffect` context flag in the non-shape walker. This also covers nested effect sub-groups. Non-effect properties outside `LEAF_ACCESSORS` remain unsupported. See Dev Log entry 4.
- **OPEN-12:** Blending options matchName mappings (`ADBE Blend Options Group`, `ADBE Adv Blend Group`) in `LAYER_STYLE_GROUP_MAP` are best-guess. Toast now reports actual matchName on failure for iterative refinement. Low risk.

---

## Dev Log

- 1: Initial feature documentation created from AGENTS/ migration. Content sourced from `_ARCHIVE_EXTRACTION.md` (section `## FOR: 08-load-path`), `AGENTS/LOAD PATHS SPECIFIC/PATH BANK GUIDE.md`, `AGENTS/LOAD PATHS SPECIFIC/EXPRESSION FRIENDLY PATH BANK.csv`, and direct inspection of `jsx/Modules/host_GET.jsx` and `js/main_BUTTON_LOGIC_1.js`.

- 2: `#useAbsoluteComp` checkbox diamond SVG reduced from 14px to 11px (`css/styles.css`). Applied via `.express-editor-overlay-checkbox svg.btn-icon` CSS override, consistent with the same size reduction applied to `.checkbox-layercontrols` in the snippets bar.

- 3: `#useAbsoluteComp` checkbox nudged down and visually connected to `#loadPathFromSelectionBtn` (`css/styles.css`). (a) Added `margin-top: 2px` to `.express-editor-overlay-checkbox` to offset the checkbox 2px below the row's centre line. (b) Added `position: relative` to enable the `::after` pseudo-element. (c) `::after` draws a 3px × 1px horizontal line from the checkbox's right edge to the load path button's left edge (the gap was measured as exactly 3px — `gap: 6px` on the flex parent minus `margin-right: -3px` on the wrapper). Line colour is `var(--text-faint)`, matching the checkbox SVG stroke. (d) `.express-editor-overlay-checkbox:hover::after` changes the line to `var(--G-color-1)`, matching the checkbox ring hover colour. Transition applied via `transition: background-color var(--transition)`.

- 4: 2026-04-22 — **Effect property path support.** `he_GET_SelPath_Simple` previously failed on all effect properties (Slider Control, Checkbox Control, Color Control, etc.) because their leaf matchNames (e.g. `ADBE Slider Control-0001`) had no entry in `LEAF_ACCESSORS`. Effect properties use `("displayName")` syntax, not dot-access, so they cannot be pre-mapped the same way. Fix: added `insideEffect` context flag to the non-shape walker in `host_GET.jsx`. When the `pendingEffect` handler emits `.effect("name")`, it sets `insideEffect = true`. Any subsequent groups inside the effect emit `("name")` instead of failing as "Unsupported group". The leaf accessor also checks `insideEffect` — when true, uses `("displayName")` syntax instead of requiring a `LEAF_ACCESSORS` entry. This covers: (a) all expression controls (Slider, Checkbox, Color, Point, Angle, Layer, Dropdown), (b) third-party effects, and (c) effects with nested sub-groups (e.g. `effect("CC Particle World")("Physics")("Velocity")`). Non-effect properties outside `LEAF_ACCESSORS` are unaffected — they still return the diagnostic error with matchName. OPEN-5 partially resolved. `he_PICK_LeafProp_Snapshot` in `host_PICKCLICK.jsx` benefits automatically since it calls `he_GET_SelPath_Simple` internally. File edited: `jsx/Modules/host_GET.jsx`. **Verified in AE 2026-04-22** — user confirmed Slider Control resolves correctly via Load Path. Screenshot shows `effect("H offset")("Slider")` path working as expected.

- 5: 2026-04-22 — **Expression control group-to-leaf promotion.** When a user selects an expression control by clicking its name in the AE Effects panel (e.g. "Checkbox Control"), AE selects the effect *group*, not the leaf property inside it. Previously this returned "Select exactly one property" because the group was filtered out during leaf detection. Fix: added `he_promoteExprControlToLeaf(props)` helper in `host_GET.jsx` with an allow-list (`HE_SINGLE_PROP_CONTROLS`) of expression control matchNames known to contain exactly one expression-capable property: Slider (`ADBE Slider Control`), Checkbox (`ADBE Checkbox Control`), Color (`ADBE Color Control`), Point (`ADBE Point Control`), 3D Point (`ADBE Point3D Control`), Angle (`ADBE Angle Control`), Layer (`ADBE Layer Control`), Dropdown (`ADBE Dropdown Menu Control`). The helper verifies: (a) exactly one property is selected, (b) it's a group (not already a leaf), (c) its matchName is in the allow-list, (d) its parent is `ADBE Effect Parade`, (e) it contains exactly one expression-capable leaf child. If all checks pass, the leaf is returned as a promoted selection. Promotion inserted into both `he_GET_SelPath_Simple` (`host_GET.jsx`) and `he_PICK_LeafProp_Snapshot` (`host_PICKCLICK.jsx`) — called only when the initial leaf filter finds zero results. Multi-property effects and non-expression-control effects are unaffected. Files edited: `jsx/Modules/host_GET.jsx`, `jsx/Modules/host_PICKCLICK.jsx`. Untested in AE — user verification needed.
