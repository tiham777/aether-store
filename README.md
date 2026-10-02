# AETHER — storefront

A world-class static e-commerce storefront for a fictional Copenhagen object brand.
Dependency-free: plain HTML, CSS and vanilla JS with a hash router — no build step,
no framework, no node_modules.

## What's inside

- **Storefront** — home, shop (filters + sort), product pages, cart drawer, checkout
  (card + cash on delivery), order confirmation, journal, about, 404
- **Accounts** — registration, login, profile, addresses, order history
- **Admin dashboard** (`#/admin`) — products CRUD, orders pipeline, customers,
  subscribers, analytics, settings, danger zone
- **Data layer** — localStorage-backed with a versioned catalogue overlay, cross-tab
  sync, brute-force login throttling, and a router error boundary
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

## Deploy to Vercel

1. Import this repository at [vercel.com/new](https://vercel.com/new)
2. Leave the framework as **Other** — there is no build step; output is the repo root
3. Deploy — all routes are hash-based (`#/shop`), so no rewrites are needed

## Demo credentials

| Role     | Username | Password           |
|----------|----------|--------------------|
| Admin    | `admin`  | `Password8989$$`   |
| Customer | `marta`  | `Demo1234`         |

> This is a presentation-grade demo: credentials are verified in the browser.
> A real deployment must verify passwords server-side (bcrypt/argon2 over HTTPS)
> and never ship the hash seed.
