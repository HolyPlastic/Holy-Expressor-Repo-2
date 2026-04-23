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

  * Partial renames left broken paths/channels; Unicode artifacts appeared in logs; host parse errors silently break loading.
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
  <Size>
    <Width>400</Width>
    <Height>300</Height>
  </Size>
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

* * *

### FIX / PROBLEM INSTANCE: PickClick Reliability Hardening & Unsupported Property Support

* **Problem description**
    * PickClick (pick-whip UX) was frequently "getting stuck" with the veil up.
    * Polling would cease silently if an error occurred.
    * Clicks on certain properties (Layer Styles, Lights) were detected by polling but ignored by the resolver because they lacked formal expression paths.

* **Trigger or discovery context**
    * User diagnostics showed the veil appearing but never dropping upon clicking properties in the AE timeline.
    * "Fragile poll chain" identified where single-shot tasks failed to reschedule if exceptions occurred.

* **Hypotheses considered**
    * Moving from single-shot `scheduleTask` to repeating tasks would prevent loop death.
    * State clearing was happening too early, potentially before event dispatch completed.
    * Formal expression paths are unnecessary for the "resolve" trigger; any unique string (breadcrumb) works as a deduplication key.

* **Experiments attempted**
    * Replaced chained `app.scheduleTask(..., false)` with `app.scheduleTask(..., true)`.
    * Wrapped host poll in a top-level `try/catch`.
    * Implemented a 60s safety timeout on the CEP side.
    * Added a breadcrumb fallback in `he_PICK_LeafProp_Snapshot` using property display names.

* **What failed and why**
    * The original single-shot chain had no error handling; any internal JSX exception (e.g., in `he_GET_SelPath_Simple`) would exit the function before the next poll was scheduled, killing the listener permanently.

* **What was implemented**
    * **Host Hardening:** `host_PICKCLICK.jsx` now uses a repeating task and explicit `stopPolling()` logic. Dispatch occurs *before* host state reset.
    * **CEP Hardening:** `main_PICKCLICK.js` includes a safety timeout and better error handling for the arming callback.
    * **Fallback Paths:** When `he_GET_SelPath_Simple` fails (common for non-standard properties), the host builds a "breadcrumb path" (e.g., `Layer 1 > Layer Styles > Drop Shadow > Opacity`). This satisfies the non-empty requirement to trigger a resolve in the panel.
    * **Cleanup:** Removed duplicate `#pickClickVeil` from `index.html`.

* **Immediate side effects**
    * Polling is now extremely resilient to exceptions.
    * PickClick now works on nearly all animatable properties, even those without formal matchName-to-accessor mapping.

* **What remained unresolved**
    * `he_GET_SelPath_Simple` still lacks formal accessor mapping for many properties; however, the breadcrumb fallback mitigates the functional impact.

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

### *2026-01-14 | gpt-5.2 + lead-dev — PickClick (Selection-Driven Pick Mode) — Intent, Design Context, and Unmerged Implementation Attempt*

**Context / Motivation (at the time):**  
This development thread explored a proposed interaction mode internally referred to as **PickClick**. The intent was to investigate whether a **pick-whip-like UX without drag** could be introduced, allowing panel buttons to defer their action until a subsequent interaction occurred in the After Effects timeline. At the time, this was motivated by ergonomic friction observed when performing actions such as **Load Expression from Selection** in large or complex compositions, where selection intent may occur after the initiating action rather than before.

This entry records the **design intent and implementation attempt as they existed at the time of writing**, not a determination of feasibility beyond that context.

**Design Intent (as defined during this session):**

- PickClick was conceived as a **general interaction mode**, not tied to a single button.
- The first integration target explored was *Load Expression from Selection*.
- Reusability for other selection-driven actions (e.g. path-based operations) was part of the initial intent, but not implemented at this stage.
- Stability in **large projects** was treated as a constraint during design exploration; repeated CEP→JSX polling via `evalScript` was avoided during this attempt.

**Architectural Shape Explored (at the time):**  
The implementation attempt followed a design referred to internally as **Option B**, characterized by:

- ExtendScript (host) owning a non-blocking polling loop via `app.scheduleTask`.
- The CEP panel not polling selection state directly.
- The host dispatching a CEP event upon detected selection change.
- The panel resolving the initiating action and cleaning up UI state.

This architecture was chosen during this session based on perceived stability characteristics at the time. This entry does not assert that this choice is optimal or exhaustive.

**UX Layer (Pick Veil):**  
A visual “pick veil” was introduced during this attempt to indicate that the panel was awaiting an external (timeline) interaction.

Observed behavior during this session:

- The veil appeared immediately when PickClick was armed.
- The veil was removed on explicit cancellation.
- Clicking the veil itself triggered cancellation.
- The veil was intended as a **state indicator**, not a modal input blocker.

**Implementation Attempt:**  
A multi-file implementation was produced during this session, including:

- A new CEP module (`main_PICKCLICK.js`)
- A new ExtendScript host module (`host_PICKCLICK.jsx`)
- Load-order wiring
- CSS and markup for the pick veil
- Initial integration of the *Load Expression from Selection* button
- Documentation updates reflecting the new mode

This implementation was **not merged**. At the time of writing, it was considered incomplete based on observed runtime behavior.

**State at End of Session:**

- The conceptual interaction model was not rejected during this session.
- The observed failure was treated as an **implementation- or integration-level issue under the tested conditions**.
- No code from this attempt was merged into the canonical codebase.
- This entry exists to preserve **what was attempted and observed**, not to establish correctness or final conclusions.

* * *


### 🧾 Dev Archive Addendum — PickClick Investigation, Comment Drift, and Observed Failure Modes

**Date:** 2026-01-14 (late)

#### 🧩 What was being investigated (at the time)

During this session, PickClick was being explored as a UX flow in which:

1. A panel button arms a waiting state.
2. A visual veil indicates that an external interaction is expected.
3. A user interaction in the After Effects timeline is expected to resolve the action.

Initial focus was on integrating this flow with **Load Expression from Selection**.

This description reflects the investigation scope at the time and does not imply that the flow is viable or non-viable beyond the observed conditions.

* * *

#### 🔥 Observed runtime behavior

Under the conditions tested during this session:

- The pick veil appeared when PickClick was armed.
- Clicking properties in the After Effects timeline did **not** result in PickClick resolving.
- Clicking the pick veil itself reliably cancelled PickClick.
- No other timeline interaction observed during this session caused resolution or cancellation.
- A previously existing toast associated with the same button was no longer displayed, suggesting a change in execution order or gating earlier in the chain.

These observations apply only to this session and configuration.

* * *

#### 🧠 Debug approach used

During this session, the debugging approach shifted from speculative fixes to instrumentation:

- A blocking `alert("host_PICKCLICK.jsx LOADED")` was removed.
- Non-blocking logging was added.
- Host-side trace events were dispatched to the CEP panel.
- CEP listeners were added to surface host telemetry in Chrome DevTools.

This instrumentation confirmed execution flow up to the polling stage.

* * *

#### 🧨 Observations from logging

At the time of writing, logs showed:

- The host-side polling loop was executing and rescheduling.
- Errors were repeatedly emitted during selection payload retrieval:

    - `ReferenceError: Function he_U_getSelectedProps is undefined`
- As a result, selection state could not be evaluated successfully.
- Because resolution depended on selection payload changes, PickClick remained armed indefinitely unless explicitly cancelled.

This behavior matched the observed UX state during testing.

* * *

#### 🌀 Comment drift and architectural confusion observed

During investigation, it became apparent that:

- `he_U_getSelectedProps` existed only as **commented-out code**.
- Multiple automated agents treated commented code as if it were executable.
- Function names persisted across discussion and documentation despite not existing at runtime.

Observed consequences during this session included:

- Proposals to “restore” or “fix” functions that were not part of the active architecture.
- Mismatch between assumed and actual executable systems.
- Increased difficulty distinguishing canonical behavior from historical remnants.
- `he_U_getSelectedProps` was fully deleted from the codebase. 

This entry records the **presence of comment-driven confusion**, not a generalized rule about commented code.

