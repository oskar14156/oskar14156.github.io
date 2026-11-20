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
        <path d="M250 ${GROUND} V330 M650 ${GROUND} V330 M250 380 h40 M650 380 h-40"/>
      </g>
      <g class="ng-body" filter="url(#ngGlow)" stroke="${LIME}" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path class="ng-leg-b" stroke-width="30" stroke="#6f8a3c"/>
        <path class="ng-arm-b" stroke-width="19" stroke="#6f8a3c"/>
        <path class="ng-torso" stroke-width="40"/>
        <circle class="ng-head" r="23" fill="${LIME}" stroke="none"/>
        <path class="ng-leg-f" stroke-width="32"/>
        <path class="ng-foot-f" stroke-width="16"/>
        <path class="ng-foot-b" stroke-width="14" stroke="#6f8a3c"/>
        <path class="ng-arm-f" stroke-width="21"/>
        <g class="ng-bar"><path class="ng-bar-line" stroke-width="7"/><rect class="ng-plate" width="26" height="118" rx="6" fill="${LIME}" stroke="none"/></g>
      </g>
    </svg>
    <div class="ng-head-copy"><p class="ng-meta">Novus · training log</p><h2 class="ng-title">Every set counted, every week on the map.</h2></div>
    <div class="ng-card">
      <p class="ng-meta ng-ex">Back squat · set 3 of 3</p>
      <div class="ng-reps"><span class="ng-rep">0</span><small>/ 5 reps</small></div>
      <dl class="ng-stats"><div><dt>Weight</dt><dd>100 kg</dd></div><div><dt>Volume today</dt><dd><span class="ng-vol">1,000</span> kg</dd></div></dl>
      <p class="ng-meta ng-hm-label">15 weeks of training</p>
      <div class="ng-heat">${Array.from({ length: 105 }, () => '<i></i>').join('')}</div>
    </div>
  </div>`;

  const q = (s) => host.querySelector(s);
  const E = { legF: q('.ng-leg-f'), legB: q('.ng-leg-b'), footF: q('.ng-foot-f'), footB: q('.ng-foot-b'), armF: q('.ng-arm-f'), armB: q('.ng-arm-b'), torso: q('.ng-torso'),
    head: q('.ng-head'), bar: q('.ng-bar'), barLine: q('.ng-bar-line'), plate: q('.ng-plate'), lanes: q('.ng-lanes'), rack: q('.ng-rack') };
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
    const cx = 450;
    // Phase weights
    const squatW = 1 - sm(span(p, .6, .68));            // 1 while lifting, 0 when running
    const runW = sm(span(p, .62, .7));
    // Squat depth: five reps between .1 and .56
    const repPhase = span(p, .1, .56) * 5;
    const k = Math.floor(Math.min(repPhase, 4.999)), f = repPhase - k;
    const depth = p < .1 || p > .56 ? 0 : Math.sin(Math.PI * sm(f));      // 0 standing, 1 at the bottom
    // Running: phase advances with scroll (and a little with time so it never freezes)
    const ph = (p * 26 + time * .0) * Math.PI * 2;
    // Hip and torso
    let hip = [cx, GROUND - 174 + depth * 92], torsoLean = depth * .62;          // radians, forward
    const runHip = [cx, GROUND - 178 + Math.abs(Math.sin(ph)) * -10 + 6], runLean = .22;
    hip = [lerp(hip[0], runHip[0], runW), lerp(hip[1], runHip[1], runW)]; torsoLean = lerp(torsoLean, runLean, runW);
    const sh = [hip[0] + Math.sin(torsoLean) * L.torso, hip[1] - Math.cos(torsoLean) * L.torso];
    const headC = [sh[0] + Math.sin(torsoLean * .7) * 50 + 8 * squatW, sh[1] - Math.cos(torsoLean * .7) * 50];
    // Feet: planted for the squat, cycling for the run
    const plantF = [cx + 30, GROUND - 8], plantB = [cx - 22, GROUND - 8];
    const runFoot = (o) => { const a = ph + o; const x = Math.cos(a) * 92; const lift = Math.max(0, Math.sin(a)); return [hip[0] + x + 14, GROUND - 8 - lift * 70 - (Math.sin(a) < 0 ? 0 : 0)]; };
    const fF = [lerp(plantF[0], runFoot(0)[0], runW), lerp(plantF[1], runFoot(0)[1], runW)];
    const fB = [lerp(plantB[0], runFoot(Math.PI)[0], runW), lerp(plantB[1], runFoot(Math.PI)[1], runW)];
    const kneeF = ik(hip, fF, L.thigh, L.shin, -1), kneeB = ik(hip, fB, L.thigh, L.shin, -1);
    E.legF.setAttribute('d', `M${pt(hip)} L${pt(kneeF)} L${pt(fF)}`);
    E.legB.setAttribute('d', `M${pt([hip[0] - 4, hip[1]])} L${pt(kneeB)} L${pt(fB)}`);
    E.footF.setAttribute('d', `M${pt([fF[0] - 6, fF[1] + 2])} l30 0`);
    E.footB.setAttribute('d', `M${pt([fB[0] - 6, fB[1] + 2])} l28 0`);
    E.torso.setAttribute('d', `M${pt(hip)} L${pt(sh)}`);
    E.head.setAttribute('cx', headC[0].toFixed(1)); E.head.setAttribute('cy', headC[1].toFixed(1));
    // Hands: on the bar (behind the neck) while lifting, swinging while running
    const barPos = [sh[0] - 6, sh[1] - 6];
    const handLift = [barPos[0] + 30, barPos[1] + 2], handLiftB = [barPos[0] - 30, barPos[1] + 2];
    const swing = (o) => { const a = ph + o; return [sh[0] + Math.cos(a) * 46 + 16, sh[1] + 88 - Math.abs(Math.sin(a)) * 30]; };
    const hF = [lerp(handLift[0], swing(Math.PI)[0], runW), lerp(handLift[1], swing(Math.PI)[1], runW)];
    const hB = [lerp(handLiftB[0], swing(0)[0], runW), lerp(handLiftB[1], swing(0)[1], runW)];
    const eF = ik(sh, hF, L.uarm, L.farm, 1), eB = ik(sh, hB, L.uarm, L.farm, 1);
    E.armF.setAttribute('d', `M${pt(sh)} L${pt(eF)} L${pt(hF)}`);
    E.armB.setAttribute('d', `M${pt(sh)} L${pt(eB)} L${pt(hB)}`);
    // Barbell: on the back, then racked up and away
    const rackT = sm(span(p, .58, .64));
    const bar = [lerp(barPos[0], cx, rackT), lerp(barPos[1], 380, rackT)];
    E.barLine.setAttribute('d', `M${bar[0] - 210} ${bar[1]} H${bar[0] + 210}`);
    E.plate.setAttribute('x', bar[0] - 13); E.plate.setAttribute('y', bar[1] - 59);
    E.bar.style.opacity = 1 - span(p, .64, .7);
    E.rack.style.opacity = .9 * (1 - span(p, .64, .7));
    // Track lines slide while running
    E.lanes.setAttribute('transform', `translate(${-((p * 26 * 140) % 70) * runW} 0)`);
    // Counters + heatmap
    const reps = p < .1 ? 0 : Math.min(5, Math.floor(span(p, .1, .56) * 5 + .5 * (depth < .02 ? 1 : 0) + (f > .5 ? .5 : 0)));
    rep.textContent = reps;
    vol.textContent = (1000 + reps * 100).toLocaleString('en-US');
    ex.textContent = p < .6 ? 'Back squat · set 3 of 3' : 'Then the run: 29.8 km';
    const fill = Math.floor(span(p, .05, .6) * cells.length);
    cells.forEach((c, i) => { c.dataset.l = i < fill ? levels[i] : 0; });
    host.style.setProperty('--ng-p', p);
  }

  let progress = 0;
  gsap.ticker.add((time) => frame(progress, time));
  if (reduce) { progress = .4; return; }
  ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { progress = st.progress; } });
  ScrollTrigger.create({ trigger: host, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'ng-active' } });
})();
