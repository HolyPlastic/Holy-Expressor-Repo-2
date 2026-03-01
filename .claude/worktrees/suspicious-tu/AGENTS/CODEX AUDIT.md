PROMPT CODEX WAS GIVEN:
Role & Objective:\nAct as a Principal Software Architect and Expert Code Auditor. I need an EXHAUSTIVE, deeply critical analysis of this entire codebase. This is an Adobe CEP Extension (JavaScript frontend + ExtendScript JSX backend).\n\nYour Constraints & Working Style:\nDo NOT rush. Do NOT provide a high-level summary. I want a painstaking, file-by-file and layer-by-layer audit. If you reach your output limit, stop and ask me to say "continue." Do not truncate your analysis to fit it into one response.\n\nWhat to Look For:\n\nOver-engineering: Unnecessary abstractions, overly complex state management, redundant utility functions, or convoluted message-passing between the JS and JSX layers.\n\nMissing Functionality: Edge cases not handled, missing error handling, missing performance safeguards (especially in UI rendering or host-script execution), or incomplete feature implementations.\n\nExecution Plan:\nPlease structure your exhaustive audit by moving methodically through these architectural layers:\n\nLayer 1: Configuration & Setup (Manifests, Environment, Build scripts)\n\nLayer 2: UI & View Logic (HTML, CSS, UI-specific JS)\n\nLayer 3: Client-Side Business Logic & State (main JS modules, Express/PickClick logic, Event bridging, those are just examples, there are many more) \nLayer 4: Host Script Execution (JSX modules, application-specific ExtendScript logic)\n\nOutput Format:\nFor every single issue found, document it using this strict schema:\n\n[Confidence Level: Low/Medium/High] > * File(s) / Module: (e.g., js/main_STATE.js or jsx/Modules/host_APPLY.jsx)\n\nIssue Type: (Over-engineering OR Missing Functionality)\n\nThe Problem: (Critically analyze what the issue is)\n\nWhy It Is a Problem: (Explain the architectural, performance, or maintenance impact)\n\nSuggested Resolution: (How to simplify or implement the missing code)\n\nBegin your analysis starting with Layer 1, and let me know when you are ready to proceed to the next layer.



###   
Layer 1 Audit — Configuration & Setup (Deep Critical Pass)

I’m starting exactly with **Layer 1** as requested. Below are concrete issues in strict schema format.

---

[Confidence Level: High] > * File(s) / Module: `CSXS/manifest.xml`

**Issue Type:** Missing Functionality

**The Problem:**  
The manifest enables `--disable-web-security` and unrestricted file access flags (`--allow-file-access`, `--allow-file-access-from-files`) for **all three extensions** (main panel, quick panel, color picker), with no dev/prod separation. This is effectively a global insecure runtime posture. 

**Why It Is a Problem:**  
This removes browser isolation guarantees and increases the blast radius of any injected/unsafe script path. Even for CEP tooling, this should be opt-in for dev only, not hardcoded for every runtime panel.

**Suggested Resolution:**  
Introduce environment-gated manifests (or release-manifest variant) where security-relaxing flags are only present in debug/dev workflows.

---

[Confidence Level: High] > * File(s) / Module: `CSXS/manifest.xml`

**Issue Type:** Missing Functionality

**The Problem:**  
All panels are configured `AutoVisible=true`, including helper windows. This forces eager initialization for quick panel and color picker regardless of user intent. 

**Why It Is a Problem:**  
Unnecessary startup cost, increased memory footprint, and side effects at app launch. Auxiliary panels typically should be lazy-opened.

**Suggested Resolution:**  
Keep `AutoVisible=true` only for the primary panel; set helper panels to false and open via explicit commands/events.

---

[Confidence Level: High] > * File(s) / Module: `CSXS/manifest.xml`

**Issue Type:** Missing Functionality

**The Problem:**  
Color picker geometry is internally inconsistent: default size height is `240`, but `MinSize` height is `300`. 

**Why It Is a Problem:**  
On startup, host may clamp/reflow unpredictably. This is a configuration bug that can manifest as resizing glitches or non-deterministic initial dimensions.

**Suggested Resolution:**  
Set initial `Size` to meet `MinSize` constraints (e.g., height >= 300), or reduce min height to <= initial height.

---

[Confidence Level: High] > * File(s) / Module: `.debug`, `CSXS/manifest.xml`, `AGENTS/ENVIRONMENT.md`

**Issue Type:** Missing Functionality

**The Problem:**  
Debug/runtime documentation and config are out of sync: `.debug` defines `com.holy.expressor.log` on port 6908, while manifest only defines panel/quickpanel/colorpicker; environment docs also reference non-manifest targets (e.g., “Full Editor” 6907). 

**Why It Is a Problem:**  
Developers will chase nonexistent extension entries during debugging. This creates onboarding friction and false-negative diagnostics.

