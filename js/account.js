/* =========================================================================
   AETHER — auth pages & member account centre
   ========================================================================= */
(function () {
  'use strict';

  const icon = UI.icon;
  const esc = UI.esc;
  const money = (c) => Store.money(c);

  const STATUS_LABEL = {
    paid: 'Paid',
    packed: 'Packed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };
  window.STATUS_LABEL = STATUS_LABEL;

  const fmtDate = (ts) =>
    new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtTime = (ts) =>
    new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' +
    new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const initials = (name) =>
    String(name || '?')
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const safeNext = (next) => (next && /^\/(?!\/)/.test(next) ? next : '/');

  const COUNTRIES = ['United States', 'United Kingdom', 'Denmark', 'Germany', 'France', 'Netherlands', 'Japan', 'Australia', 'Canada'];

  function pwScore(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[a-zA-Z]/.test(pw) && /\d/.test(pw)) s++;
    if (pw.length >= 12) s++;
    if (/[^a-zA-Z0-9]/.test(pw)) s++;
    return Math.min(s, 4);
  }
  const PW_TEXT = ['', 'Weak, add numbers or length', 'Fair, getting better', 'Good, 8+ with letters & numbers', 'Strong'];

  function meterHTML() {
    return `<div class="pw-meter" data-meter data-score="0"><span></span><span></span><span></span><span></span></div>
    <span class="pw-hint" data-meter-text>8+ characters with a letter and a number.</span>`;
  }

  function authArt() {
    return `
    <aside class="auth__art" aria-hidden="true" data-reveal="scale">
      <img src="assets/img/leaf-shadow.jpg" alt="">
      <div class="auth__art-card">
        <span class="mono">Why members</span>
        <p>Order history, repair guides and a wishlist that follows you. One account, kept for decades.</p>
        <div class="auth__art-stats">
          <span>${icon('refresh')} 60-night trial</span>
        </div>
      </div>
    </aside>`;
  }

  function authTabs(active, next) {
    const q = next && next !== '/' ? `?next=${encodeURIComponent(next)}` : '';
    return `
    <div class="auth__tabs" role="tablist">
      <a class="auth__tab${active === 'login' ? ' is-active' : ''}" href="#/login${q}" role="tab">Sign in</a>
      <a class="auth__tab${active === 'register' ? ' is-active' : ''}" href="#/register${q}" role="tab">Create account</a>
    </div>`;
  }

  /* ================================ LOGIN ================================ */

  function login(params) {
    const next = safeNext(params.next);
    const q = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';

    const html = `
    <section class="auth">
      <div class="container auth__grid">
        <div class="auth__panel" data-reveal>
          <h1>Welcome <span class="accent">back.</span></h1>
          <p class="muted small" style="max-width:40ch">Order history, repair guides and everything you’ve saved.</p>
          ${authTabs('login', next)}
          <div class="auth__error" data-auth-err>${icon('alert') || ''}<span data-auth-err-text></span></div>

          <form class="stack stack-4" data-login novalidate>
            <label class="field">
              <span class="field__label">Email or username</span>
              <input class="input" name="ident" autocomplete="username" placeholder="you@studio.com" required data-validate="ident">
              <span class="field__error">Enter your email or username.</span>
            </label>
            <label class="field">
              <span class="field__label">Password</span>
              <span class="input-wrap">
                <input class="input" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required data-validate="pw">
                <button class="peek" type="button" data-peek aria-label="Show password">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </span>
              <span class="field__error">Enter your password.</span>
            </label>

            <div class="auth__meta">
              <label class="checkbox"><input type="checkbox" checked> <span>Keep me signed in</span></label>
              <button class="linkish" type="button" data-forgot>Forgot password?</button>
            </div>

            <button class="btn btn--primary btn--lg btn--block" type="submit">Sign in ${icon('arrowRight')}</button>
          </form>

          <p class="xs muted auth__fine">New here? <a href="#/register${q}">Create an account</a>.</p>
          <p class="xs muted auth__fine">Demo storefront: accounts live in this browser only.</p>
        </div>
        ${authArt()}
      </div>
    </section>`;

    return {
      html,
      title: 'Sign in — AETHER',
      mount(root) {
        if (Auth.current()) {
          location.hash = '#' + next;
          return;
        }
        const form = root.querySelector('[data-login]');
        const errBox = root.querySelector('[data-auth-err]');
        const errText = root.querySelector('[data-auth-err-text]');

        const showErr = (msg) => {
          errText.textContent = msg;
          errBox.classList.add('is-shown');
        };

        root.querySelector('[data-peek]').addEventListener('click', (e) => {
          const input = form.elements.password;
          const on = input.type === 'password';
          input.type = on ? 'text' : 'password';
          e.currentTarget.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
        });

        root.querySelector('[data-forgot]').addEventListener('click', () => {
          UI.toast({ title: 'Reset link sent', sub: 'Demo mode: password resets are simulated.' });
        });

        const validators = {
          ident: (v) => v.trim().length >= 3,
          pw: (v) => v.length >= 1,
        };
        const errOf = (input) => {
          const field = input.closest('.field');
          return field ? field.querySelector('.field__error') : null;
        };
        form.querySelectorAll('[data-validate]').forEach((input) => {
          const check = () => {
            const ok = validators[input.getAttribute('data-validate')](input.value);
            input.classList.toggle('is-invalid', !ok);
            const err = errOf(input);
            if (err) err.classList.toggle('is-shown', !ok);
            return ok;
          };
          input.addEventListener('blur', check);
          input.addEventListener('input', () => {
            if (input.classList.contains('is-invalid')) check();
            errBox.classList.remove('is-shown');
          });
        });

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const bad = Array.from(form.querySelectorAll('[data-validate]')).filter((i) => {
            const ok = validators[i.getAttribute('data-validate')](i.value);
            i.classList.toggle('is-invalid', !ok);
            const err = errOf(i);
            if (err) err.classList.toggle('is-shown', !ok);
            return !ok;
          });
          if (bad.length) return void bad[0].focus();

          const res = Auth.login(form.elements.ident.value, form.elements.password.value);
          if (!res.ok) return void showErr(res.error);
          UI.refreshChrome();
          UI.toast({
            title: `Welcome back, ${res.user.name.split(' ')[0]}`,
            sub: res.user.role === 'admin' ? 'Admin links are now live in the footer.' : null,
          });
          location.hash = '#' + next;
        });
      },
    };
  }

  /* =============================== REGISTER ============================== */

  function register(params) {
    const next = safeNext(params.next);
    const q = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';

    const html = `
    <section class="auth">
      <div class="container auth__grid">
        <div class="auth__panel" data-reveal>
          <h1>Create your <span class="accent">account.</span></h1>
          <p class="muted small" style="max-width:42ch">Track orders, save addresses, keep a wishlist; repair guides included.</p>
          ${authTabs('register', next)}
          <div class="auth__error" data-auth-err><span data-auth-err-text></span></div>

          <form class="stack stack-4" data-register novalidate>
            <div class="aform-grid">
              <label class="field span-2">
                <span class="field__label">Full name</span>
                <input class="input" name="name" autocomplete="name" placeholder="Ada Lovelace" required data-validate="name">
                <span class="field__error">Enter your full name (2+ characters).</span>
              </label>
              <label class="field">
                <span class="field__label">Username</span>
                <input class="input" name="username" autocomplete="username" placeholder="ada" required data-validate="username" autocapitalize="off" spellcheck="false">
                <span class="field__error">3–16 letters, numbers or underscores.</span>
              </label>
              <label class="field">
                <span class="field__label">Email</span>
                <input class="input" name="email" type="email" autocomplete="email" placeholder="you@studio.com" required data-validate="email">
                <span class="field__error">Enter a valid email address.</span>
              </label>
              <label class="field">
                <span class="field__label">Password</span>
                <span class="input-wrap">
                  <input class="input" name="password" type="password" autocomplete="new-password" placeholder="••••••••" required data-validate="password">
                  <button class="peek" type="button" data-peek aria-label="Show password">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </span>
                ${meterHTML()}
                <span class="field__error">8+ characters with a letter and a number.</span>
              </label>
              <label class="field">
                <span class="field__label">Confirm password</span>
                <input class="input" name="confirm" type="password" autocomplete="new-password" placeholder="••••••••" required data-validate="confirm">
                <span class="field__error">Passwords don’t match.</span>
              </label>
            </div>

            <label class="checkbox"><input type="checkbox" name="terms" required> <span>I agree to the terms, 60-night returns and the two-year warranty.</span></label>

            <button class="btn btn--primary btn--lg btn--block" type="submit">Create account ${icon('arrowRight')}</button>
          </form>

          <p class="xs muted auth__fine">Already have one? <a href="#/login${q}">Sign in instead.</a></p>
        </div>
        ${authArt()}
      </div>
    </section>`;

    return {
      html,
      title: 'Create account — AETHER',
      mount(root) {
        if (Auth.current()) {
          location.hash = '#' + next;
          return;
        }
        const form = root.querySelector('[data-register]');
        const errBox = root.querySelector('[data-auth-err]');
        const errText = root.querySelector('[data-auth-err-text]');
        const showErr = (msg) => {
          errText.textContent = msg;
          errBox.classList.add('is-shown');
        };

        root.querySelector('[data-peek]').addEventListener('click', (e) => {
          const input = form.elements.password;
          const on = input.type === 'password';
          input.type = on ? 'text' : 'password';
          e.currentTarget.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
        });

        const meter = root.querySelector('[data-meter]');
        const meterText = root.querySelector('[data-meter-text]');
        const validators = {
          name: (v) => Auth.rules.name(v),
          username: (v) => Auth.rules.username(String(v).toLowerCase()),
          email: (v) => Auth.rules.email(v),
          password: (v) => Auth.rules.password(v),
          confirm: (v) => v === form.elements.password.value && v.length > 0,
        };

        form.elements.password.addEventListener('input', () => {
          const s = pwScore(form.elements.password.value);
          meter.setAttribute('data-score', String(s));
          meterText.textContent = form.elements.password.value ? PW_TEXT[s] : '8+ characters with a letter and a number.';
          if (form.elements.confirm.value) validators.confirm(form.elements.confirm.value);
        });

        form.querySelectorAll('[data-validate]').forEach((input) => {
          const check = () => {
            const ok = validators[input.getAttribute('data-validate')](input.value);
            input.classList.toggle('is-invalid', !ok);
            const field = input.closest('.field');
            const err = field ? field.querySelector('.field__error') : null;
            if (err) err.classList.toggle('is-shown', !ok);
            return ok;
          };
          input.addEventListener('blur', check);
          input.addEventListener('input', () => {
            if (input.classList.contains('is-invalid')) check();
            errBox.classList.remove('is-shown');
          });
        });

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const bad = Array.from(form.querySelectorAll('[data-validate]')).filter((i) => !validators[i.getAttribute('data-validate')](i.value));
          bad.forEach((i) => {
            i.classList.add('is-invalid');
            const field = i.closest('.field');
            const err = field ? field.querySelector('.field__error') : null;
            if (err) err.classList.add('is-shown');
          });
          if (bad.length) return void bad[0].focus();
          if (!form.elements.terms.checked) return void showErr('Please accept the terms to continue.');

          const res = Auth.register({
            name: form.elements.name.value,
            username: form.elements.username.value,
            email: form.elements.email.value,
            password: form.elements.password.value,
            confirm: form.elements.confirm.value,
          });
          if (!res.ok) return void showErr(res.error);
          UI.refreshChrome();
          UI.toast({ title: 'Account created', sub: `Signed in as @${res.user.username}.` });
          location.hash = '#' + next;
        });
      },
    };
  }

  /* =============================== FORBIDDEN ============================= */

  function forbidden() {
    return {
      title: 'Admins only — AETHER',
      html: `${crumbsLocal([{ label: '403' }])}
      <div class="container"><div class="empty-state" style="margin-block:clamp(30px,6vw,80px)">
        <div class="cart-empty__icon">${icon('lock')}</div>
        <h1 class="h2">Admins only <span class="accent">in here.</span></h1>
        <p class="muted" style="max-width:46ch">Your account doesn’t have administrator access. If you think that’s wrong, ask a studio admin to upgrade your role.</p>
        <div class="row row-4 wrap center">
          <a class="btn btn--primary" href="#/account">Back to my account ${icon('arrowRight')}</a>
          <a class="btn btn--ghost" href="#/">Back home</a>
        </div>
      </div></div>`,
    };
  }

  function crumbsLocal(trail) {
    return `<nav class="container crumbs" aria-label="Breadcrumb">
      <a href="#/">Home</a>${trail
        .map(
          (t) =>
            `${icon('chevronRight')}${
              t.href ? `<a href="${t.href}">${esc(t.label)}</a>` : `<span aria-current="page">${esc(t.label)}</span>`
            }`
        )
        .join('')}
    </nav>`;
  }

  /* ================================ ACCOUNT ============================== */

  function account(params) {
    const u = Auth.current();
    if (!u) {
      return {
        title: 'Sign in — AETHER',
        html: `<div class="container"><p class="muted" style="padding-block:70px">Redirecting to sign in…</p></div>`,
        mount() {
          location.hash = '#/login?next=%2Faccount';
        },
      };
    }

    const orders = Orders.forUser(u);
    const spent = orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((n, o) => n + o.total, 0);
    const wished = Store.wishlist.filter((id) => Store.product(id)).length;
    const tabs = [
      ['profile', 'Profile', 'user', null],
      ['orders', 'Orders', 'package', orders.length],
      ['wishlist', 'Wishlist', 'heart', wished],
      ['addresses', 'Addresses', 'globe', u.addresses.length],
      ['security', 'Security', 'lock', null],
    ];
    const active = tabs.some((t) => t[0] === params.tab) ? params.tab : 'profile';
    const firstName = u.name.split(' ')[0];

    const html = `
    ${crumbsLocal([{ label: 'Account' }])}
    <header class="container page-head">
      <div class="page-head__inner">
        <div class="page-head__row acct__head">
          <h1 data-reveal style="--d:60ms">Hi, ${esc(firstName)}<span class="accent">.</span></h1>
          <span class="row row-4 wrap" data-reveal style="--d:110ms">
            ${u.role === 'admin' ? `<a class="btn btn--ghost btn--sm" href="#/admin">${icon('shield')} Admin dashboard</a>` : ''}
            <button class="btn btn--ghost btn--sm" data-logout>Sign out</button>
          </span>
        </div>
      </div>
    </header>

    <div class="container acct">
      <nav class="acct__nav" aria-label="Account sections">
        ${tabs
          .map(
            ([id, label, ic, count]) => `
          <button class="acct__tab${active === id ? ' is-active' : ''}" data-acct-tab="${id}"${active === id ? ' aria-current="true"' : ''}>
            <span class="acct__tab-label">${icon(ic)} ${label}</span>
            ${count === null ? '' : `<span class="count" data-tabcount="${id}">${count}</span>`}
          </button>`
          )
          .join('')}
      </nav>

      <div class="acct__panels">
        ${panelProfile(u, orders.length, spent, wished, active)}
        ${panelOrders(u, orders, active)}
        ${panelWishlist(active)}
        ${panelAddresses(u, active)}
        ${panelSecurity(u, active)}
      </div>
    </div>`;

    return {
      html,
      title: 'My account — AETHER',
      mount(root) {
        /* -------- tabs -------- */
        const panels = root.querySelectorAll('[data-panel]');
        root.querySelectorAll('[data-acct-tab]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-acct-tab');
            root.querySelectorAll('[data-acct-tab]').forEach((b) => {
              const on = b === btn;
              b.classList.toggle('is-active', on);
              if (on) b.setAttribute('aria-current', 'true');
              else b.removeAttribute('aria-current');
            });
            panels.forEach((p) => (p.hidden = p.getAttribute('data-panel') !== id));
          });
        });

        /* -------- profile -------- */
        const pf = root.querySelector('[data-profile]');
        if (pf) {
          pf.addEventListener('submit', (e) => {
            e.preventDefault();
            const res = Auth.updateProfile({
              name: pf.elements.name.value,
              username: pf.elements.username.value,
              email: pf.elements.email.value,
              phone: pf.elements.phone.value,
            });
            const msg = root.querySelector('[data-profile-msg]');
            if (!res.ok) {
              msg.textContent = res.error;
              msg.style.color = '#c0392b';
              return;
            }
            msg.textContent = 'Saved just now.';
            msg.style.color = 'var(--ok)';
            UI.refreshChrome();
            UI.toast({ title: 'Profile updated', sub: 'Checkout prefill updated.' });
            const card = root.querySelector('.idcard__name');
            if (card) card.textContent = res.user.name;
          });
        }

        /* -------- wishlist live updates -------- */
        const onWish = () => {
          const panel = root.querySelector('[data-panel="wishlist"]');
          if (!panel) {
            document.removeEventListener('aether:wish', onWish);
            return;
          }
          const list = Store.wishlist.map((id) => Store.product(id)).filter(Boolean);
          const grid = panel.querySelector('[data-wishgrid]');
          const empty = panel.querySelector('[data-wishempty]');
          if (grid) grid.innerHTML = list.map((p, i) => UI.productCard(p, i)).join('');
          if (empty) empty.hidden = list.length > 0;
          const c = root.querySelector('[data-tabcount="wishlist"]');
          if (c) c.textContent = String(list.length);
          const wc = panel.querySelector('[data-wish-count]');
          if (wc) wc.textContent = `${list.length} saved`;
        };
        document.addEventListener('aether:wish', onWish);

        /* -------- reorder -------- */
        root.querySelectorAll('[data-reorder]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const o = Orders.byId(btn.getAttribute('data-reorder'));
            if (!o) return;
            let added = 0;
            let skipped = 0;
            o.items.forEach((it) => {
              if (Store.add(it.productId || it.id, it.qty, it.color)) added++;
              else skipped++;
            });
            if (!added) {
              UI.toast({ title: 'Everything is out of stock', sub: `Nothing from ${o.id} could be added.` });
              return;
            }
            UI.toast({
              title: `${added} item${added === 1 ? '' : 's'} back in your bag`,
              sub: skipped ? `${skipped} skipped · out of stock` : `From order ${o.id}`,
              action: { label: 'Checkout', href: '#/checkout' },
            });
          });
        });

        /* -------- cancel an order that hasn't shipped yet -------- */
        root.querySelectorAll('[data-cancel-order]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-cancel-order');
            if (btn.dataset.armed !== '1') {
              /* two-step confirm instead of a modal: one slip can't cancel */
              btn.dataset.armed = '1';
              btn.textContent = 'Confirm cancel';
              btn.classList.add('is-armed');
              setTimeout(() => {
                if (btn.isConnected && btn.dataset.armed === '1') {
                  btn.dataset.armed = '';
                  btn.textContent = 'Cancel order';
                  btn.classList.remove('is-armed');
                }
              }, 4000);
              return;
            }
            const o = Orders.setStatus(id, 'cancelled');
            if (!o) return;
            UI.toast({
              title: `Order ${id} cancelled`,
              sub: 'Nothing was charged. Any pre-auth drops within 3–5 days.',
            });
            AETHER.render();
          });
        });

        /* -------- wishlist: move everything into the bag -------- */
        const wishAll = root.querySelector('[data-wish-addall]');
        if (wishAll)
          wishAll.addEventListener('click', () => {
            let added = 0;
            let skipped = 0;
            Store.wishlist.slice().forEach((id) => {
              if (Store.add(id, 1)) added++;
              else skipped++;
            });
            if (!added) {
              UI.toast({ title: 'Nothing could be added', sub: 'Saved items are out of stock right now.' });
              return;
            }
            UI.toast({
              title: `${added} item${added === 1 ? '' : 's'} added to bag`,
              sub: skipped ? `${skipped} skipped · out of stock` : `Bag total ${Store.money(Store.subtotal())}`,
              action: { label: 'Checkout', href: '#/checkout' },
            });
            setTimeout(() => UI.setLayer('cart', true), 420);
          });

        /* -------- addresses -------- */
        bindAddresses(root, u);

        /* -------- security -------- */
        const sf = root.querySelector('[data-pwform]');
        if (sf) {
          const meter = sf.querySelector('[data-meter]');
          const meterText = sf.querySelector('[data-meter-text]');
          sf.elements.next.addEventListener('input', () => {
            const s = pwScore(sf.elements.next.value);
            if (meter) meter.setAttribute('data-score', String(s));
            if (meterText) meterText.textContent = sf.elements.next.value ? PW_TEXT[s] : '8+ characters with a letter and a number.';
          });
          sf.addEventListener('submit', (e) => {
            e.preventDefault();
            const err = sf.querySelector('[data-pw-err]');
            const fail = (m) => {
              err.textContent = m;
              err.classList.add('is-shown');
            };
            err.classList.remove('is-shown');
            if (sf.elements.confirm.value !== sf.elements.next.value)
              return void fail('New passwords don’t match.');
            const res = Auth.changePassword(sf.elements.current.value, sf.elements.next.value);
            if (!res.ok) return void fail(res.error);
            sf.reset();
            if (meter) meter.setAttribute('data-score', '0');
            UI.toast({ title: 'Password updated', sub: 'Use it the next time you sign in.' });
          });
        }
      },
    };
  }

  /* ------------------------------ panels -------------------------------- */

  function panelProfile(u, orderCount, spent, wished, active) {
    return `
    <div class="acct__panel" data-panel="profile"${active === 'profile' ? '' : ' hidden'}>
      <div class="idcard">
        <span class="avatar-lg">${esc(initials(u.name))}</span>
        <div class="idcard__body">
          <span class="idcard__name">${esc(u.name)}</span>
          <span class="idcard__meta"><span>@${esc(u.username)}</span><span>${esc(u.email)}</span></span>
        </div>
        <div class="idcard__side">
          <span class="role-badge${u.role === 'admin' ? '' : ' role-badge--muted'}">${u.role === 'admin' ? 'Administrator' : 'Member'}</span>
          <span class="xs muted">Since ${fmtDate(u.createdAt)}</span>
        </div>
      </div>

      <div class="acct-stats">
        <div class="acct-stat"><b data-count="${orderCount}">0</b><span>orders placed</span></div>
        <div class="acct-stat"><b data-count="${Math.round(spent / 100)}" data-prefix="$">$0</b><span>spent with AETHER</span></div>
        <div class="acct-stat"><b data-count="${wished}">0</b><span>objects saved</span></div>
      </div>

      <div class="panel-card">
        <div class="panel-card__head">
          <h3>Profile details</h3>
          <span class="xs muted">Used to prefill checkout</span>
        </div>
        <form class="stack stack-4" data-profile novalidate>
          <div class="aform-grid">
            <label class="field"><span class="field__label">Full name</span>
              <input class="input" name="name" value="${esc(u.name)}" autocomplete="name" required></label>
            <label class="field"><span class="field__label">Username</span>
              <input class="input" name="username" value="${esc(u.username)}" autocomplete="username" autocapitalize="off" required></label>
            <label class="field"><span class="field__label">Email</span>
              <input class="input" name="email" type="email" value="${esc(u.email)}" autocomplete="email" required></label>
            <label class="field"><span class="field__label">Phone <span class="muted" style="font-weight:400">· optional</span></span>
              <input class="input" name="phone" type="tel" value="${esc(u.phone || '')}" autocomplete="tel" placeholder="+1 555 0100"></label>
          </div>
          <div class="row row-4 wrap">
            <button class="btn btn--primary" type="submit">Save changes</button>
            <span class="xs muted" data-profile-msg></span>
          </div>
        </form>
      </div>
    </div>`;
  }

  const FLOW = ['paid', 'packed', 'shipped', 'delivered'];

  function orderSteps(o) {
    const last = (o.history || []).slice(-1)[0];
    if (o.status === 'cancelled' || o.status === 'refunded') {
      return `<div class="osteps osteps--dead">
        <span class="st st--${o.status}">${esc(STATUS_LABEL[o.status] || o.status)}</span>
        <span class="xs muted">Updated ${fmtTime(last ? last.at : o.placedAt)}</span>
      </div>`;
    }
    const idx = FLOW.indexOf(o.status);
    /* delivered is a finished state — the last step is complete, not "now" */
    const finished = o.status === 'delivered';
    const dateOf = (s) => {
      const h = (o.history || []).find((x) => x.status === s);
      return h ? fmtDate(h.at) : '';
    };
    return `<ol class="osteps">
      ${FLOW.map((s, i) => {
        const done = i < idx || (finished && i === idx);
        const cls = done ? 'is-done' : i === idx ? 'is-now' : '';
        const when = dateOf(s) || (i <= idx ? '…' : '');
        return `<li class="ostep ${cls}">
          <span class="ostep__dot">${done ? icon('check') : ''}</span>
          <span class="ostep__t">${STATUS_LABEL[s] || s}</span>
          <span class="ostep__d">${when}</span>
        </li>`;
      }).join('')}
    </ol>`;
  }

  function panelOrders(u, orders, active) {
    const rows = orders.length
      ? orders
          .map((o) => {
            const live = o.items.slice(0, 4);
            return `
          <div class="order-block">
            <div class="orow">
              <div>
                <div class="orow__id">${esc(o.id)}</div>
                <div class="orow__date">${fmtDate(o.placedAt)} · ${o.method === 'express' ? 'Express' : 'Standard'} · ${o.payment === 'cod' ? 'Cash on delivery' : 'Card'} · ${o.items.reduce((n, i) => n + i.qty, 0)} item${o.items.reduce((n, i) => n + i.qty, 0) === 1 ? '' : 's'}${
                  o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'refunded'
                    ? ` · <b style="color:var(--ink-2)">arrives ${Store.etaLabel(o.method, new Date(o.placedAt))}</b>`
                    : ''
                }</div>
              </div>
              <div class="orow__thumbs">
                ${live.map((it) => `<img src="${esc(it.image)}" alt="${esc(it.name)}" loading="lazy">`).join('')}
                ${o.items.length > 4 ? `<span class="orow__more">+${o.items.length - 4}</span>` : ''}
              </div>
              <span class="st st--${o.status}">${STATUS_LABEL[o.status] || o.status}</span>
              <div class="orow__actions">
                <span class="orow__total">${money(o.total)}</span>
                <a class="abtn abtn--sm" href="#/track?id=${encodeURIComponent(o.id)}">Track</a>
                <button class="abtn abtn--sm" data-reorder="${esc(o.id)}">Reorder</button>
                ${
                  o.status === 'paid' || o.status === 'packed'
                    ? `<button class="abtn abtn--sm abtn--danger" data-cancel-order="${esc(o.id)}">Cancel order</button>`
                    : ''
                }
              </div>
            </div>
            <details class="oder">
              <summary>Details</summary>
              <div class="oder__body">
                <div class="oitems">
                  ${o.items
                    .map(
                      (it) => `
                    <div class="oitem">
                      <img src="${esc(it.image)}" alt="">
                      <div><b>${esc(it.name)}</b><div class="xs">${esc(it.color)} · Qty ${it.qty}</div></div>
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
                  <div class="strong"><span>Total</span><span>${money(o.total)}</span></div>
                </div>
                ${orderSteps(o)}
                <ul class="otimeline">
                  ${(o.history || [{ status: o.status, at: o.placedAt }])
                    .map(
                      (h) =>
                        `<li><span>${STATUS_LABEL[h.status] || h.status}</span><span class="tl-when">${fmtTime(h.at)}</span></li>`
                    )
                    .join('')}
                </ul>
              </div>
            </details>
          </div>`;
          })
          .join('')
      : `<div class="aempty">
          ${icon('package')}
          <p>No orders yet. Receipts, tracking and one-click reorders land here.</p>
          <a class="btn btn--primary btn--sm" href="#/shop">Start with the best sellers ${icon('arrowRight')}</a>
        </div>`;

    return `
    <div class="acct__panel" data-panel="orders"${active === 'orders' ? '' : ' hidden'}>
      <div class="panel-card">
        <div class="panel-card__head">
          <h3>Your orders</h3>
          <span class="xs muted">${orders.length} order${orders.length === 1 ? '' : 's'} · lifetime</span>
        </div>
        ${rows}
      </div>
    </div>`;
  }

  function panelWishlist(active) {
    const list = Store.wishlist.map((id) => Store.product(id)).filter(Boolean);
    return `
    <div class="acct__panel" data-panel="wishlist"${active === 'wishlist' ? '' : ' hidden'}>
      <div class="panel-card">
        <div class="panel-card__head">
          <h3>Saved objects</h3>
          <span class="row row-3">
            <span class="xs muted" data-wish-count>${list.length} saved</span>
            ${
              list.length
                ? `<button class="abtn abtn--sm abtn--primary" data-wish-addall>${icon('bag')} Add all to bag</button>`
                : ''
            }
          </span>
        </div>
        <div class="grid-products grid-products--4" data-wishgrid>${list.map((p, i) => UI.productCard(p, i)).join('')}</div>
        <div class="aempty" data-wishempty${list.length ? ' hidden' : ''}>
          ${icon('heart')}
          <p>Not saved yet. Hearts sit on every product card.</p>
          <a class="btn btn--primary btn--sm" href="#/shop">Browse the collection ${icon('arrowRight')}</a>
        </div>
      </div>
    </div>`;
  }

  function panelAddresses(u, active) {
    const list = u.addresses || [];
    const cards = list.length
      ? list
          .map(
            (a, i) => `
        <div class="addr${a.default ? ' is-default' : ''}">
          <span class="addr__label">${esc(a.label || 'Address')}${a.default ? '<span class="addr__tag">Default</span>' : ''}</span>
          <span class="addr__text">${esc(a.line)}<br>${esc(a.city)} ${esc(a.zip)}<br>${esc(a.country)}</span>
          <div class="addr__row">
            <button class="linkish" data-addr-edit="${i}">Edit</button>
            ${a.default ? '' : `<button class="linkish" data-addr-default="${i}">Make default</button>`}
            <button class="linkish is-danger" data-addr-del="${i}">Remove</button>
          </div>
        </div>`
          )
          .join('')
      : `<div class="aempty" style="grid-column:1/-1;padding:26px 10px">
          ${icon('globe')}<p>No saved addresses. Add one and checkout stops asking.</p>
        </div>`;

    return `
    <div class="acct__panel" data-panel="addresses"${active === 'addresses' ? '' : ' hidden'}>
      <div class="panel-card">
        <div class="panel-card__head">
          <h3>Saved addresses</h3>
          <button class="abtn abtn--sm abtn--primary" data-addr-new>${icon('plus')} Add address</button>
        </div>
        <div class="addr-grid" data-addr-grid>${cards}</div>
        <form class="aform" data-addr-form hidden novalidate>
          <div class="aform-err" data-addr-err></div>
          <div class="aform-grid">
            <label class="field"><span class="field__label">Label</span>
              <input class="input" name="label" placeholder="Home" value="Home"></label>
            <label class="field"><span class="field__label">Country</span>
              <select class="select" name="country">${COUNTRIES.map((c) => `<option>${c}</option>`).join('')}</select></label>
            <label class="field span-2"><span class="field__label">Street address</span>
              <input class="input" name="line" placeholder="Strandgade 14, 2nd floor" required></label>
            <label class="field"><span class="field__label">City</span>
              <input class="input" name="city" placeholder="Copenhagen" required></label>
            <label class="field"><span class="field__label">Postal code</span>
              <input class="input" name="zip" placeholder="1401" required></label>
          </div>
          <label class="checkbox"><input type="checkbox" name="default" checked> <span>Use this as my default address</span></label>
          <div class="row row-4">
            <button class="btn btn--primary btn--sm" type="submit">Save address</button>
            <button class="btn btn--ghost btn--sm" type="button" data-addr-cancel>Cancel</button>
          </div>
        </form>
      </div>
    </div>`;
  }

  function panelSecurity(u, active) {
    const s = Auth.session();
    const expires = s ? new Date(s.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    return `
    <div class="acct__panel" data-panel="security"${active === 'security' ? '' : ' hidden'}>
      <div class="panel-card">
        <div class="panel-card__head"><h3>Change password</h3><span class="xs muted">8+ characters, letter &amp; number</span></div>
        <form class="aform" data-pwform novalidate>
          <div class="aform-err" data-pw-err></div>
          <div class="aform-grid">
            <label class="field span-2"><span class="field__label">Current password</span>
              <input class="input" name="current" type="password" autocomplete="current-password" required></label>
            <label class="field"><span class="field__label">New password</span>
              <input class="input" name="next" type="password" autocomplete="new-password" required>
              ${meterHTML()}</label>
            <label class="field"><span class="field__label">Confirm new password</span>
              <input class="input" name="confirm" type="password" autocomplete="new-password" required></label>
          </div>
          <div class="row row-4"><button class="btn btn--primary" type="submit">Update password</button></div>
        </form>
      </div>

      <div class="panel-card">
        <div class="panel-card__head"><h3>Session</h3></div>
        <div class="stack stack-2 small">
          <div class="row row-4" style="justify-content:space-between">
            <span class="muted">This device</span><span>Signed in · expires ${expires}</span>
          </div>
          <div class="row row-4" style="justify-content:space-between">
            <span class="muted">Role</span><span>${u.role === 'admin' ? 'Administrator' : 'Customer'}</span>
          </div>
          <div class="row row-4" style="justify-content:space-between">
            <span class="muted">Account created</span><span>${fmtDate(u.createdAt)}</span>
          </div>
          <div style="margin-top:10px"><button class="btn btn--ghost btn--sm" data-logout>Sign out of this device</button></div>
        </div>
      </div>
    </div>`;
  }

  /* --------------------------- address binding --------------------------- */

  function bindAddresses(root, u) {
    const form = root.querySelector('[data-addr-form]');
    const grid = root.querySelector('[data-addr-grid]');
    if (!form || !grid) return;
    let editing = -1;

    const repaint = () => {
      Auth.saveAddresses(u.addresses);
      const panel = form.closest('.panel-card');
      const wrap = document.createElement('div');
      wrap.innerHTML = panelAddresses(u, 'addresses');
      const fresh = wrap.querySelector('.addr-grid');
      if (fresh) grid.innerHTML = fresh.innerHTML;
      form.hidden = true;
      editing = -1;
      form.reset();
      bindRowActions();
    };

    const openForm = (idx) => {
      editing = idx;
      const err = form.querySelector('[data-addr-err]');
      err.classList.remove('is-shown');
      if (idx > -1) {
        const a = u.addresses[idx];
        form.elements.label.value = a.label || 'Home';
        form.elements.line.value = a.line || '';
        form.elements.city.value = a.city || '';
        form.elements.zip.value = a.zip || '';
        form.elements.country.value = a.country || COUNTRIES[0];
        form.elements.default.checked = Boolean(a.default);
      } else {
        form.reset();
        form.elements.label.value = 'Home';
        form.elements.default.checked = u.addresses.length === 0;
      }
      form.hidden = false;
      form.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      form.elements.line.focus();
    };

    const bindRowActions = () => {
      grid.querySelectorAll('[data-addr-edit]').forEach((b) =>
        b.addEventListener('click', () => openForm(Number(b.getAttribute('data-addr-edit'))))
      );
      grid.querySelectorAll('[data-addr-default]').forEach((b) =>
        b.addEventListener('click', () => {
          const i = Number(b.getAttribute('data-addr-default'));
          u.addresses.forEach((a, j) => (a.default = j === i));
          repaint();
          UI.toast({ title: 'Default address updated', sub: 'Checkout will use this one.' });
        })
      );
      grid.querySelectorAll('[data-addr-del]').forEach((b) =>
        b.addEventListener('click', () => {
          const i = Number(b.getAttribute('data-addr-del'));
          const wasDefault = u.addresses[i] && u.addresses[i].default;
          u.addresses.splice(i, 1);
          if (wasDefault && u.addresses.length) u.addresses[0].default = true;
          repaint();
          UI.toast({ title: 'Address removed' });
        })
      );
    };
    bindRowActions();

    root.querySelector('[data-addr-new]').addEventListener('click', () => openForm(-1));
    root.querySelector('[data-addr-cancel]').addEventListener('click', () => {
      form.hidden = true;
      editing = -1;
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = form.querySelector('[data-addr-err]');
      const line = form.elements.line.value.trim();
      const city = form.elements.city.value.trim();
      const zip = form.elements.zip.value.trim();
      if (!line || !city || !zip) {
        err.textContent = 'Street, city and postal code are all required.';
        err.classList.add('is-shown');
        return;
      }
      const entry = {
        label: form.elements.label.value.trim() || 'Address',
        line,
        city,
        zip,
        country: form.elements.country.value,
        default: form.elements.default.checked,
      };
      if (entry.default) u.addresses.forEach((a) => (a.default = false));
      if (editing > -1) {
        entry.default = entry.default || u.addresses[editing].default;
        u.addresses[editing] = entry;
      } else {
        u.addresses.push(entry);
      }
      if (!u.addresses.some((a) => a.default) && u.addresses.length) u.addresses[0].default = true;
      repaint();
      UI.toast({ title: editing > -1 ? 'Address updated' : 'Address saved', sub: 'Ready for checkout.' });
    });
  }

  /* shared with the public tracking view (js/views.js) */
  window.OrderKit = { steps: orderSteps, label: (s) => STATUS_LABEL[s] || s, fmtDate, fmtTime, STATUS_LABEL };

  Object.assign(window.Views, { login, register, account, forbidden });
})();
