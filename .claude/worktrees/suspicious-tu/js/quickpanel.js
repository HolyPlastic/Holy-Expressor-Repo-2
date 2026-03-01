if (typeof window.Holy !== "object" || window.Holy === null) {
  window.Holy = {};
}

(function () {
  "use strict";

  // ===== 🔍 QuickPanel DOM Timing Trace – added for diagnostics (2025-10-29) =====
  document.addEventListener("DOMContentLoaded", function () {
    console.log("[QuickPanel] DOMContentLoaded fired at", performance.now());
  });

  window.addEventListener("load", function () {
    console.log("[QuickPanel] window.load fired at", performance.now());
  });

  window.addEventListener("focus", function () {
    console.log("[QuickPanel] focus fired at", performance.now());
  });

  setTimeout(function () {
    console.log(
      "[QuickPanel] post-load timeout reached, panel offsetHeight:",
      document.documentElement.offsetHeight
    );
  }, 1500);

  function safeNewCSInterface() {
    try {
      return new CSInterface();
    } catch (err) {
      console.warn("[QuickPanel] CSInterface unavailable", err);
      return null;
    }
  }

  function installLogProxy(cs) {
    if (!cs || typeof CSEvent !== "function") {
      return;
    }

    var original = {
      log: console.log ? console.log.bind(console) : function () {},
      info: console.info ? console.info.bind(console) : console.log.bind(console),
      warn: console.warn ? console.warn.bind(console) : console.log.bind(console),
      error: console.error ? console.error.bind(console) : console.log.bind(console)
    };

    var levels = ["log", "info", "warn", "error"];

    function serialise(args) {
      return Array.prototype.map.call(args, function (entry) {
        if (typeof entry === "string") {
          return entry;
        }
        try {
          return JSON.stringify(entry);
        } catch (err) {
          return String(entry);
        }
      });
    }

    levels.forEach(function (level) {
      if (typeof console[level] !== "function") {
        return;
      }

      console[level] = function () {
        original[level].apply(console, arguments);

        try {
          var evt = new CSEvent("com.holy.expressor.quickpanel.log", "APPLICATION");
          evt.data = JSON.stringify({
            level: level,
            messages: serialise(arguments),
            time: Date.now()
          });
          cs.dispatchEvent(evt);
        } catch (dispatchErr) {
          original.error("[QuickPanel] Log proxy dispatch failed", dispatchErr);
        }
      };
    });
  }

  var hostBridgeState = {
    priming: false,
    ready: false
  };

  var bridgeWaitConfig = {
    timeoutMs: 5000,
    interval: 120
  };

  var focusListenerAttached = false;

  var moduleWaitState = {
    attempts: 0,
    maxAttempts: 15,
    delay: 120,
    satisfied: false
  };

  function getSharedCSInterface(preferred) {
    if (preferred) {
      return preferred;
    }

    if (window.Holy && Holy.UI && Holy.UI.cs) {
      return Holy.UI.cs;
    }

    return safeNewCSInterface();
  }

  function primeHostBridge(preferredCs) {
    if (hostBridgeState.ready) {
      return true;
    }

    var cs = getSharedCSInterface(preferredCs);
    if (!cs) {
      return false;
    }

    if (window.Holy && Holy.DEV_INIT && typeof Holy.DEV_INIT.loadJSX === "function") {
      try {
        Holy.DEV_INIT.loadJSX();
      } catch (err) {
        console.warn("[QuickPanel] Holy.DEV_INIT.loadJSX() failed", err);
      }
    }

    if (hostBridgeState.priming) {
      return hostBridgeState.ready;
    }

    var basePath;
    try {
      basePath = cs.getSystemPath(SystemPath.EXTENSION);
    } catch (errGetPath) {
      console.warn("[QuickPanel] Unable to resolve extension path", errGetPath);
      return false;
    }

    function toAbsolute(rel) {
      return (basePath + rel).replace(/\\/g, "\\\\");
    }

    var hostModules = [
      "/jsx/modules/host_UTILS.jsx",
      "/jsx/modules/host_MAPS.jsx",
      "/jsx/modules/host_GET.jsx",
      "/jsx/modules/host_APPLY.jsx",
      "/jsx/modules/host_DEV.jsx",
      "/jsx/modules/host_FLYO.jsx",
      "/jsx/host.jsx"
    ];

    hostBridgeState.priming = true;

    try {
      hostModules.forEach(function (file) {
        cs.evalScript('$.evalFile("' + toAbsolute(file) + '")');
      });
    } catch (errEval) {
      hostBridgeState.priming = false;
      console.warn("[QuickPanel] Host module load failed", errEval);
      return false;
    }

    try {
      cs.evalScript('(typeof he_S_SS_applyExpressionToSelection)', function (res) {
        if (res === "function") {
          hostBridgeState.ready = true;
          console.log("[QuickPanel] Host bridge primed");
        } else {
          hostBridgeState.priming = false;
          console.warn("[QuickPanel] Host bridge check returned", res);
        }
      });
    } catch (verifyErr) {
      hostBridgeState.priming = false;
      console.warn("[QuickPanel] Host bridge verification failed", verifyErr);
    }

    return hostBridgeState.ready;
  }

  function ensureHostBridge(cs) {
    if (primeHostBridge(cs)) {
      return;
    }

    setTimeout(function () {
      if (!hostBridgeState.ready) {
        primeHostBridge(cs);
      }
    }, 300);

    setTimeout(function () {
      if (!hostBridgeState.ready) {
        primeHostBridge(cs);
      }
    }, 900);
  }

  function whenHostBridgeReady(onComplete) {
    var start = Date.now();

    function check() {
      if (hostBridgeState.ready) {
        onComplete(true);
        return;
      }

      if (Date.now() - start >= bridgeWaitConfig.timeoutMs) {
        console.warn("[QuickPanel] Host bridge readiness timeout");
        onComplete(false);
        return;
      }

      setTimeout(check, bridgeWaitConfig.interval);
    }

    check();
  }

  function disableNativeContextMenu() {
    if (window.Holy && Holy.MENU && typeof Holy.MENU.contextM_disableNative === "function") {
      try {
        Holy.MENU.contextM_disableNative();
      } catch (err) {
        console.warn("[QuickPanel] Failed to disable native context menu", err);
      }
    }
  }

  function rebindSnippetsUI() {
    if (window.Holy && Holy.SNIPPETS && typeof Holy.SNIPPETS.rebindQuickAccessUI === "function") {
      try {
        Holy.SNIPPETS.rebindQuickAccessUI();
      } catch (err) {
        console.warn("[QuickPanel] Failed to rebind bank UI", err);
      }
    }
  }

  function renderSnippets() {
    if (window.Holy && Holy.SNIPPETS && typeof Holy.SNIPPETS.renderSnippets === "function") {
      try {
        Holy.SNIPPETS.renderSnippets();
      } catch (err) {
        console.warn("[QuickPanel] renderSnippets failed", err);
      }
    }
  }

  function ensurePanelPainted() {
    var doc = window.document;
    var row = doc.getElementById("snippetsRow");
    if (!row) {
      console.warn("[QuickPanel] snippetsRow missing from DOM");
      return false;
    }

    var hasChildren = !!(row.children && row.children.length);
    if (!hasChildren) {
      renderSnippets();
      hasChildren = !!(row.children && row.children.length);
    }

    if (!hasChildren) {
      return false;
    }

    var height = row.offsetHeight || 0;
    if (typeof row.getBoundingClientRect === "function") {
      try {
        height = Math.max(height, row.getBoundingClientRect().height || 0);
      } catch (err) {
        console.warn("[QuickPanel] getBoundingClientRect failed", err);
      }
    }

    if (height > 0) {
      return true;
    }

    forcePanelRepaint();

    height = row.offsetHeight || 0;
    if (typeof row.getBoundingClientRect === "function") {
      try {
        height = Math.max(height, row.getBoundingClientRect().height || 0);
      } catch (err2) {
        console.warn("[QuickPanel] getBoundingClientRect retry failed", err2);
      }
    }

    if (height > 0) {
      return true;
    }

    console.warn("[QuickPanel] Snippet row still collapsed after repaint");
    return false;
  }

  var layoutRetryState = {
    attempts: 0,
    maxAttempts: 6
  };

  function guaranteePanelLayout() {
    if (ensurePanelPainted()) {
      layoutRetryState.attempts = 0;
      return true;
    }

    if (layoutRetryState.attempts >= layoutRetryState.maxAttempts) {
      console.warn("[QuickPanel] Layout retries exhausted; panel may remain blank");
      return false;
    }

    layoutRetryState.attempts += 1;

    var raf = typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : function (cb) {
          return setTimeout(cb, 16);
        };

    raf(function () {
      guaranteePanelLayout();
    });

    return false;
  }

  function kickInitialPaint(row, onComplete) {
    var raf = typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : function (cb) {
          return setTimeout(cb, 16);
        };

    raf(function () {
      raf(function () {
        try {
          var previousVisibility = row.style.visibility;
          row.style.visibility = "hidden";
          void row.offsetHeight;
          row.style.visibility = previousVisibility || "";
        } catch (err) {
          console.warn("[QuickPanel] kickInitialPaint visibility flip failed", err);
        }

        var height = 0;
        try {
          height = row.offsetHeight || 0;
          if (typeof row.getBoundingClientRect === "function") {
            height = Math.max(height, row.getBoundingClientRect().height || 0);
          }
        } catch (measureErr) {
          console.warn("[QuickPanel] kickInitialPaint measurement failed", measureErr);
        }

        onComplete(height);
      });
    });
  }

  function scheduleColdStartRecovery(cs) {
    setTimeout(function () {
      if (!ensurePanelPainted()) {
        console.warn("[QuickPanel] Cold-start check #1 → forcing rebind");
        rebindSnippetsUI();
        renderSnippets();
        forcePanelRepaint();
        ensureHostBridge(cs);
        guaranteePanelLayout();
      }
    }, 300);

    setTimeout(function () {
      if (!ensurePanelPainted()) {
        console.warn("[QuickPanel] Cold-start check #2 → requesting state sync");
        rebindSnippetsUI();
        renderSnippets();
        forcePanelRepaint();
        ensureHostBridge(cs);
        if (window.Holy && Holy.State && typeof Holy.State.reload === "function") {
          try {
            Holy.State.reload();
          } catch (reloadErr) {
            console.warn("[QuickPanel] State reload during cold-start recovery failed", reloadErr);
          }
        }
        guaranteePanelLayout();
      }
    }, 900);
  }

  function sendWarmWake(cs) {
    if (!cs || typeof CSEvent !== "function") {
      return;
    }

    try {
      var evt = new CSEvent("com.holy.expressor.quickpanel.log", "APPLICATION");
      evt.data = JSON.stringify({
        level: "info",
        messages: ["[QuickPanel] Warm wake handshake"],
        time: Date.now()
      });
      cs.dispatchEvent(evt);
    } catch (err) {
      console.warn("[QuickPanel] Warm wake dispatch failed", err);
    }
  }

  function forcePanelRepaint() {
    try {
      var root = document.getElementById("quickPanelRoot");
      if (!root) {
        return;
      }

      var previousVisibility = root.style.visibility;
      root.style.visibility = "hidden";
      void root.offsetHeight;
      root.style.visibility = previousVisibility || "";
    } catch (err) {
      console.warn("[QuickPanel] forcePanelRepaint failed", err);
    }
  }

  function areQuickPanelModulesReady() {
    if (moduleWaitState.satisfied) {
      return true;
    }

    if (!window.Holy) {
      return false;
    }

    var hasSnippets = !!(Holy.SNIPPETS &&
      typeof Holy.SNIPPETS.init === "function" &&
      typeof Holy.SNIPPETS.renderSnippets === "function" &&
      typeof Holy.SNIPPETS.rebindQuickAccessUI === "function");

    var hasUI = !!(Holy.UI && typeof Holy.UI.toast === "function");
    var hasState = !!(Holy.State && typeof Holy.State.init === "function");

    moduleWaitState.satisfied = hasSnippets && hasUI && hasState;
    return moduleWaitState.satisfied;
  }

  function waitForQuickPanelModules(onReady) {
    if (areQuickPanelModulesReady()) {
      onReady();
      return;
    }

    moduleWaitState.attempts += 1;
    if (moduleWaitState.attempts > moduleWaitState.maxAttempts) {
      console.warn("[QuickPanel] Module readiness timeout → proceeding with degraded init");
      onReady();
      return;
    }

    setTimeout(function () {
      waitForQuickPanelModules(onReady);
    }, moduleWaitState.delay);
  }

  function verifyPanelContainerVisibility() {
    var root = document.getElementById("quickPanelRoot");
    if (!root) {
      console.warn("[QuickPanel] quickPanelRoot missing");
      return;
    }

    try {
      var computed = window.getComputedStyle ? window.getComputedStyle(root) : null;
      if (computed) {
        var hidden = computed.display === "none" || computed.visibility === "hidden";
        if (hidden) {
          console.warn("[QuickPanel] quickPanelRoot computed hidden state", {
            display: computed.display,
            visibility: computed.visibility
          });
        }
      }
    } catch (err) {
      console.warn("[QuickPanel] Failed to verify container visibility", err);
    }
  }

  function attachFocusRehydrationListener() {
    if (focusListenerAttached) {
      return;
    }

    focusListenerAttached = true;

    window.addEventListener("focus", function () {
      console.log("[Holy.State] Panel refocused → rehydrating state");
      if (window.Holy && Holy.State && typeof Holy.State.reload === "function") {
        try {
          Holy.State.reload();
        } catch (e) {
          console.warn("[Holy.State] reload failed", e);
        }
      }
    });
  }

  function initSnippets() {
    if (window.Holy && Holy.SNIPPETS && typeof Holy.SNIPPETS.init === "function") {
      try {
        Holy.SNIPPETS.init();
      } catch (err) {
        console.error("[QuickPanel] Failed to initialize snippets", err);
      }
    } else {
      console.warn("[QuickPanel] Holy.SNIPPETS.init not available");
    }

    // ---------------------------------------------------------
    // 📍02 – Warm-Start Self-Heal
    // ---------------------------------------------------------
    setTimeout(function () {
      var row = document.querySelector("#snippetsRow");
      if (!row) {
        console.warn("[QuickPanel] Detected blank init → forcing redraw");
        if (window.Holy && Holy.SNIPPETS && typeof Holy.SNIPPETS.init === "function") {
          try {
            Holy.SNIPPETS.init();
          } catch (e) {
            console.warn("[QuickPanel] Self-heal reinit failed", e);
          }
        }
        guaranteePanelLayout();
        return;
      }

      if (!row.children || !row.children.length || row.offsetHeight === 0) {
        console.warn("[QuickPanel] Detected collapsed snippet row after init → retrying layout");
        guaranteePanelLayout();
      }
    }, 800);
  }

// ---------------------------------------------------------
// 💡 DOMContentLoaded – main QuickPanel boot
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  var doc = window.document;
  doc.body.classList.add("quick-panel");

  var cs = safeNewCSInterface();

  installLogProxy(cs);
  disableNativeContextMenu();
  verifyPanelContainerVisibility();

  ensureHostBridge(cs);

  whenHostBridgeReady(function (bridgeReady) {
    waitForQuickPanelModules(function () {
      if (!bridgeReady) {
        console.warn("[QuickPanel] Proceeding without confirmed host bridge readiness");
      }

      if (window.Holy && Holy.State && typeof Holy.State.init === "function") {
        try {
          Holy.State.init({ panel: "quick" });
        } catch (err) {
          console.warn("[QuickPanel] Holy.State.init failed", err);
        }
      }

      initSnippets();
      renderSnippets();

      var row = doc.getElementById("snippetsRow");
      var afterPaint = function () {
        rebindSnippetsUI();
        guaranteePanelLayout();

        if (window.Holy && Holy.State && typeof Holy.State.attachPanelBindings === "function") {
          try {
            Holy.State.attachPanelBindings();
          } catch (err) {
            console.warn("[QuickPanel] Holy.State.attachPanelBindings failed", err);
          }
        }

        scheduleColdStartRecovery(cs);
        sendWarmWake(cs);
        attachFocusRehydrationListener();
      };

      if (row) {
        kickInitialPaint(row, function (height) {
          if (height === 0) {
            console.warn("[QuickPanel] kickInitialPaint measured zero height");
          }

          afterPaint();
        });
      } else {
        console.warn("[QuickPanel] snippetsRow missing during initial paint kick");
        forcePanelRepaint();
        afterPaint();
      }
    });
  });

  // ---------------------------------------------------------
// 📍V4.2 – LiveSync listener (Quick Panel)
// ---------------------------------------------------------
try {
  var liveCs = new CSInterface();
  liveCs.addEventListener("com.holy.expressor.stateChanged", function (evt) {
    try {
      var payload = typeof evt.data === "object" ? evt.data : JSON.parse(evt.data);
      console.log("[QuickPanel] LiveSync event received →", payload);

      if (payload.type === "banksChanged" && window.Holy && Holy.SNIPPETS) {
        Holy.SNIPPETS.init();
      }
    } catch (parseErr) {
      console.warn("[QuickPanel] LiveSync parse error", parseErr);
    }
  });
} catch (listenerErr) {
  console.warn("[QuickPanel] Failed to attach LiveSync listener", listenerErr);
}

  // ---------------------------------------------------------
  // 🧩 Close button behavior
  // ---------------------------------------------------------
  var closeBtn = doc.getElementById("quickPanelCloseBtn");
  if (closeBtn && cs) {
    closeBtn.addEventListener("click", function () {
      try {
        cs.closeExtension();
      } catch (err) {
        console.error("[QuickPanel] Failed to close extension", err);
      }
    });
  }
}); // closes DOMContentLoaded

})(); // closes IIFE