**Suggested Resolution:**  
Unify manifest, `.debug`, and environment docs to the exact same extension ID set and port map.

---

[Confidence Level: High] > * File(s) / Module: `scripts/setup-cep-environment.sh`

**Issue Type:** Missing Functionality

**The Problem:**  
The setup script unconditionally copies `.debug` without existence checks or fallback logic. If `.debug` is missing/renamed, setup hard-fails. 

**Why It Is a Problem:**  
Brittle install workflow; prevents symlink setup completion even when only debugging metadata is missing.

**Suggested Resolution:**  
Add guard clauses (`if [[ -f "$debug_file_source" ]]`) and emit actionable warning instead of aborting entire setup.

---

[Confidence Level: Medium] > * File(s) / Module: `scripts/setup-cep-environment.sh`

**Issue Type:** Missing Functionality

**The Problem:**  
Windows path conversion assumes `cygpath` availability in MINGW/MSYS/CYGWIN contexts. There is no fallback if `cygpath` is missing. 

**Why It Is a Problem:**  
In mixed shell environments (or constrained CI), setup can fail despite valid APPDATA values.

**Suggested Resolution:**  
Check `command -v cygpath` and fallback to native path concatenation with clear instructions when unavailable.

---

[Confidence Level: High] > * File(s) / Module: `index.html`, `js/main_DEV_INIT.js`, `js/main.js`

**Issue Type:** Over-engineering

**The Problem:**  
Bootstrap responsibility is split and redundant: `index.html` loads a long chain ending in both `main_DEV_INIT.js` and `main.js`, but `main.js` does almost nothing beyond dependency check. 

**Why It Is a Problem:**  
Creates architectural ambiguity about true entrypoint; increases maintenance confusion and regression risk when adding startup behavior.

**Suggested Resolution:**  
Choose one canonical bootstrap module (already effectively `main_DEV_INIT.js`), and either remove `main.js` or give it explicit orchestrator duties.

---

[Confidence Level: High] > * File(s) / Module: `index.html`, `js/main_DEV_INIT.js`

**Issue Type:** Over-engineering

**The Problem:**  
`index.html` contains substantial inline boot logic (theme derivation, persistence fallback, event wiring), while core app bootstrap is in JS modules. This duplicates initialization concerns across HTML and JS layers. 

**Why It Is a Problem:**  
Harder testability, weak separation of concerns, and higher chance of order-dependent bugs.

**Suggested Resolution:**  
Move inline scripts into dedicated startup modules with explicit dependency order and guardrails.

---

[Confidence Level: High] > * File(s) / Module: `quickpanel.html`

**Issue Type:** Over-engineering

**The Problem:**  
Quick panel loads many heavyweight main-panel modules (`main_UI`, `main_EXPRESS`, `main_BUTTON_LOGIC_1`, etc.) despite being a narrow snippets surface. 

**Why It Is a Problem:**  
Inflated load time and memory for a utility panel; tighter coupling to main-panel internals.

**Suggested Resolution:**  
Create a minimal quick-panel runtime bundle/list: only shared primitives + snippet-specific logic required for that window.

---

[Confidence Level: Medium] > * File(s) / Module: `colorpicker.html`

**Issue Type:** Over-engineering

**The Problem:**  
Stylesheet is injected by inline JS creating a `<link>` node at runtime instead of using declarative `<link rel="stylesheet">` directly. 

**Why It Is a Problem:**  
Adds avoidable startup complexity and potential flash-of-unstyled-content timing risk.

**Suggested Resolution:**  
Use static `<link>` tags in `<head>` unless there is a hard CEP loading bug being actively mitigated (if so, document the rationale clearly).

---

[Confidence Level: High] > * File(s) / Module: `index.html`

**Issue Type:** Missing Functionality

**The Problem:**  
Quarantined experimental PickClick module is loaded into main panel startup by default. 

**Why It Is a Problem:**  
Even untouched, this widens startup surface and risk profile for non-experimental workflows.

**Suggested Resolution:**  
Gate loading behind an explicit feature flag or dev-only toggle to keep experimental code out of normal boot path.

---

## Summary

- Added `AGENTS/AUDIT_LAYER1.md` to track Layer 1 audit scope in-repo. 
    

**Testing**

- ✅ `cat AGENTS/00_START_HERE.md`
    
- ✅ `cat AGENTS/ROADMAP_TASK_ROUTER.md`
    
- ✅ `rg --files -g 'AGENTS.md' -g 'README.md' -g 'EXAMPLES.md' AGENTS .`
    
- ✅ `nl -ba CSXS/manifest.xml`
    
- ✅ `nl -ba index.html | rg "script src|persistent-store|main_DEV_INIT|main.js|json2|codemirror|main_"`
    
- ✅ `nl -ba quickpanel.html`
    
- ✅ `nl -ba colorpicker.html`
    
- ✅ `nl -ba scripts/setup-cep-environment.sh`
    
