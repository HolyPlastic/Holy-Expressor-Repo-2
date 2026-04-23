# Architecture

Cross-cutting systems. Read this when touching storage, the host bridge, shared utilities, or anything that spans multiple features.

---

## How to Use This Document

**Critical Rules** are codebase-wide constraints that every agent must know before making any change.

**Traps** are silent failure modes -- things that break with no error output. Format:
> TRAP: [Short name]
> [What goes wrong. Why it's silent. Why it's non-obvious.]
> [Correct defensive pattern in code.]

**Known Limitations** are permanent or semi-permanent constraints.

---

## Critical Rules

1. **Blue Apply vs Orange Apply (internal shorthand only)**
   Blue Apply = standard Express-mode apply from the main Apply button (no Custom Search). Orange Apply = apply with Custom Search or Target List routing. These are **not** distinct user-facing features -- they are internal routing labels only.

2. **No bundler / no import system**
   The entire runtime is plain vanilla JavaScript. Panel modules are IIFEs that attach exports to the global `Holy` namespace. There are no ESModules, no `import`/`require`, no webpack, no bundler of any kind.

3. **Load order in `index.html` is dependency-sensitive**
   Scripts load sequentially via `<script defer>` tags. The order determines which `Holy.*` sub-namespaces are available when later modules execute. Adding, removing, or reordering scripts can silently break the bootstrap chain. New modules must be inserted **before** `main_DEV_INIT.js`.

4. **Main bootstrap is `js/main_DEV_INIT.js`**
   This is the true startup orchestrator. It calls `loadJSX()` to load all host-side ExtendScript modules, then runs `Holy.UI.initTabs()`, `Holy.EXPRESS.initPresets()`, `Holy.BUTTONS.wirePanelButtons()`, and `Holy.SNIPPETS.init()` in sequence.

5. **Never modify `CSInterface.js` or `json2.js`**
   These are vendored Adobe dependencies. Any modification will be overwritten or cause undefined behavior.

6. **Global namespace guard is mandatory**
   Every module must open with `if (typeof Holy !== "object") Holy = {};` before its IIFE. Attach exports as `Holy.<MODULE> = { ... }`. Never assign to `window` or create standalone global variables.

7. **Host-side naming convention**
   JSX functions follow a strict prefix convention:
   - `he_P_` -- Apply-layer functions (expression application)
   - `he_U_` -- Utility-layer functions (helpers, extraction, logging)

8. **Event namespace: `com.holy.expressor.*`**
   All custom CSInterface events must use this prefix. Known channels include `com.holyexpressor.debug` (host-to-panel debug), `com.holy.expressor.applyLog.update` (sync), `com.holy.expressor.sync.state` (cross-panel state broadcast), `holy.color.change` (theme propagation).

9. **PickClick subsystem is quarantined**
   The PickClick JS/JSX modules (`main_PICKCLICK.js`, `host_PICKCLICK.jsx`) are present but architecturally unstable. Do not touch unless explicitly tasked. The selection payload helper `he_U_getSelectedProps` has been **permanently removed** from the codebase -- any references to it are historical.

10. **Three-slot snippet banks are immutable structure**
    Each bank contains exactly three snippet slots (`SNIPPETS_PER_BANK = 3`). This constant must match between `main_SNIPPETS.js` (CEP side) and `host_AGENT_API.jsx` (JSX side).

11. **`host_AGENT_API.jsx` is agent-facing only**
    The `holyAPI_*` functions are consumed by Holy Agent. Expressor's own code must never call them. The dependency is one-way: Agent calls into Expressor, never the reverse.

---

## Traps

