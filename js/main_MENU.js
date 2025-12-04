// main_UTILS.js V2 – Improved positioning + global context menu
// Centralized utility functions for Holy Expressor plugin.
// These are global helpers that can be reused across modules.

if (typeof Holy !== "object") Holy = {};

(function () {
  "use strict";


// ---------------------------------------------------------
// 🚫 GLOBAL DEFAULT CONTEXT MENU SUPPRESSION UTILITY (V9.0)
// ---------------------------------------------------------
// Purpose: cleanly block Chromium's native context menu
// while letting snippet buttons handle their own right-click logic.
// ---------------------------------------------------------
function contextM_disableNative() {
  const handler = function(ev) {
    // 🧩 check if the event occurred inside the plugin container
    const insidePlugin = ev.target.closest("#appRoot");
    if (insidePlugin) {
      ev.preventDefault();
      ev.stopPropagation();

      const btn = ev.target.closest(".snippet-btn");

      // 🧠 If this was a snippet button, stop here —
      // the per-button `mousedown` handler manages
      // ID storage and custom menu display.
      if (btn) {
        // Do NOT call contextM_menuBuilder or modify snippet_ID here.
        return;
      }

      // 🧩 otherwise, right-click happened inside the plugin
      // but not on a snippet button — you could optionally handle
      // other plugin-wide menus here later.
      return;
    }

    // 🚫 right-clicks outside the plugin: still block CEP’s native menu
    ev.preventDefault();
    ev.stopPropagation();
  };

  // 🔒 Use capturing phase so this fires before the default Chromium menu.
  document.addEventListener("contextmenu", handler, true);
  window.addEventListener("contextmenu", handler, true);

  console.log("[Holy.UTILS] Global contextmenu suppression active (capturing phase, V9.0).");
}









// V1 — rightClick_position by element (anchor)
// 💡 CHECKER: uses element rect to position menu relative to control
function contextM_positionAnchor(anchorEl, menu, opts = {}) {
  const rect = anchorEl.getBoundingClientRect();
  let x = rect.left + rect.width / 2 + window.pageXOffset+ (opts.offsetX || 10);
  let y = rect.bottom + window.pageYOffset + (opts.offsetY || -40);

  menu.style.position = "absolute";
  menu.style.display = "block";      // 🧩 visible for placement
  menu.style.visibility = "hidden";  // 🧩 avoid flash before clamp

  requestAnimationFrame(() => {
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (x + mw / 2 > vw) x = vw - mw / 2;
    if (x - mw / 2 < 0)  x = mw / 2;
    if (y + mh > vh)     y = Math.max(0, vh - mh);
    menu.style.left = (x - mw / 2) + "px";
    menu.style.top  = y + "px";
    menu.style.visibility = "visible";
  });
}

// V1 — rightClick_position by cursor event
// 💡 CHECKER: place near mouse for non-anchored uses
function contextM_positionCursor(ev, menu, opts = {}) {
  let x = (ev.pageX ?? ev.clientX + window.pageXOffset);
  let y = (ev.pageY ?? ev.clientY + window.pageYOffset) + (opts.offsetY || 8);

  menu.style.position = "absolute";
  menu.style.display = "block";
  menu.style.visibility = "hidden";

  requestAnimationFrame(() => {
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (x + mw > vw) x = Math.max(0, vw - mw);
    if (y + mh > vh) y = Math.max(0, vh - mh);
    menu.style.left = x + "px";
    menu.style.top  = y + "px";
    menu.style.visibility = "visible";
  });
}





// ---------------------------------------------------------
// 💡 SHOW CONTEXT MENU
// ---------------------------------------------------------
// 📦 V10.1 – Callback-driven + hard display gating
function contextM_menuBuilder(e, menu, opts = {}) {
  if (!menu) return;

  e.preventDefault();
  e.stopPropagation();

  // Reparent to body if needed
  if (menu.parentElement !== document.body) {
    try { document.body.appendChild(menu); } catch (_) {}
  }

  // Reset state
  menu.classList.remove("active");
  menu.style.position = "fixed";
  menu.style.opacity = "0";
  menu.style.visibility = "hidden";
  menu.style.display = "block"; // visible for measurement; clicks still blocked until .active

  // Force layout flush
  void menu.offsetWidth;

  // Position near anchor
  const anchor = opts.anchorEl;
  if (!anchor) return console.warn("[Holy.MENU] No anchorEl provided for contextM_menuBuilder");
  const rect = anchor.getBoundingClientRect();
  const pad = 6;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mw = menu.offsetWidth || 160;
  const mh = menu.offsetHeight || 60;
  let left = rect.left;
  let top = rect.bottom + pad;
  if (left + mw > vw - pad) left = vw - mw - pad;
  if (top + mh > vh - pad) top = rect.top - mh - pad;
  menu.style.left = `${left}px`;
  menu.style.top  = `${top}px`;

  // Activate next tick (enables pointer-events via .active)
  setTimeout(() => {
    menu.style.visibility = "visible";
    menu.classList.add("active");
  }, 10);

  // Bind click actions for this open
  const buttons = menu.querySelectorAll("button[data-action]");
  buttons.forEach((btn) => {
    btn.onclick = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      const action = btn.dataset.action;
      console.log(`[Holy.MENU] Menu clicked: ${action}`);
      if (typeof opts.onSelect === "function") {
        opts.onSelect(action, ev, menu);
      } else {
        console.warn("[Holy.MENU] No onSelect callback provided for menu action:", action);
      }
      contextM_menuHider();
    };
  });

  // Close on outside click / ESC
  const outsideClick = (ev) => { if (!menu.contains(ev.target)) contextM_menuHider(); };
  const escHandler   = (ev) => { if (ev.key === "Escape") contextM_menuHider(); };

  function contextM_menuHider() {
    menu.classList.remove("active");
    menu.style.opacity = "0";
    menu.style.visibility = "hidden";
    menu.style.display = "none";     // hard gate to prevent overlays
    document.removeEventListener("mousedown", outsideClick, true);
    document.removeEventListener("keydown",   escHandler,   true);
  }

  document.addEventListener("mousedown", outsideClick, true);
  document.addEventListener("keydown",   escHandler,   true);
}



















































  // ---------------------------------------------------------
  // 🚀 MODULE EXPORT
  // ---------------------------------------------------------
Holy.MENU = {
  contextM_disableNative: contextM_disableNative,
  contextM_positionAnchor: contextM_positionAnchor,
  contextM_positionCursor: contextM_positionCursor,
  contextM_menuBuilder: contextM_menuBuilder,

};
})();
