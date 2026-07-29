# BOBCAT — landing page

Single-purpose landing page for BOBCAT, an autonomous multi-agent trading
system currently in paper trading. One objective: collect email addresses for
early access.

Plain HTML, CSS and JavaScript. No frameworks, no build step, no external
requests — no webfonts, no CDNs, no analytics. The only runtime dependency is
Node itself, for the signup endpoint.

```
index.html            the page
assets/css/main.css   all styling
assets/js/main.js     scroll-scrubbed chart, desk-panel chips, form handling
assets/favicon.svg
server.js             static host + POST /api/subscribe
data/                 submissions (created at runtime, git-ignored)
```

## Run

```bash
node server.js          # http://localhost:3000
PORT=8080 node server.js
```

Node 18+. There is nothing to install.

## Putting it online

`.github/workflows/pages.yml` publishes the page to GitHub Pages on every push
to `main`. It switches Pages on by itself the first time it runs, so there is
nothing to configure. The address is:

```
https://<your-username>.github.io/Landing-page/
```

All paths in `index.html` are relative, so the page works both at a domain root
and in a project subfolder like the one above.

## Where signups go

Both capture boxes deliver straight to an inbox through FormSubmit, so the page
works on GitHub Pages, where no server of ours can run.

The destination lives in each form's `action` attribute, and that is the single
source of truth:

- **Without JavaScript** the browser posts there natively.
- **With JavaScript** `main.js` derives the same service's AJAX URL from that
  attribute and posts there instead, so the page can show its own inline success
  panel rather than navigating away to a third-party thank-you page.

To change the destination, edit the `action` on both forms — nothing else. To
move to a different provider entirely, set `window.BOBCAT_ENDPOINT` in
`index.html` before `main.js` loads; that overrides everything.

The action uses FormSubmit's opaque alias rather than the raw address, so the
inbox is not exposed to scrapers in the page source. A new alias is issued when
you confirm an address with them.

Note that FormSubmit answers `200` with `success:"false"` for its own failures —
an unconfirmed address, most commonly. `main.js` checks that flag rather than
trusting the status code, so a dropped submission can never render a success
panel to the visitor.

### Self-hosting instead

`server.js` still works and is still the only option that keeps submissions on
infrastructure you control. Point both form `action`s back at `api/subscribe`
and run it on any host with Node (Render, Railway, Fly, a VPS). Submissions then
land in `data/submissions.jsonl` as described below instead of an inbox.

## Signup endpoint

`POST /api/subscribe` accepts either JSON (what the page sends via `fetch`) or
`application/x-www-form-urlencoded` (what the same form sends when JavaScript is
off) and answers in the dialect it was asked in.

```jsonc
// request
{ "email": "you@company.com", "message": "optional", "source": "signup" }

// response
{ "ok": true, "ref": "BC-4F2A91" }
```

Submissions are appended as JSON Lines to `data/submissions.jsonl`:

```jsonc
{
  "email": "you@company.com",
  "message": "optional",
  "source": "strip" | "signup",
  "timestamp": "2026-07-28T09:41:02.184Z",
  "ip_hash": "…",           // salted, truncated — for rate limiting only
  "user_agent": "…",
  "ref": "BC-4F2A91"
}
```

The directory is created `0700` and the file `0600`, and `data/` is
git-ignored. Raw IP addresses are never written — only a salted hash.

### Connecting your email service

Set two environment variables and every submission is forwarded on:

```bash
EMAIL_ENDPOINT=https://your-service.example/hooks/access
EMAIL_ENDPOINT_TOKEN=…        # optional, sent as Authorization: Bearer
```

Forwarding is fire-and-forget with a 5s timeout. The record is already durable
on disk before the forward is attempted, so an endpoint that is down or slow
never costs you a signup — failures are logged and nothing else.

Optionally set `IP_SALT` to a fixed value if you want rate-limit buckets to
survive a restart. Left unset, a random salt is generated per process, so the
hashes cannot be correlated across restarts.

### Abuse handling

- Rate limit: 5 submissions per IP per 10 minutes, in-memory sliding window.
  Single-process only — put a shared store behind it if you run more than one
  instance.
- Honeypot field (`company_website`): submissions that fill it get a
  normal-looking response but are never stored, so bots get no signal.
- Request bodies are capped at 16 KB; email at 254 chars, message at 1000.
- Static serving is confined to the project root and refuses `data/`.

## Design notes

- **Theme.** Light is the hard default, dark is opt-in via the toggle in the
  nav. The choice is stored in `localStorage` under `bobcat-theme` and applied
  by an inline script in `<head>` *before* the stylesheet paints, so there's no
  flash of the wrong theme on load. This is a deliberate product decision, not
  the usual pattern — the page does **not** follow `prefers-color-scheme`, so a
  visitor on a dark-mode OS still lands on the light page first. All colors are
  CSS custom properties on `:root`, overridden under `:root[data-theme="dark"]`
  in `assets/css/main.css`; add a theme by adding another override block.
- **Accent.** A single restrained amber, `#C2610F` in light / `#EAA631` in
  dark, used only for interactive and live elements.
- **Naming.** The product is called *BOBCAT* throughout. To rename, edit the
  `.mark__word` spans and the inline SVG mark in `index.html` (nav + footer),
  the `<title>`/meta description, and the reference-code prefix (`BC-`) in
  `server.js`.
