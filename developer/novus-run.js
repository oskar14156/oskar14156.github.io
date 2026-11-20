/* Novus: a real 29.8 km run through Vienna, replayed on a 3D map. The camera flies behind the
 * runner for the first kilometres, then pulls up and out until the whole route is in view,
 * coloured by pace. Data: developer/data/novus-run.json (600 samples of
 * [lon, lat, metres, moving seconds, bpm, pace s/km]).
 * Map: orthophoto basemap.at (CC BY 4.0) on Mapzen/AWS terrain, rendered with MapLibre GL JS. */
(function () {
  const sec = document.getElementById('novus-run');
  if (!sec || !window.ScrollTrigger) return;
  const box = sec.querySelector('.nr-gl');
  const out = {
    km: sec.querySelector('[data-k="km"]'), time: sec.querySelector('[data-k="time"]'),
    pace: sec.querySelector('[data-k="pace"]'), hr: sec.querySelector('[data-k="hr"]'),
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const hms = (s) => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  // colour by heart rate: a vivid ramp, its breakpoints set at the run's own bpm quantiles so every hue is used
  const RAMP = ['#4c7dff', '#22c7e8', '#3fe08a', '#c8f169', '#ffd23f', '#ff7a3d', '#ff2e63'], QS = [0, .08, .2, .38, .58, .8, 1];
  let BP = [120, 150, 160, 170, 178, 186, 195];
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const hrColor = (b) => { let i = 0; while (i < BP.length - 2 && b > BP[i + 1]) i++;
    const u = clamp((b - BP[i]) / (BP[i + 1] - BP[i])), A = hex(RAMP[i]), B = hex(RAMP[i + 1]);
    return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * u)).join(',')})`; };
  let data = null, map = null, ready = false, progress = 0, marker = null, overview = null;
  const ge = sec.querySelector('.nr-ge'), geDot = sec.querySelector('.nr-ge-dot'), geCv = sec.querySelector('.nr-ge-ov'); let geOk = !!ge;
  if (ge) ge.addEventListener('error', () => { geOk = false; ge.remove(); geDot.remove(); if (geCv) geCv.remove(); });
  // camera of every rendered frame (local metres), so the route can be drawn into the video exactly where Google Earth put the streets
  let flight = null, geT = 0, geCol = null, geMatch = null, onFlight = null, geRx = null;
  // where the runner sits across the video in every frame, smoothed over ±0.5 s so the moving crop never jitters
  function runnerTrack(foc) {
    const F = flight.cam, R = flight.route, raw = F.map((c, f) => {
      const m = FOLLOW_KM * 1000 * Math.min(f, flight.follow) / flight.follow; let i = 0; while (i < R.length - 1 && R[i + 1][3] <= m) i++;
      const fw = unit(c.slice(3, 6)), rt = unit(cross3(fw, c.slice(6, 9))), d = sub(R[i], c.slice(0, 3)), z = dot3(d, fw);
      return z > 3 ? flight.w / 2 + dot3(d, rt) / z * foc : flight.w / 2; });
    const k = 60; return raw.map((_, f) => { let a = 0, w = 0; for (let j = -k; j <= k; j++) { const g = Math.exp(-j * j / (2 * 25 * 25)), v = raw[clamp(f + j, 0, raw.length - 1)]; a += v * g; w += g; } return a / w; });
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  function drawGE(mRun) {
    if (!flight || !geCv || !geOk || !data) return;
    const dpr = Math.min(devicePixelRatio || 1, 2), W = geCv.clientWidth, H = geCv.clientHeight;
    if (geCv.width !== Math.round(W * dpr) || geCv.height !== Math.round(H * dpr)) { geCv.width = Math.round(W * dpr); geCv.height = Math.round(H * dpr); }
    const g = geCv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (!geCol) geCol = flight.route.map((q) => hrColor(at(q[3]).hr || data.avgHR));
    const F = flight.cam, fi = clamp(geT * flight.fps, 0, F.length - 1), a = Math.floor(fi), b = Math.min(F.length - 1, a + 1), u = fi - a;
    const c = F[a].map((v, k) => v + (F[b][k] - v) * u), C = c.slice(0, 3), fw = unit(c.slice(3, 6)), rt = unit(cross3(fw, c.slice(6, 9))), up = cross3(rt, fw);
    const s = Math.max(W / flight.w, H / flight.h), oy = (H - flight.h * s) / 2, foc = flight.h / 2 / Math.tan(flight.fov / 2 * Math.PI / 180);
    // on narrow screens only a slice of the 16:9 flight is visible: slide the crop so the runner stays in it, back to centre on the climb
    if (!geRx) geRx = runnerTrack(foc);
    const rxF = geRx[Math.round(fi)], centre = (W - flight.w * s) / 2, fol = 1 - span(fi, flight.follow, flight.follow + 200);
    const ox = lerp(centre, clamp(W / 2 - rxF * s, W - flight.w * s, 0), fol);
    ge.style.objectPosition = `${ox.toFixed(1)}px 50%`;
    const R = flight.route, Q = new Array(R.length);
    for (let i = 0; i < R.length; i++) { const d = sub(R[i], C), z = dot3(d, fw);
      Q[i] = z < 3 ? null : [ox + (flight.w / 2 + dot3(d, rt) / z * foc) * s, oy + (flight.h / 2 - dot3(d, up) / z * foc) * s]; }
    g.lineCap = g.lineJoin = 'round';
    // in the streets only the run so far (the road ahead would cut across roofs); the whole route fades in on the climb
    const rise = span(fi, flight.follow - 30, flight.follow + 150);
    if (rise > 0) { g.beginPath(); let pen = false;
      for (let i = 0; i < R.length; i++) { const q = Q[i]; if (!q) { pen = false; continue; } if (pen) g.lineTo(q[0], q[1]); else { g.moveTo(q[0], q[1]); pen = true; } }
      g.strokeStyle = `rgba(255,255,255,${.35 * rise})`; g.lineWidth = 2.5; g.stroke(); }
    // what has been run, coloured by heart rate: a soft glow, then the line
    let n = 0; while (n < R.length - 1 && R[n + 1][3] <= mRun) n++;
    for (const [wid, alpha] of [[lerp(18, 10, rise), .35], [lerp(7, 4, rise), 1]]) {
      g.lineWidth = wid; g.globalAlpha = alpha;
      for (let i = 0; i < n; i++) { const p0 = Q[i], p1 = Q[i + 1]; if (!p0 || !p1) continue;
        g.beginPath(); g.moveTo(p0[0], p0[1]); let j = i + 1; while (j < n && Q[j + 1] && geCol[j] === geCol[i]) { g.lineTo(Q[j][0], Q[j][1]); j++; }
        g.lineTo(Q[j][0], Q[j][1]); g.strokeStyle = geCol[i]; g.stroke(); i = j - 1; }
    }
    g.globalAlpha = 1;
    // the runner, between the last two samples
    const A = R[n], B = R[Math.min(R.length - 1, n + 1)], k = B[3] > A[3] ? clamp((mRun - A[3]) / (B[3] - A[3])) : 0;
    const d = sub([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k], C), z = dot3(d, fw);
    if (z > 3) { geDot.style.left = (ox + (flight.w / 2 + dot3(d, rt) / z * foc) * s) + 'px'; geDot.style.top = (oy + (flight.h / 2 - dot3(d, up) / z * foc) * s) + 'px'; }
  }
  const hr = sec.querySelector('.nr-hr svg'), hrLine = hr && hr.querySelector('.nr-hr-line'), hrArea = hr && hr.querySelector('.nr-hr-area'), hrDot = hr && hr.querySelector('.nr-hr-dot');
  let hrPts = [];
  const buildHR = () => { const P = data.pts, n = P.length - 1;
    const hs = P.map((q) => q[4]).filter(Boolean).sort((x, y) => x - y); BP = QS.map((q) => hs[Math.min(hs.length - 1, Math.round(q * (hs.length - 1)))]);
    for (let i = 1; i < BP.length; i++) if (BP[i] <= BP[i - 1]) BP[i] = BP[i - 1] + 1;
    const g = sec.querySelector('#nrHrLine'); if (g) g.innerHTML = BP.map((b, i) => `<stop offset="${clamp((b - 120) / 80).toFixed(3)}" stop-color="${RAMP[i]}"/>`).join('');
    const lg = sec.querySelector('.nr-legend'); if (lg) { lg.querySelector('i').style.background = `linear-gradient(90deg, ${RAMP.join(', ')})`; lg.querySelector('.nr-lo').textContent = BP[0]; lg.querySelector('.nr-hi').textContent = BP[BP.length - 1] + ' bpm'; } hrPts = P.map((q, k) => `${(k / n * 600).toFixed(1)} ${(110 - clamp(((q[4] || data.avgHR) - 120) / 80) * 100).toFixed(1)}`); };
  const FOLLOW_KM = 3;                                 // the camera rides along for the first kilometres

  // position along the run by distance, smoothly interpolated
  const at = (m) => {
    const P = data.pts; m = clamp(m, 0, P[P.length - 1][2]);
    let lo = 0, hi = P.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (P[mid][2] <= m) lo = mid; else hi = mid; }
    const a = P[lo], b = P[hi], u = b[2] > a[2] ? (m - a[2]) / (b[2] - a[2]) : 0;
    return { lon: lerp(a[0], b[0], u), lat: lerp(a[1], b[1], u), i: lo, u, secs: lerp(a[3], b[3], u), hr: a[4], pace: a[5] };
  };
  const bearing = (a, b) => { const k = Math.cos(a.lat * Math.PI / 180); return Math.atan2((b.lon - a.lon) * k, b.lat - a.lat) * 180 / Math.PI; };
  const angLerp = (a, b, t) => { const d = ((b - a + 540) % 360) - 180; return a + d * t; };
  // heading over the next ~250 m, averaged so the camera does not twitch at every corner
  const heading = (m) => { let sx = 0, sy = 0; for (let k = 1; k <= 6; k++) { const a = at(m + (k - 1) * 45), b = at(m + k * 45 + 30);
    const r = bearing(a, b) * Math.PI / 180, w = 1 / k; sx += Math.sin(r) * w; sy += Math.cos(r) * w; } return Math.atan2(sx, sy) * 180 / Math.PI; };

  // slow through the streets for the first 3 km, then the rest of the run from above
  function metresAt(p) {
    const total = data.pts[data.pts.length - 1][2], m1 = FOLLOW_KM * 1000;
    if (p < .46) return lerp(0, m1, span(p, .03, .46));
    return lerp(m1, total, Math.pow(span(p, .46, .84), 1.35));
  }

  const rvfc = !!(window.HTMLVideoElement && 'requestVideoFrameCallback' in HTMLVideoElement.prototype);
  const geRun = (p) => { const f = geT * (flight ? flight.fps : 60), fl = flight ? flight.follow : 900;
    return f <= fl ? FOLLOW_KM * 1000 * f / fl : Math.max(FOLLOW_KM * 1000, metresAt(p)); };
  if (ge && rvfc) { const cb = (now, md) => { geT = md.mediaTime; if (ready && geOk && +ge.style.opacity > 0) drawGE(geRun(shown)); ge.requestVideoFrameCallback(cb); }; ge.requestVideoFrameCallback(cb); }

  function frame() {
    if (!ready) return;
    const p = shown, m = metresAt(p), r = at(m), small = innerWidth < 800;
    // camera: follow → overview
    const hd = heading(Math.min(m, FOLLOW_KM * 1000)), ahead = at(Math.min(m, FOLLOW_KM * 1000) + 70);
    const follow = { lon: ahead.lon, lat: ahead.lat, zoom: small ? 16.4 : 16.9, pitch: 58, bearing: hd };
    let o = overview, t = easeIO(span(p, .46, .64));
    if (ge && geOk && flight && geMatch) {   // the map takes over exactly where the flight video ends, then settles into the overview
      const k = easeIO(span(p, .66, .76)); t = p < .5 ? 0 : 1;
      o = { lon: lerp(geMatch.lon, overview.lon, k), lat: lerp(geMatch.lat, overview.lat, k), zoom: lerp(geMatch.zoom, overview.zoom, k), pitch: 0, bearing: 0 };
    }
    const intro = 1 - easeIO(span(p, 0, .06));       // a short swoop down onto the start
    map.jumpTo({
      center: [lerp(follow.lon, o.lon, t), lerp(follow.lat, o.lat, t)],
      zoom: lerp(follow.zoom - intro * 1.4, o.zoom, t), pitch: lerp(follow.pitch - intro * 18, o.pitch, t), bearing: angLerp(follow.bearing - intro * 30, o.bearing, t),
    });
    marker.setLngLat([r.lon, r.lat]);
    // the Google Earth flight (pre-rendered, scrubbed): streets in real 3D for the first 3 km, then the climb
    if (ge && geOk) {
      const vt = p < .46 ? lerp(0, 15, span(p, .03, .46)) : lerp(15, 21.96, span(p, .46, .64));
      if (ge.readyState >= 1 && Math.abs(ge.currentTime - vt) > 1 / 240) { try { ge.currentTime = vt; } catch (e) {} }
      if (!rvfc) geT = vt;
      const geVis = 1 - span(p, .6, .66);
      ge.style.opacity = geVis; geDot.style.opacity = (1 - span(p, .5, .58)) * span(p, .02, .04);
      if (geCv) { geCv.style.opacity = geVis; if (geVis > 0) drawGE(geRun(p)); }
      marker.getElement().style.opacity = geVis > .99 ? 0 : 1 - geVis;
    }
    // the route so far, coloured by pace
    const P = data.pts, feats = [];
    for (let k = 0; k < r.i; k++) feats.push({ type: 'Feature', properties: { c: hrColor(P[k][4] || data.avgHR) }, geometry: { type: 'LineString', coordinates: [[P[k][0], P[k][1]], [P[k + 1][0], P[k + 1][1]]] } });
    feats.push({ type: 'Feature', properties: { c: hrColor(P[r.i][4] || data.avgHR) }, geometry: { type: 'LineString', coordinates: [[P[r.i][0], P[r.i][1]], [r.lon, r.lat]] } });
    map.getSource('done').setData({ type: 'FeatureCollection', features: feats });
    out.km.textContent = (m / 1000).toFixed(2); out.time.textContent = hms(r.secs);
    out.pace.textContent = r.pace ? mmss(r.pace) : '–'; out.hr.textContent = r.hr || '–';
    sec.style.setProperty('--done', span(p, .86, .93));
    sec.style.setProperty('--ov', span(p, .58, .66));
    // heart rate trace, drawn as the run goes
    if (hr) { const n = Math.max(1, Math.round(r.i)), D = hrPts.slice(0, n + 1).join(' L');
      hrLine.setAttribute('d', 'M' + D); hrArea.setAttribute('d', `M${hrPts[0]} L${D} L${hrPts[n].split(' ')[0]} 120 L0 120Z`);
      hrDot.setAttribute('cx', hrPts[n].split(' ')[0]); hrDot.setAttribute('cy', hrPts[n].split(' ')[1]); }
  }

  function start() {
    const P = data.pts;
    map = new maplibregl.Map({
      container: box, interactive: false, attributionControl: false, fadeDuration: 0, maxPitch: 75, pixelRatio: Math.min(devicePixelRatio || 1, 2),
      center: [P[0][0], P[0][1]], zoom: 16, pitch: 60,
      style: {
        version: 8,
        sources: {
          ortho: { type: 'raster', tiles: ['https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg'], tileSize: 256, maxzoom: 19,
            attribution: 'Orthophoto: <a href="https://basemap.at" target="_blank" rel="noopener">basemap.at</a>' },
          dem: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 14,
            attribution: 'Terrain: Mapzen, AWS Terrain Tiles' },
          all: { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: P.map((q) => [q[0], q[1]]) } } },
          done: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        },
        layers: [
          { id: 'ortho', type: 'raster', source: 'ortho', paint: { 'raster-saturation': .08, 'raster-contrast': .06, 'raster-brightness-max': .96 } },
          { id: 'all', type: 'line', source: 'all', layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#ffffff', 'line-opacity': .35, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 11, 2, 17, 7] } },
          { id: 'done-glow', type: 'line', source: 'done', layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': ['get', 'c'], 'line-opacity': .45, 'line-blur': 6, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 11, 7, 17, 22] } },
          { id: 'done', type: 'line', source: 'done', layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': ['get', 'c'], 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 11, 3, 17, 9] } },
        ],
        sky: { 'sky-color': '#7fb2e5', 'horizon-color': '#e4ecf3', 'sky-horizon-blend': .55, 'horizon-fog-blend': .6, 'fog-color': '#dfe7ee', 'fog-ground-blend': .35, 'atmosphere-blend': .8 },
        terrain: { source: 'dem', exaggeration: 1.25 },
      },
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    const el = document.createElement('div'); el.className = 'nr-runner'; el.innerHTML = '<i></i>';
    marker = new maplibregl.Marker({ element: el }).setLngLat([P[0][0], P[0][1]]).addTo(map);
    map.on('load', () => {
      const lons = P.map((q) => q[0]), lats = P.map((q) => q[1]);
      const pad = innerWidth < 800 ? { top: 150, bottom: 300, left: 30, right: 30 } : { top: 110, bottom: 230, left: 60, right: Math.min(520, innerWidth * .36) };
      const cam = map.cameraForBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: pad });
      overview = { lon: cam.center.lng, lat: cam.center.lat, zoom: cam.zoom - .1, pitch: 0, bearing: 0 };
      const fitGE = () => { if (!flight) return; const c = flight.cam[flight.cam.length - 1], h = c[2] - 160, W = box.clientWidth, H = box.clientHeight;
        const s = Math.max(W / flight.w, H / flight.h), mpp = 2 * h * Math.tan(flight.fov / 2 * Math.PI / 180) / (flight.h * s);
        const lat = (Math.min(...lats) + Math.max(...lats)) / 2, lon = (Math.min(...lons) + Math.max(...lons)) / 2;
        geMatch = { lon, lat, zoom: Math.log2(40075016.686 * Math.cos(lat * Math.PI / 180) / (512 * mpp)) }; };
      fitGE(); onFlight = fitGE; addEventListener('resize', () => { fitGE(); frame(); });
      buildHR(); ready = true; frame();
      box.querySelectorAll('.maplibregl-compact-show').forEach((e) => e.classList.remove('maplibregl-compact-show'));
    });
  }

  // the scroll position is followed with a little inertia, so fast scrolling still reads as a flight
  let shown = 0, queued = false;
  const tick = () => { queued = false; const dlt = progress - shown; shown = Math.abs(dlt) < 1e-4 ? progress : shown + dlt * .085; frame(); if (shown !== progress) schedule(); };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  let loading = false;
  const load = () => {
    if (loading) return; loading = true;
    if (ge) { ge.src = ge.dataset.src.replace('{w}', innerWidth < 800 ? '960' : '1600'); ge.load();
      fetch('/developer/data/novus-flight.json?v=1').then((r) => r.json()).then((d) => { flight = d; if (onFlight) onFlight(); if (ready) frame(); }).catch(() => {}); }
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
    Promise.all([fetch('/developer/data/novus-run.json').then((r) => r.json()), new Promise((res, rej) => { s.onload = res; s.onerror = rej; document.head.appendChild(s); })])
      .then(([d]) => { data = d; start(); }).catch(() => { sec.classList.add('nr-offline'); });
  };
  new IntersectionObserver((es, io) => { if (es.some((e) => e.isIntersecting)) { load(); io.disconnect(); } }, { rootMargin: '150% 0px' }).observe(sec);
  if (reduce) { progress = .8; return; }
  ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { progress = st.progress; schedule(); } });
  ScrollTrigger.create({ trigger: sec, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'nr-active' } });
  window.novusRun = { state: () => ({ ready, p: progress }) };
})();
