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

  function truncateForLog(str, max) {
    if (typeof str !== "string") return "";
    if (str.length <= max) return str;
    return str.slice(0, max - 1) + "…";
  }

  function pushList(lines, label, items) {
    if (!Array.isArray(items) || !items.length) {
      return;
    }
    lines.push(label);
    for (var i = 0; i < items.length; i++) {
      if (items[i] == null) continue;
      lines.push("- " + String(items[i]));
    }
  }

  function NEW_forCustomer_emitIfAvailable(message) {
    if (!message) return;
    if (typeof Holy !== "object" || !Holy || !Holy.UTILS) return;
    if (typeof Holy.UTILS.NEW_forCustomer_emit !== "function") return;
    Holy.UTILS.NEW_forCustomer_emit(message);
  }

  function NEW_forCustomer_emitPathSummary(builtString) {
    if (!builtString) return;
    var NEW_forCustomer_lines = String(builtString).split(/\r?\n/);
    var NEW_forCustomer_preview = (NEW_forCustomer_lines[0] || builtString || "").trim();
    if (!NEW_forCustomer_preview && builtString) {
      NEW_forCustomer_preview = String(builtString).trim();
    }
    if (NEW_forCustomer_preview.length > 120) {
      NEW_forCustomer_preview = NEW_forCustomer_preview.slice(0, 117) + "…";
    }
    var NEW_forCustomer_lineCount = 0;
    for (var NEW_forCustomer_i = 0; NEW_forCustomer_i < NEW_forCustomer_lines.length; NEW_forCustomer_i++) {
      if (NEW_forCustomer_lines[NEW_forCustomer_i] && NEW_forCustomer_lines[NEW_forCustomer_i].trim()) {
        NEW_forCustomer_lineCount++;
      }
    }
    if (!NEW_forCustomer_lineCount) {
      NEW_forCustomer_lineCount = 1;
    }
    var NEW_forCustomer_label = NEW_forCustomer_lineCount === 1
      ? "Path built"
      : "Paths built (" + NEW_forCustomer_lineCount + " entries)";
    var NEW_forCustomer_message = NEW_forCustomer_preview
      ? NEW_forCustomer_label + ": " + NEW_forCustomer_preview
      : NEW_forCustomer_label;
    NEW_forCustomer_emitIfAvailable(NEW_forCustomer_message);
  }

  function toNumberOrNull(value) {
    if (value == null || value === "") {
      return null;
    }
    var num = Number(value);
    return isNaN(num) ? null : num;
  }

