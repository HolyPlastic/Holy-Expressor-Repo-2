// V1.4 – Holy.SNIPPETS: uses global Holy.MENU.contextM_menuBuilder utility
// Summary: Delegates context menu positioning and hiding to Holy.MENU.contextM_menuBuilder.
// ---------------------------------------------------------
// 🧩 SNIPPET BANK DEFINITION
// ---------------------------------------------------------
if (typeof Holy !== "object") Holy = {};

if (!Holy.SNIPPETS) Holy.SNIPPETS = {};
Holy.SNIPPETS.banks = [
  {
    id: 1,
    name: "Default",
    snippets: [
      { id: 1, name: "Wiggle", expr: "wiggle(2,20)", controls: {} },
      { id: 2, name: "Loop", expr: "loopOut('cycle')", controls: {} },
      { id: 3, name: "Random", expr: "random(0,100)", controls: {} }
    ]
  },
  {
    id: 2,
    name: "Secondary",
    snippets: [
      { id: 1, name: "Bounce", expr: "n=Math.sin(time*3)*30", controls: {} },
      { id: 2, name: "Blink", expr: "Math.sin(time*10)>0?100:0", controls: {} },
      { id: 3, name: "", expr: "", controls: {} }
    ]
  }
];




(function () {
  "use strict";
  const SNIPPETS_PER_BANK = 3;
  Holy.SNIPPETS.SNIPPETS_PER_BANK = SNIPPETS_PER_BANK;

  var cs = new CSInterface();
  var HX_LOG_MODE = window.HX_LOG_MODE || "verbose";


  // ---------------------------------------------------------
  // 🧮 ID + snippet factories
  // ---------------------------------------------------------
  var snippetIdCounter = 0;

  function generateSnippetId() {
    snippetIdCounter += 1;
    return (
      "snip-" +
      Date.now().toString(36) +
      "-" +
      snippetIdCounter.toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function cy_createEmptySnippet() {
    return {
      id: generateSnippetId(),
      name: "",
      expr: "",
      controls: {}
    };
  }

  function cy_createEmptySnippetArray() {
    return Array.from({ length: SNIPPETS_PER_BANK }, cy_createEmptySnippet);
  }


  // V2 – Scoped document resolver for multi-panel safety
  function cy_resolveDoc() {
    try {
      return window.document;
    } catch (e) {
      console.warn("[Holy.SNIPPETS] cy_resolveDoc fallback to window.document", e);
      return document;
    }
  }


  // ---------------------------------------------------------
  // 🧱 Data normalization helpers
  // ---------------------------------------------------------
  function cy_normalizeSnippet(snippet) {
    if (!snippet || typeof snippet !== "object") return null;
    if (typeof snippet.controls !== "object" || snippet.controls === null) {
      snippet.controls = {};
    }
    if (typeof snippet.name !== "string") snippet.name = "";
    if (typeof snippet.expr !== "string") snippet.expr = "";
    if (snippet.id === undefined || snippet.id === null || snippet.id === "") {
      snippet.id = generateSnippetId();
    }
    return snippet;
  }

  function normalizeBankSnippets(bank) {
    if (!bank || typeof bank !== "object") return bank;
    if (typeof bank.name !== "string" || !bank.name) {
      bank.name = "Bank";
    }

    const trimmed = Array.isArray(bank.snippets)
      ? bank.snippets.slice(0, SNIPPETS_PER_BANK)
      : [];

    const normalizedSnippets = trimmed.map(function (snippet) {
      const normalized = cy_normalizeSnippet(snippet);
      return normalized || cy_createEmptySnippet();
    });

    while (normalizedSnippets.length < SNIPPETS_PER_BANK) {
      normalizedSnippets.push(cy_createEmptySnippet());
    }

    bank.snippets = normalizedSnippets;
    return bank;
  }

  function cy_normalizeBanksCollection(banks) {
    if (!Array.isArray(banks)) return [];
    return banks.map(function (bank) {
      return normalizeBankSnippets(bank || {});
    });
  }


  // -==-=-++++++*...................((((((((((((((())))>>>>
  // -==-=-+++++++TIME FOR BANK 🏦🪙++++0000((((((((((((((((())))
  // -==-=-++++++🏦🪙🏦🪙🪙🏦🪙🏦🪙++++0000((((((((((((((((())))




  // V1 — multiple banks scaffold
  Holy.SNIPPETS.banks = [
    {
      id: 1,
      name: "Default",
      snippets: [
        { id: 1, name: "Wiggle", expr: "wiggle(2,20)", controls: {} },
        { id: 2, name: "Loop", expr: "loopOut('cycle')", controls: {} },
        { id: 3, name: "Random", expr: "random(0,100)", controls: {} }
      ]
    }
  ];

  Holy.SNIPPETS.banks = cy_normalizeBanksCollection(Holy.SNIPPETS.banks);

  // active bank pointer
  Holy.SNIPPETS.activeBankId = 1;

  // helper to resolve current bank
  function cy_getActiveBank() {
    const id = Holy.SNIPPETS.activeBankId;
    const b = Holy.SNIPPETS.banks.find(x => x.id === id);
    const fallback = b || Holy.SNIPPETS.banks[0];
    if (fallback) {
      normalizeBankSnippets(fallback);
    }
    return fallback || null;
  }
  // 🌍 Make it globally accessible
  window.cy_getActiveBank = cy_getActiveBank;

  // V1.0 – setActiveBank utility
  function cy_setActiveBank(id) {
    const bank = Holy.SNIPPETS.banks.find(b => b.id === id);
    if (!bank) {
      console.warn("[Holy.SNIPPETS] cy_setActiveBank: invalid id", id);
      return;
    }
    Holy.SNIPPETS.activeBankId = id;
    cy_saveBanksToDisk();
    renderBankHeader();
    renderSnippets();
    console.log(`[Holy.SNIPPETS] Active bank switched → ${bank.name}`);
    if (typeof Holy === "object" && Holy && Holy.UTILS && typeof Holy.UTILS.NEW_forCustomer_emit === "function") {
      var NEW_forCustomer_bankMessage = 'Switched bank: ' + bank.name;
      Holy.UTILS.NEW_forCustomer_emit(NEW_forCustomer_bankMessage);
    }
  }

  // expose for cross-module safety
  window.cy_setActiveBank = cy_setActiveBank;


  // V1 — attempt to load user banks from disk
  (function cy_loadBanksFromDisk() {
    try {
      const { file } = Holy.UTILS.cy_getBanksPaths();
      const loaded = Holy.UTILS.cy_readJSONFile(file);
      if (loaded && Array.isArray(loaded.banks) && loaded.banks.length) {
        Holy.SNIPPETS.banks = cy_normalizeBanksCollection(loaded.banks);

        const hasActive = Holy.SNIPPETS.banks.some(function (bank) {
          return bank && bank.id === loaded.activeBankId;
        });

        if (hasActive) {
          Holy.SNIPPETS.activeBankId = loaded.activeBankId;
        } else if (Holy.SNIPPETS.banks[0] && Holy.SNIPPETS.banks[0].id !== undefined) {
          Holy.SNIPPETS.activeBankId = Holy.SNIPPETS.banks[0].id;
        }

        console.log("[Holy.SNIPPETS] Loaded banks from disk:", { count: Holy.SNIPPETS.banks.length });

        // heal stored data immediately after normalization
        cy_saveBanksToDisk();
      } else {
        // first-run: persist the in-memory defaults
        cy_saveBanksToDisk();
      }
    } catch (e) {
      console.warn("[Holy.SNIPPETS] load banks failed, using defaults", e);
    }
  })();

  Holy.SNIPPETS.banks = cy_normalizeBanksCollection(Holy.SNIPPETS.banks);







  // V1 — persist current banks to disk
  function cy_saveBanksToDisk() {
    Holy.SNIPPETS.banks = cy_normalizeBanksCollection(Holy.SNIPPETS.banks);

    const { file } = Holy.UTILS.cy_getBanksPaths();
    const payload = {
      version: 1,
      activeBankId: Holy.SNIPPETS.activeBankId,
      banks: Holy.SNIPPETS.banks
    };
    const res = Holy.UTILS.cy_writeJSONFile(file, payload);
    if (res.err) console.warn("[Holy.SNIPPETS] save banks failed:", res);
    else console.log("[Holy.SNIPPETS] Banks saved:", file);
  }

  // V2.1 — renderBankHeader (scoped DOM-safe version)
  function renderBankHeader() {
    const doc = cy_resolveDoc(); // 🧩 ensure correct document context (main vs quick panel)
    const bank = cy_getActiveBank();

    const labelEl = doc.getElementById("bankNameLabel");
    if (!labelEl) {
      console.warn("[Holy.SNIPPETS] bankNameLabel not found in this panel");
      return;
    }

    labelEl.textContent = bank.name;

    const menu = doc.getElementById("bankSelectMenu");
    if (!menu) {
      console.warn("[Holy.SNIPPETS] bankSelectMenu not found in this panel");
      return;
    }

    menu.innerHTML = "";
    Holy.SNIPPETS.banks.forEach(b => {
      const li = doc.createElement("li");
      const btn = doc.createElement("button");
      btn.textContent = b.name;
      btn.dataset.bankId = b.id;
      li.appendChild(btn);
      menu.appendChild(li);
    });
  }


  function bankBinder() {
    const doc = cy_resolveDoc();
    const labelEl = doc.getElementById("bankNameLabel");
    const selBtn = doc.getElementById("bankSelectBtn");
    const menu = doc.getElementById("bankSelectMenu");

    if (!labelEl || !selBtn || !menu) {
      if (HX_LOG_MODE === "verbose") {
        console.warn("[Holy.SNIPPETS] bankBinder skipped — elements missing", {
          hasLabel: !!labelEl,
          hasButton: !!selBtn,
          hasMenu: !!menu
        });
      }
      return;
    }

    if (!labelEl.dataset.cyRenameBound) {
      labelEl.dataset.cyRenameBound = "1";

      // 🧩 Inline rename behaviour
      labelEl.addEventListener("click", () => {
        const bank = cy_getActiveBank();
        const input = doc.createElement("input");
        input.type = "text";
        input.value = bank.name;
        labelEl.replaceWith(input);
        input.focus();

        input.addEventListener("blur", () => {
          const newName = input.value.trim();
          if (newName) {
            bank.name = newName;
            cy_saveBanksToDisk();
          }
          input.replaceWith(labelEl);
          renderBankHeader();
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") input.blur();
        });
      });
    }

    if (!selBtn.dataset.cySelectBound) {
      selBtn.dataset.cySelectBound = "1";

      // 🧩 Bank selection dropdown
      selBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const docCtx = cy_resolveDoc();
        const menuEl = docCtx.getElementById("bankSelectMenu");

        if (!menuEl) {
          console.warn("[Holy.SNIPPETS] bankSelectMenu not found");
          return;
        }

        // rebuild menu dynamically
        menuEl.innerHTML = "";
        Holy.SNIPPETS.banks.forEach(b => {
          const li = docCtx.createElement("li");
          li.style.display = "flex";
          li.style.justifyContent = "space-between";
          li.style.alignItems = "center";

          // name button (select)
          const nameBtn = docCtx.createElement("button");
          nameBtn.textContent = b.name + (b.id === Holy.SNIPPETS.activeBankId ? " ✓" : "");
          nameBtn.dataset.action = "select";
          nameBtn.dataset.bankId = b.id;
          nameBtn.classList.add("bank-name-btn");
          nameBtn.style.flex = "1";
          li.appendChild(nameBtn);

          // rename button
          const renBtn = docCtx.createElement("button");
          renBtn.textContent = "✎";
          renBtn.title = "Rename bank";
          renBtn.classList.add("menu-side-btn");
          renBtn.dataset.action = "rename";
          renBtn.dataset.bankId = b.id;
          renBtn.style.marginLeft = "4px";
          li.appendChild(renBtn);

          // duplicate button
          const dupBtn = docCtx.createElement("button");
          dupBtn.innerHTML = "<svg width=\"12\" height=\"12\" viewBox=\"0 0 12 12\"><rect x=\"2\" y=\"2\" width=\"8\" height=\"8\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"/><rect x=\"0\" y=\"0\" width=\"8\" height=\"8\" fill=\"currentColor\"/></svg>";
          dupBtn.title = "Duplicate bank";
          dupBtn.classList.add("menu-side-btn");
          dupBtn.dataset.action = "duplicate";
          dupBtn.dataset.bankId = b.id;
          dupBtn.style.marginLeft = "4px";
          dupBtn.style.padding = "2px 4px";
          li.appendChild(dupBtn);

          // delete button (only for banks beyond #1)
          if (b.id !== 1) {
            const delBtn = docCtx.createElement("button");
            delBtn.textContent = "−";
            delBtn.title = "Delete bank";
            delBtn.classList.add("menu-side-btn");
            delBtn.dataset.action = "delete";
            delBtn.dataset.bankId = b.id;
            delBtn.style.marginLeft = "4px";
            li.appendChild(delBtn);
          }

          menuEl.appendChild(li);
        });

        // divider + new bank
        const divider = docCtx.createElement("hr");
        divider.classList.add("menu-divider");
        menuEl.appendChild(divider);

        const liNew = docCtx.createElement("li");
        const btnNew = docCtx.createElement("button");
        btnNew.textContent = "+ New Bank";
        btnNew.dataset.action = "new";
        liNew.appendChild(btnNew);
        menuEl.appendChild(liNew);

        Holy.MENU.contextM_menuBuilder(e, menuEl, {
          anchorEl: selBtn,
          onSelect: (action, ev) => {
            const target = ev && ev.target;
            const bankId = target ? target.dataset.bankId : undefined;
            contextM_BANKS_actionHandler(action, bankId);
          }
        });
      });
    }
  }



  // __________************++++0000((((((((((((((((())))
  // -==-=-++++++*********endbank***********((((((((((((((())))>>>>



  // V4 — plain snippet button (rhombus SVGs removed, redesigned UI)
  function createRhombusButton(labelText, positionIndex) {
    const doc = cy_resolveDoc();
    const btn = doc.createElement("button");
    btn.className = "f69 snippet-btn";

    const label = doc.createElement("span");
    label.className = "label";
    label.textContent = labelText || "";
    btn.appendChild(label);

    return btn;
  }



  // ---------------------------------------------------------
  // 🧠 Global state
  // ---------------------------------------------------------
  let snippet_ID = null;  // globally tracked active snippet


  function cy_getActiveSnippet() {
    const bank = cy_getActiveBank();
    if (!bank || !Array.isArray(bank.snippets)) return null;
    if (snippet_ID == null) return null;

    const targetId = snippet_ID;
    const activeSnippet = bank.snippets.find((snip) => {
      if (!snip) return false;
      // compare by string to support number ↔ string ids
      return String(snip.id) === String(targetId);
    }) || null;

    if (activeSnippet) cy_normalizeSnippet(activeSnippet);
    return activeSnippet;
  }




  // ---------------------------------------------------------
  // 🧩 Render Snippets 
  // (V4) — Multi-Bank aware + dataset ID + open token tracking
  // ---------------------------------------------------------
  function renderSnippets() {
    const doc = cy_resolveDoc();
    const bar = doc.getElementById("snippetsRow");
    if (!bar) return console.warn("[Holy.SNIPPETS] snippetsRow not found");

    // 🔁 pivot to active bank
    const _bank = cy_getActiveBank();
    const normalizedBank = _bank ? normalizeBankSnippets(_bank) : null;
    const source = normalizedBank?.snippets || [];
    const renderable = Array.isArray(source)
      ? source.slice(0, SNIPPETS_PER_BANK)
      : [];

    //  🧹 clear previous buttons
    bar.innerHTML = "";

    // 🧱 fail-safe guard
    if (renderable.length === 0) {
      const emptyMsg = doc.createElement("div");
      emptyMsg.textContent = "No snippets in this bank";
      emptyMsg.style.opacity = "0.5";
      emptyMsg.style.fontSize = "12px";
      bar.appendChild(emptyMsg);
      return;
    }

    // 🎨 build each snippet button
    renderable.forEach((snippet, index) => {
      cy_normalizeSnippet(snippet);
      const snippetId = snippet.id; // closure-safe capture
      const btn = createRhombusButton(snippet.name, index);
      btn.dataset.id = snippetId; // keep only this

      // Mark button if snippet has saved controls
      const hasControls = snippet.controls
        && Array.isArray(snippet.controls.effects)
        && snippet.controls.effects.length > 0;
      if (hasControls) btn.classList.add("has-controls");

      // PickClick overlay button
      var pcBtn = doc.createElement("button");
      pcBtn.className = "snippet-pc-btn";
      pcBtn.setAttribute("aria-label", "PickClick apply: " + (snippet.name || "snippet"));
      pcBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160.59 161.62"><polyline points="94.32 66.89 76.8 49.37 49.66 76.51 83.42 110.27 132.95 60.74 76.71 4.5 4.5 76.71 84.28 157.12 156.09 84.78" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="14"/></svg>';
      pcBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();

        if (!Holy.PICKCLICK || typeof Holy.PICKCLICK.arm !== "function") {
          console.warn("[Holy.SNIPPETS] PickClick not available");
          return;
        }

        var pcSnippet = snippet;
        var pcSnippetId = snippetId;
        var pcHasControls = hasControls;

        Holy.PICKCLICK.arm({
          intent: "snippet-apply",
          onResolve: function () {
            var loadCheckbox = doc.getElementById("snipLoadControls");
            var shouldApplyControls = !!(loadCheckbox && loadCheckbox.checked);

            if (shouldApplyControls && pcHasControls && cs && typeof cs.evalScript === "function") {
              var idLit = typeof pcSnippetId === "number" && isFinite(pcSnippetId)
                ? pcSnippetId
                : JSON.stringify(String(pcSnippetId));
              cs.evalScript("holy_applyControlsJSON(" + idLit + ", true)", function (res) {
                console.log("[Holy.SNIPPETS] PickClick controls apply:", res);
              });
            }

            cy_evalApplyExpression(pcSnippet.expr, function (res) {
              if (res && res.ok) {
                Holy.UI.toast("PickClick applied: " + pcSnippet.name);
              } else {
                Holy.UI.toast("PickClick apply failed: " + ((res && res.err) || "unknown"));
              }
            });
          },
          onCancel: function () {
            Holy.UI.toast("PickClick cancelled");
          }
        });
      });
      btn.appendChild(pcBtn);

      // 🖱 Left-click → apply expression
        btn.addEventListener("click", () => {
          const loadCheckbox = doc.getElementById("snipLoadControls");
          const shouldApplyControls = !!(loadCheckbox && loadCheckbox.checked);
          const toastApplyError = () => {
            if (Holy.UI && typeof Holy.UI.toast === "function") {
              Holy.UI.toast("Snippet error: Apply failed");
            }
          };

        if (shouldApplyControls && cs && typeof cs.evalScript === "function") {
          const idLiteral = typeof snippetId === "number" && isFinite(snippetId)
            ? snippetId
            : JSON.stringify(String(snippetId));

          const jsxCommand = `holy_applyControlsJSON(${idLiteral}, true)`;
          cs.evalScript(jsxCommand, (response) => {
            var contextControls = {
              action: "Snippet Controls Apply",
              snippetName: snippet.name,
              snippetId: snippetId,
              controlsApplied: true
            };
            if (Holy.BUTTONS && typeof Holy.BUTTONS.logPanelEvent === "function") {
              var payloadControls = response;
              if (typeof response === "string" && response.trim()) {
                try {
                  payloadControls = JSON.parse(response);
                } catch (errParse) {
                  payloadControls = response;
                }
              }
              Holy.BUTTONS.logPanelEvent("Snippet Controls Apply", contextControls, payloadControls);
            }
            if (typeof response !== "string" || !response.trim()) {
              console.warn("[Holy.SNIPPETS] Apply Controls returned empty response", response);
              toastApplyError();
              return;
            }

            var NEW_forCustomer_controlsResult = null;
            try { NEW_forCustomer_controlsResult = JSON.parse(response); }
            catch (NEW_forCustomer_controlsErr) { NEW_forCustomer_controlsResult = null; }
            if (NEW_forCustomer_controlsResult && !NEW_forCustomer_controlsResult.error && NEW_forCustomer_controlsResult.ok !== false) {
              if (typeof Holy === "object" && Holy && Holy.UTILS && typeof Holy.UTILS.NEW_forCustomer_emit === "function") {
                var NEW_forCustomer_effectsCount = Array.isArray(NEW_forCustomer_controlsResult.effects) ? NEW_forCustomer_controlsResult.effects.length : 0;
                var NEW_forCustomer_controlsMessage = 'Snippet controls applied: ' + snippet.name;
                if (NEW_forCustomer_effectsCount) {
                  NEW_forCustomer_controlsMessage += ' (' + NEW_forCustomer_effectsCount + ' effect' + (NEW_forCustomer_effectsCount === 1 ? '' : 's') + ')';
                }
                Holy.UTILS.NEW_forCustomer_emit(NEW_forCustomer_controlsMessage);
              }
            }
          });
        } else if (cs && typeof cs.evalScript === "function") {
          // ✅ Normal snippet application fallback
          const idLiteral = typeof snippetId === "number" && isFinite(snippetId)
            ? snippetId
            : JSON.stringify(String(snippetId));

          const jsxCommand = `holy_applySnippet(${idLiteral})`;
          console.log("[Holy.SNIPPETS] sending to ExtendScript:", jsxCommand);
          cs.evalScript(jsxCommand, (response) => {
            if (Holy.BUTTONS && typeof Holy.BUTTONS.logPanelEvent === "function") {
              var payloadSnippet = response;
              if (typeof response === "string" && response.trim()) {
                try {
                  payloadSnippet = JSON.parse(response);
                } catch (errParse) {
                  payloadSnippet = response;
                }
              }
              Holy.BUTTONS.logPanelEvent("Snippet Host Apply", {
                action: "Snippet Host Apply",
                snippetName: snippet.name,
                snippetId: snippetId
              }, payloadSnippet);
            }
            console.log("[Holy.SNIPPETS] response from ExtendScript:", response, typeof response);

            if (!response || response.trim().toLowerCase() === "fail") {
              console.warn("[Holy.SNIPPETS] Apply failed: empty or 'fail' response");
              toastApplyError();
              return;
            }

            console.log("[Holy.SNIPPETS] Snippet apply SUCCESS →", response);
          });
        } else {
          toastApplyError();
        }

        cy_evalApplyExpression(snippet.expr, (res) => {
          if (Holy.BUTTONS && typeof Holy.BUTTONS.updateApplyReport === "function") {
            Holy.BUTTONS.updateApplyReport(`Snippet: ${snippet.name}`, res, {
              action: "Snippet Apply",
              snippetName: snippet.name,
              snippetId: snippetId,
              controlsApplied: shouldApplyControls,
              expressionPreview: snippet.expr,
              expressionLength: String(snippet.expr || "").length
            });
          }
          if (res && res.ok) {
            Holy.UI.toast(`Applied: ${snippet.name}`);
            if (typeof Holy === "object" && Holy && Holy.UTILS && typeof Holy.UTILS.NEW_forCustomer_emit === "function") {
              var NEW_forCustomer_appliedCount = (typeof res.written === "number") ? res.written : (typeof res.applied === "number") ? res.applied : null;
              var NEW_forCustomer_snippetMessage = 'Snippet applied: ' + snippet.name;
              if (NEW_forCustomer_appliedCount !== null) {
                NEW_forCustomer_snippetMessage += ' (' + NEW_forCustomer_appliedCount + (NEW_forCustomer_appliedCount === 1 ? ' property' : ' properties') + ')';
              }
              Holy.UTILS.NEW_forCustomer_emit(NEW_forCustomer_snippetMessage);
            }
          } else {
            Holy.UI.toast(`Snippet error: ${res?.err || "Apply failed"}`);
          }
        });
      });

      // 🖱 Right-click → open context menu (Edit / Express)
      btn.addEventListener(
        "mousedown",
        (e) => {
          if (e.button !== 2) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          e.stopPropagation();

          const docCtx = cy_resolveDoc();
          const menuEl = docCtx.getElementById("snippetContextMenu");

          if (!menuEl) {
            console.warn("[Holy.SNIPPETS] Context menu element not found");
            return;
          }

          // ✅ store ID BEFORE opening menu
          snippet_ID = snippetId;
          console.log(`[Holy.SNIPPETS] Stored snippet ID ${snippetId}`);

          // 💾 also carry the ID + token via dataset for safer retrieval
          menuEl.dataset.snipId = snippetId;
          menuEl.dataset.token = Date.now();
          console.log(
            `[Holy.SNIPPETS] Menu open token ${menuEl.dataset.token} for ID ${snippetId}`
          );

          // Show the context menu (ensuring the ID remains until menu click)
          Holy.MENU.contextM_menuBuilder(e, menuEl, {
            anchorEl: btn,
            onSelect: (action, ev, menu) => {
              console.log(`[Holy.SNIPPETS] onSelect from menu: ${action}`);
              contextM_SNIPPETS_actionHandler(action);
            }
          });

        },
        true
      );

      bar.appendChild(btn);
    });

    // 💾 persist banks after creation (Patch 4)
    cy_saveBanksToDisk();

    console.log(
      `[Holy.SNIPPETS] Rendered ${renderable.length} snippets from bank: ${normalizedBank?.name || "?"}`
    );
  }
