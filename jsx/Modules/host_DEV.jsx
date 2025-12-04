

/*
// V1 — bridge helper: send logs to DevTools via CSXSEvent
function logToPanel(msg){
  try{
    var e = new CSXSEvent();
    e.type = "com.holyexpressor.log";
    e.data = msg;
    e.dispatch();
  }catch(_){}
}*/

function logToPanel(msg) {
  try {
    var e = new CSXSEvent();
    e.type = "com.holyexpressor.log";
    e.data = encodeURIComponent(msg); // 💡 this line fixes emoji corruption
    e.dispatch();
  } catch (_) {}
}


// LOGGER: simple logger that also pipes back to the panel
function he_U_L_log(msg) {
  try { $.writeln(msg); } catch (e) {}
  // Note: app.setSDKEventMessage is an AE SDK (C++) API, not available in ExtendScript.
}

// ===== Debug Bridge =====
function he_U_L_debugLog(msg) {
    try {
        var evt = new CSXSEvent();
        evt.type = "com.holyexpressor.debug";
        evt.data = msg;
        evt.dispatch();
    } catch (e) {
        $.writeln("Debug dispatch failed: " + e.toString());
    }
}

function he_U_fail(label, err) {
    try {
        $.writeln((label || "Error") + (err ? (": " + err.toString()) : ""));
    } catch (_) {}
}





   // ==========================================================
// 🧪 DEV FUNCTION – expose full raw property info
// ==========================================================

function he_U_DEV_exposeSelectedProps() {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ error: "no active comp" });
    }

    var props = comp.selectedProperties;
    if (!props || props.length === 0) {
      return JSON.stringify({ error: "no selected properties" });
    }

    var dump = [];
    for (var i = 0; i < props.length; i++) {
      var p = props[i];
      var info = {
        name: p.name || "(no name)",
        matchName: p.matchName || "(no matchName)",
        propertyValueType: p.propertyValueType,
        canVaryOverTime: p.canVaryOverTime,
        isModified: p.isModified,
        propertyDepth: p.propertyDepth,
        propertyType: p.propertyType,
        hasExpression: p.canSetExpression ? p.expressionEnabled : false,
        expression: p.expression || "",
        value: (p.value !== undefined ? p.value : "(no value)"),
        numKeys: (p.numKeys || 0)
      };
      dump.push(info);
    }

    $.writeln("[DEV] Exposed " + dump.length + " properties.");
    return JSON.stringify(dump);
  } catch (e) {
    return JSON.stringify({ error: e.toString() });
  }
}


try {
  logToPanel("✅ host_Dev.jsx Loaded ⛓️");
  var NEW_log_event_dev = new CSXSEvent();
  NEW_log_event_dev.type = "com.holyexpressor.NEW_log_event";
  NEW_log_event_dev.data = "✅ host_Dev.jsx Loaded ⛓️";
  NEW_log_event_dev.dispatch();
} catch (e) {}