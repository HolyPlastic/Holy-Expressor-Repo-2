/**
 * HLMColorPicker — standalone reusable color picker for CEP panels.
 *
 * Drop-in module: include this script, then call HLMColorPicker.init(options)
 * before any open() calls.
 *
 * ── USAGE ──────────────────────────────────────────────────────────────────
 *
 *   HLMColorPicker.init({
 *     fetchSwatches : function(callback) {
 *                       // async — call callback([{ hex: '#ff0000', name: 'Red' }, ...])
 *                       callback([]);
 *                     },
 *     onApply       : function(targetId, hex) { ... },  // hex = '#RRGGBB'
 *     onReset       : function(targetId)      { ... },
 *   });
 *
 *   // Open picker anchored to a button; targetId is any string you choose
 *   HLMColorPicker.open(targetId, anchorElement, currentHex);
 *
 *   // Close programmatically
 *   HLMColorPicker.close();
 *
 * ── LAYOUT (top → bottom) ──────────────────────────────────────────────────
 *   Row 1 : [OK]  [Reset]           — side-by-side, each flex:1
 *   Row 2 : [🎨 native picker]  [# hex input]
 *   Row 3+: swatch tiles (flex-wrap, reflow at any width)
 *
 * ── POSITIONING ───────────────────────────────────────────────────────────
 *   The popup spans the full panel width (left:margin, right:margin) and
 *   opens below the anchor, flipping above if there isn't enough space.
 *
 * ── REQUIRED CSS ──────────────────────────────────────────────────────────
 *   Expects the design-system variables from HLM's style.css:
 *     --bg-surface, --bg-input, --bg-panel, --border-subtle,
 *     --accent, --accent-dim, --accent-border, --accent-border-hi,
 *     --text-primary, --text-muted, --text-faint,
 *     --radius-sm, --radius-md, --transition
 *   If you're using this outside HLM, define those variables or override the
 *   CSS classes (.color-picker-popup, .cp-*, #cpHexInput) directly.
 * ───────────────────────────────────────────────────────────────────────────
 */
