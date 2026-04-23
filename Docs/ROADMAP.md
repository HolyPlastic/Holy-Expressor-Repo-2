# Roadmap

Unimplemented features and open work items. Not bugs — planned work.

> **Canonical source of truth.** Each Holy plugin's own `Docs/ROADMAP.md` is the single source going forward. The workspace-level `HOLY REPOS COLLATED/Roadmap Collation.md` was deprecated 2026-04-13 (see `Roadmap Collation DEPRECATED.md`) — do not reinstate a cross-plugin summary.

*Before implementing anything new, check this file. Items here have design intent attached. Don't implement them differently without flagging the deviation.*

---

## Recently shipped / status changed (2026-04-13)

- **PickClick (OPEN-4) — quarantine lifted.** Feature is stable and working in production as of 2026-04-13. Top-of-file status on `Docs/features/05-pickclick.md` changed from QUARANTINED to ACTIVE; section 5.2 retitled as "Historical Quarantine Context (lifted 2026-04-13)". Audit pass (Dev Log entry 3) reconciled Open Bugs against live code: ghost-function, breadcrumb-not-expression-valid, veil CSS, and accept/reject filter all struck through as fixed in code. Polling non-termination on unsupported-type clicks and container pathology remain partial — the false-resolve half is closed, but indefinite polling on clicks that don't produce a valid leaf has not been runtime-confirmed terminated. See `Docs/features/05-pickclick.md` Open Bugs for the live state.
- **Pick-click safety rails — landed in parallel session today** (10 s wall-clock timeout + max-tick cap on the poll loop, in both Expressor and Holy LayerMaster). Addresses the indefinite-poll-on-unsupported-click hole called out in the PickClick audit above. Owned by the parallel session — not re-edited here.

---

## Pre-Ship (Must Fix)

### OPEN-1 — Snippet Manager tab 2/3 connected border rendering
CSS fix has been applied to the repo but was **never verified in a live CEP panel**. Needs a CEP reload and visual confirmation that Tab 2 and Tab 3 borders render correctly (active tab erases shelf line, edge tabs flatten wrapper-adjacent corners). If broken, the issue is in the `.sm-tabs-container` / `#smTabBar` CSS in `main_SNIPPETS.js`.

### OPEN-2 — LiveSync "Snippet Spam" loop
A feedback loop in LiveSync causes repeated snippet events. Listed as next priority after the Custom Search fix but no resolution was documented. Needs investigation: identify what triggers the loop, add a guard or debounce, and verify that snippet button state stays stable after edits.

### OPEN-3 — Cross-panel LiveSync (main panel <-> quick panel)
Persistence writes work (banks.json saves to disk), but CEP event broadcasts do not propagate reliably across window contexts. The quick panel UI does not auto-refresh after edits made in the main panel. Fix requires either a reliable CSInterface event bridge or a filesystem-polling mechanism. Each CEP window runs an isolated JS runtime with its own `localStorage` -- events or disk are the only viable sync channels.

### OPEN-5 — `he_GET_SelPath_Simple` incomplete property coverage
Many AE properties still lack formal accessor mappings in `LEAF_ACCESSORS`. The breadcrumb fallback produces display-name paths (e.g. `Layer 1 > Drop Shadow > Opacity`) that are useful for UI display but are **not valid expression paths**. Expanding accessor coverage is required for Load Path and PickClick to work across all common property types.

### OPEN-7 — Target List flooding from summarizer recursion
When Custom Search runs on complex layers, the Target List UI floods with entries because the summarizer recurses without depth limits. The proposed fix is one-level-deep recursion with deduplication, but neither has been implemented. Needs: recursion depth cap, deduplication logic, and verification that all intended targets still appear.

### OPEN-9 — Production build CEF flags (`--allow-file-access` etc.)
The `.debug` file includes permissive flags (`--allow-file-access-from-files`, etc.) that are appropriate for development but may pose security or review concerns for distribution. Decision needed: which flags are required for the plugin to function vs. which are dev-only conveniences. Strip dev-only flags before shipping.

