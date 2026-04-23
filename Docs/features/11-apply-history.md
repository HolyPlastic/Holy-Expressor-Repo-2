# Apply History

**Files:** `js/main_BUTTON_LOGIC_1.js` (log capture, formatting, broadcast, window launch), `js/main_UTILS.js` (customer-facing history emitter), `js/main_UI.js` (History button wiring), `js/main_EXPRESS.js` (custom-search apply logging), `jsx/Modules/host_UTILS.jsx` (ScriptUI history dialog)
**Key functions:** `formatApplyLogEntry()`, `updateApplyReport()`, `broadcastApplyLogEntries()`, `openApplyLogWindow()`, `handleSearchApplyResult()`, `NEW_forCustomer_emit()`, `NEW_forCustomer_showDialog()`
**UI Section:** The "History" button sits in the dev/utility row of the main panel (`index.html`, `#NEW_forCustomer_openLogButton`). A secondary `#openApplyLog` button is wired in `main_BUTTON_LOGIC_1.js` but has no corresponding DOM element in the current `index.html`.

Holy Expressor maintains two parallel apply-history systems. The **developer log** (`applyLogEntries[]` in `main_BUTTON_LOGIC_1.js`) captures structured per-operation records every time an expression is applied -- via Blue Apply, Orange Apply (Target List), Custom Search, Search & Replace, or Snippet apply -- and can broadcast them to a dedicated log panel extension (`com.holy.expressor.log`) over CSEvents. The **customer-facing history** (`window.NEW_forCustomer_history[]` in `main_UTILS.js`) captures human-readable one-line summaries with timestamps, displayed in a ScriptUI dialog launched from the "History" button. Both systems are session-only; neither persists across AE restarts.

*For the Apply system itself, see `Docs/features/02-apply-system.md`. For persistence, see `Docs/features/10-persistence-state.md`.*

---

## 11.1 Log Capture

Two capture paths feed the two history systems:

### Developer log (`applyLogEntries[]`)

Every apply operation calls `updateApplyReport(title, data)` (exported on `Holy.BUTTONS`). This function:

1. Delegates to `formatApplyLogEntry(title, data)` which parses the JSX result payload and assembles a multi-line text block containing: timestamp, status (`ok`/`error`), applied count, skipped count, expression name, target paths, per-target errors, and raw details.
2. Pushes the formatted entry onto the in-memory `applyLogEntries[]` array, capped at `APPLY_LOG_MAX_ENTRIES` (250) via FIFO shift.
3. Updates the `#applyReport` DOM element (if present) with the latest entry text.
4. Calls `broadcastApplyLogEntries()` to dispatch the full log array as a `com.holy.expressor.applyLog.update` CSEvent.

Call sites that feed this log:
- **Blue Apply (Selection Striker):** `main_BUTTON_LOGIC_1.js` line ~256 -- `updateApplyReport("Blue Apply", report)`
- **Blue Apply by Custom Search:** `main_EXPRESS.js` line ~154 -- `Holy.BUTTONS.updateApplyReport("Blue Apply by Custom Search", report)`
- **Orange Apply (Target List):** `main_BUTTON_LOGIC_1.js` line ~435 -- `updateApplyReport("Orange Apply (Target List)", r)`
- **Apply by Search (Custom Search):** `main_BUTTON_LOGIC_1.js` via `handleSearchApplyResult(raw, logLabel)` which calls `updateApplyReport(logLabel || "Apply by Search", ...)`
- **Snippet apply:** `main_SNIPPETS.js` line ~599 -- `Holy.BUTTONS.updateApplyReport("Snippet: <name>", res)`

### Customer-facing history (`window.NEW_forCustomer_history[]`)

`NEW_forCustomer_emit(txt)` in `main_UTILS.js` (exported as `Holy.UTILS.NEW_forCustomer_emit`) builds a `[MM/DD <diamond> HH:MM]` timestamp and pushes the timestamped string onto `window.NEW_forCustomer_history`. This is called from multiple modules after successful applies, snippet switches, and control applications to give the user a concise activity trail.

