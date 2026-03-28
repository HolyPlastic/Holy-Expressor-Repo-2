// host_AGENT_API.jsx — Holy Agent Public API Surface
// ============================================================
// Exposes holyAPI_* functions for use by Holy Agent via the
// shared ExtendScript runtime (no gateway infrastructure needed).
//
// ⚠️  LOAD ORDER: Must be last in the JSX chain (after host.jsx)
//     so all Expressor functions are already defined when this loads.
//
// ⚠️  DO NOT call these from within Expressor's own code.
//     These are agent-facing only. Expressor has no knowledge of
//     Holy Agent — the dependency is one-way (Agent → Expressor).
//
// Holy Agent checks `typeof holyAPI_*` before calling and falls
// back to its own host.jsx implementations when Expressor is closed.
// ============================================================


// ============================================================
// holyAPI_getBanks — return all banks with fill state
// Input JSON:  { banksPath: string }  (banksPath optional — defaults to
//              ExtendScript Folder.userData/HolyExpressor path)
//
// Returns:     { ok, banks: [{id, name, filled, total}], activeBankId }
// ============================================================
function holyAPI_getBanks(jsonStr) {
  try {
    var data = JSON.parse(jsonStr || "{}");
    var banksPath = data.banksPath || "";

    if (!banksPath) {
      // Default to ExtendScript's own user data path
      banksPath = Folder.userData.fullName + "/HolyExpressor/banks.json";
    }

    var f = new File(banksPath);

    if (!f.exists) {
      return JSON.stringify({ ok: false, err: "banks.json not found. Open Holy Expressor first to initialise it." });
    }

    if (!f.open("r")) {
      return JSON.stringify({ ok: false, err: "Cannot read banks.json" });
    }

    var raw = f.read();
    f.close();

    var parsed = JSON.parse(raw || "{}");
    if (!parsed || !(parsed.banks instanceof Array)) {
      return JSON.stringify({ ok: false, err: "Invalid banks.json structure" });
    }

    var result = [];
    for (var i = 0; i < parsed.banks.length; i++) {
      var bank = parsed.banks[i];
      if (!bank) continue;
      var filled = 0;
      var snippets = bank.snippets || [];
      for (var s = 0; s < snippets.length; s++) {
        if (snippets[s] && snippets[s].expr && snippets[s].expr !== "") filled++;
      }
      result.push({ id: bank.id, name: bank.name, filled: filled, total: snippets.length });
    }

    return JSON.stringify({ ok: true, banks: result, activeBankId: parsed.activeBankId || null });

  } catch (e) {
    return JSON.stringify({ ok: false, err: "holyAPI_getBanks error: " + String(e) });
  }
}


