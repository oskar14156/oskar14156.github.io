/* Voyeva: an airliner over a sea of clouds pulls away until the Earth appears, the trip's
 * flights draw themselves on the globe, the camera dives onto the plane over Mongolia and
 * the view narrows into the phone, where the real recap continues from that exact moment.
 * Then the phone settles into the Voyeva fan.
 * Two WebGL scenes (sky, globe) on two canvases; one scrubbed progress value drives both. */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

const sec = document.getElementById('voyeva-scene');
if (sec) init();

function init() {
  const $ = (s) => sec.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const skyCanvas = $('.vs-sky'), globeCanvas = $('.vs-globe'), haze = $('.vs-haze'), clipBox = $('.vs-clip');
  const planeIcon = $('.vs-plane'), endCard = $('.vs-card'), endText = $('.vs-text');
  const fanL = $('.vs-fan .fan-l'), fanC = $('.vs-fan .fan-c'), fanR = $('.vs-fan .fan-r');
  const video = fanC.querySelector('video'), videoBox = fanC.querySelector('.device-screen');
  const caps = [...sec.querySelectorAll('.vs-cap')];
  const T0 = 4.5; // recap: the plane over Mongolia, heading for Beijing
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => t * t * (3 - 2 * t);
  const easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const DPR = Math.min(devicePixelRatio || 1, matchMedia('(max-width: 800px)').matches ? 1.5 : 2);
  let W = 0, H = 0, progress = 0;

  /* ================= SKY: airliner over clouds ================= */
  const skyR = new THREE.WebGLRenderer({ canvas: skyCanvas, antialias: true, powerPreference: 'high-performance' });
  skyR.setPixelRatio(DPR);
  skyR.toneMapping = THREE.ACESFilmicToneMapping; skyR.toneMappingExposure = 0.62;
  skyR.outputColorSpace = THREE.SRGBColorSpace;
  const skyScene = new THREE.Scene();
  const skyCam = new THREE.PerspectiveCamera(38, 1, 0.5, 2e6);

  const sky = new Sky(); sky.scale.setScalar(1e6); skyScene.add(sky);
  const sun = new THREE.Vector3();
  const su = sky.material.uniforms;
  su.turbidity.value = 3.2; su.rayleigh.value = 2.2; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.86;
  sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 16), THREE.MathUtils.degToRad(-128));
  su.sunPosition.value.copy(sun);
  const pmrem = new THREE.PMREMGenerator(skyR);
  const envScene = new THREE.Scene(); const envSky = new Sky(); envSky.scale.setScalar(1e4);
  Object.assign(envSky.material.uniforms.sunPosition.value, sun); envSky.material.uniforms.turbidity.value = 3.2;
  envSky.material.uniforms.rayleigh.value = 1.6; envScene.add(envSky);
  skyScene.environment = pmrem.fromScene(envScene).texture;

  const sunLight = new THREE.DirectionalLight(0xfff0dc, 3.2); sunLight.position.copy(sun).multiplyScalar(100); skyScene.add(sunLight);
  skyScene.add(new THREE.HemisphereLight(0xbfd8ff, 0xf3e6d6, 0.9));

  // Sea of clouds: two shader layers (domain-warped fbm, lit from the sun, fogged to the horizon)
  const cloudVert = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const cloudFrag = `
    uniform float uTime, uScale, uCover, uDark; uniform vec2 uOff; uniform vec3 uSun, uCam, uHorizon, uLit, uShade;
    varying vec3 vW;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
      return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }
    const mat2 M = mat2(1.6,1.2,-1.2,1.6);
    float fbm(vec2 p){ float v = 0., a = .5; for(int i=0;i<5;i++){ v += a*n(p); p = M*p; a *= .5; } return v; }
    float billow(vec2 p){ float v = 0., a = .5; for(int i=0;i<6;i++){ v += a*(1. - abs(n(p)*2.-1.)); p = M*p; a *= .5; } return v; }
    float H(vec2 p){
      float cov = smoothstep(uCover, uCover + .22, fbm(p * .3 + vec2(uTime*.003, 0.)));
      float b = billow(p * 1.15);
      return cov * (.28 + .72 * mix(fbm(p * 1.3 + 7.1), b, .82));
    }
    void main(){
      vec2 p = vW.xz * uScale + uOff;
      float d = H(p);
      float a = smoothstep(.05, .22, d);
      float e = .011;
      vec3 nrm = normalize(vec3(-(H(p + vec2(e,0.)) - d) * 26., 1., -(H(p + vec2(0.,e)) - d) * 26.));
      vec3 L = normalize(uSun);
      float wrap = clamp(dot(nrm, L) * .7 + .55, 0., 1.);
      float shadow = clamp((H(p + normalize(L.xz) * .09) - d) * 2.6, 0., 1.);
      vec3 V = normalize(uCam - vW);
      float fwd = pow(clamp(dot(-V, L) * .5 + .5, 0., 1.), 6.);
      vec3 col = mix(uShade, uLit, wrap * (1. - shadow * .75));
      col *= mix(.62, 1.08, smoothstep(.12, .78, d));                 // valleys darker
      col += vec3(1., .82, .6) * fwd * (1. - a) * .6;               // light through thin edges
      col *= (1. - uDark);
      float dist = length(vW - uCam);
      float fog = 1. - exp(-pow(dist / (42000. + uCam.y * 3.5), 1.5));
      col = mix(col, uHorizon, fog);
      gl_FragColor = vec4(col, max(a, fog));
      #include <colorspace_fragment>
    }`;
  const mkClouds = (y, scale, cover, dark) => {
    const m = new THREE.ShaderMaterial({
      vertexShader: cloudVert, fragmentShader: cloudFrag, transparent: true, depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uScale: { value: scale }, uCover: { value: cover }, uDark: { value: dark }, uOff: { value: new THREE.Vector2() },
        uSun: { value: sun.clone() }, uCam: { value: new THREE.Vector3() }, uHorizon: { value: new THREE.Color(0xe9dccd) },
        uLit: { value: new THREE.Color(0xfffaf3) }, uShade: { value: new THREE.Color(0xa3b4cf) },
      },
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4e5, 4e5), m);
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; skyScene.add(mesh);
    return m;
  };
  const cloudsLow = mkClouds(-1500, 0.00018, 0.05, 0.22);
  const cloudsMid = mkClouds(-380, 0.0008, 0.3, 0.0);

  const plane = buildAirliner(); skyScene.add(plane);

  /* ================= GLOBE ================= */
  const gR = new THREE.WebGLRenderer({ canvas: globeCanvas, antialias: true, alpha: false });
  gR.setPixelRatio(DPR); gR.outputColorSpace = THREE.SRGBColorSpace;
  gR.toneMapping = THREE.ACESFilmicToneMapping; gR.toneMappingExposure = 1.05;
  const gScene = new THREE.Scene();
  const gCam = new THREE.PerspectiveCamera(36, 1, 0.001, 100);
  const loader = new THREE.TextureLoader();
  const tex = (u, srgb = true) => { const t = loader.load(u, () => schedule()); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const sunDir = (() => { const lat = 12 * Math.PI / 180, th = (4 + 180) * Math.PI / 180; return new THREE.Vector3(-Math.cos(lat) * Math.cos(th), Math.sin(lat), Math.cos(lat) * Math.sin(th)).normalize(); })();
  const earthMat = new THREE.ShaderMaterial({
    uniforms: {
      day: { value: tex('/developer/media/earth/earth-blue-marble.jpg') }, night: { value: tex('/developer/media/earth/earth-night.jpg') },
      water: { value: tex('/developer/media/earth/earth-water.png', false) }, sunDir: { value: sunDir },
    },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D day, night, water; uniform vec3 sunDir; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float l = dot(vN, sunDir); float dayMix = smoothstep(-.12, .22, l);
        vec3 d = texture2D(day, vUv).rgb; vec3 n = texture2D(night, vUv).rgb;
        vec3 dayCol = d * (.25 + 1.05 * clamp(l, 0., 1.));
        float w = texture2D(water, vUv).r; vec3 hlf = normalize(sunDir + vV);
        dayCol += w * pow(max(dot(vN, hlf), 0.), 60.) * vec3(1., .9, .75) * .9;
        vec3 nightCol = n * vec3(1.2, 1.0, .7) * 1.6 + d * .03;
        vec3 col = mix(nightCol, dayCol, dayMix);
        float rim = pow(1. - max(dot(vN, vV), 0.), 3.);
        col += vec3(.35, .6, 1.) * rim * (.12 + .45 * dayMix);
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 128), earthMat); gScene.add(earth);
  // Clouds on the globe: a procedural fbm texture on a slightly larger sphere
  const cloudTex = new THREE.CanvasTexture(makeCloudCanvas(1024, 512));
  const gClouds = new THREE.Mesh(new THREE.SphereGeometry(1.006, 96, 96),
    new THREE.MeshLambertMaterial({ map: cloudTex, transparent: true, opacity: .55, depthWrite: false }));
  gScene.add(gClouds);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.045, 96, 96), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { sunDir: { value: sunDir } },
    vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix)*normal); vP = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vP,1.); }`,
    fragmentShader: `uniform vec3 sunDir; varying vec3 vN; varying vec3 vP;
      void main(){ vec3 v = normalize(cameraPosition - vP); float i = pow(clamp(.62 - dot(vN, v), 0., 1.), 3.2);
        float s = .35 + .65 * clamp(dot(normalize(vP), sunDir) + .3, 0., 1.); gl_FragColor = vec4(vec3(.36, .64, 1.) * i * 1.6 * s, i); }`,
  }));
  gScene.add(atmo);
  const stars = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 32), new THREE.MeshBasicMaterial({ map: tex('/developer/media/earth/night-sky.png'), side: THREE.BackSide, color: 0x8899aa }));
  gScene.add(stars);
  gScene.add(new THREE.AmbientLight(0xffffff, .5));
  const gSun = new THREE.DirectionalLight(0xffffff, 2.2); gSun.position.copy(sunDir).multiplyScalar(10); gScene.add(gSun);

  // Trip routes (China & Japan, 2026). Flights as glowing arcs, ground legs on the surface.
  const ll = (lat, lon, r = 1) => { const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
  const P = { VIE: [48.21, 16.37], BUD: [47.44, 19.26], PEK: [40.08, 116.6], XIY: [34.34, 108.94], CKG: [29.56, 106.55], KWL: [25.27, 110.29],
    YSO: [24.78, 110.49], KIX: [34.43, 135.24], OSA: [34.69, 135.5], NGO: [35.18, 136.91], SKG: [36.26, 136.91], CTS: [42.77, 141.69], SPK: [43.06, 141.35] };
  const arcCurve = (a, b, lift) => {
    const A = ll(...a), B = ll(...b), pts = [];
    for (let i = 0; i <= 96; i++) { const t = i / 96; const v = A.clone().lerp(B, t).normalize(); v.multiplyScalar(1 + lift * Math.sin(Math.PI * t)); pts.push(v); }
    return new THREE.CatmullRomCurve3(pts);
  };
  const groundCurve = (list) => { const pts = []; for (let i = 0; i < list.length - 1; i++) { const A = ll(...list[i]), B = ll(...list[i + 1]);
    for (let k = 0; k < 24; k++) pts.push(A.clone().lerp(B, k / 24).normalize().multiplyScalar(1.004)); } pts.push(ll(...list.at(-1), 1.004)); return new THREE.CatmullRomCurve3(pts); };
  const routes = [];
  const addRoute = (curve, color, radius, start, end, glow) => {
    const geo = new THREE.TubeGeometry(curve, 240, radius, 8, false);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .95 });
    const m = new THREE.Mesh(geo, mat); gScene.add(m);
    let g = null;
    if (glow) { g = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, radius * 3.2, 8, false), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false })); gScene.add(g); }
    routes.push({ m, g, count: geo.index.count, start, end }); return curve;
  };
  const mainArc = addRoute(arcCurve(P.BUD, P.PEK, .16), 0x39d0f5, .0034, .0, .55, true);
  addRoute(groundCurve([P.VIE, P.BUD]), 0xf2b02c, .0028, .0, .08, false);
  addRoute(groundCurve([P.PEK, P.XIY, P.CKG]), 0xef4b4b, .0028, .5, .66, false);
  addRoute(groundCurve([P.CKG, P.KWL, P.YSO]), 0xf2b02c, .0028, .6, .72, false);
  addRoute(arcCurve(P.KWL, P.KIX, .05), 0x39d0f5, .0034, .66, .8, true);
  addRoute(groundCurve([P.OSA, P.NGO, P.SKG]), 0xf2b02c, .0028, .76, .86, false);
  addRoute(arcCurve(P.NGO, P.CTS, .03), 0x39d0f5, .0034, .8, .9, true);
  addRoute(arcCurve(P.CTS, P.VIE, .2), 0x39d0f5, .0034, .86, 1, true);
  // Plane badges along the arcs, Voyeva style
  const badgeTex = new THREE.CanvasTexture(makeBadge());
  badgeTex.colorSpace = THREE.SRGBColorSpace;
  const badges = [[arcCurve(P.KWL, P.KIX, .05), .5, .78], [arcCurve(P.NGO, P.CTS, .03), .5, .88], [arcCurve(P.CTS, P.VIE, .2), .45, .97]].map(([c, t, at]) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, depthWrite: false, transparent: true, opacity: 0, sizeAttenuation: false }));
    s.position.copy(c.getPoint(t)); s.scale.setScalar(.034); gScene.add(s); return { s, at };
  });
  const cityDot = new THREE.MeshBasicMaterial({ color: 0xffffff });
  Object.entries(P).forEach(([k, v]) => { if (['VIE', 'BUD', 'PEK', 'KIX', 'CTS', 'CKG', 'NGO'].includes(k)) { const d = new THREE.Mesh(new THREE.SphereGeometry(.0045, 12, 12), cityDot); d.position.copy(ll(...v, 1.002)); gScene.add(d); } });

  /* ================= sizing & the phone geometry ================= */
  let fanRect = null;
  function measure() {
    W = sec.clientWidth; H = window.innerHeight;
    skyR.setSize(W, H, false); gR.setSize(W, H, false);
    skyCam.aspect = W / H; skyCam.updateProjectionMatrix(); gCam.aspect = W / H; gCam.updateProjectionMatrix();
    // Where the centre phone ends up (its laid-out rect, transforms removed)
    const prev = fanC.style.transform; fanC.style.transform = 'none';
    const r = fanC.getBoundingClientRect(), s = videoBox.getBoundingClientRect(), st = sec.querySelector('.vs-stage').getBoundingClientRect();
    fanC.style.transform = prev;
    const k = Math.min((H * 0.82) / r.height, (W * 0.9) / r.width);
    fanRect = { x: r.left - st.left, y: r.top - st.top, w: r.width, h: r.height, k,
      sx: (s.left - r.left) / r.width, sy: (s.top - r.top) / r.height, sw: s.width / r.width, sh: s.height / r.height };
  }

  /* ================= frame ================= */
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  let videoArmed = false, videoPrimed = false;
  const seekT0 = () => { try { video.currentTime = T0; } catch (e) {} };
  const primeVideo = () => { video.preload = 'auto'; video.pause(); if (video.readyState >= 1) seekT0(); else { video.addEventListener('loadedmetadata', seekT0, { once: true }); video.load(); } };
  function render() {
    const p = progress, t = clock.getElapsedTime();
    // --- Act 1: sky (0 .. .34)
    const skyOn = p < .235;
    if (skyOn) {
      const s = span(p, .02, .21), e = easeIO(s);
      const d = 50 * Math.pow(26, e) * Math.sqrt(Math.max(1, .9 * H / W));
      const el = THREE.MathUtils.degToRad(lerp(13, 52, ease(span(p, .05, .21))));
      const az = THREE.MathUtils.degToRad(lerp(-34, -4, e));
      plane.rotation.z = Math.sin(t * .6) * .045; plane.position.y = Math.sin(t * .8) * .25;
      skyCam.position.set(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);
      skyCam.up.set(0, 1, 0); if (el > 1.5) skyCam.up.set(0, 0, -1);
      skyCam.lookAt(0, -1 * (1 - e), -3 * (1 - e));
      for (const c of [cloudsLow, cloudsMid]) { c.uniforms.uTime.value = t; c.uniforms.uOff.value.y = -t * .045 * (c === cloudsMid ? 1 : .55); c.uniforms.uCam.value.copy(skyCam.position); }
      skyR.render(skyScene, skyCam);
    }
    skyCanvas.style.opacity = 1 - span(p, .205, .23);
    haze.style.opacity = span(p, .165, .205) * (1 - span(p, .225, .265)) * .97;

    // --- Act 2: globe (.31 .. .78)
    const gOn = p > .2 && p < .86;
    if (gOn) {
      const a = easeIO(span(p, .21, .4));    // pull back from Budapest to Eurasia
      const b = easeIO(span(p, .45, .6));    // follow the plane towards Beijing
      const c = easeIO(span(p, .6, .7));     // dive onto the plane
      const f = lerp(0, .8, easeIO(span(p, .47, .62)));   // plane progress on the BUD-PEK arc
      const planePos = mainArc.getPoint(f);
      const pl = toLatLon(planePos);
      let lat = lerp(47.4, 40, a), lon = lerp(19.3, 64, a), dist = lerp(1.26, 3.9, a);
      lat = lerp(lat, 45, b); lon = lerp(lon, 94, b); dist = lerp(dist, 3.0, b);
      dist = 1 + (dist - 1) * Math.max(1, .9 * H / W);
      const targetDist = 1 + diveAltitude();
      lat = lerp(lat, pl.lat, c); lon = lerp(lon, pl.lon, c); dist = lerp(dist, targetDist, c);
      gCam.position.copy(ll(lat, lon, dist)); gCam.up.set(0, 1, 0); gCam.lookAt(0, 0, 0);
      // keep north up during the dive
      gClouds.rotation.y = t * .004;
      routes.forEach((r) => { const k = span(p, lerp(.33, .47, r.start), lerp(.33, .47, r.end));
        r.m.geometry.setDrawRange(0, Math.floor(r.count * k) - (Math.floor(r.count * k) % 3));
        if (r.g) r.g.geometry.setDrawRange(0, Math.floor(r.count * k) - (Math.floor(r.count * k) % 3)); });
      const mainK = span(p, .33, .4);
      routes[0].m.geometry.setDrawRange(0, Math.floor(routes[0].count * mainK / 3) * 3);
      routes[0].g.geometry.setDrawRange(0, Math.floor(routes[0].count * mainK / 3) * 3);
      routes[0].g.material.opacity = (.18 + .3 * span(p, .47, .5)) * (1 - c);
      routes.forEach((r) => { if (r !== routes[0] && r.g) r.g.material.opacity = .18 * (1 - c); });
      badges.forEach(({ s, at }) => { s.material.opacity = span(p, lerp(.33, .47, at) - .01, lerp(.33, .47, at) + .02) * (1 - c); });
      gR.render(gScene, gCam);
      // plane icon at the projected arc point, heading along the arc
      tmp.copy(planePos).project(gCam);
      const ahead = mainArc.getPoint(Math.min(1, f + .01)).project(gCam);
      const px = (tmp.x * .5 + .5) * W, py = (-tmp.y * .5 + .5) * H;
      const ang = Math.atan2(-(ahead.y - tmp.y), ahead.x - tmp.x) + Math.PI / 2;
      const iconW = lerp(26, recapIconW(), c);
      planeIcon.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%) rotate(${ang}rad)`;
      planeIcon.style.width = iconW + 'px';
      planeIcon.style.opacity = span(p, .45, .48) * (1 - span(p, .755, .765));
    }
    globeCanvas.style.opacity = span(p, .2, .22);

    // --- Act 3: into the phone (.68 .. .8) and into the fan (.8 .. .96)
    const into = easeIO(span(p, .69, .76));
    const settle = easeIO(span(p, .8, .95));
    if (fanRect) {
      const { x, y, w, h, k, sx, sy, sw, sh } = fanRect;
      const cx = W / 2, cy = H / 2;
      // centre-phone transform: big and centred -> laid out in the fan
      const kk = lerp(k, 1, settle);
      const tx = lerp(cx - (x + w / 2), 0, settle), ty = lerp(cy - (y + h / 2), 0, settle);
      fanC.style.transform = `translate(${tx}px, ${ty}px) scale(${kk})`;
      fanC.style.opacity = span(p, .735, .765);
      // screen rect of the centred phone, in stage px
      const scrX = cx - (w * k) / 2 + sx * w * k, scrY = cy - (h * k) / 2 + sy * h * k, scrW = sw * w * k, scrH = sh * h * k;
      const ins = { t: lerp(0, scrY, into), r: lerp(0, W - scrX - scrW, into), b: lerp(0, H - scrY - scrH, into), l: lerp(0, scrX, into) };
      clipBox.style.clipPath = `inset(${ins.t}px ${ins.r}px ${ins.b}px ${ins.l}px round ${lerp(0, scrW * .13, into)}px)`;
      clipBox.style.opacity = 1 - span(p, .755, .79);
      video.style.opacity = span(p, .75, .78);
      // fan sides
      const fs = settle;
      fanL.style.transform = `translateX(${-64 * fs}%) rotate(${-9 * fs}deg) translateY(${36 * fs}px)`;
      fanR.style.transform = `translateX(${64 * fs}%) rotate(${9 * fs}deg) translateY(${36 * fs}px)`;
      fanL.style.opacity = fanR.style.opacity = span(p, .82, .88);
      endCard.style.opacity = span(p, .72, .8);
      endText.style.opacity = span(p, .86, .94); endText.style.transform = `translateY(${(1 - span(p, .86, .94)) * 40}px)`;
    }
    // recap: hold on the Mongolia frame, play from there once the screen is the phone
    // Recap: loaded and parked on the Mongolia frame before the handoff, played from there after it
    if (p > .55 && !videoPrimed) { videoPrimed = true; primeVideo(); }
    if (videoPrimed && !videoArmed && video.readyState >= 1 && Math.abs(video.currentTime - T0) > .05) seekT0();
    if (p > .755 && !videoArmed) { videoArmed = true; video.play().catch(() => {}); }
    if (p < .745 && videoArmed) { videoArmed = false; video.pause(); seekT0(); }
    caps.forEach((el) => { const a = +el.dataset.a, b = +el.dataset.b; const o = span(p, a, a + .03) * (1 - span(p, b - .03, b)); el.style.opacity = o; el.style.transform = `translateY(${(1 - span(p, a, a + .03)) * 24}px)`; });
  }
  function diveAltitude() {
    // Altitude at which the phone screen shows about 1,900 km across, like the recap
    if (!fanRect) return .5;
    const scrW = fanRect.sw * fanRect.w * fanRect.k;
    const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(gCam.fov / 2)) * gCam.aspect);
    return (1350 / 6371) / ((scrW / W) * 2 * Math.tan(hf));
  }
  function recapIconW() { return fanRect ? fanRect.sw * fanRect.w * fanRect.k * .075 : 30; }
  function toLatLon(v) { const r = v.length(); const lat = 90 - Math.acos(v.y / r) * 180 / Math.PI; let lon = Math.atan2(v.z, -v.x) * 180 / Math.PI - 180; if (lon < -180) lon += 360; return { lat, lon }; }

  /* ================= loop ================= */
  let active = false, raf = 0;
  const loop = () => { raf = 0; if (!active) return; render(); raf = requestAnimationFrame(loop); };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(loop); };
  measure();
  addEventListener('resize', () => { measure(); schedule(); });
  video.dataset.manual = '1';
  if (reduce) { progress = 1; active = true; render(); active = false; return; }
  ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: (st) => { active = st.isActive; if (active) schedule(); } });
  ScrollTrigger.create({ trigger: sec, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'vs-active' } });
  ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { progress = st.progress; schedule(); }, onRefresh: () => measure() });
  window.voyevaScene = { seek: (p) => { progress = p; render(); }, measure };
}

