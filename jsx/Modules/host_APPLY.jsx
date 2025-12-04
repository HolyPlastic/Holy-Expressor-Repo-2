
function he_P_EX_findPropertiesByPath(comp, pathString) {
  return he_U_EX_findPropertiesByPath(comp, pathString);
}

function he_P_EX_findPropertyByPath(comp, pathString) {
  var matches = he_U_EX_findPropertiesByPath(comp, pathString);
  return matches.length ? matches[0] : null;
}


// TYPE PEEKER: Peek the type of the first selected animatable property
function he_U_TP_peekTypeForSearch(jsonStr) {
  try {
    var data = JSON.parse(jsonStr || "{}");
    var search = data.searchTerm || "";
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return JSON.stringify({ ok:false, err:"No active comp" });
    if (!search) return JSON.stringify({ ok:false, err:"No search term" });

    // Build layer scope from selection: selectedLayers OR the layer(s) of selected props/groups
    var layers = [];
    function pushUniqueLayer(l) {
      for (var k = 0; k < layers.length; k++) if (layers[k] === l) return;
      layers.push(l);
    }

    if (comp.selectedLayers && comp.selectedLayers.length) {
      for (var i = 0; i < comp.selectedLayers.length; i++) pushUniqueLayer(comp.selectedLayers[i]);
    } else if (comp.selectedProperties && comp.selectedProperties.length) {
      for (var j = 0; j < comp.selectedProperties.length; j++) {
        var p = comp.selectedProperties[j];
        if (!p) continue;
        var layer = p.propertyGroup(p.propertyDepth); // containing layer
        if (layer) pushUniqueLayer(layer);
      }
    } else {
      return JSON.stringify({ ok:false, err:"Select a layer or property" });
    }

    function findMatchIn(group) {
      for (var x = 1; x <= group.numProperties; x++) {
        var pr = group.property(x);
        if (!pr) continue;
        if (pr.propertyType === PropertyType.PROPERTY && pr.canSetExpression) {
          if (pr.name === search || pr.matchName === search) return pr;
        } else if (pr.propertyType === PropertyType.INDEXED_GROUP || pr.propertyType === PropertyType.NAMED_GROUP) {
          var hit = findMatchIn(pr); if (hit) return hit;
        }
      }
      return null;
    }

    for (var li = 0; li < layers.length; li++) {
      var found = findMatchIn(layers[li]);
      if (found) return JSON.stringify({ ok:true, valueType: he_P_TR_valueTypeOf(found) });
    }
    return JSON.stringify({ ok:false, err:"No matching property in selection scope" });
  } catch (e) {
    return JSON.stringify({ ok:false, err:"TypePeeker error: " + String(e) });
  }
}

// TYPE SELECTION: Peek the type of the first selected animatable property (for Blue Apply)
function he_U_TS_peekSelectionType() {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok:false, err:"No active comp" });
    }
    var sel = comp.selectedProperties;
    if (!sel || !sel.length) {
      return JSON.stringify({ ok:false, err:"Select a property (not just a layer)" });
    }

    // Direct property case
    for (var i = 0; i < sel.length; i++) {
      var p = sel[i];
      if (!p) continue;
      if (p.propertyType === PropertyType.PROPERTY && p.canSetExpression) {
        return JSON.stringify({ ok:true, valueType: he_P_TR_valueTypeOf(p) });
      }
    }

    // Group case: find first animatable child
    function firstAnimatableIn(group) {
      for (var j = 1; j <= group.numProperties; j++) {
        var c = group.property(j);
        if (!c) continue;
        if (c.propertyType === PropertyType.PROPERTY && c.canSetExpression) return c;
        if (c.propertyType === PropertyType.INDEXED_GROUP || c.propertyType === PropertyType.NAMED_GROUP) {
          var hit = firstAnimatableIn(c);
          if (hit) return hit;
        }
      }
      return null;
    }

    for (var i2 = 0; i2 < sel.length; i2++) {
      var g = sel[i2];
      if (!g) continue;
      if (g.propertyType === PropertyType.INDEXED_GROUP || g.propertyType === PropertyType.NAMED_GROUP) {
        var found = firstAnimatableIn(g);
        if (found) return JSON.stringify({ ok:true, valueType: he_P_TR_valueTypeOf(found) });
      }
    }

    return JSON.stringify({ ok:false, err:"No animatable properties in selection" });
  } catch (e) {
    return JSON.stringify({ ok:false, err:"TypeSelection error: " + String(e) });
  }
}




