# Persistence & State

**Files:** `js/persistent-store.js` → `Holy.PERSIST.get`, `set`, `remove`, `refresh` | `js/panel_state.js` → `HolyPanelState.save`, `restore`, `resolvePanelId` | `js/main_STATE.js` → `Holy.State.init`, `update`, `subscribe`, `attachPanelBindings`, `bindEditor`, `reload`
**UI Section:** N/A (background system)

Holy Expressor uses a three-layer persistence architecture. `persistent-store.js` provides a universal key-value adapter (`Holy.PERSIST`) that writes through a CSInterface / CEP / localStorage fallback chain, used for isolated settings like theme color. `main_STATE.js` manages a structured application state object (`Holy.State`) covering expression text, search flags, and comp-mode toggles, persisting them to a shared JSON file on disk and synchronizing changes across panels via CEP `CSEvent` broadcasts. `panel_state.js` (`Holy.PanelState`) handles window geometry (position and size) for every panel, saving to and restoring from `localStorage` on unload/load.

*For storage layout details, see `Docs/ARCHITECTURE.md`.*

---

## 10.1 Persistent Store

`js/persistent-store.js` exposes `Holy.PERSIST` with four methods: `get(key)`, `set(key, value)`, `remove(key)`, and `refresh()`.

**Adapter construction (`buildAdapter`):** On first access, the module lazily builds a storage adapter via `ensureAdapter() -> buildAdapter()`. It probes for a `CSInterface` instance and the raw `window.__adobe_cep__` object. Each read/write/remove operation attempts three backends in priority order:

1. **CSInterface** -- `tryGetFromCS` / `trySetToCS` / `tryRemoveFromCS` using `csInstance.getPersistentData(key)` and its counterparts.
2. **Raw CEP** -- `tryGetFromCEP` / `trySetToCEP` / `tryRemoveFromCEP` using `window.__adobe_cep__.getPersistentData(key, extensionId)`. Falls back to the unscoped overload if the scoped call throws.
3. **localStorage** -- `getLocal` / `setLocal` / `removeLocal` using `window.localStorage`.

`get` returns the first non-null value found. `set` returns `true` on the first backend that succeeds. `remove` attempts all three backends and returns `true` if any succeeded.

**`refresh()`** nulls the internal adapter, forcing `buildAdapter` to re-probe on the next call. Useful after environment changes.

**`describe()`** (internal to the adapter object) returns a diagnostic `{ hasCS, hasCSMethods, hasCEP }` shape for debugging which backend is active.

**Known persist keys in use:**
- `he_themeColor` -- accent color hex string, read/written by inline script in `index.html` and propagated to the color picker via CEP events.

All values are serialized to `String` before storage (`null`/`undefined` become `""`).

---

## 10.2 Panel State

`js/panel_state.js` exposes `Holy.PanelState` and manages **window geometry** (position and size) for each panel.

**Data shape stored per panel:** `{ x, y, w, h }` -- `screenX`, `screenY`, `outerWidth`, `outerHeight` of the panel window.

**Storage key format:** `holyExpressor_panel_{panelId}_pos` in `localStorage`.

**`resolvePanelId()`** inspects `document.title` to determine the panel identity:
- `/quick/i` -> `"quickpanel"`
- `/color picker/i` -> `"colorpicker"`
- default -> `"panel"` (main panel)

**Lifecycle hooks:**
- On `DOMContentLoaded`: calls `HolyPanelState.restore(panelId)`, which reads the stored JSON and calls `window.moveTo()` + `window.resizeTo()` to reposition the panel.
- On `beforeunload`: calls `HolyPanelState.save(panelId)`, which captures current window geometry and writes it to `localStorage`.

**Script load order:** `panel_state.js` is loaded synchronously (non-deferred) in `quickpanel.html` and `colorpicker.html`. In the main panel (`index.html`), window geometry is not managed by this module (the main panel is the host-docked panel and does not need moveTo/resizeTo).

---

## 10.3 Application State & Cross-Panel Communication

`js/main_STATE.js` exposes `Holy.State` and is the central state manager for application-level data shared across all panels.

### State shape (defaultState)

```
{
  expressionText: "",       // current editor/expression content
  useCustomSearch: false,   // whether custom search target is enabled
  customSearch: "",         // custom search string (NOT persisted to disk)
  useAbsoluteComp: false    // absolute comp mode toggle
}
```

`customSearch` is explicitly stripped before disk writes (`persistState` deletes it from the payload) to avoid stale search strings across sessions.

### Disk persistence

- **File path:** `{USER_DATA}/HolyExpressor/panel-state.json`, resolved via `Holy.UTILS.cy_getBanksPaths()` in `ensureStateFilePath()`.
- **File format:** `{ version: 1, updatedAt: <epoch ms>, projectPath: <string|null>, state: { ... } }`
- **Write:** `persistState()` serializes state via `Holy.UTILS.cy_writeJSONFile(path, payload)` (which calls `window.cep.fs.writeFile`).
- **Read:** `readStateFromDisk()` calls `Holy.UTILS.cy_readJSONFile(path)` (which calls `window.cep.fs.readFile` + `JSON.parse`).
- **Debounce:** `scheduleSave()` gates writes behind a 220ms `setTimeout`, coalescing rapid changes into a single disk write.

### Project-aware hydration

