/* ============================================================================
   ULTRAMAX — landing page behaviour
   No dependencies. Degrades to a working static page without JS.
   ========================================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = window.requestAnimationFrame.bind(window);

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

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
      { tag: 'ANALYST', html: 'RSI(14) 61.8 · MACD bullish cross · vol regime <b>NORMAL</b>' },
      { tag: 'ANALYST', html: 'Bull case: momentum + volume confirm. Counter-argument: resistance overhead.' },
      { tag: 'INTEL',   html: '17 headlines scanned · 1 dominant catalyst identified' },
      { tag: 'INTEL',   html: 'Catalyst assessment: <b>not yet priced in</b> · direction: bullish' },
      { tag: 'INTEL',   html: 'Options flow: elevated call volume, non-standard size' },
      { tag: 'JUDGE',   html: 'Risk officer notes reviewed — no correlated exposure open', accent: true },
      { tag: 'JUDGE',   html: 'Vote 1/3 LONG · vote 2/3 LONG · vote 3/3 HOLD → majority LONG', accent: true },
      { tag: 'JUDGE',   html: 'Sizing set from conviction, not enthusiasm. Ruling logged.', accent: true },
      { tag: 'RISK',    html: 'Trailing stop armed · breakeven lock queued · correlation veto: clear' },
      { tag: 'SENTRY',  html: 'Watching · 10s interval · directional threshold not met' },
      { tag: 'ANALYST', html: 'Regime re-check: volatility contracting, no reclassification' },
      { tag: 'INTEL',   html: 'No new high-impact filings in the last cycle' },
      { tag: 'JUDGE',   html: 'Prior call on this asset: 2 of last 3 correct — weighted accordingly', accent: true },
      { tag: 'RISK',    html: 'Time-decaying stop tightened on open short elsewhere in book' },
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
    link.href = 'mailto:' + address + '?subject=' + encodeURIComponent('ULTRAMAX early access');
    var label = $('[data-direct-mail-label]', link);
    if (label) label.textContent = 'or email us directly — ' + address;
  })();

  /* ------------------------------------------------------------ capture */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  var ENDPOINT = window.ULTRAMAX_ENDPOINT || 'api/subscribe';

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
            if (res.status === 429) {
              setNote('Too many attempts. Try again in a few minutes.', 'error');
              return;
            }
            if (res.body && res.body.error) {
              setNote(res.body.error, 'error');
              return;
            }
            console.warn(
              'ULTRAMAX: no signup endpoint at "' + ENDPOINT + '" (HTTP ' + res.status + '). ' +
              'This page is likely on a static host. Run server.js somewhere that supports ' +
              'Node, or set window.ULTRAMAX_ENDPOINT to a hosted form service.'
            );
            setNote('Signups aren’t connected on this address yet.', 'error');
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

  /* ------------------------------------------------------------ year */
  var year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
