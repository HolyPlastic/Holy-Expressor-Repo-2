// ==========================================================
// Holy Expressor – host_GET.jsx
// V1 – Core path builder (Lean + Fallback + Selection Helpers)
// ==========================================================




// ==========================================================
// =🔱==== =🔱==== LEAN Path Builder Entry + Core Logic
// ==========================================================




// Entry point for the new lean builder system
// Currently uses he_GET_SelPath_Build() to process selected properties

function he_escapeExprString(str) {
  if (str === undefined || str === null) return "";
  return String(str).replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
}

// ==========================================================
// SIMPLE LOAD PATH BUILDER (deterministic, no legacy heuristics)
// ==========================================================

function he_GET_SelPath_Simple(useAbsoluteComp) {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active comp" });
    }

var props = comp.selectedProperties;
if (!props || !props.length) {
  return JSON.stringify({ ok: false, error: "No selection" });
}

// Filter to actual leaf properties only
var leafProps = [];
for (var i = 0; i < props.length; i++) {
  try {
    if (props[i].propertyType === PropertyType.PROPERTY) {
      leafProps.push(props[i]);
    }
  } catch (_) {}
}

if (leafProps.length !== 1) {
  return JSON.stringify({
    ok: false,
    error: "Select exactly one property"
  });
}

var leaf = leafProps[0];

    if (!leaf || leaf.propertyType !== PropertyType.PROPERTY) {
      return JSON.stringify({ ok: false, error: "Unsupported selection (container)" });
    }

    if (leaf.canSetExpression === false) {
      return JSON.stringify({ ok: false, error: "Unsupported property (no expression access)" });
    }

    var depth = 0;
    try { depth = leaf.propertyDepth; } catch (_) {}

    if (!depth || depth < 1) {
      return JSON.stringify({ ok: false, error: "Unable to resolve property chain" });
    }

    var layer = null;
    try { layer = leaf.propertyGroup(depth); } catch (_) { layer = null; }
    if (!layer || !layer.name) {
      return JSON.stringify({ ok: false, error: "Unable to resolve layer" });
    }

    var parentChain = [];
    for (var d = 1; d < depth; d++) {
      var g = null;
      try { g = leaf.propertyGroup(d); } catch (_) { g = null; }
      if (g) parentChain.push(g);
    }

for (var i = 0; i < parentChain.length; i++) {
  $.writeln(i + ": " + parentChain[i].name + " | " + parentChain[i].matchName);
}


var isShapeMode = false;
for (var i = 0; i < parentChain.length; i++) {
  try {
    if (parentChain[i].matchName && parentChain[i].matchName.indexOf("ADBE Vector") === 0) {
      isShapeMode = true;
      break;
    }
  } catch (_) {}
}


    var groupSegments = [];


// V1 — Shape modifier allow-list (from legacy GROUP_TOKENS)
// 💡 CHECKER: used only for validation, not rewriting
var SHAPE_MODIFIER_ALLOW = {
  "ADBE Vector Filter - Taper": true,
  "ADBE Vector Filter - Trim": true,
  "ADBE Vector Filter - RC": true,
  "ADBE Vector Filter - Repeater": true,
  "ADBE Vector Filter - Offset": true
};

