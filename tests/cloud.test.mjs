/* =========================================================================
   AETHER — Firebase cloud-layer tests

   Boots the real js/data.js, js/store.js, js/auth.js, js/firebase-config.js
   and js/cloud.js in a vm with a mocked localStorage and an in-memory
   Firestore stub injected through Cloud.__setLoader, so the shipped sync
   code — sanitising, offline queueing, flushing, live listeners and merge
   reconciliation — is exercised without touching the network.
   ========================================================================= */
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = ['js/data.js', 'js/store.js', 'js/auth.js', 'js/firebase-config.js', 'js/cloud.js'].map((p) => ({
  filename: p,
  code: readFileSync(path.join(root, p), 'utf8'),
}));

/* ------------------------- in-memory Firestore -------------------------- */

function makeFirestore() {
  const docs = new Map(); /* 'orders/AET-…' -> payload */
  const listeners = new Set();

  const fire = (l) => {
    if (l.target.kind === 'col') {
      const prefix = l.target.name + '/';
      const list = [...docs.keys()]
        .filter((k) => k.startsWith(prefix))
        .map((k) => ({ id: k.slice(prefix.length), data: () => docs.get(k) }));
      l.cb({ docs: list });
    } else {
      const key = `${l.target.coll}/${l.target.id}`;
      const has = docs.has(key);
      l.cb({ id: l.target.id, exists: () => has, data: () => docs.get(key) });
    }
  };

  const api = {
    db: { stub: true },
    collection: (db, name) => ({ kind: 'col', name }),
    doc: (db, coll, id) => ({ kind: 'doc', coll, id }),
    async setDoc(ref, data) {
      docs.set(`${ref.coll}/${ref.id}`, data);
      listeners.forEach((l) => {
        const isCol = l.target.kind === 'col' && l.target.name === ref.coll;
        const isDoc = l.target.kind === 'doc' && l.target.coll === ref.coll && l.target.id === ref.id;
        if (isCol || isDoc) fire(l);
      });
    },
    async getDoc(ref) {
      const key = `${ref.coll}/${ref.id}`;
      return { id: ref.id, exists: () => docs.has(key), data: () => docs.get(key) };
    },
    async getDocs(col) {
      const prefix = `${col.name}/`;
      return {
        docs: [...docs.keys()]
          .filter((k) => k.startsWith(prefix))
          .map((k) => ({ id: k.slice(prefix.length), data: () => docs.get(k) })),
      };
    },
    onSnapshot(target, cb) {
      const l = { target, cb };
      listeners.add(l);
      queueMicrotask(() => fire(l)); /* the real SDK fires an initial snapshot */
      return () => listeners.delete(l);
    },
  };

  return { api, docs, emit: (name) => listeners.forEach((l) => l.target.name === name && fire(l)) };
}

const WORKING = () => makeFirestore().api;
const BROKEN = () => Promise.reject(new Error('network down'));

/* every context is torn down after each test, so the live flush interval
   and retry timers can never keep the runner alive */
const booted = [];
afterEach(() => {
  while (booted.length) {
    const c = booted.pop();
    try {
      c.Cloud.__reset();
    } catch (e) {
      /* context already gone */
    }
  }
});

/* ------------------------------- boot ----------------------------------- */

function boot(backing, { config, loader } = {}) {
  const storage = backing || new Map();
  const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear(),
  };
  const sandbox = {
    console,
    localStorage,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    document: {
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener() {},
      head: { appendChild() {} },
      documentElement: { setAttribute() {} },
      body: { classList: { toggle() {}, add() {}, remove() {} } },
      title: '',
    },
    location: { hash: '#/', search: '', reload() {} },
    addEventListener() {},
    removeEventListener() {},
    navigator: { userAgent: 'node-test' },
  };
  sandbox.window = sandbox;
  createContext(sandbox);
  for (const s of SOURCES) runInContext(s.code, sandbox, { filename: s.filename });

  if (config) Object.assign(sandbox.FIREBASE_CONFIG, config);
  if (loader) sandbox.Cloud.__setLoader(loader);
  booted.push(sandbox);
  return sandbox;
}

const LIVE_CONFIG = { apiKey: 'AIzaSyTestKey123', projectId: 'aether-demo', appId: '1:123:web:abc' };

function sampleOrder(id, at) {
  const now = at || Date.now();
  return {
    id: id || 'AET-2026-555001',
    email: 'buyer@example.com',
    name: 'Buyer One',
    phone: '',
    address: 'Strandgade 14',
    zip: '1401',
    city: 'Copenhagen',
    country: 'Denmark',
    method: 'standard',
    payment: 'card',
    items: [{ id: 'halo-one', productId: 'halo-one', name: 'Halo One', color: 'Graphite', qty: 1, price: 34900 }],
    subtotal: 34900,
    discount: 0,
    promo: null,
    shipping: 0,
    tax: 2792,
    total: 37692,
    placedAt: now,
    updatedAt: now,
    status: 'paid',
    history: [{ status: 'paid', at: now }],
  };
}

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const PENDING = 'aether.pending.v1';

