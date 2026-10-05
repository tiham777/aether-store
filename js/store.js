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
    /* The dispatch promise is made in one clock only: the Copenhagen studio's.
       "Order before 14:00" means 14:00 Europe/Copenhagen, whatever timezone
       the visitor is in, so the countdown, the ETAs and the shipping copy
       can never disagree. Dispatch + transit skip weekends in CET too. */
    DISPATCH_TZ: 'Europe/Copenhagen',
    CUTOFF_HOUR: 14,
    /* minutes between UTC and the wall clock of `tz` at that instant */
    _tzOffsetMin(date, tz) {
      try {
        const dtf = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const p = {};
        dtf.formatToParts(date).forEach((x) => (p[x.type] = x.value));
        const asUTC = Date.UTC(+p.year, p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
        return (asUTC - date.getTime()) / 60000;
      } catch (e) {
        return -date.getTimezoneOffset(); /* very old engines: fall back to local */
      }
    },
    /* shift an instant into the studio's wall clock (read with getUTC*) */
    _wall(date) {
      return new Date(date.getTime() + Store._tzOffsetMin(date, Store.DISPATCH_TZ) * 60000);
    },
    /* inverse of _wall — turn a wall-clock reading back into an instant */
    _instant(wallDate) {
      const guess = new Date(wallDate.getTime() - Store._tzOffsetMin(wallDate, Store.DISPATCH_TZ) * 60000);
      const off = Store._tzOffsetMin(guess, Store.DISPATCH_TZ);
      return new Date(wallDate.getTime() - off * 60000);
    },
    _isBizDay(wallDate) {
      const dow = wallDate.getUTCDay();
      return dow !== 0 && dow !== 6;
    },
    eta(method, from) {
      const addBiz = (x, n) => {
        const y = new Date(x);
        let left = n;
        while (left > 0) {
          y.setUTCDate(y.getUTCDate() + 1);
          if (Store._isBizDay(y)) left--;
        }
        return y;
      };
      const at = from instanceof Date ? from : new Date(from || Date.now());
      const w = Store._wall(at);
      const disp = new Date(w);
      if (!Store._isBizDay(disp) || disp.getUTCHours() >= Store.CUTOFF_HOUR) {
        do {
          disp.setUTCDate(disp.getUTCDate() + 1);
        } while (!Store._isBizDay(disp));
      }
      const [loN, hiN] = method === 'express' ? [1, 2] : [3, 5];
      return { from: Store._instant(addBiz(disp, loN)), to: Store._instant(addBiz(disp, hiN)) };
    },
    /* ms until the next 14:00 Europe/Copenhagen dispatch cutoff — powers the
       product-page countdown so it agrees with every ETA on the site */
    msUntilCutoff(now) {
      const n = now instanceof Date ? now.getTime() : now || Date.now();
      const w = Store._wall(new Date(n));
      const target = new Date(w);
      target.setUTCHours(Store.CUTOFF_HOUR, 0, 0, 0);
      if (w.getTime() >= target.getTime() || !Store._isBizDay(w)) {
        do {
          target.setUTCDate(target.getUTCDate() + 1);
        } while (!Store._isBizDay(target));
      }
      return Math.max(0, Store._instant(target).getTime() - n);
    },
    etaLabel(method, from, long) {
      const r = Store.eta(method, from);
      const f = (d) => Store.dayLabel(d, long);
      return r.from.toDateString() === r.to.toDateString() ? f(r.to) : `${f(r.from)} – ${f(r.to)}`;
    },
    /* shipping dates are promised in the studio's timezone, so label them
       there too — a visitor in Auckland and one in Copenhagen see the same */
    dayLabel(d, long) {
      try {
        return new Date(d).toLocaleDateString(
          'en-US',
          Object.assign(
            { timeZone: Store.DISPATCH_TZ },
            long ? { weekday: 'long', month: 'long', day: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' }
          )
        );
      } catch (e) {
        return new Date(d).toLocaleDateString(
          'en-US',
          long ? { weekday: 'long', month: 'long', day: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' }
        );
      }
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

    /* drop bag lines whose product has since been deleted (admin removal)
       and re-clamp quantities to current stock; runs once on boot */
    prune() {
      const before = state.items.length;
      state.items = state.items.filter((l) => {
        const p = product(l.productId);
        if (!p) return false;
        const cap = Store.stockCap(l.productId);
        if (cap <= 0) return false;
        if (l.qty > cap) l.qty = cap;
        if (typeof p.price === 'number') l.price = p.price;
        return true;
      });
      if (state.items.length !== before) persist();
      return before - state.items.length;
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