---

## 11.2 Log Display

### Developer log panel (CSEvent broadcast)

`openApplyLogWindow()` attempts to open the dedicated log panel extension (`com.holy.expressor.log`) via `cs.requestOpenExtension()`. If that fails (extension not registered), it falls back to opening `log.html` via `cs.openURLInDefaultBrowser()`. The log panel, when open, requests the current entries by dispatching a `com.holy.expressor.applyLog.request` CSEvent; the main panel responds with the full `applyLogEntries[]` array via the `.update` event.

The `#openApplyLog` button in `wirePanelButtons()` is wired to call `openApplyLogWindow()`, but this button does not currently exist in `index.html`, so this code path is effectively dead. The `log.html` file also does not exist in the repository.

### Customer-facing History dialog

The "History" button (`#NEW_forCustomer_openLogButton`) in `index.html` is wired in `main_UI.js`. When clicked, it joins `window.NEW_forCustomer_history` into a newline-separated string, URI-encodes it, and calls `cs.evalScript('NEW_forCustomer_showDialog("...")')`.

`NEW_forCustomer_showDialog(logText)` in `jsx/Modules/host_UTILS.jsx` opens a ScriptUI `Window("dialog")` titled "History Log" with a scrollable, resizable multiline `edittext` field (minimum 400x200) and a "Close" button. The decoded log text is displayed as-is.

### Inline report box

`updateApplyReport()` also writes the latest entry's text into a DOM element with id `applyReport` (if present in the current panel HTML).

---

## 11.3 Log Persistence

Neither history system persists across sessions. Both are purely in-memory:

- `applyLogEntries[]` is a module-scoped array inside the `main_BUTTON_LOGIC_1.js` IIFE. It resets when the panel reloads or AE restarts.
- `window.NEW_forCustomer_history` is a property on the CEP panel's `window` object, also lost on reload/restart.

There is no integration with `Holy.PERSIST` or `persistent-store.js` for either log system.

---

## Open Bugs

*When a bug is resolved: apply `~~strikethrough~~` and add a Dev Log entry noting the fix. Do not delete.*

- **Log shows zero values in some cases.** Seen with Custom Search applies. Appears correlated with Toast issues reporting zero / nothing found. Indicates shared source of truth or timing bug between Log and Toast. (Source: `AGENTS/TO-DO.md`, Log section.)
- **`logPanelEvent` is called but never defined.** Multiple modules (`main_SNIPPETS.js`, `main_SEARCH_REPLACE.js`) call `Holy.BUTTONS.logPanelEvent(title, context, payload)` but this function is never implemented or exported in `Holy.BUTTONS`. All such callsites silently no-op. (Source: `AGENTS/CODEX AUDIT.md`.)
- **`#openApplyLog` DOM element missing.** `wirePanelButtons()` in `main_BUTTON_LOGIC_1.js` wires a click handler on `#openApplyLog`, but no element with that id exists in `index.html`. The developer log panel open path is dead.
- **`log.html` does not exist.** The fallback path in `openApplyLogWindow()` constructs a URL to `log.html` in the extension directory, but this file is not present in the repository.

---

## Dev Log

- 1: Initial feature documentation created from AGENTS/ migration.
- 2: Moved customer-facing history trigger out of the main panel. `#NEW_forCustomer_openLogButton` (History) removed from `index.html` dev-row; its click wiring removed from `js/main_UI.js`. The LOG button in `settings.html` now owns this: it dispatches a `holy.settings.showLog` CSEvent. A new listener for that event was added inside `connectColorSyncOnce` in `index.html` — it reads `window.NEW_forCustomer_history`, encodes it, and calls `NEW_forCustomer_showDialog()`. History data still lives in the main panel's window context; the settings panel only triggers display.
