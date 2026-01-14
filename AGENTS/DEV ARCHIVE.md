# 🕸️ DEV_TIMELINE.md — Project Chronicle

⚠️ **Access Rules**  
This file serves as the official Holy Expressor project chronicle.  
It records design intent, architectural evolution, and key development milestones.  

Only agents explicitly authorized as Archival Agents may modify anything outside the Development Timeline section.

---

## 📜 Development Timeline
---
---
---

## PRE-GITHUB ARCHIVES

## SECTION A: EARLY DEVELOPMENT RECONSTRUCTION 

### INITIAL ASSUMPTIONS

#### 1) Initial “Pick Expression” concept (experimental)

* **Problem Trigger**

  * Goal was pick-whip style interaction from CEP panel into AE property selection; early assumption that panel could directly intercept AE canvas/property clicks.
* **Initial Hypothesis**

  * “Button → overlay (PickVeil) → user clicks AE property → host extracts expression → panel injects into editor” was treated as feasible.
* **Experiments / Attempts**

  * Implemented PickVeil overlay + click-to-cancel mechanics on the panel side as part of the flow scaffolding.
* **Failure Modes Observed**

  * Direct click interception outside the panel was not reliable/possible in CEP (stated as limitation driving pivot to polling).
* **Constraint(s) Identified**

  * CEP inability to trap AE canvas clicks reliably.
* **Final Mechanism Implemented**

  * Replaced “click interception” with a host-side polling scanner (app.scheduleTask) that reads selection changes.
* **Known Side Effects**

  * Polling introduces loop/leak risks if disarm/cancel paths fail.
* **Explicitly Unresolved Aspects**

  * The full pick-whip UX remained costly/brittle and later marked for retirement in V2 pivot.

---

### FIRST ARCHITECTURAL ATTEMPTS

#### 2) Polling architecture introduced (host-side)

* **Problem Trigger**

  * Need to detect “picked” AE property without reliable direct click capture from CEP.
* **Initial Hypothesis**

  * Use `app.scheduleTask` to poll the host environment and infer pick via selection changes.
* **Experiments / Attempts**

  * Added “arm → poll → stop” structure with arm flags and scheduled scanner.
  * Snapshot of initial selection path `_initialPath` at arm-time to avoid immediately treating pre-armed selection as the pick.
* **Failure Modes Observed**

  * Poll spam / repeated dispatches when disarm/stop logic did not trigger correctly (especially on groups/containers).
* **Constraint(s) Identified**

  * Must cancel scheduled task and clear state reliably to avoid CPU churn and repeated events.
* **Final Mechanism Implemented**

  * One-shot dispatch: cancel the schedule task AFTER any dispatch, zero the polling id, clear picking flags/snapshots.
* **Known Side Effects**

  * If dispatch never occurs, system may rely on manual cancel/veil cancel for cleanup (noted as risk).
* **Explicitly Unresolved Aspects**

  * Multi-pick-per-engage was explicitly treated as “separate feature” (not implemented in the one-shot model).

---

#### 3) File structure stabilized (mentioned briefly)

* **Problem Trigger**

  * Need stable DOM anchors and predictable JS/JSX responsibilities for the pick pipeline.
* **Initial Hypothesis**

  * Keep `index.html` as a static container with required IDs; keep logic in `main.js` (HQ) and `host.jsx` (ISO).
* **Experiments / Attempts**

  * Defined expectations for DOM nodes: `#appRoot`, `#codeEditor`, `#pickVeil`, `#exprPickBtn`.
* **Failure Modes Observed**

  * Some HTML expectations were marked “Unverified”; missing elements were treated as a potential blocker requiring confirmation.
* **Constraint(s) Identified**

  * CEP runtime binds at load; inline handlers avoided; runtime binding depends on IDs existing.
* **Final Mechanism Implemented**

  * Responsibilities documented as: `index.html` structure only; `main.js` UI + listeners + injection; `host.jsx` polling + payload + dispatch.
* **Known Side Effects**

  * None explicitly stated.
* **Explicitly Unresolved Aspects**

  * Exact line ranges / true DOM presence was explicitly left as “confirm elements exist.”

---

### FIRST CONSTRAINTS DISCOVERED

#### ISSUE: External SVG Assets Failing to Load in CEP (ERR_FILE_NOT_FOUND)

* **Problem Trigger**

  * External SVGs referenced via `<img src="...">` failed to load inside the CEP panel.
  * AE console reported `ERR_FILE_NOT_FOUND`.
* **Initial Hypothesis**

  * Relative paths might be incorrect in CEP context.
  * CEP CEF might restrict local file access by default. *inferred but not explicit*
* **Experiments / Attempts**

  * Verified paths relative to `index.html`.
  * Added CEF flags in `CSXS/manifest.xml` to allow file access and devtools.

    * `--allow-file-access`
    * `--allow-file-access-from-files`
    * `--enable-devtools`
    * `--remote-debugging-port=6904`
* **Failure Modes Observed**

  * Without flags, SVG assets consistently failed to load.
  * CSS could not style strokes/fills on externally loaded SVGs.
* **Constraint(s) Identified**

  * CEP CEF sandboxing limits file access.
  * `<img>` SVGs do not expose internal geometry to CSS.
* **Final Mechanism Implemented**

  * Abandoned external SVG loading.
  * Transitioned to inline SVG markup embedded directly in HTML.
* **Known Side Effects**

  * Increased HTML verbosity.
  * Geometry now maintained manually inside markup.
* **Explicitly Unresolved Aspects**

  * Whether production builds should retain permissive CEF flags.

---

#### ISSUE: Script Load Order Causing CEP Bridge Race Risk

* **Problem Trigger**

  * Proposal to defer all scripts to avoid render blocking.
* **Initial Hypothesis**

  * `defer` preserves order and DOM readiness, so safe globally.
* **Experiments / Attempts**

  * Evaluated deferring all `<script>` tags.
  * Identified dependency on synchronous `CSInterface.js`.
* **Failure Modes Observed**

  * Risk of `CSInterface is not defined`.
  * Potential dropped `evalScript` calls.
* **Constraint(s) Identified**

  * CEP host readiness is not tied to `DOMContentLoaded`.
  * Some scripts must execute before any app logic.
* **Final Mechanism Implemented**

  * **Hybrid load order**:

    * CSS first.
    * Inline style bootstrap.
    * `CSInterface.js` + `json2.js` synchronous.
    * All app modules deferred.
* **Known Side Effects**

  * Head ordering becomes fragile.
  * Requires documentation to prevent accidental reordering.
* **Explicitly Unresolved Aspects**

  * Whether `main_DEV_INIT.js` can be safely deferred in all cases.

---

## SECTION B: ITERATIVE PROBLEM-SOLVING RECORD 

### FIX / PROBLEM INSTANCE: CodeMirror integration issues (dead plugin / duplicate init)

* **Problem Trigger**

  * CodeMirror was “invisible” or panel went “dead” due to init failures.
* **Trigger or discovery context**

  * CEP boot failures and non-responsive panel behavior during editor mounting attempts.
* **Hypotheses considered**

  * Mount CodeMirror via direct `EditorState` / `EditorView` style initialization.
* **Experiments attempted**

  * Attempted “broken version” using direct imports-style objects (EditorState.create + EditorView).
  * Replaced with `window.codemirror.*` initialization inside `DOMContentLoaded`.
  * Added guard clause: log “❌ CodeMirror not available” and abort init if globals missing.
* **What failed and why**

  * Bundle didn’t expose EditorState globally, causing script crash and plugin “dead” state.
  * Duplicate initialization blocks caused clashes and “plugin broke”; removal of duplicate init described as the fix.
* **What was implemented**

  * Single guarded init via `window.codemirror.*` inside `DOMContentLoaded`, with positive mount log (“✅ CodeMirror editor mounted”).
* **Immediate side effects**

  * None explicitly stated (beyond earlier crash behavior).
* **What remained unresolved**

  * Bundle mismatch risk noted as an ongoing hazard requiring validation of bundle export.

---

### FIX / PROBLEM INSTANCE: PickVeil lifecycle problems (instant dismiss due to bubbling)

* **Problem description**

  * Veil dismissed instantly after activation due to click bubbling.
* **Trigger or discovery context**

  * “Same click” used to activate the mode also triggered cancellation immediately (veil “flashed”).
* **Hypotheses considered**

  * Simple “show veil + add click listener once” would allow cancel and maintain pick mode.
* **Experiments attempted**

  * Patch attempt: bind appRoot click listener with `{ once:true }`.
  * Added delay (`setTimeout`) before registering listener to avoid same-click cancellation.
  * Used CAPTURE-PHASE listener to catch events even if bubbling interfered.
  * Ignored activator button (`exprPickBtn`) inside handler.
  * Explicit removal of capture listener + nulling handler reference on exit/hide.
* **What failed and why**

  * Immediate cancel due to activation click bubbling into cancel handler.
* **What was implemented**

  * Delayed arm + capture-phase listener + activator ignore + strict cleanup on hide.
* **Immediate side effects**

  * Capture listeners are inherently risky if not removed; this was called out explicitly.
* **What remained unresolved**

  * Cancel scope: tradeoff noted that cancel logic worked “within panel” and not globally (as described).

---

### FIX / PROBLEM INSTANCE: Event channel normalization (canonical ISO_ReportLine_dispatch)

* **Problem description**

  * Multiple event channels created ambiguity; partial renames introduced channel drift.
* **Trigger or discovery context**

  * Earlier listener referenced `com.holyexpressor.pickResult` (older channel).
* **Hypotheses considered**

  * Standardize on ONE dispatch type and ONE listener path.
* **Experiments attempted**

  * Transition to canonical `ISO_ReportLine_dispatch` and a single panel listener that parses JSON payload.
  * Introduced dispatch helper `ISO_ReportLine_dispatch(payload)` to centralize JSON encoding and dispatch.
* **What failed and why**

  * Ambiguity and misrouting due to multiple channels (explicitly stated).
* **What was implemented**

  * Canonical channel established: host dispatches `ISO_ReportLine_dispatch` with JSON payload; panel listens only to that channel and routes to handler.
* **Immediate side effects**

  * None explicitly stated.
* **What remained unresolved**

  * Older channel references remain as historical; exact moment of full switchover is *partially documented*.

---

### FIX / PROBLEM INSTANCE: Sentinel design introduced (**NO_EXPRESSION**) + empty-string handling

* **Problem description**

  * Host sometimes returned empty string; panel treated it as valid and wiped/blanked editor content.
* **Trigger or discovery context**

  * Empty string treated as “valid but blank”, causing injection of nothing / editor clearing.
* **Hypotheses considered**

  * Use a sentinel string to represent “no expression” distinctly from real expression text.
* **Experiments attempted**

  * Host normalized null/undefined/"" expression values to `__NO_EXPRESSION__`.
  * Panel added guard to treat empty string as sentinel too (`trim() === ""`).
* **What failed and why**

  * Lack of distinction between empty string and “no expression.”
* **What was implemented**

  * Dual-sided normalization: host emits sentinel; panel treats sentinel OR empty string as non-injectable, then always disengages UI.
* **Immediate side effects**

  * “Magic strings” risk acknowledged; mitigation described as centralizing constant and guarding insertion.
* **What remained unresolved**

  * None stated, beyond general “magic sentinel strings” risk.

---

### FIX / PROBLEM INSTANCE: Host polling refinements (guards + ordering + anti-spam)

* **Problem description**

  * Stale pre-arm selection logged/treated as pick; log spam during polling; repeated payloads.
* **Trigger or discovery context**

  * Guards became overly strict and blocked intentional re-pick of same property (across sessions).
* **Hypotheses considered**

  * Add state flags + dedupe guards to reduce spam and prevent stale selection interpretation.
* **Experiments attempted**

  * Introduced guards: `he__resultDispatched`, `he__lastLoggedPath` or `he__lastLoggedKey`, `_initialPath` snapshot.
  * Moved logging AFTER `_initialPath` check to suppress stale selection logs.
  * Hardened dedupe key `(pickedPath :: pickedMatchName :: propertyIndex)` and clarified it should suppress LOG spam only, not dispatch.
* **What failed and why**

  * Guards became overly strict and blocked deliberate re-pick across sessions.
* **What was implemented**

  * Initial snapshot used to suppress stale logging/dispatch; dedupeKey used to suppress repeated logs only; do NOT early-return from dispatch based on dedupeKey.
* **Immediate side effects**

  * Key collision risk mentioned (“may still collide in rare cases”) for earlier guard designs.