* * *

#### 📌 Selection system status during this session

At the time of writing:

- The active, trusted selection mechanism in the codebase was `he_GET_SelPath_Simple`.
- This system:

    - Validated active comp state
    - Read `comp.selectedProperties`
    - Enforced a single-leaf-property constraint
    - Rejected containers and unsupported selections
- PickClick did **not** successfully route through this system during this session.

No determination is made here about whether such routing is sufficient or insufficient outside the tested conditions.

* * *

2026-02-01 – Cypher Agent 💿🔗 and User
Dev Archive Append — PickClick Debugging, Patch Workflow & UI Veil (Temporal / Evidence-First / Procedural)

• **CONTEXT AT TIME OF WORK**
• The session involved iterative development, testing, and debugging of the PickClick feature in a CEP plugin for After Effects.
• Initial focus was on diagnosing polling and selection payload issues; later focus shifted to UI and CSS veil adjustments.
• A hybrid polling architecture (Class 5) was selected during the chat in place of alternatives.
• Europe/London local time at the end of this prompt was **12:21 am GMT 1 Feb 2026**. ([Time and Date][1])

• **INITIAL FAILURE STATE**
• Logs showed continuous polling messages and repeated errors referencing missing function `he_U_getSelectedProps`, indicating a broken dependency.
• Polling loop did not resolve until a valid payload was detected.
• User reported some properties (e.g., shape group transforms, effects, text properties) did not stop the pick arm.
• Veil UI covered only part of the plugin and user desired UI coverage change.

• **INVESTIGATION & REFRAMING**
• The blocking error `ReferenceError: Function he_U_getSelectedProps is undefined` was detected from host trace logs.
• Assistant reasoned hybrid polling (coarse signature + deep snapshot) might address missing selector dependency.
• A conceptual shift occurred where continuous polling was treated as a constraint rather than the core failure point; the missing selector was treated as blocking.
• Earlier alternatives (Class 1, Class 2, Class 6) were compared; Class 5 hybrid was selected over others during the session.

• **ACTIONS TAKEN**
• Assistant drafted Phase 4 patch plan for Class 5 hybrid logic and provided diff-style host and CEP patches.
• User tested and reported improved behavior: pick arm stopped correctly for some properties.
• User requested UI veil changes; assistant provided DOM and CSS modifications to cover entire plugin and add centered “PickClick armed” text.
• User tested CSS adjustments and reported veil not dark enough; assistant iterated with multiple color adjustment proposals including `color-mix()` and fallback layered overlay.

• **ATTEMPTS / TESTS**
• Diagnostic evaluation of polling and resolve logs after users applied patches.
• Testing selection of various AE properties to observe whether pick arm would stop.
• User trials of different CSS background configurations: plain RGBA dark overlays, HSL variables, `color-mix()`, and inset tint layering.
• Observations of veil brightness and blur interaction with CSS variable tints.

• **OBSERVATIONS**
• After applying host patch, signature changes and resolve events appeared in CEP logs for supported properties.
• Unsupported property types caused polling to continue.
• Veil CSS changes resulted in centered text with semi-opaque overlay, but background darkness did not match expectations.
• Proposed `color-mix()` CSS did not render visual background in the tested environment, which user verified.
• Layered base + inset tint approach resulted in some darkening but not complete dark effect desired.

• **DECISIONS & RATIONALE**
• The missing selector function was treated as the core blocking factor at the time and replaced with a new hybrid poll design.
• Hybrid polling approach was adopted as the working approach during this session over simpler or event-driven alternatives.
• Veil structural change (move outside mode panel) was adopted to cover entire plugin.
• CSS fallback using dark RGBA plus tinted overlay was recommended due to environment limitations with advanced CSS functions.

• **FAILURES / LIMITATIONS OBSERVED**
• CSS approaches that relied on unsupported or invalid declarations (`color-mix()` or HSL variants) resulted in no visible background.
• Attempts to mathematically darken theme RGB variables in pure CSS were invalid or did not produce expected visual outcome.
• Some AE properties did not stop pick arm; at the time, recognized as resulting from selection path limitations.

• **UNRESOLVED / UNKNOWN AT END OF SESSION**
• The precise CSS configuration to produce a sufficiently dark themed veil was not resolved within this chat.
• The full set of AE property types that require expression path support was not fully enumerated or addressed.
• A complete mapping of properties that pick arm should accept versus reject was not established.

• **SESSION-LEVEL INTERPRETIVE READ-BACK (NON-CANONICAL)**
• Based on the above record, the primary breakthrough during this session appeared to be shifting focus from raw polling issues to resolving the missing selector dependency, enabling hybrid polling; this change in investigative focus facilitated progress on pick arm behavior.


* * *

2026-03-01 – Property Support Expansion for "Load Path from Selection" (Pickwhip Parity)

• **CONTEXT AT TIME OF WORK**
• The goal was to expand the supported After Effects properties for the "Load Path from Selection" feature, ensuring it functions as a reliable panel-based pickwhip.
• The reference data for these mappings was derived from `EXPRESSION FRIENDLY PATH BANK.csv`.
• Previously, many properties (Audio, Camera, Light, Material, Masks, Layer Styles) resulted in "Unsupported Group" errors.

• **MEANINGFUL CODE CHANGES (jsx/Modules/host_GET.jsx)**
• **New `LAYER_STYLE_GROUP_MAP`:** Implemented a mapping for AE layer style sub-group matchNames (e.g., `dropShadow`, `innerShadow`, `bevelEmboss`, `chromeFX`, `frameFX`, etc.) to their expression dot-accessors (e.g., `.dropShadow`, `.satin`, `.stroke`, etc.).
• **Enhanced Non-Shape Group Walker:** Updated the fallback group walker to handle 5 new group types:
    - `ADBE Audio Group` → `.audio`
    - `ADBE Camera Options Group` → `.cameraOption`
    - `ADBE Light Options Group` → `.lightOption`
    - `ADBE Material Options Group` → `.materialOption`
    - `ADBE Mask Parade` + `ADBE Mask Atom` → `.mask("Mask 1")` pattern.
    - `ADBE Layer Styles` → `.layerStyle` + sub-group map lookup (previously hardcoded to "not supported yet").
• **Expanded `LEAF_ACCESSORS`:** Added ~90 new entries covering:
    - 3D Transforms: Orientation, X/Y/Z Rotation.
    - Time Remap.
    - Audio: Audio Levels.
    - Camera/Light/Material Options: All sub-properties.
    - Masks: Mask Path, Feather, Opacity, Expansion.
    - Layer Styles: All properties for Drop Shadow, Inner Shadow, Outer Glow, Inner Glow, Bevel & Emboss, Satin, Color Overlay, Gradient Overlay, and Stroke.

• **RATIONALE**
• The "Load Path from Selection" feature acts as a critical bridge for building expressions. By mapping nuanced AE identifiers (matchNames) to their correct expression accessors, the tool now provides a rational and working path for a significantly wider array of properties.
• This update resolves the "Unsupported Group" failures that previously limited the feature's utility.

• **KNOWN LIMITATIONS / UNCERTAINTIES**
• Blending options sub-group matchNames (`ADBE Blend Options Group`, `ADBE Adv Blend Group`) were implemented based on best-guess mappings due to lack of public documentation.
• If "Unsupported layer style group" errors persist for these specific properties, the toast now includes the actual matchName in the error (visible in the browser console) for future refinement.

---

## holyAPI_* Public Surface (2025-03-21)

### Summary
Added `jsx/Modules/host_AGENT_API.jsx` — a new JSX module exposing a public `holyAPI_*` surface for Holy Agent to call via the shared ExtendScript runtime. This is the implementation of the Conductor Architecture decision from Holy Agent Session 3: Holy Agent should call into the other plugins rather than reimplementing their functionality.

### What was built
Three functions added to `host_AGENT_API.jsx`, loaded last in the JSX chain (after `host.jsx`):

- **`holyAPI_getBanks()`** — Returns bank list. Takes optional `{ banksPath }` argument; defaults to ExtendScript's `Folder.userData/HolyExpressor/banks.json` when not provided.