// SELECTION STRIKER: Apply expression to the current selection
function he_S_SS_applyExpressionToSelection(jsonStr) {
  try {
    var data = JSON.parse(jsonStr || "{}");
    var expr = data.expressionText || "";

    var a = app.project.activeItem;
    if (!a || !(a instanceof CompItem)) {
      return JSON.stringify({ ok:false, err:"No active comp" });
    }

    var sel = a.selectedProperties;
    if (!sel || sel.length === 0) {
      return JSON.stringify({ ok:false, err:"No properties selected" });
    }

    app.beginUndoGroup("HolyExpressor Apply");

    var applied = 0, skipped = 0, errors = [];
    var visited = {}; // track already-processed properties

    function applyToProperty(prop) {
      var path = he_P_MM_getExprPath(prop);
      if (visited[path]) return; // skip duplicates
      visited[path] = true;
      // Silent ignore for LS styles that aren't enabled
      if (he_U_Ls_1_isLayerStyleProp(prop) && !he_U_Ls_2_styleEnabledForLeaf(prop)) {
        return; // do not count as skipped, do not report
      }
      if (!prop.canSetExpression) {
        skipped++;
        errors.push({ path: path, err: "Property does not support expressions" });
        return;
      }
      try {
        prop.expression = expr;
        if (prop.expressionError && prop.expressionError.length) {
          errors.push({ path: path, err: prop.expressionError });
        } else {
          applied++;
        }
      } catch (ex) {
        errors.push({ path: path, err: String(ex) });
      }
    }

    function recurseGroup(g, onlySelected) {
      for (var i = 1; i <= g.numProperties; i++) {
        var child = g.property(i);
        if (!child) continue;

        if (child.propertyType === PropertyType.INDEXED_GROUP || child.propertyType === PropertyType.NAMED_GROUP) {
          // Always recurse deeper into groups
          recurseGroup(child, onlySelected);
        } else if (child.canSetExpression) {
          if (!onlySelected || child.selected) {
            applyToProperty(child);
          }
        }
      }
    }

    for (var i = 0; i < sel.length; i++) {
      var p = sel[i];
      if (!p) continue;

      if (p.propertyType === PropertyType.INDEXED_GROUP || p.propertyType === PropertyType.NAMED_GROUP) {
        recurseGroup(p, true); // only apply inside the selected group
      } else if (p.canSetExpression) {
        applyToProperty(p);
      }
    }

    app.endUndoGroup();
    return JSON.stringify({ ok:true, applied: applied, skipped: skipped, errors: errors });
  } catch (e) {
    return JSON.stringify({ ok:false, err:"SelectionStriker error: " + String(e) });
  }
}





