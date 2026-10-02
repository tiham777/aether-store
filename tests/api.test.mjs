/* =========================================================================
   AETHER — shared-store API tests

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
};

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
  beforeEach(() => {
    stubUpstash([]);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test('POST rejects malformed reviews', async () => {
    await withEnv(ON, async () => {
      const res = mockRes();
      await reviewsHandler({ method: 'POST', body: { ...goodReview, rating: 9 } }, res);
      assert.equal(res.statusCode, 400);
      const short = mockRes();
      await reviewsHandler({ method: 'POST', body: { ...goodReview, text: 'too short' } }, short);
      assert.equal(short.statusCode, 400);
    });
  });

  test('POST stores a valid review; GET filters by product', async () => {
    await withEnv(ON, async () => {
      const ok = mockRes();
      await reviewsHandler({ method: 'POST', body: goodReview }, ok);
      assert.equal(ok.statusCode, 201);

      stubUpstash([JSON.stringify(goodReview), JSON.stringify({ ...goodReview, id: 'rv_o', productId: 'slate65' })]);
      const all = mockRes();
      await reviewsHandler({ method: 'GET', query: {} }, all);
      assert.equal(all.body.reviews.length, 2);
      const filtered = mockRes();
      await reviewsHandler({ method: 'GET', query: { productId: 'halo-one' } }, filtered);
      assert.equal(filtered.body.reviews.length, 1);
      assert.equal(filtered.body.reviews[0].id, 'rv_test1');
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

  test('adds, lists per product and merges cloud reviews without duplicates', () => {
    const { sandbox } = boot();
    const a = sandbox.Reviews.add({ productId: 'halo-one', name: 'Ada L', rating: 5, text: 'Superb build quality, day one.' });
    sandbox.Reviews.add({ productId: 'slate65', name: 'Bo B', rating: 4, text: 'Types like a dream so far.' });
    assert.equal(sandbox.Reviews.all().length, 2);
    assert.equal(sandbox.Reviews.forProduct('halo-one').length, 1);
    assert.ok(a.id && a.at, 'local ids and timestamps are assigned');

    const added = sandbox.Reviews.mergeCloud([
      { id: a.id, productId: 'halo-one', name: 'Ada L', rating: 5, text: 'Superb build quality, day one.' },
      { id: 'rv_cloud', productId: 'halo-one', name: 'Cy C', rating: 5, text: 'Arrived a day early, flawless.' },
    ]);
    assert.equal(added, 1, 'only the unseen cloud review is added');
    assert.equal(sandbox.Reviews.forProduct('halo-one').length, 2);
  });
});