- **The "direct mail" address** is set in one place: the `directMail()`
  function near the top of `assets/js/main.js`. It's assembled from two string
  parts rather than written as a literal `mailto:` link, so it isn't handed to
  scrapers as plain text in the page source.
- **The chart lives inside the hero, not below it.** `.scrollchart` sits
  directly in `.hero`, with no card, border or background of its own — the
  candles, price, tabs and desk panel are meant to read as part of the page,
  not as a boxed-off widget. It's a hand-authored SVG replay, not a live feed
  and not connected to any market-data API. Progress through it is a pure
  function of scroll position (`position: sticky` pin + a tall runway div;
  `main.js` maps how far you've scrolled through the runway to 0–1 and reveals
  candles/markers/the desk panel off that), so scrolling back up undoes it
  exactly rather than playing a separate reverse animation. The runway height
  (`.scrollchart`, currently `130vh`) is the one knob for how fast the whole
  sequence resolves.
  Because the chart is now a descendant of `.hero`, **`.hero` must never get
  `overflow: hidden` (or any non-`visible` overflow) back** — an ancestor with
  a scroll-clipping overflow value breaks `position: sticky` for descendants,
  since sticky positioning is computed against the nearest such ancestor's
  scrollport rather than the viewport. That exact regression happened once
  during the hero/chart merge (the pin silently stopped sticking, scrubbing
  through empty space instead of the pinned chart) and was fixed by dropping
  `overflow: hidden` from `.hero` — `.hero__bg` doesn't need it (it's already
  `inset: 0`, fully contained) and `body` already guards horizontal overflow
  globally.
  The **BTC / ETH / NVDA / SPY tabs** above the chart are real buttons that
  redraw the whole chart in place (`SYMBOLS` object + `renderSymbol()` in
  `main.js`) — price, axis labels, all 14 candles and both marker pairs are
  recomputed from each symbol's data plus fixed offsets from each candle's
  high/low, so adding a fifth symbol is just adding a data object, not hand
  placing new marker coordinates.
  The **status panel** (`.deskpanel`) sits directly under the chart rather
  than in its own bordered box, and its "Analysing / News / Math / Market /
  Other" chips rotate through short illustrative lines once AI mode switches
  on (`deskChips()` in `main.js`, one `setInterval` tick every 2.6s). The
  "News" chip's lines are hand-written illustrative headline-shaped text, not
  pulled from a real news source — there's no free, reliable, browser-safe
  feed to pull real headlines from without adding a live dependency that could
  break the homepage, and real headlines would risk implying the chart's
  trades reacted to real news, which they didn't. All candles, entry/exit
  markers and R-multiples on the chart are fixed illustrative values — see
  *Content honesty* below before changing that.
- **The ticker** (`.ticker`) is ambient wallpaper: public tickers with
  illustrative movement, unconnected to any BOBCAT trade or result. It's a CSS
  `translateX` loop, paused off screen via `IntersectionObserver` and disabled
  entirely under reduced motion.
- **Copy is deliberately high-level.** The "how it works" section describes
  what the system does, not exactly how — no indicator lists, no vote counts,
  no timing thresholds. That's intentional: enough for a technical reader to
  trust the sophistication is real, not enough to hand a competitor a spec to
  copy. Keep new copy at that altitude rather than drifting back toward a spec
  sheet.
- **Layout is deliberately compressed** — one continuous "how it works / why
  trust it" section rather than two, and the risk-layer principles sit in a
  short two-column grid instead of a long list. If you want more air, raise the
  `--pad`/section `padding-block` values in `main.css` back up.

## Accessibility and resilience

- `prefers-reduced-motion: reduce` removes every transition, freezes the desk
  feed on its first few lines, stops the ticker, and renders the chart in its
  finished state instead of drawing it in.
- With JavaScript disabled a `<noscript>` block reveals all content and the
  forms fall back to a native POST that the server answers in HTML.
- There is a skip link and a visible focus ring throughout. The theme toggle is
  a real `<button>` with `aria-pressed` kept in sync, and the chart carries a
  descriptive `aria-label` plus a plain-text `sr-only` explanation of the
  terminal feed for screen readers, since both are marked `aria-hidden` for
  everyone else (they're decorative, not informational).

## Content honesty

This page makes no profit, return, or win-rate claims anywhere — none of that
is established for a system currently in paper trading, and inventing it would
be false. The only numbers on the page are qualitative product facts or figures
explicitly labelled illustrative: the chart's entries/exits and R-multiples
(captioned "illustrative replay — not live data, not actual trading results"),
the real-vs-headline equity bars, and the forensic-log excerpt. The footer
states plainly that this is paper trading and that nothing here is financial
advice. Keep it that way — don't add real performance figures later without the
same care, and don't let the chart's illustrative numbers drift toward looking
like a genuine track record.

Note on the chart's two example trades: both are currently wins (`+2.1R`,
`+0.5R`). Earlier versions deliberately showed one win and one loss, on the
theory that an all-win illustrative example reads as cherry-picked even with
the "illustrative" caption. The second pair's direction was flipped (sell
first, buy back lower) at explicit request, which flipped its outcome from a
loss to a small win as a side effect. If a mixed win/loss example matters more
than the requested direction, swap `data-role`/the marker text back on the
`buy2`/`sell2` pair in `index.html` and change `data-outcome="win2"` back to a
loss figure (and its offsets in `main.js`).