// LIST STRIKER: Apply expression to properties listed in the Target box
function he_S_LS_applyExpressionToTargetList(jsonStr) {
  try {
    he_U_L_log("ENTER he_applyExpressionToTargetList");
    var data   = JSON.parse(jsonStr || "{}");
    var expr   = data.expressionText || "";
    var paths  = data.targetPaths || [];

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok:false, err:"No active comp" });
    }
    if (!paths.length) {
      return JSON.stringify({ ok:false, err:"No target paths" });
    }

    app.beginUndoGroup("HolyExpressor Apply To Target");

    var applied = 0, skipped = 0, errors = [];

    for (var i = 0; i < paths.length; i++) {
      var pathString = paths[i];
      he_U_L_log("Target path: " + pathString);

      var props = he_P_EX_findPropertiesByPath(comp, pathString) || [];
      if (!props.length) {
        skipped++;
        errors.push({ path: pathString, err: "No exact path match" });
        continue;
      }

      for (var pi = 0; pi < props.length; pi++) {
        var prop = props[pi];
        if (!prop) continue;

        // Silent ignore for LS styles that aren't enabled
        if (he_U_Ls_1_isLayerStyleProp(prop) && !he_U_Ls_2_styleEnabledForLeaf(prop)) {
          continue; // not counted as skipped, not reported
        }

        if (!prop.canSetExpression
            || !prop.enabled
            || !prop.active
            || he_U_PB_isPhantomLayerStyleProp(prop)
            || he_U_VS_isTrulyHidden(prop)) {
          skipped++;
          var invalidPath = "";
          try { invalidPath = he_P_MM_getExprPath(prop); } catch (_) { invalidPath = pathString; }
          errors.push({
            path: invalidPath || pathString,
            err: "Property not valid (hidden/inactive/phantom LayerStyle / parent disabled)"
          });
          continue;
        }

        try {
          prop.expression = expr;
          if (prop.expressionError && prop.expressionError.length) {
            var errPath = "";
            try { errPath = he_P_MM_getExprPath(prop); } catch (_) { errPath = pathString; }
            errors.push({ path: errPath || pathString, err: prop.expressionError });
          } else {
            applied++;
          }
        } catch (ex) {
          var catchPath = "";
          try { catchPath = he_P_MM_getExprPath(prop); } catch (_) { catchPath = pathString; }
          errors.push({ path: catchPath || pathString, err: String(ex) });
        }
      }
    }

    app.endUndoGroup();
    return JSON.stringify({ ok:true, applied: applied, skipped: skipped, errors: errors });

  } catch (e) {
    return JSON.stringify({ ok:false, err:"ListStriker error: " + String(e) });
  }
}


// TOKEN STRIKER: one-token fallback (used by Search Captain when tokens.length===1)
function he_S_TS_collectAndApply(group, token, expr, state) {
  for (var j = 1; j <= group.numProperties; j++) {
    var pr = group.property(j);
    if (!pr) continue;

    if (pr.propertyType === PropertyType.PROPERTY && pr.canSetExpression) {
      if (pr.name === token || pr.matchName === token) {
        //  filter before apply to avoid hidden Layer Style noise on one-token searches
        // Silent ignore for LS styles that aren't enabled
        if (he_U_Ls_1_isLayerStyleProp(pr) && !he_U_Ls_2_styleEnabledForLeaf(pr)) { continue; }
        if (!pr.canSetExpression
            || !pr.enabled
            || !pr.active
            || he_U_PB_isPhantomLayerStyleProp(pr)
            || he_U_VS_isTrulyHidden(pr)) {
          state.skipped++;
          state.errors.push({ path: he_P_MM_getExprPath(pr), err:"Property not valid (hidden/inactive/phantom LayerStyle / parent disabled)" });
        } else {
          try {
            pr.expression = expr;
            state.applied++;
          } catch (e) {
            state.errors.push({ path: he_P_MM_getExprPath(pr), err:String(e) });
            state.skipped++;
          }
        }
      }
    } else if (pr.propertyType === PropertyType.INDEXED_GROUP || pr.propertyType === PropertyType.NAMED_GROUP) {
      // recurse into sub-groups using Token Striker itself
      he_S_TS_collectAndApply(pr, token, expr, state);
    }
  }
}





