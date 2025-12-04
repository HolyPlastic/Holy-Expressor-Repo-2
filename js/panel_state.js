// 🧩 Holy Expressor - Panel State Helper
(function () {
  'use strict';

  var HolyPanelState = {
    keyPrefix: 'holyExpressor_panel_',

    save: function (panelId) {
      try {
        var win = window;
        var data = {
          x: win.screenX,
          y: win.screenY,
          w: win.outerWidth,
          h: win.outerHeight
        };
        localStorage.setItem(this.keyPrefix + panelId + '_pos', JSON.stringify(data));
      } catch (e) {
        console.warn('Panel state save failed:', e);
      }
    },

    restore: function (panelId) {
      try {
        var raw = localStorage.getItem(this.keyPrefix + panelId + '_pos');
        if (!raw) {
          return;
        }
        var data = JSON.parse(raw);
        if (!data) {
          return;
        }
        window.moveTo(data.x, data.y);
        window.resizeTo(data.w, data.h);
      } catch (e) {
        console.warn('Panel state restore failed:', e);
      }
    }
  };

  function resolvePanelId() {
    var title = document.title || '';
    if (/quick/i.test(title)) {
      return 'quickpanel';
    }
    if (/color picker/i.test(title)) {
      return 'colorpicker';
    }
    return 'panel';
  }

  if (typeof window.Holy !== 'object') {
    window.Holy = {};
  }
  window.Holy.PanelState = HolyPanelState;

  var panelId;
  window.addEventListener('DOMContentLoaded', function () {
    panelId = resolvePanelId();
    HolyPanelState.restore(panelId);
  });

  window.addEventListener('beforeunload', function () {
    if (!panelId) {
      panelId = resolvePanelId();
    }
    HolyPanelState.save(panelId);
  });
})();
