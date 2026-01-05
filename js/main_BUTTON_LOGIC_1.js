if (typeof Holy !== "object") Holy = {};

(function () {
  "use strict";

  // 🔗 Shared instances
  var cs = new CSInterface();
  var HX_LOG_MODE = window.HX_LOG_MODE || "verbose";
  var APPLY_LOG_EXTENSION_ID = "com.holy.expressor.log";
  var APPLY_LOG_EVENTS = {
    update: "com.holy.expressor.applyLog.update",
    request: "com.holy.expressor.applyLog.request"
  };
  var APPLY_LOG_MAX_ENTRIES = 250;
  var applyLogEntries = [];

  function formatApplyLogEntry(title, data) {
    var lines = [];

    try {
      var now = new Date();
      var stamp = typeof now.toLocaleTimeString === "function" ? now.toLocaleTimeString() : now.toISOString();
      var label = (title && typeof title === "string") ? title : "Apply";
      lines.push("[" + stamp + "] " + label);

      var raw = data;
      var parsed = null;
      if (typeof raw === "string" && raw.trim()) {
        try { parsed = JSON.parse(raw); }
        catch (err) { parsed = null; }
      } else if (raw && typeof raw === "object") {
        parsed = raw;
      }

      if (parsed && typeof parsed === "object") {
        if (typeof parsed.ok === "boolean") {
          lines.push("Status: " + (parsed.ok ? "ok" : "error"));
        }
        if (parsed.applied != null) lines.push("Applied: " + parsed.applied);
        if (parsed.skipped != null) lines.push("Skipped: " + parsed.skipped);
        if (parsed.expressionName) lines.push("Expression: " + parsed.expressionName);

        var targets = parsed.targets || parsed.paths;
        if (Array.isArray(targets) && targets.length) {
          lines.push("Targets:");
          for (var i = 0; i < targets.length; i++) {
            lines.push("- " + targets[i]);
          }
        }

        var errs = parsed.errors;
        if (errs && !Array.isArray(errs)) errs = [errs];
        if (errs && errs.length) {
          lines.push("Errors:");
          for (var j = 0; j < errs.length; j++) {
            var e = errs[j] || {};
            var path = e.path || e.target || "?";
            var errMsg = e.err || e.message || String(e);
            lines.push("- " + path + " -> " + errMsg);
          }
        }

        if (parsed.details && typeof parsed.details === "string") {
          lines.push("Details: " + parsed.details);
        }
      } else if (typeof raw === "string" && raw.trim()) {
        lines.push("Raw: " + raw.trim());
      } else if (raw != null) {
        try {
          lines.push("Raw: " + JSON.stringify(raw));
        } catch (err2) {
          lines.push("Raw: [unserializable]");
        }
      }
    } catch (err3) {
      lines.push("[Log formatting failed]");
    }

    return lines.join("\n");
  }

  function broadcastApplyLogEntries(targetExtensionId) {
    if (!cs || typeof cs.dispatchEvent !== "function") return;
    if (typeof CSEvent !== "function") return;

    try {
      var evt = new CSEvent(APPLY_LOG_EVENTS.update, "APPLICATION");
      evt.data = JSON.stringify({ entries: applyLogEntries.slice() });
      if (targetExtensionId) {
        evt.extensionId = targetExtensionId;
      }
      cs.dispatchEvent(evt);
    } catch (err) {
      console.warn("[Holy.BUTTONS] Failed to broadcast log entries", err);
    }
  }

  function openApplyLogWindow() {
    broadcastApplyLogEntries(APPLY_LOG_EXTENSION_ID);

    if (!cs || typeof cs.requestOpenExtension !== "function") {
      console.warn("[Holy.BUTTONS] requestOpenExtension unavailable; unable to open log panel");
      return;
    }

    try {
      cs.requestOpenExtension(APPLY_LOG_EXTENSION_ID, "");
    } catch (err) {
      console.warn("[Holy.BUTTONS] Failed to open log panel via requestOpenExtension", err);
      try {
        var sysPathConst = (typeof SystemPath !== "undefined" && SystemPath.EXTENSION) ? SystemPath.EXTENSION : "extension";
        var basePath = cs.getSystemPath && cs.getSystemPath(sysPathConst);
        if (basePath) {
          var normalized = basePath.replace(/\\/g, "/");
          if (normalized.charAt(normalized.length - 1) !== "/") normalized += "/";
          if (/^[a-zA-Z]:/.test(normalized)) {
            normalized = "/" + normalized; // ensure Windows drive paths start with a slash
          }
          var url = "file://" + (normalized.charAt(0) === "/" ? "" : "/") + normalized + "log.html";
          url = encodeURI(url);
          if (typeof cs.openURLInDefaultBrowser === "function") {
            cs.openURLInDefaultBrowser(url);
          }
        }
      } catch (err2) {
        console.warn("[Holy.BUTTONS] Fallback log open failed", err2);
      }
    }
  }

  if (cs && typeof cs.addEventListener === "function") {
    cs.addEventListener(APPLY_LOG_EVENTS.request, function (event) {
      var targetId = APPLY_LOG_EXTENSION_ID;
      if (event && typeof event.data === "string" && event.data) {
        try {
          var payload = JSON.parse(event.data);
          if (payload && typeof payload.requester === "string" && payload.requester) {
            targetId = payload.requester;
          }
        } catch (err) {}
      }
      broadcastApplyLogEntries(targetId);
    });
  }


  // ... module logic ...
          function wirePanelButtons() {

            /* ============================
              TARGET BUTTON 1 - Target Selected
              ============================ */
            const targetSelectedBtn = document.getElementById("targetSelectedBtn");
            if (targetSelectedBtn) {
              targetSelectedBtn.addEventListener("click", () => {
                targetSelectedBtn.classList.add("flash-orange");
                setTimeout(() => targetSelectedBtn.classList.remove("flash-orange"), 300);

                Holy.UI.onTarget();
              });
            }

            /* ============================
              TARGET BUTTON 2 - Select Target
              ============================ */
            const selectTargetBtn = document.getElementById("selectTargetBtn");
            if (selectTargetBtn) {
              selectTargetBtn.addEventListener("click", () => {
                selectTargetBtn.classList.add("stay-orange");
              });
            }

            /* ============================
              APPLY LOG WINDOW
              ============================ */
            var openLogBtn = Holy.UI.DOM("#openApplyLog");
            if (openLogBtn) {
              openLogBtn.addEventListener("click", function () {
                openApplyLogWindow();
              });
            }
          /* ============================
            BLUE APPLY HANDLER (Selection Striker with Custom Search routing)
            V4 – use editor expression for Custom Search; fallback to builder only if editor is empty
            ============================ */
          function onApply() {
            var modePanel = document.getElementById("modePanel");
            var mode = (modePanel && modePanel.dataset && modePanel.dataset.mode) || "";

            if (mode === "rewrite") {
              var applyButtonEl = document.getElementById("applyBtn");

              if (!Holy || !Holy.SEARCH || typeof Holy.SEARCH.runSearchReplace !== "function") {
                console.warn("[Holy.BUTTONS] Search & Replace helper unavailable");
                if (Holy.UI && typeof Holy.UI.toast === "function") {
                  Holy.UI.toast("Search & Replace unavailable");
                }
                return;
              }

              try {
                Holy.SEARCH.runSearchReplace(applyButtonEl);
              } catch (err) {
                console.error("[Holy.BUTTONS] Search & Replace failed", err);
                if (Holy.UI && typeof Holy.UI.toast === "function") {
                  Holy.UI.toast("Search & Replace failed");
                }
              }

              return;
            }

            var expr = Holy.EXPRESS.PORTAL_getCurrentExpression();
            var hasEditorExpr = !!(expr && String(expr).trim().length);
            if (!hasEditorExpr) {
              // No editor text yet, allow type-driven preset generation for convenience
              expr = "";
            }

            // Blue Apply uses strict search when Custom Search is active
            // HTML ids: checkbox = #useCustomSearch, input = #customSearch
            var csToggle = document.querySelector("#useCustomSearch");
            var csInput  = document.querySelector("#customSearch");

            var useSearch = false;
            if (csToggle && csToggle.checked) useSearch = true;
            if (!useSearch && csInput && csInput.value && csInput.value.trim().length > 0) useSearch = true;

            if (useSearch) {
              var searchVal = csInput ? csInput.value.trim() : "";
              if (!searchVal) { Holy.UI.toast("Enter a Custom Name to search"); return; }

              if (hasEditorExpr) {
                // Use the editor text exactly as authored
                Holy.EXPRESS.HE_applyByStrictSearch(expr, searchVal);
              } else if (typeof Holy.EXPRESS.buildExpressionForSearch === "function") {
                // Fallback: build from preset if user has not typed anything yet
                Holy.EXPRESS.buildExpressionForSearch(searchVal, function (expr2) {
                  Holy.EXPRESS.HE_applyByStrictSearch(expr2, searchVal);
                });
              } else {
                Holy.UI.toast("Enter or build an expression");
              }
              return; // Do not fall through to Selection Striker
            }

            // Default Blue path: direct selection apply (Selection Striker)
            try {
              var exprDirect = hasEditorExpr ? expr : "";
              if (!exprDirect) { Holy.UI.toast("Enter or build an expression"); return; }

              var payload = JSON.stringify({ expressionText: exprDirect });
              var escaped = payload.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
              Holy.UI.cs.evalScript('he_S_SS_applyExpressionToSelection("' + escaped + '")', function (report) {
                updateApplyReport("Blue Apply", report);

                var parsed = null;
                try { parsed = JSON.parse(report || "{}"); } catch (_) {}

                try {
                  if (Holy && Holy.UTILS && typeof Holy.UTILS.NEW_forCustomer_emit === "function") {
                    if (parsed && parsed.ok !== false) {
                      var count = (typeof parsed.written === "number")
                        ? parsed.written
                        : (typeof parsed.applied === "number")
                          ? parsed.applied
                          : null;
                      var msg = "Apply";
                      if (count !== null) {
                        msg += ": " + count + (count === 1 ? " property" : " properties");
                      }
                      Holy.UTILS.NEW_forCustomer_emit(msg);
                    }
                  }
                } catch (e) {}

                if (Holy.UI && typeof Holy.UI.toast === "function") {
                  if (parsed && parsed.ok === false) {
                    Holy.UI.toast(parsed.err || "Blue Apply failed");
                    return;
                  }

// Explicit failure only
if (parsed && parsed.ok === false) {
  Holy.UI.toast(parsed.err || "Blue Apply failed");
  return;
}

// If we got a count, great
if (parsed && typeof parsed.applied === "number") {
  if (parsed.applied > 0) {
    Holy.UI.toast("Expressed to selected properties");
    return;
  }
}

// No explicit failure, no count → assume success
Holy.UI.toast("Expressed to selected properties");

                }
              });
            } catch (e) {
              console.error("Blue Apply failed:", e);
              Holy.UI.toast("Blue Apply failed");
            }
          }

          // ==========================================================
          // 🧪 DEV EXPOSE BUTTON
          // ==========================================================
          const exposeBtn = document.getElementById("exposeBtn");
          if (exposeBtn) {
            exposeBtn.addEventListener("click", function () {
              console.log("⚙️  Expose: requesting raw property info from AE...");
              Holy.UI.cs.evalScript("he_U_DEV_exposeSelectedProps()", function (response) {
                try {
                  const data = JSON.parse(response);
                  console.group("🔍 AE Raw Property Dump");
          console.log("Text snapshot:\n" + JSON.stringify(data, null, 2));
          console.log("Interactive view:", data);
          console.groupEnd();


                } catch (err) {
                  console.error("Expose parse error:", err, response);
                }
              });
            });
          }


            /* ============================
              BLUE APPLY BUTTON
              ============================ */
            var applyBtn = Holy.UI.DOM("#applyBtn");
            if (applyBtn) {
              applyBtn.addEventListener("click", onApply);
            }

            var deleteExpressionsBtn = Holy.UI.DOM("#deleteExpressionsBtn");
            if (deleteExpressionsBtn) {
              deleteExpressionsBtn.addEventListener("click", function () {
                if (!Holy || !Holy.EXPRESS || typeof Holy.EXPRESS.cy_deleteExpressions !== "function") {
                  console.warn("[Holy.BUTTONS] Delete expressions helper unavailable");
                  if (Holy.UI && typeof Holy.UI.toast === "function") {
                    Holy.UI.toast("Delete expressions unavailable");
                  }
                  return;
                }

                deleteExpressionsBtn.disabled = true;
                var release = function () {
                  deleteExpressionsBtn.disabled = false;
                };

                Holy.EXPRESS.cy_deleteExpressions()
                  .then(function (result) {
                    release();

                    if (result && result.consoleMessage) {
                      console.log(result.consoleMessage);
                    }

                    if (result && result.hadErrors && Array.isArray(result.errors) && result.errors.length) {
                      console.warn("[Holy.BUTTONS] Delete expressions completed with warnings", result.errors);
                    }

                    var toastMsg = (result && result.toastMessage) || "✅ Deleted expressions from selection";
                    if (Holy.UI && typeof Holy.UI.toast === "function" && toastMsg) {
                      Holy.UI.toast(toastMsg);
                    }
                  })
                  .catch(function (err) {
                    release();
                    console.error("[Holy.BUTTONS] Delete expressions failed", err);
                    var msg = (err && err.userMessage) ? err.userMessage : "Delete expressions failed";
                    if (Holy.UI && typeof Holy.UI.toast === "function") {
                      Holy.UI.toast(msg);
                    }
                  });
              });
            }

            /* ============================
              ORANGE APPLY BUTTON (Target List + Custom Search)
              ============================ */
            var applyTargetBtn = Holy.UI.DOM("#applyTargetBtn");
            if (applyTargetBtn) {
              applyTargetBtn.addEventListener("click", function () {
                console.log("Apply to Target button clicked");

                var customToggle = Holy.UI.DOM("#useCustomSearch");
                var customBox    = Holy.UI.DOM("#customSearch");

                if (customToggle && customToggle.checked) {
                  // Custom Search path
                  var searchVal = (customBox && customBox.value.trim()) || "";
                  if (!searchVal) { Holy.UI.toast("Enter a property name"); return; }

                  Holy.EXPRESS.buildExpressionForSearch(searchVal, function (expr) {
                    var payload = JSON.stringify({ expressionText: expr, searchTerm: searchVal });
                    var escaped = payload.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                    Holy.UI.cs.evalScript('he_P_SC_applyExpressionBySearch("' + escaped + '")', function (raw) {
                      handleSearchApplyResult(raw, "Orange Apply (Custom Search)");
                    });
                  });
                } else {
                  // Target List path
                  var listEl = Holy.UI.DOM("#TargetList");
                  var items = listEl ? listEl.querySelectorAll(".target-item") : [];
                  var paths = [];
                  items.forEach(function (item) {
                    var p = item.getAttribute("data-path");
                    if (p) paths.push(p);
                  });

                  console.log("Debug Target List paths:", paths);

                  if (!paths.length) { Holy.UI.toast("No target paths defined"); return; }

                  function applyWithExpr() {
                    var expr = Holy.EXPRESS.PORTAL_getCurrentExpression();
                    if (!expr) { Holy.UI.toast("Enter or build an expression"); return; }

                    var payload = JSON.stringify({ expressionText: expr, targetPaths: paths });
                    var escaped = payload.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                    Holy.UI.cs.evalScript('he_S_LS_applyExpressionToTargetList("' + escaped + '")', function (raw) {
                      var r = {}; try { r = JSON.parse(raw || "{}"); } catch (e) {}
                      if (!r.ok) {
                        Holy.UI.toast(r.err || "Apply to target failed");
                        return;
                      }
                      Holy.UI.toast("Applied to " + r.applied + " properties");
                      updateApplyReport("Orange Apply (Target List)", r);
                    });
                  }

                  if (paths.length > 0) {
                    applyWithExpr();
                  }
                }
              });
            }


          /* ============================PULL EXP BUTTTON*/

          // V11 – LFS: dedupe by path preferring direct picks; include ShapePath when the Path was directly selected
          var loadBtn = document.getElementById("loadFromSelectionBtn");
          if (loadBtn) {
            loadBtn.addEventListener("click", function () {
              Holy.UI.cs.evalScript('JSON.stringify(he_U_getSelectedProps())', function (raw) {
                try {
                  var items = JSON.parse(raw || "[]");
                  if (!items || !items.length) {
                    Holy.UI.toast("Nothing selected");
                    return;
                  }

                  // CHECKER: normalize and dedupe by expr path, preferring records that were directly picked
                  var byPath = Object.create(null);

                  for (var i = 0; i < items.length; i++) {
                    var it = items[i];
                    if (!it) continue;

                    var path = String(it.path || "");
                    if (!path) continue;

                    var current = byPath[path];

                    // Choose "better" candidate for the same path:
                    // 1) Prefer direct pick (pickedIsLeaf === true)
                    // 2) Prefer one that has an expression over one that does not
                    // 3) Otherwise keep the existing one
                    if (!current) {
                      byPath[path] = it;
                    } else {
                      var aDirect = !!(it.pickedIsLeaf);
                      var bDirect = !!(current.pickedIsLeaf);
                      if (aDirect && !bDirect) {
                        byPath[path] = it;
                      } else if (aDirect === bDirect) {
                        var aHasExpr = !!(it.expr && it.expr !== "__NO_EXPRESSION__");
                        var bHasExpr = !!(current.expr && current.expr !== "__NO_EXPRESSION__");
                        if (aHasExpr && !bHasExpr) {
                          byPath[path] = it;
                        }
                      }
                    }
                  }

                  // CHECKER: scan whether any non-Path candidate with an expression exists
                  var hasNonPath = false;
                  for (var k in byPath) {
                    if (!Object.prototype.hasOwnProperty.call(byPath, k)) continue;
                    var probe = byPath[k];
                    if (!probe || !probe.expr || probe.expr === "__NO_EXPRESSION__") continue;

                    var mmProbe = String(probe.matchName || "");
                    var clsProbe = String(probe.classification || "");
                    var isPathProbe = (clsProbe === "ShapePath") || (mmProbe === "ADBE Vector Shape");
                    if (!isPathProbe) { hasNonPath = true; break; }
                  }

                  // CHECKER: build final list with Path rule
                  var exprs = [];
                  var seenPathKeys = Object.create(null);

                  for (var p in byPath) {
                    if (!Object.prototype.hasOwnProperty.call(byPath, p)) continue;
                    var it2 = byPath[p];
                    if (!it2) continue;

                    var expr = it2.expr;
                    if (!expr || expr === "__NO_EXPRESSION__") continue;

                    var mm   = String(it2.matchName || "");
                    var cls  = String(it2.classification || "");
                    var isPath = (cls === "ShapePath") || (mm === "ADBE Vector Shape");

                    if (isPath) {
                      // ALLOW Path if:
                      //  A) no non-Path expressions exist, OR
                      //  B) this Path was directly picked (pickedIsLeaf true), OR
                      //  C) pickedMatchName explicitly equals ADBE Vector Shape
                      var allowPath =
                        (!hasNonPath) ||
                        !!it2.pickedIsLeaf ||
                        (String(it2.pickedMatchName || "") === "ADBE Vector Shape");

                      if (!allowPath) continue;

                      // DEDUPE: guard against multiple entries with the same Path key
                      if (seenPathKeys[p]) continue;
                      seenPathKeys[p] = true;
                    }

                    exprs.push(String(expr));
                  }

                  if (!exprs.length) {
                    Holy.UI.toast("No expression on the selected property");
                    return;
                  }

                  var joined = exprs.join("\n");
                  Holy.EXPRESS.EDITOR_insertText(joined);

                  Holy.UI.toast(
                    "Loaded " +
                    exprs.length +
                    " expression" +
                    (exprs.length > 1 ? "s" : "") +
                    " from selection"
                  );
                } catch (e) {
                  console.error("Load From Selection failed:", e);
                  Holy.UI.toast("Failed to load from selection");
                }
              });
            });
          }













































          /*
          // ==========================================================
          // GLOBAL: JSX Log Relay  🧠 moved up for single registration
          // ==========================================================
          Holy.UI.cs.addEventListener("com.holyexpressor.log", (event) => {
            try {
              const data = event.data;
              console.log("[JSX LOG]", data);
            } catch (err) {
              console.warn("[LOG HANDLER ERROR]", err);
            }
          });
          */


          // ==========================================================
          // GLOBAL: JSX Log Relay 💬 (emoji-safe)
          // ==========================================================
          Holy.UI.cs.addEventListener("com.holyexpressor.log", (event) => {
            try {
              const decoded = decodeURIComponent(event.data || "");
              console.log("[JSX LOG]", decoded);
            } catch (err) {
              console.warn("[LOG HANDLER ERROR]", err);
            }
          });





          // ==========================================================
          // LOAD PATH BUTTON logic  (Lean ↔ Fallback switch)
          // ==========================================================
          window.USE_FALLBACK_DYNAMIC_PATH = false;

          const loadPathBtn = document.getElementById("loadPathFromSelectionBtn");
          if (loadPathBtn) {
            loadPathBtn.addEventListener("click", function () {
              Holy.UI.toast("Load Path from Selection (rebuild in progress)");
              return; // 🚧 Legacy JSX path builder quarantined
              const useAbs = document.getElementById("useAbsoluteComp")?.checked || false;

              if (!window.USE_FALLBACK_DYNAMIC_PATH) {
                // 💡 Lean builder mode
                console.log("⚙️ Lean path builder will handle this call (dynamic fallback disabled).");

                Holy.UI.cs.evalScript(`he_GET_SelPath_Engage("${useAbs}")`, function (raw) {
                  try {
                    const parsed = JSON.parse(raw || "{}");
                    if (parsed.error) return Holy.UI.toast("JSX error: " + parsed.error);

                    if (parsed.built) {
                      Holy.EXPRESS.EDITOR_insertText(parsed.built);
                      Holy.UI.toast("Lean builder path inserted");
                    } else Holy.UI.toast("No path returned from lean builder");
                  } catch (err) {
                    console.error("Lean builder parse error:", err, raw);
                    Holy.UI.toast("Parse error");
                  }
                });

              } else {
                // 💡 Fallback (MapMaker-based) mode
                console.groupCollapsed("⚙️ Running fallback dynamic path builder");
                Holy.UI.cs.evalScript(`he_U_getSelectedPaths("${useAbs}")`, function (raw) {
                  try {
                    const parsed = JSON.parse(raw);
                    console.log("%c[interactive]", "color:#03A9F4;font-weight:bold;");
                    console.dir(parsed);

                    // --- Safe extract built paths ---
                    let builtStr = "";
                    if (parsed.built) builtStr = parsed.built;
                    else if (parsed.debug?.builtPaths)
                      builtStr = parsed.debug.builtPaths.join("\n");

                    if (builtStr) {
                      Holy.EXPRESS.EDITOR_insertText(builtStr);
                      console.log(
                        "%c[Inserted built string]",
                        "color:#9C27B0;font-weight:bold;",
                        builtStr
                      );
                    } else Holy.UI.toast("No built string returned");
                  } catch (e) {
                    console.error("Parse fail:", e, raw);
                    Holy.UI.toast("Parse error");
                  }
                  console.groupEnd();
                });
              }
            }); // ← end click handler
          }






            /* ============================
              TOGGLE: CUSTOM SEARCH BOX
              ============================ */
            var customToggle = Holy.UI.DOM("#useCustomSearch");
            var customBox = Holy.UI.DOM("#customSearch");
            var targetBox = Holy.UI.DOM("#TargetBox");
            if (customToggle && customBox && targetBox) {
              customToggle.addEventListener("change", function () {
                if (customToggle.checked) {
                  customBox.disabled = false;
                  targetBox.style.opacity = "0.5";
                  targetBox.style.pointerEvents = "none";
                } else {
                  customBox.disabled = true;
                  customBox.value = "";
                  targetBox.style.opacity = "1";
                  targetBox.style.pointerEvents = "auto";
                }
              });
            }

            /* ============================
              RELOAD BUTTON
              ============================ */
            var reloadBtn = Holy.UI.DOM("#reloadPanel");
            if (reloadBtn) {
              reloadBtn.addEventListener("click", function () { location.reload(); });
            }

            var reloadSettingsBtn = Holy.UI.DOM("#reloadPanelSettings");
            if (reloadSettingsBtn) {
              reloadSettingsBtn.addEventListener("click", function () { location.reload(); });
            }



            /* ============================
              DEVTOOLS BUTTON
              ============================ */
            var devBtn = Holy.UI.DOM("#openDevtools");
            if (devBtn) {
              devBtn.addEventListener("click", function () {
                try { Holy.UI.cs.openURLInDefaultBrowser("http://localhost:6904"); } catch (e) {}
              });
            }

          }







// ======================================
//  Apply Report Helper (backward-compatible)
// Accepts updateApplyReport(result)  or  updateApplyReport(title, result)
// ======================================
  function updateApplyReport(arg1, arg2) {
    var title = (arguments.length === 2 && typeof arg1 === "string") ? arg1 : "";
    var data  = (arguments.length === 2 && typeof arg1 === "string") ? arg2 : arg1;

    var entry = formatApplyLogEntry(title, data);
    if (!entry) entry = "[No apply data]";

    applyLogEntries.push(entry);
    if (applyLogEntries.length > APPLY_LOG_MAX_ENTRIES) {
      applyLogEntries.shift();
    }

    var box = document.getElementById("applyReport");
    if (box) {
      box.textContent = entry;
    }

    broadcastApplyLogEntries();
  }

  // Result handler for Search Captain apply responses (custom search)
  function handleSearchApplyResult(raw, logLabel) {
    var parsed = null;
    try { parsed = JSON.parse(raw || "{}"); }
    catch (err) { parsed = null; }

    // Always log the raw payload for transparency
    updateApplyReport(logLabel || "Apply by Search", parsed || raw || {});

    if (!Holy.UI || typeof Holy.UI.toast !== "function") return;

    if (!parsed) {
      Holy.UI.toast("Custom search failed");
      return;
    }

    if (parsed.ok === false) {
      Holy.UI.toast(parsed.err || "Custom search failed");
      return;
    }

    var appliedCount = (typeof parsed.applied === "number") ? parsed.applied : 0;

    if (appliedCount > 0) {
      Holy.UI.toast(
        appliedCount === 1
          ? "Found and expressed, 1 instance"
          : "Found and expressed, " + appliedCount + " instances"
      );
      return;
    }

    Holy.UI.toast("Nothing found matching the search, ensure characters match exactly");
  }





// ---------------------------------------------------------
// 🚀 MODULE EXPORT
// ---------------------------------------------------------
Holy.BUTTONS = {
  cs: cs,
  HX_LOG_MODE: HX_LOG_MODE,
  wirePanelButtons: wirePanelButtons,
  updateApplyReport: updateApplyReport,
  openApplyLogWindow: openApplyLogWindow
};

})();
