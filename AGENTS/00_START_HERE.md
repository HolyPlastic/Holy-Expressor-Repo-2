# 00_START_HERE — Holy Expressor Fast Start (Verified)

Purpose: single "start here" map for agents. Read this first, then jump to one spoke doc only.

---

## 1) Non-negotiable global rules (code-verified)

- Runtime architecture is CEP panel JS + ExtendScript (JSX) via `CSInterface` bridge.
- No bundler/import system in runtime modules; panel modules attach to global `Holy` namespace.
- Main panel load order is explicitly defined in `index.html`; dependency-sensitive modules must respect this order.
- Main bootstrap is `js/main_DEV_INIT.js` (`loadJSX()`, startup wiring, CodeMirror init in main panel context).
- Host module load order is hardcoded in `main_DEV_INIT.js` and must be preserved.
- `js/json2.js` and `js/libs/CSInterface.js` are foundational bridge/polyfill files; do not refactor casually.
- `AGENTS/DEV ARCHIVE.md` is historical record; do not rewrite history.

---

## 🚨 AGENT SOP: THE TRACING & BLAST RADIUS PROTOCOL

**Do not rely on this map to tell you every file dependency. You are an autonomous agent with search tools. You must use them.** Before modifying any code, you must execute the following protocol:

1. **The End-to-End Trace Rule:** If you are modifying the logic, UI, or functionality of _any_ feature, you must trace its complete execution path before writing code. Search the HTML for the trigger, search the `.js` files for the routing logic, and specifically search for `evalScript` to find the ExtendScript (`.jsx`) backend function it calls. Never edit a node in this chain without checking both the front-end and back-end.
    
2. **The Blast Radius Rule:** Before modifying _any_ existing function, state variable, or shared utility (especially anything attached to the global `Holy` namespace), you must run a workspace search (grep) for its exact name. You must look at every file that calls it to ensure your change will not silently break other panels or features.
    
3. **The Quarantine Exemption:** You are forbidden from attempting to "fix" the experimental PickClick feature (`main_PICKCLICK.js` / `host_PICKCLICK.jsx`). However, if your blast radius search reveals that PickClick relies on a shared utility you _need_ to change for a normal task, you are permitted to update that shared utility. Just make sure the normal task works.

---

## 2) PickClick quarantine (hard rule)

Status: **EXPERIMENTAL / UNRESOLVED — DO NOT TOUCH unless user explicitly requests PickClick work.**

Where it lives:
- CEP side: `js/main_PICKCLICK.js`
- Host side: `jsx/Modules/host_PICKCLICK.jsx`
- Docs: `AGENTS/PICK CLICK SPECIFIC/*`

---

## 3) Entry points (what launches what)

- `index.html` → main panel (`com.holy.expressor.panel`)
- `quickpanel.html` → quick snippets panel (`com.holy.expressor.quickpanel`)
- `colorpicker.html` → color picker (`com.holy.expressor.colorpicker`)
- `fulleditor.html` → full editor panel (`com.holy.expressor.fulleditor`)
- Extension IDs + host/version/runtime constraints are in `CSXS/manifest.xml`.

---

## 4) Read-minimum workflow (token-efficient)

1. Read this file.
2. Open exactly one spoke doc from section 5.
3. Open only referenced code files for your task.
4. Verify behavior in code before trusting historical docs.

---

## 5) Spoke docs (use one, not all)

- `AGENTS/ROADMAP_TASK_ROUTER.md`
  - Task-to-file routing table ("I need to do X, read Y first").
- `AGENTS/ROADMAP_CODE_MAP.md`
  - Verified module map (what each JS/JSX file currently does).
- `AGENTS/DOCS_STATUS_MAP.md`
  - Documentation reliability map (what is canonical vs historical context only).

---

## 6) Quick triage table

- UI/layout/style task → `ROADMAP_TASK_ROUTER.md` (UI/CSS row) → `index.html`, `css/styles.css`, `js/main_UI.js`
- Expression apply/search task → `ROADMAP_TASK_ROUTER.md` (express/apply row) → `js/main_EXPRESS.js`, `js/main_SEARCH_REPLACE.js`, `jsx/Modules/host_APPLY.jsx`, `jsx/Modules/host_GET.jsx`
- Boot/load-order/runtime crash → `ROADMAP_CODE_MAP.md` bootstrap section
- State/persistence issue → `ROADMAP_TASK_ROUTER.md` state row → `js/main_STATE.js`, `js/persistent-store.js`, `js/main_UTILS.js`
- Panel launch/manifest issue → `ROADMAP_TASK_ROUTER.md` manifest row → `CSXS/manifest.xml`, relevant `*.html`
- Building a completely NEW feature? → `ROADMAP_CODE_MAP.md` (to understand how modules attach to the Holy namespace) + `EXAMPLES.md` (for strict UI/SVG rules). **Crucial:** Any new `.js` or `.jsx` files you create MUST be manually wired into the load order in `index.html` and `main_DEV_INIT.js`.

---

## 7) Coverage edge-cases (read this before assuming you're done)

These are recurring task types that agents can miss if they stop at the quick triage table.

- Quick panel behavior/debugging:
  - Start with `quickpanel.html` + `js/quickpanel.js`.
  - Then check event consumers in `js/main_UI.js` (quick panel logs are handled there).
- Color picker behavior/window persistence:
  - Start with `colorpicker.html`, `js/colorpicker.js`, `js/panel_state.js`.
  - Then verify persistence links in `js/persistent-store.js` and panel launch trigger in `js/main_UI.js`.
- Full editor / CodeMirror context issues:
  - Start with `fulleditor.html`, `js/codemirror-init.js`, `js/main_DEV_INIT.js`, `js/main_STATE.js`.
  - Full editor sets `window.HX_FULL_EDITOR_CONTEXT`; code paths differ from main panel.
- Cross-panel state bleed / persistence mismatch:
  - Trace through `js/main_STATE.js`, `js/persistent-store.js`, and any panel-specific bootstrap file.
- Host-side operation appears broken but JS click path looks fine:
  - Follow every `evalScript` call path into the corresponding `jsx/Modules/*.jsx` file before concluding root cause.

Rule of thumb: if your task touches a non-main panel (`quickpanel`, `colorpicker`, `fulleditor`), do not trust main-panel-only routes.
