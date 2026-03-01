# ROADMAP_CODE_MAP — Verified Module Map (Current Code)

This map is intentionally compressed. It records what files currently do, based on code inspection.

## A) Front-end entry points

- `index.html`
  - Main panel DOM + script load chain.
  - Includes PickClick veil element.
- `quickpanel.html`
  - Lightweight snippets-focused panel; loads subset of main modules plus `js/quickpanel.js`.
- `colorpicker.html`
  - Color UI and persistence hooks, separate panel context.

## B) CEP JS modules (`/js`)

- `main_UTILS.js` → utility helpers (theme vars, file IO helpers, selection helper bridge).
- `main_STATE.js` → app state object, disk persistence scheduling, panel/editor bindings, cross-event sync.
- `main_MENU.js` → context menu rendering/positioning + native context-menu suppression.
- `main_UI.js` → core UI wiring, mode switching, panel launch controls, assorted button hookups.
- `main_EXPRESS.js` → expression/editor workflows.
- `main_SEARCH_REPLACE.js` → search/replace orchestration and related operations.
- `main_BUTTON_LOGIC_1.js` → button-to-action routing, invokes express/search/host operations.
- `main_SNIPPETS.js` → snippet banks, rendering, interactions.
- `main_DEV_INIT.js` → startup orchestrator (`loadJSX()`, init calls, main-panel CodeMirror setup).
- `main_PICKCLICK.js` → CEP controller for PickClick events/veil/arm-cancel flow (**quarantined**).
- `main_FLYO.js` → flyover helper bridge (legacy/optional utility path).
- `persistent-store.js` → `Holy.PERSIST` adapter with CSInterface/CEP/localStorage fallback chain.
- `quickpanel.js` → quickpanel-specific bootstrap, host bridge priming, lifecycle listeners.
- `main.js` → legacy/low-content tail entry.

## C) JSX host modules (`/jsx/Modules`)

Loaded by `main_DEV_INIT.js` in this order:
1. `host_UTILS.jsx`
2. `host_MAPS.jsx`
3. `host_GET.jsx`
4. `host_PICKCLICK.jsx`
5. `host_APPLY.jsx`
6. `host_DEV.jsx`
7. `host_FLYO.jsx`
8. `jsx/host.jsx`

Responsibility snapshot:
- `host_UTILS.jsx` → utility wrappers/logging helpers.
- `host_MAPS.jsx` → mapping/lookup structures used by host-side ops.
- `host_GET.jsx` → selection/path extraction helpers.
- `host_APPLY.jsx` → apply expression operations in AE host context.
- `host_PICKCLICK.jsx` → PickClick polling/signature/dispatch logic (**quarantined**).
- `host_DEV.jsx` / `host_FLYO.jsx` / `host.jsx` → dev and auxiliary host wiring.

## D) Manifest and environment

- `CSXS/manifest.xml` is the source of truth for extension IDs, entry HTML files, host version, and CEP runtime requirements.
- `scripts/setup-cep-environment.sh` provides symlink/debug setup workflow for CEP development.

## E) Known unstable zone

- PickClick subsystem across JS/JSX/docs is active but unresolved from a product-finalization perspective.
- Keep quarantined unless explicitly tasked.
