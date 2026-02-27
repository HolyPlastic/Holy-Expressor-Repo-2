








// LS helpers — determine if a leaf is part of Layer Styles and whether that style is enabled was ~157-250
function he_U_Ls_1_isLayerStyleProp(p){
  try{
    if(!p) return false;
    // Walk all ancestors; LS root matchName often starts with "ADBE Layer Styles"
    for (var d = 1; d <= p.propertyDepth; d++) {
      var g = p.propertyGroup(d);
      if (!g) continue;
      var mm = ""; try { mm = g.matchName || ""; } catch(e) {}
      var nm = ""; try { nm = g.name || ""; } catch(e) {}
      if ((mm && mm.indexOf("ADBE Layer Styles") === 0) || nm === "Layer Styles") {
        return true;
      }
    }
    return false;
  }catch(e){ return false; }
}

function he_U_Ls_2_styleEnabledForLeaf(p){
  // Returns true only if the owning style group is present and enabled
  try{
    if(!he_U_Ls_1_isLayerStyleProp(p)) return true; // non-LS props should pass

    // The immediate parent of a Layer Style leaf is the style group (e.g., "Drop Shadow")
    var styleGroup = null;
    try { styleGroup = p.propertyGroup(1); } catch(e) { styleGroup = null; }
    if(!styleGroup) return false; // phantom (not instantiated) → not enabled

    // 1) Prefer the style group's own enabled (eyeball) if exposed
    try {
      if (typeof styleGroup.enabled !== 'undefined') return !!styleGroup.enabled;
    } catch (e) { /* fall through */ }

    // 2) Fallback: look for an explicit "*/enabled" child under the style group
    var prefix = "";
    var mm = ""; try { mm = p.matchName || ""; } catch(e) {}
    var idx = mm.indexOf("/");
    if (idx > 0) prefix = mm.substring(0, idx);

    for (var i=1; i<=styleGroup.numProperties; i++){
      var child = styleGroup.property(i);
      if(!child || child.propertyType !== PropertyType.PROPERTY) continue;
      var cm = ""; try { cm = child.matchName || ""; } catch(e) {}
      if ((prefix && cm === (prefix + "/enabled")) || (!prefix && cm.slice(-8) === "/enabled")){
        try { return !!child.value; } catch(e){ return false; }
      }
    }

    // No explicit enable control found → treat as not enabled (silent ignore)
    return false;
  }catch(e){ return false; }
}

// VALIDATION SEEKER
function he_U_VS_isTrulyHidden(p) {
  try {
    if (!p || !p.canSetExpression) return true;

    // Only gate on LS root for LS props
    if (he_U_Ls_1_isLayerStyleProp(p)) {
      var layer = p.propertyGroup(p.propertyDepth);
      var rootLS = layer && layer.property && layer.property("ADBE Layer Styles");
      if (rootLS && ("canSetEnabled" in rootLS) && rootLS.canSetEnabled === false) {
        return true;
      }
    }
    // Check parent groups
    for (var d = p.propertyDepth; d >= 1; d--) {
      var g = p.propertyGroup(d);
      if (g && ("enabled" in g)) {
        try {
          if (!g.enabled) return true;
        } catch (e) {}
      }
    }

    // Probe: test expression assignment
    var oldExpr = "";
    try { oldExpr = p.expression; } catch (e) {}
    try {
      p.expression = "";
      p.expression = oldExpr;
    } catch (e) {
      return true;
    }

    return false; // survived
  } catch (e) {
    return true;
  }
}




/**
 *  he_U_findFirstLeaf was ~309
 * Depth-first walker that promotes shape containers to expression-capable leaves.
 *
 * @param {PropertyBase} prop - Candidate property or container to inspect.
 * @param {number} depth - Legacy recursion depth (0 for new calls).
 * @returns {PropertyBase|null} - Resolved leaf or null.
 */
function he_P_isShapeContainer(prop) {
    if (!prop) return false;
    var mm = "";
    try { mm = prop.matchName || ""; } catch (_) {}
    var type = 0;
    try { type = prop.propertyType; } catch (_) {}
    if (!(type === PropertyType.NAMED_GROUP || type === PropertyType.INDEXED_GROUP)) {
        return false;
    }
    if (HE_SHAPE_CONTAINER_MATCHNAMES[mm]) return true;
    if (mm && mm.indexOf("ADBE Vector") === 0) return true;
    return false;
}










