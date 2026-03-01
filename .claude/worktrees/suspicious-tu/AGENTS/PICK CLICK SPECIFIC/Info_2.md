-----PART 1------
"Below is a **PHASE-2 EXTRACTION** focused strictly on **METHODOLOGY**.
Source of truth: the attached archival fragment .
Where mechanics are not explicitly documented, they are marked accordingly.

---

## 🔧 ISSUE: APPLY FAILURES ON GROUPED PROPERTIES (e.g. SHAPE LAYERS)

### Problem Trigger

* Selecting Shape Layer groups or grouped properties produced **“Select a property”** errors during Apply.
* Common reproduction involved **Stroke Width** inside Shape Layer contents.

### Initial Hypothesis

* Selected items were **groups**, not leaf properties that support expressions.
* `selectedProperties` sometimes returns container groups even when clicking a child stopwatch.

### Experiments / Attempts

* Checked `canSetExpression` directly on selected items.
* Logged `propertyType`, `matchName`, and child properties during Apply.
* Attempted flat iteration over selection without recursion.

### Failure Modes Observed

* Groups rejected as non-animatable.
* Valid child properties never reached.
* Apply aborted early with generic messaging.

### Constraint(s) Identified

* AE selection API does not guarantee leaf-level selection.
* Shape hierarchies require traversal to locate animatable properties.

### Final Mechanism Implemented

* **Recursive descent** into selected groups to locate the **first animatable child**.
* Implemented in a **Type Peeker** function that scans children until a supported value type is found.
* Apply logic updated to accept group selection as an entry point.

### Known Side Effects

* Initial recursion applied expressions to **all children** in a group (over-application).

### Explicitly Unresolved Aspects

* Depth control was coarse initially.
* Reliance on display names during traversal remained.

---

## 🔧 ISSUE: BLUE APPLY OVER-APPLICATION (RECURSION TOO BROAD)

### Problem Trigger

* After enabling recursion, Apply affected **every animatable property** within a group.

### Initial Hypothesis

* Recursion lacked scoping to the **explicitly selected** group context.

### Experiments / Attempts

* Logged recursion entry points.
* Compared behavior when selecting leaf vs group.
* Tested limiting recursion flags.

### Failure Modes Observed

* Expressions applied far beyond intended targets.
* User could not predict affected properties.

### Constraint(s) Identified

* Need to respect **selection intent**, not entire subtree.

### Final Mechanism Implemented

* Recursion gated to **only descend into explicitly selected groups**.
* Leaf properties outside that scope ignored.
* Blue Apply restricted to selected items or their immediate valid children.

### Known Side Effects

* Some deeply nested properties may still be unreachable without direct selection.

### Explicitly Unresolved Aspects

* No user control over recursion depth beyond this guard.

---

## 🔧 ISSUE: TARGET LIST FLOODING (SUMMARIZER RECURSION)

### Problem Trigger

* Using **Target Selected** caused Target list to populate with **dozens of properties** when groups were selected.

### Initial Hypothesis

* Summarizer recursion mirrored Apply recursion too aggressively.

### Experiments / Attempts

* Disabled recursion entirely.
* Compared recursive vs non-recursive `getSelectionSummary`.
* Logged counts of collected properties.

### Failure Modes Observed

* Recursive mode flooded Target list.
* Non-recursive mode **missed properties** like Stroke Width.

### Constraint(s) Identified

* Need to capture **direct children** without walking entire subtree.

### Final Mechanism Implemented

* **No final mechanism yet.**
* Explicit proposal: **one-level-deep recursion only**.

### Known Side Effects

* Current implementation oscillates between flooding and omission.

### Explicitly Unresolved Aspects

* One-level recursion not yet implemented.
* Deduplication strategy not finalized.

---

## 🔧 ISSUE: ORANGE APPLY “NO TARGET PATHS DEFINED”

### Problem Trigger

* Clicking **Apply to Target** produced error even when Target list visually populated.

### Initial Hypothesis