> TRAP: ES3 reserved-word-as-object-key silent failure
> ExtendScript uses an ES3-era engine. Using JS reserved words (e.g., `delete`, `class`, `default`, `null`) as unquoted object keys causes a **silent parse failure** -- the entire JSX file fails to load with no error output in the CEP panel. The host function simply becomes `undefined`. Confirmed: `null` as an unquoted literal key causes `SyntaxError: Illegal use of reserved word` and aborts the ENTIRE file parse -- no functions are registered.
> Always quote object keys that could be reserved words: `obj["delete"]`, not `obj.delete`. Use `"null": value`, never `null: value`.

> TRAP: ES3 `function` declarations inside `try` blocks
> In ES3/ExtendScript, `function` declarations inside `try` blocks are illegal. The parser silently fails. Use `var fn = function() {}` (function expressions) inside try/catch instead.

> TRAP: `$.evalFile()` returns no error on parse failure
> When a JSX file has a parse error, `$.evalFile()` returns without throwing -- no error, no indication of failure. The file simply fails to define its functions, and later `evalScript` calls return `"EvalScript_ErrMessage"`.
> Wrap `$.evalFile()` in try/catch with string concatenation to detect: `try { $.evalFile(path) } catch(e) { /* log e.toString() */ }`.

> TRAP: `.trim()` in ExtendScript silently aborts execution
> ExtendScript does not natively support `String.prototype.trim()`. Calling `.trim()` on a string inside JSX will throw a TypeError that **silently aborts the current function** -- the calling CEP code receives `EvalScript_ErrMessage` or an empty string with no useful diagnostics. This was confirmed when `.trim()` usage silently prevented Custom Search from executing.
> Use manual trim: `str.replace(/^\s+|\s+$/g, "")`.

> TRAP: Empty string from AE treated as valid expression
> When a property has no expression, AE returns an empty string `""`. If the panel does not guard against this, it can wipe the editor content or treat the empty string as a real expression to apply.
> Use a sentinel value to distinguish "no expression" from "empty expression". Check for empty/sentinel before writing to the editor.

> TRAP: `evalScript` serialization -- non-string returns
> `cs.evalScript()` always returns results as strings. Objects, arrays, and numbers are coerced. If the JSX function returns an object, it arrives as `"[object Object]"` unless explicitly `JSON.stringify()`-ed before returning.
> Always `return JSON.stringify(result)` from JSX functions. Always `JSON.parse()` in the callback.

> TRAP: `evalScript` callback receives `"EvalScript_ErrMessage"` on failure
> When a JSX function throws or does not exist, the callback receives the literal string `"EvalScript_ErrMessage"`. This is easy to miss because it looks like a normal string return, not an exception.
> Always check: `if (result === "EvalScript_ErrMessage") { /* handle error */ }`.

> TRAP: Event channel string mismatch causes silent listener failure
> CSInterface event names require exact string matching. A typo or namespace drift (e.g., `com.holyexpressor.debug` vs `com.holy.expressor.debug`) means the listener simply never fires -- no error, no warning.
> Define event names as constants and reference them. Never use string literals inline for event dispatch + listen pairs.

> TRAP: CodeMirror double-initialization
> Creating more than one CodeMirror instance on the same DOM node causes silent rendering failures -- the editor appears blank or unresponsive. The panel relies on a single guarded initialization and global `window.codemirror` exposure.
> Always guard: initialize once, check for existing instance before creating.

> TRAP: `selectedProperties` returns containers, not leaves
> AE's `selectedProperties` array frequently returns group/container PropertyGroups rather than expression-capable leaf properties. Treating these as apply targets silently fails or applies to the wrong property.
> Always validate that a selected property can accept an expression (check `canSetExpression` or equivalent). For Custom Search, use ancestry-based post-traversal filtering with `parentProperty` signatures, not path-prefix matching.

> TRAP: Hidden layers silently skip expression apply
> AE will not apply expressions to hidden (disabled) layers without error. The expression simply does not get set.
> Temporarily reveal layers before applying, then restore visibility within a single undo scope.

