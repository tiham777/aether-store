# AETHER — storefront

A world-class static e-commerce storefront for a fictional Copenhagen object brand.
Dependency-free: plain HTML, CSS and vanilla JS with a hash router — no build step,
no framework, no node_modules.

## What's inside

- **Storefront** — home, shop (filters + sort), product pages, cart drawer, checkout
  (card + cash on delivery), order confirmation, live order tracking (`#/track`),
  journal, about, 404
- **Accounts** — registration, login, profile, addresses, order history
- **Admin dashboard** (`#/admin`) — products CRUD, orders pipeline, customers,
  subscribers, analytics, settings, danger zone
- **Data layer** — localStorage-backed with a versioned catalogue overlay, cross-tab
  sync, brute-force login throttling, and a router error boundary; optional
  **Firebase (Cloud Firestore)** sync for orders and reviews, with an offline
  write queue and live status listeners
- **Self-hosted fonts** (Inter + Instrument Serif), authored SVG product renders

## Run locally

```bash
npm run serve          # dev server (tools/serve.mjs)
# or any static file server pointed at this directory
```

## Test

```bash
npm test               # node --test, no dependencies — pricing, auth, throttle, catalogue
npm run renders        # regenerate the SVG product render set
```

## Backend — Firebase (free tier)

Orders and reviews sync through **Cloud Firestore** on Firebase's free
**Spark** plan (50K reads / 20K writes / 1 GiB stored per day — far more than
a demo or small store needs). No server and no npm: the SDK is imported
lazily from the gstatic CDN, and every call falls back to local storage when
Firebase is absent or unreachable.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
   (Spark plan — no card required)
2. **Firestore Database → Create database** → production mode, pick a region
3. **Project settings → Your apps → </>** — register a web app and copy the
   `firebaseConfig` object the console shows you
4. Paste it into [`js/firebase-config.js`](js/firebase-config.js)
5. Publish [`firestore.rules`](firestore.rules): **Firestore → Rules → paste
   and publish**, or `firebase deploy --only firestore:rules`

Once configured, the site:

- writes every order to `orders/{ORDER_ID}` — if the network drops, the write
  is queued in the browser and retried on reconnect, so an order is never lost
- shows orders placed on any device in `#/admin`, live, without a sync button
- lets customers follow an order at **`#/track?id=AET-2026-123456`** — the
  timeline moves when the admin advances the status, no refresh needed
- mirrors product reviews between visitors

Leave `apiKey` empty and everything stays in local storage exactly as before.

**Hardened by design:** cloud documents are re-validated and coerced to a
known-good shape on ingest (status enum, strict id pattern, capped strings,
`javascript:` image sources dropped) and every field is HTML-escaped at the
render site; order numbers carry 60 bits of crypto entropy so tracking URLs
can't be enumerated; a Content-Security-Policy ships as both a `vercel.json`
header and an `index.html` meta tag; and `firestore.rules` enforces the same
order shape server-side. Re-publish the rules file after updating it.

> **Demo-grade rules.** `firestore.rules` lets anyone who knows an order
> number read that one order, and lets the dashboard list orders without a
> sign-in — the same stance as the rest of this demo storefront. Before
> taking real money, add Firebase Auth and restrict `list` / `update` to the
> admin session.

## Deploy to Vercel

1. Import this repository at [vercel.com/new](https://vercel.com/new)
2. Leave the framework as **Other** — there is no build step; output is the repo root
3. Deploy — all routes are hash-based (`#/shop`), so no rewrites are needed

## Demo credentials

| Role     | Username | Password           |
|----------|----------|--------------------|
| Admin    | `admin`  | `Password8989$$`   |

The deployed store ships **clean** — no fake orders, customers or subscribers.
For testing, load the demo dataset from **Admin → Settings → Danger zone →
Load demo data** (adds demo customers such as `marta` / `Demo1234`, sample
orders and subscribers); *Erase everything* removes it again.

> **Data lives in the browser until Firebase is configured.** This is a
> static site: without a `firebaseConfig` in `js/firebase-config.js`, orders,
> accounts and catalogue edits are stored in each visitor's localStorage —
> private to that browser and device. Configuring Firebase (section above)
> shares orders across visitors, devices and the admin dashboard, and turns
> on customer order tracking at `#/track`.
>
> Demo auth is presentation-grade: credentials are verified in the browser.
> A real deployment must verify passwords server-side (bcrypt/argon2 over
> HTTPS) and never ship the hash seed.