* Orange Apply expected structured data, not plain text.

### Experiments / Attempts

* Logged DOM reads from Target list.
* Inspected collected payload before `evalScript`.

### Failure Modes Observed

* Target list rendered as raw text nodes.
* Apply handler searched for structured elements that did not exist.

### Constraint(s) Identified

* Need persistent, machine-readable target metadata in the DOM.

### Final Mechanism Implemented

* Target entries rendered as `<div class=""target-item"" data-path=""..."">`.
* Orange Apply collects `data-path` attributes into payload.

### Known Side Effects

* Path strings based on **display names**, not matchNames.

### Explicitly Unresolved Aspects

* Path resolution fragile if user renames groups.

---

## 🔧 ISSUE: CUSTOM SEARCH “FAILED” (TOKEN SEARCH REGRESSION)

### Problem Trigger

* All Custom Search attempts returned **“Custom search failed”**.

### Initial Hypothesis

* Token walker logic incorrect or incomplete.

### Experiments / Attempts

* Added hierarchical token splitting (`>`).
* Implemented deep token walkers in GroupScout.
* Added logging for tokens and scope layers.

### Failure Modes Observed

* Execution reached missing helper calls.
* Errors collapsed into generic failure message.

### Constraint(s) Identified

* Several core helpers were **removed or out of sync**:

  * MapMaker
  * Translator
  * Explorer
  * Collect&Apply

### Final Mechanism Implemented

* **None yet**.
* Added graceful no-match returns to avoid hard failure when zero hits.

### Known Side Effects

* Search still non-functional despite graceful handling.

### Explicitly Unresolved Aspects

* Helpers must be restored or reconstructed before Custom Search works.

---

## 🔧 ISSUE: PROPERTY IDENTIFICATION VIA DISPLAY NAMES

### Problem Trigger

* Renamed groups broke Target resolution and Search reliability.

### Initial Hypothesis

* Display-name-based paths are inherently fragile.

### Experiments / Attempts

* Logged `matchName` alongside display names.
* Prototyped matchName traversal snippets.

### Failure Modes Observed

* Display-name paths fail when user renames groups.
* Localization risk acknowledged.

### Constraint(s) Identified

* matchName traversal is more complex and requires refactor across MapMaker/Explorer.

### Final Mechanism Implemented

* **Deferred**.
* Decision recorded to migrate later once workflows stabilize.

### Known Side Effects

* Current system remains rename-sensitive.

### Explicitly Unresolved Aspects

* Full matchName migration not started.

---

## 🔧 ISSUE: LAYER STYLES NOISE IN APPLY REPORTS

### Problem Trigger

* Disabled or phantom Layer Styles generated excessive “skipped” entries.

### Initial Hypothesis

* Layer Styles exist even when disabled and should be ignored.

### Experiments / Attempts

* Checked enabled state of Layer Style properties.
* Logged phantom properties.

### Failure Modes Observed

* Reports cluttered with non-actionable skips.

### Constraint(s) Identified

* UX clarity favored silence over exhaustive reporting.

### Final Mechanism Implemented

* Disabled/phantom Layer Styles **silently ignored**.
* Enabled Layer Styles still processed.

### Known Side Effects

* Reduced visibility into why certain properties were ignored.

### Explicitly Unresolved Aspects

* No toggle to show hidden Layer Style skips.

---

## 🔧 ISSUE: STRICT VS FUZZY SEARCH EXPLORATION

### Problem Trigger

* Desire to support relaxed matching for property searches.

### Initial Hypothesis

* Strict and fuzzy modes could coexist with filters.

### Experiments / Attempts

* Built ScriptUI runners to iterate property walkers.
* Tested:

  * Token splitting
  * Name contains logic
  * Depth skipping of “Contents”
* Encountered ExtendScript limitations (`Array.map` unsupported).

### Failure Modes Observed

* Increased complexity with limited UX payoff.
* Maintenance burden high.

### Constraint(s) Identified

* ExtendScript environment limits modern JS patterns.
* Risk of over-broad destructive applies.