/* --------------------------------- tests --------------------------------- */

describe('cloud config gate', () => {
  test('empty config keeps the store local-only — no writes, no queue', async () => {
    const c = boot(null, { loader: WORKING });
    assert.equal(c.Cloud.configured, false);
    assert.equal(c.Cloud.state(), 'off');
    assert.equal(await c.Cloud.pushOrder(sampleOrder()), false);
    assert.equal(c.Cloud.pending(), 0);
    assert.equal(c.localStorage.getItem(PENDING), null);
    c.Cloud.__reset();
  });

  test('placeholder config (YOUR_API_KEY) is treated as unconfigured', () => {
    const c = boot(null, { config: { apiKey: 'YOUR_API_KEY', projectId: 'YOUR_PROJECT_ID' } });
    assert.equal(c.Cloud.configured, false);
    c.Cloud.__reset();
  });
});

describe('order writes', () => {
  test('Orders.place pushes the whole order to Firestore and marks it shared', async () => {
    const store = makeFirestore();
    const c = boot(null, { config: LIVE_CONFIG, loader: () => store.api });
    const order = sampleOrder();
    order.stray = undefined; /* must never reach Firestore */

    const saved = c.Orders.place(order);
    await c.Cloud.ready();
    await tick();

    assert.equal(c.Cloud.state(), 'live');
    assert.ok(saved.updatedAt, 'orders carry an updatedAt for reconciliation');
    const doc = store.docs.get(`orders/${order.id}`);
    assert.ok(doc, 'the order document reached Firestore');
    assert.equal(doc.status, 'paid');
    assert.equal(c.Orders.byId(order.id).shared, true, 'local copy flagged as shared');
    c.Cloud.__reset();
  });

  test('payloads are sanitised: undefined dropped, non-finite numbers replaced', async () => {
    const c = boot(null, { config: LIVE_CONFIG, loader: WORKING });
    const store = makeFirestore();
    c.Cloud.__setLoader(() => store.api);

    const order = sampleOrder();
    order.stray = undefined;
    order.bad = NaN;
    c.Orders.place(order);
    await c.Cloud.ready();
    await c.Cloud.pushOrder(order);
    await tick();

    const doc = store.docs.get(`orders/${order.id}`);
    assert.ok(doc, 'document written under its order id');
    assert.equal('stray' in doc, false, 'undefined fields are stripped');
    assert.equal(doc.bad, 0, 'NaN becomes 0 so Firestore accepts the write');
    assert.equal(doc.status, 'paid');
    assert.ok(doc.updatedAt >= doc.placedAt);
    assert.equal(c.Orders.byId(order.id).shared, true, 'local copy flagged as shared');
    c.Cloud.__reset();
  });

  test('a failed write is queued and delivered after recovery (survives a reload)', async () => {
    const storage = new Map();
    const offline = boot(storage, { config: LIVE_CONFIG, loader: BROKEN });
    const order = sampleOrder('AET-2026-777001');

    offline.Orders.place(order); /* local write + best-effort cloud push */
    await offline.Cloud.ready(); /* resolves null — the loader is down */
    await tick();
    assert.equal(offline.Cloud.pending(), 1, 'write queued while Firebase is unreachable');
    offline.Cloud.__reset();

    /* "reload": fresh context over the same storage, Firebase reachable again */
    const store = makeFirestore();
    const online = boot(storage, { config: LIVE_CONFIG, loader: () => store.api });
    assert.equal(online.Cloud.pending(), 1, 'the queue persisted across the reload');
    await online.Cloud.flush();
    await tick();

    assert.equal(online.Cloud.pending(), 0, 'queue drained');
    assert.ok(store.docs.has(`orders/${order.id}`), 'queued order reached Firestore');
    assert.equal(online.Orders.byId(order.id).shared, true);
    online.Cloud.__reset();
  });

  test('flush stops at the first failure instead of dropping the queue', async () => {
    const store = makeFirestore();
    let failures = 1; /* the first flush attempt is rejected */
    const flaky = {
      api: Object.assign({}, store.api, {
        setDoc: async (ref, data) => {
          if (failures-- > 0) throw new Error('write denied');
          return store.api.setDoc(ref, data);
        },
      }),
    };
    /* offline first: the order is queued */
    const c = boot(null, { config: LIVE_CONFIG, loader: BROKEN });
    assert.equal(await c.Cloud.pushOrder(sampleOrder('AET-2026-777002')), false);
    assert.equal(c.Cloud.pending(), 1, 'write queued while Firebase is unreachable');

    /* back online, but the first retry is refused */
    c.Cloud.__setLoader(() => flaky.api);
    await c.Cloud.flush();
    assert.equal(c.Cloud.pending(), 1, 'failed item stays at the head');
    assert.equal(store.docs.has('orders/AET-2026-777002'), false);

    await c.Cloud.flush();
    assert.equal(c.Cloud.pending(), 0, 'next retry succeeds');
    assert.ok(store.docs.has('orders/AET-2026-777002'));
    c.Cloud.__reset();
  });
});

