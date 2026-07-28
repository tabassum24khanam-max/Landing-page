/* ============================================================================
   Nocturne — landing page behaviour
   No dependencies. Everything degrades to a working static page.
   ========================================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = window.requestAnimationFrame.bind(window);

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ------------------------------------------------------------ index hint
     Stagger helpers read --i, so number the children once up front.        */
  function indexChildren(selector) {
    $$(selector).forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--i', i);
      });
    });
  }
  indexChildren('.bars, .dots, .healthbars, .dtable tbody, .gauges, .ticklist--off');

  /* ------------------------------------------------------------ svg draw
     Measure each animated path so the dash animation is length-correct.    */
  $$('.draw').forEach(function (path) {
    var len;
    try { len = path.getTotalLength(); } catch (e) { len = 0; }
    if (len) {
      path.style.setProperty('--len', Math.ceil(len));
      path.style.strokeDasharray = Math.ceil(len);
      path.style.strokeDashoffset = reduced ? 0 : Math.ceil(len);
    }
  });

  /* ------------------------------------------------------------ reveal */
  var revealTargets = $$('[data-reveal], [data-flow], [data-dash]');

  if (!('IntersectionObserver' in window)) {
    revealTargets.forEach(function (el) { el.classList.add('is-in', 'is-live'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    revealTargets.forEach(function (el) { revealObserver.observe(el); });

    /* Looping animations only run while their figure is actually on screen. */
    var liveObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-live', entry.isIntersecting);
      });
    }, { rootMargin: '120px 0px' });

    $$('[data-flow]').forEach(function (el) { liveObserver.observe(el); });
  }

  /* ------------------------------------------------------------ nav */
  var nav = $('#nav');
  var progress = $('#progress');
  var navTicking = false;

  function onScroll() {
    if (navTicking) return;
    navTicking = true;
    raf(function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      nav.classList.toggle('is-stuck', y > 8);

      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(1, y / max) : 0;
      progress.style.width = (pct * 100).toFixed(2) + '%';

      navTicking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------ counters */
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function runCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    if (isNaN(target)) return;

    if (reduced) {
      el.textContent = format(target, decimals);
      return;
    }

    var start = performance.now();
    var dur = 1400;

    function frame(now) {
      var t = Math.min(1, (now - start) / dur);
      el.textContent = format(target * easeOutCubic(t), decimals);
      if (t < 1) raf(frame);
    }
    raf(frame);
  }

  function format(n, decimals) {
    return decimals > 0
      ? n.toFixed(decimals)
      : Math.round(n).toLocaleString('en-US');
  }

  var counters = $$('[data-count]');
  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      counters.forEach(runCount);
    } else {
      var countObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCount(entry.target);
          countObserver.unobserve(entry.target);
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { countObserver.observe(el); });
    }
  }

  /* ------------------------------------------------------------ hero lattice
     A quiet market lattice: hairline grid, one drifting series, one head dot.
     Costs a few hundred ops per frame and stops entirely when off screen.  */
  (function lattice() {
    var canvas = $('#lattice');
    if (!canvas) return;

    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    var running = false;
    var visible = true;
    var t = 0;

    // deterministic pseudo-noise so the curve is stable across resizes
    function noise(x) {
      return (
        Math.sin(x * 0.7) * 0.5 +
        Math.sin(x * 1.9 + 1.3) * 0.28 +
        Math.sin(x * 4.1 + 2.7) * 0.14 +
        Math.sin(x * 8.3 + 0.6) * 0.07
      );
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      var step = 88;

      // grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#f1efec';
      ctx.beginPath();
      for (var x = (w % step) / 2; x < w; x += step) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, h);
      }
      for (var y = (h % step) / 2; y < h; y += step) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(w, Math.round(y) + 0.5);
      }
      ctx.stroke();

      // series
      var baseY = h * 0.62;
      var amp = Math.min(h * 0.17, 150);
      var pts = [];
      var cols = Math.ceil(w / 8) + 1;

      for (var i = 0; i <= cols; i++) {
        var px = i * 8;
        var n = noise(px * 0.0055 + t);
        pts.push([px, baseY - n * amp]);
      }

      // faint fill under the curve
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(194, 65, 12, 0.028)';
      ctx.fill();

      // curve
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.strokeStyle = 'rgba(11, 11, 12, 0.20)';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // secondary, slower series
      ctx.beginPath();
      for (var m = 0; m <= cols; m++) {
        var mx = m * 8;
        var my = baseY - noise(mx * 0.0031 + t * 0.45) * amp * 0.55 + 64;
        if (m === 0) ctx.moveTo(mx, my); else ctx.lineTo(mx, my);
      }
      ctx.strokeStyle = 'rgba(11, 11, 12, 0.085)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // head marker on the primary series
      var head = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(head[0] - 2, head[1], 2.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(194, 65, 12, 0.75)';
      ctx.fill();
    }

    function loop() {
      if (!running) return;
      t += 0.0016;
      draw();
      raf(loop);
    }

    function start() {
      if (running || reduced || !visible) return;
      running = true;
      raf(loop);
    }
    function stop() { running = false; }

    // only animate while the hero is on screen and the tab is focused
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        visible ? start() : stop();
      }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 140);
    }, { passive: true });

    resize();
    canvas.classList.add('is-on');
    start();
  })();

  /* ------------------------------------------------------------ dashboard life */
  (function dashboard() {
    var clock = $('[data-clock]');
    var ticker = $('[data-tick]');
    var countdown = $('[data-countdown]');
    if (!clock && !ticker && !countdown) return;

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    if (clock) {
      (function tickClock() {
        var d = new Date();
        clock.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
        setTimeout(tickClock, 1000);
      })();
    }

    if (ticker && !reduced) {
      var base = parseFloat(ticker.getAttribute('data-tick'));
      var range = parseFloat(ticker.getAttribute('data-tick-range') || '100');
      var current = base;
      setInterval(function () {
        current += (Math.random() - 0.48) * range;
        if (Math.abs(current - base) > range * 4) current = base;
        ticker.textContent = current.toLocaleString('en-US', {
          minimumFractionDigits: 2, maximumFractionDigits: 2
        });
      }, 2600);
    }

    if (countdown) {
      var parts = countdown.textContent.split(':').map(Number);
      var secs = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
      setInterval(function () {
        secs = secs > 0 ? secs - 1 : 900;
        countdown.textContent =
          pad(Math.floor(secs / 3600)) + ':' +
          pad(Math.floor((secs % 3600) / 60)) + ':' +
          pad(secs % 60);
      }, 1000);
    }
  })();

  /* ------------------------------------------------------------ capture */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  var ENDPOINT = '/api/subscribe';

  $$('[data-capture]').forEach(function (form) {
    var input = form.querySelector('input[type="email"]');
    var message = form.querySelector('textarea');
    var honeypot = form.querySelector('.hp');
    var button = form.querySelector('button[type="submit"]');
    var note = form.querySelector('[data-status]');
    var defaultNote = note ? note.textContent : '';
    var success = form.parentElement.querySelector('[data-success]');

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
      if (input.closest('.field').classList.contains('is-invalid')) {
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
        setNote('That address doesn’t look right. Check it and try again.', 'error');
        return;
      }

      markInvalid(false);
      button.classList.add('is-busy');
      setNote('Submitting…', null);

      var payload = {
        email: email,
        message: message ? message.value.trim() : '',
        source: form.getAttribute('data-source') || 'unknown',
        company_website: honeypot ? honeypot.value : ''
      };

      fetch(ENDPOINT, {
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

          if (!res.ok) {
            var msg = (res.body && res.body.error)
              || (res.status === 429
                    ? 'Too many attempts. Try again in a few minutes.'
                    : 'Something went wrong on our end. Please try again.');
            setNote(msg, 'error');
            return;
          }

          if (success) {
            var emailSlot = success.querySelector('[data-success-email]');
            var refSlot = success.querySelector('[data-success-ref]');
            if (emailSlot) emailSlot.textContent = email;
            if (refSlot) refSlot.textContent = (res.body && res.body.ref) || '—';
            form.classList.add('is-done');
            success.hidden = false;
          } else {
            input.value = '';
            setNote('You’re on the list. We’ll email you when a seat opens.', 'ok');
          }
        })
        .catch(function () {
          button.classList.remove('is-busy');
          setNote('Couldn’t reach the server. Check your connection and try again.', 'error');
        });
    });
  });

  /* ------------------------------------------------------------ year */
  var year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