### Final Mechanism Implemented

* Development **put on ice**, not deleted.

### Known Side Effects

* Partial code retained but dormant.

### Explicitly Unresolved Aspects

* Whether Strict/Fuzzy returns as a surfaced feature.

---

## 🔧 ISSUE: TARGET BUTTON “ARM / POLL” EXPANSION

### Problem Trigger

* Desire for persistent targeting modes.

### Initial Hypothesis

* ARM state could allow polling or sticky targeting.

### Experiments / Attempts

* Conceptual ARM sentinel logic discussed.
* Cancel/cleanup flows partially sketched.

### Failure Modes Observed

* No complete lifecycle for ARM state.
* Risk of stale targets.

### Constraint(s) Identified

* UX complexity vs benefit unclear.

### Final Mechanism Implemented

* **None**.
* Explicitly marked mid-development.

### Explicitly Unresolved Aspects

* ARM cleanup, cancel semantics, polling cadence.

---

**END OF PHASE-2 EXTRACTION**
No conclusions. No recommendations.
"
----------END OF PART 1----------
-----PART 2------
"## 1) Initial “Pick Expression” concept (experimental)

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

## 2) Polling architecture introduced (host-side)

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

## 3) File structure stabilized (mentioned briefly)

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

## 4) CodeMirror integration issues (dead plugin / duplicate init)

* **Problem Trigger**

  * CodeMirror was “invisible” or panel went “dead” due to init failures. 
* **Initial Hypothesis**

  * Mount CodeMirror via direct `EditorState` / `EditorView` style initialization. 
* **Experiments / Attempts**

  * Attempted “broken version” using direct imports-style objects (EditorState.create + EditorView). 
  * Replaced with `window.codemirror.*` initialization inside `DOMContentLoaded`. 
  * Added guard clause: log “❌ CodeMirror not available” and abort init if globals missing. 
* **Failure Modes Observed**

  * Bundle didn’t expose EditorState globally, causing script crash and plugin “dead” state. 
  * Duplicate initialization blocks caused clashes and “plugin broke”; removal of duplicate init described as the fix. 
* **Constraint(s) Identified**

  * Must match actual bundle export mechanism (window.codemirror) and mount only once. 
* **Final Mechanism Implemented**

  * Single guarded init via `window.codemirror.*` inside `DOMContentLoaded`, with positive mount log (“✅ CodeMirror editor mounted”). 
* **Known Side Effects**

  * None explicitly stated (beyond earlier crash behavior).
* **Explicitly Unresolved Aspects**

  * Bundle mismatch risk noted as an ongoing hazard requiring validation of bundle export. 

---

## 5) PickVeil lifecycle problems (instant dismiss due to bubbling)

* **Problem Trigger**

  * Veil dismissed instantly after activation due to click bubbling. 
* **Initial Hypothesis**

  * Simple “show veil + add click listener once” would allow cancel and maintain pick mode. 
* **Experiments / Attempts**

  * Patch attempt: bind appRoot click listener with `{ once:true }`. 
  * Added delay (`setTimeout`) before registering listener to avoid same-click cancellation. 
  * Used CAPTURE-PHASE listener to catch events even if bubbling interfered. 
  * Ignored activator button (`exprPickBtn`) inside handler. 
  * Explicit removal of capture listener + nulling handler reference on exit/hide. 
* **Failure Modes Observed**

  * “Same click” used to activate the mode also triggered cancellation immediately (veil “flashed”). 
* **Constraint(s) Identified**

  * Listener MUST be removed to prevent persistent capture behavior; cancel logic must not fire on activator click. 
* **Final Mechanism Implemented**

  * Delayed arm + capture-phase listener + activator ignore + strict cleanup on hide. 
* **Known Side Effects**

  * Capture listeners are inherently risky if not removed; this was called out explicitly. 
* **Explicitly Unresolved Aspects**

  * Cancel scope: tradeoff noted that cancel logic worked “within panel” and not globally (as described). 

