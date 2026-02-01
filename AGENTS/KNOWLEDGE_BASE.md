

## 🧠 KNOWLEDGE BASE — EPISTEMIC SCOPE & READING RULES

This document records **understandings, models, and constraints as they were believed or inferred at the time they were written**.

It is **not** a source of permanent truth, correctness, or final architectural law.

All statements in this document must be interpreted as **temporally scoped**, even when not explicitly stated.

### ⏳ TEMPORAL INTERPRETATION

Every claim in this document implicitly means:

- “At the time of writing, this was believed to…”
- “Based on the evidence available then, this appeared to…”
- “This understanding informed design decisions during that period…”

No statement should be read as asserting that a behavior, limitation, or rule will remain true in the future.

### 🚫 NO CANONICAL AUTHORITY

Nothing in this document is authoritative by default.

- Entries do **not** establish correctness
- Entries do **not** close investigation
- Entries do **not** forbid alternative approaches
- Entries do **not** supersede empirical testing or new evidence

If a claim here conflicts with observed behavior, **the observation takes precedence**.

### 🧾 HISTORICAL COMPRESSION, NOT PROOF

This document exists to **compress prior reasoning and accumulated context**, not to prove that those conclusions were correct.

Items may reflect:

- Partial investigations
- Incomplete testing
- Assumptions made under time or tooling constraints
- Understandings later revised or invalidated

Contradictions across entries are expected and allowed.

### ⚠️ AGENT READING REQUIREMENTS

Agents must not:

- Treat phrasing here as evidence of correctness
- Assume stability because something is stated confidently
- Stop investigating because a limitation is described

Agents should treat this document as **contextual memory**, not instruction.


### 📜 INTERPRETATION & CONFLICT HANDLING

No document in this system establishes truth by authority or position.

This document, along with **DEV\_ARCHIVE.md** and **AGENTS.md**, represents different forms of recorded understanding, not sources of correctness.

If statements across documents appear to conflict, this should be treated as:

- Evidence of evolving understanding
- Differences in scope, timing, or context
- A signal that further investigation may be required

In all cases:

- **Observed runtime behavior**
- **Direct testing**
- **New instrumentation or data**

should be treated as stronger signals than any written description.

This document may be revised, contradicted, or rendered partially obsolete as new information becomes available.





---

# 1. PROJECT EVOLUTION MAP (AS UNDERSTOOD AT THE TIME)

### Early CEP Interaction Era (Experimental Pick-Whip Phase)

During this period, the architecture was explored under the assumption that a **pick-whip-style interaction** could be initiated from a CEP panel into After Effects.

At the time of writing, the following assumptions and actions were present:

* It was assumed that CEP might be able to intercept or respond to AE canvas or property click events.
* UI scaffolding was introduced to support this exploration, including:

  * A pick-mode button
  * A visual overlay (“PickVeil”)

During testing under the conditions available at that time, it appeared that:

* The CEP sandbox did not reliably surface AE canvas or property click events.
* Direct interception attempts did not consistently resolve selection intent.

As a result of these observations during that phase:

* Direct click interception was deprioritized.
* Investigation shifted toward host-side inference mechanisms.

No claim is made that these conclusions remain valid outside the tested conditions.

---

### Host-Side Polling Era

Following the above observations, investigation shifted toward **ExtendScript-driven polling** using `app.scheduleTask`.

At the time of writing, the explored architectural shape included:

* A split between panel and host responsibilities:

  * Panel: UI state, veil presentation, editor injection
  * Host: selection polling, path extraction, dispatch logic
* A polling lifecycle conceptualized as:

  * Arm → snapshot initial selection → poll → dispatch → cancel

Under the conditions tested during this era, the following behaviors were observed:

* Polling required explicit cancellation to avoid indefinite execution.
* AE selection APIs often returned containers rather than expression-capable leaf properties.
* Shape Layer hierarchies appeared deep and structurally brittle when traversed generically.

#### Selection Payload Handling (Historical Context)

During this period, a helper responsible for extracting selection payloads (`he_U_getSelectedProps`) existed in the codebase and was referenced in discussion and documentation.

At a later point during this phase:

* The helper was **intentionally commented out** as part of UX and architectural experimentation.
* Under the tested runtime conditions at that time, this resulted in PickClick polling loops that could arm and cancel but not resolve.

Subsequently:

* Repeated confusion arose from agents and tools interpreting commented code as active logic.
* This ambiguity was observed to materially slow debugging and misdirect investigation.

As a result of these observations:

* The helper was **fully removed from the codebase**, not merely commented out.
* At the time of writing, `he_U_getSelectedProps` does **not exist anywhere in the runtime codebase**.

This removal was performed to eliminate ambiguity and does not, by itself, establish conclusions about long-term architecture.

Any references to this helper should be interpreted as **historical**, not indicative of current availability.

---

### Shape Layer Deep-Dive & Classification Era (“Clive”)

Sustained instability when interacting with Shape Layer contents prompted focused investigation during this period.

During testing and inspection at the time, the following observations were made:

* Expression paths appeared to require **display-name paths** to function as expected.
* `matchName` values appeared useful for classification and safety checks, but not for expression targeting.
* Hybrid representations were explored, including:

  * Expression paths derived from `.name`
  * Metadata paths derived from `.matchName`

Container-to-leaf promotion logic was explored and partially implemented.

At the time, this work involved a perceived tradeoff:

* Increased correctness in leaf resolution
* Increased risk of mis-targeting under ambiguous selection

No conclusion was reached about optimality or completeness.

---

### Stabilization & Guarding Era

During this period, multiple guard mechanisms were introduced in response to behaviors observed during earlier testing.

At the time of writing, these included:

* Guards intended to prevent:

  * Infinite polling loops
  * Repeated dispatches
  * Accidental editor wipes
* Event channel normalization to reduce silent failure modes
* Sentinel values used to represent the absence of an expression

CodeMirror integration was revisited after multiple initialization failures.

Under the tested conditions at that time, integration appeared more stable, though no claim is made about long-term robustness.

---

### Strategic Pivot Toward Expressor V2

At the time of writing, interactive pick-whip workflows were assessed as relatively high cost compared to observed benefit under available constraints.

As a result, investigation emphasis shifted toward:

* Editor-first interaction models
* Single-apply workflows

Legacy subsystems were retained in the codebase as reference or archival artifacts.

Pick-whip logic was no longer treated as part of the critical execution path during this phase.

---

# 2. ISSUE → MECHANISM LEDGER (AS OBSERVED)

### A. CEP → AE Interaction Limits

**Problem Signature (as observed)**
Attempts to intercept AE canvas or property clicks appeared to fail or behave inconsistently under tested conditions.

**Affected Areas (during testing)**

* PickVeil
* Pick-expression workflows
* CEP event listeners

**Mechanisms Observed to Function**

* Host-side polling via `app.scheduleTask`
* Inference based on selection state changes

**Mechanisms Observed to Fail or Be Deprioritized**

* Direct click interception
* CEP-side click capture outside the panel

**Constraints Observed at the Time**

* CEP sandbox limitations
* Lack of reliable access to AE canvas events

**Observed Side Effects**

* Polling introduced lifecycle and cleanup risks

**Unresolved Aspects**

* Whether full pick-whip parity is achievable under different constraints

---

### B. Host Polling & Dispatch Loops

**Problem Signature (as observed)**

* Repeated dispatch attempts
* CPU activity during polling
* Stale selection interpreted as a pick

**Affected Areas**

* `host.jsx`
* Poll scheduler
* Dispatch helpers

**Behaviors Observed to Help**

* Initial selection snapshotting
* One-shot dispatch attempts
* Explicit task cancellation
* State clearing on dispatch

**Behaviors Observed to Cause Issues**

* Persistent polling without enforced stop
* Over-strict deduplication blocking valid re-picks

**Constraints Present at the Time**

* ExtendScript polling lacks implicit lifecycle management
* Selection APIs ambiguously surface containers and leaves

**Unresolved Aspects**

* Polling frequency tuning
* Behavior when dispatch never occurs

---

### C. Group & Shape Layer Selection Pathology

During this period, selection-driven systems were observed to behave unpredictably when groups or containers were selected.

