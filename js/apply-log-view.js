if (typeof Holy !== "object") {
  var Holy = {};
}

(function () {
  "use strict";

  var APPLY_LOG_EVENTS = {
    update: "com.holy.expressor.applyLog.update",
    request: "com.holy.expressor.applyLog.request"
  };

  var cs = null;
  try {
    cs = new CSInterface();
  } catch (err) {
    console.warn("[Holy.LOG] CSInterface unavailable", err);
  }

  var statusEl = document.getElementById("logStatus");
  var contentEl = document.getElementById("applyLogContent");

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function renderEntries(entries) {
    if (!contentEl) return;

    if (!entries || !entries.length) {
      contentEl.textContent = "No log entries yet.";
      setStatus("Waiting for entries…");
      return;
    }

    contentEl.textContent = entries.join("\n\n");
    contentEl.scrollTop = contentEl.scrollHeight;
    setStatus(entries.length + (entries.length === 1 ? " entry" : " entries"));
  }

  function handleUpdate(event) {
    try {
      var payload = {};
      if (event && typeof event.data === "string" && event.data) {
        payload = JSON.parse(event.data);
      }
      if (!payload || !Array.isArray(payload.entries)) {
        renderEntries([]);
        return;
      }
      renderEntries(payload.entries);
    } catch (err) {
      console.warn("[Holy.LOG] Failed to parse update", err, event);
      renderEntries([]);
      setStatus("Unable to parse log update.");
    }
  }

  function requestSync() {
    if (!cs || typeof CSEvent !== "function") {
      setStatus("CEP messaging unavailable.");
      return;
    }

    var evt = new CSEvent(APPLY_LOG_EVENTS.request, "APPLICATION");
    try {
      evt.data = JSON.stringify({ requester: cs.getExtensionID ? cs.getExtensionID() : "" });
    } catch (err) {
      evt.data = "";
    }
    cs.dispatchEvent(evt);
  }

  if (cs && typeof cs.addEventListener === "function") {
    cs.addEventListener(APPLY_LOG_EVENTS.update, handleUpdate);
  } else {
    setStatus("Unable to listen for log updates.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", requestSync);
  } else {
    requestSync();
  }

  window.addEventListener("focus", requestSync);
})();