---

## 6) Event channel normalization (canonical ISO_ReportLine_dispatch)

* **Problem Trigger**

  * Multiple event channels created ambiguity; partial renames introduced channel drift. 
* **Initial Hypothesis**

  * Standardize on ONE dispatch type and ONE listener path. 
* **Experiments / Attempts**

  * Earlier listener referenced `com.holyexpressor.pickResult` (older channel). 
  * Transition to canonical `ISO_ReportLine_dispatch` and a single panel listener that parses JSON payload. 
  * Introduced dispatch helper `ISO_ReportLine_dispatch(payload)` to centralize JSON encoding and dispatch. 
* **Failure Modes Observed**

  * Ambiguity and misrouting due to multiple channels (explicitly stated). 
* **Constraint(s) Identified**

  * Host and panel must match exact channel string to avoid silent failures. 
* **Final Mechanism Implemented**

  * Canonical channel established: host dispatches `ISO_ReportLine_dispatch` with JSON payload; panel listens only to that channel and routes to handler. 
* **Known Side Effects**

  * None explicitly stated.
* **Explicitly Unresolved Aspects**

  * Older channel references remain as historical; exact moment of full switchover is *partially documented*. 

---

## 7) Sentinel design introduced (**NO_EXPRESSION**) + empty-string handling

* **Problem Trigger**

  * Host sometimes returned empty string; panel treated it as valid and wiped/blanked editor content. 
* **Initial Hypothesis**

  * Use a sentinel string to represent “no expression” distinctly from real expression text. 
* **Experiments / Attempts**

  * Host normalized null/undefined/"""" expression values to `__NO_EXPRESSION__`. 
  * Panel added guard to treat empty string as sentinel too (`trim() === """"`). 
* **Failure Modes Observed**

  * Empty string treated as “valid but blank”, causing injection of nothing / editor clearing. 
* **Constraint(s) Identified**

  * Must distinguish “no expr” from empty text and prevent accidental destructive injection. 
* **Final Mechanism Implemented**

  * Dual-sided normalization: host emits sentinel; panel treats sentinel OR empty string as non-injectable, then always disengages UI. 
* **Known Side Effects**

  * “Magic strings” risk acknowledged; mitigation described as centralizing constant and guarding insertion. 
* **Explicitly Unresolved Aspects**

  * None stated, beyond general “magic sentinel strings” risk. 

---

## 8) Host polling refinements (guards + ordering + anti-spam)

* **Problem Trigger**

  * Stale pre-arm selection logged/treated as pick; log spam during polling; repeated payloads. 
* **Initial Hypothesis**

  * Add state flags + dedupe guards to reduce spam and prevent stale selection interpretation. 
* **Experiments / Attempts**

  * Introduced guards: `he__resultDispatched`, `he__lastLoggedPath` or `he__lastLoggedKey`, `_initialPath` snapshot. 
  * Moved logging AFTER `_initialPath` check to suppress stale selection logs. 
  * Hardened dedupe key `(pickedPath :: pickedMatchName :: propertyIndex)` and clarified it should suppress LOG spam only, not dispatch. 
* **Failure Modes Observed**

  * Guards became overly strict and blocked intentional re-pick of same property (across sessions). 
* **Constraint(s) Identified**

  * Need to prevent immediate pre-arm dispatch while still allowing deliberate re-pick in NEW engage session. 
* **Final Mechanism Implemented**

  * Initial snapshot used to suppress stale logging/dispatch; dedupeKey used to suppress repeated logs only; do NOT early-return from dispatch based on dedupeKey. 
* **Known Side Effects**

  * Key collision risk mentioned (“may still collide in rare cases”) for earlier guard designs. 
* **Explicitly Unresolved Aspects**

  * Exact final guard set across all versions is *partially documented* (multiple iterations referenced). 

---

## 9) Group-selection pathology (repeated dispatches on containers)

* **Problem Trigger**

  * Selecting shape layer containers/groups (Stroke 1, Fill 1, shape groups) caused repeat dispatch loops. 