// SEARCH CAPTAIN: Apply expression by scanning for a property name/matchName across layers (with token support)
function he_P_SC_applyExpressionBySearch(jsonStr) {
  try {
    var data = JSON.parse(jsonStr || "{}");
    var expr   = data.expressionText || "";
    var search = data.searchTerm || "";
    var strict = !!data.strictMode; //  strict flag support for search captain

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return JSON.stringify({ ok:false, err:"No active comp" });
    if (!search) return JSON.stringify({ ok:false, err:"No search term" });

    // Build clean token list (ignore empty parts)
    var rawTokens = search.split(">"), tokens = [];
    for (var ti=0; ti<rawTokens.length; ti++) {
      var t = rawTokens[ti].trim();
      if (t.length) tokens.push(t);
    }

    // Gather layer scope
    var scopeLayers = [];
    function pushUniqueLayer(l){for(var k=0;k<scopeLayers.length;k++)if(scopeLayers[k]===l)return;scopeLayers.push(l);}    
    if (comp.selectedLayers && comp.selectedLayers.length){
      for (var i=0;i<comp.selectedLayers.length;i++) pushUniqueLayer(comp.selectedLayers[i]);
    } else if (comp.selectedProperties && comp.selectedProperties.length){
      for (var j=0;j<comp.selectedProperties.length;j++){
        var sp = comp.selectedProperties[j];
        if (!sp) continue;
        var owner = sp.propertyGroup(sp.propertyDepth);
        if (owner) pushUniqueLayer(owner);
      }
    } else {
      return JSON.stringify({ ok:false, err:"Select a layer or property to scope search" });
    }

    app.beginUndoGroup("HolyExpressor Apply By Search (Tokens)");
    he_U_L_log("tokens: " + tokens.join(", "));

    var state = { applied:0, skipped:0, errors:[] };
    for (var li=0; li<scopeLayers.length; li++){
      var layer = scopeLayers[li];
      if (tokens.length > 1){
        var props = [];
        he_P_GS3_findPropsByTokenPath(layer, tokens, 0, props);
        for (var pi=0; pi<props.length; pi++){
          var pr = props[pi];
          if (!pr) continue;

          var matchExact = (pr.name === tokens[tokens.length-1] || pr.matchName === tokens[tokens.length-1]);
          var matchLoose = (pr.name.toLowerCase().indexOf(tokens[tokens.length-1].toLowerCase()) >= 0);

          if ((strict && !matchExact) || (!strict && !(matchExact || matchLoose))) continue;

          if (he_U_Ls_1_isLayerStyleProp(pr) && !he_U_Ls_2_styleEnabledForLeaf(pr)) { continue; }
          if (!pr.canSetExpression || !pr.enabled || !pr.active || he_U_PB_isPhantomLayerStyleProp(pr) || he_U_VS_isTrulyHidden(pr)) {
            state.skipped++;
            state.errors.push({ path: he_P_MM_getExprPath(pr), err:"Property not valid (hidden/inactive/phantom LayerStyle / parent disabled)" });
            continue;
          }

          try {
            pr.expression = expr;
            state.applied++;
          } catch(e) {
            state.errors.push({ path: he_P_MM_getExprPath(pr), err:String(e) });
            state.skipped++;
          }
        }
      } else {
        he_S_TS_collectAndApply(layer, tokens[0], expr, state);
      }
    }
    app.endUndoGroup();

    if (state.applied===0 && state.errors.length===0){
      return JSON.stringify({ ok:true, applied:0, skipped:0, errors:[], note:"No matching properties" });
    }
    return JSON.stringify({ ok:true, applied:state.applied, skipped:state.skipped, errors:state.errors });
  } catch (e) {
    return JSON.stringify({ ok:false, err:"SearchCaptain error: " + String(e) });
  }
}

try {
  logToPanel("✅ host_APPLY.jsx Loaded ⛓️");
  var NEW_log_event_apply = new CSXSEvent();
  NEW_log_event_apply.type = "com.holyexpressor.NEW_log_event";
  NEW_log_event_apply.data = "✅ host_APPLY.jsx Loaded ⛓️";
  NEW_log_event_apply.dispatch();
} catch (e) {}

