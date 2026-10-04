/* =========================================================================
   Arena — app shell: router, reveal, motion, boot
   ========================================================================= */
(function () {
  'use strict';

  const app = () => document.getElementById('app');

  const SITE = 'https://aether-store-omega.vercel.app';
  /* routes that hold personal data and must never be indexed */
  const PRIVATE_ROUTES = ['account', 'admin', 'checkout', 'login', 'register', 'order-confirmed'];
  const DEFAULT_DESC = (document.head.querySelector('meta[name="description"]') || {}).content || '';
  const DEFAULT_OG = (document.head.querySelector('meta[property="og:image"]') || {}).content || '';

  const setMeta = (sel, value) => {
    const el = document.head.querySelector(sel);
    if (el) el.setAttribute('content', value);
  };

  /* keep search + social metadata in step with the route */
  function syncHead(parts, view) {
    const head = parts[0] || 'home';
    let desc = view.desc || DEFAULT_DESC;
    if (desc.length > 160) desc = desc.slice(0, 157).replace(/\s+\S*$/, '') + '…';
    const hash = location.hash || '';
    const canonical = !hash || hash === '#/' ? SITE + '/' : SITE + '/' + hash;
    const noindex = PRIVATE_ROUTES.includes(head) || view.noindex === true;
    /* social crawlers will not render SVG, so only swap in raster images */
    const raster = view.image && /\.(png|jpe?g|webp|avif)$/i.test(view.image);
    const image = raster ? SITE + '/' + view.image : DEFAULT_OG;
    setMeta('meta[name="description"]', desc);
    setMeta('meta[name="robots"]', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('meta[property="og:title"]', view.title || 'Arena');
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:url"]', canonical);
    setMeta('meta[property="og:image"]', image);
    setMeta('meta[name="twitter:title"]', view.title || 'Arena');
    setMeta('meta[name="twitter:description"]', desc);
    setMeta('meta[name="twitter:image"]', image);
    const link = document.head.querySelector('link[rel="canonical"]');
    if (link) link.setAttribute('href', canonical);
  }

  /* ------------------------------- router -------------------------------- */

  function parseHash() {
    const raw = (location.hash || '#/').replace(/^#/, '') || '/';
    const [path, query] = raw.split('?');
    return {
      parts: path.split('/').filter(Boolean),
      params: Object.fromEntries(new URLSearchParams(query || '')),
    };
  }

  /* redirect helper used by route guards — returns a stub view */
  function go(hash) {
    setTimeout(() => {
      if (location.hash !== hash) location.hash = hash;
    }, 30);
    return {
      title: 'Redirecting — Arena',
      html: '<div class="container"><p class="muted" style="padding-block:70px">Redirecting…</p></div>',
    };
  }

  function resolve(parts, params) {
    const [head, arg] = parts;
    if (!head) return Views.home();
    switch (head) {
      case 'shop':
        return Views.shop(params);
      case 'product':
        return arg ? Views.product(arg) : Views.notFound();
      case 'checkout':
        return Views.checkout();
      case 'order-confirmed':
        return Views.confirmed(params);
      case 'track':
        return Views.track ? Views.track(params) : Views.notFound();
      case 'journal':
        return Views.journal ? Views.journal() : Views.notFound();
      case 'about':
        return Views.about ? Views.about() : Views.notFound();
      case 'login':
        return Views.login(params);
      case 'register':
        return Views.register(params);
      case 'account':
        if (!Auth.current()) {
          const qs = new URLSearchParams(params).toString();
          return go('#/login?next=' + encodeURIComponent('/account' + (qs ? '?' + qs : '')));
        }
        return Views.account(params);
      case 'admin': {
        const allowed = ['', 'products', 'orders', 'customers', 'subscribers', 'settings'];
        const sub = arg || '';
        if (!allowed.includes(sub)) return Views.notFound();
        if (!Auth.current()) return go('#/login?next=' + encodeURIComponent('/admin' + (sub ? '/' + sub : '')));
        if (!Auth.isAdmin()) return Views.forbidden();
        return Views.admin(sub, params);
      }
      default:
        return Views.notFound();
    }
  }

  let lastKey = null;
  let lastPath = null;

  function renderFailure(host, err) {
    if (!host) return;
    console.error('[arena] render failed:', err);
    document.title = 'Something came loose — Arena';
    document.body.classList.remove('is-admin');
    host.innerHTML = `
      <div class="container">
        <div class="done">
          <span class="done__mark" style="background:var(--accent)">${UI.icon('alert')}</span>
          <h1 class="done__title">Something came <span class="accent">loose.</span></h1>
          <p class="lede" style="text-align:center">The page didn’t finish loading — nothing in your bag or account was lost.</p>
          <div class="row row-4 wrap center">
            <button class="btn btn--primary btn--lg" data-retry>Try again</button>
            <a class="btn btn--ghost btn--lg" href="#/">Back home</a>
          </div>
        </div>
      </div>`;
    host.classList.add('page-enter');
    const retry = host.querySelector('[data-retry]');
    if (retry) retry.addEventListener('click', () => render());
    try {
      UI.refreshChrome();
    } catch (e) {
      /* chrome is irrelevant when the page itself failed */
    }
  }

  function render() {
    const { parts, params } = parseHash();
    /* release live subscriptions owned by the outgoing view */
    if (window.Views && Views.unmountLive) Views.unmountLive();
    /* structured data belongs to the view that rendered it */
    document.querySelectorAll('script[data-view-ld]').forEach((s) => s.remove());
    let view;
    try {
      view = resolve(parts, params);
    } catch (err) {
      renderFailure(app(), err);
      return;
    }
    const host = app();
    if (!host) return;

    UI.closeAll();

    try {
      host.classList.remove('page-enter');
      void host.offsetWidth;
      host.innerHTML = view.html;
      host.classList.add('page-enter');
      host.setAttribute('tabindex', '-1');

      document.title = view.title || 'Arena';
      syncHead(parts, view);
      document.body.classList.toggle('is-admin', parts[0] === 'admin');
      if (view.mount) view.mount(host);
      observeReveal(host);
      observeCounters(host);
      syncNav(parts);
      bindInternalScroll();
    } catch (err) {
      renderFailure(host, err);
      return;
    }

    const key = parts.join('/') + JSON.stringify(params);
    const pathChanged = lastKey !== null && lastPath !== parts.join('/');
    if (lastKey !== null) window.scrollTo({ top: 0, behavior: 'auto' });
    /* keyboard + screen-reader users start at the new page, but only on real
       route changes so refining filters never steals focus from the toolbar */
    if (pathChanged) host.focus({ preventScroll: true });
    lastKey = key;
    lastPath = parts.join('/');

    /* re-render cart chrome in case the drawer is open behind us */
    UI.renderCart();
    UI.refreshChrome();

    /* deep link: index.html?to=<element-id> or #/route?to=<element-id> */
    const to = new URLSearchParams(location.search).get('to') || params.to;
    if (to) {
      let jumped = false;
      const jump = () => {
        if (jumped) return;
        const target = document.getElementById(to);
        if (!target) return;
        jumped = true;
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
      };
      requestAnimationFrame(jump);
      setTimeout(jump, 250); /* frames can stall — deep links must still land */
    }
  }

  function syncNav(parts) {
    const head = parts[0] || '';
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const route = a.getAttribute('data-nav');
      const active =
        (route === 'shop' && head === 'shop' && !parts[1]) ||
        (route === 'product' && head === 'product') ||
        (route === 'journal' && head === 'journal');
      a.classList.toggle('is-active', Boolean(active));
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function bindInternalScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      /* router links and the skip link keep native behaviour; binding them
         here would stack another listener on the static header per render */
      if (href === '#' || href === '#top' || href === '#app' || href.startsWith('#/')) return;
      a.addEventListener('click', (e) => {
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ---------------------------- reveal observer --------------------------- */

  const revealObserver =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                revealObserver.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
        )
      : null;

  function observeReveal(scope) {
    const els = (scope || document).querySelectorAll('[data-reveal]');
    if (!revealObserver) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    els.forEach((el) => {
      if (el.classList.contains('is-in')) return;
      /* anything already inside the first screen shows immediately */
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) {
        requestAnimationFrame(() => el.classList.add('is-in'));
        setTimeout(() => el.classList.add('is-in'), 200); /* safety if frames stall */
      } else {
        revealObserver.observe(el);
      }
    });
    /* fallback: if IntersectionObserver never delivers (stalled webview), show what is on screen */
    setTimeout(() => {
      els.forEach((el) => {
        if (el.classList.contains('is-in')) return;
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
      });
    }, 1100);
  }

  /* ------------------------------ count-up -------------------------------- */

  function observeCounters(scope) {
    const els = (scope || document).querySelectorAll('[data-count]');
    if (!els.length) return;

    const run = (el) => {
      if (el.dataset.counted) return;
      el.dataset.counted = '1';
      const target = parseFloat(el.getAttribute('data-count'));
      if (!Number.isFinite(target)) return;
      const decimals = Number(el.getAttribute('data-decimals') || 0);
      const suffix = el.getAttribute('data-suffix') || '';
      const prefix = el.getAttribute('data-prefix') || '';
      const dur = 1300;
      const start = performance.now();
      const fmt = (v) =>
        v.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        el.textContent = prefix + fmt(target) + suffix;
      };
      const step = (now) => {
        if (done) return;
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        const value = target * eased;
        el.textContent = prefix + fmt(value) + suffix;
        if (t < 1) requestAnimationFrame(step);
        else finish();
      };
      requestAnimationFrame(step);
      /* frames can stall in throttled webviews — never leave a literal 0 */
      setTimeout(finish, dur + 500);
    };

    if (!('IntersectionObserver' in window)) {
      els.forEach(run);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            run(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    /* start visible counters without waiting on IntersectionObserver, and
       sweep once in case observer callbacks never arrive (stalled frames) */
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight * 0.95) run(el);
      else io.observe(el);
    });
    setTimeout(() => {
      els.forEach((el) => {
        if (el.dataset.counted) return;
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) run(el);
      });
    }, 1100);
    /* last-resort sweep: IntersectionObserver callbacks can stall in
       background tabs and hidden webviews — re-check on scroll, resize and
       when the tab becomes visible again so a counter never sits at 0 */
    const sweep = () => {
      let pending = false;
      els.forEach((el) => {
        if (el.dataset.counted || !el.isConnected) return;
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight * 0.95) run(el);
        else pending = true;
      });
      if (!pending) {
        window.removeEventListener('scroll', sweep);
        window.removeEventListener('resize', sweep);
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
    const onVisible = () => {
      if (!document.hidden) sweep();
    };
    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('resize', sweep, { passive: true });
    document.addEventListener('visibilitychange', onVisible);
  }

  /* ------------------------------- parallax ------------------------------- */

  function bindParallax() {
    const art = document.querySelector('[data-parallax]');
    if (!art || window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const render = art.querySelector('.hero__art-render');
    const cards = art.querySelectorAll('.float-card');
    art.addEventListener('pointermove', (e) => {
      const r = art.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      if (render) render.style.transform = `translate3d(${x * -16}px, ${y * -14}px, 0) scale(1.19)`;
      cards.forEach((c, i) => {
        const d = i % 2 === 0 ? 1 : -1;
        c.style.animation = 'none';
        c.style.transform = `translate3d(${x * 22 * d}px, ${y * 18 * d}px, 0)`;
      });
    });
    art.addEventListener('pointerleave', () => {
      if (render) render.style.transform = '';
      cards.forEach((c) => {
        c.style.transform = '';
        c.style.animation = '';
      });
    });
  }

  /* --------------------------------- boot --------------------------------- */

  function boot() {
    UI.init();
    render();
    bindParallax();

    window.addEventListener('hashchange', render);
    window.addEventListener('resize', () => UI.headerScroll(), { passive: true });

    /* shared order store: live cloud listener + cross-tab refresh. Screens
       that patch themselves (confirmation, tracking) opt out by route. */
    let liveTimer = null;
    const refreshOrders = () => {
      const head = parseHash().parts[0] || '';
      if (head !== 'admin' && head !== 'account') return;
      clearTimeout(liveTimer);
      liveTimer = setTimeout(() => {
        try {
          render();
        } catch (e) {
          /* the route changed under us — the next render covers it */
        }
      }, 300);
    };
    if (window.Cloud && Cloud.configured) {
      Cloud.start({
        onOrders(list) {
          if (list && window.Orders && Orders.mergeCloud(list)) refreshOrders();
        },
      });
    }

    /* cross-tab sync: another tab wrote the cart or the catalogue */
    window.addEventListener('storage', (e) => {
      if (!e.key) return;
      if (e.key === 'aether.cart.v1' || e.key === 'aether.wish.v1' || e.key === 'aether.promo.v1') {
        Store.resync();
      }
      if (e.key === 'aether.orders.v1' && e.newValue) {
        try {
          const list = JSON.parse(e.newValue);
          if (window.Orders && Array.isArray(list) && Orders.mergeCloud(list)) refreshOrders();
        } catch (err) {
          /* malformed write — ignore */
        }
      }
      if (e.key === 'aether.catalog.v2' && window.Catalog) {
        Catalog.hydrate();
        const head = parseHash().parts[0] || '';
        if (head === 'shop' || head === 'product' || head === 'admin') render();
        else UI.refreshChrome();
      }
    });

    /* one non-blocking heads-up per session if something throws late */
    let complained = false;
    const complain = () => {
      if (complained) return;
      complained = true;
      try {
        UI.toast({ title: 'Something went wrong', sub: 'An unexpected error occurred — try that again.' });
      } catch (e) {
        /* toast failed; the console already has it */
      }
    };
    window.addEventListener('error', complain);
    window.addEventListener('unhandledrejection', complain);

    /* mark first paint for debugging / e2e checks */
    document.documentElement.setAttribute('data-ready', 'true');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Arena = { render, get route() { return parseHash(); } };
})();