* **Initial Hypothesis**

  * Loop exists because scanner only stops for expression-capable leaf properties; group selections never satisfy stop condition. 
* **Experiments / Attempts**

  * Modified stop logic to cancel polling AFTER ANY dispatch (not only when leaf property found). 
  * Added structural skip maps for known containers (Contents, Vector Group, graphics containers, Transform groups) to bail early or gate recursion. 
* **Failure Modes Observed**

  * Without one-shot stop, groups keep redispatching, creating CPU churn and repeated payloads. 
* **Constraint(s) Identified**

  * Must treat “group selection result” as terminal for that engage (dispatch sentinel once and stop) to avoid loops. 
* **Final Mechanism Implemented**

  * One-shot stop after dispatch + clear state flags + reset snapshots. 
* **Known Side Effects**

  * Prevents multiple picks per engage; noted explicitly as separate feature. 
* **Explicitly Unresolved Aspects**

  * Container-to-leaf PROMOTION became a parallel approach (DFS promotion) but carried mis-target risks; priority/scoping needed refinement. 

---

## 10) Shape layer complexity discovery (“Clive” knowledge set formation)

* **Problem Trigger**

  * Shape layer internals brittle; needed reliable identification/classification while still generating valid expression paths. 
* **Initial Hypothesis**

  * Hybrid approach: use `.name` chain for expression paths and `.matchName` chain for classification/type detection. 
* **Experiments / Attempts**

  * Implemented/expanded:

    * `he_P_MM_getExprPathHybrid` returning `{exprPath, metaPath}` with `.name` and `.matchName`. 
    * `he_P_MM_classifyProperty(metaPath)` for classification. 
    * `HE_STRUCTURAL_MATCHNAMES` map to skip/gate non-leaf structural groups. 
* **Failure Modes Observed**

  * Over-broad structural skip could hide leaves unless promoted (explicit risk). 
* **Constraint(s) Identified**

  * Expressions require DISPLAY NAME segments; matchName not usable inside expressions, but useful for robust typing. 
* **Final Mechanism Implemented**

  * Hybrid MapMaker persisted as the mechanism: `.name` for `exprPath`; `.matchName` for metadata/classification; dual logging of both fields. 
* **Known Side Effects**

  * Misclassification risk on shape layers marked as medium; fallback/targeted rules favored. 
* **Explicitly Unresolved Aspects**

  * Leaf promotion priority errors (wrong leaf chosen) were observed later; refinement needed but not fully documented here. 

---

## 11) “Promotion to leaf” DFS (container → preferred leaf) (host-side)

* **Problem Trigger**

  * Users often select containers like Stroke/Fill groups; code needed to resolve to expression-capable leaves (Width/Opacity/Color etc.). 
* **Initial Hypothesis**

  * Walk down from selected container to first preferred leaf using bounded DFS and a priority order. 
* **Experiments / Attempts**

  * Expanded `he_P_leafReader` table to recognize more leaf types (Fill/Stroke Color/Opacity/Width, gradients, Trim Paths, Path leaf, Dashes, Taper, Round Corners Radius). 
  * Added `he_U_findFirstLeaf(rootProp, depthCap, priority)` to promote containers to a leaf using depth cap and priority list. 
* **Failure Modes Observed**

  * Over-eager promotion: priority rules sometimes selected the “wrong” leaf (Path or Stroke Width) versus user intent; scoping/priority needed tuning. 
* **Constraint(s) Identified**

  * Must limit recursion depth; priority must reflect expected user intent; fallback remains `canSetExpression` and/or sentinel. 
* **Final Mechanism Implemented**

  * Implemented bounded DFS + expanded leafReader tables, with risks explicitly logged. 
* **Known Side Effects**

  * “Table drift with AE versions” risk noted (leaf detection tables may need updates). 
* **Explicitly Unresolved Aspects**

  * Promotion mis-targeting remained a known risk; refinement described as needed but not fully resolved in this fragment. 