* **What remained unresolved**

  * Exact final guard set across all versions is *partially documented* (multiple iterations referenced).

---

### FIX / PROBLEM INSTANCE: Group-selection pathology (repeated dispatches on containers)

* **Problem description**

  * Selecting shape layer containers/groups (Stroke 1, Fill 1, shape groups) caused repeat dispatch loops.
* **Trigger or discovery context**

  * Repeat dispatch loops and CPU churn observed when selections remained on containers.
* **Hypotheses considered**

  * Loop exists because scanner only stops for expression-capable leaf properties; group selections never satisfy stop condition.
* **Experiments attempted**

  * Modified stop logic to cancel polling AFTER ANY dispatch (not only when leaf property found).
  * Added structural skip maps for known containers (Contents, Vector Group, graphics containers, Transform groups) to bail early or gate recursion.
* **What failed and why**

  * Without one-shot stop, groups keep redispatching, creating CPU churn and repeated payloads.
* **What was implemented**

  * One-shot stop after dispatch + clear state flags + reset snapshots.
* **Immediate side effects**

  * Prevents multiple picks per engage; noted explicitly as separate feature.
* **What remained unresolved**

  * Container-to-leaf PROMOTION became a parallel approach (DFS promotion) but carried mis-target risks; priority/scoping needed refinement.

---

### FIX / PROBLEM INSTANCE: Shape layer complexity discovery (“Clive” knowledge set formation)

* **Problem description**

  * Shape layer internals brittle; needed reliable identification/classification while still generating valid expression paths.
* **Trigger or discovery context**

  * Shape layer internals and pathing were repeatedly fragile and inconsistent.
* **Hypotheses considered**

  * Hybrid approach: use `.name` chain for expression paths and `.matchName` chain for classification/type detection.
* **Experiments attempted**

  * Implemented/expanded:

    * `he_P_MM_getExprPathHybrid` returning `{exprPath, metaPath}` with `.name` and `.matchName`.
    * `he_P_MM_classifyProperty(metaPath)` for classification.
    * `HE_STRUCTURAL_MATCHNAMES` map to skip/gate non-leaf structural groups.
* **What failed and why**

  * Over-broad structural skip could hide leaves unless promoted (explicit risk).
* **What was implemented**

  * Hybrid MapMaker persisted as the mechanism: `.name` for `exprPath`; `.matchName` for metadata/classification; dual logging of both fields.
* **Immediate side effects**

  * Misclassification risk on shape layers marked as medium; fallback/targeted rules favored.
* **What remained unresolved**

  * Leaf promotion priority errors (wrong leaf chosen) were observed later; refinement needed but not fully documented here.

---

### FIX / PROBLEM INSTANCE: “Promotion to leaf” DFS (container → preferred leaf) (host-side)

* **Problem description**

  * Users often select containers like Stroke/Fill groups; code needed to resolve to expression-capable leaves (Width/Opacity/Color etc.).
* **Trigger or discovery context**

  * Container selections in shape hierarchies repeatedly collided with leaf-only assumptions.
* **Hypotheses considered**

  * Walk down from selected container to first preferred leaf using bounded DFS and a priority order.
* **Experiments attempted**

  * Expanded `he_P_leafReader` table to recognize more leaf types (Fill/Stroke Color/Opacity/Width, gradients, Trim Paths, Path leaf, Dashes, Taper, Round Corners Radius).
  * Added `he_U_findFirstLeaf(rootProp, depthCap, priority)` to promote containers to a leaf using depth cap and priority list.
* **What failed and why**

  * Over-eager promotion: priority rules sometimes selected the “wrong” leaf (Path or Stroke Width) versus user intent; scoping/priority needed tuning.
* **What was implemented**

  * Implemented bounded DFS + expanded leafReader tables, with risks explicitly logged.
* **Immediate side effects**

  * “Table drift with AE versions” risk noted (leaf detection tables may need updates).
* **What remained unresolved**

  * Promotion mis-targeting remained a known risk; refinement described as needed but not fully resolved in this fragment.

---

### FIX / PROBLEM INSTANCE: APPLY FAILURES ON GROUPED PROPERTIES (e.g. SHAPE LAYERS)

* **Problem description**

  * Selecting Shape Layer groups or grouped properties produced “Select a property” errors during Apply.
  * Common reproduction involved Stroke Width inside Shape Layer contents.
* **Trigger or discovery context**

  * Apply errors when clicking grouped properties / container selections.
* **Hypotheses considered**

  * Selected items were groups, not leaf properties that support expressions.
  * `selectedProperties` sometimes returns container groups even when clicking a child stopwatch.
* **Experiments attempted**

  * Checked `canSetExpression` directly on selected items.
  * Logged `propertyType`, `matchName`, and child properties during Apply.
  * Attempted flat iteration over selection without recursion.
* **What failed and why**

  * Groups rejected as non-animatable.
  * Valid child properties never reached.
  * Apply aborted early with generic messaging.
* **What was implemented**

  * Recursive descent into selected groups to locate the first animatable child.
  * Implemented in a Type Peeker function that scans children until a supported value type is found.
  * Apply logic updated to accept group selection as an entry point.
* **Immediate side effects**

  * Initial recursion applied expressions to all children in a group (over-application).
* **What remained unresolved**

  * Depth control was coarse initially.
  * Reliance on display names during traversal remained.

---

### FIX / PROBLEM INSTANCE: BLUE APPLY OVER-APPLICATION (RECURSION TOO BROAD)

* **Problem description**

  * After enabling recursion, Apply affected every animatable property within a group.
* **Trigger or discovery context**

  * Expressions applied far beyond intended targets; user could not predict affected properties.
* **Hypotheses considered**

  * Recursion lacked scoping to the explicitly selected group context.
* **Experiments attempted**

  * Logged recursion entry points.
  * Compared behavior when selecting leaf vs group.
  * Tested limiting recursion flags.
* **What failed and why**

  * Expressions applied far beyond intended targets.
* **What was implemented**

  * Recursion gated to only descend into explicitly selected groups.
  * Leaf properties outside that scope ignored.
  * Blue Apply restricted to selected items or their immediate valid children.
* **Immediate side effects**

  * Some deeply nested properties may still be unreachable without direct selection.
* **What remained unresolved**

  * No user control over recursion depth beyond this guard.

---

### FIX / PROBLEM INSTANCE: TARGET LIST FLOODING (SUMMARIZER RECURSION)

* **Problem description**

  * Using Target Selected caused Target list to populate with dozens of properties when groups were selected.
* **Trigger or discovery context**

  * Recursive mode flooded Target list; non-recursive mode missed properties like Stroke Width.
* **Hypotheses considered**

  * Summarizer recursion mirrored Apply recursion too aggressively.
* **Experiments attempted**

  * Disabled recursion entirely.
  * Compared recursive vs non-recursive `getSelectionSummary`.
  * Logged counts of collected properties.
* **What failed and why**

  * Recursive mode flooded Target list.
  * Non-recursive mode missed properties like Stroke Width.
* **What was implemented**

  * No final mechanism yet.
  * Explicit proposal: one-level-deep recursion only.
* **Immediate side effects**

  * Current implementation oscillates between flooding and omission.
* **What remained unresolved**

  * One-level recursion not yet implemented.
  * Deduplication strategy not finalized.

---

### FIX / PROBLEM INSTANCE: ORANGE APPLY “NO TARGET PATHS DEFINED”

* **Problem description**

  * Clicking Apply to Target produced error even when Target list visually populated.
* **Trigger or discovery context**

  * Target list rendered as raw text nodes; Apply handler searched for structured elements that did not exist.
* **Hypotheses considered**

  * Orange Apply expected structured data, not plain text.
* **Experiments attempted**

  * Logged DOM reads from Target list.
  * Inspected collected payload before `evalScript`.
* **What failed and why**

  * Target list rendered as raw text nodes; handler expected structured elements.
* **What was implemented**

  * Target entries rendered as `<div class="target-item" data-path="...">`.
  * Orange Apply collects `data-path` attributes into payload.
* **Immediate side effects**

  * Path strings based on display names, not matchNames.
* **What remained unresolved**

  * Path resolution fragile if user renames groups.

---

### FIX / PROBLEM INSTANCE: CUSTOM SEARCH “FAILED” (TOKEN SEARCH REGRESSION)

* **Problem description**

  * All Custom Search attempts returned “Custom search failed”.
* **Trigger or discovery context**

  * Execution reached missing helper calls; errors collapsed into generic failure message.
* **Hypotheses considered**

  * Token walker logic incorrect or incomplete.
* **Experiments attempted**

  * Added hierarchical token splitting (`>`).
  * Implemented deep token walkers in GroupScout.
  * Added logging for tokens and scope layers.
* **What failed and why**

  * Several core helpers were removed or out of sync:

    * MapMaker
    * Translator
    * Explorer
    * Collect&Apply
* **What was implemented**

  * None yet.
  * Added graceful no-match returns to avoid hard failure when zero hits.
* **Immediate side effects**

  * Search still non-functional despite graceful handling.
* **What remained unresolved**

  * Helpers must be restored or reconstructed before Custom Search works.

---

### FIX / PROBLEM INSTANCE: PROPERTY IDENTIFICATION VIA DISPLAY NAMES

* **Problem description**

  * Renamed groups broke Target resolution and Search reliability.
* **Trigger or discovery context**

  * Display-name paths fail when user renames groups; localization risk acknowledged.
* **Hypotheses considered**

  * Display-name-based paths are inherently fragile.
* **Experiments attempted**

  * Logged `matchName` alongside display names.
  * Prototyped matchName traversal snippets.
* **What failed and why**

  * Display-name paths fail when user renames groups.
* **What was implemented**

  * Deferred.
  * Decision recorded to migrate later once workflows stabilize.
* **Immediate side effects**

  * Current system remains rename-sensitive.
* **What remained unresolved**

  * Full matchName migration not started.

---

### FIX / PROBLEM INSTANCE: LAYER STYLES NOISE IN APPLY REPORTS

* **Problem description**

  * Disabled or phantom Layer Styles generated excessive “skipped” entries.
* **Trigger or discovery context**

  * Reports cluttered with non-actionable skips.
* **Hypotheses considered**

  * Layer Styles exist even when disabled and should be ignored.
* **Experiments attempted**

  * Checked enabled state of Layer Style properties.
  * Logged phantom properties.
* **What failed and why**

  * Reports cluttered with non-actionable skips.
* **What was implemented**

  * Disabled/phantom Layer Styles silently ignored.
  * Enabled Layer Styles still processed.
* **Immediate side effects**

  * Reduced visibility into why certain properties were ignored.
* **What remained unresolved**

  * No toggle to show hidden Layer Style skips.

---

### FIX / PROBLEM INSTANCE: STRICT VS FUZZY SEARCH EXPLORATION

* **Problem description**

  * Desire to support relaxed matching for property searches.
* **Trigger or discovery context**

  * Encountered ExtendScript limitations (`Array.map` unsupported).
* **Hypotheses considered**

  * Strict and fuzzy modes could coexist with filters.
* **Experiments attempted**

  * Built ScriptUI runners to iterate property walkers.
  * Tested:

    * Token splitting
    * Name contains logic
    * Depth skipping of “Contents”
* **What failed and why**

  * Increased complexity with limited UX payoff.
  * Maintenance burden high.
* **What was implemented**

  * Development put on ice, not deleted.
* **Immediate side effects**

  * Partial code retained but dormant.
* **What remained unresolved**

  * Whether Strict/Fuzzy returns as a surfaced feature.

---

### FIX / PROBLEM INSTANCE: TARGET BUTTON “ARM / POLL” EXPANSION

* **Problem description**

  * Desire for persistent targeting modes.
* **Trigger or discovery context**

  * Conceptual ARM sentinel logic discussed; cancel/cleanup flows partially sketched.
* **Hypotheses considered**

  * ARM state could allow polling or sticky targeting.
* **Experiments attempted**

  * Conceptual ARM sentinel logic discussed.
  * Cancel/cleanup flows partially sketched.
* **What failed and why**

  * No complete lifecycle for ARM state.
  * Risk of stale targets.
* **What was implemented**

  * None.
  * Explicitly marked mid-development.
* **Immediate side effects**

  * None explicitly stated.
* **What remained unresolved**

  * ARM cleanup, cancel semantics, polling cadence.

---

### FIX / PROBLEM INSTANCE: SVG Stroke Color Inheriting Unintended `button { color }`

* **Problem description**

  * Inline SVG strokes rendered red due to inheriting `currentColor`.
  * Global CSS defined `button { color: #ff0000; }`.
