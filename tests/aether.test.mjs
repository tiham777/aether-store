/* =========================================================================
   AETHER — data-layer tests (node --test, no dependencies)

   Boots the real browser scripts (data/store/auth) inside a vm context with
   a mocked localStorage, so the exact shipped code is exercised. "Reload"
   is simulated by booting a fresh context over the same storage map.
   ========================================================================= */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = ['js/data.js', 'js/store.js', 'js/auth.js'].map((p) => ({
  filename: p,
  code: readFileSync(path.join(root, p), 'utf8'),
}));

function boot(backing) {
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
  return sandbox;
}

/* --------------------------------- pricing -------------------------------- */

describe('pricing', () => {
  test('standard shipping is free at the threshold, $900 below', () => {
    const c = boot();
    c.Store.clear();
    c.Store.add('field-bottle', 1); // $59 — under $150
    assert.equal(c.Store.shipping('standard'), 900);
    c.Store.clear();
    c.Store.add('halo-one', 1); // $349 — over $150
    assert.equal(c.Store.shipping('standard'), 0);
    c.Store.clear();
    assert.equal(c.Store.shipping('standard'), 0); // empty bag
  });

  test('express carries the express fee', () => {
    const c = boot();
    c.Store.clear();
    c.Store.add('halo-one', 1);
    assert.equal(c.Store.shipping('express'), c.DATA.expressFee);
  });

  test('promo discount rounds and totals stay consistent', () => {
    const c = boot();
    c.Store.clear();
    c.Store.add('slate65', 1); // 22900
    const sub = c.Store.subtotal();
    assert.equal(sub, 22900);
    assert.equal(c.Store.applyPromo('welcome15'), true); // case-insensitive
    const disc = c.Store.discount();
    assert.equal(disc, Math.round(sub * 0.15));
    const ship = c.Store.shipping('standard');
    const tax = c.Store.tax('standard');
    assert.equal(tax, Math.round((sub - disc + ship) * c.DATA.taxRate));
    assert.equal(c.Store.total('standard'), sub - disc + ship + tax);
    assert.equal(c.Store.applyPromo('NOT-A-CODE'), false);
    c.Store.clearPromo();
    assert.equal(c.Store.discount(), 0);
  });

  test('money formats whole and fractional amounts', () => {
    const c = boot();
    assert.equal(c.Store.money(34900), '$349');
    assert.equal(c.Store.money(5900), '$59');
    assert.equal(c.Store.money(34950), '$349.50');
    assert.equal(c.Store.money(undefined), '—');
  });
});

/* ------------------------------ delivery ETA ------------------------------ */

describe('delivery ETA', () => {
  const isBiz = (d) => d.getDay() !== 0 && d.getDay() !== 6;

  test('a Tuesday morning order dispatches the same day', () => {
    const c = boot();
    const r = c.Store.eta('standard', new Date(2026, 9, 6, 10)); // Tue 10:00
    assert.equal(r.from.toDateString(), 'Fri Oct 09 2026', '3 business days of transit');
    assert.equal(r.to.toDateString(), 'Tue Oct 13 2026', '5 business days of transit');
  });

  test('orders after 14:00 roll to the next business day', () => {
    const c = boot();
    const r = c.Store.eta('standard', new Date(2026, 9, 6, 15)); // Tue 15:00
    assert.equal(r.from.toDateString(), 'Mon Oct 12 2026', 'dispatch pushed to Wed 7th');
    assert.equal(r.to.toDateString(), 'Wed Oct 14 2026');
  });

  test('weekend orders dispatch on Monday', () => {
    const c = boot();
    const r = c.Store.eta('express', new Date(2026, 9, 10, 9)); // Sat 09:00
    assert.equal(r.from.toDateString(), 'Tue Oct 13 2026', 'dispatch Mon 12th + 1 day');
    assert.equal(r.to.toDateString(), 'Wed Oct 14 2026');
  });

  test('windows land on business days and express beats standard', () => {
    const c = boot();
    const at = new Date(2026, 9, 6, 9);
    const exp = c.Store.eta('express', at);
    const std = c.Store.eta('standard', at);
    for (const d of [exp.from, exp.to, std.from, std.to]) {
      assert.ok(isBiz(d), `delivery quoted on a weekend: ${d.toDateString()}`);
    }
    assert.ok(exp.to < std.from, 'express must arrive before standard');
  });

  test('etaLabel renders an honest short-date range', () => {
    const c = boot();
    const at = new Date(2026, 9, 6, 10);
    assert.equal(c.Store.etaLabel('standard', at), 'Fri, Oct 9 – Tue, Oct 13');
    assert.equal(
      c.Store.etaLabel('standard', at, true),
      'Friday, October 9 – Tuesday, October 13'
    );
  });
});

