if (typeof Holy !== "object") {
  Holy = {};
}

(function () {
  "use strict";

  var MODULE_LABEL = "[Holy.State]";
  var STATE_EVENT = "com.holy.expressor.sync.state";
  var PLACEHOLDER_TEXT = "// Type your expression here...";
  var instanceId = "state-" + Date.now().toString(36) + "-" + Math.random().toString(16).slice(2);

  var cs = null;
  var stateFilePath = null;
  var isInitialized = false;
  var listeningForEvents = false;
  var pendingSaveTimer = null;
  var panelBindingsApplied = false;
  var panelSubscription = null;
  var editorBinding = null;

  var defaultState = {
    expressionText: "",
    useCustomSearch: false,
    customSearch: "",
    useAbsoluteComp: false
  };

  var state = Object.assign({}, defaultState);
  var listeners = [];

  function log() {
    if (window.HX_LOG_MODE === "verbose") {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(MODULE_LABEL);
      console.log.apply(console, args);
    }
  }

  function warn() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(MODULE_LABEL);
    console.warn.apply(console, args);
  }

  function shallowCopy(obj) {
    return Object.assign({}, obj);
  }

  function safeCSInterface() {
    if (cs) {
      return cs;
    }
    try {
      cs = new CSInterface();
    } catch (err) {
      warn("CSInterface unavailable", err);
      cs = null;
    }
    return cs;
  }

  function ensureStateFilePath() {
    if (stateFilePath) {
      return stateFilePath;
    }
    if (!Holy.UTILS || typeof Holy.UTILS.cy_getBanksPaths !== "function") {
      warn("Holy.UTILS.cy_getBanksPaths unavailable; cannot resolve shared state path");
      return null;
    }
    try {
      var paths = Holy.UTILS.cy_getBanksPaths();
      if (paths && paths.dir) {
        var normalizedDir = paths.dir;
        if (normalizedDir.charAt(normalizedDir.length - 1) === "/") {
          normalizedDir = normalizedDir.slice(0, -1);
        }
        stateFilePath = normalizedDir + "/panel-state.json";
        return stateFilePath;
      }
    } catch (err) {
      warn("Failed to resolve state storage path", err);
    }
    return null;
  }

  function scheduleSave() {
    if (pendingSaveTimer) {
      return;
    }
    pendingSaveTimer = setTimeout(function () {
      pendingSaveTimer = null;
      persistState();
    }, 220);
  }

  function persistState() {
    var path = ensureStateFilePath();
    if (!path) {
      return;
    }
    if (!Holy.UTILS || typeof Holy.UTILS.cy_writeJSONFile !== "function") {
      warn("Holy.UTILS.cy_writeJSONFile unavailable; skipping state save");
      return;
    }
    try {
      var payload = {
        version: 1,
        updatedAt: Date.now(),
        state: state
      };
      var res = Holy.UTILS.cy_writeJSONFile(path, payload);
      if (res && res.err) {
        warn("State save returned error", res.err);
      } else {
        log("State persisted", { path: path });
      }
    } catch (err) {
      warn("Failed to persist state", err);
    }
  }

  function readStateFromDisk() {
    var path = ensureStateFilePath();
    if (!path) {
      return null;
    }
    if (!Holy.UTILS || typeof Holy.UTILS.cy_readJSONFile !== "function") {
      warn("Holy.UTILS.cy_readJSONFile unavailable; skipping disk load");
      return null;
    }
    try {
      return Holy.UTILS.cy_readJSONFile(path);
    } catch (err) {
      warn("Failed to read state file", err);
      return null;
    }
  }

  function broadcastState(changedKeys) {
    var csInstance = safeCSInterface();
    if (!csInstance || typeof CSEvent !== "function") {
      return;
    }
    try {
      var evt = new CSEvent(STATE_EVENT, "APPLICATION");
      evt.data = JSON.stringify({
        sourceId: instanceId,
        changed: changedKeys || [],
        state: state,
        timestamp: Date.now()
      });
      csInstance.dispatchEvent(evt);
      log("Broadcasted state update", { changed: changedKeys });
    } catch (err) {
      warn("Failed to dispatch state sync event", err);
    }
  }

  function notifyListeners(origin, changedKeys) {
    var meta = {
      origin: origin || instanceId,
      changed: Array.isArray(changedKeys) ? changedKeys.slice() : [],
      timestamp: Date.now()
    };
    var snapshot = getState();
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](snapshot, meta);
      } catch (err) {
        warn("Listener execution failed", err);
      }
    }
  }

  function applyState(partial, opts) {
    if (!partial || typeof partial !== "object") {
      return false;
    }
    var options = opts || {};
    var changed = [];
    for (var key in partial) {
      if (!Object.prototype.hasOwnProperty.call(partial, key)) {
        continue;
      }
      var next = partial[key];
      if (typeof next === "undefined" && Object.prototype.hasOwnProperty.call(defaultState, key)) {
        next = defaultState[key];
      }
      if (state[key] === next) {
        continue;
      }
      state[key] = next;
      changed.push(key);
    }
    if (!changed.length) {
      return false;
    }
    if (!options.skipPersist) {
      scheduleSave();
    }
    notifyListeners(options.origin, changed);
    if (!options.skipBroadcast) {
      broadcastState(changed);
    }
    return true;
  }

  function handleIncomingEvent(evt) {
    if (!evt) {
      return;
    }
    var payload = null;
    try {
      payload = typeof evt.data === "string" ? JSON.parse(evt.data) : evt.data;
    } catch (err) {
      warn("Failed to parse sync payload", err, evt.data);
      return;
    }
    if (!payload || payload.sourceId === instanceId) {
      return;
    }
    if (!payload.state || typeof payload.state !== "object") {
      return;
    }
    applyState(payload.state, {
      origin: payload.sourceId,
      skipBroadcast: true,
      skipPersist: false
    });
  }

  function ensureEventListener() {
    var csInstance = safeCSInterface();
    if (!csInstance || typeof csInstance.addEventListener !== "function") {
      return;
    }
    if (listeningForEvents) {
      return;
    }
    try {
      csInstance.addEventListener(STATE_EVENT, handleIncomingEvent);
      listeningForEvents = true;
      log("Listening for state sync events");
    } catch (err) {
      warn("Failed to register state sync listener", err);
    }
  }

  function hydrateDefaults() {
    for (var key in defaultState) {
      if (Object.prototype.hasOwnProperty.call(defaultState, key) && typeof state[key] === "undefined") {
        state[key] = defaultState[key];
      }
    }
  }

  function init(opts) {
    var options = opts || {};
    if (!isInitialized) {
      hydrateDefaults();
      var disk = readStateFromDisk();
      if (disk && typeof disk === "object") {
        var incoming = disk.state && typeof disk.state === "object" ? disk.state : disk;
        applyState(incoming, {
          origin: "disk",
          skipBroadcast: true,
          skipPersist: true
        });
      } else {
        scheduleSave();
      }
      isInitialized = true;
    }
    ensureEventListener();
    if (options.panel) {
      log("Initialized for panel", options.panel);
    }
    return getState();
  }

  function getState() {
    return shallowCopy(state);
  }

  function get(key, fallback) {
    if (Object.prototype.hasOwnProperty.call(state, key)) {
      return state[key];
    }
    return fallback;
  }

  function update(partial, opts) {
    if (!partial || typeof partial !== "object") {
      return getState();
    }
    var options = opts || {};
    var origin = options.origin || instanceId;
    applyState(partial, {
      origin: origin,
      skipBroadcast: !!options.skipBroadcast,
      skipPersist: !!options.skipPersist
    });
    return getState();
  }

  function subscribe(fn) {
    if (typeof fn !== "function") {
      return function () {};
    }
    listeners.push(fn);
    if (isInitialized) {
      try {
        fn(getState(), {
          origin: "init",
          changed: Object.keys(state),
          timestamp: Date.now()
        });
      } catch (err) {
        warn("Initial listener dispatch failed", err);
      }
    }
    return function unsubscribe() {
      var idx = listeners.indexOf(fn);
      if (idx >= 0) {
        listeners.splice(idx, 1);
      }
    };
  }

  function attachPanelBindings() {
    if (panelBindingsApplied) {
      return;
    }
    panelBindingsApplied = true;

    var panel = document && document.body && document.body.classList.contains("quick-panel") ? "quick" : "main";
    init({ panel: panel });

    var doc = document;
    var customToggle = doc.getElementById("useCustomSearch");
    var customInput = doc.getElementById("customSearch");
    var customWrapper = doc.querySelector(".customSearch-textBox-frame");
    var targetBox = doc.getElementById("TargetBox");
    var absoluteToggle = doc.getElementById("useAbsoluteComp");
    var fallbackInput = doc.getElementById("exprInput");

    function applyCustomSearchUI(isChecked) {
      var enabled = !!isChecked;
      if (customInput) {
        customInput.toggleAttribute("disabled", !enabled);
        customInput.disabled = !enabled;
        customInput.classList.toggle("enabled", enabled);
        customInput.classList.toggle("disabled", !enabled);
      }
      if (customWrapper) {
        customWrapper.classList.toggle("enabled", enabled);
        customWrapper.classList.toggle("disabled", !enabled);
      }
      if (targetBox) {
        targetBox.style.opacity = enabled ? "0.5" : "1";
        targetBox.style.pointerEvents = enabled ? "none" : "auto";
      }
    }

    var snapshot = getState();

    if (customToggle) {
      customToggle.checked = !!snapshot.useCustomSearch;
      if (!customToggle.dataset.holyStateBound) {
        customToggle.dataset.holyStateBound = "1";
        customToggle.addEventListener("change", function () {
          var nextChecked = !!customToggle.checked;
          applyCustomSearchUI(nextChecked);
          if (!nextChecked && customInput) {
            customInput.value = "";
          }
          update({
            useCustomSearch: nextChecked,
            customSearch: nextChecked && customInput ? customInput.value : ""
          });
        });
      }
    }

    if (customInput) {
      customInput.value = snapshot.useCustomSearch ? (snapshot.customSearch || "") : "";
      if (!customInput.dataset.holyStateBound) {
        customInput.dataset.holyStateBound = "1";
        var syncInput = function () {
          update({ customSearch: customInput.value });
        };
        customInput.addEventListener("input", syncInput);
        customInput.addEventListener("blur", syncInput);
      }
    }

    applyCustomSearchUI(!!snapshot.useCustomSearch);

    if (absoluteToggle) {
      absoluteToggle.checked = !!snapshot.useAbsoluteComp;
      if (!absoluteToggle.dataset.holyStateBound) {
        absoluteToggle.dataset.holyStateBound = "1";
        absoluteToggle.addEventListener("change", function () {
          update({ useAbsoluteComp: !!absoluteToggle.checked });
        });
      }
    }

    if (fallbackInput) {
      fallbackInput.value = snapshot.expressionText || "";
      if (!fallbackInput.dataset.holyStateBound) {
        fallbackInput.dataset.holyStateBound = "1";
        fallbackInput.addEventListener("input", function () {
          update({ expressionText: fallbackInput.value });
        });
      }
    }

    if (!panelSubscription) {
      panelSubscription = subscribe(function (current, meta) {
        if (meta && meta.origin === instanceId) {
          return;
        }
        var useCustomSearch = typeof current.useCustomSearch === "boolean" ? current.useCustomSearch : null;
        if (customToggle && useCustomSearch !== null && customToggle.checked !== useCustomSearch) {
          customToggle.checked = useCustomSearch;
        }
        if (customInput) {
          if (useCustomSearch) {
            if (customInput.value !== (current.customSearch || "")) {
              customInput.value = current.customSearch || "";
            }
          } else if (useCustomSearch === false) {
            if (customInput.value !== "") {
              customInput.value = "";
            }
          }
        }
        if (useCustomSearch !== null) {
          applyCustomSearchUI(useCustomSearch);
        }
        if (absoluteToggle && typeof current.useAbsoluteComp === "boolean") {
          absoluteToggle.checked = !!current.useAbsoluteComp;
        }
        if (fallbackInput && typeof current.expressionText === "string" && fallbackInput.value !== current.expressionText) {
          fallbackInput.value = current.expressionText;
        }
      });
    }
  }

  function bindEditor(editorView) {
    if (!editorView || typeof editorView !== "object") {
      warn("bindEditor called without a valid editor instance");
      return;
    }

    init({ panel: "main" });

    if (editorBinding && editorBinding.view === editorView) {
      return;
    }

    if (editorBinding && editorBinding.cleanup) {
      editorBinding.cleanup();
    }

    editorBinding = {
      view: editorView,
      cleanup: null,
      unsubscribe: null
    };

    var docText = "";
    try {
      docText = editorView.state && editorView.state.doc ? editorView.state.doc.toString() : "";
    } catch (err) {
      docText = "";
    }

    var stored = state.expressionText || "";
    if (stored && stored !== docText && docText !== stored) {
      try {
        editorView.dispatch({
          changes: { from: 0, to: docText.length, insert: stored }
        });
      } catch (err) {
        warn("Failed to hydrate editor with stored state", err);
      }
    }

    var pendingTimer = null;
    var cmLib = window.codemirror;
    if (cmLib && cmLib.EditorView && cmLib.EditorView.updateListener &&
        cmLib.StateEffect && cmLib.StateEffect.appendConfig &&
        typeof cmLib.EditorView.updateListener.of === "function" &&
        typeof cmLib.StateEffect.appendConfig.of === "function") {
      try {
        var updateExtension = cmLib.EditorView.updateListener.of(function (update) {
          if (update && update.docChanged) {
            scheduleCapture();
          }
        });
        editorView.dispatch({
          effects: cmLib.StateEffect.appendConfig.of(updateExtension)
        });
      } catch (err) {
        warn("Failed to install CodeMirror update listener", err);
      }
    }

    function captureAndSync() {
      pendingTimer = null;
      try {
        var currentText = editorView.state && editorView.state.doc ? editorView.state.doc.toString() : "";
        if (currentText === PLACEHOLDER_TEXT) {
          currentText = "";
        }
        if (currentText !== state.expressionText) {
          update({ expressionText: currentText });
        }
      } catch (err) {
        warn("Failed to capture editor text", err);
      }
    }

    function scheduleCapture() {
      if (pendingTimer) {
        clearTimeout(pendingTimer);
      }
      pendingTimer = setTimeout(captureAndSync, 180);
    }

    if (editorView.contentDOM && typeof editorView.contentDOM.addEventListener === "function") {
      editorView.contentDOM.addEventListener("keyup", scheduleCapture);
      editorView.contentDOM.addEventListener("input", scheduleCapture);
      editorView.contentDOM.addEventListener("blur", captureAndSync);
    }

    editorBinding.cleanup = function () {
      if (!editorView || !editorView.contentDOM) {
        return;
      }
      editorView.contentDOM.removeEventListener("keyup", scheduleCapture);
      editorView.contentDOM.removeEventListener("input", scheduleCapture);
      editorView.contentDOM.removeEventListener("blur", captureAndSync);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      if (editorBinding.unsubscribe) {
        editorBinding.unsubscribe();
        editorBinding.unsubscribe = null;
      }
      editorBinding.view = null;
    };

    editorBinding.unsubscribe = subscribe(function (current, meta) {
      if (meta && meta.origin === instanceId) {
        return;
      }
      var desired = current.expressionText || "";
      var existing = "";
      try {
        existing = editorView.state && editorView.state.doc ? editorView.state.doc.toString() : "";
      } catch (err) {
        existing = "";
      }
      if (desired === PLACEHOLDER_TEXT) {
        desired = "";
      }
      if (existing === PLACEHOLDER_TEXT) {
        existing = "";
      }
      if (desired === existing) {
        return;
      }
      try {
        editorView.dispatch({
          changes: { from: 0, to: editorView.state.doc.length, insert: desired }
        });
      } catch (err) {
        warn("Failed to apply synced expression to editor", err);
      }
    });

    log("Editor binding active");
  }