function he_U_findLeaf(prop, depth) {
    return he_U_findFirstLeaf(prop, depth);
}







function he_U_buildSelectionKey(prop, hybrid) {
    try {
        var path = (hybrid && hybrid.exprPath) ? hybrid.exprPath : "";
        var matchName = "";
        try { matchName = prop.matchName || ""; } catch (_) {}
        var layerPrefix = "";
        try {
            var layer = prop.propertyGroup(prop.propertyDepth);
            if (layer && typeof layer.index === "number") {
                layerPrefix = "#" + layer.index + "::";
            }
        } catch (_) {}
        return layerPrefix + path + "::" + matchName;
    } catch (err) {
        return "";
    }
}










/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#####~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#####~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
/*READERS 🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎*/
/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#####~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#####~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/




// Shape Reader: resolve a strict token path into an 
// expression-capable leaf under a Shape Layer.
// tokens example: ["Shape Layer 2", "Contents", "Shape 1", "Stroke 1", "Stroke Width"]
function he_P_shapeReader(tokens, layer) {
    if (!tokens || !tokens.length || !layer) return null;

    var current = layer;                 // start at the shape layer
    var metaPath = [];                   // [{name, matchName}, ...]
    var exprSegments = [];               // names-only for expression addressing

    // Walk tokens after the layer name
    for (var i = 1; i < tokens.length; i++) {
        var wanted = tokens[i];
        if (!wanted) continue;

        // Always skip structural "Contents" token
        if (wanted === "Contents") continue;

        // Find child that strictly matches by name or matchName
        var found = null;
        for (var j = 1; j <= current.numProperties; j++) {
            var child = current.property(j);
            if (!child) continue;

            // Strict match by .name or .matchName
            var childName = "";
            var childMM = "";
            try { childName = child.name || ""; } catch (_) {}
            try { childMM   = child.matchName || ""; } catch (_) {}

            if (childName === wanted || childMM === wanted) {
                found = child;
                break;
            }
        }
        if (!found) return null;

        // Record step
        var foundName = "";
        var foundMM = "";
        try { foundName = found.name || ""; } catch (_) {}
        try { foundMM   = found.matchName || ""; } catch (_) {}
        metaPath.push({ name: foundName, matchName: foundMM });
        exprSegments.push(foundName);

        // If this node is a known structural-only container, we continue traversal
        // but never treat it as a leaf.
        // Structural containers: Contents, Vector Group, Transform groups
        if (HE_STRUCTURAL_MATCHNAMES[foundMM]) {
            current = found;
            continue;
        }

        // Graphic containers like Stroke/Fill are groups, not leaves.
        // They are not structural-only, so we allow traversal into them.
        // Leaves will be their children (Width, Opacity, Color, etc.)
        current = found;
    }

    // At the end, decide if current is an expression-capable leaf
    if (he_P_leafReader(current, metaPath)) {
        return {
            exprPath: exprSegments.join(" > "),
            metaPath: metaPath,
            leaf: current
        };
    }

    return null;
}

