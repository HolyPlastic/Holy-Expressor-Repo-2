// main_BG.js — Holy Expressor background grid overlay
// Renders a decorative SVG symbol grid behind the plugin UI.
// Transparent to AE background. pointer-events: none throughout.

if (typeof Holy !== "object") Holy = {};

(function () {
  "use strict";

  // ---------------------------------------------------------
  // 🎨 GRID CONFIG — your single control object.
  // Change these values to restyle the grid with no other edits.
  // ---------------------------------------------------------
  var GridConfig = {
    spacing: 26,               // px between grid points
    symbolSize: 7,             // rendered size of each symbol in px (at full scale)
    opacity: 0.15,             // overall layer opacity (0–1)
    baseSymbol: "sym-dot",     // symbol used for ordinary cells
    rowOffset: 0,              // 0 = square grid, 0.5 = hex/staggered
    seed: 42,                  // seed for random scatter (base cells only)

    // #region 🎯 SPECIAL SYMBOLS — placed at deterministic tile positions-------
    // ---------------------------------------------------------------------------
    // Specials always win. Randoms only fill cells NOT claimed by a special.
    //
    // Three placement modes — pick one per entry:
    //
    //   mode: "tile"
    //     Repeats on a tileW x tileH grid. slotCol/slotRow define
    //     which cell inside that tile gets the symbol (0-indexed).
    //     e.g. centre of every 3x3 block: tileW:3, tileH:3, slotCol:1, slotRow:1
    //
    //   mode: "every-n-cols"
    //     Fires on every Nth column, any row. offset shifts the start.
    //     e.g. every 4th column: interval:4, offset:0
    //
    //   mode: "every-n-rows"
    //     Fires on every Nth row, any column. offset shifts the start.
    //     e.g. every 4th row: interval:4, offset:0
    //
    // Multiple rules are fine. First match wins if two rules clash.
    // #endregion---------------------------------------------------------
    specials: [
      {
        symbol: "sym-spark",
        mode: "tile",
        tileW: 4,      // tile is 4 cols wide
        tileH: 4,      // tile is 4 rows tall
        slotCol: 2,    // which col inside the tile (0-indexed)
        slotRow: 2     // which row inside the tile (0-indexed)
      }
      // More examples (uncomment to try):
      //
      // { symbol: "sym-cross",   mode: "every-n-cols", interval: 5, offset: 0 },
      // { symbol: "sym-diamond", mode: "every-n-rows", interval: 6, offset: 0 },
      // { symbol: "sym-ring",    mode: "tile", tileW: 4, tileH: 4, slotCol: 0, slotRow: 0 }
    ],

    // Random accent — only fires on cells NOT claimed by a special
    randomAccent: {
      enabled: true,
      symbol: "sym-cross",
      probability: 0.05
    },

    // #region 🌑 VIGNETTE — size falloff from centre outward-------
    // --------------------------------------------------------------
    // Symbols shrink toward the centre and reach full size at the edges.
    //
    //   enabled      — toggle the whole effect
    //   innerRadius  — normalised distance from centre where shrinking begins.
    //                  0 = starts at dead centre, 0.5 = starts halfway out.
    //   outerRadius  — normalised distance where symbols reach full size.
    //                  1.0 = at the panel edge, 1.4 = at the corners.
    //   minScale     — smallest a symbol can get (0 = invisible, 0.1 = tiny)
    //   curve        — falloff shape:
    //                  "linear"     — straight ramp
    //                  "smoothstep" — gentle S-curve (recommended)
    //                  "ease-in"    — slow start, fast finish at edge
    //
    //   cssmask      — also applies a radial CSS mask on the container.
    //                  Softens the very centre where symbols are near-zero
    //                  size anyway. Complements the JS size effect nicely.
    //   maskInner    — % radius where mask is fully transparent (centre hole)
    //   maskOuter    — % radius where mask becomes fully opaque
    // #endregion---------------------------------------------------------
    vignette: {
      enabled: true,
      innerRadius: 0.45, // 0 = closer to center, 1 = closer to edge
      outerRadius: 0.90, // inner is center, outer is edge
      minScale: 0.0,
      curve: "smoothstep",
      
      cssmask: false,
      maskInner: "15%",
      maskOuter: "60%"
    }
  };

  // ---------------------------------------------------------
  // 🎲 SEEDED RANDOM
  // Deterministic so base-cell randoms stay consistent on resize.
  // ---------------------------------------------------------
  function seededRandom(seed) {
    var s = seed;
    return function () {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  // ---------------------------------------------------------
  // 📐 FALLOFF CURVES
  // Maps a normalised distance (0–1) to a scale value (0–1).
  // ---------------------------------------------------------
  function applyFalloffCurve(t, curve) {
    if (curve === "smoothstep") {
      return t * t * (3 - 2 * t);
    } else if (curve === "ease-in") {
      return t * t;
    }
    return t; // linear
  }

  // ---------------------------------------------------------
  // 🌑 VIGNETTE SCALE
  // Returns a scale multiplier (0–1) for a symbol at pixel position (x, y).
  // 0 = centre (invisible), 1 = edge (full size).
  // ---------------------------------------------------------
  function vignetteScale(x, y, W, H) {
    var v = GridConfig.vignette;
    if (!v.enabled) return 1;

    // Normalise position: dx/dy go from -1 to +1 across the panel
    var dx = (x - W / 2) / (W / 2);
    var dy = (y - H / 2) / (H / 2);

    // Elliptical distance (0 = centre, 1 = edge, ~1.41 = corner)
    var dist = Math.sqrt(dx * dx + dy * dy);

    // Remap dist into 0–1 range between innerRadius and outerRadius
    var inner = v.innerRadius;
    var outer = v.outerRadius;
    var t = (dist - inner) / (outer - inner);
    t = Math.max(0, Math.min(1, t)); // clamp

    // Apply falloff curve
    t = applyFalloffCurve(t, v.curve);

    // Map to final scale range
    return v.minScale + t * (1 - v.minScale);
  }

  // ---------------------------------------------------------
  // 🎯 SPECIAL RESOLVER
  // Returns a symbol id if any special rule claims this cell, else null.
  // First matching rule wins.
  // ---------------------------------------------------------
  function resolveSpecial(col, row) {
    var specials = GridConfig.specials;
    for (var i = 0; i < specials.length; i++) {
      var s = specials[i];
      if (s.mode === "tile") {
        var tileCol = ((col % s.tileW) + s.tileW) % s.tileW;
        var tileRow = ((row % s.tileH) + s.tileH) % s.tileH;
        if (tileCol === s.slotCol && tileRow === s.slotRow) return s.symbol;
      } else if (s.mode === "every-n-cols") {
        if (((col - (s.offset || 0)) % s.interval + s.interval) % s.interval === 0) return s.symbol;
      } else if (s.mode === "every-n-rows") {
        if (((row - (s.offset || 0)) % s.interval + s.interval) % s.interval === 0) return s.symbol;
      }
    }
    return null;
  }

  // ---------------------------------------------------------
  // 🖼️ RENDER
  // ---------------------------------------------------------
  function renderGrid() {
    var svg = document.getElementById("hx-bg-grid");
    var root = document.getElementById("hx-bg-root");
    if (!svg || !root) return;

    var W = window.innerWidth;
    var H = window.innerHeight;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.opacity = GridConfig.opacity;

    // Apply or remove the CSS mask on the root container
    var v = GridConfig.vignette;
    if (v.enabled && v.cssmask) {
      var mask = "radial-gradient(ellipse at center, transparent " + v.maskInner + ", black " + v.maskOuter + ")";
      root.style.webkitMaskImage = mask;
      root.style.maskImage = mask;
    } else {
      root.style.webkitMaskImage = "";
      root.style.maskImage = "";
    }

    var rng = seededRandom(GridConfig.seed);

    var cols = Math.ceil(W / GridConfig.spacing) + 1;
    var rows = Math.ceil(H / GridConfig.spacing) + 1;

    var offsetX = (W - (cols - 1) * GridConfig.spacing) / 2;
    var offsetY = (H - (rows - 1) * GridConfig.spacing) / 2;

    for (var row = 0; row < rows; row++) {
      var xShift = (row % 2 === 1) ? GridConfig.spacing * GridConfig.rowOffset : 0;

      for (var col = 0; col < cols; col++) {
        var x = offsetX + col * GridConfig.spacing + xShift;
        var y = offsetY + row * GridConfig.spacing;

        // Get vignette scale for this position
        var scale = vignetteScale(x, y, W, H);

        // Skip symbols that have scaled to nothing (saves DOM nodes)
        if (scale < 0.01) continue;

        var size = GridConfig.symbolSize * scale;
        var half = size / 2;

        // 1. Special rules take priority
        var specialId = resolveSpecial(col, row);
        var symbolId;

        if (specialId) {
          symbolId = specialId;
        } else {
          // 2. Random accent only on non-special cells
          var ra = GridConfig.randomAccent;
          if (ra.enabled && rng() < ra.probability) {
            symbolId = ra.symbol;
          } else {
            symbolId = GridConfig.baseSymbol;
          }
        }

        var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.setAttribute("href", "#" + symbolId);
        use.setAttribute("x", x - half);
        use.setAttribute("y", y - half);
        use.setAttribute("width", size);
        use.setAttribute("height", size);

        svg.appendChild(use);
      }
    }
  }

  // ---------------------------------------------------------
  // 🏗️ INIT — injects the SVG container + symbol defs into the DOM.
  // Called once on DOMContentLoaded. Safe to call again manually.
  // ---------------------------------------------------------
  function init() {
    if (document.getElementById("hx-bg-root")) return;

    // ---- Symbol definitions (your Illustrator exports go here) ----
    // Each <symbol> is a 10x10 viewBox. Use fill="currentColor" or
    // stroke="currentColor" so the CSS colour variable drives the tint.
    var defsHTML = [
      "<defs>",

        // DOT — solid filled circle
        '<symbol id="sym-dot" viewBox="0 0 10 10">',
          '<circle cx="5" cy="5" r="2.2" fill="currentColor"/>',
        "</symbol>",

        // RING — hollow circle
        '<symbol id="sym-ring" viewBox="0 0 10 10">',
          '<circle cx="5" cy="5" r="2.8" fill="none" stroke="currentColor" stroke-width="1.1"/>',
        "</symbol>",

        // CROSS — + shape
        '<symbol id="sym-cross" viewBox="0 0 10 10">',
          '<line x1="5" y1="1.5" x2="5" y2="8.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
          '<line x1="1.5" y1="5" x2="8.5" y2="5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
        "</symbol>",

        // DIAMOND
        '<symbol id="sym-diamond" viewBox="0 0 10 10">',
          '<polygon points="5,1.5 8.5,5 5,8.5 1.5,5" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>',
        "</symbol>",

        // SPARK — 4-pointed star
        '<symbol id="sym-spark" viewBox="0 0 10 10">',
          '<path d="M5 1.2 L5.7 4.3 L8.8 5 L5.7 5.7 L5 8.8 L4.3 5.7 L1.2 5 L4.3 4.3 Z" fill="currentColor"/>',
        "</symbol>",

        // X-MARK — diagonal cross
        '<symbol id="sym-x" viewBox="0 0 10 10">',
          '<line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
          '<line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
        "</symbol>",

      "</defs>"
    ].join("");

    // ---- Hidden defs SVG ----
    var defsSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    defsSVG.setAttribute("id", "hx-bg-defs");
    defsSVG.setAttribute("style", "display:none;");
    defsSVG.innerHTML = defsHTML;

    // ---- Grid SVG canvas ----
    var gridSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    gridSVG.setAttribute("id", "hx-bg-grid");
    gridSVG.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // ---- Wrapper div ----
    var root = document.createElement("div");
    root.id = "hx-bg-root";
    root.setAttribute("style", [
      "position:fixed",
      "top:0",
      "left:0",
      "width:100vw",
      "height:100vh",
      "z-index:0",
      "pointer-events:none",
      "overflow:hidden",
      "color:rgba(var(--G-colour-1-RGB, 255,255,255), 1)"
    ].join(";"));

    root.appendChild(defsSVG);
    root.appendChild(gridSVG);

    document.body.insertBefore(root, document.body.firstChild);

    renderGrid();
  }

  // ---------------------------------------------------------
  // 📐 RESIZE — debounced so it doesn't hammer during panel drag
  // ---------------------------------------------------------
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderGrid, 150);
  });

  // ---------------------------------------------------------
  // 🚀 BOOT
  // ---------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ---------------------------------------------------------
  // 📦 MODULE EXPORT
  // Holy.BG.config.vignette.innerRadius = 0.3; Holy.BG.render();
  // ---------------------------------------------------------
  Holy.BG = {
    config: GridConfig,
    render: renderGrid,
    init: init
  };

})();
