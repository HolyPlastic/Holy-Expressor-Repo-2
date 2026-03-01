if (typeof Holy !== "object") Holy = {};

(function () {
  "use strict";

  var cs = new CSInterface();
  // ----------------------------------------------------------
// PickClick TRACE listener (host → CEP diagnostics)
// ----------------------------------------------------------
cs.addEventListener(
  "com.holy.expressor.pickclick.trace",
  function (event) {
    // V1 – Observability hardening: event.data may already be an object in some CEP builds
    // 💡 CHECKER: never throw; preserve raw when parsing fails
    var data = null;
    try {
      if (event && typeof event.data === "object") {
        data = event.data;
      } else if (event && typeof event.data === "string" && event.data.length) {
        data = JSON.parse(event.data);
      }
    } catch (_) {
      data = null;
    }
    console.log("[Holy.PICKCLICK][trace]", data || (event ? event.data : null));
  }
);


  var EVENT_RESOLVE = "com.holy.expressor.pickclick.resolve";
  var EVENT_CANCEL = "com.holy.expressor.pickclick.cancel";

  var active = false;
  var sessionId = "";
  var resolveHandler = null;
  var cancelHandler = null;
  var resolveListener = null;
  var cancelListener = null;
  var veilEl = null;
  var veilListenerBound = false;

  function getVeilEl() {
    if (!veilEl) {
      veilEl = document.getElementById("pickClickVeil");
    }
    return veilEl;
  }

  function setVeilActive(isActive) {
    var el = getVeilEl();
    if (!el) return;
    el.classList.toggle("is-active", !!isActive);
  }

  function ensureVeilListener() {
    if (veilListenerBound) return;
    var el = getVeilEl();
    if (!el) return;

    el.addEventListener("click", function () {
      if (!active) return;
      cancelPickClick("veil");
    });

    veilListenerBound = true;
  }

  function escapeForEvalScript(text) {
    // 💡 CHECKER: evalScript string boundary protection
    // - Always escape backslashes first
    // - Escape double quotes because we wrap the payload in "..."
    // - Escape single quotes defensively (some callers may wrap in '...')
    // - Normalize newlines to avoid accidental multiline JSX strings
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, "\\\"")
      .replace(/'/g, "\\'")
      .replace(/\r?\n/g, "\\n");
  }

  function parseEventData(event) {
    if (!event || typeof event.data === "undefined") return null;
    if (typeof event.data === "object") return event.data;
    if (typeof event.data === "string" && event.data.length) {
      try {
        return JSON.parse(event.data);
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  function removeListeners() {
    if (cs && typeof cs.removeEventListener === "function") {
      if (resolveListener) cs.removeEventListener(EVENT_RESOLVE, resolveListener);
      if (cancelListener) cs.removeEventListener(EVENT_CANCEL, cancelListener);
    }
    resolveListener = null;
    cancelListener = null;
  }

  function resetState() {
    active = false;
    sessionId = "";
    resolveHandler = null;
    cancelHandler = null;
    setVeilActive(false);
    removeListeners();
  }

  function cancelPickClick(reason) {
    if (!active) return;

    var payload = {
      sessionId: sessionId,
      reason: reason || "cancelled"
    };

    var handler = cancelHandler;
    resetState();

    if (cs && typeof cs.evalScript === "function") {
      var encoded = escapeForEvalScript(JSON.stringify(payload));
      cs.evalScript('he_PC_cancelPickClick("' + encoded + '")', function (res) {
        console.log("[Holy.PICKCLICK] cancel result:", res);
      });

    }

    if (typeof handler === "function") {
      try {
        handler(payload);
      } catch (err) {
        console.warn("[Holy.PICKCLICK] cancel handler failed", err);
      }
    }
  }

  function armPickClick(options) {
    if (!options) options = {};

    if (active) {
      cancelPickClick("replaced");
    }

    sessionId = "pc-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
    resolveHandler = options.onResolve || null;
    cancelHandler = options.onCancel || null;

    ensureVeilListener();
    setVeilActive(true);

    resolveListener = function (event) {
      var payload = parseEventData(event);
      if (!payload || payload.sessionId !== sessionId) return;

      var handler = resolveHandler;
      resetState();

      if (typeof handler === "function") {
        try {
          handler(payload);
        } catch (err) {
          console.warn("[Holy.PICKCLICK] resolve handler failed", err);
        }
      }
    };

    cancelListener = function (event) {
      var payload = parseEventData(event) || {};
      if (payload.sessionId && payload.sessionId !== sessionId) return;

      var handler = cancelHandler;
      resetState();

      if (typeof handler === "function") {
        try {
          handler(payload);
        } catch (err) {
          console.warn("[Holy.PICKCLICK] cancel handler failed", err);
        }
      }
    };

    if (cs && typeof cs.addEventListener === "function") {
      cs.addEventListener(EVENT_RESOLVE, resolveListener);
      cs.addEventListener(EVENT_CANCEL, cancelListener);
    }

    if (cs && typeof cs.evalScript === "function") {
      var payload = { sessionId: sessionId, intent: options.intent || "" };
      var encodedPayload = escapeForEvalScript(JSON.stringify(payload));
      cs.evalScript('he_PC_armPickClick("' + encodedPayload + '")', function (res) {
        // 💡 CHECKER: if host fails, this will show "undefined" or empty
        console.log("[Holy.PICKCLICK] arm result:", res);
      });

    }

    active = true;
  }

  Holy.PICKCLICK = {
    arm: armPickClick,
    cancel: cancelPickClick
  };
})();
