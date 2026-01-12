if (typeof Holy !== "object") Holy = {};

(function () {
  "use strict";

  function getFieldValue(selector) {
    var el = document.querySelector(selector);
    return el ? el.value : "";
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
    if (!useCustomSearch && customSearchTerm) useCustomSearch = true;
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

        if (searchEl) searchEl.value = "";
        if (replaceEl) replaceEl.value = "";

        try {
          var ev = new Event("input", { bubbles: true });
          if (searchEl) searchEl.dispatchEvent(ev);
          if (replaceEl) replaceEl.dispatchEvent(ev);
        } catch (e) {}

        if (searchEl && searchEl.focus) searchEl.focus();
      });
    }
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