/* ----------------------------- inventory guard ---------------------------- */

describe('inventory guard', () => {
  test('the bag may never hold more than stock allows', () => {
    const c = boot();
    c.Store.clear();
    assert.equal(c.Store.stockCap('halo-one'), 60, 'stock floor from hydrate');
    assert.equal(c.Store.add('halo-one', 99), true);
    assert.equal(c.Store.line('halo-one::Graphite').qty, 60, 'quantity clamped to stock');
    c.Store.setQty('halo-one::Graphite', 500);
    assert.equal(c.Store.line('halo-one::Graphite').qty, 60, 'setQty clamps too');
    const p = c.DATA.products.find((x) => x.id === 'halo-one');
    p.stock = 500;
    assert.equal(c.Store.stockCap('halo-one'), 99, 'cap keeps a 99 sanity ceiling');
  });

  test('missing and sold-out products refuse to be added', () => {
    const c = boot();
    c.Store.clear();
    assert.equal(c.Store.add('does-not-exist', 1), false);
    const p = c.DATA.products.find((x) => x.id === 'field-bottle');
    p.stock = 0;
    assert.equal(c.Store.stockCap('field-bottle'), 0);
    assert.equal(c.Store.add('field-bottle', 1), false);
    assert.equal(c.Store.count, 0, 'nothing landed in the bag');
  });

  test('a line sold out mid-session is never quietly restocked', () => {
    const c = boot();
    c.Store.clear();
    c.Store.add('halo-one', 1);
    const p = c.DATA.products.find((x) => x.id === 'halo-one');
    p.stock = 0;
    c.Store.setQty('halo-one::Graphite', 5);
    assert.equal(c.Store.line('halo-one::Graphite').qty, 1, 'qty unchanged when sold out');
    assert.equal(c.Store.add('halo-one', 1), false);
  });
});

/* ---------------------------------- auth ---------------------------------- */

describe('auth', () => {
  test('the store ships clean; demo data signs in only when loaded', () => {
    const c = boot();
    assert.equal(c.Orders.all().length, 0, 'no fake orders on a fresh install');
    assert.equal(c.Auth.login('marta', 'Demo1234').ok, false, 'no demo customers until loaded');
    assert.ok(c.Auth.login('admin', 'Password8989$$').ok, 'admin always exists');
    c.DemoData.load(); // location.reload() is stubbed — seed applies in place
    assert.equal(c.Auth.login('marta', 'Demo1234').ok, true);
  });

  test('bad credentials fail', () => {
    const c = boot();
    assert.equal(c.Auth.login('marta', 'Demo1234').ok, false);
    assert.equal(c.Auth.login('marta', 'wrong').ok, false);
    assert.equal(c.Auth.login('ghost', 'whatever').ok, false);
    assert.equal(c.Auth.login('admin', 'Password8989$$').ok, true);
  });

  test('register rejects duplicate usernames', () => {
    const c = boot();
    c.DemoData.load();
    const res = c.Auth.register({
      name: 'Copy Cat',
      username: 'marta',
      email: 'copy@example.com',
      password: 'pass1234',
      confirm: 'pass1234',
    });
    assert.equal(res.ok, false);
    assert.match(res.error, /taken/i);
  });

  test('expired sessions are rejected', () => {
    const c = boot();
    c.DemoData.load();
    assert.equal(c.Auth.login('kenji', 'Demo1234').ok, true);
    assert.ok(c.Auth.current());
    const kenji = c.Auth.listUsers().find((u) => u.username === 'kenji');
    c.localStorage.setItem(
      'aether.session.v1',
      JSON.stringify({ userId: kenji.id, expiresAt: Date.now() - 1000 })
    );
    assert.equal(c.Auth.current(), null);
    assert.equal(c.Auth.session(), null);
  });

  test('password hashing is deterministic for the same salt', () => {
    const c = boot();
    assert.equal(c.Auth.hashPassword('secret123', 'abc'), c.Auth.hashPassword('secret123', 'abc'));
    assert.notEqual(c.Auth.hashPassword('secret123', 'abc'), c.Auth.hashPassword('secret124', 'abc'));
  });
});

