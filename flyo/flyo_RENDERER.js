// ========================================================
// V2 — flyo_RENDERER.js (memory-safe, cleanup-ready)
// ========================================================
(function () {
  "use strict";

  const { ipcRenderer } = require("electron");

  // 🧠 Globals for payload + monitoring
  let cy_payload = null;
  let cy_memoryInterval = null;

  // --------------------------------------------------------
  // 🧠 Receive theme & coords on launch
  // --------------------------------------------------------
  ipcRenderer.on("init-flyo", (_event, payload) => {
    cy_payload = payload;
    const { theme } = payload || {};

    // Apply CSS vars
    Object.entries(theme || {}).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });

    console.log("Renderer: received payload →", payload);

    // 🧩 Optional memory profiling (safe to remove later)
    logMemoryUsage("post-init");
    cy_memoryInterval = setInterval(() => logMemoryUsage("interval"), 10000);
  });

  // --------------------------------------------------------
  // ⚙️ Button hooks
  // --------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    const applyBtn = document.getElementById("applyBtn");
    const cancelBtn = document.getElementById("cancelBtn");

    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        const code = "/* CodeMirror fetch or placeholder */";
        ipcRenderer.send("flyo-action", { type: "apply", code });
        console.log("Renderer: Apply clicked");
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        ipcRenderer.send("flyo-action", { type: "cancel" });
        console.log("Renderer: Cancel clicked");
      });
    }

    console.log("Renderer: DOM ready");
  });

  // --------------------------------------------------------
  // 🧹 Cleanup Hooks
  // --------------------------------------------------------
  window.addEventListener("beforeunload", cleanupRendererResources);

  ipcRenderer.on("flyo-cleanup", () => {
    console.log("Renderer: received cleanup signal");
    cleanupRendererResources();
  });

  // --------------------------------------------------------
  // 📊 Memory and Leak Monitoring
  // --------------------------------------------------------
  function logMemoryUsage(stage = "") {
    if (!window?.performance?.memory) {
      console.log(`Renderer: Memory log [${stage}] — API not available`);
      return;
    }
    const mem = window.performance.memory;
    console.log(
      `Renderer Memory [${stage}]: usedJSHeap=${(
        mem.usedJSHeapSize / 1048576
      ).toFixed(2)}MB total=${(mem.totalJSHeapSize / 1048576).toFixed(2)}MB`
    );
  }

  // --------------------------------------------------------
  // 🧽 Cleanup Function
  // --------------------------------------------------------
  function cleanupRendererResources() {
    console.log("Renderer: cleanupRendererResources triggered");

    if (cy_memoryInterval) {
      clearInterval(cy_memoryInterval);
      cy_memoryInterval = null;
    }

    cy_payload = null;
    logMemoryUsage("post-cleanup");
  }

  // --------------------------------------------------------
  // ✅ Renderer Ready
  // --------------------------------------------------------
  console.log("flyo_RENDERER initialized & awaiting payload");
})();
