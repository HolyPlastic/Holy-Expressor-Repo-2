# ROADMAP_TASK_ROUTER — Task → Minimum Reading Path

Use this when you already know the task type.

## Rules
- Read only one row first.
- Verify behavior in code; treat historical markdown as secondary context.
- Skip PickClick unless task explicitly targets it.

---

## 1) Main panel UI / DOM / interactions

Read in order:
1. `index.html` (DOM + script order)
2. `js/main_UI.js` (mode switch, panel controls, launch hooks)
3. `css/styles.css` (visual system)
4. `js/main_MENU.js` (context-menu behavior)

Watch-outs:
- Mode-specific UI (express vs rewrite) is toggled in `main_UI.js`.
- Native context menu suppression is centralized in `main_MENU.js`.

---

## 2) Expression apply/search/replace behavior

Read in order:
1. `js/main_EXPRESS.js`
2. `js/main_SEARCH_REPLACE.js`
3. `js/main_BUTTON_LOGIC_1.js`
4. `jsx/Modules/host_APPLY.jsx`
5. `jsx/Modules/host_GET.jsx`

Watch-outs:
- JS path (button logic) and JSX path (actual AE operation) are split; confirm both sides.
- Avoid assumptions from old docs when code disagrees.

---

## 3) Startup, load order, or "module undefined" failures

Read in order:
1. `index.html` (main script chain)
2. `js/main_DEV_INIT.js` (`loadJSX()`, startup init)
3. `quickpanel.html` + `js/quickpanel.js` (separate bootstrap path)
4. `CSXS/manifest.xml` (panel IDs/entry HTML)

Watch-outs:
- Main panel and quick panel have different script sets.
- `main.js` exists but startup orchestration is effectively in `main_DEV_INIT.js`.

---

## 4) State persistence / remembered settings

Read in order:
1. `js/persistent-store.js` (`Holy.PERSIST` adapter)
2. `js/main_STATE.js` (panel state lifecycle + disk sync)
3. `js/main_UTILS.js` (file helpers and user-data paths)
4. Any panel-specific bootstrap scripts in relevant HTML (`index.html`, `colorpicker.html`)

Watch-outs:
- There are both CEP persistence calls and localStorage fallbacks.
- State and persistence are shared across multiple panels.

---

## 5) Snippets / banks / quick access panel

Read in order:
1. `js/main_SNIPPETS.js`
2. `quickpanel.html`
3. `js/quickpanel.js`
4. `js/main_MENU.js` (snippet context menu plumbing)

Watch-outs:
- Quick panel can prime host bridge separately; not just a visual clone of main panel.

---

## 6) Manifest/packaging/panel registration

Read in order:
1. `CSXS/manifest.xml`
2. Panel HTML entry file (`index.html`, `quickpanel.html`, `colorpicker.html`, `fulleditor.html`)
3. `scripts/setup-cep-environment.sh` (dev install symlink/debug workflow)

---

## 7) PickClick (quarantined)

Read only if task explicitly says PickClick:
1. `AGENTS/PICK CLICK SPECIFIC/PICKCLICK DOC MAP.md`
2. `js/main_PICKCLICK.js`
3. `jsx/Modules/host_PICKCLICK.jsx`
4. `AGENTS/PICK CLICK SPECIFIC/PickClick - Canonical Investigation & Failure Analysis.md`

Rule:
- Do not generalize PickClick architecture into global rules.

---


## 8) Color picker / theme color sync / picker window behavior

Read in order:
1. `colorpicker.html`
2. `js/colorpicker.js`
3. `js/panel_state.js`
4. `js/persistent-store.js`
5. `js/main_UI.js` (open-panel trigger + main-panel listeners)

Watch-outs:
- Color changes can be event-driven across panel boundaries; verify both emitter and listener.
- Window position/size persistence is shared infrastructure (`panel_state.js`) and can affect multiple panels.

---

## 9) Full editor / CodeMirror context issues

Read in order:
1. `fulleditor.html`
2. `js/codemirror-init.js`
3. `js/main_DEV_INIT.js`
4. `js/main_STATE.js`

Watch-outs:
- `window.HX_FULL_EDITOR_CONTEXT` changes startup behavior.
- Main panel and full editor can both touch editor globals (`window.editor`), so verify context before edits.
