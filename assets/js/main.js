/* ============================================================================
   BOBCAT — landing page behaviour
   No dependencies. Degrades to a working static page without JS.
   ========================================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = window.requestAnimationFrame.bind(window);

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ------------------------------------------------------------ theme
     Light is the hard default. The inline script in <head> already applied
     a stored "dark" choice before paint, so this only needs to wire the
     toggle and keep localStorage / the button / theme-color in sync. */
  (function theme() {
    var STORAGE_KEY = 'bobcat-theme';
    var btn = $('[data-theme-toggle]');
    var metaColor = $('meta[name="theme-color"]');
    if (!btn) return;

    function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

    function reflect() {
      var dark = isDark();
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      if (metaColor) metaColor.setAttribute('content', dark ? '#0a0a0b' : '#ffffff');
    }
    reflect();

    btn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      if (next === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
      reflect();
    });
  })();

  /* ------------------------------------------------------------ reveal */
  var revealTargets = $$('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    revealTargets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealTargets.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ------------------------------------------------------------ chart data
     One dataset per tab. All four symbols share the same 18 fixed x-slots
     and the same story shape — three illustrative trades: buy a dip / sell a
     peak, sell a smaller peak / buy back lower, then buy a pullback / sell a
     later peak — so the marker logic below never needs symbol-specific
     coordinates, only each candle's high/low, which marker placement derives
     from. Every number here is illustrative, not from any market feed.
     Marker candles (by index): 3 dip, 6 peak, 9 smaller peak, 12 dip,
     14 pullback, 16 peak. */
  var SYMBOLS = {
    BTC: {
      price: '238.40', changeText: '▲ 0.6%', changeUp: true,
      axis: ['241.80', '236.40', '232.10', '227.50'],
      outcomes: { win1: '+2.1R', win2: '+0.5R', win3: '+1.3R' },
      candles: [
        { high: 132, low: 152, bodyTop: 138, bodyBot: 150, up: true },
        { high: 118, low: 140, bodyTop: 124, bodyBot: 136, up: true },
        { high: 120, low: 140, bodyTop: 128, bodyBot: 138, up: false },
        { high: 140, low: 160, bodyTop: 144, bodyBot: 156, up: false },
        { high: 126, low: 148, bodyTop: 132, bodyBot: 144, up: true },
        { high: 108, low: 132, bodyTop: 114, bodyBot: 128, up: true },
        { high: 92,  low: 114, bodyTop: 98,  bodyBot: 110, up: true },
        { high: 100, low: 120, bodyTop: 104, bodyBot: 116, up: false },
        { high: 108, low: 128, bodyTop: 114, bodyBot: 124, up: false },
        { high: 98,  low: 120, bodyTop: 104, bodyBot: 116, up: true },
        { high: 112, low: 134, bodyTop: 118, bodyBot: 130, up: false },
        { high: 126, low: 146, bodyTop: 130, bodyBot: 142, up: false },
        { high: 138, low: 158, bodyTop: 142, bodyBot: 154, up: false },
        { high: 128, low: 148, bodyTop: 132, bodyBot: 144, up: true },
        { high: 120, low: 140, bodyTop: 126, bodyBot: 136, up: true },
        { high: 108, low: 128, bodyTop: 112, bodyBot: 124, up: true },
        { high: 94,  low: 114, bodyTop: 98,  bodyBot: 110, up: true },
        { high: 104, low: 124, bodyTop: 108, bodyBot: 120, up: false }
      ]
    },
    ETH: {
      price: '3,286.10', changeText: '▲ 1.2%', changeUp: true,
      axis: ['3,412.60', '3,318.40', '3,236.80', '3,150.20'],
      outcomes: { win1: '+2.6R', win2: '+0.7R', win3: '+1.5R' },
      candles: [
        { high: 130, low: 162, bodyTop: 138, bodyBot: 154, up: true },
        { high: 113, low: 139, bodyTop: 121, bodyBot: 131, up: true },
        { high: 117, low: 147, bodyTop: 125, bodyBot: 139, up: false },
        { high: 136, low: 168, bodyTop: 144, bodyBot: 160, up: false },
        { high: 123, low: 149, bodyTop: 131, bodyBot: 141, up: true },
        { high: 99,  low: 129, bodyTop: 107, bodyBot: 121, up: true },
        { high: 82,  low: 114, bodyTop: 90,  bodyBot: 106, up: true },
        { high: 95,  low: 121, bodyTop: 103, bodyBot: 113, up: false },
        { high: 105, low: 135, bodyTop: 113, bodyBot: 127, up: false },
        { high: 88,  low: 120, bodyTop: 96,  bodyBot: 112, up: true },
        { high: 111, low: 137, bodyTop: 119, bodyBot: 129, up: false },
        { high: 125, low: 155, bodyTop: 133, bodyBot: 147, up: false },
        { high: 136, low: 168, bodyTop: 144, bodyBot: 160, up: false },
        { high: 127, low: 153, bodyTop: 135, bodyBot: 145, up: true },
        { high: 113, low: 143, bodyTop: 121, bodyBot: 135, up: true },
        { high: 98,  low: 130, bodyTop: 106, bodyBot: 122, up: true },
        { high: 87,  low: 113, bodyTop: 95,  bodyBot: 105, up: true },
        { high: 101, low: 131, bodyTop: 109, bodyBot: 123, up: false }
      ]
    },
    NVDA: {
      price: '134.60', changeText: '▲ 0.4%', changeUp: true,
      axis: ['142.80', '138.20', '133.90', '129.40'],
      outcomes: { win1: '+1.8R', win2: '+0.3R', win3: '+1.1R' },
      candles: [
        { high: 124, low: 156, bodyTop: 132, bodyBot: 148, up: true },
        { high: 117, low: 143, bodyTop: 125, bodyBot: 135, up: true },
        { high: 123, low: 153, bodyTop: 131, bodyBot: 145, up: false },
        { high: 132, low: 164, bodyTop: 140, bodyBot: 156, up: false },
        { high: 127, low: 153, bodyTop: 135, bodyBot: 145, up: true },
        { high: 107, low: 137, bodyTop: 115, bodyBot: 129, up: true },
        { high: 90,  low: 122, bodyTop: 98,  bodyBot: 114, up: true },
        { high: 103, low: 129, bodyTop: 111, bodyBot: 121, up: false },
        { high: 111, low: 141, bodyTop: 119, bodyBot: 133, up: false },
        { high: 96,  low: 128, bodyTop: 104, bodyBot: 120, up: true },
        { high: 115, low: 141, bodyTop: 123, bodyBot: 133, up: false },
        { high: 121, low: 151, bodyTop: 129, bodyBot: 143, up: false },
        { high: 130, low: 162, bodyTop: 138, bodyBot: 154, up: false },
        { high: 123, low: 149, bodyTop: 131, bodyBot: 141, up: true },
        { high: 115, low: 145, bodyTop: 123, bodyBot: 137, up: true },
        { high: 104, low: 136, bodyTop: 112, bodyBot: 128, up: true },
        { high: 95,  low: 121, bodyTop: 103, bodyBot: 113, up: true },
        { high: 103, low: 133, bodyTop: 111, bodyBot: 125, up: false }
      ]
    },
    SPY: {
      price: '576.85', changeText: '▲ 0.2%', changeUp: true,
      axis: ['582.40', '578.10', '574.30', '570.60'],
      outcomes: { win1: '+1.4R', win2: '+0.4R', win3: '+0.9R' },
      candles: [
        { high: 128, low: 160, bodyTop: 136, bodyBot: 152, up: true },
        { high: 119, low: 145, bodyTop: 127, bodyBot: 137, up: true },
        { high: 123, low: 153, bodyTop: 131, bodyBot: 145, up: false },
        { high: 134, low: 166, bodyTop: 142, bodyBot: 158, up: false },
        { high: 127, low: 153, bodyTop: 135, bodyBot: 145, up: true },
        { high: 109, low: 139, bodyTop: 117, bodyBot: 131, up: true },
        { high: 92,  low: 124, bodyTop: 100, bodyBot: 116, up: true },
        { high: 105, low: 131, bodyTop: 113, bodyBot: 123, up: false },
        { high: 111, low: 141, bodyTop: 119, bodyBot: 133, up: false },
        { high: 98,  low: 130, bodyTop: 106, bodyBot: 122, up: true },
        { high: 115, low: 141, bodyTop: 123, bodyBot: 133, up: false },
        { high: 123, low: 153, bodyTop: 131, bodyBot: 145, up: false },
        { high: 134, low: 166, bodyTop: 142, bodyBot: 158, up: false },
        { high: 125, low: 151, bodyTop: 133, bodyBot: 143, up: true },
        { high: 117, low: 147, bodyTop: 125, bodyBot: 139, up: true },
        { high: 106, low: 138, bodyTop: 114, bodyBot: 130, up: true },
        { high: 97,  low: 123, bodyTop: 105, bodyBot: 115, up: true },
        { high: 105, low: 133, bodyTop: 113, bodyBot: 127, up: false }
      ]
    }
  };

  var CANDLE_X = 28;   // first candle center
  var CANDLE_SPACING = 30;
  // Offsets from a candle's low/high to its marker's arrow tip / base / far
  // stem end / label baseline — the same shape used for every marker, just
  // anchored to whichever candle it's attached to.
  var BUY_OFFSET  = { apex: 6, base: 16, stem: 30, label: 46 };  // added to LOW
  var SELL_OFFSET = { apex: 6, base: 16, stem: 30, label: 38 };  // subtracted from HIGH

  function candleX(i) { return CANDLE_X + i * CANDLE_SPACING; }

  function placeBuyMarker(group, cx, low) {
    var apexY = low + BUY_OFFSET.apex, baseY = low + BUY_OFFSET.base;
    var farY = low + BUY_OFFSET.stem, labelY = low + BUY_OFFSET.label;
    var stem = group.querySelector('.marker__stem');
    var poly = group.querySelector('polygon');
    var text = group.querySelector('text');
    if (stem) { stem.setAttribute('x1', cx); stem.setAttribute('y1', farY); stem.setAttribute('x2', cx); stem.setAttribute('y2', baseY); }
    if (poly) poly.setAttribute('points', (cx - 6) + ',' + baseY + ' ' + (cx + 6) + ',' + baseY + ' ' + cx + ',' + apexY);
    if (text) { text.setAttribute('x', cx); text.setAttribute('y', labelY); }
  }

  function placeSellMarker(group, cx, high) {
    var apexY = high - SELL_OFFSET.apex, baseY = high - SELL_OFFSET.base;
    var farY = high - SELL_OFFSET.stem, labelY = high - SELL_OFFSET.label;
    var stem = group.querySelector('.marker__stem');
    var poly = group.querySelector('polygon');
    var text = group.querySelector('text');
    if (text) { text.setAttribute('x', cx); text.setAttribute('y', labelY); }
    if (stem) { stem.setAttribute('x1', cx); stem.setAttribute('y1', farY); stem.setAttribute('x2', cx); stem.setAttribute('y2', baseY); }
    if (poly) poly.setAttribute('points', (cx - 6) + ',' + baseY + ' ' + (cx + 6) + ',' + baseY + ' ' + cx + ',' + apexY);
  }

  /* ------------------------------------------------------------ scroll chart
     Pins the chart while its tall wrapper scrolls underneath it, maps that
     scroll distance to a 0–1 progress value, and reveals candles, entry/exit
     markers and the desk panel's on/off state as thresholds are crossed.
     There is no separate "reverse" animation: scrolling up simply drives
     progress back down through the same thresholds, so it undoes itself
     exactly. Reduced-motion and no-JS visitors get the finished state — see
     the <noscript> block in index.html for the latter. Also owns the symbol
     tabs (redraws candles/markers in place) and the desk-panel chip text
     rotation, since both live on the same DOM this module already holds. */
  (function scrollChart() {
    var wrapper = $('[data-scrollchart]');
    var pin = wrapper ? wrapper.querySelector('.scrollchart__pin') : null;
    var root = $('[data-scrollchart-root]');
    var svg = $('[data-chart-svg]', root);
    if (!wrapper || !pin || !root || !svg) return;

    var candles = $$('.candle, .wick', root);
    var markerGroups = $$('[data-marker]', root);
    var storyMarkers = markerGroups.filter(function (el) { return el.dataset.marker !== 'cursor'; });
    var deskpanel = $('[data-deskpanel]', root);
    var priceEl = $('[data-price]', root);
    var changeEl = $('[data-change]', root);
    var axisTexts = $$('[data-axis] text', root);
    var tabs = $$('[data-symbol-tabs] .chart__tab', root);
    var cursorLine = $('[data-cursor-line]', root);
    var cursorDot = $('[data-cursor-dot]', root);

    /* ---- redraw for a symbol tab (BTC/ETH/NVDA/SPY) ---- */
    function renderSymbol(key) {
      var data = SYMBOLS[key];
      if (!data) return;

      if (priceEl) priceEl.textContent = data.price;
      if (changeEl) {
        changeEl.textContent = data.changeText;
        changeEl.classList.toggle('up', data.changeUp);
        changeEl.classList.toggle('down', !data.changeUp);
      }
      axisTexts.forEach(function (t, i) { if (data.axis[i] !== undefined) t.textContent = data.axis[i]; });

      data.candles.forEach(function (c, i) {
        var x = candleX(i);
        var wick = svg.querySelector('.wick[data-candle="' + i + '"]');
        var body = svg.querySelector('.candle[data-candle="' + i + '"]');
        if (wick) {
          wick.setAttribute('x1', x); wick.setAttribute('x2', x);
          wick.setAttribute('y1', c.high); wick.setAttribute('y2', c.low);
          wick.classList.toggle('wick--up', c.up); wick.classList.toggle('wick--down', !c.up);
        }
        if (body) {
          body.setAttribute('x', x - 6); body.setAttribute('width', 12);
          body.setAttribute('y', c.bodyTop); body.setAttribute('height', Math.max(2, c.bodyBot - c.bodyTop));
          body.classList.toggle('candle--up', c.up); body.classList.toggle('candle--down', !c.up);
        }
      });

      storyMarkers.forEach(function (g) {
        var ref = g.dataset.candleRef;
        if (ref === undefined) return; // the win/loss dot groups carry no geometry, just text
        var idx = Number(ref);
        var c = data.candles[idx];
        if (!c) return;
        var x = candleX(idx);
        if (g.dataset.role === 'buy') placeBuyMarker(g, x, c.low);
        else placeSellMarker(g, x, c.high);
      });

      Object.keys(data.outcomes).forEach(function (key) {
        var el = $('[data-outcome="' + key + '"]', root);
        if (el) el.textContent = data.outcomes[key];
      });

      var last = data.candles[data.candles.length - 1];
      if (last && cursorLine && cursorDot) {
        var cursorY = Math.round((last.high + last.low) / 2);
        cursorLine.setAttribute('y1', cursorY); cursorLine.setAttribute('y2', cursorY);
        cursorDot.setAttribute('cy', cursorY);
      }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        if (tab.classList.contains('chart__tab--on')) return;
        tabs.forEach(function (t) { t.classList.toggle('chart__tab--on', t === tab); });
        renderSymbol(tab.dataset.symbol);
      });
    });

    // The static markup already matches BTC exactly, but render once anyway
    // so a typo in either place can never cause a silent mismatch.
    renderSymbol('BTC');

    /* ---- scroll-driven reveal (unaffected by which symbol is showing) ---- */
    var TOTAL_CANDLES = 18;
    var BASE_SHOWN = 0.15;              // 3 of 18 candles drawn at progress 0
    // Candles reveal steadily across the whole runway (no fast early ramp),
    // so more of the chart is still being drawn as you scroll — that's the
    // "add candles instead of slowing it" ask: more content, same pace.
    // The AI switch fires when the chart has filled to its middle (~candle 9
    // of 18, x≈300 of 600 → the halfway line), together with the first
    // trade's BUY. The remaining five markers stagger out from there, one
    // trade after another, each landing on a candle that's already drawn.
    var AI_ON_AT = 0.5;
    var MARKER_AT = { m1: .5, m2: .61, m3: .71, m4: .8, m5: .88, m6: .96 };

    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

    var lastRevealCount = -1;
    var lastAiOn = null;

    function applyProgress(progress) {
      var revealCount = Math.ceil(TOTAL_CANDLES * (BASE_SHOWN + (1 - BASE_SHOWN) * progress));
      if (revealCount !== lastRevealCount) {
        lastRevealCount = revealCount;
        candles.forEach(function (el) {
          el.classList.toggle('is-shown', Number(el.dataset.candle) < revealCount);
        });
      }

      var aiOn = progress >= AI_ON_AT;
      if (aiOn !== lastAiOn) {
        lastAiOn = aiOn;
        if (deskpanel) deskpanel.classList.toggle('is-ai-on', aiOn);
      }

      storyMarkers.forEach(function (el) {
        var threshold = MARKER_AT[el.dataset.marker];
        el.classList.toggle('is-shown', threshold !== undefined && progress >= threshold);
      });
    }

    if (reduced) {
      // No motion: show the finished story immediately, and don't pin an
      // element that will never animate — that just traps the scroll.
      wrapper.classList.add('is-static');
      applyProgress(1);
      return;
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      raf(function () {
        ticking = false;
        update();
      });
    }

    // Matches the CSS `top:` on .scrollchart__pin — the sticky offset the
    // pin engages against. Used to compute the total scroll span from the
    // very top of the page to the end of the chart's runway, so progress
    // is 0 at scrollY=0 (not already halfway just because the chart is
    // peeking below the fold) and grows in step with how far the visitor
    // has actually scrolled.
    var STICKY_OFFSET = 76;

    function update() {
      var rect = wrapper.getBoundingClientRect();
      var wrapDocTop = rect.top + window.pageYOffset;
      var scrollable = wrapper.offsetHeight - pin.offsetHeight;
      var totalScroll = wrapDocTop - STICKY_OFFSET + scrollable;
      var progress = totalScroll > 1 ? clamp(window.pageYOffset / totalScroll, 0, 1) : 1;
      applyProgress(progress);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  })();

  /* ------------------------------------------------------------ auto-cycle
     Landing visitors don't touch tabs unless they know they can — so cycle
     through BTC → ETH → NVDA → SPY once on load so the tabs demonstrate
     themselves, then stop and let the visitor drive. Any real tap OR
     scrolling past the chart cancels the cycle immediately.
     Programmatic clicks below use isTrusted=false, so the "user click"
     listener that stops us doesn't fire from our own clicks. Skipped
     entirely under reduced motion. */
  (function autoCycleTabs() {
    if (reduced) return;
    var tabs = $$('[data-symbol-tabs] .chart__tab');
    if (tabs.length < 2) return;

    var stopped = false;
    var timer = null;
    function stop() {
      if (stopped) return;
      stopped = true;
      if (timer) { clearTimeout(timer); timer = null; }
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function (e) { if (e.isTrusted) stop(); });
    });
    window.addEventListener('scroll', function onFirstBigScroll() {
      if (window.pageYOffset > 240) {
        window.removeEventListener('scroll', onFirstBigScroll);
        stop();
      }
    }, { passive: true });

    // BTC dwell 3800ms so the visitor registers the default, then 3200ms
    // per subsequent tab. One pass only.
    var idx = 0;
    function next(delay) {
      timer = setTimeout(function () {
        if (stopped) return;
        idx++;
        if (idx >= tabs.length) return;   // stop after SPY, don't loop
        tabs[idx].click();
        next(3200);
      }, delay);
    }
    next(3800);
  })();

  /* ------------------------------------------------------------ desk chips
     Once AI mode is on, each chip cycles through a short set of illustrative
     lines — not real headlines or real computed values, just enough motion
     to read as "working." Costs one interval; skipped entirely under
     reduced motion, and the no-JS path just shows each chip's static label. */
  (function deskChips() {
    if (reduced) return;
    var deskpanel = $('[data-deskpanel]');
    var chips = $$('[data-chip]');
    if (!deskpanel || !chips.length) return;

    // Each chip's own rotation set. news items carry a "NEWS" prefix so
    // headlines like "Oil slips on demand outlook" read as news, not as an
    // unlabelled ambient string — that was called out explicitly by the
    // person who wanted the panel. The other chips are self-labelling
    // (Correlation: checked / Breadth: neutral / etc.) and left alone.
    var CONTENT = {
      analyse: ['Analysing', 'Weighing the case', 'Reading structure', 'Cross-checking'],
      news: [
        'News · Fed holds rates steady', 'News · Chip-sector earnings beat estimates',
        'News · Oil slips on demand outlook', 'News · Dollar index little changed',
        'News · Jobless claims in line with forecast', 'News · Treasury yields drift higher'
      ],
      math: ['Volatility: contracting', 'Correlation: checked', 'Regime: stable', 'Spread: normal', 'Drawdown: within limits'],
      market: ['Liquidity: normal', 'Order flow: balanced', 'Breadth: neutral', 'Momentum: building', 'Structure: intact'],
      other: ['Filings: none new', 'Sentiment: neutral', 'Positioning: light', 'Calendar: clear', 'Risk: nominal']
    };

    // each chip starts at a different point in its own list, purely so
    // they don't all read as "position 0" the moment AI mode switches on
    var state = chips.map(function (el, i) {
      return { el: el, key: el.dataset.chip, i: i };
    });

    setInterval(function () {
      if (!deskpanel.classList.contains('is-ai-on')) return;
      state.forEach(function (s) {
        var list = CONTENT[s.key];
        if (!list) return;
        s.i = (s.i + 1) % list.length;
        s.el.textContent = list[s.i];
      });
    }, 2600);
  })();

  /* ------------------------------------------------------------ the rig
     Small architecture diagram in #stack. When it scrolls into view the
     nodes light up in order and an accent pulse travels each link between
     them, finishing with the LIVE · GUARDED pill glowing. Runs once —
     it's an explainer, not a loop. Reduced-motion and no-JS both land on
     the same finished lit state. */
  (function rig() {
    var root = $('[data-rig]');
    if (!root) return;
    var nodes = $$('.rig__node', root);
    var links = $$('.rig__link', root);
    var status = $('[data-rig-status]', root);

    function finish() {
      root.classList.add('is-live');
      nodes.forEach(function (n) { n.classList.add('is-on'); });
      links.forEach(function (l) { l.classList.add('is-lit'); });
      if (status) status.classList.add('is-on');
    }

    if (reduced || !('IntersectionObserver' in window)) { finish(); return; }

    var started = false;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || started) return;
        started = true;
        observer.disconnect();
        root.classList.add('is-live');

        // Light node[0], then pulse link[0] → light node[1], then pulse
        // link[1] → light node[2] … then the LIVE pill at the end.
        // Timings match the CSS pulse animation (~550ms) with a small
        // pre-delay so the eye tracks node→pulse→node cleanly.
        var i = 0;
        function step() {
          if (i >= nodes.length) {
            if (status) status.classList.add('is-on');
            return;
          }
          nodes[i].classList.add('is-on');
          if (i < links.length) {
            // Capture i now — the outer i is incremented before the
            // setTimeout below fires, so reading links[i] inside the
            // timeout would refer to the wrong (or missing) link.
            var linkIdx = i;
            setTimeout(function () { links[linkIdx].classList.add('is-lit'); }, 220);
          }
          i++;
          setTimeout(step, 560);
        }
        step();
      });
    }, { threshold: 0.35 });

    observer.observe(root);
  })();

  /* ------------------------------------------------------------ agents
     swipe hint. Below 860px the three "how it works" cards are a
     horizontal, scroll-snapped strip (see .agents in main.css) instead of
     a long vertical stack. Nothing about a horizontally scrolling block
     signals itself, so the first time it comes into view we nudge it
     right and back once — just enough to reveal the next card peeking at
     the edge — so a visitor knows it swipes before they've had to guess.
     Cancels immediately on any real touch/wheel input, runs once, and
     never fires above the 860px breakpoint where the cards aren't a
     carousel at all. */
  (function agentsSwipeHint() {
    if (reduced) return;
    var track = $('.agents');
    if (!track || !('IntersectionObserver' in window)) return;

    function isCarousel() { return window.matchMedia('(max-width: 860px)').matches; }

    var interacted = false;
    function markInteracted() { interacted = true; }
    track.addEventListener('touchstart', markInteracted, { passive: true, once: true });
    track.addEventListener('wheel', markInteracted, { passive: true, once: true });

    var fired = false;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || fired) return;
        fired = true;
        observer.disconnect();
        if (!isCarousel()) return;

        setTimeout(function () {
          if (interacted || !isCarousel()) return;
          // Suspend snap for the nudge: with scroll-snap-type: mandatory
          // active, the browser forces any small scrollTo to fully commit
          // to the nearer snap point instead of resting where asked, which
          // either cancels the nudge outright or jumps straight to card 2.
          track.classList.add('is-nudging');
          var start = track.scrollLeft;
          track.scrollTo({ left: start + 56, behavior: 'smooth' });
          setTimeout(function () {
            if (interacted) { track.classList.remove('is-nudging'); return; }
            track.scrollTo({ left: start, behavior: 'smooth' });
            setTimeout(function () { track.classList.remove('is-nudging'); }, 500);
          }, 500);
        }, 500);
      });
    }, { threshold: 0.5 });
    observer.observe(track);
  })();

  /* ------------------------------------------------------------ direct mail
     Points "email us directly" at a real inbox without exposing it to
     scraping in the raw page source. Change the address in one place. */
  (function directMail() {
    var link = $('#direct-mail');
    if (!link) return;
    var user = 'azk40772corp', domain = 'gmail.com';
    var address = user + '@' + domain;
    link.href = 'mailto:' + address + '?subject=' + encodeURIComponent('BOBCAT early access');
    var label = $('[data-direct-mail-label]', link);
    if (label) label.textContent = 'or email us directly — ' + address;
  })();

  /* ------------------------------------------------------------ capture */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

  /* Where a submission is sent.
     The destination lives in each form's `action` so there is one source of
     truth: without JS the browser posts there natively, and with JS we post to
     the same service's AJAX variant so the page can show its own success state
     instead of navigating away. Override everything with
     window.BOBCAT_ENDPOINT if you move to a different provider. */
  function endpointFor(form) {
    if (window.BOBCAT_ENDPOINT) return window.BOBCAT_ENDPOINT;
    var action = form.getAttribute('action') || '';
    if (action.indexOf('formsubmit.co/') !== -1 && action.indexOf('/ajax/') === -1) {
      return action.replace('formsubmit.co/', 'formsubmit.co/ajax/');
    }
    return action || 'api/subscribe';
  }

  $$('[data-capture]').forEach(function (form) {
    var input = form.querySelector('input[type="email"]');
    var message = form.querySelector('textarea');
    var honeypot = form.querySelector('.hp');
    var button = form.querySelector('button[type="submit"]');
    /* The status note and success panel aren't always inside the form
       itself (the strip's note sits beside it, not within it), so look in
       the nearest container that groups the whole widget together. */
    var scope = form.closest('.strip, .signup__form') || form;
    var note = scope.querySelector('[data-status]');
    var defaultNote = note ? note.textContent : '';
    var success = scope.querySelector('[data-success]');

    function setNote(text, kind) {
      if (!note) return;
      note.textContent = text;
      note.classList.toggle('is-error', kind === 'error');
      note.classList.toggle('is-ok', kind === 'ok');
    }

    function markInvalid(on) {
      var field = input.closest('.field');
      if (field) field.classList.toggle('is-invalid', on);
    }

    input.addEventListener('input', function () {
      var field = input.closest('.field');
      if (field && field.classList.contains('is-invalid')) {
        markInvalid(false);
        setNote(defaultNote, null);
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (button.classList.contains('is-busy')) return;

      var email = input.value.trim();
      if (!email) {
        markInvalid(true); input.focus();
        setNote('An email address is required.', 'error');
        return;
      }
      if (!EMAIL_RE.test(email)) {
        markInvalid(true); input.focus();
        setNote('That address doesn’t look right.', 'error');
        return;
      }

      markInvalid(false);
      button.classList.add('is-busy');
      setNote('Submitting…', null);

      /* Send every field the form declares, so the hidden _subject/_template
         instructions reach the mail service exactly as the no-JS path would. */
      var payload = {};
      new FormData(form).forEach(function (value, key) { payload[key] = value; });
      payload.email = email;
      payload.source = form.getAttribute('data-source') || payload.source || 'unknown';
      if (message) payload.message = message.value.trim();

      var endpoint = endpointFor(form);

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            return { ok: res.ok, status: res.status, body: body };
          });
        })
        .then(function (res) {
          button.classList.remove('is-busy');

          var body = res.body || {};

          /* The mail service answers 200 with success:"false" for its own
             failures (e.g. address not yet confirmed), so a 2xx alone isn't
             proof of delivery — check the flag when it's present. */
          var flagged = Object.prototype.hasOwnProperty.call(body, 'success');
          var succeeded = res.ok && (!flagged || String(body.success) === 'true');

          if (!succeeded) {
            if (res.status === 429) {
              setNote('Too many attempts. Try again in a few minutes.', 'error');
              return;
            }
            if (body.error) { setNote(body.error, 'error'); return; }
            if (flagged && body.message) {
              console.warn('BOBCAT: submission rejected by ' + endpoint + ' — ' + body.message);
              setNote('That didn’t go through. Please try again, or email us directly.', 'error');
              return;
            }
            console.warn(
              'BOBCAT: no signup endpoint at "' + endpoint + '" (HTTP ' + res.status + '). ' +
              'This page is likely on a static host with nothing listening. Point the form ' +
              'action at a mail service, or set window.BOBCAT_ENDPOINT.'
            );
            setNote('Signups aren’t connected on this address yet.', 'error');
            return;
          }

          if (success) {
            var emailSlot = success.querySelector('[data-success-email]');
            var refSlot = success.querySelector('[data-success-ref]');
            var refLine = success.querySelector('.success__ref');
            if (emailSlot) emailSlot.textContent = email;
            /* Only self-hosted server.js issues reference codes; hide the line
               entirely rather than showing an empty placeholder. */
            if (body.ref && refSlot) refSlot.textContent = body.ref;
            else if (refLine) refLine.hidden = true;
            form.classList.add('is-done');
            success.hidden = false;
          } else {
            input.value = '';
            if (message) message.value = '';
            setNote('You’re on the list. We’ll email you when access opens.', 'ok');
          }
        })
        .catch(function () {
          button.classList.remove('is-busy');
          setNote('Couldn’t reach the server. Check your connection and try again.', 'error');
        });
    });
  });

  /* ------------------------------------------------------------ ticker
     Ambient market wallpaper, not a performance claim — public tickers with
     illustrative movement, unconnected to any BOBCAT trade or result. */
  (function ticker() {
    var track = $('[data-ticker-track]');
    if (!track) return;

    var ROW = [
      ['BTC', '+1.4%', true], ['ETH', '−0.6%', false], ['NVDA', '+2.1%', true],
      ['SPY', '+0.3%', true], ['AAPL', '−0.2%', false], ['TSLA', '+3.8%', true],
      ['GOOGL', '+0.9%', true], ['XOM', '−0.4%', false], ['SOL', '+1.1%', true],
      ['MSFT', '+0.5%', true]
    ];

    function renderRow() {
      return ROW.map(function (r) {
        var cls = r[2] ? 'up' : 'down';
        var arrow = r[2] ? '▲' : '▼';
        return '<span class="ticker__item mono"><b>' + r[0] + '</b> ' +
          '<span class="' + cls + '">' + arrow + ' ' + r[1] + '</span></span>';
      }).join('');
    }

    // duplicated once for a seamless loop (CSS translates exactly -50%)
    track.innerHTML = renderRow() + renderRow();

    if (reduced || !('IntersectionObserver' in window)) return;
    var el = track.closest('.ticker');
    new IntersectionObserver(function (entries) {
      track.style.animationPlayState = entries[0].isIntersecting ? 'running' : 'paused';
    }, { threshold: 0 }).observe(el);
  })();

  /* ------------------------------------------------------------ year */
  var year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
