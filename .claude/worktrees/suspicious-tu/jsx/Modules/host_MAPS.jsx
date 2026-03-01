


// ====🔷====🗺️🔶♦️===CONSTANTS MAP LISTS ==========================================
//-----🔹~~~~~.
//-----🔶~~~~~.~~~~~.
//-----🔷~~~~~.
//-----♦️~~~~~.~~~~~.~~~~~.
// =======================================================🔷🔷🔷♦️♦️♦️




// PATCH A: Groups we never want in metaPath
var MAPMAKER_SKIP = {
  "ADBE Root Vectors Group": true,
  "ADBE Vector Group": true,
  "ADBE Vector Shape - Group": true
};



var HE_FRIENDLY_MAP = {
  // --- Layer transforms ---
  "ADBE Transform Group": "transform",
  "ADBE Position": "position",
  "ADBE Scale": "scale",
  "ADBE Rotation": "rotation",
  "ADBE Rotate Z": "rotation", // alias
  "ADBE Opacity": "opacity",
  "ADBE Anchor Point": "anchorPoint",

  // --- Shape layer basics ---
  "ADBE Vector Layer": "",
  "ADBE Root Vectors Group": "contents",
  "ADBE Vector Group": "contents",
  "ADBE Vector Transform Group": "transform",


  // --- Shape layer Transofrms ---
  "ADBE Vector Position": "transform.position",
  "ADBE Vector Scale": "transform.scale",
  "ADBE Vector Skew": "transform.skew",
  "ADBE Vector Skew Axis": "transform.skewAxis",
  "ADBE Vector Rotation": "transform.rotation",
  "ADBE Vector Group Opacity": "transform.opacity",
  "ADBE Vector Anchor": "transform.anchorPoint",

  // --- Stroke leaves ---
  "ADBE Vector Stroke Width": "strokeWidth",
  "ADBE Vector Stroke Opacity": "opacity",
  "ADBE Vector Stroke Color": "color",

  // Stroke taper
  "ADBE Vector Stroke Taper": "taper",
  "ADBE Vector Taper Start Length": "taper.startLength",
  "ADBE Vector Taper End Length": "taper.endLength",
  "ADBE Vector Taper Start Width": "taper.startWidth",
  "ADBE Vector Taper End Width": "taper.endWidth",
  "ADBE Vector Taper Start Ease": "taper.startEase",
  "ADBE Vector Taper End Ease": "taper.endEase",
  "ADBE Vector Taper Length Units": "taper.lengthUnits",

  // Stroke wave
  "ADBE Vector Stroke Wave": "taperWave",
  "ADBE Vector Taper Wave Amount": "taperWave.amount",
  "ADBE Vector Taper Wave Units": "taperWave.units",
  "ADBE Vector Taper Wave Phase": "taperWave.phase",
  "ADBE Vector Taper Wavelength": "taperWave.wavelength",

  // --- Fill leaves ---
  "ADBE Vector Fill Color": "color",

  // --- Trim Paths leaves (group is name-only) ---
  "ADBE Vector Trim Start": "start",
  "ADBE Vector Trim End": "end",
  "ADBE Vector Trim Offset": "offset",

  // --- Round Corners leaves (group is name-only) ---
  "ADBE Vector RoundCorner Radius": "radius",

  // --- Path leaf (group is name-only) ---
  "ADBE Vector Shape": "path",

  // --- Offset Paths ---

  "ADBE Vector Offset Amount": "amount",
  "ADBE Vector Offset Joins": "joins",
  "ADBE Vector Offset Miter Limit": "miterLimit",

  // --- Zig Zag ---
 
  "ADBE Vector Zigzag Size": "zigZag.size",
  "ADBE Vector Zigzag RidgesPerSeg": "zigZag.ridgesPerSeg",
  "ADBE Vector Zigzag Points": "zigZag.points",
  "ADBE Vector Zigzag Rotation": "zigZag.rotation",

  // --- Repeater ---
 
  "ADBE Vector Repeater Copies": "repeater.copies",
  "ADBE Vector Repeater Offset": "repeater.offset",
  "ADBE Vector Repeater Transform": "repeater.transform",
  "ADBE Vector Repeater Position": "repeater.transform.position",
  "ADBE Vector Repeater Scale": "repeater.transform.scale",
  "ADBE Vector Repeater Rotation": "repeater.transform.rotation",
  "ADBE Vector Repeater Opacity": "repeater.transform.opacity",
  "ADBE Vector Repeater Start Opacity": "repeater.transform.startOpacity",
  "ADBE Vector Repeater End Opacity": "repeater.transform.endOpacity",

  // --- Stroke Dashes ---
  "ADBE Vector Stroke Dashes": "dashes",
  "ADBE Vector Stroke Dash 1": "dashes[0]",
  "ADBE Vector Stroke Gap 1": "gaps[0]",
  "ADBE Vector Stroke Offset": "dashes.offset",


  // --- Layer Styles (Drop Shadow) ---
  "ADBE Layer Styles": "layerStyle",
  "ADBE Drop Shadow": "dropShadow",
  "ADBE Drop Shadow Opacity": "dropShadow.opacity",
  "ADBE Drop Shadow Color": "dropShadow.color",
  "ADBE Drop Shadow Distance": "dropShadow.distance",
  "ADBE Drop Shadow Size": "dropShadow.size",
  "ADBE Drop Shadow Spread": "dropShadow.spread",
  "ADBE Drop Shadow Noise": "dropShadow.noise",
  "dropShadow/blur": "dropShadow.size",   // oddball slash style

  // --- Inner Shadow ---
  "ADBE Inner Shadow": "innerShadow",
  "ADBE Inner Shadow Color": "innerShadow.color",
  "ADBE Inner Shadow Opacity": "innerShadow.opacity",
  "ADBE Inner Shadow Distance": "innerShadow.distance",
  "ADBE Inner Shadow Size": "innerShadow.size",
  "ADBE Inner Shadow Spread": "innerShadow.spread",
  "ADBE Inner Shadow Noise": "innerShadow.noise",

  // --- Outer Glow ---
  "ADBE Outer Glow": "outerGlow",
  "ADBE Outer Glow Color": "outerGlow.color",
  "ADBE Outer Glow Opacity": "outerGlow.opacity",
  "ADBE Outer Glow Size": "outerGlow.size",
  "ADBE Outer Glow Spread": "outerGlow.spread",
  "ADBE Outer Glow Range": "outerGlow.range",
  "ADBE Outer Glow Noise": "outerGlow.noise",

  // --- Inner Glow ---
  "ADBE Inner Glow": "innerGlow",
  "ADBE Inner Glow Color": "innerGlow.color",
  "ADBE Inner Glow Opacity": "innerGlow.opacity",
  "ADBE Inner Glow Size": "innerGlow.size",
  "ADBE Inner Glow Spread": "innerGlow.spread",
  "ADBE Inner Glow Range": "innerGlow.range",
  "ADBE Inner Glow Noise": "innerGlow.noise",

  // --- Bevel and Emboss ---
  "ADBE Bevel and Emboss": "bevelEmboss",
  "ADBE Bevel Style": "bevelEmboss.style",
  "ADBE Bevel Direction": "bevelEmboss.direction",
  "ADBE Bevel Depth": "bevelEmboss.depth",
  "ADBE Bevel Size": "bevelEmboss.size",
  "ADBE Bevel Angle": "bevelEmboss.angle",
  "ADBE Bevel Altitude": "bevelEmboss.altitude",
  "ADBE Bevel Highlight Color": "bevelEmboss.highlightColor",
  "ADBE Bevel Highlight Opacity": "bevelEmboss.highlightOpacity",
  "ADBE Bevel Shadow Color": "bevelEmboss.shadowColor",
  "ADBE Bevel Shadow Opacity": "bevelEmboss.shadowOpacity",

  // --- Satin ---
  "ADBE Satin": "satin",
  "ADBE Satin Color": "satin.color",
  "ADBE Satin Opacity": "satin.opacity",
  "ADBE Satin Angle": "satin.angle",
  "ADBE Satin Distance": "satin.distance",
  "ADBE Satin Size": "satin.size",
  "ADBE Satin Invert": "satin.invert",

  // --- Misc oddballs ---
  "frameFX/size": "layerStyle.frameFX.size"
};





