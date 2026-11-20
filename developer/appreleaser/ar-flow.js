/* AppReleaser: a cursor clicks through the real app, one screen per step, and the flow ends
 * on a store listing. Positions are fractions of the 1440x900 screenshots. */
(function () {
  const host = document.getElementById('ar-flow');
  if (!host || !window.gsap || !window.ScrollTrigger) return;
  const STEPS = [
    ['overview', null, 'Every app at a glance'],
    ['launch', [.045, .365], 'Open the launch plan'],
    ['listing', [.045, .478], 'Store text in every language'],
    ['publish', [.35, .098], 'Submit and roll out'],
    ['pricing-strategy', [.045, .515], 'Prices per country'],
    ['revenuecat', [.31, .11], 'Products in RevenueCat'],
  ];
  const shot = (n) => `<img class="pf-light-only" src="/developer/shots/arx/${n}-light.jpg" alt=""><img class="pf-dark-only" src="/developer/shots/arx/${n}-dark.jpg" alt="">`;
  host.innerHTML = `
  <div class="af-stage">
    <div class="af-copy"><p class="af-meta">From workspace to store</p><h2 class="af-title">One flow, both stores.</h2><p class="af-step"></p></div>
    <div class="af-browser browser"><div class="browser-bar"><span></span><span></span><span></span><p>appreleaser.local</p></div>
      <div class="af-screens">${STEPS.map(([n], i) => `<div class="af-screen" data-i="${i}">${shot(n)}</div>`).join('')}
        <div class="af-toast"><b>Released</b><span>Rolled out to 100% on Google Play</span></div>
        <svg class="af-cursor" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2l17 9-7.5 2L9 20z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>
        <span class="af-ripple"></span>
      </div>
    </div>
    <div class="af-store">
      <div class="af-store-head"><img src="/developer/shots/icons/riseproof.png" alt=""><div><strong>RiseProof</strong><span>Oskar Polster</span><em>4.6 ★ · Alarm clock</em></div></div>
      <button type="button" tabindex="-1">Install</button>
      <div class="af-store-shots"><img src="/developer/shots/riseproof-1.jpg" alt=""><img src="/developer/shots/riseproof-2.jpg" alt=""><img src="/developer/shots/riseproof-3.jpg" alt=""></div>
      <p class="af-store-note">The end of the flow: a live listing. Shown here: RiseProof on Google Play.</p>
    </div>
  </div>`;
  const q = (s) => host.querySelector(s), screens = [...host.querySelectorAll('.af-screen')];
  const cursor = q('.af-cursor'), ripple = q('.af-ripple'), stepLabel = q('.af-step'), toast = q('.af-toast');
  const AUTOPILOT = [.93, .028];
  const N = STEPS.length, clamp = (v) => Math.min(1, Math.max(0, v)), sm = (t) => t * t * (3 - 2 * t);
  let progress = 0;
  function frame(p) {
    // steps occupy 0 .. .72, the release click .72 .. .8, the store .8 .. 1
    const s = clamp(p / .72) * (N - 1), i = Math.min(N - 2, Math.floor(s)), f = s - i;
    const target = p < .72 ? (STEPS[i + 1][1]) : AUTOPILOT;
    const from = p < .72 ? (STEPS[i][1] || [.5, .55]) : STEPS[N - 1][1];
    const mv = p < .72 ? sm(clamp(f / .6)) : sm(clamp((p - .72) / .05));
    const cx = from[0] + (target[0] - from[0]) * mv, cy = from[1] + (target[1] - from[1]) * mv;
    cursor.style.left = cx * 100 + '%'; cursor.style.top = cy * 100 + '%';
    const clickT = p < .72 ? clamp((f - .6) / .15) : clamp((p - .77) / .03);
    ripple.style.left = target[0] * 100 + '%'; ripple.style.top = target[1] * 100 + '%';
    ripple.style.opacity = clickT > 0 && clickT < 1 ? 1 - clickT : 0; ripple.style.transform = `translate(-50%, -50%) scale(${.3 + clickT * 1.6})`;
    cursor.style.transform = `scale(${clickT > 0 && clickT < .4 ? .85 : 1})`;
    const shown = p < .72 ? (f > .7 ? i + 1 : i) : N - 1;
    screens.forEach((el, k) => el.classList.toggle('is-on', k === shown));
    stepLabel.textContent = (p < .72 ? STEPS[shown][2] : 'Release on autopilot');
    toast.classList.toggle('is-on', p > .79);
    host.style.setProperty('--store', sm(clamp((p - .82) / .12)));
  }
  let inView = false; new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { rootMargin: '20% 0px' }).observe(host);
  gsap.ticker.add(() => { if (inView) frame(progress); });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { progress = 1; return; }
  ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { progress = st.progress; } });
})();