- ✅ `if [ -f .debug ]; then nl -ba .debug; else echo 'NO_DEBUG'; fi`
    
- ✅ `nl -ba js/main_DEV_INIT.js | sed -n '1,260p'`
    
- ✅ `nl -ba js/main.js | sed -n '1,220p'`
    
- ✅ `git add AGENTS/AUDIT_LAYER1.md && git commit -m "docs: add layer 1 audit notes scaffold"`
    

I’m ready to proceed to **Layer 2: UI & View Logic** with the same depth and strict issue schema.



## proceed to Layer 2



[Confidence Level: High] > * File(s) / Module: `index.html`

**Issue Type:** Missing Functionality

**The Problem:**  
The color picker launcher script binds to `#openThemePicker`, but the only `openThemePicker` button is inside an HTML comment block, so this UI path is dead in production markup. 

**Why It Is a Problem:**  
Theme-color feature discoverability breaks at the view layer (no clickable affordance), while code still ships and executes startup listener setup for a non-existent control.

**Suggested Resolution:**  
Either restore a visible `openThemePicker` button in active DOM or remove this startup script and move panel launch to an actual existing trigger.

---

[Confidence Level: High] > * File(s) / Module: `js/main_UI.js`

**Issue Type:** Missing Functionality

**The Problem:**  
`main_UI.js` executes `cs.evalScript('NEW_log_showDialog(...)')`, but no `NEW_log_showDialog` function exists in JS or JSX sources; only `NEW_forCustomer_showDialog` exists. 

**Why It Is a Problem:**  
This is a guaranteed dead/failed host call at runtime and creates misleading diagnostics in startup flow.

**Suggested Resolution:**  
Replace with the implemented host function name (or implement the missing function), and gate with existence probe before invocation.

---

[Confidence Level: High] > * File(s) / Module: `js/main_UI.js`

**Issue Type:** Over-engineering

**The Problem:**  
Global log mode is hard-forced to verbose (`window.HX_LOG_MODE = "verbose"`), and many UI paths log aggressively by default. 

**Why It Is a Problem:**  
In CEP panels, excessive console I/O during interaction and retries adds noise and can degrade debugging signal-to-noise for actual faults.

**Suggested Resolution:**  
Default to `silent` (or environment-driven), with explicit opt-in verbose toggle.

---

[Confidence Level: High] > * File(s) / Module: `js/main_MENU.js`

**Issue Type:** Missing Functionality

**The Problem:**  
`contextM_disableNative()` suppresses context menu events globally, including outside plugin root (`ev.preventDefault()` still runs in the outside branch). 

**Why It Is a Problem:**  
Users lose native context-menu behavior everywhere in panel webview context, including editable fields and non-snippet UI, which is an accessibility and usability regression.

**Suggested Resolution:**  
Limit suppression strictly to intended regions (e.g., snippet controls / app root) and allow default behavior elsewhere.

---

[Confidence Level: High] > * File(s) / Module: `quickpanel.html`, `js/quickpanel.js`

**Issue Type:** Missing Functionality

**The Problem:**  
`quickpanel.js` repeatedly expects `#quickPanelRoot` (visibility checks/repaint), but the HTML never defines this element. 

**Why It Is a Problem:**  
All related rendering self-heal branches are no-ops or warning-only, weakening recovery logic for blank/collapsed panel cases.

**Suggested Resolution:**  
Add a real `quickPanelRoot` wrapper in markup (preferred) or refactor logic to target existing container IDs.

---

[Confidence Level: High] > * File(s) / Module: `js/quickpanel.js`

**Issue Type:** Missing Functionality

**The Problem:**  
Quick panel host module paths use lowercase `"/jsx/modules/..."` while repository path is `jsx/Modules/...` (uppercase `M`). 

**Why It Is a Problem:**  
On case-sensitive filesystems this fails to load host JSX, causing degraded bridge readiness and feature breakage.

**Suggested Resolution:**  
Normalize to exact on-disk casing (`/jsx/Modules/...`) to match `main_DEV_INIT` behavior.

---

[Confidence Level: High] > * File(s) / Module: `js/quickpanel.js`, `quickpanel.html`

**Issue Type:** Over-engineering

**The Problem:**  
Quick panel bootstrap includes extensive paint/heal choreography (multi-timeout cold start recovery, repeated layout retries, warm wake events, repaint forcing), indicating high complexity to stabilize a simple snippets view. 

**Why It Is a Problem:**  
Complex startup state machines are hard to reason about and maintain; failures become non-deterministic and expensive to debug.

**Suggested Resolution:**  
Simplify quick panel to minimal deterministic init sequence: render once after module readiness, then one bounded fallback retry.

---

[Confidence Level: Medium] > * File(s) / Module: `quickpanel.html`, `js/quickpanel.js`

**Issue Type:** Over-engineering

**The Problem:**  
`quickpanel.html` already sets `body.quick-panel`, but `quickpanel.js` sets the same class again during DOMContentLoaded. 