> TRAP: Panels run in isolated CEP JS contexts
> Main panel and Quick Panel do **not** share globals or localStorage. `Holy.*` in one panel is invisible to the other. Cross-panel communication must go through CSInterface events or shared disk files.
> Use `com.holy.expressor.sync.state` events and the shared `panel-state.json` / `banks.json` disk files for synchronization.

> TRAP: `CSEvent.data` object coercion
> Assigning a JS object to `CSEvent.data` coerces it to `"[object Object]"` silently. The receiving listener gets a useless string.
> Always `JSON.stringify()` before assigning to `.data` and `JSON.parse()` in the listener.

> TRAP: Solid type detection path
> The correct path to detect a solid layer's color is `layer.source.mainSource.color` (SolidSource), NOT `layer.source.color`. The wrong path returns `undefined` silently.

---

## Known Limitations

1. **CEP sandbox cannot intercept AE canvas clicks**
   The CEP runtime is sandboxed. It cannot capture clicks on the After Effects canvas, timeline, or property panels. All host-side interaction must go through `evalScript` or host-side polling (`app.scheduleTask`).

2. **ExtendScript is ES3**
   No `let`/`const`, no arrow functions, no template literals, no `.trim()`, no `Array.prototype.forEach` (unless polyfilled by `json2.js`). All JSX code must be ES3-compatible.

3. **CEP CEF engine is not a modern browser**
   The embedded Chromium (CEF) version lags years behind current Chrome. Features like CSS Grid, modern flexbox gaps, or newer JS APIs may not be available. Test everything inside the actual CEP panel -- DevTools in Chrome is not a reliable proxy.

4. **`window.moveTo()` / `window.resizeTo()` are blocked**
   Adobe blocks these JS APIs inside CEP panels. Panel geometry is controlled by the manifest and AE workspace system only.

5. **No reliable cross-panel global propagation**
   Functions like `updateDerivedVariables()` defined in one panel window do not propagate to other panels. Each panel must independently listen for color/state events and apply updates locally.

6. **Polling has no implicit lifecycle**
   ExtendScript's `app.scheduleTask` polling loops run indefinitely unless explicitly cancelled. There is no GC or automatic cleanup. Every poll loop must have an explicit cancellation path.

7. **Shape Layer expression paths require display names**
   Expression paths for Shape Layer properties must use the `.name` (display-name) path, not `.matchName`. `matchName` is useful for classification and safety checks but cannot be used in expression targeting.

---

## Host Bridge (CSInterface + ExtendScript)

The CEP panel communicates with After Effects through the **CSInterface bridge**. This is the only communication channel between front-end JS and the AE host.

### Calling Convention

```js
// CEP side (js/*.js)
var cs = new CSInterface();   // or Holy.UI.cs
cs.evalScript('hostFunctionName("arg1", "arg2")', function(result) {
  // result is ALWAYS a string
  var parsed = JSON.parse(result);
});
```

### Data Flow

1. CEP JS calls `cs.evalScript(scriptString, callback)`
2. The string is evaluated in the ExtendScript engine inside After Effects
3. The JSX function executes synchronously in the AE process
4. The return value is coerced to a string and passed to the JS callback
5. Callback fires asynchronously in the CEP panel context

### JSX Module Loading

JSX modules are loaded at startup by `main_DEV_INIT.js` -> `loadJSX()` using `$.evalFile()`. Each module is loaded via an async `evalScript` call, and a counter tracks completion. `onAllLoaded()` fires when all modules have loaded.

### Return Contract

All JSX functions that return structured data must `return JSON.stringify({ ok: true, ... })`. The CEP callback must `JSON.parse()` the result. There is no formal schema enforcement -- callers must validate shape.

### Event Bridge (Host to Panel)

JSX code can dispatch events to the panel using:
```jsx
var evt = new CSXSEvent();
evt.type = "com.holyexpressor.debug";
evt.data = "message string";
evt.dispatch();
```

The panel listens via `cs.addEventListener("com.holyexpressor.debug", handler)`.

### Canonical Host Dispatch Channel