---

## 12) Codex-assisted refactor incident (bulk renames / mojibake / mismatched callsites)

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

## 13) Panel/host responsibility split (avoid re-entrant stop calls)

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

## 14) “Stability milestone” (working property classes vs brittle shape subtree)

* **Problem Trigger**

  * Need to confirm which classes of properties were reliably working under the pick/inject pipeline. 
* **Initial Hypothesis**

  * Transform props and certain shape leaves should be testable as a “happy path” for injection. 
* **Experiments / Attempts**

  * Manual tests listed:

    * Transform Position injects when expression exists.
    * Opacity without expression yields sentinel and skips injection.
    * Selecting groups should dispatch sentinel once and stop.
    * Re-arm and re-pick same prop should still dispatch/inject. 
* **Failure Modes Observed**

  * Shape subtree remained brittle; Stroke/Fill/Taper still needed promotion/refinement. 
* **Constraint(s) Identified**

  * Leaf reader tables and priority rules are sensitive; fallback to sentinel preferred over looping. 
* **Final Mechanism Implemented**

  * Stability characterization captured as test outcomes and known brittleness areas rather than a single code change. 
* **Known Side Effects**

  * None explicitly stated.
* **Explicitly Unresolved Aspects**

  * Full shape coverage for Stroke/Fill/Taper remained incomplete/fragile within this fragment. 

---

## 15) Strategic pivot to Holy Expressor V2 (pick-whip retired)

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
"
----------END OF PART 2----------
-----PART 3------
"Below is a **PHASE-2 METHODOLOGY EXTRACTION** based strictly on the archival source fragment you provided.
All mechanics are derived from the source text only; no rationale is invented.
Unclear or inferred steps are explicitly marked.

Source reference: 

---

## INITIAL PICK EXPRESSION CONCEPT (EXPERIMENTAL)

* **Problem Trigger**

  * Desire to emulate AE pick-whip behavior from a CEP panel.

* **Initial Hypothesis**

  * CEP panel could intercept direct clicks on AE properties.

* **Experiments / Attempts**

  * Panel button arms “pick mode.”
  * Dark overlay (“PickVeil”) added to signal mode.
  * Attempted click interception on AE canvas.

* **Failure Modes Observed**

  * CEP cannot capture AE canvas clicks.
  * Immediate dismissal of overlay due to event bubbling.

* **Constraint(s) Identified**

  * CEP sandbox prevents reliable AE canvas input capture.

* **Final Mechanism Implemented**

  * Abandoned direct click interception.
  * Pivot to host-side polling via ExtendScript.

* **Known Side Effects**

  * Increased complexity around lifecycle and disarm logic.

* **Explicitly Unresolved Aspects**

  * Full pick-whip parity deemed impractical.

---

## HOST-SIDE POLLING ARCHITECTURE

* **Problem Trigger**

  * Inability to detect AE property clicks directly.

* **Initial Hypothesis**

  * Polling `selectedProperties` would approximate a “pick.”

* **Experiments / Attempts**

  * Used `app.scheduleTask` to poll every ~200ms.
  * Snapshot initial selection on arm to detect changes.

* **Failure Modes Observed**

  * Poll loops re-dispatching repeatedly.
  * Immediate “re-pick” of pre-selected property.

* **Constraint(s) Identified**

  * Polling must be explicitly cancelled.
  * Initial selection indistinguishable without guard.

* **Final Mechanism Implemented**

  * `_initialPath` snapshot guard.
  * One-shot dispatch with explicit cancel and disarm.

* **Known Side Effects**

  * Risk of CPU churn if cancel path missed.

* **Explicitly Unresolved Aspects**

  * Polling frequency tuning not formalized.

---

## CODEMIRROR INITIALIZATION FAILURES

* **Problem Trigger**

  * Panel became non-responsive (“dead plugin”).

* **Initial Hypothesis**

  * CodeMirror import style incompatible with CEP.

* **Experiments / Attempts**

  * Direct `EditorState` / `EditorView` imports.
  * Multiple initialization blocks.