**Why It Is a Problem:**  
Minor redundancy, but symptomatic of duplicated responsibility between template and runtime boot.

**Suggested Resolution:**  
Keep structural class assignment in HTML only; remove JS duplicate.

---

[Confidence Level: High] > * File(s) / Module: `js/colorpicker.js`

**Issue Type:** Missing Functionality

**The Problem:**  
Canvas dimensions are assigned before required-element null checks (`canvas.width = ...` and `canvas.height = ...` happen before guarding `!canvas`). 

**Why It Is a Problem:**  
If markup changes/regresses and canvas is missing, script throws before graceful error handling path.

**Suggested Resolution:**  
Perform all element existence checks first, then touch DOM-dependent properties.

---

[Confidence Level: Medium] > * File(s) / Module: `js/panel_state.js`

**Issue Type:** Missing Functionality

**The Problem:**  
Panel identity is inferred from `document.title` regex to decide persistence key (`quickpanel`, `colorpicker`, fallback `panel`). 

**Why It Is a Problem:**  
Title text changes/localization can silently reroute window state keys, causing persistence bleed or resets.

**Suggested Resolution:**  
Derive panel identity from `CSInterface.getExtensionID()` (stable source) instead of mutable titles.

---

[Confidence Level: Medium] > * File(s) / Module: `css/styles.css`

**Issue Type:** Over-engineering

**The Problem:**  
The stylesheet is monolithic (~3.3k lines) with broad `!important` usage in key layout systems (e.g., context menus, mode views) and mixed concerns for all panels in one file. 

**Why It Is a Problem:**  
High cascade fragility and rising maintenance cost; panel-specific regressions become harder to isolate.

**Suggested Resolution:**  
Split CSS by panel/domain (main, quickpanel, colorpicker, shared tokens/utilities), and reduce `!important` to exceptional override points only.

---

[Confidence Level: Low] > * File(s) / Module: `css/styles.css`

**Issue Type:** Missing Functionality

**The Problem:**  
Large sections show character-encoding corruption in comments (garbled glyph sequences), indicating possible file encoding inconsistency. 

**Why It Is a Problem:**  
Not a direct runtime bug, but it harms readability/tooling quality and can confuse diffs/reviews.

**Suggested Resolution:**  
Normalize file to UTF-8 and clean corrupted comment blocks.

---

## Summary

- Added `AGENTS/AUDIT_LAYER2.md` as Layer 2 audit tracking scaffold in the central AGENTS documentation directory. 
    

**Testing**

- ✅ `wc -l index.html js/main_UI.js css/styles.css js/main_MENU.js quickpanel.html js/quickpanel.js colorpicker.html js/colorpicker.js js/panel_state.js js/persistent-store.js js/main_SNIPPETS.js`
    
- ✅ `nl -ba js/main_UI.js | sed -n '1,260p'`
    
- ✅ `nl -ba js/main_UI.js | sed -n '260,520p'`
    
- ✅ `nl -ba js/main_MENU.js | sed -n '1,320p'`
    
- ✅ `nl -ba js/quickpanel.js | sed -n '1,260p'`
    
- ✅ `nl -ba js/quickpanel.js | sed -n '260,560p'`
    
- ✅ `nl -ba js/quickpanel.js | sed -n '560,760p'`
    
- ✅ `nl -ba js/colorpicker.js | sed -n '1,260p'`
    
- ✅ `nl -ba js/colorpicker.js | sed -n '260,520p'`
    
- ✅ `nl -ba js/panel_state.js | sed -n '1,220p'`
    
- ✅ `nl -ba js/persistent-store.js | sed -n '1,280p'`
    
- ✅ `rg -n "quickPanelRoot|openThemePicker|modeViewRewrite|modeViewExpress|editorMaximizeBtn|snippetContextMenu|btnModeSwitch|flyoLaunchBtn|NEW_forCustomer_openLogButton|quickAccessLaunchBtn" index.html quickpanel.html css/styles.css js/main_UI.js js/quickpanel.js`
    
- ✅ `rg -n "NEW_forCustomer_history|NEW_log_history|NEW_log_showDialog|NEW_forCustomer_showDialog|com.holyexpressor.NEW_log_event" js index.html jsx`
    
- ✅ `rg -n "function NEW_log_showDialog|NEW_log_showDialog\\(" jsx js`
    
- ✅ `git add AGENTS/AUDIT_LAYER2.md && git commit -m "docs: add layer 2 audit notes scaffold"`
    

Ready to proceed to **Layer 3: Client-Side Business Logic & State**.

## Proceed to 3

Copy

[Confidence Level: High] > * File(s) / Module: `js/main_BUTTON_LOGIC_1.js`, `js/main_SEARCH_REPLACE.js`, `js/main_SNIPPETS.js`, `js/main_EXPRESS.js`

**Issue Type:** Missing Functionality

