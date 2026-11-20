/* Novus: a lifter's silhouette, solved with two-bone IK. Five squats tied to the scroll,
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
      <g class="ng-body" filter="url(#ngGlow)" stroke="${LIME}" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <g class="ng-bar"><circle class="ng-plate" r="50" fill="${LIME}" fill-opacity=".12" stroke="${LIME}" stroke-width="6"/><circle class="ng-hub" r="11" fill="${LIME}" stroke="none"/><path class="ng-bar-line" stroke-width="5" stroke-opacity=".6"/></g>
        <path class="ng-leg-b" stroke-width="30" stroke="#6f8a3c"/>
        <path class="ng-arm-b" stroke-width="19" stroke="#6f8a3c"/>
        <path class="ng-torso" stroke-width="40"/>
        <circle class="ng-head" r="23" fill="${LIME}" stroke="none"/>
        <path class="ng-leg-f" stroke-width="32"/>
        <path class="ng-foot-f" stroke-width="16"/>
        <path class="ng-foot-b" stroke-width="14" stroke="#6f8a3c"/>
        <path class="ng-arm-f" stroke-width="21"/>
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
  const E = { legF: q('.ng-leg-f'), legB: q('.ng-leg-b'), footF: q('.ng-foot-f'), footB: q('.ng-foot-b'), armF: q('.ng-arm-f'), armB: q('.ng-arm-b'), torso: q('.ng-torso'),
    head: q('.ng-head'), bar: q('.ng-bar'), barLine: q('.ng-bar-line'), plate: q('.ng-plate'), hub: q('.ng-hub'), lanes: q('.ng-lanes'), rack: q('.ng-rack') };
  const rep = q('.ng-rep'), vol = q('.ng-vol'), ex = q('.ng-ex'), cells = [...host.querySelectorAll('.ng-heat i')];
  // A deterministic training log: 4-5 sessions a week, heavier towards the end
  const levels = cells.map((_, i) => { const d = i % 7, w = Math.floor(i / 7); const s = Math.sin(i * 12.9898) * 43758.5453; const r = s - Math.floor(s);
    return (d === 2 || d === 6) && r < .7 ? 0 : Math.min(4, 1 + Math.floor(r * 3 + w / 7)); });

  const L = { torso: 118, uarm: 60, farm: 56, thigh: 92, shin: 88 };
  const ik = (R, T, a, b, bend) => {
    const dx = T[0] - R[0], dy = T[1] - R[1]; let d = Math.hypot(dx, dy); d = Math.min(d, a + b - .01);
    const base = Math.atan2(dy, dx), ang = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
    const t = base + bend * ang; return [R[0] + a * Math.cos(t), R[1] + a * Math.sin(t)];
  };
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v) => Math.min(1, Math.max(0, v)), span = (p, a, b) => clamp((p - a) / (b - a));
  const sm = (t) => t * t * (3 - 2 * t);
  const pt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

  function frame(p, time) {
    const cx = 450, mid = cx + 6;                         // mid-foot
    const runW = sm(span(p, .58, .68));
    // Squat: the last three reps; hips go back and down, the bar stays over mid-foot
    const repPhase = span(p, .08, .5) * 3;
    const k = Math.floor(Math.min(repPhase, 2.999)), f = repPhase - k;
    const depth = p < .08 || p > .5 ? 0 : Math.sin(Math.PI * sm(f));
    const sqHip = [cx - 8 - depth * 66, GROUND - 176 + depth * 86];
    const sqLean = Math.asin(Math.max(-.9, Math.min(.9, (mid - sqHip[0]) / L.torso)));
    // Run cycle: stance (foot on the ground, moving back), swing (foot travels forward, heel kick)
    const ph = p * 30 * Math.PI * 2;
    const runFoot = (o) => { let u = ((ph + o) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      if (u < Math.PI) { const t = u / Math.PI; return [lerp(58, -62, t), 0]; }
      const t = (u - Math.PI) / Math.PI; const e = t * t * (3 - 2 * t);
      return [lerp(-62, 58, e) - Math.sin(t * Math.PI) * 18, -Math.pow(Math.sin(t * Math.PI), .8) * 78 - (t < .4 ? Math.sin(t / .4 * Math.PI) * 28 : 0)]; };
    const runHip = [cx, GROUND - 170 - 9 * Math.cos(2 * ph)];
    const hip = [lerp(sqHip[0], runHip[0], runW), lerp(sqHip[1], runHip[1], runW)];
    const lean = lerp(sqLean, .2, runW);
    const sh = [hip[0] + Math.sin(lean) * L.torso, hip[1] - Math.cos(lean) * L.torso];
    const headC = [sh[0] + Math.sin(lean * .6) * 48 + 10, sh[1] - Math.cos(lean * .6) * 48];
    const rf = runFoot(0), rb = runFoot(Math.PI);
    const fF = [lerp(mid + 4, hip[0] + rf[0], runW), lerp(GROUND - 8, GROUND - 8 + rf[1], runW)];
    const fB = [lerp(mid - 8, hip[0] + rb[0], runW), lerp(GROUND - 8, GROUND - 8 + rb[1], runW)];
    const kneeF = ik(hip, fF, L.thigh, L.shin, -1), kneeB = ik([hip[0] - 4, hip[1]], fB, L.thigh, L.shin, -1);
    E.legF.setAttribute('d', `M${pt(hip)} L${pt(kneeF)} L${pt(fF)}`);
    E.legB.setAttribute('d', `M${pt([hip[0] - 4, hip[1]])} L${pt(kneeB)} L${pt(fB)}`);
    E.footF.setAttribute('d', `M${pt([fF[0] - 8, fF[1] + 2])} l30 0`);
    E.footB.setAttribute('d', `M${pt([fB[0] - 8, fB[1] + 2])} l28 0`);
    E.torso.setAttribute('d', `M${pt(hip)} L${pt(sh)}`);
    E.head.setAttribute('cx', headC[0].toFixed(1)); E.head.setAttribute('cy', headC[1].toFixed(1));
    // Arms: hands on the bar behind the neck (elbows down) / running swing with bent elbows
    const barPos = [sh[0] - Math.cos(lean) * 26, sh[1] + Math.sin(lean) * 4 - 2];
    const lowElbow = (S, T) => { const a = ik(S, T, L.uarm, L.farm, 1), b2 = ik(S, T, L.uarm, L.farm, -1); return a[1] > b2[1] ? a : b2; };
    const swingArm = (o) => { const th = .75 * Math.sin(ph + o); const e = [sh[0] + Math.sin(th) * L.uarm, sh[1] + Math.cos(th) * L.uarm];
      const fa = th + 1.45; return [e, [e[0] + Math.sin(fa) * L.farm, e[1] + Math.cos(fa) * L.farm]]; };
    const [rEF, rHF] = swingArm(Math.PI), [rEB, rHB] = swingArm(0);
    const hFl = [barPos[0] + 8, barPos[1] + 4], hBl = [barPos[0] - 4, barPos[1] + 4];
    const eFl = lowElbow(sh, hFl), eBl = lowElbow(sh, hBl);
    const mix = (a, b) => [lerp(a[0], b[0], runW), lerp(a[1], b[1], runW)];
    E.armF.setAttribute('d', `M${pt(sh)} L${pt(mix([eFl[0] + 6, eFl[1]], rEF))} L${pt(mix(hFl, rHF))}`);
    E.armB.setAttribute('d', `M${pt(sh)} L${pt(mix([eBl[0] - 6, eBl[1]], rEB))} L${pt(mix(hBl, rHB))}`);
    E.lanes.setAttribute('transform', `translate(${-(((ph / (2 * Math.PI)) * 240) % 70) * runW} 0)`);
    // Barbell: on the back, then racked up and away
    const rackT = sm(span(p, .52, .59));
    const bar = [lerp(barPos[0], 352, rackT), lerp(barPos[1], 372, rackT)];
    E.plate.setAttribute('cx', bar[0]); E.plate.setAttribute('cy', bar[1]); E.hub.setAttribute('cx', bar[0]); E.hub.setAttribute('cy', bar[1]);
    E.barLine.setAttribute('d', `M${bar[0] - 34} ${bar[1]} H${bar[0] + 34}`);
    E.bar.style.opacity = 1 - span(p, .6, .66);
    E.rack.style.opacity = .9 * (1 - span(p, .6, .66));
    // Track lines slide while running
    // Counters + heatmap
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
