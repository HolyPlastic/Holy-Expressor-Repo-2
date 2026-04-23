# Settings Panel

**Files:** `js/main_SETTINGS.js`, `settings.html`, `CSXS/manifest.xml`

The settings panel is a modeless dialog opened via the panel flyout menu (the hamburger dropdown next to the panel name in After Effects). It is the primary surface for user-configurable options.

---

## Access

The panel flyout menu is populated by `Holy.SETTINGS.init()` via `cs.setPanelFlyoutMenu(xmlString)`. The first item in the dropdown is **"Holy Settings"**. Clicking it fires `com.adobe.csxs.events.flyoutMenuClicked`, which `main_SETTINGS.js` intercepts. On match, it calls `cs.requestOpenExtension("com.holy.expressor.settings")`.

The settings panel is registered in the manifest as a **Modeless** extension with `<AutoVisible>false</AutoVisible>` — it only appears when explicitly opened via the flyout.

---

## Architecture

- `main_SETTINGS.js` exports `Holy.SETTINGS = { init, openSettingsPanel }`.
- `Holy.SETTINGS.init()` is called from `main_DEV_INIT.js` → `init()`, after `Holy.MENU.contextM_disableNative()`.
- The settings panel (`settings.html`) is a standalone CEP context. It has no access to `Holy.*` from the main panel — this is the standard CEP isolation constraint (see `ARCHITECTURE.md` → Traps → "Panels run in isolated CEP JS contexts").
- If the panel needs to read or write persistent settings in future, use `Holy.PERSIST` (available in `js/persistent-store.js`, which is loaded by `settings.html`).
- The panel's close button calls `window.close()`.

---

## Flyout Menu XML

```xml
<Menu>
  <MenuItem Id="holy-settings" Label="Holy Settings" Enabled="true" Checked="false"/>
  <MenuItem Label="---"/>
</Menu>
```

The separator (`---`) visually divides the Holy Settings item from AE's native flyout entries below it.

---

## Open Bugs

*When a bug is resolved: apply `~~strikethrough~~` and add a Dev Log entry noting the fix. Do not delete.*

*(none yet)*

---

## Dev Log

- 1: Initial implementation. Flyout menu entry "Holy Settings" wired via `setPanelFlyoutMenu` + `flyoutMenuClicked` listener. Modeless `settings.html` panel registered in manifest as `com.holy.expressor.settings`. Two placeholder sections (General, Editor) with disabled controls. Feature doc created.
