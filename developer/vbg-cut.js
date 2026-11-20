/* Video Background Remover: the original frame, a scan line that cuts the person out,
 * then one background after another behind the same cutout. Real frames from the app. */
(function () {
  const host = document.getElementById('vbg-cut');
  if (!host || !window.gsap || !window.ScrollTrigger) return;
  const BGS = [['Transparent', 'vc-bg-check'], ['Green screen', 'vc-bg-green'], ['Color', 'vc-bg-coral'], ['Blur', 'vc-bg-blur'], ['Gradient', 'vc-bg-grad']];
  host.innerHTML = `
  <div class="vc-stage">
    <div class="vc-copy"><p class="vc-meta">Video Background Remover · on the phone</p><h2 class="vc-title">Cut out once. Put anything behind it.</h2></div>
    <div class="vc-card">
      ${BGS.map(([, c]) => `<div class="vc-bg ${c}"></div>`).join('')}
      <img class="vc-man" src="/developer/shots/vbgx/man.png" alt="">
      <div class="vc-orig"><img src="/developer/shots/vbgx/photo.jpg" alt=""></div>
      <div class="vc-scan"></div>
    </div>
    <ul class="vc-chips">${BGS.map(([n]) => `<li>${n}</li>`).join('')}</ul>
    <p class="vc-foot"><span>HEVC with alpha</span><span>ProRes 4444</span><span>No upload</span></p>
  </div>`;
  const q = (s) => host.querySelector(s), qa = (s) => [...host.querySelectorAll(s)];
  const bgs = qa('.vc-bg'), chips = qa('.vc-chips li');
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  tl.fromTo(q('.vc-card'), { scale: .86, y: 60, rotation: -3 }, { scale: 1, y: 0, rotation: 0, duration: .1, ease: 'power3.out' }, 0)
    .fromTo(q('.vc-copy'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .06 }, .02)
    // the cut: original frame wiped away by a glowing scan line
    .fromTo(q('.vc-orig'), { clipPath: 'inset(0 0 0 0%)' }, { clipPath: 'inset(0 0 0 100%)', duration: .2, ease: 'power1.inOut' }, .1)
    .fromTo(q('.vc-scan'), { left: '0%', opacity: 1 }, { left: '100%', duration: .2, ease: 'power1.inOut' }, .1)
    .to(q('.vc-scan'), { opacity: 0, duration: .02 }, .3);
  // backgrounds swap behind the same cutout
  for (let i = 1; i < BGS.length; i++) {
    const t = .34 + (i - 1) * .13;
    tl.fromTo(bgs[i], { clipPath: 'circle(0% at 50% 40%)' }, { clipPath: 'circle(150% at 50% 40%)', duration: .08, ease: 'power2.inOut' }, t);
  }
  tl.fromTo(q('.vc-foot'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .05 }, .86).to({}, { duration: .05 }, .95);
  tl.eventCallback('onUpdate', () => { const p = tl.progress(); const idx = p < .3 ? -1 : Math.min(BGS.length - 1, Math.floor((p - .34 + .09) / .13) + (p >= .3 && p < .38 ? 0 : 0));
    chips.forEach((c, i) => c.classList.toggle('is-on', i === Math.max(idx, p >= .3 ? 0 : -1))); });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { tl.progress(1); return; }
  ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom bottom', scrub: .5, animation: tl });
  ScrollTrigger.create({ trigger: host, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'vc-active' } });
})();
