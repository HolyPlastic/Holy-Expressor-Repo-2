// ========================================================
// 🎯 HOLY EXPRESSOR — FLYO PANEL (CEP-SIDE BRIDGE)
// Handles communication between CEP and the Electron flyover
// ========================================================

if (typeof Holy !== "object") Holy = {};

(function () {
  "use strict";

  // --------------------------------------------------------
  // 🧩 Verify Dependencies
  // --------------------------------------------------------
  if (!window.Holy || !Holy.UTILS) {
    console.error("main_FLYO: Holy.UTILS not found — ensure main_UTILS.js loaded");
    return;
  }

  // --------------------------------------------------------
  // 🧠 Flyover Launcher
  // --------------------------------------------------------
  function cy_openFlyover(coords) {
    try {
      const theme = Holy.UTILS?.cy_getThemeVars
        ? Holy.UTILS.cy_getThemeVars()
        : {};

      const payload = {
        coords: coords || { x: 600, y: 400 },
        theme: theme
      };

      console.log("main_FLYO: preparing to launch helper →", payload);

      Holy.FLYO.cy_launchFlyoverHelper(payload);

    } catch (err) {
      console.error("main_FLYO: Flyover launch failed →", err);
    }
  }

  // --------------------------------------------------------
  // ⚙️ Flyover Helper Launcher (Electron Bridge)
  // --------------------------------------------------------
  function cy_launchFlyoverHelper(payload) {
    try {
      if (typeof require !== "function") {
        console.warn("main_FLYO: require() not available in CEP — skipping Electron launch (dev mode).");
        return;
      }

      console.log("main_FLYO: attempting to launch Electron helper…");

      // 🪟 Launch via external .bat to avoid AE freeze
      const { spawn } = require("child_process");
      const path = require("path");

      // point to helpers/launch_flyover.bat
      const batPath = path.join(__dirname, "..", "helpers", "launch_flyover.bat");
      const payloadArg = JSON.stringify(payload);

const child = spawn("cmd.exe", ["/c", `"${batPath}"`, payloadArg], {
  detached: true,
  stdio: "ignore",
  windowsHide: true
});
child.unref();


    } catch (err) {
      console.error("main_FLYO: Electron helper failed to start →", err);
    }
  }

  // --------------------------------------------------------
  // 🚀 MODULE EXPORT
  // --------------------------------------------------------
  Holy.FLYO = {
    cy_openFlyover: cy_openFlyover,
    cy_launchFlyoverHelper: cy_launchFlyoverHelper
  };

})();
