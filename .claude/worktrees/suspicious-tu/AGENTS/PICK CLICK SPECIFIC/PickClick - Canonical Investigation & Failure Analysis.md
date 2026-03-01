# **PickClick — Canonical Investigation & Failure Analysis (v1)**

---

## How to Use This Document

* This document is a **read-only reference artifact**.
* It records **what was observed, attempted, and believed at specific points in time**, not what is correct or optimal.
* It should be used to:

  * Orient new agents quickly
  * Prevent historical confusion or overclaiming
  * Ground future investigation in documented reality
* It must **not** be treated as:

  * Proof of impossibility
  * Architectural law
  * A solution guide
* Where uncertainty remains, it is explicitly marked **NEEDS VERIFIED CONTEXT** and should be validated empirically or against the live codebase before any conclusions are drawn.

---

## Epistemic Preamble (Binding)

* All claims are **temporally scoped** to when they were written or observed.
* No document is authoritative by position or confidence of language.
* **Observed runtime behavior outweighs written belief** when conflicts exist.
* Interpretation and prescription are intentionally excluded.

---

## 1. Chronological Timeline of the PickClick Investigation

### Phase 0 — Archival Baseline (Pre-DevArchive)

**Source:** INFO_1.md

* PickClick **successfully resolved selections** in some real tests.
* These successes were:

  * Timing-sensitive
  * Condition-dependent
  * Not reliably repeatable
* Failures were framed as **reliability problems**, not impossibility.
* CEP ↔ After Effects interaction was experimentally probed, not exhaustively mapped.

**State at the time:**
Feasibility considered **open but unstable**.

---

### Phase 1 — Early CEP Interaction Assumptions

**Sources:** DEV_ARCHIVE.md (early entries), KNOWLEDGE_BASE.md

* Initial assumption: CEP could intercept or react to AE timeline or property clicks.
* Observed behavior:

  * CEP listeners were inconsistent or silent under tested conditions.
* Direct interception was deprioritized, not formally disproven.

**State at the time:**
Assumption weakened by observation, not falsified.

---

### Phase 2 — Host-Side Polling Pivot

**Sources:** DEV_ARCHIVE.md, INFO_2.md

* Architecture shifted to ExtendScript polling using `app.scheduleTask`.
* Conceptual lifecycle:

  * Arm → snapshot → poll → dispatch → cancel
* Observed behavior:

  * Polling loops could start and stop
  * Polling often failed to resolve a usable target
  * CPU activity and non-termination occurred

**State at the time:**
Mechanism partially functional; resolution unreliable.

---

### Phase 3 — Comment-Drift Incident

**Sources:** DEV_ARCHIVE.md, INFO_2.md

* Selection helper (`he_U_getSelectedProps`) existed historically.
* It was commented out during experimentation but still referenced.
* Agents misinterpreted commented code as active logic.
* Debugging efforts were repeatedly misdirected.

**Outcome:**
Helper was fully removed to eliminate ambiguity.
This was a **clarifying action**, not a declaration of failure.

---

### Phase 4 — Shape Layer and Group Selection Pathology

**Sources:** DEV_ARCHIVE.md, INFO_2.md

* Selection APIs frequently returned:

  * Groups
  * Containers
  * Non-expression-capable nodes
* Shape layer hierarchies were deep and structurally inconsistent.
* Container-to-leaf traversal and promotion strategies were explored.
* Infinite polling and non-resolution recurred.

**State at the time:**
No stable container → leaf rule established.

---

### Phase 5 — Guarding, Sentinels, and Event Normalization

**Sources:** DEV_ARCHIVE.md, INFO_2.md, KNOWLEDGE_BASE.md

* Guards introduced to prevent:

  * Infinite polling
  * Repeated dispatch
* Sentinel values introduced to represent “no expression”.
* Event channel drift identified and mitigated.

**State at the time:**
Failure severity reduced; core resolution problem remained.

---

### Phase 6 — Strategic Deprioritization

**Sources:** DEV_ARCHIVE.md, KNOWLEDGE_BASE.md

* Interactive pick-whip assessed as high cost with low certainty.
* Focus shifted to editor-first workflows.
* PickClick left in codebase as:

  * Disabled
  * Incomplete
  * Untrusted

**State at the time:**
Feasibility explicitly left **open**; investigation paused.

---

## 2. Per-Document Breakdown

### INFO_1.md — Archival / Pre-DevArchive