/* ---------- procedural airliner (metres; nose towards -Z) ---------- */
function buildAirliner() {
  const g = new THREE.Group();
  const L = 40, R = 2.0;
  const radius = (y) => {
    if (y < 9) return 0.32 + (R - 0.32) * Math.pow(Math.sin((y / 9) * Math.PI / 2), 0.75);
    if (y > 34) return R * Math.sqrt(Math.max(0, 1 - Math.pow((y - 34) / 6, 2)));
    return R;
  };
  const prof = []; for (let i = 0; i <= 80; i++) { const y = (i / 80) * L; prof.push(new THREE.Vector2(Math.max(radius(y), 0.001), y)); }
  const fus = new THREE.LatheGeometry(prof, 96); fus.rotateX(-Math.PI / 2); fus.translate(0, 0, L / 2);
  const livery = new THREE.CanvasTexture(liveryCanvas()); livery.colorSpace = THREE.SRGBColorSpace; livery.anisotropy = 8;
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: livery, roughness: .32, metalness: .05, clearcoat: .7, clearcoatRoughness: .15 });
  const alu = new THREE.MeshPhysicalMaterial({ color: 0xd3d7dd, roughness: .38, metalness: .55, clearcoat: .3 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x9aa1aa, roughness: .5, metalness: .6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0f13, roughness: .6, metalness: .2 });
  const finMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: finTexture(), roughness: .3, clearcoat: .7, clearcoatRoughness: .15 });
  g.add(new THREE.Mesh(fus, paint));

  const wing = (pts, thick, mat) => { const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * .35, bevelSize: thick * .35, bevelSegments: 3, steps: 1 });
    geo.rotateX(-Math.PI / 2); return new THREE.Mesh(geo, mat); };
  const wingPts = [[1.4, 4.2], [17.5, -5.6], [17.6, -7.4], [1.4, -4.4]];
  const rw = wing(wingPts, .32, alu); rw.position.set(0, -1.35, -1); rw.rotation.z = THREE.MathUtils.degToRad(5);
  const lw = wing(wingPts.map(([x, y]) => [-x, y]).reverse(), .32, alu); lw.position.set(0, -1.35, -1); lw.rotation.z = THREE.MathUtils.degToRad(-5);
  g.add(rw, lw);
  // winglets
  [1, -1].forEach((sgn) => { const wl = new THREE.Mesh(new THREE.BoxGeometry(.16, 2.1, 1.5), alu); wl.position.set(sgn * 17.5, 1.25, 5.6); wl.rotation.z = sgn * -.18; wl.rotation.x = .35; g.add(wl); });
  // engines
  const nacProf = []; for (let i = 0; i <= 20; i++) { const y = i / 20 * 4.6; const r = y < 3.6 ? 0.98 - 0.12 * Math.pow(y / 3.6, 2) : 0.86 - (y - 3.6) * .35; nacProf.push(new THREE.Vector2(Math.max(r, .3), y)); }
  [6.2, -6.2].forEach((x) => {
    const n = new THREE.LatheGeometry(nacProf, 48); n.rotateX(-Math.PI / 2); n.translate(0, 0, 2.3);
    const eng = new THREE.Mesh(n, grey); eng.position.set(x, -2.35, -3.4); g.add(eng);
    const intake = new THREE.Mesh(new THREE.CircleGeometry(.9, 32), dark); intake.position.set(x, -2.35, -5.69); intake.rotation.y = Math.PI; g.add(intake);
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(.3, 1.0, 3.2), alu); pylon.position.set(x, -1.65, -2.3); g.add(pylon);
  });
  // horizontal stabilisers
  const hs = [[0.6, 2.0], [7.2, -2.6], [7.2, -3.8], [0.6, -2.2]];
  const rs = wing(hs, .2, alu); rs.position.set(0, .35, 16.6); rs.rotation.z = THREE.MathUtils.degToRad(6);
  const ls = wing(hs.map(([x, y]) => [-x, y]).reverse(), .2, alu); ls.position.set(0, .35, 16.6); ls.rotation.z = THREE.MathUtils.degToRad(-6);
  g.add(rs, ls);
  // vertical fin (shape in z/height, extruded sideways)
  const fs = new THREE.Shape([[0, 0], [5.4, 0], [7.4, 7.6], [5.6, 7.6]].map(([a, b]) => new THREE.Vector2(a, b)));
  const fin = new THREE.ExtrudeGeometry(fs, { depth: .34, bevelEnabled: true, bevelThickness: .1, bevelSize: .1, bevelSegments: 2 });
  fin.rotateY(-Math.PI / 2); fin.translate(.17, 1.4, 13.2);
  g.add(new THREE.Mesh(fin, finMat));
  g.rotation.y = 0;
  return g;
}