function holy_applyControlsJSON(snippetId, shouldApply) {
  var result = {};
  var undoOpen = false;
  try {
    if (!shouldApply) return JSON.stringify({ skipped: true });

    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) throw "No active comp";
    if (!comp.selectedLayers || comp.selectedLayers.length === 0) throw "No layer selected";
    var layer = comp.selectedLayers[0];

    var bankFile = new File(Folder.userData.fullName + "/HolyExpressor/banks.json");
    if (!bankFile.exists) throw "banks.json not found";
    if (!bankFile.open("r")) throw "Unable to open banks.json";
    var raw = bankFile.read();
    bankFile.close();
    var data = JSON.parse(raw || "{}");

    if (!data || !data.banks) throw "Invalid banks payload";
    var banks = data.banks;
    var activeBank = null;
    for (var b = 0; b < banks.length; b++) {
      var bankEntry = banks[b];
      if (bankEntry && bankEntry.id === data.activeBankId) {
        activeBank = bankEntry;
        break;
      }
    }
    if (!activeBank) throw "active bank missing";

    var snip = null;
    var snippets = activeBank.snippets || [];
    for (var i = 0; i < snippets.length; i++) {
      var candidate = snippets[i];
      if (candidate && String(candidate.id) === String(snippetId)) {
        snip = candidate;
        break;
      }
    }
    if (!snip || !snip.controls) throw "snippet controls missing";

    var effects = snip.controls.effects || [];

    app.beginUndoGroup("HolyExpressor - Apply Controls");
    undoOpen = true;

    var fxGroup = layer.property("ADBE Effect Parade");
    for (var e = 0; e < effects.length; e++) {
      var fxData = effects[e];
      if (!fxData || !fxGroup || !fxData.matchName) continue;
      var fx = fxGroup.addProperty(fxData.matchName);
      if (!fx) continue;
      if (fxData.name) fx.name = fxData.name;

      var props = fxData.properties || [];
      for (var p = 0; p < props.length; p++) {
        var propData = props[p];
        if (!propData || !propData.matchName) continue;
        var prop = fx.property(propData.matchName);
        if (!prop) continue;
        if (propData.hasOwnProperty("value")) {
          prop.setValue(propData.value);
        }
        if (propData.expression) {
          prop.expression = propData.expression;
          prop.expressionEnabled = true;
        }
      }
    }

    app.endUndoGroup();
    undoOpen = false;
    result.ok = true;
  } catch (err) {
    if (undoOpen) {
      try { app.endUndoGroup(); } catch (_) {}
    }
    result.error = String(err);
  }
  return JSON.stringify(result);
}



