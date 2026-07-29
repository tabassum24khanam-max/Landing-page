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
     One dataset per tab. All four symbols share the same 14 fixed x-slots
     and the same story shape (dip → peak → smaller peak → lower exit) so
     the marker logic below never needs symbol-specific coordinates — only
     each candle's high/low, which the marker placement derives from. Every
     number here is illustrative, not sourced from any market feed. */
  var SYMBOLS = {
    BTC: {
      price: '238.40', changeText: '▲ 0.6%', changeUp: true,
      axis: ['241.80', '236.40', '232.10', '227.50'],
      outcomes: { win1: '+2.1R', win2: '+0.5R' },
      candles: [
        { high: 136, low: 154, bodyTop: 138, bodyBot: 150, up: true },
        { high: 118, low: 140, bodyTop: 122, bodyBot: 138, up: true },
        { high: 118, low: 134, bodyTop: 122, bodyBot: 130, up: false },
        { high: 128, low: 148, bodyTop: 130, bodyBot: 146, up: false },
        { high: 142, low: 156, bodyTop: 146, bodyBot: 152, up: false },
        { high: 132, low: 154, bodyTop: 134, bodyBot: 152, up: true },
        { high: 112, low: 136, bodyTop: 114, bodyBot: 134, up: true },
        { high: 96,  low: 116, bodyTop: 100, bodyBot: 114, up: true },
        { high: 98,  low: 114, bodyTop: 100, bodyBot: 112, up: false },
        { high: 110, low: 128, bodyTop: 112, bodyBot: 126, up: false },
        { high: 116, low: 130, bodyTop: 120, bodyBot: 126, up: true },
        { high: 118, low: 136, bodyTop: 120, bodyBot: 132, up: false },
        { high: 130, low: 148, bodyTop: 132, bodyBot: 144, up: false },
        { high: 140, low: 154, bodyTop: 144, bodyBot: 150, up: false }
      ]
    },
    ETH: {
      price: '3,286.10', changeText: '▲ 1.2%', changeUp: true,
      axis: ['3,412.60', '3,318.40', '3,236.80', '3,150.20'],
      outcomes: { win1: '+2.6R', win2: '+0.7R' },
      candles: [
        { high: 130, low: 152, bodyTop: 134, bodyBot: 148, up: true },
        { high: 108, low: 136, bodyTop: 114, bodyBot: 132, up: true },
        { high: 110, low: 130, bodyTop: 114, bodyBot: 126, up: false },
        { high: 122, low: 150, bodyTop: 126, bodyBot: 146, up: false },
        { high: 140, low: 160, bodyTop: 146, bodyBot: 156, up: false },
        { high: 128, low: 158, bodyTop: 132, bodyBot: 156, up: true },
        { high: 100, low: 132, bodyTop: 104, bodyBot: 128, up: true },
        { high: 82,  low: 104, bodyTop: 88,  bodyBot: 102, up: true },
        { high: 86,  low: 106, bodyTop: 90,  bodyBot: 104, up: false },
        { high: 104, low: 126, bodyTop: 108, bodyBot: 124, up: false },
        { high: 110, low: 128, bodyTop: 116, bodyBot: 124, up: true },
        { high: 114, low: 136, bodyTop: 118, bodyBot: 132, up: false },
        { high: 128, low: 150, bodyTop: 132, bodyBot: 146, up: false },
        { high: 142, low: 160, bodyTop: 146, bodyBot: 156, up: false }
      ]
    },
    NVDA: {
      price: '134.60', changeText: '▲ 0.4%', changeUp: true,
      axis: ['142.80', '138.20', '133.90', '129.40'],
      outcomes: { win1: '+1.8R', win2: '+0.3R' },
      candles: [
        { high: 140, low: 152, bodyTop: 142, bodyBot: 149, up: true },
        { high: 126, low: 142, bodyTop: 129, bodyBot: 140, up: true },
        { high: 127, low: 138, bodyTop: 129, bodyBot: 136, up: false },
        { high: 134, low: 148, bodyTop: 136, bodyBot: 146, up: false },
        { high: 144, low: 154, bodyTop: 147, bodyBot: 152, up: false },
        { high: 136, low: 153, bodyTop: 138, bodyBot: 151, up: true },
        { high: 122, low: 138, bodyTop: 124, bodyBot: 136, up: true },
        { high: 110, low: 124, bodyTop: 113, bodyBot: 122, up: true },
        { high: 112, low: 124, bodyTop: 114, bodyBot: 122, up: false },
        { high: 122, low: 136, bodyTop: 124, bodyBot: 134, up: false },
        { high: 126, low: 137, bodyTop: 130, bodyBot: 135, up: true },
        { high: 129, low: 140, bodyTop: 131, bodyBot: 138, up: false },
        { high: 136, low: 148, bodyTop: 138, bodyBot: 146, up: false },
        { high: 145, low: 154, bodyTop: 147, bodyBot: 152, up: false }
      ]
    },
    SPY: {
      price: '576.85', changeText: '▲ 0.2%', changeUp: true,
      axis: ['582.40', '578.10', '574.30', '570.60'],
      outcomes: { win1: '+1.4R', win2: '+0.4R' },
      candles: [
        { high: 134, low: 150, bodyTop: 137, bodyBot: 147, up: true },
        { high: 122, low: 142, bodyTop: 125, bodyBot: 139, up: true },
        { high: 124, low: 136, bodyTop: 126, bodyBot: 134, up: false },
        { high: 130, low: 148, bodyTop: 132, bodyBot: 145, up: false },
        { high: 140, low: 152, bodyTop: 143, bodyBot: 149, up: false },
        { high: 132, low: 151, bodyTop: 135, bodyBot: 149, up: true },
        { high: 118, low: 136, bodyTop: 121, bodyBot: 134, up: true },
        { high: 104, low: 120, bodyTop: 107, bodyBot: 118, up: true },
        { high: 107, low: 120, bodyTop: 109, bodyBot: 118, up: false },
        { high: 118, low: 132, bodyTop: 120, bodyBot: 130, up: false },
        { high: 122, low: 133, bodyTop: 126, bodyBot: 131, up: true },
        { high: 125, low: 138, bodyTop: 127, bodyBot: 136, up: false },
        { high: 132, low: 146, bodyTop: 134, bodyBot: 144, up: false },
        { high: 142, low: 152, bodyTop: 144, bodyBot: 149, up: false }
      ]
    }
  };

  var CANDLE_X = 26;   // first candle center
  var CANDLE_SPACING = 40;
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

      var win1 = $('[data-outcome="win1"]', root);
      var win2 = $('[data-outcome="win2"]', root);
      if (win1 && data.outcomes.win1) win1.textContent = data.outcomes.win1;
      if (win2 && data.outcomes.win2) win2.textContent = data.outcomes.win2;

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
    var TOTAL_CANDLES = 14;
    var BASE_SHOWN = 0.25;              // fraction already drawn at progress 0
    var AI_ON_AT = 0.42;
    var MARKER_AT = { buy1: .48, sell1: .6, buy2: .74, sell2: .88 };

    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

    var lastRevealCount = -1;
    var lastAiOn = null;

    function applyProgress(progress) {
      var revealCount = Math.max(1, Math.ceil(TOTAL_CANDLES * (BASE_SHOWN + (1 - BASE_SHOWN) * progress)));
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

    function update() {
      var rect = wrapper.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var scrollable = wrapper.offsetHeight - pin.offsetHeight;
      // Progress starts as the wrapper's top enters the viewport bottom
      // and finishes once the pin has scrolled through its entire runway.
      // This way the chart is already coming to life as it slides into view
      // from below, rather than sitting inert until it pins against the top.
      var runway = vh + scrollable;
      var progress = runway > 1 ? clamp((vh - rect.top) / runway, 0, 1) : 1;
      applyProgress(progress);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
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
