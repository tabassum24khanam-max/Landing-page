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

  /* ------------------------------------------------------------ desk feed
     A scripted, looping transcript of the four agents reasoning together.
     Purely illustrative — not a log of real trades. Pauses off screen. */
  (function feed() {
    var term = $('[data-feed]');
    var list = $('[data-feed-list]', term);
    if (!term || !list) return;

    var SCRIPT = [
      { tag: 'READ',    html: 'Reading price action, volume and structure across the book' },
      { tag: 'READ',    html: 'Bull case building — <b>testing it against the strongest counter-argument</b>' },
      { tag: 'CONTEXT', html: 'Scanning coverage for the one thing that actually moves this' },
      { tag: 'CONTEXT', html: 'Assessing whether the market has <b>already priced it in</b>' },
      { tag: 'JUDGE',   html: 'Cross-checking the read against the risk picture before sizing', accent: true },
      { tag: 'JUDGE',   html: 'Ruling logged — sized on conviction, not enthusiasm', accent: true },
      { tag: 'RISK',    html: 'Stop armed · correlation checked · nothing stacked twice' },
      { tag: 'WATCH',   html: 'Watching every open position — nothing unusual yet' },
      { tag: 'READ',    html: 'Volatility regime steady, no reclassification needed' },
      { tag: 'CONTEXT', html: 'Nothing new since the last pass' },
      { tag: 'JUDGE',   html: 'Weighing this call against how it has performed here before', accent: true },
      { tag: 'RISK',    html: 'Tightening the stop on a position that has been open a while' },
    ];

    var i = 0;
    var MAX_LINES = 7;

    function pushLine() {
      var item = SCRIPT[i % SCRIPT.length];
      i++;

      var li = document.createElement('li');
      li.className = 'feed__line';
      var tagClass = item.accent ? 'feed__tag feed__tag--judge' : 'feed__tag';
      li.innerHTML = '<span class="' + tagClass + '">[' + item.tag + ']</span> ' + item.html;
      list.appendChild(li);

      while (list.children.length > MAX_LINES) {
        list.removeChild(list.firstElementChild);
      }
      term.querySelector('.term__body').scrollTop = 999999;
    }

    var timer = null;
    function start() {
      if (timer || reduced) return;
      if (!list.children.length) {
        for (var n = 0; n < 5; n++) pushLine();
      }
      timer = setInterval(pushLine, 1900);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    if (reduced) {
      for (var n = 0; n < 5; n++) pushLine();
      return;
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }, { threshold: 0 }).observe(term);
    } else {
      start();
    }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });
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
