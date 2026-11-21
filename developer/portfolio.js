/*
 * Portfolio motion. GSAP + ScrollTrigger drive every scene from the scroll position
 * (scrubbed, so scrolling back reverses it), Lenis smooths the wheel. Without GSAP or
 * with reduced motion the page stays a normal, fully readable document.
 */
(function () {
  const root = document.documentElement;
  const body = document.body;
  const header = document.getElementById('pf-header');

  /* ---------- Theme ---------- */
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const resolved = () => root.dataset.theme || (media.matches ? 'dark' : 'light');
  const syncTheme = () => {
    body.dataset.themeResolved = resolved();
    document.querySelectorAll('[data-set-theme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setTheme === resolved())));
    document.dispatchEvent(new Event('pf-theme'));
  };
  document.querySelectorAll('[data-set-theme]').forEach((b) => b.addEventListener('click', () => {
    root.dataset.theme = b.dataset.setTheme;
    try { localStorage.setItem('pf-theme', b.dataset.setTheme); } catch (e) {}
    syncTheme();
  }));
  media.addEventListener('change', syncTheme);
  syncTheme();

  /* ---------- Count-up numbers ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const countIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const end = Number(e.target.dataset.count), suffix = e.target.dataset.suffix || '';
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 1400), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
      e.target.textContent = v + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: .6 });
  counters.forEach((c) => countIO.observe(c));

  /* ---------- Videos play only while visible ---------- */
  const videoIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting && (!v.classList.contains('flight-screen') || v.classList.contains('is-active'))) {
      v.preload = 'auto'; v.play().catch(() => {});
    } else v.pause();
  }), { threshold: .25 });
  document.querySelectorAll('video:not([data-manual])').forEach((v) => videoIO.observe(v));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Screenshot strips: show that they swipe ----------
     A label with a moving arrow under each strip, a fade on the edge that has more, and one gentle nudge of the cards
     the first time the strip is on screen. Label and fade go once the strip has been swiped. */
  const nudgeIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return; nudgeIO.unobserve(e.target);
    if (!reduce && e.target.scrollLeft < 4) { e.target.classList.add('is-nudging'); setTimeout(() => e.target.classList.remove('is-nudging'), 2600); }
  }), { threshold: .7 });
  document.querySelectorAll('.pf-gallery').forEach((g) => {
    const hint = document.createElement('button'); hint.type = 'button'; hint.className = 'pf-swipe';
    const touch = matchMedia('(hover: none)').matches;
    hint.innerHTML = `<span>${touch ? 'Swipe for more screens' : 'More screens'}</span><i></i>`;
    hint.addEventListener('click', () => { const f = g.querySelector('figure'), end = g.scrollLeft >= g.scrollWidth - g.clientWidth - 8;
      if (end) g.scrollTo({ left: 0, behavior: 'smooth' }); else g.scrollBy({ left: f ? f.offsetWidth + 22 : 260, behavior: 'smooth' }); });
    g.after(hint);
    const update = () => { const more = g.scrollWidth - g.clientWidth > 8, left = g.scrollLeft;
      g.classList.toggle('has-more', more && left < g.scrollWidth - g.clientWidth - 8); hint.hidden = !more;
      if (left > 24 && touch) hint.classList.add('is-done'); };
    g.addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); update();
    nudgeIO.observe(g);
  });

  if (reduce || !window.gsap || !window.ScrollTrigger) {
    header.classList.add('is-solid', 'show-name');
    document.querySelectorAll('.flight-captions li')[0]?.classList.add('is-active');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll ---------- */
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: .11, wheelMultiplier: 1 });
    window.pfLenis = lenis;
    if (root.classList.contains('pf-loading')) { lenis.stop(); document.addEventListener('pf-loaded', () => { lenis.start(); ScrollTrigger.refresh(); }, { once: true }); }
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (ev) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      ev.preventDefault();
      lenis.scrollTo(target, { offset: -70, duration: 1.4 });
    }));
  }

  /* ---------- Header and Android address bar follow the colour under the header ----------
     The colour bands of the page are measured once (after load, after every ScrollTrigger refresh, on theme change);
     while scrolling only scrollY is compared against them: no DOM reads, no forced layout in the scroll path. */
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const opaque = (c) => c && c !== 'transparent' && !/rgba\([^)]*,\s*0(\.0+)?\)$/.test(c);
  const dark = (c) => { const m = c.match(/[\d.]+/g); if (!m) return false; const [r, g, b] = m.map(Number); return .2126 * r + .7152 * g + .0722 * b < 110; };
  let bands = [], bodyC = '', introEnd = 0, hH = 60, topC = '', topQ = 0, sy = scrollY;
  const buildBands = () => {
    bodyC = getComputedStyle(body).backgroundColor; hH = header.offsetHeight;
    const intro = document.getElementById('intro'); introEnd = intro ? intro.offsetTop + intro.offsetHeight : 0;
    bands = [];
    document.querySelectorAll('main section, main article, .site-footer').forEach((el) => {
      let c = getComputedStyle(el).backgroundColor;
      if (!opaque(c)) { const st = el.querySelector(':scope > [class$="-stage"], :scope > [class*="-stage "]'); if (st) c = getComputedStyle(st).backgroundColor; }
      if (!opaque(c)) return;
      const r = el.getBoundingClientRect(); bands.push([r.top + scrollY, r.bottom + scrollY, c, r.height]);
    });
    bands.sort((a, b) => a[3] - b[3]);   // the smallest band that contains the point wins (a dark stage inside a light section)
    sy = scrollY; topC = ''; syncTop();
  };
  const syncTop = () => {
    topQ = 0;
    const y = sy + hH, inIntro = y < introEnd;
    let c = bodyC;
    if (root.classList.contains('pf-loading')) c = 'rgb(17, 25, 22)';
    else if (inIntro) c = header.classList.contains('on-dark') ? 'rgb(17, 25, 22)' : bodyC;   // the ink is a canvas: the intro timeline decides
    else for (const b of bands) if (b[0] <= y && b[1] > y) { c = b[2]; break; }
    if (c === topC) return; topC = c;
    if (themeMeta) themeMeta.setAttribute('content', c);
    if (!inIntro) header.classList.toggle('on-dark', dark(c));
  };
  addEventListener('scroll', () => { sy = scrollY; if (!topQ) topQ = requestAnimationFrame(syncTop); }, { passive: true });   // read in the event, where layout is clean
  document.addEventListener('pf-theme', () => setTimeout(buildBands, 60)); document.addEventListener('pf-loaded', () => setTimeout(buildBands, 60));
  ScrollTrigger.addEventListener('refresh', () => setTimeout(buildBands, 0));
  buildBands();

  /* ---------- Header: solid after the intro, light text over dark scenes ---------- */
  ScrollTrigger.create({ trigger: '#flight', start: 'top 70px', end: 'max', onToggle: (s) => header.classList.toggle('is-solid', s.isActive) });
  // light text over dark scenes: decided from the colour actually under the header (see syncTop), so no dark scene can be missed

  /* ---------- 1 · Intro: the name shrinks into the header ---------- */
  const mark = document.getElementById('intro-wordmark');
  const dest = document.getElementById('header-wordmark');
  const dock = () => {
    const a = mark.getBoundingClientRect(), b = dest.getBoundingClientRect();
    const scale = b.height / (a.height / 2);  // two lines → one line
    return { x: b.left - a.left, y: b.top - a.top - b.height * .1, scale: Math.max(.04, Math.min(1, scale * .55)) };
  };
  gsap.set(mark, { transformOrigin: '0 0' });
  gsap.timeline({
    scrollTrigger: {
      trigger: '#intro', start: 'top top', end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true,
      onUpdate: (s) => {
        header.classList.toggle('show-name', s.progress > .96);
        header.classList.toggle('on-dark', s.progress > .5 && s.progress < 1 && body.dataset.themeResolved !== 'dark');
      },
    },
  })
    .to('.intro-kicker', { opacity: 0, y: -20, duration: .18, ease: 'none' }, .12)
    .to('.intro-line', { opacity: 0, y: -50, duration: .25, ease: 'none' }, .2)
    .to(mark, { x: () => dock().x, y: () => dock().y, scale: () => dock().scale, duration: .42, ease: 'power2.inOut' }, .54)
    .to(mark, { opacity: 0, duration: .04, ease: 'none' }, .96);

  /* ---------- 2 · Flight: one phone through five apps ---------- */
  const screens = document.querySelectorAll('.flight-screen');
  const captions = document.querySelectorAll('.flight-captions li');
  // Each app name is split into letters that roll up into place, like a split-flap board.
  const words = [...document.querySelectorAll('.fw')];
  words.forEach((w) => {
    const name = w.querySelector('.fw-name');
    name.innerHTML = [...name.textContent].map((ch) => '<span class="ch">' + ch + '</span>').join('');
    gsap.set(name.querySelectorAll('.ch'), { yPercent: 110 });
    gsap.set(w.querySelector('.fw-tag'), { opacity: 0, y: 10 });
  });
  let shownWord = null;
  const showWord = (i) => {
    const next = words.find((w) => w.dataset.step === String(i));
    if (next === shownWord) return;
    if (shownWord) {
      const old = shownWord;
      gsap.to(old.querySelectorAll('.ch'), { yPercent: -110, duration: .45, stagger: .025, ease: 'power3.in', overwrite: true, onComplete: () => old.classList.remove('is-active') });
      gsap.to(old.querySelector('.fw-tag'), { opacity: 0, y: -10, duration: .3, overwrite: true });
    }
    next.classList.add('is-active');
    gsap.fromTo(next.querySelectorAll('.ch'), { yPercent: 110 }, { yPercent: 0, duration: .8, stagger: .04, ease: 'power4.out', delay: shownWord ? .2 : 0, overwrite: true });
    gsap.fromTo(next.querySelector('.fw-tag'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .5, delay: .35, overwrite: true });
    shownWord = next;
  };
  const bar = document.querySelector('.flight-progress span');
  let current = -1;
  const setStep = (i) => {
    if (i === current) return;
    current = i;
    screens.forEach((s) => {
      const on = s.dataset.step === String(i);
      s.classList.toggle('is-active', on);
      if (s.tagName === 'VIDEO') { if (on) { s.preload = 'auto'; s.play().catch(() => {}); } else s.pause(); }
    });
    captions.forEach((c) => c.classList.toggle('is-active', c.dataset.step === String(i)));
    showWord(i);
  };
  setStep(0);
  gsap.timeline({
    scrollTrigger: {
      trigger: '#flight', start: 'top top', end: 'bottom bottom', scrub: 1,
      onUpdate: (s) => {
        const p = s.progress;
        setStep(Math.min(4, Math.max(0, Math.floor((p - .1) / .9 * 5))));
        if (bar) bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      },
    },
  })
    .fromTo('#flight-phone', { yPercent: -170, rotateX: 58, rotateY: 24, rotateZ: -32, scale: .66 },
      { yPercent: 0, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1, duration: .12, ease: 'power3.out' })
    .to('#flight-phone', { rotateY: -16, rotateZ: 3, duration: .2, ease: 'sine.inOut' })
    .to('#flight-phone', { rotateY: 14, rotateZ: -3, duration: .2, ease: 'sine.inOut' })
    .to('#flight-phone', { rotateY: -10, rotateZ: 2, duration: .2, ease: 'sine.inOut' })
    .to('#flight-phone', { rotateY: 0, rotateZ: 0, scale: .9, duration: .14, ease: 'sine.inOut' })
    .to('#flight-phone', { yPercent: 18, scale: .78, opacity: .0, duration: .06, ease: 'power2.in' });
  document.querySelectorAll('.chip').forEach((chip) => {
    const cs = getComputedStyle(chip);
    const d = parseFloat(cs.getPropertyValue('--d')) || 1;
    const vw = window.innerWidth / 100, vh = window.innerHeight / 100;
    // phones: fewer chips (their paths never cross), each kept inside the screen
    if (window.innerWidth < 600 && chip.classList.contains('chip-wide')) { chip.style.display = 'none'; return; }
    const lim = window.innerWidth / 2 - chip.offsetWidth / 2 - 10;
    const x = Math.max(-lim, Math.min(lim, parseFloat(cs.getPropertyValue('--x')) * vw)), y = parseFloat(cs.getPropertyValue('--y')) * vh;
    gsap.set(chip, { xPercent: -50, yPercent: -50, x });
    gsap.fromTo(chip, { y: y + d * 220, opacity: 0 }, {
      y: y - d * 220, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: '#flight', start: 'top 60%', end: 'bottom top', scrub: true },
    });
  });

  /* ---------- 3b · Open the work: each window rises over the previous one ---------- */
  const wins = gsap.utils.toArray('.win');
  // phones get a compact list instead (seven full-screen windows were about seven screens of scrolling)
  if (wins.length && !matchMedia('(max-width: 640px)').matches) {
    root.classList.add('has-stack');
    document.querySelector('.stack').style.setProperty('--wins', wins.length);
    wins.forEach((w, i) => { if (i) gsap.set(w, { y: () => window.innerHeight, rotateX: 18, scale: .94 }); w.style.zIndex = i + 1; });
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.stack', start: 'top top', end: 'bottom bottom', scrub: 1,
      onUpdate: (st) => { const a = Math.min(wins.length - 1, Math.round(st.progress * (wins.length - 1))); wins.forEach((w, i) => { w.style.pointerEvents = i === a ? 'auto' : 'none'; }); } } });
    wins.forEach((w, i) => {
      if (!i) return;
      tl.to(w, { y: 0, rotateX: 0, scale: 1, duration: 1, ease: 'power2.out' }, i - 1)
        .to(wins[i - 1], { scale: .92, yPercent: -1.5, opacity: .3, filter: 'blur(2px)', duration: 1, ease: 'power1.in' }, i - 1);
    });
    tl.to({}, { duration: .4 });
  }

  /* ---------- 4 · Path: horizontal on wide screens ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    const track = document.querySelector('.path-track');
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: { trigger: '.path-stage', start: 'top top', end: () => '+=' + distance(), pin: true, scrub: 1, invalidateOnRefresh: true },
    });
  });

  /* ---------- 5 · Chapters: titles rise, phones fan out ---------- */
  document.querySelectorAll('.chapter').forEach((ch) => {
    const heads = ch.querySelectorAll('.chapter-kind, h3, .chapter-lede');
    if (!heads.length) return;
    gsap.from(heads, {
      y: 60, opacity: 0, stagger: .08, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: ch, start: 'top 75%' },
    });
  });
  document.querySelectorAll('.fan').forEach((fan) => {
    const [l, c, r] = [fan.querySelector('.fan-l'), fan.querySelector('.fan-c'), fan.querySelector('.fan-r')];
    gsap.timeline({ scrollTrigger: { trigger: fan, start: 'top 90%', end: 'center 50%', scrub: 1 } })
      .fromTo(l, { xPercent: 0, rotate: 0, y: 80, rotateY: 0 }, { xPercent: -64, rotate: -9, y: 36, rotateY: 18, ease: 'none' }, 0)
      .fromTo(r, { xPercent: 0, rotate: 0, y: 80, rotateY: 0 }, { xPercent: 64, rotate: 9, y: 36, rotateY: -18, ease: 'none' }, 0)
      .fromTo(c, { y: 160, scale: .88 }, { y: 0, scale: 1, ease: 'none' }, 0);
  });

  /* Stub: receipt slides into the phone, lines light up as they are "read" */
  const scan = document.querySelector('.scan');
  if (scan) {
    const lines = scan.querySelectorAll('.receipt li');
    gsap.timeline({
      scrollTrigger: {
        trigger: scan, start: 'top 80%', end: 'bottom 40%', scrub: 1,
        onUpdate: (s) => lines.forEach((li, i) => li.classList.toggle('is-read', s.progress > .18 + i * .07)),
      },
    })
      .fromTo('.receipt', { xPercent: -95, yPercent: -10, rotate: -14 }, { xPercent: -58, yPercent: -6, rotate: -6, ease: 'none', duration: .45 })
      .fromTo('.scan-beam', { yPercent: -110 }, { yPercent: 480, ease: 'none', duration: .55 }, .1)
      .to('.receipt', { xPercent: -20, scale: .6, opacity: 0, rotate: 0, ease: 'power2.in', duration: .4 }, .6)
      .fromTo('.scan-phone', { rotate: 4, xPercent: 34 }, { rotate: 0, xPercent: 0, ease: 'none', duration: .4 }, .6);
  }

  /* ---------- 6 · AppReleaser: the window stands up, chips float ---------- */
  gsap.fromTo('#ar-browser', { rotateX: 32, scale: .86, y: 80 }, {
    rotateX: 0, scale: 1, y: 0, ease: 'none',
    scrollTrigger: { trigger: '.ar-stage', start: 'top 95%', end: 'center 55%', scrub: 1 },
  });
  // Real UI cards drift at different speeds around the dashboard (parallax).
  [['.ar-card-compliance', 140, -120, -6], ['.ar-card-prices', 220, -160, 5], ['.ar-card-texts', 180, -200, -3], ['.ar-card-connections', 260, -140, 4]].forEach(([sel, from, to, rot]) => {
    gsap.from(sel, { opacity: 0, scale: .9, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.ar-stage', start: 'top 70%' } });
    gsap.fromTo(sel, { y: from, rotate: rot }, {
      y: to, rotate: 0, ease: 'none',
      scrollTrigger: { trigger: '.ar-stage', start: 'top 90%', end: 'bottom top', scrub: true },
    });
  });

  /* ---------- Generic reveals ---------- */
  gsap.utils.toArray('.practice-grid > div, .tool-list li, .numbers-grid > div, .ar-tile').forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  /* ---------- Sticky app index: marks the chapter in view ---------- */
  const indexLinks = [...document.querySelectorAll('.work-index a')];
  indexLinks.forEach((a) => {
    ScrollTrigger.create({ trigger: '#' + a.dataset.app, start: 'top 55%', end: 'bottom 55%',
      onToggle: (st) => { if (st.isActive) indexLinks.forEach((l) => l.classList.toggle('is-active', l === a)); } });
  });

  ScrollTrigger.sort();
  window.addEventListener('load', () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); });

  /* ---------- Looping CSS animations (swipe arrows, pulse rings, the alarm bell) run only while on screen:
     off screen they still cost a style pass every frame ---------- */
  const loopIO = new IntersectionObserver((es) => es.forEach((e) => { e.target.style.animationPlayState = e.isIntersecting ? 'running' : 'paused'; }), { rootMargin: '10% 0px' });
  const watchLoops = () => document.querySelectorAll('.pf-swipe i, .nr-ge-dot i, .rw-bell, .intro-cue span').forEach((el) => { if (el._loop) return; el._loop = 1; el.style.animationPlayState = 'paused'; loopIO.observe(el); });
  watchLoops(); window.addEventListener('load', watchLoops);   // the scenes build their own markup in later scripts
})();
