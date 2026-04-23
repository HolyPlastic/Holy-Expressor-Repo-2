# Settings Panel

**Files:** `js/main_SETTINGS.js` → `init()`, `openSettingsPanel()` | `settings.html`
**UI Section:** Panel flyout menu (hamburger dropdown next to the panel title in AE)

The Settings Panel is the user-facing configuration surface for Holy Expressor. It is accessed exclusively via the **Holy Settings** item at the top of the panel's flyout menu — the dropdown AE attaches to every docked panel. Clicking it opens a modeless floating window (`settings.html`) registered as `com.holy.expressor.settings`. The panel runs in its own isolated CEP context and has no direct access to the main panel's `Holy.*` namespace; any future settings that need to read or write persistent data should use `Holy.PERSIST` via `js/persistent-store.js`, which is loaded in `settings.html`.

*For CEP cross-panel isolation constraints and the `requestOpenExtension` pattern, see `Docs/ARCHITECTURE.md`.*

---

## 0.1 Flyout Menu & Settings Cog

`Holy.SETTINGS.init()` is called from `main_DEV_INIT.js` → `init()` after `Holy.MENU.contextM_disableNative()`. It calls `cs.setPanelFlyoutMenu(xmlString)` to register the Holy Settings entry in the panel dropdown. The XML:

```xml
<Menu>
  <MenuItem Id="holy-settings" Label="Holy Settings" Enabled="true" Checked="false"/>
  <MenuItem Label="---"/>
</Menu>
```

Custom items registered via `setPanelFlyoutMenu` appear **above** AE's native entries (Close Panel, Undock Panel, etc.). The separator (`---`) visually divides Holy Settings from those native items.

The module then listens on `com.adobe.csxs.events.flyoutMenuClicked`. CEP may deliver `event.data` as a plain object or as a JSON-serialised string depending on host version; `init()` handles both by attempting `JSON.parse(data)` when `typeof data === "string"`. A match on `data.menuId === "holy-settings"` (or `data.menuName === "Holy Settings"` as a fallback) triggers `openSettingsPanel()`.

> ⚠️ `setPanelFlyoutMenu` replaces the entire custom menu on each call. If other modules need flyout entries in future, they must be consolidated into a single XML string and a single `setPanelFlyoutMenu` call — calling it multiple times overwrites, not appends.

---

## 0.2 Settings Panel Window

`openSettingsPanel()` calls `cs.requestOpenExtension("com.holy.expressor.settings", "")`. The extension is registered in `CSXS/manifest.xml` as `<Type>Modeless</Type>` with `<AutoVisible>true</AutoVisible>`.

The `<AutoVisible>true</AutoVisible>` flag is **load-bearing**. Without it, AE does not pre-bind a compositor GPU surface for the window at startup. When `requestOpenExtension` is subsequently called, the CEP process spawns but the window never renders on screen — the process appears in Task Manager but nothing shows in AE. Setting `AutoVisible` to true forces AE to pre-initialize the surface. This is consistent with the fix applied to the Quick Panel and Color Picker (see DEV ARCHIVE, 2025-10-30).

`settings.html` loads `css/styles.css` for the full CSS variable system and runs an inline `STYLE_boot` IIFE that mirrors `colorpicker.html`: reads `he_theme` from `localStorage`, reads `he_themeColor` (fallback `#7c6cfa`), decomposes it to HSL and RGB, and writes all five Tier 1 theme primitives onto `:root` before first paint. This ensures the settings panel inherits the user's current accent color.

~~The close button (`#hsCloseBtn`) calls `window.close()`.~~ Removed in Dev Log entry 4; the native OS window X is the only close affordance.

---

## 0.3 Tools Section (Current State)

The panel contains one "Tools" section with two functional action buttons.

| Section | Button | Label | Action |
|---------|--------|-------|--------|
| Tools | `#hsVibeBtn` | VIBE | Opens `HLMColorPicker` inline; applies accent color via `applyVibeColor()`, persists to `localStorage`, and broadcasts `holy.color.change` CSEvent to the main panel |
| Tools | `#hsLogBtn` | LOG | Dispatches `holy.settings.showLog` CSEvent; main panel's `connectColorSyncOnce` listener receives it and calls `NEW_forCustomer_showDialog()` with the in-memory history |

Both buttons have SVG icons (palette motif for VIBE, document/list motif for LOG). `js/colorpicker.js` is loaded in `settings.html` to provide `HLMColorPicker`. The `holy.settings.showLog` listener is registered inside `connectColorSyncOnce` in `index.html`.

---

## Open Bugs

*When a bug is resolved: apply `~~strikethrough~~` and add a Dev Log entry noting the fix. Do not delete.*

*(none)*

---

## Dev Log

