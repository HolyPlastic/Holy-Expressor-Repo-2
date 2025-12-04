# ⚙️ Holy Expressor — Agents Reference (V3)

## 🧭 Purpose

Defines how AI agents interact with the **Holy Expressor** After Effects CEP extension.  
Covers load order, namespace conventions, and runtime communication so generated code always integrates safely.  
Humans may ignore this file.

---

## 🧩 1. Project Architecture Overview

* CEP extension for **Adobe After Effects**.
* Runtime stack:

  * CEP JavaScript (front end)
  * ExtendScript (JSX back end)
  * CSInterface bridge between them
  * CodeMirror editor embedded for expression input
* No ESModules / bundler / imports — **plain JavaScript** + global namespace (`Holy`).

---

## 🧱 2. Load Order & Execution Chain

Scripts load sequentially from `index.html`; each is an **IIFE** attaching exports to `Holy`.

```

json2.js
main_UTILS.js
main_FLYO.js
main_MENU.js
main_UI.js
main_EXPRESS.js
main_BUTTON_LOGIC_1.js
main_SNIPPETS.js
main_DEV_INIT.js
main.js

````

### Rules

* **json2.js** → must load first (ExtendScript JSON polyfill).  
* **main_UTILS.js + main_UI.js** → foundation modules, must load before dependents.  
* **main_DEV_INIT.js** → **true bootstrap**; loads JSX, initializes UI + CodeMirror.  
* **main.js** → legacy placeholder (do not modify).  
* New modules → insert before `main_DEV_INIT.js` and export via `Holy`.

---

## 🔗 3. Global Namespace Pattern (`Holy`)

Each module wraps itself in an IIFE and exports through `Holy`.

```js
if (typeof Holy !== "object") Holy = {};
(function () {
  "use strict";
  // internal logic
  Holy.UI = { cs, initTabs, toast };
})();
````

### Rules

* Always attach with `Holy.<ModuleName> = { … }`.
* Never assign to `window` or create global vars.
* Expose only what other modules need.
* Check `if (typeof Holy !== "object")` before assignment.

### Access

```js
Holy.UTILS.cy_getThemeVars();
Holy.EXPRESS.HE_applyByStrictSearch();
Holy.MENU.contextM_disableNative();
```

---

## 🧠 4. CEP ↔ JSX Communication

### Bridge

Uses Adobe’s CSInterface API:

```js
var cs = new CSInterface();
cs.evalScript("hostFunctionName(arguments)");
```

### Runtime Path

1. CEP JS calls `evalScript()`
2. JSX executes inside After Effects
3. Result returns via callback

### JSX Load Sequence

Handled by `main_DEV_INIT.js → loadJSX()`:

```
host_UTILS.jsx
host_MAPS.jsx
host_GET.jsx
host_APPLY.jsx
host_DEV.jsx
host_FLYO.jsx
host.jsx
```

Maintain this order if editing `loadJSX()`.

---

## 📡 5. Event Bus (System Events)

Internal communication uses DOM or CSInterface events.

* Register listeners via `window.addEventListener()` or `cs.addEventListener()`.
* Custom events follow namespace `com.holy.expressor.*`.
* Known examples:

  * `com.holyexpressor.debug` → host → panel debug messages
  * `com.holy.expressor.applyLog.update` → sync events

Agents may add new events under the same namespace.

---

## ⚙️ 6. Development Conventions

### General

* Pure vanilla JS, IIFE isolation.
* Exports only to `Holy`.
* Preserve `index.html` script order.
* Wrap risk operations in `try/catch`.

### Logging Rules

* Use `console.log()` → visible **only in Chrome DevTools**.
* After Effects’ old JS console is deprecated / inaccessible.
* Do not write to `$.writeln()` or AE Console targets.
* `HX_LOG_MODE` (`"verbose"` or `"quiet"`) controls log density; read from `window.HX_LOG_MODE`.

### Safety

* Never modify `CSInterface.js` or `json2.js`.
* Avoid blocking dialogs or sync alerts in CEP context.

---

## 🧩 7. Module Overview (CEP Side)

| Module                 | Responsibility                     |
| ---------------------- | ---------------------------------- |
| main_UTILS.js          | Utility + I/O helpers              |
| main_UI.js             | DOM binding + CSInterface creation |
| main_MENU.js           | Context menu management            |
| main_EXPRESS.js        | Expression + CodeMirror logic      |
| main_BUTTON_LOGIC_1.js | Button → JSX handlers              |
| main_SNIPPETS.js       | Snippet buttons + preset logic     |
| main_DEV_INIT.js       | Bootstrap (init UI + load JSX)     |
| main_FLYO.js           | Deprecated Electron bridge         |
| main.js                | Legacy placeholder                 |