// Leaf Reader: returns true if prop is an expression-capable leaf.
// Uses stable matchNames from Adobe docs; falls back to .canSetExpression.
function he_P_leafReader(prop, metaPath) {
    if (!prop) return false;

    var mm = "";
    try { mm = prop.matchName || ""; } catch (_) {}

    // Known leaves under shape graphics and transforms.
    // 1 = definite leaf, 0 = container.
    var leafMatchNames = {
        // Transform (shape-level)
        "ADBE Vector Position": 1,
        "ADBE Vector Rotation": 1,
        "ADBE Vector Scale": 1,
        "ADBE Vector Group Opacity": 1,

        // Fill
        "ADBE Vector Graphic - Fill": 0,
        "ADBE Vector Fill Color": 1,
        "ADBE Vector Fill Opacity": 1,

        // Stroke
        "ADBE Vector Graphic - Stroke": 0,
        "ADBE Vector Stroke Color": 1,
        "ADBE Vector Stroke Opacity": 1,
        "ADBE Vector Stroke Width": 1,

        // Gradient Fill
        "ADBE Vector Graphic - G-Fill": 0,
        "ADBE Vector Grad Colors": 1,
        "ADBE Vector Grad Opacity": 1,
        "ADBE Vector Grad Start Pt": 1,
        "ADBE Vector Grad End Pt": 1,
        "ADBE Vector Grad HiLite Angle": 1,
        "ADBE Vector Grad HiLite Length": 1,
        "ADBE Vector Grad HiLite Center": 1,

        // Gradient Stroke
        "ADBE Vector Graphic - G-Stroke": 0,
        "ADBE Vector Grad Stroke Colors": 1,
        "ADBE Vector Grad Stroke Opacity": 1,
        "ADBE Vector Grad Stroke Start Pt": 1,
        "ADBE Vector Grad Stroke End Pt": 1,
        "ADBE Vector Grad Stroke Width": 1,

        // Path
        "ADBE Vector Shape - Group": 0,
        "ADBE Vector Shape": 1,
        "ADBE Vector Shape Direction": 1,

        // Dashes
        "ADBE Vector Stroke Dashes": 0,
        "ADBE Vector Stroke Dash 1": 1,
        "ADBE Vector Stroke Gap 1": 1,
        "ADBE Vector Stroke Offset": 1,

        // Trim Paths
        "ADBE Vector Filter - Trim": 0,
        "ADBE Vector Trim Start": 1,
        "ADBE Vector Trim End": 1,
        "ADBE Vector Trim Offset": 1,

        // Round Corners
        "ADBE Vector Filter - RC": 0,
        "ADBE Vector RoundCorner Radius": 1,

        // Taper
        "ADBE Vector Filter - Taper": 0,
        "ADBE Vector Stroke Taper": 0,
        "ADBE Vector Taper Start": 1,
        "ADBE Vector Taper End": 1,
        "ADBE Vector Taper Length": 1,
        "ADBE Vector Taper Start Length": 1,
        "ADBE Vector Taper Start Width": 1,
        "ADBE Vector Taper End Length": 1,
        "ADBE Vector Taper End Width": 1,
        "ADBE Vector Taper Start Ease": 1,
        "ADBE Vector Taper End Ease": 1,
        "ADBE Vector Taper Length Units": 1
    };

    // Case 1: Directly mapped in table
    if (leafMatchNames.hasOwnProperty(mm)) {
        if (leafMatchNames[mm] === 1) {
            return true; // definite leaf
        } else {
            // Container → deep walk to inspect children
            try {
                var numProps = prop.numProperties || 0;
                for (var i = 1; i <= numProps; i++) {
                    var child = prop.property(i);
                    if (he_P_leafReader(child, metaPath.concat([mm]))) {
                        return true;
                    }
                }
            } catch (_) {}
            return false;
        }
    }

    // Case 2: No mapping → fall back to AE flag
    var canExpr = false;
    try { canExpr = (prop.canSetExpression === true); } catch (_) {}
    return canExpr;
}


// TRANSLATOR: classify a property's value type safely
function he_P_TR_valueTypeOf(prop) {
    try {
        var t = prop.propertyValueType;
        if (t === PropertyValueType.OneD)   return "OneD";
        if (t === PropertyValueType.TwoD)   return "TwoD";
        if (t === PropertyValueType.ThreeD) return "ThreeD";
        if (t === PropertyValueType.COLOR)  return "Color";
        return "Unsupported"; // shape, text, marker, etc.
    } catch (e) {
        return "Unsupported";
    }
}





// PHANTOM BLOCKER: detect phantom (inactive) Layer Style props
function he_U_PB_isPhantomLayerStyleProp(p) {
  try {
    if (!p) return false;

    // Does this property belong to a Layer Styles group?
    var isLayerStyle = false;
    for (var d = 1; d <= p.propertyDepth; d++) {
      var g = p.propertyGroup(d);
      if (g && g.matchName && g.matchName.indexOf("ADBE Layer Styles") === 0) {
        isLayerStyle = true;
        break;
      }
      if (g && g.name && g.name === "Layer Styles") {
        isLayerStyle = true;
        break;
      }
    }
    if (!isLayerStyle) return false;

    // Phantom detection heuristic:
    // if parent group has no actual sub-properties, it's a ghost
    var parent = p.propertyGroup(p.propertyDepth - 1);
    if (parent && parent.numProperties === 0) {
      return true; // phantom Layer Style
    }

    // Otherwise treat as real style
    return false;
  } catch (e) {
    return false;
  }
}