**The Problem:**  
Multiple modules call `Holy.BUTTONS.logPanelEvent(...)`, but `logPanelEvent` is never defined/exported in `Holy.BUTTONS`. Calls exist in search/replace and snippets flows, so observability hooks silently no-op. 

**Why It Is a Problem:**  
You have instrumentation callsites with no implementation, which gives a false sense of coverage and makes postmortem analysis weaker.

**Suggested Resolution:**  
Implement and export `logPanelEvent(title, context, payload)` in `Holy.BUTTONS` (or remove callsites and consolidate on `updateApplyReport`).

---

[Confidence Level: High] > * File(s) / Module: `js/main_EXPRESS.js`, `js/main_BUTTON_LOGIC_1.js`

**Issue Type:** Missing Functionality

**The Problem:**  
`Holy.BUTTONS.setCustomSearchActive(false)` is invoked in both express and button logic flows, but no such method is defined/exported. 

**Why It Is a Problem:**  
Custom-search UI state reset code path is effectively dead, increasing risk of stuck toggle/input UX after operations.

**Suggested Resolution:**  
Add a canonical `setCustomSearchActive(boolean)` helper in `Holy.BUTTONS` (or migrate this responsibility to `Holy.State` and call that).

---

[Confidence Level: High] > * File(s) / Module: `js/main_SNIPPETS.js`

**Issue Type:** Over-engineering

**The Problem:**  
`contextM_SNIPPETS_actionHandler` is duplicated verbatim (defined twice), increasing maintenance and ambiguity over which one should be edited in future. 

**Why It Is a Problem:**  
Duplicate behavior blocks are classic drift points; bugfixes may be applied to one copy and not the other.

**Suggested Resolution:**  
Keep one implementation and reuse it everywhere.

---

[Confidence Level: High] > * File(s) / Module: `js/main_SNIPPETS.js`

**Issue Type:** Missing Functionality

**The Problem:**  
A function named `holy_applySnippet` is defined inside panel JavaScript and contains ExtendScript-only syntax (`$.writeln`). This is not valid in CEP browser JS context. 

**Why It Is a Problem:**  
This is a runtime landmine and also confuses ownership of host behavior (should be in JSX, not front-end JS).

**Suggested Resolution:**  
Remove this JS-side stub and ensure `holy_applySnippet` exists only in host JSX modules.

---

[Confidence Level: High] > * File(s) / Module: `js/main_STATE.js`

**Issue Type:** Over-engineering

**The Problem:**  
State updates dispatch **two** different cross-panel event channels: `com.holy.expressor.sync.state` and a second “LiveSync” event (`com.holy.expressor.stateChanged`) via monkey-patching `broadcastState`. 

**Why It Is a Problem:**  
Dual event buses for one state change increase complexity and race/ordering ambiguity; monkey-patching core function adds hidden coupling.

**Suggested Resolution:**  
Unify on one transport/event contract and make dispatch explicit inside `applyState`, not via runtime function replacement.

---

[Confidence Level: High] > * File(s) / Module: `js/main_STATE.js`

**Issue Type:** Missing Functionality

**The Problem:**  
`persistState` deliberately strips `customSearch` before writing to disk, but UI logic still reads/writes custom search via state updates and panel bindings. This creates intentional but undocumented partial persistence behavior. 

**Why It Is a Problem:**  
Cross-panel behavior becomes inconsistent: users see some fields persist while custom search silently resets, which is surprising and hard to debug.

**Suggested Resolution:**  
Either persist `customSearch` as part of explicit policy, or codify/session-scope it clearly and isolate it from shared persisted state object.

---

[Confidence Level: Medium] > * File(s) / Module: `js/main_UTILS.js`, `js/main_STATE.js`, `js/main_SNIPPETS.js`

**Issue Type:** Missing Functionality

**The Problem:**  
File IO helpers (`window.cep.fs`) are used directly without robust availability guards in utility-path consumers; if CEP FS API is unavailable/degraded, state/snippet persistence pathways can fail noisily or unpredictably. 

**Why It Is a Problem:**  
Persistence is foundational to business logic; brittle IO assumptions increase data-loss risk.

**Suggested Resolution:**  
Add centralized capability check and fallback strategy (or explicit hard-fail messaging) before any disk-read/write workflow.

---

[Confidence Level: High] > * File(s) / Module: `js/main_BUTTON_LOGIC_1.js`, `index.html`

**Issue Type:** Missing Functionality

**The Problem:**  
Apply-log panel assumes extension ID `com.holy.expressor.log` and fallback `log.html`, but neither is registered in current panel entry HTML/manifest chain in active code path (main UI uses history button instead). 

**Why It Is a Problem:**  
Log panel open attempts can fail or route to non-existent assets, yielding broken UX and lost telemetry surface.

**Suggested Resolution:**  
Either add/register the log extension + log HTML, or remove these open calls and route all logs through existing history UI.

---

[Confidence Level: High] > * File(s) / Module: `js/main_EXPRESS.js`

