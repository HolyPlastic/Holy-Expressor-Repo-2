if (typeof Holy !== "object") Holy = {};

(function () {
  "use strict";

  var cs = new CSInterface();
  var SETTINGS_EXTENSION_ID = "com.holy.expressor.settings";

  // ──────────────────────────────────────────────────────────────
  // Flyout menu XML. Items appear at the top of the panel dropdown,
  // above AE's native Close/Undock/etc. entries.
  // ──────────────────────────────────────────────────────────────
  var FLYOUT_XML = [
    '<Menu>',
    '  <MenuItem Id="holy-settings" Label="Holy Settings" Enabled="true" Checked="false"/>',
    '  <MenuItem Label="---"/>',
    '</Menu>'
  ].join('');

  // ──────────────────────────────────────────────────────────────
  // init — call once from main_DEV_INIT.js
  // ──────────────────────────────────────────────────────────────
  function init() {
    cs.setPanelFlyoutMenu(FLYOUT_XML);

    var cogBtn = document.getElementById("settingsCogBtn");
    if (cogBtn) cogBtn.addEventListener("click", openSettingsPanel);

    cs.addEventListener("com.adobe.csxs.events.flyoutMenuClicked", function (evt) {
      // CEP may deliver event.data as an object or as a JSON string depending
      // on the host version — handle both.
      var data = evt.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch (e) {}
      }
      var menuId = data && data.menuId;
      var menuName = data && data.menuName;
      if (menuId === "holy-settings" || menuName === "Holy Settings") {
        openSettingsPanel();
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  // openSettingsPanel — opens the modeless settings extension
  // ──────────────────────────────────────────────────────────────
  function openSettingsPanel() {
    if (typeof cs.requestOpenExtension !== "function") {
      console.warn("[Holy.SETTINGS] requestOpenExtension unavailable");
      return;
    }
    try {
      cs.requestOpenExtension(SETTINGS_EXTENSION_ID, "");
    } catch (err) {
      console.warn("[Holy.SETTINGS] Failed to open settings panel", err);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // MODULE EXPORT
  // ──────────────────────────────────────────────────────────────
  Holy.SETTINGS = {
    init: init,
    openSettingsPanel: openSettingsPanel
  };

})();
