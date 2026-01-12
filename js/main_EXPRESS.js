if (typeof Holy !== "object") Holy = {};

(function () {
  "use strict";

  // 🔗 Shared instances
  var cs = new CSInterface();
  var HX_LOG_MODE = window.HX_LOG_MODE || "verbose";








// ============================================================
//  Expression Source Portal
// Central place to fetch the current expression text.A
// Later: can switch sources depending on active tab/mode.
// ============================================================
function PORTAL_getCurrentExpression() {
  if (window.editor && window.editor.state && window.editor.state.doc) {
    try {
      var cmText = window.editor.state.doc.toString();

      // CHECKER: treat placeholder as empty
      if (cmText === "// Type your expression here...") return "";

      if (typeof cmText === "string") {
        var trimmed = cmText.trim();
        if (trimmed.length) return trimmed;
      }
    } catch (_) {}
  }
  var exprBox = Holy.UI.DOM("#exprInput");
  return exprBox ? exprBox.value.trim() : "";
}



// V4 - CM6 editor insertion with placeholder cleanup
// V1 – EDITOR_insertText with sanitation + logging
function EDITOR_insertText(str) {
  if (!window.editor) {
    console.warn("EDITOR_insertText – window.editor is missing");
    return;
  }
  var cm = window.editor;
  try {
    var state = cm.state;
    var full = state.doc.toString();

    // CHECKER: clear placeholder if it is the only content
    if (full === "// Type your expression here...") {
      cm.dispatch({ changes: { from: 0, to: full.length, insert: "" } });
      state = cm.state; // refresh state
    }

    // 🔎 Sanitize the incoming string
    var raw = String(str || "");
    var sanitized = raw.trim();

    // Strip wrapping quotes if JSON stringified
    if ((sanitized.startsWith('"') && sanitized.endsWith('"')) ||
        (sanitized.startsWith("'") && sanitized.endsWith("'"))) {
      sanitized = sanitized.slice(1, -1);
    }

    // Collapse double-escaped quotes
    sanitized = sanitized.replace(/\\"/g, '"');

    // Log before/after
if (window.HX_LOG_MODE === "verbose") {
  console.log("EDITOR_insertText raw:", raw);
  console.log("EDITOR_insertText sanitized:", sanitized);
}

    var docLength = state.doc.length;

    // If editor is focused, insert at current selection
    var isFocused = document.activeElement && document.activeElement.closest("#codeEditor");
    var sel = state.selection && state.selection.main
      ? state.selection.main
      : { from: docLength, to: docLength };

    var from = isFocused ? sel.from : docLength;
    var to   = isFocused ? sel.to   : docLength;

    cm.dispatch({
      changes: { from: from, to: to, insert: sanitized }
    });
    if (window.HX_LOG_MODE === "verbose") {
  console.log("📺 CODEMIRROR DISPLAY", { from, to, insert: sanitized });
}

  } catch (e) {
    console.error("EDITOR_insertText failed:", e);
  }
}






// V3 - apply expression by strict search within selection scope (used by Blue when Custom Search is active)
function HE_applyByStrictSearch(expr, searchVal) {
var q = String(searchVal || "").trim();
  if (!q) { Holy.UI.toast("Enter a Custom Name to search"); return; }
  // Build and escape JSON for evalScript
var payload = JSON.stringify({
  expressionText: String(expr + ""),
  searchTerm: String(q + ""),
  strictMode: true
});

  var escaped = payload.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

Holy.UI.cs.evalScript('he_P_SC_applyExpressionBySearch("' + escaped + '")', function (report) {

    // 🌶️ V4 DEBUG: dump raw + parsed result to DevTools

    var parsed = null;
    try { parsed = JSON.parse(report || "{}"); }
    catch (e) {
      console.warn("⚠️ [STRICT RESULT PARSE ERROR]", e, report);
    }

    try {
      if (Holy && Holy.UTILS && typeof Holy.UTILS.NEW_forCustomer_emit === "function") {
        if (parsed && parsed.ok !== false) {
          var appliedCount = (typeof parsed.applied === "number") ? parsed.applied : 0;
          var skippedCount = (typeof parsed.skipped === "number") ? parsed.skipped : 0;
          var errorCount = (parsed && Array.isArray(parsed.errors)) ? parsed.errors.length : 0;
          // Regression guard: Search Captain returns skipped/errors when expressions were set but warn.
          var count = (appliedCount + skippedCount) || (errorCount || null);
          var label = "Custom Search Apply";
          if (searchVal && typeof searchVal === "string") {
            var trimmed = searchVal.trim();
            if (trimmed.length) {
              label = '"' + trimmed + '"';
            }
          }
          if (count !== null) {
            label += ": " + count + (count === 1 ? " property" : " properties");
          }
          Holy.UTILS.NEW_forCustomer_emit(label);
        }
      }
    } catch (e) {}

    // ⬇️ Existing UI/log mechanism stays, but soon we’ll improve it
    Holy.BUTTONS.updateApplyReport("Blue Apply by Custom Search", report);

    if (Holy.UI && typeof Holy.UI.toast === "function") {
      if (!parsed) {
        Holy.UI.toast("Custom search failed");
        return;
      }

      if (parsed && parsed.ok === false) {
        Holy.UI.toast(parsed.err || "Custom search failed");
        return;
      }

      var appliedCount = (parsed && typeof parsed.applied === "number") ? parsed.applied : 0;
      var skippedCount = (parsed && typeof parsed.skipped === "number") ? parsed.skipped : 0;
      var errorCount = (parsed && Array.isArray(parsed.errors)) ? parsed.errors.length : 0;
      var totalTouched = appliedCount + skippedCount;
      // Regression guard: expressionError warnings still indicate assignments happened.
      if (totalTouched > 0 || errorCount > 0) {
        var touchCount = totalTouched || errorCount;
        var toastMsg = touchCount === 1
          ? "Found and expressed, 1 instance"
          : "Found and expressed, " + touchCount + " instances";
        Holy.UI.toast(toastMsg);
        if (Holy.BUTTONS && typeof Holy.BUTTONS.setCustomSearchActive === "function") {
          Holy.BUTTONS.setCustomSearchActive(false);
        }
        return;
      }

      Holy.UI.toast("Nothing found matching the search, ensure characters match exactly");
    }
});

}







  // ------------- Presets -------------
  var PRESETS = [
    {
      id: "wiggle_auto",
      name: "Wiggle - auto dimension",
      variants: {
        OneD:   "wiggle(freq, amp)",
        TwoD:   "[wiggle(freq, amp)[0], wiggle(freq, amp)[1]]",
        ThreeD: "wiggle(freq, amp)",
        Color:  "wiggle(freq, amp)"
      },
      params: { freq: 2, amp: 20 }
    }
  ];

  function initPresets() {
    var sel = Holy.UI.DOM("#presetSelect");
    if (!sel) return;
    PRESETS.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  }

  function buildExpressionForSelection(cb) {
    Holy.UI.cs.evalScript("he_U_TS_peekSelectionType()", function (raw) {
      var r = {};
      try { r = JSON.parse(raw || "{}"); } catch (e) {}
      if (!r.ok) {
        Holy.UI.toast(r.err || "No selection");
        return;
      }
      var presetId = (Holy.UI.DOM("#presetSelect") && Holy.UI.DOM("#presetSelect").value) || PRESETS[0].id;
      var preset = PRESETS.find(function (p) { return p.id === presetId; }) || PRESETS[0];
      var vt = r.valueType || "OneD";
      var variant = preset.variants[vt] || preset.variants.OneD;
      var expr = variant
        .replace(/freq/g, String(preset.params.freq))
        .replace(/amp/g, String(preset.params.amp));
      cb(expr);
    });
  }
  
function buildExpressionForSearch(searchTerm, cb) {
  var payload = JSON.stringify({ searchTerm: searchTerm });
  var escaped = payload.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  Holy.UI.cs.evalScript('he_U_TP_peekTypeForSearch("' + escaped + '")', function (raw) {
    var r = {};
    try { r = JSON.parse(raw || "{}"); } catch (e) {}
    var presetId = (Holy.UI.DOM("#presetSelect") && Holy.UI.DOM("#presetSelect").value) || PRESETS[0].id;
    var preset   = PRESETS.find(function (p) { return p.id === presetId; }) || PRESETS[0];
    var vt       = r.valueType || "OneD";             // graceful fallback for layer-only selection
    var variant  = preset.variants[vt] || preset.variants.OneD;
    var expr = variant
      .replace(/freq/g, String(preset.params.freq))
      .replace(/amp/g,  String(preset.params.amp));
    cb(expr);
  })
}

function cy_collectExprTargets(layerInfo) {
  return new Promise(function (resolve, reject) {
    if (!layerInfo) {
      reject({ err: "No layer info", userMessage: "Layer metadata missing" });
      return;
    }

    try {
      var payload = JSON.stringify({
        layerIndex: layerInfo.index,
        layerId: layerInfo.id
      });
      var escaped = payload.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      cs.evalScript('he_EX_collectExpressionsForLayer("' + escaped + '")', function (raw) {
        var result = {};
        try {
          result = JSON.parse(raw || "{}");
        } catch (parseErr) {
          reject({ err: parseErr, userMessage: "Failed to parse layer expressions" });
          return;
        }

        if (!result || !result.ok) {
          var err = (result && result.err) ? result.err : "Expression collection failed";
          reject({ err: err, userMessage: err });
          return;
        }

        resolve(result);
      });
    } catch (err) {
      reject({ err: err, userMessage: "Expression collection failed" });
    }
  });
}

function cy_safeApplyExpressionBatch(entries, opts) {
  return new Promise(function (resolve, reject) {
    if (!entries || !entries.length) {
      resolve({ ok: true, applied: 0, errors: [] });
      return;
    }

    try {
      var payload = JSON.stringify({
        entries: entries,
        undoLabel: opts && opts.undoLabel ? opts.undoLabel : "Holy Search Replace"
      });
      var escaped = payload.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      cs.evalScript('he_EX_applyExpressionBatch("' + escaped + '")', function (raw) {
        var result = {};
        try {
          result = JSON.parse(raw || "{}");
        } catch (parseErr) {
          reject({ err: parseErr, userMessage: "Failed to parse apply result" });
          return;
        }

        if (!result || !result.ok) {
          var err = (result && result.err) ? result.err : "Expression apply failed";
          reject({ err: err, userMessage: err, details: result });
          return;
        }

        if (result && typeof result.unhidLayers === "number" && result.unhidLayers > 0) {
          console.log('[Holy.SEARCH] Temporarily unhid ' + result.unhidLayers + ' layer(s) for safe expression apply.');
        }

        resolve(result);
      });
    } catch (err) {
      reject({ err: err, userMessage: "Expression apply failed" });
    }
  });
}

function cy_deleteExpressions() {
  return new Promise(function (resolve, reject) {
    try {
      cs.evalScript('cy_deleteExpressions()', function (raw) {
        var result = {};
        try {
          result = JSON.parse(raw || "{}");
        } catch (parseErr) {
          reject({ err: parseErr, userMessage: "Failed to parse delete result" });
          return;
        }

        try {
          if (Holy && Holy.UTILS && typeof Holy.UTILS.NEW_forCustomer_emit === "function") {
            if (result && result.ok !== false) {
              var count = (typeof result.deleted === "number")
                ? result.deleted
                : (typeof result.applied === "number")
                  ? result.applied
                  : null;
              var msg = "Delete Expressions";
              if (count !== null) {
                msg += ": " + count + (count === 1 ? " expression" : " expressions");
              }
              Holy.UTILS.NEW_forCustomer_emit(msg);
            }
          }
        } catch (e) {}

        if (!result || result.ok === false) {
          var err = (result && result.err) ? result.err : "Delete expressions failed";
          reject({ err: err, userMessage: err, details: result });
          return;
        }

        resolve(result || {});
      });
    } catch (err) {
      reject({ err: err, userMessage: "Delete expressions failed" });
    }
  });
}

function cy_filterEntriesByCustomSearch(entries, searchTerm) {
  var list = Array.isArray(entries) ? entries : [];
  var tokens = String(searchTerm || "")
    .split(">")
    .map(function (t) { return t.replace(/^\s+|\s+$/g, ""); })
    .filter(function (t) { return !!t; });

  if (!tokens.length) return list.slice();

  var filtered = [];
  for (var i = 0; i < list.length; i++) {
    var entry = list[i];
    if (!entry) continue;

    var pathTokens = String(entry.path || "")
      .split(">")
      .map(function (p) { return p.replace(/^\s+|\s+$/g, ""); })
      .filter(function (p) { return !!p; });

    if (!pathTokens.length && entry.name) {
      pathTokens = [String(entry.name).replace(/^\s+|\s+$/g, "")];
    }

    if (!pathTokens.length || pathTokens.length < tokens.length) continue;

    var matches = true;
    for (var t = 0; t < tokens.length; t++) {
      var expected = tokens[tokens.length - 1 - t];
      var actual = pathTokens[pathTokens.length - 1 - t];
      if (expected !== actual) {
        matches = false;
        break;
      }
    }

    if (matches) filtered.push(entry);
  }

  return filtered;
}

function cy_replaceInExpressions(searchStr, replaceStr, options) {
  var search = (searchStr === undefined || searchStr === null) ? "" : String(searchStr);
  var replace = (replaceStr === undefined || replaceStr === null) ? "" : String(replaceStr);
  var opts = options || {};
  var matchCase = typeof opts.matchCase === "boolean" ? opts.matchCase : true;
  var customSearchTerm = (opts.customSearchTerm && String(opts.customSearchTerm).trim()) || "";
  var useCustomSearch = !!customSearchTerm;

  if (search === "") {
    return Promise.reject({ userMessage: "Enter a Search term" });
  }

  function escapeRegExp(str) {
    return str.replace(/[\\^$*+?.()|{}\[\]-]/g, "\\$&");
  }

  function categorizeApplyErrors(errors) {
    var result = { critical: [], suppressed: [] };
    if (!errors || !errors.length) return result;

    for (var i = 0; i < errors.length; i++) {
      var entry = errors[i];
      if (!entry) continue;
      var message = entry.err != null ? String(entry.err) : "";
      var lower = message.toLowerCase();
      var isBenign = false;
      if (lower.indexOf("expression disabled") !== -1) {
        isBenign = true;
      } else if (lower.indexOf("referenceerror") !== -1) {
        isBenign = true;
      }

      if (isBenign) {
        result.suppressed.push(entry);
      } else {
        result.critical.push(entry);
      }
    }

    return result;
  }

  return Holy.UTILS.cy_getSelectedLayers().then(function (layers) {
    if (!layers || !layers.length) {
      throw { userMessage: "Select at least one layer" };
    }

    var escapedSearch = escapeRegExp(search);
    var replacementValue = replace;

    var reports = [];
    var customSearchMatchedCount = 0;
    var tasks = layers.map(function (layer) {
      return cy_collectExprTargets(layer).then(function (data) {
        var entries = (data && data.entries) ? data.entries : [];
        if (useCustomSearch) {
          entries = cy_filterEntriesByCustomSearch(entries, customSearchTerm);
          customSearchMatchedCount += entries.length;
        }
        var updates = [];
        var replacements = 0;
        var patternFlags = matchCase ? "g" : "gi";

        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (!entry || !entry.expression || !entry.path) continue;
          var expr = String(entry.expression);
          var pattern = new RegExp(escapedSearch, patternFlags);
          var localCount = 0;
          var replacedExpr = expr.replace(pattern, function () {
            localCount++;
            return replacementValue;
          });

          if (!localCount || replacedExpr === expr) continue;

          replacements += localCount;
          updates.push({
            path: entry.path,
            expression: replacedExpr,
            expressionEnabled: entry.expressionEnabled,
            layerName: layer.name,
            propertyName: entry.name
          });
        }

        var layerMsg = '[Holy.SEARCH] Layer "' + layer.name + '" – ' + replacements + ' replacement(s).';
        console.log(layerMsg);

        reports.push({
          layer: layer,
          updates: updates,
          replacements: replacements,
          message: layerMsg
        });
      }).catch(function (err) {
        console.error('[Holy.SEARCH] Failed to scan layer', layer && layer.name, err);
        reports.push({ layer: layer, updates: [], replacements: 0, error: err });
      });
    });

    return Promise.all(tasks).then(function () {
      var batch = [];
      var totalReplacements = 0;
      var affectedLayers = 0;

      for (var r = 0; r < reports.length; r++) {
        var rep = reports[r];
        if (rep && rep.updates && rep.updates.length) {
          affectedLayers++;
          totalReplacements += rep.replacements;
          for (var u = 0; u < rep.updates.length; u++) {
            batch.push(rep.updates[u]);
          }
        }
      }

      if (!batch.length) {
        if (useCustomSearch && customSearchMatchedCount === 0) {
          throw { userMessage: "No matching properties found for Custom Search filter" };
        }

        var noneMsg = '[Holy.SEARCH] No matches for "' + search + '" across ' + layers.length + ' layer(s).';
        if (useCustomSearch && customSearchMatchedCount > 0) {
          noneMsg = 'No replacements found in filtered properties';
        }
        console.log(noneMsg);
        return {
          ok: true,
          replacements: 0,
          layersChanged: 0,
          layersCount: layers.length,
          message: noneMsg,
          customSearchUsed: useCustomSearch,
          customSearchMatches: customSearchMatchedCount
        };
      }

      return cy_safeApplyExpressionBatch(batch, { undoLabel: 'Holy Search Replace' }).then(function (applyReport) {
        var msg = '[Holy.SEARCH] ' + totalReplacements + ' replacements made across ' + affectedLayers + ' layer(s).';
        msg += ' (matchCase=' + matchCase + ')';
        console.log(msg);
        var categorizedErrors = categorizeApplyErrors(applyReport && applyReport.errors);
        if (categorizedErrors.critical.length) {
          console.warn('[Holy.SEARCH] Apply errors', categorizedErrors.critical);
        } else if (window.HX_LOG_MODE === "verbose" && categorizedErrors.suppressed.length) {
          console.debug('[Holy.SEARCH] Suppressed expression warnings', categorizedErrors.suppressed);
        }
        return {
          ok: true,
          replacements: totalReplacements,
          layersChanged: affectedLayers,
          layersCount: layers.length,
          message: msg,
          applyReport: applyReport,
          suppressedExpressionWarnings: categorizedErrors.suppressed,
          customSearchUsed: useCustomSearch,
          customSearchMatches: customSearchMatchedCount
        };
      });
    });
  });
}





function broadcastEditorText() {
  if (!window.editor) return;
  const cs = new CSInterface();
  const evt = new CSEvent("com.holy.expressor.editor.sync", "APPLICATION");
  evt.data = JSON.stringify({ text: window.editor.state.doc.toString() });
  cs.dispatchEvent(evt);
  console.log("[Holy.EXPRESS] Sent live editor sync");
}

(function attachEditorSyncListener() {
  const cs = new CSInterface();
  cs.addEventListener("com.holy.expressor.editor.sync", function (evt) {
    try {
      const data = JSON.parse(evt.data);
      if (data.text && window.editor) {
        const current = window.editor.state.doc.toString();
        if (current !== data.text) {
          window.editor.dispatch({
            changes: { from: 0, to: current.length, insert: data.text }
          });
          console.log("[Holy.EXPRESS] Updated editor via sync");
        }
      }
    } catch (err) {
      console.warn("[Holy.EXPRESS] Failed to parse sync data", err);
    }
  });
})();







// ---------------------------------------------------------
// 🚀 MODULE EXPORT
// ---------------------------------------------------------
Holy.EXPRESS = {
  cs: cs,
  HX_LOG_MODE: HX_LOG_MODE,
  PORTAL_getCurrentExpression: PORTAL_getCurrentExpression,
  EDITOR_insertText: EDITOR_insertText,
  HE_applyByStrictSearch: HE_applyByStrictSearch,
  buildExpressionForSelection: buildExpressionForSelection,
  buildExpressionForSearch: buildExpressionForSearch,
  initPresets: initPresets,
  cy_collectExprTargets: cy_collectExprTargets,
  cy_safeApplyExpression: cy_safeApplyExpressionBatch,
  cy_replaceInExpressions: cy_replaceInExpressions,
  cy_deleteExpressions: cy_deleteExpressions,
  cy_filterEntriesByCustomSearch: cy_filterEntriesByCustomSearch
};
})();
