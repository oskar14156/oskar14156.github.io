/* Novus: a lifter's silhouette. Squats solved with the bar kept over mid-foot, the run driven by
 * real sagittal joint-angle curves (hip, knee, ankle) with ground contact. Three squats tied to the scroll,
 * the rep counter and a training-log heatmap fill up, then the lifter racks the bar and
 * breaks into a run that leads straight into the run replay below. */
(function () {
  const host = document.getElementById('novus-gym');
  if (!host || !window.gsap || !window.ScrollTrigger) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LIME = '#c8f169';
  const W = 900, H = 700, GROUND = 600;

  host.innerHTML = `
  <div class="ng-stage">
    <svg class="ng-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <filter id="ngGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id="ngFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LIME}" stop-opacity=".22"/><stop offset="1" stop-color="${LIME}" stop-opacity="0"/></linearGradient>
        <radialGradient id="ngSpot" cx=".5" cy="1" r=".75"><stop offset="0" stop-color="${LIME}" stop-opacity=".16"/><stop offset="1" stop-color="${LIME}" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="450" cy="${GROUND}" rx="380" ry="260" fill="url(#ngSpot)"/>
      <g class="ng-lanes" stroke="${LIME}" stroke-opacity=".18" stroke-width="2">${Array.from({ length: 16 }, (_, i) => `<path d="M${i * 70} ${GROUND + 6} l-30 80"/>`).join('')}</g>
      <rect x="0" y="${GROUND}" width="${W}" height="${H - GROUND}" fill="url(#ngFloor)"/>
      <path d="M0 ${GROUND} H${W}" stroke="${LIME}" stroke-opacity=".5" stroke-width="2"/>
      <g class="ng-rack" stroke="${LIME}" stroke-opacity=".28" stroke-width="10" stroke-linecap="round" fill="none">
        <path d="M318 ${GROUND} V330 M318 380 h44"/>
      </g>
      <g class="ng-body" filter="url(#ngGlow)">
        <g class="ng-bar"><circle class="ng-plate" r="46" fill="${LIME}" fill-opacity=".07" stroke="${LIME}" stroke-width="5"/><circle class="ng-plate2" r="31" fill="none" stroke="${LIME}" stroke-width="2.5" stroke-opacity=".45"/><circle class="ng-hub" r="10" fill="${LIME}"/></g>
        <path class="ng-p ng-leg-b" fill="#6f8a3c"/><path class="ng-p ng-arm-b" fill="#6f8a3c"/>
        <path class="ng-p ng-torso" fill="${LIME}"/><path class="ng-p ng-head" fill="${LIME}"/>
        <path class="ng-p ng-leg-f" fill="${LIME}"/><path class="ng-p ng-arm-f" fill="${LIME}"/>
        <path class="ng-p ng-detail" fill="none" stroke="#0c120e" stroke-width="2.4" stroke-linecap="round" stroke-opacity=".55"/>
      </g>
    </svg>
    <div class="ng-head-copy"><p class="ng-meta">Novus · training log</p><h2 class="ng-title">Every set counted, every week on the map.</h2></div>
    <div class="ng-card">
      <p class="ng-meta ng-ex">Back squat · set 3 of 3</p>
      <div class="ng-reps"><span class="ng-rep">0</span><small>/ 3 reps</small></div>
      <dl class="ng-stats"><div><dt>Weight</dt><dd>100 kg</dd></div><div><dt>Volume today</dt><dd><span class="ng-vol">2,400</span> kg</dd></div></dl>
      <p class="ng-meta ng-hm-label">15 weeks of training</p>
      <div class="ng-heat">${Array.from({ length: 105 }, () => '<i></i>').join('')}</div>
    </div>
  </div>`;

  const q = (s) => host.querySelector(s);
  const E = { legF: q('.ng-leg-f'), legB: q('.ng-leg-b'), armF: q('.ng-arm-f'), armB: q('.ng-arm-b'), torso: q('.ng-torso'), head: q('.ng-head'), detail: q('.ng-detail'),
    bar: q('.ng-bar'), lanes: q('.ng-lanes'), rack: q('.ng-rack') };
  const rep = q('.ng-rep'), vol = q('.ng-vol'), ex = q('.ng-ex'), cells = [...host.querySelectorAll('.ng-heat i')];
  // A deterministic training log: 4-5 sessions a week, heavier towards the end
  const levels = cells.map((_, i) => { const d = i % 7, w = Math.floor(i / 7); const s = Math.sin(i * 12.9898) * 43758.5453; const r = s - Math.floor(s);
    return (d === 2 || d === 6) && r < .7 ? 0 : Math.min(4, 1 + Math.floor(r * 3 + w / 7)); });

  // Proportions of a 1.80 m athlete at this scale (px)
  const L = { thigh: 92, shin: 90, torso: 112, neck: 16, uarm: 62, farm: 56 };
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v) => Math.min(1, Math.max(0, v)), span = (p, a, b) => clamp((p - a) / (b - a));
  const sm = (t) => t * t * (3 - 2 * t), D = Math.PI / 180;
  const f1 = (v) => v.toFixed(1);
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const dirV = (deg) => [Math.sin(deg * D), Math.cos(deg * D)];          // angle from straight down, + = forward (right)
  const mixP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  // a tapered limb segment (capsule)
  const cap = (a, b, ra, rb) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    return `M${f1(a[0] + nx * ra)} ${f1(a[1] + ny * ra)} L${f1(b[0] + nx * rb)} ${f1(b[1] + ny * rb)} A${rb} ${rb} 0 0 0 ${f1(b[0] - nx * rb)} ${f1(b[1] - ny * rb)} L${f1(a[0] - nx * ra)} ${f1(a[1] - ny * ra)} A${ra} ${ra} 0 0 0 ${f1(a[0] + nx * ra)} ${f1(a[1] + ny * ra)}Z`; };
  // shoe: heel behind the ankle, sole along the foot direction, rounded toe
  const footD = (ank, fd) => { const n = [-fd[1], fd[0]];                                       // n points to the sole side
    const P = (u, v) => [ank[0] + fd[0] * u + n[0] * v, ank[1] + fd[1] * u + n[1] * v];
    const a = P(-10, -6), b = P(-11, 8), c = P(26, 9), d = P(32, 3), e = P(24, -3), g = P(6, -9);
    return `M${f1(a[0])} ${f1(a[1])} L${f1(b[0])} ${f1(b[1])} L${f1(c[0])} ${f1(c[1])} Q${f1(d[0] + fd[0] * 3)} ${f1(d[1] + fd[1] * 3)} ${f1(e[0])} ${f1(e[1])} L${f1(g[0])} ${f1(g[1])}Z`; };
  // two-bone IK (elbow side chosen by bend)
  const ik = (R, T, a, b, bend) => { const dx = T[0] - R[0], dy = T[1] - R[1], d = Math.min(Math.hypot(dx, dy), a + b - .01);
    const ang = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)))), t = Math.atan2(dy, dx) + bend * ang;
    return [R[0] + a * Math.cos(t), R[1] + a * Math.sin(t)]; };
  // Running joint angles over one gait cycle (sagittal plane, from treadmill running studies), interpolated smoothly
  const cyc = (tab) => (ph) => { ph = ((ph % 1) + 1) % 1; let i = 0; while (i < tab.length - 2 && ph > tab[i + 1][0]) i++;
    const [x0, y0] = tab[i], [x1, y1] = tab[i + 1], t = (ph - x0) / (x1 - x0); const p0 = tab[(i - 1 + tab.length - 1) % (tab.length - 1)][1], p3 = tab[Math.min(tab.length - 1, i + 2)][1];
    const t2 = t * t, t3 = t2 * t; return .5 * ((2 * y0) + (-p0 + y1) * t + (2 * p0 - 5 * y0 + 4 * y1 - p3) * t2 + (-p0 + 3 * y0 - 3 * y1 + p3) * t3); };
  const HIP = cyc([[0, 28], [.1, 22], [.25, 6], [.4, -14], [.5, -9], [.62, 12], [.78, 36], [.9, 33], [1, 28]]);
  const KNEE = cyc([[0, 14], [.12, 38], [.28, 28], [.4, 16], [.52, 60], [.66, 110], [.8, 82], [.92, 26], [1, 14]]);
  const PLANT = cyc([[0, -10], [.08, 0], [.3, 10], [.42, 42], [.55, 30], [.75, 2], [.9, -12], [1, -10]]);
  function legRun(H, ph) {
    const th = HIP(ph), kn = KNEE(ph), ts = th - kn;
    const K = add(H, dirV(th), L.thigh), A = add(K, dirV(ts), L.shin);
    const base = -ts * D + PLANT(ph) * D, fd = [Math.cos(base), Math.sin(base)];
    return { H, K, A, fd };
  }
  const lowY = (leg) => Math.max(leg.A[1] + 8, leg.A[1] + leg.fd[1] * 30 + 4, leg.A[1] - leg.fd[1] * 9 + 7);
  // ground speed: how far the stance foot travels back per cycle
  const STRIDE = (() => { const a = legRun([0, 0], .02), b = legRun([0, 0], .38); return (a.A[0] - b.A[0]) / .36; })();

  function frame(p, time) {
    const cx = 450, mid = cx + 8, G = GROUND;
    const runW = sm(span(p, .58, .68));
    // ---- squat: foot planted, shin leans up to ~34°, thigh to just below parallel, trunk keeps the bar over mid-foot
    const repPhase = span(p, .08, .5) * 3, k = Math.floor(Math.min(repPhase, 2.999)), f = repPhase - k;
    const d = p < .08 || p > .5 ? 0 : (f < .45 ? sm(f / .45) : sm(1 - (f - .45) / .55));       // slower down, faster up
    const ankS = [mid - 6, G - 12], kneeS = add(ankS, [Math.sin((3 + 33 * d) * D), -Math.cos((3 + 33 * d) * D)], L.shin);
    const tA = (6 + 104 * d) * D, hipS = [kneeS[0] - L.thigh * Math.sin(tA), kneeS[1] - L.thigh * Math.cos(tA)];
    const lean = Math.asin(Math.max(-.2, Math.min(.78, (mid + 4 - hipS[0]) / L.torso)));
    const shS = [hipS[0] + Math.sin(lean) * L.torso, hipS[1] - Math.cos(lean) * L.torso];
    const sq = { H: hipS, K: kneeS, A: ankS, fd: [1, 0], sh: shS, lean };
    // ---- run
    const cycles = Math.max(0, (p - .56)) * 26, ph = cycles % 1;
    const Hr0 = [cx - 6, 0];
    let R = legRun(Hr0, ph), Lg = legRun(Hr0, ph + .5);
    const flight = 7 * (Math.max(0, Math.sin((ph - .4) / .1 * Math.PI)) * (ph > .4 && ph < .5) + Math.max(0, Math.sin((ph - .9) / .1 * Math.PI)) * (ph > .9));
    const y0 = G - Math.max(lowY(R), lowY(Lg)) - flight;
    const sh_ = (o) => ({ H: [o.H[0], o.H[1] + y0], K: [o.K[0], o.K[1] + y0], A: [o.A[0], o.A[1] + y0], fd: o.fd });
    R = sh_(R); Lg = sh_(Lg);
    const runLean = (8 + 1.5 * Math.sin(ph * 4 * Math.PI)) * D, Hr = R.H;
    const shR = [Hr[0] + Math.sin(runLean) * L.torso, Hr[1] - Math.cos(runLean) * L.torso];
    // ---- blend squat → run
    const legF = { H: mixP(sq.H, R.H, runW), K: mixP(sq.K, R.K, runW), A: mixP(sq.A, R.A, runW), fd: mixP(sq.fd, R.fd, runW) };
    const legB = { H: mixP([sq.H[0] - 4, sq.H[1]], Lg.H, runW), K: mixP([sq.K[0] - 10, sq.K[1] + 2], Lg.K, runW), A: mixP([sq.A[0] - 12, sq.A[1]], Lg.A, runW), fd: mixP(sq.fd, Lg.fd, runW) };
    const H = legF.H, sh = mixP(sq.sh, shR, runW), lean2 = lerp(sq.lean, runLean, runW);
    const up = [Math.sin(lean2), -Math.cos(lean2)], back = [-Math.cos(lean2), -Math.sin(lean2)];
    const legPath = (lg, w) => cap(lg.H, lg.K, 17 * w, 12 * w) + cap(lg.K, lg.A, 12 * w, 7.5 * w) + footD(lg.A, lg.fd);
    E.legF.setAttribute('d', legPath(legF, 1)); E.legB.setAttribute('d', legPath(legB, .94));
    // torso: hips to chest, with a chest bulge
    const chest = add(sh, up, -30);
    E.torso.setAttribute('d', cap(add(H, back, 2), chest, 19, 24) + cap(chest, add(sh, up, -4), 24, 18));
    const neck = add(sh, up, 10), headTilt = lerp(lean2 * .45, runLean * .2, runW);
    const hc = [neck[0] + Math.sin(headTilt) * 26 + 4, neck[1] - Math.cos(headTilt) * 26];
    E.head.setAttribute('d', cap(add(sh, up, -2), neck, 8, 8) + `M${f1(hc[0] - 19)} ${f1(hc[1])} a19 22 0 1 0 38 0 a19 22 0 1 0 -38 0Z M${f1(hc[0] + 16)} ${f1(hc[1] + 2)} l7 4 l-7 3z`);
    // ---- arms: on the bar (squat) / swinging with ~90° elbows (run)
    const bar = add(add(sh, back, 15), up, -3);
    const handF_s = add(bar, [8, 6]), handB_s = add(bar, [-2, 6]);
    const elbowS = (hand) => { const a = ik(sh, hand, L.uarm, L.farm, 1), b = ik(sh, hand, L.uarm, L.farm, -1); return a[1] > b[1] ? a : b; };
    const eF_s = elbowS(handF_s), eB_s = elbowS(handB_s);
    const armRun = (phase) => { const a = 1.1 * (HIP(phase) - 10), e = 82 + 18 * Math.sin((phase - .1) * 2 * Math.PI);
      const E1 = add(sh, dirV(-a), L.uarm), Hn = add(E1, dirV(-a + e), L.farm); return [E1, Hn]; };
    const [eF_r, hF_r] = armRun(ph + .5), [eB_r, hB_r] = armRun(ph);
    const eF = mixP(eF_s, eF_r, runW), hF = mixP(handF_s, hF_r, runW), eB = mixP(eB_s, eB_r, runW), hB = mixP(handB_s, hB_r, runW);
    E.armF.setAttribute('d', cap(sh, eF, 11, 8.5) + cap(eF, hF, 8.5, 6.5) + `M${f1(hF[0] - 8)} ${f1(hF[1])} a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0Z`);
    E.armB.setAttribute('d', cap(sh, eB, 10, 8) + cap(eB, hB, 8, 6) + `M${f1(hB[0] - 7)} ${f1(hB[1])} a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0Z`);
    // a few dark lines so the silhouette reads in depth: knee, hip, shorts and shirt hem
    const hem = add(H, up, 22);
    E.detail.setAttribute('d', `M${f1(hem[0] - 18 * up[1] * -1)} ${f1(hem[1])} l${f1(back[0] * -30)} ${f1(back[1] * -30)} M${f1(legF.K[0] - 6)} ${f1(legF.K[1] - 10)} q6 8 0 16`);
    // ---- treadmill floor moves at the stance foot's speed
    E.lanes.setAttribute('transform', `translate(${f1(-((cycles * STRIDE) % 70) * runW)} 0)`);
    // ---- the barbell, seen end on; racked before the run
    const rackT = sm(span(p, .52, .59));
    const barP = [lerp(bar[0], 352, rackT), lerp(bar[1], 372, rackT)];
    E.bar.setAttribute('transform', `translate(${f1(barP[0])} ${f1(barP[1])})`);
    E.bar.style.opacity = 1 - span(p, .6, .66);
    E.rack.style.opacity = .9 * (1 - span(p, .6, .66));
    const reps = p < .08 ? 0 : Math.min(3, Math.floor(span(p, .08, .5) * 3 + (f > .5 ? .5 : 0)));
    rep.textContent = reps;
    vol.textContent = (2400 + reps * 100).toLocaleString('en-US');
    ex.textContent = p < .56 ? 'Back squat · set 3 of 3' : 'Then the run: 29.8 km';
    const fill = Math.floor(span(p, .05, .55) * cells.length);
    cells.forEach((c, i) => { c.dataset.l = i < fill ? levels[i] : 0; });
    host.style.setProperty('--ng-p', p);
  }

  let progress = 0;
  gsap.ticker.add((time) => frame(progress, time));
  if (reduce) { progress = .4; return; }
  ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { progress = st.progress; } });
  ScrollTrigger.create({ trigger: host, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'ng-active' } });
})();