`ISO_ReportLine_dispatch` is the primary host-to-panel event channel. It centralizes JSON encoding for the payload. The panel side listens only on this channel for structured host-side reports.

**Files:** `js/libs/CSInterface.js`, `js/json2.js`

**Citations:**
- `js/main_DEV_INIT.js` -> `loadJSX()`, `onAllLoaded()`
- `js/main_UI.js` -> `cs = new CSInterface()`
- `jsx/Modules/host_AGENT_API.jsx` -> return contract examples (`JSON.stringify({ ok, ... })`)

---

## Module Load Order

### CEP JS Load Chain (from `index.html`)

Scripts are loaded via `<script>` tags in strict order. Synchronous (blocking) loads come first, then deferred modules execute in document order:

```
[sync]  js/libs/CSInterface.js        -- Adobe CEP bridge (vendored, do not modify)
[sync]  js/persistent-store.js        -- Holy.PERSIST adapter (must be early)
[inline] STYLE_boot()                 -- Theme bootstrap + derived CSS variables
[sync]  js/json2.js                   -- JSON polyfill for ExtendScript
[defer] js/codemirror/codemirror-bundle.js -- CodeMirror editor engine
[defer] js/main_UTILS.js              -- Holy.UTILS: theme vars, file IO, selection helpers
[defer] js/main_STATE.js              -- Holy.State: app state, disk persistence, cross-panel sync
[defer] js/main_MENU.js               -- Holy.MENU: context menu rendering
[defer] js/main_UI.js                 -- Holy.UI: core UI wiring, CSInterface instance, mode switching
[defer] js/main_EXPRESS.js            -- Holy.EXPRESS: expression/editor workflows
[defer] js/main_PICKCLICK.js          -- Holy.PICKCLICK: PickClick controller (quarantined)
[defer] js/main_BUTTON_LOGIC_1.js     -- Holy.BUTTONS: button-to-action routing
[defer] js/main_SNIPPETS.js           -- Holy.SNIPPETS: snippet banks, rendering
[defer] js/main_SEARCH_REPLACE.js     -- Search/replace orchestration
[defer] js/colorpicker.js             -- Color picker UI
[defer] js/main_BG.js                 -- Background utilities
[defer] js/main_DEV_INIT.js           -- BOOTSTRAP: loadJSX(), init(), CodeMirror setup
[defer] js/main.js                    -- Legacy placeholder (do not extend)
```

### JSX Load Chain (from `loadJSX()` in `main_DEV_INIT.js`)

After the CEP bootstrap completes, `loadJSX()` loads host modules into the ExtendScript engine via `$.evalFile()`:

```
1. jsx/Modules/host_UTILS.jsx        -- he_U_* utility wrappers, logging
2. jsx/Modules/host_MAPS.jsx         -- Property mapping/lookup structures
3. jsx/Modules/host_GET.jsx          -- Selection/path extraction helpers
4. jsx/Modules/host_PICKCLICK.jsx    -- PickClick polling/dispatch (quarantined)
5. jsx/Modules/host_APPLY.jsx        -- Expression apply operations (he_P_*)
6. jsx/Modules/host_DEV.jsx          -- Dev/auxiliary host wiring
7. jsx/host.jsx                      -- Root coordinator
8. jsx/Modules/host_AGENT_API.jsx    -- holyAPI_* agent surface (MUST be last)
```

The load uses async `evalScript` calls with a counter. `onAllLoaded()` fires only when all eight modules have returned their callbacks.

### Bootstrap Sequence (inside `init()`)

After JSX modules load, `main_DEV_INIT.js` -> `init()` runs:

```
loadJSX()
Holy.State.init({ panel: "main" })
Holy.UI.initTabs()
Holy.EXPRESS.initPresets()
Holy.BUTTONS.wirePanelButtons()
Holy.SNIPPETS.init()
Holy.State.attachPanelBindings()
```