// V1 – Stroke internal subgroup handling (LEAN, deterministic)
// 💡 CHECKER: these UI subgroups must NOT emit `.content("…")`
// 💡 CHECKER: they are addressed syntactically via dot-access
var DOT_GROUP_ACTION = {
  // Stroke subgroups that must emit dot-access
  "ADBE Vector Stroke Dashes": { mode: "DOT", token: "dash" },
  "ADBE Vector Stroke Taper": { mode: "DOT", token: "taper" },

  // Stroke wave subgroup: container must be skipped
  // Leaf accessors already emit `.wave.*`
  "ADBE Vector Stroke Wave": { mode: "SKIP" },

  // Some AE builds expose this variant; skip for same reason
  "ADBE Vector Taper Wave": { mode: "SKIP" }
};


 if (isShapeMode) {
  // parentChain is leaf → root, expressions need root → leaf
  var shapeChain = parentChain.slice().reverse();

  for (var k = 0; k < shapeChain.length; k++) {
    var sg = shapeChain[k];
    var sgName = "";
    var sgMatch = "";

    try { sgName = sg.name || ""; } catch (_) {}
    try { sgMatch = sg.matchName || ""; } catch (_) {}

// 💡 CHECKER: allow only known shape modifiers (no rewriting)
if (
  sgMatch.indexOf("ADBE Vector Filter") === 0 &&
  !SHAPE_MODIFIER_ALLOW[sgMatch]
) {
  return JSON.stringify({
    ok: false,
    error: "Unsupported shape modifier",
    matchName: sgMatch,
    displayName: sgName
  });
}


    // skip internal structural containers
    if (sgName === "Contents") continue;
    if (sgMatch === "ADBE Root Vectors Group") continue;

    // V1 – Stroke subgroup handling
    // 💡 CHECKER: prevents `.content("Wave") / .content("Dashes") / .content("Taper")`
    var action = null;
    try { action = DOT_GROUP_ACTION[sgMatch] || null; } catch (_) { action = null; }

    if (action) {
      if (action.mode === "SKIP") {
        // subgroup container suppressed; leaf accessor handles dot path
        continue;
      }
      if (action.mode === "DOT" && action.token) {
        groupSegments.push("." + action.token);
        continue;
      }
    }

    // default behavior for normal shape groups
    groupSegments.push('.content("' + he_escapeExprString(sgName) + '")');
  }
}



     else {
      var pendingEffect = false;
      for (var m = parentChain.length - 1; m >= 0; m--) {
        var gg = parentChain[m];
        var mm = "";
        var nm = "";
        try { mm = gg.matchName || ""; } catch (_) {}
        try { nm = gg.name || ""; } catch (_) {}

        if (mm === "ADBE Transform Group") {
          groupSegments.push(".transform");
          pendingEffect = false;
          continue;
        }

if (mm === "ADBE Layer Styles") {
  return JSON.stringify({
    ok: false,
    error: "Layer Styles not supported yet"
  });
}


        if (mm === "ADBE Effect Parade") {
          pendingEffect = true;
          continue;
        }

        if (pendingEffect) {
          groupSegments.push('.effect("' + he_escapeExprString(nm) + '")');
          pendingEffect = false;
          continue;
        }

        return JSON.stringify({ ok: false, error: "Unsupported group", matchName: mm, displayName: nm });
      }
    }

