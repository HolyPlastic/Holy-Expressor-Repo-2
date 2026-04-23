PICKCLICK DOC MAP

* `See: [Failure Analysis](<PickClick - Canonical Investigation & Failure Analysis.md>)`
- `See: [Info 1](Info_1.md)`
- `[← Back to Start](../00_START_HERE.md)`

## 🧠 PICKCLICK — MAIN DEVELOPMENT BEATS (VERY HIGH LEVEL)

* PickClick was explored multiple times as a selection-driven, pick-whip-like UX triggered from a CEP panel.
* Early attempts assumed CEP could react to AE timeline clicks; this did not reliably work under tested conditions.
* Architecture shifted to host-side polling via ExtendScript (app.scheduleTask) to infer selection changes.
* PickClick could arm and cancel, but repeatedly failed to resolve based on timeline interaction.
* Confusion arose around a selection helper that existed, was commented out, and later fully removed.
* No iteration reached a stable, correct, or fully trusted implementation; feasibility remains open.

---

## 📁 DEV_ARCHIVE.md — WHY IT MATTERS

* Chronological, session-scoped record of what was attempted and observed.
* Documents specific PickClick runs, including arming behavior, polling loops, and failure modes.
* Records the comment-drift incident and resulting debugging confusion.
* Explicitly preserves uncertainty and lack of final conclusions.
* Shows how and why investigation paused or pivoted at different times.
* Best source for timeline truth, not architectural authority.

---

## 📁 KNOWLEDGE_BASE.md — WHY IT MATTERS

* Topic-based compression of understandings as they existed at the time.
* Summarizes PickClick eras, polling concepts, selection path issues, and constraints.
* Previously written as authoritative; now rewritten to remove implied certainty.
* Captures how PickClick was understood, not whether those understandings were correct.
* Useful as an index of prior reasoning, not proof.
* Relevant for orienting new agents quickly.

---

## 📁 AGENTS.md — WHY IT MATTERS

* Defines how agents are expected to interact with the codebase and docs.
* Mentions PickClick as a module without full historical failure context.
* Can cause agents to assume PickClick is merely unfinished rather than problematic.
* Needs to be read with epistemic caution post-rewrite.
* Operational, not investigative, in nature.
* Relevant because it shapes agent behavior and assumptions.

---

## 🧾 DEV LOG RULES (FACTUAL / TEMPORAL MODE) — WHY THEY MATTER

* Define the epistemic framework now governing documentation.
* Forbid absolute, future-binding, or canonical language.
* Require all statements to be time-scoped and observational.
* Allow contradictions and preserve historical mistakes.
* Apply equally to Dev Archive and Knowledge Base now.
* Critical for preventing future PickClick confusion and overclaiming.

---

## 📁 INFO_1.md — WHY IT MATTERS (ARCHIVAL / PRE-DEVARCHIVE)

* Collected by an original archival agent before DEV_ARCHIVE.md existed.
* Canonically **earlier in the timeline** than Dev Archive, Knowledge Base, and later design decisions.
* Records partial, real PickClick successes under specific conditions, not hypothetical designs.
* Establishes that PickClick failures were primarily about **reliability and timing**, not outright impossibility.
* Contains evidence that some later assumptions were made **without this information in view**.
* Critical for re-opening PickClick with historical blind spots corrected.

---

## 📁 INFO_2.md — WHY IT MATTERS (TRANSCODING NOTES / SECONDARY)

* Appears to be notes captured during or around the transcoding of earlier archival material into DEV_ARCHIVE.md.
* Contains duplication and noise, but also low-level implementation detail.
* Provides granular insight into polling lifecycles, guards, event channels, and failure mechanics.
* Not a clean narrative source; best treated as **raw substrate**, not authority.
* Useful for engineers auditing or reviving PickClick logic at the code level.
* Should be read cautiously and always cross-checked against the live codebase.

### 🔎 INFO_2.md — NAVIGATION POINTERS FOR NEW AGENTS

When scanning Info_2.md, the following areas are most relevant to PickClick revival:

* **Host-side polling lifecycle** — sections describing `app.scheduleTask`, arm → snapshot → poll → dispatch → cancel patterns.
* **Polling guards & stop conditions** — notes on one-shot dispatch, dedupe logic, and failure to terminate loops.
* **PickVeil UX mechanics** — timing, cancellation, and event-capture issues (not the core blocker, but clarifying).
* **Event channel normalization** — discussion of CSXSEvent naming drift and why a single channel mattered.
* **Sentinel / empty-expression handling** — rationale for `__NO_EXPRESSION__` and editor safety.
* **Group / container selection pathology** — why groups never resolve, infinite loops occurred, and why dispatch-on-anything was adopted.
* **Shape Layer traversal notes** — hybrid `.name` vs `.matchName`, bounded DFS, and mis-target risks.

These pointers are **guidance only**, not an exclusion list. Other sections may still prove relevant depending on the revival approach.