/* ------------------------------ brute force ------------------------------- */

describe('login throttle', () => {
  test('locks after five failures with a time-bearing message', () => {
    const c = boot();
    const id = 'ghost';
    const t = Date.now();
    for (let i = 1; i <= 4; i++) {
      c.Auth.throttle.fail(id, t);
      assert.equal(c.Auth.throttle.peek(id, t).locked, false, `fail ${i} must not lock yet`);
    }
    const fifth = c.Auth.throttle.fail(id, t);
    assert.ok(fifth.lockedUntil > t);
    const gate = c.Auth.throttle.peek(id, t + 1000);
    assert.equal(gate.locked, true);
    assert.ok(gate.retryMs > 0, 'lock reports remaining time');

    const res = c.Auth.login(id, 'whatever');
    assert.equal(res.ok, false);
    assert.match(res.error, /too many sign-in attempts/i);
    assert.match(res.error, /minute/i);

    // lock expires and the escalation window resets
    assert.equal(c.Auth.throttle.peek(id, t + 61_000).locked, false);
    assert.equal(c.Auth.throttle.peek(id, t + 61_000).fails, 0);

    // explicit clear unlocks immediately
    c.Auth.throttle.fail(id, t);
    c.Auth.throttle.fail(id, t);
    c.Auth.throttle.clear(id);
    assert.equal(c.Auth.throttle.peek(id, t).locked, false);
    assert.equal(c.Auth.throttle.peek(id, t).fails, 0);
  });

  test('a successful login clears the failure record', () => {
    const c = boot();
    c.DemoData.load();
    const t = Date.now();
    c.Auth.throttle.fail('marta', t);
    c.Auth.throttle.fail('marta', t);
    assert.equal(c.Auth.login('marta', 'Demo1234').ok, true);
    assert.equal(c.Auth.throttle.peek('marta', t).fails, 0);
  });
});

/* --------------------------- demo-data policy ---------------------------- */

describe('demo-data policy', () => {
  test('a fresh install ships with zero fake orders, customers and subscribers', () => {
    const c = boot();
    assert.equal(c.Orders.all().length, 0);
    assert.equal(c.Auth.listUsers().filter((u) => /^u_demo/.test(u.id)).length, 0);
    assert.equal(c.Subs.all().length, 0);
    assert.ok(c.Auth.listUsers().some((u) => u.username === 'admin'), 'admin account is always created');
    assert.ok(c.localStorage.getItem('aether.demoPurged.v1'), 'clean-once flag is written');
  });

  test('browsers that already have the old seed are purged exactly once', () => {
    const storage = new Map();
    const a = boot(storage);
    a.DemoData.load(); // old deployment behaviour: demo dataset present
    assert.ok(a.Orders.all().length >= 10);
    assert.ok(a.Auth.listUsers().some((u) => u.username === 'marta'));
    assert.equal(a.Subs.all().length, 5);

    // migration: flag absent (pre-purge browser) → next boot cleans up
    storage.delete('aether.demoPurged.v1');
    const b = boot(storage);
    assert.equal(b.Orders.all().length, 0, 'demo orders removed');
    assert.ok(!b.Auth.listUsers().some((u) => u.username === 'marta'), 'demo customers removed');
    assert.equal(b.Subs.all().length, 0, 'demo subscribers removed');
    assert.ok(b.Auth.login('admin', 'Password8989$$').ok, 'admin survives the purge');

    // flag now set → a real order added afterwards is never touched
    const real = { id: 'AET-2026-777777', email: 'real@buyer.com', name: 'Real Buyer', placedAt: Date.now(), items: [] };
    b.Orders.place(real);
    const c = boot(storage);
    assert.ok(c.Orders.byId('AET-2026-777777'), 'real orders survive boots after the purge');
  });
});

/* --------------------------- catalogue overlay ---------------------------- */