// V2 — Expanded from legacy LEAF_TOKENS (no behavior change)
// 💡 CHECKER: maps matchName → final accessor only
var LEAF_ACCESSORS = {
  // ---- Core Shape ----
  "ADBE Vector Shape": ".path",

  // ---- Stroke ----
  "ADBE Vector Stroke Width": ".strokeWidth",
  "ADBE Vector Stroke Color": ".color",
  "ADBE Vector Stroke Opacity": ".opacity",
  "ADBE Vector Stroke Dash 1": ".dash",
  "ADBE Vector Stroke Dash 2": ".gap",
  "ADBE Vector Stroke Offset": ".offset",

  // ---- Fill ----
  "ADBE Vector Fill Color": ".color",
  "ADBE Vector Fill Opacity": ".opacity",

  // ---- Taper ----
  "ADBE Vector Taper Start Length": ".startLength",
  "ADBE Vector Taper End Length": ".endLength",
  "ADBE Vector Taper Amount": ".wave.amount",
  "ADBE Vector Taper Wave Phase": ".wave.phase",
  "ADBE Vector Taper Wavelength": ".wave.wavelength",

  // V1 – Taper leaf accessors (taper group emitted structurally)
  // 💡 CHECKER: prevents `.taper.taper.*`
  "ADBE Vector Taper Start Ease": ".startEase",
  "ADBE Vector Taper End Ease": ".endEase",
  "ADBE Vector Taper Start Width": ".startWidth",
  "ADBE Vector Taper End Width": ".endWidth",
  "ADBE Vector Taper Length Units": ".lengthUnits",

  // V1 – Wave Amount support (fixes unsupported-property error)
  // 💡 CHECKER: some AE builds expose these distinct matchNames
  "ADBE Vector Taper Wave Amount": ".wave.amount",
  "ADBE Vector Stroke Wave Amount": ".wave.amount",
  "ADBE Vector Stroke Wave Phase": ".wave.phase",
  "ADBE Vector Stroke Wave Wavelength": ".wave.wavelength",

  // ---- Transform ----
  "ADBE Position": ".position",
  "ADBE Scale": ".scale",
  "ADBE Rotation": ".rotation",
  "ADBE Rotate Z": ".rotation",
  "ADBE Anchor Point": ".anchorPoint",
  "ADBE Opacity": ".opacity"
};


    var leafMatch = "";
    try { leafMatch = leaf.matchName || ""; } catch (_) {}

    var leafAccessor = LEAF_ACCESSORS[leafMatch];
    if (!leafAccessor) {
      return JSON.stringify({ ok: false, error: "Unsupported property", matchName: leafMatch, displayName: leaf.name });
    }

    var useAbs = String(useAbsoluteComp) === "true";
    var compName = he_escapeExprString(comp.name);
    var layerName = he_escapeExprString(layer.name);
    var base = useAbs ? 'comp("' + compName + '").layer("' + layerName + '")' : 'thisComp.layer("' + layerName + '")';

    var expr = base + groupSegments.join("") + leafAccessor;

    return JSON.stringify({ ok: true, expr: expr });
  } catch (err) {
    return JSON.stringify({ ok: false, error: "Exception", message: err.toString() });
  }
}


// ==========================================================
// LEGACY LOAD PATH SYSTEM — UN-DEPRECATED / UN-QUARANTINED
// he_P_MM_getExprPathHybrid
// ==========================================================

// Refactor regression guard: this helper must remain callable at runtime
// OLD FALLBACK OR SMT V5 – MAP MAKER HYBRID: stricter filter, no Path container in metaPath
function he_P_MM_getExprPathHybrid(prop) {
  var result = { exprPath: "", metaPath: [], _metaJSON: "[]" };

  // Structural-only nodes: containers that never form valid expression segments
  var STRUCTURAL = {
    "ADBE Root Vectors Group": true,
    "ADBE Vector Group": true,
    "ADBE Vector Shape - Group": true // 🚫 treat Path container as structural
  };

                          try {
                            if (!prop) return result;

                            var names = [];
                            var meta = [];

                            // Collect parent groups
                            var depth = prop.propertyDepth || 0;
                            var groups = [];
                            for (var d = 1; d <= depth; d++) {
                              var grp = prop.propertyGroup(d);
                              if (grp) groups.push(grp);
                            }



                            // Add group chain (root → leaf), but skip structural nodes
                            for (var i = groups.length - 1; i >= 0; i--) {
                              var g = groups[i];
                              var gName = "", gMatch = "";
                              try { gName = g.name || ""; } catch (_) {}
                              try { gMatch = g.matchName || ""; } catch (_) {}

                              if (STRUCTURAL[gMatch]) {
                                continue; // 🚫 skip containers like Path 1 group

                                // PATCH A: Skip structural/container groups at source
                                if (MAPMAKER_SKIP[gMatch]) {
                                  continue;
                                }
                                      }




                              meta.push({
                                name: gName,
                                matchName: gMatch,
                                lilName: (gName ? gName.toLowerCase().replace(/\s+/g, "") : "")
                              });
                              names.push(gName);
                            }

                            // Add the property itself (leaf only)
                            var propName = "", propMatch = "";
                            try { propName = prop.name || ""; } catch (_) {}
                            try { propMatch = prop.matchName || ""; } catch (_) {}

                            meta.push({
                              name: propName,
                              matchName: propMatch,
                              lilName: (propName ? propName.toLowerCase().replace(/\s+/g, "") : "")
                            });
                            names.push(propName);

                            // Guarantee metaPath never empty
                            if (meta.length === 0) {
                              meta.push({ name: "(Unknown)", matchName: "", lilName: "unknown" });
                              names.push("(Unknown)");
                            }

                            result.exprPath = names.join(" > ");
                            result.metaPath = meta.slice();
                            result._metaJSON = JSON.stringify(result.metaPath);

                          } 


                        
      
      catch (err) {
        var fallback = [{ name: "ERROR", matchName: "", lilName: "error" }];
        result.exprPath = "ERROR";
        result.metaPath = fallback;
        result._metaJSON = JSON.stringify(fallback);
      }
return result;
  
}



