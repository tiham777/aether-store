/* =========================================================================
   Arena — Firebase (Cloud Firestore) sync layer

   Best-effort bridge to Firebase, imported lazily from the gstatic CDN as
   ES modules — no build step, no npm, no server. Every call fails safe:
   when js/firebase-config.js is empty or Firebase is unreachable the site
   keeps working on local storage exactly as before, and callers just see
   { shared:false }.

   · orders live at  orders/{ORDER_ID}      (full-document writes, merge)
   · reviews live at reviews/{REVIEW_ID}
   · a write that fails while offline is queued in aether.pending.v1 and
     flushed when the tab comes back online and every 30 s after
   · start() opens one live listener over the orders collection, so admin,
     account and tracking screens refresh themselves when a status changes
     on another device

   Setup: paste your firebaseConfig into js/firebase-config.js and publish
   the rules in firestore.rules (see README).
   ========================================================================= */
(function () {
  'use strict';

  const SDK_VERSION = '12.19.0';
  const PENDING_KEY = 'aether.pending.v1';
  const MAX_QUEUE = 50;
  const FLUSH_MS = 30000;
  const INIT_TIMEOUT_MS = 9000;
  const RETRY_MS = 20000;
  const RETRY_MAX = 5;

  let api = null; /* { db, collection, doc, setDoc, getDoc, getDocs, onSnapshot } */
  let state = 'off'; /* 'off' | 'connecting' | 'live' | 'error' */
  let initPromise = null;
  let started = false;
  let flushing = false;
  let handlers = {};
  let retries = 0;
  let flushTimer = null; /* cleared by __reset */
  let retryTimer = null; /* cleared by __reset */
  let loader = null; /* test seam — Cloud.__setLoader */

  /* ------------------------------- config -------------------------------- */

  function config() {
    return window.FIREBASE_CONFIG || {};
  }

  function configured() {
    const c = config();
    return Boolean(
      c &&
        typeof c.apiKey === 'string' &&
        c.apiKey &&
        c.projectId &&
        !/YOUR_|placeholder/i.test(String(c.apiKey) + String(c.projectId))
    );
  }

  /* ------------------------------ sanitising ----------------------------- */
  /* Firestore rejects undefined, NaN, Infinity and functions on write —
     strip them on the way in so a stray field can never fail an order. */

  function clean(v) {
    if (v === null) return null;
    const t = typeof v;
    if (t === 'number') return Number.isFinite(v) ? v : 0;
    if (t === 'string' || t === 'boolean') return v;
    if (t === 'undefined' || t === 'function' || t === 'symbol' || t === 'bigint') return undefined;
    if (v instanceof Date) return v.getTime();
    if (Array.isArray(v)) return v.map((x) => clean(x)).filter((x) => x !== undefined);
    if (t === 'object') {
      const out = {};
      Object.keys(v).forEach((k) => {
        const c = clean(v[k]);
        if (c !== undefined) out[k] = c;
      });
      return out;
    }
    return undefined;
  }

  /* -------------------------------- queue -------------------------------- */

  function readQueue() {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      const q = raw ? JSON.parse(raw) : [];
      return Array.isArray(q) ? q : [];
    } catch (e) {
      return [];
    }
  }

  function writeQueue(q) {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(q));
    } catch (e) {
      /* private mode — nothing to retry from anyway */
    }
  }

  function enqueue(item) {
    const q = readQueue();
    q.push(item);
    while (q.length > MAX_QUEUE) q.shift();
    writeQueue(q);
  }

  /* -------------------------------- boot --------------------------------- */

  function defaultLoader() {
    const base = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION;
    return Promise.all([import(base + '/firebase-app.js'), import(base + '/firebase-firestore.js')]).then(
      ([app, fs]) => {
        const fb = app.initializeApp(config());
        return {
          db: fs.getFirestore(fb),
          collection: fs.collection,
          doc: fs.doc,
          setDoc: fs.setDoc,
          getDoc: fs.getDoc,
          getDocs: fs.getDocs,
          onSnapshot: fs.onSnapshot,
        };
      }
    );
  }

  /* Firebase Auth is loaded lazily on the first Google sign-in attempt —
     most visitors never need the extra module. Reuses the app the main
     loader initialised (getApp) so there is exactly one Firebase app. */
  let authPromise = null;
  function authReady() {
    if (!configured()) return Promise.resolve(null);
    if (authPromise) return authPromise;
    const base = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION;
    authPromise = Promise.all([
      import(base + '/firebase-app.js'),
      import(base + '/firebase-auth.js'),
    ])
      .then(([app, a]) => {
        const fb = app.getApps().length ? app.getApp() : app.initializeApp(config());
        return {
          getAuth: a.getAuth,
          GoogleAuthProvider: a.GoogleAuthProvider,
          signInWithPopup: a.signInWithPopup,
        };
      })
      .catch(() => null);
    return authPromise;
  }

  function ready() {
    if (!configured()) {
      state = 'off';
      return Promise.resolve(null);
    }
    if (api) return Promise.resolve(api);
    if (initPromise) return initPromise;
    state = 'connecting';
    let load;
    try {
      load = Promise.resolve((loader || defaultLoader)());
    } catch (e) {
      load = Promise.resolve(null);
    }
    load = load.catch(() => null);
    let timer = null;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), INIT_TIMEOUT_MS);
    });
    initPromise = Promise.race([load, timeout]).then((bundle) => {
      clearTimeout(timer);
      initPromise = null;
      if (bundle && bundle.db) {
        api = bundle;
        state = 'live';
        return api;
      }
      state = 'error';
      return null;
    });
    return initPromise;
  }

  /* ------------------------------- writes -------------------------------- */

  function markShared(id) {
    try {
      if (window.Orders && Orders.markShared) Orders.markShared(id);
    } catch (e) {
      /* the caller is not order-aware — nothing to mark */
    }
  }

  /* one write primitive: the whole document, merged — self-healing if an
     earlier version of the same order is still sitting in the queue */
  async function put(collection, id, payload) {
    const a = await ready();
    if (!a) return false;
    await a.setDoc(a.doc(a.db, collection, id), payload, { merge: true });
    return true;
  }

  async function pushOrder(order) {
    if (!order || !order.id || !configured()) return false;
    const payload = clean(Object.assign({}, order, { updatedAt: order.updatedAt || Date.now() }));
    try {
      const ok = await put('orders', order.id, payload);
      if (!ok) {
        enqueue({ kind: 'order', order: payload });
        return false;
      }
      markShared(order.id);
      flush();
      return true;
    } catch (e) {
      enqueue({ kind: 'order', order: payload });
      return false;
    }
  }

  async function pushReview(review) {
    if (!review || !review.id || !configured()) return false;
    const payload = clean(Object.assign({}, review, { updatedAt: review.updatedAt || review.at || Date.now() }));
    try {
      const ok = await put('reviews', review.id, payload);
      if (!ok) {
        enqueue({ kind: 'review', review: payload });
        return false;
      }
      try {
        if (window.Reviews && Reviews.markShared) Reviews.markShared(review.id);
      } catch (e) {
        /* not a review-aware caller */
      }
      flush();
      return true;
    } catch (e) {
      enqueue({ kind: 'review', review: payload });
      return false;
    }
  }

  /* retry everything the network refused — oldest first, stop on the first
     failure so ordering between writes to the same document is preserved.
     The queue is re-read from storage between writes so a push that lands
     mid-flush is never dropped. */
  async function flush() {
    if (flushing || !readQueue().length) return;
    flushing = true;
    try {
      const a = await ready();
      if (!a) return;
      for (;;) {
        const current = readQueue();
        if (!current.length) return;
        const item = current[0];
        try {
          if (item.kind === 'order' && item.order && item.order.id) {
            await a.setDoc(a.doc(a.db, 'orders', item.order.id), item.order, { merge: true });
            markShared(item.order.id);
          } else if (item.kind === 'review' && item.review && item.review.id) {
            await a.setDoc(a.doc(a.db, 'reviews', item.review.id), item.review, { merge: true });
            try {
              if (window.Reviews && Reviews.markShared) Reviews.markShared(item.review.id);
            } catch (e) {
              /* not a review-aware caller */
            }
          }
          writeQueue(readQueue().slice(1));
        } catch (e) {
          return; /* transient — the online event / interval will retry */
        }
      }
    } finally {
      flushing = false;
    }
  }

  /* -------------------------------- reads -------------------------------- */

  async function pullOrders() {
    const a = await ready();
    if (!a) return null;
    try {
      const snap = await a.getDocs(a.collection(a.db, 'orders'));
      return snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
    } catch (e) {
      return null;
    }
  }

  async function getOrder(id) {
    const a = await ready();
    if (!a || !id) return null;
    try {
      const snap = await a.getDoc(a.doc(a.db, 'orders', String(id)));
      if (!snap || typeof snap.exists !== 'function' || !snap.exists()) return null;
      return Object.assign({ id: snap.id }, snap.data());
    } catch (e) {
      return null;
    }
  }

  async function pullReviews(productId) {
    const a = await ready();
    if (!a) return null;
    try {
      const snap = await a.getDocs(a.collection(a.db, 'reviews'));
      const all = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      return productId ? all.filter((r) => r.productId === productId) : all;
    } catch (e) {
      return null;
    }
  }

  /* ------------------------------ watchers ------------------------------- */
  /* Both return an unsubscribe function immediately; the listener itself is
     attached once Firebase answers, so callers never have to await. */

  function call(fn, arg) {
    try {
      fn(arg);
    } catch (e) {
      console.warn('[arena] cloud handler failed:', e);
    }
  }

  function watchOrders(cb) {
    let unsub = null;
    let dead = false;
    ready().then((a) => {
      if (!a || dead) return;
      try {
        unsub = a.onSnapshot(
          a.collection(a.db, 'orders'),
          (snap) => {
            if (dead || !snap || !snap.docs) return;
            call(cb, snap.docs.map((d) => Object.assign({ id: d.id }, d.data())));
          },
          () => {
            state = 'error';
          }
        );
      } catch (e) {
        state = 'error';
      }
    });
    return () => {
      dead = true;
      if (unsub) {
        try {
          unsub();
        } catch (e) {
          /* already gone */
        }
      }
    };
  }

  function watchOrder(id, cb) {
    let unsub = null;
    let dead = false;
    ready().then((a) => {
      if (!a || !id || dead) return;
      try {
        unsub = a.onSnapshot(
          a.doc(a.db, 'orders', String(id)),
          (snap) => {
            if (dead || !snap) return;
            call(cb, snap.exists ? Object.assign({ id: snap.id }, snap.data()) : null);
          },
          () => {
            state = 'error';
          }
        );
      } catch (e) {
        state = 'error';
      }
    });
    return () => {
      dead = true;
      if (unsub) {
        try {
          unsub();
        } catch (e) {
          /* already gone */
        }
      }
    };
  }

  /* -------------------------------- start -------------------------------- */

  function start(h) {
    if (h) handlers = h;
    if (!configured()) {
      state = 'off';
      return Promise.resolve('off');
    }
    if (started) return Promise.resolve(state);
    started = true;

    window.addEventListener('online', flush);
    if (!flushTimer) flushTimer = setInterval(flush, FLUSH_MS);
    flush();

    return ready().then((a) => {
      if (!a) {
        started = false; /* allow a later start() to try again */
      if (retries < RETRY_MAX) {
        retries++;
        retryTimer = setTimeout(() => start(), RETRY_MS);
      }
        return 'error';
      }
      watchOrders((list) => {
        if (handlers.onOrders) call(handlers.onOrders, list);
      });
      return 'live';
    });
  }

  window.Cloud = {
    get configured() {
      return configured();
    },
    state: () => state,
    ready,
    start,
    pushOrder,
    pushReview,
    pullOrders,
    pullReviews,
    getOrder,
    watchOrder,
    watchOrders,
    flush,
    pending: () => readQueue().length,
    /* Google sign-in — resolves a plain profile the caller converts into
       a local account via Auth.completeGoogleSignIn. */
    async googleSignIn() {
      const bundle = await authReady();
      if (!bundle) return { ok: false, error: 'cloud-off' };
      try {
        const auth = bundle.getAuth();
        const provider = new bundle.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cred = await bundle.signInWithPopup(auth, provider);
        const email = String(cred.user.email || '').toLowerCase();
        if (!email) return { ok: false, error: 'no-email' };
        return {
          ok: true,
          name: String(cred.user.displayName || email.split('@')[0]).slice(0, 60),
          email,
          photoURL: typeof cred.user.photoURL === 'string' ? cred.user.photoURL.slice(0, 400) : '',
        };
      } catch (e) {
        const code = (e && String(e.code || '').replace('auth/', '')) || '';
        if (code === 'popup-closed-by-user' || code === 'cancelled-popup-request') {
          return { ok: false, error: 'cancelled', silent: true };
        }
        if (code === 'popup-blocked') return { ok: false, error: 'popup-blocked' };
        if (code === 'unauthorized-domain') return { ok: false, error: 'unauthorized-domain' };
        if (code === 'operation-not-allowed') return { ok: false, error: 'provider-disabled' };
        if (code === 'configuration-not-found') return { ok: false, error: 'provider-disabled' };
        /* unknown code — surface it in the console so the store owner can
           diagnose setup problems (unauthorized domains, API keys, …) */
        if (window.console && console.warn) console.warn('[arena] Google sign-in failed:', code || e);
        return { ok: false, error: 'google-failed' };
      }
    },
    /* test seams — no production caller touches these */
    __setLoader(fn) {
      loader = fn;
    },
    __reset() {
      api = null;
      state = 'off';
      initPromise = null;
      authPromise = null;
      started = false;
      flushing = false;
      handlers = {};
      retries = 0;
      if (flushTimer) clearInterval(flushTimer);
      flushTimer = null;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      loader = null;
    },
    __clean: clean,
  };
})();
