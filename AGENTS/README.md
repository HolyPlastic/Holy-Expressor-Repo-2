# 🕸️ Holy Expressor — CEP Extension

### Internal Agent README (Developer-Facing)

This repository contains the **Holy Expressor** After Effects CEP extension.
This README is intended **exclusively for agents and contributors working on the codebase**, not for end users.

The goal of this document is to provide a **FAST, ACCURATE MENTAL MODEL** of how the plugin actually works today.

---

## 🎯 High-Level Architecture (Truth Model)

Holy Expressor is a **CEP panel** that consists of:

* 🖥️ **HTML/CSS UI** (panel layouts, editor containers)
* 🧠 **JavaScript runtime logic** (UI, state, CodeMirror, targeting, orchestration)
* 🎛️ **ExtendScript (JSX) host modules** (After Effects API access)

There is **NO single “root controller” file**.
Behavior emerges from **cooperating modules**, not a monolithic entry point.

---

## 📂 Root Entry Points

* `index.html`
  Main Holy Expressor panel (primary development target)

Additional panels exist and may load subsets of logic:

* `quickpanel.html`
* `fulleditor.html`
* `colorpicker.html`
* `log.html`

Do **NOT** assume everything runs exclusively through `index.html`.

---

## 🧠 JavaScript Runtime (`/js/`)

### 🔗 Core Bridge

* `libs/CSInterface.js`
  CEP bridge between JS and ExtendScript

### 🧠 State + Utilities

* `main_UTILS.js`
* `main_STATE.js`
  Centralized state and bindings
* `persistent-store.js`
  Persistent storage adapter
* `panel_state.js`

### 💾 Persistence Layer
- **Holy.PERSIST**
  - Central persistence interface used for theme, color, and panel state.
  - Defined in `js/persistent-store.js`.
  - Read by UI bootstrap code (e.g. `index.html`) and feature modules such as the color picker.
  - This is an active, intentional system — not legacy or defunct code.


### 🎨 UI + Interaction

* `main_UI.js`
* `main_MENU.js`
* `main_BUTTON_LOGIC_1.js`
* `apply-log-view.js`

### ✍️ Expression & Logic Systems

* `main_EXPRESS.js`
* `main_SNIPPETS.js`
* `main_SEARCH_REPLACE.js`

### 🧪 Dev / Init

* `main_DEV_INIT.js`
  **CRITICAL FILE**

  * Loads JSX host modules via `evalScript`
  * Initializes CodeMirror
  * Performs startup wiring
* `main.js`
  Final bootstrap glue

---

## 🧠 CodeMirror (Expression Editor)

* `js/codemirror/codemirror-bundle.js`
  Fully bundled CodeMirror 6 build

⚠️ Important:

* CodeMirror is **mounted and initialized inside `main_DEV_INIT.js`**
* `js/codemirror-init.js` exists but is **NOT currently loaded by any HTML**
* Treat `codemirror-init.js` as **legacy or unused unless reintroduced explicitly**

---

## 🎛️ ExtendScript (JSX) (`/jsx/`)

### ⚠️ `host.jsx`

* **NOT a root controller**
* Currently contains mostly **comments and legacy scaffolding**
* Loaded last, but performs no orchestration

Think of `host.jsx` as:

> A historical stub / optional shell, not the active runtime brain.

### 🧩 Actual Host Logic Lives Here

`/jsx/Modules/`

Active ExtendScript modules include (with current runtime caveats):

* `host_UTILS.jsx`
* `host_GET.jsx` (note: legacy selection payload `he_U_getSelectedProps` is currently commented out)
* `host_PICKCLICK.jsx` (host polling exists, but selection payload path is intentionally disabled until PickClick UX is finalized)
* `host_APPLY.jsx`
* `host_MAPS.jsx`
* `host_FLYO.jsx`
* `host_DEV.jsx`

These are the **real After Effects API interface layers**.

They are loaded dynamically by `main_DEV_INIT.js`.

---

## 🔄 JS ⇄ JSX Communication

* JS calls ExtendScript via `CSInterface.evalScript()`
* JSX modules attach functionality to the global `Holy` namespace
* No JSX file should assume it is the “entry point”

---

## 🎨 CSS (`/css/`)

* `styles.css`
  Core panel styling
* `codemirror_styles.css`
  CodeMirror theming
* `log.css`
  Apply/log UI

Additional experimental styles may exist in:

* `/css-devEx/`

---

## 🧰 Dev / Infrastructure

* `scripts/setup-cep-environment.sh`
  Local CEP setup helper
* `well-known/appspecific/com.chrome.devtools.json`
  DevTools attachment config

⚠️ `.debug/` may exist locally during development but is **not guaranteed to be present in repo exports**.

---

## 📦 Load Order (Actual, As of This Repo)

From `index.html`:

1. `CSInterface.js`
2. `persistent-store.js`
3. `json2.js`
4. `codemirror-bundle.js`
5. `main_UTILS.js`
6. `main_STATE.js`
7. `main_FLYO.js`
8. `main_MENU.js`
9. `main_UI.js`
10. `main_EXPRESS.js`
11. `main_PICKCLICK.js`
12. `main_BUTTON_LOGIC_1.js`
13. `main_SNIPPETS.js`
14. `main_SEARCH_REPLACE.js`
15. `main_DEV_INIT.js`
16. `main.js`

⚠️ Any new modules must respect this order or be explicitly inserted.

---

## 🧠 Mental Model Summary (Read This Once)

* There is **NO monolithic controller**
* `main_DEV_INIT.js` is the **true startup orchestrator**
* JSX logic lives in `/jsx/Modules/`, not `host.jsx`
* CodeMirror is initialized in JS, not JSX
* README accuracy matters because **agents use it to reason about architecture**

---

## 🚨 Rules for Agents

* Do NOT assume legacy intent equals current behavior
* Do NOT treat filenames as authoritative without checking load paths
* If you add or change architecture, **UPDATE THIS README**
* If unsure, trace from `index.html` → `main_DEV_INIT.js`

---