// Legacy helper: retain string path access for existing callers

function he_P_MM_getExprPath(prop) {

    // Refactor regression guard: keep legacy wrapper for public callers.
    var hybrid = he_P_MM_getExprPathHybrid(prop);

    return hybrid.exprPath;

}






// [V1] Build friendly expression path from metaPath
// PLACE directly after the alias tables.
function he_U_buildFriendlyExprPath(metaArr, useAbsoluteComp, layerName) {
  // VALIDATOR: Require at least [LayerName, ..., Leaf]
  if (!metaArr || metaArr.length === 0) return "";

  var base = useAbsoluteComp
    ? 'comp("' + app.project.activeItem.name + '").layer("' + layerName + '")'
    : 'thisComp.layer("' + layerName + '")';

  // Walk all nodes except the first (layer) and handle groups
  for (var i = 1; i < metaArr.length - 1; i++) {
    var node = metaArr[i] || {};
    var m = String(node.matchName || "");
    var n = String(node.name || "");
    if (HE_GROUP_ALIASES.hasOwnProperty(m)) {
      base += HE_GROUP_ALIASES[m];               // e.g. .transform
    } else {
      base += '.content("' + n + '")';           // general group name
    }
  }

  // Leaf
  var leaf = metaArr[metaArr.length - 1] || {};
  var leafMatch = String(leaf.matchName || "");
  if (HE_LEAF_ALIASES.hasOwnProperty(leafMatch) && HE_LEAF_ALIASES[leafMatch]) {
    base += HE_LEAF_ALIASES[leafMatch];          // may append compound like .taper.startLength
  } else if (HE_GROUP_ALIASES.hasOwnProperty(leafMatch)) {
    base += HE_GROUP_ALIASES[leafMatch];
  } else {
    base += '.property("' + leafMatch + '")';    // fallback
  }

  return base;
}








// EXPLORER: resolve a breadcrumb path back to a property (strict-only)
function he_P_EX_findPropertyByPath(comp, pathString) {
  if (!comp || !(comp instanceof CompItem)) return null;
  if (!pathString) return null;

  var parts = pathString.split(" > ");
  if (parts.length < 2) return null;

  var layer = comp.layer(parts[0]);
  if (!layer) return null;

  var current = layer;
  for (var i = 1; i < parts.length; i++) {
    var wanted = parts[i];
    var found = null;

    for (var j = 1; j <= current.numProperties; j++) {
      var child = current.property(j);
      if (!child) continue;

      // ✅ exact-only: child.name or child.matchName must equal wanted
      if (child.name === wanted || child.matchName === wanted) {
        found = child;
        break;
      }
    }

    if (!found) return null;
    current = found;
  }
  return current;
}







// GROUP SCOUTS - TOKEN-BASED & helpers: recursive search by token path (starts anywhere)
function he_P_GS1_collectGroupsByTokenDeep(group, token, out) {
  for (var i = 1; i <= group.numProperties; i++) {
    var pr = group.property(i);
    if (!pr) continue;
    if (pr.propertyType === PropertyType.INDEXED_GROUP || pr.propertyType === PropertyType.NAMED_GROUP) {
      if (pr.name === token || pr.matchName === token) out.push(pr);
      he_P_GS1_collectGroupsByTokenDeep(pr, token, out); // self-call
    }
  }
}

