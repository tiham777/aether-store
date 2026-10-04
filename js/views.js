/* =========================================================================
   Arena — views: home, shop, product, checkout, confirmation
   ========================================================================= */
(function () {
  'use strict';

  const { icon, stars, esc, productCard, catName, money, productUrl } = {
    icon: UI.icon,
    stars: UI.stars,
    esc: UI.esc,
    productCard: UI.productCard,
    catName: UI.catName,
    productUrl: UI.productUrl,
    money: (c) => Store.money(c),
  };

  const byId = (id) => DATA.products.find((p) => p.id === id);

  /* live Firestore subscriptions — one per screen, swapped on navigation */
  let unsubConfirmed = null;
  let unsubTrack = null;

  /* called by the router before every render so listeners never outlive
     the screen that owns them */
  function unmountLive() {
    if (unsubConfirmed) {
      unsubConfirmed();
      unsubConfirmed = null;
    }
    if (unsubTrack) {
      unsubTrack();
      unsubTrack = null;
    }
  }
  const inCat = (cat) => DATA.products.filter((p) => p.category === cat);

  /* recently viewed — remembered across visits, shown on the home page */
  const RECENT_KEY = 'aether.recent.v1';
  const recentIds = () => {
    try {
      const v = JSON.parse(localStorage.getItem(RECENT_KEY));
      return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    } catch (e) {
      return [];
    }
  };
  function pushRecent(id) {
    try {
      const list = [id].concat(recentIds().filter((x) => x !== id)).slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch (e) {
      /* private mode — the strip just stays empty */
    }
  }
  /* live catalogue figures — admin edits must not leave stale claims behind */
  const count = () => DATA.products.length;
  const reviewTotal = () => DATA.products.reduce((n, p) => n + (p.reviews || 0), 0);
  const num = (n) => n.toLocaleString('en-US');

  function sectionHead(o) {
    return `
      <div class="section-head">
        <div class="section-head__text">
          ${o.eyebrow ? `<span class="eyebrow" data-reveal>${o.eyebrow}</span>` : ''}
          <h2 class="h2" data-reveal style="--d:70ms">${o.title}</h2>
          ${o.text ? `<p class="lede" data-reveal style="--d:130ms">${o.text}</p>` : ''}
        </div>
        ${o.link ? `<a class="link" href="${o.link.href}" data-reveal style="--d:180ms">${o.link.label} ${icon('arrowRight')}</a>` : ''}
      </div>`;
  }

  function crumbs(trail) {
    return `<nav class="container crumbs" aria-label="Breadcrumb">
      <a href="#/">Home</a>
      ${trail
        .map(
          (t, i) =>
            `${icon('chevronRight')}${
              i === trail.length - 1
                ? `<span aria-current="page">${esc(t.label)}</span>`
                : `<a href="${t.href}">${esc(t.label)}</a>`
            }`
        )
        .join('')}
    </nav>`;
  }

  function perkRow() {
    return `<section class="container"><div class="marquee-note">${
      DATA.perks
        .map((p) => `<span class="row row-3"><span style="color:var(--accent)">${icon(p.icon)}</span><span>${
          p.title
        } : <span class="muted">${p.text}</span></span></span>`)
        .join('')
    }<span class="row row-3"><span style="color:var(--accent)">${icon(
      'globe'
    )}</span><span>Ships to 92 countries</span></span></div></section>`;
  }

  /* ================================ HOME ================================= */

  function home() {
    const hero = byId('halo-one') || DATA.products[0];
    if (!hero) {
      return {
        title: 'Arena — Considered objects for modern life',
        html: `<div class="container"><div class="empty-state" style="margin-block:clamp(40px,8vw,110px)">
          <div class="cart-empty__icon">${icon('package')}</div>
          <h1 class="h2">The shelves are bare. <span class="accent">On purpose.</span></h1>
          <p class="muted" style="max-width:44ch">Every object is back in the studio for a restock. The journal stays open while we work.</p>
          <a class="btn btn--primary" href="#/journal">Read the journal ${icon('arrowRight')}</a>
        </div></div>`,
      };
    }
    const featured = [
      'monolith-s',
      'slate65',
      'halo-buds',
      'meridian-watch',
      'atlas-pack',
      'lumen-desk',
      'field-bottle',
      'orbit-cam',
    ]
      .map(byId)
      .filter(Boolean);
    const fill = DATA.products.filter((p) => !featured.includes(p));
    while (featured.length < 8 && fill.length) featured.push(fill.shift());

    const spotlight = byId('monolith-s') || featured[0] || DATA.products[0];

    const html = `
    <section class="hero">
      <div class="hero__bg" aria-hidden="true"></div>
      <div class="container hero__grid">
        <div class="hero__copy">
          <h1 class="display hero__title" data-reveal style="--d:70ms"><span class="rise">Buy it for life. <span class="accent">Actually.</span></span></h1>
          <p class="lede" data-reveal style="--d:150ms">Audio, workspace and carry goods drawn to be opened with a single driver: parts stocked for seven years, repairs at cost for the original owner, and two releases a year, never twenty.</p>
          <div class="hero__actions" data-reveal style="--d:230ms">
            <a class="btn btn--primary btn--lg" href="#/shop">Shop the collection ${icon('arrowRight')}</a>
            <a class="btn btn--ghost btn--lg" href="#/product/${hero.id}">Meet ${hero.name}</a>
          </div>
          <div class="hero__trust" data-reveal style="--d:310ms">
            <span class="hero__trust-item">${stars(5)} <b>4.9</b> from ${num(reviewTotal())} reviews</span>
            <span class="hero__trust-item">${icon('truck')} Free shipping over $150 · 60-night returns</span>
            <span class="hero__trust-item" style="color:var(--accent-ink)">${icon('sparkle')} 10% off your first order with code ARENA10</span>
          </div>
        </div>

        <div class="hero__art" data-reveal="scale" style="--d:140ms" data-parallax>
          <img class="hero__art-render" src="${hero.image}" alt="${esc(hero.name)}, ${esc(hero.tagline)}" width="800" height="1000" fetchpriority="high">
          <div class="float-card float-card--tl">
            <span class="float-card__icon">${icon('wrench')}</span>
            <span class="float-card__text"><span class="float-card__v">Repairable</span></span>
          </div>
          <div class="float-card float-card--br">
            <span class="float-card__icon float-card__icon--accent">${icon('truck')}</span>
            <span class="float-card__text"><span class="float-card__k">Ordered before 14:00</span><span class="float-card__v">Leaves the same day</span></span>
          </div>
        </div>
      </div>
    </section>    <section class="press" aria-label="What every order includes">
      <div class="press__viewport">
        <div class="press__group">${[
                  '60 nights to decide',
                  'Free shipping over $150',
                  'Repairs at cost, for as long as you own it',
                  'Two releases a year, no drop hype',
                ]
                  .map((n) => `<span class="press__item">${n}</span>`)
                  .join('')}</div>
      </div>
    </section>

    <section class="section container" id="collections">
      ${sectionHead({
        title: 'Three lines. <span class="accent">No filler.</span>',
        text: `${count()} products in total. Each one exists because nothing on the market was good enough to keep.`,
        link: { href: '#/shop', label: 'View everything' },
      })}
      <div class="cats">
        ${DATA.categories
          .map(
            (c, i) => `
          <a class="cat" href="#/shop?cat=${c.id}" data-reveal style="--d:${i * 80}ms">
            <span class="cat__media"><img src="${c.image}" alt="${esc(c.name)} collection" loading="lazy" width="1200" height="825"></span>
            <span class="cat__foot">
              <span>
                <span class="cat__name">${esc(c.name)}</span><br>
                <span class="cat__count">${inCat(c.id).length} products · ${esc(c.short)}</span>
              </span>
              <span class="cat__arrow">${icon('arrowUpRight')}</span>
            </span>
          </a>`
          )
          .join('')}
      </div>
    </section>

    <section class="section section--flush-top container" id="featured">
      ${sectionHead({
        title: 'Objects people <span class="accent">keep.</span>',
        text: 'Best sellers, recent releases and the one camera we build entirely by hand.',
        link: { href: '#/shop', label: `Shop all ${count()}` },
      })}
      <div class="grid-products grid-products--4">${featured.map((p, i) => productCard(p, i)).join('')}</div>
    </section>

    <section class="section container" id="story">
      <div class="split">
        <div class="split__media" data-reveal="left">
          <img src="assets/img/stairs.jpg" alt="Concrete stairwell in the Arena studio building" loading="lazy" width="1400" height="1600">
          <span class="split__tag">Studio no. 4, Copenhagen</span>
        </div>
        <div class="split__copy">
          <h2 class="h2" data-reveal style="--d:70ms">Fewer things, <span class="accent">better</span> made.</h2>
          <p class="lede" data-reveal style="--d:130ms">We release two products a year, not twenty. Every object is drawn in one studio, prototyped in-house, and judged by a simple test: would we replace it with itself?</p>
          <ul class="stack stack-2" data-reveal style="--d:190ms">
            ${[
              'Repairable with a single driver and parts we stock for seven years',
              'Materials chosen for how they age, not how they photograph',
              'Acoustics, weight and finish tuned by the same four people',
            ]
              .map(
                (t) =>
                  `<li class="row row-3" style="align-items:flex-start;font-size:.95rem;color:var(--ink-2)"><span style="color:var(--accent);flex:none;margin-top:3px">${icon(
                    'check'
                  )}</span><span>${t}</span></li>`
              )
              .join('')}
          </ul>
          <div class="stats" data-reveal style="--d:250ms">
            <div class="stat"><span class="stat__n" data-count="${count()}">0</span><span class="stat__l">products in the entire line</span></div>
            <div class="stat"><span class="stat__n" data-count="4.9" data-decimals="1">0</span><span class="stat__l">average across ${num(reviewTotal())} reviews</span></div>
            <div class="stat"><span class="stat__n" data-count="7" data-suffix="+">0</span><span class="stat__l">years of parts stocked after launch</span></div>
          </div>
          <a class="link" href="#/shop" data-reveal style="--d:310ms">Start with the best sellers ${icon('arrowRight')}</a>
        </div>
      </div>
    </section>

    <section class="section section--tight container" id="principles">
      ${sectionHead({ title: 'Three rules, <span class="accent">kept.</span>' })}
      <div class="principles">
        ${[
          ['01', 'Material honesty', 'Aluminium looks like aluminium, felt like felt. Nothing is painted to imitate something it is not, and every surface is one you will still like after a decade of hands.'],
          ['02', 'Repairable by design', 'Standard screws, replaceable batteries, published part numbers. If it can be opened on a kitchen table, it stays out of landfill.'],
          ['03', 'Quiet by default', 'No blinking lights, no notifications you did not ask for, no app that demands an account. The object works the moment you touch it.'],
        ]
          .map(
            ([n, t, d], i) => `
          <div class="principle" data-reveal style="--d:${i * 90}ms">
            <h3 class="principle__t">${t}</h3>
            <p class="principle__d">${d}</p>
          </div>`
          )
          .join('')}
      </div>
    </section>

    <section class="section night spotlight" id="spotlight">
      <div class="container spotlight__grid">
        <div class="spotlight__copy">
          <h2 class="h2" data-reveal style="--d:70ms">${spotlight.name}, <span class="accent">room-filling</span> in one column.</h2>
          <p class="lede" data-reveal style="--d:130ms">${esc(spotlight.blurb)}</p>
          <div class="chip-row" data-reveal style="--d:180ms">
            ${Object.values(spotlight.specs || {})
              .slice(0, 4)
              .map((c) => `<span class="chip">${esc(c)}</span>`)
              .join('')}
          </div>
          <div class="spotlight__price" data-reveal style="--d:230ms">
            <span class="price">${money(spotlight.price)}</span>
            ${spotlight.compareAt ? `<span class="price price--strike">${money(spotlight.compareAt)}</span>` : ''}
            <span class="badge badge--accent">Free shipping</span>
          </div>
          <div class="row row-4 wrap" data-reveal style="--d:280ms">
            <button class="btn btn--light btn--lg" data-add="${spotlight.id}">${icon('bag')} Add to bag</button>
            <a class="btn btn--outline-light btn--lg" href="#/product/${spotlight.id}">Full details ${icon('arrowRight')}</a>
          </div>
          <div class="row row-3" data-reveal style="--d:330ms">
            ${stars(spotlight.rating)}
            <span class="small" style="color:rgba(244,243,241,.7)">${spotlight.rating} · ${spotlight.reviews} reviews</span>
          </div>
        </div>
        <div class="spotlight__art" data-reveal="scale">
          <img src="${spotlight.image}" alt="${esc(spotlight.name)}" loading="lazy" width="800" height="1000">
        </div>
      </div>
    </section>

    <section class="section container" id="reviews">
      ${sectionHead({
        title: 'The review we <span class="accent">can’t buy.</span>',
        link: { href: '#/shop', label: 'See the collection' },
      })}
      <div class="quotes">
        ${DATA.testimonials
          .map(
            (t, i) => `
          <figure class="quote" data-reveal style="--d:${i * 80}ms">
            ${stars(t.rating)}
            <blockquote class="quote__text">${esc(t.text)}</blockquote>
            <figcaption class="quote__who">
              <span class="avatar">${t.initials}</span>
              <span><span class="quote__name">${esc(t.name)}</span><br><span class="quote__role">${esc(t.role)}</span></span>
            </figcaption>
          </figure>`
          )
          .join('')}
      </div>
    </section>

    <section class="section section--flush-top container" id="journal-posts">
      ${sectionHead({
        title: 'Notes from <span class="accent">the studio.</span>',
        link: { href: '#/journal', label: 'All stories' },
      })}
      <div class="posts${DATA.journal.length === 2 ? ' posts--2' : ''}">
        ${DATA.journal
          .map(
            (p, i) => `
          <a class="post" href="#/journal" data-reveal style="--d:${i * 80}ms">
            <span class="post__media"><img src="${p.image}" alt="${esc(p.title)}" loading="lazy" width="1200" height="900"></span>
            <span class="post__meta"><span class="mono">${p.tag}</span><span class="divider-dot"></span><span class="xs muted">${p.date} · ${p.read}</span></span>
            <span>
              <span class="post__title">${esc(p.title)}</span>
              <span class="post__excerpt" style="display:block;margin-top:7px">${esc(p.excerpt)}</span>
            </span>
          </a>`
          )
          .join('')}
      </div>
    </section>

    ${recentSection()}
    ${newsletterSection()}
    ${perkRow()}`;

    return {
      html,
      title: 'Arena — Considered objects for modern life',
      mount() {
        bindNewsletter();
        bindSpotlight();
      },
    };
  }

  /* recently-viewed strip — rendered after home()'s main html so first-time
     visitors simply never see the section */
  function recentSection() {
    const list = recentIds()
      .map(byId)
      .filter(Boolean)
      .slice(0, 4);
    if (list.length < 2) return '';
    return `
    <section class="section section--flush-top container" id="recently">
      ${sectionHead({
        title: 'Pick up where <span class="accent">you left off.</span>',
        link: { href: '#/shop', label: 'Back to the shop' },
      })}
      <div class="grid-products grid-products--4">${list.map((p, i) => productCard(p, i)).join('')}</div>
    </section>`;
  }

  /* ----------------------------- shared blocks ---------------------------- */

  function newsletterSection() {
    return `
    <section class="section section--flush-top container" id="newsletter">
      <div class="news" data-reveal>
        <h2 class="h2">Ten percent off your <span class="accent">first</span> object.</h2>
        <p class="lede" style="color:rgba(244,243,241,.72);max-width:46ch">One considered letter a month: new releases, repair notes, and the occasional archive sale.</p>
        <form class="news__form" data-newsletter novalidate>
          <input class="input" type="email" name="email" placeholder="you@studio.com" aria-label="Email address" autocomplete="email" required>
          <button class="btn btn--accent" type="submit">Subscribe</button>
        </form>
        <p class="news__fine">No sequences, no tracking pixels. Unsubscribe in one click.</p>
      </div>
    </section>`;
  }

  function bindNewsletter() {
    const form = document.querySelector('[data-newsletter]');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
      if (!ok) {
        input.classList.add('is-invalid');
        input.focus();
        UI.toast({ title: 'Check that address', sub: 'We need a valid email to send the code.' });
        return;
      }
      const applied = !Store.promo && Boolean(DATA.promoCodes.FIRST10) && Store.applyPromo('FIRST10');
      if (window.Subs) Subs.add(input.value.trim(), 'newsletter');
      form.innerHTML = applied
        ? `<p class="news__ok">${icon('check')} Welcome in. <b style="color:#fff">FIRST10</b> is already in your bag.</p>`
        : `<p class="news__ok">${icon('check')} Welcome in. Studio notes head to ${esc(input.value.trim())} once a month.</p>`;
      UI.toast({
        title: 'Subscribed',
        sub: applied ? 'FIRST10 applied, 10% off your first order.' : 'One letter a month, nothing else.',
      });
    });
  }

  function bindSpotlight() {
    const btn = document.querySelector('.spotlight [data-add]');
    if (btn)
      btn.addEventListener('click', () => {
        btn.innerHTML = `${icon('check')} Added to bag`;
        setTimeout(() => (btn.innerHTML = `${icon('bag')} Add to bag`), 1800);
      });
  }

  /* ================================ SHOP ================================= */

  function shop(params) {
    const active = params.cat && DATA.categories.some((c) => c.id === params.cat) ? params.cat : 'all';
    const query = (params.q || '').trim();
    const counts = { all: DATA.products.length };
    DATA.categories.forEach((c) => (counts[c.id] = inCat(c.id).length));

    const html = `
    ${crumbs([{ label: 'Shop', href: '#/shop' }])}
    <header class="container page-head">
      <div class="page-head__inner">
        <div class="page-head__row">
          <h1 data-reveal style="--d:60ms">${
            query ? `“${esc(query)}”` : active === 'all' ? 'Everything we make' : esc(catName(active))
          }<span class="accent">.</span></h1>
          <p class="lede" data-reveal style="--d:120ms;max-width:42ch">${
            query
              ? `Matches for “${esc(query)}” across the ${count()}-object line. Combine them with the filters below.`
              : active === 'all'
                ? `No seasons, no drops that vanish. ${count()} products, restocked continuously, warrantied for years.`
                : esc((DATA.categories.find((c) => c.id === active) || {}).blurb || '')
          }</p>
        </div>
      </div>
    </header>

    <div class="container">
      <div class="toolbar">
        <div class="toolbar__filters" role="group" aria-label="Filter by category">
          ${
            query
              ? `<button class="pill is-active" data-fclearq aria-pressed="true" title="Clear search">“${esc(
                  query
                )}” ✕</button>`
              : ''
          }
          <button class="pill${active === 'all' ? ' is-active' : ''}" data-filter="all">All <span class="pill__count">${
      counts.all
    }</span></button>
          ${DATA.categories
            .map(
              (c) =>
                `<button class="pill${active === c.id ? ' is-active' : ''}" data-filter="${c.id}">${esc(
                  c.name
                )} <span class="pill__count">${counts[c.id]}</span></button>`
            )
            .join('')}
        </div>
        <div class="toolbar__right">
          <span class="toolbar__count" data-shopcount></span>
          <label class="sr-only" for="sort">Sort products</label>
          <select class="select" id="sort" data-sort>
            <option value="featured">Featured</option>
            <option value="rating">Top rated</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="new">Newest first</option>
          </select>
        </div>
      </div>

      <div class="filters" role="group" aria-label="Refine products">
        <div class="filters__set">
          <span class="filters__label">Price</span>
          ${[
                ['', 'Any'],
                ['0-100', 'Under $100'],
                ['100-250', '$100 – $250'],
                ['250-', '$250+'],
              ]
                .map(
                  ([v, l]) =>
                    `<button class="pill${(params.price || '') === v ? ' is-active' : ''}" data-fprice="${v}" aria-pressed="${
                      (params.price || '') === v
                    }">${l}</button>`
                )
                .join('')}
        </div>
        <div class="filters__set">
          <span class="filters__label">Rating</span>
          ${[
                ['', 'Any'],
                ['4.5', '4.5+'],
                ['4', '4+'],
              ]
                .map(
                  ([v, l]) =>
                    `<button class="pill${(params.rating || '') === v ? ' is-active' : ''}" data-frating="${v}" aria-pressed="${
                      (params.rating || '') === v
                    }">${l}</button>`
                )
                .join('')}
        </div>
        <div class="filters__set">
          <span class="filters__label">Availability</span>
          <button class="pill${params.stock === '1' ? ' is-active' : ''}" data-fstock="1" aria-pressed="${
            params.stock === '1'
          }">In stock only</button>
        </div>
      </div>

      <div class="grid-products grid-products--4" data-grid></div>
      <div class="empty-state" data-empty hidden>
        <div class="cart-empty__icon">${icon('search')}</div>
        <h3 class="h3">Nothing matches those filters</h3>
        <p class="muted">Try a wider price range, or clear everything and start again.</p>
        <a class="btn btn--primary btn--sm" href="#/shop">Clear all filters ${icon('arrowRight')}</a>
      </div>
      <div style="height:clamp(60px,8vw,110px)"></div>
    </div>
    ${newsletterSection()}
    ${perkRow()}`;

    return {
      html,
      title: query ? `Search: ${query} — Arena` : active === 'all' ? 'Shop all — Arena' : `${catName(active)} — Arena`,
      desc: `Browse all ${count()} Arena products: audio, workspace and everyday carry, with a 60-night trial and free shipping over $150.`,
      mount(root) {
        let sort = 'featured';
        const grid = root.querySelector('[data-grid]');
        const empty = root.querySelector('[data-empty]');
        const countEl = root.querySelector('[data-shopcount]');

        if (query && empty) {
          const eh = empty.querySelector('h3');
          const ep = empty.querySelector('p');
          if (eh) eh.textContent = `No products match “${query}”.`;
          if (ep) ep.textContent = 'Try a shorter word, or clear the search and browse everything.';
        }

        const priceMatch = (cents) => {
          const range = params.price || '';
          if (!range) return true;
          const [a, b] = range.split('-');
          const lo = Number(a) * 100 || 0;
          const hi = b ? Number(b) * 100 : Infinity;
          return cents >= lo && cents < hi;
        };
        const minRating = parseFloat(params.rating) || 0;
        const inStock = params.stock === '1';
        const needle = query.toLowerCase();

        const paint = () => {
          let list = active === 'all' ? DATA.products.slice() : inCat(active);
          list = list.filter(
            (x) =>
              priceMatch(x.price) &&
              x.rating >= minRating &&
              (!inStock || x.stock > 0) &&
              (!needle || [x.name, x.tagline, x.blurb, catName(x.category)].join(' ').toLowerCase().includes(needle))
          );
          if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
          if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
          if (sort === 'rating') list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
          if (sort === 'new') list.sort((a, b) => (b.badge === 'New' ? 1 : 0) - (a.badge === 'New' ? 1 : 0));
          grid.innerHTML = list.map((p, i) => productCard(p, i)).join('');
          empty.hidden = list.length > 0;
          grid.hidden = !list.length;
          countEl.textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
          if (window.__reveal) window.__reveal(grid);
        };

        root.querySelectorAll('[data-filter]').forEach((btn) =>
          btn.addEventListener('click', () => {
            const p = new URLSearchParams();
            const id = btn.getAttribute('data-filter');
            if (id !== 'all') p.set('cat', id);
            if (query) p.set('q', query);
            const qs = p.toString();
            location.hash = '#/shop' + (qs ? '?' + qs : '');
          })
        );
        const clearQ = root.querySelector('[data-fclearq]');
        if (clearQ)
          clearQ.addEventListener('click', () => {
            const p = new URLSearchParams(location.hash.split('?')[1] || '');
            p.delete('q');
            const qs = p.toString();
            location.hash = '#/shop' + (qs ? '?' + qs : '');
          });

        const setFilter = (key, val) => {
          const q = new URLSearchParams();
          if (active !== 'all') q.set('cat', active);
          const price = key === 'price' ? val : params.price || '';
          const rating = key === 'rating' ? val : params.rating || '';
          const stock = key === 'stock' ? (params.stock === '1' ? '' : '1') : params.stock || '';
          if (price) q.set('price', price);
          if (rating) q.set('rating', rating);
          if (stock) q.set('stock', stock);
          if (query) q.set('q', query);
          const qs = q.toString();
          location.hash = '#/shop' + (qs ? '?' + qs : '');
        };
        root.querySelectorAll('[data-fprice]').forEach((b) =>
          b.addEventListener('click', () => setFilter('price', b.getAttribute('data-fprice')))
        );
        root.querySelectorAll('[data-frating]').forEach((b) =>
          b.addEventListener('click', () => setFilter('rating', b.getAttribute('data-frating')))
        );
        const stockBtn = root.querySelector('[data-fstock]');
        if (stockBtn) stockBtn.addEventListener('click', () => setFilter('stock', '1'));
        const sortEl = root.querySelector('[data-sort]');
        sortEl.addEventListener('change', () => {
          sort = sortEl.value;
          paint();
        });
        paint();
      },
    };
  }

  /* ============================== PRODUCT ================================ */

  function product(id) {
    const p = byId(id);
    if (!p) return notFound();

    const related = DATA.products.filter((x) => x.id !== p.id && x.category === p.category)
      .concat(DATA.products.filter((x) => x.id !== p.id && x.category !== p.category))
      .slice(0, 4);
    /* frequently bought together: this object + two in-stock companions */
    const bundle = [p].concat(related.filter((x) => x.stock > 0)).slice(0, 3);
    const save = p.compareAt ? p.compareAt - p.price : 0;
    /* social crawlers ignore SVG, so share the first real photo we have */
    const shareImg = [p.image]
      .concat((p.gallery || []).map((g) => g.src))
      .find((s) => /\.(png|jpe?g|webp|avif)$/i.test(s));

    const html = `
    ${crumbs([
      { label: 'Shop', href: '#/shop' },
      { label: catName(p.category), href: `#/shop?cat=${p.category}` },
      { label: p.name, href: `#/product/${p.id}` },
    ])}

    <div class="container" style="padding-top:clamp(22px,3vw,40px)">
      <div class="pdp">
        <div class="pdp__gallery" data-gallery>
          <div class="pdp__main" data-gallery-main data-reveal="scale">
            <img src="${p.gallery[0].src}" alt="${esc(p.name)}" width="800" height="1000" fetchpriority="high"
                 style="object-position:${p.gallery[0].pos};--base:${p.gallery[0].scale}">
            <span class="badge" style="position:absolute;left:14px;bottom:14px">${icon('zoom')} Hover to zoom</span>
          </div>
          <div class="pdp__thumbs">
            ${p.gallery
              .map(
                (g, i) => `
              <button class="pdp__thumb${i === 0 ? ' is-active' : ''}" data-thumb="${i}" aria-label="View ${i + 1} of ${p.gallery.length}">
                <img src="${g.src}" alt="" loading="lazy" style="object-position:${g.pos};transform:scale(${g.scale})">
              </button>`
              )
              .join('')}
          </div>
        </div>

        <div class="pdp__info">
          <div class="pdp__head">
            <h1 class="pdp__title" data-reveal style="--d:60ms">${esc(p.name)}</h1>
            <p class="pdp__tagline small muted" data-reveal style="--d:85ms">${catName(p.category)} · ${esc(p.tagline)}</p>
            <div class="pdp__rating" data-reveal style="--d:110ms">
              ${stars(p.rating)} <b>${p.rating.toFixed(1)}</b>
              <span>· ${p.reviews} reviews</span>
              <span class="divider-dot"></span>
              <span>${
                p.stock === 0
                  ? '<b class="stock-out">Out of stock</b>'
                  : p.stock <= 10
                  ? `<b class="stock-low">Only ${p.stock} left</b> · ships today`
                  : 'In stock · ships today'
              }</span>
            </div>
          </div>

          <div class="pdp__price" data-reveal style="--d:150ms">
            <span class="price">${money(p.price)}</span>
            ${p.compareAt ? `<span class="price price--strike">${money(p.compareAt)}</span><span class="pdp__save">Save ${money(save)}</span>` : ''}
          </div>

          <p class="pdp__blurb" data-reveal style="--d:190ms">${esc(p.blurb)}</p>

          <div class="opt" data-reveal style="--d:230ms">
            <span class="opt__label">Colour <b data-color-name>${esc(p.colors[0].name)}</b></span>
            <div class="swatches" role="radiogroup" aria-label="Colour">
              ${p.colors
                .map(
                  (c, i) =>
                    `<button class="swatch${i === 0 ? ' is-active' : ''}" role="radio" aria-checked="${i === 0}" data-color="${esc(
                      c.name
                    )}" aria-label="${esc(c.name)}"><span style="background:${c.hex}"></span></button>`
                )
                .join('')}
            </div>
          </div>

          <div class="pdp__buy" data-reveal style="--d:270ms">
            <div class="stepper" role="group" aria-label="Quantity">
              <button data-pdp-qty="-1" aria-label="Decrease">${icon('minus')}</button>
              <span class="stepper__value" data-pdp-qty-value>1</span>
              <button data-pdp-qty="1" aria-label="Increase">${icon('plus')}</button>
            </div>
            <button class="btn btn--primary btn--lg" data-pdp-add${p.stock === 0 ? ' disabled' : ''}>${
      p.stock === 0 ? 'Out of stock' : `Add to bag · ${money(p.price)}`
    }</button>
            <button class="wish-btn${Store.isWished(p.id) ? ' is-on' : ''}" data-wish="${p.id}" aria-label="Save ${esc(
      p.name
    )}" aria-pressed="${Store.isWished(p.id)}">${icon('heart')}</button>
          </div>

          <div class="assurances" data-reveal style="--d:310ms">
            <span class="assurance">${icon('truck')} <span><b>Express arrives ${Store.etaLabel(
              'express'
            )}</b> · order within <span data-countdown>6h 42m</span></span></span>
            <span class="assurance">${icon('package')} <span><b>Standard arrives ${Store.etaLabel(
              'standard'
            )}</b> · free over $150</span></span>
            <span class="assurance">${icon('refresh')} <span><b>60-night trial</b> · free returns, no questions</span></span>
          </div>

          <div data-reveal style="--d:350ms">
            <div class="acc is-open">
              <button class="acc__btn" aria-expanded="true">Details & materials <span class="acc__icon"></span></button>
              <div class="acc__panel"><div class="acc__inner"><div class="acc__content">
                ${p.details.map((d) => `<p>${esc(d)}</p>`).join('')}
              </div></div></div>
            </div>
            <div class="acc">
              <button class="acc__btn" aria-expanded="false">Specifications <span class="acc__icon"></span></button>
              <div class="acc__panel"><div class="acc__inner"><div class="acc__content">
                <dl class="spec-list">
                  ${Object.entries(p.specs)
                    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
                    .join('')}
                </dl>
              </div></div></div>
            </div>
            <div class="acc">
              <button class="acc__btn" aria-expanded="false">Shipping, returns & repairs <span class="acc__icon"></span></button>
              <div class="acc__panel"><div class="acc__inner"><div class="acc__content">
                <p>Ordered before 14:00 CET on a business day and it leaves Copenhagen the same afternoon. Standard delivery is free above $150, express is a flat ${money(
                  DATA.expressFee
                )}.</p>
                <p>Sixty nights to change your mind, then two years of warranty, extendable to five at checkout. Out of warranty? We still sell the parts and publish the guide.</p>
              </div></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="section section--tight container">
      ${sectionHead({ title: 'Complete the <span class="accent">set.</span>' })}
      <div class="fbt" data-fbt>
        <div class="fbt__items">
          ${bundle
            .map(
              (x, i) => `
            <div class="fbt__item${x.stock === 0 ? ' is-oos' : ''}">
              <label class="fbt__pick">
                <input type="checkbox" data-fbt-check="${x.id}" data-fbt-price="${x.price}"${
                  x.stock === 0 ? ' disabled' : ' checked'
                }>
                <span class="fbt__media"><img src="${x.image}" alt="${esc(x.name)}" width="72" height="90" loading="lazy"></span>
              </label>
              <span class="fbt__meta">
                <a class="fbt__name" href="${productUrl(x.id)}">${esc(x.name)}</a>
                <span class="fbt__price">${x.stock === 0 ? 'Sold out' : money(x.price)}</span>
              </span>
              ${i < bundle.length - 1 ? `<span class="fbt__plus" aria-hidden="true">+</span>` : ''}
            </div>`
            )
            .join('')}
        </div>
        <div class="fbt__bar">
          <span class="fbt__total">Total: <b data-fbt-total>${money(bundle.filter((x) => x.stock > 0).reduce((n, x) => n + x.price, 0))}</b>
            <span class="xs muted" data-fbt-count>${bundle.filter((x) => x.stock > 0).length} items</span></span>
          <button class="btn btn--primary" data-fbt-add>Add all to bag ${icon('bag')}</button>
        </div>
      </div>
    </section>

    <section class="section section--tight container">
      ${sectionHead({ title: 'What ownership <span class="accent">looks like.</span>' })}
      <div class="feature-row">
        ${[
          ['wrench', 'Repairable, not disposable', 'Every part is replaceable with a T5 driver and a published guide. We stock spares for seven years.'],
          ['leaf', 'Lower-impact materials', 'Recycled aluminium, bio-resin and 68% renewable energy across both factories.'],
          ['headset', 'Humans, not scripts', 'Talk to the same small team that built it; a human replies within one business day, always.'],
        ]
          .map(
            ([ic, t, d], i) => `
          <div class="feature" data-reveal style="--d:${i * 80}ms">
            <span class="feature__head"><span class="feature__icon">${icon(ic)}</span><span class="feature__t">${t}</span></span>
            <span class="feature__d">${d}</span>
          </div>`
          )
          .join('')}
      </div>
    </section>

    <section class="section section--flush-top container">
      <div class="section-head">
        <div class="section-head__text">
          <h2 class="h2" data-reveal style="--d:70ms">${p.rating.toFixed(1)} out of 5, <span class="accent">from ${p.reviews} owners.</span></h2>
        </div>
        <span class="row row-3" data-reveal>${stars(p.rating)}<span class="small muted">Owners only · purchases verified</span></span>
      </div>
      <div class="review-grid" data-review-grid>${reviewCards(Reviews.forProduct(p.id))}</div>

      <div class="review-write" data-review-write>
        <div class="review-write__head">
          <h3 class="h3">Write a review</h3>
          <span class="xs muted">${
            window.Auth && Auth.current()
              ? `Signed in as ${esc(Auth.current().name)}`
              : 'Sign in to share how it’s holding up'
          }</span>
        </div>
        <form class="review-write__form" data-review-form novalidate>
          <div class="rrating" role="radiogroup" aria-label="Your rating">
            ${[1, 2, 3, 4, 5]
              .map(
                (n) =>
                  `<button type="button" class="rrating__star${n <= 5 ? ' is-on' : ''}" data-rate="${n}" role="radio" aria-checked="${
                    n === 5
                  }" aria-label="${n} star${n > 1 ? 's' : ''}">${icon('star')}</button>`
              )
              .join('')}
          </div>
          <label class="field">
            <span class="sr-only">Your review</span>
            <textarea class="input textarea" name="text" rows="3" maxlength="500" placeholder="How is it holding up after a few weeks?" required></textarea>
          </label>
          <div class="row row-3 wrap">
            <button class="btn btn--primary btn--sm" type="submit">Post review</button>
            <span class="xs muted">Verified purchases get a badge.</span>
          </div>
        </form>
      </div>
    </section>

    <section class="section section--flush-top container">
      ${sectionHead({
        title: `Pairs well with <span class="accent">${esc(p.name)}.</span>`,
        link: { href: '#/shop', label: 'Shop all' },
      })}
      <div class="grid-products grid-products--4">${related.map((x, i) => productCard(x, i)).join('')}</div>
    </section>
    ${perkRow()}`;

    return {
      html,
      title: `${p.name} — ${p.tagline} · Arena`,
      desc: `${p.name}: ${p.tagline}. ${p.blurb}`,
      image: shareImg,
      mount(root) {
        bindGallery(root, p);
        bindAccordions(root);
        bindPdpBuy(root, p);
        bindFbt(root);
        bindReviews(root, p);
        pushRecent(p.id);
        const cd = root.querySelector('[data-countdown]');
        if (cd) tickCountdown(cd);
        injectProductLd(p);
      },
    };
  }

  /* Product structured data — rich results for search engines. Removed by
     the router on the next render (script[data-view-ld]). */
  function injectProductLd(p) {
    try {
      const ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.setAttribute('data-view-ld', '');
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.blurb,
        image: p.image,
        sku: p.id,
        brand: { '@type': 'Brand', name: 'Arena' },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: String(p.rating),
          reviewCount: String(p.reviews),
        },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'USD',
          price: (p.price / 100).toFixed(2),
          availability: p.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
      });
      document.head.appendChild(ld);
    } catch (e) {
      /* structured data is progressive enhancement */
    }
  }

  /* --------------------------- per-product reviews ------------------------ */

  function fmtWhen(ts) {
    return new Date(ts || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function reviewCards(list) {
    if (!list.length) {
      return `<div class="review-empty">${icon('star')}<p>No written reviews yet. Yours would be the first.</p></div>`;
    }
    return list
      .map(
        (r, i) => `
      <article class="review" data-reveal style="--d:${Math.min(i, 4) * 80}ms">
        <div class="review__top">
          <span class="review__who"><span class="avatar">${esc(r.initials || '?')}</span><span><span class="review__name">${esc(
            r.name
          )}</span><br><span class="review__date">${fmtWhen(r.at)}</span></span></span>
          ${stars(r.rating)}
        </div>
        <p class="review__text">${esc(r.text)}</p>
        ${
          r.verified
            ? `<span class="review__verified">${icon('check')} Verified purchase</span>`
            : `<span class="xs muted">Owner review</span>`
        }
      </article>`
      )
      .join('');
  }

  function bindReviews(root, p) {
    const grid = root.querySelector('[data-review-grid]');
    const form = root.querySelector('[data-review-form]');
    if (!grid || !form) return;

    const repaint = () => {
      grid.innerHTML = reviewCards(Reviews.forProduct(p.id));
      grid.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
    };

    /* pull shared reviews — Firebase when configured, legacy bridge otherwise */
    const pull =
      window.Cloud && Cloud.configured
        ? Cloud.pullReviews(p.id)
        : window.API
        ? API.pullReviews(p.id)
        : Promise.resolve(null);
    pull
      .then((cloud) => {
        if (cloud && Reviews.mergeCloud(cloud)) repaint();
      })
      .catch(() => {});

    const ratingEl = form.querySelector('.rrating');
    let rating = 5;
    const paintStars = () => {
      ratingEl.querySelectorAll('[data-rate]').forEach((x) => {
        const n = Number(x.getAttribute('data-rate'));
        x.classList.toggle('is-on', n <= rating);
        x.setAttribute('aria-checked', String(n === rating));
      });
    };
    ratingEl.querySelectorAll('[data-rate]').forEach((b) =>
      b.addEventListener('click', () => {
        rating = Number(b.getAttribute('data-rate'));
        paintStars();
      })
    );

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = window.Auth ? Auth.current() : null;
      if (!u) {
        UI.toast({
          title: 'Sign in to review',
          sub: 'Owners with an account can post reviews.',
          action: { label: 'Sign in', href: '#/login?next=' + encodeURIComponent('/product/' + p.id) },
        });
        return;
      }
      const ta = form.querySelector('[name="text"]');
      const text = ta.value.trim();
      if (text.length < 10) {
        UI.toast({ title: 'A few more words', sub: 'Reviews need at least 10 characters.' });
        ta.focus();
        return;
      }
      if (Reviews.forProduct(p.id).some((r) => r.userId === u.id)) {
        UI.toast({ title: 'You already reviewed this', sub: 'One review per owner keeps things honest.' });
        return;
      }
      const purchased = window.Orders
        ? Orders.forUser(u).some((o) => (o.items || []).some((it) => (it.productId || it.id) === p.id))
        : false;
      const rec = Reviews.add({
        productId: p.id,
        userId: u.id,
        name: u.name,
        initials: (u.name || '?')
          .split(/\s+/)
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        rating,
        text,
        verified: purchased,
      });
      ta.value = '';
      rating = 5;
      paintStars();
      repaint();
      UI.toast({
        title: 'Review posted',
        sub: purchased ? 'Thanks, marked as a verified purchase.' : 'Thanks for sharing with future owners.',
      });
      if (window.Cloud && Cloud.configured) {
        Cloud.pushReview(rec);
      } else if (window.API) {
        API.pushReview(rec)
          .then((r) => {
            if (r.shared) Reviews.markShared(rec.id);
          })
          .catch(() => {});
      }
    });
  }

  function bindGallery(root, p) {
    const main = root.querySelector('[data-gallery-main]');
    const img = main && main.querySelector('img');
    if (!img) return;

    root.querySelectorAll('[data-thumb]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const g = p.gallery[Number(btn.getAttribute('data-thumb'))];
        root.querySelectorAll('[data-thumb]').forEach((b) => b.classList.toggle('is-active', b === btn));
        img.style.opacity = '0';
        setTimeout(() => {
          img.src = g.src;
          img.style.objectPosition = g.pos;
          img.style.setProperty('--base', g.scale);
          img.style.opacity = '1';
        }, 160);
      })
    );

    img.style.transition = 'opacity .25s ease, transform .5s cubic-bezier(.16,1,.3,1)';
    main.addEventListener('pointerenter', () => {
      img.style.transformOrigin = 'center';
      main.classList.add('is-zoom');
    });
    main.addEventListener('pointermove', (e) => {
      const r = main.getBoundingClientRect();
      img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    });
    main.addEventListener('pointerleave', () => main.classList.remove('is-zoom'));
  }

  function bindAccordions(root) {
    root.querySelectorAll('.acc__btn').forEach((btn) =>
      btn.addEventListener('click', () => {
        const acc = btn.closest('.acc');
        const open = acc.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
      })
    );
  }

  function bindPdpBuy(root, p) {
    let qty = 1;
    let color = p.colors[0].name;
    const value = root.querySelector('[data-pdp-qty-value]');
    const addBtn = root.querySelector('[data-pdp-add]');

    root.querySelectorAll('[data-pdp-qty]').forEach((b) =>
      b.addEventListener('click', () => {
        const cap = Store.stockCap(p.id) || 1;
        qty = Math.min(cap, Math.max(1, qty + Number(b.getAttribute('data-pdp-qty'))));
        value.textContent = qty;
        if (p.stock !== 0) addBtn.textContent = `Add to bag · ${Store.money(p.price * qty)}`;
      })
    );

    root.querySelectorAll('[data-color]').forEach((b) =>
      b.addEventListener('click', () => {
        color = b.getAttribute('data-color');
        root.querySelectorAll('[data-color]').forEach((x) => {
          x.classList.toggle('is-active', x === b);
          x.setAttribute('aria-checked', String(x === b));
        });
        root.querySelector('[data-color-name]').textContent = color;
      })
    );

    addBtn.addEventListener('click', () => {
      if (p.stock === 0 || addBtn.disabled) return;
      Store.add(p.id, qty, color);
      UI.toast({
        title: `${p.name} added to bag`,
        sub: `${color} · ${qty} × ${Store.money(p.price)}`,
        img: p.image,
        action: { label: 'Checkout', href: '#/checkout' },
      });
      addBtn.innerHTML = `${UI.icon('check')} Added`;
      setTimeout(() => {
        addBtn.textContent = `Add to bag · ${Store.money(p.price * qty)}`;
      }, 1600);
      setTimeout(() => UI.setLayer('cart', true), 420);
    });
  }

  /* ------------------------ frequently bought together ------------------- */

  function bindFbt(root) {
    const box = root.querySelector('[data-fbt]');
    if (!box) return;
    const checks = Array.from(box.querySelectorAll('[data-fbt-check]'));
    const totalEl = box.querySelector('[data-fbt-total]');
    const countEl = box.querySelector('[data-fbt-count]');
    const addBtn = box.querySelector('[data-fbt-add]');

    const sync = () => {
      const on = checks.filter((c) => c.checked);
      const sum = on.reduce((n, c) => n + Number(c.getAttribute('data-fbt-price')), 0);
      totalEl.textContent = Store.money(sum);
      countEl.textContent = `${on.length} item${on.length === 1 ? '' : 's'}`;
      addBtn.disabled = !on.length;
      addBtn.innerHTML = on.length
        ? `Add ${on.length} to bag · ${Store.money(sum)} ${icon('bag')}`
        : 'Select at least one item';
    };

    checks.forEach((c) => c.addEventListener('change', sync));
    addBtn.addEventListener('click', () => {
      const on = checks.filter((c) => c.checked);
      let added = 0;
      let skipped = 0;
      on.forEach((c) => {
        const id = c.getAttribute('data-fbt-check');
        const p = Store.product(id);
        if (Store.add(id, 1, p && p.colors[0].name)) added++;
        else skipped++;
      });
      if (!added) {
        UI.toast({ title: 'Nothing could be added', sub: 'Those items are out of stock right now.' });
        return;
      }
      UI.toast({
        title: `${added} item${added === 1 ? '' : 's'} added to bag`,
        sub: skipped ? `${skipped} skipped, out of stock` : `Bundle total ${Store.money(Store.subtotal())}`,
        action: { label: 'Checkout', href: '#/checkout' },
      });
      setTimeout(() => UI.setLayer('cart', true), 420);
    });
    sync();
  }

  function tickCountdown(el) {
    const end = new Date();
    end.setHours(14, 0, 0, 0);
    if (end < new Date()) end.setDate(end.getDate() + 1);
    const paint = () => {
      const ms = end - new Date();
      if (ms <= 0) return;
      const h = Math.floor(ms / 3.6e6);
      const m = Math.floor((ms % 3.6e6) / 6e4);
      el.textContent = `${h}h ${m}m`;
    };
    paint();
    clearInterval(window.__cdTimer);
    window.__cdTimer = setInterval(paint, 30000);
  }

  /* Collision-free, unguessable order id — order numbers are readable by
     anyone who has one (customer tracking), so they must not be
     enumerable: 12 characters from a 32-symbol alphabet via crypto (2^60). */
  function makeOrderId() {
    const y = new Date().getFullYear();
    const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; /* no 0/O/1/I */
    const bytes = new Uint8Array(12);
    const chunk = () => {
      if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
      else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
      return Array.from(bytes, (b) => ALPHABET[b % 32]).join(''); /* 256 % 32 === 0 — no modulo bias */
    };
    let id;
    for (let i = 0; i < 25; i++) {
      const body = chunk();
      id = `AET-${y}-${body.slice(0, 6)}-${body.slice(6)}`;
      if (!window.Orders || !Orders.byId(id)) return id;
    }
    return `AET-${y}-${chunk()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }

  /* ============================== CHECKOUT =============================== */

  function summaryLines(method) {
    const shipping = Store.shipping(method);
    return `
      <div class="summary__line"><span>Subtotal</span><span>${money(Store.subtotal())}</span></div>
      ${
        Store.discount()
          ? `<div class="summary__line" style="color:var(--ok)"><span>Discount · ${esc(Store.promo)}</span><span>−${money(
              Store.discount()
            )}</span></div>`
          : ''
      }
      <div class="summary__line"><span>Shipping${method === 'express' ? ' · Express' : ''}</span><span>${
      shipping === 0 ? 'Free' : money(shipping)
    }</span></div>
      <div class="summary__line"><span>Estimated delivery</span><span><b>${Store.etaLabel(method)}</b></span></div>
      <div class="summary__line"><span>Estimated tax</span><span>${money(Store.tax(method))}</span></div>`;
  }

  function checkout() {
    if (!Store.items.length) {
      return {
        title: 'Your bag is empty — Arena',
        html: `
        ${crumbs([{ label: 'Checkout', href: '#/checkout' }])}
        <div class="container">
          <div class="empty-state" style="margin-block:clamp(30px,6vw,80px)">
            <div class="cart-empty__icon">${icon('bag')}</div>
            <h1 class="h2">Nothing to check out <span class="accent">yet.</span></h1>
            <p class="muted" style="max-width:44ch">Your bag is empty. The full line is ${count()} objects deep. A good place to begin is the best sellers.</p>
            <div class="row row-4 wrap center">
              <a class="btn btn--primary" href="#/shop">Shop the collection ${icon('arrowRight')}</a>
              <a class="btn btn--ghost" href="#/">Back home</a>
            </div>
          </div>
        </div>
        ${perkRow()}`,
      };
    }

    const html = `
    ${crumbs([{ label: 'Shop', href: '#/shop' }, { label: 'Checkout', href: '#/checkout' }])}
    <header class="container page-head">
      <div class="page-head__inner">
        <div class="page-head__row">
          <h1 data-reveal style="--d:60ms">Checkout<span class="accent">.</span></h1>
          <span class="row row-3 small muted" data-reveal style="--d:110ms">${icon('lock')} You won’t be charged until the last step</span>
        </div>
      </div>
    </header>

    <div class="container checkout">
      <form class="checkout__form" data-checkout novalidate>
        <fieldset class="fs" data-step="contact">
          <div class="fs__head"><span class="fs__n">1</span><h2 class="fs__t">Contact</h2><span class="fs__line"></span></div>
          <div class="form-grid">
            <label class="field span-2">
              <span class="field__label">Email address</span>
              <input class="input" name="email" type="email" autocomplete="email" placeholder="you@studio.com" required data-validate="email">
              <span class="field__error">Enter a valid email address.</span>
            </label>
            <label class="field span-2">
              <span class="field__label">Phone <span class="muted" style="font-weight:400">· for delivery updates</span></span>
              <input class="input" name="phone" type="tel" autocomplete="tel" placeholder="+1 555 0100">
              <span class="field__error"></span>
            </label>
          </div>            <label class="checkbox"><input type="checkbox"> <span>Email me drop notices and repair notes. One letter a month.</span></label>
        </fieldset>

        <fieldset class="fs" data-step="shipping">
          <div class="fs__head"><span class="fs__n">2</span><h2 class="fs__t">Shipping address</h2><span class="fs__line"></span></div>
          <div class="form-grid">
            <label class="field"><span class="field__label">First name</span>
              <input class="input" name="first" autocomplete="given-name" required data-validate="name" placeholder="Marta">
              <span class="field__error">Required.</span></label>
            <label class="field"><span class="field__label">Last name</span>
              <input class="input" name="last" autocomplete="family-name" required data-validate="name" placeholder="Lindqvist">
              <span class="field__error">Required.</span></label>
            <label class="field span-2"><span class="field__label">Address</span>
              <input class="input" name="address" autocomplete="street-address" required data-validate="name" placeholder="Strandgade 14, 2nd floor">
              <span class="field__error">Required.</span></label>
            <label class="field"><span class="field__label">City</span>
              <input class="input" name="city" autocomplete="address-level2" required data-validate="name" placeholder="Copenhagen">
              <span class="field__error">Required.</span></label>
            <label class="field"><span class="field__label">Postal code</span>
              <input class="input" name="zip" autocomplete="postal-code" required data-validate="zip" placeholder="1401">
              <span class="field__error">3–10 characters, please.</span></label>
            <label class="field span-2"><span class="field__label">Country</span>
              <select class="select" name="country" autocomplete="country-name">
                ${['United States', 'United Kingdom', 'Denmark', 'Germany', 'France', 'Netherlands', 'Japan', 'Australia', 'Canada']
                  .map((c) => `<option${c === 'United States' ? ' selected' : ''}>${c}</option>`)
                  .join('')}
              </select><span class="field__error"></span></label>
          </div>

          <div class="stack stack-2" data-delivery>
            <label class="choice is-active">
              <input type="radio" name="ship" value="standard" checked>
              <span class="choice__body"><span class="choice__t">Standard · 3–5 business days</span><span class="choice__d">Tracked, carbon-neutral · arrives ${Store.etaLabel(
                'standard'
              )}</span></span>
              <span class="choice__p" data-ship-standard>${Store.shipping('standard') === 0 ? 'Free' : money(Store.shipping('standard'))}</span>
            </label>
            <label class="choice">
              <input type="radio" name="ship" value="express">
              <span class="choice__body"><span class="choice__t">Express · 1–2 business days</span><span class="choice__d">Order before 14:00 CET · arrives ${Store.etaLabel(
                'express'
              )}</span></span>
              <span class="choice__p">${money(DATA.expressFee)}</span>
            </label>
          </div>
        </fieldset>

        <fieldset class="fs" data-step="payment">
          <div class="fs__head"><span class="fs__n">3</span><h2 class="fs__t">Payment</h2><span class="fs__line"></span></div>
          <div class="pay-methods" role="radiogroup" aria-label="Payment method">
            <button class="pill is-active" type="button" data-pay="card" role="radio" aria-checked="true">${icon('card')} Card</button>
            <button class="pill" type="button" data-pay="cod" role="radio" aria-checked="false">${icon('banknote')} Cash on delivery</button>
            <span class="pill" aria-disabled="true">Apple Pay</span>
            <span class="pill" aria-disabled="true">PayPal</span>
          </div>
          <div class="form-grid" data-card-fields>
            <label class="field span-2"><span class="field__label">Card number</span>
              <input class="input" name="card" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" required data-validate="card" data-format="card">
              <span class="field__error">Enter a 16-digit card number.</span></label>
            <label class="field span-2"><span class="field__label">Name on card</span>
              <input class="input" name="cardname" autocomplete="cc-name" placeholder="MARTA LINDQVIST" required data-validate="name" style="text-transform:uppercase">
              <span class="field__error">Required.</span></label>
            <label class="field"><span class="field__label">Expiry</span>
              <input class="input" name="exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY" required data-validate="exp" data-format="exp">
              <span class="field__error">MM / YY.</span></label>
            <label class="field"><span class="field__label">CVC</span>
              <input class="input" name="cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" required data-validate="cvc" maxlength="4">
              <span class="field__error">3–4 digits.</span></label>
          </div>
          <div class="cod-note" data-cod-note hidden>${icon('banknote')}<p><b>Pay the courier at your door</b>: cash or card on arrival, no surcharge. Standard delivery (3–5 business days); nothing is charged online.</p></div>
          <div class="stack stack-3">
            <div class="promo">
              <input class="input" name="promo" placeholder="Discount code" value="${Store.promo || ''}" aria-label="Discount code">
              <button class="btn btn--ghost btn--sm" type="button" data-promo-apply>Apply</button>
            </div>
            <span class="promo__msg${Store.promo ? ' is-shown' : ''}" data-promo-msg>${
      Store.promo ? `${Store.promo} applied, ${Math.round(DATA.promoCodes[Store.promo] * 100)}% off.` : ''
    }</span>
          </div>
          <p class="xs muted row row-3">${icon('lock')} Payments are encrypted end-to-end. This is a demo; no card is charged.</p>
        </fieldset>

        <button class="btn btn--primary btn--lg btn--block" type="submit" data-place-order>
          Place order · <span data-order-total>${money(Store.total('standard'))}</span>
        </button>
        <p class="xs muted" style="text-align:center">By placing this order you agree to our terms, 60-night return policy and two-year warranty.</p>
      </form>

      <aside class="summary" aria-label="Order summary">
        <div class="stack stack-3">
          <span class="kicker">Order summary</span>
          <div class="summary__items">
            ${Store.items
              .map((l) => {
                const p = Store.product(l.productId);
                return `
                <div class="summary__item">
                  <span class="summary__media"><img src="${p.image}" alt="${esc(p.name)}" width="58" height="72" loading="lazy"><span class="summary__qty">${l.qty}</span></span>
                  <span><span class="summary__name">${esc(p.name)}</span><br><span class="summary__var">${esc(l.color)}</span></span>
                  <span class="summary__price">${money(l.price * l.qty)}</span>
                </div>`;
              })
              .join('')}
          </div>
        </div>
        <div class="summary__lines" data-summary-lines>
          ${summaryLines('standard')}
          <div class="summary__total"><span>Total</span><span data-summary-total>${money(Store.total('standard'))}</span></div>
        </div>
        <span class="summary__secure">${icon('shield')} Buyer protection included</span>
      </aside>
    </div>
    ${perkRow()}`;

    return {
      html,
      title: 'Checkout — Arena',
      mount(root) {
        bindCheckout(root);
      },
    };
  }

  function bindCheckout(root) {
    const form = root.querySelector('[data-checkout]');
    let method = 'standard';

    /* prefill from the signed-in profile */
    const me = window.Auth ? Auth.current() : null;
    if (me) {
      const set = (name, val) => {
        const el = form.elements[name];
        if (el && !el.value && val) el.value = val;
      };
      set('email', me.email);
      const parts = String(me.name || '').trim().split(/\s+/);
      set('first', parts[0] || '');
      set('last', parts.slice(1).join(' ') || '');
      set('phone', me.phone || '');
      const addr = (me.addresses || []).find((a) => a.default) || (me.addresses || [])[0];
      if (addr) {
        set('address', addr.line);
        set('city', addr.city);
        set('zip', addr.zip);
        const country = form.elements.country;
        if (country && addr.country && Array.from(country.options).some((o) => o.text === addr.country)) {
          country.value = addr.country;
        }
      }
    }

    const refreshTotals = () => {
      root.querySelector('[data-summary-lines]').innerHTML =
        summaryLines(method) +
        `<div class="summary__total"><span>Total</span><span data-summary-total>${money(Store.total(method))}</span></div>`;
      root.querySelector('[data-order-total]').textContent = money(Store.total(method));
      const std = root.querySelector('[data-ship-standard]');
      if (std) std.textContent = Store.shipping('standard') === 0 ? 'Free' : money(Store.shipping('standard'));
    };

    root.querySelectorAll('input[name="ship"]').forEach((r) =>
      r.addEventListener('change', () => {
        method = r.value;
        root.querySelectorAll('.choice').forEach((c) => c.classList.toggle('is-active', Boolean(c.querySelector('input').checked)));
        refreshTotals();
      })
    );

    /* payment method: card vs cash on delivery */
    let pay = 'card';
    const cardFields = root.querySelector('[data-card-fields]');
    const codNote = root.querySelector('[data-cod-note]');
    const syncShip = () => {
      root.querySelectorAll('input[name="ship"]').forEach((r) => {
        const off = pay === 'cod' && r.value === 'express';
        r.disabled = off;
        const choice = r.closest('.choice');
        if (choice) choice.classList.toggle('is-off', off);
      });
    };
    root.querySelectorAll('[data-pay]').forEach((btn) =>
      btn.addEventListener('click', () => {
        pay = btn.getAttribute('data-pay');
        root.querySelectorAll('[data-pay]').forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-checked', String(on));
        });
        cardFields.hidden = pay !== 'card';
        codNote.hidden = pay !== 'cod';
        if (pay === 'cod' && method !== 'standard') {
          const std = root.querySelector('input[name="ship"][value="standard"]');
          if (std) std.checked = true;
          method = 'standard';
          root.querySelectorAll('.choice').forEach((c) => c.classList.toggle('is-active', Boolean(c.querySelector('input').checked)));
          refreshTotals();
        }
        syncShip();
      })
    );
    syncShip();

    /* input formatting + inline validation */
    const validators = {
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      name: (v) => v.trim().length >= 2,
      zip: (v) => v.trim().length >= 3 && v.trim().length <= 10,
      card: (v) => v.replace(/\D/g, '').length === 16,
      exp: (v) => /^(0[1-9]|1[0-2])\s*\/?\s*\d{2}$/.test(v.trim()),
      cvc: (v) => /^\d{3,4}$/.test(v.trim()),
    };

    form.querySelectorAll('[data-format]').forEach((input) => {
      input.addEventListener('input', () => {
        const kind = input.getAttribute('data-format');
        if (kind === 'card') {
          const digits = input.value.replace(/\D/g, '').slice(0, 16);
          input.value = digits.replace(/(.{4})/g, '$1 ').trim();
        }
        if (kind === 'exp') {
          const digits = input.value.replace(/\D/g, '').slice(0, 4);
          input.value = digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
        }
      });
    });

    const validateField = (input) => {
      const rule = input.getAttribute('data-validate');
      if (!rule) return true;
      const ok = validators[rule](input.value);
      input.classList.toggle('is-invalid', !ok);
      const err = input.parentElement.querySelector('.field__error');
      if (err) err.classList.toggle('is-shown', !ok);
      return ok;
    };

    form.querySelectorAll('[data-validate]').forEach((input) => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) validateField(input);
      });
    });

    /* promo */
    const promoBtn = root.querySelector('[data-promo-apply]');
    const promoMsg = root.querySelector('[data-promo-msg]');
    if (promoBtn)
      promoBtn.addEventListener('click', () => {
        const input = form.querySelector('[name="promo"]');
        const code = input.value.trim().toUpperCase();
        if (Store.applyPromo(code)) {
          promoMsg.textContent = `${code} applied, ${Math.round(DATA.promoCodes[code] * 100)}% off.`;
          promoMsg.classList.add('is-shown');
          promoMsg.classList.remove('is-bad');
          refreshTotals();
          UI.toast({ title: 'Discount applied', sub: `${code} · you saved ${money(Store.discount())}` });
        } else {
          promoMsg.textContent = code ? `“${code}” isn’t a valid code.` : 'Enter a code first.';
          promoMsg.classList.add('is-shown', 'is-bad');
        }
      });

    /* submit */
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = Array.from(form.querySelectorAll('[data-validate]')).filter(
        (f) => pay === 'card' || !f.closest('[data-card-fields]')
      );
      const bad = fields.filter((f) => !validateField(f));
      if (bad.length) {
        bad[0].focus();
        bad[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
        UI.toast({ title: 'Check the highlighted fields', sub: `${bad.length} field${bad.length > 1 ? 's' : ''} need attention.` });
        return;
      }

      const data = new FormData(form);
      const order = {
        id: makeOrderId(),
        email: data.get('email'),
        name: `${data.get('first')} ${data.get('last')}`,
        phone: data.get('phone') || '',
        address: data.get('address') || '',
        zip: data.get('zip') || '',
        city: data.get('city'),
        country: data.get('country'),
        method,
        payment: pay,
        items: Store.items.map((l) => {
          const p = Store.product(l.productId);
          return { id: p.id, productId: p.id, name: p.name, image: p.image, color: l.color, qty: l.qty, price: l.price };
        }),
        subtotal: Store.subtotal(),
        discount: Store.discount(),
        promo: Store.promo,
        shipping: Store.shipping(method),
        tax: Store.tax(method),
        total: Store.total(method),
        placedAt: Date.now(),
      };
      const saved = window.Orders ? Orders.place(order) : order;
      window.__lastOrder = saved;
      /* best-effort mirror into the shared store. Orders.place already pushed
         to Firebase when it is configured; without a config we fall back to
         the legacy serverless bridge — and always to local-only otherwise. */
      if ((!window.Cloud || !Cloud.configured) && window.API) {
        API.placeOrder(saved)
          .then((r) => {
            if (r.shared && window.Orders) Orders.markShared(saved.id);
          })
          .catch(() => {});
      }
      Store.clear();
      location.hash = '#/order-confirmed?id=' + encodeURIComponent(saved.id);
    });

    refreshTotals();
  }

  /* ============================ CONFIRMATION ============================= */

  /* one-line live status strip used on the confirmation page */
  function liveStatusHTML(o) {
    const kit = window.OrderKit;
    const label = kit ? kit.label(o.status) : o.status;
    const last = (o.history || []).slice(-1)[0];
    const when = kit ? kit.fmtTime(last ? last.at : o.placedAt) : new Date(last ? last.at : o.placedAt).toLocaleString();
    const live = window.Cloud && Cloud.configured;
    return `
      <span class="st st--${o.status}">${esc(label)}</span>
      <span class="xs muted" style="display:inline-flex;gap:6px;align-items:center">${icon(
        'clock'
      )} Updated ${esc(when)} · ${
      live ? 'live: this page refreshes itself' : 'add Firebase in js/firebase-config.js for cross-device updates'
    }</span>`;
  }

  function confirmed(params) {
    const fromStore = params && params.id && window.Orders ? Orders.byId(params.id) : null;
    const o = fromStore || window.__lastOrder;
    if (!o) {
      return {
        title: 'Order status — Arena',
        html: `${crumbs([{ label: 'Order', href: '#/order-confirmed' }])}
        <div class="container"><div class="empty-state" style="margin-block:clamp(30px,6vw,80px)">
          <div class="cart-empty__icon">${icon('package')}</div>
          <h1 class="h2">No recent order <span class="accent">here.</span></h1>
          <p class="muted" style="max-width:44ch">We couldn’t find an order from this session. If you just placed one, the confirmation is in your inbox.</p>
          <a class="btn btn--primary" href="#/shop">Continue shopping ${icon('arrowRight')}</a>
        </div></div>`,
      };
    }

    const etaText = Store.etaLabel(o.method, new Date(o.placedAt), true);

    const html = `
    <div class="container">
      <div class="done">
        <span class="done__mark">${icon('check')}</span>
        <h1 class="done__title" data-reveal style="--d:70ms">Thank you, <span class="accent">${esc(o.name.split(' ')[0])}.</span></h1>
        <p class="small muted" data-reveal style="--d:100ms">A copy is on its way to ${esc(o.email)}.</p>
        <p class="lede" data-reveal style="--d:130ms;text-align:center">Your objects are being wrapped in Copenhagen. You’ll get a tracking link the moment they leave the studio.</p>
        <span class="done__order" data-reveal style="--d:180ms">${icon('package')} ${esc(o.id)} ${UI.icon('copy')}</span>

        <div data-live-status data-reveal style="--d:205ms;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;margin-block:14px">${liveStatusHTML(
          o
        )}</div>

        <div class="done__card" data-reveal style="--d:230ms">
          <span class="done__eta">${icon('truck')} <span><b>Estimated delivery:</b> ${etaText} · ${
      o.method === 'express' ? 'Express (1–2 days)' : 'Standard (3–5 days)'
    }</span></span>
          ${
            o.payment === 'cod'
              ? `<span class="done__eta">${icon('banknote')} <span><b>Cash on delivery</b>: keep ${money(
                  o.total
                )} ready; the courier takes cash or card at the door.</span></span>`
              : ''
          }
          <hr class="hairline">
          ${o.items
            .map(
              (it) => `
            <div class="summary__item">
              <span class="summary__media"><img src="${esc(it.image)}" alt="${esc(it.name)}" width="58" height="72"><span class="summary__qty">${it.qty}</span></span>
              <span><span class="summary__name">${esc(it.name)}</span><br><span class="summary__var">${esc(it.color)}</span></span>
              <span class="summary__price">${money(it.price * it.qty)}</span>
            </div>`
            )
            .join('')}
          <hr class="hairline">
          <div class="summary__lines">
            <div class="summary__line"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
            ${o.discount ? `<div class="summary__line" style="color:var(--ok)"><span>Discount · ${esc(o.promo)}</span><span>−${money(o.discount)}</span></div>` : ''}
            <div class="summary__line"><span>Shipping</span><span>${o.shipping === 0 ? 'Free' : money(o.shipping)}</span></div>
            <div class="summary__line"><span>Tax</span><span>${money(o.tax)}</span></div>
            <div class="summary__total"><span>${o.payment === 'cod' ? 'Due on delivery' : 'Paid'}</span><span>${money(o.total)}</span></div>
          </div>
        </div>

        <div class="row row-4 wrap center" data-reveal style="--d:280ms">
          <a class="btn btn--primary btn--lg" href="#/shop">Continue shopping ${icon('arrowRight')}</a>
          <button class="btn btn--ghost btn--lg" data-track>Track this order</button>
        </div>
        <p class="xs muted" data-reveal>Questions? <a class="link link--underline" href="#/about?to=contact">Talk to a human</a>. We reply within one business day.</p>
      </div>
    </div>
    ${newsletterSection()}
    ${perkRow()}`;

    return {
      html,
      title: `Order ${o.id} confirmed — Arena`,
      mount(root) {
        const t = root.querySelector('[data-track]');
        if (t) t.addEventListener('click', () => (location.hash = '#/track?id=' + encodeURIComponent(o.id)));
        bindNewsletter();
        /* live: watch this order so status changes made anywhere appear here */
        if (window.Cloud && Cloud.configured) {
          if (unsubConfirmed) unsubConfirmed();
          unsubConfirmed = Cloud.watchOrder(o.id, (cloud) => {
            if (!cloud || !window.Orders) return;
            Orders.mergeCloud([cloud]);
            const fresh = Orders.byId(o.id) || cloud;
            const region = root.querySelector('[data-live-status]');
            if (region) region.innerHTML = liveStatusHTML(fresh);
          });
        }
      },
    };
  }

  /* =============================== TRACK ================================= */
  /* Public order tracking (#/track). The order lives in Firebase when it is
     configured, so this page works from any device — otherwise it falls back
     to whatever this browser has in local storage. */

  function trackHint() {
    return `<div class="empty-state" style="margin-block:10px">
      <div class="cart-empty__icon">${icon('truck')}</div>
      <p class="muted" style="max-width:48ch">Type your order number above. It sits in the confirmation email and looks like <span class="mono">AET-2026-123456</span>. The timeline updates on its own once you track it.</p>
    </div>`;
  }

  function trackMissHTML(oid) {
    return `<div class="empty-state" style="margin-block:10px">
      <div class="cart-empty__icon">${icon('search')}</div>
      <h1 class="h2">No order <span class="accent">${esc(oid)}.</span></h1>
      <p class="muted" style="max-width:48ch">Check the number and the email you used at checkout, then try again. Still stuck? <a class="link link--underline" href="#/about?to=contact">Talk to a human</a> and we’ll find it.</p>
    </div>`;
  }

  function trackBodyHTML(o) {
    const kit = window.OrderKit;
    const etaText = Store.etaLabel(o.method, new Date(o.placedAt), true);
    const label = kit ? kit.label(o.status) : o.status;
    const live = window.Cloud && Cloud.configured;
    return `
    <div class="done__card" data-track-card>
      <div class="row row-4 wrap" style="justify-content:space-between;align-items:center;gap:12px">
        <div>
          <div class="orow__id">${icon('package')} ${esc(o.id)}</div>
          <div class="xs muted">${esc(o.name || '')}${o.email ? ' · ' + esc(o.email) : ''} · placed ${
      kit ? kit.fmtDate(o.placedAt) : new Date(o.placedAt).toLocaleDateString()
    } · ${o.method === 'express' ? 'Express' : 'Standard'}</div>
        </div>
        <span class="st st--${o.status}">${esc(label)}</span>
      </div>
      <hr class="hairline">
      ${kit ? kit.steps(o) : ''}
      <ul class="otimeline">
        ${(o.history || [{ status: o.status, at: o.placedAt }])
          .map(
            (h) =>
              `<li><span>${esc(kit ? kit.label(h.status) : h.status)}</span><span class="tl-when">${
                kit ? kit.fmtTime(h.at) : ''
              }</span></li>`
          )
          .join('')}
      </ul>
      <hr class="hairline">
      <span class="done__eta">${icon('truck')} <span><b>Estimated delivery:</b> ${etaText} · ${
      o.method === 'express' ? 'Express (1–2 days)' : 'Standard (3–5 days)'
    }</span></span>
      ${o.items
        .map(
          (it) => `
      <div class="summary__item">
        <span class="summary__media"><img src="${esc(it.image)}" alt="${esc(it.name)}" width="58" height="72"><span class="summary__qty">${it.qty}</span></span>
        <span><span class="summary__name">${esc(it.name)}</span><br><span class="summary__var">${esc(it.color || '')}</span></span>
        <span class="summary__price">${money(it.price * it.qty)}</span>
      </div>`
        )
        .join('')}
      <hr class="hairline">
      <div class="summary__lines">
        <div class="summary__total"><span>${o.status === 'delivered' ? 'Delivered' : 'Order total'}</span><span>${money(
      o.total
    )}</span></div>
      </div>
      <p class="xs muted" style="display:inline-flex;gap:6px;align-items:center;margin-top:10px">${icon(
        'clock'
      )} ${
        live
          ? 'Live: status changes appear here automatically, no refresh needed.'
          : 'Local mode: add your Firebase config (js/firebase-config.js) to track from any device.'
      }</p>
    </div>`;
  }

  function track(params) {
    const startId = params && params.id ? String(params.id).trim().toUpperCase() : '';
    const startEmail = params && params.email ? String(params.email).trim() : '';

    const html = `
    ${crumbs([{ label: 'Track order', href: '#/track' }])}
    <div class="container">
      <header class="page-head">
        <div class="page-head__inner">
          <div class="page-head__row">
            <h1 data-reveal style="--d:60ms">Where is my <span class="accent">order.</span></h1>
            <p class="lede" data-reveal style="--d:120ms;max-width:46ch">Enter your order number and watch it move through paid, packed, shipped and delivered, live, without refreshing.</p>
          </div>
        </div>
      </header>

      <form data-track-form data-reveal style="--d:160ms;display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;max-width:820px;margin-bottom:30px">
        <label class="field" style="flex:1 1 220px"><span class="field__label">Order number</span>
          <input class="input" name="id" placeholder="AET-2026-123456" value="${esc(
            startId
          )}" autocomplete="off" spellcheck="false" required></label>
        <label class="field" style="flex:1 1 240px"><span class="field__label">Email <span class="muted">(optional)</span></span>
          <input class="input" name="email" type="email" placeholder="you@example.com" value="${esc(startEmail)}" autocomplete="email"></label>
        <button class="btn btn--primary" type="submit">Track order ${icon('arrowRight')}</button>
      </form>

      <div data-track-body style="padding-bottom:clamp(30px,6vw,80px)">${startId ? '<p class="muted">Looking that up…</p>' : trackHint()}</div>
    </div>
    ${newsletterSection()}
    ${perkRow()}`;

    return {
      html,
      title: 'Track your order — Arena',
      desc: 'Look up an Arena order with your order number and email, and follow its status live.',
      mount(root) {
        const form = root.querySelector('[data-track-form]');
        const body = root.querySelector('[data-track-body]');
        if (!form || !body) return;
        if (unsubTrack) {
          unsubTrack();
          unsubTrack = null;
        }
        const repaint = (content) => {
          body.innerHTML = content;
        };

        const lookup = async (rawId, rawEmail) => {
          const oid = String(rawId || '').trim().toUpperCase();
          const mail = String(rawEmail || '').trim().toLowerCase();
          if (!oid) {
            repaint(trackHint());
            return;
          }
          repaint(`<p class="muted">Looking up ${esc(oid)}…</p>`);
          let o = window.Orders ? Orders.byId(oid) : null;
          if ((!o || !o.shared) && window.Cloud && Cloud.configured) {
            const cloud = await Cloud.getOrder(oid);
            if (cloud && window.Orders) Orders.mergeCloud([cloud]);
            o = (window.Orders && Orders.byId(oid)) || cloud;
          }
          if (o && mail && mail !== String(o.email || '').toLowerCase()) o = null;
          if (!o) {
            repaint(trackMissHTML(oid));
            return;
          }
          repaint(trackBodyHTML(o));

          /* live updates for as long as this page is open */
          if (window.Cloud && Cloud.configured) {
            if (unsubTrack) unsubTrack();
            unsubTrack = Cloud.watchOrder(oid, (cloudOrder) => {
              if (!cloudOrder) return;
              if (window.Orders) Orders.mergeCloud([cloudOrder]);
              const fresh = (window.Orders && Orders.byId(oid)) || cloudOrder;
              if (mail && mail !== String(fresh.email || '').toLowerCase()) return;
              repaint(trackBodyHTML(fresh));
            });
          }
        };

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const data = new FormData(form);
          const oid = String(data.get('id') || '').trim().toUpperCase();
          const mail = String(data.get('email') || '').trim();
          if (!/^[A-Z0-9-]{6,}$/.test(oid)) {
            UI.toast({ title: 'Check the order number', sub: 'It looks like AET-2026-123456.' });
            return;
          }
          /* make the URL shareable/refreshable without re-rendering the page */
          const q = new URLSearchParams({ id: oid });
          if (mail) q.set('email', mail);
          try {
            history.replaceState(null, '', '#/track?' + q.toString());
          } catch (err) {
            /* very old webviews — the lookup still works */
          }
          lookup(oid, mail);
        });

        if (startId) lookup(startId, startEmail);
      },
    };
  }

  /* =============================== 404 =================================== */

  function notFound() {
    return {
      title: 'Page not found — Arena',
      noindex: true,
      html: `
      <div class="container">
        <div class="done">
          <span class="done__mark" style="background:var(--accent)">${icon('sparkle')}</span>
          <h1 class="done__title">This page went <span class="accent">quiet.</span></h1>
          <p class="lede" style="text-align:center">The link is broken or the product has been retired. ${count()} objects are still waiting in the shop.</p>
          <div class="row row-4 wrap center">
            <a class="btn btn--primary btn--lg" href="#/shop">Shop the collection ${icon('arrowRight')}</a>
            <a class="btn btn--ghost btn--lg" href="#/">Back home</a>
          </div>
        </div>
      </div>`,
    };
  }

  /* =============================== JOURNAL =============================== */

  function journal() {
    const [lead, ...rest] = DATA.journal;
    const html = `
    ${crumbs([{ label: 'Journal', href: '#/journal' }])}
    <header class="container page-head">
      <div class="page-head__inner">
        <div class="page-head__row">
          <h1 data-reveal style="--d:60ms">Field notes<span class="accent">.</span></h1>
          <p class="lede" data-reveal style="--d:120ms;max-width:46ch">Design decisions, repair guides, and the occasional argument about two hundred hertz.</p>
        </div>
      </div>
    </header>

    <section class="section section--flush-top container">
      <a class="split" href="#/journal" data-reveal style="border:0">
        <span class="split__media">
          <img src="${lead.image}" alt="${esc(lead.title)}" loading="eager" width="1400" height="1600">
          <span class="split__tag">${lead.tag} · ${lead.read}</span>
        </span>
        <span class="split__copy" style="display:grid;gap:18px;align-content:center">
          <span class="mono">${lead.date} · latest</span>
          <h2 class="h2">${esc(lead.title)}</h2>
          <span class="lede">${esc(lead.excerpt)}</span>
          <span class="link">Read the story ${icon('arrowRight')}</span>
        </span>
      </a>
    </section>

    <section class="section section--flush-top container">
      <div class="posts${rest.length === 2 ? ' posts--2' : ''}">
        ${rest
          .map(
            (p, i) => `
          <a class="post" href="#/journal" data-reveal style="--d:${i * 80}ms">
            <span class="post__media"><img src="${p.image}" alt="${esc(p.title)}" loading="lazy" width="1200" height="900"></span>
            <span class="post__meta"><span class="mono">${p.tag}</span><span class="divider-dot"></span><span class="xs muted">${p.date} · ${p.read}</span></span>
            <span><span class="post__title">${esc(p.title)}</span><span class="post__excerpt" style="display:block;margin-top:7px">${esc(p.excerpt)}</span></span>
          </a>`
          )
          .join('')}
      </div>
    </section>
    ${newsletterSection()}
    ${perkRow()}`;

    return { html, title: 'Journal — Arena', desc: 'Notes from the Arena studio: repair stories, materials, and why we only release twice a year.', mount(root) { bindNewsletter(root); } };
  }

  /* ================================ ABOUT ================================ */

  function about() {
    const html = `
    ${crumbs([{ label: 'Our story', href: '#/about' }])}
    <header class="container page-head">
      <div class="page-head__inner">
        <div class="page-head__row">
          <h1 class="display" data-reveal style="--d:60ms;max-width:14ch">Made to be <span class="accent">kept.</span></h1>
          <p class="lede" data-reveal style="--d:120ms;max-width:44ch">Arena began with one frustrating question: why does everything electronic eventually become rubbish?</p>
        </div>
      </div>
    </header>

    <section class="section section--flush-top container" id="origin">
      <div class="split">
        <div class="split__media" data-reveal="left">
          <img src="assets/img/leaf-shadow.jpg" alt="Light through leaves on a studio wall" loading="lazy" width="1400" height="1600">
          <span class="split__tag">Studio no. 4, Copenhagen</span>
        </div>
        <div class="split__copy">
          <h2 class="h2" data-reveal style="--d:70ms">${count()} products, <span class="accent">on purpose.</span></h2>
          <p class="lede" data-reveal style="--d:130ms">We started in a two-room studio off Refshaleveen with a single product and a rule we still keep: never release something we would not replace with itself.</p>
          <p class="lede" data-reveal style="--d:180ms">Seven years later the catalogue is ${count()} items deep. Each one is drawn, prototyped and repaired in the same building, and every part is published for anyone who wants to keep theirs running.</p>
          <div class="stats" data-reveal style="--d:240ms">
            <div class="stat"><span class="stat__n" data-count="7">0</span><span class="stat__l">years, two releases a year</span></div>
            <div class="stat"><span class="stat__n" data-count="92">0</span><span class="stat__l">countries shipped to</span></div>
            <div class="stat"><span class="stat__n" data-count="1.9" data-decimals="1" data-suffix="%">0</span><span class="stat__l">of units returned in 2025</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--tight container" id="repair">
      <div class="split split--reverse">
        <div class="split__media" data-reveal="right">
          <img src="assets/img/desk-flatlay.jpg" alt="Workbench with tools and parts" loading="lazy" width="1400" height="1600">
          <span class="split__tag">Repair bench · 4 min per unit</span>
        </div>
        <div class="split__copy">
          <h2 class="h2" data-reveal style="--d:70ms">If it opens, it <span class="accent">lasts.</span></h2>
          <ul class="stack stack-2" data-reveal style="--d:130ms">
            ${[
              ['wrench', 'Standard screws only, no glue, no ultrasonic welding'],
              ['package', 'Published part numbers, sold at cost for seven years'],
              ['leaf', '68% renewable energy across both assembly partners'],
              ['refresh', 'Trade-in programme: we refurbish and resell, never shred'],
            ]
              .map(
                ([ic, t]) =>
                  `<li class="row row-3" style="align-items:center;font-size:.95rem;color:var(--ink-2);padding:10px 0;border-bottom:1px dashed var(--line)"><span style="color:var(--accent);flex:none">${icon(
                    ic
                  )}</span><span>${t}</span></li>`
              )
              .join('')}
          </ul>
          <a class="link" href="#/shop" data-reveal style="--d:190ms">See what we make ${icon('arrowRight')}</a>
        </div>
      </div>
    </section>

    <section class="section section--tight container" id="contact">
      ${sectionHead({ title: 'Humans, not <span class="accent">tickets.</span>' })}
      <div class="feature-row">
        ${[
          ['mail', 'Customer care', 'hello@arena.studio · replies within one business day, written by the people who pack the boxes.', '+45 33 12 44 08'],
          ['sparkle', 'Press & partnerships', 'For samples, reviews and wholesale: press@arena.studio. High-resolution assets on request.', 'Press kit →'],
          ['globe', 'Studio visits', 'Strandgade 14, Copenhagen. Thursdays 10–16, by appointment, coffee included.', 'Book a visit →'],
        ]
          .map(
            ([ic, t, d, extra], i) => `
          <div class="feature" data-reveal style="--d:${i * 80}ms">
            <span class="feature__icon">${icon(ic)}</span>
            <span class="feature__t">${t}</span>
            <span class="feature__d">${d}</span>
            <span class="mono" style="color:var(--accent)">${extra}</span>
          </div>`
          )
          .join('')}
      </div>
    </section>
    <section class="section section--tight container" id="legal">
      ${sectionHead({ title: 'The fine print. <span class="accent">Short.</span>' })}
      <div class="feature-row">
        ${[
          [
            'lock',
            'Privacy',
            'We keep only what an order needs: name, address, email and what you bought. Card numbers never touch our servers. Order records stay for seven years because Danish tax law requires it. No ad trackers, no reselling data.',
            'privacy@arena.studio',
          ],
          [
            'shield',
            'Terms',
            'Sixty nights to send anything back on our prepaid label. Every product ships with a repair guide and parts stay stocked for seven years after discontinuation. Danish law and EU consumer rights govern every order.',
            'Last updated 1 October 2026',
          ],
          [
            'user',
            'Accessibility',
            'Built to WCAG 2.2 AA: full keyboard control, screen-reader labels, AA contrast and reduced-motion support. If you hit a barrier, write accessibility@arena.studio and we will fix it within one business day.',
            'accessibility@arena.studio',
          ],
        ]
          .map(
            ([ic, t, d, extra], i) => `
          <div class="feature" data-reveal style="--d:${i * 80}ms">
            <span class="feature__icon">${icon(ic)}</span>
            <span class="feature__t">${t}</span>
            <span class="feature__d">${d}</span>
            <span class="mono" style="color:var(--accent)">${extra}</span>
          </div>`
          )
          .join('')}
      </div>
    </section>
    ${newsletterSection()}
    ${perkRow()}`;

    return {
      html,
      title: 'Our story — Arena',
      desc: 'Why Arena exists, how the objects are drawn, built and repaired, and how to reach the Copenhagen studio.',
      mount(root) {
        bindNewsletter(root);
      },
    };
  }

  window.Views = { home, shop, product, checkout, confirmed, track, notFound, journal, about, newsletterSection, perkRow, bindNewsletter, sectionHead, unmountLive };
})();