(function (global) {
    'use strict';

    /* ── private state ────────────────────────────────────────────────── */
    var PICKER_ID      = 'hlmColorPicker';
    var _targetId      = null;
    var _onApply       = function () {};
    var _onReset       = function () {};
    var _onPreview     = function () {};
    var _fetchSwatches = function (cb) { cb([]); };
    var _built         = false;
    var _swatchCache   = null;   // cache swatch data after first fetch

    /* ── build DOM ───────────────────────────────────────────────────── */
    function _build() {
        if (_built) return;
        _built = true;

        var el = document.createElement('div');
        el.id        = PICKER_ID;
        el.className = 'color-picker-popup';
        el.style.display = 'none';

        el.innerHTML = [
            /* Row 1 — OK / Reset */
            '<div class="cp-top-row">',
            '  <button id="cpApplyBtn"  class="cp-ok-btn"    >OK</button>',
            '  <button id="cpResetBtn"  class="cp-reset-btn" >Reset</button>',
            '</div>',

            /* Row 2 — native picker trigger + hex input */
            '<div class="cp-input-row">',
            '  <input type="color" id="cpNativePicker"',
            '    style="position:absolute;opacity:0;width:0;height:0;pointer-events:none;border:none;padding:0;">',
            '  <button id="cpNativeBtn" class="cp-native-btn" title="Open system color picker">',
            '    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor"',
            '         stroke-width="1.2" stroke-linecap="round"',
            '         xmlns="http://www.w3.org/2000/svg">',
            '      <circle cx="5" cy="5" r="3.6"/>',
            '      <line x1="5" y1=".3" x2="5" y2="1.3"/>',
            '      <line x1="5" y1="8.7" x2="5" y2="9.7"/>',
            '      <line x1=".3" y1="5" x2="1.3" y2="5"/>',
            '      <line x1="8.7" y1="5" x2="9.7" y2="5"/>',
            '    </svg>',
            '  </button>',
            '  <span class="cp-hash">#</span>',
            '  <input type="text" id="cpHexInput" maxlength="6"',
            '         placeholder="rrggbb" spellcheck="false" autocomplete="off">',
            '</div>',

            /* Row 3+ — swatches */
            '<div id="cpSwatchGrid" class="cp-swatch-grid"></div>',
        ].join('\n');

        document.body.appendChild(el);
        _bindEvents();
    }

    /* ── event binding ───────────────────────────────────────────────── */
    function _bindEvents() {
        /* OK */
        document.getElementById('cpApplyBtn').addEventListener('click', function () {
            var val = document.getElementById('cpHexInput').value.trim().replace(/^#/, '');
            if (/^[0-9a-fA-F]{6}$/.test(val)) {
                _apply('#' + val.toUpperCase());
            }
        });

        /* Enter key in hex field */
        document.getElementById('cpHexInput').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') document.getElementById('cpApplyBtn').click();
        });

        /* Hex input real-time preview */
        document.getElementById('cpHexInput').addEventListener('input', function (e) {
            var val = e.target.value.trim().replace(/^#/, '');
            if (/^[0-9a-fA-F]{6}$/.test(val)) {
                _preview('#' + val.toUpperCase());
            }
        });

        /* Reset */
        document.getElementById('cpResetBtn').addEventListener('click', function () {
            _reset();
        });

        /* Native OS color picker */
        var native = document.getElementById('cpNativePicker');
        document.getElementById('cpNativeBtn').addEventListener('click', function () {
            var cur = document.getElementById('cpHexInput').value.trim();
            if (/^[0-9a-fA-F]{6}$/.test(cur)) {
                native.value = '#' + cur;
            }
            native.click();
        });
        native.addEventListener('input', function (e) {
            var hexVal = e.target.value.replace('#', '').toUpperCase();
            document.getElementById('cpHexInput').value = hexVal;
            _preview('#' + hexVal);
        });

        /* Close when clicking outside */
        document.addEventListener('click', function (e) {
            var picker = document.getElementById(PICKER_ID);
            if (picker &&
                picker.style.display !== 'none' &&
                !e.target.closest('#' + PICKER_ID)) {
                _close();
            }
        });
    }

    /* ── apply / reset / close ───────────────────────────────────────── */
    function _apply(hex) {
        if (_targetId) _onApply(_targetId, hex);
        _close();
    }

    function _preview(hex) {
        if (_targetId && typeof _onPreview === 'function') _onPreview(_targetId, hex);
    }

    function _reset() {
        if (_targetId) _onReset(_targetId);
        _close();
    }

    function _close() {
        var el = document.getElementById(PICKER_ID);
        if (el) el.style.display = 'none';
        _targetId = null;
    }

    /* ── positioning ─────────────────────────────────────────────────── */
    function _position(el, anchorEl) {
        var MARGIN = 4;
        /* Span full panel width */
        el.style.left  = MARGIN + 'px';
        el.style.right = MARGIN + 'px';
        el.style.width = 'auto';

        /* Vertical: below anchor, flip above if not enough room */
        var rect = anchorEl.getBoundingClientRect();
        var ph   = el.offsetHeight || 130;
        var top  = rect.bottom + 3;
        if (top + ph > window.innerHeight) top = rect.top - ph - 3;
        if (top < 2) top = 2;
        el.style.top = top + 'px';
    }

    /* ── populate swatches ───────────────────────────────────────────── */
    function _loadSwatches(cb) {
        if (_swatchCache) { cb(_swatchCache); return; }
        _fetchSwatches(function (swatches) {
            _swatchCache = swatches;
            cb(swatches);
        });
    }

    function _renderSwatches(swatches) {
        var grid = document.getElementById('cpSwatchGrid');
        if (!grid) return;
        grid.innerHTML = '';
        swatches.forEach(function (swatch) {
            var sw = document.createElement('div');
            sw.className = 'cp-swatch';
            if (swatch.hex) {
                sw.style.backgroundColor = swatch.hex;
                sw.title = swatch.name || swatch.hex;
                sw.addEventListener('click', function () { _apply(swatch.hex); });
            } else {
                sw.classList.add('cp-swatch-empty');
                sw.title = swatch.name ? swatch.name + ' (no color)' : 'No color';
            }
            grid.appendChild(sw);
        });
    }

    /* ── public open ─────────────────────────────────────────────────── */
    function _open(targetId, anchorEl, currentHex) {
        _build();
        _targetId = targetId;

        var el       = document.getElementById(PICKER_ID);
        var hexInput = document.getElementById('cpHexInput');
        hexInput.value = currentHex ? currentHex.replace(/^#/, '') : '';
        el.style.display = 'block';
        _position(el, anchorEl);

        _loadSwatches(function (swatches) {
            _renderSwatches(swatches);
            _position(el, anchorEl);   /* re-position after swatches paint */
        });
    }

    /* ── public API ──────────────────────────────────────────────────── */
    global.HLMColorPicker = {
        /**
         * Call once at startup to configure callbacks.
         * @param {Object} options
         * @param {Function} options.fetchSwatches  - async, receives callback(swatchArray)
         * @param {Function} options.onApply        - (targetId, hexString) called on OK
         * @param {Function} options.onReset       - (targetId) called on Reset
         * @param {Function} options.onPreview     - (targetId, hexString) called on each change
         */
        init: function (options) {
            options = options || {};
            if (typeof options.fetchSwatches === 'function') _fetchSwatches = options.fetchSwatches;
            if (typeof options.onApply       === 'function') _onApply       = options.onApply;
            if (typeof options.onReset       === 'function') _onReset       = options.onReset;
            if (typeof options.onPreview     === 'function') _onPreview     = options.onPreview;
            _swatchCache = null;   /* clear cache so fresh data is fetched */
            _build();
        },

        /**
         * Open the picker anchored to a DOM element.
         * @param {string}      targetId   - arbitrary ID passed back to onApply/onReset
         * @param {HTMLElement} anchorEl   - element to anchor near
         * @param {string}      [currentHex] - pre-fill hex value (e.g. '#ff7c44')
         */
        open: _open,

        /** Close the picker without applying. */
        close: _close,

        /** Manually reposition (call if the anchor has moved). */
        reposition: function (anchorEl) {
            var el = document.getElementById(PICKER_ID);
            if (el && el.style.display !== 'none') _position(el, anchorEl);
        },

        /** Invalidate the swatch cache (call if AE label data may have changed). */
        clearSwatchCache: function () {
            _swatchCache = null;
        }
    };

})(window);