// ============================================================
// holyAPI_saveSnippet — save expression to a bank slot
//
// Input JSON: { expr, name, bankId, banksPath }
//   expr:      expression string (required)
//   name:      snippet display name (required)
//   bankId:    target bank id; null/omit = use activeBankId
//   banksPath: resolved in calling panel JS via SystemPath.USER_DATA
//
// Returns manifest shape (+ compat fields for Holy Agent):
//   { attempted, succeeded, failed: [{name, reason}], warnings,
//     ok, bankName, snippetName, bankId }
//
// SNIPPETS_PER_BANK (3) must match the constant in main_SNIPPETS.js.
// holyAPI_saveSnippet dispatches com.holy.agent.banksUpdated internally
// after a successful write, so Expressor's listener in main_SNIPPETS.js
// reloads from disk and re-renders the snippet UI automatically.
// ============================================================
function holyAPI_saveSnippet(jsonStr) {
  var SNIPPETS_PER_BANK = 3; // must match Holy.SNIPPETS.SNIPPETS_PER_BANK in main_SNIPPETS.js

  var snippetName = "Expression"; // used in error returns before data parse

  try {
    var data = JSON.parse(jsonStr || "{}");
    var expr = data.expr || "";
    snippetName = data.name || "Expression";
    var bankId = (data.bankId !== undefined && data.bankId !== null) ? data.bankId : null;
    var banksPath = data.banksPath || "";

    if (!banksPath) {
      return JSON.stringify({ attempted: 1, succeeded: 0, failed: [{ name: snippetName, reason: "banksPath required" }], warnings: [], ok: false, err: "banksPath required" });
    }
    if (!expr) {
      return JSON.stringify({ attempted: 1, succeeded: 0, failed: [{ name: snippetName, reason: "expr required" }], warnings: [], ok: false, err: "expr required" });
    }

    var f = new File(banksPath);

    if (!f.exists) {
      return JSON.stringify({ attempted: 1, succeeded: 0, failed: [{ name: snippetName, reason: "banks.json not found — open Holy Expressor first" }], warnings: [], ok: false, err: "banks.json not found. Open Holy Expressor first to initialise it." });
    }

    if (!f.open("r")) {
      return JSON.stringify({ attempted: 1, succeeded: 0, failed: [{ name: snippetName, reason: "Cannot read banks.json" }], warnings: [], ok: false, err: "Cannot read banks.json" });
    }

    var raw = f.read();
    f.close();

    var payload = JSON.parse(raw || "{}");
    if (!payload || !(payload.banks instanceof Array)) {
      return JSON.stringify({ attempted: 1, succeeded: 0, failed: [{ name: snippetName, reason: "Invalid banks.json structure" }], warnings: [], ok: false, err: "Invalid banks.json structure" });
    }

    // Resolve target bank
    var targetId = (bankId !== null) ? bankId : payload.activeBankId;
    var targetBank = null;

    for (var b = 0; b < payload.banks.length; b++) {
      // Loose compare — IDs may be number or string
      if (payload.banks[b] && String(payload.banks[b].id) === String(targetId)) {
        targetBank = payload.banks[b];
        break;
      }
    }

    if (!targetBank && payload.banks.length) {
      // Fallback to first bank
      targetBank = payload.banks[0];
    }

    if (!targetBank) {
      return JSON.stringify({ attempted: 1, succeeded: 0, failed: [{ name: snippetName, reason: "No bank found" }], warnings: [], ok: false, err: "No bank found" });
    }

    if (!(targetBank.snippets instanceof Array)) targetBank.snippets = [];

    // Find first empty slot (name === "" && expr === "")
    var emptySlot = null;
    for (var s = 0; s < targetBank.snippets.length; s++) {
      var snip = targetBank.snippets[s];
      if (snip && (snip.expr === "" || snip.expr == null) && (snip.name === "" || snip.name == null)) {
        emptySlot = snip;
        break;
      }
    }

    var warnings = [];

    if (!emptySlot) {
      if (targetBank.snippets.length >= SNIPPETS_PER_BANK) {
        var bankFullMsg = "Bank \"" + targetBank.name + "\" is full (" + SNIPPETS_PER_BANK + "/" + SNIPPETS_PER_BANK + "). Create a new bank in Holy Expressor first.";
        return JSON.stringify({ attempted: 1, succeeded: 0, failed: [{ name: snippetName, reason: "Bank full" }], warnings: [], ok: false, err: bankFullMsg, bankName: targetBank.name });
      }
      // Slot doesn't exist yet — push a new one (shouldn't normally happen with normalised banks)
      var newSlot = { id: "", name: "", expr: "", controls: {} };
      targetBank.snippets.push(newSlot);
      emptySlot = newSlot;
      warnings.push("Slot was missing from bank — created dynamically");
    }

    // Generate unique ID  (timestamp + random, matches main_SNIPPETS generateSnippetId format)
    var newId = "snip-" + new Date().getTime().toString(36) + "-" + Math.round(Math.random() * 1000000).toString(36);

    emptySlot.id = newId;
    emptySlot.name = snippetName;
    emptySlot.expr = expr;
    emptySlot.controls = {};

    // Write back
    var out = new File(banksPath);
    if (!out.open("w")) {
      return JSON.stringify({ attempted: 1, succeeded: 0, failed: [{ name: snippetName, reason: "Cannot write banks.json" }], warnings: warnings, ok: false, err: "Cannot write banks.json" });
    }
    out.write(JSON.stringify(payload));
    out.close();

    // Dispatch banksUpdated so Expressor's own UI refreshes automatically
    try {
      var refreshEvt = new CSXSEvent();
      refreshEvt.type = "com.holy.agent.banksUpdated";
      refreshEvt.dispatch();
    } catch (_) {}

    return JSON.stringify({
      attempted: 1,
      succeeded: 1,
      failed: [],
      warnings: warnings,
      // compat fields for Holy Agent's existing saveToBank handler
      ok: true,
      bankName: targetBank.name,
      snippetName: snippetName,
      bankId: targetBank.id
    });

  } catch (e) {
    return JSON.stringify({
      attempted: 1,
      succeeded: 0,
      failed: [{ name: snippetName, reason: "holyAPI_saveSnippet error: " + String(e) }],
      warnings: [],
      ok: false,
      err: "holyAPI_saveSnippet error: " + String(e)
    });
  }
}


