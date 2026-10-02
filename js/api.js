/* =========================================================================
   AETHER — shared-store client

   Best-effort bridge to the serverless API (api/*.js). Every call fails
   safe: when the backend is absent or unconfigured the site keeps working
   on local storage exactly as before, and callers just see { shared:false }.
   ========================================================================= */
(function () {
  'use strict';

  const TIMEOUT = 4500;
  let probeCache = null;

  async function call(path, opts) {
    opts = opts || {};
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT) : null;
    try {
      const res = await fetch(path, {
        method: opts.method || 'GET',
        headers: Object.assign({ Accept: 'application/json' }, opts.headers || {}),
        body: opts.body,
        signal: ctrl ? ctrl.signal : undefined,
      });
      const data = await res.json().catch(() => null);
      return { ok: res.ok && data && data.ok !== false, status: res.status, data: data || null };
    } catch (e) {
      return { ok: false, status: 0, data: null };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function post(path, payload, headers) {
    return call(path, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
      body: JSON.stringify(payload),
    });
  }

  window.API = {
    /* 'live' | 'locked' | 'off' — cached after the first probe */
    async probe(force) {
      if (probeCache && !force) return probeCache;
      const r = await call('/api/orders');
      probeCache = r.ok ? 'live' : r.status === 401 ? 'locked' : r.status === 503 ? 'unconfigured' : 'off';
      return probeCache;
    },
    async placeOrder(order) {
      const r = await post('/api/orders', order);
      return { shared: r.ok };
    },
    async pullOrders(key) {
      const r = await call('/api/orders', key ? { headers: { 'x-aether-key': key } } : {});
      return r.ok && r.data && Array.isArray(r.data.orders) ? r.data.orders : null;
    },
    async pullReviews(productId) {
      const path = productId ? '/api/reviews?productId=' + encodeURIComponent(productId) : '/api/reviews';
      const r = await call(path);
      return r.ok && r.data && Array.isArray(r.data.reviews) ? r.data.reviews : null;
    },
    async pushReview(review) {
      const r = await post('/api/reviews', review);
      return { shared: r.ok };
    },
  };
})();
