/* Voyage: the recap's plane over a real route. Close on Vienna, zoom out on the way to
 * Beijing, one lap, then a dive into a phone that opens on the real recap video.
 * One scrubbed progress value (0..1) drives everything; the map is drawn on a canvas. */
(function () {
  const sec = document.getElementById('voyage');
  if (!sec || !window.d3 || !window.topojson || !window.gsap) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = sec.querySelector('.vy-map');
  const ctx = canvas.getContext('2d');
  const plane = sec.querySelector('.vy-plane');
  const phone = sec.querySelector('.vy-phone');
  const screen = sec.querySelector('.vy-screen');
  const video = screen.querySelector('video');
  const dim = sec.querySelector('.vy-dim');
  const [cap1, cap2, cap3] = ['.vy-cap-1', '.vy-cap-2', '.vy-cap-3'].map((s) => sec.querySelector(s));

  const VIE = [16.37, 48.21], BJS = [116.40, 39.90];
  const leg = d3.geoInterpolate(VIE, BJS);
  // The rest of the real trip, drawn faintly once the camera is out.
  const TRIP = [
    ['train', [[116.40, 39.90], [108.94, 34.34], [106.55, 29.56]]],
    ['car', [[106.55, 29.56], [110.29, 25.27], [110.49, 24.78]]],
    ['flight', [[113.26, 23.13], [135.50, 34.69]]],
    ['train', [[135.50, 34.69], [135.77, 35.01], [136.91, 35.18], [139.69, 35.69]]],
    ['car', [[136.91, 35.18], [136.91, 36.26], [136.62, 36.56]]],
    ['flight', [[139.69, 35.69], [141.35, 43.06]]],
    ['flight', [[141.35, 43.06], [16.37, 48.21]]],
  ];
  const COLORS = { flight: '#39d0f5', train: '#ef4b4b', car: '#f2b02c' };
  const NEAR = [['Prague', [14.42, 50.08]], ['Budapest', [19.04, 47.5]], ['Munich', [11.58, 48.14]], ['Zagreb', [15.98, 45.81]], ['Warsaw', [21.01, 52.23]], ['Kyiv', [30.52, 50.45]], ['Moscow', [37.62, 55.76]], ['Astana', [71.45, 51.17]], ['Ulaanbaatar', [106.91, 47.89]]];
  const CITIES = [['Vienna', VIE], ['Beijing', BJS], ["Xi'an", [108.94, 34.34]], ['Chongqing', [106.55, 29.56]], ['Osaka', [135.5, 34.69]], ['Tokyo', [139.69, 35.69]], ['Sapporo', [141.35, 43.06]]];

  let land50 = null, land110 = null, borders = null, W = 0, H = 0, dpr = 1, progress = 0, playedFrom = false;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => t * t * (3 - 2 * t);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const span = (p, a, b) => clamp((p - a) / (b - a));

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Camera: a Mercator scale from "a few hundred km across" to "all of Eurasia".
  function camera(p) {
    const z = ease(span(p, 0.03, 0.5));
    const t = ease(span(p, 0.02, 0.5));
    const kClose = W / (2 * Math.PI * 24 / 360), kFar = Math.min(W / (2 * Math.PI * 150 / 360), H / 1.5);
    const k = kClose * Math.pow(kFar / kClose, z) * (1 + 0.05 * span(p, 0.5, 1));
    const here = leg(t);
    const wide = [86, 38];
    const center = d3.geoInterpolate(here, wide)(Math.pow(z, 1.6));
    return { proj: d3.geoMercator().scale(k).center(center).translate([W / 2, H / 2]).precision(0.3), t, z, k };
  }

  function draw(p) {
    if (!W) return;
    const { proj, t, z, k } = camera(p);
    const path = d3.geoPath(proj, ctx);
    // Ocean
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d2430'); g.addColorStop(1, '#0a1820');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Graticule
    ctx.beginPath(); path(d3.geoGraticule10()); ctx.strokeStyle = 'rgba(160, 220, 240, .06)'; ctx.lineWidth = 1; ctx.stroke();
    // Land
    const land = (k > 1400 && land50) ? land50 : (land110 || land50);
    if (land) {
      ctx.beginPath(); path(land);
      const lg = ctx.createLinearGradient(0, 0, W, H);
      lg.addColorStop(0, '#2d4a37'); lg.addColorStop(1, '#22392c');
      ctx.fillStyle = lg; ctx.fill();
      ctx.strokeStyle = 'rgba(190, 230, 200, .22)'; ctx.lineWidth = 1; ctx.stroke();
    }
    if (borders) { ctx.beginPath(); path(borders); ctx.strokeStyle = 'rgba(210, 235, 215, .16)'; ctx.lineWidth = 0.8; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); }
    // The rest of the trip, faint until the camera is out
    const tripAlpha = 0.85 * span(z, 0.55, 1);
    if (tripAlpha > 0) {
      ctx.save(); ctx.globalAlpha = tripAlpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [kind, pts] of TRIP) {
        ctx.beginPath(); path({ type: 'LineString', coordinates: pts });
        ctx.strokeStyle = COLORS[kind]; ctx.lineWidth = kind === 'flight' ? 2 : 3; ctx.setLineDash(kind === 'flight' ? [] : []); ctx.stroke();
      }
      ctx.restore();
    }
    // Planned leg, dashed
    ctx.save(); ctx.setLineDash([6, 8]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(57, 208, 245, .35)';
    ctx.beginPath(); path({ type: 'LineString', coordinates: [leg(t), BJS] }); ctx.stroke(); ctx.restore();
    // Flown trail with a glow
    const pts = d3.range(0, 41).map((i) => leg(t * i / 40));
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(57, 208, 245, .8)'; ctx.shadowBlur = 14;
    ctx.beginPath(); path({ type: 'LineString', coordinates: pts }); ctx.strokeStyle = '#39d0f5'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
    // Places passed on the way, faint
    ctx.font = '400 11px "Geist Mono", ui-monospace, monospace';
    for (const [name, ll] of NEAR) {
      const [x, y] = proj(ll);
      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
      ctx.globalAlpha = 0.55 * (1 - span(z, 0.55, 0.85));
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#cfe6d6'; ctx.fill();
      ctx.fillStyle = '#cfe6d6'; ctx.fillText(name.toUpperCase(), x + 8, y + 4);
    }
    ctx.globalAlpha = 1;
    // Cities
    ctx.font = '500 12px "Geist Mono", ui-monospace, monospace';
    for (const [name, ll] of CITIES) {
      const big = name === 'Vienna' || name === 'Beijing';
      const a = big ? 1 : span(z, 0.6, 1);
      if (a <= 0) continue;
      const [x, y] = proj(ll);
      if (x < -50 || x > W + 50 || y < -50 || y > H + 50) continue;
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, big ? 5 : 3.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#0a1820'; ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, .85)'; ctx.fillText(name.toUpperCase(), x + 10, y - 8);
      ctx.globalAlpha = 1;
    }
    return proj;
  }

  // Screen-space flight after Beijing: one lap, then a dive into the phone's centre.
  function lapPath(P0, dir) {
    const R = Math.min(W, H) * 0.17;
    const nx = -dir[1], ny = dir[0];                      // left of the heading
    const O = [P0[0] + nx * R, P0[1] + ny * R];
    const phi0 = Math.atan2(P0[1] - O[1], P0[0] - O[0]);
    // Turn so that the tangent at the start matches the heading
    const tan = [-Math.sin(phi0), Math.cos(phi0)];
    const sign = tan[0] * dir[0] + tan[1] * dir[1] >= 0 ? 1 : -1;
    const C = [W / 2, H / 2];
    const D = Math.hypot(C[0] - P0[0], C[1] - P0[1]);
    const c1 = [P0[0] + dir[0] * D * 0.7, P0[1] + dir[1] * D * 0.7];
    const c2 = [C[0], C[1] - H * 0.42];
    return (s) => {
      if (s < 0.55) {
        const phi = phi0 + sign * 2 * Math.PI * ease(s / 0.55);
        return [O[0] + R * Math.cos(phi), O[1] + R * Math.sin(phi)];
      }
      const u = easeOut((s - 0.55) / 0.45), v = 1 - u;
      return [v * v * v * P0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * C[0],
        v * v * v * P0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * C[1]];
    };
  }

  let lap = null, lapKey = '';
  function render(p) {
    const proj = draw(p);
    if (!proj) return;
    // Plane
    let pos, ang, scale = 1, alpha = 1;
    if (p <= 0.5) {
      const t = ease(span(p, 0.02, 0.5));
      pos = proj(leg(t));
      const ahead = proj(leg(Math.min(1, t + 0.004)));
      const back = proj(leg(Math.max(0, t - 0.004)));
      ang = Math.atan2(ahead[1] - back[1], ahead[0] - back[0]);
      scale = 1.25 - 0.25 * ease(span(p, 0.03, 0.5));
    } else {
      const end = camera(0.5).proj;
      const P0 = end(BJS), A = end(leg(0.996));
      const d = [P0[0] - A[0], P0[1] - A[1]], n = Math.hypot(d[0], d[1]) || 1;
      const key = W + 'x' + H;
      if (key !== lapKey) { lap = lapPath(P0, [d[0] / n, d[1] / n]); lapKey = key; }
      const s = span(p, 0.5, 0.8);
      pos = lap(s);
      // Contrail behind the plane during the lap
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        const a = lap(Math.max(0, s - i * 0.007)), b = lap(Math.max(0, s - (i + 1) * 0.007));
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * (1 - i / 26) * (1 - span(s, 0.85, 1))})`; ctx.lineWidth = 3 * (1 - i / 30); ctx.stroke();
      }
      ctx.restore();
      const nxt = lap(Math.min(1, s + 0.004)), prv = lap(Math.max(0, s - 0.004));
      ang = Math.atan2(nxt[1] - prv[1], nxt[0] - prv[0]);
      scale = 1 - 0.7 * ease(span(s, 0.6, 1));
      alpha = 1 - span(s, 0.9, 1);
    }
    plane.style.transform = `translate(${pos[0]}px, ${pos[1]}px) rotate(${ang + Math.PI / 2}rad) scale(${scale})`;
    plane.style.opacity = alpha;

    // Phone appears during the lap; the screen opens as the plane arrives
    const ph = easeOut(span(p, 0.6, 0.76));
    phone.style.opacity = ph;
    phone.style.transform = `translate(-50%, calc(-50% + ${(1 - ph) * 60}px)) scale(${0.84 + 0.16 * ph})`;
    const open = ease(span(p, 0.77, 0.88));
    video.style.clipPath = `circle(${open * 75}% at 50% 50%)`;
    if (open > 0 && !playedFrom) { playedFrom = true; try { video.currentTime = 0; } catch (e) {} }
    if (open === 0) playedFrom = false;
    dim.style.opacity = 0.85 * ease(span(p, 0.6, 0.85));

    cap1.style.opacity = 1 - span(p, 0.14, 0.22);
    cap1.style.transform = `translateY(${-30 * span(p, 0.14, 0.22)}px)`;
    const c2 = span(p, 0.28, 0.36) * (1 - span(p, 0.52, 0.6));
    cap2.style.opacity = c2; cap2.style.transform = `translateY(${(1 - span(p, 0.28, 0.36)) * 30}px)`;
    cap3.style.opacity = span(p, 0.86, 0.94); cap3.style.transform = `translateY(${(1 - span(p, 0.86, 0.94)) * 30}px)`;
  }

  let queued = false;
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; render(progress); }); } };

  size();
  window.addEventListener('resize', () => { size(); lapKey = ''; schedule(); });
  Promise.all(['/developer/data/land-110m.json', '/developer/data/land-50m.json', '/developer/data/countries-110m.json'].map((u) => fetch(u).then((r) => r.json())))
    .then(([a, b, c]) => { land110 = topojson.feature(a, a.objects.land); land50 = topojson.feature(b, b.objects.land);
      borders = topojson.mesh(c, c.objects.countries, (x, y) => x !== y); schedule(); })
    .catch(() => {});

  if (reduce) { progress = 0.95; schedule(); return; }
  ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { progress = st.progress; schedule(); } });
  schedule();
  window.voyageRender = (p) => { progress = p; render(p); };
})();