describe('live listeners', () => {
  test('start() opens a listener and streams orders to the app handler', async () => {
    const store = makeFirestore();
    const c = boot(null, { config: LIVE_CONFIG, loader: () => store.api });
    const seen = [];
    await c.Cloud.start({ onOrders: (list) => seen.push(list) });
    await tick();

    await store.api.setDoc({ kind: 'doc', coll: 'orders', id: 'AET-2026-111' }, sampleOrder('AET-2026-111'));
    await tick();

    assert.ok(seen.length >= 1, 'handler received the snapshot stream');
    const last = seen[seen.length - 1];
    assert.equal(last.length, 1);
    assert.equal(last[0].id, 'AET-2026-111');
    c.Cloud.__reset();
  });

  test('watchOrder reports one document and unsubscribes cleanly', async () => {
    const store = makeFirestore();
    await store.api.setDoc({ kind: 'doc', coll: 'orders', id: 'AET-2026-222' }, sampleOrder('AET-2026-222'));
    const c = boot(null, { config: LIVE_CONFIG, loader: () => store.api });

    const got = [];
    const stop = c.Cloud.watchOrder('AET-2026-222', (o) => got.push(o));
    await tick();
    assert.equal(got.length, 1, 'initial snapshot delivered');
    assert.equal(got[0].id, 'AET-2026-222');

    stop();
    await store.api.setDoc({ kind: 'doc', coll: 'orders', id: 'AET-2026-222' }, sampleOrder('AET-2026-222'));
    await tick();
    assert.equal(got.length, 1, 'no callbacks after unsubscribe');
    c.Cloud.__reset();
  });

  test('pullOrders and getOrder return cloud copies; misses are null', async () => {
    const store = makeFirestore();
    await store.api.setDoc({ kind: 'doc', coll: 'orders', id: 'AET-2026-333' }, sampleOrder('AET-2026-333'));
    const c = boot(null, { config: LIVE_CONFIG, loader: () => store.api });

    const list = await c.Cloud.pullOrders();
    assert.equal(list.length, 1);
    assert.equal((await c.Cloud.getOrder('AET-2026-333')).email, 'buyer@example.com');
    assert.equal(await c.Cloud.getOrder('AET-2026-000'), null);
    c.Cloud.__reset();
  });
});

describe('merge reconciliation', () => {
  test('newer cloud status wins, stale copies never clobber local state', () => {
    const c = boot(); /* no Firebase — reconciliation alone */
    const base = sampleOrder('AET-2026-444001');
    c.Orders.place(base);
    const t0 = c.Orders.byId(base.id).updatedAt;

    /* identical echo — no change, no re-render churn */
    assert.equal(c.Orders.mergeCloud([{ ...base }]), 0);

    /* a newer status from another device is adopted */
    const newer = {
      ...base,
      status: 'shipped',
      history: [...base.history, { status: 'shipped', at: t0 + 500 }],
      updatedAt: t0 + 500,
    };
    assert.equal(c.Orders.mergeCloud([newer]), 1);
    assert.equal(c.Orders.byId(base.id).status, 'shipped');

    /* the same snapshot again is still a no-op */
    assert.equal(c.Orders.mergeCloud([{ ...newer }]), 0);

    /* a stale copy (older updatedAt) with a different status is ignored */
    const stale = { ...base, status: 'cancelled', updatedAt: t0 - 5000 };
    assert.equal(c.Orders.mergeCloud([stale]), 0);
    assert.equal(c.Orders.byId(base.id).status, 'shipped', 'local remains ahead of the stale cloud copy');
  });

  test('orders placed on another device are added with their history intact', () => {
    const c = boot();
    const foreign = sampleOrder('AET-2026-444002');
    assert.equal(c.Orders.mergeCloud([foreign]), 1);
    const got = c.Orders.byId('AET-2026-444002');
    assert.equal(got.shared, true);
    assert.equal(got.history.length, 1);
    assert.equal(c.Orders.mergeCloud([foreign]), 0, 'second pull is a no-op');
  });
});
