/* =========================================================================
   Arena — state: cart, wishlist, pricing, events
   ========================================================================= */
(function () {
  'use strict';

  const CART_KEY = 'aether.cart.v1';
  const WISH_KEY = 'aether.wish.v1';
  const PROMO_KEY = 'aether.promo.v1';
  /* carts saved under the old brand stored its first-order code verbatim */
  const LEGACY_PROMO = { AETHER10: 'ARENA10' };
  const migratePromo = (code) => (code && LEGACY_PROMO[code]) || code || null;

  const fmtWhole = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const fmtCents = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const state = { items: [], wishlist: [], promo: null };
  const listeners = new Set();

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* private mode — stay in memory */
    }
  }

  state.items = read(CART_KEY, []);
  state.wishlist = read(WISH_KEY, []);
  state.promo = migratePromo(read(PROMO_KEY, null));

  function emit(type) {
    listeners.forEach((fn) => fn(type));
  }
  function persist() {
    write(CART_KEY, state.items);
    write(WISH_KEY, state.wishlist);
    write(PROMO_KEY, state.promo);
  }
  function product(id) {
    return (window.DATA.products || []).find((p) => p.id === id);
  }
  const lineId = (id, color) => `${id}::${color || ''}`;

  const Store = {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /* ------------------------------- cart ------------------------------- */

    get items() {
      return state.items;
    },
    get count() {
      return state.items.reduce((n, l) => n + l.qty, 0);
    },
    /* inventory guard: how many of this product the bag may hold */
    stockCap(id) {
      const p = product(id);
      if (!p) return 0;
      return typeof p.stock === 'number' && p.stock >= 0 ? Math.min(99, p.stock) : 99;
    },
    /* returns false when the product is missing or sold out, so callers
       (quick add, reorder, bundles) can tell the user what happened */
    add(id, qty, color) {
      const p = product(id);
      if (!p) return false;
      const cap = Store.stockCap(id);
      if (cap <= 0) return false;
      const variant = color || p.colors[0].name;
      const key = lineId(id, variant);
      const existing = state.items.find((l) => l.id === key);
      if (existing) existing.qty = Math.min(existing.qty + (qty || 1), cap);
      else
        state.items.push({
          id: key,
          productId: id,
          color: variant,
          qty: Math.min(qty || 1, cap),
          price: p.price,
          addedAt: Date.now(),
        });
      persist();
      emit('add');
      return true;
    },
    setQty(key, qty) {
      const line = state.items.find((l) => l.id === key);
      if (!line) return;
      if (qty <= 0) return Store.remove(key);
      const cap = Store.stockCap(line.productId);
      if (cap <= 0) return; /* sold out while in the bag: no quiet restock */
      line.qty = Math.min(qty, cap);
      persist();
      emit('change');
    },
    remove(key) {
      state.items = state.items.filter((l) => l.id !== key);
      persist();
      emit('remove');
    },
    clear() {
      state.items = [];
      state.promo = null;
      persist();
      emit('change');
    },
    line(key) {
      return state.items.find((l) => l.id === key);
    },
    has(productId) {
      return state.items.some((l) => l.productId === productId);
    },

    /* ------------------------------ pricing ----------------------------- */

    subtotal() {
      return state.items.reduce((n, l) => n + l.price * l.qty, 0);
    },
    discount() {
      if (!state.promo) return 0;
      const code = state.promo;
      const rate = (DATA.promoCodes || {})[code] || 0;
      return Math.round(Store.subtotal() * rate);
    },
    shipping(method) {
      if (!state.items.length) return 0;
      if (method === 'express') return DATA.expressFee;
      return Store.subtotal() - Store.discount() >= DATA.freeShipThreshold ? 0 : 900;
    },
    tax(method) {
      const base = Store.subtotal() - Store.discount() + Store.shipping(method);
      return Math.round(base * DATA.taxRate);
    },
    total(method) {
      return Store.subtotal() - Store.discount() + Store.shipping(method) + Store.tax(method);
    },
    freeShipRemaining() {
      return Math.max(0, DATA.freeShipThreshold - (Store.subtotal() - Store.discount()));
    },

    /* --------------------------- delivery promise ------------------------ */
    /* Business-day dispatch + transit windows: express 1–2 days, standard
       3–5. Orders placed after 14:00 (or on a weekend) leave the next
       business day — the same rule the countdown on the product page
       quotes, so every ETA on the site agrees with every other one. */
    eta(method, from) {
      const isBiz = (d) => d.getDay() !== 0 && d.getDay() !== 6;
      const addBiz = (d, n) => {
        const x = new Date(d);
        let left = n;
        while (left > 0) {
          x.setDate(x.getDate() + 1);
          if (isBiz(x)) left--;
        }
        return x;
      };
      const disp = new Date(from || Date.now());
      if (!isBiz(disp) || disp.getHours() >= 14) {
        do {
          disp.setDate(disp.getDate() + 1);
        } while (!isBiz(disp));
      }
      const [loN, hiN] = method === 'express' ? [1, 2] : [3, 5];
      return { from: addBiz(disp, loN), to: addBiz(disp, hiN) };
    },
    etaLabel(method, from, long) {
      const r = Store.eta(method, from);
      const f = (d) => Store.dayLabel(d, long);
      return r.from.toDateString() === r.to.toDateString() ? f(r.to) : `${f(r.from)} – ${f(r.to)}`;
    },
    dayLabel(d, long) {
      return new Date(d).toLocaleDateString('en-US',
        long ? { weekday: 'long', month: 'long', day: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' }
      );
    },

    /* ------------------------------- promo ------------------------------ */

    get promo() {
      return state.promo;
    },
    applyPromo(code) {
      const raw = String(code || '').trim().toUpperCase();
      const clean = LEGACY_PROMO[raw] || raw;
      if (!DATA.promoCodes[clean]) return false;
      state.promo = clean;
      persist();
      emit('promo');
      return true;
    },
    clearPromo() {
      state.promo = null;
      persist();
      emit('promo');
    },

    /* ----------------------------- wishlist ----------------------------- */

    get wishlist() {
      return state.wishlist;
    },
    toggleWish(id) {
      const i = state.wishlist.indexOf(id);
      if (i > -1) state.wishlist.splice(i, 1);
      else state.wishlist.push(id);
      persist();
      emit('wish');
      return i === -1;
    },
    isWished(id) {
      return state.wishlist.includes(id);
    },

    /* another tab wrote the cart — pull its state and repaint */
    resync() {
      state.items = read(CART_KEY, []) || [];
      state.wishlist = read(WISH_KEY, []) || [];
      state.promo = migratePromo(read(PROMO_KEY, null));
      emit('change');
      emit('wish');
    },

    /* ------------------------------- money ------------------------------ */

    money(cents) {
      if (!cents && cents !== 0) return '—';
      return cents % 100 === 0 ? fmtWhole.format(cents / 100) : fmtCents.format(cents / 100);
    },

    product,
    reset() {
      state.items = [];
      state.wishlist = [];
      state.promo = null;
      persist();
      emit('change');
    },
  };

  window.Store = Store;

  /* ------------------------------- reviews ------------------------------- */
  /* Written per-product reviews. Local-first; merges with the shared store
     when the backend is configured (see js/api.js). */
  const REVIEWS_KEY = 'aether.reviews.v1';
  let reviews = read(REVIEWS_KEY, null);
  if (!Array.isArray(reviews)) reviews = [];
  const rvId = () => 'rv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const Reviews = {
    all() {
      return reviews.slice().sort((a, b) => (b.at || 0) - (a.at || 0));
    },
    forProduct(id) {
      return Reviews.all().filter((r) => r.productId === id);
    },
    add(rec) {
      const full = Object.assign({ id: rvId(), at: Date.now() }, rec);
      reviews.push(full);
      write(REVIEWS_KEY, reviews);
      return full;
    },
    markShared(id) {
      const r = reviews.find((x) => x.id === id);
      if (r && !r.shared) {
        r.shared = true;
        write(REVIEWS_KEY, reviews);
      }
    },
    mergeCloud(list) {
      let added = 0;
      (list || []).forEach((r) => {
        if (!r || typeof r !== 'object' || !r.id || !r.productId) return;
        if (!/^[a-z0-9-]{1,40}$/.test(String(r.productId))) return;
        if (typeof r.text !== 'string' || r.text.trim().length < 10) return; /* malformed */
        if (reviews.some((x) => x.id === r.id)) return;
        /* untrusted cloud input — coerce to a known-good shape */
        reviews.push({
          id: String(r.id).slice(0, 60),
          productId: String(r.productId).slice(0, 40),
          userId: typeof r.userId === 'string' ? r.userId.slice(0, 40) : null,
          name: String(r.name || 'Owner').slice(0, 60),
          initials: String(r.initials || '?').slice(0, 4).toUpperCase(),
          rating: Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))),
          text: r.text.slice(0, 500),
          verified: Boolean(r.verified),
          at: Number.isFinite(Number(r.at)) ? Number(r.at) : Date.now(),
        });
        added++;
      });
      if (added) {
        reviews.sort((a, b) => (b.at || 0) - (a.at || 0));
        write(REVIEWS_KEY, reviews);
      }
      return added;
    },
  };
  window.Reviews = Reviews;
})();
