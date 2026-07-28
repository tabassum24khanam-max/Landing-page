# ULTRAMAX — landing page

Single-purpose landing page for ULTRAMAX, an autonomous multi-agent trading
system currently in paper trading. One objective: collect email addresses for
early access.

Plain HTML, CSS and JavaScript. No frameworks, no build step, no external
requests — no webfonts, no CDNs, no analytics. The only runtime dependency is
Node itself, for the signup endpoint.

```
index.html            the page
assets/css/main.css   all styling
assets/js/main.js     reveal, live desk feed, form handling
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
move to a different provider entirely, set `window.ULTRAMAX_ENDPOINT` in
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
{ "ok": true, "ref": "UMX-4F2A91" }
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
  "ref": "UMX-4F2A91"
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

- **Palette.** Near-black background, off-white text, warm greys, and a single
  restrained amber accent (`#EAA631`) used only for interactive and live
  elements — a professional-terminal look, not a crypto one. Change `--accent`
  in `assets/css/main.css` to reskin.
- **Naming.** The product is called *ULTRAMAX* throughout. To rename, edit the
  `.mark__word` spans in `index.html` plus the `<title>` and meta description.
- **The "direct mail" address** is set in one place: the `directMail()`
  function near the top of `assets/js/main.js`. It's assembled from two string
  parts rather than written as a literal `mailto:` link, so it isn't handed to
  scrapers as plain text in the page source.
- **The live desk feed** in the hero (`.term`) is a scripted, looping
  transcript — clearly illustrative, not a log of real trades. It pauses when
  scrolled off screen or the tab is hidden, and shows a static excerpt instead
  of animating under `prefers-reduced-motion: reduce`.
- **Layout is deliberately compressed** — one continuous "how it works / why
  trust it" section rather than two, and the risk-layer mechanisms sit in a
  two-column grid instead of a long list. This trades some breathing room for
  fewer scrolls; if you want more air, raise the `--pad`/section `padding-block`
  values in `main.css` back up.

## Accessibility and resilience

- `prefers-reduced-motion: reduce` removes every transition and freezes the
  desk feed on its first few lines instead of animating them in.
- With JavaScript disabled a `<noscript>` block reveals all content and the
  forms fall back to a native POST that the server answers in HTML.
- There is a skip link and a visible focus ring throughout.

## Content honesty

This page makes no profit, return, or win-rate claims anywhere — none of that
is established for a system currently in paper trading, and inventing it would
be false. The only numbers on the page are product facts (35+ indicators, 10+
news sources, a 10-second sentry interval, 3-vote majority) or figures
explicitly labelled illustrative (the real-vs-headline equity bars, the
forensic-log excerpt). The footer states plainly that this is paper trading and
that nothing here is financial advice. Keep it that way — don't add performance
figures later without the same care.
