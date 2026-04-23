PICKCLICK / PICKVEIL — HISTORICAL RECORD

────────────────────────────────────
SECTION A — Historical Functionality Report
(Observed behavior, partial success, failure modes, conceptual model)
────────────────────────────────────

# 🧾 PICK-CLICK / PICKVEIL — HISTORICAL FUNCTIONALITY REPORT

*(Temporal reconstruction, non-authoritative)*

---

## 🧭 Context (at the time)

At the time this functionality was explored, the goal was to allow a user to:

* Click a **Pick / Pick-Click button** inside the CEP panel
* Enter a temporary **“armed” state**
* Click a **property in the After Effects timeline**
* Have that property’s reference, path, or expression-compatible handle **loaded into the plugin UI**

A visual overlay referred to informally as **PickVeil** was introduced to indicate that the panel was in this armed state and to discourage interaction with the panel UI itself.

---

## 🔘 What was attempted

### 1. Pick mode activation inside the CEP panel

* A button inside the panel toggled a **pick mode state flag** in JS.
* When active, a semi-transparent overlay (PickVeil) visually covered the panel.
* The overlay did not block After Effects UI interaction, only panel interaction.

**Action taken:**
Pick mode was entered via a UI button. Internal state reflected “armed”.

---

### 2. Deferring interaction to After Effects UI

* While PickVeil was active, the expectation was that the next user click would occur **outside the CEP panel**, typically in:

  * The timeline
  * A property row
  * A transform or effect property

**Action taken:**
User clicked a property in the AE timeline while pick mode remained active.

---

### 3. Reading selection or active property from JSX

* ExtendScript (`.jsx`) functions were used to query:

  * `app.project.activeItem`
  * `comp.selectedProperties`
  * `comp.selectedLayers`
* The query was triggered after a delay or on a polling interval while pick mode was active.

**Action taken:**
JS called into JSX via `csInterface.evalScript()` after the external click.

---

## 👁️ What was observed

### ✅ Partial success was observed

* At the time of testing, there were **confirmed cases** where:

  * Pick mode was armed
  * A property was clicked in the AE timeline
  * The JSX query returned a **non-empty result**
  * The returned property reference was **successfully injected into the plugin UI**

This outcome was **observed during active development sessions** and was not hypothetical.

---

### ⚠️ Behavior was inconsistent

* The same sequence did **not** consistently succeed.
* Identical actions sometimes resulted in:

  * No property being returned
  * The previously selected property being returned instead
  * A layer reference instead of a property reference
* The inconsistency was observed **without code changes** between attempts.

---

### ⚠️ Timing sensitivity was observed

* Success appeared sensitive to:

  * How quickly the property was clicked after arming
  * Whether the timeline already had focus
  * Whether another UI interaction occurred in between
* In some sessions, inserting a short delay before querying selection appeared to correlate with more frequent success, though this was not confirmed as causal.

---

### ⚠️ Selection model ambiguity

* At the time, After Effects did not appear to expose a clean “last clicked property” concept to JSX.
* Queries relied on **current selection state**, not the click event itself.
* This meant the system inferred intent indirectly rather than receiving a direct signal.

---

## 🧱 PickVeil overlay behavior

* PickVeil was a **CEP-side visual overlay only**.
* It did not intercept AE UI clicks.
* It served as:

  * A visual indicator
  * A soft guard against interacting with the panel during pick mode

**Observed limitation:**
PickVeil did not guarantee that the next AE click would register as a new selection in time for the JSX query.

---

## 🔁 Exit from pick mode

* Pick mode was typically exited when:

  * A property reference was received
  * Or the user cancelled
* In some cases, pick mode exited without a valid property being captured.

This was treated as a failed attempt rather than a crash.

---

## 🧩 Why it appeared to work (at the time)

Based on observations only (not a definitive explanation):

* The system appeared to work when:

  * AE selection state updated quickly enough
  * The JSX query occurred after that update
* The system appeared to fail when:

  * Selection state lagged
  * AE focus did not change as expected
  * The clicked UI element did not register as a “selected property” in JSX terms

These are **descriptions of observed correlation**, not confirmed mechanisms.

---

## 🧨 Known problems observed at the time

* No reliable event hook for “property clicked” was identified.
* Polling selection state was inherently race-condition-prone.
* CEP could not listen directly to AE timeline interaction events.
* JSX had limited introspection into UI intent.

None of these issues were fully resolved during that phase.

---

## 🧾 Historical conclusion (non-absolute)

* At the time of development, **Pick-Click functionality did achieve partial, real success**.
* That success was **context-dependent**, **timing-sensitive**, and **not repeatable with confidence**.
* The feature was not abandoned because it was impossible, but because its behavior could not be made reliable under the conditions tested at the time.