- **`holyAPI_saveSnippet(jsonStr)`** — Saves expression to bank. Writes directly to `banks.json` using ExtendScript's File API. After successful write, dispatches `com.holy.expressor.banksUpdated` so Expressor's own UI refreshes automatically.

- **`holyAPI_applyToTarget(jsonStr)`** — Applies expression to named property on layers matched by name and/or type. Uses Expressor's layer type detection patterns (solid via `source.color`, etc.) and visibility tracking (temporarily enables disabled layers during apply). Returns self-reporting manifest `{ attempted, succeeded, failed: [{name, reason}], warnings }` plus compat fields for Holy Agent's existing handlers.

### CSEvent listener added
`main_SNIPPETS.js` now listens for `com.holy.agent.banksUpdated`. When Holy Agent writes to `banks.json` directly (fallback path when Expressor is not open), Expressor reloads from disk and re-renders its snippet UI.

### Load order
`host_AGENT_API.jsx` added to `hostModules` array in `main_DEV_INIT.js` after `host.jsx`. The file uses `@include` directives to pull in all other modules, so functions defined in `host_UTILS.jsx`, `host_APPLY.jsx`, `host_GET.jsx`, etc. are all available when the API functions execute.

### Relationship to Holy Agent
Holy Agent's `host.jsx` bridges all three `holyAgent_*` functions to `holyAPI_*` when available, falling back to its own implementations when Expressor is closed. See Holy Agent Session 4 in `SESSION_HISTORY.md`.

---

## holyAPI_* Load Fix — Silent Parse Failure (2025-03-22)

### Summary
`host_AGENT_API.jsx` was never loading into the ExtendScript engine despite the file existing on disk and `$.evalFile` returning no error. All three `holyAPI_*` functions were always `undefined` at runtime.

### Root causes (in order of discovery)

1. **Duplicate `function layerMatchesType` declaration inside `try` block** — Two copies of the function were declared with `function` keyword inside a `try` block inside `holyAPI_applyToTarget`. ES3/ExtendScript does not permit function declarations inside block statements. Removed duplicate; converted both inner functions (`layerMatchesType`, `findAndApply`) to `var` function expressions, which ARE valid inside blocks.

2. **`"null"` key unquoted in object literal (line 310)** — `debugInfo.push({ ..., null: dbgNull, ... })` used `null` as an unquoted object literal key. This is valid ES5+ but illegal in ES3/ExtendScript, which throws `SyntaxError: Illegal use of reserved word` and silently aborts the entire file parse before a single function is registered. Fixed by quoting the key: `"null": dbgNull`. **This was the true fatal error** — it survived all other fixes because it was introduced in a debug object after the duplicate function was added, and the parser never reached it while the duplicate was present.

3. **`host_FLYO.jsx` phantom reference in `main_DEV_INIT.js`** — `hostModules` array included `/jsx/Modules/host_FLYO.jsx` (pos 7, before `host_AGENT_API.jsx` at pos 9). This file does not exist on disk. Removed from load list.

4. **`host_APPLY_test.jsx` phantom `@include` in `host.jsx`** — `@include "Modules/host_APPLY_test.jsx"` referenced a non-existent file. Removed.

### Solid type detection fix
`holyAPI_applyToTarget`'s solid layer check used `layer.source.color` which is not a property on `FootageItem`. The correct path is `layer.source.mainSource.color` (a `SolidSource` object). Fixed in both the `layerMatchesType` function and the debug loop.

### How the root cause was found
`$.evalFile` was returning no error and no result. A bare `try/catch` wrapper around the `$.evalFile` call with string concatenation (avoiding `JSON.stringify` which requires the json2 polyfill) revealed: `THREW: SyntaxError: Illegal use of reserved word`. A Python byte-level scan of the file then identified the unquoted `null` key as the only ES3-illegal construct in code (as opposed to strings/comments).

### Files changed
- `jsx/Modules/host_AGENT_API.jsx` — duplicate function removed, inner functions converted to `var` expressions, `null` key quoted, solid check corrected to `mainSource.color`
- `js/main_DEV_INIT.js` — `host_FLYO.jsx` removed from `hostModules`
- `jsx/host.jsx` — `@include "Modules/host_APPLY_test.jsx"` removed

---

## Pre-ship red-list fixes — Session: code review pass (Claude Sonnet)

Full code review was conducted across `index.html`, `quickpanel.html`, `styles.css`, `quickpanel.js`, `main_SEARCH_REPLACE.js`, `main_UI.js`, and `main_SNIPPETS.js`. Five ship-blocking (red) issues were identified and fixed in the same session. Orange/yellow/blue items were documented for follow-up in the next session.

### Fix 1 — AE debug dialog firing on every panel load (`main_UI.js`)

A test block was left unconditionally inside `DOMContentLoaded`:
```javascript
const safe = encodeURIComponent("TEST_LOG");
cs.evalScript('NEW_log_showDialog("' + safe + '")', ...);
```
This called `NEW_log_showDialog` in After Effects every time the main panel opened. Block removed entirely.

### Fix 2 — `main_FLYO.js` / `host_FLYO.jsx` phantom references

`main_FLYO.js` does not exist on disk but was referenced as a `<script>` tag in both `index.html` and `quickpanel.html`, generating a silent 404 on every panel load. `host_FLYO.jsx` was also listed in the `hostModules` array in `quickpanel.js` despite not existing.

- Removed `<script defer src="js/main_FLYO.js">` from `index.html`
- Removed `<script defer src="js/main_FLYO.js">` from `quickpanel.html`
- Removed `"/jsx/modules/host_FLYO.jsx"` from the `hostModules` array in `quickpanel.js`

Note: a prior fix already removed this from `main_DEV_INIT.js`. This clears the remaining two references.

### Fix 3 — Duplicate `id="pickClickVeil"` in `index.html`

Two elements shared `id="pickClickVeil"`. `getElementById` returns the first match in document order. The first element (at the top of `#appRoot`, with `pickclick-veil-content` child and armed text) is the one targeted by `main_PICKCLICK.js` via `getVeilEl()`. The second (inside `#modePanel`, empty, no children) was a stale leftover.

Removed the empty duplicate inside `#modePanel`. The active veil at `#appRoot` level is untouched.

### Fix 4 — Missing `#matchCase` checkbox in Rewrite panel (`index.html`, `styles.css`)

`main_SEARCH_REPLACE.js` calls `getCheckboxState("#matchCase", true)` but no element with that ID existed in the HTML. The function was silently returning the default `true` on every call, hardcoding match-case on.

Added a `#matchCase` checkbox (defaulting to `checked`, matching the JS default) into `#rewriteOverlay` in the Rewrite panel, using the standard `.checkbox-Diamond` pattern. Added a `.rewrite-matchcase-label` CSS rule for colour and hover state.

### Fix 5 — `persistent-store.js` missing from `quickpanel.html`

`quickpanel.html` did not load `persistent-store.js`, but `main_STATE.js` (which is loaded) depends on `Holy.PERSIST`. State saves in the quick panel — bank selection, per-session state — were silently failing.

Added `<script src="js/persistent-store.js">` as a synchronous load in `quickpanel.html`, immediately after `json2.js` and before the deferred module chain, mirroring the load order in `index.html`.

### Files changed in this session
- `js/main_UI.js` — debug evalScript block removed
- `index.html` — `main_FLYO.js` script tag removed; empty duplicate `#pickClickVeil` removed; `#matchCase` checkbox added to `#rewriteOverlay`
- `quickpanel.html` — `main_FLYO.js` script tag removed; `persistent-store.js` script tag added
- `js/quickpanel.js` — `host_FLYO.jsx` removed from `hostModules` array
- `css/styles.css` — `.rewrite-matchcase-label` rule added

---

## Yellow + Blue list fixes — pre-ship cleanup pass

Low blast-radius CSS, HTML, and JS cleanup. No functional changes; all edits are dead-code removal, invalid-value fixes, or production-mode hardening. CSS fixes applied by Claude Sonnet via `edit_block`; HTML and JS fixes applied by external agent.