function he_P_GS2_collectPropsByTokenDeep(group, token, out) {
  for (var i = 1; i <= group.numProperties; i++) {
    var pr = group.property(i);
    if (!pr) continue;
    if (pr.propertyType === PropertyType.PROPERTY) {
      if (pr.canSetExpression && (pr.name === token || pr.matchName === token)) out.push(pr);
    } else if (pr.propertyType === PropertyType.INDEXED_GROUP || pr.propertyType === PropertyType.NAMED_GROUP) {
      he_P_GS2_collectPropsByTokenDeep(pr, token, out); // self-call
    }
  }
}

function he_P_GS3_findPropsByTokenPath(anchor, tokens, depth, out) {
  var last = tokens.length - 1;
  if (depth > last) return;
  if (depth === last) {
    he_P_GS2_collectPropsByTokenDeep(anchor, tokens[depth], out); // use GS2
    return;
  }
  var groups = [];
  he_P_GS1_collectGroupsByTokenDeep(anchor, tokens[depth], groups); // use GS1
  for (var i = 0; i < groups.length; i++) {
    he_P_GS3_findPropsByTokenPath(groups[i], tokens, depth + 1, out); // self-call
  }
}













function holy_captureControlsJSON(snippetId) {
  var result = {};
  try {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) throw "No active comp";
    if (comp.selectedLayers.length === 0) throw "No layer selected";

    var layer = comp.selectedLayers[0];
    var fxGroup = layer.property("ADBE Effect Parade");
    if (!fxGroup || fxGroup.numProperties === 0) throw "No effects found";

    var controls = [];

    for (var i = 1; i <= fxGroup.numProperties; i++) {
      var fx = fxGroup.property(i);
      var entry = {
        name: fx.name,
        matchName: fx.matchName,
        properties: []
      };

for (var p = 1; p <= fx.numProperties; p++) {
    var prop = fx.property(p);
    if (prop.canSetExpression || prop.propertyValueType === PropertyValueType.OneD) {
        var propData = {
            name: prop.name,
            matchName: prop.matchName,
            value: prop.value
        };

        if (prop.canSetExpression && prop.expressionEnabled && prop.expression !== "") {
            propData.expression = prop.expression;
        }

        entry.properties.push(propData);
    }
}

      controls.push(entry);
    }

    result.effects = controls;
  } catch (err) {
    result.error = String(err);
  }
  return JSON.stringify(result);
}

function he_EX_getSelectedLayers() {
  var result = { ok: false, layers: [] };
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      result.err = "No active comp";
      return JSON.stringify(result);
    }

    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) {
      result.err = "Select at least one layer";
      return JSON.stringify(result);
    }

    var layers = [];
    for (var i = 0; i < sel.length; i++) {
      var layer = sel[i];
      if (!layer) continue;
      layers.push({
        name: layer.name,
        index: layer.index,
        id: layer.id
      });
    }

    result.ok = true;
    result.layers = layers;
  } catch (err) {
    result.err = String(err);
  }
  return JSON.stringify(result);
}

