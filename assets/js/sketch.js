/* ==========================================================================
   sketch.js — draws every hand-drawn border on the page.

   Ported from the Paton Hall site, minus its garage glyph, with roughness
   and bowing dialled back for plain text at this scale.

   Knows nothing about the page's content. Walks [data-sketch] and paints a
   Rough.js SVG behind each matched element.

   Two properties matter and are easy to get wrong:

   1. Seeds are derived from element index, never random. Rough.js re-rolls
      its randomness on every call, so without a fixed seed every resize
      would reshape every border and the page would appear to twitch. A
      derived seed makes wobble a fixed property of the element.

   2. The .sketched class goes on <html> only after a successful draw. It is
      what suppresses the CSS fallback borders. So if this file 404s, throws,
      or is blocked, the page keeps clean plain borders — it degrades to
      plain, never to borderless.
   ========================================================================== */

(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  /* Well below Rough.js defaults (roughness 1, bowing 1). The brief calls for
     minimal wobble: enough texture to read as drawn, not enough to look shaky.
     There is no animation anywhere on this site — these values are static and
     nothing re-rolls them. */
  var PARAMS = {
    roughness:   0.7,
    bowing:      0.45,
    strokeWidth: 1.4,
    fillStyle:   'solid'
  };

  var PAD = 4;  /* the SVG overhangs the element so overshooting strokes aren't clipped */

  var registry = [];  /* [{ el, kind, index }] */

  /* Deterministic per-element seed. Knuth's multiplicative hash keeps adjacent
     indices from producing visually similar wobble. */
  function seedFor(index) {
    return ((index + 1) * 2654435761) % 2147483647;
  }

  /* Resolves a CSS custom property name (e.g. "--yellow-3") against an element.
     Attribute values aren't resolved by CSS, so data-sketch-fill holds the bare
     token name and we look it up here. */
  function tokenValue(el, name) {
    if (!name) return null;
    var v = getComputedStyle(el).getPropertyValue(name.trim());
    return v ? v.trim() : null;
  }

  function radiusFor(kind) {
    return kind === 'frame' ? 14 : 8;
  }

  /* Rounded-rect path, offset by pad so it sits inside the padded SVG. */
  function roundedRectPath(w, h, r, pad) {
    r = Math.min(r, w / 2, h / 2);
    var x = pad, y = pad, X = pad + w, Y = pad + h;
    return 'M ' + (x + r) + ' ' + y +
           ' L ' + (X - r) + ' ' + y + ' Q ' + X + ' ' + y + ' ' + X + ' ' + (y + r) +
           ' L ' + X + ' ' + (Y - r) + ' Q ' + X + ' ' + Y + ' ' + (X - r) + ' ' + Y +
           ' L ' + (x + r) + ' ' + Y + ' Q ' + x + ' ' + Y + ' ' + x + ' ' + (Y - r) +
           ' L ' + x + ' ' + (y + r) + ' Q ' + x + ' ' + y + ' ' + (x + r) + ' ' + y + ' Z';
  }

  function svgFor(el) {
    var svg = el.firstChild;
    if (!svg || svg.nodeType !== 1 || !svg.classList ||
        !svg.classList.contains('sketch-svg')) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'sketch-svg');
      svg.setAttribute('aria-hidden', 'true');
      el.insertBefore(svg, el.firstChild);
    }
    return svg;
  }

  function drawOne(entry) {
    var el = entry.el;
    var w = el.offsetWidth;
    var h = el.offsetHeight;
    if (!w || !h) return false;

    var svg = svgFor(el);
    svg.setAttribute('width', w + PAD * 2);
    svg.setAttribute('height', h + PAD * 2);
    svg.setAttribute('viewBox', '0 0 ' + (w + PAD * 2) + ' ' + (h + PAD * 2));
    svg.style.left = -PAD + 'px';
    svg.style.top = -PAD + 'px';
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var opts = {};
    for (var k in PARAMS) opts[k] = PARAMS[k];
    opts.seed = seedFor(entry.index);
    opts.stroke = tokenValue(el, '--ink') || '#1b1b1f';

    var fill = tokenValue(el, el.getAttribute('data-sketch-fill'));
    if (fill) opts.fill = fill;

    var rc = rough.svg(svg);
    var node;

    if (entry.kind === 'circle') {
      node = rc.circle(PAD + w / 2, PAD + h / 2, Math.min(w, h) - 2, opts);
    } else {
      node = rc.path(roundedRectPath(w, h, radiusFor(entry.kind), PAD), opts);
    }

    if (node) svg.appendChild(node);
    return true;
  }

  function drawAll() {
    var ok = 0;
    for (var i = 0; i < registry.length; i++) {
      try {
        if (drawOne(registry[i])) ok++;
      } catch (err) {
        /* One bad element must not strip borders from the whole page. */
        if (window.console) console.warn('sketch: failed to draw', registry[i].el, err);
      }
    }
    return ok;
  }

  function init() {
    if (typeof rough === 'undefined') {
      if (window.console) console.warn('sketch: rough.js unavailable; keeping CSS borders');
      return;
    }

    var els = document.querySelectorAll('[data-sketch]');
    for (var i = 0; i < els.length; i++) {
      registry.push({ el: els[i], kind: els[i].getAttribute('data-sketch'), index: i });
    }

    if (!drawAll()) return;  /* nothing drew — leave the CSS borders in place */

    document.documentElement.classList.add('sketched');

    /* Redraw only on size change, coalesced to one frame. Never on hover,
       focus, scroll, or a timer — the page has no animation. */
    if (typeof ResizeObserver !== 'undefined') {
      var pending = false;
      var ro = new ResizeObserver(function () {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () { pending = false; drawAll(); });
      });
      for (var j = 0; j < registry.length; j++) ro.observe(registry[j].el);
    }
  }

  /* Elements that appear after init() — board cards mounted from fetched
     JSON — are not in the registry, so drawAll() alone would skip them.
     This re-scans, adding only what is new, then draws. */
  function registerNew() {
    var els = document.querySelectorAll('[data-sketch]');
    for (var i = 0; i < els.length; i++) {
      var known = false;
      for (var j = 0; j < registry.length; j++) {
        if (registry[j].el === els[i]) { known = true; break; }
      }
      if (!known) registry.push({ el: els[i], kind: els[i].getAttribute('data-sketch'),
                                  index: registry.length });
    }
    return drawAll();
  }

  window.NASketch = {
    redraw: registerNew,
    drawAll: drawAll,
    _registry: registry,
    _seedFor: seedFor
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