function liveryCanvas() {
  // u: around the fuselage (0 top, .25 right, .5 belly, .75 left); v: tail (0) to nose (1)
  const c = document.createElement('canvas'); c.width = 2048; c.height = 2048; const x = c.getContext('2d');
  x.fillStyle = '#f7f8fa'; x.fillRect(0, 0, 2048, 2048);
  x.fillStyle = '#c8ced6'; x.fillRect(0.38 * 2048, 0, 0.24 * 2048, 2048);           // grey belly
  const g = x.createLinearGradient(0, 2048, 0, 0); g.addColorStop(0, '#e9b949'); g.addColorStop(1, '#c98a1d');
  for (const u of [0.288, 0.712]) {                                                  // gold cheatline each side
    x.fillStyle = g; x.fillRect(u * 2048 - 10, 0.12 * 2048, 20, 0.74 * 2048);
  }
  x.fillStyle = '#1d2733';                                                           // windows
  for (const u of [0.232, 0.768]) for (let v = 0.24; v < 0.86; v += 0.0105) { x.beginPath(); x.ellipse(u * 2048, (1 - v) * 2048, 7, 10, 0, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = '#121a24';                                                           // cockpit
  for (const [u0, u1] of [[0.17, 0.3], [0.7, 0.83]]) { x.beginPath(); x.moveTo(u0 * 2048, (1 - .918) * 2048); x.lineTo(u1 * 2048, (1 - .918) * 2048); x.lineTo((u1 - .03) * 2048, (1 - .94) * 2048); x.lineTo((u0 + .03) * 2048, (1 - .94) * 2048); x.fill(); }
  x.save(); x.translate(0.232 * 2048, (1 - 0.72) * 2048); x.rotate(-Math.PI / 2); x.fillStyle = '#1b1f2a';
  x.font = '700 64px Geist, Helvetica, Arial, sans-serif'; x.fillText('VOYEVA', 0, 70); x.restore();
  x.save(); x.translate(0.768 * 2048, (1 - 0.62) * 2048); x.rotate(Math.PI / 2); x.fillStyle = '#1b1f2a';
  x.font = '700 64px Geist, Helvetica, Arial, sans-serif'; x.fillText('VOYEVA', 0, -24); x.restore();
  return c;
}
function finTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const x = c.getContext('2d');
  x.fillStyle = '#121418'; x.fillRect(0, 0, 1024, 1024);
  const g = x.createLinearGradient(0, 0, 1024, 1024); g.addColorStop(0, '#f6cf6a'); g.addColorStop(1, '#d08d1f');
  x.strokeStyle = g; x.lineWidth = 70; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(420, 300); x.bezierCurveTo(700, 300, 720, 520, 520, 560); x.bezierCurveTo(330, 600, 380, 760, 640, 740); x.stroke();
  x.fillStyle = g; [[400, 300], [660, 740]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 70, 0, Math.PI * 2); x.fill(); x.fillStyle = '#121418'; x.beginPath(); x.arc(a, b, 28, 0, Math.PI * 2); x.fill(); x.fillStyle = g; });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  // Extrude UVs are the shape coordinates (0..7.4 x 0..7.6)
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(1 / 7.6, 1 / 7.6); return t;
}
function makeCloudCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const img = x.createImageData(w, h);
  const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const noise = (px, py, per) => { const i = Math.floor(px), j = Math.floor(py), fx = px - i, fy = py - j; const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(i % per, j), b = hash((i + 1) % per, j), c2 = hash(i % per, j + 1), d = hash((i + 1) % per, j + 1); return a + (b - a) * u + (c2 - a) * v + (a - b - c2 + d) * u * v; };
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    let v = 0, amp = .5, f = 6; for (let o = 0; o < 6; o++) { v += amp * noise(xx / w * f, y / h * f * .5, f); f *= 2; amp *= .5; }
    const lat = Math.abs(y / h - .5) * 2; const band = .55 + .25 * Math.cos(lat * Math.PI * 3);
    const a = Math.max(0, Math.min(1, (v - (1 - band * .62)) * 3.2));
    const k = (y * w + xx) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = a * 255;
  }
  x.putImageData(img, 0, 0); return c;
}
function makeBadge() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = 'rgba(57,208,245,.35)'; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#21b9f2'; x.beginPath(); x.arc(64, 64, 48, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#fff'; x.translate(64, 64); x.rotate(Math.PI / 4); x.scale(.62, .62);
  x.fill(new Path2D('M0-47c3.6 0 5.2 7 5.2 15v22.5L47 11.5v8.2L5.2 9.6 4.2 31 16 40.5v6.6L1.6 43.4H-1.6L-16 47.1v-6.6L-4.2 31-5.2 9.6-47 19.7v-8.2L-5.2-9.5V-32c0-8 1.6-15 5.2-15z'));
  return c;
}