// =======================================================
// 🪄 Auto-derived helper maps
// =======================================================

var HE_GROUP_ALIASES = {};

// V9.8 – Explicit leaf aliases for clean endings (no redundant group tokens)
var HE_LEAF_ALIASES = {
  // Path leaf
  "ADBE Vector Shape": ".path",

  // Stroke leaves
  "ADBE Vector Stroke Width": ".strokeWidth",
  "ADBE Vector Stroke Opacity": ".strokeOpacity",
  "ADBE Vector Stroke Color": ".strokeColor",

  // Fill leaves
  "ADBE Vector Fill Opacity": ".fillOpacity",
  "ADBE Vector Fill Color": ".fillColor",

  // Trim Paths leaves
  "ADBE Vector Trim Start": ".start",
  "ADBE Vector Trim End": ".end",
  "ADBE Vector Trim Offset": ".offset",

  // Round Corners
  "ADBE Vector RoundCorner Radius": ".radius",

  // Offset Paths
  "ADBE Vector Offset Amount": ".amount",

  // Zig Zag (examples — adjust to match your AE keys)
  "ADBE Vector Zigzag Size": ".size",
  "ADBE Vector Zigzag Detail": ".detail"
};




// Sentinel markers
var HE_SENTINEL_NO_EXPR   = "__NO_EXPRESSION__";
var HE_SENTINEL_NO_SELECT = "__NO_SELECTION__";