**Issue Type:** Over-engineering

**The Problem:**  
`main_EXPRESS` contains both core expression business logic and editor cross-panel sync listener setup (`com.holy.expressor.editor.sync`) with direct editor mutation. 

**Why It Is a Problem:**  
This mixes domain logic and synchronization transport concerns in one module, increasing side effects and test difficulty.

**Suggested Resolution:**  
Move editor sync transport to `main_STATE` (or dedicated sync module), keep `main_EXPRESS` focused on expression workflows.

---

[Confidence Level: Medium] > * File(s) / Module: `js/main_SEARCH_REPLACE.js`

**Issue Type:** Missing Functionality

**The Problem:**  
`runSearchReplace` directly calls `Holy.EXPRESS.cy_replaceInExpressions(...)` with no guard that `Holy.EXPRESS` is present/ready in this module itself. Guarding exists in button module, but not at API boundary here. 

**Why It Is a Problem:**  
If called externally or during partial boot, this throws before user-facing fallback logic.

**Suggested Resolution:**  
Add internal dependency guard in `runSearchReplace` and reject gracefully with consistent toast/error payload.

---

[Confidence Level: High] > * File(s) / Module: `js/main_SNIPPETS.js`

**Issue Type:** Over-engineering

**The Problem:**  
The snippets module combines bank persistence, rendering, context menus, edit panels, controls apply, host eval bridging, plus document lifecycle bindings in a single ~1200-line file. 

**Why It Is a Problem:**  
Large mixed-responsibility modules create high regression risk and poor maintainability, especially in CEP global-namespace architecture.

**Suggested Resolution:**  
Split into focused modules: bank-store, render/UI, context-actions, and host-bridge executor.

---

[Confidence Level: Medium] > * File(s) / Module: `js/main_BUTTON_LOGIC_1.js`, `js/main_STATE.js`

**Issue Type:** Over-engineering

**The Problem:**  
Custom search state is managed in two parallel places: `Holy.sessionCustomSearchText` (session memory) and `Holy.State` binding logic. 

**Why It Is a Problem:**  
Dual sources of truth cause divergence, especially across panel reload/focus events.

**Suggested Resolution:**  
Choose one owner (prefer `Holy.State`) and remove session-global duplicate variable pathway.

---

## Summary

- Added `AGENTS/AUDIT_LAYER3.md` to track Layer 3 audit scope in the AGENTS central documentation directory. 
    

**Testing**

- ✅ `wc -l js/main_STATE.js js/main_UTILS.js js/main_EXPRESS.js js/main_SEARCH_REPLACE.js js/main_BUTTON_LOGIC_1.js js/main_SNIPPETS.js js/main_FLYO.js js/main_DEV_INIT.js`
    
- ✅ `rg -n "evalScript\\(|Holy\\.|window\\.Holy|requestOpenExtension|dispatchEvent|addEventListener\\(" js/main_STATE.js js/main_UTILS.js js/main_EXPRESS.js js/main_SEARCH_REPLACE.js js/main_BUTTON_LOGIC_1.js js/main_SNIPPETS.js js/main_FLYO.js`
    
- ✅ `nl -ba js/main_STATE.js | sed -n '1,280p'`
    
- ✅ `nl -ba js/main_STATE.js | sed -n '280,660p'`
    
- ✅ `nl -ba js/main_STATE.js | sed -n '420,560p'`
    
- ✅ `nl -ba js/main_UTILS.js | sed -n '1,260p'`
    
- ✅ `nl -ba js/main_EXPRESS.js | sed -n '1,280p'`
    
- ✅ `nl -ba js/main_EXPRESS.js | sed -n '280,700p'`
    
- ✅ `nl -ba js/main_SEARCH_REPLACE.js | sed -n '1,260p'`
    
- ✅ `nl -ba js/main_BUTTON_LOGIC_1.js | sed -n '1,320p'`
    
- ✅ `nl -ba js/main_BUTTON_LOGIC_1.js | sed -n '320,920p'`
    
- ✅ `rg -n "setCustomSearchActive|logPanelEvent\\s*:\\s*|function logPanelEvent|Holy\\.BUTTONS\\.logPanelEvent|Holy\\.BUTTONS\\.setCustomSearchActive" js`
    
- ✅ `nl -ba js/main_SNIPPETS.js | sed -n '1,260p'`
    
- ✅ `nl -ba js/main_SNIPPETS.js | sed -n '260,620p'`
    
- ✅ `nl -ba js/main_SNIPPETS.js | sed -n '620,980p'`
    
- ✅ `nl -ba js/main_SNIPPETS.js | sed -n '980,1260p'`
    
- ✅ `nl -ba js/main_SNIPPETS.js | sed -n '430,520p'`
    
- ✅ `nl -ba js/main_FLYO.js | sed -n '1,200p'`
    