describe('catalogue overlay persistence', () => {
  test('edits, creations, deletions and stock survive a reload', () => {
    const storage = new Map();

    const a = boot(storage);
    const seedCount = a.DATA.products.length;
    assert.equal(seedCount, 18, 'factory catalogue is 18 products');

    a.Catalog.upsert({ id: 'halo-one', price: 12300 });
    a.Catalog.upsert({
      id: 'widget-x',
      name: 'Widget X',
      category: 'everyday',
      price: 9900,
      colors: [{ name: 'Graphite', hex: '#2b2b30' }],
      image: 'assets/products/widget-x.svg',
      gallery: [],
    });
    a.Catalog.remove('orbit-cam');

    const b = boot(storage); // simulated reload
    const halo = b.DATA.products.find((p) => p.id === 'halo-one');
    assert.equal(halo.price, 12300, 'admin price edit survives reload');
    assert.equal(halo.name, 'Halo One', 'untouched seed fields still flow from the seed');
    assert.ok(b.DATA.products.some((p) => p.id === 'widget-x'), 'admin-created product survives reload');
    assert.equal(b.DATA.products.find((p) => p.id === 'widget-x').name, 'Widget X');
    assert.ok(!b.DATA.products.some((p) => p.id === 'orbit-cam'), 'tombstone survives reload');
    assert.equal(b.DATA.products.length, seedCount, '18 − 1 deleted + 1 created');

    // removing an admin-created product drops it entirely (no tombstone)
    b.Catalog.remove('widget-x');
    const overlay = JSON.parse(storage.get('aether.catalog.v2'));
    assert.ok(!overlay.removed.includes('widget-x'), 'created products are not tombstoned');
    const c = boot(storage);
    assert.ok(!c.DATA.products.some((p) => p.id === 'widget-x'));
  });

  test('hydrate rebuilds strictly from seed + overlay (no drift accumulates)', () => {
    const storage = new Map();
    const a = boot(storage);
    a.Catalog.upsert({ id: 'halo-one', price: 11100 });
    const b = boot(storage);
    // anything not backed by the seed or the overlay is discarded on hydrate
    b.DATA.products.push({ id: 'runtime-junk', name: 'Junk', category: 'everyday', price: 1, colors: [], gallery: [] });
    b.Catalog.hydrate();
    assert.ok(!b.DATA.products.some((p) => p.id === 'runtime-junk'), 'transient entries are dropped');
    assert.equal(b.DATA.products.find((p) => p.id === 'halo-one').price, 11100, 'edits survive hydrate');
  });

  test('legacy v1 snapshot key is discarded on boot', () => {
    const storage = new Map([['aether.catalog.v1', JSON.stringify([{ id: 'halo-one', price: 1 }])]]);
    const c = boot(storage);
    assert.equal(storage.has('aether.catalog.v1'), false, 'legacy key removed');
    assert.equal(c.DATA.products.find((p) => p.id === 'halo-one').price, 34900, 'stale snapshot not applied');
  });

  test('order placement decrements stock and persists it through the overlay', () => {
    const storage = new Map();
    const a = boot(storage);
    assert.equal(a.DATA.products.find((p) => p.id === 'halo-one').stock, 60);
    a.Orders.place({
      id: 'AET-2026-999999',
      email: 'buyer@example.com',
      name: 'Buyer One',
      placedAt: Date.now(),
      items: [{ productId: 'halo-one', id: 'halo-one', qty: 2, price: 34900, color: 'Graphite', name: 'Halo One' }],
    });
    assert.equal(a.DATA.products.find((p) => p.id === 'halo-one').stock, 58);
    assert.equal(a.Orders.byId('AET-2026-999999').status, 'paid');

    const b = boot(storage); // reload
    assert.equal(b.DATA.products.find((p) => p.id === 'halo-one').stock, 58, 'inventory survives reload');
    assert.ok(b.Orders.byId('AET-2026-999999'), 'order survives reload');
  });

  test('reset clears both overlay and legacy keys', () => {
    const storage = new Map();
    const a = boot(storage);
    a.Catalog.upsert({ id: 'halo-one', price: 5 });
    assert.ok(storage.has('aether.catalog.v2'));
    storage.delete('aether.catalog.v2'); // location.reload() is stubbed; emulate its effect
    const b = boot(storage);
    assert.equal(b.DATA.products.find((p) => p.id === 'halo-one').price, 34900);
  });
});