* **Trigger or discovery context**

  * Inline SVG inheritance collided with global button styles.
* **Hypotheses considered**

  * SVG stroke defaults were binding to `currentColor`.
* **Experiments attempted**

  * Removed reliance on `currentColor`.
  * Introduced explicit CSS variables for SVG styling:

    * `--btn-stroke`
    * `--btn-fill`
    * `--btn-text`
* **What failed and why**

  * Inline SVG attributes caused conflicts when mixed with CSS.
  * Stroke values hardcoded in SVG prevented theming.
* **What was implemented**

  * All SVG `path` and `line` elements styled via CSS:

    * `stroke: var(--btn-stroke)`
  * Removed inline `stroke` and `stroke-width` attributes from SVG markup.
* **Immediate side effects**

  * SVG appearance now fully dependent on CSS availability.
* **What remained unresolved**

  * Naming inconsistency between `color` vs `colour` variables noted as risk.

---

### FIX / PROBLEM INSTANCE: Middle Section Rendering Unwanted Side Strokes

* **Problem description**

  * Middle section of rhombus rendered vertical strokes when scaled.
* **Trigger or discovery context**

  * Using a single path for the middle caused unintended side edges.
* **Hypotheses considered**

  * Using a single path for the middle caused unintended side edges.
* **Experiments attempted**

  * Rebuilt middle geometry as:

    * `<rect>` for fill only.
    * Two `<line>` elements for top and bottom strokes.
* **What failed and why**

  * Rectangles with strokes produced left/right edges.
  * Inline strokes conflicted with CSS overrides.
* **What was implemented**

  * `rect` set to `stroke: none`.
  * Top and bottom strokes drawn as separate `<line>` elements.
* **Immediate side effects**

  * Geometry more verbose.
  * Stroke alignment must be manually maintained.
* **What remained unresolved**

  * No automated geometry generation; manual SVG edits required.

---

### FIX / PROBLEM INSTANCE: SVG Stroke Clipping at Corners

* **Problem description**

  * Top-left and bottom-right corners clipped at certain zoom levels.
* **Trigger or discovery context**

  * Stroke extends beyond original SVG bounds; CEP zoom levels vary.
* **Hypotheses considered**

  * Stroke extends beyond original SVG bounds.
* **Experiments attempted**

  * Expanded SVG `viewBox` by approximately half the stroke width on all sides.

    * Example: `-0.75 -0.75` padding for `1.5px` stroke.
* **What failed and why**

  * Without padding, clipping persisted.
  * Excess padding altered perceived proportions.
* **What was implemented**

  * Standardized rule: expand `viewBox` by ~½ stroke width.
* **Immediate side effects**

  * SVG dimensions slightly inflated.
  * Padding value tied to stroke width.
* **What remained unresolved**

  * Exact padding values may need retuning per shape.

---

### FIX / PROBLEM INSTANCE: CSS HSL Math Failing in Target CEF Runtime

* **Problem description**

  * Dark/light variants collapsed to black or white.
* **Trigger or discovery context**

  * CEF parser rejected `calc()` with unitless values inside `hsl()`.
* **Hypotheses considered**

  * Unitless HSL math should be valid per spec.
* **Experiments attempted**

  * Attempted unitless `S` and `L` variables with `%` appended post-`calc()`.
  * Tested across derived tokens.
* **What failed and why**

  * Target CEP Chromium version has stricter parsing.
  * Behavior differed from modern browsers.
* **What was implemented**

  * JS writes `S` and `L` as percent strings.
  * CSS multiplies percent values directly inside `calc()`.
  * Lightness allowed to scale `0 → 2` to reach 100%.
* **Immediate side effects**

  * Lightness math is non-standard.
  * Requires documentation to avoid misuse.
* **What remained unresolved**

  * Cross-CEF version variability remains a risk.

---

### FIX / PROBLEM INSTANCE: Runtime Color Derivation for RGBA and HSL Variants

* **Problem description**

  * Need to derive semi-transparent and tonal variants from a single hex color.
* **Trigger or discovery context**

  * CSS alone insufficient for hex → RGB/HSL conversion; bootstrap ordering mattered.
* **Hypotheses considered**

  * CSS alone insufficient for hex → RGB/HSL conversion.
* **Experiments attempted**

  * Implemented inline JS style bootstrap (`cy_styleBoot`) to:

    * Read `--G-color-1`.
    * Compute RGB + HSL.
    * Write runtime CSS variables.
* **What failed and why**

  * Missing or malformed hex caused silent failures.
* **What was implemented**

  * Inline IIFE in `<head>` wrapped in `try/catch`.
  * Writes:

    * `--G-colour-1-RGB`
    * `--G-color-1-H/S/L`
* **Immediate side effects**

  * Styling depends on JS execution.
  * Requires fallback behavior if bootstrap fails.
* **What remained unresolved**

  * Support for 3-digit or 8-digit hex marked as future work.

---

## SECTION C: TRANSITION POINTS 

### EXPLICIT PIVOTS

#### Pivot: Abandoned direct click interception → host-side polling

* Abandoned direct click interception.
* Pivot to host-side polling via ExtendScript.

(Referenced in: “Initial Pick Expression concept (experimental)” and “Polling architecture introduced (host-side)”.)

---

#### Pivot: Abandoned external SVG loading → inline SVG markup

* Abandoned external SVG loading.
* Transitioned to inline SVG markup embedded directly in HTML.

(Referenced in: “External SVG Assets Failing to Load in CEP (ERR_FILE_NOT_FOUND)”.)

---

### ABANDONMENTS / SCOPE REDUCTIONS / STRATEGIC REFRAMES

#### Codex-assisted refactor incident (bulk renames / mojibake / mismatched callsites)

* **Problem Trigger**

  * Bulk rename/refactor introduced inconsistencies across files and log corruption artifacts.
* **Initial Hypothesis**

  * Codex can accelerate mechanical changes like bulk renames and boilerplate generation.
* **Experiments / Attempts**

  * Applied Codex-assisted bulk renames across multiple files; later proceeded with “patch forward” rather than rollback.
  * Identified specific issues introduced: mismatched callsites, channel drift, missing eval parentheses, stray code outside functions, mojibake in logs.
* **Failure Modes Observed**

  * Partial renames left broken paths/channels; Unicode artifacts appeared in logs; host parse errors could silently break loading.
* **Constraint(s) Identified**

  * Rolling back was treated as costly; chosen approach was surgical fixes on latest files.
* **Final Mechanism Implemented**

  * “Proceed with latest files” policy + a series of surgical patches (dispatch unification, one-shot stop, sentinel normalization, evalScript parentheses fix, stray return removal).
* **Known Side Effects**

  * Mojibake described as cosmetic; cleanup optional.
* **Explicitly Unresolved Aspects**

  * Exact chronology of “rollback considered then abandoned” is *inferred but not explicit* in this fragment; the decision is explicit, the timeline is not.

---

#### Panel/host responsibility split (avoid re-entrant stop calls)

* **Problem Trigger**

  * Need to prevent race conditions between UI cleanup and host scan lifecycle, and avoid re-entrant stop calls across boundary.
* **Initial Hypothesis**

  * Host should own arm/poll/stop/dispatch; panel should own veil/UI only.
* **Experiments / Attempts**

  * Panel handler: ALWAYS disengage UI in finally block after handling pick payload.
  * Host: cancel scheduled task and clear flags before/around dispatch; centralized dispatch helper introduced.
* **Failure Modes Observed**

  * If host never dispatches, panel could remain “armed” unless veil click cancels; described as residual risk.
* **Constraint(s) Identified**

  * Cleanup must be robust even on errors; host task cancellation must run on stop/error/dispatch paths.
* **Final Mechanism Implemented**

  * Host owns stop; panel performs UI cleanup only; handler ensures veil hidden regardless of payload validity.
* **Known Side Effects**

  * None explicitly stated.
* **Explicitly Unresolved Aspects**

  * “If host never dispatches” scenario remained as a known residual behavior.

---

#### Strategic pivot to Holy Expressor V2 (pick-whip retired)

* **Problem Trigger**

  * Pick-whip style UX deemed too costly; interactive picking loop + shape brittleness created sustained complexity.
* **Initial Hypothesis**

  * V2 should be “editor-first”, with a single Apply button, reducing dependence on interactive pick scanning.
* **Experiments / Attempts**

  * Codex addendum assessed what parts of V1 remained useful vs redundant under V2:

    * Still useful: leaf/DFS logic, classification, Layer Styles guards.
    * Potentially redundant: polling loop, sentinel dispatch, Soft Pick retargeting, priority scoring for ambiguous picks.
* **Failure Modes Observed**

  * Not framed as a single failure; framed as COST and redundancy relative to V2 objectives.
* **Constraint(s) Identified**

  * V2 removes need for interactive click capture; V1 subsystems become optional/legacy unless interactive picking returns.
* **Final Mechanism Implemented**

  * Pivot declared and archived: retire pick-whip workflow as critical path; preserve scanner/leaf/classifier logic as archival safety net.
* **Known Side Effects**

  * Some V1 logic becomes dormant/legacy; explicit note “don’t throw away Codex patch, archive it.”
* **Explicitly Unresolved Aspects**

  * Exact V2 implementation steps are not in this fragment; only the transition intent and component triage is documented.

---

## SECTION D: KNOWN INCOMPLETE AREAS AT THIS STAGE 

### EXPLICITLY UNRESOLVED ISSUES AS OF THIS PERIOD

* TARGET LIST FLOODING (SUMMARIZER RECURSION)

  * No final mechanism yet.
  * Explicit proposal: one-level-deep recursion only.
  * One-level recursion not yet implemented.
  * Deduplication strategy not finalized.

* CUSTOM SEARCH “FAILED” (TOKEN SEARCH REGRESSION)

  * Search still non-functional despite graceful handling.
  * Helpers must be restored or reconstructed before Custom Search works.
  * Several core helpers were removed or out of sync: MapMaker, Translator, Explorer, Collect&Apply.

* PROPERTY IDENTIFICATION VIA DISPLAY NAMES

  * Current system remains rename-sensitive.
  * Full matchName migration not started.
  * Locale-safe resolution strategy is explicitly unresolved.

* PICK/POLL LIFECYCLE RESIDUAL RISKS

  * If dispatch never occurs, system may rely on manual cancel/veil cancel for cleanup (noted as risk).
  * “If host never dispatches” scenario remained as a known residual behavior.
  * Multi-pick-per-engage treated as “separate feature” (not implemented in one-shot model).
  * Exact final guard set across all versions is *partially documented*.

* CONTAINER-TO-LEAF PROMOTION REFINEMENT

  * Container-to-leaf PROMOTION carried mis-target risks; priority/scoping needed refinement.
  * Promotion mis-targeting remained a known risk; refinement described as needed but not fully resolved in this fragment.
  * “Table drift with AE versions” risk noted (leaf detection tables may need updates).

* BLUE APPLY RECURSION DEPTH CONTROL

  * No user control over recursion depth beyond guard that only descends into explicitly selected groups.
  * Some deeply nested properties may still be unreachable without direct selection.

* ORANGE APPLY TARGET PATH ROBUSTNESS

  * Path strings based on display names, not matchNames.
  * Path resolution fragile if user renames groups.

* SVG / CEF / STYLING TECH DEBT

  * Whether production builds should retain permissive CEF flags.
  * Naming inconsistency between `color` vs `colour` variables noted as risk.
  * Exact `viewBox` padding values may need retuning per shape.
  * Cross-CEF version variability remains a risk.
  * Support for 3-digit or 8-digit hex marked as future work.

### ASSUMPTIONS CARRIED FORWARD

* AE expressions require display `.name` segments for expression address; `.matchName` is classification only.
* CEP cannot capture AE canvas clicks reliably; polling is used to infer property pick via selection changes.
* One-shot dispatch is used as a guardrail against loops on containers/groups, with multi-pick treated as a separate feature.

## END OF PRE-GITHUB ARCHIVE
---

## ⚗️ QUICK PANEL LOAD ISSUE ERA

The quick panel was not loading on first click, instead just a blank window.  
Ultimately it was the wrong type in manifest, but plenty was done along the way before we realized that.

---

### 🪶⛓️ Dev Notes

**2025-10-29 – gpt-5-codex:**  
Added quick panel host-bridge priming helper (see `js/quickpanel.js`) to eagerly load JSX modules and verify readiness on open.  
Includes timed retries alongside existing cold-start recovery.