### OPEN-10 — Whether `main_DEV_INIT.js` can be safely deferred
Currently loaded synchronously. Flagged as unresolved whether deferring it would cause race conditions with `CSInterface.js` or other bootstrap dependencies. Needs testing: defer the script tag, verify panel initializes correctly across cold start, warm start, and workspace-restore scenarios.

---

## Planned Features

### Snippet controls button UI
Design and implement the visual appearance of snippet control buttons. No final design exists yet.

### Snippet bank title/label readability
The title of the active snippet bank needs to be easier to read. Likely involves font size, weight, or contrast adjustments.

### Snippet controls interface expansion
When editing a snippet: display whether controls are saved, show what controls are currently saved, and expand the interface for saving and editing controls. This is a UX upgrade to the Snippet Manager overlay.

### Right-click snippet menu colors
Adapt the color scheme for the right-click dropdown context menu on snippet buttons to match the panel's accent-driven theming system.

### Duplicate bank function
Add the ability to duplicate an entire snippet bank. Interaction method undecided -- candidates are a right-click option on the banks dropdown or a dedicated icon button.

### Toast positioning
Toast notifications should appear centered on screen instead of bottom-left. Exact behavior and animation details to be revisited.

### Rewrite UI (general)
General visual polish pass on the Search & Replace / Rewrite mode interface. No specific items called out beyond the ones already fixed.

### Mode switch arrow button SVGs
Replace the current Express/Rewrite mode-switch arrow button with correct SVG icons. Current button uses a placeholder or incorrect asset.

### Search & Replace multi-line support
Current implementation effectively searches only single-line patterns, but expressions commonly span multiple lines. Requires a redesign of the search logic or a multi-line-safe workaround. This is a significant functional gap.

### Apply button UI updates
Visual refresh for both the standard Apply button and the Rewrite Apply button. No specific design finalized.

### Load Path / Load Expression button icon
New icon design: a straight-line spiral to differentiate from the AE pickwhip. Design needs finalizing. Holy Agent will adopt the same icon once done.

### Delete expressions scoped to selected groups
If groups inside a shape layer are selected, delete should be scoped to those groups rather than the entire layer. Mirrors existing layer-level delete behavior. Extends the current selection-root traversal model in `host_APPLY.jsx`.

### Color Picker UI (custom canvas picker)
The native OS color picker popup (`<input type="color">`) shows unstyled white/light areas that cannot be themed. Options: accept the limitation, or build a custom canvas-based gradient picker (like the original Expressor had). Currently using HLMColorPicker inline with live updates -- the white areas are in the OS popup only.

### 3-digit / 8-digit hex support in `cy_styleBoot` (OPEN-11)
The runtime color derivation IIFE in `<head>` currently only handles 6-digit hex values. Support for 3-digit shorthand and 8-digit hex (with alpha) is marked as future work.

### Blending options matchName refinement (OPEN-12)
`LAYER_STYLE_GROUP_MAP` entries for blending options sub-groups (`ADBE Blend Options Group`, `ADBE Adv Blend Group`) are best-guess mappings. Toast now reports actual matchNames in errors, enabling iterative refinement. Low risk but incomplete.

### `holyAPI_*` surface — complete the public API
Holy Agent's `host.jsx` fallbacks for `holyAgent_applyToTarget`, `holyAgent_saveSnippet`, and `holyAgent_getBanks` delegate to Expressor's implementations when Expressor is open via `typeof holyAPI_* === 'function'` guards. Expressor's own `holyAPI_applyToTarget(jsonStr)` / `holyAPI_saveSnippet(jsonStr)` / `holyAPI_getBanks()` are the intended public surface. Current status per cross-plugin audit: `holyAPI_applyToTarget` and `holyAPI_saveSnippet` live (`jsx/Modules/host_AGENT_API.jsx`); `holyAPI_getBanks` coverage needs verification. Expanding / hardening this surface lets Holy Agent retire its fallbacks over time.