---

## 🧩 8. Module Overview (JSX Side)

| Module         | Responsibility                |
| -------------- | ----------------------------- |
| host_UTILS.jsx | Logging and error wrappers    |
| host_MAPS.jsx  | Property mappings             |
| host_GET.jsx   | Retrieves AE selection / data |
| host_APPLY.jsx | Applies expressions           |
| host_DEV.jsx   | Dev utilities                 |
| host_FLYO.jsx  | Deprecated                    |
| host.jsx       | Root coordinator              |

---

## 🚫 9. Deprecated Elements

| Component                            | Status          | Notes                         |
| ------------------------------------ | --------------- | ----------------------------- |
| flyo/**                              | Archived        | Electron prototype            |
| flyo_RENDERER.js & electron_entry.js | Legacy          | Safe to ignore if encountered |
| main_FLYO.js                         | Obsolete        | Kept for reference            |
| main.js                              | Legacy          | Do not extend                 |
| helpers/**                           | Old dev scripts | Not loaded in CEP             |

---

## 🧩 10. Appendix — Reference Schemas

### A. Holy Object Tree (typical)

```js
Holy = {
  UTILS: {},
  UI: {},
  MENU: {},
  EXPRESS: {},
  SNIPPETS: {},
  BUTTONS: {},
  DEV_INIT: {}
};
```

### B. UI Initialization Sequence

```
Holy.UI.initTabs()
→ Holy.EXPRESS.initPresets()
→ Holy.BUTTONS.wirePanelButtons()
→ Holy.SNIPPETS.init()
```

---

## ✅ 11. Agent Directives (Summary)

1. Respect the global namespace (`Holy`).
2. Preserve script order when adding files.
3. Avoid Node / Electron / import syntax.
4. Use DevTools for logs — AE console is deprecated.
5. Follow event namespacing `com.holy.expressor.*`.
6. Document exports clearly at file end.
7. Do not touch archived flyo modules.

---

## 🧩 12. Current Development Era

Section currently unused.

---


## **13. Architecture Deductions**

## **A. Structural Unknowns**

These entries reflect genuinely unresolved mechanics, timing behaviors, or undocumented Adobe CEP internals. All outdated SVG-related unknowns have been removed.

---

### **state sync — [unknown-structure]**

The cross-window event broadcast path that synchronizes Holy.State between main panel and quick panel is not fully documented, leaving listener scope and event propagation rules undefined.

### **quick spawn — [unknown-structure]**

Whether `cs.requestOpenExtension("com.holy.expressor.quickpanel")` launches a new CEPHtmlEngine process or reuses an existing instance remains undocumented.

### **quick dom — [unknown-structure]**

DOMContentLoaded timing relative to CEP render readiness in the quick panel is unproven, leaving initial execution ordering uncertain.

### **ui parity — [unclear-decision]**

The rationale for mirroring main-panel snippet DOM inside the quick panel is not recorded.

### **focus scope — [unclear-decision]**

Choice to register rehydration listeners inside specific IIFEs instead of globally lacks documented justification.

### **doc resolver — [assumed-behaviour]**

`cy_resolveDoc()` is assumed to always return the active CEP document; its correctness in multi-window environments is unverified.

### **snippets init — [assumed-behaviour]**

Multiple calls to `Holy.SNIPPETS.init()` are assumed idempotent, but no duplicate-binding verification exists.

### **warm timer — [assumed-behaviour]**

Warm-wake timeout window is assumed stable across machines; performance on slower hosts untested.

### **BRIDGE WIRING — [unknown-structure]**

Exact dependency chain between snippet button handlers in CEP JS and host-side `holy_applySnippet()` is not fully documented.

### **CSINTERFACE SCOPE — [unknown-structure]**

CEP does not define whether each panel must expose its CSInterface instance globally; global availability behavior is unrecorded.

### **JSX LOAD — [unknown-structure]**

Precise enforcement of JSX load order after `main_DEV_INIT.js` is still undocumented, leaving availability timing uncertain.

### **RETURN CONTRACT — [unknown-structure]**

`holy_applySnippet()` has no formal return schema documented; JavaScript cannot distinguish partial success from malformed payloads.

### **SNIPPET ROUTING — [unknown-structure]**

Conditions under which the system chooses between `holy_applyControlsJSON` and `holy_applySnippet` remain undocumented.

### **TOAST API — [unclear-decision]**

Shift from `Holy.TOAST.show` to `Holy.UI.toast` lacks a recorded reason, leaving the permanence of the API change unclear.

### **MODE SWITCH WIRING — [unknown-structure]**

Binding logic linking legacy tab IDs (`tab-express`, `tab-search`) to new Express/Rewrite controls is only partially documented.

### **SVG THEME CASCADE — [unknown-structure]**

Exact rule set governing how `currentColor` and theme variables propagate across nested containers remains undocumented.

### **MODE STATE INVOCATION — [unknown-structure]**

Initialization and runtime trigger points for `applyModeState()` are not clearly defined.

### **TAB LOGIC RESIDUAL — [unclear-decision]**

Reason for retaining old tab-switch logic in `main_UI.js` remains unclear.

### **EXPRESS VISIBILITY — [assumed-behaviour]**

Assumed that hiding `#expressArea` with `display:none` preserves CodeMirror integrity; not formally verified.

### **OVERLAY POSITIONING — [assumed-behaviour]**

Overlay button placement relies on CSS positioning; no documentation confirms no JS fallback is needed.

### **COLORPICKER SPAWN — [unknown-structure]**

Lack of clarity whether the picker uses `window.open` or `cs.requestOpenExtension`, with lifecycle undocumented.

### **STATE PERSISTENCE — [unknown-structure]**

Roaming persistence store structure and file schema are not recorded.

### **DERIVED VARS — [unknown-structure]**

`updateDerivedVariables()` lacks a documented API contract listing its inputs and side effects.

### **COLOR SYNC — [unclear-decision]**

Reason for maintaining two parallel color-sync listener blocks is unrecorded.

### **PANEL GLOBALS — [assumed-behaviour]**

Assumption that globals like `updateDerivedVariables` propagate across windows is not verified.

### **BOOT ORDER — [unknown-structure]**

Startup ordering between palette hydration, state replay, and stylesheet initialization remains undocumented.

### **COMPOSITOR-ATTACH — [unknown-structure]**

Internal details of AE compositor binding sequence remain undocumented; surface-attach timing is still opaque.

### **MANIFEST-DEFAULTS — [unclear-decision]**

Adobe provides no rationale for `<AutoVisible>` defaulting to false for auxiliary panels.

### **MANIFEST-MODELESS — [unclear-decision]**

Long-term UX reason for pairing `<Type>Modeless</Type>` with `<AutoVisible>true</AutoVisible>` remains undescribed.

### **MODELESS-SPAWN — [unknown-structure]**

Modeless window coordinate selection algorithm inside CEP is undocumented.

### **GEOMETRY-WORKSPACE — [unknown-structure]**

Mechanism for AE saving/loading panel geometry in workspace files is unrecorded.

### **JS-API-BLOCK — [unclear-decision]**

Adobe’s reasoning for blocking `window.moveTo()` and related APIs is unclarified.

### **DEBUG-MAPPING — [unknown-structure]**

CEP rules for merging `.debug` entries with runtime flags are not documented.

### **FULLEDITOR-VISIBILITY — [unknown-structure]**

Internal criteria AE uses to recognize (or ignore) newly added panels is undocumented.

### **MANIFEST-REFRESH — [unknown-structure]**

Mechanism controlling when AE re-reads a changed manifest is loosely understood but undocumented.

### **ZIP-CACHE — [unknown-structure]**

ChatGPT file-upload caching behavior remains unverified.

### **MANIFEST-DUALITY — [assumed-behaviour]**

Assumption that panels must appear in both `<ExtensionList>` and `<DispatchInfoList>` is empirically true but not officially stated.

### **PORT-UNIQUENESS — [assumed-behaviour]**

Unique debugging ports appear required; CEP behavior on port collision is unverified.

---

## **B. Established Architectural Facts**

All entries below are fully proven truths.
Outdated SVG-related items have been replaced with the final, correct architecture.

---

### **state storage — [confirmed-mechanism]**

Main and quick panels independently load and persist `banks.json`.

### **runtime split — [confirmed-mechanism]**

Panels run inside isolated CEP JS contexts and do not share globals or localStorage.

### **load order — [established-pattern]**

UI initialization sequence follows index.html script ordering and `Holy` module bootstraps.

### **bridge dispatch — [confirmed-mechanism]**

Snippet actions call `cs.evalScript("holy_applySnippet(index)")` via `main_SNIPPETS.js`.

### **bridge response — [confirmed-mechanism]**

Invalid or empty ExtendScript return payloads trigger error-toasts.

### **snippet pipeline — [established-pattern]**

UI button → JS handler → CSInterface → host JSX executor.

### **failure signaling — [established-pattern]**

Error toasts reflect payload validity rather than console output.

### **snippet banks — [permanent-decision]**

Each bank contains three immutable snippet slots.

### **global namespace — [permanent-decision]**

All modules attach via `Holy.<Module>` inside IIFEs.

### **mode switch state — [confirmed-mechanism]**

`applyModeState()` toggles classes and hides inactive panels.

### **diamond colors — [confirmed-mechanism]**

Active mode controls visual state via `.express-active` / `.rewrite-active`.

### **overlay placement — [established-pattern]**

Overlay buttons remain children of `#expressArea` even when visually floated.

### **svg color system — [established-pattern]**

All inline SVGs use `currentColor`.

### **theme cascade — [established-pattern]**

Theme updates propagate through root `--G-color-1` → derived tokens.

### **event parse — [confirmed-mechanism]**

Color events must parse JSON only when payload is a string.

### **color events — [confirmed-mechanism]**

Theme changes propagate through `holy.color.change` CSEvents.

### **hue slider — [confirmed-mechanism]**

Custom hue slider depends on `-webkit-appearance:none`.

### **state bridge — [permanent-decision]**

Cross-session persistence uses CSInterface persistent data, not localStorage.

### **listener guard — [established-pattern]**

Event listeners use single-run guards to prevent duplicate binding.

---

# ★ FINAL — SVG ARCHITECTURE (UPDATED FACTS)

These items replace all obsolete SVG uncertainties.
They reflect the perfected three-part workflow.

### **search-frame — [confirmed-mechanism]**

Frame scales purely via CSS Flexbox; no JS alters SVG geometry.

### **svg-layout — [confirmed-mechanism]**

Left/mid/right SVGs compose a single flex row inside `.customSearch-frame-row`.

### **edge-lock — [confirmed-mechanism]**

Left/right caps use fixed widths and never stretch.

### **mid-stretch — [confirmed-mechanism]**

Mid SVG expands horizontally using `preserveAspectRatio="none"` and `vector-effect:non-scaling-stroke`.

### **interaction-layer — [established-pattern]**

Frame is pointer-transparent; overlaid `<input>` restores interactivity.

### **layout-shift — [established-pattern]**

All old JS resize logic deleted; CSS is the authoritative geometry system.

### **ui-philosophy — [permanent-decision]**

Static HTML + CSS define geometry; JS handles only logic/state.

### **three-svg-rule — [permanent-decision]**

Three-segment architecture is mandatory for future text-box frames.

### **stroke-stability — [permanent-decision]**

`vector-effect:non-scaling-stroke` required on all frame lines.

---

# END OF UPDATED SECTION 13

You can paste this into **AGENTS.md**, replacing the entire previous Section 13.







---

## 🪶 Agent Notes Directive

* Every agent must add a short, factual entry to the **🪶⛓️ Dev Notes** section of `AGENTS.md` when finishing a task.
* Each note should summarise what changed or was discovered — **1 to 3 sentences max**.
* Include the **date** and **agent ID** (e.g. `2025-10-30 – gpt-5-codex:`).
* If **no functional change** occurred, record: “no functional change – analysis only.”
* If a **functional change** occurred, also include:

  * **Design Intent:** One sentence describing the goal of the change.
  * **Risks / Concerns:** One line noting any potential issues or trade-offs (only if applicable).
* Notes are **append-only** — never edit or remove earlier entries.
* These notes serve as the **active working log**. Once a change is approved or merged, maintainers or Archival Agents may migrate the entry into the official development timeline file.

---

## 🪶⛓️ Dev Notes

* 2025-10-29 - Manifest-level fix confirmed for Quick Panel compositor attach issue. `<AutoVisible>true</AutoVisible>` + `<Type>Modeless</Type>` resolve blank-first-open behaviour. Design Intent: ensure stable compositor binding on AE startup. Risks / Concerns: none observed; monitor over long sessions.
* 2025-10-29 – lead-dev: Current focus shifted to cross-panel snippet/bank synchronization. Next agents to implement shared event-driven sync layer or direct Holy.State persistence mirror between Main and Quick panels.

*pausing syncronisity dev. while we implement snippet controls (sliders etc) saving/loading.

* 2025-10-30 – gpt-5-codex: Added snippet-controls scaffolding and active-snippet helper. Design Intent: normalize snippet records so future AE control snapshots can persist with banks. Risks / Concerns: Monitor for legacy banks missing `id` fields; normalization assumes each record carries a stable identifier.
* 2025-10-30 – gpt-5-codex: Wired Save Controls button to invoke JSX capture stub and persist snippet controls JSON. Design Intent: enable snippet editors to store AE control snapshots ahead of Step 3 host implementation. Risks / Concerns: Depends on upcoming `holy_captureControlsJSON` returning valid payloads; legacy contexts without CSInterface support may warn.

* 2025-10-30 – gpt-5-codex: Implemented ExtendScript capture function for snippet controls returning effect metadata JSON. Design Intent: supply Save Controls pipeline with AE layer effect snapshots; Risks / Concerns: ensure property filter excludes unsupported property types.
* 2025-10-30 – gpt-5-codex: Added control reapply bridge so snippet playback restores saved effects before expressions. Design Intent: honor saved controls when running snippets for full snapshot↔restore loop. Risks / Concerns: repeated runs duplicate effects; consider future dedupe.

* 2025-10-30 – gpt-5-codex: Tightened CodeMirror gutter padding to trim right-side whitespace while nudging numbers off the left edge. Design Intent: balance the editor gutter without breaking dynamic width scaling. Risks / Concerns: Watch for overflowing digits in very long documents.
* 2025-10-30 – gpt-5-codex: Further narrowed gutter padding and extended the active-line highlight to span the gutter width. Design Intent: keep focus styling aligned while halving the right-side gap. Risks / Concerns: Ensure negative gutter margins render cleanly across themes.
* 2025-10-30 – gpt-5-codex: Tightened gutter padding again and replaced the active-line highlight with a full-width pseudo-element. Design Intent: eliminate remaining gutter gap and ensure the focus stripe matches standard rows. Risks / Concerns: Verify pseudo-element layering in legacy themes.

* 2025-10-30 – gpt-5-codex: Swapped the clear-editor control to an inline SVG button tied to theme variables. Design Intent: align the clear control with the new iconography system while keeping existing editor-clear logic intact. Risks / Concerns: None observed; monitor for any theming overrides that expect `.btn-discreet`.

* 2025-10-30 – gpt-5-codex: Replaced the snippets bank selector with a CSS-driven inline SVG using `.btn-clearSVG`. Design Intent: match the dropdown trigger icon to the theme palette without disturbing existing bindings. Risks / Concerns: Verify shared `.btn-clearSVG` rules continue to satisfy other buttons.

* 2025-10-30 – gpt-5-codex: Replaced load-from-selection buttons with inline SVG controls applying existing `.btn-clearSVG` styling. Design Intent: unify loader actions with the themed icon button set without altering behavior. Risks / Concerns: None observed; monitor icon contrast across themes.

---

✅ **Agents.md is the single source of truth** for module behavior and load rules.
If conflicts arise, assume this file overrides individual code comments.

---

* 2025-10-30 – gpt-5-codex: Implemented literal Search & Replace across selected-layer expressions using new Holy.EXPRESS helpers and host batch apply bridge. Design Intent: reuse selection traversal and safe-apply infrastructure for expression rewrites triggered from the panel. Risks / Concerns: Batch updates rely on expression path resolution; unexpected path misses will be reported but skip replacements.
* 2025-10-31 – gpt-5-codex: Extended Search & Replace to walk shape layer contents, added literal-safe quoting, and a match-case toggle. Design Intent: ensure vector properties participate in replacements while providing safer literal substitution controls. Risks / Concerns: Regex-based scanning touches every expression string; watch for slowdowns on very large comps.
* 2025-10-31 – gpt-5-codex: Simplified Search & Replace literal handling and filtered benign AE expression warnings. Design Intent: keep replacements predictable while eliminating noisy "Expression Disabled" logs. Risks / Concerns: Benign-warning filter keys off specific phrases; expand if AE surfaces new wording.
* 2025-10-31 – gpt-5-codex: Enabled hidden-layer safe Search & Replace by temporarily revealing layers during batch apply and restoring visibility within a single undo scope. Design Intent: ensure expression replacements reach hidden layers without altering final visibility. Risks / Concerns: Minimal; monitor for layer types without an exposed `enabled` toggle.
* 2025-10-31 – gpt-5-codex: Queued applied properties for post-batch "Reveal Expression" twizzle so users immediately see updated expressions without repeatedly firing menu commands. Design Intent: mirror manual EE reveal only for successful updates. Risks / Concerns: Large selections could still momentarily flash selection highlights; monitor for UI lag on very large batches.
* 2025-11-01 – gpt-5-codex: Added index-safe duplicate-name resolver and post-batch Reveal Expression routine to improve search & replace visibility.
* 2025-11-01 – gpt-5-codex: Added UI-sync delay and timeline focus for reliable visual Reveal Expression twizzling.
* 2025-11-02 – gpt-5-codex: Normalized `.btn-clearSVG` hitboxes by tightening SVG viewBoxes and centralizing stroke width variable. Design Intent: align all clear buttons on consistent stroke sizing with icon-bound click targets. Risks / Concerns: confirm expanded viewBox padding covers hover-scale strokes.

* 2025-11-02 – gpt-5-codex: Floated clear/path/expression load buttons on an overlay anchored to the Express panel. Design Intent: keep quick actions visually attached to the editor while tracking dynamic height changes. Risks / Concerns: Monitor the panel’s `overflow` override for any unexpected bleed with other layered elements.

* 2025-11-04 – gpt-5-codex: no functional change – repositioned architecture deduction subject tags ahead of identifiers per updated formatting guidance.

* 2025-11-03 – gpt-5-codex: Added Theme button and live color picker modal to let users retune `--G-color-1` from the panel footer. Design Intent: expose quick theme tweaks without leaving the Expressor UI. Risks / Concerns: Canvas gradient rendering may tax very old CEP runtimes; watch for pointer-capture quirks on high-DPI displays.

* 2025-11-03 – gpt-5-codex: Introduced Express/Search top-level tabs with hidden-panel CSS to preserve editor state while switching views. Design Intent: Provide a primary toggle between editing and search utilities without reinitializing CodeMirror. Risks / Concerns: Verify hidden panels stay non-interactive so overlays don't accidentally capture clicks.

* 2025-11-03 – gpt-5-codex: Added modeless color picker panel plus shared panel_state persistence for color and quick panels. Design Intent: deliver a floating hue picker with window memory and live theme syncing. Risks / Concerns: CEP may block move/resize persistence on some hosts; monitor for permission warnings.

* 2025-11-03 – gpt-5-codex: Floated the editor maximize control onto a top overlay anchored to the Express panel. Design Intent: keep the maximize toggle accessible without disturbing the panel layout as the editor resizes. Risks / Concerns: Ensure overlay stacking stays clear of future header controls.

* 2025-11-03 – gpt-5-codex: Added fallback `holy_applySnippet` bridge when control loads are disabled. Design Intent: ensure snippets still apply expressions via host bridge when controls aren't requested. Risks / Concerns: Fallback coexists with existing `cy_evalApplyExpression`; monitor for double-apply paths.

* 2025-11-03 – gpt-5-codex: Injected temporary logging around `holy_applySnippet` bridge. Design Intent: capture ExtendScript responses while diagnosing snippet apply failures. Risks / Concerns: Verbose logs until removed.

* 2025-11-04 – gpt-5-codex: no functional change – annotated Section 13 architecture deductions with lowercase tags and subject prefixes for clarity.

* 2025-11-17 – lead-dev: Added CSS dev-exchange watcher workflow notes. Design Intent: document the new DevTools→raw-downloads→hotfile autosync pipeline enabling live CSS iteration inside CEP panels. Risks / Concerns: watcher uses brute-force change detection; monitor for duplicate events on fast file systems.


🧱 Verified Architectural Notes (2025-11)

The entire codebase operates under a single global namespace:
Holy.<MODULE> (e.g., Holy.SNIPPETS, Holy.EXPRESS, Holy.UTILS).

Each main_*.js file is wrapped in an IIFE that attaches exports to this global namespace.

The front-end (CEP) communicates with the host side (ExtendScript) exclusively through cs.evalScript().

No ESModules, imports, or bundlers are used anywhere in the runtime.

Host-side scripts follow a strict naming convention:

he_P_ → Apply layer functions

he_U_ → Utility layer functions

This naming structure is consistent across all JSX host modules (host_APPLY.jsx, host_UTILS.jsx, host_GET.jsx, etc.).

These points are deductively verified from the codebase and reflect core structural truths of the project.