**2025-10-29 – gpt-5-codex:**  
Introduced `Holy.State` shared persistence layer syncing expression and toggle state between panels.  
See `js/main_STATE.js`.



**2025-10-29 – lead-dev:**  
**Quick Panel & LiveSync Development Cycle Summary**  

**Summary:**  
Focused on resolving Quick Panel blank-load behaviour, double-click requirement, and missing LiveSync updates between panels.  
Investigation confirmed root cause tied to CEP panel caching and incomplete event propagation rather than logic faults.

#### Phase 1 – Initialization / Visibility
- Verified Quick Panel loaded but appeared blank on first open, only rendering on second click.  
- Confirmed all scripts present; added “TESTING” markup to prove DOM injection.  
- Identified asynchronous CEP load timing as core issue.

#### Phase 2 – Cache / Double-Click Issue
- Cleared AE + CEP caches, renamed extension folder, retested.  
- Behaviour consistent: blank first open, visible second open.  
- Determined CEP spawns before DOM bindings initialize; full reinit only on second call.

#### Phase 3 – Rehydration / Focus Handling
- Added focus-based listener to auto-reload panel state.  
- `[Holy.State] Panel refocused → rehydrating state` confirmed firing but without UI updates.

#### Phase 4 – Warm-Wake Self-Heal
- Introduced delayed self-check (`setTimeout`) to detect blank panels and rerun `Holy.SNIPPETS.init()`.  
- Panel redraws after short delay but still requires second trigger for full focus chain.

#### Phase 5 – Holy.State Integration
- Implemented shared persistence + CEP event broadcast across panels.  
- Expected two-way sync between Main and Quick panels; partial success.

#### Phase 6 – Testing / Verification
- State save confirmed; cross-panel events not received.  
- Focus logs consistent; CEP broadcast scope suspected.  
- UI updates only after manual reload → persistence OK, propagation missing.

#### Phase 7 – Diagnostics / Logging
- Expanded logs for dispatch / listener / rehydration.  
- ExtendScript logs confirmed invisible to DevTools; JS-side only.  
- “Initialized for panel” logs appear only during startup.

**Current Status:**  
✅ Persistence working  
✅ Warm-Wake & Focus triggers logging  
⚠️ Quick Panel blank on first open  
⚠️ LiveSync not cross-firing  
⚠️ UI not auto-refreshing post-edit

**Next Priorities:**  
- Fix initial blank-panel / double-click requirement before further sync work.  
- Confirm broadcast scope, panel identity, and delayed render handshake.

**Research-backed Notes**  
Common causes of blank CEP panels and verified approaches:
- Initialization timing / DOM delay → Delay UI rendering until DOMContentLoaded + small timeout.  
- CEPHtmlEngine cold start → Programmatically trigger focus / resize / reflow after open.  
- Browser engine / syntax mismatch → Check JS + CSS compatibility for target AE CEP version.  
- Cached instance persistence → Kill CEPHtmlEngine.exe or rename extension folder for clean load.  
- Visibility / paint issues → Force repaint via CSS toggle or reflow (offsetHeight hack).

**Recommended Test Order:**  
1️⃣ Force UI init after short delay (300–800 ms).  
2️⃣ Trigger focus / reflow on open.  
3️⃣ Validate syntax compatibility.  
4️⃣ Purge cached instances.  
5️⃣ Check for hidden DOM / paint layer issues.

---

**2025-10-29 – gpt-5-codex:**  
Added readiness gating and repaint fallback in quick panel bootstrap to eliminate blank-first-open/double-click behaviour.  
**Design Intent:** Defer quick panel init until Holy modules are ready and force a repaint when the snippet row fails to draw.  
**Risks / Concerns:** Polling timeout now proceeds with degraded init, so monitor for cases where modules never hydrate and UI still stalls.

---

**2025-10-30 – gpt-5-codex:**  
Hardened quick panel paint verification with layout retries, warm-wake fallbacks, and state reload to surface snippets on the first open.  
**Design Intent:** Detect collapsed snippet rows and keep re-rendering/repainting until layout reports a non-zero height.  
**Risks / Concerns:** Extra retries and reloads may add minor startup delay or hide deeper lifecycle issues if the root cause persists.

---

**2025-10-30 – gpt-5-codex:**  
Added host-bridge readiness fencing and a double-RAF paint kick so the quick panel renders after the CEP bridge is live and snippet rows report height before binding handlers.  
**Design Intent:** Ensure initial open waits for bridge readiness and forces a fresh paint to avoid blank loads.  
**Risks / Concerns:** Bridge polling timeout falls back to degraded init, so persistent bridge failures may still need manual intervention.

---

**2025-10-29 – gpt-5-codex:**  
Added QuickPanel DOM Timing Trace (`DOMContentLoaded` / `load` / `focus` / `timeout`) to diagnose initialization order on cold start.  
No functional change.

---

**2025-10-30 – gpt-5-codex:**  
Added `ensureHostReady()` loop in `main_UI.js` to delay QuickPanel launch until host environment is confirmed.  
Resolves white/gray blank panel issue on first click.  
Polyfill omission (`json2.js`) may cause legacy AE compatibility issues.

---

## 🧩 2025-10-30 – Quick Panel Compositor Attach Fix (Final)

### 🎯 Summary
Resolved the long-standing Quick Panel blank-on-first-open bug in Holy Expressor.  
Root cause identified as an After Effects **compositor attach race** within CEPHtmlEngine on cold start.  
Panel now initializes correctly on first open using **manifest-level timing control (`AutoVisible` / `Modeless`)**, eliminating all previous repaint and refresh hacks.

---

### 🧠 Background
The Quick Panel consistently opened blank on the first click (white after cache purge, gray thereafter) and required a second click to appear.  
Logs always showed:
- DOM fully rendered and measurable  
- Bridge primed and modules loaded  
- No errors  

Despite that, AE failed to composite the panel surface on the first launch.

---

### 🔬 What We Tried (Chronologically)

| Stage | Attempt | Result |
|-------|----------|--------|
| 1 | Bridge priming + retry timers | ✅ Executed; no change |
| 2 | Double-RAF repaint kick | ✅ No change |
| 3 | Visibility toggle & reflow | ✅ No change |
| 4 | Host readiness verification loop | ✅ Host was already ready |
| 5 | JS resize & transform nudge | ✅ No change |
| 6 | `cs.resizeContent(width, height)` | ✅ Logged, no visual effect |
| 7 | `app.refreshUI()` via ExtendScript | ✅ Logged, no visual effect |
| 8 | Auto close + reopen logic | ✅ Executed, still blank |
| 9 | Flow plugin analysis (see below) | 💡 Led to manifest-level hypothesis |

---

### 📚 Flow Plugin Research
Examined Flow’s CEP bundle to compare its working multi-panel system:

- Flow’s **Preferences panel** uses `ModalDialog` with `AutoVisible=true`  
- Flow’s **Main panel** is also `AutoVisible`, ensuring both surfaces are bound at startup  
- AE therefore composites their windows before any script calls `requestOpenExtension()`  

**Takeaway:** Flow avoids the attach race entirely by letting AE pre-spawn the compositor surfaces at boot.

---

### ⚙️ Changes Implemented
**Updated `manifest.xml` for `com.holy.expressor.quickpanel`:**


<AutoVisible>true</AutoVisible>
<Type>Modeless</Type>
<Geometry>
  <Size>
    <Width>400</Width>
    <Height>300</Height>
  </Size>
</Geometry>
Removed obsolete repaint logic from main_UI.js:

window.dispatchEvent("resize")

transform reflow logic

cs.resizeContent()

app.refreshUI()

