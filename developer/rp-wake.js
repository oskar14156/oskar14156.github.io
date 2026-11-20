/* RiseProof: 06:30, the alarm will not stop. Ten push-ups, tied to the scroll and read by an
 * on-device pose overlay, until the room turns to sunrise. Body solved with two-bone IK. */
(function () {
  const host = document.getElementById('rp-wake');
  if (!host || !window.gsap || !window.ScrollTrigger) return;
  const G = 470, INK = '#eef1ff', CYAN = '#6ee7ff';
  host.innerHTML = `
  <div class="rw-stage">
    <div class="rw-sky"></div><div class="rw-sun"></div>
    <svg class="rw-svg" viewBox="170 230 660 270" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs><filter id="rwGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <path d="M0 ${G + 8} H1000" stroke="${INK}" stroke-opacity=".25" stroke-width="2"/>
      <ellipse class="rw-shadow" cx="420" cy="${G + 10}" rx="230" ry="10" fill="#000" opacity=".35"/>
      <g class="rw-body" filter="url(#rwGlow)" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path class="rw-arm-b" stroke-width="17" stroke-opacity=".55"/>
        <path class="rw-trunk" stroke-width="40"/>
        <path class="rw-legs" stroke-width="28"/>
        <circle class="rw-head" r="22" fill="${INK}" stroke="none"/>
        <path class="rw-arm-f" stroke-width="19"/>
      </g>
      <g class="rw-pose" stroke="${CYAN}" stroke-width="2.5" fill="none">
        <path class="rw-bones"/>
        <g class="rw-dots" fill="${CYAN}" stroke="#0b1020" stroke-width="2">${Array.from({ length: 8 }, () => '<circle r="6"/>').join('')}</g>
        <path class="rw-box" stroke-width="3"/>
      </g>
    </svg>
    <div class="rw-copy"><p class="rw-meta">RiseProof · the alarm</p><h2 class="rw-title">It stops ringing when you're actually up.</h2></div>
    <div class="rw-card">
      <div class="rw-row"><span class="rw-bell">⏰</span><span class="rw-time">06:30</span></div>
      <p class="rw-status">Snooze locked · mission running</p>
      <p class="rw-mission">Push-ups, counted by the camera</p>
      <div class="rw-count"><span class="rw-n">0</span><small>/ 10</small></div>
      <div class="rw-bar"><span></span></div>
      <p class="rw-done">Awake at 06:32 · streak 24 days</p>
    </div>
  </div>`;
  const q = (s) => host.querySelector(s);
  const E = { trunk: q('.rw-trunk'), legs: q('.rw-legs'), head: q('.rw-head'), armF: q('.rw-arm-f'), armB: q('.rw-arm-b'), bones: q('.rw-bones'), box: q('.rw-box'),
    dots: [...host.querySelectorAll('.rw-dots circle')], n: q('.rw-n'), bar: q('.rw-bar span') };
  const ik = (R, T, a, b, bend) => { const dx = T[0] - R[0], dy = T[1] - R[1]; let d = Math.min(Math.hypot(dx, dy), a + b - .01);
    const base = Math.atan2(dy, dx), ang = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)))); const t = base + bend * ang; return [R[0] + a * Math.cos(t), R[1] + a * Math.sin(t)]; };
  const clamp = (v) => Math.min(1, Math.max(0, v)), span = (p, a, b) => clamp((p - a) / (b - a)), sm = (t) => t * t * (3 - 2 * t);
  const P = (v) => `${v[0].toFixed(1)} ${v[1].toFixed(1)}`;
  let progress = 0;
  function frame(p, time) {
    const repsF = span(p, .12, .76) * 10, k = Math.min(9.999, repsF), f = k - Math.floor(k);
    const down = p < .12 || p > .76 ? 0 : Math.sin(Math.PI * sm(f));
    const done = p > .78;
    const th = (24 - down * 15) * Math.PI / 180;
    const A = [250, G - 4];
    const dir = [Math.cos(th), -Math.sin(th)];
    const at = (s) => [A[0] + dir[0] * 300 * s, A[1] + dir[1] * 300 * s];
    const S = at(1), Hp = at(.47), Kn = at(.24);
    const W = [at(1)[0] + 6 + 0 * down, G - 2];
    const Wfix = [250 + Math.cos(24 * Math.PI / 180) * 300 + 6, G - 2];
    const e1 = ik(S, Wfix, 84, 82, -1), e2 = ik(S, Wfix, 84, 82, 1), El = e1[1] < e2[1] ? e1 : e2;
    const head = [S[0] + dir[0] * 40 + 8, S[1] + dir[1] * 40 - 12];
    E.trunk.setAttribute('d', `M${P(Hp)} L${P(S)}`);
    E.legs.setAttribute('d', `M${P(A)} L${P(Kn)} L${P(Hp)}`);
    E.head.setAttribute('cx', head[0]); E.head.setAttribute('cy', head[1]);
    E.armF.setAttribute('d', `M${P(S)} L${P(El)} L${P(Wfix)}`);
    E.armB.setAttribute('d', `M${P([S[0] - 8, S[1] + 4])} L${P([El[0] - 12, El[1] + 2])} L${P([Wfix[0] - 16, Wfix[1]])}`);
    const pts = [A, Kn, Hp, S, El, Wfix, head, [A[0] + 22, A[1] + 2]];
    E.dots.forEach((d, i) => { d.setAttribute('cx', pts[i][0]); d.setAttribute('cy', pts[i][1]); });
    E.bones.setAttribute('d', `M${P(A)} L${P(Kn)} L${P(Hp)} L${P(S)} L${P(head)} M${P(S)} L${P(El)} L${P(Wfix)}`);
    const minX = 225, maxX = Math.max(head[0], Wfix[0]) + 40, minY = Math.min(head[1], S[1]) - 40, maxY = G + 12, c = 26;
    E.box.setAttribute('d', `M${minX} ${minY + c}V${minY}H${minX + c} M${maxX - c} ${minY}H${maxX}V${minY + c} M${maxX} ${maxY - c}V${maxY}H${maxX - c} M${minX + c} ${maxY}H${minX}V${maxY - c}`);
    const reps = Math.min(10, Math.floor(repsF + (f > .55 ? 1 : 0) * 0 + .001 + (f > .5 ? .5 : 0)));
    E.n.textContent = p > .76 ? 10 : Math.floor(repsF + .5 > 10 ? 10 : repsF);
    E.bar.style.transform = `scaleX(${Math.min(1, repsF / 10)})`;
    host.classList.toggle('is-done', done);
    host.style.setProperty('--dawn', sm(span(p, .76, .92)));
  }
  gsap.ticker.add((t) => frame(progress, t));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { progress = 1; return; }
  ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { progress = st.progress; } });
  ScrollTrigger.create({ trigger: host, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'rw-active' } });
})();