### Y1 — CSS selector case mismatch (`styles.css`)
`.customSearch-Master` renamed to `.customSearch-master` to match the `class="customSearch-master"` attribute in the HTML. CSS selectors are case-sensitive; the old name was never matching.

### Y2 — Invalid hex in `.circle-btn` (`styles.css`)
Removed the dead commented-out line `/*border: solid #8a8a8ab !important;*/`. The valid replacement line (`#8a8a8a`) was already present directly below it.

### Y3 — Invalid `max-width` on `.foreground-panel-box` (`styles.css`)
Removed `max-width: -135px;`. Negative max-width is not valid CSS and was silently ignored by the browser. The commented-out block below it already contains the intended `max-width: 480px` value for reference.

### Y4 — Duplicate CSS rules for `rewrite-label-search` / `rewrite-label-replace` (`styles.css`)
Both `.rewrite-label-search` and `.rewrite-label-replace` were each defined twice. Removed the second definition of each. The first definitions (with `top: 2px`) are kept; the second definitions (with `top: 0`) were redundant.

### Y5 — Empty skeleton elements removed (`index.html`)
Removed `<header class="hdr hide-when-editor-maximized"><h2></h2></header>` and the empty `<section class="tabs hide-when-editor-maximized">` block. Both were inert DOM nodes with no content and no JS references. `#modeViewExpress` was checked and retained — it is referenced by `main_UI.js` (`var modeViewExpress`) and by `aria-controls` on the Express tab button.

### Y6 — `SNIPPETS_PER_BANK` scoped to IIFE (`js/main_SNIPPETS.js`)
`const SNIPPETS_PER_BANK = 3` and `Holy.SNIPPETS.SNIPPETS_PER_BANK = SNIPPETS_PER_BANK` were both declared at global scope before the IIFE. Moved both inside the IIFE as its first two statements (after `"use strict"`). The `Holy.SNIPPETS.SNIPPETS_PER_BANK` public assignment is preserved inside the IIFE for cross-module reads.

### B1 — Set `HX_LOG_MODE` to silent (`js/main_UI.js`)
`window.HX_LOG_MODE = "verbose"` changed to `"silent"`. This is the global log gate consumed by all panel modules; verbose logging is a dev convenience, not appropriate for production.

### B2 — Dead commented-out HTML blocks removed (`index.html`)
Removed the following comment blocks, all confirmed to be replaced or abandoned markup:
- `<!-- #region ✂️✂️✂️ SNIPPETS … -->` opening region marker and its decorative sub-comment
- `<!-- <div id="rewriteUnderlay"> … </div> -->` (old animated underlay, replaced by CSS-only version)
- `<!-- <div id="expressMisc"> … </div> -->` (old misc footer row, replaced by current layout)
- `<!-- <div id="TargetBox"> … </div> -->` (old target output box, removed in V2)
- `<!--<button id="applyTargetBtn">-->` (single orphan line)
- Both `<!-- V2: pick UI removed -->` orphan comment lines

### B3 — Broken `xmlns` URL in expand SVG (`index.html`)
Fixed `xmlns="http://www.w3 .org/2000/svg"` → `xmlns="http://www.w3.org/2000/svg"` on the `icon-expand` SVG inside `#editorMaximizeBtn`. The space was causing the namespace to be unrecognised. The `icon-collapse` SVG directly below it was already correct.

### B4 — Dead `.btn-clearSVG #bankSelectBtn` CSS rule removed (`styles.css`)
`.btn-clearSVG #bankSelectBtn { transform: scale(10px) translateZ(0); }` targeted `#bankSelectBtn` as a *descendant* of `.btn-clearSVG`, but `#bankSelectBtn` IS the `.btn-clearSVG` element — the selector never matched. Additionally `scale(10px)` is not a valid CSS value. Entire rule block removed.

### B5 — Dead `.apply-btn` CSS class removed (`styles.css`)
`.apply-btn` was defined in CSS but the apply button in `index.html` uses `.btn-primary`. Confirmed no element in the HTML carries `class="apply-btn"`. Rule block removed.

### B6 — Redundant CSS variable `--G-color-1-mid-4` removed (`styles.css`)
`--G-color-1-mid-4` had an identical formula to `--G-color-1-mid-2`. Searched entire CSS for `var(--G-color-1-mid-4)` — zero usages found. Variable declaration removed from `:root`.

### Files changed in this session
- `css/styles.css` — Y1, Y2, Y3, Y4, B4, B5, B6
- `index.html` — Y5, B2, B3
- `js/main_UI.js` — B1
- `js/main_SNIPPETS.js` — Y6

---

## Pre-ship orange-list fixes — Session: code review pass continued (Claude Sonnet)

Continuation of the same code-review session. Four orange-priority issues were identified during the prior red-list pass and fixed here. No functional regressions expected; all changes are isolated to layout CSS, one HTML attribute, and one JS click handler.

### Fix 1 — Express overlay buttons: layout refactor (`index.html`, `styles.css`)

`#loadFromSelectionBtn` was a stray direct child of `.express-editor-overlay`, sitting outside `.express-editor-overlay-buttons`. It was positioned with `transform: translateX(6px)` rather than flowing with the flex container. The other two buttons (`#loadPathFromSelectionBtn`, `#editorClearBtn`) each also had their own independent `translateX/Y` hacks.

- Moved `#loadFromSelectionBtn` inside `.express-editor-overlay-buttons` as the first sibling, alongside `#loadPathFromSelectionBtn` and `#editorClearBtn`. All three now flow via the existing `gap: 6px` flex row — no per-element transforms needed.
- Removed `transform: translateX(6px)` from `#loadFromSelectionBtn` bespoke rule; rule now just carries `--size: 20px`.
- Removed `transform: translateX(18px)` from `#loadPathFromSelectionBtn`.
- Removed `transform: translateY(-7px)` from `#editorClearBtn.express-editor-overlay-btn`.
- Removed `height: 45px !important` from `#editorClearBtn` bespoke rule — `--size: 20px` (inherited from `.btn-clearSVG` + the overlay-btn rule) now governs height uniformly across all three buttons.
- Parent overlay `transform: translateY(39%) translateX(17px)` left untouched.

### Fix 2 — Search/Replace `#rewriteOverlay` scale + height (`styles.css`)

Three related issues in the Rewrite panel:

1. `#rewriteOverlay` had `scale(0.7)` appended to its transform, shrinking the match-case checkbox and clear button to 70% size. Removed — transform is now `translateY(52px) translateX(38.4px)` only.

2. `#modeViewRewrite` had `height: 97px` — a fixed height that clipped content if the CodeMirror editors grew. Changed to `min-height: 97px` so the panel can expand.

3. `#rewriteSearchWrapper > label.block-label` and `#rewriteReplaceWrapper > label.block-label` were visually hidden via `clip-path: inset(50%)` but the rule also carried a `background` colour and `transform: translate(6px, 14px)` — neither belonging on a screen-reader-only element. Cleaned both properties out and added the missing `white-space: nowrap` so the rule now matches the global `.sr-only` definition exactly.

### Fix 3 — `#quickPanelRoot` missing from `quickpanel.html`

`quickpanel.js` calls `document.getElementById("quickPanelRoot")` in both `forcePanelRepaint()` and `verifyPanelContainerVisibility()`. The ID did not exist in `quickpanel.html` — both functions were silently getting `null` and bailing out early on every call.

Added `id="quickPanelRoot"` to the `<body>` element in `quickpanel.html`.

### Fix 4 — Double `requestOpenExtension` in `quickAccessLaunchBtn` handler (`main_UI.js`)

The `quickAccessLaunchBtn` click handler called `cs.requestOpenExtension("com.holy.expressor.quickpanel")` twice: once immediately via `ensureHostReady`, and again inside an 800 ms `setTimeout` (also via `ensureHostReady`). The comment called it a "Warm-Wake Fix" but a second open-request after 800 ms is more likely to cause a panel flicker or double-init than to help warm-up. Removed the `setTimeout` block entirely. The single guarded call remains.

