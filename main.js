/* Nura · The 28-Day Routine · PDP interactions */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- purchase state (one source for hero, sticky bar, cart) ---------- */
  const PLANS = {
    sub:  { bar: 'The 28-Day Routine · Subscription · $66 / 28 days', cart: 'The 28-Day Routine · Subscription · $66' },
    once: { bar: 'The 28-Day Routine · One-time · $78',               cart: 'The 28-Day Routine · One-time · $78' }
  };
  let plan = 'sub';
  let bagCount = 0;

  const buybarText = $('#buybar-text');
  const cartLine = $('#cart-line');
  const bagBtn = $('#bag-btn');
  const bagCountEl = $('#bag-count');

  function setPlan(next) {
    plan = next;
    const radio = $(`input[name="plan"][value="${next}"]`);
    if (radio && !radio.checked) radio.checked = true;
    buybarText.textContent = PLANS[next].bar;
  }
  $$('input[name="plan"]').forEach(r => r.addEventListener('change', () => setPlan(r.value)));

  /* ---------- dialogs: drawer, INCI, lightbox ---------- */
  const lockScroll = on => { document.documentElement.style.overflow = on ? 'hidden' : ''; };
  function openDialog(d) {
    if (d.open) return;
    d.showModal();
    lockScroll(true);
  }
  $$('dialog').forEach(d => {
    d.addEventListener('close', () => { if (!$$('dialog').some(x => x.open)) lockScroll(false); });
    // click outside the sheet (on the backdrop) closes it
    d.addEventListener('click', e => {
      if (e.target === d) d.close();
      if (e.target.closest('[data-close]')) d.close();
    });
  });

  const drawer = $('#cart-drawer');
  const inci = $('#inci-panel');
  $$('#inci-open, [data-inci]').forEach(b => b.addEventListener('click', () => openDialog(inci)));

  /* ---------- add to bag ---------- */
  function addToBag(btn) {
    if (btn.getAttribute('aria-busy') === 'true') return; // no double submit
    if (btn.dataset.plan) setPlan(btn.dataset.plan);
    const original = btn.innerHTML;
    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin" aria-hidden="true"></span>Adding…';

    setTimeout(() => {
      btn.classList.add('is-done');
      btn.innerHTML = '<span aria-hidden="true">✓</span> Added';
      bagCount += 1;
      bagCountEl.textContent = bagCount;
      bagBtn.classList.add('has-items');
      bagBtn.classList.remove('bump'); void bagBtn.offsetWidth; bagBtn.classList.add('bump');
      cartLine.textContent = PLANS[plan].cart;

      setTimeout(() => {
        openDialog(drawer);
        btn.classList.remove('is-done');
        btn.innerHTML = original;
        btn.removeAttribute('aria-busy');
        btn.disabled = false;
      }, 450);
    }, 650);
  }

  $('#buy').addEventListener('submit', e => { e.preventDefault(); addToBag($('#hero-add')); });
  $$('[data-add]').forEach(b => { if (b.type !== 'submit') b.addEventListener('click', () => addToBag(b)); });
  $('#buybar-add').addEventListener('click', e => addToBag(e.currentTarget));

  bagBtn.addEventListener('click', () => {
    if (bagCount > 0) { openDialog(drawer); return; }
    focusBuy();
  });

  function focusBuy() {
    $('#buy').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => $('#hero-add').focus({ preventScroll: true }), reduceMotion ? 0 : 500);
  }
  $$('[data-focus-buy]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); focusBuy(); }));

  /* ---------- "design study" notice for links without a real destination ---------- */
  const toast = $('#toast');
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3200);
  }
  $$('[data-demo]').forEach(b => b.addEventListener('click', () =>
    showToast('Nura is a design study, so this page isn’t live yet.')));

  // "Just need a refill?" → highlight the single steps line
  $$('a[href="#single-steps"]').forEach(a => a.addEventListener('click', () => {
    const t = $('#single-steps');
    setTimeout(() => { t.focus({ preventScroll: true }); t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); }, reduceMotion ? 0 : 450);
  }));

  /* ---------- gallery + lightbox ---------- */
  const slides = $$('#slides .slide');
  const navBtns = $$('.gallery-nav button');
  const lightbox = $('#lightbox');
  const lbStage = $('#lb-stage');
  const lbCount = $('#lb-count');
  let current = 0;

  function go(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('is-on', n === current));
    navBtns.forEach((b, n) => b.setAttribute('aria-current', n === current ? 'true' : 'false'));
    if (lightbox.open) renderLightbox();
  }
  navBtns.forEach(b => b.addEventListener('click', () => go(+b.dataset.go)));
  $('.gallery-nav').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    go(current + (e.key === 'ArrowRight' ? 1 : -1));
    navBtns[current].focus();
  });

  function renderLightbox() {
    lbStage.innerHTML = '';
    lbStage.appendChild(slides[current].cloneNode(true));
    lbCount.textContent = `${current + 1} / ${slides.length}`;
  }
  $('#gallery-open').addEventListener('click', () => { renderLightbox(); openDialog(lightbox); });
  $$('[data-lb]').forEach(b => b.addEventListener('click', () => go(current + +b.dataset.lb)));
  lightbox.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') go(current + 1);
    if (e.key === 'ArrowLeft') go(current - 1);
  });
  lbStage.addEventListener('click', e => { if (e.target === lbStage) lightbox.close(); });

  /* ---------- sticky buy bar ---------- */
  const buybar = $('#buybar');
  const buybarBtn = $('#buybar-add');
  let heroCtaVisible = true, heroCtaAbove = false, finalVisible = false;

  function updateBuybar() {
    const on = !heroCtaVisible && heroCtaAbove && !finalVisible;
    buybar.classList.toggle('is-on', on);
    buybar.setAttribute('aria-hidden', on ? 'false' : 'true');
    buybarBtn.tabIndex = on ? 0 : -1;
    document.body.classList.toggle('has-buybar', on);
  }
  new IntersectionObserver(([e]) => {
    heroCtaVisible = e.isIntersecting;
    heroCtaAbove = e.boundingClientRect.top < 0;
    updateBuybar();
  }).observe($('#hero-add'));
  // hide once the final offer cards are on screen (or already passed): no two identical CTAs at once
  new IntersectionObserver(([e]) => { finalVisible = e.isIntersecting || e.boundingClientRect.top < 0; updateBuybar(); }, { threshold: .15 })
    .observe($('.offers'));

  /* ---------- "you are here" marker follows the step on screen ---------- */
  const marker = $('#buybar-marker');
  const stepEls = $$('.panels [data-step]');
  const visibleSteps = new Map();
  function updateMarker() {
    if (!visibleSteps.size) { marker.classList.remove('is-on'); return; }
    // the step closest to the middle of the screen wins
    let best = 0, bestD = Infinity;
    visibleSteps.forEach((step, el) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - innerWidth / 2) + Math.abs(r.top + r.height / 2 - innerHeight / 2);
      if (d < bestD) { bestD = d; best = step; }
    });
    marker.style.left = (12.5 + 25 * best) + '%';
    marker.classList.add('is-on');
  }
  const stepObserver = new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting ? visibleSteps.set(e.target, +e.target.dataset.step) : visibleSteps.delete(e.target));
    updateMarker();
  }, { rootMargin: '-30% 0px -30% 0px' });
  stepEls.forEach(el => stepObserver.observe(el));


  /* ---------- review filters ---------- */
  const reviews = $$('#review-list .review');
  const reviewsStatus = $('#reviews-status');
  $$('.filters button').forEach(b => b.addEventListener('click', () => {
    $$('.filters button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    const f = b.dataset.filter;
    let shown = 0;
    reviews.forEach(r => {
      const show = f === 'all' || r.dataset.tags.split(' ').includes(f);
      r.hidden = !show;
      if (show) shown++;
    });
    reviewsStatus.textContent = `Showing ${shown} of ${reviews.length} reviews`;
  }));

  /* ---------- section reveal: only for content below the fold at load ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const targets = $$('.sec-head, .bignum, .problem-text, .slider, .panels, .compare-fig, .milestones li, .usetest, .story, .review, .faq-list details, .final-box, .offer, .singles, .buy, .gallery')
      .filter(el => el.getBoundingClientRect().top > innerHeight);
    targets.forEach(el => el.classList.add('will-reveal'));
    let pending = targets;
    let queued = false;
    // reveal everything that has reached (or already passed) the lower part of the screen,
    // so anchor jumps never leave content hidden above the viewport
    const reveal = () => {
      queued = false;
      const limit = innerHeight * 0.92;
      const now = pending.filter(el => el.getBoundingClientRect().top < limit);
      if (!now.length) return;
      now.forEach((el, i) => {
        el.style.transitionDelay = Math.min(i, 3) * 70 + 'ms';
        el.classList.add('revealed');
        el.classList.remove('will-reveal');
      });
      pending = pending.filter(el => !now.includes(el));
      if (!pending.length) removeEventListener('scroll', onScroll);
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(reveal); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    addEventListener('load', onScroll);
  }

  /* ---------- parallax: elements drift at their own speed relative to the screen center ---------- */
  const parallaxEls = reduceMotion ? [] : $$('[data-parallax]');
  if (parallaxEls.length) {
    let pq = false;
    const runParallax = () => {
      pq = false;
      const mid = innerHeight / 2;
      parallaxEls.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) return;
        const speed = parseFloat(el.dataset.parallax) || 0;
        const offset = (r.top + r.height / 2 - mid) * speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    };
    addEventListener('scroll', () => { if (!pq) { pq = true; requestAnimationFrame(runParallax); } }, { passive: true });
    addEventListener('resize', runParallax);
    runParallax();
  }

  /* ---------- count-up numbers, progress rings, before/after circle ---------- */
  const countUp = el => {
    const target = +el.dataset.count;
    if (reduceMotion) { el.textContent = target; return; }
    const start = performance.now(), dur = 1600;
    const tick = now => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  };
  const CIRC = 2 * Math.PI * 52;
  const inView = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    if (el.classList.contains('ring')) {
      el.querySelector('.ring-fill').style.strokeDashoffset = (CIRC * (1 - el.dataset.value / 100)).toFixed(2);
    }
    $$('[data-count]', el).forEach(countUp);
    if (el.matches('[data-count]')) countUp(el);
    el.classList.add('in-view');
    inView.unobserve(el);
  }), { threshold: .35 });
  $$('.bignum, .usetest-stats li').forEach(el => inView.observe(el));

  /* ---------- 4 steps: color slider (tabs, arrows, keyboard, swipe) ---------- */
  const slider = $('#slider');
  if (slider) {
    const tabs = $$('[role="tab"]', slider);
    const panes = $$('.sstep', slider);
    const nowEl = $('#slider-now');
    let cur = 0;
    const show = (i, focusTab = false) => {
      const next = (i + panes.length) % panes.length;
      if (next === cur && panes[next].classList.contains('is-on')) return;
      slider.classList.toggle('is-back', next < cur);
      panes.forEach((p, n) => { const on = n === next; p.classList.toggle('is-on', on); p.inert = !on; p.setAttribute('aria-hidden', on ? 'false' : 'true'); });
      tabs.forEach((t, n) => { const on = n === next; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      slider.dataset.active = next;
      nowEl.textContent = String(next + 1).padStart(2, '0');
      cur = next;
      if (focusTab) tabs[next].focus();
      if (sliderOnScreen) { panes.forEach(p => visibleSteps.delete(p)); visibleSteps.set(panes[next], next); updateMarker(); }
    };
    let sliderOnScreen = false;
    new IntersectionObserver(([e]) => {
      sliderOnScreen = e.isIntersecting;
      panes.forEach(p => visibleSteps.delete(p));
      if (sliderOnScreen) visibleSteps.set(panes[cur], cur);
      updateMarker();
    }, { rootMargin: '-30% 0px -30% 0px' }).observe(slider);
    panes.forEach((p, n) => { if (n) { p.inert = true; p.setAttribute('aria-hidden', 'true'); } });
    // the slide follows the scroll position inside a tall track; tabs and arrows scroll to their step
    const track = $('#slider-track');
    const stickyTop = () => parseFloat(getComputedStyle(slider).top) || 0;
    const range = () => track.offsetHeight - slider.offsetHeight;
    const goStep = (i, focusTab = false) => {
      const n = Math.max(0, Math.min(panes.length - 1, i));
      show(n, focusTab);
      lockUntil = performance.now() + 1100; // ignore the in-between steps while the page glides there
      const trackTop = track.getBoundingClientRect().top + scrollY;
      scrollTo({ top: trackTop - stickyTop() + range() * (n + 0.5) / panes.length, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    let lockUntil = 0;
    const syncSlider = () => {
      if (performance.now() < lockUntil) return;
      const r = track.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (stickyTop() - r.top) / Math.max(1, range())));
      const idx = Math.min(panes.length - 1, Math.floor(p * panes.length));
      if (idx !== cur) show(idx);
    };
    let ss = false;
    addEventListener('scroll', () => { if (!ss) { ss = true; requestAnimationFrame(() => { ss = false; syncSlider(); }); } }, { passive: true });
    tabs.forEach((t, n) => t.addEventListener('click', () => goStep(n)));
    $$('.slider-arrow', slider).forEach(b => b.addEventListener('click', () => goStep(cur + +b.dataset.dir)));
    $('.slider-tabs', slider).addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); goStep(cur + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goStep(cur - 1, true); }
    });
    let sx = null;
    slider.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) goStep(cur + (dx < 0 ? 1 : -1));
      sx = null;
    });
  }

  /* ---------- problem: photos pass like a deck of cards while scrolling ---------- */
  const deckSection = $('#deck-section'), cards = $$('#deck .card');
  if (deckSection && cards.length) {
    const N = cards.length;
    const layDeck = () => {
      const desktop = matchMedia('(min-width: 861px)').matches;
      let t = 0;
      if (desktop && !reduceMotion) {
        const r = deckSection.getBoundingClientRect();
        // starts while the section is still coming up, so the cards react right away
        const start = 76 - innerHeight * 0.02; // begins as the stage pins under the buy bar
        t = Math.min(1, Math.max(0, (start - r.top) / Math.max(1, r.height - innerHeight + start))) * (N - 1);
      }
      cards.forEach((c, i) => {
        const d = i - t;
        let tf, op = 1;
        if (d < 0) { // already passed: lift off and tilt away
          tf = `translate3d(${(d * 30).toFixed(1)}%, ${(d * 115).toFixed(1)}%, 0) rotate(${(d * 14).toFixed(2)}deg)`;
          op = Math.max(0, 1 + d * 1.1);
        } else {     // waiting in the stack, fanned down-right
          tf = `translate3d(${(d * 9).toFixed(2)}%, ${(d * 7).toFixed(2)}%, 0) scale(${(1 - d * .05).toFixed(3)}) rotate(${(d * 2.5).toFixed(2)}deg)`;
          op = d > 3.5 ? 0 : 1;
        }
        c.style.transform = tf; c.style.opacity = op; c.style.zIndex = 100 - i;
      });
    };
    let dq = false;
    addEventListener('scroll', () => { if (!dq) { dq = true; requestAnimationFrame(() => { dq = false; layDeck(); }); } }, { passive: true });
    addEventListener('resize', layDeck);
    layDeck();
  }

  /* ---------- actives: expanding panels (click, focus or hover on desktop) ---------- */
  const panelEls = $$('#panels .panel');
  const openPanel = p => panelEls.forEach(x => {
    const on = x === p;
    x.classList.toggle('is-open', on);
    $('.panel-head', x).setAttribute('aria-expanded', on);
  });
  panelEls.forEach(p => {
    const head = $('.panel-head', p);
    head.addEventListener('click', () => openPanel(p));
    head.addEventListener('focus', () => openPanel(p));
    p.addEventListener('mouseenter', () => { if (matchMedia('(min-width: 861px) and (hover: hover)').matches) openPanel(p); });
  });

  /* ---------- 28 days: the line in the middle of the screen drives the photo ---------- */
  const dayLines = $$('.day-line');
  const baStack = $('.ba-stack');
  const baTag = $('#ba-tag');
  if (dayLines.length && baStack) {
    const setDay = line => {
      dayLines.forEach(l => l.classList.toggle('is-active', l === line));
      baStack.style.setProperty('--mix', line.dataset.mix);
      baTag.textContent = 'Day ' + line.dataset.day;
      baStack.classList.toggle('is-28', line.dataset.day === '28');
    };
    setDay(dayLines[0]);
    const dayObserver = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) setDay(e.target); }),
      { rootMargin: '-45% 0px -45% 0px' });
    dayLines.forEach(l => dayObserver.observe(l));
  }

  /* ---------- hero slider: crossfade, autoplay with pause, dots ---------- */
  const hero = $('#hero');
  if (hero) {
    const hs = $$('.hero-slide', hero), dots = $$('.hero-dot', hero), pauseBtn = $('#hero-pause');
    const TIME = 6000; let hi = 0, timer = null;
    hero.style.setProperty('--hero-time', TIME / 1000 + 's');
    const goHero = i => {
      hi = (i + hs.length) % hs.length;
      hs.forEach((s, n) => s.classList.toggle('is-on', n === hi));
      dots.forEach((d, n) => d.setAttribute('aria-current', n === hi ? 'true' : 'false'));
      hero.dataset.slide = hi;
      if (timer) { clearTimeout(timer); timer = setTimeout(() => goHero(hi + 1), TIME); }
    };
    const play = () => { hero.classList.remove('is-paused'); pauseBtn.setAttribute('aria-pressed', 'false'); pauseBtn.setAttribute('aria-label', 'Pause slideshow'); timer = setTimeout(() => goHero(hi + 1), TIME); };
    const pause = () => { hero.classList.add('is-paused'); pauseBtn.setAttribute('aria-pressed', 'true'); pauseBtn.setAttribute('aria-label', 'Play slideshow'); clearTimeout(timer); timer = null; };
    dots.forEach(d => d.addEventListener('click', () => goHero(+d.dataset.go)));
    pauseBtn.addEventListener('click', () => (timer ? pause() : play()));
    if (reduceMotion) pause(); else play();
  }

  /* ---------- before / after compare ---------- */
  const cmp = $('#compare'), range = $('#cmp-range');
  if (cmp && range) range.addEventListener('input', () => cmp.style.setProperty('--pos', range.value + '%'));

  /* ---------- scroll-linked motion: slider parallax + panels opening one by one ---------- */
  if (!reduceMotion) {
    const sliderEl = $('#slider'), panelsWrap = $('#panels');
    let lastIdx = -1, sq = false; // the scroll alone decides which box is open (no hover)
    const clamp01 = v => Math.min(1, Math.max(0, v));
    const onScrollMotion = () => {
      sq = false;
      const vh = innerHeight;
      if (sliderEl) {
        const r = sliderEl.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh) {
          const off = (r.top + r.height / 2 - vh / 2);
          $$('.sstep-word', sliderEl).forEach(w => { w.style.translate = `${(off * 0.25).toFixed(1)}px 0`; });
          sliderEl.style.setProperty('--py', `${(off * -0.08).toFixed(1)}px`);
        }
      }
      if (panelsWrap && matchMedia('(min-width: 861px)').matches) {
        const r = panelsWrap.getBoundingClientRect();
        const p = clamp01((vh * 0.95 - r.top) / (vh * 1.05));
        // rise: each box comes up from a different depth
        const rise = clamp01(p * 3);
        panelEls.forEach((el, i) => { el.style.translate = `0 ${((1 - rise) * (60 + i * 40)).toFixed(1)}px`; });
        // boxes open on hover (desktop) or tap; the scroll only brings them in
      }
    };
    addEventListener('scroll', () => { if (!sq) { sq = true; requestAnimationFrame(onScrollMotion); } }, { passive: true });
    addEventListener('resize', onScrollMotion);
    onScrollMotion();
  }
})();
