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
Added early <style> background in HTML to eliminate white flash.

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