function normalizeApplyResult(payload) {
  var normalized = { parsed: null, raw: null, text: "" };

  // Helper → enforce final schema for Customer Log
  function enforceSchema(obj) {
    if (!obj || typeof obj !== "object") obj = {};

    return {
      ok: typeof obj.ok === "boolean" ? obj.ok : false,
      applied: typeof obj.applied === "number" ? obj.applied : 0,
      skipped: typeof obj.skipped === "number" ? obj.skipped : 0,
      errors: Array.isArray(obj.errors) ? obj.errors : []
    };
  }

  // 1) Undefined/null
  if (payload == null) {
    normalized.parsed = enforceSchema(null);
    return normalized;
  }

  // 2) Payload is string
  if (typeof payload === "string") {
    var trimmed = payload.trim();
    normalized.raw = trimmed;
    normalized.text = trimmed;

    if (trimmed) {
      try {
        var parsed = JSON.parse(trimmed);
        normalized.parsed = enforceSchema(parsed);
      } catch (err) {
        normalized.parsed = enforceSchema(null);
      }
    } else {
      normalized.parsed = enforceSchema(null);
    }

    return normalized;
  }

  // 3) Payload is object (already parsed)
  if (typeof payload === "object") {
    normalized.raw = payload;

    var baseObj =
      payload && typeof payload.parsed === "object"
        ? payload.parsed
        : payload;

    normalized.parsed = enforceSchema(baseObj);

    try {
      normalized.text = JSON.stringify(payload);
    } catch (err2) {
      normalized.text = "" + payload;
    }

    return normalized;
  }

  // 4) Anything else
  normalized.raw = payload;
  normalized.text = String(payload);
  normalized.parsed = enforceSchema(null);
  return normalized;
}


  function formatApplyLogEntry(title, normalized, context) {
    var lines = [];

    try {
      var now = new Date();
      var stamp = typeof now.toLocaleTimeString === "function" ? now.toLocaleTimeString() : now.toISOString();
      var label = (title && typeof title === "string") ? title : "Apply";
      lines.push("[" + stamp + "] " + label);

      var parsed = normalized && normalized.parsed;
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.ok === "boolean") {
          lines.push("Status: " + (parsed.ok ? "ok" : "error"));
        }
        if (parsed.applied != null) lines.push("Applied: " + parsed.applied);
        if (parsed.skipped != null) lines.push("Skipped: " + parsed.skipped);
        if (parsed.expressionName) lines.push("Expression: " + parsed.expressionName);
        if (parsed.note) lines.push("Note: " + parsed.note);

        var targets = parsed.targets || parsed.paths;
        if (!targets && Array.isArray(parsed.targetPaths)) {
          targets = parsed.targetPaths;
        }
        if (Array.isArray(targets) && targets.length) {
          pushList(lines, "Targets:", targets);
        }

        var layers = parsed.layers;
        if (Array.isArray(layers) && layers.length) {
          pushList(lines, "Layers:", layers);
        }

        var errs = parsed.errors;
        if (errs && !Array.isArray(errs)) errs = [errs];
        if (errs && errs.length) {
          lines.push("Errors:");
          for (var j = 0; j < errs.length; j++) {
            var e = errs[j] || {};
            var path = e.path || e.target || e.layer || "?";
            var errMsg = e.err || e.message || String(e);
            lines.push("- " + path + " -> " + errMsg);
          }
        }

        if (parsed.details && typeof parsed.details === "string") {
          lines.push("Details: " + parsed.details);
        }
      } else if (normalized && normalized.text) {
        lines.push("Raw: " + normalized.text);
      }

      var ctx = (context && typeof context === "object") ? context : null;
      if (ctx) {
        if (ctx.action && ctx.action !== label) {
          lines.push("Action: " + ctx.action);
        }
        if (ctx.selectionType) {
          lines.push("Selection: " + ctx.selectionType);
        }
        if (ctx.searchTerm) {
          lines.push("Search: " + ctx.searchTerm);
        }
        if (ctx.replaceValue !== undefined) {
          lines.push("Replace: " + ctx.replaceValue);
        }
        if (ctx.matchCase !== undefined) {
          lines.push("Match case: " + (ctx.matchCase ? "true" : "false"));
        }
        if (ctx.replacements != null) {
          lines.push("Replacements: " + ctx.replacements);
        }
        if (ctx.layersChanged != null) {
          lines.push("Layers changed: " + ctx.layersChanged);
        }
        if (ctx.layersCount != null && ctx.layersChanged == null) {
          lines.push("Layers scanned: " + ctx.layersCount);
        }
        if (ctx.clearedProperties != null) {
          lines.push("Cleared properties: " + ctx.clearedProperties);
        }
        if (ctx.clearedLayers != null) {
          lines.push("Cleared layers: " + ctx.clearedLayers);
        }
        if (ctx.expressionPreview) {
          lines.push("Expression preview: " + truncateForLog(ctx.expressionPreview, 140));
        }
        if (ctx.expressionLength != null) {
          lines.push("Expression length: " + ctx.expressionLength);
        }
        if (ctx.snippetName) {
          lines.push("Snippet: " + ctx.snippetName);
        }
        if (ctx.snippetId) {
          lines.push("Snippet ID: " + ctx.snippetId);
        }
        if (ctx.controlsApplied !== undefined) {
          lines.push("Controls applied: " + (ctx.controlsApplied ? "true" : "false"));
        }
        if (ctx.layers && Array.isArray(ctx.layers) && ctx.layers.length) {
          pushList(lines, "Layers:", ctx.layers);
        }
        if (ctx.targetPaths && Array.isArray(ctx.targetPaths) && ctx.targetPaths.length) {
          pushList(lines, "Target paths:", ctx.targetPaths);
        }
        if (ctx.note) {
          lines.push("Note: " + ctx.note);
        }
        if (ctx.error) {
          lines.push("Error: " + ctx.error);
        }
      }
    } catch (err3) {
      lines.push("[Log formatting failed]");
    }

    return lines.join("\n");
  }

  function maybeToastBlueApply(title, normalized, context) {
    if (!window.Holy || !Holy.UI || typeof Holy.UI.toast !== "function") {
      return;
    }

    var label = (typeof title === "string") ? title : "";
    var ctx = (context && typeof context === "object") ? context : {};
    var action = (typeof ctx.action === "string") ? ctx.action : "";
    var isBlue = false;

    if (label.indexOf("Blue Apply") === 0) {
      isBlue = true;
    } else if (action.indexOf("Blue Apply") === 0) {
      isBlue = true;
    }

    if (!isBlue) {
      return;
    }

    var parsed = normalized && normalized.parsed;
    var toastMsg = null;

    if (parsed && typeof parsed === "object") {
      if (parsed.toastMessage) {
        toastMsg = parsed.toastMessage;
      } else {
        var appliedNum = toNumberOrNull(parsed.applied);
        var skippedNum = toNumberOrNull(parsed.skipped);
        var okFlag = (parsed.ok === undefined) ? (appliedNum != null && appliedNum > 0) : !!parsed.ok;

        if (okFlag && appliedNum != null) {
          toastMsg = "Applied to " + appliedNum + " " + (appliedNum === 1 ? "property" : "properties");
        } else if (okFlag && skippedNum != null) {
          toastMsg = "Skipped " + skippedNum + " " + (skippedNum === 1 ? "property" : "properties");
        } else if (okFlag) {
          toastMsg = "Apply complete";
        } else if (parsed.note) {
          toastMsg = parsed.note;
        } else if (parsed.err || parsed.error) {
          toastMsg = parsed.err || parsed.error;
        } else if (appliedNum != null) {
          toastMsg = "Applied to " + appliedNum + " " + (appliedNum === 1 ? "property" : "properties");
        } else if (skippedNum != null) {
          toastMsg = "Skipped " + skippedNum + " " + (skippedNum === 1 ? "property" : "properties");
        }
      }
    } else if (normalized && typeof normalized.raw === "string" && normalized.raw) {
      var rawTrimmed = String(normalized.raw).trim();
      if (rawTrimmed && rawTrimmed.charAt(0) !== "{" && rawTrimmed.charAt(0) !== "[") {
        toastMsg = rawTrimmed;
      }
    }

    if (!toastMsg) {
      if (parsed && parsed.ok === false) {
        toastMsg = parsed.note || parsed.err || parsed.error || "Apply failed";
      } else if (parsed && parsed.ok) {
        toastMsg = "Apply complete";
      }
    }

    if (!toastMsg) {
      return;
    }

    Holy.UI.toast(toastMsg);
  }

  function appendLogEntry(entry, updateApplyBox) {
    if (!entry) return;
    applyLogEntries.push(entry);
    if (applyLogEntries.length > APPLY_LOG_MAX_ENTRIES) {
      applyLogEntries.shift();
    }

    if (updateApplyBox) {
      var box = document.getElementById("applyReport");
      if (box) {
        box.textContent = entry;
      }
    }

    broadcastApplyLogEntries();
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
            var modePanelEl = document.getElementById("modePanel");
            var isRewriteMode = modePanelEl && modePanelEl.dataset.mode === "rewrite";

            if (isRewriteMode) {
              if (Holy.SEARCH && typeof Holy.SEARCH.runSearchReplace === "function") {
                var rewriteBtn = document.getElementById("applyBtn");
                Holy.SEARCH.runSearchReplace(rewriteBtn);
              } else {
                console.warn("[Holy.BUTTONS] Search & Replace helper unavailable in rewrite mode");
                if (Holy.UI && typeof Holy.UI.toast === "function") {
                  Holy.UI.toast("Search & Replace unavailable");
                }
              }
              return;
            }

            console.log("Blue Apply button clicked");

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
                var context = {
                  action: "Blue Apply (Selection)",
                  selectionType: "selection",
                  expressionPreview: exprDirect,
                  expressionLength: exprDirect.length
                };
var parsed = null;
try {
    parsed = JSON.parse(report || "{}");
} catch (e) {
    console.warn("Apply report JSON parse failed:", e, report);
    parsed = { applied: 0, errors: ["JSON parse failed"] };
}
updateApplyReport("Blue Apply", parsed, context);
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

                    var context = {
                      action: "Delete Expressions",
                      selectionType: result && result.selectionType,
                      clearedProperties: result && result.clearedProperties,
                      clearedLayers: result && result.clearedLayers,
                      hadErrors: result && result.hadErrors,
                      errorsCount: result && Array.isArray(result.errors) ? result.errors.length : 0
                    };
                    logPanelEvent("Delete Expressions", context, result);
                  })
                  .catch(function (err) {
                    release();
                    console.error("[Holy.BUTTONS] Delete expressions failed", err);
                    var msg = (err && err.userMessage) ? err.userMessage : "Delete expressions failed";
                    if (Holy.UI && typeof Holy.UI.toast === "function") {
                      Holy.UI.toast(msg);
                    }
                    var errorContext = {
                      action: "Delete Expressions",
                      error: msg
                    };
                    logPanelEvent("Delete Expressions (Error)", errorContext, err);
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
                      var r = {}; try { r = JSON.parse(raw || "{}"); } catch (e) {}
                      if (!r.ok) {
                        Holy.UI.toast(r.err || "Custom search failed");
                        return;
                      }
                      Holy.UI.toast("Applied to " + r.applied + " properties");
                      var context = {
                        action: "Orange Apply (Custom Search)",
                        searchTerm: searchVal,
                        expressionPreview: expr,
                        expressionLength: String(expr || "").length
                      };
                      updateApplyReport("Orange Apply (Custom Search)", raw, context);
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
                      var context = {
                        action: "Orange Apply (Target List)",
                        targetPaths: paths.slice(),
                        expressionPreview: expr,
                        expressionLength: String(expr || "").length
                      };
                      updateApplyReport("Orange Apply (Target List)", raw, context);
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
                      NEW_forCustomer_emitPathSummary(parsed.built);
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
                      NEW_forCustomer_emitPathSummary(builtStr);
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
// Accepts updateApplyReport(result)  or  updateApplyReport(title, result[, context])
// ======================================
function updateApplyReport(arg1, arg2, arg3) {
  var title;
  var data;
  var context;

  if (arguments.length === 1) {
    title = "";
    data = arg1;
    context = undefined;
  } else if (arguments.length === 2) {
    title = (typeof arg1 === "string") ? arg1 : "";
    data = (typeof arg1 === "string") ? arg2 : arg1;
    context = (typeof arg1 === "string") ? undefined : arg2;
  } else {
    title = (typeof arg1 === "string") ? arg1 : "";
    data = arg2;
    context = arg3;
  }

  var normalized = normalizeApplyResult(data);
  // DEBUG: detect missing applied count
if (normalized.parsed && normalized.parsed.applied === undefined) {
    console.warn("⚠ Host returned apply payload WITHOUT 'applied' field:", normalized.parsed);
}

  var entry = formatApplyLogEntry(title, normalized, context);
  if (!entry) {
    entry = "[No apply data]";
  }

  appendLogEntry(entry, true);
  maybeToastBlueApply(title, normalized, context);

  var NEW_forCustomer_parsed = (normalized && typeof normalized === "object") ? normalized.parsed : null;
  var NEW_forCustomer_isObject = NEW_forCustomer_parsed && typeof NEW_forCustomer_parsed === "object";
  if (NEW_forCustomer_isObject) {
    var NEW_forCustomer_success = false;
    if (NEW_forCustomer_parsed.ok === false) {
      NEW_forCustomer_success = false;
    } else if (NEW_forCustomer_parsed.ok === true) {
      NEW_forCustomer_success = true;
    } else if (typeof NEW_forCustomer_parsed.applied === "number" || NEW_forCustomer_parsed.toastMessage || NEW_forCustomer_parsed.note) {
      NEW_forCustomer_success = true;
    }

    if (NEW_forCustomer_success) {
      var NEW_forCustomer_label = "";
      if (context && context.snippetName) {
        NEW_forCustomer_label = 'Snippet "' + context.snippetName + '"';
      } else if (context && context.action) {
        NEW_forCustomer_label = context.action;
      } else if (title) {
        NEW_forCustomer_label = title;
      } else {
        NEW_forCustomer_label = "Apply";
      }

      var NEW_forCustomer_details = [];
      if (typeof NEW_forCustomer_parsed.applied === "number") {
        var NEW_forCustomer_applyLabel = NEW_forCustomer_parsed.applied === 1 ? "property" : "properties";
        NEW_forCustomer_details.push(NEW_forCustomer_parsed.applied + " " + NEW_forCustomer_applyLabel + " updated");
      }
      if (typeof NEW_forCustomer_parsed.skipped === "number" && NEW_forCustomer_parsed.skipped > 0) {
        var NEW_forCustomer_skipLabel = NEW_forCustomer_parsed.skipped === 1 ? "property" : "properties";
        NEW_forCustomer_details.push(NEW_forCustomer_parsed.skipped + " " + NEW_forCustomer_skipLabel + " skipped");
      }
      if (context && context.controlsApplied) {
        NEW_forCustomer_details.push("Controls applied");
      }
      if (context && context.searchTerm) {
        NEW_forCustomer_details.push('Search: ' + context.searchTerm);
      }
      if (context && context.selectionType && !context.snippetName) {
        NEW_forCustomer_details.push('Selection: ' + context.selectionType);
      }
      if (context && Array.isArray(context.targetPaths) && context.targetPaths.length) {
        NEW_forCustomer_details.push('Targets: ' + context.targetPaths.length);
      }
      if (!NEW_forCustomer_details.length && NEW_forCustomer_parsed.toastMessage) {
        NEW_forCustomer_details.push(NEW_forCustomer_parsed.toastMessage);
      }
      if (!NEW_forCustomer_details.length && NEW_forCustomer_parsed.note) {
        NEW_forCustomer_details.push(NEW_forCustomer_parsed.note);
      }
      if (!NEW_forCustomer_details.length && NEW_forCustomer_parsed.ok) {
        NEW_forCustomer_details.push("Apply complete");
      }

      var NEW_forCustomer_message = NEW_forCustomer_label;
      if (NEW_forCustomer_details.length) {
        NEW_forCustomer_message += " – " + NEW_forCustomer_details.join(", ");
      }

      NEW_forCustomer_emitIfAvailable(NEW_forCustomer_message);
    }
  }
  return normalized.parsed || normalized.raw;
}

function logPanelEvent(title, context, data) {
  var normalized = normalizeApplyResult(data);
  var entry = formatApplyLogEntry(title, normalized, context || {});
  appendLogEntry(entry, false);
  return normalized.parsed || normalized.raw;
}





// ---------------------------------------------------------
// 🚀 MODULE EXPORT
// ---------------------------------------------------------
Holy.BUTTONS = {
  cs: cs,
  HX_LOG_MODE: HX_LOG_MODE,
  wirePanelButtons: wirePanelButtons,
  updateApplyReport: updateApplyReport,
  logPanelEvent: logPanelEvent,
  openApplyLogWindow: openApplyLogWindow
};

})();
