# Nocturne — landing page

Single-purpose landing page for an autonomous market intelligence system. One
objective: collect email addresses for the private beta.

Plain HTML, CSS and JavaScript. No frameworks, no build step, no external
requests — no webfonts, no CDNs, no analytics. The only runtime dependency is
Node itself, for the signup endpoint.

```
index.html            the page
assets/css/main.css   all styling
assets/js/main.js     reveal, counters, hero canvas, form handling
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

**GitHub Pages cannot run the signup endpoint.** Pages serves static files only,
so `server.js` never runs there and the form has nothing to post to — it will
say "Signups aren't connected on this address yet." To collect email addresses
you need one of:

- **A host that runs Node** (Render, Railway, Fly, a VPS). Deploy the repository,
  run `node server.js`, and everything works as it does locally — this is the
  only option that keeps submissions on infrastructure you control.
- **A hosted form service.** Set `window.NOCTURNE_ENDPOINT` in `index.html`
  before `main.js` loads, pointing at the service's URL. The page keeps its
  validation, loading and success states; only the destination changes.

## Signup endpoint

`POST /api/subscribe` accepts either JSON (what the page sends via `fetch`) or
`application/x-www-form-urlencoded` (what the same form sends when JavaScript is
off) and answers in the dialect it was asked in.

```jsonc
// request
{ "email": "you@company.com", "message": "optional", "source": "beta" }

// response
{ "ok": true, "ref": "NB-4F2A91" }
```

Submissions are appended as JSON Lines to `data/submissions.jsonl`:

```jsonc
{
  "email": "you@company.com",
  "message": "optional",
  "source": "hero" | "beta",
  "timestamp": "2026-07-28T09:41:02.184Z",
  "ip_hash": "…",           // salted, truncated — for rate limiting only
  "user_agent": "…",
  "ref": "NB-4F2A91"
}
```

The directory is created `0700` and the file `0600`, and `data/` is
git-ignored. Raw IP addresses are never written — only a salted hash.

### Connecting your email service

Set two environment variables and every submission is forwarded on:

```bash
EMAIL_ENDPOINT=https://your-service.example/hooks/beta
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

- **Palette.** White background, near-black text, warm greys, and a single
  restrained accent — burnt copper `#C2410C`, used only for interactive and
  live elements. Change `--accent` in `assets/css/main.css` to reskin.
- **Naming.** The product is called *Nocturne* throughout. To rename, edit the
  `.mark__word` spans in `index.html` plus the `<title>` and meta description.
- **Numbers** are monospace with tabular figures so they don't jitter as they
  animate or tick.
- **Motion** is driven by two `IntersectionObserver`s: one reveals on entry
  (fires once), one pauses looping figure animations while their figure is off
  screen. The hero canvas stops on scroll-away and on tab blur.
- **All figures are hand-authored SVG.** The dashboard is real HTML, not an
  image, so it stays sharp and reflows on small screens.

## Accessibility and resilience

- `prefers-reduced-motion: reduce` removes every transition, loop and canvas
  animation, leaving the finished state.
- With JavaScript disabled a `<noscript>` block reveals all content and the
  forms fall back to a native POST that the server answers in HTML.
- Diagrams carry `role="img"` and descriptive labels; the decision log is a real
  `<table>` with header scope; there is a skip link and a visible focus ring.

## Content honesty

Every figure on the page is either a product specification (latency, instrument
count, decision cadence) or an explicitly labelled illustrative interface value.
There are no performance claims, returns, or backtest results anywhere, and the
footer carries a plain-language risk disclaimer. Keep it that way.
