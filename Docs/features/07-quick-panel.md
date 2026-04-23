# Quick Panel

> **Status (CEP panel):** Available but superseded by the native rewrite. Retained as fallback / snippet-manager shell.
> **Status (native .aex):** Phase 4 complete and functional in AE 2026. All wiring done. Styling polish is the remaining work.

**Files:** `quickpanel.html`, `js/quickpanel.js` -> `primeHostBridge()`, `ensureHostBridge()`, `whenHostBridgeReady()`, `waitForQuickPanelModules()`, `initSnippets()`, `rebindSnippetsUI()`, `renderSnippets()`, `ensurePanelPainted()`, `guaranteePanelLayout()`, `kickInitialPaint()`, `scheduleColdStartRecovery()`, `sendWarmWake()`, `forcePanelRepaint()`, `attachFocusRehydrationListener()`, `installLogProxy()`
**UI Section:** Separate CEP panel (`com.holy.expressor.quickpanel`)

The Quick Panel is a lightweight, snippet-focused companion panel registered alongside the main Expressor panel. It presents the user's snippet banks in a compact, distraction-free layout so expressions can be browsed and applied without switching focus to the full editor UI. The panel runs in its own CEP context (`quickpanel.html`), loads a shared subset of the main panel's JS modules (UTILS, STATE, MENU, UI, EXPRESS, BUTTON_LOGIC_1, SNIPPETS), and independently bootstraps its own host bridge to communicate with After Effects. It is registered in the manifest with `<AutoVisible>true</AutoVisible>` and appears in the AE Window menu as **Holy Quick Panel**.

*For cross-panel state and event routing, see `Docs/ARCHITECTURE.md`.*

---

## 7.1 Panel Behavior

### Launch

The quick panel can be opened from the main panel via a launcher button (`#quickAccessLaunchBtn`) wired in `main_UI.js`. The launcher calls `ensureHostReady()` first, then issues `cs.requestOpenExtension("com.holy.expressor.quickpanel")`. Because `AutoVisible` is set in the manifest, AE may also create and bind the panel at application startup.

### Bootstrap Sequence

On `DOMContentLoaded`, `quickpanel.js` performs the following in order:

1. **Theme boot** -- an inline IIFE in `quickpanel.html` reads `localStorage('he_theme')` and applies the theme class before any scripts load.
2. **Log proxy install** -- `installLogProxy(cs)` intercepts `console.log/info/warn/error` and re-dispatches each call as a `com.holy.expressor.quickpanel.log` CSEvent so the main panel can relay quick-panel logs.
3. **Native context-menu suppression** -- delegates to `Holy.MENU.contextM_disableNative()`.
4. **Host bridge priming** -- `ensureHostBridge(cs)` loads the JSX host modules (`host_UTILS`, `host_MAPS`, `host_GET`, `host_APPLY`, `host_DEV`, `host.jsx`) directly via `cs.evalScript('$.evalFile(...)')`, independently of the main panel's `loadJSX()` path. It then verifies the bridge by checking that `he_S_SS_applyExpressionToSelection` resolves as a function.
5. **Module readiness gate** -- `waitForQuickPanelModules()` polls until `Holy.SNIPPETS`, `Holy.UI`, and `Holy.State` are all initialized (up to 15 attempts at 120 ms intervals), then proceeds.
6. **State init** -- `Holy.State.init({ panel: "quick" })` and `Holy.State.attachPanelBindings()`.
7. **Snippet init + render** -- `initSnippets()` -> `renderSnippets()` -> `rebindSnippetsUI()`.
8. **Paint verification** -- `kickInitialPaint()` uses a double-`requestAnimationFrame` with a visibility flip to force the compositor, then `guaranteePanelLayout()` retries up to 6 times if the snippet row measures zero height.
9. **Cold-start recovery** -- `scheduleColdStartRecovery(cs)` fires two delayed checks (300 ms and 900 ms) that re-run rebind, render, repaint, and optionally `Holy.State.reload()` if the panel is still blank.
10. **Warm wake handshake** -- `sendWarmWake(cs)` dispatches a log-level CSEvent to signal the main panel that the quick panel is alive.
11. **Focus rehydration** -- `attachFocusRehydrationListener()` listens for `window.focus` and calls `Holy.State.reload()` to pick up any state changes that occurred while the quick panel was backgrounded.

### Close

A close button (`#quickPanelCloseBtn`) calls `cs.closeExtension()` to dismiss the panel.

### Manifest Geometry

