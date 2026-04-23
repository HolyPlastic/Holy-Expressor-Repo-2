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
// Max-tick cap — complements frontend 10s setTimeout in main_PICKCLICK.js.
// 40 ticks * 250ms = 10s. Catches cases where the CEP listener is silent or
// the app loses focus, so polling can't loop indefinitely on its own.
var HE_PICKCLICK_MAX_POLL_TICKS = 40;

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
  baselineSignature: "",      // deep signature baseline (expr path string)
  baselineCoarseSig: "",      // coarse signature baseline (cheap selection key)
  taskId: null,
  pollTicks: 0                // tick counter for HE_PICKCLICK_MAX_POLL_TICKS guard
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

// ----------------------------------------------------------
// V1 – Class 5: COARSE SELECTION SIGNATURE (cheap, deterministic)
// ----------------------------------------------------------
function he_PC_getCoarseSignature() {
  // 💡 CHECKER: MUST NOT throw; MUST be cheap; MUST change when user clicks a different prop (usually)
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "NO_COMP";

    var props = null;
    try { props = comp.selectedProperties; } catch (_) { props = null; }
    var propCount = (props && props.length) ? props.length : 0;

    var layers = null;
    try { layers = comp.selectedLayers; } catch (_) { layers = null; }
    var layerCount = (layers && layers.length) ? layers.length : 0;

    // Build a small fingerprint for up to first 3 selected props.
    // This avoids deep path building but usually changes as the clicked prop changes.
    var bits = [];
    bits.push("L" + layerCount);
    bits.push("P" + propCount);

    var limit = propCount > 3 ? 3 : propCount;
    for (var i = 0; i < limit; i++) {
      var p = props[i];
      if (!p) { bits.push("N"); continue; }

      var mm = "";
      var nm = "";
      var idx = "";
      var depth = "";
      try { mm = p.matchName || ""; } catch (_) { mm = ""; }
      try { nm = p.name || ""; } catch (_) { nm = ""; }
      try { idx = String(p.propertyIndex); } catch (_) { idx = ""; }
      try { depth = String(p.propertyDepth); } catch (_) { depth = ""; }

      // Attempt to include owning layer index if resolvable (helps distinguish same-named props across layers)
      var layerIndex = "";
      try {
        if (depth && Number(depth) > 0) {
          var layer = p.propertyGroup(Number(depth));
          if (layer && typeof layer.index !== "undefined") layerIndex = String(layer.index);
        }
      } catch (_) { layerIndex = ""; }

      bits.push(layerIndex + ":" + mm + ":" + nm + ":" + idx + ":" + depth);
    }

    return bits.join("|");
  } catch (_) {
    return "COARSE_ERR";
  }
}