**Files:** `index.html`, `js/main_DEV_INIT.js`

**Citations:**
- `index.html` lines 15-214 -> script tag ordering
- `js/main_DEV_INIT.js` -> `loadJSX()`, `init()`, `onAllLoaded()`

---

## Storage Layout

Holy Expressor uses a multi-tier persistence strategy. No single storage mechanism is authoritative -- the system falls through a chain until one succeeds.

### `Holy.PERSIST` -- Persistent Store Adapter

Defined in `js/persistent-store.js`. Provides a key-value interface with a three-tier fallback chain:

```
1. CSInterface.getPersistentData(key)       -- Adobe CEP persistent data API
2. window.__adobe_cep__.getPersistentData()  -- Low-level CEP native bridge
3. window.localStorage                       -- Browser fallback (not roaming)
```

On write, the adapter tries each tier in order and stops at the first success. On read, it cascades through all three until a value is found. On remove, it clears from **all** tiers.

**API surface:**
- `Holy.PERSIST.get(key)` -- returns string or null
- `Holy.PERSIST.set(key, value)` -- serializes to string, returns boolean
- `Holy.PERSIST.remove(key)` -- clears from all tiers, returns boolean
- `Holy.PERSIST.refresh()` -- forces adapter rebuild on next call

### `Holy.State` -- Application State

Defined in `js/main_STATE.js`. Manages runtime state for expression text, Custom Search settings, and mode flags.

- **Disk path:** `<userData>/HolyExpressor/panel-state.json` (resolved via `Holy.UTILS.cy_getBanksPaths()`)
- **File format:** `{ version: 1, updatedAt: <timestamp>, projectPath: <string>, state: { expressionText, useCustomSearch, useAbsoluteComp, ... } }`
- **Write scheduling:** Debounced at 220ms via `scheduleSave()` to avoid excessive disk writes
- **Cross-panel sync:** Broadcasts via CSEvent `com.holy.expressor.sync.state` with `{ sourceId, changed, state, timestamp }` payload. Each panel instance has a unique `instanceId` to avoid echo loops.
- **Note:** `customSearch` text is intentionally excluded from disk persistence (session-only memory).

### `banks.json` -- Snippet Banks

- **Disk path:** `<userData>/HolyExpressor/banks.json` (same directory as `panel-state.json`)
- **Structure:** `{ banks: [{ id, name, snippets: [{ expr, name, controls?, ... }] }], activeBankId }`
- **Ownership:** Both main panel and quick panel independently load and persist this file
- **Agent access:** `holyAPI_getBanks()` and `holyAPI_saveSnippet()` in `host_AGENT_API.jsx` read/write this file from the ExtendScript side using `Folder.userData.fullName + "/HolyExpressor/banks.json"`

### Theme Persistence

- Primary accent color (`--G-color-1`) is stored via `Holy.PERSIST` and propagated through `holy.color.change` CSEvents
- Theme class is stored in `localStorage` under key `he_theme`
- Derived CSS variables are computed at boot by the inline `STYLE_boot()` function in `index.html`

**Files:** `js/persistent-store.js`, `js/main_STATE.js`, `js/main_UTILS.js` (path helpers)

**Citations:**
- `js/persistent-store.js` -> `Holy.PERSIST = { get, set, remove, refresh }`
- `js/main_STATE.js` -> `ensureStateFilePath()`, `persistState()`, `readStateFromDisk()`, `broadcastState()`
- `jsx/Modules/host_AGENT_API.jsx` -> `holyAPI_getBanks()`, `holyAPI_saveSnippet()` (disk path: `Folder.userData.fullName + "/HolyExpressor/banks.json"`)

---

## holyAPI_* Surface

The `holyAPI_*` functions are the public API that **Holy Agent** uses to interact with Expressor's data and apply pipeline. They live in `jsx/Modules/host_AGENT_API.jsx`, which **must** be the last JSX module loaded so all Expressor host functions are already defined.

