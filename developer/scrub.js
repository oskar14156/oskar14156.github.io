/* Scroll-scrubbed video on WebCodecs (Chrome, Android): the MP4's frame table is read in the browser, frames are decoded on
 * the hardware decoder a keyframe group at a time, and shown through WebGL. Shared by the Novus flight and Unscroll.
 * A <video> element could not do this: seeking it per frame stalls, and copying frames out of it costs ~10 ms each on Android.
 * Files must be encoded with a short keyframe gap and no B-frames (tools/bake, tools/kzbake: -g 12 -bf 0). */
(function () {
  function mp4Index(buf) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), u32 = (o) => dv.getUint32(o);
    const find = (a, b, type) => { for (let o = a; o + 8 <= b;) { let size = u32(o), h = 8; const t = String.fromCharCode(buf[o + 4], buf[o + 5], buf[o + 6], buf[o + 7]);
      if (size === 1) { size = Number(dv.getBigUint64(o + 8)); h = 16; } else if (size === 0) size = b - o; if (size < 8) return null; if (t === type) return [o + h, o + size]; o += size; } return null; };
    const path = (types, from = [0, buf.length]) => { let r = from; for (const t of types) { r = find(r[0], r[1], t); if (!r) return null; } return r; };
    const stbl = path(['moov', 'trak', 'mdia', 'minf', 'stbl']), box = (t) => find(stbl[0], stbl[1], t);
    const st = box('stsd'), e0 = st[0] + 8, avcC = find(e0 + 8 + 78, e0 + u32(e0), 'avcC'), desc = buf.slice(avcC[0], avcC[1]);
    const sz = box('stsz'), fixed = u32(sz[0] + 4), n = u32(sz[0] + 8), size = new Uint32Array(n); for (let i = 0; i < n; i++) size[i] = fixed || u32(sz[0] + 12 + i * 4);
    let co = box('stco'), big = false; if (!co) { co = box('co64'); big = true; }
    const nc = u32(co[0] + 4), sc = box('stsc'), ns = u32(sc[0] + 4), off = new Float64Array(n);
    for (let c = 0, i = 0; c < nc && i < n; c++) { let per = 1; for (let k = 0; k < ns; k++) if (c + 1 >= u32(sc[0] + 8 + k * 12)) per = u32(sc[0] + 12 + k * 12);
      let o = big ? Number(dv.getBigUint64(co[0] + 8 + c * 8)) : u32(co[0] + 8 + c * 4); for (let k = 0; k < per && i < n; k++) { off[i] = o; o += size[i]; i++; } }
    const key = new Uint8Array(n), ss = box('stss'); if (ss) { const m = u32(ss[0] + 4); for (let k = 0; k < m; k++) key[u32(ss[0] + 8 + k * 4) - 1] = 1; } else key.fill(1);
    const tt = box('stts'), pts = new Float64Array(n); let d = 0; { const m = u32(tt[0] + 4); for (let k = 0, i = 0, t = 0; k < m; k++) { const cnt = u32(tt[0] + 8 + k * 8); d = d || u32(tt[0] + 12 + k * 8); for (let j = 0; j < cnt && i < n; j++) { pts[i++] = t; t += u32(tt[0] + 12 + k * 8); } } }
    const ct = box('ctts'); if (ct) { const v1 = buf[ct[0]] === 1, m = u32(ct[0] + 4); for (let k = 0, i = 0; k < m; k++) { const cnt = u32(ct[0] + 8 + k * 8), o = v1 ? dv.getInt32(ct[0] + 12 + k * 8) : u32(ct[0] + 12 + k * 8); for (let j = 0; j < cnt && i < n; j++) pts[i++] += o; } }
    let p0 = Infinity; for (let i = 0; i < n; i++) p0 = Math.min(p0, pts[i]);
    const frameOf = new Int32Array(n), sampleOf = new Int32Array(n); for (let i = 0; i < n; i++) { const f = Math.round((pts[i] - p0) / d); frameOf[i] = f; if (f >= 0 && f < n) sampleOf[f] = i; }
    const md = path(['moov', 'trak', 'mdia', 'mdhd']), tsc = buf[md[0]] === 1 ? u32(md[0] + 20) : u32(md[0] + 12);
    return { n, fps: tsc / d, desc, size, off, key, frameOf, sampleOf, codec: 'avc1.' + [desc[1], desc[2], desc[3]].map((x) => x.toString(16).padStart(2, '0')).join('') };
  }
  function makeWC(buf, onFrame, onFail, avail = () => buf.length) {
    // Frames are decoded a keyframe group at a time (the flight is encoded with a keyframe every 12 frames and no B-frames)
    // into a small cache of GPU bitmaps: the group under the scroll position and the next one in the scroll direction.
    // Scrolling up is then as cheap as scrolling down: no decoder restarts, no decoding of frames nobody will see.
    const ix = mp4Index(buf), N = ix.n, US = 1e6 / ix.fps;
    const cfg = { codec: ix.codec, description: ix.desc, hardwareAcceleration: 'prefer-hardware', optimizeForLatency: true };
    const keys = []; for (let i = 0; i < N; i++) if (ix.key[i]) keys.push(ix.frameOf[i]); keys.sort((a, b) => a - b);
    const gopOf = (k) => { let lo = 0, hi = keys.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (keys[mid] <= k) lo = mid; else hi = mid - 1; } return lo; };
    const gopRange = (g) => [keys[g], g + 1 < keys.length ? keys[g + 1] - 1 : N - 1];
    // groups: g -> { frames: Map(k -> VideoFrame), left: frames still to come }; whole groups are kept or dropped
    const groups = new Map(), MAXG = 3;
    let dec = null, dead = false, want = 0, dir = 1, lastWant = 0, shownK = -1, latest = null, latestK = -1, fails = 0;
    const loadedTo = () => { const a = avail(); if (a >= buf.length) return N - 1; let lo = -1, hi = N - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ix.off[mid] + ix.size[mid] <= a) lo = mid; else hi = mid - 1; } return lo < 0 ? -1 : ix.frameOf[lo]; };
    const make = () => { dec = new VideoDecoder({
      output: (f) => { const k = Math.round(f.timestamp / US), gr = groups.get(gopOf(k)); if (dead || !gr) { f.close(); return; }
        const old = gr.frames.get(k); if (old && old !== latest) old.close(); gr.frames.set(k, f); gr.left--; onFrame(); },
      error: (er) => { window.__nrDecErr = String(er && er.message || er); if (dead) return; try { dec.close(); } catch (e) {} if (++fails > 2) { dead = true; onFail(); return; }
        groups.forEach((gr) => gr.frames.forEach((f) => { if (f !== latest) f.close(); })); groups.clear(); make(); } });
      dec.configure(cfg); };
    make();
    const dropGroup = (g) => { const gr = groups.get(g); if (!gr) return; gr.frames.forEach((f) => { if (f !== latest) f.close(); }); groups.delete(g); };
    const decodeGop = (g) => { if (g < 0 || g >= keys.length || groups.has(g)) return; const [a, b] = gopRange(g);
      if (ix.off[ix.sampleOf[b]] + ix.size[ix.sampleOf[b]] > avail()) return;   // not fully downloaded yet
      // room first: drop finished groups farthest from the target (a group still decoding is never dropped)
      while (groups.size >= MAXG) { let far = -1, fd = -1; groups.forEach((gr, gg) => { const d = Math.abs(gg - gopOf(want)); if (gr.left <= 0 && d > fd && gg !== g) { fd = d; far = gg; } });
        if (far < 0) return; dropGroup(far); }
      groups.set(g, { frames: new Map(), left: b - a + 1 });
      for (let k = a; k <= b; k++) { const i = ix.sampleOf[k];
        try { dec.decode(new EncodedVideoChunk({ type: ix.key[i] ? 'key' : 'delta', timestamp: k * US, data: buf.subarray(ix.off[i], ix.off[i] + ix.size[i]) })); } catch (e) { groups.delete(g); return; } } };
    return {
      want(k) { if (dead) return; const lt = loadedTo(); if (lt < 0) return;
        k = Math.max(0, Math.min(lt, k)); if (k !== lastWant) { dir = k > lastWant ? 1 : -1; lastWant = k; } want = k;
        const g = gopOf(k);
        decodeGop(g);                                   // the group under the scroll position first
        if (dec.decodeQueueSize < 16) decodeGop(g + dir);   // then the next one in the scroll direction
        // show the decoded frame nearest to the target
        let best = -1, bd = Infinity;
        groups.forEach((gr) => gr.frames.forEach((f, kk) => { const d = Math.abs(kk - k); if (d < bd) { bd = d; best = kk; } }));
        if (best >= 0 && best !== latestK) { const gr = groups.get(gopOf(best)); const f = gr && gr.frames.get(best);
          if (f) { const prev = latest; latest = f; latestK = best; if (prev && ![...groups.values()].some((x) => [...x.frames.values()].includes(prev))) prev.close(); } }
      },
      take() { if (!latest || latestK === shownK) return -1; shownK = latestK; return latestK; },
      frame: () => latest,
      loadedTo,
      dbg: () => ({ want, dir, shownK, groups: [...groups.entries()].map(([g, gr]) => [g, gr.frames.size, gr.left]), q: dec.decodeQueueSize, st: dec.state, fails }),
      close() { dead = true; groups.forEach((gr) => gr.frames.forEach((f) => f.close())); groups.clear(); if (latest) { try { latest.close(); } catch (e) {} } latest = null; try { dec.close(); } catch (e) {} },
    };
  }

  // a WebGL canvas that shows VideoFrames (no 2D raster pass, which held Chrome to half rate)
  function glCanvas(c) { try {
    const gl = c.getContext('webgl', { alpha: false, antialias: false, depth: false, premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    if (!gl) return null;
    const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); return o; }, pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, 'precision mediump float; varying vec2 v; uniform sampler2D t; void main(){ gl_FragColor = texture2D(t, v); }'));
    gl.linkProgram(pr); gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture()); [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { c, gl, put(vf) { const w = vf.displayWidth || vf.width, h = vf.displayHeight || vf.height; if (c.width !== w) { c.width = w; c.height = h; gl.viewport(0, 0, w, h); }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vf); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); } };
  } catch (e) { return null; } }
  const ok = typeof VideoDecoder === 'function' && typeof EncodedVideoChunk === 'function';
  window.ScrubWC = { ok, mp4Index, makeWC, glCanvas,
    supported: (ix) => VideoDecoder.isConfigSupported({ codec: ix.codec, description: ix.desc }).then((r) => r.supported, () => false) };
})();
