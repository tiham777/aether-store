/* =========================================================================
   Arena — UI layer: icons, cards, drawer, search, menu, toasts
   ========================================================================= */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* -------------------------------- icons -------------------------------- */

  const PATHS = {
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    arrowUpRight: '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    heart:
      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    star: '<path d="m12 2.6 2.9 6 6.6 1-4.8 4.6 1.1 6.6L12 17.7l-5.9 3.1 1.1-6.6L2.5 9.6l6.5-1z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    truck:
      '<path d="M1.5 3.5h14v12h-14z"/><path d="M15.5 8h4l3 3v4.5h-7z"/><circle cx="5.6" cy="18.4" r="2.4"/><circle cx="18.4" cy="18.4" r="2.4"/>',
    refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 3.5v6h-6"/>',
    shield: '<path d="M12 21.5s7.5-3.8 7.5-9.5V5.2L12 2.5 4.5 5.2V12c0 5.7 7.5 9.5 7.5 9.5z"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2.4"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    package: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2.6"/><path d="M2 10h20"/>',
    banknote:
      '<rect x="2" y="6" width="20" height="12" rx="2.6"/><circle cx="12" cy="12" r="2.8"/><path d="M6 12h.01M18 12h.01"/>',
    trash:
      '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    sparkle:
      '<path d="M12 2.5 14 8l5.5 2-5.5 2-2 5.5-2-5.5L4.5 10 10 8z"/><path d="M19 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/>',
    zoom: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M11 8.4v5.2M8.4 11h5.2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15.4 15.4 0 0 1 0 18 15.4 15.4 0 0 1 0-18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.2V12l3.2 2"/>',
    wrench:
      '<path d="M15 6.5a4.5 4.5 0 0 0 5.7 5.7L11.4 21.5a3.2 3.2 0 0 1-4.5-4.5z"/><path d="M15 6.5 17.5 4"/><path d="M6.4 5.6 9 8.2 6.6 10.6 4 8z"/>',
    leaf: '<path d="M4 20c-.6-9 5.5-15.4 16-15.4C20 14.7 13.7 20.4 5.6 20.4z"/><path d="M4.5 20.5c3.6-4 7-6.3 11-7.7"/>',
    award:
      '<circle cx="12" cy="9" r="6"/><path d="m8.4 13.8-1.4 7.4 5-2.9 5 2.9-1.4-7.4"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2.6"/><path d="M5 15V5.4A2.4 2.4 0 0 1 7.4 3H15"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    headset:
      '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2.5" y="13.5" width="4.5" height="7" rx="2"/><rect x="17" y="13.5" width="4.5" height="7" rx="2"/>',
    ruler: '<path d="M3 15 15 3l6 6L9 21z"/><path d="m7 11 2 2M10.5 7.5l2 2M14 4l2 2"/>',
    co2: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 10.5a3.5 3.5 0 1 0 0 3"/><path d="M14.5 14h-2a2 2 0 0 1 0-4h2"/>',
    alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4M12 17.4v.1"/>',
  };

  function icon(name, extra) {
    const d = PATHS[name];
    if (!d) return '';
    const fill = name === 'star' || name === 'heart' ? 'currentColor' : 'none';
    return `<svg viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" ${
      extra ? `class="${extra}"` : ''
    } aria-hidden="true">${d}</svg>`;
  }

  function stars(rating, size) {
    let out = `<span class="stars"${size ? ` style="--s:${size}px"` : ''} aria-hidden="true">`;
    for (let i = 1; i <= 5; i++) out += icon('star').replace('<svg', `<svg style="opacity:${i <= Math.round(rating) ? 1 : 0.28}"`);
    return out + '</span>';
  }

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const catName = (id) => (DATA.categories.find((c) => c.id === id) || {}).name || '';
  const productUrl = (id) => `#/product/${id}`;

  /* ----------------------------- product card ---------------------------- */

  function productCard(p, index) {
    const badges = [];
    const oos = p.stock === 0;
    if (oos) {
      badges.push('<span class="badge badge--dark">Sold out</span>');
    } else {
      if (p.badge) badges.push(`<span class="badge${p.badge === 'New' ? ' badge--accent' : ''}">${esc(p.badge)}</span>`);
      if (p.compareAt) badges.push('<span class="badge badge--dark">Save ' + Math.round((1 - p.price / p.compareAt) * 100) + '%</span>');
    }

    return `
    <article class="card" data-reveal style="--d:${(index || 0) * 65}ms">
      <div class="card__media">
        ${badges.length ? `<div class="card__badges">${badges.join('')}</div>` : ''}
        <button class="card__wish${Store.isWished(p.id) ? ' is-on' : ''}" data-wish="${p.id}" aria-label="Save ${esc(p.name)}" aria-pressed="${Store.isWished(
      p.id
    )}">${icon('heart')}</button>
        <a href="${productUrl(p.id)}" class="card__link" aria-label="${esc(p.name)} — ${esc(p.tagline)}">
          <img src="${p.image}" alt="${esc(p.name)} — ${esc(p.tagline)}" width="800" height="1000" loading="lazy" decoding="async">
        </a>
        <button class="card__quick" data-add="${p.id}"${oos ? ' disabled' : ''}>${icon('bag')}<span>${oos ? 'Sold out' : 'Quick add · ' + Store.money(p.price)}</span></button>
      </div>
      <div class="card__info">
        <div class="card__top">
          <h3 class="card__name"><a href="${productUrl(p.id)}">${esc(p.name)}</a></h3>
          <span class="card__price price">${Store.money(p.price)}</span>
        </div>
        <div class="card__cat">
          <span>${catName(p.category)}</span><span class="divider-dot"></span>
          <span>${p.rating.toFixed(1)} ${icon('star')}</span><span class="divider-dot"></span>
          <span>${p.reviews} reviews</span>
        </div>
        ${
          !oos && typeof p.stock === 'number' && p.stock <= 5
            ? `<span class="card__low">${icon('alert')} Only ${p.stock} left</span>`
            : ''
        }
        <div class="card__swatches" aria-hidden="true">
          ${p.colors.map((c) => `<span class="swatch-dot" style="background:${c.hex}" title="${esc(c.name)}"></span>`).join('')}
        </div>
      </div>
    </article>`;
  }

  /* -------------------------------- toasts -------------------------------- */

  function toast(opts) {
    const host = $('.toasts');
    if (!host) return;
    const node = document.createElement('div');
    node.className = 'toast';
    node.setAttribute('role', 'status');
    node.innerHTML = `
      ${opts.img ? `<img src="${esc(opts.img)}" alt="" width="40" height="50">` : ''}
      <div class="toast__text">
        <span class="toast__title">${esc(opts.title)}</span>
        ${opts.sub ? `<span class="toast__sub">${esc(opts.sub)}</span>` : ''}
      </div>
      ${opts.action ? `<button class="toast__action" data-toast-action="${opts.action.href || ''}">${esc(opts.action.label)}</button>` : ''}`;
    host.appendChild(node);
    const kill = () => {
      node.classList.add('is-out');
      setTimeout(() => node.remove(), 420);
    };
    const timer = setTimeout(kill, 4600);
    node.addEventListener('click', (e) => {
      if (e.target.closest('[data-toast-action]')) {
        clearTimeout(timer);
        kill();
      }
    });
    while (host.children.length > 3) host.firstElementChild.remove();
  }

  /* ------------------------------ cart drawer ----------------------------- */

  function cartLine(l) {
    const p = Store.product(l.productId);
    if (!p) return '';
    return `
    <div class="line-item" data-line="${l.id}">
      <a class="line-item__media" href="${productUrl(p.id)}" data-close-cart>
        <img src="${p.image}" alt="${esc(p.name)}" width="74" height="92" loading="lazy">
      </a>
      <div class="line-item__body">
        <a class="line-item__name" href="${productUrl(p.id)}" data-close-cart>${esc(p.name)}</a>
        <span class="line-item__variant">${esc(l.color)} · ${esc(p.tagline)}</span>
        <div class="line-item__qty">
          <div class="stepper" role="group" aria-label="Quantity for ${esc(p.name)}">
            <button data-qty="-1" data-line-id="${l.id}" aria-label="Decrease quantity">${icon('minus')}</button>
            <span class="stepper__value">${l.qty}</span>
            <button data-qty="1" data-line-id="${l.id}" aria-label="Increase quantity">${icon('plus')}</button>
          </div>
        </div>
      </div>
      <div class="line-item__side">
        <span class="line-item__price">${Store.money(l.price * l.qty)}</span>
        <button class="line-item__remove" data-remove="${l.id}">Remove</button>
      </div>
    </div>`;
  }

  function renderCart() {
    const body = $('.drawer__body');
    const foot = $('.drawer__foot');
    const progress = $('.progress');
    if (!body || !foot) return;

    const items = Store.items;
    const badge = $('[data-cart-count]');
    if (badge) {
      const n = Store.count;
      badge.textContent = n;
      badge.style.display = n ? '' : 'none';
      badge.classList.remove('is-bump');
      void badge.offsetWidth;
      if (n) badge.classList.add('is-bump');
    }
    const title = $('[data-cart-title]');
    if (title) title.innerHTML = `Your bag <span>· ${Store.count} ${Store.count === 1 ? 'item' : 'items'}</span>`;

    if (!items.length) {
      progress.style.display = 'none';
      const picks = DATA.products
        .filter((p) => p.badge === 'Bestseller' || p.badge === 'New')
        .filter((p) => p.stock !== 0)
        .slice(0, 3);
      body.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty__icon">${icon('bag')}</div>
          <h3>Your bag is empty</h3>
          <p>Nothing here yet. The collection is a good place to start.</p>
          <a class="btn btn--primary btn--sm" href="#/shop" data-close-cart>Explore the collection ${icon('arrowRight')}</a>
        </div>
        ${
          picks.length
            ? `<div class="cart-picks">
                <span class="search__hint">Start here</span>
                ${picks
                  .map(
                    (p) => `
                  <div class="cart-picks__row">
                    <a class="cart-picks__thumb" href="${productUrl(p.id)}" data-close-cart><img src="${p.image}" alt="" width="48" height="60" loading="lazy"></a>
                    <span class="cart-picks__meta">
                      <a href="${productUrl(p.id)}" data-close-cart>${esc(p.name)}</a>
                      <span class="small muted">${esc(p.tagline)}</span>
                    </span>
                    <span class="cart-picks__price">${Store.money(p.price)}</span>
                    <button class="cart-picks__add" data-add="${p.id}" aria-label="Add ${esc(p.name)} to bag">${icon('plus')}</button>
                  </div>`
                  )
                  .join('')}
              </div>`
            : ''
        }`;
      foot.innerHTML = `
        <div class="drawer__row"><span class="muted small">Subtotal</span><span class="drawer__total">${Store.money(0)}</span></div>
        <button class="btn btn--primary btn--block" disabled>Checkout</button>
        <p class="drawer__note">Shipping and taxes calculated at checkout.</p>`;
      return;
    }

    progress.style.display = '';
    const remaining = Store.freeShipRemaining();
    const pct = Math.min(100, Math.round(((DATA.freeShipThreshold - remaining) / DATA.freeShipThreshold) * 100));
    $('[data-progress-text]').innerHTML = remaining
      ? `You're <b>${Store.money(remaining)}</b> away from free shipping`
      : `<b>Free shipping applied</b> · arrives ${Store.etaLabel('standard')}`;
    $('[data-progress-fill]').style.width = pct + '%';

    body.innerHTML = items.map(cartLine).join('');
    const disc = Store.discount();
    foot.innerHTML = `
      <div class="drawer__row"><span class="muted small">Subtotal</span><strong class="price">${Store.money(
        Store.subtotal()
      )}</strong></div>
      ${
        disc
          ? `<div class="drawer__row" style="color:var(--ok)"><span class="small">Discount · ${esc(
              Store.promo
            )}</span><span class="small">−${Store.money(disc)}</span></div>`
          : ''
      }
      <div class="drawer__row"><span class="muted small">Shipping</span><span class="small">${
        Store.shipping('standard') === 0 ? 'Free' : Store.money(Store.shipping('standard'))
      }</span></div>
      <div class="drawer__row"><span class="muted small">Estimated delivery</span><span class="small"><b>${Store.etaLabel(
        'standard'
      )}</b></span></div>
      ${
        Store.promo
          ? `<div class="drawer__promo-done">${icon('check')} <span><b>${esc(Store.promo)}</b> applied · ${
              Math.round((DATA.promoCodes[Store.promo] || 0) * 100)
            }% off</span> <button class="linkish" type="button" data-promo-clear>Remove</button></div>`
          : `<form class="promo drawer__promo" data-promo-form novalidate>
              <input class="input" name="promo" placeholder="Discount code" aria-label="Discount code" autocomplete="off" spellcheck="false">
              <button class="btn btn--ghost btn--sm" type="submit">Apply</button>
            </form>
            <span class="promo__msg${Store.promo ? ' is-shown' : ''}" data-promo-msg></span>`
      }
      <a class="btn btn--primary btn--block btn--lg" href="#/checkout" data-close-cart>Checkout · ${Store.money(
        Store.total('standard')
      )}</a>
      <button class="btn btn--ghost btn--block btn--sm" data-close-cart>Continue shopping</button>
      <p class="drawer__note">Free returns for 60 nights</p>`;

    /* promo box lives in the drawer so a code can be applied pre-checkout */
    const pForm = foot.querySelector('[data-promo-form]');
    if (pForm)
      pForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = pForm.querySelector('[name="promo"]');
        const msg = foot.querySelector('[data-promo-msg]');
        const code = input.value.trim().toUpperCase();
        if (Store.applyPromo(code)) {
          /* applyPromo emits 'promo' → the subscription repaints the drawer */
          toast({ title: 'Discount applied', sub: `${code} · you saved ${Store.money(Store.discount())}` });
        } else {
          msg.textContent = code ? `“${code}” isn’t a valid code.` : 'Enter a code first.';
          msg.classList.add('is-shown', 'is-bad');
          input.focus();
        }
      });
    const pClear = foot.querySelector('[data-promo-clear]');
    if (pClear)
      pClear.addEventListener('click', () => {
        Store.clearPromo();
        toast({ title: 'Discount removed', sub: 'The code is no longer applied.' });
      });
  }

  /* -------------------------------- search -------------------------------- */

  let searchCursor = -1;

  function searchResults(term) {
    const body = $('.search__body');
    if (!body) return;
    const q = term.trim().toLowerCase();

    if (!q) {
      const picks = DATA.products.filter((p) => p.badge === 'Bestseller' || p.badge === 'New').slice(0, 4);
      body.innerHTML =
        `<div class="search__hint">Bestsellers &amp; new arrivals</div>` +
        picks.map((p) => resultRow(p)).join('') +
        `<div class="search__hint">Browse</div>
         <div class="search__chips">${DATA.categories
           .map((c) => `<a class="pill" href="#/shop?cat=${c.id}" data-close-search>${c.name}</a>`)
           .join('')}
           <a class="pill" href="#/shop" data-close-search>All products</a></div>`;
      searchCursor = -1;
      return;
    }

    const hits = DATA.products.filter((p) => {
      /* search the specs too — “sapphire” or “IP67” should find their object */
      const hay = [p.name, p.id, p.tagline, p.category, catName(p.category), p.blurb]
        .concat(Object.values(p.specs || {}))
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

    body.innerHTML = hits.length
      ? `<div class="search__hint">${hits.length} result${hits.length > 1 ? 's' : ''}</div>` +
          hits.map((p) => resultRow(p)).join('') +
          `<div class="search__chips"><a class="pill" href="#/shop?q=${encodeURIComponent(
            term.trim()
          )}" data-close-search>See all results in the shop</a></div>`
      : `<div class="search__empty">No matches for “${esc(term)}”.<br>Try “headphones”, “keyboard” or “watch”.</div>`;
    searchCursor = -1;
  }

  function resultRow(p) {
    return `
      <a class="search__result" href="${productUrl(p.id)}" data-close-search>
        <img class="search__thumb" src="${p.image}" alt="" width="52" height="64" loading="lazy">
        <span class="search__meta">
          <span class="search__name">${esc(p.name)}</span>
          <span class="search__cat">${catName(p.category)} · ${esc(p.tagline)}</span>
        </span>
        <span class="search__price">${
          p.stock === 0 ? '<b class="stock-out">Sold out</b>' : Store.money(p.price)
        }</span>
      </a>`;
  }

  function moveSearchCursor(step) {
    const rows = $$('.search__result');
    if (!rows.length) return;
    searchCursor = (searchCursor + step + rows.length) % rows.length;
    rows.forEach((r, i) => r.classList.toggle('is-cursor', i === searchCursor));
    rows[searchCursor].scrollIntoView({ block: 'nearest' });
  }

  /* ------------------------------ layer state ----------------------------- */

  const layers = { cart: false, search: false, menu: false };
  /* while a dialog is open the rest of the page must not be tabbable */
  const BACKGROUND = ['.skip-link', '.topbar', '.header', 'main#app', '.footer', '.back-top'];
  const TRIGGERS = { cart: '[data-open-cart]', search: '[data-open-search]', menu: '[data-open-menu]' };
  const openers = {};

  function syncLock() {
    const any = layers.cart || layers.search || layers.menu;
    document.body.classList.toggle('is-locked', Boolean(any));
    const scrim = $('.scrim');
    if (scrim) scrim.classList.toggle('is-open', layers.cart);
    BACKGROUND.forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      if (any) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  }

  function setLayer(name, open) {
    const was = layers[name];
    if (open && !was) openers[name] = document.activeElement;
    layers[name] = open;
    const el = $(`[data-layer="${name}"]`);
    if (el) {
      el.classList.toggle('is-open', open);
      el.setAttribute('aria-hidden', String(!open));
      if (open) el.removeAttribute('inert');
      else el.setAttribute('inert', '');
    }
    const trigger = document.querySelector(TRIGGERS[name]);
    if (trigger) trigger.setAttribute('aria-expanded', String(open));
    syncLock();

    if (open && name === 'search') {
      const input = $('.search__input');
      searchResults('');
      setTimeout(() => input && input.focus(), 90);
    }
    if (open && name === 'cart') {
      renderCart();
      const closeBtn = $('.drawer [data-close-cart]');
      setTimeout(() => closeBtn && closeBtn.focus(), 120);
    }
    if (open && name === 'menu') {
      const first = $('.menu__link');
      setTimeout(() => first && first.focus(), 120);
    }
    if (!open && was) {
      /* return focus to whatever opened the dialog, and never leave focus
         parked inside a panel that is now hidden */
      const back = openers[name];
      openers[name] = null;
      const active = document.activeElement;
      const inside = Boolean(el && active && el.contains(active));
      if (back && back.isConnected && back !== document.body && (inside || !active || active === document.body)) {
        back.focus();
      } else if (inside && active && active.blur) {
        active.blur();
      }
    }
  }

  function closeAll() {
    Object.keys(layers).forEach((k) => layers[k] && setLayer(k, false));
  }

  /* -------------------------------- header -------------------------------- */

  function headerScroll() {
    const header = $('.header');
    if (!header) return;
    header.classList.toggle('is-stuck', window.scrollY > 8);
    const back = $('.back-top');
    if (back) back.classList.toggle('is-shown', window.scrollY > 900);
  }

  /* --------------------------- session chrome ---------------------------- */

  const ACCOUNT_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

  function refreshChrome() {
    const btn = $('[data-account]');
    const u = window.Auth ? Auth.current() : null;
    if (btn) {
      if (u) {
        const initials = String(u.name || '?')
          .trim()
          .split(/\s+/)
          .map((w) => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
        btn.innerHTML = `<span class="avatar avatar--sm">${esc(initials)}</span>`;
        btn.setAttribute('data-authed', '1');
        btn.setAttribute('aria-label', `Account — ${u.name}`);
        btn.setAttribute('title', `${u.name} · ${u.role === 'admin' ? 'Admin' : 'Member'}`);
      } else {
        btn.innerHTML = ACCOUNT_SVG;
        btn.removeAttribute('data-authed');
        btn.setAttribute('aria-label', 'Account');
        btn.removeAttribute('title');
      }
    }
    const isAdmin = window.Auth ? Auth.isAdmin() : false;
    $$('[data-admin-link]').forEach((el) => (el.hidden = !isAdmin));

    /* keep menu counters honest when the admin edits the catalogue */
    if (window.DATA) {
      const setCount = (key, n) => {
        const el = $(`[data-menu-count="${key}"]`);
        if (el) el.textContent = String(n).padStart(2, '0');
      };
      setCount('all', DATA.products.length);
      DATA.categories.forEach((c) => setCount(c.id, DATA.products.filter((p) => p.category === c.id).length));
      setCount('journal', (DATA.journal || []).length);
    }
  }

  /* ------------------------------- init/bind ------------------------------ */

  function init() {
    renderCart();
    refreshChrome();
    headerScroll();
    window.addEventListener('scroll', headerScroll, { passive: true });

    /* the copyright never goes stale */
    const year = document.querySelector('[data-year]');
    if (year) year.textContent = new Date().getFullYear();

    const drawer = $('[data-layer="cart"]');
    if (drawer) drawer.setAttribute('aria-hidden', 'true');
    /* dialogs start collapsed for assistive tech, and the shortcut hint on
       Windows/Linux reads better as Ctrl K than ⌘K */
    Object.keys(TRIGGERS).forEach((k) => {
      const t = document.querySelector(TRIGGERS[k]);
      if (t) t.setAttribute('aria-expanded', 'false');
    });
    const isMac = /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent || '');
    if (!isMac) {
      const kbd = document.querySelector('.search-trigger kbd');
      if (kbd) kbd.textContent = 'Ctrl K';
      const trigger = document.querySelector('[data-open-search]');
      if (trigger) trigger.setAttribute('aria-label', 'Search (Ctrl K)');
    }

    /* delegated actions */
    document.addEventListener('click', (e) => {
      const t = e.target;

      const openCart = t.closest('[data-open-cart]');
      if (openCart) {
        e.preventDefault();
        setLayer('cart', true);
        return;
      }
      if (t.closest('[data-close-cart]')) {
        setLayer('cart', false);
        if (t.closest('a')) return; /* let hash navigation happen */
        return;
      }
      if (t.closest('[data-open-search]')) {
        e.preventDefault();
        setLayer('search', true);
        return;
      }
      if (t.closest('[data-close-search]')) {
        setLayer('search', false);
        return;
      }
      if (t.closest('[data-open-menu]')) {
        e.preventDefault();
        setLayer('menu', true);
        return;
      }
      if (t.closest('[data-close-menu]')) {
        setLayer('menu', false);
        return;
      }
      if (t.classList.contains('scrim')) {
        closeAll();
        return;
      }

      const add = t.closest('[data-add]');
      if (add) {
        e.preventDefault();
        const id = add.getAttribute('data-add');
        const p = Store.product(id);
        if (!p) return;
        const variant = p.colors[0].name;
        const cap = Store.stockCap(id);
        const before = Store.line(`${id}::${variant}`);
        const wasCapped = Boolean(before) && before.qty >= cap;
        if (!Store.add(id, 1)) {
          toast({ title: `${p.name} is out of stock`, sub: 'Everything we make comes back. Check the journal for restocks.' });
          return;
        }
        toast({
          title: p.name + ' added to bag',
          sub: wasCapped
            ? `That's all ${cap} we have in stock`
            : Store.money(p.price) + ' · ' + Store.count + ' item' + (Store.count === 1 ? '' : 's') + ' in bag',
          img: p.image,
          action: { label: 'View bag', href: '#/checkout' },
        });
        add.classList.add('is-added');
        const label = add.querySelector('span');
        if (label) {
          const prev = label.textContent;
          label.textContent = 'Added';
          setTimeout(() => {
            label.textContent = prev;
            add.classList.remove('is-added');
          }, 1400);
        }
        return;
      }

      const wish = t.closest('[data-wish]');
      if (wish) {
        e.preventDefault();
        const id = wish.getAttribute('data-wish');
        const on = Store.toggleWish(id);
        $$(`[data-wish="${id}"]`).forEach((b) => {
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', String(on));
        });
        const p = Store.product(id);
        toast({ title: on ? `${p.name} saved` : `${p.name} removed`, sub: on ? 'Added to your wishlist' : 'Removed from wishlist' });
        return;
      }

      const qty = t.closest('[data-qty]');
      if (qty) {
        const line = Store.line(qty.getAttribute('data-line-id'));
        if (line) Store.setQty(line.id, line.qty + Number(qty.getAttribute('data-qty')));
        return;
      }

      const rm = t.closest('[data-remove]');
      if (rm) {
        Store.remove(rm.getAttribute('data-remove'));
        return;
      }

      const toastAction = t.closest('[data-toast-action]');
      if (toastAction) {
        const href = toastAction.getAttribute('data-toast-action');
        if (href) location.hash = href.replace(/^#/, '');
        return;
      }

      const backTop = t.closest('.back-top');
      if (backTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (t.closest('[data-account]')) {
        e.preventDefault();
        location.hash = window.Auth && Auth.current() ? '#/account' : '#/login';
        return;
      }

      if (t.closest('[data-logout]')) {
        e.preventDefault();
        if (window.Auth) Auth.logout();
        refreshChrome();
        closeAll();
        toast({ title: 'Signed out', sub: 'Your bag and wishlist stay saved.' });
        if (location.hash && /^#\/(account|admin|login|register)/.test(location.hash)) location.hash = '#/';
        return;
      }
    });

    /* footer / inline newsletter forms */
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-newsfoot]');
      if (!form) return;
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((input.value || '').trim());
      if (!ok) {
        input.classList.add('is-invalid');
        input.focus();
        toast({ title: 'Check that address', sub: 'We need a valid email to send the code.' });
        return;
      }
      input.classList.remove('is-invalid');
      if (window.Subs) Subs.add(input.value.trim(), 'footer');
      const applied = !Store.promo && Boolean(DATA.promoCodes.FIRST10) && Store.applyPromo('FIRST10');
      const note = form.parentElement.querySelector('[data-news-note]');
      if (note) note.textContent = applied ? 'Thanks, FIRST10 is already in your bag.' : `Thanks, studio notes are on the way to ${input.value.trim()}.`;
      input.value = '';
      toast({
        title: 'You’re on the list',
        sub: applied ? 'FIRST10 applied, 10% off your first order.' : 'One letter a month, nothing else.',
      });
    });

    /* search input + keyboard */
    const input = $('.search__input');
    if (input) {
      input.addEventListener('input', () => searchResults(input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveSearchCursor(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveSearchCursor(-1);
        } else if (e.key === 'Enter') {
          const rows = $$('.search__result');
          const row = rows[searchCursor] || rows[0];
          if (row) {
            e.preventDefault();
            row.click();
          }
        }
      });
    }

    /* global keys */
    document.addEventListener('keydown', (e) => {
      const typing = /input|textarea|select/i.test((e.target.tagName || '').toLowerCase());
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setLayer('search', !layers.search);
        return;
      }
      if (e.key === 'Escape') closeAll();
      if (e.key === '/' && !typing) {
        e.preventDefault();
        setLayer('search', true);
      }
    });

    Store.subscribe((type) => {
      renderCart();
      if (type === 'wish') document.dispatchEvent(new CustomEvent('aether:wish'));
    });
  }

  window.UI = { $, $$, icon, stars, esc, productCard, toast, renderCart, setLayer, closeAll, catName, productUrl, init, headerScroll, refreshChrome };
})();
