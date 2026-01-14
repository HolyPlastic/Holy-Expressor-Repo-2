// ==========================================================
// PickClick Host Controller (Option B)
// ==========================================================

// ----------------------------------------------------------
// JSX load confirmation (non-blocking)
// ----------------------------------------------------------
try {
  $.writeln("[JSX LOG] host_PICKCLICK.jsx Loaded ✔");
} catch (_) {}

// ----------------------------------------------------------
// Constants
// ----------------------------------------------------------
var HE_PICKCLICK_EVENT_RESOLVE = "com.holy.expressor.pickclick.resolve";
var HE_PICKCLICK_EVENT_CANCEL  = "com.holy.expressor.pickclick.cancel";
var HE_PICKCLICK_EVENT_DEBUG   = "com.holy.expressor.pickclick.debug";
var HE_PICKCLICK_EVENT_TRACE   = "com.holy.expressor.pickclick.trace";
var HE_PICKCLICK_POLL_DELAY    = 250;

// ----------------------------------------------------------
// 🔌 PlugPlug bootstrap (required for CSXSEvent)
// ----------------------------------------------------------
var he_PC__plugPlugLoaded = false;

function he_PC_ensurePlugPlug() {
  if (he_PC__plugPlugLoaded) return true;

  try {
    if (typeof CSXSEvent !== "undefined") {
      he_PC__plugPlugLoaded = true;
      he_PC_trace("PlugPlug already available");
      return true;
    }
  } catch (_) {}

  try {
    if (typeof ExternalObject !== "undefined") {
      new ExternalObject("lib:PlugPlugExternalObject");
      he_PC__plugPlugLoaded = (typeof CSXSEvent !== "undefined");
      he_PC_trace("PlugPlug load attempted → " + he_PC__plugPlugLoaded);
      return he_PC__plugPlugLoaded;
    }
  } catch (e) {
    he_PC_trace("PlugPlug load failed: " + e);
  }

  return false;
}

// ----------------------------------------------------------
// Internal state
// ----------------------------------------------------------
var he_PC_state = {
  active: false,
  sessionId: "",
  baselineSignature: "",
  taskId: null
};

// ----------------------------------------------------------
// Debug / trace state
// ----------------------------------------------------------
var he_PC_debug = {
  enabled: false,
  tick: 0
};

// ----------------------------------------------------------
// Trace helper (ALWAYS visible in DevTools)
// ----------------------------------------------------------
function he_PC_trace(msg, data) {
  if (!he_PC_ensurePlugPlug()) return;

  try {
    var evt = new CSXSEvent();
    evt.type = HE_PICKCLICK_EVENT_TRACE;
    evt.data = JSON.stringify({
      msg: msg,
      data: data || null,
      sessionId: he_PC_state.sessionId || null,
      active: he_PC_state.active
    });
    evt.dispatch();
  } catch (_) {}
}

// ----------------------------------------------------------
// Signature helpers
// ----------------------------------------------------------
function he_PC_buildSignature(items) {
  if (!items || !(items instanceof Array) || items.length === 0) return "";

  var keys = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var path = it.path || "";
    var picked = it.pickedMatchName || "";
    var leafFlag = it.pickedIsLeaf ? "leaf" : "group";
    keys.push(path + "::" + picked + "::" + leafFlag);
  }

  keys.sort();
  return keys.join("|");
}

function he_PC_getSelectionPayload() {
  var items = [];
  try {
    items = he_U_getSelectedProps();
  } catch (e) {
    he_PC_trace("he_U_getSelectedProps threw", String(e));
    items = [];
  }

  if (!(items instanceof Array)) items = [];

  return {
    items: items,
    signature: he_PC_buildSignature(items)
  };
}

// ----------------------------------------------------------
// Event dispatch
// ----------------------------------------------------------
function he_PC_dispatch(type, payload) {
  if (!he_PC_ensurePlugPlug()) {
    he_PC_trace("dispatch blocked: PlugPlug unavailable", type);
    return false;
  }

  if (typeof CSXSEvent === "undefined") {
    he_PC_trace("dispatch blocked: CSXSEvent undefined", type);
    return false;
  }

  try {
    var evt = new CSXSEvent();
    evt.type = type;
    evt.data = JSON.stringify(payload || {});
    evt.dispatch();
    return true;
  } catch (e) {
    he_PC_trace("dispatch failed", String(e));
    return false;
  }
}

