
if (typeof Holy !== "object") Holy = {};

(function () {
  "use strict";

  var cs = new CSInterface();
  const NEW_log_history = [];
  const NEW_LOG_EVENT = "com.holyexpressor.NEW_log_event";

  cs.addEventListener(NEW_LOG_EVENT, function (evt) {
    const timestamp = new Date().toISOString();
    const entry = "[" + timestamp + "] " + evt.data;
    NEW_log_history.push(entry);
  });
  if (typeof Holy.Panel !== "object") Holy.Panel = {};

  var modePanel = null;
  var modeExpressBtn = null;
  var modeRewriteBtn = null;
  var modeViewExpress = null;
  var modeViewRewrite = null;
  var btnModeSwitch = null;
  var expressOnlyElements = [];
  var applyBtn = null;
  var applyBtnLabel = null;
  var setMode = null;


  // -----------------------------------------------------------
  // 🧭 Global log mode switch: set "verbose" or "silent"
  window.HX_LOG_MODE = "verbose";
  // -----------------------------------------------------------


  // ------------- UI helpers -------------
  function ensureHostReady(callback, attempts = 0) {
    const maxAttempts = 15;
    const interval = 300;
    const env = cs && cs.hostEnvironment ? cs.hostEnvironment : {};

    if (env.appName && env.appName.length) {
      console.log("[UI] Host environment ready, proceeding with callback.");
      callback();
      return;
    }

    if (attempts >= maxAttempts) {
      console.warn("[UI] Host environment never became ready after", attempts, "attempts");
      callback(); // fallback to proceed anyway
      return;
    }

    console.log("[UI] Host not ready, retrying...", attempts);
    setTimeout(() => ensureHostReady(callback, attempts + 1), interval);
  }

  var DOM = function (sel) { return document.querySelector(sel); };
  var allDOM = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  function toast(msg) {
    var el = DOM("#toast");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.display = "none"; }, 1600);
  }


  document.addEventListener("DOMContentLoaded", function () {
    // V2 — External Flyover Trigger via JSX bridge
    var flyoBtn = document.getElementById("flyoLaunchBtn");
    if (flyoBtn) {
      flyoBtn.addEventListener("click", function () {
        console.log("UI: Flyover button clicked (external bridge mode)");

        try {
          cs.evalScript("he_launchFlyover()");
        } catch (err) {
          console.error("UI: Failed to call JSX bridge →", err);
        }
      });
    }


const safe = encodeURIComponent("TEST_LOG");
cs.evalScript('NEW_log_showDialog("' + safe + '")', function(r) {
    console.log("[NEW_log] static test result:", r);
});



    // ---------------------------------------------------------
    // ⚡ Quick Access Panel Launcher (with Warm-Wake Fix)
    // ---------------------------------------------------------
    var quickAccessBtn = document.getElementById("quickAccessLaunchBtn");
    if (quickAccessBtn) {
      quickAccessBtn.addEventListener("click", function () {
        try {
          console.log("[UI] Opening quick access panel");
          console.log("[UI] Checking host readiness before launching QuickPanel...");
          ensureHostReady(() => {
            cs.requestOpenExtension("com.holy.expressor.quickpanel");
          });

          setTimeout(function () {
            try {
ensureHostReady(() => {
  cs.requestOpenExtension("com.holy.expressor.quickpanel");
});
            } catch (e) {
              console.warn("[UI] QuickPanel Warm-Wake dispatch failed", e);
            }

          }, 800);

          cs.evalScript("app.activeViewer && app.activeViewer.setActive();");
        } catch (err) {
          console.error("[UI] Failed to open quick access panel →", err);
        }
      });
    }


    var editorMaxBtn = document.getElementById("editorMaximizeBtn");
    if (editorMaxBtn) {
      var srLabel = editorMaxBtn.querySelector(".sr-only");

      function applyMaximizeState(isMaximized) {
        var label = isMaximized ? "Restore editor size" : "Maximize editor";
        document.body.classList.toggle("editor-maximized", isMaximized);
        editorMaxBtn.classList.toggle("is-active", isMaximized);
        editorMaxBtn.setAttribute("aria-pressed", String(isMaximized));
        editorMaxBtn.setAttribute("aria-label", label);
        editorMaxBtn.setAttribute("title", label);
        if (srLabel) srLabel.textContent = label;

        if (window.editor) {
          try {
            if (typeof window.editor.requestMeasure === "function") {
              window.editor.requestMeasure();
            } else if (window.editor.dom && typeof window.editor.dom.getBoundingClientRect === "function") {
              window.editor.dom.getBoundingClientRect();
            }
          } catch (err) {
            if (window.HX_LOG_MODE === "verbose") {
              console.warn("Editor resize refresh failed", err);
            }
          }
        }
      }

      editorMaxBtn.addEventListener("click", function () {
        var nextState = !document.body.classList.contains("editor-maximized");
        applyMaximizeState(nextState);
      });
    }

    modePanel = document.getElementById("modePanel");
    modeExpressBtn = document.getElementById("modeExpressBtn");
    modeRewriteBtn = document.getElementById("modeRewriteBtn");
    modeViewExpress = document.getElementById("modeViewExpress");
    modeViewRewrite = document.getElementById("modeViewRewrite");
    btnModeSwitch = document.getElementById("btnModeSwitch");
    applyBtn = document.getElementById("applyBtn");
    applyBtnLabel = applyBtn ? applyBtn.querySelector(".label") : null;

    var openFullEditorBtn = document.getElementById("openFullEditorBtn");
    var NEW_forCustomer_openLogButton = document.getElementById("NEW_forCustomer_openLogButton");
    var codeEditor = document.getElementById("codeEditor");
    var expressOverlay = document.querySelector(".express-editor-overlay");
    var useAbsoluteComp = document.getElementById("useAbsoluteComp");
    var loadPathFromSelectionBtn = document.getElementById("loadPathFromSelectionBtn");
    var loadFromSelectionBtn = document.getElementById("loadFromSelectionBtn");
    var editorClearBtn = document.getElementById("editorClearBtn");

    if (NEW_forCustomer_openLogButton) {
      NEW_forCustomer_openLogButton.onclick = function () {
        const NEW_forCustomer_hist = window.NEW_forCustomer_history || [];
        const NEW_forCustomer_joined = NEW_forCustomer_hist.join("\n");

        const NEW_forCustomer_safe = encodeURIComponent(NEW_forCustomer_joined);
        cs.evalScript('NEW_forCustomer_showDialog("' + NEW_forCustomer_safe + '")');
      };
    }

    expressOnlyElements = [];

    if (codeEditor) {
      expressOnlyElements.push(codeEditor);
    }

    if (expressOverlay) {
      expressOnlyElements.push(expressOverlay);
    }

    if (useAbsoluteComp && useAbsoluteComp.parentElement) {
      expressOnlyElements.push(useAbsoluteComp.parentElement);
    }

    var customSearchMaster = document.getElementById("customSearch-Master");
    if (customSearchMaster) {
      expressOnlyElements.push(customSearchMaster);
    }

    [loadPathFromSelectionBtn, loadFromSelectionBtn, editorClearBtn].forEach(function (btn) {
      if (btn) {
        expressOnlyElements.push(btn);
      }
    });

    if (modePanel && modeExpressBtn && modeRewriteBtn && modeViewExpress && modeViewRewrite) {
      setMode = function (mode) {
        var isExpress = mode === "express";

        modeViewExpress.hidden = !isExpress;
        modeViewRewrite.hidden = isExpress;
        modeViewExpress.classList.toggle("is-hidden", !isExpress);
        modeViewRewrite.classList.toggle("is-hidden", isExpress);
        modeViewExpress.setAttribute("aria-hidden", String(!isExpress));
        modeViewRewrite.setAttribute("aria-hidden", String(isExpress));

        modeExpressBtn.classList.toggle("is-active", isExpress);
        modeRewriteBtn.classList.toggle("is-active", !isExpress);
        modeExpressBtn.setAttribute("aria-selected", String(isExpress));
        modeRewriteBtn.setAttribute("aria-selected", String(!isExpress));

        modePanel.dataset.mode = isExpress ? "express" : "rewrite";

        if (applyBtnLabel) {
          applyBtnLabel.textContent = isExpress ? "APPLY" : "REWRITE";
        }
        if (applyBtn) {
          var actionLabel = isExpress ? "Apply expression to selection" : "Run search and replace";
          applyBtn.setAttribute("aria-label", actionLabel);
          applyBtn.setAttribute("title", actionLabel);
        }

        expressOnlyElements.forEach(function (el) {
          if (!el) return;
          el.hidden = !isExpress;
          el.classList.toggle("is-hidden", !isExpress);
          el.setAttribute("aria-hidden", String(!isExpress));
        });

        if (isExpress && window.editor) {
          try {
            if (typeof window.editor.requestMeasure === "function") {
              window.editor.requestMeasure();
            } else if (typeof window.editor.refresh === "function") {
              window.editor.refresh();
            }
          } catch (refreshErr) {
            if (window.HX_LOG_MODE === "verbose") {
              console.warn("[UI] Failed to refresh editor after showing express mode", refreshErr);
            }
          }
        }
      };

      Holy.Panel.setMode = setMode;

      Holy.Panel.lockToRewriteMode = function () {
        console.log("[Holy.Panel] Locking to RewriteMode for Full Editor launch");
        if (typeof setMode === "function") setMode("rewrite");
        if (modeExpressBtn) modeExpressBtn.hidden = true;
        if (btnModeSwitch) btnModeSwitch.hidden = true;
      };

      modeExpressBtn.addEventListener("click", function () {
        setMode("express");
      });

      modeRewriteBtn.addEventListener("click", function () {
        setMode("rewrite");
      });
      if (btnModeSwitch) {
        btnModeSwitch.addEventListener("click", function () {
          var isExpress = modePanel.dataset.mode === "express";
          setMode(isExpress ? "rewrite" : "express");
        });
      }

      Holy.Panel.returnToMainPanel = function () {
        if (typeof setMode === "function") {
          setMode("express");
        }

        if (modeExpressBtn) {
          modeExpressBtn.hidden = false;
        }

        if (btnModeSwitch) {
          btnModeSwitch.hidden = false;
        }

        if (window.editor && typeof window.editor.focus === "function") {
          try {
            window.editor.focus();
          } catch (focusErr) {
            if (window.HX_LOG_MODE === "verbose") {
              console.warn("[Holy.Panel] Failed to refocus editor", focusErr);
            }
          }
        }

        window.HX_EDITOR_LOCKED = false;

        try {
          window.localStorage.removeItem("HX_FULL_EDITOR_OPEN");
        } catch (storageErr) {
          if (window.HX_LOG_MODE === "verbose") {
            console.warn("[Holy.Panel] Failed to clear full editor flag", storageErr);
          }
        }
      };

      setMode("express");
    }

    function openFullEditorPanel() {
      if (Holy.Panel && typeof Holy.Panel.lockToRewriteMode === "function") {
        Holy.Panel.lockToRewriteMode();
      }

      window.HX_EDITOR_LOCKED = true;

      try {
        new CSInterface().requestOpenExtension("com.holy.expressor.fulleditor");

      } catch (err) {
        console.error("[Holy.UI] Failed to open full editor panel", err);
        window.HX_EDITOR_LOCKED = false;
        if (typeof Holy.Panel.returnToMainPanel === "function") {
          Holy.Panel.returnToMainPanel();
        } else {
          if (modeExpressBtn) {
            modeExpressBtn.hidden = false;
          }
          if (btnModeSwitch) {
            btnModeSwitch.hidden = false;
          }
          if (typeof setMode === "function") {
            setMode("express");
          }
        }
        return;
      }

      try {
        window.localStorage.setItem("HX_FULL_EDITOR_OPEN", "true");
      } catch (storageErr) {
        if (window.HX_LOG_MODE === "verbose") {
          console.warn("[Holy.UI] Failed to set full editor flag", storageErr);
        }
      }
    }

    Holy.Panel.openFullEditorPanel = openFullEditorPanel;

    if (openFullEditorBtn) {
      openFullEditorBtn.addEventListener("click", openFullEditorPanel);
    }
  });

  window.addEventListener("storage", function (evt) {
    if (!evt) return;

    if (evt.key === "HX_FULL_EDITOR_OPEN" && evt.newValue === "false") {
      if (Holy.Panel && typeof Holy.Panel.returnToMainPanel === "function") {
        Holy.Panel.returnToMainPanel();
      }
    }
  });

  // ✅ REWRITE – QuickPanel Log Listener (safe for object or string payload)
  function quickPanelLogListener(evt) {
    if (!evt) return;

    let payload = evt.data;
    try {
      // CEP >=6.1 sends already-parsed objects; handle both cases
      if (typeof payload === "string") {
        payload = JSON.parse(payload || "{}");
      } else if (typeof payload !== "object" || payload === null) {
        payload = {};
      }
    } catch (err) {
      console.warn("[Holy.UI] Failed to parse quick panel log payload", err, evt.data);
      return;
    }

    const level = payload.level || "log";
    const messages = payload.messages || [];
    const target = console[level] || console.log;

    try {
      target.apply(console, ["[QuickPanel]"].concat(messages));
    } catch (dispatchErr) {
      console.log.apply(console, ["[QuickPanel]"].concat(messages));
      console.warn("[Holy.UI] Quick panel log relay failed", dispatchErr);
    }
  }

  // ✅ Keep listener registration as-is
  if (!document.body || !document.body.classList.contains("quick-panel")) {
    cs.addEventListener("com.holy.expressor.quickpanel.log", quickPanelLogListener);
  }



  // ------------- Tabs -------------
  function initTabs() {
    allDOM(".tab-btn").forEach(function (btn) {
      var tabId = btn.getAttribute("data-tab");
      if (!tabId) return;

      btn.addEventListener("click", function () {
        allDOM(".tab-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        allDOM(".tab").forEach(function (t) { t.classList.remove("active"); });
        var target = DOM("#" + tabId);
        if (!target) {
          if (window.HX_LOG_MODE === "verbose") {
            console.warn("[Holy.UI] Tab target not found for", tabId);
          }
          return;
        }
        target.classList.add("active");
      });
    });
  }



  // ------------- TARGET -------------
  function onTarget() {
    cs.evalScript("he_U_SS_getSelectionSummary()", function (raw) {
      var r = {};
      try { r = JSON.parse(raw || "{}"); } catch (e) { }
      var out = DOM("#TargetList");
      if (!out) return;

      if (!r.ok) {
        out.textContent = "Error: " + (r.err || "unknown");
        return;
      }
      if (!r.items || !r.items.length) {
        out.textContent = "No properties selected";
        return;
      }
      out.innerHTML = ""; // clear old entries
      r.items.forEach(function (it, i) {
        var div = document.createElement("div");
        div.className = "target-item";
        div.setAttribute("data-path", it.path);
        div.textContent = (i + 1) + ". " + it.layerName + " | " + it.displayName + " | " + it.path + " | type=" + (it.isArray ? ("Array[" + it.length + "]") : "OneD");
        out.appendChild(div);
      });
    });
  }



  
  // ---------------------------------------------------------
  // 🚀 MODULE EXPORT
  // ---------------------------------------------------------
  Holy.UI = {
    cs: cs,
    HX_LOG_MODE: HX_LOG_MODE,
    DOM: DOM,
    allDOM: allDOM,
    toast: toast,
    initTabs: initTabs,
    onTarget: onTarget
  };


  // ---------------------------------------------------------
  // 📍01 – Focus Rehydration Listener
  // ---------------------------------------------------------
  window.addEventListener("focus", () => {
    console.log("[Holy.State] Panel refocused → rehydrating state");
    if (window.Holy && Holy.State && typeof Holy.State.reload === "function") {
      Holy.State.reload();
    }
  });
  // ---------------------------------------------------------
  // 📍V4.2 – LiveSync listener (Main Panel)
  // ---------------------------------------------------------
  try {

    cs.addEventListener("com.holy.expressor.stateChanged", function (evt) {
      try {
        var payload = typeof evt.data === "object" ? evt.data : JSON.parse(evt.data);
        console.log("[Holy.State] LiveSync event received →", payload);

        // 💡 Re-init snippets when any other panel updates state
        if (payload.type === "banksChanged" && window.Holy && Holy.SNIPPETS) {
          Holy.SNIPPETS.init();
        }
      } catch (parseErr) {
        console.warn("[Holy.State] LiveSync parse error", parseErr);
      }
    });
  } catch (listenerErr) {
    console.warn("[Holy.State] Failed to attach LiveSync listener", listenerErr);
  }





})();