* **Failure Modes Observed**

  * CEP boot failure.
  * Silent script halt on missing globals.

* **Constraint(s) Identified**

  * CEP requires globals exposed on `window`.

* **Final Mechanism Implemented**

  * Single guarded init using `window.codemirror.*`.
  * Guard clause aborts if bundle missing.

* **Known Side Effects**

  * Dependency on bundle export shape.

* **Explicitly Unresolved Aspects**

  * Bundle changes could break init.

---

## PICKVEIL LIFECYCLE BUGS

* **Problem Trigger**

  * PickVeil dismissed instantly on activation.

* **Initial Hypothesis**

  * Event bubbling from activator click.

* **Experiments / Attempts**

  * Added `setTimeout` before listener registration.
  * Switched to capture-phase click listener.
  * Ignored activator button by ID.

* **Failure Modes Observed**

  * Veil flashing briefly.
  * Risk of orphaned capture listeners.

* **Constraint(s) Identified**

  * Capture listeners must always be removed.

* **Final Mechanism Implemented**

  * Delayed capture-phase listener with explicit teardown.

* **Known Side Effects**

  * Global click interception during pick mode.

* **Explicitly Unresolved Aspects**

  * Global cancel semantics outside panel.

---

## EVENT CHANNEL NORMALIZATION

* **Problem Trigger**

  * Ambiguous handling due to multiple CSXSEvent types.

* **Initial Hypothesis**

  * Single canonical channel reduces confusion.

* **Experiments / Attempts**

  * Consolidated dispatch to one event name.
  * Updated panel to listen to only that channel.

* **Failure Modes Observed**

  * Earlier summaries contradicted on channel names.

* **Constraint(s) Identified**

  * Channel name drift breaks panel-host contract.

* **Final Mechanism Implemented**

  * Canonical channel: `ISO_ReportLine_dispatch`.

* **Known Side Effects**

  * Legacy listeners deprecated.

* **Explicitly Unresolved Aspects**

  * None documented.

---

## SENTINEL DESIGN (`__NO_EXPRESSION__`)

* **Problem Trigger**

  * Ambiguity between empty string and no expression.

* **Initial Hypothesis**

  * Magic sentinel distinguishes cases.

* **Experiments / Attempts**

  * Host normalized null/empty to sentinel.
  * Panel later also treated empty string as sentinel.

* **Failure Modes Observed**

  * Contradictory behavior across revisions.

* **Constraint(s) Identified**

  * AE sometimes returns empty string.

* **Final Mechanism Implemented**

  * Sentinel string used consistently in host.
  * Panel guards empty strings equivalently.

* **Known Side Effects**

  * Reliance on magic constant.

* **Explicitly Unresolved Aspects**

  * Centralization of constant not enforced.

---

## HOST POLLING GUARDS & ORDERING

* **Problem Trigger**

  * Log spam and repeated dispatches.

* **Initial Hypothesis**

  * Dedup keys suppress noise.

* **Experiments / Attempts**

  * Added `he__lastLoggedKey` / `he__lastLoggedPath`.
  * Reordered guards before logging.
  * Moved disarm before dispatch.

* **Failure Modes Observed**

  * Same-property re-pick blocked unintentionally.

* **Constraint(s) Identified**

  * Guards must not suppress valid dispatch.

* **Final Mechanism Implemented**

  * Guards suppress logs only, not dispatch.
  * Re-pick allowed per engage session.

* **Known Side Effects**

  * Slightly looser duplicate control.

* **Explicitly Unresolved Aspects**

  * Key collision edge cases.

---

## GROUP SELECTION PATHOLOGY

* **Problem Trigger**

  * Selecting shape groups caused repeated dispatch.

* **Initial Hypothesis**

  * Scanner only stops on expression-capable leaves.

* **Experiments / Attempts**

  * Observed group selections re-trigger polling.

* **Failure Modes Observed**

  * Infinite or repeated dispatch loops.

