if (typeof Holy !== "object") Holy = {};

(function () {
  "use strict";

  // 🔗 Shared instances
  var cs = new CSInterface();
  var HX_LOG_MODE = window.HX_LOG_MODE || "verbose";









  // Debug messages from host.jsx
  Holy.UI.cs.addEventListener("com.holyexpressor.debug", (evt) => {
    if (window.HX_LOG_MODE === "verbose") {
      console.log("[host]", evt.data);
    }

  });








  // ---------------------------------------------------------
  // 🚀 Load JSON2 + HostJSX
  // ---------------------------------------------------------
  function loadJSX() {
    // Base path to extension
    var base = Holy.UI.cs.getSystemPath(SystemPath.EXTENSION);

    // Path helper (escapes backslashes for Windows)
    function p(rel) {
      return (base + rel).replace(/\\/g, "\\\\");
    }

    // Load JSON polyfill first (required for legacy AE engines)
    // 🛠️ NOTE: json2.js lives under /js/, not /jsx/
    Holy.UI.cs.evalScript('$.evalFile("' + p("/js/json2.js") + '")');

    // Explicitly load all host modules in correct order
    var hostModules = [
      "/jsx/Modules/host_UTILS.jsx",
      "/jsx/Modules/host_MAPS.jsx",
      "/jsx/Modules/host_GET.jsx",
      "/jsx/Modules/host_PICKCLICK.jsx",
      "/jsx/Modules/host_APPLY.jsx",
      "/jsx/Modules/host_DEV.jsx",
      "/jsx/host.jsx",
      "/jsx/Modules/host_AGENT_API.jsx" // holyAPI_* surface for Holy Agent
    ];

    var loaded = 0;
    hostModules.forEach(function (file) {
      Holy.UI.cs.evalScript('$.evalFile("' + p(file) + '")', function () {
        loaded++;
        if (loaded === hostModules.length) {
          onAllLoaded();
        }
      });
    });

    function onAllLoaded() {
      Holy.UI.cs.evalScript('(typeof he_U_SS_getSelectionSummary)', function (res) {
        console.log("he_U_SS_getSelectionSummary typeof:", res);
      });
      Holy.UI.cs.evalScript('(typeof holyAPI_applyToTarget)', function (res) {
        console.log("holyAPI_applyToTarget typeof:", res);
      });
      console.log("✅ loadJSX(): All host modules loaded into ExtendScript.");
    }
  }









  function init() {
    loadJSX();
    if (Holy.State && typeof Holy.State.init === "function") {
      try {
        Holy.State.init({ panel: "main" });
      } catch (err) {
        console.warn("[DEV_INIT] Holy.State.init failed", err);
      }
    }
    Holy.UI.initTabs();
    Holy.EXPRESS.initPresets();
    Holy.BUTTONS.wirePanelButtons();

    // ---------------------------------------------------------
    // 🧩 SNIPPETS MODULE INIT
    // ---------------------------------------------------------
    if (Holy.SNIPPETS && typeof Holy.SNIPPETS.init === "function") {
      // 💡 CHECKER: run dynamic snippet button rendering
      Holy.SNIPPETS.init();
      console.log("[Holy.SNIPPETS] init() called from DEV_INIT");
    } else {
      // 💡 CHECKER: prevent crash if SNIPPETS failed to load
      console.warn("[Holy.SNIPPETS] init unavailable at boot");
    }

    // ---------------------------------------------------------
    // 🔗 NATIVE POPUP BRIDGE — poll quickpanel.json for flags
    // written by the .aex native Quick Panel popup.
    // ---------------------------------------------------------
    setInterval(function() {
      Holy.UI.cs.evalScript(
        '(function(){' +
        '  try {' +
        '    var f = new File(Folder.userData.fullName + "/HolyExpressor/quickpanel.json");' +
        '    if (!f.open("r")) return "0";' +
        '    var data;' +
        '    try { data = JSON.parse(f.read()); } catch(e) { f.close(); return "0"; }' +
        '    f.close();' +
        '    if (!data.openSnippetManager) return "0";' +
        '    delete data.openSnippetManager;' +
        '    var fw = new File(Folder.userData.fullName + "/HolyExpressor/quickpanel.json");' +
        '    if (fw.open("w")) { fw.write(JSON.stringify(data, null, 2)); fw.close(); }' +
        '    return "1";' +
        '  } catch(e) { return "0"; }' +
        '})()',
        function(result) {
          if (result === "1") {
            if (Holy.SNIPPETS && typeof Holy.SNIPPETS.cy_openSnippetManager === "function") {
              Holy.SNIPPETS.cy_openSnippetManager();
            }
          }
        }
      );
    }, 2000);

    if (Holy.State && typeof Holy.State.attachPanelBindings === "function") {
      try {
        Holy.State.attachPanelBindings();
      } catch (err) {
        console.warn("[DEV_INIT] Holy.State.attachPanelBindings failed", err);
      }
    }


    Holy.MENU.contextM_disableNative();

    // ---------------------------------------------------------
    // ⚙️ SETTINGS MODULE INIT (flyout menu + settings panel)
    // ---------------------------------------------------------
    if (Holy.SETTINGS && typeof Holy.SETTINGS.init === "function") {
      try {
        Holy.SETTINGS.init();
      } catch (err) {
        console.warn("[DEV_INIT] Holy.SETTINGS.init failed", err);
      }
    }

    console.log("Holy Expressor ready");
  }


  Holy.UI.cs.addEventListener("com.adobe.csxs.events.SDKEventMessage", function (evt) {
    if (evt && evt.data && evt.data.indexOf("HE_LOG::") === 0) {
      var msg = evt.data.replace("HE_LOG::", "");
      var out = document.querySelector("#applyOutput");
      if (out) {
        out.textContent += "\n" + msg;
      }
      console.log("HE_LOG", msg);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }







  // --- CodeMirror setup ---
  window.addEventListener("DOMContentLoaded", () => {
    console.log("CodeMirror global:", window.codemirror);

    // ✅ Corrected guard: only continue if CodeMirror is loaded
    if (!window.codemirror || !window.codemirror.EditorState) {
      console.warn("⚠️ CodeMirror bundle missing or not ready");
      return;
    }

    const startState = window.codemirror.EditorState.create({
      doc: "// Type your expression here...",
      extensions: [
        window.codemirror.basicSetup,
        window.codemirror.javascript(),
        window.codemirror.oneDark,
        window.codemirror.EditorView.lineWrapping // ✅ word wrap
      ]
    });

    window.editor = new window.codemirror.EditorView({
      state: startState,
      parent: document.getElementById("codeEditor")
    });

    // ✅ V2 - Clear placeholder on focus/click
    if (window.editor && window.editor.contentDOM) {
      window.editor.contentDOM.addEventListener("focus", () => {
        try {
          const full = window.editor.state.doc.toString();
          if (full === "// Type your expression here...") {
            window.editor.dispatch({
              changes: { from: 0, to: full.length, insert: "" }
            });
            console.log("Placeholder cleared on contentDOM focus");
          }
        } catch (e) {
          console.error("Placeholder clear failed:", e);
        }
      });
    }

    console.log("✅ CodeMirror editor mounted");

    

    if (Holy.State && typeof Holy.State.bindEditor === "function") {
      try {
        Holy.State.bindEditor(window.editor);
      } catch (err) {
        console.warn("[DEV_INIT] Holy.State.bindEditor failed", err);
      }
    }

    const clearBtn = document.getElementById("editorClearBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (!window.editor || !window.editor.state) {
          console.warn("Editor clear requested but CodeMirror instance is unavailable");
          return;
        }

        try {
          const full = window.editor.state.doc.toString();
          window.editor.dispatch({
            changes: { from: 0, to: full.length, insert: "" }
          });
          if (typeof window.editor.focus === "function") {
            window.editor.focus();
          }
          if (Holy.State && typeof Holy.State.update === "function") {
            try {
              Holy.State.update({ expressionText: "" });
            } catch (err) {
              console.warn("[DEV_INIT] Holy.State.update failed after clear", err);
            }
          }
        } catch (e) {
          console.error("Failed to clear editor contents", e);
        }
      });
    }
  });






  // ---------------------------------------------------------
  // 🚀 MODULE EXPORT
  // ---------------------------------------------------------
  Holy.DEV_INIT = {
    cs: cs,
    HX_LOG_MODE: HX_LOG_MODE,
    loadJSX: loadJSX,
    init: init
  };

})();
