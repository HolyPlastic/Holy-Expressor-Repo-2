// ==========================================================
// PickClick Host Controller (Option B)
// ==========================================================

var HE_PICKCLICK_EVENT_RESOLVE = "com.holy.expressor.pickclick.resolve";
var HE_PICKCLICK_EVENT_CANCEL = "com.holy.expressor.pickclick.cancel";
var HE_PICKCLICK_POLL_DELAY = 250;

var he_PC_state = {
  active: false,
  sessionId: "",
  baselineSignature: "",
  taskId: null
};

function he_PC_getSelectionSignature() {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "";

    var props = comp.selectedProperties;
    if (!props || props.length === 0) return "";

    var keys = [];
    for (var i = 0; i < props.length; i++) {
      var prop = props[i];
      if (!prop) continue;

      var parts = [];
      try { parts.push("d" + prop.propertyDepth); } catch (_) {}
      try { parts.push("i" + prop.propertyIndex); } catch (_) {}
      try { parts.push("m" + (prop.matchName || "")); } catch (_) {}
      try { parts.push("n" + (prop.name || "")); } catch (_) {}
      try {
        var layer = prop.propertyGroup(prop.propertyDepth);
        if (layer && typeof layer.index === "number") {
          parts.push("L" + layer.index);
        }
      } catch (_) {}

      keys.push(parts.join(":"));
    }

    keys.sort();
    return keys.join("|");
  } catch (_) {
    return "";
  }
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
    signature: he_PC_getSelectionSignature()
  };
}

function he_PC_dispatch(type, payload) {
  try {
    var evt = new CSXSEvent();
    evt.type = type;
    evt.data = JSON.stringify(payload || {});
    evt.dispatch();
  } catch (_) {}
}

function he_PC_scheduleNext() {
  if (!he_PC_state.active) return;

  if (he_PC_state.taskId) {
    try { app.cancelTask(he_PC_state.taskId); } catch (_) {}
  }

  he_PC_state.taskId = app.scheduleTask("he_PC_poll()", HE_PICKCLICK_POLL_DELAY, false);
}

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
