/* =========================================================================
   Arena — shared-store API tests

   Exercises the real Vercel handlers with mock req/res and a stubbed
   Upstash fetch, plus the local Reviews module from js/store.js.
   ========================================================================= */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ordersHandler = (await import(pathToFileURL(path.join(root, 'api/orders.js')).href)).default;
const reviewsHandler = (await import(pathToFileURL(path.join(root, 'api/reviews.js')).href)).default;

function mockRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
}

const realFetch = globalThis.fetch;
function stubUpstash(result) {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ result }),
  });
}

async function withEnv(vars, fn) {
  const saved = {};
  Object.entries(vars).forEach(([k, v]) => {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  });
  try {
    return await fn();
  } finally {
    Object.entries(saved).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    });
  }
}

const ON = { UPSTASH_REDIS_REST_URL: 'https://fake.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'tok' };
const OFF = { UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined };

const goodOrder = {
  id: 'AET-2026-654321',
  email: 'buyer@example.com',
  name: 'Buyer One',
  placedAt: Date.now(),
  total: 10584,
  items: [{ productId: 'halo-one', qty: 1, price: 34900 }],
};

const goodReview = {
  id: 'rv_test1',
  productId: 'halo-one',
  name: 'Casper N',
  rating: 5,
  text: 'Still the best object I own after three months.',
  orderId: 'AET-2026-654321',
  orderTotal: 10584,
};

/* A tiny in-memory Upstash: keyed lists across commands so the review
   handler can read the real order ledger while posting. */
function redisStub(seed) {
  const db = new Map();
  Object.entries(seed || {}).forEach(([k, v]) => db.set(k, v));
  globalThis.fetch = async (url, opts) => {
    const [cmd, key, ...rest] = JSON.parse(opts.body);
    const list = db.get(key) || [];
    if (cmd === 'LRANGE') return { ok: true, status: 200, json: async () => ({ result: list.slice() }) };
    if (cmd === 'LPUSH') {
      list.unshift(rest[0]);
      db.set(key, list);
      return { ok: true, status: 200, json: async () => ({ result: list.length }) };
    }
    if (cmd === 'LTRIM') return { ok: true, status: 200, json: async () => ({ result: 'OK' }) };
    return { ok: true, status: 200, json: async () => ({ result: null }) };
  };
  return db;
}

describe('api/orders', () => {
  beforeEach(() => {
    stubUpstash([]);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test('503 when the store is not configured', async () => {
    await withEnv(OFF, async () => {
      const res = mockRes();
      await ordersHandler({ method: 'GET', headers: {} }, res);
      assert.equal(res.statusCode, 503);
      assert.equal(res.body.error, 'not-configured');
    });
  });

  test('405 for unsupported methods', async () => {
    await withEnv(ON, async () => {
      const res = mockRes();
      await ordersHandler({ method: 'DELETE', headers: {} }, res);
      assert.equal(res.statusCode, 405);
    });
  });

  test('POST validates the order before touching the store', async () => {
    await withEnv(ON, async () => {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return { ok: true, status: 200, json: async () => ({ result: 1 }) };
      };
      const bad = mockRes();
      await ordersHandler({ method: 'POST', body: { id: 'x' } }, bad);
      assert.equal(bad.statusCode, 400);
      assert.equal(calls, 0, 'invalid orders never reach the store');

      const ok = mockRes();
      await ordersHandler({ method: 'POST', body: goodOrder }, ok);
      assert.equal(ok.statusCode, 201);
      assert.equal(ok.body.shared, true);
      assert.equal(calls, 2, 'LPUSH + LTRIM');
    });
  });

  test('GET returns parsed orders, honoring the admin key when set', async () => {
    await withEnv(ON, async () => {
      stubUpstash([JSON.stringify(goodOrder)]);
      const res = mockRes();
      await ordersHandler({ method: 'GET', headers: {} }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.orders.length, 1);
      assert.equal(res.body.orders[0].id, 'AET-2026-654321');
    });
    await withEnv({ ...ON, AETHER_ADMIN_KEY: 'sesame' }, async () => {
      stubUpstash([]);
      const denied = mockRes();
      await ordersHandler({ method: 'GET', headers: {} }, denied);
      assert.equal(denied.statusCode, 401);
      const allowed = mockRes();
      await ordersHandler({ method: 'GET', headers: { 'x-aether-key': 'sesame' } }, allowed);
      assert.equal(allowed.statusCode, 200);
    });
  });
});

describe('api/reviews', () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test('POST rejects malformed reviews before touching the store', async () => {
    await withEnv(ON, async () => {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return { ok: true, status: 200, json: async () => ({ result: 1 }) };
      };
      const res = mockRes();
      await reviewsHandler({ method: 'POST', body: { ...goodReview, rating: 9 } }, res);
      assert.equal(res.statusCode, 400);
      const short = mockRes();
      await reviewsHandler({ method: 'POST', body: { ...goodReview, text: 'too short' } }, short);
      assert.equal(short.statusCode, 400);
      assert.equal(calls, 0, 'malformed reviews never reach the store');
    });
  });

  test('POST rejects reviews without ownership proof', async () => {
    await withEnv(ON, async () => {
      redisStub({ 'aether:orders': [JSON.stringify(goodOrder)] });
      const noProof = mockRes();
      await reviewsHandler({ method: 'POST', body: { ...goodReview, orderId: undefined, orderTotal: undefined } }, noProof);
      assert.equal(noProof.statusCode, 403);
      assert.equal(noProof.body.error, 'not-verified');

      const unknownOrder = mockRes();
      await reviewsHandler({ method: 'POST', body: { ...goodReview, orderId: 'AET-2026-000000' } }, unknownOrder);
      assert.equal(unknownOrder.statusCode, 403);

      const wrongTotal = mockRes();
      await reviewsHandler({ method: 'POST', body: { ...goodReview, orderTotal: 10585 } }, wrongTotal);
      assert.equal(wrongTotal.statusCode, 403, 'total must match to the cent');

      const otherProduct = mockRes();
      await reviewsHandler({ method: 'POST', body: { ...goodReview, productId: 'slate65' } }, otherProduct);
      assert.equal(otherProduct.statusCode, 403, 'the proven order must contain the product');
    });
  });

  test('POST accepts a verified purchase, stores it, and GET returns a public shape', async () => {
    await withEnv(ON, async () => {
      const db = redisStub({ 'aether:orders': [JSON.stringify(goodOrder)] });
      const ok = mockRes();
      await reviewsHandler({ method: 'POST', body: goodReview }, ok);
      assert.equal(ok.statusCode, 201);
      assert.equal(ok.body.shared, true);

      const stored = JSON.parse(db.get('aether:reviews')[0]);
      assert.equal(stored.verified, true, 'the server decides verification');
      assert.ok(stored.orderId, 'proof is kept server-side for dedupe');

      const got = mockRes();
      await reviewsHandler({ method: 'GET', query: {} }, got);
      assert.equal(got.body.reviews.length, 1);
      assert.equal(got.body.reviews[0].orderId, undefined, 'proof never leaves the server');
      assert.equal(got.body.reviews[0].orderTotal, undefined);
      assert.equal(got.body.reviews[0].verified, true);

      const filtered = mockRes();
      await reviewsHandler({ method: 'GET', query: { productId: 'slate65' } }, filtered);
      assert.equal(filtered.body.reviews.length, 0);
    });
  });

  test('one review per order — duplicates are rejected', async () => {
    await withEnv(ON, async () => {
      redisStub({
        'aether:orders': [JSON.stringify(goodOrder)],
        'aether:reviews': [JSON.stringify({ ...goodReview, id: 'rv_first', verified: true })],
      });
      const dup = mockRes();
      await reviewsHandler({ method: 'POST', body: { ...goodReview, id: 'rv_second' } }, dup);
      assert.equal(dup.statusCode, 409);
      assert.equal(dup.body.error, 'already-reviewed');
    });
  });

  test('a retried order submission does not lock the buyer out', async () => {
    await withEnv(ON, async () => {
      redisStub({ 'aether:orders': [JSON.stringify(goodOrder), JSON.stringify(goodOrder)] });
      const ok = mockRes();
      await reviewsHandler({ method: 'POST', body: goodReview }, ok);
      assert.equal(ok.statusCode, 201, 'duplicate ledger rows collapse to one order');
    });
  });
});