function he_EX_collectExpressionsForLayer(jsonStr) {
  var result = { ok: false, entries: [] };
  try {
    var data = {};
    try { data = JSON.parse(jsonStr || "{}"); } catch (_) { data = {}; }

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) throw "No active comp";

    var layer = null;
    var targetId = data.layerId;
    var targetIndex = data.layerIndex;

    if (targetId) {
      for (var i = 1; i <= comp.numLayers; i++) {
        var candidate = comp.layer(i);
        if (candidate && candidate.id === targetId) {
          layer = candidate;
          break;
        }
      }
    }

    if (!layer && targetIndex) {
      try { layer = comp.layer(targetIndex); } catch (_) { layer = null; }
    }

    if (!layer) throw "Layer not found";

    result.layerName = layer.name;
    result.layerIndex = layer.index;

    var entries = [];

    function buildResolvablePath(prop) {
      if (!prop) return "";

      var nameChain = [];
      var matchChain = [];
      var depth = 0;

      try { depth = prop.propertyDepth || 0; } catch (_) { depth = 0; }

      for (var d = 1; d <= depth; d++) {
        var grp = null;
        try { grp = prop.propertyGroup(d); } catch (_) { grp = null; }
        if (!grp) continue;

        var gName = "";
        var gMatch = "";
        try { gName = grp.name || ""; } catch (_) {}
        try { gMatch = grp.matchName || ""; } catch (_) {}

        if (gName || gMatch) {
          nameChain.push(gName || gMatch);
          matchChain.push(gMatch || gName);
        }
      }

      var leafName = "";
      var leafMatch = "";
      try { leafName = prop.name || ""; } catch (_) {}
      try { leafMatch = prop.matchName || ""; } catch (_) {}
      if (!leafName && leafMatch) leafName = leafMatch;

      var nameParts = nameChain.length ? nameChain.slice().reverse() : [];
      if (!nameParts.length || nameParts[0] !== layer.name) {
        nameParts.unshift(layer.name);
      }
      nameParts.push(leafName);
      var candidate = nameParts.join(" > ");

      try {
        var resolved = he_P_EX_findPropertyByPath(comp, candidate);
        if (resolved === prop) return candidate;
      } catch (_) {}

      var matchParts = matchChain.length ? matchChain.slice().reverse() : [];
      if (!matchParts.length || matchParts[0] !== layer.name) {
        matchParts.unshift(layer.name);
      }
      matchParts.push(leafMatch || leafName);
      var candidateMatch = matchParts.join(" > ");

      try {
        var resolvedMatch = he_P_EX_findPropertyByPath(comp, candidateMatch);
        if (resolvedMatch === prop) return candidateMatch;
      } catch (_) {}

      var fallback = "";
      try { fallback = he_P_MM_getExprPath(prop); } catch (_) { fallback = ""; }
      if (fallback) {
        try {
          var resolvedFallback = he_P_EX_findPropertyByPath(comp, fallback);
          if (resolvedFallback === prop) return fallback;
        } catch (_) {}
      }

      return candidate;
    }

    function scanGroup(group) {
      for (var p = 1; p <= group.numProperties; p++) {
        var child = group.property(p);
        if (!child) continue;

        if (child.propertyType === PropertyType.PROPERTY) {
          if (!child.canSetExpression) continue;
          var enabled = false;
          var expr = "";
          try {
            enabled = child.expressionEnabled;
            expr = child.expression;
          } catch (_) {
            expr = "";
          }
          if (!enabled || !expr || expr === "") continue;

          var path = "";
          try { path = buildResolvablePath(child); } catch (_) { path = ""; }
          if (!path) continue;

          var name = "";
          var matchName = "";
          try { name = child.name || ""; } catch (_) {}
          try { matchName = child.matchName || ""; } catch (_) {}

          entries.push({
            path: path,
            expression: expr,
            expressionEnabled: enabled,
            name: name,
            matchName: matchName
          });
        } else if (
          child.propertyType === PropertyType.INDEXED_GROUP ||
          child.propertyType === PropertyType.NAMED_GROUP
        ) {
          scanGroup(child);
        }
      }
    }

    scanGroup(layer);

    result.ok = true;
    result.entries = entries;
  } catch (err) {
    result.err = String(err);
  }
  return JSON.stringify(result);
}

try {
    logToPanel("✅ host_GET.jsx Loaded ⛓️");
    var NEW_log_event_loaded = new CSXSEvent();
    NEW_log_event_loaded.type = "com.holyexpressor.NEW_log_event";
    NEW_log_event_loaded.data = "✅ host_GET.jsx Loaded ⛓️";
    NEW_log_event_loaded.dispatch();
} catch (e) {}