Trimmed warm-wake recovery and retry code from quickpanel.js
Simplified to a single ensureHostReady() call + normal requestOpenExtension()
Added early <[style> background in HTML to eliminate white flash.

✅ Outcome
✅ Quick Panel now attaches instantly on first open (no blank/white states)

✅ Works non-blocking with Modeless window type

✅ Geometry respected; no modal blocking

✅ All redundant compositor-poke code removed

🗒️ Notes
Root cause was AE creating CEP window logic before compositor bind.

AutoVisible=true ensures early compositor surface initialization.

ModalDialog also fixed it but blocks host UI — replaced by Modeless.

Panel type still functional but retains title chrome and brief flash.

Keep single install per Extension ID; duplicates can reintroduce race.

## ⚗️ END OF QUICK PANEL LOAD ISSUE ERA <3
---
---

## 🧠 TRUTH SUMMARY LOGS
### Date Unknown – Snippet Application Failure Investigation (Condensed)
_chronology uncertain_
The Holy Expressor CEP extension investigation opened with the user directing an agent to inspect the Holy-Expressor-Repo, specifically noting the importance of consulting README.md and AGENTS.md before touching code. The repository hosts a multi-panel After Effects workflow in which snippet buttons trigger ExtendScript via CSInterface bridges. Early in the session the snippet interface existed and appeared responsive, yet clicking any snippet surfaced a toast reading “Snippet error: Apply failed,” and no actionable diagnostics surfaced in the console. Initial context also confirmed the plugin architecture—JavaScript front end, JSX back end, global Holy namespace—and established that snippet banks had recently been standardized to three fixed buttons created automatically per bank after prior customization work.

Attention first centered on front-end regressions when DevTools captured an exception: `Uncaught TypeError: Cannot read properties of undefined (reading 'show')` traced to `main_SNIPPETS.js:522`. The bug emerged because new toast-handling code attempted to use `Holy.TOAST.show`, a namespace path that no longer existed in the runtime. The fix swapped these direct calls with a new `toastApplyError()` helper that guards against missing modules and falls back to `Holy.UI.toast`. After the patch, the TypeError vanished, confirming the wrapper correctly insulated the UI layer from undefined references. Despite the absence of console errors, the toast persisted, signaling the failure originated deeper in the pipeline.

Further logging expanded visibility into the CSInterface call sequence. `main_SNIPPETS.js` reported “sending to ExtendScript: holy_applySnippet(1)” followed immediately by “response from ExtendScript: string” and “Apply failed: empty or ‘fail’ response.” These logs established that the bridge function executed but returned only the literal word “string,” which the JavaScript callback treated as a falsy payload. Because the handler expects a concrete success token, empty string, or JSON, the meaningless response triggered the error toast every time. The captured behavior confirmed the snippet apply machinery—button listener, CSInterface dispatch, toast fallback—remained intact; the failure had shifted to either ExtendScript execution or the integrity of the return value.

The agent outlined several hypotheses, clearly marked as unverified, for why `holy_applySnippet` might yield an unusable response. Possibilities included the JSX bundle not loading (`host_APPLY.jsx` absent from the session), the function name having changed without corresponding JS updates, missing return statements inside the ExtendScript routine, or JavaScript misinterpreting the callback results. The reasoning favored a JSX load issue because `main_DEV_INIT.js` orchestrates host script loading, and any disruption could leave the bridge stub defined but unimplemented. However, without direct access to After Effects logs or ExtendScript console output, the theory remained speculative and properly tagged as such.

To test whether the function was even defined in the host context, the agent recommended running `cs.evalScript("typeof(holy_applySnippet)", console.log)` from DevTools. This diagnostic would instantly reveal if ExtendScript recognized the function or if the load sequence failed earlier. Executing the suggestion surfaced another barrier: `Uncaught ReferenceError: cs is not defined`. The panel’s JavaScript encapsulated its `CSInterface` instance within module scope, preventing DevTools from referencing `cs` globally. The agent clarified that the panel likely instantiates `var cs = new CSInterface();` during initialization but never assigns it to `window`, so the DevTools context cannot reach it. The temporary remedy was to execute `window.cs = new CSInterface();` manually before reissuing the diagnostic command.

No follow-up evidence confirmed whether the `typeof` probe succeeded, leaving the ExtendScript status unresolved. Consequently, the investigation concluded with the system still emitting the failure toast after each snippet click, DevTools showing the bridge returning the placeholder string, and no proof that `holy_applySnippet` executes to completion. The verified facts captured the flow: UI inputs fire correctly, the JavaScript bridge issues calls, the response path equates an empty or invalid payload with failure, and the toast mechanism surfaces that state. Outstanding uncertainties include the actual load state of `host_APPLY.jsx`, the return contract expected by the snippet apply function, and whether recent architectural changes altered the bridge handshake. Further progress requires validating the host script loading sequence and ensuring `holy_applySnippet` returns a definitive success token recognizable by the JavaScript layer.

### Date Unknown – Express/Rewrite Mode Redesign (Condensed)
_chronology uncertain_
The Holy Expressor conversation opened with the main panel already hosting a functional Express editor and a Search-and-Replace utility, each backed by buttons that swapped DOM sections inside `#expressArea`. The user’s new goal was a compact, typographic toggle that mimicked design mockups showing “Express ▸ Rewrite” rendered as text flanking a diamond divider. The existing layout still contained large panel buttons, and although the switching logic worked, the older controls consumed space and clashed visually with the latest theme. The user supplied two diamond SVG snippets, requested the `fill` attribute rely on `currentColor`, and insisted the control live inside `expressArea` so CodeMirror and ancillary overlays remained siblings in the DOM.

Initial experiments replaced the button bar with custom markup containing `<div class="modeSwitchBar f18-c">` and button elements labelled Express and Rewrite. However, the JavaScript still pointed to legacy IDs (`tab-express`, `tab-search`). When the original buttons were removed, the new controls stopped toggling because `main_UI.js` listeners were bound to the old IDs. The fix was to reuse the historical identifiers on the new elements, restoring the event bridge without rewriting the controller. Once the ID alignment was handled, the mode toggles triggered again, but visual regressions followed. The diamond indicator, expected to change color according to the active mode, remained gray after the markup moved. CSS rules driving the color states targeted `.express-active .diamond-left` and `.rewrite-active .diamond-right` under the `#expressArea` selector. Relocating the buttons outside that container broke the descendant selectors, so the assistant recommended either reverting the elements back into `expressArea` or adjusting the selectors. Stripping the `#expressArea` prefix did not immediately help because the class toggles still occurred on that container. Ultimately, the markup stayed inside `expressArea`, preserving the original CSS cascade.

After syncing the markup and selectors, the next issue appeared when the Rewrite view left Express controls visible. Although the toggle updated button styling, it never hid the entire Express block. Investigation showed `applyModeState(isExpress)` already contained logic to add `.express-active` and `.rewrite-active` classes, so the helper was expanded with `expressArea.style.display = isExpress ? "" : "none";`. A merge conflict surfaced because two branches modified the same function: one retained the old behavior while the other introduced the display toggle. The user manually removed the conflict markers and kept the version containing the display line. With that applied, rewriting triggered a clean handoff where Express content fully disappeared, and the user confirmed the corrected state (“Cool, I did that. And that worked.”).

Attention shifted to the editor’s maximize control. The button previously sat inline and borrowed the generic `button {}` styling, causing it to inherit padding and chrome inconsistent with the overlay style used elsewhere. The requirement was to float the maximize toggle like `.express-editor-overlay` while keeping it inside `#expressArea` so scripting logic continued to query it with `expressArea.querySelector`. A DevTools inspection exposed that `.btn-discreet` failed to override the base `button` rule, so the assistant suggested introducing `all: unset;` (followed by explicit resets) within `.btn-discreet` to neutralize the inherited properties without disturbing other button variants. Although the CSS changes were only proposed in discussion, the plan established a clear route: absolutely position the maximize button and rely on `currentColor` for theme coherence.

Finally, the user wanted the textual arrow glyphs inside `#editorMaximizeBtn` replaced with an inline SVG arrow. They provided markup for a bidirectional chevron composed of 18-point lines and a diamond center, reiterating that stroke attributes should be removed in favor of `fill="currentColor"`. The agent composed a Codex-ready prompt, detailing the DOM replacement steps, DOM targets, and SVG cleanup instructions while promising not to alter CSS. The session closed with the Express/Rewrite toggle functioning, Express content hidden when Rewrite is active, and a design plan in place to modernize the maximize button. Outstanding tasks involve executing the CSS reset, floating the button overlay, and embedding the supplied SVG, but the structural groundwork for the panel redesign is now verified and recorded.
### 2025-11-03 – Color Picker Event Serialization Fix (Condensed)
The Holy Expressor theme workflow entered this sprint with the floating color picker launching reliably yet failing to repaint the main panel. Users could drag the new hue slider and see refreshed gradients inside the picker window, but pressing **Apply** left the host panel’s `--G-color-1` untouched. Early screenshots also showed legacy UI remnants — the old hue bar still peeked behind the replacement rainbow slider — proving the visual refresh partially landed even while the functional bridge had collapsed. DevTools logs reinforced the impasse: every click fired `broadcastHexToMain()` yet the receiving panel never consumed the payload, so theme tokens and derived CSS variables sat frozen at their boot values.

Investigations centered on the communications stack linking the picker (a secondary CEP window) to `index.html`. Merge diffs revealed recent work that introduced a `holy.color.change` event using `new CSEvent()` alongside a `connectColorSyncOnce()` listener. A manual conflict resolution kept both components — the global `__HolyExpressorColorChange` handler and the guard that prevents double binding — while stripping redundant wrapper code. With the listener confirmed as live, attention shifted to the payload the picker emitted. DevTools began spamming `SyntaxError: Unexpected token o in JSON at position 1` inside the main panel’s event handler, and diagnostic logging revealed why: `evt.data` was already an object literal (`{hex: '#D6086B'}`), yet the handler still attempted to `JSON.parse(evt.data)`. CEP’s `CSEvent` does not auto-serialize objects, so assigning `evt.data = { hex: hex };` coerced the payload into the string “[object Object]”, which then shattered on parsing.

External research reaffirmed the sandbox boundaries: each CEP window runs in its own DOM, style scope, and `localStorage`, making event bridges or ExtendScript the only safe synchronization channel. With this context, the faulty assumption snapped into focus — the picker had to stringify the payload itself before dispatch. The corrective patch therefore replaced the offending assignment with `evt.data = JSON.stringify({ hex: hex });`. A screenshot supplied during review confirmed the helper `broadcastHexToMain(hex)` now stringifies the incoming parameter while the call site in `applyColor()` continues to forward the normalized hex value. A smaller follow-up tweak ensured the function referenced its `hex` argument directly rather than a `normalized` variable that was scoped elsewhere, eliminating the risk of accidentally broadcasting stale data.

Once the serialization fix landed, the communication circuit behaved as originally designed. The main panel’s listener could safely detect that `evt.data` was a string, parse it, and forward the normalized hex value into `Holy.State`, `updateDerivedVariables()`, and the CSS variable cascade. Because CEP isolates DOM contexts, this event-driven bridge now forms the canonical path for color propagation; redundant efforts to share `localStorage` or reference picker globals were abandoned. The change also clarified why earlier attempts to log `evt.data.hex` produced `undefined`: the data never arrived as an object until the picker converted it.

The closing verification emphasized both the restored behavior and the still-open monitoring steps. With JSON serialization in place, the expectation is that future logs will show `[HolyExpressor] Incoming evt.data = {"hex":"#12FF56"}` followed by the theme update toast, even though the specific confirmation screenshot was not captured in-session. No additional JavaScript or CSS adjustments were necessary once the bridge was repaired, so the hue slider visuals, Apply button, and derived variable recalculations immediately benefited. Remaining uncertainties are limited to runtime validation — the user had not yet posted a “success” log — but all observable blockers have been resolved, and the architecture now respects CEP’s message-passing requirements. In short, the color picker once again operates as the single source of truth for theme colors, broadcasting serialized events that the main panel can trust and apply in real time.

### Date Unknown – Quick Panel Warm-Wake & LiveSync Investigation (Condensed)
_chronology uncertain_
The Quick Panel troubleshooting cycle began with the user reporting a stubborn blank window every time After Effects launched the shortcut panel. Although the panel frame appeared and scripts were confirmed present, the UI surface remained an empty grey shell on first open. DevTools captured a repeating console failure — `[Holy.UI] Failed to parse quick panel log payload SyntaxError: Unexpected token o in JSON at position 1` — which reinforced that JavaScript ran but choked on malformed payloads. The repository layout clarified the moving parts: paired HTML files (`index.html`, `quickpanel.html`) with separate bootstrap scripts (`main_UI.js`, `main_SNIPPETS.js`, `quickpanel.js`) share a global `Holy` namespace, so a regression in the bridge or document resolution layer could stall rendering without throwing fatal errors.

Initial countermeasures attacked the DOM head-on. The user injected a simple `<button>` inside `quickpanel.html` and restored the missing `quickSnippetsMount` container to prove that markup physically shipped with the panel. Even with these fixtures in place, opening the panel yielded the same blank canvas, demonstrating that the HTML arrived but the paint cycle never executed. Subsequent tests deferred script execution and revalidated file paths, yet every cold start reproduced the JSON parsing exception and empty viewport. Clearing all CEP caches, renaming the extension folder, and relaunching After Effects eliminated stale assets but did not change the symptom: the first activation launched a hollow window.

The breakthrough observation came when the user pressed the Quick Access button twice in a row. The second click, issued while the panel was already visible, immediately filled the interface with the expected snippets. This behavior reproduced consistently, implying the first invocation booted CEPHtmlEngine without completing DOM hydration, while the second activation re-focused the already spawned web view and allowed scripts to finish binding. Logs corroborated this theory — the engine emitted the same parse error on the initial load yet produced no new diagnostics on the second. Comparable Adobe community threads describe similar “double-click to wake” quirks, strengthening confidence that the issue stems from timing rather than missing assets.

Engineering responses pivoted to load sequencing and resilience. Developers had recently converted direct `document.getElementById` calls to use a shared `cy_resolveDoc()` helper so both the main panel and Quick Panel could resolve DOM nodes safely. To cover timing gaps, they layered in focus listeners that called `Holy.State` rehydration whenever the window regained attention, yielding logs such as `[Holy.State] Panel refocused → rehydrating state`. Warm-wake logic supplemented this with an `setTimeout`-driven self-heal that re-ran `Holy.SNIPPETS.init()` roughly 800 ms after load, attempting to repopulate snippet markup if the first pass failed. These measures demonstrated execution by logging their activity, yet the UI still showed no elements until the second activation hinted the underlying bindings never latched on first boot.

Parallel work confirmed that persistence worked even as live updates failed. Editing snippets or banks in either panel successfully saved `banks.json` to disk, proving that `Holy.State` writes remained intact. However, the other panel saw no updates until a manual reload, signaling that CEP event broadcasts did not propagate across window contexts. Engineers suspected the listener registration or channel naming left the Quick Panel isolated, but no definitive fix emerged inside the session. Additional diagnostics emphasized known limitations: ExtendScript (JSX) logs do not surface in DevTools, so only the panel JavaScript logs were visible, and each CEP window runs inside an isolated JavaScript runtime with its own `localStorage`, forcing all shared state through the CSInterface bridge or filesystem.

By the end of the investigation the Quick Panel remained partially operational. Warm-wake timers, focus listeners, and persistence routines all executed as expected, yet the first-load blank state persisted and live synchronization between panels still failed. The user could reliably open the panel, click the launcher a second time to reveal content, and trust that any edits saved to disk would survive the session, but they still lacked a true hot-sync experience. Future work therefore centers on instrumenting the load lifecycle to determine why CEP fails to paint during the initial boot and on constructing a verified event relay so both panels consume `Holy.State` updates without manual intervention.

###2025-10-30 – Quick Panel Compositor Attach Fix (Condensed)
The Holy Expressor Quick Panel displayed a persistent blank window on its first open, showing white or gray depending on cache state, and required a second activation to render. Logs confirmed that all modules loaded correctly and the DOM was alive, but After Effects failed to visually composite the panel surface. Numerous JavaScript-side fixes—resize events, transform reflows, bridge readiness checks, and UI refresh calls—failed to solve the problem.

Research uncovered that this bug stemmed from an After Effects compositor attach race in CEPHtmlEngine, where the first requestOpenExtension() call succeeded logically while failing to bind a GPU surface. Examination of the Flow plugin revealed its panels use <AutoVisible>true</AutoVisible> and <Type>ModalDialog</Type>, forcing AE to pre-initialize compositor surfaces at startup.

Adopting the same manifest-level pattern resolved the issue completely. Setting <AutoVisible>true</AutoVisible> and <Type>Modeless</Type> ensured the Quick Panel surface was prebound and visible on the first open. Subsequent testing proved that switching between Modeless and Panel types retained the fix, provided AutoVisible remained true.

All redundant repaint and recovery code was deleted. The final manifest block:

<AutoVisible>true</AutoVisible>
<Type>Modeless</Type>
<Geometry>
  <Width>400</Width>
  <Height>300</Height>
</Geometry>

The Quick Panel now renders immediately without white or gray blanks, and compositor attach problems are considered permanently solved. Development focus has shifted to synchronizing snippet and bank data between panels.


### 2025-10-31 – Quick Panel Type & Persistence Behavior (Condensed)
Once the compositor attach issue was resolved, attention turned to window behavior and persistence. The Quick Panel, now opening correctly, still lacked saved screen position and size persistence. Testing established that Modeless windows in CEP cannot store OS-level coordinates or be restored by After Effects. AE treats them as transient dialogs excluded from workspace serialization.
Only <Type>Panel</Type> extensions participate in workspace layouts and can persist docking or floating coordinates. Attempts to reposition modeless windows programmatically via window.moveTo() or geometry tags failed because CEP sandbox blocks these APIs. The <Geometry> manifest tag defines initial size only, not coordinates, and no CEP API or manifest directive allows explicit spawn positioning.
Visual persistence can be faked with saved offsets and CSS transforms, but AE itself will always reopen modeless windows at defaults. For this reason, Holy Expressor’s Quick Panel was converted to <Type>Panel</Type> for persistent docking and workspace integration, despite the unavoidable header chrome. Header elements cannot be hidden or moved; they can only be visually blended with a top bar using AE’s dark theme color.
Final manifest decision:
<Type>Panel</Type> with <AutoVisible>true</AutoVisible> and standard geometry fields.
Modeless is retained only for transient floating tools.

### 2025-11-01 – Quick Panel Geometry, Debug Ports, and CSS Cascade (Condensed)
During further testing, the Quick Panel spawned larger than its declared 320×150 manifest geometry. Investigation confirmed that After Effects treats manifest <Size> and <Geometry> as non-binding hints overridden by workspace records. Only when no workspace data exists does AE use those dimensions. <MinSize> and <MaxSize> can limit resizing but not enforce a first-launch size.

Debugging also revealed each CEP extension can expose its own remote port. The .debug file must list every extension ID explicitly; otherwise, only the first port activates. Holy Expressor’s main panel (6904) and Quick Panel (6905) therefore require distinct <Extension> entries. Failure to include an ID prevents its debugger from broadcasting.

Parallel research clarified a CSS issue: the Quick Panel’s custom button style .btn-smallpop conflicted with the generic button {} rule. Equal-specificity selectors resolve by cascade order, so whichever appears later wins. The fix is to move .btn-smallpop below the generic rule or increase specificity (button.btn-smallpop {}), optionally resetting inherited styles with all: unset;.

Established outcomes:
AE ignores manifest size once a workspace record exists.
.debug supports multiple ports with matching IDs.
CEP user-agent styles always apply to native elements.
Correct bottom-right alignment uses position:absolute; bottom:0; right:0;.
Quick Panel remains Panel-type with persistent docking.


The Holy Expressor development session opened with the Full Editor panel failing to appear despite button logs confirming an attempted launch. The main, quick, log, and color-picker panels all functioned correctly, isolating the fault to the new Full Editor entry. Early inspection of the repository’s manifest confirmed no <Extension Id="com.holy.expressor.fulleditor"> declaration and no corresponding fulleditor.html file, explaining After Effects’ inability to open the window.

A corrected manifest block was drafted using the existing Color Picker and Quick Panel definitions as templates. The fix introduced <AutoVisible>true</AutoVisible> and <Type>Modeless</Type> to guarantee compositor readiness, plus a proper <HostList> entry in .debug with a unique debugging port. These additions followed earlier Quick Panel lessons showing that manifest-level visibility control resolves surface-binding failures more reliably than JavaScript-spawned windows.

After the update, the user created a new archive containing both the manifest entry and the HTML file. A second extraction confirmed all components were in place:
• fulleditor.html exists and references initFullEditor() and CodeMirror initialization.
• index.html includes <button id="openFullEditorBtn">Expand Editor</button>.
• main_UI.js contains cs.requestOpenExtension("com.holy.expressor.fulleditor").
• manifest.xml lists the new ID with a valid MainPath.

Because the panel still failed to appear, the investigation turned to After Effects’ manifest caching. Bumping ExtensionBundleVersion and assigning a unique debugging port were recommended to force a refresh. The assistant also noted that duplicate installations or cached manifests could suppress new entries.

Parallel discussion examined upload-cache behavior inside ChatGPT. Renaming ZIP archives and verifying extraction listings were identified as effective methods to avoid stale file reuse during future reviews.

By the end of the session, all repository components for the Full Editor panel were confirmed present and correctly wired. The remaining uncertainty concerned After Effects’ internal manifest cache, which might require manual clearing or duplicate removal. Core architectural truth: manifest registration, not JavaScript execution, governs panel discoverability, and AutoVisible + Modeless ensures compositor stability once recognition occurs.


## THREE PART SVG SCALING

2025-11-12 – Holy Expressor SVG Resize Investigation (Condensed)

Initial State:
The Holy Expressor CEP panel used a single SVG element for its custom search text box frame, combining three visual segments (left, middle, right). The panel relied on JavaScript resize logic via ResizeObserver and a pixel-to-SVG ratio (pxPerSvgUnit) to control scaling. However, the system failed beyond ~196 px panel width, where scaling stopped and the edge caps visibly distorted.

Root Cause:
The static initialization of pxPerSvgUnit meant the scaling ratio never updated dynamically. This caused a hard width limit where the SVG geometry could no longer stretch correctly. Tests confirmed that expanding the viewBox simply deformed the caps further because the geometry itself was stretched, not the layout logic.

Research Findings:
Web research confirmed that SVGs lack native nine-slice scaling, making multi-segment layouts (fixed edges, stretchable middle) the standard web solution. Developers usually implement this with three SVGs inside a flex container rather than relying on complex coordinate math.

Fix Design — “Vega Patch”:
A high-level “Vega Patch” was defined, describing intent rather than code: replace the single SVG with three independent SVGs arranged in a flex row (cap-left, cap-mid, cap-right), delegate all resizing to CSS, and eliminate all JavaScript geometry handling. This design aligns with known, stable web patterns for resolution-independent scaling.

Codex Implementation:
The patch was executed successfully:

HTML was restructured to include .customSearch-frame-row containing the three SVGs.

CSS handled layout using Flexbox, with .cap-left and .cap-right fixed to 16.82 px and 7.71 px widths.

The mid section (.cap-mid) stretched via flex: 1 and preserveAspectRatio="none".

All JS resize logic (ResizeObserver, getBBox, etc.) was deleted from main_UI.js.

Pointer event transparency was handled by setting .customSearch-frame-row to pointer-events:none while the overlaid <input> re-enabled interaction.

Color handling switched to currentColor inheritance for consistency across enabled/disabled states.

Outcome:
The redesigned component scaled perfectly across panel widths without deformation. The user verified: “Oh my god, it fucking worked. Huge.”
The final system is pure CSS, lightweight, and fully stable inside AE’s Chromium-based CEP environment. Geometry is static and consistent; variables now affect only style (color and opacity).

Key Truths & Lessons:

JS ratio math caused fixed-width lockout; CSS flex solves scaling naturally.

vector-effect:non-scaling-stroke stabilizes line weight but not geometry.

Multi-SVG segmentation is the correct scalable pattern; no native SVG nine-slice exists.

The Holy Expressor UI now uses static HTML + CSS as its geometry source of truth.

No residual contradictions or unresolved uncertainties remain.

End State:
Triple-SVG flex layout; fixed caps, stretchable mid; CSS-only scaling; no deformation.
All prior JS scaling logic obsolete.


THIS IS NEWER AND ACTUALLY WORKED, ABOVE I AM UNSURE:


### 🧠 2025-12-04 – Custom Search Resurrection (Final)

**Initial State:**  
The Holy Expressor plugin’s Strict Custom Search feature appeared “broken” for months. Clicking **Apply** with Custom Search enabled produced no logs, no toast, and no expression changes, across all recent and older backups. UI routing and scoping were suspected as likely causes.

**Core Discovery:**  
Search Captain was dying silently **before matching logic even ran** due to an illegal `.trim()` call inside ExtendScript. When `.trim()` was executed on a non-string token, ExtendScript threw an exception that never propagated back to CEP, preventing callbacks and killing all logs and toasts. The crash existed across multiple backups, not just the current repo.

**Result:**  
Removing the unsafe `.trim()` and guarding token handling allowed Search Captain to return valid payloads again. Strict matching now works correctly for:
• Stroke Width  
• Opacity  
• Fill Color  
• Roundness  
Including nested and container-scoped queries via `>` expressions.

**Final Outcome:**  
Custom Search expression application is fully operational, strict, and reliable. The issue was not routing, scoping, or UX — but a hidden host exception preventing the entire apply pipeline.

**Next Work (Confirmed):**  
1. End LiveSync “Snippet Spam” loop  
2. Restore clean toasts + payload logs  
3. Remove fuzzy matching patch (strict mode only)

---

──────────────────────────────────────────────

# === DEV ARCHIVE UPDATES (MERGED) ===

## 🧠 TRUTH SUMMARY LOGS

### **2025-11-13 – Custom Search Checkbox + Three-Part SVG Frame Integration (Condensed)**

**Initial State:**
The user was debugging the Holy Expressor CEP panel’s **custom search checkbox** and **search-field frame**, consisting of a diamond-checkbox label and a three-part SVG frame (`cap-left`, `cap-mid`, `cap-right`). The checkbox container was oversized, positioned beneath the SVG frame, and snapped laterally on click. The user required that only `.customSearch-checkbox` be modified (not `.checkbox-Diamond`), and requested clarity on whether Codex had previously refactored the SVG scaling system. A large HTML/CSS/JS diff was provided.

**Problems Identified:**
• Checkbox container too large relative to its diamond SVG
• Checkbox positioned behind the three-part SVG frame
• Checkbox “jumping right” on click due to transform override
• Uncertainty about Codex’s earlier SVG-scaling rewrite
• Diff contained major structural changes requiring confirmation

**Investigations & Findings:**
• The lateral “dash” resulted from `.checkbox-Diamond:active` defining its own `transform`, which overwrote the positional offset applied by `.customSearch-checkbox`. CSS transform precedence explained the bug with certainty.
• Because `.checkbox-Diamond` is globally shared and cannot be edited, the correct fix was to override it with a new `.customSearch-checkbox:active` rule that restores the missing translate offset.
• z-index and relative positioning correctly elevated the checkbox above the SVG frame.
• Diff analysis confirmed that Codex **did** previously rewrite the entire frame system:
– Deleted the full JS scaling engine (`ResizeObserver`, `pxPerSvgUnit`, viewBox math)
– Introduced a **CSS-only flexbox architecture** with three separate SVG files
– Implemented fixed-width left/right caps and a flexible mid-section
– Updated HTML structure and styles accordingly
• This confirmed the three-part SVG system as a stable, intended architectural evolution.

**Fixes Implemented:**
• `.customSearch-checkbox` resized without touching `.checkbox-Diamond`.
• `.customSearch-checkbox:active` added to preserve the positional offset during active state.
• Correct z-index layering ensured checkbox always appears visually above the frame.
• The new SVG-frame flex architecture was verified functional, stable, and aligned with web-standard nine-slice patterns.

**End State:**
• Checkbox stays stable, correctly layered, and correctly sized
• No transform snapping
• Three-part SVG system confirmed as the final design
• JS-scaling engine fully removed and obsolete
• All remaining SVG layout responsibilities handled by CSS flexbox
• Color and opacity controlled through currentColor, consistent with CEPlayer theming

**Resolved & Closed:**
• Pixel-perfect scaling of the frame is now validated
• No rectangle fill is required in the mid-section
• JS-resize logic is permanently removed
• Flexbox scaling across AE’s Chromium runtime is verified stable

**Remaining Unknowns (non-SVG-related):**
• Whether removal of the JS scaling module affects any unrelated code paths remains untested
• Broader panel-resize logic unrelated to the search field is unchanged

**Final:**
The checkbox and SVG frame now function exactly as intended.
The three-part SVG architecture is confirmed as permanent foundation.

---

### **2025-11-12 – Three-Part SVG Scaling Architecture (Final Condensed)**

**Initial State:**
Holy Expressor originally used a **single monolithic SVG** for the search bar frame, stretched by JavaScript using `ResizeObserver`, a manually computed scaling ratio (`pxPerSvgUnit`), and viewBox manipulation. The system became unstable beyond ~196 px width, producing cap distortion and hard geometry limits. Adjusting the viewBox only worsened deformation, proving the design was mathematically brittle.

**Core Discovery:**
SVG provides **no native nine-slice scaling**.
Web-standard practice uses **three independent SVGs** inside a flex container:

* Fixed left cap
* Stretchable middle segment
* Fixed right cap

This architecture sidesteps the need for geometric JS manipulation entirely.

**Codex Implementation:**
• Converted the entire system to a **three-part SVG flexbox layout** (`cap-left`, `cap-mid`, `cap-right`)
• Removed ~100 lines of JS scaling logic in `main_UI.js`
• Introduced `.customSearch-frame-row` using `display:flex` for responsive scaling
• Locked left/right caps to precise fixed pixel widths (16.82px / 7.71px)
• Set `cap-mid` to `flex:1` with `preserveAspectRatio="none"`
• Applied `vector-effect:non-scaling-stroke` to maintain stroke weight
• Disabled pointer events on the SVG row and reactivated them on the overlaid `<input>`
• Unified color logic using `fill:currentColor`, respecting AE’s theme variables

**Final Outcome:**
• **Perfect, distortion-free scaling** across all tested widths
• **Zero JS required**; all geometry is CSS-driven
• **Stable in AE’s Chromium CEP engine**, including non-default UI scale environments
• **Geometry source of truth** is now static HTML + CSS
• **search-frame can no longer regress** into deformation or misalignment
• The Vega Patch specification has been exceeded by implementing a fully production-grade solution.

**Retired / Obsolete:**
• `ResizeObserver`-based scaling
• `getBBox()` geometry sampling
• Dynamic viewBox mutation
• `pxPerSvgUnit` ratio calculations
• All single-SVG deformation concerns
• All earlier “min/max width” uncertainties
• All prior fill-rectangle speculation

**Permanent Design Rules:**
• Three-segment architecture is mandatory for all future search-field frames
• JS must never mutate SVG geometry
• All SVG color is inherited through currentColor
• Strokes must always use non-scaling behavior
• Input overlays define the interaction layer

**End State:**
A clean, modern, flex-driven UI element that is stable, elegant, scalable, and fully aligned with Holy Plastic design language.


---

# 📌 **2025-11-17 – DevTools CSS Hot-Reload Workflow (Watcher Pipeline)**

### 🎯 Summary  
Implemented a custom file-watcher system enabling **DevTools-driven CSS editing** for Holy Expressor.  
Edits made in Chrome/Canary DevTools → Save As → instantly sync into the real `styles.css` used by the CEP panel.

This provides a *reliable* pseudo–live-reload pipeline inside CEP, bypassing Chrome DevTools’ Workspace restrictions.

---

### 🧠 What We Wanted  
- Ability to edit CSS inside Chrome/Canary DevTools  
- Press “Save As” → instantly update plugin stylesheet  
- No Workspaces (blocked in CEF)  
- No admin folder issues  
- No GitHub boilerplate bundles  
- 100% predictable behaviour  
- Minimal steps, minimal ceremony  
- Tools that **always** trigger when a file drops in

---

### 🧪 What Was Tried & Why It Failed  
**Attempts included:**  
- Chrome DevTools Workspace mappings  
- Overrides folder  
- Canary DevTools experiments  
- Hosting CEP via HTTP  
- Moving CEP extension to AppData (non-admin)  
- Removing symlinks  
- Watching individual files  
- Watching rename-events only  
- Timestamp logic  
- Multiple watcher versions (V1–V4)

**All failed due to:**  
- CEF loading panels via `file://` → not a real origin  
- DevTools refusing to map file:// origins  
- Chrome Save-As emitting inconsistent FS events:  
  - sometimes only `Renamed`  
  - sometimes only `Changed`  
  - sometimes overwrite-in-place  
  - sometimes temp-file rename  
- Chrome *not* guaranteeing new filenames every time  
- Windows metadata events not matching expected patterns

Result: **No reliable single-event trigger.**  
Therefore → brute-force was selected.

---

### ⚙️ Final Working Solution — “Watcher V0 (Brute Force Mode)”  
A PowerShell file-watcher placed in:

```
css-devEx/raw-downloads
```

Launcher in project root runs the watcher.  
Workflow:

1. Edit CSS in DevTools  
2. Save As → Canary downloads into raw-downloads  
3. Watcher sees *any* filesystem activity  
4. Picks newest `.css` by `LastWriteTime`  
5. Copies it directly into:

```
css/styles.css
```

No debounce, no rename filtering, no nuance.  
**Anything touches the folder → the newest file becomes the live stylesheet.**

This is intentionally dumb-as-a-brick and rock-solid.

---

### 🧪 Behaviour Notes  
- Chrome Save-As often triggers 4+ events per drop → expected  
- Manual renames in the folder do **not** usually update LastWriteTime → generally ignored  
- Dragging a file in → updates  
- Copy–paste → updates  
- Overwrite → updates  
- Multiple files in folder → newest wins  
- Reliability is 100% so far

---

### 🫀 Why This Exists  
CEP cannot do true live-reload and Chrome DevTools cannot write to extension files.  
This watcher pipeline effectively simulates DevTools Workspaces by force.

It gives Holy Expressor **a modern live CSS editing experience inside a legacy CEP sandbox**, with no special build tools.

---





# **Path Resolution Simplification Pass (Lean Builder Reboot Era)**

### **WHAT WAS BEING ATTEMPTED**

The goal of this phase was to finally make **“Load Path from Selection”** reliable by replacing years of layered, heuristic-heavy JSX path builders with a **deterministic, minimal, single-responsibility builder**.

Motivation came from a recurring UX failure:

* Clicking *Load Path from Selection* often did nothing
* Or returned vague `JSX error: exception` toasts
* Or produced mangled / over-verbose paths
* Or worked only in narrow cases, then silently failed elsewhere

This feature had been attempted multiple times in the past (including earlier “lean” and “leaner” rewrites), but always collapsed back into complexity due to trying to support *everything* at once.

This pass intentionally focused on:

* One selected property only
* Explicit allow-lists
* No magic traversal
* No silent fallbacks

---

### **PROBLEMS ENCOUNTERED**

Several deep, recurring issues surfaced again during this work:

* **Selection ambiguity**
  `comp.selectedProperties` often contains *containers* as well as leaf properties. Earlier systems assumed “selection = usable,” which is false.

* **Property group ordering confusion**
  `propertyGroup(d)` is returned leaf → root, while expressions must be built root → leaf. This mismatch caused repeated reversals, double-reversals, and accidental “almost works” states.

* **Shape layer internals are deceptively noisy**
  Shape layers inject internal containers like `"Contents"` and `"ADBE Root Vectors Group"` that *must* be skipped or you end up with content spam:

  ```
  .content("Contents").content("Contents").content("...")
  ```

* **False confidence from partial success**
  Multiple iterations produced *valid but wrong* paths (e.g. correct leaf accessor but missing groups, or correct groups in reversed order). These were misleading and slowed progress.

* **Legacy gravity**
  Old systems (`he_GET_SelPath_Engage`, `he_GET_SelPath_Build`, `he_U_getSelectedPaths`, `he_P_MM_getExprPathHybrid`) remained in the codebase, making it unclear what was still in use vs. dead weight. Their presence encouraged accidental reuse of flawed mental models.

---

### **WHAT ACTUALLY WORKED**

The breakthrough came from **aggressively simplifying the mental model**:

* **Single-leaf rule**
  The new builder (`he_GET_SelPath_Simple`) hard-requires *exactly one leaf property*. No multi-select, no containers, no guessing.

* **Explicit filtering first, not later**
  Selection is filtered immediately to `PropertyType.PROPERTY`. Containers are rejected early with clear errors.

* **Shape vs non-shape mode split**
  Shape mode is detected purely via `matchName` prefix (`ADBE Vector*`), not by brittle structural assumptions.

* **Top-down expression construction**
  Parent chains are reversed exactly once, then emitted in strict root → leaf order. No post-hoc reordering.

* **Structural skipping is minimal and explicit**
  Only `"Contents"` and `"ADBE Root Vectors Group"` are skipped. Nothing else is silently ignored.

* **Allow-lists instead of rewrite tables**
  Old `GROUP_TOKENS`, `STRUCTURAL_SKIP`, `LIL_NAME_GROUPS`, etc. were *not* carried over wholesale.
  Instead:

  * A **leaf accessor map** defines what properties are supported.
  * A **shape modifier allow-list** exists only for validation, not rewriting.
  * Unsupported cases fail loudly with clear error payloads.

* **Quarantining before deletion**
  Legacy functions were explicitly marked **DEPRECATED / QUARANTINED**, and the UI button was rewired to bypass them entirely. This reduced noise while preserving rollback safety.

The result:

* Correct paths
* Correct order
* No content spam
* Predictable failure modes

---

### **WHAT DID NOT WORK / REMAINS UNSOLVED**

* **Trying to “salvage” legacy traversal logic**
  Reusing old tables or traversal patterns consistently reintroduced hidden assumptions and bugs. Partial reuse was worse than a clean break.

* **Universal support**
  Not all properties are supported yet (e.g. some Layer Styles, certain effect internals). These now error clearly instead of failing silently, but coverage is incomplete by design.

* **Auto-expanding support**
  There is no dynamic fallback if a new AE property appears. This is intentional but means maintenance is required as AE evolves.

---

### **TAKEAWAYS FOR FUTURE AGENTS**

* **DO NOT try to be clever here.**
  Determinism beats coverage. Always.

* **Assume selection is hostile.**
  Validate aggressively. Containers lie.

* **Property groups are returned leaf → root. Expressions are root → leaf.**
  If you forget this, you will waste hours.

* **Never auto-skip groups you don’t understand.**
  If a group isn’t explicitly allowed, fail loudly.

* **Do not resurrect legacy builders.**
  If touching path logic again, start from `he_GET_SelPath_Simple` and extend via allow-lists only.

* **If a path “almost works,” it is wrong.**
  Partial correctness is the most dangerous state in this system.

This era finally established a **correct mental model** for AE path resolution. Any future work should treat this as the canonical baseline and resist the temptation to generalize too early.






### 🧠 2025-02-16 - Custom Search (Orange Apply) Shape Layer Traversal + Group Scoping Fix (Signature-Based)

**Context / Problem**  
Custom Search (Orange Apply / SearchCaptain) had two linked pain points during shape-layer work:

- ✅ Group scoping needed to work (select Fill 1, Stroke 1, etc. and only hit descendants)
- ❌ Selecting the whole layer (or Contents) would only apply to the first encountered branch (commonly “Rectangle 1”), missing siblings like “Rectangle 2” and also missing other valid properties like Transform Opacity

During iteration, a regression also surfaced where the host attempted to call a missing helper (`he_P_GS3_findPropsByName`), producing a hard ReferenceError toast and breaking all selection modes.

**Core Cause 1 (Traversal Early-Exit on Single Token)**  
The single-token search path was using a traversal/apply helper that “applies while traversing” and can exit early per branch. Practically, this created the “only Rectangle 1 gets hit” behaviour when the search term is something broad like `Opacity`.

**Fix**  
For single-token searches, the logic was shifted to “collect first, apply later” using the same GS3 token-walker approach as multi-token mode, but with a single token. This restores full layer-root coverage across sibling shape groups (Rectangle 1, Rectangle 2, etc.) and avoids early exit behaviour.

**Core Cause 2 (Group Scoping Identity Instability + Path Unreliability)**  
Two earlier approaches were proven unreliable:

- Expression-path prefix matching is not a stable hierarchy for shape layers because expression paths can omit, reorder, or normalize intermediate groups (especially around Contents and internal helpers).
- Direct object identity checks (`current === selectedGroup`) can fail because ExtendScript/AE can hand you re-instantiated wrapper objects across calls. That makes “is this the same group?” comparisons flaky.

**Fix**  
Group scoping was reworked to use **ancestor signatures** rather than identity or expression paths.

- Build an “allowed group signatures” set from the current selection.
- Each signature is based on:

    - owning layer index
    - ancestor chain segments using `matchName` (fallback to `name`) plus `propertyIndex`
- When filtering candidate targets, walk `parentProperty` upward and compare computed signatures. If any ancestor signature matches, the property is accepted.

This made group scoping stable and predictable, including for shape Contents descendants.

**Deduplication / visitedKey Upgrade (Critical for Shape Repeats)**  
The “visitedKey” (dedupe) system previously returned `exprPath` early when available. This could cause collisions or incorrect dedupe behaviour in shape hierarchies with repeated structures (and also undermined later filtering strategies).

**Fix**  
`visitedKey` now uses an **ancestry-based property signature** (owner layer + ancestor chain) instead of returning `exprPath` early. This avoids collisions across repeated shape groups while keeping dedupe deterministic.

**Files / Area Changed**

- `jsx/Modules/host_APPLY.jsx`

    - Group scoping: signatures-based allow-list + descendant check via `parentProperty`
    - Single-token search: switched to “collect then apply” token walker to prevent branch early-exit
    - Dedupe: `visitedKey` now uses ancestry signature, not `exprPath` short-circuit

**Result / Verified End State**

- ✅ Group-scoped Custom Search works correctly (Fill 1, Stroke 1, etc. only hits descendants)
- ✅ Selecting entire layer or Contents now applies across all sibling shape groups (Rectangle 1 + Rectangle 2 + Transform Opacity etc.)
- ✅ No more missing-helper ReferenceError path
- ✅ Behaviour matches intended “SearchCaptain” ergonomics without compromising existing traversal architecture

**Notes / Lessons**

- DO NOT rely on expression-path strings as a hierarchy source for shape layer filtering.
- DO NOT rely on wrapper object identity for group comparisons in ExtendScript.
- Prefer “collect then apply” for broad searches. Helpers that apply during traversal can silently under-hit complex shape trees.



## 🧠 Delete Expressions — Phase 1 Resolution (Selection-Root Traversal)

### Context

The **Delete Expressions** button was originally implemented by reusing **Search Captain–style collection logic**, relying on `he_P_SC_collectExpressionTargetsForLayer` and path-based re-resolution. This approach appeared sound conceptually but proved **non-functional at runtime** and structurally unsafe for destructive operations.

Diagnostics confirmed that:

- The collector function **did not exist at runtime**
- Property and group selections were **silently coerced into layer mode**
- Delete operations could report success while performing **no mutations**
- The pipeline relied on **path → re-resolve → mutate**, introducing scope ambiguity

This created a hard blocker: delete could not function reliably, and further architectural debate was premature.

* * *

### Resolution Strategy (Phase 1)

The fix deliberately **abandoned collector reuse** and implemented a **minimal, local traversal model**, optimized for correctness and user intent rather than abstraction parity.

Core principles:

- **Selection precedence is explicit**

    - If `selectedProperties.length > 0` → property/group intent
    - Else if `selectedLayers.length > 0` → layer intent
    - No fallback, no inference
- **Traversal operates on live objects**

    - No paths
    - No re-resolution
    - No cross-layer inference
- **Mutation happens immediately**

    - Leaf properties with `canSetExpression === true` are cleared directly
    - Group nodes are traversed depth-first
    - Ownership is resolved via ancestry, not string matching
- **Safety is preserved**

    - Only owning layers of selection roots are temporarily enabled
    - Layer state is tracked and restored
    - Errors are accumulated per-property, not swallowed

* * *

### Outcome

This approach produced the desired result:

- Delete Expressions now **works deterministically**
- Group, property, and layer selections behave **exactly like Custom Search**
- UX parity between **Search** and **Delete** is achieved
- The system is **trustworthy**: what is selected is what is mutated

Diagnostics showed:

- Correct `selectionType` reporting
- Accurate `clearedProperties` counts
- Zero false positives
- No scope leakage

* * *

### Key Insight

**Destructive operations must not rely on fuzzy resolution.**

While path-based collection is acceptable for **search, reporting, and preview**, deletion requires:

- explicit targets
- live object references
- ancestry-bounded traversal

This Phase 1 implementation establishes a **lawful baseline**. Any future abstraction or shared traversal logic must preserve this contract.

* * *

### Status

- **Phase 1: COMPLETE**
- Collector reuse intentionally deferred
- System is now stable, correct, and extensible


### ✅ **FINAL RESOLUTION: DELETE EXPRESSIONS + CUSTOM SEARCH SCOPE ALIGNMENT**

**Context:**  
Following the successful implementation of the **Delete Expressions** feature with group-aware traversal, a regression was detected where **Custom Search lost group-specific scoping** and began applying layer-wide for Shape Layers.

**Observed Regression:**

- Selecting a Shape Layer **group** (e.g. Stroke 1 / Fill 1) caused Custom Search to behave as if the **entire layer** was selected.
- This contradicted prior, correct behavior where traversal was constrained to the selected group’s descendants.

**Root Cause (Confirmed):**

- `he_U_SC_buildAllowedGroupSignatures` correctly encoded scoping intent:

    - `null` ⇒ whole-layer scope
    - non-null ⇒ constrained group scope
- However, `he_U_SC_isDescendantOfAllowedGroup` contained an **over-applied early return**:

    - Any ancestor named **“Contents”** auto-accepted descendants.
    - Because all Shape Layer properties descend from Contents, this **short-circuited group scoping entirely**.
- This logic drift likely entered during delete-expressions alignment work, where whole-layer behavior was intentionally required in other contexts.

**Repair Strategy:**

- **Do not change traversal order or Search Captain architecture.**
- Gate the “Contents means whole layer” shortcut so it only applies when:

    - group scoping is explicitly disabled (`allowedGroupSignatures === null`)
- Preserve the existing rule:

    - Selecting **Contents** explicitly still results in whole-layer scope.

**Outcome:**

- Custom Search group scoping is fully restored.
- Layer-only selection still applies layer-wide.
- Contents selection still forces whole-layer behavior.
- Delete Expressions remains unaffected and continues to function correctly.

**Final State:**  
Delete Expressions and Custom Search now share **consistent traversal semantics** while remaining **logically independent**.  
The development cycle for this alignment is considered **complete and stable**.



* * *

### *2026-01-14 | gpt-5.2 + lead-dev — PickClick (Selection-Driven Pick Mode) — Intent, Design, and Aborted Patch*

**Context / Motivation:**  
This development thread explored a new interaction mode internally referred to as **PickClick**. The goal was to introduce a **pick-whip-like UX without drag**, allowing panel buttons to defer their action until the user clicks a property in the After Effects timeline. Primary motivation was to improve ergonomics for actions such as **Load Expression from Selection**, especially in large, complex comps where selection intent is clearer after the button press rather than before.

**Key Design Intent (Non-Negotiable):**

- PickClick is a **general interaction mode**, not bespoke to a single button.
- Initial integration target was *Load Expression from Selection*, but the system was explicitly designed to be reusable for future actions (e.g. Load Path from Selection).
- Stability in **large projects** was a hard requirement; evalScript polling from the CEP panel was explicitly rejected.

**Architectural Decision:**  
After research and comparison, the chosen approach was **Option B: host-side polling + CEP event dispatch**.

- ExtendScript (host) owns polling via `app.scheduleTask` (non-blocking, cancelable).
- CEP panel does **not** poll selection.
- Host dispatches a **single CEP event** when selection changes.
- Panel resolves the action and cleans up state.

This avoided known crash vectors associated with repeated CEP→JSX evalScript polling.

**UX Layer (Pick Veil):**  
A visual “pick veil” was introduced to clearly communicate that the panel is waiting for an external (timeline) interaction:

- Full-panel semi-transparent overlay (HTML/CSS only).
- Appears immediately when PickClick is armed.
- Disappears on resolve or cancel.
- Clicking the veil explicitly **cancels PickClick**, stopping host polling and removing listeners.

The veil was intended as *state signaling*, not modal blocking.

**Implementation Attempt (Aborted):**  
A full multi-file patch was produced covering:

- New CEP module: `main_PICKCLICK.js`
- New host module: `host_PICKCLICK.jsx`
- Wiring into load order (`index.html`, `main_DEV_INIT.js`)
- CSS veil styles
- Integration of Load Expression button via PickClick
- Documentation updates in AGENTS.md / README.md

The patch was large and structurally coherent, but **failed in practice** and was intentionally **not merged**. The specific failure mode is not documented here by design.

**Important State at Abandon:**

- The conceptual design is considered **sound and worth revisiting**.
- The failure was treated as an implementation / integration issue, **not a rejection of the architecture**.
- No PR was merged; no changes are considered canonical.
- This entry exists to preserve **intent, constraints, and reasoning**, not code.

**Guidance for Future Agent:**

- Reattempt PickClick as a **phased implementation** (veil → controller skeleton → host polling → first button integration).
- Preserve Option B (host-side polling); do not regress to CEP polling.
- Treat PickClick as a reusable mode/controller, but avoid premature abstraction.
- Expect additional notes to follow in subsequent Dev Archive entries.








### 🧾 Dev Archive Addendum (PickClick Saga, Comment Drift, Canon Reset)

**Date:** 2026-01-14 (late)

#### 🧩 What we were building

* A new **PickClick UX** flow: press a button in the panel, show a veil, then **click a property in the AE timeline** to resolve the pick and perform an action (initial target: “Load Expression From Selection”, later: “Load Path From Selection” style behavior).

#### 🔥 Primary symptom

* **Veil appears correctly** when armed.
* **Clicking properties in the AE timeline does NOTHING.**
* Only clicking the veil itself cancels PickClick.
* Notably, this button previously showed a toast; after PickClick integration, the toast was missing, suggesting the chain was changing and/or failing earlier than expected.

#### 🧠 Why the debug phase mattered

We switched strategy from guessing to instrumentation:

* Removed a blocking **`alert("host_PICKCLICK.jsx LOADED")`** and replaced it with non-blocking logging.
* Added **end-to-end trace events** from host JSX → CEP panel → Chrome DevTools, to see exactly where the chain was failing.
* Added a CEP listener for PickClick trace events so host-side telemetry appeared in DevTools.

#### 🧨 The smoking gun (what the logs proved)

Chrome DevTools showed repeated host-side failures during the poll loop:

* `ReferenceError: Function he_U_getSelectedProps is undefined`
* The poll loop was running and rescheduling correctly, but **selection payload retrieval was impossible**, so PickClick could never resolve on selection changes.
* This perfectly matched the UX: “veil stays forever unless cancelled manually.”

#### 🌀 The real cause (comment confusion + architectural drift)

* `he_U_getSelectedProps` only existed as **commented-out code** (and there were effectively no live definitions elsewhere).
* Multiple agents (human + Codex) treated **commented blocks as live architecture**, which caused:

  * **Dissonance** between “repo truth” and “assumed truth”
  * Agents proposing “restore/resurrect” fixes that were architecturally risky
  * A loop where new features were built against APIs that didn’t exist at runtime
* This created a fragile “canonical knowledge base” effect: names survived in conversation and doc references, but not in executable reality.

#### ✅ Canonical system reaffirmed (what is actually trusted)

We re-centered on the newer, deterministic architecture already used by “Load Path From Selection”:

* **`he_GET_SelPath_Simple`** is the canonical selection gate and deterministic path builder:

  * active comp validation
  * reads `comp.selectedProperties`
  * filters to `PropertyType.PROPERTY`
  * requires exactly **one** selected leaf property
  * fail-fast on containers / multi-select / unsupported properties
  * deterministic, allow-list based path emission
* This system is explicitly designed to avoid the older heuristic / sprawling “selection helpers” that were quarantined previously.

#### 🔥 Current state (end of night status)

* PickClick currently:

  * arms successfully and shows veil
  * can only cancel via veil click
  * cannot resolve from AE timeline selection because it depends on removed/disabled selection helper functions
* Debug instrumentation is now in place and working, giving reliable host-to-panel trace visibility.

#### 🛠️ Decision for next steps (going forward)

We are NOT resurrecting the old `he_U_getSelectedProps` / `he_U_findFirstLeaf` helper stack. Instead:

1. **Hard reset / cleanup**

* Fully delete (or permanently tombstone) the legacy helper functions that caused drift.
* Avoid keeping executable logic commented out. Commented code is now treated as a primary source of agent misreads.

2. **Route PickClick through the canonical “Simple” system without disrupting it**

* Treat **`he_GET_SelPath_Simple` as a black-box selection validator**:

  * PickClick calls it.
  * If it returns `{ ok: true }`, PickClick resolves (discard the `expr` if not needed yet).
  * If `{ ok: false }`, PickClick remains armed.
* This reuses the modern deterministic selection contract without modifying the path builder’s current job.

3. **Stabilize the chain**

* Keep the current trace logging until PickClick resolves reliably from timeline clicks.
* Once stable, reduce instrumentation and leave only minimal fail-fast logs.

4. **Documentation hygiene**

* Update AGENTS / Knowledge Base notes that incorrectly imply legacy selection helpers are canonical or live.
* Add a rule: **no commented-out executable systems**, only tombstones pointing to Dev Archive context.

#### ✅ Immediate next action (when resuming)

* Implement PickClick resolution logic based on calling `he_GET_SelPath_Simple` as the selection gate.
* Confirm: veil resolves on valid single-leaf selection and cancels cleanly.
* Only after that, layer in “Load Expression From Selection” and later “Load Path From Selection” behavior using the same canonical contract.