// ============================================================
// holyAPI_applyToTarget — apply expression to layers matched by
// name and/or type, on a named property.
//
// Input JSON: {
//   expr:         string   — expression to apply
//   layerNames:   string[] — partial name matches, case-insensitive. [] = no filter.
//   layerTypes:   string[] — "text"|"shape"|"solid"|"null"|"camera"|"light". [] = any.
//   propertyName: string   — display name of target property (e.g. "Position", "Opacity")
// }
//
// Returns manifest shape (+ compat field for Holy Agent):
//   { attempted, succeeded, failed: [{name, reason}], warnings, ok, applied }
//
// Uses Expressor's battle-tested layer filter helpers where available:
//   he_U_Ls_1_isLayerStyleProp, he_U_Ls_2_styleEnabledForLeaf (from host_APPLY.jsx)
// Guarded with typeof checks for safety.
// ============================================================
function holyAPI_applyToTarget(jsonStr) {
  var attempted = 0;
  var succeeded = 0;
  var failed = [];
  var warnings = [];
  var undoOpen = false;

  try {
    var data = JSON.parse(jsonStr || "{}");
    var expr = data.expr || "";
    var layerNames = data.layerNames || [];
    var layerTypes = data.layerTypes || [];
    var propertyName = data.propertyName || "";

    if (!expr) {
      warnings.push("No expression provided");
      return JSON.stringify({ attempted: 0, succeeded: 0, failed: [], warnings: warnings, ok: false, err: "No expression provided" });
    }
    if (!propertyName) {
      warnings.push("No propertyName specified");
      return JSON.stringify({ attempted: 0, succeeded: 0, failed: [], warnings: warnings, ok: false, err: "No property name provided" });
    }

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ attempted: 0, succeeded: 0, failed: [], warnings: ["No active comp"], ok: false, err: "No active comp" });
    }

    // ----------------------------------------------------------
    // Type matching (mirrors holyAgent_applyToTarget in Holy Agent)
    // Uses source.color check from Session 3 solid-type fix
    // ----------------------------------------------------------
    var layerMatchesType = function(layer, types) {
      for (var ti = 0; ti < types.length; ti++) {
        var t = String(types[ti] || "").toLowerCase();
        if (t === "any") return true;
        try { if (t === "text"   && layer instanceof TextLayer)   return true; } catch(_) {}
        try { if (t === "shape"  && layer instanceof ShapeLayer)  return true; } catch(_) {}
        try { if (t === "camera" && layer instanceof CameraLayer) return true; } catch(_) {}
        try { if (t === "light"  && layer instanceof LightLayer)  return true; } catch(_) {}
        try { if (t === "null"   && layer.nullLayer === true)      return true; } catch(_) {}
        try {
          if (t === "solid" && layer.source && layer.source.mainSource && typeof layer.source.mainSource.color !== "undefined" && layer.adjustmentLayer !== true) return true;
        } catch(_) {}
      }
      return false;
    };

    // DEBUG: collect per-layer diagnostics for DevTools
    var debugInfo = [];
    for (var di = 1; di <= comp.numLayers; di++) {
      var dbgL = null;
      try { dbgL = comp.layer(di); } catch(_) {}
      if (!dbgL) continue;
      var dbgSrc = null;
      var dbgSrcColor = "null";
      try { dbgSrc = dbgL.source; } catch(_) {}
      if (dbgSrc) {
        try { dbgSrcColor = String(dbgSrc.mainSource ? dbgSrc.mainSource.color : dbgSrc.color); } catch(_) {}
      }
      var dbgAdj = false;
      try { dbgAdj = !!dbgL.adjustmentLayer; } catch(_) {}
      var dbgNull = false;
      try { dbgNull = !!dbgL.nullLayer; } catch(_) {}
      var dbgMatch = false;
      try { dbgMatch = layerMatchesType(dbgL, layerTypes); } catch(_) {}
      debugInfo.push({
        i: di,
        name: String(dbgL.name || ""),
        "null": dbgNull,
        adj: dbgAdj,
        srcColor: dbgSrcColor,
        solidMatch: dbgMatch
      });
    }

    // ----------------------------------------------------------
    // Property search — recursive depth-first, display name match
    // Skips Layer Style props that aren't enabled (uses Expressor
    // helpers when available, otherwise silently allows).
    // ----------------------------------------------------------
    var propNameLower = String(propertyName).toLowerCase();

    var findAndApply = function(group, layerName) {
      for (var pi = 1; pi <= group.numProperties; pi++) {
        var p = null;
        try { p = group.property(pi); } catch(_) { continue; }
        if (!p) continue;

        var pType = 0;
        try { pType = p.propertyType; } catch(_) {}

        if (pType === PropertyType.PROPERTY) {
          var pName = "";
          var pMatch = "";
          try { pName = String(p.name || "").toLowerCase(); } catch(_) {}
          try { pMatch = String(p.matchName || "").toLowerCase(); } catch(_) {}

          var nameHit = (pName === propNameLower || pMatch === propNameLower || pName.indexOf(propNameLower) >= 0);
          if (!nameHit) continue;

          // Skip disabled layer style leaves (Expressor helper guard)
          try {
            if (typeof he_U_Ls_1_isLayerStyleProp === "function" && he_U_Ls_1_isLayerStyleProp(p)) {
              if (typeof he_U_Ls_2_styleEnabledForLeaf === "function" && !he_U_Ls_2_styleEnabledForLeaf(p)) continue;
            }
          } catch(_) {}

          var canSet = false;
          try { canSet = p.canSetExpression; } catch(_) {}
          if (!canSet) continue;

          attempted++;
          try {
            p.expression = expr;
            if (p.expressionError && p.expressionError.length) {
              failed.push({ name: layerName + " > " + (p.name || "?"), reason: p.expressionError });
            } else {
              succeeded++;
            }
          } catch (ex) {
            failed.push({ name: layerName + " > " + (p.name || "?"), reason: String(ex) });
          }

        } else if (pType === PropertyType.INDEXED_GROUP || pType === PropertyType.NAMED_GROUP) {
          findAndApply(p, layerName);
        }
      }
    };

    // ----------------------------------------------------------
    // Build target layer list
    // ----------------------------------------------------------
    var targetLayers = [];
    var hasNameFilter = (layerNames.length > 0);
    var hasTypeFilter = (layerTypes.length > 0);

    for (var li = 1; li <= comp.numLayers; li++) {
      var layer = null;
      try { layer = comp.layer(li); } catch(_) { continue; }
      if (!layer) continue;

      var nameOk = !hasNameFilter;
      if (!nameOk) {
        var lNameLower = String(layer.name || "").toLowerCase();
        for (var ni = 0; ni < layerNames.length && !nameOk; ni++) {
          if (lNameLower.indexOf(String(layerNames[ni] || "").toLowerCase()) >= 0) nameOk = true;
        }
      }

      var typeOk = !hasTypeFilter || layerMatchesType(layer, layerTypes);

      if (nameOk && typeOk) targetLayers.push(layer);
    }

    if (targetLayers.length === 0) {
      var noMatchReason = "No matching layers found";
      if (hasNameFilter) noMatchReason += " (name: \"" + layerNames.join("\", \"") + "\")";
      if (hasTypeFilter) noMatchReason += " (type: " + layerTypes.join(", ") + ")";
      return JSON.stringify({ attempted: 0, succeeded: 0, failed: [], warnings: [noMatchReason], ok: false, err: noMatchReason, debugInfo: debugInfo });
    }

    app.beginUndoGroup("HolyAgent Apply To Target");
    undoOpen = true;

    for (var idx = 0; idx < targetLayers.length; idx++) {
      var tl = targetLayers[idx];
      var tlName = "";
      try { tlName = String(tl.name || ""); } catch(_) {}

      // Temporarily enable disabled layers (mirrors host_APPLY.jsx pattern)
      var wasEnabled = true;
      try { wasEnabled = !!tl.enabled; tl.enabled = true; } catch(_) {}

      findAndApply(tl, tlName);

      try { tl.enabled = wasEnabled; } catch(_) {}
    }

    app.endUndoGroup();
    undoOpen = false;

    var matchedNames = [];
    for (var mi = 0; mi < targetLayers.length; mi++) {
      try { matchedNames.push(String(targetLayers[mi].name || "")); } catch(_) {}
    }

    return JSON.stringify({
      attempted: attempted,
      succeeded: succeeded,
      failed: failed,
      warnings: warnings,
      debugInfo: debugInfo,
      matchedLayers: matchedNames,
      ok: (attempted === 0 || succeeded > 0 || failed.length < attempted),
      applied: succeeded
    });

  } catch (e) {
    return JSON.stringify({
      attempted: attempted,
      succeeded: succeeded,
      failed: failed,
      warnings: ["holyAPI_applyToTarget error: " + String(e)],
      ok: false,
      err: "holyAPI_applyToTarget error: " + String(e),
      applied: succeeded,
      debugInfo: debugInfo
    });
  } finally {
    if (undoOpen) {
      try { app.endUndoGroup(); } catch(_) {}
    }
  }
}


// ============================================================
// Load confirmation
// ============================================================
try {
  var HH_api_evt = new CSXSEvent();
  HH_api_evt.type = "com.holyexpressor.debug";
  HH_api_evt.data = "✅ host_AGENT_API.jsx Loaded — holyAPI_getBanks, holyAPI_saveSnippet, holyAPI_applyToTarget ready";
  HH_api_evt.dispatch();
} catch (e) {}