* **Constraint(s) Identified**

  * Groups often lack expressions.

* **Final Mechanism Implemented**

  * One-shot stop after **any** dispatch, including groups.

* **Known Side Effects**

  * No multi-pick per engage.

* **Explicitly Unresolved Aspects**

  * Group-to-leaf promotion strategy incomplete.

---

## SHAPE LAYER “CLIVE” DISCOVERY SET

* **Problem Trigger**

  * Fragile and inconsistent shape-layer paths.

* **Initial Hypothesis**

  * `.matchName` could replace `.name`.

* **Experiments / Attempts**

  * Tested matchName-only paths.
  * Logged name and matchName in parallel.

* **Failure Modes Observed**

  * Expressions reject matchName paths.

* **Constraint(s) Identified**

  * AE expressions require display `.name`.

* **Final Mechanism Implemented**

  * Rule set:

    * `.name` = expression address.
    * `.matchName` = classification only.
  * Property group taxonomy documented.

* **Known Side Effects**

  * Name fragility across renames/locales.

* **Explicitly Unresolved Aspects**

  * Locale-safe resolution strategy.

---

## STRUCTURAL ANCHORS (TRANSFORM / CONTENTS)

* **Problem Trigger**

  * Incorrect traversal when skipping structural nodes.

* **Initial Hypothesis**

  * Contents analogous to Transform.

* **Experiments / Attempts**

  * Treated Contents as mandatory root for shapes.

* **Failure Modes Observed**

  * Path duplication when mishandled.

* **Constraint(s) Identified**

  * Contents always present and non-optional.

* **Final Mechanism Implemented**

  * Contents and Transform treated as required anchors.

* **Known Side Effects**

  * Must always traverse through Contents.

* **Explicitly Unresolved Aspects**

  * None documented.

---

## HYBRID MAPMAKER PROPOSAL (NOT WIRED)

* **Problem Trigger**

  * Need for robustness without breaking expressions.

* **Initial Hypothesis**

  * Parallel name + matchName paths.

* **Experiments / Attempts**

  * Designed function returning `{exprPath, metaPath}`.

* **Failure Modes Observed**

  * Not yet integrated.

* **Constraint(s) Identified**

  * Backward compatibility required.

* **Final Mechanism Implemented**

  * Proposal logged; original retained.

* **Known Side Effects**

  * Added complexity if wired later.

* **Explicitly Unresolved Aspects**

  * Integration deferred.

---

## CODEX-ASSISTED RENAME INCIDENT

* **Problem Trigger**

  * Large-scale renaming via Codex.

* **Initial Hypothesis**

  * Automated rename would be safe.

* **Experiments / Attempts**

  * Bulk rename across files.
  * Partial manual rollback attempt.

* **Failure Modes Observed**

  * Mismatched callsites.
  * Mojibake artifacts.

* **Constraint(s) Identified**

  * Multi-file automation brittle.

* **Final Mechanism Implemented**

  * Rollback abandoned.
  * Proceeded with latest state and patch forward.

* **Known Side Effects**

  * Residual naming inconsistencies.

* **Explicitly Unresolved Aspects**

  * Full cleanup deferred.

---

## STRATEGIC PIVOT TO EXPRESSOR V2

* **Problem Trigger**

  * Pick-whip workflow cost exceeded benefit.

* **Initial Hypothesis**

  * Editor-first model simpler and safer.

* **Experiments / Attempts**

  * Assessed stability of Apply/Search flows.

* **Failure Modes Observed**

  * Shape subtree brittleness persisted in V1.

* **Constraint(s) Identified**

  * Pick-style UX not critical.

* **Final Mechanism Implemented**

  * Retired PickVeil/pick-whip.
  * Centered on single Apply, scoped traversal.

* **Known Side Effects**

  * Large swathes of V1 logic become legacy.

* **Explicitly Unresolved Aspects**

  * How much legacy logic to retain in V2.

---

**END OF PHASE-2 EXTRACTION**
"
----------END OF PART 3----------