var HE_STRUCTURAL_MATCHNAMES = {
    "ADBE Root Vectors Group": 1,        // layer Contents
    "ADBE Vectors Group": 1,             // elided group contents
    "ADBE Vector Group": 1,              // visible group container
    "ADBE Transform Group": 1,           // layer Transform
    "ADBE Vector Transform Group": 1     // shape Transform container
};




var HE_SHAPE_CONTAINER_MATCHNAMES = (function () {
    var map = {};
    for (var key in HE_STRUCTURAL_MATCHNAMES) {
        if (HE_STRUCTURAL_MATCHNAMES.hasOwnProperty(key)) {
            map[key] = 1;
        }
    }
    var extras = [
        "ADBE Vector Graphic - Stroke",
        "ADBE Vector Graphic - Fill",
        "ADBE Vector Graphic - G-Stroke",
        "ADBE Vector Graphic - G-Fill",
        "ADBE Vector Filter - Trim",
        "ADBE Vector Filter - RC",
        "ADBE Vector Filter - Offset",
        "ADBE Vector Filter - Repeater",
        "ADBE Vector Stroke Dashes",
        "ADBE Vector Filter - Taper",
        "ADBE Vector Stroke Taper",
        "ADBE Vector Shape - Group",
        "ADBE Vector Filter - Zigzag"
    ];
    for (var ei = 0; ei < extras.length; ei++) {
        map[extras[ei]] = 1;
    }
    return map;
})

try {
    logToPanel("✅ host_MAPS.jsx Loaded ⛓️");
    var NEW_log_event_maps = new CSXSEvent();
    NEW_log_event_maps.type = "com.holyexpressor.NEW_log_event";
    NEW_log_event_maps.data = "✅ host_MAPS.jsx Loaded ⛓️";
    NEW_log_event_maps.dispatch();
} catch (e) {}