// ---------------------------------------------------------
// 📍V4.1 – LiveSync dispatch after any state change (for multi-panel updates)
// ---------------------------------------------------------
function dispatchLiveSyncEvent(changeType) {
  try {
    var csInstance = safeCSInterface();
    if (!csInstance || typeof CSEvent !== "function") return;

    var evt = new CSEvent("com.holy.expressor.stateChanged", "APPLICATION");
    evt.data = JSON.stringify({
      type: changeType || "stateUpdated",
      timestamp: Date.now(),
      source: instanceId
    });
    csInstance.dispatchEvent(evt);
    log("Dispatched LiveSync event", { type: changeType });
  } catch (err) {
    warn("Failed to dispatch LiveSync event", err);
  }
}

// Hook into state updates – this will be called after every broadcastState()
if (!window.__holyStateLiveSyncHooked) {
  window.__holyStateLiveSyncHooked = true;
  var originalBroadcast = broadcastState;
  broadcastState = function(changedKeys) {
    originalBroadcast.call(this, changedKeys);
    dispatchLiveSyncEvent("banksChanged");
  };
}

  Holy.State = {
    init: init,
    isReady: function () { return isInitialized; },
    getInstanceId: function () { return instanceId; },
    getState: getState,
    get: get,
    update: update,
    subscribe: subscribe,
    attachPanelBindings: attachPanelBindings,
    bindEditor: bindEditor
  };
})();