### Files changed in this session
- `index.html` — `#loadFromSelectionBtn` moved inside `.express-editor-overlay-buttons`; DOM indentation normalised
- `css/styles.css` — per-element translate hacks removed from `#loadFromSelectionBtn`, `#loadPathFromSelectionBtn`, `#editorClearBtn.express-editor-overlay-btn`; `height: 45px !important` removed from `#editorClearBtn`; `scale(0.7)` removed from `#rewriteOverlay` transform; `#modeViewRewrite` changed to `min-height: 97px`; block-label rule stripped to proper `.sr-only` shape
- `quickpanel.html` — `id="quickPanelRoot"` added to `<body>`
- `js/main_UI.js` — 800 ms `setTimeout` duplicate `requestOpenExtension` block removed

---

## Session — 2026-04-08 — Rewrite Search/Replace Box Height Fix

### Problem
The Search and Replace CodeMirror editors in the Rewrite panel were too tall by default — appearing as large boxes even with only one line of content. Expected: single-line height (~22–28px). Actual: 50px minimum enforced by global CSS.

### Root Cause (confirmed via live CDP inspection)
`codemirror_styles.css` contains two globally-scoped `!important` rules that force every CodeMirror instance to a 50px minimum:
```css
html.theme-default .cm-editor { min-height: 50px !important; }
html.theme-default .cm-editor .cm-content,
html.theme-default .cm-editor .cm-gutter { min-height: 50px !important; }
```
Attempts to override with `.rewrite-codemirror .cm-editor { min-height: 22px !important }` failed because — between two `!important` declarations — the **higher specificity wins**:
- Our class selector: `.rewrite-codemirror .cm-editor .cm-content` → **[0, 3, 0]**
- Global rule: `html.theme-default .cm-editor .cm-content` → **[0, 3, 1]** (the `html` element selector adds 1 point)

The global rule won by a single specificity point, despite our `!important`.

### Debugging Method
Used the Claude in Chrome extension to open a raw CDP WebSocket to `ws://localhost:6904/devtools/page/<ID>` and evaluated `getComputedStyle()` + `document.styleSheets` directly inside the live panel. This confirmed: (a) our updated CSS was loading correctly from the symlinked extension folder, and (b) the computed `min-height` was still `50px` — proving a specificity loss, not a caching issue.

### Fix
Changed the override selectors in `css/styles.css` to use the `#modeViewRewrite` **ID selector** (specificity [1, 0, 0]), which trivially beats any class/element combination:
```css
#modeViewRewrite .cm-editor {
  min-height: 22px !important;
}
#modeViewRewrite .cm-editor .cm-content,
#modeViewRewrite .cm-editor .cm-gutter {
  min-height: 22px !important;
}
```
After a cache-bypassing CDP reload, computed `min-height` confirmed as `22px` on both editors. Rendered height is ~26–28px (one line of text at 12px/1.55 line-height). Dynamic growth on multi-line input preserved via `max-height: 80px` on `.cm-scroller`.

### Files changed
- `css/styles.css` — replaced `.rewrite-codemirror .cm-editor !important` overrides with `#modeViewRewrite .cm-editor` ID-scoped rules

---

## Session — 2026-04-08 — Rewrite Panel: gradient decoration fixes + scrollbar styling

### Problems addressed

Three visual issues in the Rewrite tab's Search/Replace area, identified via live CDP screenshot and DOM inspection.

---

### Issue 1 — Horizontal stripe through the Replace field

#### Symptom
A visible horizontal bar ran across the lower portion of the `#replaceField` CodeMirror editor. The gutter line number "1" also appeared pushed upward compared to the Search field above it.

#### Root Cause (confirmed via CDP)
Two separate causes stacked:

1. `.rewrite-gradient-up { bottom: 11px; height: 14px; }` — This absolutely-positioned element was supposed to sit in the 20px padding area above `#replaceField`, but `bottom: 11px` within a 49px wrapper placed it at `top: 24px` — 4px *inside* the field's top edge (field starts at `top: 20px`). The purple gradient (`transparent → accent`, `opacity: 0.5`) painted a coloured band over the top portion of the editor, and its presence in that region shifted the apparent position of the line-number gutter.

2. `#rewriteReplaceWrapper .rewrite-gradient-down { top: auto; bottom: 0; }` — A second gradient element was anchored to the bottom of the wrapper, overlapping the bottom 11px of `#replaceField`. This was the primary visible stripe: the gradient's opaque end (`rgba(accent, 0.32)` at `opacity: 0.5`) created a noticeably purple-tinted band at the field's base. Confirmed by hiding the element via CDP and observing the stripe disappear entirely.

The equivalent `.rewrite-gradient-down` in `#rewriteSearchWrapper` uses the default `top: 0` rule, placing it in the padding area *above* the Search field — no overlap, no stripe. Only the replace wrapper had the `bottom: 0` override.