// V5.1 – Classifier hardened against structural leaves
function he_P_MM_classifyProperty(metaPath) {
    try {
        if (!metaPath || !metaPath.length) return "Unclassified";
        var leaf = metaPath[metaPath.length - 1] || {};
        var matchName = leaf.matchName || "";

        switch (matchName) {
            case "ADBE Position": return "TransformPosition";
            case "ADBE Scale": return "TransformScale";
            case "ADBE Rotate Z":
            case "ADBE Rotation": return "TransformRotation";
            case "ADBE Opacity": return "TransformOpacity";

            // 🎯 SHAPE STROKE/FILL
            case "ADBE Vector Stroke Width": return "StrokeWidth";
            case "ADBE Vector Stroke Opacity": return "StrokeOpacity";
            case "ADBE Vector Stroke Color": return "StrokeColor";
            case "ADBE Vector Fill Opacity": return "FillOpacity";
            case "ADBE Vector Fill Color": return "FillColor";

            // 🎯 DASHES & TRIMS
            case "ADBE Vector Stroke Dash Offset":
            case "ADBE Vector Stroke Offset": return "DashOffset";
            case "ADBE Vector Trim Start": return "TrimStart";
            case "ADBE Vector Trim End": return "TrimEnd";
            case "ADBE Vector Trim Offset": return "TrimOffset";

            // 🎯 SHAPE TRANSFORM
            case "ADBE Vector Position": return "ShapeGroupPosition";
            case "ADBE Vector Scale": return "ShapeGroupScale";
            case "ADBE Vector Rotation": return "ShapeGroupRotation";
            case "ADBE Vector Group Opacity": return "ShapeGroupOpacity";

            // 🎯 SHAPE PATH
            case "ADBE Vector Shape": return "ShapePath";
            // 🚫 Block containers
            case "ADBE Root Vectors Group":
            case "ADBE Vector Group":
            case "ADBE Vector Shape - Group":
                return "SkipStructural";

            // 🎯 FILTERS
            case "ADBE Vector Filter - Repeater": return "Repeater";
            case "ADBE Vector Filter - Offset": return "OffsetPaths";
            case "ADBE Vector Filter - RC": return "RoundCorners";
            case "ADBE Vector RoundCorner Radius": return "RoundCornerRadius";
            case "ADBE Vector Taper Start Length": return "TaperStartLength";
            case "ADBE Vector Taper End Length": return "TaperEndLength";
            case "ADBE Vector Taper Start Width": return "TaperStartWidth";
            case "ADBE Vector Taper End Width": return "TaperEndWidth";
            case "ADBE Vector Filter - Trim": return "TrimPaths";

            default: return "Unclassified";
        }
    } catch (err) {
        return "Unclassified";
    }
}




function he_U_EX_pushUnique(list, prop) {
  if (!list || !prop) return;
  for (var i = 0; i < list.length; i++) {
    if (list[i] === prop) return;
  }
  list.push(prop);
}