Default size 320x150, min 150x100, max 200x200 (as defined in `CSXS/manifest.xml`).

---

## 7.2 Snippet Display & Selection

The quick panel's DOM mirrors a subset of the main panel's snippet UI:

- **`#bankHeader`** -- contains the bank name label (`#bankNameLabel`), a dropdown trigger (`#bankSelectBtn`), and a context menu (`#bankSelectMenu`) for switching between snippet banks.
- **`#snippetsRow`** -- the container into which `Holy.SNIPPETS.renderSnippets()` injects snippet button elements. This is the same render path used by the main panel; `cy_resolveDoc()` in `main_SNIPPETS.js` returns `window.document`, which naturally resolves to whichever panel's document is executing.
- **`#snippetContextMenu`** -- a two-item context menu with **Edit** (`data-action="edit"`) and **Express...** (`data-action="express"`). Right-clicking a snippet tile opens this menu via `Holy.MENU.contextM_menuBuilder()`, and the selected action routes through `contextM_SNIPPETS_actionHandler()`.

### Context-Menu Actions

| Action | Behavior |
|--------|----------|
| `edit` | Opens the snippet edit UI for the selected snippet (`openSnippetEditUI`). |
| `express` | Sends the snippet's expression text to the Express area via `cy_sendToExpressArea()`. |

Bank switching and header rendering are handled by the shared `bankBinder()` and `renderBankHeader()` functions from `main_SNIPPETS.js`, which are invoked during `rebindQuickAccessUI()`.

---

## 7.3 Event Routing

The quick panel and main panel communicate through CEP application-scoped events:

### Quick Panel -> Main Panel

- **Log relay** (`com.holy.expressor.quickpanel.log`): Every `console.*` call in the quick panel is serialized and dispatched as a CSEvent. The main panel's `main_UI.js` registers a `quickPanelLogListener` that deserializes the payload and replays it in the main panel's console, giving a unified log stream. The main panel only attaches this listener when it detects it is *not* running as the quick panel (checks `document.body.classList.contains("quick-panel")`).

- **Warm wake handshake** (`com.holy.expressor.quickpanel.log`, level `info`): On startup, the quick panel dispatches a "Warm wake handshake" message so the main panel knows the quick panel is alive.

### Main Panel -> Quick Panel

- **LiveSync** (`com.holy.expressor.stateChanged`): When any state change occurs in the main panel, `main_STATE.js` dispatches a `com.holy.expressor.stateChanged` event with a `banksChanged` type payload. The quick panel listens for this event and calls `Holy.SNIPPETS.init()` to reload and re-render its snippet display, keeping both panels in sync.

### Shared Infrastructure

- **`Holy.State`** -- both panels call `Holy.State.init()` and `Holy.State.reload()`. The quick panel passes `{ panel: "quick" }` to distinguish itself.
- **`Holy.SNIPPETS`** -- the snippet module is shared code loaded in both panels. `cy_resolveDoc()` ensures DOM operations target the correct document context.
- **`Holy.MENU`** -- context-menu positioning and native-menu suppression are shared via the `main_MENU.js` module.
- **Host bridge** -- the quick panel independently loads JSX host modules rather than relying on the main panel's bridge. It loads the same modules (minus `host_PICKCLICK.jsx` and `host_AGENT_API.jsx`), verified by checking for `he_S_SS_applyExpressionToSelection`.

---

---

## 7.4 Native Hybrid Rewrite (`.aex` + ScriptUI)

### Why

The CEP Quick Panel has two structural problems that cannot be solved inside CEP:

1. **Cross-panel LiveSync is unreliable** — CEP events don't reliably propagate across isolated JS runtimes. Snippet edits in the main panel don't auto-refresh the Quick Panel.
2. **Window chrome cannot be removed** — CEP modeless windows inherit the native OS frame. A borderless, cursor-spawned popup (like Video Copilot's FX Console) is impossible from inside CEP.

The native rewrite follows the same hybrid architecture as **FX Console** (`C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\Scripts\ScriptUI Panels\FX Console.jsx` + `FXConsole.aex`): a `.aex` AEGP plugin handles the popup; the CEP panel remains as the snippet manager and editor shell.

### File Layout

```
aex/
├── HolyQuickPanel/
│   ├── HolyQuickPanel.cpp          # AEGP entry point + Win32 popup + all wiring
│   ├── HolyQuickPanel.h
│   ├── HolyQuickPanel_Strings.cpp
│   ├── HolyQuickPanel_PiPL.r
│   ├── resource.h
│   ├── Win/
│   │   ├── HolyQuickPanel.vcxproj  # x64 only; SDK path via <HolyAESDK> MSBuild property
│   │   └── HolyQuickPanel_PiPL.rc
│   └── third_party/json.hpp        # nlohmann/json (vendored)
├── build/AEGP/HolyQuickPanel.aex   # build output (~460 KB)
└── scripts/
    ├── build_holy_quick_panel.bat  # rebuild (no admin)
    └── install.bat                 # copy to AE Plug-ins (admin required)
```

**SDK path:** `<HolyAESDK>` in `HolyQuickPanel.vcxproj` → `C:\Users\Ben\NEXUS\_GRID\_GRID_Ae\_SCRIPTS__Ae\ae25.6_61.64bit.AfterEffectsSDK\Examples`. If the SDK moves, update that one property.

**Installed at:** `C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\Plug-ins\HolyQuickPanel.aex`

### What the Popup Does

Triggered from `Window > Holy Quick Panel` (keyboard-shortcut-assignable via `Edit > Keyboard Shortcuts`):

1. Reads `%APPDATA%\HolyExpressor\banks.json` (active bank + all banks for menu) and `quickpanel.json` (checkbox state) via `nlohmann::json`.
2. Creates a borderless **400×110** Win32 popup at cursor (`WS_POPUP | WS_EX_TOOLWINDOW | WS_EX_TOPMOST`), clipped to 8px rounded corners via `SetWindowRgn`.
3. Paints the header: accent-filled shield badge (GDI+ path), bank name in **Dosis** (TTF embedded as `IDR_FONT_DOSIS` RCDATA in the `.aex`), right-cluster icons (controls indicator, load-controls checkbox, grey divider, snippet manager). All icons are GDI+ hand-drawn approximations of the CEP SVG originals.
4. Renders 3 owner-drawn `BUTTON` controls edge-to-edge. Text is uppercased at draw time; pressed state uses a subtle accent tint.
5. Outside-click dismiss via `WH_MOUSE_LL` global mouse hook. Esc dismiss via `WM_KEYDOWN` (best-effort — see Open Bugs).

### Interactive Elements

| Element | Interaction | What happens |
|---------|-------------|--------------|
| **Snippet button (1–3)** | Click | Applies expression to selected layer properties via `AEGP_ExecuteScript`. Shows "APPLIED!" in header for 350 ms then dismisses. |
| **Shield badge** | Click | `TrackPopupMenu` listing all banks; checked = active. Selecting writes `activeBankId` to `banks.json` via `WriteActiveBankId()`, reloads, redraws. |
| **Load-controls checkbox** | Click | Toggles `g_loadControlsOn`; persisted to `quickpanel.json`. When on, apply also runs a self-contained ExtendScript that reads `banks.json` and applies `controls.effects[].properties[]` to selected layers via `ADBE Effect Parade / addProperty / setValue`. Works without CEP panel open. |
| **Snippet manager icon** | Click | Writes `{ "openSnippetManager": true }` to `quickpanel.json`, dismisses popup. Main CEP panel polls every 2 s and calls `Holy.SNIPPETS.cy_openSnippetManager()`. |

### `quickpanel.json` — Cross-Process State File

Sits at `%APPDATA%\HolyExpressor\quickpanel.json` alongside `banks.json`. Format:

```json
{
  "loadControlsOn": true,
  "openSnippetManager": true
}
```

- `loadControlsOn` — written by the `.aex` on checkbox toggle, read on popup open. Session-persistent across AE restarts.
- `openSnippetManager` — written by `.aex` on mgr icon click, consumed + cleared atomically by the CEP panel's 2 s poll (`main_DEV_INIT.js` → `setInterval` → ExtendScript `File` API).

The `.aex` always round-trips the full file (`ReadQuickPanelJson` / `WriteQuickPanelJson`) so neither side clobbers the other's keys.

### CEP Poll (`main_DEV_INIT.js`)

Added inside `init()` after `Holy.SNIPPETS.init()`:

```js
setInterval(function() {
  Holy.UI.cs.evalScript(/* ExtendScript that reads quickpanel.json, clears flag, returns "1" if set */,
    function(result) {
      if (result === "1") Holy.SNIPPETS.cy_openSnippetManager();
    }
  );
}, 2000);
```

The ExtendScript uses `Folder.userData.fullName + "/HolyExpressor/quickpanel.json"` (AE's `Folder.userData` → `%APPDATA%` on Windows).

### Build Workflow

```bash
# 1. Quit AE fully (LNK1168 if any AfterFX.exe process is alive)

# 2. Rebuild (no admin required)
cmd //c "aex/scripts/build_holy_quick_panel.bat"

# 3. Check if hardlink held — if nlink=3 and timestamp matches, install is not needed
ls -la "/c/Program Files/Adobe/Adobe After Effects 2026/Support Files/Plug-ins/HolyQuickPanel.aex"

# 4. If not, install (requires admin — right-click install.bat > Run as administrator)
```

### Key Implementation Notes

- **`DllMain` captures `g_hAexInstance`** — `FindResourceW` for the embedded Dosis font needs the plugin's own `HINSTANCE`, not AE's.
- **GDI+ lazy-started, never shut down** — `HQP_EnsureGdipStarted()` fires on first paint. `GdiplusShutdown` is intentionally not called on DLL unload (deadlock risk at process exit).
- **`AddFontMemResourceEx`** keeps Dosis private to the process (no system-wide install, no leak if DLL is unloaded without a matching `RemoveFontResourceEx`).
- **`GetClusterRects()`** is the single source of truth for the right-cluster icon layout — shared between `WM_PAINT`, `WM_LBUTTONDOWN`, and `WM_SETCURSOR` to prevent drift.
- **Controls apply is self-contained** — the inline ExtendScript in `HQP_ApplySnippetExpression` reads `banks.json` directly from disk. It does not call `holy_applyControlsJSON` from `host_APPLY.jsx`, so it works regardless of whether the CEP panel is open. Requires AE 2022+ for `JSON.parse` in ExtendScript.
- **`jsx/scriptui/HolyQuickPanel.jsx`** — keep as reference until the native plugin reaches full feature parity. Remove from `ScriptUI Panels/` only after retirement: as long as it lives there, AE auto-creates an empty docked panel with a pink highlight border (because it uses `new Window("palette", ...)` and ignores `thisObj`).

---

## Open Bugs

*When a bug is resolved: apply `~~strikethrough~~` and add a Dev Log entry noting the fix. Do not delete.*

**CEP quick panel:**
- The manifest `MaxSize` (200x200) is smaller than the `Size` (320x150), which means the panel's default width of 320 may be clamped to 200 on some AE/OS configurations. This could cause horizontal clipping of snippet tiles.
- `guaranteePanelLayout()` and `scheduleColdStartRecovery()` contain aggressive retry/repaint logic, suggesting an unresolved intermittent blank-panel bug where the snippet row renders at zero height on cold or warm start.
- The `contextM_SNIPPETS_actionHandler` function is defined twice in `main_SNIPPETS.js` (two identical declarations), indicating a possible copy-paste duplication that should be consolidated.

**Native .aex quick panel:**
- **Mojibake in painted text** — any wide-char string literal in `HolyQuickPanel.cpp` that contains non-ASCII characters (em-dash etc.) will render as garbage unless the source file is saved as UTF-8 BOM. Current workaround: avoid non-ASCII in string literals; use plain `-` instead of em-dash. Trivial fix: save the file with BOM or use `L"\u2014"` escapes.
- **Esc dismiss is best-effort** — `SetForegroundWindow` may be denied by Windows if AE retains the foreground at popup creation time, so `WM_KEYDOWN` won't route to the WndProc. Click-outside dismiss (global `WH_MOUSE_LL` hook) always works.

---

## Dev Log

- 1: Initial feature documentation created from AGENTS/ migration.
- 2: Native hybrid rewrite (.aex + ScriptUI) completed. Phases 1–4 done: AEGP plugin registers `Window > Holy Quick Panel`, creates borderless Win32 popup at cursor, reads `banks.json`, renders bank name + 3 snippet buttons in Dosis. Phase 2.5: GDI+ icon drawing (shield, checkbox, controls indicator, snippet manager), rounded corners, right-cluster layout via `GetClusterRects()`. Phase 4 (this session): all functional wiring landed — checkbox persistence (`quickpanel.json`), bank-switcher on shield click (`TrackPopupMenu` + `WriteActiveBankId`), snippet manager flag bridge (`quickpanel.json` → CEP 2 s poll in `main_DEV_INIT.js` → `Holy.SNIPPETS.cy_openSnippetManager()`), controls payload apply (self-contained ExtendScript reads `banks.json`, applies `controls.effects[].properties[]` via `ADBE Effect Parade`), status strip ("APPLIED!" in accent for 350 ms via `SetTimer` before dismiss).
