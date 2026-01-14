// ==========================================================
// PickClick Host Controller (Option B)
// ==========================================================

var HE_PICKCLICK_EVENT_RESOLVE = "com.holy.expressor.pickclick.resolve";
var HE_PICKCLICK_EVENT_CANCEL = "com.holy.expressor.pickclick.cancel";
var HE_PICKCLICK_POLL_DELAY = 250;

// ----------------------------------------------------------
// 🔌 PlugPlug bootstrap (required for CSXSEvent)
// ----------------------------------------------------------
var he_PC__plugPlugLoaded = false;

function he_PC_ensurePlugPlug() {
  if (he_PC__plugPlugLoaded) return true;

  try {
    // 💡 CHECKER: CSXSEvent exists only when PlugPlugExternalObject is loaded
    if (typeof CSXSEvent !== "undefined") {
      he_PC__plugPlugLoaded = true;
      return true;
    }
  } catch (_) {}

  try {
    // ⚙️ VALIDATOR: load PlugPlugExternalObject (needed to construct CSXSEvent)
    if (typeof ExternalObject !== "undefined") {
      new ExternalObject("lib:PlugPlugExternalObject");
      he_PC__plugPlugLoaded = (typeof CSXSEvent !== "undefined");
      return he_PC__plugPlugLoaded;
    }
  } catch (_) {}

  return false;
}


var he_PC_state = {
  active: false,
  sessionId: "",
  baselineSignature: "",
  taskId: null
};

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
  } catch (_) {
    items = [];
  }

  if (!(items instanceof Array)) items = [];

  return {
    items: items,
    signature: he_PC_buildSignature(items)
  };
}

function he_PC_dispatch(type, payload) {
  // 💡 CHECKER: ensure PlugPlug is available before using CSXSEvent
  if (!he_PC_ensurePlugPlug()) return false;

  try {
    // 🧩 FILTER: only attempt dispatch when constructor is available
    if (typeof CSXSEvent === "undefined") return false;

    var evt = new CSXSEvent();
    evt.type = type;
    evt.data = JSON.stringify(payload || {});
    evt.dispatch();
    return true;
  } catch (_) {
    return false;
  }
}


function he_PC_scheduleNext() {
  if (!he_PC_state.active) return;

  if (he_PC_state.taskId) {
    try { app.cancelTask(he_PC_state.taskId); } catch (_) {}
  }

  he_PC_state.taskId = app.scheduleTask("he_PC_poll()", HE_PICKCLICK_POLL_DELAY, false);
}
0
function he_PC_poll() {
  if (!he_PC_state.active) return;

  var payload = he_PC_getSelectionPayload();
  var signature = payload.signature;

  if (signature && signature !== he_PC_state.baselineSignature) {
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
    he_PC_state.baselineSignature = signature;
  }

  he_PC_scheduleNext();
}

// 💡 CHECKER: expose poll function for app.scheduleTask string execution
$.global.he_PC_poll = he_PC_poll;

function he_PC_armPickClick(jsonStr) {
  var data = {};
  try {
    if (jsonStr && jsonStr.length) {
      data = JSON.parse(jsonStr);
    }
  } catch (_) {
    data = {};
  }

  if (he_PC_state.active) {
    he_PC_cancelPickClick(JSON.stringify({ reason: "replaced", sessionId: he_PC_state.sessionId }));
  }

  var sessionId = (data && data.sessionId) ? data.sessionId : ("pc-" + (new Date()).getTime());

  he_PC_state.active = true;
  he_PC_state.sessionId = sessionId;
  he_PC_state.baselineSignature = he_PC_getSelectionPayload().signature || "";

  he_PC_scheduleNext();

  return JSON.stringify({ ok: true, sessionId: sessionId });
}

function he_PC_cancelPickClick(jsonStr, explicitSession) {
  var data = {};
  try {
    if (jsonStr && jsonStr.length) {
      data = JSON.parse(jsonStr);
    }
  } catch (_) {
    data = {};
  }

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
