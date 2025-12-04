// 🎨 Holy Expressor - Modeless Color Picker
(function () {
  'use strict';

  function initPicker() {
    var input = document.getElementById('themeColorInput');
    var canvas = document.getElementById('themeColorCanvas');
    var hueSlider = document.getElementById('themeHueSlider');
    var applyBtn = document.querySelector('.btn-apply');
    var cancelBtn = document.querySelector('.btn-cancel');
    var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;

    // V1 – canvas buffer sync to layout
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth || canvas.width));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight || canvas.height));

    if (!input || !canvas || !hueSlider || !applyBtn || !cancelBtn || !ctx) {
      console.error('[ColorPicker] Missing required elements.');
      return;
    }

    var parentDocument = window.opener && !window.opener.closed ? window.opener.document : null;
    var localRoot = document.documentElement;

    var state = { h: 180, s: 100, l: 50 };
    var isPointerActive = false;
    var pointerId = null;
    var gradientImageData = null;
    var initialHex = '#1EFFD6';
    var lastBroadcast = 0;
    var svMarker = null;
    var svContainer = canvas ? (canvas.parentElement || canvas.parentNode) : null;

    if (svContainer && typeof svContainer.appendChild === 'function') {
      try {
        var computedPos = window.getComputedStyle ? window.getComputedStyle(svContainer).position : null;
        if (!computedPos || computedPos === 'static') {
          svContainer.style.position = 'relative';
        }
      } catch (errPos) {
        if (!svContainer.style.position) {
          svContainer.style.position = 'relative';
        }
      }

      svMarker = document.createElement('div');
      svMarker.id = 'svMarker';
      svMarker.style.position = 'absolute';
      svMarker.style.width = '12px';
      svMarker.style.height = '12px';
      svMarker.style.border = '2px solid rgba(255,255,255,0.9)';
      svMarker.style.borderRadius = '50%';
      svMarker.style.pointerEvents = 'none';
      svMarker.style.transform = 'translate(-6px, -6px)';
      svContainer.appendChild(svMarker);
    }

    function clamp(v, min, max) {
      return Math.min(Math.max(v, min), max);
    }

    function componentToHex(component) {
      return clamp(Math.round(component), 0, 255).toString(16).padStart(2, '0').toUpperCase();
    }

    function rgbToHex(r, g, b) {
      return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    function hexToRgb(hex) {
      if (typeof hex !== 'string') {
        return null;
      }
      var value = hex.trim().replace('#', '');
      if (value.length === 3) {
        value = value.split('').map(function (c) { return c + c; }).join('');
      }
      if (value.length !== 6) {
        return null;
      }
      var intValue = parseInt(value, 16);
      if (isNaN(intValue)) {
        return null;
      }
      return {
        r: (intValue >> 16) & 255,
        g: (intValue >> 8) & 255,
        b: intValue & 255
      };
    }

    function rgbToHsl(r, g, b) {
      r /= 255;
      g /= 255;
      b /= 255;

      var max = Math.max(r, g, b);
      var min = Math.min(r, g, b);
      var h = 0;
      var s = 0;
      var l = (max + min) / 2;

      if (max !== min) {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
          default:
            h = 0;
        }
        h /= 6;
      }

      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
      };
    }

    function hslToRgb(h, s, l) {
      var hue = ((h % 360) + 360) % 360;
      var sat = clamp(s / 100, 0, 1);
      var lig = clamp(l / 100, 0, 1);

      if (sat === 0) {
        var gray = Math.round(lig * 255);
        return [gray, gray, gray];
      }

      var c = (1 - Math.abs(2 * lig - 1)) * sat;
      var x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
      var m = lig - c / 2;

      var r1 = 0;
      var g1 = 0;
      var b1 = 0;

      if (hue < 60) {
        r1 = c; g1 = x; b1 = 0;
      } else if (hue < 120) {
        r1 = x; g1 = c; b1 = 0;
      } else if (hue < 180) {
        r1 = 0; g1 = c; b1 = x;
      } else if (hue < 240) {
        r1 = 0; g1 = x; b1 = c;
      } else if (hue < 300) {
        r1 = x; g1 = 0; b1 = c;
      } else {
        r1 = c; g1 = 0; b1 = x;
      }

      return [
        Math.round((r1 + m) * 255),
        Math.round((g1 + m) * 255),
        Math.round((b1 + m) * 255)
      ];
    }

    function normalizeHex(value) {
      if (typeof value !== 'string') {
        return null;
      }
      var trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      if (trimmed[0] !== '#') {
        trimmed = '#' + trimmed;
      }
      var rgb = hexToRgb(trimmed);
      return rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : null;
    }

    function updateDerivedVariables(root, hex) {
      var rgb = hexToRgb(hex);
      if (!rgb) {
        return;
      }
      var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      root.style.setProperty('--G-colour-1-RGB', rgb.r + ', ' + rgb.g + ', ' + rgb.b);
      root.style.setProperty('--G-color-1-H', hsl.h);
      root.style.setProperty('--G-color-1-S', hsl.s + '%');
      root.style.setProperty('--G-color-1-L', hsl.l + '%');
    }

    // V9.3 Broadcast color to main panel
    function broadcastColorToMain(hex) {
      try {
        if (typeof CSInterface !== 'function') {
          throw new Error('CSInterface unavailable');
        }
        var cs = new CSInterface();
        var evt = new CSEvent('holy.color.change', 'APPLICATION');
        evt.data = JSON.stringify({ hex: hex });
        cs.dispatchEvent(evt);
      } catch (err) {
        console.warn('[ColorPicker] Failed to dispatch color event', err);
      }
    }

    function broadcastThrottled(hex) {
      var now = Date.now();
      if (now - lastBroadcast < 33) {
        return;
      }
      lastBroadcast = now;
      broadcastColorToMain(hex);
    }

    function previewColor(hex, options) {
      var normalized = normalizeHex(hex);
      if (!normalized) {
        return;
      }

      localRoot.style.setProperty('--G-color-1', normalized);
      updateDerivedVariables(localRoot, normalized);

      if (!options || options.updateInput !== false) {
        input.value = normalized;
      }

      if (options && options.skipBroadcast) {
        return;
      }

      if (options && options.immediate) {
        lastBroadcast = Date.now();
        broadcastColorToMain(normalized);
      } else {
        broadcastThrottled(normalized);
      }
    }

    function updateMarkerPosition() {
      if (!svMarker) {
        return;
      }
      var sRatio = clamp(state.s / 100, 0, 1);
      var lRatio = clamp(state.l / 100, 0, 1);
      var rect = canvas.getBoundingClientRect();
      var w = rect.width || canvas.width;
      var h = rect.height || canvas.height;
      var markerX = sRatio * w;
      var markerY = (1 - lRatio) * h;
      svMarker.style.left = markerX + 'px';
      svMarker.style.top = markerY + 'px';
    }

    function buildCanvas() {
      gradientImageData = ctx.createImageData(canvas.width, canvas.height);
      var hue = state.h;
      for (var y = 0; y < canvas.height; y += 1) {
        var light = 100 - (y / (canvas.height - 1)) * 100;
        for (var x = 0; x < canvas.width; x += 1) {
          var sat = (x / (canvas.width - 1)) * 100;
          var rgb = hslToRgb(hue, sat, light);
          var index = (y * canvas.width + x) * 4;
          gradientImageData.data[index] = rgb[0];
          gradientImageData.data[index + 1] = rgb[1];
          gradientImageData.data[index + 2] = rgb[2];
          gradientImageData.data[index + 3] = 255;
        }
      }
      ctx.putImageData(gradientImageData, 0, 0);
      updateMarkerPosition();
    }

    function updateStateFromPointer(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      var xRatio = clamp((clientX - rect.left) / rect.width, 0, 1);
      var yRatio = clamp((clientY - rect.top) / rect.height, 0, 1);
      state.s = xRatio * 100;
      state.l = 100 - yRatio * 100;
      var rgb = hslToRgb(state.h, state.s, state.l);
      updateMarkerPosition();
      previewColor(rgbToHex(rgb[0], rgb[1], rgb[2]));
    }

    function syncStateFromHex(hex, options) {
      var rgb = hexToRgb(hex);
      if (!rgb) {
        return;
      }
      var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      state.h = hsl.h;
      state.s = hsl.s;
      state.l = hsl.l;
      hueSlider.value = String(hsl.h);
      buildCanvas();
      var rgbFromState = hslToRgb(state.h, state.s, state.l);
      updateMarkerPosition();
      previewColor(rgbToHex(rgbFromState[0], rgbFromState[1], rgbFromState[2]), options);
    }

    hueSlider.addEventListener('input', function () {
      state.h = parseFloat(hueSlider.value) || 0;
      buildCanvas();
      var rgb = hslToRgb(state.h, state.s, state.l);
      updateMarkerPosition();
      previewColor(rgbToHex(rgb[0], rgb[1], rgb[2]));
    });

    canvas.addEventListener('pointerdown', function (event) {
      isPointerActive = true;
      pointerId = event.pointerId;
      canvas.setPointerCapture(pointerId);
      updateStateFromPointer(event.clientX, event.clientY);
    });

    canvas.addEventListener('pointermove', function (event) {
      if (!isPointerActive || event.pointerId !== pointerId) {
        return;
      }
      updateStateFromPointer(event.clientX, event.clientY);
    });

    function releasePointer() {
      if (pointerId !== null) {
        try {
          canvas.releasePointerCapture(pointerId);
        } catch (err) {
          // noop
        }
      }
      pointerId = null;
      isPointerActive = false;
    }

    canvas.addEventListener('pointerup', function (event) {
      if (event.pointerId === pointerId) {
        releasePointer();
      }
    });

    canvas.addEventListener('pointercancel', releasePointer);
    canvas.addEventListener('pointerleave', releasePointer);

    canvas.addEventListener('click', function (event) {
      updateStateFromPointer(event.clientX, event.clientY);
    });

    input.addEventListener('input', function () {
      var normalized = normalizeHex(input.value);
      if (normalized) {
        syncStateFromHex(normalized, { immediate: true });
      }
    });

    input.addEventListener('blur', function () {
      input.value = normalizeHex(input.value) || initialHex;
    });

    // V10.2 Ensure Apply applies the color and broadcasts to main panel
    applyBtn.addEventListener('click', function () {
      var normalized = normalizeHex(input.value);
      if (normalized) {
        var persisted = false;
        if (typeof Holy === 'object' && Holy !== null && Holy.PERSIST && typeof Holy.PERSIST.set === 'function') {
          try {
            persisted = Holy.PERSIST.set('he_themeColor', normalized);
            if (persisted) {
              console.log('[ColorPicker] Saved theme color via adapter', normalized);
            }
          } catch (errPersist) {
            console.warn('[ColorPicker] Failed to persist theme color via adapter', errPersist);
          }
        }
        if (!persisted) {
          try {
            localStorage.setItem('he_themeColor', normalized);
          } catch (errLocal) {
            console.warn('[ColorPicker] Fallback persist via localStorage failed', errLocal);
          }
        }

        // local preview + CSEvent broadcast already happen inside previewColor
        previewColor(normalized, { immediate: true });

        // Fallback path: call main panel directly if available
        try {
          if (window.opener && !window.opener.closed && typeof window.opener.__HolyExpressorColorChange === 'function') {
            window.opener.__HolyExpressorColorChange(normalized);
          }
        } catch (e) {
          console.warn('[ColorPicker] opener fallback failed', e);
        }
      }
      window.close();
    });

    cancelBtn.addEventListener('click', function () {
      syncStateFromHex(initialHex, { immediate: true });
      window.close();
    });

    function readInitialHex() {
      try {
        var openerDoc = (window.opener && !window.opener.closed) ? window.opener.document : null;
        parentDocument = openerDoc;
        var view = (window.opener && !window.opener.closed) ? window.opener
          : (openerDoc && openerDoc.defaultView) ? openerDoc.defaultView
            : window;
        var rootEl = (openerDoc ? openerDoc.documentElement : null) || document.documentElement;

        var cssValue = view.getComputedStyle(rootEl).getPropertyValue('--G-color-1');
        var normalized = normalizeHex(cssValue) || '#1EFFD6';
        initialHex = normalized;
        return normalized;
      } catch (err) {
        console.warn('[ColorPicker] Failed to read initial theme color', err);
        return initialHex;
      }
    }

    function init() {
      var persistedHex = null;
      try {
        if (typeof Holy === 'object' && Holy !== null && Holy.PERSIST && typeof Holy.PERSIST.get === 'function') {
          persistedHex = Holy.PERSIST.get('he_themeColor');
        }
      } catch (errPersist) {
        console.warn('[ColorPicker] Adapter load failed', errPersist);
      }
      if (!persistedHex) {
        try {
          persistedHex = localStorage.getItem('he_themeColor');
        } catch (errLocal) {
          console.warn('[ColorPicker] localStorage unavailable for theme color', errLocal);
        }
      }
      if (persistedHex) {
        var normalizedPersisted = normalizeHex(persistedHex);
        if (normalizedPersisted) {
          initialHex = normalizedPersisted;
          input.value = normalizedPersisted;
          syncStateFromHex(normalizedPersisted, { skipBroadcast: true });
          console.log('[ColorPicker] Loaded persisted color', normalizedPersisted);
          return;
        }
      }

      var hex = readInitialHex();
      input.value = hex;
      syncStateFromHex(hex, { skipBroadcast: true });
    }

    init();
    buildCanvas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPicker);
  } else {
    initPicker();
  }
})();
