/* =========================================================================
   Arena — accounts, orders, catalogue & settings (localStorage)

   Static-site demo auth: credentials are verified in the browser, so this
   is presentation-grade only. A real deployment must verify passwords
   server-side over HTTPS (bcrypt/argon2) and never ship the hash seed.
   Everything else — roles, sessions, order history, admin CRUD — mirrors
   how the production data layer would behave.
   ========================================================================= */
(function () {
  'use strict';

  const K = {
    users: 'aether.users.v1',
    session: 'aether.session.v1',
    orders: 'aether.orders.v1',
    catalog: 'aether.catalog.v2',
    attempts: 'aether.attempts.v1',
    settings: 'aether.settings.v1',
    subs: 'aether.subs.v1',
    seeded: 'aether.seeded.v1',
  };
  const CATALOG_LEGACY = 'aether.catalog.v1'; /* v1 was a full snapshot written but never read */
  const SESSION_MS = 7 * 24 * 3600 * 1000; /* 7-day rolling session */

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
  function del(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }

  const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const lower = (s) => String(s || '').trim().toLowerCase();

  /* ----------------------------- passwords ------------------------------ */

  function randSalt() {
    const bytes = new Uint8Array(12);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < 12; i++) bytes[i] = Math.floor(Math.random() * 256);
    let s = '';
    bytes.forEach((b) => (s += b.toString(16).padStart(2, '0')));
    return s;
  }

  /* Iterated FNV-style mix — dependency-free demo hashing. */
  function hashPassword(pw, salt) {
    const s = salt + ':' + pw;
    let a = 0x811c9dc5 ^ salt.length;
    let b = 0x9dc5811f ^ pw.length;
    for (let r = 0; r < 4096; r++) {
      for (let i = 0; i < s.length; i++) {
        a = Math.imul(a ^ (s.charCodeAt(i) + r), 16777619) >>> 0;
        b = (Math.imul(b + a, 2246822519) + (a >>> ((r + i) & 15))) >>> 0;
        b = ((b << 7) | (b >>> 25)) >>> 0;
      }
    }
    const h = (n) => (n >>> 0).toString(16).padStart(8, '0');
    return h(a) + h(b) + h((a ^ b) >>> 0) + h(Math.imul(a ^ b, 2654435761) >>> 0);
  }

  function verifyPassword(pw, user) {
    if (!user || !user.hash || !user.salt) return false;
    const h = hashPassword(pw, user.salt);
    if (h.length !== user.hash.length) return false;
    let diff = 0;
    for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ user.hash.charCodeAt(i);
    return diff === 0;
  }

  /* Hardcoded operator account — username: admin */
  const ADMIN_SALT = 'a7e3f9c21d4b5806';
  const ADMIN_HASH = '93faadd5c8fd27c15b078a1482c5ebd4';

  /* ------------------------------- users -------------------------------- */

  let users = read(K.users, null);
  if (!Array.isArray(users)) users = [];

  function persistUsers() {
    write(K.users, users);
  }

  function ensureAdmin() {
    if (users.some((u) => lower(u.username) === 'admin')) return;
    users.push({
      id: uid('u'),
      name: 'Studio Admin',
      username: 'admin',
      email: 'admin@arena.studio',
      phone: '',
      role: 'admin',
      banned: false,
      addresses: [],
      salt: ADMIN_SALT,
      hash: ADMIN_HASH,
      createdAt: Date.now() - 120 * 864e5,
    });
    persistUsers();
  }

  const rules = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()),
    username: (v) => /^[a-z0-9_]{3,16}$/.test(String(v || '').trim().toLowerCase()),
    name: (v) => String(v || '').trim().length >= 2 && String(v).trim().length <= 60,
    password: (v) => v.length >= 8 && /[a-zA-Z]/.test(v) && /\d/.test(v),
  };

  /* ------------------------------ session ------------------------------- */

  function session() {
    const s = read(K.session, null);
    if (!s || !s.userId || !s.expiresAt || s.expiresAt < Date.now()) {
      if (s) del(K.session);
      return null;
    }
    return s;
  }

  function current() {
    const s = session();
    if (!s) return null;
    const u = users.find((x) => x.id === s.userId);
    if (!u || u.banned) {
      del(K.session);
      return null;
    }
    return u;
  }

  function startSession(userId) {
    write(K.session, { userId, expiresAt: Date.now() + SESSION_MS });
  }

  /* --------------------------- auth operations -------------------------- */

  /* Brute-force throttle: consecutive failures lock the identifier with
     exponential backoff (1 min → 15 min cap). Success clears the record. */
  const FAIL_LIMIT = 5;
  const LOCK_STEP_MS = 60e3;
  const LOCK_MAX_MS = 15 * 60e3;

  const THROTTLE = {
    peek(id, now) {
      now = now || Date.now();
      const rec = read(K.attempts, null);
      if (!rec || rec.id !== id || typeof rec !== 'object') return { locked: false, fails: 0, retryMs: 0 };
      const until = rec.lockedUntil || 0;
      if (until > now) return { locked: true, fails: rec.fails || 0, retryMs: until - now };
      /* lock expired — restart the escalation window */
      return { locked: false, fails: until ? 0 : rec.fails || 0, retryMs: 0 };
    },
    fail(id, now) {
      now = now || Date.now();
      const prev = THROTTLE.peek(id, now);
      const fails = (prev.locked ? 0 : prev.fails) + 1;
      let lockedUntil = 0;
      if (fails >= FAIL_LIMIT) {
        const step = LOCK_STEP_MS * Math.pow(2, fails - FAIL_LIMIT);
        lockedUntil = now + Math.min(step, LOCK_MAX_MS);
      }
      write(K.attempts, { id, fails, lockedUntil, at: now });
      return { fails, lockedUntil, retryMs: Math.max(0, lockedUntil - now) };
    },
    clear(id) {
      const rec = read(K.attempts, null);
      if (rec && rec.id === id) del(K.attempts);
    },
  };

  function lockMessage(retryMs) {
    const s = Math.max(1, Math.ceil(retryMs / 1000));
    const human =
      s >= 60
        ? `${Math.ceil(s / 60)} minute${Math.ceil(s / 60) === 1 ? '' : 's'}`
        : `${s} second${s === 1 ? '' : 's'}`;
    return `Too many sign-in attempts. Try again in ${human}.`;
  }

  function login(identifier, password) {
    const id = lower(identifier);
    if (!id) return { ok: false, error: 'Enter your email or username.' };
    const now = Date.now();
    const gate = THROTTLE.peek(id, now);
    if (gate.locked) return { ok: false, error: lockMessage(gate.retryMs) };
    const u = users.find((x) => lower(x.username) === id || lower(x.email) === id);
    if (!u) {
      THROTTLE.fail(id, now);
      return { ok: false, error: 'We couldn’t find that account.' };
    }
    if (!verifyPassword(password, u)) {
      THROTTLE.fail(id, now);
      return { ok: false, error: 'That password doesn’t match.' };
    }
    if (u.banned) return { ok: false, error: 'This account has been suspended. Contact hello@arena.studio.' };
    THROTTLE.clear(id);
    startSession(u.id);
    return { ok: true, user: u };
  }

  function register(input) {
    const name = String(input.name || '').trim();
    const username = lower(input.username);
    const email = lower(input.email);
    if (!rules.name(name)) return { ok: false, error: 'Enter your full name (2+ characters).' };
    if (!rules.username(username))
      return { ok: false, error: 'Username must be 3–16 letters, numbers or underscores.' };
    if (!rules.email(email)) return { ok: false, error: 'Enter a valid email address.' };
    if (!rules.password(input.password)) return { ok: false, error: 'Password needs 8+ characters with a letter and a number.' };
    if (input.password !== input.confirm) return { ok: false, error: 'Passwords don’t match.' };
    if (users.some((u) => lower(u.email) === email)) return { ok: false, error: 'An account with that email already exists.' };
    if (users.some((u) => lower(u.username) === username)) return { ok: false, error: 'That username is taken.' };

    const salt = randSalt();
    const u = {
      id: uid('u'),
      name,
      username,
      email,
      phone: '',
      role: 'customer',
      banned: false,
      addresses: [],
      salt,
      hash: hashPassword(input.password, salt),
      createdAt: Date.now(),
    };
    users.push(u);
    persistUsers();
    startSession(u.id);
    return { ok: true, user: u };
  }

  function logout() {
    del(K.session);
  }

  function updateProfile(patch) {
    const u = current();
    if (!u) return { ok: false, error: 'Sign in first.' };
    if (patch.name !== undefined && !rules.name(patch.name)) return { ok: false, error: 'Enter your full name.' };
    if (patch.username !== undefined) {
      const un = lower(patch.username);
      if (!rules.username(un)) return { ok: false, error: 'Username must be 3–16 letters, numbers or underscores.' };
      if (users.some((x) => x.id !== u.id && lower(x.username) === un))
        return { ok: false, error: 'That username is taken.' };
      u.username = un;
    }
    if (patch.email !== undefined) {
      const em = lower(patch.email);
      if (!rules.email(em)) return { ok: false, error: 'Enter a valid email address.' };
      if (users.some((x) => x.id !== u.id && lower(x.email) === em))
        return { ok: false, error: 'That email is already registered.' };
      u.email = em;
    }
    if (patch.name !== undefined) u.name = String(patch.name).trim();
    if (patch.phone !== undefined) u.phone = String(patch.phone).trim();
    persistUsers();
    return { ok: true, user: u };
  }

  function changePassword(currentPw, nextPw) {
    const u = current();
    if (!u) return { ok: false, error: 'Sign in first.' };
    if (!verifyPassword(currentPw, u)) return { ok: false, error: 'Current password is incorrect.' };
    if (!rules.password(nextPw)) return { ok: false, error: 'New password needs 8+ characters with a letter and a number.' };
    u.salt = randSalt();
    u.hash = hashPassword(nextPw, u.salt);
    persistUsers();
    return { ok: true };
  }

  function saveAddresses(list) {
    const u = current();
    if (!u) return { ok: false, error: 'Sign in first.' };
    u.addresses = Array.isArray(list) ? list : [];
    persistUsers();
    return { ok: true };
  }

  /* --------------------------- admin: users ----------------------------- */

  function listUsers() {
    return users.slice().sort((a, b) => b.createdAt - a.createdAt);
  }

  function adminCount() {
    return users.filter((u) => u.role === 'admin' && !u.banned).length;
  }

  function setUserRole(id, role) {
    const me = current();
    if (!me || me.role !== 'admin') return { ok: false, error: 'Admins only.' };
    const u = users.find((x) => x.id === id);
    if (!u) return { ok: false, error: 'Account not found.' };
    if (u.id === me.id && role !== 'admin') return { ok: false, error: 'You can’t remove your own admin access.' };
    if (u.role === 'admin' && role !== 'admin' && adminCount() <= 1)
      return { ok: false, error: 'At least one admin must remain.' };
    u.role = role;
    persistUsers();
    return { ok: true, user: u };
  }

  function setBanned(id, banned) {
    const me = current();
    if (!me || me.role !== 'admin') return { ok: false, error: 'Admins only.' };
    const u = users.find((x) => x.id === id);
    if (!u) return { ok: false, error: 'Account not found.' };
    if (u.id === me.id) return { ok: false, error: 'You can’t suspend your own account.' };
    if (u.role === 'admin' && banned && adminCount() <= 1)
      return { ok: false, error: 'At least one active admin must remain.' };
    u.banned = banned;
    if (banned && session() && session().userId === u.id) del(K.session);
    persistUsers();
    return { ok: true, user: u };
  }

  function removeUser(id) {
    const me = current();
    if (!me || me.role !== 'admin') return { ok: false, error: 'Admins only.' };
    const u = users.find((x) => x.id === id);
    if (!u) return { ok: false, error: 'Account not found.' };
    if (u.id === me.id) return { ok: false, error: 'You can’t delete your own account.' };
    if (u.role === 'admin' && adminCount() <= 1) return { ok: false, error: 'At least one admin must remain.' };
    users = users.filter((x) => x.id !== id);
    persistUsers();
    return { ok: true };
  }

  /* ------------------------------- orders ------------------------------- */

  /* Documents that arrive from the shared store are untrusted input: coerce
     them to a known-good shape before anything can render them — status
     enum, strict id pattern, capped strings, safe image sources. A doc that
     fails the basics is dropped entirely. Escaping still happens at every
     render site; this is defence in depth. */
  const ORDER_STATUS = ['paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'];
  const cap = (v, n) => String(v == null ? '' : v).slice(0, n);
  const finiteNum = (v, min, max, fallback) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(n, min), max);
  };
  const safeImage = (v) => {
    const s = cap(v, 300).trim();
    return /^(assets\/|https?:\/\/|data:image\/|#)/i.test(s) ? s : '';
  };
  const ORDER_ID_RE = /^AET-\d{4}-[A-Z0-9-]{6,40}$/;

  function sanitizeOrder(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = String(raw.id || '');
    if (!ORDER_ID_RE.test(id)) return null;
    if (!Array.isArray(raw.items) || !raw.items.length || raw.items.length > 50) return null;
    const items = [];
    raw.items.forEach((it) => {
      if (!it || typeof it !== 'object') return;
      const pid = String(it.productId || it.id || '');
      if (!/^[a-z0-9-]{1,40}$/.test(pid)) return;
      items.push({
        id: pid,
        productId: pid,
        name: cap(it.name || pid, 120),
        image: safeImage(it.image),
        color: cap(it.color || '', 40),
        qty: Math.round(finiteNum(it.qty, 1, 99, 1)),
        price: Math.round(finiteNum(it.price, 0, 1e8, 0)),
      });
    });
    if (!items.length) return null;
    const placedAt = finiteNum(raw.placedAt, 1, 8.64e15, Date.now());
    const history = (Array.isArray(raw.history) ? raw.history : [])
      .filter((h) => h && typeof h === 'object' && ORDER_STATUS.includes(h.status) && Number.isFinite(Number(h.at)))
      .slice(0, 20)
      .map((h) => ({ status: h.status, at: Number(h.at) }));
    return {
      id,
      userId: typeof raw.userId === 'string' && raw.userId.length <= 40 ? raw.userId : null,
      email: cap(raw.email, 120),
      name: cap(raw.name, 60),
      phone: cap(raw.phone, 30),
      address: cap(raw.address, 120),
      zip: cap(raw.zip, 12),
      city: cap(raw.city, 60),
      country: cap(raw.country, 60),
      method: raw.method === 'express' ? 'express' : 'standard',
      payment: raw.payment === 'cod' ? 'cod' : 'card',
      items,
      subtotal: Math.round(finiteNum(raw.subtotal, 0, 1e8, 0)),
      discount: Math.round(finiteNum(raw.discount, 0, 1e8, 0)),
      promo: typeof raw.promo === 'string' ? cap(raw.promo, 16) : null,
      shipping: Math.round(finiteNum(raw.shipping, 0, 1e8, 0)),
      tax: Math.round(finiteNum(raw.tax, 0, 1e8, 0)),
      total: Math.round(finiteNum(raw.total, 0, 1e8, 0)),
      placedAt,
      updatedAt: finiteNum(raw.updatedAt, placedAt, 8.64e15, placedAt),
      status: ORDER_STATUS.includes(raw.status) ? raw.status : 'paid',
      history,
    };
  }

  let orders = read(K.orders, null);
  if (!Array.isArray(orders)) orders = [];

  const ORDERS = {
    all() {
      return orders.slice().sort((a, b) => b.placedAt - a.placedAt);
    },
    byId(id) {
      return orders.find((o) => o.id === id) || null;
    },
    forUser(u) {
      if (!u) return [];
      return orders
        .filter((o) => o.userId === u.id || (o.email && lower(o.email) === lower(u.email)))
        .sort((a, b) => b.placedAt - a.placedAt);
    },
    place(order) {
      order.userId = order.userId || (current() ? current().id : null);
      order.status = order.status || 'paid';
      order.history = order.history || [{ status: 'paid', at: order.placedAt || Date.now() }];
      order.updatedAt = order.updatedAt || Date.now();
      /* cap what the cloud will accept so a long form value can never make
         a Firestore write bounce forever (see firestore.rules) */
      order.name = cap(order.name, 60);
      order.email = cap(order.email, 120);
      order.phone = cap(order.phone, 30);
      order.address = cap(order.address, 120);
      order.zip = cap(order.zip, 12);
      order.city = cap(order.city, 60);
      order.country = cap(order.country, 60);
      orders.push(order);
      write(K.orders, orders);
      ORDERS.decrementStock(order.items || []);
      /* mirror to Firebase when configured — fire-and-forget, Cloud queues
         the write itself if the network is down (see js/cloud.js) */
      if (window.Cloud && Cloud.configured) Cloud.pushOrder(order);
      return order;
    },
    setStatus(id, status) {
      const o = ORDERS.byId(id);
      if (!o) return null;
      o.status = status;
      o.history = o.history || [];
      o.history.push({ status, at: Date.now() });
      o.updatedAt = Date.now();
      write(K.orders, orders);
      if (window.Cloud && Cloud.configured) Cloud.pushOrder(o);
      return o;
    },
    remove(id) {
      orders = orders.filter((o) => o.id !== id);
      write(K.orders, orders);
    },
    /* the shared store accepted this order */
    markShared(id) {
      const o = ORDERS.byId(id);
      if (o && !o.shared) {
        o.shared = true;
        write(K.orders, orders);
      }
      return o || null;
    },
    /* Merge orders from the shared store. Missing ones are added; ones we
       already have are refreshed when the cloud copy is at least as new, so
       status changes made on another device show up without a re-seed.
       Returns the number of orders that changed. */
    mergeCloud(list) {
      let changed = 0;
      (list || []).forEach((raw) => {
        const co = sanitizeOrder(raw);
        if (!co) return; /* malformed or hostile document — drop it */
        const local = orders.find((o) => o.id === co.id);
        if (!local) {
          orders.push(Object.assign({}, co, { shared: true }));
          changed++;
          return;
        }
        const cloudAt = co.updatedAt || co.placedAt || 0;
        const localAt = local.updatedAt || local.placedAt || 0;
        const sameStatus = local.status === co.status;
        const sameHistory = (local.history || []).length === (co.history || []).length;
        const sameStamp = localAt === cloudAt;
        if (sameStatus && sameHistory && sameStamp) return; /* no-op snapshot */
        if (cloudAt < localAt) return; /* this browser is ahead — it pushes */
        Object.assign(local, co, { shared: true });
        changed++;
      });
      if (changed) {
        orders.sort((a, b) => (b.placedAt || 0) - (a.placedAt || 0));
        write(K.orders, orders);
      }
      return changed;
    },
    stats() {
      const live = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded');
      const revenue = live.reduce((n, o) => n + o.total, 0);
      return {
        count: orders.length,
        liveCount: live.length,
        revenue,
        aov: live.length ? Math.round(revenue / live.length) : 0,
        awaiting: orders.filter((o) => o.status === 'paid' || o.status === 'packed').length,
      };
    },
    decrementStock(items) {
      let changed = false;
      items.forEach((it) => {
        const p = DATA.products.find((x) => x.id === (it.productId || it.id));
        if (p && typeof p.stock === 'number') {
          p.stock = Math.max(0, p.stock - (it.qty || 1));
          overlay.upserts[p.id] = Object.assign({}, overlay.upserts[p.id], { id: p.id, stock: p.stock });
          changed = true;
        }
      });
      if (changed) persistOverlay();
    },
  };

  /* ---------------------------- catalogue ------------------------------- */

  /* The shipped data.js list is the seed. Admin edits persist as a small
     overlay (patches + tombstones), so factory products added in a later
     build still appear, deletions survive reloads, and admin-created
     products are appended on top of the seed. */
  const seedProducts = JSON.parse(JSON.stringify(DATA.products));
  const seedIds = new Set(seedProducts.map((p) => p.id));

  let overlay = read(K.catalog, null);
  if (!overlay || typeof overlay !== 'object' || overlay.v !== 2) {
    if (Array.isArray(read(CATALOG_LEGACY, null))) del(CATALOG_LEGACY);
    overlay = { v: 2, upserts: {}, removed: [] };
  }
  if (!overlay.upserts || typeof overlay.upserts !== 'object') overlay.upserts = {};
  if (!Array.isArray(overlay.removed)) overlay.removed = [];
  Object.keys(overlay.upserts).forEach((id) => {
    const patch = overlay.upserts[id];
    if (!patch || typeof patch !== 'object' || patch.id !== id) delete overlay.upserts[id];
  });
  overlay.removed = overlay.removed.filter((id) => typeof id === 'string');

  function persistOverlay() {
    overlay.savedAt = Date.now();
    write(K.catalog, overlay);
  }

  function applyOverlay() {
    const removed = new Set(overlay.removed);
    const list = JSON.parse(JSON.stringify(seedProducts))
      .filter((p) => !removed.has(p.id))
      .map((p) => (overlay.upserts[p.id] ? Object.assign({}, p, overlay.upserts[p.id]) : p));
    Object.keys(overlay.upserts).forEach((id) => {
      if (!list.some((p) => p.id === id)) list.push(Object.assign({ id }, overlay.upserts[id]));
    });
    DATA.products = list;
  }

  function ensureStock() {
    DATA.products.forEach((p) => {
      if (typeof p.stock !== 'number' || p.stock < 0) p.stock = 60;
    });
  }

  const CATALOG = {
    list() {
      return DATA.products;
    },
    upsert(prod) {
      const i = DATA.products.findIndex((p) => p.id === prod.id);
      if (i > -1) DATA.products[i] = Object.assign({}, DATA.products[i], prod);
      else DATA.products.push(prod);
      overlay.upserts[prod.id] = prod;
      overlay.removed = overlay.removed.filter((id) => id !== prod.id);
      persistOverlay();
      return prod;
    },
    remove(id) {
      DATA.products = DATA.products.filter((p) => p.id !== id);
      delete overlay.upserts[id];
      if (seedIds.has(id) && !overlay.removed.includes(id)) overlay.removed.push(id);
      persistOverlay();
    },
    hydrate() {
      applyOverlay();
      ensureStock();
    },
    reset() {
      del(K.catalog);
      del(CATALOG_LEGACY);
      location.reload();
    },
  };

  /* ------------------------------ settings ------------------------------ */

  const DEFAULT_ANNOUNCEMENTS = [
    '*Free shipping* on orders over $150',
    '60-night trial on everything',
    '10% off *your first order* with code ARENA10',
  ];

  function currentSettings() {
    const s = read(K.settings, null) || {};
    return {
      freeShipThreshold: typeof s.freeShipThreshold === 'number' ? s.freeShipThreshold : DATA.freeShipThreshold,
      expressFee: typeof s.expressFee === 'number' ? s.expressFee : DATA.expressFee,
      taxRate: typeof s.taxRate === 'number' ? s.taxRate : DATA.taxRate,
      promoCodes: s.promoCodes && typeof s.promoCodes === 'object' ? s.promoCodes : Object.assign({}, DATA.promoCodes),
      announcements: Array.isArray(s.announcements) ? s.announcements : DEFAULT_ANNOUNCEMENTS.slice(),
    };
  }

  function escTopbar(t) {
    return String(t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function applyTopbar(items) {
    const html = items
      .map((t) => `<span class="topbar__item">${escTopbar(t).replace(/\*(.+?)\*/g, '<b>$1</b>')}</span>`)
      .join('');
    document.querySelectorAll('.topbar__group').forEach((g) => (g.innerHTML = html));
  }

  function applySettings(s) {
    DATA.freeShipThreshold = s.freeShipThreshold;
    DATA.expressFee = s.expressFee;
    DATA.taxRate = s.taxRate;
    DATA.promoCodes = Object.assign({}, s.promoCodes);
    if (document.querySelector('.topbar__group')) applyTopbar(s.announcements);
  }

  const SETTINGS = {
    get: currentSettings,
    save(patch) {
      const s = Object.assign(currentSettings(), patch);
      write(K.settings, s);
      applySettings(s);
      return s;
    },
    reset() {
      del(K.settings);
      location.reload();
    },
    defaults: DEFAULT_ANNOUNCEMENTS,
  };

  /* ----------------------------- subscribers ---------------------------- */

  let subs = read(K.subs, null);
  if (!Array.isArray(subs)) subs = [];

  const SUBS = {
    all() {
      return subs.slice().sort((a, b) => b.at - a.at);
    },
    add(email, source) {
      const em = lower(email);
      if (!rules.email(em)) return false;
      if (subs.some((s) => lower(s.email) === em)) return false;
      subs.push({ email: em, source: source || 'site', at: Date.now() });
      write(K.subs, subs);
      return true;
    },
    remove(email) {
      subs = subs.filter((s) => lower(s.email) !== lower(email));
      write(K.subs, subs);
    },
  };

  /* ------------------------------ demo seed ----------------------------- */

  const DEMO_SUBS = [
    ['sofia.brandt@example.com', 'footer'],
    ['lucas.moreau@example.com', 'newsletter'],
    ['nina.petrova@example.com', 'footer'],
    ['devon.clark@example.com', 'journal'],
    ['yuki.tanaka@example.com', 'footer'],
  ];

  function seedDemo() {
    const day = 864e5;
    const now = Date.now();

    const demoUsers = [
      { name: 'Marta Lindqvist', username: 'marta', email: 'marta.lindqvist@example.com', city: 'Copenhagen', country: 'Denmark' },
      { name: 'Kenji Sato', username: 'kenji', email: 'kenji.sato@example.com', city: 'Osaka', country: 'Japan' },
      { name: 'Amara Okafor', username: 'amara', email: 'amara.okafor@example.com', city: 'London', country: 'United Kingdom' },
    ].map((d, i) => {
      const salt = randSalt();
      return {
        id: 'u_demo' + i,
        name: d.name,
        username: d.username,
        email: d.email,
        phone: '',
        role: 'customer',
        banned: false,
        addresses:
          i === 0
            ? [{ label: 'Home', line: 'Strandgade 14, 2nd floor', city: d.city, zip: '1401', country: d.country, default: true }]
            : [],
        salt,
        hash: hashPassword('Demo1234', salt),
        createdAt: now - (60 - i * 12) * day,
      };
    });
    users = users.concat(demoUsers.filter((u) => !users.some((x) => x.username === u.username)));
    persistUsers();

    const P = (id) => DATA.products.find((p) => p.id === id);
    const plan = [
      [0, 0, [['halo-one', 1]], 'express', 'paid'],
      [1, 1, [['slate65', 1], ['arc-mouse', 1]], 'standard', 'packed'],
      [2, 2, [['monolith-s', 1]], 'standard', 'packed'],
      [3, 'guest', [['halo-buds', 2]], 'standard', 'shipped'],
      [5, 0, [['field-bottle', 1], ['atlas-pack', 1]], 'standard', 'delivered'],
      [7, 1, [['meridian-watch', 1]], 'express', 'delivered'],
      [9, 2, [['lumen-desk', 1], ['dock-one', 1]], 'standard', 'delivered'],
      [12, 'guest', [['orbit-cam', 1], ['prism-shades', 1]], 'standard', 'delivered'],
      [15, 0, [['halo-buds', 1]], 'standard', 'refunded'],
      [18, 1, [['slate65', 1]], 'standard', 'delivered'],
    ];
    const guest = { name: 'Elena Ruiz', email: 'elena.ruiz@example.com', city: 'Berlin', country: 'Germany' };
    const seq = ['paid', 'packed', 'shipped', 'delivered'];
    const offs = [0, 6, 20, 96];

    const demoOrders = plan.map((row, i) => {
      const [daysAgo, who, lines, method, status] = row;
      const u = who === 'guest' ? guest : users.find((x) => x.username === demoUsers[who].username);
      const items = lines.map(([id, qty]) => {
        const p = P(id);
        return { id: p.id, productId: p.id, name: p.name, image: p.image, color: p.colors[0].name, qty, price: p.price };
      });
      const subtotal = items.reduce((n, it) => n + it.price * it.qty, 0);
      const discount = i % 3 === 0 ? Math.round(subtotal * 0.1) : 0;
      const shipping = method === 'express' ? DATA.expressFee : subtotal - discount >= DATA.freeShipThreshold ? 0 : 900;
      const tax = Math.round((subtotal - discount + shipping) * DATA.taxRate);
      const placedAt = now - daysAgo * day - (i % 5) * 36e5;
      const statusIdx = seq.indexOf(status);
      let history;
      if (status === 'refunded' || status === 'cancelled') {
        history = [
          { status: 'paid', at: placedAt },
          { status, at: placedAt + 3 * day },
        ];
      } else {
        history = seq.slice(0, statusIdx + 1).map((s, j) => ({ status: s, at: placedAt + offs[j] * 36e5 }));
      }
      return {
        id: 'AET-2026-' + (100001 + i),
        userId: who === 'guest' ? null : u.id,
        email: u.email,
        name: u.name,
        phone: '',
        address: who === 'guest' ? 'Kastanienallee 22' : (u.addresses[0] || {}).line || '—',
        zip: who === 'guest' ? '10435' : (u.addresses[0] || {}).zip || '—',
        city: u.city || (u.addresses[0] || {}).city || '—',
        country: u.country || (u.addresses[0] || {}).country || '—',
        method,
        items,
        subtotal,
        discount,
        promo: discount ? 'ARENA10' : null,
        shipping,
        tax,
        total: subtotal - discount + shipping + tax,
        placedAt,
        status,
        history,
      };
    });
    orders = orders.concat(demoOrders.filter((o) => !orders.some((x) => x.id === o.id)));
    write(K.orders, orders);

    const demoSubs = DEMO_SUBS;
    demoSubs.forEach(([email, source], i) => {
      if (!subs.some((s) => s.email === email))
        subs.push({ email, source, at: now - (i * 3 + 2) * day });
    });
    write(K.subs, subs);
  }

  /* --------------------------- demo-data policy -------------------------- */
  /* The deployed store ships clean: no fake orders, customers or subscribers.
     Browsers that already received the old seed get a one-time purge; the
     dataset can be loaded again on demand from admin → Settings. */

  const CLEAN_FLAG = 'aether.demoPurged.v1';

  function purgeDemoData() {
    if (read(CLEAN_FLAG, null)) return;
    let touched = false;

    const demoUsers = users.filter((u) => /^u_demo\d+$/.test(u.id));
    const demoIds = new Set(demoUsers.map((u) => u.id));
    const demoEmails = new Set(demoUsers.map((u) => lower(u.email)));
    demoEmails.add('elena.ruiz@example.com'); /* seeded guest buyer */
    if (demoUsers.length) {
      users = users.filter((u) => !demoIds.has(u.id));
      touched = true;
    }

    const seedOrderIds = new Set();
    for (let i = 1; i <= 10; i++) seedOrderIds.add('AET-2026-' + (100000 + i));
    const ordersBefore = orders.length;
    orders = orders.filter((o) => {
      const byDemoUser = o.userId && demoIds.has(o.userId);
      const byDemoEmail = demoEmails.has(lower(o.email));
      const seededId = seedOrderIds.has(o.id) && byDemoEmail;
      return !(byDemoUser || byDemoEmail || seededId);
    });
    if (orders.length !== ordersBefore) touched = true;

    const demoSubSet = new Set(DEMO_SUBS.map(([email]) => email));
    const subsBefore = subs.length;
    subs = subs.filter((s) => !demoSubSet.has(lower(s.email)));
    if (subs.length !== subsBefore) touched = true;

    const s = session();
    if (s && demoIds.has(s.userId)) del(K.session);

    if (touched) {
      persistUsers();
      write(K.orders, orders);
      write(K.subs, subs);
    }
    write(CLEAN_FLAG, 1);
  }

  /* --------------------------------- boot -------------------------------- */

  ensureAdmin();
  purgeDemoData();
  CATALOG.hydrate(); /* seed + admin overlay + stock floor */
  /* hydrate settings (topbar announcements, pricing) if previously saved */
  if (read(K.settings, null)) applySettings(currentSettings());

  window.Auth = {
    rules,
    current,
    session,
    isAdmin: () => {
      const u = current();
      return Boolean(u && u.role === 'admin');
    },
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    saveAddresses,
    listUsers,
    setUserRole,
    setBanned,
    removeUser,
    hashPassword,
    throttle: THROTTLE,
    lockMessage,
    storageKeys: K,
  };
  window.DemoData = {
    load() {
      seedDemo();
      location.reload();
    },
    purge() {
      del(CLEAN_FLAG);
      purgeDemoData();
      location.reload();
    },
  };
  window.Orders = ORDERS;
  window.Catalog = CATALOG;
  window.Settings = SETTINGS;
  window.Subs = SUBS;
})();