function he_U_EX_stripIndexSuffix(raw) {
  var result = { text: "", index: null };
  var value = String(raw || "");
  var trimmed = value.replace(/^\s+|\s+$/g, "");
  var rx;
  var match;

  rx = /\s*\[#?(\d+)\]\s*$/;
  match = rx.exec(trimmed);
  if (match) {
    result.index = parseInt(match[1], 10);
    trimmed = trimmed.substring(0, trimmed.length - match[0].length);
    trimmed = trimmed.replace(/\s+$/g, "");
    result.text = trimmed;
    return result;
  }

  rx = /\s+#(\d+)\s*$/;
  match = rx.exec(trimmed);
  if (match) {
    result.index = parseInt(match[1], 10);
    trimmed = trimmed.substring(0, trimmed.length - match[0].length);
    trimmed = trimmed.replace(/\s+$/g, "");
    result.text = trimmed;
    return result;
  }

  rx = /\s*\((\d+)\)\s*$/;
  match = rx.exec(trimmed);
  if (match) {
    result.index = parseInt(match[1], 10);
    trimmed = trimmed.substring(0, trimmed.length - match[0].length);
    trimmed = trimmed.replace(/\s+$/g, "");
    result.text = trimmed;
    return result;
  }

  result.text = trimmed;
  return result;
}

function he_U_EX_parsePathToken(raw) {
  var token = {
    raw: String(raw || ""),
    name: "",
    matchName: "",
    index: null,
    hasExplicitMatchName: false
  };

  var trimmed = token.raw.replace(/^\s+|\s+$/g, "");
  var sepIndex = trimmed.indexOf("::");
  var namePart = sepIndex >= 0 ? trimmed.substring(0, sepIndex) : trimmed;
  var matchPart = sepIndex >= 0 ? trimmed.substring(sepIndex + 2) : "";

  var nameStrip = he_U_EX_stripIndexSuffix(namePart);
  var matchStrip = he_U_EX_stripIndexSuffix(matchPart);

  token.name = nameStrip.text.replace(/^\s+|\s+$/g, "");
  token.index = nameStrip.index;

  if (matchStrip.index !== null && token.index === null) {
    token.index = matchStrip.index;
  }

  token.matchName = matchStrip.text.replace(/^\s+|\s+$/g, "");
  if (token.matchName.length) {
    token.hasExplicitMatchName = true;
  }

  if (!token.name.length && !token.hasExplicitMatchName) {
    token.name = trimmed;
  }

  return token;
}

function he_U_EX_tokenMatchesCandidate(token, candidate) {
  if (!candidate) return false;

  var candidateName = "";
  var candidateMatch = "";
  var candidateIndex = null;

  try { candidateName = candidate.name || ""; } catch (_) { candidateName = ""; }
  try { candidateMatch = candidate.matchName || ""; } catch (_) { candidateMatch = ""; }

  if (token.index !== null) {
    try {
      if (typeof candidate.propertyIndex !== "undefined" && candidate.propertyIndex !== null) {
        candidateIndex = candidate.propertyIndex;
      } else if (typeof candidate.index !== "undefined" && candidate.index !== null) {
        candidateIndex = candidate.index;
      }
    } catch (_) { candidateIndex = null; }
  }

  if (token.hasExplicitMatchName && candidateMatch === token.matchName) {
    return true;
  }

  if (token.name && token.name.length) {
    if (candidateName === token.name) return true;
    if (!token.hasExplicitMatchName && candidateMatch === token.name) return true;
  }

  if (token.index !== null && candidateIndex === token.index) {
    return true;
  }

  if (!token.hasExplicitMatchName && token.matchName && token.matchName.length && candidateMatch === token.matchName) {
    return true;
  }

  return false;
}

function he_U_EX_collectMatchingLayers(comp, token) {
  var matches = [];
  if (!comp) return matches;

  if (token.index !== null) {
    try {
      var byIndex = comp.layer(token.index);
      if (byIndex) he_U_EX_pushUnique(matches, byIndex);
    } catch (_) {}
  }

  var total = 0;
  try { total = comp.numLayers || 0; } catch (_) { total = 0; }

  for (var i = 1; i <= total; i++) {
    var layer = null;
    try { layer = comp.layer(i); } catch (_) { layer = null; }
    if (!layer) continue;
    if (he_U_EX_tokenMatchesCandidate(token, layer)) {
      he_U_EX_pushUnique(matches, layer);
    }
  }

  return matches;
}

function he_U_EX_collectMatchingChildren(parent, token) {
  var matches = [];
  if (!parent) return matches;

  var total = 0;
  try { total = parent.numProperties || 0; } catch (_) { total = 0; }

  if (token.index !== null) {
    try {
      var indexed = parent.property(token.index);
      if (indexed && he_U_EX_tokenMatchesCandidate(token, indexed)) {
        he_U_EX_pushUnique(matches, indexed);
      }
    } catch (_) {}
  }

  for (var i = 1; i <= total; i++) {
    var child = null;
    try { child = parent.property(i); } catch (_) { child = null; }
    if (!child) continue;
    if (he_U_EX_tokenMatchesCandidate(token, child)) {
      he_U_EX_pushUnique(matches, child);
    }
  }

  return matches;
}

function he_U_EX_findPropertiesByPath(comp, pathString) {
  var resolved = [];
  try {
    if (!comp || !(comp instanceof CompItem)) return resolved;
  } catch (e) {
    return resolved;
  }

  if (!pathString) return resolved;

  var rawParts = pathString.split(" > ");
  if (!rawParts || rawParts.length < 2) return resolved;

  var tokens = [];
  for (var t = 0; t < rawParts.length; t++) {
    tokens.push(he_U_EX_parsePathToken(rawParts[t]));
  }

  var current = he_U_EX_collectMatchingLayers(comp, tokens[0]);
  if (!current.length) return resolved;

  for (var p = 1; p < tokens.length; p++) {
    var token = tokens[p];
    var nextLevel = [];
    for (var c = 0; c < current.length; c++) {
      var node = current[c];
      var matches = he_U_EX_collectMatchingChildren(node, token);
      for (var m = 0; m < matches.length; m++) {
        he_U_EX_pushUnique(nextLevel, matches[m]);
      }
    }
    current = nextLevel;
    if (!current.length) break;
  }

  for (var r = 0; r < current.length; r++) {
    he_U_EX_pushUnique(resolved, current[r]);
  }

  return resolved;
}

function cy_deleteExpressions() {
  var result = {
    ok: false,
    selectionType: "",
    clearedProperties: 0,
    clearedLayers: 0,
    layers: [],
    errors: [],
    hadErrors: false,
    toastMessage: "",
    consoleMessage: ""
  };
  var undoOpen = false;
  var layerStates = [];
  var visibilityRestored = false;

  function findLayerForNode(node) {
    if (!node) return null;

    try {
      if (node instanceof AVLayer) return node;
    } catch (_) {}

    var depth = 0;
    try { depth = node.propertyDepth || 0; } catch (_) { depth = 0; }

    for (var d = depth; d >= 1; d--) {
      var owner = null;
      try { owner = node.propertyGroup(d); }
      catch (_) { owner = null; }
      if (!owner) continue;

      try {
        if (owner instanceof AVLayer) return owner;
      } catch (_) {}

      try {
        if (typeof owner.enabled !== "undefined" && typeof owner.index === "number") return owner;
      } catch (_) {}
    }

    return null;
  }

  function trackLayerState(layer) {
    if (!layer) return;
    for (var i = 0; i < layerStates.length; i++) {
      if (layerStates[i].layer === layer) return;
    }

    var canToggle = false;
    var wasEnabled = false;
    try {
      if (typeof layer.enabled !== "undefined") {
        wasEnabled = (layer.enabled === true);
        canToggle = true;
      }
    } catch (_) {
      canToggle = false;
    }

    layerStates.push({ layer: layer, canToggle: canToggle, wasEnabled: wasEnabled });
  }

  function enableTrackedLayers() {
    for (var i = 0; i < layerStates.length; i++) {
      var state = layerStates[i];
      if (!state || !state.canToggle) continue;
      try { state.layer.enabled = true; }
      catch (_) {}
    }
  }

  function restoreLayerVisibility() {
    if (visibilityRestored) return;
    visibilityRestored = true;
    for (var i = 0; i < layerStates.length; i++) {
      var state = layerStates[i];
      if (!state || !state.canToggle) continue;
      try { state.layer.enabled = state.wasEnabled; }
      catch (_) {}
    }
  }

  function trackLayer(target, map) {
    if (!target || !map) return;
    var key = "";
    try {
      if (target.id) key = "id:" + String(target.id);
    } catch (_) { key = ""; }
    if (!key) {
      var idx = "";
      var nm = "";
      try { idx = (typeof target.index === "number") ? String(target.index) : ""; } catch (_) { idx = ""; }
      try { nm = target.name || ""; } catch (_) { nm = ""; }
      if (idx || nm) {
        key = idx + "::" + nm;
      }
    }
    if (!key) {
      var counter = map.__anonCount || 0;
      key = "layer_" + counter;
      map.__anonCount = counter + 1;
    }
    if (!map[key]) {
      map[key] = target;
    }
  }

  function propertyBelongsToLayer(prop, layer) {
    if (!prop || !layer) return false;

    if (prop === layer) return true;

    var depth = 0;
    try { depth = prop.propertyDepth || 0; } catch (_) { depth = 0; }

    for (var step = depth; step >= 1; step--) {
      var owner = null;
      try { owner = prop.propertyGroup(step); }
      catch (_) { owner = null; }
      if (!owner) continue;

      if (owner === layer) return true;

      try {
        if (layer.id && owner.id && owner.id === layer.id) return true;
      } catch (_) {}

      try {
        if (owner.index === layer.index && owner.name === layer.name) return true;
      } catch (_) {}
    }

    var parent = null;
    try { parent = prop.parentProperty; }
    catch (_) { parent = null; }

    if (parent && parent !== prop) {
      return propertyBelongsToLayer(parent, layer);
    }

    return false;
  }

  function trackLayerFromProperty(prop, map) {
    if (!prop || !map) return;
    var owner = null;
    try { owner = prop.propertyGroup(prop.propertyDepth); }
    catch (_) { owner = null; }
    if (!owner) {
      try { owner = prop.propertyGroup(prop.propertyDepth - 1); }
      catch (_) { owner = null; }
    }
    if (owner) trackLayer(owner, map);
    if (owner) trackLayerState(owner);
  }

  function disableExpressionOnProperty(prop, state, layerMap) {
    if (!prop) return false;

    var canExpr = false;
    try { canExpr = (prop.canSetExpression === true); } catch (_) { canExpr = false; }
    if (!canExpr) return false;

    if (typeof he_U_PB_isPhantomLayerStyleProp === "function" && he_U_PB_isPhantomLayerStyleProp(prop)) return false;
    if (typeof he_U_Ls_1_isLayerStyleProp === "function" &&
        typeof he_U_Ls_2_styleEnabledForLeaf === "function" &&
        he_U_Ls_1_isLayerStyleProp(prop) && !he_U_Ls_2_styleEnabledForLeaf(prop)) {
      return false;
    }
    // NOTE: he_U_VS_isTrulyHidden is intentionally NOT called here.
    // For delete operations we want to clear expressions from hidden/disabled layers
    // too. The owning layer is pre-enabled by enableTrackedLayers() before traversal,
    // and the try/catch below already handles any AE errors gracefully.

    var hadExpr = false;
    var exprStr = "";
    try { exprStr = prop.expression; } catch (_) { exprStr = ""; }
    if (exprStr && String(exprStr).length) {
      hadExpr = true;
    }

    var wasEnabled = false;
    try { wasEnabled = (prop.expressionEnabled === true); } catch (_) { wasEnabled = false; }

    try {
      prop.expression = "";
      try { prop.expressionEnabled = false; } catch (_) {}
      if (state && (hadExpr || wasEnabled)) state.clearedProperties++;
      if (layerMap && (hadExpr || wasEnabled)) trackLayerFromProperty(prop, layerMap);
      return hadExpr || wasEnabled;
    } catch (clearErr) {
      var path = "";
      if (typeof he_P_MM_getExprPath === "function") {
        try { path = he_P_MM_getExprPath(prop); } catch (_) { path = ""; }
      }
      if (!path) {
        try { path = prop.name || ""; } catch (_) { path = ""; }
      }
      if (state && state.errors) {
        state.errors.push({ path: path, err: String(clearErr) });
      }
      return false;
    }
  }

  try {
    if (!app.project) {
      result.err = "No project";
      return JSON.stringify(result);
    }

    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
      result.err = "No active comp";
      result.toastMessage = "Open a comp and select properties or layers";
      return JSON.stringify(result);
    }
    // ============================================================
    // 🧪 V1 – PHASE 1 MINIMAL FUNCTIONAL DELETE (NO COLLECTOR)
    // Clears expressions by traversing selection roots directly.
    // ============================================================

    var layerMap = {};

    // 💡 CHECKER: prefer explicit property/group selection if present
    var selectedProps = null;
    try { selectedProps = comp.selectedProperties; } catch (_) { selectedProps = null; }

    var selectedLayers = null;
    try { selectedLayers = comp.selectedLayers; } catch (_) { selectedLayers = null; }

    var roots = [];
    if (selectedProps && selectedProps.length) {
      result.selectionType = "properties";
      roots = selectedProps;
    } else if (selectedLayers && selectedLayers.length) {
      result.selectionType = "layers";
      roots = selectedLayers;
    } else {
      result.err = "No selected properties or layers";
      result.toastMessage = "Select properties or layers to delete expressions";
      return JSON.stringify(result);
    }

    app.beginUndoGroup("Holy Delete Expressions");
    undoOpen = true;

    // 💡 CHECKER: enable only the owning layers for selection roots (safety for hidden/disabled layers)

 // NOTE: avoid name collision with existing functions
    var __layersToEnable = [];

    function __hasLayer(arr, layer) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] === layer) return true;
      }
      return false;
    }


    for (var rr = 0; rr < roots.length; rr++) {
      var rootNode = roots[rr];
      if (!rootNode) continue;

      var ownerLayer = null;
      try {
        if (rootNode instanceof AVLayer) ownerLayer = rootNode;
      } catch (_) {
        ownerLayer = null;
      }
      if (!ownerLayer) ownerLayer = findLayerForNode(rootNode);
      // Heuristic fallback: when instanceof fails and propertyDepth=0 (bare layer object),
      // findLayerForNode returns null. Check for layer-like properties directly.
      if (!ownerLayer) {
        try {
          if (typeof rootNode.index === "number" && typeof rootNode.enabled !== "undefined") {
            ownerLayer = rootNode;
          }
        } catch (_) {}
      }

      if (ownerLayer && !__hasLayer(__layersToEnable, ownerLayer)) {
        __layersToEnable.push(ownerLayer);
        trackLayerState(ownerLayer);
      }
    }

    enableTrackedLayers();

    // 💡 CHECKER: depth-first traversal; clear expressions on leaf props only
    function traverseNode(node) {
      if (!node) return;

      // Try clear on this node if it's an expression-capable property
      try {
        if (node.canSetExpression === true) {
          disableExpressionOnProperty(node, result, layerMap);
        }
      } catch (_) {}

      // Recurse if node is a group/container
      var childCount = 0;
      try { childCount = node.numProperties || 0; } catch (_) { childCount = 0; }
      if (!childCount) return;

      for (var ci = 1; ci <= childCount; ci++) {
        var child = null;
        try { child = node.property(ci); } catch (_) { child = null; }
        if (child) traverseNode(child);
      }
    }

    for (var r0 = 0; r0 < roots.length; r0++) {
      traverseNode(roots[r0]);
    }

    // 💡 CHECKER: compute affected layers from layerMap (ignore internal counter key)
    var affected = 0;
    for (var k in layerMap) {
      if (!layerMap.hasOwnProperty(k)) continue;
      if (k === "__anonCount") continue;
      affected++;
    }
    result.clearedLayers = affected;

    // 💡 CHECKER: mark error state if any per-property errors were recorded