At the time of writing, the following understandings guided investigation:

* Selection appeared to function as an entry point rather than a guarantee of an expression-capable target.
* Traversal from containers to leaves was explored, but intent inference was treated cautiously.
* Display-name paths appeared unreliable for scoping.
* Parent-property ancestry appeared more reliable for containment checks.

These understandings informed design decisions during that period but are not asserted as universal rules.

Unresolved aspects included recursion depth control and promotion priority tuning.

---

### D. Container → Leaf Promotion

**Observed Issue**

Users frequently selected Stroke or Fill groups rather than expression-capable properties.

**Observed Responses**

* Bounded depth-first search with priority lists
* Expansion of leaf classification tables

**Observed Risks**

* Incorrect leaf promotion under ambiguous conditions
* Mis-targeting of Path vs Width or similar properties

No determination was made regarding correctness across all shape types or AE versions.

---

### E. Event Channel Drift

**Observed Issue**

* Panel listeners occasionally received no events.
* Failures were silent.

**Observed Mitigations**

* Consolidation toward a single event channel
* Centralized dispatch helpers

**Observed Risks**

* Legacy listeners persisted historically
* Partial documentation of switchover points

---

### F. Sentinel & Empty Expression Handling

**Observed Issue**

* Empty strings returned from AE were treated as valid expressions.
* Editor state was sometimes wiped unexpectedly.

**Observed Mitigations**

* Introduction of a sentinel value
* Panel logic treating empty strings as sentinel cases

**Observed Risks**

* Reliance on a magic constant
* Sentinel centralization not enforced

---

### G. CodeMirror Integration Failures

**Observed Issue**

* Panel appeared inactive
* Editor failed to render

**Observed Mitigations**

* Single guarded initialization
* Reliance on global `window.codemirror` exposure

**Observed Risks**

* Bundle export shape mismatches
* Sensitivity to initialization order

---

### H. CEP Asset & Styling Constraints (SVG, CSS, CEF)

**Observed Issues**

* Assets failed to load
* SVG strokes inherited unintended colors
* Geometry clipping occurred

**Observed Mitigations**

* Inline SVG usage
* CSS-driven stroke and fill
* Expanded SVG viewBox
* JS-assisted color derivation

**Observed Risks**

* Increased markup complexity
* Dependency on JS bootstrap timing
* Variability across CEF versions

---

### I. Automation & Bulk Refactor Hazards

**Observed Issues**

* Broken callsites
* Silent load failures
* Encoding corruption

**Observed Mitigations**

* Patch-forward strategy
* Surgical fixes on latest state

**Observed Risks**

* Residual inconsistencies
* Deferred cleanup

---

# 3. ARCHITECTURAL UNDERSTANDINGS (AS RECORDED)

At the time of writing, the following were commonly assumed or inferred based on accumulated observation:

* CEP did not reliably surface AE canvas or property clicks under tested conditions.
* Host-side polling required explicit cancellation.
* `selectedProperties` frequently returned groups rather than leaves.
* Shape Layer expressions appeared to require display-name paths.
* `matchName` appeared unsuitable for expression paths but useful for classification.
* Polling systems benefited from one-shot dispatch semantics.
* Event channel strings required exact matching.
* Empty strings from AE did not reliably indicate valid expressions.
* CodeMirror integration depended on single initialization and global exposure.
* CEP CEF parsing behavior differed from modern browsers.

These statements reflect belief-state at the time, not verified invariants.

---

# 4. OPEN LOOPS & RISK REGISTER (AS KNOWN)

At the time of writing, the following uncertainties remained:

* Container-to-leaf promotion accuracy was incomplete.
* Shape subtree coverage was partial and brittle.
* Leaf priority tables risked drift across AE versions.
* Polling behavior when dispatch never occurs was assumed, not proven.
* Bundle export shape mismatches remained a risk.
* Sentinel constant centralization was not enforced.
* Legacy pick-whip logic remained present as historical reference.
* The extent of legacy code removal in V2 was unclear.

---

## 🔒 FINAL NOTE

This document reflects **understanding as it existed**, not **truth as it must remain**.

