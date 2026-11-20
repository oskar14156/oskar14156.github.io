/* AppReleaser page: the step nearest the middle of the screen decides which window is open. */
(function () {
  const steps = [...document.querySelectorAll('.sc-step')];
  const screens = [...document.querySelectorAll('.sc-screen')];
  const links = [...document.querySelectorAll('.sc-nav a')];
  const bar = document.querySelector('.sc-progress span');
  const url = document.querySelector('.sc-url');
  const paths = ['portfolio', 'apps/voyeva/launch', 'apps/voyeva/store', 'apps/voyeva/store/publish', 'apps/voyeva/monetization',
    'apps/voyeva/monetization/plan', 'apps/voyeva/monetization?view=planner', 'apps/voyeva/monetization/revenuecat',
    'apps/voyeva/monetization/products', 'apps/voyeva/launch/checklist', 'apps/voyeva/ai-assistant'];
  let current = -1;
  const show = (i) => {
    if (i === current) return;
    current = i;
    screens.forEach((s, n) => { s.classList.toggle('is-active', n === i); s.classList.toggle('is-past', n < i); });
    steps.forEach((s, n) => s.classList.toggle('is-active', n === i));
    const ch = steps[i].dataset.ch;
    links.forEach((l) => l.classList.toggle('is-active', l.dataset.ch === ch));
    if (bar) bar.style.transform = 'scaleX(' + ((i + 1) / steps.length) + ')';
    if (url) url.textContent = 'appreleaser.local/' + (paths[i] || '');
  };
  const pick = () => {
    const mid = window.innerHeight / 2;
    let best = 0, dist = Infinity;
    steps.forEach((s, n) => { const r = s.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - mid); if (d < dist) { dist = d; best = n; } });
    show(best);
  };
  let ticking = false;
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; pick(); }); } }, { passive: true });
  window.addEventListener('resize', pick);
  pick();

  // The hero window tilts up out of the page, like Shopify's product shots.
  if (window.gsap && window.ScrollTrigger && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo('.arp-hero-browser', { rotateX: 28, scale: .9, y: 60 }, { rotateX: 0, scale: 1, y: 0, ease: 'none',
      scrollTrigger: { trigger: '.arp-open', start: 'top 95%', end: 'top 25%', scrub: 1 } });
    gsap.utils.toArray('.ar-tile').forEach((el) => gsap.from(el, { y: 40, opacity: 0, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } }));
  }
})();
