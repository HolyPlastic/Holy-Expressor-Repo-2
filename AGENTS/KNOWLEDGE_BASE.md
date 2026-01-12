
## 1. PROJECT EVOLUTION MAP

### Early CEP Interaction Era (Experimental Pick-Whip Phase)

* Initial architecture pursued **pick-whip style interaction** from CEP panel into After Effects.
* Assumed CEP could intercept AE canvas or property clicks.
* Introduced UI scaffolding:

  * Pick mode button
  * Visual overlay (“PickVeil”)
* **Primary constraint discovered**:

  * CEP sandbox **cannot reliably capture AE canvas or property clicks**.
* Result:

  * Direct interception abandoned.
  * Forced architectural pivot to host-side inference.

### Host-Side Polling Era

* Introduced **ExtendScript polling** via `app.scheduleTask`.
* Architecture split:

  * Panel: UI state, veil, editor injection.
  * Host: selection polling, path extraction, dispatch.
* Polling lifecycle formalized:

  * Arm → snapshot initial selection → poll → dispatch → cancel.
* Constraints shaping this era:

  * Polling must be explicitly cancelled.
  * Selection APIs often return **containers instead of animatable leaves**.
  * Shape Layer hierarchies proved brittle and deep.

### Shape Layer Deep-Dive & Classification Era (“Clive” Knowledge Formation)

* Sustained instability around Shape Layer contents forced focused investigation.
* Key discoveries:

  * Expressions require **display name paths**, not `matchName`.
  * `matchName` is still required for **classification and safety checks**.
* Introduced hybrid concepts:

  * Expression path (`.name`)
  * Metadata path (`.matchName`)
* Container-to-leaf promotion logic explored and partially implemented.
* Tradeoff acknowledged:

  * Increased correctness vs increased mis-target risk.

### Stabilization & Guarding Era

* Multiple guard systems introduced to prevent:

  * Infinite polling loops.
  * Repeated dispatches.
  * Accidental editor wipes.
* Event channel normalization performed.
* Sentinel values introduced to represent “no expression”.
* CodeMirror integration stabilized after multiple init failures.

### Strategic Pivot to Expressor V2

* Interactive pick-whip workflow assessed as **high cost, low return**.
* Declared pivot to:

  * Editor-first model.
  * Single Apply workflows.
* Legacy subsystems preserved as **archival safety net**, not invariants.
* Pick-whip logic explicitly retired from critical path.

---

## 2. ISSUE → MECHANISM LEDGER

### A. CEP → AE Interaction Limits

**Problem Signature**

* Attempts to intercept AE canvas or property clicks fail or behave inconsistently.

**Affected Areas**

* PickVeil
* Pick Expression workflows
* CEP event listeners

**Mechanisms That Worked**

* Host-side polling using `app.scheduleTask`.
* Selection change inference.

**Mechanisms That Failed or Were Abandoned**

* Direct click interception.
* CEP-side click capture outside panel.

**Constraints That Shaped the Outcome**

* CEP sandbox restrictions.
* No reliable access to AE canvas events.

**Known Regressions / Side Effects**

* Polling introduces lifecycle and cleanup risks.

**Landmines / Don’t Try This Again**

* Do not assume CEP can capture AE canvas input.

**Explicitly Unresolved Aspects**

* Full pick-whip parity remains impractical.

---

### B. Host Polling & Dispatch Loops

**Problem Signature**

* Repeated dispatches.
* CPU churn.
* Stale selection treated as a pick.

**Affected Areas**

* `host.jsx`
* Poll scheduler
* Dispatch helpers

**Mechanisms That Worked**

* Initial selection snapshot (`_initialPath`).
* One-shot dispatch.
* Explicit task cancellation.
* State flag clearing on dispatch.

**Mechanisms That Failed or Were Abandoned**

* Persistent polling without enforced stop.
* Over-strict dedupe blocking valid re-picks.

**Constraints That Shaped the Outcome**

* ExtendScript polling has no implicit lifecycle.
* Selection APIs ambiguous on containers vs leaves.

**Known Regressions / Side Effects**

* Multi-pick per engage not supported.

