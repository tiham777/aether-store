/* =========================================================================
   AETHER — state: cart, wishlist, pricing, events
   ========================================================================= */
(function () {
  'use strict';

  const CART_KEY = 'aether.cart.v1';
  const WISH_KEY = 'aether.wish.v1';
  const PROMO_KEY = 'aether.promo.v1';

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
  state.promo = read(PROMO_KEY, null);

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
    add(id, qty, color) {
      const p = product(id);
      if (!p) return;
      const variant = color || p.colors[0].name;
      const key = lineId(id, variant);
      const existing = state.items.find((l) => l.id === key);
      if (existing) existing.qty = Math.min(existing.qty + (qty || 1), 99);
      else
        state.items.push({
          id: key,
          productId: id,
          color: variant,
          qty: Math.min(qty || 1, 99),
          price: p.price,
          addedAt: Date.now(),
        });
      persist();
      emit('add');
    },
    setQty(key, qty) {
      const line = state.items.find((l) => l.id === key);
      if (!line) return;
      if (qty <= 0) return Store.remove(key);
      line.qty = Math.min(qty, 99);
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

    /* ------------------------------- promo ------------------------------ */

    get promo() {
      return state.promo;
    },
    applyPromo(code) {
      const clean = String(code || '').trim().toUpperCase();
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
      state.promo = read(PROMO_KEY, null);
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
})();