`init()` calls `fetchCurrentProjectPath()`, which invokes the host JSX function `he_GET_ProjectPath()` to get the currently open AE project path. On hydration from disk, the stored `projectPath` is compared against the current path. If they differ, `expressionText` and `useCustomSearch` are dropped from the loaded state to prevent stale expressions from a different project bleeding through.

### Cross-panel sync via CSEvent

Each `Holy.State` instance generates a unique `instanceId` at load time. When `applyState()` modifies the state object:

1. **Local listeners** are notified via `notifyListeners(origin, changedKeys)`.
2. **`broadcastState(changedKeys)`** dispatches a `CSEvent` with type `"com.holy.expressor.sync.state"` at `APPLICATION` scope, containing `{ sourceId, changed, state, timestamp }`.
3. **`dispatchLiveSyncEvent("banksChanged")`** (V4.1 LiveSync hook) dispatches a second `CSEvent` with type `"com.holy.expressor.stateChanged"` so other subsystems (e.g., snippet banks) can react to any state mutation.

Incoming events are handled by `handleIncomingEvent(evt)`, which parses the payload and calls `applyState` with `skipBroadcast: true` to avoid echo loops. Events from the same `instanceId` are ignored.

### Panel bindings (`attachPanelBindings`)

Called by `main_DEV_INIT.js` (main panel) and `quickpanel.js` (quick panel) after DOM ready. Binds the following DOM elements to state:

| DOM element | State key | Direction |
|---|---|---|
| `#useCustomSearch` (checkbox) | `useCustomSearch` | read/write |
| `#customSearch` (text input) | `customSearch` | read/write |
| `#useAbsoluteComp` (checkbox) | `useAbsoluteComp` | read/write |
| `#exprInput` (fallback text input) | `expressionText` | read/write |
| `#TargetBox` (visual) | derived from `useCustomSearch` | write-only (opacity/pointer-events) |

A `subscribe()` callback keeps these elements in sync when remote state changes arrive. Each element is bound only once (tracked via `dataset.holyStateBound`).

### Editor binding (`bindEditor`)

Called by `main_DEV_INIT.js` after CodeMirror initialization: `Holy.State.bindEditor(window.editor)`. This two-way-binds the CodeMirror 6 `EditorView` to `state.expressionText`:

- **Outbound:** A CodeMirror `updateListener` extension plus `keyup`/`input`/`blur` DOM listeners on `contentDOM` debounce-capture editor text (180ms) and call `update({ expressionText })`.
- **Inbound:** A `subscribe()` callback dispatches `editorView.dispatch({ changes })` when `expressionText` changes from an external source.
- Placeholder text (`"// Type your expression here..."`) is normalized to empty string in both directions.

### Reload

`Holy.State.reload()` re-reads state from disk and applies it with `skipBroadcast: true`. Called by the quick panel on `window.focus` and during cold-start recovery to pick up changes made by the main panel while the quick panel was backgrounded.

### Bootstrap sequence

1. `persistent-store.js` loads synchronously (provides `Holy.PERSIST`).
2. `main_STATE.js` loads deferred (provides `Holy.State`).
3. `main_DEV_INIT.js` calls `Holy.State.init({ panel: "main" })`, then `Holy.State.attachPanelBindings()`, then later `Holy.State.bindEditor(window.editor)`.
4. `quickpanel.js` calls `Holy.State.init({ panel: "quick" })`, then `Holy.State.attachPanelBindings()`.
5. `panel_state.js` self-initializes on `DOMContentLoaded` / `beforeunload` (window geometry only).

---

## Open Bugs

*When a bug is resolved: apply `~~strikethrough~~` and add a Dev Log entry noting the fix. Do not delete.*

- No known bugs.

---

## 10.4 Native Plugin Cross-Process State (`quickpanel.json`)

The native `.aex` Quick Panel popup uses a separate JSON file to share state with the CEP panel without touching `banks.json` or `panel-state.json`.

- **File path:** `%APPDATA%\HolyExpressor\quickpanel.json`
- **Written by:** `HolyQuickPanel.cpp` (`WriteQuickPanelJson`) — always round-trips the full file to avoid key clobbering.
- **Read by:** `HolyQuickPanel.cpp` (`ReadQuickPanelJson`) on popup open and on checkbox toggle; `main_DEV_INIT.js` poll via ExtendScript `File` API.

**Known keys:**

| Key | Type | Written by | Read by | Purpose |
|-----|------|-----------|---------|---------|
| `loadControlsOn` | bool | `.aex` (checkbox click) | `.aex` (popup open) | Persists the load-controls toggle across AE restarts |
| `openSnippetManager` | bool | `.aex` (mgr icon click) | CEP poll (`main_DEV_INIT.js`) | One-shot flag: CEP panel consumes and deletes it when it opens the snippet manager |

The `.aex` uses `nlohmann::json` (vendored at `aex/HolyQuickPanel/third_party/json.hpp`) for all reads and writes. The CEP-side poll uses ExtendScript `Folder.userData.fullName + "/HolyExpressor/quickpanel.json"` (equivalent to `%APPDATA%` on Windows, same root as the C++ `SHGetKnownFolderPath(FOLDERID_RoamingAppData)` path). See `Docs/features/07-quick-panel.md §7.4` for the full wiring.

---

## Dev Log

- 1: Initial feature documentation created from AGENTS/ migration.
- 2: Added §10.4 documenting `quickpanel.json` — the cross-process state file used by the native `.aex` Quick Panel popup to share checkbox state and one-shot flags with the CEP panel.