**Landmines / Don’t Try This Again**

* Never rely on leaf detection alone to stop polling.

**Explicitly Unresolved Aspects**

* Polling frequency tuning.
* Residual risk if dispatch never occurs.

---

### C. Group & Shape Layer Selection Pathology

#### Canonical Selection & Scope Laws (Authoritative)

The following rules define the non-negotiable behavior of selection-driven systems (Apply, Search, Delete):

- **Selection is an entry point, not a guarantee**  
  `selectedProperties` may include containers, groups, or structural nodes. All systems must validate and resolve to explicit, expression-capable leaf properties before acting.

- **Traversal is allowed; inference is not**  
  Systems may recurse downward from a selected container to locate valid leaves, but must never guess intent or broaden scope beyond explicitly selected ancestry.

- **Scope is defined by ancestry, not paths**  
  Display-name paths are not reliable for scoping. Group containment must be determined via parent-property ancestry, not string prefixes or partial path matching.

- **Containers do not imply permission**  
  Selecting a group does not authorize blanket operations on all descendants. Only leaves resolved within the selected group’s ancestry are valid targets.

- **Failure must be loud and deterministic**  
  If no valid leaves resolve, the operation must fail explicitly. Silent fallbacks, partial success, or “best guess” behavior are forbidden.

These laws apply equally to Apply, Custom Search, and Delete-Expression systems.



**Problem Signature**

* “Select a property” errors.
* Over-application.
* Target flooding.
* Infinite redispatch on groups.

**Affected Areas**

* Apply logic
* Selection summarizers
* Shape Layer contents

**Mechanisms That Worked**

* Recursive descent from group entry points.
* Gating recursion to explicitly selected groups.
* One-shot stop even on container dispatch.
* Structural skip maps for known non-leaf groups.

**Mechanisms That Failed or Were Abandoned**

* Flat iteration over selection.
* Unbounded recursion.
* Display-name-only traversal.

**Constraints That Shaped the Outcome**

* Shape Layers deeply nested.
* Groups often lack expression-capable properties.

**Known Regressions / Side Effects**

* Some deep leaves unreachable without direct selection.

**Landmines / Don’t Try This Again**

* Never assume selection equals animatable leaf.

**Explicitly Unresolved Aspects**

* Optimal recursion depth control.
* Promotion priority tuning.

---

### D. Container → Leaf Promotion

**Problem Signature**

* Users select Stroke/Fill groups instead of properties.

**Affected Areas**

* Host-side scanners
* Leaf reader tables

**Mechanisms That Worked**

* Bounded DFS with priority lists.
* Expanded leaf classification tables.

**Mechanisms That Failed or Were Abandoned**

* Unbounded DFS.
* Blind first-leaf selection.

**Constraints That Shaped the Outcome**

* Expressions require leaf properties.
* User intent ambiguous from container selection.

**Known Regressions / Side Effects**

* Wrong leaf sometimes promoted (Path vs Width, etc.).

**Landmines / Don’t Try This Again**

* Do not auto-promote without depth caps.

**Explicitly Unresolved Aspects**

* Leaf priority correctness across all shape types.
* AE version drift risk.

---

### E. Event Channel Drift

**Problem Signature**

* Panel receives nothing.
* Silent failures.

**Affected Areas**

* CSXSEvent dispatch
* Panel listeners

**Mechanisms That Worked**

* Single canonical channel:

  * `ISO_ReportLine_dispatch`
* Centralized dispatch helper.

**Mechanisms That Failed or Were Abandoned**

* Multiple event names.
* Partial renames.

**Constraints That Shaped the Outcome**

* Channel strings must match exactly.

**Known Regressions / Side Effects**

* Legacy listeners exist historically.

**Landmines / Don’t Try This Again**

* Never introduce parallel event channels.

**Explicitly Unresolved Aspects**

* Exact switchover point is *partially documented*.

---

### F. Sentinel & Empty Expression Handling

**Problem Signature**

* Editor wiped unexpectedly.
* Empty strings treated as valid expressions.

**Affected Areas**

* Host expression extraction.
* Panel injection logic.

**Mechanisms That Worked**