// ----------------------------------------------------------
// V1 – NEW: Simple single-leaf property snapshot for PickClick
// Name required by directive: he_PICK_LeafProp_Snapshot()
// ----------------------------------------------------------
function he_PICK_LeafProp_Snapshot() {
  // 💡 CHECKER: snapshot ONLY; no polling; never throws
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return { ok: false, reason: "No active comp", prop: null, expr: "" };
    }

    var props = comp.selectedProperties;
    if (!props || !props.length) {
      return { ok: false, reason: "No selection", prop: null, expr: "" };
    }

    // Filter to actual leaf properties only
    var leafProps = [];
    for (var i = 0; i < props.length; i++) {
      try {
        if (props[i] && props[i].propertyType === PropertyType.PROPERTY) {
          leafProps.push(props[i]);
        }
      } catch (_) {}
    }

    if (leafProps.length === 0) {
      var promoted = he_promoteExprControlToLeaf(props);
      if (promoted) leafProps.push(promoted);
    }

    if (leafProps.length !== 1) {
      return { ok: false, reason: "Select exactly one leaf property", prop: null, expr: "" };
    }

    var leaf = leafProps[0];
    if (!leaf || leaf.propertyType !== PropertyType.PROPERTY) {
      return { ok: false, reason: "Unsupported selection (container)", prop: null, expr: "" };
    }

    // Match he_GET_SelPath_Simple guard: only allow expression-accessible props
    try {
      if (leaf.canSetExpression === false) {
        return { ok: false, reason: "Unsupported property (no expression access)", prop: null, expr: "" };
      }
    } catch (_) {}

    // Build deterministic expression path using existing proven builder (no duplication)
    var exprPath = "";
    try {
      var built = he_GET_SelPath_Simple(false);
      var parsed = built && built.length ? JSON.parse(built) : null;
      if (parsed && parsed.ok && parsed.expr) exprPath = String(parsed.expr);
    } catch (_) { exprPath = ""; }

    // Fallback: breadcrumb path for properties not yet covered by the formal builder
    // (Layer Styles, Light layer options, etc.)
    // path is used only as a unique dedup key in loadExpressionFromSelectionItems,
    // not as AE expression syntax, so any stable non-empty unique string is fine.
    if (!exprPath) {
      try {
        var fbDepth = 0;
        try { fbDepth = leaf.propertyDepth; } catch (_) {}
        if (fbDepth > 0) {
          var fbParts = [];
          var fbLayer = null;
          try { fbLayer = leaf.propertyGroup(fbDepth); } catch (_) {}
          if (fbLayer && fbLayer.name) fbParts.push(fbLayer.name);
          for (var fd = fbDepth - 1; fd >= 1; fd--) {
            var fbGroup = null;
            try { fbGroup = leaf.propertyGroup(fd); } catch (_) {}
            if (fbGroup && fbGroup.name) fbParts.push(fbGroup.name);
          }
          var fbLeafName = "";
          try { fbLeafName = leaf.name || leaf.matchName || ""; } catch (_) {}
          if (fbLeafName) fbParts.push(fbLeafName);
          if (fbParts.length > 0) exprPath = fbParts.join(" > ");
        }
      } catch (_) {}
    }

    if (!exprPath) {
      return { ok: false, reason: "Unable to build expression path", prop: leaf, expr: "" };
    }

    return { ok: true, reason: null, prop: leaf, expr: exprPath };
  } catch (e) {
    return { ok: false, reason: "Exception: " + String(e), prop: null, expr: "" };
  }
}

