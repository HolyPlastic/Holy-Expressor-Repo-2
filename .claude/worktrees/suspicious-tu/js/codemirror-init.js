(function () {
  if (typeof window === "undefined") {
    return;
  }

  function computeBaseExtensions() {
    var cm = window.codemirror;
    if (!cm) {
      return [];
    }

    var extensions = [];

    if (cm.basicSetup) {
      extensions.push(cm.basicSetup);
    }

    if (typeof cm.javascript === "function") {
      try {
        extensions.push(cm.javascript());
      } catch (err) {
        console.warn("[CodeMirrorInit] Failed to configure javascript extension", err);
      }
    }

    if (cm.oneDark) {
      extensions.push(cm.oneDark);
    }

    if (cm.EditorView && cm.EditorView.lineWrapping) {
      extensions.push(cm.EditorView.lineWrapping);
    }

    return extensions;
  }

  function ensureBaseExtensions() {
    if (Array.isArray(window.baseExtensions) && window.baseExtensions.length) {
      return window.baseExtensions;
    }

    var extensions = computeBaseExtensions();
    window.baseExtensions = extensions;
    return extensions;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureBaseExtensions, { once: true });
  } else {
    ensureBaseExtensions();
  }
})();