* Sentinel value (`__NO_EXPRESSION__`).
* Panel treats empty string as sentinel.

**Mechanisms That Failed or Were Abandoned**

* Trusting empty string as valid content.

**Constraints That Shaped the Outcome**

* AE sometimes returns empty string for “no expression”.

**Known Regressions / Side Effects**

* Reliance on magic constant.

**Landmines / Don’t Try This Again**

* Never inject blindly without sentinel checks.

**Explicitly Unresolved Aspects**

* Centralization of sentinel constant not enforced.

---

### G. CodeMirror Integration Failures

**Problem Signature**

* Panel “dead”.
* Editor invisible.

**Affected Areas**

* Editor init
* Bundle exports

**Mechanisms That Worked**

* Single guarded init.
* Reliance on `window.codemirror.*`.

**Mechanisms That Failed or Were Abandoned**

* Direct `EditorState` / `EditorView` imports.
* Duplicate init blocks.

**Constraints That Shaped the Outcome**

* CEP requires globals.
* Bundle export shape must match runtime assumptions.

**Known Regressions / Side Effects**

* Bundle mismatch remains a risk.

**Landmines / Don’t Try This Again**

* Never mount CodeMirror twice.

**Explicitly Unresolved Aspects**

* Bundle evolution risk.

---

### H. CEP Asset & Styling Constraints (SVG, CSS, CEF)

**Problem Signature**

* Assets fail to load.
* SVG strokes inherit wrong colors.
* Geometry clipped.

**Affected Areas**

* Inline SVG
* CSS variables
* Manifest flags

**Mechanisms That Worked**

* Inline SVG markup.
* CSS-driven stroke/fill.
* Expanded SVG viewBox.
* JS-driven color derivation.

**Mechanisms That Failed or Were Abandoned**

* External SVG `<img>` loading.
* Unitless HSL math in CSS.

**Constraints That Shaped the Outcome**

* CEP CEF sandbox.
* Older Chromium parser quirks.

**Known Regressions / Side Effects**

* Increased markup verbosity.
* Styling depends on JS bootstrap.

**Landmines / Don’t Try This Again**

* Do not rely on external SVG geometry styling.

**Explicitly Unresolved Aspects**

* CEF version variability.
* Hex format coverage.

---

### I. Automation & Bulk Refactor Hazards

**Problem Signature**

* Broken callsites.
* Mojibake.
* Silent load failures.

**Affected Areas**

* Multi-file renames
* Dispatch logic

**Mechanisms That Worked**

* Patch-forward strategy.
* Surgical fixes on latest state.

**Mechanisms That Failed or Were Abandoned**

* Automated bulk renames without validation.
* Rollback after large refactor.

**Constraints That Shaped the Outcome**

* Rollback cost too high.

**Known Regressions / Side Effects**

* Residual inconsistencies.

**Landmines / Don’t Try This Again**

* Never trust multi-file automation blindly.

**Explicitly Unresolved Aspects**

* Full cleanup deferred.

---

## 3. ARCHITECTURAL TRUTHS (EARNED FACTS)

* CEP **cannot** reliably capture AE canvas or property clicks.
* Host-side polling **must** be explicitly cancelled.
* `selectedProperties` may return **groups**, not leaves.
* Shape Layer expressions **require display name paths**.
* `matchName` is unsuitable for expression paths but critical for classification.
* Polling systems require **one-shot dispatch semantics**.
* Event channel strings must be **singular and exact**.
* Empty string from AE does **not** imply valid expression.
* CodeMirror must be initialized **once**, from known globals.
* CEP CEF parsing behavior differs from modern browsers.

---

## 4. OPEN LOOPS & RISK REGISTER

* Container → leaf promotion accuracy remains *incomplete*.
* Shape subtree coverage is *partial and brittle*.
* Leaf priority tables may drift with AE updates.
* Polling non-dispatch scenario remains *assumed behavior*.
* Bundle export shape mismatch is an ongoing risk.
* Sentinel constant centralization is *not enforced*.
* Legacy pick-whip logic retained but *not trusted*.
* Extent of legacy code removal in V2 is *unclear*.

---