#### Fix
- Removed `#rewriteReplaceWrapper .rewrite-gradient-down { top: auto; bottom: 0; }` CSS override.
- Removed the `<div class="rewrite-gradient-down">` element from inside `#rewriteReplaceWrapper` in `index.html`.
- Changed `.rewrite-gradient-up` from `bottom: 11px` → `top: 6px` (initial fix, places gradient fully within the 20px padding gap above the field, ending flush with the field's top edge).

---

### Issue 2 — `.rewrite-gradient-up` invisible after being moved to `bottom: 0`

#### Symptom
After the user confirmed they liked the gradient decorations and requested the lower one (`.rewrite-gradient-up`) be repositioned to the very bottom of the replace container, it was repositioned to `bottom: 0` but rendered invisible.

#### Root Cause
The element appeared before `#replaceField` in the DOM. In CSS painting order, `position: absolute` children with no `z-index` (auto) *do* paint above static siblings — but `#rewriteReplaceWrapper` has `z-index: 1` (creating a stacking context), and CodeMirror's internal elements (`cm-layer`, etc.) establish sub-contexts that effectively buried the gradient. Moving the element earlier in source order than the field made the paint ordering ambiguous in CEP's Chromium build.

#### Fix
- Moved `<div class="rewrite-gradient-up">` to *after* `#replaceField` in `index.html`, so it is always painted last within the wrapper.
- Added `z-index: 2` to `.rewrite-gradient-up` in `styles.css` to guarantee it sits above the CM editor's internal stacking contexts.

---

### Issue 3 — Scrollbar on rewrite CodeMirror fields was white/grey (Windows default)

#### Symptom
When the Replace field's content exceeded `max-height: 80px`, a vertical scrollbar appeared using the OS default style — bright white track and grey thumb, clashing with the dark panel aesthetic.

#### Root Cause
Custom `-webkit-scrollbar` rules existed for `#codeEditor .cm-scroller` (the Express tab editor) but were never extended to `.rewrite-codemirror .cm-scroller` (the Rewrite tab fields).

#### Fix
Added matching scrollbar rules scoped to `.rewrite-codemirror .cm-scroller`:
- Width/height: 4px (slimmer than the 6px Express editor bar, appropriate for the smaller fields)
- Track: transparent
- Thumb: `rgba(accent, 0.35)`, 3px border-radius
- Thumb hover: `rgba(accent, 0.55)`

---

### Debugging method
All root causes confirmed via raw CDP WebSocket (`ws://localhost:6904/devtools/page/<ID>`) using Node.js native `WebSocket`. Key techniques used: `Page.captureScreenshot` for visual state, `Runtime.evaluate` for computed style queries (`getComputedStyle`, `getBoundingClientRect`, `elementFromPoint`), and live DOM mutation (`element.style.display = 'none'`) to isolate the stripe source before committing the fix.

### Files changed
- `css/styles.css` — removed `#rewriteReplaceWrapper .rewrite-gradient-down` override; changed `.rewrite-gradient-up` from `bottom: 11px` → ultimately `bottom: 0` + `z-index: 2`; added `.rewrite-codemirror .cm-scroller` scrollbar rules
- `index.html` — removed `<div class="rewrite-gradient-down">` from `#rewriteReplaceWrapper`; moved `<div class="rewrite-gradient-up">` to after `#replaceField`

---

## Session — 2026-04-08 — Rewrite Panel: gradient placement + replace wrapper bottom-anchoring

### Changes

**Gradient containers moved to `#modeViewRewrite` root**
Both `.rewrite-gradient-down` and `.rewrite-gradient-up` were living inside `#rewriteSearchWrapper` and `#rewriteReplaceWrapper` respectively. Moved both to be direct children of `#modeViewRewrite`. Since both gradients are `position: absolute`, they anchor to the container's edges regardless of DOM order — naming is intentionally inverted: `gradient-down` sits at the top (fades downward from top edge), `gradient-up` sits at the bottom (fades upward from bottom edge).

**`#rewriteReplaceWrapper` bottom-anchored**
Added `margin-top: auto` to `#rewriteReplaceWrapper`. `#modeViewRewrite` is a flex column that fills available panel height — `margin-top: auto` consumes all free space above the replace wrapper, pinning it to the bottom. As the replace CodeMirror grows (more lines), the wrapper expands upward. The `.rewrite-label-replace` span is `position: absolute; top: 2px` within the wrapper, so it rides up naturally with the wrapper's top edge. Both wrappers now grow toward the center: search field expands downward, replace field expands upward.

### Files changed
- `index.html` — moved gradient divs to `#modeViewRewrite` root
- `css/styles.css` — added `margin-top: auto` to `#rewriteReplaceWrapper`

---

## Session — 2026-04-08 — Controls UX Upgrade: Snippet Manager + Has-Controls Indicator

**Plan reference:** `AGENTS/PLAN_controls_ux_upgrade.md`
**Session outcome:** All 6 implementation steps completed. Session crashed after work was done; no data loss confirmed.

### Overview

Implemented three deliverables to make the Controls system visible, discoverable, and manageable. All changes were surgical and contained to the three files specified in the plan.

---

### Deliverable 1 — Controls toggle group + Manager launch button (`index.html`)

Wrapped the existing `#snipLoadControls` checkbox label inside a new `.controls-toggle-group` flex div, and added a new `#openSnippetManager` button alongside it. The button renders a three-line sliders SVG icon (three horizontal rules each with a filled circle at a different x-position), visually signalling "adjustable parameters / controls."

**Files changed:** `index.html`

---

### Deliverable 2 — Has-Controls indicator bar (`css/styles.css`, `js/main_SNIPPETS.js`)

**CSS:** Added `.snippet-btn::after` pseudo-element — a 2px bottom bar, `opacity: 0` by default, that becomes `opacity: 1` when `.has-controls` is present. Colour: `--G-color-1-midlight`. Edge-radius rules applied to first/last child buttons for visual continuity with the container corners.

**JS:** In `renderSnippets()`, immediately after `btn.dataset.id = snippetId`, added a 3-line guard that checks `snippet.controls && Array.isArray(snippet.controls.effects) && snippet.controls.effects.length > 0` and applies `btn.classList.add("has-controls")`. This piggybacks on all existing render paths (`cy_setActiveBank`, `cy_loadBanksFromDisk`, `banksUpdated` CSEvent listener) with zero additional wiring.

**Files changed:** `css/styles.css`, `js/main_SNIPPETS.js`

---

### Deliverable 3 — Snippet Manager overlay (`js/main_SNIPPETS.js`, `css/styles.css`)

**Three new functions added to `main_SNIPPETS.js`:**

- `cy_openSnippetManager()` — Creates a foreground panel via the existing `Holy.UTILS.cy_createForegroundPanel` factory. Renders a bank dropdown (seeded from `Holy.SNIPPETS.activeBankId`), a scrollable snippet row container, and Save/Cancel footer buttons. Changing the bank dropdown re-renders rows for that bank without switching `activeBankId`. Save calls `smCommitChanges`, `cy_saveBanksToDisk`, `renderSnippets`, then removes the panel.

- `smBuildSnippetRow(snip, index)` — Builds a `.sm-snippet-row` div for one snippet, containing: name input, expression textarea, and a controls section. If the snippet has no saved effects, shows "No controls saved" in italic. If effects exist, renders each effect with its name and a row per property — value input (number or text based on type) plus an optional expression input if `prop.expression` is set.

- `smCommitChanges(panel)` — Reads the current bank from the dropdown, then walks all `.sm-snippet-row` elements to write name, expr, and property values/expressions back into the in-memory bank data.

**DOMContentLoaded wiring:** `#openSnippetManager` click listener added alongside `bankBinder()` / `renderBankHeader()`, guarded with `dataset.cyBound`.

**Export:** `Holy.SNIPPETS.cy_openSnippetManager = cy_openSnippetManager` added to the module export block.

**CSS:** Full `.sm-*` rule set added — `.sm-bank-row`, `.sm-bank-select`, `.sm-snippet-row`, `.sm-section-label`, `.sm-no-controls`, `.sm-effect-entry`, `.sm-effect-name`, `.sm-prop-row`, `.sm-prop-name`, `.sm-prop-value`, `.sm-prop-expr-label`, `.sm-prop-expr`, `.sm-manager-footer`. All styled using existing design system tokens (`--bg-input`, `--border-subtle`, `--G-color-1-midlight`, `--radius-sm`, etc.).

Also added `.controls-toggle-group` and `.controls-manager-btn` / `.controls-manager-btn:hover` rules.

**Files changed:** `js/main_SNIPPETS.js`, `css/styles.css`

---

### Notes

- `#openSnippetManager` intentionally absent from `quickpanel.html` — consistent with `snipLoadControls` not being present there either.
- `.snippet-btn` has `overflow: hidden`; the `::after` bar renders flush to the button's bottom edge. No `overflow: visible` override was needed as the bar sits within the button's bounds.
- `checkbox-layercontrols` retains its pre-existing `margin-left: auto !important` rule, which slightly right-aligns it within `.controls-toggle-group`. This is a cosmetic carry-over from before the plan and does not affect functionality.

---

## Session — 2026-04-08 — Snippet Manager UX Polish: Tabs, Auto-resize Textarea, Panel Scroll

**Scope:** `js/main_SNIPPETS.js`, `css/styles.css`

### Overview

Three UX issues fixed on the Snippet Manager overlay: the panel cropped off-screen with no scroll, the three snippet forms were stacked vertically making the view very tall, and the expression textarea was a fixed height rather than fitting its content.

---

### Change 1 — Foreground panel scroll (`css/styles.css`)

`.foreground-panel-box` gained `max-height: calc(100vh - 40px); overflow: hidden`. `.foreground-panel-content` gained `overflow-y: auto; flex: 1 1 auto; min-height: 0` (required for a flex-column parent to allow a child to shrink and scroll). Custom webkit scrollbar applied to `.foreground-panel-content` — 4px wide, transparent track, accent-color thumb at 35% opacity (matches the rewrite CodeMirror scrollbar pattern already in the file).

---

### Change 2 — Snippet tabs (`js/main_SNIPPETS.js`, `css/styles.css`)

Replaced the flat vertically-stacked snippet rows with a tab bar. `cy_openSnippetManager` HTML now includes `<div class="sm-tab-bar" id="smTabBar">` above `#smSnippetRows`. `smRenderRows` was rewritten: all three `.sm-snippet-row` elements are still built and appended to the DOM (so `smCommitChanges` can walk all of them on save), but rows 2 and 3 are hidden with `display: none`. Tab buttons (`1`, `2`, `3`) are generated dynamically per snippet. Tab click handler removes/adds `.active` class and toggles row visibility. The redundant "Snippet N" label that appeared inside each row was removed — the tab number already communicates that.

**CSS:** Added `.sm-tab-bar` (flex row, 4px gap), `.sm-tab` (flex:1, border, accent-system colours), `.sm-tab:hover`, `.sm-tab.active` (filled with `--G-color-1`, label inverted to `--G-color-1-deepdark-bg`, bold).

---

### Change 3 — Auto-resize expression textarea (`js/main_SNIPPETS.js`, `css/styles.css`)

Added `smAutoResize(el)` helper (defined once, above `cy_openSnippetManager`): sets `height: auto`, measures `scrollHeight`, clamps to `5 lines × 18px + 12px padding`, writes the result back as an explicit `height`, and sets `overflowY` to `hidden` (fits) or `auto` (exceeds cap). `smRenderRows` calls `smAutoResize` on each textarea after appending to DOM, and binds an `input` listener for live resize.

**Bug discovered and fixed in same session:** Hidden rows have `scrollHeight = 0` when `smRenderRows` runs, so auto-resize was a no-op for tabs 2 and 3. Fixed by calling `smAutoResize` inside the tab click handler immediately after the row is made visible.

**CSS override:** `.sm-snip-expr.snippet-editor-textarea` overrides the shared `.snippet-editor-textarea` rule — resets `height: auto`, `resize: none`, `overflow-y: hidden`, `min-height: 20px`, `line-height: 18px`. Custom webkit scrollbar matching the panel scrollbar style.

---

### Notes

- `smCommitChanges` was not modified — it uses `querySelectorAll(".sm-snippet-row")` which finds all rows regardless of visibility, so tab-based hiding is transparent to the save path.
- The foreground panel scroll fix applies globally to all foreground panels (snippet editor, snippet manager), not just the manager. No regressions expected since the only other panel (the single-snippet editor) is short enough to never hit the cap.

---

## Session — 2026-04-08 — Snippet Manager: Effect/Prop inline layout + panel padding

**Scope:** `js/main_SNIPPETS.js`, `css/styles.css`

### Overview

Three small polish fixes to the Snippet Manager's effect controls display.

---

### Change 1 — `.foreground-panel-content` padding (`css/styles.css`)

Added `padding: 3px` to `.foreground-panel-content`. Previously no padding, content sat flush against the container edge.

---

### Change 2 — Effect name inline with prop rows (`js/main_SNIPPETS.js`, `css/styles.css`)

Previously, `.sm-effect-name` was a block `div` stacked above all `.sm-prop-row` elements, causing the effect name and prop name to read vertically. Changed to an inline side-by-side layout:

**JS:** A `sm-props-container` div now wraps all `.sm-prop-row` elements before appending to `fxEl`. Previously prop rows were appended directly to `fxEl`.

**CSS:** `.sm-effect-entry` gains `display: flex; flex-direction: row; align-items: flex-start; gap: 6px` — effect name anchors left, prop rows stack in the right column. `.sm-effect-name` loses `margin-bottom: 3px`, gains `flex-shrink: 0`. New `.sm-props-container` rule added (`display: flex; flex-direction: column; flex: 1`).

---

### Change 3 — `.sm-effect-name` color bump (`css/styles.css`)

Color changed from `--G-color-1-midlight` (0.3 lightness) to `--G-color-1-light` (0.8 lightness) so the effect name reads as the brighter label in the row pair.

---

### Notes

- `.sm-prop-name` and `.sm-prop-value` layout inside `.sm-prop-row` unchanged — flex row with gap, as before.
- No changes to `smCommitChanges` — it reads by class name and is unaffected by the container wrapper.

---

## Session — 2026-04-08 — Express Editor Overlay: flatten button layout

### Overview

The `.express-editor-overlay` button group had a fragile layout: the checkbox (`#useAbsoluteComp`) was a flex sibling of `.express-editor-overlay-buttons` and used a hardcoded `translateX(31.5px) translateY(4px)` to visually jump past the buttons. This broke whenever button sizes changed.

### Changes

**`index.html`**
- Removed `.express-editor-overlay-checkbox` as a top-level sibling of `.express-editor-overlay-buttons`.
- Moved it inside `.express-editor-overlay-buttons` as the last child, making it a natural flex item after the three buttons.

**`css/styles.css`**
- Removed `transform: translateX(31.5px) translateY(4px) translateZ(0)`, `position: relative`, and `z-index: 10` from `.express-editor-overlay-checkbox`.
- Replaced with `display: flex; align-items: center;` — no positioning hacks needed since it's now a real flex sibling.
- Parent overlay `transform: translateY(39%) translateX(17px)` on `.express-editor-overlay` left unchanged.

### Files changed

- `index.html`
- `css/styles.css`

---

## Session — 2026-04-10 — Snippet bar icons + Snippet Manager tab UI redesign

### Overview

Two areas of work in this session:

**1. Snippet bar icon overhaul (`index.html`, `css/styles.css`)**

Replaced the snippet manager's old 3-line slider icon with the new `assets/buttons/snippets-mgr.svg` (three diagonal lines, `stroke-width="4"` preserved). Added the new `assets/buttons/Controls_Icon.svg` as a non-interactive visual indicator next to the "Load controls with snippet" checkbox. The controls icon's ellipse uses `fill="currentColor"` (no stroke); all other paths use strokes only. A thin vertical divider (`controls-icon-divider`) separates the controls icon from the snippet manager button.

Layout order in `.controls-toggle-group`: checkbox → controls icon → divider → snippet manager button.

New CSS classes: `.controls-indicator-icon` (18×10px, `--text-faint`), `.controls-icon-divider` (1px wide, 12px tall, `--border-subtle`).

**2. Snippet Manager tab UI — "connected tabs" redesign (CSS + JS) — IN PROGRESS / BROKEN**

Goal: make the active tab and the content area below it appear as one unified shape with a continuous accent-color (`--G-color-1`) border. The inactive tabs should have subtle borders and sit visually separate.

Design variables added:
- `--bg-surface: #1c1d22` — content area + active tab background
- `--bg-surface-sub: #151516` — inactive tab background

Color changes inside the snippet manager:
- `.sm-snippet-row` background: `--G-color-1-lowsatdark-bg` → `--bg-surface`
- Inner inputs (`.sm-snippet-row .snippet-editor-input`, `.snippet-editor-textarea`, `.sm-prop-value`, `.sm-prop-expr`, `.sm-bank-select`): `--bg-input` / `#1e1e1e` → `--bg-panel` (lighter but still subtly darker than parent)
- Inner input borders: `--border-subtle` → `--border-accent` (`rgba(accent, 0.28)`)
- Outer borders (tabs, snippet row): `--G-color-1` (pure accent)

### Current CSS architecture for the connected tab effect

The approach uses z-index stacking so the tab bar paints above the content:

```
.sm-tab-bar    → position: relative; z-index: 2
#smSnippetRows → position: relative; z-index: 1
```

All tabs have `margin-bottom: -1px` to overlap the content's top border by 1px.

- **Inactive tabs**: `border-bottom: 1px solid var(--G-color-1)` — their purple bottom border replaces the content's top border that the tab bar's z-index covers. The line stays continuous.
- **Active tab**: `border-bottom: 1px solid var(--bg-surface)` — erases the purple line beneath it, creating a seamless join with the content area (same background color).
- **Content row** (`.sm-snippet-row`): `border: 1px solid var(--G-color-1)` on all four sides. Top corners are dynamically rounded via inline JS based on active tab position.

Edge rounding via CSS:
- `.sm-tab.active:first-child` → `border-top-left-radius: var(--radius-md)`
- `.sm-tab.active:last-child` → `border-top-right-radius: var(--radius-md)`

Content top-corner rounding via JS (`smUpdateActivePos` in `main_SNIPPETS.js`):
- Tab 1 (first): content `borderTopLeftRadius: 0`, `borderTopRightRadius: 6px`
- Tab 2 (middle): both `6px`
- Tab 3 (last): `borderTopLeftRadius: 6px`, `borderTopRightRadius: 0`

### What's broken

**Tab 1 works correctly.** The unified shape renders as intended — continuous purple border around active tab + content, rounded corners at the right places.

**Tabs 2 and 3 do not render correctly.** The content area's top corners remain square (no rounding visible), and the border continuity between the active tab and content appears broken. Earlier attempts to fix this included:

1. CSS data-attribute selectors (`[data-active-pos="middle"]`) — did not take effect for tabs 2/3 despite working for tab 1. Cause unknown; possibly a CEP Chromium CSS specificity or selector matching issue.
2. Switched to inline JS styles (`row.style.borderTopLeftRadius = ...`) — same result. Tab 1 renders correctly, tabs 2/3 do not show the rounding.
3. Added explicit stacking context (`z-index: 2` on tab bar, `z-index: 1` on content) — initially hid the content's top border entirely because inactive tabs (with `border-bottom: none`) covered it. Fixed by giving inactive tabs a purple bottom border.

### Root cause diagnosed (2026-04-10)

**The inline styles ARE being applied.** Confirmed via CDP `Runtime.evaluate` — all three `.sm-snippet-row` elements have correct computed `borderTopLeftRadius` and `borderTopRightRadius` values (6px) after clicking tab 2. The JS function works correctly.

**The real issue is that the content's top corners are invisible.** The tab bar (z-index 2) paints entirely over `#smSnippetRows` (z-index 1) in the overlap zone. The tabs use `flex: 1` and fill the full tab bar width, so they completely cover the content's top edge and top corners. The 6px border-radius IS computed, but it's painted behind the tab bar's opaque backgrounds — the user never sees it.

**The visible break is border color discontinuity at the edges.** When tab 1 is active, its purple left border (`--G-color-1`) aligns flush with the content's purple left border — continuous outline. When tab 2 or 3 is active, the edge tabs (1 and/or 3) have `border: 1px solid var(--border-subtle)` (faint, ~7% white) on their left/right/top sides. The content's purple side borders terminate where they meet the edge tabs' faint borders, creating a visible color break in the outline. Tab 1 "works" only because the active tab's own purple borders happen to be at the outer edge.

**Why tab 1 appeared to work for corner rounding:** The base CSS `.sm-snippet-row { border-radius: 0 0 var(--radius-md) var(--radius-md) }` sets top corners to 0. For tab 1, `smUpdateActivePos` sets TL=0 (matching the default) and TR=6px (overriding). But the TR=6px is behind tab 3 and invisible. So tab 1 "looked correct" by coincidence — the default square corners happened to be fine because the rounded corners were always hidden.

### Fix attempted (2026-04-10, not yet verified in live panel)

Changes made to repo files but not confirmed visually (CEP panel may need manual reload via DevTools or AE restart to pick up changes from this repo path):

1. **CSS** (`styles.css`): Changed inactive tab borders from `var(--border-subtle)` to `var(--G-color-1)` on all sides — all tabs now form part of the unified purple outline. Added `margin-left: -1px` on `.sm-tab` for clean border collapse via overlap (later tab covers earlier tab's right border). Removed `.sm-tab + .sm-tab { border-left: none }` and `.sm-tab + .sm-tab.active { border-left: restore }` rules — no longer needed with the overlap approach.

2. **JS** (`main_SNIPPETS.js`): Removed `smUpdateActivePos()` function and both call sites. The function set content top-corner radii that were always hidden behind the tab bar, so it had zero visual effect.

**To verify:** Reload the CEP panel (AE → Debug menu, or close/reopen AE) and open the Snippet Manager. All three tabs should show a continuous purple outline with the active tab seamlessly joined to the content area.

### Files changed

- `index.html` — icon SVGs in `.controls-toggle-group`
- `css/styles.css` — new vars (`--bg-surface`, `--bg-surface-sub`), icon styles, tab/snippet-row overhaul
- `js/main_SNIPPETS.js` — `smUpdateActivePos()` function, `smRenderRows()` updated

---

### Snippet Manager tabs — wrapper pattern rewrite (2026-04-10)

**Starting point:** Previous session's CSS fix (border-color unification + margin overlap + z-index stacking) was confirmed loaded in the live panel via CDP `Runtime.evaluate` inspection of `document.styleSheets`. Computed styles on the actual DOM elements matched the file on disk exactly. The fix was live — it just didn't produce a visible improvement. The "three bordered boxes above a content box" appearance persisted because every tab (active and inactive) had identical full purple borders on all four sides.

**Research phase:** Investigated lightweight tab frameworks suitable for CEP panels (Chromium 57–88, no bundler). Evaluated five approaches: pure CSS radio `:checked` trick, `:target` selector, Tabby.js (~1KB), CSS-Tricks "round out borders" technique, and `details`/`summary` + CSS Grid (rejected — requires Chrome 130+). Key finding: the canonical "connected tab" pattern relies on a shelf line + active tab erasing it, not on giving every tab identical borders.

**Iteration 1 — Z-index fix (no visual change):** Removed `z-index: 2` from `.sm-tab-bar` (which was trapping tabs in a stacking context), gave tabs `z-index: 1`, active tab `z-index: 2`, content `z-index: 0`. CSS was confirmed live via CDP but looked identical — the z-index fix was technically correct but the visual problem was the design pattern, not the stacking order.

**Iteration 2 — Shelf-line pattern:** Gave `.sm-tab-bar` a `border-bottom: 1px solid var(--G-color-1)` as the "shelf line." Made inactive tabs transparent (no borders, no background — just text labels). Active tab erased the shelf via `margin-bottom: -1px` + `border-bottom-color: var(--bg-surface)`. Removed content's top border (`border-top: none` on `.sm-snippet-row`). Dramatic improvement — inactive tabs became clean labels, active tab connected to content. But: sharp 90° corners where the shelf met the content's side borders, and no rounded edges.

**Iteration 3 — Wrapper pattern:** Fundamental redesign. Wrapped `.sm-tab-bar` + `#smSnippetRows` in a new `.sm-tabs-container` div (required JS change to `cy_openSnippetManager()`). The wrapper gets `border: 1px solid var(--G-color-1); border-radius: var(--radius-md); overflow: hidden`. Tabs and content lose their own external borders — the wrapper provides the entire outer border with rounded corners. Tab bar gets an internal `border-bottom` divider. Active tab erases the divider under itself via `margin-bottom: -1px` + `z-index: 1` + `background: var(--bg-surface)`.

**Iteration 4 — Margin collapse bug fix:** Tabs 2 and 3 showed a dark gap between the tab area and content. Root cause: `.sm-snippet-row + .sm-snippet-row { margin-top: 6px }` applied to hidden (`display: none`) rows via CSS adjacent sibling combinator (which matches DOM order, not visual order). The third row always matched the rule and got `margin-top: 6px`, which collapsed through the parent `#smSnippetRows` (no padding or border to block it), creating a 6px dark gap above the content. Fix: `overflow: hidden` on `#smSnippetRows` (creates BFC, prevents collapse) + `background: var(--bg-surface)` (fills any residual gap) + explicit `margin-top: 0` override on `#smSnippetRows .sm-snippet-row`.

**Iteration 5 — Active tab inner edge borders + rounding (final):** User identified that the active tab's inner edges (the sides facing other tabs, not the wrapper edge) had no purple border and no rounding. Fix: all tabs get `border-left: 1px solid transparent; border-right: 1px solid transparent` (reserves layout space so tab widths don't shift on activation). Active tab sets `border-left-color` and `border-right-color` to `var(--G-color-1)`, plus `border-radius: var(--radius-sm) var(--radius-sm) 0 0` for rounded inner top corners. Edge tabs (`:first-child` / `:last-child`) keep their wrapper-adjacent border transparent and flatten that corner's radius to 0, since the wrapper's own border and radius handle the outer edge.

**CDP iteration workflow:** All visual verification was done programmatically — `Page.reload({ ignoreCache: true })`, `Runtime.evaluate` to click `#openSnippetManager` and switch tabs, `Page.captureScreenshot` for each tab state, then `Read` the PNG to inspect. This allowed rapid edit → reload → screenshot → verify cycles without requiring the user to manually reload AE.

### Files changed

- `css/styles.css` — new `.sm-tabs-container` wrapper rule; `.sm-tab-bar` simplified to internal divider only; `.sm-tab` rewritten (transparent borders, no radius by default, transition); `.sm-tab.active` uses border-color activation + radius + z-index; edge-tab overrides for `:first-child` / `:last-child`; `.sm-snippet-row` stripped of border/radius (wrapper handles it); `#smSnippetRows` gets BFC + bg-surface fill + margin override
- `js/main_SNIPPETS.js` — `cy_openSnippetManager()` innerHTML updated to wrap `#smTabBar` + `#smSnippetRows` in `<div class="sm-tabs-container">`