- ✅ `git add AGENTS/AUDIT_LAYER3.md && git commit -m "docs: add layer 3 audit notes scaffold"`
    

Ready to proceed to **Layer 4: Host Script Execution (JSX modules)**.

## proceed to layer 4


[Confidence Level: High] > * File(s) / Module: `jsx/host.jsx`

**Issue Type:** Missing Functionality

**The Problem:**  
Legacy `//@include` directives reference lowercase `modules/...` paths and also include `modules/host_APPLY_test.jsx`, which is not present in repo. This is inconsistent with actual on-disk `Modules` casing and current loader strategy in CEP JS. 

**Why It Is a Problem:**  
If this include path is ever used directly (outside current JS loader), host bootstrap can fail on case-sensitive environments and/or due to missing include target.

**Suggested Resolution:**  
Normalize includes to real paths/casing or remove stale include block entirely to avoid split bootstrap truth.

---

[Confidence Level: High] > * File(s) / Module: `jsx/Modules/host_MAPS.jsx`

**Issue Type:** Missing Functionality

**The Problem:**  
`HE_SHAPE_CONTAINER_MATCHNAMES` is assigned to a function expression that is never invoked (missing trailing `()`), so consumers get a function object instead of a map. 

**Why It Is a Problem:**  
All shape-container checks relying on this map can behave incorrectly, causing path resolution and leaf detection drift.

**Suggested Resolution:**  
Invoke the IIFE (`... })();`) so the expected object map is assigned.

---

[Confidence Level: High] > * File(s) / Module: `jsx/Modules/host_UTILS.jsx`

**Issue Type:** Missing Functionality

**The Problem:**  
`cy_deleteExpressions()` correctly tracks/restores layer visibility helpers, but its `finally` block calls `enableTrackedLayers()` instead of restoring visibility. 

**Why It Is a Problem:**  
After operation completion/failure, layers may remain forcibly enabled rather than returned to pre-operation state.

**Suggested Resolution:**  
Call `restoreLayerVisibility()` in `finally` (guarded/idempotent), not `enableTrackedLayers()`.

---

[Confidence Level: High] > * File(s) / Module: `jsx/Modules/host_APPLY.jsx`

**Issue Type:** Missing Functionality

**The Problem:**  
`he_EX_applyExpressionBatch()` reads incoming payload but hardcodes undo label (`"Holy Search Replace (Indexed Safe)"`) and ignores caller-provided `undoLabel`. 

**Why It Is a Problem:**  
Caller intent is discarded, reducing UX clarity in AE undo history and making batch operations harder to distinguish.

**Suggested Resolution:**  
Respect `data.undoLabel` when present, with safe fallback.

---

[Confidence Level: Medium] > * File(s) / Module: `jsx/Modules/host_APPLY.jsx`

**Issue Type:** Missing Functionality

**The Problem:**  
Batch apply forcibly sleeps (`$.sleep(250)`) before command execution for reveal behavior. 

**Why It Is a Problem:**  
Hard blocking sleep in ExtendScript is a performance/UX risk on large operations and can make host behavior feel stalled.

**Suggested Resolution:**  
Gate reveal logic behind optional flag and avoid fixed sleeps where possible (or minimize/conditionally apply only when required).

---

[Confidence Level: High] > * File(s) / Module: `jsx/Modules/host_GET.jsx`

**Issue Type:** Missing Functionality

**The Problem:**  
`he_GET_SelPath_Simple()` hard-fails Layer Styles with `"Layer Styles not supported yet"`. 

**Why It Is a Problem:**  
This leaves a known feature surface intentionally unsupported in the host path-builder layer, which blocks valid user selections.

**Suggested Resolution:**  
Implement Layer Styles path support (or provide a dedicated fallback path strategy instead of outright rejection).

---

[Confidence Level: Medium] > * File(s) / Module: `jsx/Modules/host_GET.jsx`

**Issue Type:** Over-engineering

**The Problem:**  
`he_GET_SelPath_Simple()` emits debug `$.writeln` for parent chain every call, even in normal operation. 

**Why It Is a Problem:**  
Unbounded logging in hot selection workflows adds noise and can degrade script execution clarity/performance.

**Suggested Resolution:**  
Wrap diagnostics behind a debug flag and disable by default.

---

[Confidence Level: High] > * File(s) / Module: `jsx/Modules/host_APPLY.jsx`, `jsx/Modules/host_GET.jsx`

**Issue Type:** Over-engineering

**The Problem:**  
Property-path resolution helpers are duplicated across host modules (`he_P_EX_findPropertyByPath` exists in both APPLY and GET with separate behavior chains). 

**Why It Is a Problem:**  
Duplicated traversal logic increases drift risk and makes path-related bugs hard to fix consistently.

**Suggested Resolution:**  
Consolidate to one canonical resolver utility in host layer and have both modules call it.

---

[Confidence Level: Medium] > * File(s) / Module: `jsx/Modules/host_DEV.jsx`