This report records **what was observed**, not what is true now.


────────────────────────────────────
SECTION B — Exact Technical Call Chain (Non-Inferred)
(Strict CEP → JSX → CEP mechanics, known vs unknown)
────────────────────────────────────

# 🧾 PICK-CLICK — EXACT TECHNICAL CALL CHAIN (HISTORICAL, NON-INFERRED)

*(This document records only what was explicitly present or observed at the time.
No missing steps are filled in. No code is invented.)*

---

## 1️⃣ CEP-SIDE: Pick mode activation

### What was present

* A **button in the CEP panel UI** existed that initiated pick mode.
* Activating this button:

  * Set an internal JS state indicating pick mode was active.
  * Displayed a semi-transparent overlay referred to as **PickVeil** over the panel UI.

### What is explicitly known

* PickVeil existed purely in **CEP HTML/CSS/JS**.
* PickVeil did **not** block After Effects UI interaction.
* PickVeil did block or discourage interaction with the plugin panel UI itself.

### What is not known

* The exact variable name used to store pick mode state.
* Whether pick mode was toggled via a boolean, enum, or function scope.

---

## 2️⃣ CEP-SIDE: Waiting for external interaction

### What was present

* After pick mode was activated, **no immediate JSX call was made**.
* The system waited for the user to click **outside the panel**, typically in:

  * The After Effects timeline
  * A property row

### What is explicitly known

* There was **no direct event listener** for timeline clicks.
* CEP did **not** receive click events from the AE UI.

### What is not known

* Whether the wait was implemented via:

  * A timeout
  * A polling interval
  * A second user action (for example a confirm click)

---

## 3️⃣ CEP → JSX bridge invocation

### What was present

* After the external click, CEP invoked JSX using:

  **`csInterface.evalScript(...)`**

This is explicitly confirmed.

### What is explicitly known

* `CSInterface.js` was present and used.
* The evalScript call targeted **existing JSX files** under `/jsx/Modules/`.
* The call was made *after* pick mode was armed, not before.

### What is not known

* The exact JS function that triggered `evalScript`.
* The exact timing mechanism that decided *when* to call `evalScript`.

---

## 4️⃣ JSX-SIDE: Selection query

### What was present

* JSX code queried **current After Effects selection state**.
* The query did **not** receive click event data.
* The query relied on what AE exposed at that moment.

### What is explicitly known

From prior summaries and file names, JSX access included:

* `app.project.activeItem`
* Composition context
* Selection state such as:

  * Selected layers
  * Selected properties

These capabilities were explicitly used elsewhere in the project and were part of the pick-click experiment.

### What is **not** claimed

* No claim is made that JSX could detect “last clicked property”.
* No claim is made that JSX had a reliable property-click API.

---

## 5️⃣ JSX → CEP data return

### What was present

* JSX returned a **string or structured value** back to CEP via `evalScript`’s callback.
* The returned value sometimes represented:

  * A property reference
  * A property path
  * Or sufficient data to reconstruct one in CEP

### What is explicitly known

* There were **confirmed cases** where:

  * A non-empty value was returned
  * CEP received it
  * The plugin UI updated accordingly

### What is not known

* The exact format of the returned value.
* Whether the value was JSON, a delimited string, or a raw expression path.

---

## 6️⃣ CEP-SIDE: UI injection

### What was present

* When CEP received a valid result from JSX:

  * The value was inserted into the plugin UI.
  * This insertion occurred in the **expression / input area**.

### What is explicitly known

* This step completed successfully in some sessions.
* PickVeil was dismissed after insertion or cancellation.

### What is not known

* The exact function that performed the UI insertion.
* Whether validation occurred before insertion.

---

## 7️⃣ Failure modes observed at the time

### Explicitly observed

* The same process sometimes returned:

  * No value
  * A stale value
  * A layer instead of a property

### Explicitly observed

* These failures occurred **without code changes**.
* Timing and focus appeared to influence outcomes, but no causal mechanism was confirmed.

---

## 8️⃣ Summary of what *did* exist (non-absolute)

At the time of writing those earlier sessions:

* CEP → `csInterface.evalScript()` → JSX → selection query → CEP UI injection
  **did occur end-to-end at least occasionally**.

* The system relied on **selection state**, not direct UI events.

* The system had **no guaranteed synchronization point** between:

  * User click in AE
  * JSX query timing

---

## 9️⃣ Explicit unknowns (intentionally preserved)

* Exact JSX function names
* Exact data schema returned
* Exact timing mechanism
* Exact failure thresholds

These gaps are preserved deliberately to avoid overclaiming.

---

### Final note (procedural, not prescriptive)

This document records **only what existed and was observed at the time**.
It does **not** assert that the same mechanism is valid now, nor that it can be made reliable without changes.

