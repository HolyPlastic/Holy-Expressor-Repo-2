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
    var searchVal = getFieldValue("#searchField");
    var replaceVal = getFieldValue("#replaceField");
    var matchCase = getCheckboxState("#matchCase", true);
    var button = triggerButton || document.querySelector("#applyBtn");

    setButtonState(button, true);

    return Holy.EXPRESS.cy_replaceInExpressions(searchVal, replaceVal, {
      matchCase: matchCase
    })
      .then(function (summary) {
        setButtonState(button, false);
        if (summary && summary.message) {
          console.log(summary.message);
        }
        if (summary && summary.replacements > 0) {
          if (Holy.UI && typeof Holy.UI.toast === "function") {
            Holy.UI.toast("Search & Replace complete");
          }
        } else if (Holy.UI && typeof Holy.UI.toast === "function") {
          Holy.UI.toast("No matches found");
        }
        if (Holy.BUTTONS && typeof Holy.BUTTONS.logPanelEvent === "function") {
          var context = {
            action: "Search & Replace",
            searchTerm: searchVal,
            replaceValue: replaceVal,
            matchCase: matchCase,
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
