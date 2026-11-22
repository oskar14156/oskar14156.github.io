/* RiseProof: asleep in bed, the phone rings on the nightstand, snooze is locked. He sits up,
 * checks the mission, drops to the floor and finishes the last three push-ups (7 -> 10)
 * under an on-device pose overlay, then the room turns to sunrise.
 * Joint keyframes are interpolated; the push-ups use two-bone IK with elbows bending back. */
(function () {
  const host = document.getElementById('rp-wake');
  if (!host || !window.gsap || !window.ScrollTrigger) return;
  const G = 470, INK = '#eef1ff', DIM = '#7d84a8', CYAN = '#6ee7ff';
  host.innerHTML = `
  <div class="rw-stage">
    <div class="rw-sky"></div><div class="rw-sun"></div>
    <svg class="rw-svg" viewBox="80 130 900 360" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path d="M80 ${G + 8} H980" stroke="${INK}" stroke-opacity=".25" stroke-width="2"/>
      <g class="rw-room" stroke="${DIM}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M122 ${G + 6} V290 M122 352 H470 V${G + 6} M122 400 H470"/>
        <rect x="134" y="330" width="74" height="22" rx="11" fill="#0b1020"/>
        <path d="M512 ${G + 6} V384 H592 V${G + 6} M512 420 H592"/>
      </g>
    </svg>
    <canvas class="rw-cv" aria-hidden="true"></canvas>
    <div class="rw-copy"><p class="rw-meta">RiseProof · the alarm</p><h2 class="rw-title">It stops ringing when you're actually up.</h2></div>
    <div class="rw-card">
      <div class="rw-row"><span class="rw-bell">⏰</span><span class="rw-time">06:30</span></div>
      <p class="rw-status">Snooze locked · mission running</p>
      <p class="rw-mission">Push-ups, counted by the camera</p>
      <div class="rw-count"><span class="rw-n">–</span><small>/ 10</small></div>
      <div class="rw-bar"><span></span></div>
      <p class="rw-done">Awake at 06:32 · streak 24 days</p>
    </div>
  </div>`;
  const q = (s) => host.querySelector(s);
  // The sleeper, the phone and the pose overlay are drawn on a canvas: as SVG every frame cost a style, layout and repaint
  // pass of the scene (about 45 fps on a Pixel 7). The frame code still writes attributes; they are captured here and painted.
  const part = () => ({ a: {}, style: {}, setAttribute(k, v) { this.a[k] = v; } });
  const E = { trunk: part(), legF: part(), legB: part(), head: part(), armF: part(), armB: part(), bones: part(), box: part(), pose: part(),
    dots: Array.from({ length: 7 }, part), n: q('.rw-n'), bar: q('.rw-bar span'), blanket: part(), rings: part(), phone: part(), pglow: part(), shadow: part() };
  const cv = q('.rw-cv'), g2 = cv.getContext('2d'); let cvK = null;
  const sizeCv = () => { const r = cv.getBoundingClientRect(); if (!r.width) return; const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); const k = Math.min(r.width / 900, r.height / 360);
    cvK = [dpr * k, dpr * ((r.width - 900 * k) / 2 - 80 * k), dpr * (r.height - 360 * k - 130 * k)]; };   // viewBox 80 130 900 360, xMidYMax meet, as the SVG
  addEventListener('resize', () => { cvK = null; }, { passive: true });
  // duvet outline: over the sleeper (BL0), kicked off the front of the bed to the floor (BL1); same points, interpolated
  const BL0 = [[224, 384], [220, 340], [234, 316], [290, 312], [346, 320], [410, 322], [470, 320], [500, 330], [504, 384]];
  const BL1 = [[262, 474], [256, 420], [258, 368], [300, 354], [350, 352], [400, 354], [446, 358], [458, 410], [462, 474]];
  const op = (el, d = 1) => (el.style.opacity === undefined || el.style.opacity === '' ? d : +el.style.opacity);
  const paint = () => {
    if (!cvK) sizeCv(); if (!cvK) return; const g = g2;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(cvK[0], 0, 0, cvK[0], cvK[1], cvK[2]);
    g.lineCap = 'round'; g.lineJoin = 'round';
    // phone glow, rings, the phone (shaking while it rings)
    g.globalAlpha = op(E.pglow, .15); const rg = g.createRadialGradient(552, 374, 0, 552, 374, 60); rg.addColorStop(0, 'rgba(110,231,255,.6)'); rg.addColorStop(1, 'rgba(110,231,255,0)'); g.fillStyle = rg; g.beginPath(); g.arc(552, 374, 60, 0, 7); g.fill();
    g.globalAlpha = op(E.rings, 0); if (g.globalAlpha > 0) { g.strokeStyle = CYAN; g.lineWidth = 3; g.stroke(new Path2D('M530 350 a30 30 0 0 1 44 0')); g.stroke(new Path2D('M520 336 a46 46 0 0 1 64 0')); }
    const sh = /translate\(([-\d.]+)/.exec(E.phone.a.transform || ''); g.globalAlpha = 1; g.fillStyle = CYAN; g.beginPath(); g.roundRect(540 + (sh ? +sh[1] : 0), 370, 24, 12, 3); g.fill();
    g.globalAlpha = op(E.shadow, 0); if (g.globalAlpha > 0) { g.fillStyle = '#000'; g.beginPath(); g.ellipse(+E.shadow.a.cx || 700, G + 10, 200, 9, 0, 0, 7); g.fill(); }
    // the sleeper
    g.globalAlpha = 1; const st = (d, c, w) => { if (d) { g.strokeStyle = c; g.lineWidth = w; g.stroke(new Path2D(d)); } };
    const ink = host.classList.contains('is-done') ? '#1b1d2b' : INK;   // dark against the sunrise
    st(E.legB.a.d, DIM, 24); st(E.armB.a.d, DIM, 16); st(E.trunk.a.d, ink, 38); st(E.legF.a.d, ink, 27);
    if (E.head.a.cx !== undefined) { g.fillStyle = ink; g.beginPath(); g.arc(+E.head.a.cx, +E.head.a.cy, 21, 0, 7); g.fill(); }
    st(E.armF.a.d, ink, 18);
    // the duvet lies over him up to the shoulders; when he sits up he kicks it off the front of the bed, where it hangs to the floor
    { const b = +E.blanket.a.b || 0, pt = BL0.map((v, i) => [v[0] + (BL1[i][0] - v[0]) * b, v[1] + (BL1[i][1] - v[1]) * b]), n = pt.length;
      const curve = (P, i0, i1) => { for (let i = i0; i < i1; i++) P.quadraticCurveTo(pt[i][0], pt[i][1], (pt[i][0] + pt[i + 1][0]) / 2, (pt[i][1] + pt[i + 1][1]) / 2); };
      const path = new Path2D(); path.moveTo(pt[0][0], pt[0][1]); curve(path, 1, n - 1); path.lineTo(pt[n - 1][0], pt[n - 1][1]);
      path.quadraticCurveTo((pt[0][0] + pt[n - 1][0]) / 2, Math.max(pt[0][1], pt[n - 1][1]) + 5, pt[0][0], pt[0][1]);
      g.globalAlpha = 1; g.fillStyle = '#3b4270'; g.fill(path);
      const hi = new Path2D(); hi.moveTo((pt[1][0] + pt[2][0]) / 2, (pt[1][1] + pt[2][1]) / 2); curve(hi, 2, n - 2); g.strokeStyle = '#5a64a3'; g.lineWidth = 4; g.stroke(hi);
      const yf = 368 + 64 * b; g.strokeStyle = '#2c3259'; g.lineWidth = 3; g.beginPath(); g.moveTo(pt[0][0] + 8, yf); g.quadraticCurveTo((pt[0][0] + pt[n - 1][0]) / 2, yf + 6, pt[n - 1][0] - 8, yf - 2); g.stroke(); }
    // the on-device pose overlay
    g.globalAlpha = op(E.pose, 0);
    if (g.globalAlpha > 0) { st(E.bones.a.d, CYAN, 2.5); st(E.box.a.d, CYAN, 3);
      g.fillStyle = CYAN; g.strokeStyle = '#0b1020'; g.lineWidth = 2; for (const d of E.dots) if (d.a.cx !== undefined) { g.beginPath(); g.arc(+d.a.cx, +d.a.cy, 5.5, 0, 7); g.fill(); g.stroke(); } }
    g.globalAlpha = 1;
  };
  const ik = (R, T, a, b, bend) => { const dx = T[0] - R[0], dy = T[1] - R[1]; const d = Math.min(Math.hypot(dx, dy), a + b - .01);
    const base = Math.atan2(dy, dx), ang = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)))); const t = base + bend * ang; return [R[0] + a * Math.cos(t), R[1] + a * Math.sin(t)]; };
  const clamp = (v) => Math.min(1, Math.max(0, v)), span = (p, a, b) => clamp((p - a) / (b - a)), sm = (t) => t * t * (3 - 2 * t);
  const P = (v) => `${v[0].toFixed(1)} ${v[1].toFixed(1)}`;
  const lerpJ = (A, B, t) => { const o = {}; for (const k in A) o[k] = [A[k][0] + (B[k][0] - A[k][0]) * t, A[k][1] + (B[k][1] - A[k][1]) * t]; return o; };
  // Push-up plank: feet fixed, hands fixed under the shoulders, elbows always bend back
  const ANK = [618, G - 4], BODY = 262, UP = 31 * Math.PI / 180;
  const HAND = [ANK[0] + Math.cos(UP) * BODY + 4, G - 2];
  const plank = (down) => {
    const th = (31 - down * 18) * Math.PI / 180, dir = [Math.cos(th), -Math.sin(th)];
    const at = (s) => [ANK[0] + dir[0] * BODY * s, ANK[1] + dir[1] * BODY * s];
    const S = at(1), e1 = ik(S, HAND, 82, 80, -1), e2 = ik(S, HAND, 82, 80, 1);
    return { head: [S[0] + dir[0] * 38 + 8, S[1] + dir[1] * 38 - 12], S, E: e1[0] < e2[0] ? e1 : e2, W: HAND, H: at(.47), K: at(.24), A: ANK };
  };
  const POSES = {
    lying: { head: [176, 332], S: [214, 344], E: [262, 352], W: [300, 344], H: [330, 348], K: [412, 348], A: [488, 346] },
    jolt:  { head: [212, 284], S: [236, 312], E: [282, 330], W: [320, 318], H: [330, 348], K: [412, 348], A: [488, 346] },
    sit:   { head: [452, 214], S: [446, 256], E: [480, 306], W: [516, 330], H: [432, 346], K: [500, 352], A: [506, 462] },
    reach: { head: [470, 222], S: [462, 262], E: [508, 316], W: [548, 364], H: [432, 346], K: [500, 352], A: [506, 462] },
    stand: { head: [624, 166], S: [616, 208], E: [606, 270], W: [608, 328], H: [612, 316], K: [616, 392], A: [612, 462] },
    kneel: { head: [790, 300], S: [758, 326], E: [800, 392], W: HAND, H: [664, 372], K: [632, 446], A: ANK },
    raise: { head: [700, 166], S: [694, 208], E: [726, 152], W: [742, 94], H: [690, 316], K: [694, 392], A: [690, 462] },
  };
  const KEYS = [[0, 'lying'], [.08, 'lying'], [.12, 'jolt'], [.2, 'sit'], [.27, 'reach'], [.33, 'reach'], [.4, 'stand'], [.45, 'kneel'], [.49, 'plank']];
  let progress = 0;
  function joints(p, time) {
    if (p >= .49 && p <= .86) {
      const r = span(p, .51, .84) * 3, f = r - Math.floor(Math.min(r, 2.999));
      return plank(p < .51 || p > .84 ? 0 : Math.sin(Math.PI * sm(f)));
    }
    if (p > .86) return lerpJ(plank(0), POSES.raise, sm(span(p, .86, .95)));
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const [p0, a] = KEYS[i], [p1, b] = KEYS[i + 1];
    const A = a === 'plank' ? plank(0) : POSES[a], B = b === 'plank' ? plank(0) : POSES[b];
    const j = lerpJ(A, B, sm(span(p, p0, p1)));
    if (p < .1) { const br = Math.sin(time * 1.4) * 1.5; j.S[1] += br; j.head[1] += br; }
    return j;
  }
  function frame(p, time) {
    const j = joints(p, time), off = (v, dx, dy) => [v[0] + dx, v[1] + dy];
    E.trunk.setAttribute('d', `M${P(j.H)} L${P(j.S)}`);
    E.legF.setAttribute('d', `M${P(j.H)} L${P(j.K)} L${P(j.A)}`);
    E.legB.setAttribute('d', `M${P(off(j.H, -4, 2))} L${P(off(j.K, -10, 2))} L${P(off(j.A, -12, 0))}`);
    E.armF.setAttribute('d', `M${P(j.S)} L${P(j.E)} L${P(j.W)}`);
    E.armB.setAttribute('d', `M${P(off(j.S, -6, 3))} L${P(off(j.E, -12, 4))} L${P(off(j.W, -16, 0))}`);
    E.head.setAttribute('cx', j.head[0]); E.head.setAttribute('cy', j.head[1]);
    const ringing = p < .84, shake = ringing ? Math.sin(time * 60) * 2 : 0;
    E.phone.setAttribute('transform', `translate(${shake} 0)`);
    E.rings.style.opacity = ringing ? .5 + .5 * Math.sin(time * 8) : 0;
    E.pglow.style.opacity = ringing ? .7 + .3 * Math.sin(time * 8) : .15;
    E.blanket.setAttribute('b', sm(span(p, .1, .21)));
    const reps = p < .51 ? 7 : Math.min(10, 7 + Math.floor(span(p, .51, .84) * 3 + .5));
    { const v = String(p < .27 ? '–' : reps); if (E.n._t !== v) { E.n._t = v; E.n.textContent = v; } }
    E.bar.style.transform = `scaleX(${p < .27 ? 0 : reps / 10})`;
    const ov = span(p, .47, .5) * (1 - span(p, .84, .88));
    E.pose.style.opacity = ov;
    if (ov > 0) {
      const pts = [j.A, j.K, j.H, j.S, j.E, j.W, j.head];
      E.dots.forEach((d, i) => { d.setAttribute('cx', pts[i][0]); d.setAttribute('cy', pts[i][1]); });
      E.bones.setAttribute('d', `M${P(j.A)} L${P(j.K)} L${P(j.H)} L${P(j.S)} L${P(j.head)} M${P(j.S)} L${P(j.E)} L${P(j.W)}`);
      const x0 = 596, x1 = Math.max(j.head[0], j.W[0]) + 34, y0 = Math.min(j.head[1], j.S[1]) - 34, y1 = G + 12, c = 24;
      E.box.setAttribute('d', `M${x0} ${y0 + c}V${y0}H${x0 + c} M${x1 - c} ${y0}H${x1}V${y0 + c} M${x1} ${y1 - c}V${y1}H${x1 - c} M${x0 + c} ${y1}H${x0}V${y1 - c}`);
    }
    E.shadow.setAttribute('cx', (j.A[0] + j.S[0]) / 2); E.shadow.style.opacity = p > .4 ? .35 : 0;
    host.classList.toggle('is-done', p > .84);
    host.style.setProperty('--dawn', sm(span(p, .84, .95)));
  }
  let inView = false; new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { rootMargin: '20% 0px' }).observe(host);
  gsap.ticker.add((t) => { if (inView) { frame(progress, t); paint(); } });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { progress = 1; return; }
  ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { progress = st.progress; } });
  ScrollTrigger.create({ trigger: host, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'rw-active' } });
})();
