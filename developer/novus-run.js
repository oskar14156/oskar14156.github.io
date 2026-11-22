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
  // data saver or a slow connection: a lighter encode (about a third of the size), same frames
  const NC = navigator.connection || {}, LITE = NC.saveData || /(^|-)2g|3g/.test(NC.effectiveType || '') ? '-lite' : '';
  // the flight video carries the route and the runner baked into every frame (tools/bake/bake.mjs on the build volume):
  // map and route are one picture, so they cannot drift apart; the canvas only draws the route over the overview still
  const VID = 'k', BAKED = true;
  const VAR = 'h', ORI = () => (innerWidth / innerHeight < 1 ? 'port' : 'land');
  let ori = ORI(), videoReady = false;
  const stage = sec.querySelector('.nr-stage'), geo = sec.querySelector('.nr-geo'), still = sec.querySelector('.nr-end');
  let ends = null;
  // Chrome and Android: the map frame is drawn into the same canvas as the route, so the two can never drift a frame apart
  // (the browser composites a <video> on its own path). iPhone Safari keeps the video element: it never hands over seeks of a paused video reliably
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const LOCK = !/[?&]nolock/.test(location.search) && !IOS && !!(window.HTMLVideoElement && 'requestVideoFrameCallback' in HTMLVideoElement.prototype);
  const WC = LOCK && !!(window.ScrubWC && window.ScrubWC.ok) && typeof VideoDecoder === 'function' && typeof EncodedVideoChunk === 'function' && !/[?&]nowc/.test(location.search);
  const attr = sec.querySelector('.nr-ge-attr') || document.createElement('span'), ge = sec.querySelector('.nr-ge'), cv = sec.querySelector('.nr-ge-ov'), dotEl = sec.querySelector('.nr-ge-dot');
  let videoOk = !!ge;
  // a decode error (the phone freed the decoder) reloads the same file once, then streams it from the network, and only then gives up
  let errs = 0;
  if (ge) ge.addEventListener('error', () => { if (!ge.getAttribute('src') && !ge.src) return; errs++;
    if (errs <= 2 && loaded) { const s = errs === 1 ? ge.src : `/developer/media/novus-flight-${VID}-${loaded}${LITE}.mp4?v=1`; setTimeout(() => { ge.src = s; ge.load(); }, 300); return; }
    videoOk = false; ge.style.display = 'none'; });

  let data = null, flight = null, ready = false, progress = 0, shown = 0, geT = 0;
  let cols = null, rx = null, total = 0;
  const hrEl = sec.querySelector('.nr-hr svg'), hrLine = hrEl && hrEl.querySelector('.nr-hr-line'), hrArea = hrEl && hrEl.querySelector('.nr-hr-area'), hrDot = hrEl && hrEl.querySelector('.nr-hr-dot');
  let hrPts = [], hrClip = null, hrN = -1, txtAt = 0, cvClear = false; const cssV = [-1, -1, -1];
  const buildHR = () => { const P = data.pts, n = P.length - 1;
    const hs = P.map((q) => q[4]).filter(Boolean).sort((x, y) => x - y); BP = QS.map((q) => hs[Math.min(hs.length - 1, Math.round(q * (hs.length - 1)))]);
    for (let i = 1; i < BP.length; i++) if (BP[i] <= BP[i - 1]) BP[i] = BP[i - 1] + 1;
    const g = sec.querySelector('#nrHrLine'); if (g) g.innerHTML = BP.map((b, i) => `<stop offset="${clamp((b - 120) / 80).toFixed(3)}" stop-color="${RAMP[i]}"/>`).join('');
    const lg = sec.querySelector('.nr-legend'); if (lg) { lg.querySelector('i').style.background = `linear-gradient(90deg, ${RAMP.join(', ')})`; lg.querySelector('.nr-lo').textContent = BP[0]; lg.querySelector('.nr-hi').textContent = BP[BP.length - 1] + ' bpm'; }
    hrPts = P.map((q, k) => `${(k / n * 600).toFixed(1)} ${(110 - clamp(((q[4] || data.avgHR) - 120) / 80) * 100).toFixed(1)}`);
    // the whole curve is built once and uncovered by a clip: rebuilding a 3,000-point path every frame cost a parse, layout and repaint
    if (hrEl) { const all = hrPts.join(' L'); hrLine.setAttribute('d', 'M' + all); hrArea.setAttribute('d', `M${hrPts[0]} L${all} L600 120 L0 120Z`);
      if (!hrClip) { const box = document.createElement('div'), win = document.createElement('div'), inner = document.createElement('div'), pin = document.createElement('i');
        box.className = 'nr-hr-box'; win.className = 'nr-hr-win'; inner.className = 'nr-hr-in'; pin.className = 'nr-hr-pin';
        hrEl.parentNode.insertBefore(box, hrEl); box.appendChild(win); win.appendChild(inner); inner.appendChild(hrEl); box.appendChild(pin); hrDot.style.display = 'none';
        hrClip = { box, win, inner, pin, w: 0, h: 0 }; }
      hrN = -1; } };
  // position along the run by distance
  const at = (m) => {
    const P = data.pts; m = clamp(m, 0, P[P.length - 1][2]);
    let lo = 0, hi = P.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (P[mid][2] <= m) lo = mid; else hi = mid; }
    const a = P[lo], b = P[hi], u = b[2] > a[2] ? (m - a[2]) / (b[2] - a[2]) : 0;
    return { i: lo, u, secs: lerp(a[3], b[3], u), hr: a[4], pace: a[5] };
  };

  // scroll → flight frame: [drop-in], street flight, climb; then the last frame stays while the rest of the run is drawn
  // the drop-in gets about a fifth of the scroll (its fast descent first, the tilt into the chase slowly), the chase itself a bit less
  const P0 = .03, PF1 = .44, PDRAW = .55, PR1 = .64, PEND = .84;
  const PF0 = () => (flight.intro ? .21 : P0);
  const dropIn = (u) => u * .3 + .7 * (1 - (1 - u) * (1 - u));
  const lastF = () => flight.intro + flight.follow;
  function frameAt(p) {
    const fi = flight.intro, ff = lastF();
    if (p < PF0()) return fi ? lerp(0, fi, dropIn(span(p, P0, PF0()))) : 0;
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
    W = stage.clientWidth; H = stage.clientHeight; if (hrClip) { hrClip.w = 0; hrN = -1; } S = Math.max(W / flight.w, H / flight.h); GW = flight.w * S; GH = flight.h * S;
    geo.style.width = GW + 'px'; geo.style.height = GH + 'px';
    dpr = Math.min(devicePixelRatio || 1, W < 800 ? 1.5 : 2); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);   // phones: 1.5x is already finer than the 720 px video under it
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
    let fi = flight.n, rise = 1, m = metresAt(p), vox = 0, voy = 0;
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
      geo.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px)`; vox = ox; voy = oy;
      if (BAKED && videoReady) { if (!cvClear) { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); cvClear = true; } dotEl.style.opacity = 0; still.style.opacity = 0; return m; }
      for (let i = 0; i < R.length; i++) { const q = proj(K, flight.w, flight.h, flight.fov, R[i]); Q[i] = q && [ox + q[0] * S, oy + q[1] * S]; }
      rise = span(fi, lastF() - 30, lastF() + 150); still.style.opacity = 0;
    } else {
      // the overview: zoom out from the video's last frame to the full-screen still
      const k = easeIO(span(p, PR1, PR1 + .07)), sc = lerp(hand.k, 1, k), tx = lerp(hand.tx, 0, k), ty = lerp(hand.ty, 0, k);
      const ex = tx + (W - EW) / 2 * sc + endOff.x * k, ey = ty + (H - EH) / 2 * sc + endOff.y * k, f = ES * sc;
      still.style.transform = `translate(${ex.toFixed(1)}px, ${ey.toFixed(1)}px) scale(${f.toFixed(5)})`; still.style.opacity = 1;
      for (let i = 0; i < R.length; i++) { const q = proj(endCam, E.w, E.h, E.fov, R[i]); Q[i] = q && [ex + q[0] * f, ey + q[1] * f]; }
    }
    // no decoded frame for a moment (mid-seek): keep the last picture, map and route together, rather than clear to the bare video below
    cvClear = false; const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (wc && !end && fcT >= 0 && !glm) { const vf = wc.frame(); if (vf) g.drawImage(vf, vox, voy, GW, GH); }   // no WebGL: the map goes into the route canvas
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
    if (qa) dotEl.style.transform = `translate3d(${lerp(qa[0], qb[0], t).toFixed(1)}px, ${lerp(qa[1], qb[1], t).toFixed(1)}px, 0)`;   // a transform: no layout pass per frame
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

  const setText = (el, v) => { v = String(v); if (el._t !== v) { el._t = v; el.textContent = v; } };   // an unchanged text is not rewritten (that cost a style and layout pass per frame)
  function frame() {
    if (!ready) return;
    const p = shown, fi = frameAt(p), end = p >= PR1;
    loadPill(p);
    if (ge && videoOk && !videoReady) { geT = 0; geo.style.opacity = p >= PR1 ? 0 : 1; }   // still loading: the poster (first frame) stands in
    else if (ge && videoOk) {
      const vt = Math.min((Math.floor(fi) + .5) / flight.fps, (ge.duration || flight.n / flight.fps) - 1 / 240);
      if (wc) { if (!end) { wc.want(Math.floor(fi)); const k = wc.take(); if (k >= 0) { const m2 = glMap(); fcT = (k + .5) / flight.fps; if (m2) { m2.put(wc.frame()); if (ge.style.visibility !== 'hidden') ge.style.visibility = 'hidden'; } } } }
      else if (ge.readyState >= 1) { if (end) { halt(); seek(Math.max(0, (ge.duration || 0) - 1 / 240)); } else if (LOCK) drive(vt); else seek(vt); }
      geo.style.opacity = end ? 0 : 1;
      if (wc || fc) geT = fcT >= 0 ? fcT : vt;   // route and runner follow the frame on the map canvas exactly
      else if (!rvfc || ge.readyState < 2) geT = vt;
    } else { geT = fi / flight.fps; geo.style.opacity = 0; }
    const m = draw(p), r = at(m);
    attr.style.opacity = geo.style.opacity;   // the crop can cut the logo baked into the render, so the page shows its own
    const nowT = performance.now(); if (nowT - txtAt > 30 || shown === progress) { txtAt = nowT;   // unreadable faster anyway; each change costs a layout pass
      setText(out.km, (m / 1000).toFixed(2)); setText(out.time, hms(r.secs)); setText(out.pace, r.pace ? mmss(r.pace) : '–'); setText(out.hr, r.hr || '–'); }
    // section-wide variables restyle the whole subtree: written only when they change
    const vd = span(p, .86, .93), vo = span(p, .58, .66), vi = span(p, .005, .03);
    if (vd !== cssV[0]) { cssV[0] = vd; sec.style.setProperty('--done', vd); } if (vo !== cssV[1]) { cssV[1] = vo; sec.style.setProperty('--ov', vo); } if (vi !== cssV[2]) { cssV[2] = vi; sec.style.setProperty('--in', vi); }
    if (hrEl && hrClip) { const n = Math.max(1, Math.round(r.i)); if (n !== hrN && hrPts[n]) { hrN = n; const [hx, hy] = hrPts[n].split(' ').map(Number);
      if (!hrClip.w) { hrClip.w = hrClip.box.clientWidth; hrClip.h = hrEl.clientHeight; }
      const x = hx / 600 * hrClip.w + 2, y = hy / 120 * hrClip.h;
      hrClip.win.style.transform = `translate3d(${(x - hrClip.w).toFixed(1)}px,0,0)`; hrClip.inner.style.transform = `translate3d(${(hrClip.w - x).toFixed(1)}px,0,0)`;
      hrClip.pin.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; } }
  }
  // the overlay follows the frame the video is actually showing, so line and streets never drift apart while seeking
  const rvfc = !!(window.HTMLVideoElement && 'requestVideoFrameCallback' in HTMLVideoElement.prototype);
  // Chrome/Android scrolling forward: play the video at a rate that catches up with the scroll instead of seeking frame by
  // frame (a seek per frame left the map standing still mid-scroll); the frame callback pauses it on the target.
  // Backwards or a long jump: one seek. Rates stay within what a phone decoder keeps up with.
  let drvT = -1;
  const halt = () => { drvT = -1; if (ge && !ge.paused) ge.pause(); };
  const drive = (t) => {
    drvT = t; if (ge.seeking) return;
    const d = t - ge.currentTime, fr = 1 / flight.fps;
    if (Math.abs(d) <= 1.5 * fr) { if (!ge.paused) ge.pause(); return; }
    if (d > 0 && d < 2.5) { ge.playbackRate = clamp(d / .12, .25, 6); if (ge.paused) { const pp = ge.play(); if (pp && pp.catch) pp.catch(() => seek(t)); } return; }
    if (!ge.paused) ge.pause(); seek(t);
  };
  if (ge && LOCK) ge.addEventListener('seeked', () => { if (drvT >= 0 && seekTo === null) drive(drvT); });   // the scroll moved on during the seek
  // Chrome/Android: the map is a canvas inside the video's own box, at the video's size, holding the last frame the video
  // presented (copied once, 1:1, in the frame callback). Route and map are painted in the same task, so they never drift;
  // the element itself reports no frame mid-seek, the canvas keeps the last one. Until the first frame lands the video shows.
  const fc = LOCK && !WC && geo ? document.createElement('canvas') : null; let fcT = -1;
  // WebCodecs frames go into a WebGL texture (no 2D raster pass, which held Chrome to half rate); the canvas sits in the video's box
  let glm = null;
  const glMap = () => { if (glm !== null) return glm; glm = false;
    const c = document.createElement('canvas'); c.className = 'nr-map'; c.setAttribute('aria-hidden', 'true');
    const m = window.ScrubWC && window.ScrubWC.glCanvas(c); if (m) { geo.appendChild(c); glm = m; } return glm; };
  if (fc) { fc.className = 'nr-map'; fc.setAttribute('aria-hidden', 'true'); geo.appendChild(fc); }
  const grab = (t) => { if (!fc || !ge.videoWidth) return; if (fc.width !== ge.videoWidth) { fc.width = ge.videoWidth; fc.height = ge.videoHeight; }
    try { fc.getContext("2d").drawImage(ge, 0, 0); fcT = t; } catch (e) {} };
  // Chrome: the frame callback copies the map image and asks for one route paint in this same refresh (not one more per video frame)
  if (ge && rvfc) { const cb = (now, md) => { if (videoReady) { if (LOCK) { grab(md.mediaTime); if (!ge.paused && (drvT < 0 || md.mediaTime >= drvT - .75 / flight.fps)) ge.pause(); } geT = LOCK && fcT >= 0 ? fcT : md.mediaTime; if (ready && shown < PR1) { if (LOCK) schedule(); else draw(shown); } } ge.requestVideoFrameCallback(cb); }; ge.requestVideoFrameCallback(cb); }

  // the scroll position is followed with a little inertia, so fast scrolling still reads as a flight
  let queued = false;
  const tick = () => { queued = false; const dlt = progress - shown; shown = Math.abs(dlt) < 1e-4 ? progress : shown + dlt * .12; frame(); if (shown !== progress) schedule(); };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  // loading: the flight video is fetched in full (with progress) well before the section, so scrubbing never waits on the network
  const pill = document.createElement('div'); pill.className = 'nr-load'; pill.setAttribute('aria-hidden', 'true'); pill.innerHTML = '<i></i><span>Loading flight</span>';
  stage.appendChild(pill);
  let loadPct = 0;
  const loadPill = (p) => { const behind = wc && loadPct < 1 && Math.floor(frameAt(p)) > wc.loadedTo(); pill.style.opacity = ((!videoReady || behind) && videoOk && p < PR1) ? 1 : 0; pill.querySelector('i').style.transform = `scaleX(${loadPct.toFixed(3)})`; };
  let loaded = null, gen = 0;

  // ---------- WebCodecs map (Chrome, Android) ----------
  // The flight is decoded here frame by frame on the hardware decoder (about 200 frames/s on a Pixel 7) and drawn straight
  // onto the map canvas; route and map are painted in the same animation frame, so they are locked by construction.
  // A <video> element could not do both: seeking it per frame stalled, and copying frames out of it cost ~10 ms each.
  // The frame table comes from the MP4 itself (stsz/stco/stsc/stss/stts/ctts), so the same files serve every path.
  let wc = null;
  const { mp4Index, makeWC } = window.ScrubWC || {};

  // Chrome/Android: the download feeds the player directly. The frame table sits at the front of the file, so the flight
  // plays from the first megabytes on and follows the download; only the not-yet-arrived part waits (with the progress pill)
  async function streamWC(url, g) {
    const viaVideo = (why) => { window.__nrFell = String(why && (why.stack || why.message) || why || 'decoder'); if (g !== gen) return; if (wc) { wc.close(); wc = null; } fcT = -1; videoReady = false; ge.style.visibility = '';
      fetchVideo(url, g).then((src) => { if (g !== gen || !src) return; ge.src = src; ge.load();
        ge.addEventListener('loadeddata', () => { if (g === gen) { videoReady = true; if (ready) frame(); } }, { once: true }); }); };
    try {
      const res = await fetch(url), len = +res.headers.get('content-length') || 0;
      if (!res.ok || !res.body || !len) throw new Error('stream');
      const buf = new Uint8Array(len), rd = res.body.getReader(); let got = 0, checked = 0;
      const moovIn = () => { for (let o = 0; o + 8 <= got;) { const size = ((buf[o] << 24) >>> 0) + (buf[o + 1] << 16) + (buf[o + 2] << 8) + buf[o + 3];
        const t = String.fromCharCode(buf[o + 4], buf[o + 5], buf[o + 6], buf[o + 7]); if (t === 'moov') return o + size <= got; if (size < 8) return false; o += size; } return false; };
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        if (g !== gen) { rd.cancel().catch(() => {}); return; }
        buf.set(value, got); got += value.length; loadPct = got / len;
        if (!wc && !checked && moovIn()) { checked = 1;
          const ix = mp4Index(buf);
          const ok = await VideoDecoder.isConfigSupported({ codec: ix.codec, description: ix.desc }).then((r) => r.supported, () => false);
          if (g !== gen) return; if (!ok) { rd.cancel().catch(() => {}); return viaVideo(); }
          wc = makeWC(buf, () => schedule(), viaVideo, () => got); videoReady = true; }
        if (ready) { loadPill(shown); schedule(); }
      }
      loadPct = 1; if (!wc) throw new Error('no index'); if (ready) { loadPill(shown); schedule(); }
    } catch (e) { viaVideo(e); }
  }

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
    videoReady = false; loadPct = 0; ready = false; fcT = -1; if (wc) { wc.close(); wc = null; } if (ge) ge.style.visibility = '';
    if (ge && WC) { ge.poster = `/developer/media/novus-flight-${VID}-${o}-poster.jpg?v=1`; streamWC(`/developer/media/novus-flight-${VID}-${o}${LITE}.mp4?v=1`, g); }
    else if (ge) {
      ge.poster = `/developer/media/novus-flight-${VID}-${o}-poster.jpg?v=1`;
      fetchVideo(`/developer/media/novus-flight-${VID}-${o}${LITE}.mp4?v=1`, g).then((src) => {
        if (g !== gen || !src) return;
        if (WC && src.startsWith('blob:')) {
          const viaVideo = () => { if (g !== gen) return; if (wc) { wc.close(); wc = null; } fcT = -1; videoReady = false; ge.style.visibility = '';
            ge.src = src; ge.load(); ge.addEventListener('loadeddata', () => { if (g === gen) { videoReady = true; if (ready) frame(); } }, { once: true }); };
          fetch(src).then((r) => r.arrayBuffer()).then(async (ab) => { if (g !== gen) return;
            const buf = new Uint8Array(ab), ix = mp4Index(buf);
            const ok = await VideoDecoder.isConfigSupported({ codec: ix.codec, description: ix.desc }).then((r) => r.supported, () => false);
            if (!ok || g !== gen) return ok ? null : viaVideo();
            if (wc) wc.close(); wc = makeWC(buf, () => schedule(), viaVideo); videoReady = true; if (ready) frame(); })
            .catch(viaVideo);   // no WebCodecs after all (or an unreadable file): the video path
          return;
        }
        const prev = ge.src; ge.src = src; ge.load(); if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        ge.addEventListener('loadeddata', () => { if (g === gen) { videoReady = true; if (ready) frame(); } }, { once: true });
      });
    }
    Promise.all([data ? data : fetch('/developer/data/novus-run.json').then((r) => r.json()), fetch(`/developer/data/novus-flight-${VAR}-${o}.json?v=3`).then((r) => r.json()), ends ? ends : fetch(`/developer/data/novus-end-c.json?v=2`).then((r) => r.json())])
      .then(([d, f, e]) => {
        if (g !== gen) return;
        data = d; flight = f; ends = e; total = d.pts[d.pts.length - 1][2];
        buildHR(); cols = flight.route.map((q) => hrColor(Math.round((at(q[3]).hr || data.avgHR) / 3) * 3));   // 3 bpm steps: neighbours share a colour, so the line goes out in long strokes, not thousands
        rx = runnerTrack(); layout(); ready = true; frame();
      }).catch(() => { sec.classList.add('nr-offline'); });
  };
  const onResize = (fn) => { let w = innerWidth, t = 0; const touch = matchMedia('(pointer: coarse)').matches; addEventListener('resize', () => { clearTimeout(t); if (!touch || innerWidth !== w) { w = innerWidth; fn(); } else t = setTimeout(fn, 250); }, { passive: true }); };   // phones: the address bar sliding in and out only changes the height; apply that once it has settled, not mid-scroll
  onResize(() => { if (ORI() !== ori) { ori = ORI(); if (loaded) load(ori); return; } if (ready) { layout(); frame(); } });
  // start early: as soon as the work section comes up (the run is a few screens further down), or near the run itself
  const early = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { load(); early.disconnect(); } }, { rootMargin: '100% 0px' });
  [document.getElementById('work'), sec].forEach((el) => el && early.observe(el));
  if (reduce) { progress = shown = .8; }
  else {
    ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { progress = st.progress; schedule(); } });
  }
  ScrollTrigger.create({ trigger: sec, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'nr-active' } });
  window.novusRun = { wc: () => wc && wc.dbg(), preload: () => load(), state: () => ({ ready, videoReady, loadPct, ori, p: progress, shown, variant: VAR, geT, target: ready && shown < PR1 ? (Math.floor(frameAt(shown)) + .5) / flight.fps : -1, ct: ge ? ge.currentTime : 0, seeking: ge ? ge.seeking : false, rs: ge ? ge.readyState : 0 }) };
})();