// ----------------------------------------------------------
// Poll scheduling
// ----------------------------------------------------------
function he_PC_scheduleNext() {
  if (!he_PC_state.active) {
    he_PC_trace("scheduleNext aborted: inactive");
    return;
  }

  if (he_PC_state.taskId) {
    try {
      app.cancelTask(he_PC_state.taskId);
      he_PC_trace("previous task cancelled", he_PC_state.taskId);
    } catch (_) {}
  }

  he_PC_trace("scheduling poll task");
  he_PC_state.taskId = app.scheduleTask(
    "$.global.he_PC_poll()",
    HE_PICKCLICK_POLL_DELAY,
    false
  );
}

// ----------------------------------------------------------
// Poll loop
// ----------------------------------------------------------
function he_PC_poll() {
  if (!he_PC_state.active) {
    he_PC_trace("poll entered but inactive");
    return;
  }

  var payload = he_PC_getSelectionPayload();
  var signature = payload.signature;

  if (he_PC_debug.enabled) {
    he_PC_debug.tick++;
    if (he_PC_debug.tick % 4 === 0) {
      he_PC_dispatch(HE_PICKCLICK_EVENT_DEBUG, {
        tick: he_PC_debug.tick,
        signature: signature,
        itemCount: payload.items ? payload.items.length : 0
      });
    }
  }

  if (signature && signature !== he_PC_state.baselineSignature) {
    he_PC_trace("signature changed → resolve", {
      from: he_PC_state.baselineSignature,
      to: signature
    });

    var session = he_PC_state.sessionId;

    he_PC_state.active = false;
    he_PC_state.sessionId = "";
    he_PC_state.baselineSignature = "";
    he_PC_state.taskId = null;

    he_PC_dispatch(HE_PICKCLICK_EVENT_RESOLVE, {
      sessionId: session,
      items: payload.items,
      signature: signature
    });
    return;
  }

  if (signature !== he_PC_state.baselineSignature) {
    he_PC_trace("baseline updated", signature);
    he_PC_state.baselineSignature = signature;
  }

  he_PC_scheduleNext();
}

// Expose poll for scheduler
$.global.he_PC_poll = he_PC_poll;

// ----------------------------------------------------------
// Arm / Cancel
// ----------------------------------------------------------
function he_PC_armPickClick(jsonStr) {
  he_PC_trace("arm called", jsonStr);

  var data = {};
  try {
    if (jsonStr && jsonStr.length) data = JSON.parse(jsonStr);
  } catch (_) {}

  if (he_PC_state.active) {
    he_PC_trace("arm replacing existing session");
    he_PC_cancelPickClick(
      JSON.stringify({ reason: "replaced", sessionId: he_PC_state.sessionId })
    );
  }

  var sessionId = data.sessionId || ("pc-" + (new Date()).getTime());

  he_PC_state.active = true;
  he_PC_state.sessionId = sessionId;
  he_PC_state.baselineSignature = he_PC_getSelectionPayload().signature || "";

  he_PC_debug.enabled = !!data.debug;
  he_PC_debug.tick = 0;

  he_PC_trace("arm complete", {
    sessionId: sessionId,
    baseline: he_PC_state.baselineSignature,
    debug: he_PC_debug.enabled
  });

  he_PC_scheduleNext();

  return JSON.stringify({ ok: true, sessionId: sessionId });
}

function he_PC_cancelPickClick(jsonStr, explicitSession) {
  he_PC_trace("cancel called", jsonStr);

  var data = {};
  try {
    if (jsonStr && jsonStr.length) data = JSON.parse(jsonStr);
  } catch (_) {}

  var sessionId = explicitSession || data.sessionId || he_PC_state.sessionId;
  var reason = data.reason || "cancelled";

  if (he_PC_state.taskId) {
    try { app.cancelTask(he_PC_state.taskId); } catch (_) {}
  }

  if (he_PC_state.active) {
    he_PC_state.active = false;
    he_PC_state.sessionId = "";
    he_PC_state.baselineSignature = "";
    he_PC_state.taskId = null;

    he_PC_dispatch(HE_PICKCLICK_EVENT_CANCEL, {
      sessionId: sessionId,
      reason: reason
    });
  }

  return JSON.stringify({ ok: true, sessionId: sessionId });
}