if (result.errors && result.errors.length) { result.hadErrors = true; }

    result.ok = true;
    result.toastMessage = "✅ Deleted expressions from selection";
    result.consoleMessage = "Delete expressions complete. Cleared props: " + result.clearedProperties;
    return JSON.stringify(result);

  } catch (e) {
    result.err = String(e);
    result.toastMessage = "Delete expressions failed";
    return JSON.stringify(result);
  } finally {
    try { restoreLayerVisibility(); } catch (_) {}
    if (undoOpen) {
      try { app.endUndoGroup(); } catch (_) {}
    }
  }
}

function NEW_forCustomer_showDialog(logText) {
  logText = decodeURIComponent(logText || "");

  var w = new Window("dialog", "History Log", undefined, { resizeable: true });
  w.orientation = "column";

  var txt = w.add("edittext", undefined, logText, {
    multiline: true,
    scrolling: true
  });

  txt.alignment = ["fill", "fill"];
  txt.minimumSize = [400, 200];

  var g = w.add("group");
  g.alignment = "right";
  var closeBtn = g.add("button", undefined, "Close");

  w.onResizing = w.onResize = function () {
    txt.size = [w.size[0] - 40, w.size[1] - 80];
  };

  closeBtn.onClick = function () {
    w.close();
  };

  w.show();
}

try {
  logToPanel("✅ host_UTILS.jsx Loaded ⛓️");
  var NEW_log_event_utils = new CSXSEvent();
  NEW_log_event_utils.type = "com.holyexpressor.NEW_log_event";
  NEW_log_event_utils.data = "✅ host_UTILS.jsx Loaded ⛓️";
  NEW_log_event_utils.dispatch();
} catch (e) {}