function he_PC_getSelectionPayload() {
  // 💡 CHECKER: NO he_U_getSelectedProps dependency (removed); use new simple snapshot
  var items = [];

  var snap = he_PICK_LeafProp_Snapshot();
  if (snap && snap.ok) {
    var leaf = snap.prop;
    var exprPath = snap.expr;

    var exprText = "__NO_EXPRESSION__";
    try {
      // expression may exist even if disabled; treat empty as no expression
      var raw = leaf.expression;
      if (raw !== null && typeof raw !== "undefined" && String(raw).length) {
        exprText = String(raw);
      }
    } catch (_) {
      exprText = "__NO_EXPRESSION__";
    }

    var mm = "";
    var nm = "";
    try { mm = leaf.matchName || ""; } catch (_) { mm = ""; }
    try { nm = leaf.name || ""; } catch (_) { nm = ""; }

    items.push({
      // Required by loadExpressionFromSelectionItems() (CEP)
      path: exprPath,
      expr: exprText,
      matchName: mm,
      displayName: nm,

      // Hints used by CEP dedupe / preference
      pickedIsLeaf: true,
      pickedMatchName: mm,

      // Classification optional; leave blank to avoid wrong ShapePath heuristics
      classification: ""
    });
  }

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
    // V1 – T1 diagnostic: relay dispatch activity to CEP
    // 💡 CHECKER: confirms host dispatch executes and reaches CEP
    if (type !== "trace") {
        try {
            var diag = {
                source: "HOST",
                phase: "T1_DISPATCH",
                eventType: type,
                timestamp: Date.now()
            };
            var diagEvt = new CSXSEvent();
            diagEvt.type = "com.holy.expressor.pickclick.trace";
            diagEvt.data = JSON.stringify(diag);
            diagEvt.dispatch();
        } catch (e) {
            // swallow – diagnostics must never break logic
        }
    }

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

  // Max-tick cap — complements frontend 10s setTimeout. If the CEP listener
  // is silent or the app loses focus, the frontend may not deliver cancel;
  // this guard stops the schedule chain on the backend side. Also closes the
  // "unsupported property type → indefinite poll" hole documented in
  // Docs/features/05-pickclick.md (bug 2, Hybrid polling non-termination).
  he_PC_state.pollTicks = (he_PC_state.pollTicks || 0) + 1;
  if (he_PC_state.pollTicks >= HE_PICKCLICK_MAX_POLL_TICKS) {
    he_PC_trace("backend-timeout: MAX_POLL_TICKS reached", {
      ticks: he_PC_state.pollTicks,
      cap:   HE_PICKCLICK_MAX_POLL_TICKS
    });

    var timeoutSession = he_PC_state.sessionId;

    he_PC_state.active            = false;
    he_PC_state.sessionId         = "";
    he_PC_state.baselineSignature = "";
    he_PC_state.baselineCoarseSig = "";
    he_PC_state.taskId            = null;
    he_PC_state.pollTicks         = 0;

    he_PC_dispatch(HE_PICKCLICK_EVENT_CANCEL, {
      sessionId: timeoutSession,
      reason:    "backend-timeout"
    });
    // Do NOT call scheduleNext — chain stops here.
    return;
  }

  // ----------------------------------------------------------
  // V1 – Class 5 HYBRID:
  // 1) compute coarse signature cheaply
  // 2) only do deep snapshot when coarse changes
  // ----------------------------------------------------------
  var coarseSig = he_PC_getCoarseSignature();
  var shouldDeep = (coarseSig !== he_PC_state.baselineCoarseSig);

  var payload = null;
  var signature = "";
  if (shouldDeep) {
    payload = he_PC_getSelectionPayload();
    signature = payload.signature || "";
  }

  if (he_PC_debug.enabled) {
    he_PC_debug.tick++;
    if (he_PC_debug.tick % 4 === 0) {
      he_PC_dispatch(HE_PICKCLICK_EVENT_DEBUG, {
        tick: he_PC_debug.tick,
        signature: signature,
        itemCount: (payload && payload.items) ? payload.items.length : 0
      });
    }
  }

  // Update coarse baseline when it changes (even if deep snapshot invalid)
  if (shouldDeep) {
    he_PC_state.baselineCoarseSig = coarseSig;
  }

  // Resolve only when deep signature becomes valid and differs from baseline
  if (signature && signature !== he_PC_state.baselineSignature) {
    he_PC_trace("signature changed → resolve", {
      from: he_PC_state.baselineSignature,
      to: signature
    });

    var session = he_PC_state.sessionId;

    he_PC_state.active = false;
    he_PC_state.sessionId = "";
    he_PC_state.baselineSignature = "";
    he_PC_state.baselineCoarseSig = "";
    he_PC_state.taskId = null;
    he_PC_state.pollTicks = 0;

    he_PC_dispatch(HE_PICKCLICK_EVENT_RESOLVE, {
      sessionId: session,
      items: payload && payload.items ? payload.items : [],
      signature: signature
    });
    return;
  }

  // If we performed a deep snapshot, keep the deep baseline in sync
  if (shouldDeep && signature !== he_PC_state.baselineSignature) {
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
  // V1 – Class 5: initialize baselines from current context
  he_PC_state.baselineCoarseSig = he_PC_getCoarseSignature();
  he_PC_state.baselineSignature = he_PC_getSelectionPayload().signature || "";
  he_PC_state.pollTicks = 0;

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
    he_PC_state.pollTicks = 0;

    he_PC_dispatch(HE_PICKCLICK_EVENT_CANCEL, {
      sessionId: sessionId,
      reason: reason
    });
  }

  return JSON.stringify({ ok: true, sessionId: sessionId });
}