function holy_applySnippet(snippetId) {
    try {
        $.writeln("[Holy.ExtendScript] holy_applySnippet called with id: " + snippetId);
        // (Later this will actually apply the snippet)
        return "ok"; // ✅ must return something non-empty
    } catch (err) {
        $.writeln("[Holy.ExtendScript] Error in holy_applySnippet: " + err);
        return "fail";
    }
}






  // ---------------------------------------------------------
  // 💾 Save Snippet — Foreground Panel version (multi-bank aware)
  // ---------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    const doc = cy_resolveDoc();
    const saveBtn = doc.getElementById("saveSnip");

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const name = doc.getElementById("snipName")?.value || "";
        const expr = doc.getElementById("snipExpr")?.value || "";

        const bank = cy_getActiveBank();
        const snip = bank.snippets.find(s => s.id === snippet_ID);

        if (snip) {
          cy_normalizeSnippet(snip);
          snip.name = name.trim() || snip.name;
          snip.expr = expr.trim() || snip.expr;
          renderSnippets();
          Holy.UI.toast(`Snippet updated in bank: ${bank.name}`);
        } else {
          console.warn("[Holy.SNIPPETS] saveSnip: snippet not found");
        }
      });
    } else {
    }
  });




  // ---------------------------------------------------------
  // 💡 Host bridge: apply expression via ExtendScript
  // ---------------------------------------------------------
  function cy_evalApplyExpression(exprText, cb) {
    try {
      var payload = { expressionText: String(exprText || "") };
      var js = 'he_S_SS_applyExpressionToSelection(' + JSON.stringify(JSON.stringify(payload)) + ')';
      cs.evalScript(js, function (res) {
        var out = {};
        try { out = JSON.parse(res || "{}"); } catch (e) { }
        if (typeof cb === "function") cb(out);
      });
    } catch (err) {
      console.error("[Holy.SNIPPETS] eval failed:", err);
      if (Holy.UI && Holy.UI.toast) Holy.UI.toast("Snippet apply failed");
    }
  }

  // ---------------------------------------------------------
  // 💡 Helper: send expression to CodeMirror editor
  // ---------------------------------------------------------
  function cy_sendToExpressArea(exprText) {
    if (!Holy.EXPRESS || !Holy.EXPRESS.EDITOR_insertText) {
      console.warn("[Holy.SNIPPETS] EXPRESS.insertText unavailable");
      return;
    }
    Holy.EXPRESS.EDITOR_insertText(exprText);
    if (Holy.UI && Holy.UI.toast) Holy.UI.toast("Sent to Express Area");
  }















  // ---------------------------------------------------------
  // 💡 Context menu system (delegated to Holy.UTILS)
  // ---------------------------------------------------------


  // ---------------------------------------------------------
  // 🧩 Snippet Edit UI — Foreground Panel version (multi-bank ready)
  // ---------------------------------------------------------
  function openSnippetEditUI(snipId) {
    const bank = cy_getActiveBank();
    const snip = bank.snippets.find(s => s.id === snipId);
    if (!snip) return console.warn("[Holy.SNIPPETS] snippet not found in active bank:", snipId);
    cy_normalizeSnippet(snip);

    // 🪶 Create Foreground Panel dynamically
    const panel = Holy.UTILS.cy_createForegroundPanel("foregroundSnippetEditor", {
      title: `Edit Snippet – ${snip.name}`,

      innerHTML: `
      <div class="snippet-editor-form">
        <label for="fgSnipName">Name</label>
        <input id="fgSnipName" type="text" value="${snip.name}" class="snippet-editor-input">

        <label for="fgSnipExpr">Expression</label>
        <textarea id="fgSnipExpr" class="snippet-editor-textarea">${snip.expr}</textarea>

        <div class="snippet-editor-buttons">
          <button id="fgSaveSnip" class="btn snippet-editor-save">Save</button>
          <button id="fgSaveControls" class="button">Save Controls</button>
          <button id="fgCancelSnip" class="button">Cancel</button>
        </div>
      </div>
    `
    });

    const saveControlsBtn = panel.querySelector("#fgSaveControls");
    if (saveControlsBtn && !saveControlsBtn.dataset.cyBound) {
      saveControlsBtn.dataset.cyBound = "true";
      saveControlsBtn.addEventListener("click", function () {
        const snippetResolver = Holy?.SNIPPETS?.cy_getActiveSnippet;
        if (typeof snippetResolver !== "function") {
          console.warn("[Holy.SNIPPETS] Save Controls aborted: resolver missing");
          return;
        }

        const snippet = snippetResolver();
        if (!snippet) {
          console.warn("[Holy.SNIPPETS] Save Controls aborted: no active snippet");
          return;
        }

        if (!cs || typeof cs.evalScript !== "function") {
          console.warn("[Holy.SNIPPETS] Save Controls aborted: CSInterface unavailable");
          return;
        }

        const rawId = snippet.id;
        if (rawId === undefined || rawId === null) {
          console.warn("[Holy.SNIPPETS] Save Controls aborted: snippet missing id", snippet);
          return;
        }

        const idLiteral = (typeof rawId === "number" && isFinite(rawId))
          ? rawId
          : JSON.stringify(String(rawId));

        const jsxCommand = `holy_captureControlsJSON(${idLiteral})`;

        cs.evalScript(jsxCommand, function (response) {
          if (typeof response !== "string" || !response.trim() || response === "undefined") {
            console.warn("[Holy.SNIPPETS] Save Controls returned empty response", response);
            return;
          }

          let payload = null;
          try {
            payload = JSON.parse(response);
          } catch (err) {
            console.warn("[Holy.SNIPPETS] Save Controls invalid JSON", err, response);
            return;
          }

          if (!payload || typeof payload !== "object") {
            console.warn("[Holy.SNIPPETS] Save Controls returned non-object payload", payload);
            return;
          }

          if (payload.error) {
            console.warn("[Holy.SNIPPETS] Save Controls reported error:", payload.error);
            return;
          }

          snippet.controls = payload;

          if (typeof Holy?.SNIPPETS?.cy_saveBanksToDisk === "function") {
            Holy.SNIPPETS.cy_saveBanksToDisk();
          } else {
            cy_saveBanksToDisk();
          }

          console.log(`[Holy.SNIPPETS] Saved controls for snippet: ${snippet.name}`);
          if (typeof Holy === "object" && Holy && Holy.UTILS && typeof Holy.UTILS.NEW_forCustomer_emit === "function") {
            var NEW_forCustomer_savedEffects = Array.isArray(payload.effects) ? payload.effects.length : 0;
            var NEW_forCustomer_savedMessage = 'Snippet controls saved: ' + snippet.name;
            if (NEW_forCustomer_savedEffects) {
              NEW_forCustomer_savedMessage += ' (' + NEW_forCustomer_savedEffects + ' effect' + (NEW_forCustomer_savedEffects === 1 ? '' : 's') + ')';
            }
            Holy.UTILS.NEW_forCustomer_emit(NEW_forCustomer_savedMessage);
          }
        });
      });
    }

    // 🧩 Retrieve field references
    const nameInput = panel.querySelector("#fgSnipName");
    const exprInput = panel.querySelector("#fgSnipExpr");
    const saveBtn = panel.querySelector("#fgSaveSnip");
    const cancelBtn = panel.querySelector("#fgCancelSnip");

    // ✅ Preserve CodeMirror isolation
    if (exprInput) {
      exprInput.removeEventListener("focus", Holy.EXPRESS?.attachListeners);
      exprInput.removeEventListener("input", Holy.EXPRESS?.EDITOR_insertText);
    }

    // ✅ Prefill + track global ID
    nameInput.value = snip.name;
    exprInput.value = snip.expr;
    snippet_ID = snip.id;

    // 💾 Save handler
    saveBtn.onclick = () => {
      const newName = nameInput.value.trim();
      const newExpr = exprInput.value.trim();
      snip.name = newName || snip.name;
      snip.expr = newExpr || snip.expr;

      renderSnippets();
      // 💾 persist updated bank state to disk (Patch 3)
      cy_saveBanksToDisk();
      panel.remove();
      Holy.UI?.toast?.(`Updated: ${snip.name}`);
      console.log(`[Holy.SNIPPETS] Foreground panel updated snippet →`, snip);
    };

    // ❌ Cancel handler
    cancelBtn.onclick = () => {
      panel.remove();
      console.log(`[Holy.SNIPPETS] Edit cancelled for: ${snip.name}`);
    };

    console.log(`[Holy.SNIPPETS] Foreground edit panel opened for: ${snip.name}`);
  }




















  // ─── Snippet Manager ───────────────────────────────────────────
  function smAutoResize(el) {
    el.style.height = "auto";
    var maxH = 18 * 5 + 12; // 5 lines × 18px + vertical padding
    var newH = Math.min(el.scrollHeight, maxH);
    el.style.height = newH + "px";
    el.style.overflowY = el.scrollHeight > maxH ? "auto" : "hidden";
  }

  function cy_openSnippetManager() {
    const doc = cy_resolveDoc();
    const bankOptions = Holy.SNIPPETS.banks.map(b =>
      `<option value="${b.id}" ${b.id === Holy.SNIPPETS.activeBankId ? 'selected' : ''}>${b.name}</option>`
    ).join('');
    const panel = Holy.UTILS.cy_createForegroundPanel("snippetManagerPanel", {
      title: "Snippet Manager",
      innerHTML: `
        <div class="sm-bank-row">
          <label class="sm-section-label">Bank</label>
          <select id="smBankSelect" class="sm-bank-select">${bankOptions}</select>
        </div>
        <div class="sm-tabs-container">
          <div class="sm-tab-bar" id="smTabBar"></div>
          <div id="smSnippetRows"></div>
        </div>
        <div class="sm-manager-footer">
          <button id="smCancelBtn" class="button">Cancel</button>
          <button id="smSaveBtn" class="btn snippet-editor-save">Save</button>
        </div>
      `
    });
    function smRenderRows(bankId) {
      const bank = Holy.SNIPPETS.banks.find(b => b.id === bankId);
      if (!bank) return;
      normalizeBankSnippets(bank);
      const container = panel.querySelector("#smSnippetRows");
      const tabBar = panel.querySelector("#smTabBar");
      container.innerHTML = "";
      tabBar.innerHTML = "";
      const docCtx = cy_resolveDoc();
      const total = bank.snippets.length;
      bank.snippets.forEach(function(snip, si) {
        cy_normalizeSnippet(snip);
        const row = smBuildSnippetRow(snip, si);
        row.style.display = si === 0 ? "" : "none";
        container.appendChild(row);
        const tab = docCtx.createElement("button");
        tab.className = "sm-tab" + (si === 0 ? " active" : "");
        tab.textContent = String(si + 1);
        tab.addEventListener("click", function() {
          tabBar.querySelectorAll(".sm-tab").forEach(function(t) { t.classList.remove("active"); });
          tab.classList.add("active");
          container.querySelectorAll(".sm-snippet-row").forEach(function(r, ri) {
            r.style.display = ri === si ? "" : "none";
          });
          var shownRow = container.querySelectorAll(".sm-snippet-row")[si];
          var ta = shownRow && shownRow.querySelector(".sm-snip-expr");
          if (ta) smAutoResize(ta);
        });
        tabBar.appendChild(tab);
      });
      container.querySelectorAll(".sm-snip-expr").forEach(function(ta) {
        smAutoResize(ta);
        ta.addEventListener("input", function() { smAutoResize(this); });
      });
    }
    smRenderRows(Holy.SNIPPETS.activeBankId);
    panel.querySelector("#smBankSelect").addEventListener("change", function () {
      smRenderRows(Number(this.value));
    });
    panel.querySelector("#smSaveBtn").addEventListener("click", () => {
      smCommitChanges(panel);
      cy_saveBanksToDisk();
      Holy.SNIPPETS.renderSnippets();
      panel.remove();
      if (Holy.UI && Holy.UI.toast) Holy.UI.toast("Snippet Manager: saved");
    });
    panel.querySelector("#smCancelBtn").addEventListener("click", () => panel.remove());
  }
  function smBuildSnippetRow(snip, index) {
    const doc = cy_resolveDoc();
    const row = doc.createElement("div");
    row.className = "sm-snippet-row";
    row.dataset.snipId = snip.id;
    const nameInput = doc.createElement("input");
    nameInput.type = "text";
    nameInput.className = "sm-snip-name snippet-editor-input";
    nameInput.value = snip.name;
    nameInput.dataset.snipId = snip.id;
    row.appendChild(nameInput);
    const exprLabel = doc.createElement("div");
    exprLabel.className = "sm-section-label";
    exprLabel.textContent = "Expression";
    row.appendChild(exprLabel);
    const exprInput = doc.createElement("textarea");
    exprInput.className = "sm-snip-expr snippet-editor-textarea";
    exprInput.value = snip.expr;
    exprInput.dataset.snipId = snip.id;
    exprInput.rows = 1;
    row.appendChild(exprInput);
    const ctrlLabel = doc.createElement("div");
    ctrlLabel.className = "sm-section-label";
    ctrlLabel.textContent = "Controls";
    row.appendChild(ctrlLabel);
    const effects = (snip.controls && Array.isArray(snip.controls.effects))
      ? snip.controls.effects : [];
    if (effects.length === 0) {
      const noCtrl = doc.createElement("span");
      noCtrl.className = "sm-no-controls";
      noCtrl.textContent = "No controls saved";
      row.appendChild(noCtrl);
    } else {
      effects.forEach((fx, ei) => {
        const fxEl = doc.createElement("div");
        fxEl.className = "sm-effect-entry";
        const fxName = doc.createElement("div");
        fxName.className = "sm-effect-name";
        fxName.textContent = fx.name || fx.matchName;
        fxEl.appendChild(fxName);
        const propsContainer = doc.createElement("div");
        propsContainer.className = "sm-props-container";
        (fx.properties || []).forEach((prop, pi) => {
          const propRow = doc.createElement("div");
          propRow.className = "sm-prop-row";
          const propName = doc.createElement("span");
          propName.className = "sm-prop-name";
          propName.textContent = prop.name;
          propRow.appendChild(propName);
          const isNumeric = typeof prop.value === "number";
          const valInput = doc.createElement("input");
          valInput.type = isNumeric ? "number" : "text";
          valInput.className = "sm-prop-value";
          valInput.value = isNumeric ? prop.value : JSON.stringify(prop.value);
          valInput.dataset.effectIdx = ei;
          valInput.dataset.propIdx = pi;
          valInput.dataset.snipId = snip.id;
          propRow.appendChild(valInput);
          if (prop.expression) {
            const exprLbl = doc.createElement("span");
            exprLbl.className = "sm-prop-expr-label";
            exprLbl.textContent = "expr:";
            propRow.appendChild(exprLbl);
            const exprIn = doc.createElement("input");
            exprIn.type = "text";
            exprIn.className = "sm-prop-expr";
            exprIn.value = prop.expression;
            exprIn.dataset.effectIdx = ei;
            exprIn.dataset.propIdx = pi;
            exprIn.dataset.snipId = snip.id;
            propRow.appendChild(exprIn);
          }
          propsContainer.appendChild(propRow);
        });
        fxEl.appendChild(propsContainer);
        row.appendChild(fxEl);
      });
    }
    return row;
  }
  function smCommitChanges(panel) {
    const selectedBankId = Number(panel.querySelector("#smBankSelect").value);
    const bank = Holy.SNIPPETS.banks.find(b => b.id === selectedBankId);
    if (!bank) return;
    panel.querySelectorAll(".sm-snippet-row").forEach(row => {
      const snipId = row.dataset.snipId;
      const snip = bank.snippets.find(s => String(s.id) === String(snipId));
      if (!snip) return;
      const nameEl = row.querySelector(".sm-snip-name");
      if (nameEl && nameEl.value.trim()) snip.name = nameEl.value.trim();
      const exprEl = row.querySelector(".sm-snip-expr");
      if (exprEl) snip.expr = exprEl.value;
      row.querySelectorAll(".sm-prop-value").forEach(input => {
        const ei = Number(input.dataset.effectIdx);
        const pi = Number(input.dataset.propIdx);
        const fx = snip.controls && snip.controls.effects && snip.controls.effects[ei];
        const prop = fx && fx.properties && fx.properties[pi];
        if (!prop) return;
        prop.value = input.type === "number" ? Number(input.value) : input.value;
      });
      row.querySelectorAll(".sm-prop-expr").forEach(input => {
        const ei = Number(input.dataset.effectIdx);
        const pi = Number(input.dataset.propIdx);
        const fx = snip.controls && snip.controls.effects && snip.controls.effects[ei];
        const prop = fx && fx.properties && fx.properties[pi];
        if (!prop) return;
        prop.expression = input.value;
      });
    });
  }

  // ---------------------------------------------------------
  // 💡 Main button wiring
  // ---------------------------------------------------------
  // V2.1 — cy_wireSingleButton (scoped DOM + safe container)
  function cy_wireSingleButton() {
    const doc = cy_resolveDoc(); // 🧩 ensure correct document (main vs quick panel)
    const btn = doc.getElementById("he_snippet_wiggle");
    if (!btn) {
      console.warn("[Holy.SNIPPETS] Wiggle button not found in this panel");
      return;
    }

    // 💡 Left-click → Apply expression immediately
    btn.addEventListener("click", () => {
      const expr = "wiggle(2, 20)";
      cy_evalApplyExpression(expr, (res) => {
        if (Holy.BUTTONS && typeof Holy.BUTTONS.updateApplyReport === "function") {
          Holy.BUTTONS.updateApplyReport("Snippet: wiggle(2, 20)", res, {
            action: "Snippet Apply",
            snippetName: "wiggle(2, 20)",
            snippetId: "quick-wiggle",
            controlsApplied: false,
            expressionPreview: expr,
            expressionLength: expr.length
          });
        }

        if (res && res.ok) {
          Holy.UI?.toast?.("Applied: wiggle(2, 20)");
          if (typeof Holy === "object" && Holy && Holy.UTILS && typeof Holy.UTILS.NEW_forCustomer_emit === "function") {
            var NEW_forCustomer_wiggleCount = typeof res.applied === "number" ? res.applied : null;
            var NEW_forCustomer_wiggleMessage = 'Snippet applied: wiggle(2, 20)';
            if (NEW_forCustomer_wiggleCount !== null) {
              NEW_forCustomer_wiggleMessage += ' (' + NEW_forCustomer_wiggleCount + (NEW_forCustomer_wiggleCount === 1 ? ' property' : ' properties') + ')';
            }
            Holy.UTILS.NEW_forCustomer_emit(NEW_forCustomer_wiggleMessage);
          }
        } else {
          Holy.UI?.toast?.("Snippet error: " + (res?.err || "Apply failed"));
        }
      });
    });

    // 🖱 Right-click → Show global context menu
    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const menu = doc.querySelector(".context-menu");
      if (!menu) {
        console.warn("[Holy.SNIPPETS] Context menu element not found in this panel");
        return;
      }

      // Use new global utility for consistent alignment
      Holy.MENU.contextM_menuBuilder(e, menu, {
        container: doc.getElementById("snippetsBar"),
        anchorEl: btn,
        onSelect: (action, ev, menuEl) => {
          contextM_SNIPPETS_actionHandler(action);
        },
      });
    });
  }





  // ---------------------------------------------------------
  // ⚡ Context-menu action dispatcher (V3 — multi-bank)
  // ---------------------------------------------------------
  function contextM_SNIPPETS_actionHandler(action) {
    console.log(`[Holy.SNIPPETS] Context action triggered: ${action}`);
    console.log(`[Holy.SNIPPETS] Current stored ID:`, snippet_ID);

    const bank = cy_getActiveBank();

    switch (action) {
      case "edit":
        if (snippet_ID != null) {
          console.log(`[Holy.SNIPPETS] Opening edit UI for ID ${snippet_ID}`);
          openSnippetEditUI(snippet_ID);
        } else {
          console.warn("[Holy.SNIPPETS] No snippet ID stored for edit");
        }
        break;

      case "express": {
        const snip = bank.snippets.find(s => s.id === snippet_ID);
        if (!snip) {
          console.warn("[Holy.SNIPPETS] No snippet found for Express action");
          return;
        }

        cy_normalizeSnippet(snip);

        cy_sendToExpressArea(snip.expr);
        Holy.UI?.toast?.(`Sent ${snip.name} to Express Area (Bank: ${bank.name})`);
        console.log(`[Holy.SNIPPETS] Expressed snippet ${snip.id}: ${snip.expr}`);
        break;
      }

      default:
        console.warn("[Holy.SNIPPETS] Unknown context action:", action);
    }
  }


  // V1.0 – bank context-menu router
  function contextM_BANKS_actionHandler(action, bankId) {
    switch (action) {
      case "select":
        if (!bankId) return;
        cy_setActiveBank(Number(bankId));
        break;

      case "new": {
        const newId = Holy.SNIPPETS.banks.reduce((max, bank) => {
          const candidate = Number(bank && bank.id);
          return candidate > max ? candidate : max;
        }, 0) + 1;

        const newBank = normalizeBankSnippets({
          id: newId,
          name: `Bank ${newId}`,
          snippets: cy_createEmptySnippetArray()
        });

        Holy.SNIPPETS.banks.push(newBank);
        Holy.SNIPPETS.activeBankId = newBank.id;
        cy_saveBanksToDisk();
        renderBankHeader();
        renderSnippets();

        Holy.UI.toast(`Created new bank: ${newBank.name}`);
        console.log(`[Holy.SNIPPETS] Created new bank →`, newBank);
        break;
      }

      case "rename": {
        if (!bankId) break;
        const bankToRename = Holy.SNIPPETS.banks.find(b => b.id === Number(bankId));
        if (!bankToRename) break;
        
        const newName = prompt("Enter new bank name:", bankToRename.name);
        if (!newName || newName.trim() === "") break;
        
        bankToRename.name = newName.trim();
        cy_saveBanksToDisk();
        renderBankHeader();
        Holy.UI.toast(`Bank renamed to: ${bankToRename.name}`);
        console.log(`[Holy.SNIPPETS] Renamed bank to →`, bankToRename.name);
        break;
      }

      case "delete":
        if (!bankId || Number(bankId) === 1) {
          Holy.UI.toast("Bank 1 cannot be deleted");
          break;
        }
        Holy.SNIPPETS.banks = Holy.SNIPPETS.banks.filter(b => b.id !== Number(bankId));
        Holy.SNIPPETS.banks = cy_normalizeBanksCollection(Holy.SNIPPETS.banks);
        Holy.SNIPPETS.activeBankId = Holy.SNIPPETS.banks[0].id;
        cy_saveBanksToDisk();
        renderBankHeader();
        renderSnippets();
        Holy.UI.toast("Bank deleted");
        break;

      case "duplicate": {
        if (!bankId) break;
        const sourceBank = Holy.SNIPPETS.banks.find(b => b.id === Number(bankId));
        if (!sourceBank) break;
        
        const maxId = Holy.SNIPPETS.banks.reduce((max, b) => {
          const candidate = Number(b && b.id);
          return candidate > max ? candidate : max;
        }, 0);
        
        const baseName = sourceBank.name;
        const existingDupes = Holy.SNIPPETS.banks
          .filter(b => b.name === baseName + " 2" || b.name.match(new RegExp("^" + baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + " \\d+$")))
          .map(b => {
            const match = b.name.match(/ (\d+)$/);
            return match ? parseInt(match[1], 10) : 1;
          });
        
        let nextNum = 2;
        if (existingDupes.length > 0) {
          nextNum = Math.max(...existingDupes) + 1;
        }
        
        const newName = baseName + " " + nextNum;
        
        const newBank = normalizeBankSnippets({
          id: maxId + 1,
          name: newName,
          snippets: sourceBank.snippets.map(s => ({ ...s }))
        });
        
        Holy.SNIPPETS.banks.push(newBank);
        Holy.SNIPPETS.activeBankId = newBank.id;
        cy_saveBanksToDisk();
        renderBankHeader();
        renderSnippets();
        Holy.UI.toast(`Duplicated bank as: ${newBank.name}`);
        console.log(`[Holy.SNIPPETS] Duplicated bank →`, newBank);
        break;
      }


      default:
        console.warn("[Holy.SNIPPETS] Unknown bank menu action:", action);
    }
  }




  // ---------------------------------------------------------
  // ⚡ Context-menu action dispatcher (V3 — multi-bank)
  // ---------------------------------------------------------
  function contextM_SNIPPETS_actionHandler(action) {
    console.log(`[Holy.SNIPPETS] Context action triggered: ${action}`);
    console.log(`[Holy.SNIPPETS] Current stored ID:`, snippet_ID);

    const bank = cy_getActiveBank();

    switch (action) {
      case "edit":
        if (snippet_ID != null) {
          console.log(`[Holy.SNIPPETS] Opening edit UI for ID ${snippet_ID}`);
          openSnippetEditUI(snippet_ID);
        } else {
          console.warn("[Holy.SNIPPETS] No snippet ID stored for edit");
        }
        break;

      case "express": {
        const snip = bank.snippets.find(s => s.id === snippet_ID);
        if (!snip) {
          console.warn("[Holy.SNIPPETS] No snippet found for Express action");
          return;
        }

        cy_normalizeSnippet(snip);

        cy_sendToExpressArea(snip.expr);
        Holy.UI?.toast?.(`Sent ${snip.name} to Express Area (Bank: ${bank.name})`);
        console.log(`[Holy.SNIPPETS] Expressed snippet ${snip.id}: ${snip.expr}`);
        break;
      }

      default:
        console.warn("[Holy.SNIPPETS] Unknown context action:", action);
    }
  }















  // ---------------------------------------------------------
  // 💡 Init (V3 — uses active bank abstraction)
  // ---------------------------------------------------------
    function init() {
      console.log("[Holy.SNIPPETS] init() invoked");

      try {
        rebindQuickAccessUI();
      } catch (err) {
        console.warn("[Holy.SNIPPETS] init → rebindQuickAccessUI failed", err);
      }

      try {
        renderSnippets();
      } catch (err2) {
        console.warn("[Holy.SNIPPETS] init → renderSnippets failed", err2);
      }

    }



  function rebindQuickAccessUI() {
    try {
      bankBinder();
    } catch (err) {
      console.warn("[Holy.SNIPPETS] bankBinder failed during rebind", err);
    }

    try {
      renderBankHeader();
    } catch (err) {
      console.warn("[Holy.SNIPPETS] renderBankHeader failed during rebind", err);
    }
  }

  // ---------------------------------------------------------
  // ⚙️ Activate interactive context menu actions
  // ---------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    try {
      console.log("[Holy.SNIPPETS] DOMContentLoaded → Context menu actions initialized ✅");
      bankBinder();       // ✅ corrected name — attaches rename + select listeners
      renderBankHeader(); // render menu entries and label
      const doc = cy_resolveDoc();
      const managerBtn = doc.getElementById("openSnippetManager");
      if (managerBtn && !managerBtn.dataset.cyBound) {
        managerBtn.dataset.cyBound = "1";
        managerBtn.addEventListener("click", () => cy_openSnippetManager());
      }
    } catch (err) {
      console.warn("[Holy.SNIPPETS] Context menu init failed:", err);
    }
  });
  // ---------------------------------------------------------
  // 🧩 HOLY AGENT BRIDGE — banksUpdated listener
  // When Holy Agent writes to banks.json, it dispatches
  // com.holy.agent.banksUpdated. Expressor picks it up here,
  // reloads from disk, and re-renders its snippet UI.
  // ---------------------------------------------------------
  cs.addEventListener("com.holy.agent.banksUpdated", function () {
    console.log("[Holy.SNIPPETS] Holy Agent banksUpdated event received — reloading from disk");
    try {
      const { file } = Holy.UTILS.cy_getBanksPaths();
      const loaded = Holy.UTILS.cy_readJSONFile(file);
      if (loaded && Array.isArray(loaded.banks) && loaded.banks.length) {
        Holy.SNIPPETS.banks = cy_normalizeBanksCollection(loaded.banks);
        var hasActive = Holy.SNIPPETS.banks.some(function (bank) {
          return bank && bank.id === loaded.activeBankId;
        });
        if (hasActive) {
          Holy.SNIPPETS.activeBankId = loaded.activeBankId;
        } else if (Holy.SNIPPETS.banks[0] && Holy.SNIPPETS.banks[0].id !== undefined) {
          Holy.SNIPPETS.activeBankId = Holy.SNIPPETS.banks[0].id;
        }
        console.log("[Holy.SNIPPETS] Banks reloaded — bank count:", Holy.SNIPPETS.banks.length);
      }
    } catch (e) {
      console.warn("[Holy.SNIPPETS] banksUpdated reload failed:", e);
    }
    try { renderBankHeader(); } catch (_) {}
    try { renderSnippets(); } catch (_) {}
  });
  // ---------------------------------------------------------
  // 🚀 MODULE EXPORT (Preserve existing Holy.SNIPPETS.bank)
  // ---------------------------------------------------------
  if (!Holy.SNIPPETS) Holy.SNIPPETS = {};

  Holy.SNIPPETS.init = init;
  Holy.SNIPPETS.cy_evalApplyExpression = cy_evalApplyExpression;
  Holy.SNIPPETS.cy_wireSingleButton = cy_wireSingleButton;

  Holy.SNIPPETS.cy_sendToExpressArea = cy_sendToExpressArea;
  Holy.SNIPPETS.openSnippetEditUI = openSnippetEditUI;
  Holy.SNIPPETS.cy_openSnippetManager = cy_openSnippetManager;

  Holy.SNIPPETS.contextM_SNIPPETS_actionHandler = contextM_SNIPPETS_actionHandler;

  Holy.SNIPPETS.renderSnippets = renderSnippets;
  Holy.SNIPPETS.rebindQuickAccessUI = rebindQuickAccessUI;


  Holy.SNIPPETS.cy_getActiveBank = cy_getActiveBank;
  Holy.SNIPPETS.cy_getActiveSnippet = cy_getActiveSnippet;
  Holy.SNIPPETS.normalizeBankSnippets = normalizeBankSnippets;
  Holy.SNIPPETS.cy_createEmptySnippet = cy_createEmptySnippet;
  Holy.SNIPPETS.cy_saveBanksToDisk = cy_saveBanksToDisk;


})();
