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
  document.querySelectorAll('video').forEach((v) => videoIO.observe(v));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) {
    header.classList.add('is-solid', 'show-name');
    document.querySelectorAll('.flight-captions li')[0]?.classList.add('is-active');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll ---------- */
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: .11, wheelMultiplier: 1 });
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

  /* ---------- Header: solid after the intro, light text over dark scenes ---------- */
  ScrollTrigger.create({ trigger: '#flight', start: 'top 70px', end: 'max', onToggle: (s) => header.classList.toggle('is-solid', s.isActive) });
  ['#flight', '.tint-ink', '.contact'].forEach((sel) => document.querySelectorAll(sel).forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 40px', end: 'bottom 40px', onToggle: (s) => header.classList.toggle('on-dark', s.isActive) });
  }));

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
        header.classList.toggle('on-dark', s.progress > .5 && s.progress < 1);
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
  const words = document.querySelectorAll('.flight-words span');
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
    words.forEach((w) => gsap.to(w, { opacity: w.dataset.step === String(i) ? 1 : 0, scale: w.dataset.step === String(i) ? 1 : .92, duration: .5, overwrite: true }));
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
    const x = parseFloat(cs.getPropertyValue('--x')) * vw, y = parseFloat(cs.getPropertyValue('--y')) * vh;
    gsap.set(chip, { xPercent: -50, yPercent: -50, x });
    gsap.fromTo(chip, { y: y + d * 220, opacity: 0 }, {
      y: y - d * 220, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: '#flight', start: 'top 60%', end: 'bottom top', scrub: true },
    });
  });

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
    gsap.from(ch.querySelectorAll('.chapter-kind, h3, .chapter-lede'), {
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
  gsap.utils.toArray('.practice-grid > div, .tool-list li, .numbers-grid > div').forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
