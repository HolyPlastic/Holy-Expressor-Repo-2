# AGENT_INDEX — Holy Expressor Fast Start (Verified)

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

## 2) PickClick quarantine (hard rule)

Status: **EXPERIMENTAL / UNRESOLVED — DO NOT TOUCH unless user explicitly requests PickClick work.**

Where it lives:
- CEP side: `js/main_PICKCLICK.js`
- Host side: `jsx/Modules/host_PICKCLICK.jsx`
- Docs: `AGENTS/PICK CLICK SPECIFIC/*`

Routing rule for agents:
- If task is not explicitly PickClick-related, avoid these files entirely.
- If task is PickClick-related, treat existing behavior as unstable; map only, do not infer missing architecture.

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

