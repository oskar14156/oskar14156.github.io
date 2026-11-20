/* Product pages: theme switch, smooth scroll, phones that spread and strips that drift. */
(function () {
  const root = document.documentElement;
  const body = document.body;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const resolved = () => root.dataset.theme || (media.matches ? 'dark' : 'light');
  const sync = () => {
    body.dataset.themeResolved = resolved();
    document.querySelectorAll('[data-set-theme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setTheme === resolved())));
  };
  document.querySelectorAll('[data-set-theme]').forEach((b) => b.addEventListener('click', () => {
    root.dataset.theme = b.dataset.setTheme;
    try { localStorage.setItem('pf-theme', b.dataset.setTheme); } catch (e) {}
    sync();
  }));
  media.addEventListener('change', sync);
  sync();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.gsap || !window.ScrollTrigger || location.search.includes('static')) return;
  gsap.registerPlugin(ScrollTrigger);
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: .11 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Hero: the phones arrive, then spread further as you scroll away (product pages only).
  if (document.querySelector('.pp-hero')) {
  gsap.from('.pp-hero-text > *', { y: 40, opacity: 0, stagger: .07, duration: 1, ease: 'power3.out' });
  gsap.from('.pp-hero-phones .pp-shot', { y: 160, opacity: 0, stagger: .1, duration: 1.2, ease: 'power3.out', delay: .15 });
  gsap.to('.pp-hero-phones .pp-l', { xPercent: -20, rotate: -12, ease: 'none', scrollTrigger: { trigger: '.pp-hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.pp-hero-phones .pp-r', { xPercent: 20, rotate: 12, ease: 'none', scrollTrigger: { trigger: '.pp-hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.pp-hero-phones .pp-c', { y: -80, ease: 'none', scrollTrigger: { trigger: '.pp-hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
  if (document.querySelector('.home-hero')) {
    gsap.from('.home-hero > *', { y: 40, opacity: 0, stagger: .08, duration: 1, ease: 'power3.out' });
  }

  // Chapters: text rises, each phone in the strip drifts at its own speed.
  document.querySelectorAll('.pp-chapter').forEach((ch) => {
    gsap.from(ch.querySelectorAll('.pp-chapter-text > *'), { y: 50, opacity: 0, stagger: .08, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: ch, start: 'top 75%' } });
    ch.querySelectorAll('.pp-strip .pp-shot').forEach((s, i) => {
      gsap.fromTo(s, { y: 120 + i * 50 }, { y: -40 - i * 20, ease: 'none', scrollTrigger: { trigger: ch, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });
  gsap.utils.toArray('.pp-tech-grid > div, .pp-more-list li, .pp-facts > div, .home-app-grid li, .tool-list li').forEach((el) => {
    gsap.from(el, { y: 30, opacity: 0, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();

/* Large screen panels: pan through the screen as the page scrolls */
(function () {
  if (!window.gsap || !window.ScrollTrigger || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.pp-big-frame').forEach((f) => {
    gsap.fromTo(f.querySelectorAll('img'), { objectPosition: '50% 6%', scale: 1.08 }, { objectPosition: '50% 94%', scale: 1, ease: 'none',
      scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
})();
