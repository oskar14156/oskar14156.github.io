/* Novus: a real 29.8 km run replayed on scroll. The route draws itself coloured by pace,
 * counters tick up, the heart-rate trace follows. Data: developer/data/novus-run.json
 * (600 samples of [lon, lat, metres, moving seconds, bpm, pace s/km]). */
(function () {
  const sec = document.getElementById('novus-run');
  if (!sec || !window.ScrollTrigger) return;
  const canvas = sec.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const out = {
    km: sec.querySelector('[data-k="km"]'), time: sec.querySelector('[data-k="time"]'),
    pace: sec.querySelector('[data-k="pace"]'), hr: sec.querySelector('[data-k="hr"]'),
  };
  let data = null, W = 0, H = 0, dpr = 1, progress = 0, xy = [];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const hms = (s) => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  // Pace colour: fast lime -> steady yellow -> slow coral
  const paceColor = (p) => {
    const t = clamp((p - 330) / (520 - 330));
    const stops = [[200, 241, 105], [255, 210, 63], [255, 112, 82]];
    const i = t < .5 ? 0 : 1, u = t < .5 ? t * 2 : (t - .5) * 2;
    const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * u));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!data) return;
    const wide = W > 900;
    const box = wide ? { x: W * 0.06, y: H * 0.16, w: W * 0.54, h: H * 0.7 } : { x: W * 0.08, y: H * 0.14, w: W * 0.84, h: H * 0.46 };
    const lons = data.pts.map((p) => p[0]), lats = data.pts.map((p) => p[1]);
    const lat0 = (Math.min(...lats) + Math.max(...lats)) / 2, kx = Math.cos(lat0 * Math.PI / 180);
    const minX = Math.min(...lons) * kx, maxX = Math.max(...lons) * kx, minY = Math.min(...lats), maxY = Math.max(...lats);
    const s = Math.min(box.w / (maxX - minX), box.h / (maxY - minY));
    const ox = box.x + (box.w - (maxX - minX) * s) / 2, oy = box.y + (box.h - (maxY - minY) * s) / 2;
    xy = data.pts.map((p) => [ox + (p[0] * kx - minX) * s, oy + (maxY - p[1]) * s]);
    data.metresPerPx = (111320 / s);
  }

  function draw() {
    if (!data || !W) return;
    const p = span(progress, 0.06, 0.86);
    const n = data.pts.length - 1;
    const f = p * n, i = Math.floor(f), u = f - i;
    ctx.clearRect(0, 0, W, H);
    // Faint grid
    ctx.strokeStyle = 'rgba(200, 241, 105, .05)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); }
    // Whole route, faint
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); xy.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = 'rgba(255, 255, 255, .1)'; ctx.lineWidth = 5; ctx.stroke();
    // Run so far, coloured by pace
    ctx.lineWidth = 5;
    for (let k = 0; k < Math.min(i, n); k++) {
      ctx.beginPath(); ctx.moveTo(xy[k][0], xy[k][1]); ctx.lineTo(xy[k + 1][0], xy[k + 1][1]);
      ctx.strokeStyle = paceColor(data.pts[k][5] || 400); ctx.stroke();
    }
    const a = xy[Math.min(i, n)], b = xy[Math.min(i + 1, n)];
    const hx = a[0] + (b[0] - a[0]) * u, hy = a[1] + (b[1] - a[1]) * u;
    if (i < n) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(hx, hy); ctx.strokeStyle = paceColor(data.pts[i][5] || 400); ctx.stroke(); }
    // Start flag and runner dot
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(xy[0][0], xy[0][1], 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = '500 11px "Geist Mono", ui-monospace, monospace'; ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText('START', xy[0][0] + 10, xy[0][1] + 4);
    if (p > 0) {
      ctx.save(); ctx.shadowColor = 'rgba(200, 241, 105, .9)'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fillStyle = '#c8f169'; ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#0c120e'; ctx.fill();
    }
    // Scale bar: 1 km
    const kmPx = 1000 / data.metresPerPx;
    const sx = W > 900 ? W * 0.06 : W * 0.08, sy = W > 900 ? H - 46 : H * 0.64;
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, sy - 5); ctx.lineTo(sx, sy); ctx.lineTo(sx + kmPx, sy); ctx.lineTo(sx + kmPx, sy - 5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText('1 KM', sx + kmPx + 8, sy + 4);
    // Heart-rate trace along the bottom right
    const wide = W > 900;
    const g = wide ? { x: W * 0.64, y: H * 0.7, w: W * 0.3, h: H * 0.13 } : { x: W * 0.08, y: H * 0.86, w: W * 0.84, h: H * 0.07 };
    ctx.beginPath();
    for (let k = 0; k <= Math.min(i, n); k++) {
      const v = data.pts[k][4] || data.avgHR;
      const x = g.x + g.w * k / n, y = g.y + g.h * (1 - clamp((v - 120) / (200 - 120)));
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = '#ff5d73'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(g.x, g.y + g.h + .5); ctx.lineTo(g.x + g.w, g.y + g.h + .5); ctx.stroke();
    // Counters
    const k = Math.min(i, n), q = data.pts[k], q2 = data.pts[Math.min(k + 1, n)];
    const metres = q[2] + (q2[2] - q[2]) * u, secs = q[3] + (q2[3] - q[3]) * u;
    out.km.textContent = (metres / 1000).toFixed(2);
    out.time.textContent = hms(secs);
    out.pace.textContent = q[5] ? mmss(q[5]) : '–';
    out.hr.textContent = q[4] || '–';
    sec.style.setProperty('--done', span(progress, 0.86, 0.92));
  }

  let queued = false;
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; draw(); }); } };
  fetch('/developer/data/novus-run.json').then((r) => r.json()).then((d) => { data = d; layout(); schedule(); }).catch(() => {});
  layout();
  window.addEventListener('resize', () => { layout(); schedule(); });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { progress = 1; schedule(); return; }
  ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { progress = st.progress; schedule(); } });
  ScrollTrigger.create({ trigger: sec, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'nr-active' } });
})();
