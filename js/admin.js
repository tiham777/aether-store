/* =========================================================================
   AETHER — admin dashboard (role-gated)
   ========================================================================= */
(function () {
  'use strict';

  const icon = UI.icon;
  const esc = UI.esc;
  const money = (c) => Store.money(c);
  const SL = () => window.STATUS_LABEL || {};

  /* local icons layered on top of the UI set */
  const EXTRA = {
    alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4M12 17.4v.1"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    receipt: '<path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3.5"/>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.9 14.6a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.47.97z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    edit: '<path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    check2: '<path d="M20 6 9 17l-5-5"/>',
  };
  const ai = (n) => {
    if (EXTRA[n])
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EXTRA[n]}</svg>`;
    return icon(n);
  };

  const fmtDay = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fmtFull = (ts) =>
    new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtDT = (ts) =>
    `${fmtDay(ts)} · ${new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  const initials = (name) =>
    String(name || '?')
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const pill = (s) => `<span class="st st--${s}">${esc((SL()[s] || s).toString())}</span>`;
  const stockCls = (p) => (p.stock === 0 ? 'stock-out' : p.stock <= 12 ? 'stock-low' : '');

  const TABS = [
    ['', 'Overview', 'grid'],
    ['products', 'Products', 'package'],
    ['orders', 'Orders', 'receipt'],
    ['customers', 'Customers', 'users'],
    ['subscribers', 'Subscribers', 'mail'],
    ['settings', 'Settings', 'gear'],
  ];
  const TAB_META = {
    '': ['Overview', ''],
    products: ['Products', 'Catalogue, pricing and stock'],
    orders: ['Orders', 'Fulfilment, refunds and tracking'],
    customers: ['Customers', 'Accounts, roles and access'],
    subscribers: ['Subscribers', 'Newsletter audience'],
    settings: ['Settings', 'Store economics and content'],
  };

  /* ------------------------------ modal --------------------------------- */

  let modalBound = false;
  function bindModalGlobal() {
    if (modalBound) return;
    modalBound = true;
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-amodal-close],[data-amodal-x]')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function openModal(html, wide) {
    const modal = document.querySelector('[data-amodal]');
    if (!modal) return null;
    const card = modal.querySelector('[data-amodal-card]');
    card.className = 'amodal__card' + (wide ? ' amodal__card--wide' : '');
    card.innerHTML =
      `<button class="icon-btn" data-amodal-x aria-label="Close" style="position:absolute;top:13px;right:13px;z-index:2">${icon(
        'close'
      )}</button>` + html;
    modal.hidden = false;
    return card;
  }
  function closeModal() {
    const modal = document.querySelector('[data-amodal]');
    if (modal) modal.hidden = true;
  }
  function confirmModal(title, text, confirmLabel, onYes, danger) {
    const card = openModal(`
      <div class="amodal__head"><div><h2>${esc(title)}</h2><p class="xs" style="color:var(--ink-3);margin-top:4px">${esc(text)}</p></div></div>
      <div class="amodal__foot">
        <button class="abtn" data-cx>Keep as is</button>
        <button class="abtn ${danger ? 'abtn--danger' : 'abtn--primary'}" data-cy>${esc(confirmLabel)}</button>
      </div>`);
    if (!card) return;
    card.querySelector('[data-cx]').addEventListener('click', closeModal);
    card.querySelector('[data-cy]').addEventListener('click', () => {
      closeModal();
      onYes();
    });
  }

  /* ------------------------------ helpers ------------------------------- */

  function liveOrders() {
    return Orders.all().filter((o) => o.status !== 'cancelled' && o.status !== 'refunded');
  }

  function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function last14() {
    const now = Date.now();
    const day = 864e5;
    const live = liveOrders();
    const out = [];
    for (let i = 13; i >= 0; i--) {
      const from = startOfDay(now - i * day);
      const to = from + day;
      const total = live
        .filter((o) => o.placedAt >= from && o.placedAt < to)
        .reduce((n, o) => n + o.total, 0);
      out.push({ from, total });
    }
    return out;
  }

  /* =============================== SHELL ================================= */

  function admin(tab, params) {
    if (!Auth.current()) {
      return {
        title: 'Sign in — AETHER',
        html: `<div class="container"><p class="muted" style="padding-block:70px">Redirecting to sign in…</p></div>`,
        mount() {
          location.hash = '#/login?next=%2Fadmin' + (tab ? '%2F' + tab : '');
        },
      };
    }
    if (!Auth.isAdmin()) return Views.forbidden();

    const u = Auth.current();
    const [title, staticSub] = TAB_META[tab] || TAB_META[''];
    const awaiting = Orders.stats().awaiting;
    const sub =
      tab === ''
        ? `${fmtFull(Date.now())} · ${Orders.all().length} orders on file · ${awaiting} in the queue`
        : staticSub;
    const body =
      tab === 'products'
        ? bodyProducts()
        : tab === 'orders'
        ? bodyOrders()
        : tab === 'customers'
        ? bodyCustomers()
        : tab === 'subscribers'
        ? bodySubscribers()
        : tab === 'settings'
        ? bodySettings()
        : bodyOverview();

    const html = `
    <div class="admin">
      <aside class="admin__side">
        <a class="admin__brand" href="#/">
          <span class="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path fill="#ffffff" d="M12 3.4 20.7 20.6H16.4L12 11.9 7.6 20.6H3.3z"></path><circle cx="12" cy="16.6" r="1.8" fill="#cf5b34"></circle></svg>
          </span>
          <b>Aether</b><span class="tag">Admin</span>
        </a>
        <nav class="admin__nav" aria-label="Admin">
          ${TABS.map(([id, label, ic]) => {
            const n = id === 'orders' && awaiting ? `<span class="badge-n">${awaiting}</span>` : '';
            return `<a href="#/admin${id ? '/' + id : ''}" class="${tab === id ? 'is-active' : ''}"${
              tab === id ? ' aria-current="page"' : ''
            }>${ai(ic)} ${label}${n}</a>`;
          }).join('')}
        </nav>
        <div class="admin__side-foot">
          <a href="#/">${ai('eye')} View store</a>
          <button data-logout>${ai('logout')} Sign out</button>
        </div>
      </aside>
      <div class="admin__main">
        <header class="admin__top">
          <div>
            <h1>${esc(title)}</h1>
            <div class="crumbline">${esc(sub)}</div>
          </div>
          <div class="admin__whoami">
            <span class="avatar-sm">${esc(initials(u.name))}</span>
            <span class="who-name"><b>${esc(u.name)}</b><div class="xs muted">@${esc(u.username)}</div></span>
          </div>
        </header>
        <div class="admin__body">${body}</div>
      </div>
      <div class="amodal" data-amodal hidden>
        <div class="amodal__scrim" data-amodal-close></div>
        <div class="amodal__card" data-amodal-card role="dialog" aria-modal="true"></div>
      </div>
    </div>`;

    return {
      html,
      title: `${title} — AETHER Admin`,
      mount(root) {
        bindModalGlobal();
        if (tab === 'products') mountProducts(root);
        else if (tab === 'orders') mountOrders(root);
        else if (tab === 'customers') mountCustomers(root);
        else if (tab === 'subscribers') mountSubscribers(root);
        else if (tab === 'settings') mountSettings(root);
        else mountOverview(root);
      },
    };
  }

  /* ============================== OVERVIEW =============================== */

  function bodyOverview() {
    const stats = Orders.stats();
    const users = Auth.listUsers();
    const customers = users.filter((u) => u.role !== 'admin');
    const totalSpend = customers.reduce((n, u) => n + customerStats(u).spent, 0);
    const days = last14();
    const max = Math.max(...days.map((d) => d.total), 1);
    const d14 = days.reduce((n, d) => n + d.total, 0);

    const byStatus = {};
    Orders.all().forEach((o) => (byStatus[o.status] = (byStatus[o.status] || 0) + 1));
    const totalOrders = Orders.all().length || 1;
    const SEG = [
      ['paid', 'var(--accent)'],
      ['packed', 'var(--warn)'],
      ['shipped', '#2563eb'],
      ['delivered', 'var(--ok)'],
      ['cancelled', '#c9c6c0'],
      ['refunded', '#c0392b'],
    ];

    /* top products */
    const agg = {};
    liveOrders().forEach((o) =>
      o.items.forEach((it) => {
        const k = it.productId || it.id;
        agg[k] = agg[k] || { units: 0, revenue: 0 };
        agg[k].units += it.qty;
        agg[k].revenue += it.price * it.qty;
      })
    );
    const top = Object.entries(agg)
      .map(([id, v]) => ({ p: Store.product(id), ...v }))
      .filter((t) => t.p)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    const topMax = Math.max(...top.map((t) => t.revenue), 1);

    const low = Catalog.list()
      .filter((p) => p.stock <= 12)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6);

    const recent = Orders.all().slice(0, 6);
    const subs = Subs.all().slice(0, 5);

    return `
    <div class="kpis">
      <div class="kpi">
        <span class="kpi__label">Revenue</span>
        <span class="kpi__n" data-count="${Math.round(stats.revenue / 100)}" data-prefix="$">$0</span>
        <span class="kpi__sub"><b>${money(d14)}</b> in the last 14 days</span>
      </div>
      <div class="kpi">
        <span class="kpi__label">Orders</span>
        <span class="kpi__n" data-count="${stats.count}">0</span>
        <span class="kpi__sub">${stats.awaiting} awaiting shipment</span>
      </div>
      <div class="kpi">
        <span class="kpi__label">Customers</span>
        <span class="kpi__n" data-count="${customers.length}">0</span>
        <span class="kpi__sub"><b>${money(totalSpend)}</b> lifetime spend</span>
      </div>
      <div class="kpi">
        <span class="kpi__label">Avg. order</span>
        <span class="kpi__n" data-count="${Math.round(stats.aov / 100)}" data-prefix="$">$0</span>
        <span class="kpi__sub">across ${stats.liveCount} live orders</span>
      </div>
    </div>

    <div class="agrid-2">
      <section class="acard">
        <div class="acard__head"><h2>Revenue — last 14 days</h2><span class="xs">hover a bar for the day</span></div>
        <div class="achart" role="img" aria-label="Daily revenue for the last 14 days">
          ${days
            .map((d) => {
              const h = d.total ? Math.max(4, Math.round((d.total / max) * 100)) : 2;
              return `<div class="achart__col"><div class="achart__bar${d.total ? '' : ' is-zero'}" style="height:${h}%" title="${fmtDay(
                d.from
              )}: ${money(d.total)}"></div></div>`;
            })
            .join('')}
        </div>
        <div class="achart__axis">
          ${days.map((d, i) => `<span>${i % 2 === 0 ? new Date(d.from).getDate() : ''}</span>`).join('')}
        </div>
      </section>

      <section class="acard">
        <div class="acard__head"><h2>Fulfilment</h2><span class="xs">${Orders.all().length} orders total</span></div>
        <div class="abar" aria-hidden="true">
          ${SEG.map(([s, c]) => {
            const pct = ((byStatus[s] || 0) / totalOrders) * 100;
            return pct ? `<i style="width:${pct}%;background:${c}"></i>` : '';
          }).join('')}
        </div>
        <ul class="abar-legend">
          ${SEG.map(([s, c]) => {
            const n = byStatus[s] || 0;
            return `<li><i style="background:${c}"></i>${esc(SL()[s] || s)}<b>${n}</b></li>`;
          }).join('')}
        </ul>
      </section>
    </div>

    <div class="agrid-2">
      <section class="acard">
        <div class="acard__head"><h2>Top products</h2><span class="xs">by revenue, live orders</span></div>
        ${
          top.length
            ? `<ul class="mini-list">${top
                .map(
                  (t) => `
              <li style="display:grid;gap:7px">
                <span style="display:flex;align-items:center;gap:12px">
                  <img src="${t.p.image}" alt="">
                  <span class="ml-name"><b>${esc(t.p.name)}</b><span>${t.units} unit${t.units === 1 ? '' : 's'} sold</span></span>
                  <span class="ml-val">${money(t.revenue)}</span>
                </span>
                <span class="ml-barwrap"><span class="ml-bar" style="width:${Math.max(6, Math.round((t.revenue / topMax) * 100))}%"></span></span>
              </li>`
                )
                .join('')}</ul>`
            : `<div class="aempty">${icon('package')}<p>No sales data yet.</p></div>`
        }
      </section>

      <div class="stack stack-4">
        <section class="acard">
          <div class="acard__head"><h2>Stock watch</h2><a class="linkish" href="#/admin/products">Manage</a></div>
          ${
            low.length
              ? `<ul class="mini-list">${low
                  .map(
                    (p) => `
                <li>
                  <img src="${p.image}" alt="">
                  <span class="ml-name"><b>${esc(p.name)}</b><span>${esc(p.tagline || '')}</span></span>
                  <span class="ml-val ${stockCls(p)}">${p.stock === 0 ? 'Out of stock' : p.stock + ' left'}</span>
                </li>`
                  )
                  .join('')}</ul>`
              : `<p class="xs muted">All products above the low-stock line.</p>`
          }
        </section>
        <section class="acard">
          <div class="acard__head"><h2>Latest subscribers</h2><a class="linkish" href="#/admin/subscribers">View all</a></div>
          ${
            subs.length
              ? `<ul class="mini-list">${subs
                  .map(
                    (s) => `
                <li><span class="ml-name"><b>${esc(s.email)}</b><span>${esc(s.source)} · ${fmtDay(s.at)}</span></span></li>`
                  )
                  .join('')}</ul>`
              : `<p class="xs muted">No subscribers yet.</p>`
          }
        </section>
      </div>
    </div>

    <section class="acard">
      <div class="acard__head"><h2>Recent orders</h2><a class="linkish" href="#/admin/orders">View all orders</a></div>
      <div class="atw">
        <table class="atable">
          <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            ${recent
              .map(
                (o) => `
              <tr>
                <td class="mono-cell">${esc(o.id)}</td>
                <td><span class="cell-sub"><b>${esc(o.name)}</b><span>${esc(o.email)}</span></span></td>
                <td class="num">${fmtDT(o.placedAt)}</td>
                <td class="num">${money(o.total)}</td>
                <td>${pill(o.status)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>`;
  }

  function mountOverview() {}

  /* ============================== PRODUCTS =============================== */

  function productRows(list) {
    if (!list.length)
      return `<tr><td colspan="8" class="atab-empty">No products match that filter.</td></tr>`;
    return list
      .map((p) => {
        const cat = (DATA.categories.find((c) => c.id === p.category) || {}).name || p.category;
        return `
      <tr data-prow data-name="${esc((p.name + ' ' + p.id).toLowerCase())}" data-cat="${esc(p.category)}">
        <td><img class="thumb" src="${p.image}" alt=""></td>
        <td><span class="cell-sub"><b>${esc(p.name)}</b><span class="mono" style="font-size:.72rem">${esc(p.id)}</span></span></td>
        <td>${esc(cat)}</td>
        <td class="num">${money(p.price)}</td>
        <td class="num">${p.compareAt ? money(p.compareAt) : '<span class="muted">—</span>'}</td>
        <td class="num ${stockCls(p)}">${p.stock}</td>
        <td>${p.badge ? `<span class="badge${p.badge === 'New' ? ' badge--accent' : ''}">${esc(p.badge)}</span>` : '<span class="muted">—</span>'}</td>
        <td>
          <span class="cell-actions">
            <button class="abtn abtn--sm" data-pedit="${esc(p.id)}">${ai('edit')} Edit</button>
            <button class="abtn abtn--sm abtn--danger" data-pdel="${esc(p.id)}">${ai('trash') || icon('trash')}</button>
          </span>
        </td>
      </tr>`;
      })
      .join('');
  }

  function bodyProducts() {
    const list = Catalog.list();
    const images = [...new Set([...list.map((p) => p.image), 'assets/img/mesh.jpg', 'assets/img/desk-flatlay.jpg', 'assets/img/wall.jpg', 'assets/img/flatlay.jpg'])];
    return `
    <div class="atools">
      <input class="input" type="search" placeholder="Search products…" aria-label="Search products" data-psearch>
      <select class="select" data-pcat aria-label="Filter by category">
        <option value="">All categories</option>
        ${DATA.categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
      </select>
      <span class="spacer"></span>
      <span class="xs muted" data-pcount>${list.length} products</span>
      <button class="abtn abtn--primary" data-pnew>${icon('plus')} New product</button>
    </div>

    <div class="atw">
      <table class="atable" data-ptable>
        <thead>
          <tr>
            <th></th><th>Product</th><th>Category</th><th>Price</th><th>Compare-at</th><th>Stock</th><th>Badge</th><th></th>
          </tr>
        </thead>
        <tbody data-ptbody>${productRows(list)}</tbody>
      </table>
    </div>
    <input type="hidden" data-pimages value="${esc(images.join('|'))}">`;
  }

  function productForm(p) {
    const isEdit = Boolean(p);
    const d = (v) => (v === null || v === undefined ? '' : v);
    const dollars = (c) => (typeof c === 'number' ? (c / 100).toString() : '');
    const imgs = (document.querySelector('[data-pimages]') || { value: '' }).value.split('|').filter(Boolean);
    const colors = (p && p.colors ? p.colors : [{ name: 'Graphite', hex: '#2b2b30' }])
      .map((c) => `${c.name} ${c.hex}`)
      .join(', ');
    return `
    <div class="amodal__head">
      <div><h2>${isEdit ? 'Edit product' : 'New product'}</h2><p class="xs" style="color:var(--ink-3)">${
      isEdit ? `Editing ${esc(p.name)}` : 'Adds to the shop immediately'
    }</p></div>
    </div>
    <div class="aform-err" data-pf-err></div>
    <form class="aform" data-pform novalidate>
      <div class="aform-grid">
        <label class="field"><span class="field__label">Name</span>
          <input class="input" name="name" value="${esc(d(p && p.name))}" placeholder="Halo Two" required></label>
        <label class="field"><span class="field__label">ID / slug</span>
          <input class="input" name="id" value="${esc(d(p && p.id))}" placeholder="halo-two" ${isEdit ? 'disabled' : ''} required>
          <span class="field__hint">${isEdit ? 'IDs can’t change after creation.' : 'Used in the URL — lowercase, hyphens.'}</span></label>
        <label class="field"><span class="field__label">Category</span>
          <select class="select" name="category">
            ${DATA.categories.map((c) => `<option value="${c.id}"${p && p.category === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select></label>
        <label class="field"><span class="field__label">Badge</span>
          <select class="select" name="badge">
            ${['', 'New', 'Bestseller', 'Made to order'].map((b) => `<option value="${b}"${p && p.badge === b ? ' selected' : ''}>${b || 'None'}</option>`).join('')}
          </select></label>
        <label class="field"><span class="field__label">Price (USD)</span>
          <input class="input" name="price" inputmode="decimal" value="${dollars(p && p.price)}" placeholder="349" required></label>
        <label class="field"><span class="field__label">Compare-at (USD) <span class="muted" style="font-weight:400">— optional</span></span>
          <input class="input" name="compareAt" inputmode="decimal" value="${dollars(p && p.compareAt)}" placeholder="399"></label>
        <label class="field"><span class="field__label">Stock</span>
          <input class="input" name="stock" inputmode="numeric" value="${d(p && p.stock !== undefined ? p.stock : 60)}" required></label>
        <label class="field"><span class="field__label">Rating (0–5)</span>
          <input class="input" name="rating" inputmode="decimal" value="${d(p && p.rating !== undefined ? p.rating : 4.6)}" required></label>
        <label class="field span-2"><span class="field__label">Tagline</span>
          <input class="input" name="tagline" value="${esc(d(p && p.tagline))}" placeholder="Reference over-ear headphones"></label>
        <label class="field span-2"><span class="field__label">Blurb</span>
          <textarea class="input" name="blurb" placeholder="One paragraph describing the object.">${esc(d(p && p.blurb))}</textarea></label>
        <label class="field span-2"><span class="field__label">Colours <span class="muted" style="font-weight:400">— “Name #hex, Name #hex”</span></span>
          <input class="input" name="colors" value="${esc(colors)}"></label>
        <label class="field span-2"><span class="field__label">Image</span>
          <select class="select" name="image">
            ${imgs.map((src) => `<option value="${esc(src)}"${p && p.image === src ? ' selected' : ''}>${esc(src)}</option>`).join('')}
            ${p && !imgs.includes(p.image) ? `<option value="${esc(p.image)}" selected>${esc(p.image)}</option>` : ''}
          </select></label>
      </div>
      <div class="amodal__foot">
        <button class="abtn" type="button" data-amodal-x>Cancel</button>
        <button class="abtn abtn--primary" type="submit">${isEdit ? 'Save changes' : 'Create product'}</button>
      </div>
    </form>`;
  }

  function mountProducts(root) {
    const tbody = root.querySelector('[data-ptbody]');
    const search = root.querySelector('[data-psearch]');
    const catSel = root.querySelector('[data-pcat]');
    const count = root.querySelector('[data-pcount]');

    const filter = () => {
      const q = search.value.trim().toLowerCase();
      const cat = catSel.value;
      let shown = 0;
      tbody.querySelectorAll('[data-prow]').forEach((tr) => {
        const ok = (!q || tr.getAttribute('data-name').includes(q)) && (!cat || tr.getAttribute('data-cat') === cat);
        tr.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      count.textContent = `${shown} product${shown === 1 ? '' : 's'}`;
    };
    search.addEventListener('input', filter);
    catSel.addEventListener('change', filter);

    const openForm = (p) => {
      const card = openModal(productForm(p), true);
      if (!card) return;
      const form = card.querySelector('[data-pform]');
      const err = card.querySelector('[data-pf-err]');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const name = String(f.get('name') || '').trim();
        const id = String(f.get('id') || '').trim().toLowerCase();
        const price = Math.round(parseFloat(String(f.get('price')).replace(/[^0-9.]/g, '')) * 100);
        const cmpRaw = String(f.get('compareAt') || '').trim();
        const compareAt = cmpRaw ? Math.round(parseFloat(cmpRaw.replace(/[^0-9.]/g, '')) * 100) : null;
        const stock = parseInt(f.get('stock'), 10);
        const rating = Math.min(5, Math.max(0, parseFloat(f.get('rating')) || 4.5));

        const fail = (m) => {
          err.textContent = m;
          err.classList.add('is-shown');
        };
        if (name.length < 2) return void fail('Give the product a name (2+ characters).');
        if (!p && !/^[a-z0-9-]{2,30}$/.test(id)) return void fail('ID must be lowercase letters, numbers and hyphens.');
        if (!p && Catalog.list().some((x) => x.id === id)) return void fail('That ID already exists.');
        if (!Number.isFinite(price) || price <= 0) return void fail('Enter a valid price.');
        if (compareAt && compareAt <= price) return void fail('Compare-at must be higher than the price.');
        if (!Number.isFinite(stock) || stock < 0) return void fail('Stock must be 0 or more.');

        const colorList = String(f.get('colors') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => {
            const m = s.match(/^(.*?)\s*(#[0-9a-fA-F]{3,8})$/);
            return m ? { name: m[1].trim() || 'Default', hex: m[2] } : { name: s, hex: '#2b2b30' };
          });

        const patch = {
          name,
          category: String(f.get('category')),
          price,
          compareAt,
          stock,
          rating: Math.round(rating * 10) / 10,
          badge: String(f.get('badge') || '') || null,
          tagline: String(f.get('tagline') || '').trim() || name,
          blurb: String(f.get('blurb') || '').trim() || `${name} — part of the AETHER line.`,
          colors: colorList.length ? colorList : [{ name: 'Graphite', hex: '#2b2b30' }],
          image: String(f.get('image')),
        };

        if (p) {
          Catalog.upsert(Object.assign({ id: p.id }, patch));
          UI.toast({ title: 'Product saved', sub: `${name} updated across the store.` });
        } else {
          patch.id = id;
          patch.reviews = 0;
          patch.details = [patch.blurb];
          patch.specs = { Category: (DATA.categories.find((c) => c.id === patch.category) || {}).name || patch.category, Availability: patch.stock > 0 ? 'In stock' : 'Made to order' };
          patch.gallery = [{ src: patch.image, pos: 'center', scale: 1.12 }];
          Catalog.upsert(patch);
          UI.toast({ title: 'Product created', sub: `${name} is now live in the shop.` });
        }
        closeModal();
        AETHER.render();
      });
    };

    root.querySelector('[data-pnew]').addEventListener('click', () => openForm(null));

    const bindRowButtons = () => {
      root.querySelectorAll('[data-pedit]').forEach((b) =>
        b.addEventListener('click', () => {
          const p = Catalog.list().find((x) => x.id === b.getAttribute('data-pedit'));
          if (p) openForm(p);
        })
      );
      root.querySelectorAll('[data-pdel]').forEach((b) =>
        b.addEventListener('click', () => {
          const id = b.getAttribute('data-pdel');
          const p = Catalog.list().find((x) => x.id === id);
          if (!p) return;
          confirmModal(
            'Delete product?',
            `${p.name} will be removed from the shop. Orders that already contain it keep working.`,
            'Delete product',
            () => {
              Catalog.remove(id);
              UI.toast({ title: 'Product deleted', sub: `${p.name} was removed.` });
              AETHER.render();
            },
            true
          );
        })
      );
    };
    bindRowButtons();
  }

  /* ================================ ORDERS =============================== */

  function bodyOrders() {
    const all = Orders.all();
    const now = Date.now();
    const day = 864e5;
    const today = startOfDay(now);
    const todayOrders = all.filter((o) => o.placedAt >= today);
    const todayRev = todayOrders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((n, o) => n + o.total, 0);
    const awaiting = all.filter((o) => o.status === 'paid' || o.status === 'packed').length;
    const delivered30 = all.filter((o) => o.status === 'delivered' && o.placedAt >= now - 30 * day).length;
    const orders30 = all.filter((o) => o.placedAt >= now - 30 * day).length;
    const statuses = ['paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'];
    const counts = {};
    all.forEach((o) => (counts[o.status] = (counts[o.status] || 0) + 1));

    return `
    <div class="kpis">
      <div class="kpi"><span class="kpi__label">Orders today</span><span class="kpi__n" data-count="${todayOrders.length}">0</span><span class="kpi__sub">${money(todayRev)} revenue today</span></div>
      <div class="kpi"><span class="kpi__label">Awaiting shipment</span><span class="kpi__n" data-count="${awaiting}">0</span><span class="kpi__sub">paid or packed</span></div>
      <div class="kpi"><span class="kpi__label">Delivered</span><span class="kpi__n" data-count="${delivered30}">0</span><span class="kpi__sub">${delivered30} of ${orders30} placed in 30 days</span></div>
      <div class="kpi"><span class="kpi__label">Gross</span><span class="kpi__n" data-count="${Math.round(
      all.filter((o) => o.placedAt >= now - 30 * day && o.status !== 'cancelled' && o.status !== 'refunded').reduce((n, o) => n + o.total, 0) / 100
    )}" data-prefix="$">$0</span><span class="kpi__sub">excluding cancellations</span></div>
    </div>

    <div class="atools">
      <div class="achip-row" data-ochips>
        <button class="pill is-active" data-ostatus="">All <span class="pill__count">${all.length}</span></button>
        ${statuses
          .map(
            (s) =>
              `<button class="pill" data-ostatus="${s}">${SL()[s]} <span class="pill__count">${counts[s] || 0}</span></button>`
          )
          .join('')}
      </div>
      <span class="spacer"></span>
      <input class="input" type="search" placeholder="Search ID, email, name…" aria-label="Search orders" data-osearch>
    </div>

    <div class="atw">
      <table class="atable" data-otable>
        <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead>
        <tbody data-otbody>${orderRows(all)}</tbody>
      </table>
    </div>`;
  }

  function orderRows(list) {
    if (!list.length) return `<tr><td colspan="7" class="atab-empty">No orders match this filter.</td></tr>`;
    return list
      .map((o) => {
        const units = o.items.reduce((n, i) => n + i.qty, 0);
        return `
      <tr data-orow data-status="${esc(o.status)}" data-find="${esc((o.id + ' ' + o.email + ' ' + o.name).toLowerCase())}">
        <td class="mono-cell">${esc(o.id)}</td>
        <td><span class="cell-sub"><b>${esc(o.name)}</b><span>${esc(o.email)}</span></span></td>
        <td class="num">${fmtDT(o.placedAt)}</td>
        <td class="num">${units}</td>
        <td class="num">${money(o.total)}</td>
        <td data-cell-status>${pill(o.status)}</td>
        <td><span class="cell-actions"><button class="abtn abtn--sm" data-oview="${esc(o.id)}">${ai('eye')} View</button></span></td>
      </tr>`;
      })
      .join('');
  }

  function orderDetailHTML(o) {
    const NEXT = { paid: 'packed', packed: 'shipped', shipped: 'delivered' };
    const live = o.status !== 'cancelled' && o.status !== 'refunded';
    return `
    <div class="amodal__head">
      <div><h2>${esc(o.id)}</h2><p class="xs" style="color:var(--ink-3)">${fmtFull(o.placedAt)} · ${o.method === 'express' ? 'Express' : 'Standard'} shipping · ${o.payment === 'cod' ? 'Cash on delivery' : 'Card'}</p></div>
      ${pill(o.status)}
    </div>
    <div class="oadetail">
      <div class="oadetail__grid">
        <dl class="ostat"><dt>Customer</dt><dd>${esc(o.name)}<br><span class="xs muted">${esc(o.email)}</span></dd></dl>
        <dl class="ostat"><dt>Ship to</dt><dd>${esc(o.address || '—')}<br><span class="xs muted">${esc(o.zip || '')} ${esc(o.city || '')}, ${esc(o.country || '')}</span></dd></dl>
        <dl class="ostat"><dt>Placed</dt><dd>${fmtDT(o.placedAt)}</dd></dl>
        <dl class="ostat"><dt>User account</dt><dd>${
          o.userId ? (Auth.listUsers().find((u) => u.id === o.userId) || {}).name || 'Registered' : 'Guest checkout'
        }</dd></dl>
      </div>

      <div class="oitems">
        ${o.items
          .map(
            (it) => `
          <div class="oitem">
            <img src="${esc(it.image)}" alt="">
            <div><b>${esc(it.name)}</b><div class="xs">${esc(it.color)} · Qty ${it.qty} · ${money(it.price)} each</div></div>
            <span class="num">${money(it.price * it.qty)}</span>
          </div>`
          )
          .join('')}
      </div>

      <div class="ototal-lines">
        <div><span class="muted">Subtotal</span><span>${money(o.subtotal)}</span></div>
        ${o.discount ? `<div><span class="muted">Discount ${o.promo ? `· ${esc(o.promo)}` : ''}</span><span>−${money(o.discount)}</span></div>` : ''}
        <div><span class="muted">Shipping</span><span>${o.shipping === 0 ? 'Free' : money(o.shipping)}</span></div>
        <div><span class="muted">Tax</span><span>${money(o.tax)}</span></div>
        <div class="strong"><span>Total paid</span><span>${money(o.total)}</span></div>
      </div>

      <div>
        <span class="kicker">Timeline</span>
        <ul class="otimeline" style="margin-top:10px">
          ${(o.history || [{ status: o.status, at: o.placedAt }])
            .map((h) => `<li><span>${esc(SL()[h.status] || h.status)}</span><span class="tl-when">${fmtDT(h.at)}</span></li>`)
            .join('')}
        </ul>
      </div>

      <div class="oactions">
        ${NEXT[o.status] ? `<button class="abtn abtn--primary" data-advance="${esc(o.id)}">${ai('check2')} Mark as ${SL()[NEXT[o.status]]}</button>` : ''}
        ${o.status === 'paid' || o.status === 'packed' ? `<button class="abtn abtn--danger" data-cancel="${esc(o.id)}">Cancel order</button>` : ''}
        ${live && o.status !== 'delivered' ? `<button class="abtn abtn--danger" data-refund="${esc(o.id)}">Issue refund</button>` : ''}
        ${o.status === 'delivered' ? `<button class="abtn abtn--danger" data-refund="${esc(o.id)}">Refund after delivery</button>` : ''}
      </div>
    </div>`;
  }

  function mountOrders(root) {
    const tbody = root.querySelector('[data-otbody]');
    const search = root.querySelector('[data-osearch]');
    const chips = root.querySelectorAll('[data-ostatus]');
    let statusFilter = '';

    const applyFilter = () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      tbody.querySelectorAll('[data-orow]').forEach((tr) => {
        const okS = !statusFilter || tr.getAttribute('data-status') === statusFilter;
        const okQ = !q || tr.getAttribute('data-find').includes(q);
        tr.style.display = okS && okQ ? '' : 'none';
        if (okS && okQ) shown++;
      });
      if (!shown && !tbody.querySelector('.atab-empty')) {
        /* row visibility is enough; counts live in the chips */
      }
    };

    chips.forEach((c) =>
      c.addEventListener('click', () => {
        statusFilter = c.getAttribute('data-ostatus');
        chips.forEach((x) => x.classList.toggle('is-active', x === c));
        applyFilter();
      })
    );
    search.addEventListener('input', applyFilter);

    const openDetail = (id) => {
      const o = Orders.byId(id);
      if (!o) return;
      const card = openModal(orderDetailHTML(o), true);
      if (!card) return;

      const refresh = () => {
        Orders.setStatus; /* already persisted */
        const row = tbody.querySelector(`[data-orow] [data-cell-status]`);
        const target = Array.from(tbody.querySelectorAll('[data-orow]')).find((r) => r.getAttribute('data-find') === (o.id + ' ' + o.email + ' ' + o.name).toLowerCase());
        if (target) {
          target.setAttribute('data-status', o.status);
          const cell = target.querySelector('[data-cell-status]');
          if (cell) cell.innerHTML = pill(o.status);
        }
        openDetail(o.id);
      };

      const adv = card.querySelector('[data-advance]');
      if (adv)
        adv.addEventListener('click', () => {
          const NEXT = { paid: 'packed', packed: 'shipped', shipped: 'delivered' };
          const next = NEXT[o.status];
          if (!next) return;
          Orders.setStatus(o.id, next);
          UI.toast({ title: `Order ${o.id}`, sub: `Marked as ${SL()[next].toLowerCase()}.` });
          refresh();
        });
      const can = card.querySelector('[data-cancel]');
      if (can)
        can.addEventListener('click', () => {
          confirmModal('Cancel this order?', `${o.id} will be marked cancelled and the customer notified (demo).`, 'Cancel order', () => {
            Orders.setStatus(o.id, 'cancelled');
            UI.toast({ title: `Order ${o.id} cancelled`, sub: 'Refund the customer offline (demo).' });
            refresh();
          }, true);
        });
      const ref = card.querySelector('[data-refund]');
      if (ref)
        ref.addEventListener('click', () => {
          confirmModal('Issue refund?', `${money(o.total)} will be marked refunded for ${o.id}.`, 'Issue refund', () => {
            Orders.setStatus(o.id, 'refunded');
            UI.toast({ title: `Refunded ${money(o.total)}`, sub: `Order ${o.id} marked refunded.` });
            refresh();
          }, true);
        });
    };

    root.querySelectorAll('[data-oview]').forEach((b) =>
      b.addEventListener('click', () => openDetail(b.getAttribute('data-oview')))
    );
  }

  /* ============================== CUSTOMERS ============================== */

  function customerStats(u) {
    const os = Orders.forUser(u);
    const live = os.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded');
    return { orders: os.length, spent: live.reduce((n, o) => n + o.total, 0) };
  }

  function bodyCustomers() {
    const users = Auth.listUsers();
    const customers = users.filter((u) => u.role !== 'admin');
    const banned = users.filter((u) => u.banned).length;
    const totalSpend = customers.reduce((n, u) => n + customerStats(u).spent, 0);
    const admins = users.filter((u) => u.role === 'admin').length;
    const joined30 = customers.filter((u) => u.createdAt >= Date.now() - 30 * 864e5).length;
    return `
    <div class="kpis">
      <div class="kpi"><span class="kpi__label">Customers</span><span class="kpi__n" data-count="${customers.length}">0</span><span class="kpi__sub">${joined30} joined in the last 30 days</span></div>
      <div class="kpi"><span class="kpi__label">Admins</span><span class="kpi__n" data-count="${admins}">0</span><span class="kpi__sub">${admins} of ${users.length} accounts</span></div>
      <div class="kpi"><span class="kpi__label">Suspended</span><span class="kpi__n" data-count="${banned}">0</span><span class="kpi__sub">restore anytime</span></div>
      <div class="kpi"><span class="kpi__label">Avg. lifetime</span><span class="kpi__n" data-count="${
        customers.length ? Math.round(totalSpend / customers.length / 100) : 0
      }" data-prefix="$">$0</span><span class="kpi__sub">across ${customers.length} customers</span></div>
    </div>

    <div class="atools">
      <input class="input" type="search" placeholder="Search name, email, username…" aria-label="Search customers" data-csearch>
      <select class="select" data-crole aria-label="Filter by role">
        <option value="">All roles</option>
        <option value="customer">Customers</option>
        <option value="admin">Admins</option>
      </select>
      <span class="spacer"></span>
      <span class="xs muted" data-ccount>${users.length} accounts</span>
    </div>

    <div class="atw">
      <table class="atable">
        <thead><tr><th>Account</th><th>Email</th><th>Role</th><th>Joined</th><th>Orders</th><th>Spent</th><th></th></tr></thead>
        <tbody data-ctbody>${customerRows(users)}</tbody>
      </table>
    </div>`;
  }

  function customerRows(users) {
    if (!users.length) return `<tr><td colspan="7" class="atab-empty">No accounts match this filter.</td></tr>`;
    return users
      .map((u) => {
        const s = customerStats(u);
        return `
      <tr data-crow data-role="${esc(u.role)}" data-find="${esc((u.name + ' ' + u.email + ' ' + u.username).toLowerCase())}">
        <td>
          <span class="acct-cell">
            <span class="acct-ava">${esc(initials(u.name))}</span>
            <span class="cell-sub"><b>${esc(u.name)}${u.banned ? ' <span class="stock-out">· suspended</span>' : ''}</b><span>@${esc(u.username)}</span></span>
          </span>
        </td>
        <td>${esc(u.email)}</td>
        <td><span class="role-badge${u.role === 'admin' ? '' : ' role-badge--muted'}">${u.role === 'admin' ? 'Admin' : 'Customer'}</span></td>
        <td class="num">${fmtFull(u.createdAt)}</td>
        <td class="num">${s.orders}</td>
        <td class="num">${money(s.spent)}</td>
        <td>
          <span class="cell-actions">
            <button class="abtn abtn--sm" data-cview="${esc(u.id)}">${ai('eye')} View</button>
            <button class="abtn abtn--sm" data-crole="${esc(u.id)}">${u.role === 'admin' ? 'Demote' : 'Make admin'}</button>
            <button class="abtn abtn--sm ${u.banned ? '' : 'abtn--danger'}" data-cban="${esc(u.id)}">${u.banned ? 'Unsuspend' : 'Suspend'}</button>
            <button class="abtn abtn--sm abtn--danger" data-cdel="${esc(u.id)}">${icon('trash')}</button>
          </span>
        </td>
      </tr>`;
      })
      .join('');
  }

  function mountCustomers(root) {
    const tbody = root.querySelector('[data-ctbody]');
    const search = root.querySelector('[data-csearch]');
    const roleSel = root.querySelector('[data-crole]');
    const count = root.querySelector('[data-ccount]');

    const applyFilter = () => {
      const q = search.value.trim().toLowerCase();
      const role = roleSel.value;
      let shown = 0;
      tbody.querySelectorAll('[data-crow]').forEach((tr) => {
        const ok = (!q || tr.getAttribute('data-find').includes(q)) && (!role || tr.getAttribute('data-role') === role);
        tr.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      count.textContent = `${shown} account${shown === 1 ? '' : 's'}`;
    };
    search.addEventListener('input', applyFilter);
    roleSel.addEventListener('change', applyFilter);

    const toastRes = (res, okTitle) => {
      if (res.ok) {
        UI.toast({ title: okTitle, sub: 'Account updated.' });
        AETHER.render();
      } else {
        UI.toast({ title: 'Not allowed', sub: res.error });
      }
    };

    root.querySelectorAll('[data-cview]').forEach((b) =>
      b.addEventListener('click', () => {
        const u = Auth.listUsers().find((x) => x.id === b.getAttribute('data-cview'));
        if (!u) return;
        const s = customerStats(u);
        const os = Orders.forUser(u);
        openModal(`
          <div class="amodal__head">
            <div style="display:flex;gap:14px;align-items:center">
              <span class="avatar-lg" style="width:46px;height:46px;font-size:.9rem">${esc(initials(u.name))}</span>
              <div><h2>${esc(u.name)}</h2><p class="xs" style="color:var(--ink-3)">@${esc(u.username)} · ${esc(u.email)}</p></div>
            </div>
            <span class="role-badge${u.role === 'admin' ? '' : ' role-badge--muted'}">${u.role === 'admin' ? 'Admin' : 'Customer'}</span>
          </div>
          <div class="oadetail__grid">
            <dl class="ostat"><dt>Joined</dt><dd>${fmtFull(u.createdAt)}</dd></dl>
            <dl class="ostat"><dt>Orders</dt><dd>${s.orders}</dd></dl>
            <dl class="ostat"><dt>Lifetime spend</dt><dd>${money(s.spent)}</dd></dl>
            <dl class="ostat"><dt>Status</dt><dd>${u.banned ? '<span class="stock-out">Suspended</span>' : 'Active'}</dd></dl>
          </div>
          <div>
            <span class="kicker">Recent orders</span>
            <div class="oitems" style="margin-top:10px">
              ${
                os.length
                  ? os
                      .slice(0, 6)
                      .map(
                        (o) => `
                <div class="oitem" style="grid-template-columns:minmax(0,1fr) auto auto;gap:14px">
                  <div><b class="mono">${esc(o.id)}</b><div class="xs">${fmtDay(o.placedAt)} · ${o.items.length} product${o.items.length === 1 ? '' : 's'}</div></div>
                  ${pill(o.status)}
                  <span class="num">${money(o.total)}</span>
                </div>`
                      )
                      .join('')
                  : `<p class="xs muted" style="padding:8px 0">No orders yet.</p>`
              }
            </div>
          </div>`);
      })
    );

    root.querySelectorAll('[data-crole]').forEach((b) =>
      b.addEventListener('click', () => {
        const u = Auth.listUsers().find((x) => x.id === b.getAttribute('data-crole'));
        if (!u) return;
        const toAdmin = u.role !== 'admin';
        confirmModal(
          toAdmin ? 'Grant admin access?' : 'Remove admin access?',
          `${u.name} will ${toAdmin ? 'get full dashboard access' : 'lose dashboard access'}.`,
          toAdmin ? 'Grant admin' : 'Demote',
          () => toastRes(Auth.setUserRole(u.id, toAdmin ? 'admin' : 'customer'), toAdmin ? 'Admin access granted' : 'Admin access removed')
        );
      })
    );

    root.querySelectorAll('[data-cban]').forEach((b) =>
      b.addEventListener('click', () => {
        const u = Auth.listUsers().find((x) => x.id === b.getAttribute('data-cban'));
        if (!u) return;
        const ban = !u.banned;
        confirmModal(
          ban ? 'Suspend this account?' : 'Restore this account?',
          ban ? `${u.email} won’t be able to sign in until restored.` : `${u.email} will be able to sign in again.`,
          ban ? 'Suspend' : 'Restore',
          () => toastRes(Auth.setBanned(u.id, ban), ban ? 'Account suspended' : 'Account restored'),
          ban
        );
      })
    );

    root.querySelectorAll('[data-cdel]').forEach((b) =>
      b.addEventListener('click', () => {
        const u = Auth.listUsers().find((x) => x.id === b.getAttribute('data-cdel'));
        if (!u) return;
        confirmModal(
          'Delete account?',
          `${u.name} (${u.email}) will be removed. Their orders stay on file.`,
          'Delete account',
          () => toastRes(Auth.removeUser(u.id), 'Account deleted'),
          true
        );
      })
    );
  }

  /* ============================== SUBSCRIBERS ============================ */

  function bodySubscribers() {
    const list = Subs.all();
    return `
    <div class="atools">
      <span class="xs muted">${list.length} subscriber${list.length === 1 ? '' : 's'}</span>
      <span class="spacer"></span>
      <button class="abtn" data-csv ${list.length ? '' : 'disabled'}>${ai('download')} Export CSV</button>
    </div>
    ${
      list.length
        ? `<div class="atw"><table class="atable">
          <thead><tr><th>Email</th><th>Source</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            ${list
              .map(
                (s) => `
              <tr>
                <td><b>${esc(s.email)}</b></td>
                <td><span class="pill" style="pointer-events:none">${esc(s.source)}</span></td>
                <td class="num">${fmtFull(s.at)}</td>
                <td><span class="cell-actions"><button class="abtn abtn--sm abtn--danger" data-sdel="${esc(s.email)}">Remove</button></span></td>
              </tr>`
              )
              .join('')}
          </tbody></table></div>`
        : `<section class="acard"><div class="aempty">${icon('mail')}<p>No subscribers yet — footer signups will appear here.</p></div></section>`
    }`;
  }

  function mountSubscribers(root) {
    root.querySelectorAll('[data-sdel]').forEach((b) =>
      b.addEventListener('click', () => {
        Subs.remove(b.getAttribute('data-sdel'));
        UI.toast({ title: 'Subscriber removed', sub: 'They won’t get studio notes.' });
        AETHER.render();
      })
    );
    const csvBtn = root.querySelector('[data-csv]');
    if (csvBtn)
      csvBtn.addEventListener('click', () => {
        const list = Subs.all();
        const escCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
        const csv = ['email,source,joined', ...list.map((s) => [escCell(s.email), escCell(s.source), escCell(new Date(s.at).toISOString().slice(0, 10))].join(','))].join('\n');
        try {
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'aether-subscribers.csv';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          UI.toast({ title: 'CSV exported', sub: `${list.length} subscribers downloaded.` });
        } catch (e) {
          UI.toast({ title: 'Export unavailable', sub: 'This browser blocked the download.' });
        }
      });
  }

  /* ================================ SETTINGS ============================= */

  function bodySettings() {
    const s = Settings.get();
    return `
    <div class="aset-grid">
      <section class="acard">
        <div class="acard__head"><h2>Store economics</h2></div>
        <form class="aform" data-econ novalidate>
          <label class="field"><span class="field__label">Free shipping threshold (USD)</span>
            <input class="input" name="freeShip" inputmode="decimal" value="${(s.freeShipThreshold / 100).toFixed(0)}">
            <span class="field__hint">Standard shipping becomes free above this subtotal.</span></label>
          <label class="field"><span class="field__label">Express shipping fee (USD)</span>
            <input class="input" name="express" inputmode="decimal" value="${(s.expressFee / 100).toFixed(0)}"></label>
          <label class="field"><span class="field__label">Tax rate (%)</span>
            <input class="input" name="tax" inputmode="decimal" value="${(s.taxRate * 100).toFixed(1).replace(/\.0$/, '')}"></label>
          <div class="row row-4"><button class="abtn abtn--primary" type="submit">Save economics</button></div>
        </form>
      </section>

      <section class="acard">
        <div class="acard__head"><h2>Discount codes</h2><span class="xs">${Object.keys(s.promoCodes).length} active</span></div>
        <div data-promos>
          ${Object.entries(s.promoCodes)
            .map(
              ([code, rate]) => `
            <div class="apromo-row"><code>${esc(code)}</code><span class="pct">${Math.round(rate * 100)}% off</span>
            <button class="linkish is-danger" data-promodel="${esc(code)}">Remove</button></div>`
            )
            .join('')}
        </div>
        <form class="row row-3 wrap" data-promoadd novalidate>
          <input class="input" name="code" placeholder="CODE" style="text-transform:uppercase;flex:1;min-width:120px" maxlength="16">
          <input class="input" name="pct" placeholder="%" inputmode="numeric" style="width:74px" maxlength="2">
          <button class="abtn" type="submit">${icon('plus')} Add</button>
        </form>
      </section>

      <section class="acard">
        <div class="acard__head"><h2>Announcement bar</h2><button class="linkish" data-anreset>Restore defaults</button></div>
        <div class="stack stack-2" data-anlist>
          ${s.announcements
            .map(
              (t, i) => `
            <div class="ann-item"><span>${esc(t)}</span><button class="linkish is-danger" data-andel="${i}">Remove</button></div>`
            )
            .join('')}
        </div>
        <form class="row row-3" data-anadd novalidate>
          <input class="input" name="text" placeholder="New announcement (use *bold* markers)" style="flex:1" maxlength="90">
          <button class="abtn" type="submit">${icon('plus')} Add</button>
        </form>
      </section>

      <section class="acard">
        <div class="acard__head"><h2>Shared data (Firebase)</h2><span class="xs muted" data-shared-status>Checking…</span></div>
        <p class="xs muted">Orders are mirrored to Cloud Firestore — free Spark tier — so this dashboard sees them from any device, and customers can follow status changes live at <span class="mono">#/track</span>. Paste your <span class="mono">firebaseConfig</span> into <span class="mono">js/firebase-config.js</span> and publish <span class="mono">firestore.rules</span> to turn it on; until then everything stays in this browser.</p>
        <form class="row row-3" data-shared-form novalidate>
          <input class="input" name="key" placeholder="Legacy API key (only if the Upstash bridge is used)" style="flex:1" autocomplete="off">
          <button class="abtn abtn--primary" type="submit">Sync orders</button>
        </form>
      </section>

      <section class="acard danger-zone">
        <div class="acard__head"><h2>Danger zone</h2></div>
        <div class="stack stack-3">
          <div class="row row-4 wrap" style="justify-content:space-between;gap:10px">
            <span class="small">Load the demo dataset — fake customers, orders and subscribers for testing</span>
            <button class="abtn" data-loaddemo>Load demo data</button>
          </div>
          <div class="row row-4 wrap" style="justify-content:space-between;gap:10px">
            <span class="small">Reset catalogue to factory defaults (${DATA.products.length} products)</span>
            <button class="abtn abtn--danger" data-resetcat>Reset catalogue</button>
          </div>
          <div class="row row-4 wrap" style="justify-content:space-between;gap:10px">
            <span class="small">Erase all demo data — accounts, orders, subscribers, settings</span>
            <button class="abtn abtn--danger" data-resetall>Erase everything</button>
          </div>
        </div>
      </section>
    </div>`;
  }

  function mountSettings(root) {
    const econ = root.querySelector('[data-econ]');
    econ.addEventListener('submit', (e) => {
      e.preventDefault();
      const threshold = Math.round(parseFloat(String(econ.elements.freeShip.value).replace(/[^0-9.]/g, '')) * 100);
      const express = Math.round(parseFloat(String(econ.elements.express.value).replace(/[^0-9.]/g, '')) * 100);
      const taxPct = parseFloat(String(econ.elements.tax.value).replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(threshold) || !Number.isFinite(express) || !Number.isFinite(taxPct) || taxPct < 0 || taxPct > 30) {
        UI.toast({ title: 'Check the numbers', sub: 'Threshold and fee must be amounts; tax 0–30%.' });
        return;
      }
      Settings.save({ freeShipThreshold: threshold, expressFee: express, taxRate: taxPct / 100 });
      UI.toast({ title: 'Economics saved', sub: 'Checkout totals update immediately.' });
    });

    const promoForm = root.querySelector('[data-promoadd]');
    promoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = String(promoForm.elements.code.value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const pct = parseInt(promoForm.elements.pct.value, 10);
      if (code.length < 3) return void UI.toast({ title: 'Code too short', sub: 'Use 3–16 letters or numbers.' });
      if (!Number.isFinite(pct) || pct < 1 || pct > 90)
        return void UI.toast({ title: 'Percent 1–90', sub: 'Enter a discount between 1% and 90%.' });
      const s = Settings.get();
      s.promoCodes[code] = pct / 100;
      Settings.save({ promoCodes: s.promoCodes });
      UI.toast({ title: `${code} is live`, sub: `${pct}% off — works at checkout now.` });
      AETHER.render();
    });
    root.querySelectorAll('[data-promodel]').forEach((b) =>
      b.addEventListener('click', () => {
        const s = Settings.get();
        delete s.promoCodes[b.getAttribute('data-promodel')];
        Settings.save({ promoCodes: s.promoCodes });
        UI.toast({ title: 'Code removed', sub: 'It no longer validates at checkout.' });
        AETHER.render();
      })
    );

    const annAdd = root.querySelector('[data-anadd]');
    annAdd.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = String(annAdd.elements.text.value || '').trim();
      if (!text) return;
      const s = Settings.get();
      s.announcements.push(text.slice(0, 90));
      Settings.save({ announcements: s.announcements });
      AETHER.render();
    });
    root.querySelectorAll('[data-andel]').forEach((b) =>
      b.addEventListener('click', () => {
        const s = Settings.get();
        s.announcements.splice(Number(b.getAttribute('data-andel')), 1);
        Settings.save({ announcements: s.announcements });
        AETHER.render();
      })
    );
    root.querySelector('[data-anreset]').addEventListener('click', () => {
      Settings.save({ announcements: Settings.defaults.slice() });
      UI.toast({ title: 'Announcements restored', sub: 'Factory copy is back.' });
      AETHER.render();
    });

    const sharedForm = root.querySelector('[data-shared-form]');
    const sharedStatus = root.querySelector('[data-shared-status]');
    if (sharedForm && sharedStatus) {
      const KEY_LS = 'aether.apikey.v1';
      const savedKey = (() => {
        try {
          return localStorage.getItem(KEY_LS) || '';
        } catch (e) {
          return '';
        }
      })();
      sharedForm.elements.key.value = savedKey;
      const labels = {
        live: 'Connected — Firebase live, syncing across devices',
        connecting: 'Connecting to Firebase…',
        error: 'Firebase unreachable — writes are queued and retried',
        off: 'Not configured — running on local storage',
      };
      const queuedNote = () => {
        const n = window.Cloud && Cloud.pending ? Cloud.pending() : 0;
        return n ? ` · ${n} write${n === 1 ? '' : 's'} queued` : '';
      };
      const probe = async () => {
        if (window.Cloud && Cloud.configured) {
          await Cloud.ready();
          sharedStatus.textContent = (labels[Cloud.state()] || labels.connecting) + queuedNote();
          return;
        }
        if (window.API) {
          const state = await API.probe();
          sharedStatus.textContent = state === 'live' ? 'Legacy bridge connected — shared store reachable' : labels.off;
          return;
        }
        sharedStatus.textContent = labels.off;
      };
      probe();
      sharedForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const key = String(sharedForm.elements.key.value || '').trim();
        try {
          localStorage.setItem(KEY_LS, key);
        } catch (err) {}
        const list =
          (window.Cloud && Cloud.configured ? await Cloud.pullOrders() : null) ||
          (window.API ? await API.pullOrders(key) : null);
        if (!list)
          return void UI.toast({
            title: 'Sync failed',
            sub: 'The shared store is unreachable — check your Firebase config in js/firebase-config.js.',
          });
        const changed = Orders.mergeCloud(list);
        UI.toast({
          title: 'Synced',
          sub: changed
            ? `${changed} order${changed === 1 ? '' : 's'} pulled or updated from the shared store.`
            : 'Already up to date.',
        });
        probe();
        AETHER.render();
      });
    }

    root.querySelector('[data-loaddemo]').addEventListener('click', () =>
      confirmModal(
        'Load demo data?',
        'Adds fake customers, orders and subscribers for testing. Real data you have entered is kept.',
        'Load demo data',
        () => window.DemoData && DemoData.load()
      )
    );
    root.querySelector('[data-resetcat]').addEventListener('click', () =>
      confirmModal('Reset catalogue?', 'Every product edit and creation will be discarded.', 'Reset catalogue', () => Catalog.reset(), true)
    );
    root.querySelector('[data-resetall]').addEventListener('click', () =>
      confirmModal(
        'Erase all demo data?',
        'Accounts (including admin), orders, subscribers, product edits and settings are wiped from this browser. The store restarts fresh.',
        'Erase everything',
        () => {
          [
            'aether.users.v1', 'aether.session.v1', 'aether.orders.v1',
            'aether.catalog.v2', 'aether.settings.v1', 'aether.subs.v1', 'aether.seeded.v1',
            'aether.cart.v1', 'aether.wish.v1', 'aether.promo.v1', 'aether.attempts.v1',
            'aether.pending.v1', /* queued Firebase writes */
          ].forEach((k) => {
            try {
              localStorage.removeItem(k);
            } catch (e) {}
          });
          location.hash = '#/';
          location.reload();
        },
        true
      )
    );
  }

  Object.assign(window.Views, { admin });
})();
