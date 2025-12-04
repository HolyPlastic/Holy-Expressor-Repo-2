// main_UTILS.js V2 – Improved positioning + global context menu
// Centralized utility functions for Holy Expressor plugin.
// These are global helpers that can be reused across modules.

if (typeof Holy !== "object") Holy = {};

(function () {
  "use strict";

  var cs = new CSInterface();

  function NEW_forCustomer_emit(txt) {
    try {
      if (!txt) return;
      const timestamp = new Date().toISOString();
      const entry = "[" + timestamp + "] " + txt;
      if (!window.NEW_forCustomer_history) window.NEW_forCustomer_history = [];
      window.NEW_forCustomer_history.push(entry);
    } catch (err) {
      // Never throw – Customer log must never break app
    }
  }



// ---------------------------------------------------------
// 🪶 FOREGROUND PANEL SYSTEM (V2 – CSS-driven)
// ---------------------------------------------------------
// 💡 CHECKER: cy_createForegroundPanel → reusable modal overlay generator
function cy_createForegroundPanel(id, opts = {}) {
  // remove an existing panel with the same id if already open
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  // backdrop container
  const panel = document.createElement("div");
  panel.id = id;
  panel.className = "foreground-panel-backdrop";

  // main inner box
  const box = document.createElement("div");
  box.className = "foreground-panel-box";
  if (opts.width) box.style.minWidth = opts.width; // optional custom width

  // optional title (using <h4> for consistency with other headings)
  if (opts.title) {
    const heading = document.createElement("h4");
    heading.className = "foreground-panel-title";
    heading.textContent = opts.title;
    box.appendChild(heading);
  }

  // main content area
  const content = document.createElement("div");
  content.className = "foreground-panel-content";
  if (opts.innerHTML) content.innerHTML = opts.innerHTML;
  box.appendChild(content);



  panel.appendChild(box);

  // click outside to close
  panel.addEventListener("mousedown", (ev) => {
    if (ev.target === panel) panel.remove();
  });

  document.body.appendChild(panel);
  return panel;
}







// V1 —banks storage helpers (CEP FS)
// place directly above "Holy.UTILS = {"
function cy_fsEnsureDir(path) {
  const stat = window.cep.fs.stat(path);
  if (stat.err === window.cep.fs.ERR_NOT_FOUND) {
    window.cep.fs.makedir(path);
  }
}

function cy_getBanksPaths() {
  const cs = new CSInterface();
  const root = cs.getSystemPath(SystemPath.USER_DATA); // per-user data dir
  const dir = root + "/HolyExpressor";
  cy_fsEnsureDir(dir);
  const file = dir + "/banks.json";
  return { dir, file };
}

function cy_readJSONFile(path) {
  const res = window.cep.fs.readFile(path);
  if (res.err) return null;
  try { return JSON.parse(res.data); } catch { return null; }
}

function cy_writeJSONFile(path, obj) {
  const data = JSON.stringify(obj, null, 2);
  return window.cep.fs.writeFile(path, data);
}


// V1 — cy_getThemeVars: read computed CSS variables for flyover theming
function cy_getThemeVars() {
  // 💡 CHECKER: returns only keys the flyover needs
  const rs = getComputedStyle(document.documentElement);
  const g = n => rs.getPropertyValue(n).trim();
  return {
    "--G-color-1": g("--G-color-1"),
    "--G-color-1-H": g("--G-color-1-H"),
    "--G-color-1-S": g("--G-color-1-S"),
    "--G-color-1-L": g("--G-color-1-L"),
    "--G-colour-1-RGB": g("--G-colour-1-RGB"),
    "--G-color-1-deepdark-bg": g("--G-color-1-deepdark-bg"),
    "--G-color-1-offwhite": g("--G-color-1-offwhite")
  };
}


// V1 — Selected layer descriptors (name + index + id)
function cy_getSelectedLayers() {
  return new Promise(function (resolve, reject) {
    try {
      cs.evalScript('he_EX_getSelectedLayers()', function (raw) {
        var payload = {};
        try {
          payload = JSON.parse(raw || "{}");
        } catch (parseErr) {
          reject({ err: parseErr, userMessage: "Could not read selection data" });
          return;
        }

        if (!payload || !payload.ok) {
          var err = (payload && payload.err) ? payload.err : "Selection lookup failed";
          reject({ err: err, userMessage: err });
          return;
        }

        resolve(payload.layers || []);
      });
    } catch (err) {
      reject({ err: err, userMessage: "Selection lookup failed" });
    }
  });
}


  // ---------------------------------------------------------
  // 🚀 MODULE EXPORT
  // ---------------------------------------------------------
Holy.UTILS = {
  cy_getBanksPaths: cy_getBanksPaths,
  cy_readJSONFile: cy_readJSONFile,
  cy_writeJSONFile: cy_writeJSONFile,
  cy_createForegroundPanel: cy_createForegroundPanel,
  cy_getThemeVars: cy_getThemeVars,
  cy_getSelectedLayers: cy_getSelectedLayers
};
Holy.UTILS.NEW_forCustomer_emit = NEW_forCustomer_emit;
})();