---

## Post-Ship / Deferred

### ~~PickClick (OPEN-4)~~ — promoted to ACTIVE (see Recently shipped)

Originally listed here as "Experimental and quarantined. Not functional as of last documented sessions. ... **Do not touch unless user explicitly requests PickClick work.**"

**Status as of 2026-04-13:** quarantine lifted, feature stable in production. Safety rails (10 s wall-clock timeout + max-tick cap) added in parallel session today. Remaining partial items (polling termination on unsupported-type clicks, CSXSEvent delivery reliability) live in `Docs/features/05-pickclick.md` Open Bugs, not here.

### Display-name-based target paths — matchName migration (OPEN-6)
Current system uses display names for some target paths, which are rename-sensitive and locale-unsafe. Full migration to matchName-based paths has not started. Deferred — functional for English-locale workflows but a long-term reliability risk.

### `color` vs `colour` CSS variable naming inconsistency (OPEN-8)
Both British (`--G-colour-1-light`) and American (`--G-color-1-light`) spellings exist in the CSS variable namespace. No fix documented. Should be consolidated to one convention. Low impact but creates maintenance friction.

### Quick Panel UI
The Quick Panel concept is sound (proximity to cursor, quick snippet access), but the implementation has significant complexity (separate module init, bridge re-priming, state sync, layout recovery). Recommendation from the pre-ship review: cut from initial release, add properly in v1.1. The Quick Panel button can remain but show a "coming soon" toast or stay hidden.

### Quick Panel state management
Quick Panel shares state with snippet buttons. When both panels are open, states can overlap and desync. Needs a single reliable state solution. Blocked by OPEN-3 (cross-panel LiveSync).

### Quick Panel responsive collapse behavior (concept)
If panel height is reduced below a threshold, switch to a Snippets-only view as an alternative to maintaining a separate Quick Panel UI. Requires further design thought. Deferred to post-ship.

---

## Open Design Questions

*Unresolved decisions. An agent should not make these calls unilaterally — flag them to the user.*

1. **Quick Panel: ship or defer?** The pre-ship review recommended cutting Quick Panel from v1.0 entirely. If shipping, the cross-panel LiveSync (OPEN-3) and state management issues must be resolved first. User decision required.

2. **Duplicate bank interaction method.** Right-click context menu item on the banks dropdown, or a dedicated icon button? UX implications differ — context menu is discoverable but hidden; icon is visible but adds visual clutter.

3. **Search & Replace multi-line approach.** Redesign the search engine for multi-line awareness, or implement a workaround (e.g., collapse newlines before matching, or provide a "multi-line mode" toggle)? This affects the CodeMirror field UX and the underlying regex logic.

4. **Custom canvas color picker vs. native OS picker.** Building a custom picker is fully themeable but adds significant complexity. Accepting the OS picker limitation is zero-effort but visually inconsistent. Which direction?

5. **CEF production flags (OPEN-9).** Which `.debug` flags are required for the plugin to function in production vs. which are dev-only? Needs testing with flags removed.

6. **`main_DEV_INIT.js` defer safety (OPEN-10).** Can this script be deferred without breaking bootstrap? Needs explicit testing across cold start, warm start, and workspace-restore.

7. **CustomSearch: auto-disable after Apply, and runs-when-unticked behavior.** Both are flagged in TO-DO as potentially fixed. Needs explicit verification. If not fixed, the design intent is: Custom Search should auto-disable after a successful Apply, and search logic must strictly gate behind the toggle state.

8. **Log zero values bug.** Log shows zero values in some cases (seen with Custom Search applies). Appears correlated with Toast issues reporting zero/nothing found. May indicate a shared source of truth or timing bug between the Log and Toast systems. Is this still present?
