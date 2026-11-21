/* Novus: a real 29.8 km run through Vienna. A Google Earth Studio flight (pre-rendered, scrubbed by scroll at 60 fps)
 * follows the runner for the first 5.2 km, climbs until the whole run is in frame, and that last frame becomes the
 * overview the rest of the run is drawn onto. The route is drawn on a canvas with the camera of every rendered frame,
 * coloured by heart rate; where buildings hide the street it turns into a faint dotted line.
 * Data: developer/data/novus-run.json (600 samples of [lon, lat, metres, moving seconds, bpm, pace s/km]) and
 * developer/data/novus-flight-<variant>.json (per-frame camera, street-snapped route, per-frame occlusion). */
(function () {
  const sec = document.getElementById('novus-run');
  if (!sec || !window.ScrollTrigger) return;
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
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  // colour by heart rate: a vivid ramp, its breakpoints set at the run's own bpm quantiles so every hue is used
  const RAMP = ['#4c7dff', '#22c7e8', '#3fe08a', '#c8f169', '#ffd23f', '#ff7a3d', '#ff2e63'], QS = [0, .08, .2, .38, .58, .8, 1];
  let BP = [120, 150, 160, 170, 178, 186, 195];
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const hrColor = (b) => { let i = 0; while (i < BP.length - 2 && b > BP[i + 1]) i++;
    const u = clamp((b - BP[i]) / (BP[i + 1] - BP[i])), A = hex(RAMP[i]), B = hex(RAMP[i + 1]);
    return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * u)).join(',')})`; };

  // one flight per screen shape: a landscape render for wide screens, a portrait render for phones (no cropping, small files)
  const VAR = 'h', ORI = () => (innerWidth / innerHeight < 1 ? 'port' : 'land');
  let ori = ORI(), videoReady = false;
  const stage = sec.querySelector('.nr-stage'), geo = sec.querySelector('.nr-geo'), still = sec.querySelector('.nr-end');
  let ends = null;
  const attr = sec.querySelector('.nr-ge-attr') || document.createElement('span'), ge = sec.querySelector('.nr-ge'), cv = sec.querySelector('.nr-ge-ov'), dotEl = sec.querySelector('.nr-ge-dot');
  let videoOk = !!ge;
  // a decode error (the phone freed the decoder) reloads the same file once, then streams it from the network, and only then gives up
  let errs = 0;
  if (ge) ge.addEventListener('error', () => { if (!ge.getAttribute('src') && !ge.src) return; errs++;
    if (errs <= 2 && loaded) { const s = errs === 1 ? ge.src : `/developer/media/novus-flight-${VAR}-${loaded}.mp4?v=3`; setTimeout(() => { ge.src = s; ge.load(); }, 300); return; }
    videoOk = false; ge.style.display = 'none'; });

  let data = null, flight = null, ready = false, progress = 0, shown = 0, geT = 0;
  let cols = null, rx = null, total = 0;
  const hrEl = sec.querySelector('.nr-hr svg'), hrLine = hrEl && hrEl.querySelector('.nr-hr-line'), hrArea = hrEl && hrEl.querySelector('.nr-hr-area'), hrDot = hrEl && hrEl.querySelector('.nr-hr-dot');
  let hrPts = [];
  const buildHR = () => { const P = data.pts, n = P.length - 1;
    const hs = P.map((q) => q[4]).filter(Boolean).sort((x, y) => x - y); BP = QS.map((q) => hs[Math.min(hs.length - 1, Math.round(q * (hs.length - 1)))]);
    for (let i = 1; i < BP.length; i++) if (BP[i] <= BP[i - 1]) BP[i] = BP[i - 1] + 1;
    const g = sec.querySelector('#nrHrLine'); if (g) g.innerHTML = BP.map((b, i) => `<stop offset="${clamp((b - 120) / 80).toFixed(3)}" stop-color="${RAMP[i]}"/>`).join('');
    const lg = sec.querySelector('.nr-legend'); if (lg) { lg.querySelector('i').style.background = `linear-gradient(90deg, ${RAMP.join(', ')})`; lg.querySelector('.nr-lo').textContent = BP[0]; lg.querySelector('.nr-hi').textContent = BP[BP.length - 1] + ' bpm'; }
    hrPts = P.map((q, k) => `${(k / n * 600).toFixed(1)} ${(110 - clamp(((q[4] || data.avgHR) - 120) / 80) * 100).toFixed(1)}`); };
  // position along the run by distance
  const at = (m) => {
    const P = data.pts; m = clamp(m, 0, P[P.length - 1][2]);
    let lo = 0, hi = P.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (P[mid][2] <= m) lo = mid; else hi = mid; }
    const a = P[lo], b = P[hi], u = b[2] > a[2] ? (m - a[2]) / (b[2] - a[2]) : 0;
    return { i: lo, u, secs: lerp(a[3], b[3], u), hr: a[4], pace: a[5] };
  };

  // scroll → flight frame: [drop-in], street flight, climb; then the last frame stays while the rest of the run is drawn
  const P0 = .03, PF1 = .46, PDRAW = .55, PR1 = .64, PEND = .84;
  const PF0 = () => (flight.intro ? .11 : P0);
  const lastF = () => flight.intro + flight.follow;
  function frameAt(p) {
    const fi = flight.intro, ff = lastF();
    if (p < PF0()) return fi ? lerp(0, fi, span(p, P0, PF0())) : 0;
    if (p < PF1) return lerp(fi, ff, span(p, PF0(), PF1));
    return lerp(ff, flight.n, span(p, PF1, PR1));
  }
  const runAt = (f) => { const R = flight.run, a = Math.floor(clamp(f, 0, R.length - 1)), b = Math.min(R.length - 1, a + 1); return lerp(R[a], R[b], f - a); };
  function metresAt(p) {
    const f = frameAt(p);
    if (f <= lastF()) return runAt(f);
    // the runner waits at the end of the street flight until the climb has the city in view, then the rest is drawn in
    return lerp(flight.run[flight.run.length - 1], total, Math.pow(span(p, PDRAW, PEND), 1.35));
  }

  // where the runner sits across the 16:9 frame, smoothed over ±0.5 s, so narrow screens can slide their crop with him
  function runnerTrack() {
    const foc = flight.h / 2 / Math.tan(flight.fov / 2 * Math.PI / 180), R = flight.route;
    const raw = flight.cam.map((c, f) => {
      const m = runAt(Math.min(f, lastF())); let i = 0; while (i < R.length - 1 && R[i + 1][3] <= m) i++;
      const fw = unit(c.slice(3, 6)), rt = unit(cross3(fw, c.slice(6, 9))), d = sub(R[i], c.slice(0, 3)), z = dot3(d, fw);
      return z > 3 ? flight.w / 2 + dot3(d, rt) / z * foc : flight.w / 2; });
    const k = 60; return { raw, smooth: raw.map((_, f) => { let a = 0, w = 0; for (let j = -k; j <= k; j++) { const g = Math.exp(-j * j / 1250), v = raw[clamp(f + j, 0, raw.length - 1)]; a += v * g; w += g; } return a / w; }) };
  }

  // camera projection: [x, y] in that camera's own image pixels, or null behind it
  const camOf = (c) => { const fw = unit(c.slice(3, 6)), rt = unit(cross3(fw, c.slice(6, 9))); return { C: c.slice(0, 3), fw, rt, up: cross3(rt, fw) }; };
  const proj = (K, w, h, fov, P) => { const d = sub(P, K.C), z = dot3(d, K.fw); if (z < 3) return null;
    const foc = h / 2 / Math.tan(fov / 2 * Math.PI / 180); return [w / 2 + dot3(d, K.rt) / z * foc, h / 2 - dot3(d, K.up) / z * foc]; };

  // layout: the flight video covers the stage; the overview still (landscape or portrait) covers it too.
  // At the hand-over the still is laid exactly over the video's last frame, then it zooms out to fill the screen.
  let W = 0, H = 0, S = 1, GW = 0, GH = 0, dpr = 1, E = null, ES = 1, EW = 0, EH = 0, hand = null, endCam = null, lastCam = null, endOff = { x: 0, y: 0 };
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight; S = Math.max(W / flight.w, H / flight.h); GW = flight.w * S; GH = flight.h * S;
    geo.style.width = GW + 'px'; geo.style.height = GH + 'px';
    dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    E = ori === 'port' ? ends.port : ends.land; endCam = camOf(E.cam); lastCam = camOf(flight.cam[flight.n]);
    if (still.dataset.src !== E.src) { still.dataset.src = E.src; still.src = E.src; if (still.decode) still.decode().catch(() => {}); }   // decoded ahead, so it never shows black at the hand-over
    ES = Math.max(W / E.w, H / E.h); EW = E.w * ES; EH = E.h * ES;
    still.style.width = E.w + 'px'; still.style.height = E.h + 'px';
    // similarity that puts the still on top of the video's last frame (both look straight down, north up)
    const R = flight.route, A = R[0], B = R.reduce((m, q) => (Math.hypot(q[0] - A[0], q[1] - A[1]) > Math.hypot(m[0] - A[0], m[1] - A[1]) ? q : m), A);
    const vx = (P) => { const q = proj(lastCam, flight.w, flight.h, flight.fov, P); return [(W - GW) / 2 + q[0] * S, (H - GH) / 2 + q[1] * S]; };
    const sx = (P) => { const q = proj(endCam, E.w, E.h, E.fov, P); return [(W - EW) / 2 + q[0] * ES, (H - EH) / 2 + q[1] * ES]; };
    const vA = vx(A), vB = vx(B), sA = sx(A), sB = sx(B), k = Math.hypot(vB[0] - vA[0], vB[1] - vA[1]) / Math.hypot(sB[0] - sA[0], sB[1] - sA[1]);
    hand = { k, tx: vA[0] - sA[0] * k, ty: vA[1] - sA[1] * k };
    // screens narrower or taller than the still crop it: slide it within that slack so the whole run stays in view
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const P of R) { const q = sx(P); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    const M = Math.min(W, H) * .04, fit = (lo, hi, size, slack) => clamp(lo < M ? M - lo : hi > size - M ? Math.max(size - M - hi, M - lo) : 0, slack, -slack);
    endOff = { x: fit(x0, x1, W, (W - EW) / 2), y: fit(y0, y1, H, (H - EH) / 2) };
  }

  function draw(p) {
    const end = p >= PR1, R = flight.route, Q = new Array(R.length);
    let fi = flight.n, rise = 1, m = metresAt(p);
    if (!end) {
      // street flight / climb: the video, its crop following the runner on narrow screens.
      // Camera and runner both come from the frame on screen, so the dot never slides against a still picture
      fi = videoReady ? clamp(Math.floor(geT * flight.fps + .25), 0, flight.n) : clamp(geT * flight.fps, 0, flight.n);
      if (videoReady && fi <= lastF()) m = runAt(fi);
      const F = flight.cam, a = Math.floor(fi), b = Math.min(flight.n, a + 1), u = fi - a;
      const K = camOf(F[a].map((v, j) => v + (F[b][j] - v) * u));
      const fol = 1 - span(fi, lastF(), lastF() + 200), fr = Math.round(fi), rr = rx.raw[fr] * S;
      const follow = clamp(clamp(W / 2 - rx.smooth[fr] * S, W * .15 - rr, W * .85 - rr), W - GW, 0);
      const ox = lerp((W - GW) / 2, follow, fol), oy = (H - GH) / 2;
      geo.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px)`;
      for (let i = 0; i < R.length; i++) { const q = proj(K, flight.w, flight.h, flight.fov, R[i]); Q[i] = q && [ox + q[0] * S, oy + q[1] * S]; }
      rise = span(fi, lastF() - 30, lastF() + 150); still.style.opacity = 0;
    } else {
      // the overview: zoom out from the video's last frame to the full-screen still
      const k = easeIO(span(p, PR1, PR1 + .07)), sc = lerp(hand.k, 1, k), tx = lerp(hand.tx, 0, k), ty = lerp(hand.ty, 0, k);
      const ex = tx + (W - EW) / 2 * sc + endOff.x * k, ey = ty + (H - EH) / 2 * sc + endOff.y * k, f = ES * sc;
      still.style.transform = `translate(${ex.toFixed(1)}px, ${ey.toFixed(1)}px) scale(${f.toFixed(5)})`; still.style.opacity = 1;
      for (let i = 0; i < R.length; i++) { const q = proj(endCam, E.w, E.h, E.fov, R[i]); Q[i] = q && [ex + q[0] * f, ey + q[1] * f]; }
    }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    g.lineCap = g.lineJoin = 'round';
    if (rise > 0) { g.beginPath(); let pen = false;
      for (let i = 0; i < R.length; i++) { const q = Q[i]; if (!q) { pen = false; continue; } if (pen) g.lineTo(q[0], q[1]); else { g.moveTo(q[0], q[1]); pen = true; } }
      g.strokeStyle = `rgba(255,255,255,${.45 * rise})`; g.lineWidth = 2.2; g.stroke(); }
    let n = 0; while (n < R.length - 1 && R[n + 1][3] <= m) n++;
    const hid = new Uint8Array(n + 1);
    if (!end) for (const [i0, i1] of flight.occ[Math.round(fi)] || []) for (let i = i0; i <= Math.min(i1, n); i++) hid[i] = 1;
    // hidden behind buildings: a faint dotted line
    g.setLineDash([1.5, 7]); g.lineWidth = 3; g.globalAlpha = .7;
    for (let i = 0; i < n; i++) { if (!(hid[i] || hid[i + 1]) || !Q[i] || !Q[i + 1]) continue;
      g.beginPath(); g.moveTo(Q[i][0], Q[i][1]); g.lineTo(Q[i + 1][0], Q[i + 1][1]); g.strokeStyle = cols[i]; g.stroke(); }
    g.setLineDash([]);
    // in the open: a dark casing, then the line coloured by heart rate
    const wid = lerp(6.5, 3.4, rise);
    for (const [w, alpha, casing] of [[wid + 4.5, .55, true], [wid, 1, false]]) {
      g.lineWidth = w; g.globalAlpha = alpha;
      for (let i = 0; i < n; i++) { if (hid[i] || hid[i + 1] || !Q[i] || !Q[i + 1]) continue;
        g.beginPath(); g.moveTo(Q[i][0], Q[i][1]); let j = i + 1;
        while (j < n && Q[j + 1] && !hid[j + 1] && (casing || cols[j] === cols[i])) { g.lineTo(Q[j][0], Q[j][1]); j++; }
        g.lineTo(Q[j][0], Q[j][1]); g.strokeStyle = casing ? '#08100c' : cols[i]; g.stroke(); i = j - 1; }
    }
    g.globalAlpha = 1;
    // the runner, between the last two samples
    const A = R[n], B = R[Math.min(R.length - 1, n + 1)], t = B[3] > A[3] ? clamp((m - A[3]) / (B[3] - A[3])) : 0;
    const qa = Q[n], qb = Q[Math.min(R.length - 1, n + 1)] || qa;
    if (qa) { dotEl.style.left = lerp(qa[0], qb[0], t) + 'px'; dotEl.style.top = lerp(qa[1], qb[1], t) + 'px'; }
    dotEl.style.opacity = qa ? span(p, .02, .04) * (1 - span(p, .8, .86)) * (hid[n] ? .45 : 1) : 0;   // dimmed while a building hides him
    return m;
  }

  // seeking: never queue a new seek while one is running (that is what made the video freeze when scrolling back);
  // remember the latest target and jump there as soon as the current seek lands
  // a seek that never lands (the phone parked the decoder while the page sat idle) is retried after 700 ms instead of blocking forever
  let seekTo = null, seekAt = 0, retry = 0;
  const seek = (t) => { const now = performance.now();
    if (ge.seeking && now - seekAt < 700) { seekTo = t; if (!retry) retry = setTimeout(() => { retry = 0; if (seekTo !== null) { const q = seekTo; seekTo = null; seek(q); } }, 720); return; }
    if (ge.seeking || Math.abs(ge.currentTime - t) > 1 / 240) { seekAt = now; seekTo = null; try { ge.currentTime = t; } catch (e) {} } };
  if (ge) ge.addEventListener('seeked', () => { if (seekTo !== null) { const t = seekTo; seekTo = null; seek(t); } });
  // back from the background or the app switcher: reload a video the browser dropped, then show the current frame again
  const wake = () => { if (document.hidden || !ge || !videoOk) return; seekTo = null; seekAt = 0;
    if (ge.error || (ge.src && ge.readyState === 0)) { const s = ge.src; ge.src = s; ge.load(); }
    if (ready) frame(); };
  document.addEventListener('visibilitychange', wake); addEventListener('pageshow', wake);

  function frame() {
    if (!ready) return;
    const p = shown, fi = frameAt(p), end = p >= PR1;
    loadPill(p);
    if (ge && videoOk && !videoReady) { geT = 0; geo.style.opacity = p >= PR1 ? 0 : 1; }   // still loading: the poster (first frame) stands in
    else if (ge && videoOk) {
      const vt = Math.min((Math.floor(fi) + .5) / flight.fps, (ge.duration || flight.n / flight.fps) - 1 / 240);
      if (ge.readyState >= 1) seek(end ? Math.max(0, (ge.duration || 0) - 1 / 240) : vt);
      geo.style.opacity = end ? 0 : 1;
      if (!rvfc || ge.readyState < 2) geT = vt;
    } else { geT = fi / flight.fps; geo.style.opacity = 0; }
    const m = draw(p), r = at(m);
    attr.style.opacity = geo.style.opacity;   // the crop can cut the logo baked into the render, so the page shows its own
    out.km.textContent = (m / 1000).toFixed(2); out.time.textContent = hms(r.secs);
    out.pace.textContent = r.pace ? mmss(r.pace) : '–'; out.hr.textContent = r.hr || '–';
    sec.style.setProperty('--done', span(p, .86, .93));
    sec.style.setProperty('--ov', span(p, .58, .66));
    sec.style.setProperty('--in', span(p, .005, .03));
    if (hrEl) { const n = Math.max(1, Math.round(r.i)), D = hrPts.slice(0, n + 1).join(' L');
      hrLine.setAttribute('d', 'M' + D); hrArea.setAttribute('d', `M${hrPts[0]} L${D} L${hrPts[n].split(' ')[0]} 120 L0 120Z`);
      hrDot.setAttribute('cx', hrPts[n].split(' ')[0]); hrDot.setAttribute('cy', hrPts[n].split(' ')[1]); }
  }
  // the overlay follows the frame the video is actually showing, so line and streets never drift apart while seeking
  const rvfc = !!(window.HTMLVideoElement && 'requestVideoFrameCallback' in HTMLVideoElement.prototype);
  if (ge && rvfc) { const cb = (now, md) => { if (videoReady) { geT = md.mediaTime; if (ready && shown < PR1) draw(shown); } ge.requestVideoFrameCallback(cb); }; ge.requestVideoFrameCallback(cb); }

  // the scroll position is followed with a little inertia, so fast scrolling still reads as a flight
  let queued = false;
  const tick = () => { queued = false; const dlt = progress - shown; shown = Math.abs(dlt) < 1e-4 ? progress : shown + dlt * .12; frame(); if (shown !== progress) schedule(); };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  // loading: the flight video is fetched in full (with progress) well before the section, so scrubbing never waits on the network
  const pill = document.createElement('div'); pill.className = 'nr-load'; pill.setAttribute('aria-hidden', 'true'); pill.innerHTML = '<i></i><span>Loading flight</span>';
  stage.appendChild(pill);
  let loadPct = 0;
  const loadPill = (p) => { pill.style.opacity = (!videoReady && videoOk && p < PR1) ? 1 : 0; pill.querySelector('i').style.transform = `scaleX(${loadPct.toFixed(3)})`; };
  let loaded = null, gen = 0;
  async function fetchVideo(url, g) {
    try {
      const res = await fetch(url); if (!res.ok || !res.body) throw new Error('http');
      const len = +res.headers.get('content-length') || 0, rd = res.body.getReader(), parts = []; let got = 0;
      for (;;) { const { done, value } = await rd.read(); if (done) break; if (g !== gen) return; parts.push(value); got += value.length; if (len) { loadPct = got / len; if (ready) loadPill(shown); } }
      return URL.createObjectURL(new Blob(parts, { type: 'video/mp4' }));
    } catch (e) { return url; }                                   // fall back to streaming the file directly
  }
  const load = (o = ori) => {
    if (loaded === o) return; loaded = o; const g = ++gen;
    videoReady = false; loadPct = 0; ready = false;
    if (ge) {
      ge.poster = `/developer/media/novus-flight-${VAR}-${o}-poster.jpg?v=3`;
      fetchVideo(`/developer/media/novus-flight-${VAR}-${o}.mp4?v=3`, g).then((src) => {
        if (g !== gen || !src) return;
        const prev = ge.src; ge.src = src; ge.load(); if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        ge.addEventListener('loadeddata', () => { if (g === gen) { videoReady = true; if (ready) frame(); } }, { once: true });
      });
    }
    Promise.all([data ? data : fetch('/developer/data/novus-run.json').then((r) => r.json()), fetch(`/developer/data/novus-flight-${VAR}-${o}.json?v=3`).then((r) => r.json()), ends ? ends : fetch(`/developer/data/novus-end-c.json?v=2`).then((r) => r.json())])
      .then(([d, f, e]) => {
        if (g !== gen) return;
        data = d; flight = f; ends = e; total = d.pts[d.pts.length - 1][2];
        buildHR(); cols = flight.route.map((q) => hrColor(at(q[3]).hr || data.avgHR));
        rx = runnerTrack(); layout(); ready = true; frame();
      }).catch(() => { sec.classList.add('nr-offline'); });
  };
  addEventListener('resize', () => { if (ORI() !== ori) { ori = ORI(); if (loaded) load(ori); return; } if (ready) { layout(); frame(); } });
  // start early: as soon as the work section comes up (the run is a few screens further down), or near the run itself
  const early = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { load(); early.disconnect(); } }, { rootMargin: '100% 0px' });
  [document.getElementById('work'), sec].forEach((el) => el && early.observe(el));
  if (reduce) { progress = shown = .8; }
  else {
    ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { progress = st.progress; schedule(); } });
  }
  ScrollTrigger.create({ trigger: sec, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'nr-active' } });
  window.novusRun = { state: () => ({ ready, videoReady, loadPct, ori, p: progress, shown, variant: VAR, geT, target: ready && shown < PR1 ? (Math.floor(frameAt(shown)) + .5) / flight.fps : -1, ct: ge ? ge.currentTime : 0, seeking: ge ? ge.seeking : false, rs: ge ? ge.readyState : 0 }) };
})();