describe('Reviews module (local store)', () => {
  function boot() {
    const storage = new Map();
    const localStorage = {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
      clear: () => storage.clear(),
    };
    const sandbox = { console, localStorage, window: null, Math, Date, JSON };
    sandbox.window = sandbox;
    createContext(sandbox);
    runInContext(readFileSync(path.join(root, 'js/store.js'), 'utf8'), sandbox, { filename: 'js/store.js' });
    return { sandbox, storage };
  }

  test('adds, lists per product, removes and merges cloud reviews without duplicates', () => {
    const { sandbox } = boot();
    const a = sandbox.Reviews.add({ productId: 'halo-one', name: 'Ada L', rating: 5, text: 'Superb build quality, day one.' });
    sandbox.Reviews.add({ productId: 'slate65', name: 'Bo B', rating: 4, text: 'Types like a dream so far.' });
    assert.equal(sandbox.Reviews.all().length, 2);
    assert.equal(sandbox.Reviews.forProduct('halo-one').length, 1);
    assert.ok(a.id && a.at, 'local ids and timestamps are assigned');

    const added = sandbox.Reviews.mergeCloud([
      { id: a.id, productId: 'halo-one', name: 'Ada L', rating: 5, text: 'Superb build quality, day one.' },
      { id: 'rv_cloud', productId: 'halo-one', name: 'Cy C', rating: 5, text: 'Arrived a day early, flawless.', verified: true, orderId: 'AET-2026-111111', orderTotal: 42900 },
    ]);
    assert.equal(added, 1, 'only the unseen cloud review is added');
    assert.equal(sandbox.Reviews.forProduct('halo-one').length, 2);

    const merged = sandbox.Reviews.forProduct('halo-one').find((r) => r.id === 'rv_cloud');
    assert.equal(merged.verified, true, 'cloud verification survives the sanitiser');
    assert.equal(merged.orderId, 'AET-2026-111111', 'proof metadata survives round-trips');

    sandbox.Reviews.remove('rv_cloud');
    assert.equal(sandbox.Reviews.forProduct('halo-one').length, 1, 'remove() drops a rejected review');
    sandbox.Reviews.remove('rv_missing');
    assert.equal(sandbox.Reviews.all().length, 2, 'removing an unknown id is a no-op (one per product remains)');
  });
});