**Scope**

* Earliest record of PickClick behavior
* Documents actual partial success

**Evidential Value**

* High for feasibility baseline
* Only source establishing PickClick was not purely theoretical

**Limitations**

* Sparse detail
* No systematic failure taxonomy
* No architectural conclusions

---

### DEV_ARCHIVE.md — Chronological Investigative Record

**Scope**

* Session-by-session log of attempts, failures, pivots, and pauses

**Evidential Value**

* Highest for timeline accuracy
* Primary source for “what happened”

**Limitations**

* Does not prove architectural impossibility
* Does not synthesize root causes

---

### INFO_2.md — Secondary / Low-Level Notes

**Scope**

* Polling lifecycles
* Guards
* Traversal experiments
* Event and sentinel handling

**Evidential Value**

* Moderate
* Useful for mechanism cataloging

**Limitations**

* Duplication and noise
* Not a coherent narrative
* Not authoritative

---

### KNOWLEDGE_BASE.md — Belief-State Compression

**Scope**

* Topic-based summaries of understanding at the time

**Evidential Value**

* Contextual reference only
* Useful for indexing past reasoning

**Limitations**

* Confident phrasing can be misread as fact
* Must be cross-checked against DEV_ARCHIVE.md and INFO_1.md

---

### AGENTS.md — Operational Guidance

**Scope**

* Agent behavior, load order, namespaces, integration rules

**Evidential Value**

* High for operational safety
* Low for investigative truth

**Limitations**

* Omits PickClick failure history
* Can imply PickClick is merely unfinished rather than historically problematic

---

## 3. Integration and Contradiction Mapping

### Contradiction A — “PickClick never worked”

* Contradicted by INFO_1.md (partial success observed)
* Later pessimism formed without full visibility of archival evidence

---

### Contradiction B — “CEP cannot intercept AE clicks”

* Not proven
* Only shown unreliable under tested conditions
  **NEEDS VERIFIED CONTEXT**

---

### Contradiction C — “Polling architecture is fundamentally broken”

* Polling functioned mechanically
* Resolution logic unstable
* No conclusive proof of impossibility

---

### Contradiction D — “Selection helpers were removed because PickClick is unfinished”

* Incomplete framing
* Helpers removed primarily to eliminate debugging ambiguity

---

## 4. Failure Mechanism Catalogue

### FM-1: CEP Event Silence

* **Failure:** CEP listeners did not fire reliably
* **Conditions:** Timeline / property interactions
* **Effect:** No selection intent surfaced

---

### FM-2: Polling Non-Resolution

* **Failure:** Polling failed to resolve valid targets
* **Conditions:** Group or container selections
* **Effect:** Infinite loops or no dispatch

---

### FM-3: Container Selection Pathology

* **Failure:** Selection APIs returned non-leaf nodes
* **Conditions:** Shape layers, groups
* **Effect:** Ambiguous intent, stalled resolution

---

### FM-4: Comment-Drift Misdirection

* **Failure:** Human interpretation of code state
* **Conditions:** Commented helpers still referenced
* **Effect:** Debugging time lost

---

### FM-5: Event Channel Drift

* **Failure:** Event delivery
* **Conditions:** Inconsistent CSXSEvent names
* **Effect:** Silent failures

---

### FM-6: Empty Expression Handling

* **Failure:** Editor safety
* **Conditions:** AE returned empty strings
* **Effect:** Editor wipes

---

## 5. Explicit Unknowns and Assumptions

All items below remain unresolved and require validation:

* Whether CEP click interception is possible under different constraints
  **NEEDS VERIFIED CONTEXT**
* Whether polling timing can be stabilized reliably
  **NEEDS VERIFIED CONTEXT**
* Whether container → leaf promotion can be made safe and predictable
  **NEEDS VERIFIED CONTEXT**
* Whether Shape Layer traversal rules are AE-version dependent
  **NEEDS VERIFIED CONTEXT**
* Whether PickClick failure was architectural or implementation-specific
  **NEEDS VERIFIED CONTEXT**

---

## 6. Closing Statement (Non-Actionable)

* PickClick was not purely hypothetical.
* It partially worked, then failed primarily on reliability, timing, and selection ambiguity.
* Later documents increasingly framed uncertainty as limitation.
* No document conclusively proves impossibility.
* The investigation concluded with feasibility explicitly unresolved.

---

**End of Document**
