(function () {
  const G = window.GENIO, R = window.Garments;
  const $ = function (s, el) { return (el || document).querySelector(s); };
  const $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const byId = {}; G.products.forEach(function (f) { byId[f.id] = f; });
  const esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  const store = {
    get: function (k, d) { try { const v = localStorage.getItem('genio:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('genio:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };

  const PAGE = 12;
  const state = {
    cat: 'all',
    sort: 'featured',
    limit: PAGE,
    cur: store.get('cur', G.baseCurrency),
    bag: store.get('bag2', []),
    pick: {} // style id -> colourway index chosen on its card
  };

  /* ---------- money: catalogue prices are USD ---------- */
  function money(usd) {
    if (state.cur === 'KES') return 'KSh ' + Math.round(usd * G.kesPerUsd).toLocaleString('en-KE');
    return '$' + (usd % 1 ? usd.toFixed(2) : usd.toLocaleString('en-US'));
  }
  function range(a, b) { return a === b ? money(a) : money(a) + ' – ' + money(b); }

  /* ---------- Woo variation helpers ---------- */
  const PRETTY = { '4-piece': 'Full 4-piece set', '3-piece': 'Full 3-piece set', '2-piece': '2-piece set', 'sport-bra': 'Sports bra', 'crop-top': 'Crop top', short: 'Shorts', pants: 'Pants' };
  function optionsOf(v) {
    return v.variations.map(function (x) {
      const k = Object.keys(x.attrs).filter(function (a) { return a !== 'size'; })[0];
      if (!k) return null;
      const val = x.attrs[k];
      const label = PRETTY[val] || (k === 'gift card amount' ? '$' + val + ' card' : val.replace(/-/g, ' '));
      return { id: x.id, name: k, value: val, label: label, usd: x.usd };
    }).filter(Boolean).sort(function (a, b) { return b.usd - a.usd; });
  }
  function param(name) {
    if (name === 'pick' || name === 'size') return 'attribute_pa_' + name;
    return 'attribute_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  function handoffUrl(it) {
    const q = ['add-to-cart=' + it.wooId, 'quantity=' + it.qty];
    if (it.vid) q.push('variation_id=' + it.vid);
    if (it.size) q.push(param('size') + '=' + encodeURIComponent(it.size.toLowerCase()));
    if (it.optName) q.push(param(it.optName) + '=' + encodeURIComponent(it.optValue));
    return it.url + '?' + q.join('&');
  }

  /* ---------- collections rail ---------- */
  function renderLines() {
    $('#lines-rail').innerHTML = G.lines.map(function (l, i) {
      const f = byId[l.style];
      const media = l.video
        ? '<video src="' + l.video + '" muted loop playsinline preload="metadata"' + (reduce ? '' : ' autoplay') + ' aria-hidden="true"></video>'
        : '<img src="' + l.img + '" alt="' + esc(l.name) + ' campaign" loading="lazy">';
      return '<article class="line-card">' +
        '<div class="line-visual">' + media + '</div>' +
        '<div class="line-meta"><span class="line-idx">' + String(i + 1).padStart(2, '0') + ' / ' + String(G.lines.length).padStart(2, '0') + '</span>' +
        '<h3>' + esc(l.name) + '</h3><p>' + esc(l.note) + (f ? ' · ' + range(f.from, f.to) : '') + '</p>' +
        (f ? '<button type="button" class="line-link" id="line-' + i + '" data-qv="' + f.id + '">Shop ' + esc(l.name) + '</button>' : '') +
        '</div></article>';
    }).join('');
  }

  /* ---------- shop ---------- */
  function renderChips() {
    $('#cat-chips').innerHTML = G.categories.map(function (c) {
      const n = c.id === 'all' ? G.products.length : G.products.filter(function (p) { return p.cat === c.id; }).length;
      if (!n) return '';
      const on = state.cat === c.id;
      return '<button type="button" class="chip' + (on ? ' is-on' : '') + '" id="chip-' + c.id + '" data-cat="' + c.id + '" aria-pressed="' + on + '">' + c.label + '<sup>' + n + '</sup></button>';
    }).join('');
  }

  function visibleProducts() {
    const s = state.sort;
    return G.products.filter(function (p) { return state.cat === 'all' || p.cat === state.cat; }).slice().sort(function (a, b) {
      if (s === 'price-asc') return a.from - b.from;
      if (s === 'price-desc') return b.to - a.to;
      if (s === 'name') return a.name.localeCompare(b.name);
      return a.featured - b.featured;
    });
  }

  function cardHTML(f) {
    const vi = state.pick[f.id] || 0, v = f.variants[vi];
    const alt = v.thumbs && v.thumbs[1] ? v.thumbs[1] : '';
    const sw = f.variants.slice(0, 6).map(function (x, i) {
      return '<button type="button" class="sw' + (i === vi ? ' is-on' : '') + '" data-sw="' + f.id + '" data-i="' + i + '" style="--sw:' + x.hex + '" aria-label="' + esc(x.color) + '" aria-pressed="' + (i === vi) + '"></button>';
    }).join('') + (f.variants.length > 6 ? '<span class="sw-more">+' + (f.variants.length - 6) + '</span>' : '');
    return '<article class="card" data-id="' + f.id + '">' +
      '<button type="button" class="card-stage" id="card-' + f.id + '" data-qv="' + f.id + '" aria-label="Quick view: ' + esc(f.name) + '">' +
      (f.isNew ? '<span class="badge">New release</span>' : '') +
      '<span class="card-tilt">' +
      (v.img ? '<img class="ph" src="' + v.img + '" alt="' + esc(f.name + ' in ' + v.color) + '" loading="lazy">' : R.render('set', v.hex)) +
      (alt ? '<img class="ph alt" src="' + alt + '" alt="" loading="lazy">' : '') +
      '</span>' +
      '<span class="card-cta">Quick view</span>' +
      '</button>' +
      '<div class="card-meta">' +
      '<div><h3>' + esc(f.name) + '</h3><p class="card-sub">' + esc(v.color) + (f.variants.length > 1 ? ' · ' + f.variants.length + ' colours' : '') + '</p></div>' +
      '<p class="card-price">' + range(f.from, f.to) + '</p>' +
      '</div>' +
      (f.variants.length > 1 ? '<div class="swatches">' + sw + '</div>' : '') +
      '</article>';
  }

  function renderGrid() {
    const list = visibleProducts();
    const shown = list.slice(0, state.limit);
    const cat = G.categories.filter(function (c) { return c.id === state.cat; })[0];
    $('#shop-status').textContent = 'Showing ' + shown.length + ' of ' + list.length + ' styles' + (state.cat === 'all' ? '' : ' in ' + cat.label.toLowerCase()) + '. Prices from genioactive.com.';
    $('#grid').innerHTML = shown.map(cardHTML).join('');
    $('#more').hidden = shown.length >= list.length;
    $('#more').textContent = 'Show ' + Math.min(PAGE, list.length - shown.length) + ' more styles';
    bindTilt();
  }

  function setCat(cat) { state.cat = cat; state.limit = PAGE; renderChips(); renderGrid(); }
  $('#more').addEventListener('click', function () {
    const first = state.limit;
    state.limit += PAGE; renderGrid();
    const next = $$('#grid .card-stage')[first]; if (next) next.focus({ preventScroll: true });
  });

  /* ---------- tilt on cards ---------- */
  function bindTilt() {
    if (reduce || !fine) return;
    $$('.card-stage').forEach(function (el) {
      if (el.dataset.tilt) return; el.dataset.tilt = 1;
      const inner = $('.card-tilt', el);
      el.addEventListener('pointermove', function (e) {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        inner.style.transform = 'rotateY(' + (x * 10).toFixed(1) + 'deg) rotateX(' + (-y * 8).toFixed(1) + 'deg) scale(1.03)';
        el.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(0) + '%');
        el.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(0) + '%');
      });
      el.addEventListener('pointerleave', function () { inner.style.transform = ''; });
    });
  }

  /* ---------- modals ---------- */
  let lastFocus = null;
  function openModal(el) {
    lastFocus = document.activeElement;
    el.hidden = false;
    document.body.classList.add('locked');
    requestAnimationFrame(function () { el.classList.add('is-open'); });
    const f = $('input, button:not([data-close]), [data-close]', el);
    if (f) f.focus({ preventScroll: true });
  }
  function closeModal(el) {
    el.classList.remove('is-open');
    document.body.classList.remove('locked');
    setTimeout(function () { el.hidden = true; }, reduce ? 0 : 320);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    const c = e.target.closest('[data-close]');
    if (c) closeModal(c.closest('.modal, .drawer'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const open = $$('.modal, .drawer').filter(function (m) { return !m.hidden; }).pop();
      if (open) closeModal(open);
      if (!$('#menu-panel').hidden) toggleMenu(false);
    }
    if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });

  /* ---------- quick view ---------- */
  const qv = { f: null, vi: 0, img: 0, size: null, opt: null, qty: 1 };
  function openQV(id, vi) {
    const f = byId[id]; if (!f) return;
    qv.f = f; qv.vi = vi != null ? vi : (state.pick[id] || 0); qv.img = 0; qv.size = null; qv.opt = null; qv.qty = 1;
    renderQV();
    $('#qv-msg').textContent = '';
    openModal($('#qv'));
  }
  function renderQV() {
    const f = qv.f, v = f.variants[qv.vi], opts = optionsOf(v);
    const imgs = v.gallery.length ? v.gallery : [];
    $('#qv-stage').innerHTML = imgs.length
      ? '<img class="qv-main" src="' + imgs[qv.img] + '" alt="' + esc(f.name + ' in ' + v.color) + '">' +
        (imgs.length > 1 ? '<div class="qv-thumbs">' + imgs.map(function (src, i) {
          return '<button type="button" class="qv-thumb' + (i === qv.img ? ' is-on' : '') + '" data-img="' + i + '" aria-label="Photo ' + (i + 1) + ' of ' + imgs.length + '"><img src="' + (v.thumbs ? v.thumbs[i] : src) + '" alt=""></button>';
        }).join('') + '</div>' : '')
      : '<div class="qv-spin">' + R.render('set', v.hex) + '</div>';
    const cat = G.categories.filter(function (c) { return c.id === f.cat; })[0];
    $('#qv-cat').textContent = (cat ? cat.label : '') + (f.isNew ? ' · New release' : '');
    $('#qv-name').textContent = f.name;
    const o = opts.filter(function (x) { return x.id === qv.opt; })[0];
    $('#qv-price').innerHTML = o ? money(o.usd) : range(v.from, v.to);
    $('#qv-desc').textContent = f.desc;
    $('#qv-colours').innerHTML = f.variants.length > 1 ? '<div class="qv-label"><span>Colour · ' + esc(v.color) + '</span></div><div class="swatches big">' +
      f.variants.map(function (x, i) {
        return '<button type="button" class="sw' + (i === qv.vi ? ' is-on' : '') + '" data-qvsw="' + i + '" style="--sw:' + x.hex + '" aria-label="' + esc(x.color) + '" aria-pressed="' + (i === qv.vi) + '"></button>';
      }).join('') + '</div>' : '';
    $('#qv-options').innerHTML = opts.length ? '<div class="qv-label"><span>Choose</span></div><div class="opts" role="radiogroup" aria-label="Option">' +
      opts.map(function (x) {
        return '<button type="button" role="radio" class="opt' + (x.id === qv.opt ? ' is-on' : '') + '" data-opt="' + x.id + '" aria-checked="' + (x.id === qv.opt) + '"><span>' + esc(x.label) + '</span><small>' + money(x.usd) + '</small></button>';
      }).join('') + '</div>' : '';
    $('#qv-size-block').hidden = !v.sizes.length;
    $('#qv-sizes').innerHTML = v.sizes.map(function (s) {
      return '<button type="button" role="radio" aria-checked="' + (s === qv.size) + '" class="size' + (s === qv.size ? ' is-on' : '') + '" data-size="' + s + '">' + s + '</button>';
    }).join('');
    $('#qv-feats').innerHTML = f.feats.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('#qv-feats').hidden = !f.feats.length;
    $('#qv-qty').textContent = qv.qty;
    $('#qv-link').href = v.url;
  }
  $('#qv').addEventListener('click', function (e) {
    const t = e.target.closest('[data-img], [data-qvsw], [data-opt], .size');
    if (!t) return;
    if (t.dataset.img) qv.img = +t.dataset.img;
    else if (t.dataset.qvsw) { qv.vi = +t.dataset.qvsw; qv.img = 0; qv.opt = null; state.pick[qv.f.id] = qv.vi; }
    else if (t.dataset.opt) qv.opt = +t.dataset.opt;
    else qv.size = t.dataset.size;
    $('#qv-msg').textContent = '';
    renderQV();
    const again = t.id ? $('#' + t.id) : $('[data-img="' + t.dataset.img + '"], [data-qvsw="' + t.dataset.qvsw + '"], [data-opt="' + t.dataset.opt + '"], [data-size="' + t.dataset.size + '"]', $('#qv'));
    if (again) again.focus({ preventScroll: true });
  });
  $('#qv-minus').addEventListener('click', function () { qv.qty = Math.max(1, qv.qty - 1); $('#qv-qty').textContent = qv.qty; });
  $('#qv-plus').addEventListener('click', function () { qv.qty = Math.min(9, qv.qty + 1); $('#qv-qty').textContent = qv.qty; });
  function nudge(sel, msg) { $('#qv-msg').textContent = msg; const el = $(sel); el.classList.add('shake'); setTimeout(function () { el.classList.remove('shake'); }, 500); }
  $('#qv-add').addEventListener('click', function () {
    const f = qv.f, v = f.variants[qv.vi], opts = optionsOf(v);
    if (opts.length && !qv.opt) return nudge('#qv-options', 'Choose an option to add this to your bag.');
    if (v.sizes.length && !qv.size) return nudge('#qv-sizes', 'Choose a size to add this to your bag.');
    const o = opts.filter(function (x) { return x.id === qv.opt; })[0];
    const vid = o ? o.id : (v.variations[0] ? v.variations[0].id : null);
    addToBag({
      fid: f.id, name: f.name, color: v.color, hex: v.hex, img: v.img, url: v.url, wooId: v.wooId, vid: vid,
      size: qv.size, optName: o ? o.name : null, optValue: o ? o.value : null, optLabel: o ? o.label : null,
      usd: o ? o.usd : v.from, qty: qv.qty
    });
    closeModal($('#qv'));
  });
  $('#qv-size-guide').addEventListener('click', function () { openModal($('#sg')); });

  /* ---------- bag ---------- */
  function saveBag() { store.set('bag2', state.bag); renderBag(); }
  function addToBag(it) {
    it.key = [it.wooId, it.vid, it.size, it.optValue].join('|');
    const hit = state.bag.filter(function (b) { return b.key === it.key; })[0];
    if (hit) hit.qty = Math.min(9, hit.qty + it.qty); else state.bag.push(it);
    saveBag();
    toast('Added ' + it.name + (it.optLabel ? ', ' + it.optLabel.toLowerCase() : '') + (it.size ? ', size ' + it.size : ''));
    const btn = $('#open-bag'); btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
  }
  function renderBag() {
    const count = state.bag.reduce(function (n, b) { return n + b.qty; }, 0);
    const total = state.bag.reduce(function (n, b) { return n + b.qty * b.usd; }, 0);
    $('#bag-count').textContent = count;
    $('#bag-count').classList.toggle('has', count > 0);
    $('#bag-total').textContent = money(total);
    const left = G.freeShip - total;
    $('#ship-text').textContent = total === 0 ? 'Free delivery on orders over ' + money(G.freeShip) + '. ' + G.deliveryNote + '.'
      : left > 0 ? 'Add ' + money(left) + ' more for free delivery.' : 'Your order qualifies for free delivery. ' + G.deliveryNote + '.';
    $('#ship-fill').style.width = Math.min(100, (total / G.freeShip) * 100) + '%';
    $('#checkout').disabled = count === 0;
    $('#bag-list').innerHTML = count === 0
      ? '<li class="bag-empty"><p>Your bag is empty.</p><a href="#shop" class="btn btn-ghost" data-close>Browse the shop</a></li>'
      : state.bag.map(function (b, i) {
        return '<li class="bag-item">' +
          '<div class="bag-thumb">' + (b.img ? '<img src="' + b.img + '" alt="">' : R.render('set', b.hex)) + '</div>' +
          '<div class="bag-info"><h3>' + esc(b.name) + '</h3><p>' + esc([b.color, b.optLabel, b.size ? 'Size ' + b.size : ''].filter(Boolean).join(' · ')) + '</p>' +
          '<div class="qty small"><button type="button" data-dec="' + i + '" aria-label="Decrease quantity of ' + esc(b.name) + '">−</button><output>' + b.qty + '</output><button type="button" data-inc="' + i + '" aria-label="Increase quantity of ' + esc(b.name) + '">+</button></div></div>' +
          '<div class="bag-right"><strong>' + money(b.usd * b.qty) + '</strong><button type="button" class="linklike" data-rm="' + i + '">Remove</button></div>' +
          '</li>';
      }).join('');
    $('#handoff').hidden = true;
  }
  $('#bag-list').addEventListener('click', function (e) {
    const t = e.target;
    if (t.dataset.inc) { state.bag[+t.dataset.inc].qty = Math.min(9, state.bag[+t.dataset.inc].qty + 1); saveBag(); }
    if (t.dataset.dec) { const b = state.bag[+t.dataset.dec]; b.qty -= 1; if (b.qty < 1) state.bag.splice(+t.dataset.dec, 1); saveBag(); }
    if (t.dataset.rm) { state.bag.splice(+t.dataset.rm, 1); saveBag(); }
  });
  $('#open-bag').addEventListener('click', function () { openModal($('#bag')); });

  /* ---------- checkout: hand the bag to the live WooCommerce cart ---------- */
  function showHandoff(note) {
    $('#handoff-note').textContent = note;
    $('#handoff-list').innerHTML = state.bag.map(function (b) {
      return '<li><a href="' + handoffUrl(b) + '" target="_blank" rel="noopener">Add ' + esc(b.name) + (b.optLabel ? ' (' + esc(b.optLabel.toLowerCase()) + ')' : '') + (b.size ? ', ' + b.size : '') + ' ×' + b.qty + ' <span aria-hidden="true">↗</span></a></li>';
    }).join('') + '<li><a class="handoff-go" href="' + G.shop + '/checkout/" target="_blank" rel="noopener">Then go to checkout <span aria-hidden="true">↗</span></a></li>';
    $('#handoff').hidden = false;
  }
  // Same-origin (deployed on genioactive.com): fill the real cart through the Store API, then check out.
  async function storeApiCheckout() {
    const r = await fetch('/wp-json/wc/store/v1/cart', { credentials: 'include' });
    const nonce = r.headers.get('Nonce');
    for (const b of state.bag) {
      const variation = [];
      if (b.size) variation.push({ attribute: 'pa_size', value: b.size.toLowerCase() });
      if (b.optName) variation.push({ attribute: b.optName === 'pick' ? 'pa_pick' : b.optName, value: b.optValue });
      const res = await fetch('/wp-json/wc/store/v1/cart/add-item', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Nonce: nonce },
        body: JSON.stringify({ id: b.vid || b.wooId, quantity: b.qty, variation: variation })
      });
      if (!res.ok) throw new Error('add-item ' + res.status);
    }
    location.href = '/checkout/';
  }
  $('#checkout').addEventListener('click', function () {
    if (/(^|\.)genioactive\.com$/.test(location.hostname)) {
      $('#checkout').textContent = 'Preparing checkout…';
      storeApiCheckout().catch(function () {
        $('#checkout').textContent = 'Checkout';
        showHandoff('We could not move your bag automatically. Add each piece below, then check out.');
      });
    } else {
      showHandoff('Checkout happens on genioactive.com. Open each link to add that piece to your GENiO bag, then check out there.');
    }
  });

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
  }

  /* ---------- currency ---------- */
  function setCur(c) {
    state.cur = c; store.set('cur', c);
    $$('.currency button').forEach(function (b) { const on = b.dataset.cur === c; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    renderLines(); renderGrid(); renderBag(); renderStudio();
    $$('[data-money]').forEach(function (el) { el.textContent = money(+el.dataset.money); });
  }
  $$('.currency button').forEach(function (b) { b.addEventListener('click', function () { setCur(b.dataset.cur); }); });

  /* ---------- search ---------- */
  function openSearch() { openModal($('#search')); $('#search-input').value = ''; renderSearch(''); }
  function renderSearch(q) {
    q = q.trim().toLowerCase();
    const list = G.products.filter(function (f) {
      return !q || (f.name + ' ' + f.cat + ' ' + f.variants.map(function (v) { return v.color; }).join(' ')).toLowerCase().indexOf(q) > -1;
    }).slice(0, 8);
    $('#search-results').innerHTML = list.length ? list.map(function (f) {
      const v = f.variants[0];
      return '<li><button type="button" id="sr-' + f.id + '" data-qv="' + f.id + '"><span class="sr-thumb">' + (v.img ? '<img src="' + v.img + '" alt="">' : '') + '</span><span class="sr-name">' + esc(f.name) + '<small>' + f.variants.length + (f.variants.length === 1 ? ' colour' : ' colours') + '</small></span><span class="sr-price">' + range(f.from, f.to) + '</span></button></li>';
    }).join('') : '<li class="sr-none">Nothing matches "' + esc(q) + '". Try "jumpsuit", "set" or "pink".</li>';
  }
  $('#open-search').addEventListener('click', openSearch);
  $('#search-input').addEventListener('input', function () { renderSearch(this.value); });

  /* ---------- delegated clicks ---------- */
  document.addEventListener('click', function (e) {
    const sw = e.target.closest('[data-sw]');
    if (sw) {
      state.pick[sw.dataset.sw] = +sw.dataset.i;
      const card = sw.closest('.card'); card.outerHTML = cardHTML(byId[sw.dataset.sw]);
      bindTilt();
      const again = $('.card[data-id="' + sw.dataset.sw + '"] [data-i="' + sw.dataset.i + '"]'); if (again) again.focus();
      return;
    }
    const q = e.target.closest('[data-qv]');
    if (q && !q.closest('#qv')) {
      if (q.closest('#search')) { closeModal($('#search')); setTimeout(function () { openQV(q.dataset.qv); }, reduce ? 0 : 330); }
      else openQV(q.dataset.qv);
      return;
    }
    const chip = e.target.closest('.chip');
    if (chip) { setCat(chip.dataset.cat); return; }
    const footCat = e.target.closest('.foot-cols [data-cat]');
    if (footCat) setCat(footCat.dataset.cat);
  });
  $('#sort').addEventListener('change', function () { state.sort = this.value; state.limit = PAGE; renderGrid(); });
  ['#open-size', '#foot-size'].forEach(function (s) { $(s).addEventListener('click', function () { openModal($('#sg')); }); });

  /* ---------- studio: build a Cherri look from its real options ---------- */
  const CHERRI = byId['cherri-4-pcs'];
  const STUDIO = {
    pieces: [{ id: 'bra', label: 'Sports bra', opt: 'sport-bra' }, { id: 'crop', label: 'Crop top', opt: 'crop-top' }, { id: 'shorts', label: 'Shorts', opt: 'short' }, { id: 'leggings', label: 'Pants', opt: 'pants' }],
    layout: { bra: ['bra', 100, 8, 0.72], crop: ['crop', 100, 6, 0.74], shorts: ['shorts', 100, 92, 0.86], leggings: ['leggings', 100, 98, 0.98] },
    vi: Math.max(0, CHERRI ? CHERRI.variants.findIndex(function (v) { return v.color === 'Pink'; }) : 0),
    on: { bra: true, crop: true, shorts: true, leggings: true },
    size: 'M'
  };
  function studioOpts() {
    const o = {}; optionsOf(CHERRI.variants[STUDIO.vi]).forEach(function (x) { o[x.value] = x; }); return o;
  }
  function renderStudio() {
    if (!CHERRI) { $('#studio').hidden = true; return; }
    const v = CHERRI.variants[STUDIO.vi], o = studioOpts();
    $('#studio-tone').innerHTML = CHERRI.variants.map(function (x, i) {
      return '<button type="button" id="tone-' + i + '" class="tone' + (i === STUDIO.vi ? ' is-on' : '') + '" data-tone="' + i + '" aria-pressed="' + (i === STUDIO.vi) + '"><i style="--sw:' + x.hex + '"></i>' + esc(x.color) + '</button>';
    }).join('');
    const sel = STUDIO.pieces.filter(function (x) { return STUDIO.on[x.id]; });
    if (v.sizes.indexOf(STUDIO.size) < 0) STUDIO.size = v.sizes[0];
    $('#studio-pieces').innerHTML = STUDIO.pieces.map(function (x) {
      return '<button type="button" class="piece' + (STUDIO.on[x.id] ? ' is-on' : '') + '" id="piece-' + x.id + '" data-piece="' + x.id + '" aria-pressed="' + !!STUDIO.on[x.id] + '"><span>' + x.label + '</span><small>' + (o[x.opt] ? money(o[x.opt].usd) : '') + '</small></button>';
    }).join('') +
      '<label class="studio-size"><span>Size</span><select id="studio-size">' + v.sizes.map(function (s) { return '<option' + (s === STUDIO.size ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>';
    const order = ['leggings', 'shorts', 'bra', 'crop'];
    const layout = order.filter(function (k) { return STUDIO.on[k]; }).map(function (k) { return STUDIO.layout[k]; });
    $('#studio-stage').innerHTML = (sel.length
      ? '<div class="studio-figure">' + R.render('four', v.hex, { layout: layout }) + '</div><div class="qv-floor"></div>'
      : '<p class="studio-empty">Choose at least one piece.</p>') +
      (v.img ? '<button type="button" class="studio-photo" data-qv="cherri-4-pcs" aria-label="See the ' + esc(v.color) + ' Cherri photographed"><img src="' + v.img + '" alt=""><span>As shot</span></button>' : '');
    $('#studio-stage').setAttribute('aria-label', 'Look preview: ' + (sel.length ? sel.map(function (x) { return x.label.toLowerCase(); }).join(', ') : 'nothing selected') + ' in ' + v.color.toLowerCase());
    const all = sel.length === 4;
    const parts = sel.reduce(function (n, x) { return n + (o[x.opt] ? o[x.opt].usd : 0); }, 0);
    const set = o['4-piece'] ? o['4-piece'].usd : parts;
    $('#studio-sum').innerHTML = sel.length + (sel.length === 1 ? ' piece · ' : ' pieces · ') + '<strong>' + money(all ? set : parts) + '</strong>' +
      (all && parts > set ? ' <em>save ' + money(parts - set) + '</em>' : '');
    $('#studio-add').textContent = all ? 'Add the 4-piece set' : sel.length ? 'Add ' + sel.length + (sel.length === 1 ? ' piece' : ' pieces') : 'Add pieces';
    $('#studio-add').disabled = !sel.length;
  }
  $('#studio-pieces').addEventListener('click', function (e) {
    const b = e.target.closest('.piece'); if (!b) return;
    STUDIO.on[b.dataset.piece] = !STUDIO.on[b.dataset.piece];
    renderStudio(); $('#piece-' + b.dataset.piece).focus();
  });
  $('#studio-pieces').addEventListener('change', function (e) { if (e.target.id === 'studio-size') STUDIO.size = e.target.value; });
  $('#studio-tone').addEventListener('click', function (e) {
    const b = e.target.closest('.tone'); if (!b) return;
    STUDIO.vi = +b.dataset.tone; renderStudio(); $('#tone-' + STUDIO.vi).focus();
  });
  $('#studio-add').addEventListener('click', function () {
    const v = CHERRI.variants[STUDIO.vi], o = studioOpts();
    const sel = STUDIO.pieces.filter(function (x) { return STUDIO.on[x.id]; });
    const picks = sel.length === 4 ? [o['4-piece']] : sel.map(function (x) { return o[x.opt]; });
    picks.filter(Boolean).forEach(function (p) {
      addToBag({ fid: CHERRI.id, name: CHERRI.name, color: v.color, hex: v.hex, img: v.img, url: v.url, wooId: v.wooId, vid: p.id,
        size: STUDIO.size, optName: p.name, optValue: p.value, optLabel: p.label, usd: p.usd, qty: 1 });
    });
  });

  /* ---------- fit hotspots ---------- */
  function setSpec(id) {
    $$('#specs li').forEach(function (li) {
      const on = li.dataset.spec === id;
      li.classList.toggle('is-on', on);
      $('button', li).setAttribute('aria-expanded', on);
    });
    $$('.hotspot').forEach(function (h) { h.classList.toggle('is-on', h.dataset.spec === id); });
  }
  $$('.hotspot').forEach(function (h) { h.addEventListener('click', function () { setSpec(h.dataset.spec); }); });
  $$('#specs li button').forEach(function (b) { b.addEventListener('click', function () { setSpec(b.parentNode.dataset.spec); }); });

  /* ---------- newsletter ---------- */
  $('#circle-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const v = $('#circle-email').value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    $('#circle-msg').textContent = ok ? 'You are on the list. Watch your inbox for the next drop.' : 'Enter an email address like name@example.com.';
    $('#circle-msg').classList.toggle('err', !ok);
    if (ok) this.reset();
  });

  /* ---------- mobile menu ---------- */
  function toggleMenu(open) {
    $('#menu-panel').hidden = !open;
    $('#open-menu').setAttribute('aria-expanded', open);
    document.body.classList.toggle('menu-open', open);
  }
  $('#open-menu').addEventListener('click', function () { toggleMenu($('#menu-panel').hidden); });
  $$('#menu-panel a').forEach(function (a) { a.addEventListener('click', function () { toggleMenu(false); }); });

  /* ---------- header state ---------- */
  const head = $('.site-head');
  window.addEventListener('scroll', function () { head.classList.toggle('is-scrolled', window.scrollY > 40); }, { passive: true });

  /* ---------- hero video ---------- */
  const hv = $('#hero-video');
  if (hv) {
    hv.poster = G.hero.poster;
    hv.src = G.hero.video;
    if (reduce) hv.removeAttribute('autoplay'); else { const p = hv.play(); if (p && p.catch) p.catch(function () { /* autoplay blocked: poster stays */ }); }
    const portal = $('.hero-portal');
    if (fine && !reduce) {
      document.querySelector('.hero').addEventListener('pointermove', function (e) {
        const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
        portal.style.transform = 'perspective(1200px) rotateY(' + (x * -8).toFixed(2) + 'deg) rotateX(' + (y * 6).toFixed(2) + 'deg)';
      });
    }
  }

  /* ---------- cursor ---------- */
  if (!reduce && fine) {
    const cur = $('#cursor'); let x = 0, y = 0, cx = 0, cy = 0;
    document.documentElement.classList.add('has-cursor');
    window.addEventListener('pointermove', function (e) { x = e.clientX; y = e.clientY; cur.classList.add('is-on'); });
    document.addEventListener('pointerover', function (e) {
      cur.classList.toggle('is-link', !!e.target.closest('a, button, select, input, [tabindex]'));
      cur.classList.toggle('is-view', !!e.target.closest('.card-stage'));
    });
    (function loop() { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px)'; requestAnimationFrame(loop); })();
  }

  /* ---------- reveal: content is visible at rest; this only adds a lift ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.section-head, .shop-head, .studio-inner, .fit-inner, .story-inner, .circle-inner').forEach(function (el) { el.classList.add('rv'); io.observe(el); });
  }

  /* ---------- loader ---------- */
  function hideLoader() { document.documentElement.classList.add('loaded'); setTimeout(function () { const l = $('#loader'); if (l) l.remove(); }, 900); }
  if (reduce) hideLoader(); else window.addEventListener('load', function () { setTimeout(hideLoader, 300); });
  setTimeout(function () { if ($('#loader')) hideLoader(); }, 2200);

  /* ---------- init ---------- */
  renderChips(); setCur(state.cur);
})();