These functions are **agent-facing only**. Expressor never calls them internally. Holy Agent checks `typeof holyAPI_*` before calling and falls back to its own implementations when Expressor is not loaded.

### `holyAPI_getBanks(jsonStr)`

Returns all snippet banks with fill state.

- **Input:** `JSON.stringify({ banksPath?: string })` -- `banksPath` is optional, defaults to `Folder.userData.fullName + "/HolyExpressor/banks.json"`
- **Returns:** `JSON.stringify({ ok: true, banks: [{ id, name, filled, total }], activeBankId })` on success
- **Error shape:** `{ ok: false, err: string }`

### `holyAPI_saveSnippet(jsonStr)`

Saves an expression to a specific bank slot.

- **Input:** `JSON.stringify({ expr: string, name: string, bankId?: string, banksPath?: string })`
  - `bankId` omitted or null = use `activeBankId`
  - `SNIPPETS_PER_BANK = 3` is enforced (must match `main_SNIPPETS.js`)
- **Returns manifest shape:** `{ attempted, succeeded, failed: [{ name, reason }], warnings, ok, bankName, snippetName, bankId }`
- **Side effect:** Dispatches `com.holy.agent.banksUpdated` CSEvent on success, which triggers Expressor's `main_SNIPPETS.js` listener to reload from disk and re-render

### `holyAPI_applyToTarget(jsonStr)`

Applies an expression to layers matched by targeting criteria.

- **Input:** `JSON.stringify({ expr: string, ... })` (targeting parameters)
- **Returns:** `{ ok, warnings: [], err?: string }`
- **Error shape includes:** `holyAPI_applyToTarget error: <message>`

### General Contract

- All three functions accept a single `jsonStr` parameter (JSON-encoded string)
- All three return a JSON-encoded string
- All three wrap their bodies in `try/catch` and return `{ ok: false, err: ... }` on failure
- Holy Agent must always `JSON.parse()` the return value

**Files:** `jsx/Modules/host_AGENT_API.jsx`

**Citations:**
- `jsx/Modules/host_AGENT_API.jsx` -> `holyAPI_getBanks()` (line 25), `holyAPI_saveSnippet()` (line 91), `holyAPI_applyToTarget()` (line 241)

---

## Entry Points (Multi-Panel Architecture)

Holy Expressor is a multi-panel CEP extension. Each panel is a separate HTML entry point with its own CEP JS context.

| Panel | Entry HTML | Purpose |
|-------|-----------|---------|
| Main | `index.html` | Full editor, expression tools, snippet banks, search/replace |
| Quick Panel | `quickpanel.html` | Lightweight snippet-focused panel; loads subset of modules plus `js/quickpanel.js` |
| Color Picker | `colorpicker.html` | Floating hue picker with theme sync; separate panel context |

### Key architectural consequences:

- Each panel creates its own `CSInterface()` instance
- Panels do **not** share `Holy.*` namespace, globals, or localStorage
- Cross-panel communication goes through CSInterface events (`com.holy.expressor.sync.state`) and shared disk files (`banks.json`, `panel-state.json`)
- The manifest (`CSXS/manifest.xml`) is the source of truth for extension IDs, entry files, host version, and runtime requirements
- Quick Panel uses `<AutoVisible>true</AutoVisible>` + `<Type>Modeless</Type>` to resolve blank-first-open compositor binding issues

**Files:** `index.html`, `quickpanel.html`, `colorpicker.html`, `CSXS/manifest.xml`

---

## Global Dev Log

- 1: Initial architecture documented from ROADMAP_CODE_MAP.md, KNOWLEDGE_BASE.md, and z_DEPRECATED_AGENTS.md source files.
- 2: DEV ARCHIVE addendum -- added 5 new traps (ES3 null key, function-in-try, $.evalFile silent failure, CSEvent.data coercion, solid type detection), ISO_ReportLine_dispatch canonical channel.
