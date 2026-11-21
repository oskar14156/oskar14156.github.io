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
        <linearGradient id="ngFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LIME}" stop-opacity=".22"/><stop offset="1" stop-color="${LIME}" stop-opacity="0"/></linearGradient>
        <radialGradient id="ngSpot" cx=".5" cy="1" r=".75"><stop offset="0" stop-color="${LIME}" stop-opacity=".16"/><stop offset="1" stop-color="${LIME}" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="450" cy="${GROUND}" rx="380" ry="260" fill="url(#ngSpot)"/>
      <g class="ng-lanes" stroke="${LIME}" stroke-opacity=".18" stroke-width="2">${Array.from({ length: 16 }, (_, i) => `<path d="M${i * 70} ${GROUND + 6} l-30 80"/>`).join('')}</g>
      <rect x="0" y="${GROUND}" width="${W}" height="${H - GROUND}" fill="url(#ngFloor)"/>
      <path d="M0 ${GROUND} H${W}" stroke="${LIME}" stroke-opacity=".5" stroke-width="2"/>
      <g class="ng-rack"></g>
    </svg>
    <canvas class="ng-cv" aria-hidden="true"></canvas>
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
  // The figure, the bar and the near rack upright are drawn on a canvas: as SVG every pose change cost a style, layout and
  // repaint pass of the whole scene per frame (45 fps on a Pixel 7); the frame code still writes path strings, captured here
  const PD = {}; const part = (k) => ({ setAttribute: (_, v) => { PD[k] = v; }, style: {} });
  const E = { legF: part('legF'), legB: part('legB'), armF: part('armF'), armB: part('armB'), torso: part('torso'), head: part('head'), detail: part('detail'),
    bar: part('bar'), lanes: q('.ng-lanes'), rack: q('.ng-rack'), rackF: part('rackF') };
  const cv = q('.ng-cv'), cx2 = cv.getContext('2d'); let cvK = null, rackFD = [];
  const sizeCv = () => { const r = cv.getBoundingClientRect(); if (!r.width) return; const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); const k = Math.min(r.width / W, r.height / H);
    cvK = [dpr * k, dpr * (r.width - W * k) / 2, dpr * (r.height - H * k)]; };   // preserveAspectRatio xMidYMax meet, as the SVG
  const paint = () => {
    if (!cvK) sizeCv(); if (!cvK) return;
    const g = cx2; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(cvK[0], 0, 0, cvK[0], cvK[1], cvK[2]);
    const fillP = (d, c) => { if (d) { g.fillStyle = c; g.fill(new Path2D(d)); } };
    fillP(PD.legB, '#6f8a3c'); fillP(PD.armB, '#6f8a3c'); fillP(PD.torso, LIME); fillP(PD.head, LIME); fillP(PD.legF, LIME); fillP(PD.armF, LIME);
    const fade = E.bar.style.opacity === undefined ? 1 : +E.bar.style.opacity;   // bar and near upright stay behind as the run begins
    g.globalAlpha = fade; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const r of rackFD) { if (r.c) { g.globalAlpha = fade * .6; g.fillStyle = '#0c120e'; g.beginPath(); g.arc(r.c[0], r.c[1], 2.4, 0, 7); g.fill(); continue; }
      g.globalAlpha = fade * r.a; g.strokeStyle = LIME; g.lineWidth = r.w; g.stroke(new Path2D(r.d)); }
    const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(PD.bar || '');
    if (m) { const bx = +m[1], by = +m[2];
      g.globalAlpha = fade * .1; g.fillStyle = LIME; g.beginPath(); g.arc(bx, by, 46, 0, 7); g.fill();
      g.globalAlpha = fade; g.strokeStyle = LIME; g.lineWidth = 5; g.stroke();
      g.globalAlpha = fade * .45; g.lineWidth = 2.5; g.beginPath(); g.arc(bx, by, 31, 0, 7); g.stroke();
      g.globalAlpha = fade; g.beginPath(); g.arc(bx, by, 10, 0, 7); g.fill(); }
    g.globalAlpha = .55; if (PD.detail) { g.strokeStyle = '#0c120e'; g.lineWidth = 2.4; g.stroke(new Path2D(PD.detail)); }
    g.globalAlpha = 1;
  };
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
  const HIP = cyc([[0, 26], [.1, 20], [.25, 4], [.4, -16], [.5, -10], [.62, 14], [.78, 42], [.9, 36], [1, 26]]);
  const KNEE = cyc([[0, 14], [.12, 40], [.28, 28], [.4, 16], [.52, 66], [.66, 122], [.8, 88], [.92, 24], [1, 14]]);
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

  // standing body for a front-foot position and a knee dip (0..1 of a full squat)
  function stand(ax, d, mid) {
    const ank = [ax, GROUND - 12], knee = add(ank, [Math.sin((3 + 33 * d) * D), -Math.cos((3 + 33 * d) * D)], L.shin);
    const tA = (6 + 104 * d) * D, hip = [knee[0] - L.thigh * Math.sin(tA), knee[1] - L.thigh * Math.cos(tA)];
    const lean = Math.asin(Math.max(-.2, Math.min(.78, (mid + 4 - hip[0]) / L.torso)));
    return { hip, lean, sh: [hip[0] + Math.sin(lean) * L.torso, hip[1] - Math.cos(lean) * L.torso] };
  }
  const barOf = (sh, lean) => { const up = [Math.sin(lean), -Math.cos(lean)], back = [-Math.cos(lean), -Math.sin(lean)]; return add(add(sh, back, 15), up, -3); };
  const STEP = 58, MID = 458;
  const hookBar = (() => { const s0 = stand(MID - 6 + STEP, .1, MID + STEP); return barOf(s0.sh, s0.lean); })();
  // rack: uprights just in front of the bar's racked position, J-hook cups, a safety arm, base plates
  (() => { const x = hookBar[0] + 24, y = hookBar[1];
    // far upright behind him, near upright (with the J-hook and safety arm) in front: the rack stands either side of the lifter
    E.rack.innerHTML = `<path d="M${x + 16} ${GROUND} V${y - 150} M${x} ${GROUND} h56" stroke="${LIME}" stroke-opacity=".2" stroke-width="12" stroke-linecap="round" fill="none"/>
      <path d="M${x + 16} ${y + 10} H${x - 12} V${y - 6}" stroke="${LIME}" stroke-opacity=".22" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    rackFD = [{ d: `M${x} ${GROUND} V${y - 160} M${x - 30} ${GROUND} h64`, a: .38, w: 13 }, { d: `M${x} ${y + 12} H${x - 30} V${y - 6}`, a: .75, w: 7 },
      { d: `M${x} ${y + 120} H${x - 70}`, a: .35, w: 8 }, ...Array.from({ length: 9 }, (_, i) => ({ c: [x, y - 140 + i * 30] }))]; })();

  const setText = (el, v) => { v = String(v); if (el._t !== v) { el._t = v; el.textContent = v; } };   // an unchanged text is not rewritten (that cost a style and layout pass per frame)
  function frame(p, time) {
    const cx = 450, G = GROUND;
    // ---- 3 squats, walk the bar forward into the rack, let go, step back, run
    const repPhase = span(p, .06, .46) * 3, k = Math.floor(Math.min(repPhase, 2.999)), f = repPhase - k;
    const dRep = p < .06 || p > .46 ? 0 : (f < .45 ? sm(f / .45) : sm(1 - (f - .45) / .55));
    const dip = Math.sin(Math.PI * span(p, .53, .565)) * .12;                         // a small knee dip sets the bar in the hooks
    const sF = STEP * (sm(span(p, .47, .5)) - sm(span(p, .61, .635))), sB = STEP * (sm(span(p, .5, .53)) - sm(span(p, .59, .61)));
    const lift = (a, b) => 18 * Math.sin(Math.PI * span(p, a, b));
    const liftF = lift(.47, .5) + lift(.61, .635), liftB = lift(.5, .53) + lift(.59, .61);
    const mid = MID + (sF + sB) / 2;
    const S = stand(mid - 6, dRep + dip, mid);
    const footF = [MID - 6 + sF, G - 12 - liftF], footB = [MID - 18 + sB, G - 12 - liftB];
    const hip = [S.hip[0], S.hip[1] + 2 * (liftF + liftB) / 18];
    const kneeOf = (H, A) => ik(H, A, L.thigh, L.shin, -1);
    const sq = { H: hip, KF: kneeOf(hip, footF), AF: footF, KB: kneeOf([hip[0] - 4, hip[1]], footB), AB: footB, sh: [S.sh[0], S.sh[1] + (hip[1] - S.hip[1])], lean: S.lean };
    // ---- run: fewer, bigger strides per scroll
    const runW = sm(span(p, .63, .7));
    const cycles = Math.max(0, (p - .63)) * 9, ph = cycles % 1;
    const Hr0 = [cx - 6, 0];
    let R = legRun(Hr0, ph), Lg = legRun(Hr0, ph + .5);
    const flight = 9 * (Math.max(0, Math.sin((ph - .4) / .1 * Math.PI)) * (ph > .4 && ph < .5) + Math.max(0, Math.sin((ph - .9) / .1 * Math.PI)) * (ph > .9));
    const y0 = G - Math.max(lowY(R), lowY(Lg)) - flight;
    const sh_ = (o) => ({ H: [o.H[0], o.H[1] + y0], K: [o.K[0], o.K[1] + y0], A: [o.A[0], o.A[1] + y0], fd: o.fd });
    R = sh_(R); Lg = sh_(Lg);
    const runLean = (7 + 1.5 * Math.sin(ph * 4 * Math.PI)) * D, Hr = R.H;
    const shR = [Hr[0] + Math.sin(runLean) * L.torso, Hr[1] - Math.cos(runLean) * L.torso];
    // ---- blend
    const legF = { H: mixP(sq.H, R.H, runW), K: mixP(sq.KF, R.K, runW), A: mixP(sq.AF, R.A, runW), fd: mixP([1, 0], R.fd, runW) };
    const legB = { H: mixP([sq.H[0] - 4, sq.H[1]], Lg.H, runW), K: mixP(sq.KB, Lg.K, runW), A: mixP(sq.AB, Lg.A, runW), fd: mixP([1, 0], Lg.fd, runW) };
    const H = legF.H, sh = mixP(sq.sh, shR, runW), lean2 = lerp(sq.lean, runLean, runW);
    const up = [Math.sin(lean2), -Math.cos(lean2)], back = [-Math.cos(lean2), -Math.sin(lean2)];
    const legPath = (lg, w) => cap(lg.H, lg.K, 17 * w, 12 * w) + cap(lg.K, lg.A, 12 * w, 7.5 * w) + footD(lg.A, lg.fd);
    E.legF.setAttribute('d', legPath(legF, 1)); E.legB.setAttribute('d', legPath(legB, .94));
    const chest = add(sh, up, -30);
    E.torso.setAttribute('d', cap(add(H, back, 2), chest, 19, 24) + cap(chest, add(sh, up, -4), 24, 18));
    const neck = add(sh, up, 10), headTilt = lerp(lean2 * .45, runLean * .2, runW);
    const hc = [neck[0] + Math.sin(headTilt) * 26 + 4, neck[1] - Math.cos(headTilt) * 26];
    E.head.setAttribute('d', cap(add(sh, up, -2), neck, 8, 8) + `M${f1(hc[0] - 19)} ${f1(hc[1])} a19 22 0 1 0 38 0 a19 22 0 1 0 -38 0Z`);
    // ---- bar: on his back until it sits in the hooks; hands stay on it until then
    const barBack = barOf(sq.sh, sq.lean), racked = p >= .565;
    const bar = racked ? hookBar : barBack;
    const release = sm(span(p, .565, .6));
    const onBarF = add(bar, [8, 6]), onBarB = add(bar, [-2, 6]);
    const hangF = add(sq.sh, [10, 116]), hangB = add(sq.sh, [-4, 114]);
    const handF_s = mixP(onBarF, hangF, release), handB_s = mixP(onBarB, hangB, release);
    const elbowS = (hand) => { const a = ik(sq.sh, hand, L.uarm, L.farm, 1), b = ik(sq.sh, hand, L.uarm, L.farm, -1); return a[1] > b[1] ? a : b; };
    const elbowHang = (hand) => ik(sq.sh, hand, L.uarm, L.farm, 1);
    const eF_s = mixP(elbowS(onBarF), elbowHang(hangF), release), eB_s = mixP(elbowS(onBarB), elbowHang(hangB), release);
    const armRun = (phase) => { const a = 1.15 * (HIP(phase) - 10), e = 84 + 16 * Math.sin((phase - .1) * 2 * Math.PI);
      const E1 = add(shR, dirV(-a), L.uarm), Hn = add(E1, dirV(-a + e), L.farm); return [E1, Hn]; };
    const [eF_r, hF_r] = armRun(ph + .5), [eB_r, hB_r] = armRun(ph);
    const eF = mixP(eF_s, eF_r, runW), hF = mixP(handF_s, hF_r, runW), eB = mixP(eB_s, eB_r, runW), hB = mixP(handB_s, hB_r, runW);
    E.armF.setAttribute('d', cap(sh, eF, 11, 8.5) + cap(eF, hF, 8.5, 6.5) + `M${f1(hF[0] - 8)} ${f1(hF[1])} a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0Z`);
    E.armB.setAttribute('d', cap(sh, eB, 10, 8) + cap(eB, hB, 8, 6) + `M${f1(hB[0] - 7)} ${f1(hB[1])} a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0Z`);
    const hem = add(H, up, 22);
    E.detail.setAttribute('d', `M${f1(hem[0] - 18 * up[1] * -1)} ${f1(hem[1])} l${f1(back[0] * -30)} ${f1(back[1] * -30)} M${f1(legF.K[0] - 6)} ${f1(legF.K[1] - 10)} q6 8 0 16`);
    // ---- treadmill floor; the rack and the bar stay behind as the run begins
    { const v = `translate(${f1(-((cycles * STRIDE) % 70) * runW)} 0)`; if (E.lanes._t !== v) { E.lanes._t = v; E.lanes.setAttribute('transform', v); } }
    E.bar.setAttribute('transform', `translate(${f1(bar[0])} ${f1(bar[1])})`);
    const gone = span(p, .68, .74);
    E.bar.style.opacity = 1 - gone; if (E.rack._o !== gone) { E.rack._o = gone; E.rack.style.opacity = 1 - gone; }
    const reps = p < .06 ? 0 : Math.min(3, Math.floor(span(p, .06, .46) * 3 + (f > .5 ? .5 : 0)));
    setText(rep, reps);
    setText(vol, (2400 + reps * 100).toLocaleString('en-US'));
    setText(ex, p < .6 ? 'Back squat · set 3 of 3' : 'Then the run: 29.8 km');
    const fill = Math.floor(span(p, .05, .5) * cells.length);
    if (fill !== lastFill) { lastFill = fill; cells.forEach((c, i) => { c.dataset.l = i < fill ? levels[i] : 0; }); }   // 105 cells, rewritten only when the count moves
  }

  let progress = 0, lastFill = -1, lastP = -1;
  let inView = false; new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { rootMargin: '20% 0px' }).observe(host);
  // drawn only when the scroll moved (the pose depends on nothing else)
  gsap.ticker.add((time) => { if (inView && progress !== lastP) { lastP = progress; frame(progress, time); paint(); } });
  addEventListener('resize', () => { cvK = null; lastP = -1; }, { passive: true });
  if (reduce) { progress = .4; return; }
  ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { progress = st.progress; } });
  ScrollTrigger.create({ trigger: host, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'ng-active' } });
})();