- 1: Initial implementation. Flyout menu entry "Holy Settings" wired via `setPanelFlyoutMenu` + `flyoutMenuClicked` listener in `js/main_SETTINGS.js`. Modeless `settings.html` panel registered in manifest as `com.holy.expressor.settings` with `AutoVisible true` to resolve compositor attach race. Two placeholder sections (General, Editor) with disabled controls. Feature doc created at `00-settings.md`; `12-settings.md` de-listed from index (superseded by this file).
- 2: Replaced placeholder sections with a live "Tools" section. Added VIBE button (opens `HLMColorPicker`, broadcasts `holy.color.change`) and LOG button (dispatches `holy.settings.showLog` CSEvent). Removed `#openThemePicker` and `#NEW_forCustomer_openLogButton` from `index.html`; removed color picker init + `applyThemeColor`/`hexToRgb`/`rgbToHsl` block from `index.html`; removed `colorpicker.js` defer load from `index.html`; removed openLogButton wiring from `js/main_UI.js`. `holy.settings.showLog` listener added to `connectColorSyncOnce` in `index.html`.
- 3: Replaced HLMColorPicker popup with a full-panel inline HSV color picker. VIBE button now switches the settings panel between two views: the settings view (default) and the color picker view. Color picker view contains a 2D canvas-based saturation/value spectrum (the "big board"), a hue slider strip, a hex input field with native OS picker trigger, and three icon-only footer buttons: undo (CCW arrow, small — reverts to color from before picker was opened), apply (tick — persists to localStorage + CSEvent + closes window), cancel (X — reverts to pre-open color + closes window). Live preview fires `_broadcastColor()` on every drag/input event, dispatching `holy.color.change` CSEvent to the main panel in real time without persisting. `colorpicker.js` removed from `settings.html` load order (no longer needed). Header title changes to "ACCENT COLOR" when picker view is active.
- 4: Color picker UI refinements. Removed the system color picker trigger button (`#hs-native-btn` + hidden `<input type="color">`) — the canvas-based picker is the only input now. Removed the custom `#hsCloseBtn` from the header — CEP Modeless windows cannot suppress the native OS window frame, so the system X is the only close affordance (custom one was redundant). Restructured the hex input row: undo, apply, and cancel buttons are now inline left/right of the hex field; the old separate footer row is gone. Added favourite colors: up to 8 saved swatches rendered below the hex row using the outer path of the delete-expressions button (tag/parallelogram shape, viewBox `0 0 34.31 27.61`) filled with the stored color. Swatches have no border or background — the shape alone is the visual. Left-click a swatch to load it into the picker; right-click to remove. A `+` button appends the current color to the list. Stored in `localStorage` under `he_favColors`.

- 5: Added settings cog button (`#settingsCogBtn`) to the main panel apply row (`index.html`, `css/styles.css`, `js/main_SETTINGS.js`). Motivation: on modern AE versions, `setPanelFlyoutMenu` items appear *below* native entries (Close Panel, Undock Panel, etc.) regardless of registration order — the claim in section 0.1 that custom items appear above native ones is inaccurate on the current host. The cog provides a first-class in-panel entry point that bypasses the flyout entirely. Placed far right in `.apply-row` via `margin-left: auto`. Styled as a Feather-style stroke gear at 12px, `opacity: 0.45` idle / `opacity: 1` + accent color on hover — discreet but always accessible. Wired to `openSettingsPanel()` via a click listener added at the top of `Holy.SETTINGS.init()`. CSS rule `#settingsCogBtn` added after the `.apply-row` block.
- 6: Added hard-locked default color swatch to the favourites row in `settings.html`. The plugin's default accent (`#7c6cfa`) is always rendered first (leftmost) in the favourites row as a half-width "right-half rhombus" shape — straight vertical left edge with rounded corners, same slanted right edge as the full parallelogram swatches. Uses `DEFAULT_TAG` SVG path (viewBox `0 0 19.5 27.61`) and `.hs-fav-default` CSS class (20×27px vs 34×27px for user favourites). Click selects the default color into the picker; not removable via right-click. Ensures the original plugin identity color is never lost regardless of user customisation.

- 7: 2026-04-23 — **Settings init wiring fix.** `Holy.SETTINGS.init()` was never called from `main_DEV_INIT.js`, so the cog button click listener, flyout menu XML registration (`setPanelFlyoutMenu`), and flyout click handler (`flyoutMenuClicked` listener) were all unwired. The settings panel could not be opened from either the cog button or the hamburger menu. Fix: added `Holy.SETTINGS.init()` call to the `init()` function in `main_DEV_INIT.js`, guarded by existence check. File edited: `js/main_DEV_INIT.js`. **Verified in AE 2026-04-23.**

- 8: 2026-04-23 — **Sticky window position.** Settings modeless dialog now remembers its screen position between opens. Added `saveWindowPos()` helper in `settings.html` that writes `{x, y}` from `window.screenX/screenY` to `localStorage` under key `he_settingsPos`. Position is saved explicitly before every `window.close()` call (Apply and Cancel buttons) and via `beforeunload` as a fallback for the OS window X button. On load, an inline IIFE reads the saved position and calls `window.moveTo(x, y)` to restore it. File edited: `settings.html`.
