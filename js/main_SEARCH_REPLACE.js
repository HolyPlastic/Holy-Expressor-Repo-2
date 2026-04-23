if (typeof Holy !== "object") Holy = {};

(function () {
  "use strict";

  function getFieldValue(selector) {
    var el = document.querySelector(selector);
    if (!el) return "";
    if (window.codemirror && el.classList.contains('rewrite-codemirror')) {
      var editor = el._codemirror;
      if (editor && editor.state) {
        return editor.state.doc.toString();
      }
    }
    return el.value || "";
  }

  function getCheckboxState(selector, defaultValue) {
    var el = document.querySelector(selector);
    if (!el) return !!defaultValue;
    return !!el.checked;
  }

  function setButtonState(btn, isBusy) {
    if (!btn) return;
    btn.disabled = !!isBusy;
    btn.classList.toggle("is-busy", !!isBusy);
  }

  function runSearchReplace(triggerButton) {
    var searchValRaw = getFieldValue("#searchField");
    var replaceVal = getFieldValue("#replaceField");
    var matchCase = getCheckboxState("#matchCase", true);
    var button = triggerButton || document.querySelector("#applyBtn");

    var searchVal = (searchValRaw != null) ? String(searchValRaw) : "";
    var normalizedSearch = searchVal.trim();

    var customToggle = document.querySelector("#useCustomSearch");
    var customInput = document.querySelector("#customSearch");
    var customSearchTerm = customInput ? String(customInput.value || "").trim() : "";
    var useCustomSearch = false;
    if (customToggle && customToggle.checked) useCustomSearch = true;
    if (!customSearchTerm) useCustomSearch = false;

    if (!normalizedSearch.length) {
      if (Holy.UI && typeof Holy.UI.toast === "function") {
        Holy.UI.toast("Enter text to search for replacement");
      }
      setButtonState(button, false);
      return Promise.resolve();
    }

    setButtonState(button, true);

    return Holy.EXPRESS.cy_replaceInExpressions(searchVal, replaceVal, {
      matchCase: matchCase,
      customSearchTerm: useCustomSearch ? customSearchTerm : ""
    })
      .then(function (summary) {
        setButtonState(button, false);
        if (summary && summary.message) {
          console.log(summary.message);
        }
        var replacementCount = (summary && typeof summary.replacements === "number") ? summary.replacements : 0;
        try {
          if (Holy && Holy.UTILS && typeof Holy.UTILS.NEW_forCustomer_emit === "function") {
            var msg = "Rewrite: " + replacementCount + (replacementCount === 1 ? " expression" : " expressions");
            Holy.UTILS.NEW_forCustomer_emit(msg);
          }
        } catch (e) {}
        if (replacementCount > 0) {
          if (Holy.UI && typeof Holy.UI.toast === "function") {
            var rewriteMsg = replacementCount === 1
              ? "1 Expression is Rewritten"
              : replacementCount + " Expressions are Rewritten";
            Holy.UI.toast(rewriteMsg);
          }
        } else if (Holy.UI && typeof Holy.UI.toast === "function") {
          if (summary && summary.customSearchUsed && summary.customSearchMatches > 0) {
            Holy.UI.toast("No replacements found in filtered properties");
          } else {
            Holy.UI.toast("No matches found");
          }
        }
        if (Holy.BUTTONS && typeof Holy.BUTTONS.logPanelEvent === "function") {
          var context = {
            action: "Search & Replace",
            searchTerm: searchVal,
            replaceValue: replaceVal,
            matchCase: matchCase,
            customSearch: useCustomSearch ? customSearchTerm : "",
            replacements: summary && summary.replacements,
            layersChanged: summary && summary.layersChanged,
            layersCount: summary && summary.layersCount,
            note: summary && summary.message
          };
          var applyReport = summary && summary.applyReport ? summary.applyReport : null;
          Holy.BUTTONS.logPanelEvent("Search & Replace", context, applyReport);
        }
        return summary;
      })
      .catch(function (err) {
        setButtonState(button, false);
        var msg = (err && err.userMessage) ? err.userMessage : "Search & Replace failed";
        console.error("[Holy.SEARCH] runSearchReplace error", err);
        if (Holy.UI && typeof Holy.UI.toast === "function") {
          Holy.UI.toast(msg);
        }
        if (Holy.BUTTONS && typeof Holy.BUTTONS.logPanelEvent === "function") {
          Holy.BUTTONS.logPanelEvent("Search & Replace (Error)", {
            action: "Search & Replace",
            searchTerm: searchVal,
            replaceValue: replaceVal,
            matchCase: matchCase,
            error: msg
          }, err);
        }
        throw err;
      });
  }

  function init() {
    initRewriteEditors();
    attachRewriteExpandListeners();
    var legacyBtn = document.querySelector("#runSearchReplace");
    if (legacyBtn && !legacyBtn.dataset.cySearchBound) {
      legacyBtn.dataset.cySearchBound = "true";
      legacyBtn.addEventListener("click", function () {
        runSearchReplace(legacyBtn);
      });
    }

    var clearBtn = document.getElementById("rewriteClearBtn");
    if (clearBtn && !clearBtn.dataset.cyClearBound) {
      clearBtn.dataset.cyClearBound = "true";
      clearBtn.addEventListener("click", function () {
        var searchEl = document.getElementById("searchField");
        var replaceEl = document.getElementById("replaceField");

        if (searchEl) {
          if (searchEl._codemirror) {
            searchEl._codemirror.dispatch({
              changes: { from: 0, to: searchEl._codemirror.state.doc.length, insert: "" }
            });
          } else {
            searchEl.value = "";
          }
        }
        if (replaceEl) {
          if (replaceEl._codemirror) {
            replaceEl._codemirror.dispatch({
              changes: { from: 0, to: replaceEl._codemirror.state.doc.length, insert: "" }
            });
          } else {
            replaceEl.value = "";
          }
        }

        try {
          var ev = new Event("input", { bubbles: true });
          if (searchEl) searchEl.dispatchEvent(ev);
          if (replaceEl) replaceEl.dispatchEvent(ev);
        } catch (e) {}

        if (searchEl && searchEl.focus) searchEl.focus();
      });
    }
  }

  function initRewriteEditors() {
    if (!window.codemirror || !window.codemirror.EditorState) {
      console.warn("[SEARCH_REPLACE] CodeMirror not available");
      return;
    }

    var searchContainer = document.getElementById("searchField");
    var replaceContainer = document.getElementById("replaceField");

    if (searchContainer && !searchContainer._codemirror) {
      var searchState = window.codemirror.EditorState.create({
        doc: "",
        extensions: [
          window.codemirror.basicSetup,
          window.codemirror.javascript(),
          window.codemirror.oneDark,
          window.codemirror.EditorView.lineWrapping,
          window.codemirror.EditorView.theme({
            "&": { height: "auto", minHeight: "24px", maxHeight: "64px" },
            ".cm-scroller": { overflow: "auto", minHeight: "20px", maxHeight: "64px" }
          })
        ]
      });
      searchContainer._codemirror = new window.codemirror.EditorView({
        state: searchState,
        parent: searchContainer
      });
    }

    if (replaceContainer && !replaceContainer._codemirror) {
      var replaceState = window.codemirror.EditorState.create({
        doc: "",
        extensions: [
          window.codemirror.basicSetup,
          window.codemirror.javascript(),
          window.codemirror.oneDark,
          window.codemirror.EditorView.lineWrapping,
          window.codemirror.EditorView.theme({
            "&": { height: "auto", minHeight: "24px", maxHeight: "64px" },
            ".cm-scroller": { overflow: "auto", minHeight: "20px", maxHeight: "64px" }
          })
        ]
      });
      replaceContainer._codemirror = new window.codemirror.EditorView({
        state: replaceState,
        parent: replaceContainer
      });
    }
  }

  function attachRewriteExpandListeners() {
    var cm = window.codemirror;
    if (!cm || !cm.EditorView || !cm.StateEffect) return;

    var pairs = [
      { fieldId: 'searchField', wrapperId: 'rewriteSearchWrapper' },
      { fieldId: 'replaceField', wrapperId: 'rewriteReplaceWrapper' }
    ];

    pairs.forEach(function (pair) {
      var container = document.getElementById(pair.fieldId);
      var wrapper = document.getElementById(pair.wrapperId);
      if (!container || !container._codemirror || !wrapper) return;

      container._codemirror.dispatch({
        effects: cm.StateEffect.appendConfig.of(
          cm.EditorView.updateListener.of(function (update) {
            if (!update.docChanged && !update.geometryChanged) return;
            var lines = update.state.doc.lines;
            var extra = Math.max(0, lines - 1);
            // Shift center downward as field grows — protects the label above from overlap
            var safety = Math.min(extra * 6, 12);
            // Subtly shrink the label towards its bottom-left as lines increase
            var labelScale = Math.max(0.9, 1 - extra * 0.05);
            wrapper.style.setProperty('--cm-safety', safety + 'px');
            wrapper.style.setProperty('--cm-label-scale', labelScale);
          })
        )
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  Holy.SEARCH = {
    init: init,
    runSearchReplace: runSearchReplace
  };
})();