**Issue Type:** Missing Functionality

**The Problem:**  
Debug event payloads are URI-encoded before dispatch (`encodeURIComponent(msg)`), but this host-side choice requires consumer decoding discipline that is not guaranteed uniformly. 

**Why It Is a Problem:**  
Inconsistent payload encoding conventions cause unreadable logs or mixed parsing behavior across listeners.

**Suggested Resolution:**  
Standardize debug event contract (JSON payload with explicit fields) and decode consistently at listeners.

---

[Confidence Level: High] > * File(s) / Module: `jsx/Modules/host_FLYO.jsx`

**Issue Type:** Missing Functionality

**The Problem:**  
Flyover launcher hardcodes Windows command invocation (`cmd.exe /c ...bat`) with no platform branching. 

**Why It Is a Problem:**  
Non-Windows environments cannot use this host path, and failure mode is just generic error codes/logging.

**Suggested Resolution:**  
Add OS-aware launcher paths (or explicit unsupported-platform error contract surfaced to CEP side).

---

[Confidence Level: Medium] > * File(s) / Module: `jsx/Modules/host_APPLY.jsx`

**Issue Type:** Over-engineering

**The Problem:**  
`he_S_SS_applyExpressionToSelection()` redefines ownership/visibility helpers locally that are conceptually duplicated in other host modules (`host_UTILS` and search captain path). 

**Why It Is a Problem:**  
Repeated low-level safety utilities across modules produce inconsistent edge-case handling over time.

**Suggested Resolution:**  
Extract shared host visibility/owning-layer helpers into one utility module and reuse.

---

## Summary

- Added `AGENTS/AUDIT_LAYER4.md` as the Layer 4 tracking scaffold for host-script execution audit findings. 
    

**Testing**

- ✅ `wc -l jsx/host.jsx jsx/Modules/host_UTILS.jsx jsx/Modules/host_MAPS.jsx jsx/Modules/host_GET.jsx jsx/Modules/host_APPLY.jsx jsx/Modules/host_DEV.jsx jsx/Modules/host_FLYO.jsx jsx/Modules/host_PICKCLICK.jsx`
    
- ✅ `rg -n "function\\s+he_|function\\s+holy_|\\$\\.writeln|app\\.beginUndoGroup|eval\\(|catch\\s*\\(|return \\{ ok|JSON\\.stringify|typeof" jsx/Modules/host_UTILS.jsx jsx/Modules/host_MAPS.jsx jsx/Modules/host_GET.jsx jsx/Modules/host_APPLY.jsx jsx/Modules/host_DEV.jsx jsx/Modules/host_FLYO.jsx jsx/host.jsx`
    
- ✅ `nl -ba jsx/host.jsx`
    
- ✅ `nl -ba jsx/Modules/host_FLYO.jsx`
    
- ✅ `nl -ba jsx/Modules/host_DEV.jsx`
    
- ✅ `nl -ba jsx/Modules/host_MAPS.jsx | sed -n '1,340p'`
    
- ✅ `rg -n "function\\s+(he_U_SS_getSelectionSummary|he_U_getSelectedPaths|he_U_TS_peekSelectionType|he_U_TP_peekTypeForSearch|NEW_forCustomer_showDialog|cy_deleteExpressions|holy_applySnippet|he_EX_applyExpressionBatch|he_S_SS_applyExpressionToSelection|he_P_SC_applyExpressionBySearch|he_S_LS_applyExpressionToTargetList|holy_applyControlsJSON|holy_captureControlsJSON)" jsx/Modules/*.jsx jsx/host.jsx`
    
- ✅ `nl -ba jsx/Modules/host_APPLY.jsx | sed -n '1,280p'`
    
- ✅ `nl -ba jsx/Modules/host_APPLY.jsx | sed -n '280,620p'`
    
- ✅ `nl -ba jsx/Modules/host_APPLY.jsx | sed -n '620,1020p'`
    
- ✅ `nl -ba jsx/Modules/host_APPLY.jsx | sed -n '1020,1165p'`
    
- ✅ `nl -ba jsx/Modules/host_GET.jsx | sed -n '1,260p'`
    
- ✅ `nl -ba jsx/Modules/host_GET.jsx | sed -n '430,520p'`
    
- ✅ `nl -ba jsx/Modules/host_GET.jsx | sed -n '520,820p'`
    
- ✅ `nl -ba jsx/Modules/host_UTILS.jsx | sed -n '1,260p'`
    
- ✅ `nl -ba jsx/Modules/host_UTILS.jsx | sed -n '660,760p'`
    
- ✅ `nl -ba jsx/Modules/host_UTILS.jsx | sed -n '760,980p'`
    
- ✅ `nl -ba jsx/Modules/host_UTILS.jsx | sed -n '980,1095p'`
    
- ✅ `git add AGENTS/AUDIT_LAYER4.md && git commit -m "docs: add layer 4 audit notes scaffold"`