function he_EX_applyExpressionBatch(jsonStr) {
  var result = { ok: false, applied: 0, errors: [], total: 0, unhidLayers: 0, revealedProps: 0 };
  var undoOpen = false;
  var trackedLayers = [];
  var toggledHiddenCount = 0;
  var toReveal = [];
  var revealExecuted = false;
  function he_EX_trackLayerVisibility(prop) {
    if (!prop) return;
    var layer = null;
    try { layer = prop.propertyGroup(prop.propertyDepth); } catch (_) { layer = null; }
    if (!layer) return;

    var hasEnabledFlag = false;
    try { hasEnabledFlag = (typeof layer.enabled !== "undefined"); } catch (_) { hasEnabledFlag = false; }
    if (!hasEnabledFlag) return;

    for (var li = 0; li < trackedLayers.length; li++) {
      if (trackedLayers[li] && trackedLayers[li].layer === layer) {
        return;
      }
    }

    var wasEnabled = true;
    try { wasEnabled = !!layer.enabled; } catch (_) { wasEnabled = true; }
    trackedLayers.push({ layer: layer, wasEnabled: wasEnabled });

    if (!wasEnabled) {
      try { layer.enabled = true; toggledHiddenCount++; } catch (_) {}
    }
  }

  try {
    var data = {};
    try { data = JSON.parse(jsonStr || "{}"); } catch (_) { data = {}; }

    var entries = data.entries || [];
    var undoLabel = "Holy Search Replace (Indexed Safe)";

    if (!entries || entries.length === 0) {
      result.ok = true;
      return JSON.stringify(result);
    }

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) throw "No active comp";

    app.beginUndoGroup(undoLabel);
    undoOpen = true;

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (!entry || !entry.path) continue;
      result.total++;

      var props = he_P_EX_findPropertiesByPath(comp, entry.path) || [];
      if (!props.length) {
        result.errors.push({ path: entry.path, err: "Path not found" });
        continue;
      }

      for (var pi = 0; pi < props.length; pi++) {
        var prop = props[pi];
        if (!prop) continue;

        he_EX_trackLayerVisibility(prop);

        if (he_U_Ls_1_isLayerStyleProp(prop) && !he_U_Ls_2_styleEnabledForLeaf(prop)) {
          continue;
        }

        var resolvedPath = "";
        try { resolvedPath = he_P_MM_getExprPath(prop); } catch (_) { resolvedPath = entry.path; }

        var canUse = true;
        try { if (!prop.canSetExpression) canUse = false; } catch (_) { canUse = false; }
        if (canUse) {
          try {
            if (typeof prop.enabled !== "undefined" && !prop.enabled) {
              canUse = false;
            }
          } catch (_) {}
        }
        if (canUse) {
          try {
            if (typeof prop.active !== "undefined" && !prop.active) {
              canUse = false;
            }
          } catch (_) {}
        }
        if (canUse) {
          try { if (he_U_PB_isPhantomLayerStyleProp(prop)) canUse = false; } catch (_) {}
        }
        if (canUse) {
          try { if (he_U_VS_isTrulyHidden(prop)) canUse = false; } catch (_) {}
        }

        if (!canUse) {
          result.errors.push({ path: resolvedPath || entry.path, err: "Property not valid for expressions" });
          continue;
        }

        try {
          prop.expression = entry.expression || "";
          if (entry.hasOwnProperty("expressionEnabled")) {
            prop.expressionEnabled = !!entry.expressionEnabled;
          } else {
            prop.expressionEnabled = true;
          }

          if (prop.expressionError && prop.expressionError.length) {
            result.errors.push({ path: resolvedPath || entry.path, err: prop.expressionError });
          } else {
            result.applied++;
            he_U_EX_pushUnique(toReveal, prop);
          }
        } catch (errApply) {
          result.errors.push({ path: resolvedPath || entry.path, err: String(errApply) });
        }
      }
    }

    if (toReveal.length) {
      var revealCommandId = 0;
      try { revealCommandId = app.findMenuCommandId("Reveal Expression"); } catch (_) { revealCommandId = 0; }
      if (revealCommandId) {
        var previousSelection = [];
        try {
          var currentSelection = comp.selectedProperties;
          if (currentSelection && currentSelection.length) {
            for (var ps = 0; ps < currentSelection.length; ps++) {
              var selProp = currentSelection[ps];
              if (!selProp) continue;
              he_U_EX_pushUnique(previousSelection, selProp);
            }
          }
        } catch (_) { previousSelection = []; }

        for (var ps2 = 0; ps2 < previousSelection.length; ps2++) {
          try { previousSelection[ps2].selected = false; } catch (_) {}
        }

   try {
  // ✅ Focus the Timeline panel instead of the Comp Viewer
  var focusPanel = app.project.activeItem;
  if (focusPanel && focusPanel.openInViewer) {
    focusPanel.openInViewer(); // forces timeline context
  }

  // ✅ Assign selection and give AE time to register
  comp.selectedProperties = toReveal;
  $.sleep(250);

  // ✅ Execute reveal under timeline focus
  app.executeCommand(revealCommandId);
  revealExecuted = true;
} catch (_) {}

        for (var rv2 = 0; rv2 < toReveal.length; rv2++) {
          try { toReveal[rv2].selected = false; } catch (_) {}
        }

        for (var ps3 = 0; ps3 < previousSelection.length; ps3++) {
          try { previousSelection[ps3].selected = true; } catch (_) {}
        }
      }
    }

    result.revealedProps = revealExecuted ? toReveal.length : 0;

    result.ok = true;
  } catch (err) {
    result.err = String(err);
  } finally {
    for (var r = 0; r < trackedLayers.length; r++) {
      var record = trackedLayers[r];
      if (!record || !record.layer) continue;
      try {
        if (typeof record.layer.enabled !== "undefined") {
          record.layer.enabled = record.wasEnabled;
        }
      } catch (_) {}
    }

    result.unhidLayers = toggledHiddenCount;

    if (undoOpen) {
      try { app.endUndoGroup(); } catch (_) {}
      undoOpen = false;
    }
  }
  return JSON.stringify(result);
}
