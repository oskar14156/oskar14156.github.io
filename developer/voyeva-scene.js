/* Voyeva: one continuous world at true scale (km). A real A350 over volumetric clouds, the
 * camera pulls away from it without a cut until the Earth is a globe and the trip draws
 * itself, then comes back down onto the plane over Siberia exactly where the real recap is,
 * and pulls out of the phone screen that turns out to have been showing it all along.
 *
 * Earth: Sentinel-2 cloudless 2016 (EOX, CC BY 4.0) with NASA Blue Marble patches.
 * Clouds: the real cloud map of 13 March 2026, 09:00 UTC (live-cloud-maps, CC0, contains
 * modified EUMETSAT data), turned into volumetric clouds with tileable Perlin-Worley noise.
 * Plane: Airbus A350 from the Flightradar24/FlightGear models (GPL-2.0), repainted. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const sec = document.getElementById('voyeva-scene');

function init() {
  const $ = (s) => sec.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 800px)').matches;
  const canvas = $('.vs-globe'), clipBox = $('.vs-clip'), planeIcon = $('.vs-plane'), endCard = $('.vs-card'), endText = $('.vs-text');
  $('.vs-sky').style.display = 'none'; canvas.style.opacity = 1;
  const fanL = $('.vs-fan .fan-l'), fanC = $('.vs-fan .fan-c'), fanR = $('.vs-fan .fan-r');
  const video = fanC.querySelector('video:not(.vs-hand)'), hand = fanC.querySelector('.vs-hand'), videoBox = fanC.querySelector('.device-screen');
  const caps = [...sec.querySelectorAll('.vs-cap')];
  const NS = 'http://www.w3.org/2000/svg', routeSvg = document.createElementNS(NS, 'svg');
  routeSvg.setAttribute('class', 'vs-route'); routeSvg.setAttribute('aria-hidden', 'true');
  routeSvg.innerHTML = '<polyline class="vs-route-glow" fill="none" stroke="#041026" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".55"/><polyline class="vs-route-core" fill="none" stroke="#2fc6f0" stroke-linecap="round" stroke-linejoin="round"/>';
  clipBox.insertBefore(routeSvg, planeIcon);
  const routeGlow = routeSvg.firstChild, routeCore = routeSvg.lastChild;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => t * t * (3 - 2 * t);
  const easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const DEG = Math.PI / 180, R = 6371, CRUISE = 11.3;
  const DPR = Math.min(devicePixelRatio || 1, small ? 1.5 : 2);
  let W = 0, H = 0, progress = 0;

  /* ---------- geography (three.js frame: y = north pole, km) ---------- */
  const unit = (lat, lon) => { const phi = (90 - lat) * DEG, th = (lon + 180) * DEG;
    return new THREE.Vector3(-Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)); };
  const toLL = (v) => { const r = v.length(); let lon = Math.atan2(v.z, -v.x) / DEG - 180; if (lon < -180) lon += 360; return { lat: 90 - Math.acos(v.y / r) / DEG, lon }; };
  // Voyeva's own flight arc: great circle with a latitude lift of sin(f*pi) * 0.08 * angular distance
  const flightArc = (a, b) => {
    const A = unit(...a), B = unit(...b), om = Math.acos(clamp(A.dot(B), -1, 1));
    return (f) => { const v = A.clone().multiplyScalar(Math.sin((1 - f) * om)).addScaledVector(B, Math.sin(f * om)).divideScalar(Math.sin(om));
      const ll = toLL(v); return unit(Math.min(89.9, ll.lat + Math.sin(f * Math.PI) * 0.08 * om / DEG), ll.lon); };
  };
  const ROADS = {"VIE_BUD":[[48.21,16.37],[48.212,16.393],[48.189,16.422],[48.18,16.451],[48.153,16.481],[48.134,16.533],[48.118,16.625],[48.059,16.707],[48.031,16.828],[48.021,16.837],[47.989,16.833],[47.975,16.849],[47.964,16.904],[47.944,16.94],[47.925,17.012],[47.918,17.058],[47.927,17.104],[47.9,17.169],[47.857,17.241],[47.795,17.317],[47.758,17.404],[47.699,17.503],[47.643,17.623],[47.633,17.675],[47.686,17.807],[47.679,17.934],[47.683,18.012],[47.674,18.107],[47.66,18.182],[47.627,18.266],[47.621,18.332],[47.599,18.387],[47.578,18.415],[47.574,18.469],[47.526,18.505],[47.493,18.572],[47.509,18.616],[47.51,18.742],[47.494,18.82],[47.454,18.907],[47.452,18.953],[47.465,19.015],[47.48,19.027],[47.495,19.024],[47.5,19.04]],"PEK_CKG":[[39.9,116.4],[39.897,116.303],[39.734,116.109],[39.43,116.012],[39.112,115.734],[38.788,115.538],[38.672,115.23],[38.462,114.984],[38.438,114.867],[38.348,114.732],[38.212,114.637],[38.184,114.16],[38.113,114.031],[38.122,113.932],[38.055,113.914],[38.066,113.767],[38.009,113.572],[38.051,113.504],[38.116,113.184],[38.106,113.059],[38.056,113.004],[38.041,112.907],[37.906,112.808],[37.696,112.818],[37.566,112.745],[37.409,112.279],[37.194,112.223],[37.007,111.933],[36.906,111.923],[36.762,111.801],[36.518,111.808],[36.365,111.752],[36.32,111.628],[36.223,111.512],[35.69,111.271],[35.644,111.166],[35.651,110.795],[35.581,110.535],[35.388,110.435],[35.298,110.331],[35.261,110.187],[35.018,109.954],[34.936,109.799],[34.884,109.474],[34.724,109.22],[34.526,109.112],[34.48,108.977],[34.339,108.94],[34.088,109.023],[33.96,108.92],[33.628,109.159],[33.265,109.178],[33.133,109.134],[32.927,108.958],[32.719,108.909],[32.725,108.769],[32.613,108.727],[32.592,108.622],[32.518,108.542],[32.508,108.448],[32.295,108.215],[32.271,108.111],[32.085,108.044],[31.965,108.141],[31.895,108.125],[31.834,108.025],[31.684,107.947],[31.331,107.532],[31.047,107.484],[30.762,107.194],[30.452,107.049],[30.157,106.83],[29.931,106.814],[29.653,106.638],[29.625,106.552],[29.56,106.55]],"CKG_YSO":[[29.56,106.55],[29.519,106.552],[29.499,106.62],[29.383,106.591],[29.275,106.766],[29.051,106.802],[28.992,106.862],[28.702,106.765],[28.528,106.849],[28.396,106.886],[28.326,106.854],[28.211,106.942],[28.065,106.963],[28.031,107.189],[27.718,107.38],[27.654,107.539],[27.426,107.533],[27.309,107.456],[27.062,107.462],[26.962,107.422],[26.57,107.581],[26.219,107.488],[25.863,108.566],[25.944,108.935],[25.891,109.43],[25.826,109.588],[25.859,109.834],[25.761,110.046],[25.352,110.105],[25.263,110.194],[25.27,110.289],[25.27,110.282],[25.258,110.279],[25.238,110.288],[25.222,110.282],[25.114,110.29],[25.009,110.322],[24.985,110.336],[24.959,110.364],[24.912,110.387],[24.891,110.394],[24.868,110.389],[24.847,110.395],[24.84,110.403],[24.822,110.406],[24.81,110.419],[24.804,110.44],[24.777,110.479],[24.78,110.49]],"OSA_SKG":[[34.69,135.5],[34.7,135.56],[34.708,135.56],[34.72,135.597],[34.797,135.702],[34.877,135.748],[34.897,135.748],[34.909,135.778],[34.903,135.804],[34.921,135.883],[34.946,135.89],[34.983,135.955],[34.959,135.973],[34.959,136.009],[34.933,136.045],[34.911,136.167],[34.928,136.24],[34.916,136.297],[34.917,136.402],[34.956,136.46],[35.014,136.482],[35.033,136.524],[35.049,136.605],[35.027,136.649],[35.02,136.691],[35.047,136.761],[35.052,136.9],[35.064,136.912],[35.092,136.914],[35.173,136.897],[35.18,136.91],[35.291,136.905],[35.318,136.913],[35.353,136.931],[35.387,136.994],[35.41,137.01],[35.45,137.013],[35.447,136.98],[35.467,136.907],[35.479,136.919],[35.493,136.899],[35.545,136.908],[35.568,136.918],[35.576,136.941],[35.594,136.949],[35.604,136.936],[35.681,136.968],[35.691,136.949],[35.732,136.951],[35.768,136.94],[35.783,136.914],[35.928,136.83],[35.939,136.836],[35.939,136.86],[35.952,136.877],[36.0,136.89],[35.999,136.902],[36.049,136.949],[36.087,136.943],[36.127,136.906],[36.149,136.911],[36.202,136.898],[36.224,136.877],[36.254,136.891],[36.26,136.909]]};
  // a polyline of [lat, lon] points, parameterised by length so the draw speed is even
  const polyPath = (list) => { const V = list.map((q) => unit(q[0], q[1])), acc = [0];
    for (let i = 1; i < V.length; i++) acc.push(acc[i - 1] + V[i].distanceTo(V[i - 1]));
    const tot = acc[acc.length - 1] || 1;
    return (f) => { const d = clamp(f) * tot; let i = 1; while (i < V.length - 1 && acc[i] < d) i++;
      const u = (d - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1); return V[i - 1].clone().lerp(V[i], u).normalize(); }; };
  const groundPath = (list) => (f) => { const n = list.length - 1, x = Math.min(n - 1e-9, f * n), i = Math.floor(x), t = x - i;
    return unit(...list[i]).lerp(unit(...list[i + 1]), t).normalize(); };
  const P = { VIE: [48.21, 16.37], BUD: [47.44, 19.26], PEK: [40.08, 116.6], XIY: [34.34, 108.94], CKG: [29.56, 106.55], KWL: [25.27, 110.29],
    YSO: [24.78, 110.49], KIX: [34.43, 135.24], OSA: [34.69, 135.5], NGO: [35.18, 136.91], SKG: [36.26, 136.91], CTS: [42.77, 141.69], SPK: [43.06, 141.35] };
  const main = flightArc(P.BUD, P.PEK);
  // The recap's plane: f = .70 at 4.3 s, .35 of the flight per second of video
  const T0 = 4.5, videoT = (p) => T0 + (p - .7) * 4.16;
  // The recording, measured frame by frame from the cities it labels (Omsk ... Beijing, known positions): the plane's flight
  // fraction and where it sits on the phone screen, as functions of the recording's own time in seconds (fit error < 0.001).
  const recF = (t) => { const x = t - 4.4; return .739852 + x * (.35642 + x * (-.049207 + x * .008457)); };
  const recA = (t) => { const x = t - 4.4; return [.546226 + x * (-.022689 + x * .009478), .514316 + x * (.02365 - x * .022089)]; };
  // While the recording is on screen the flight follows the frame it is actually showing (30 fps), so both line up exactly.
  // The recording's first 42 frames (3.8 s on) are still images drawn on a canvas: iOS never paints the seeks of a paused video,
  // so a scrubbed clip there froze on one frame and the globe cross-faded into the wrong picture.
  let handShown = null;
  const HN = 42, handImgs = [], handCtx = hand.getContext('2d');
  let handDrawn = -1, handLoading = false;
  const loadHand = () => { if (handLoading) return; handLoading = true;
    for (let k = 0; k < HN; k++) { const im = new Image(); im.decoding = 'async'; im.src = `/developer/media/voyeva-hand/h${String(k).padStart(2, '0')}.webp`;
      const done = () => { im.ok = true; schedule(); }; (im.decode ? im.decode() : Promise.reject()).then(done, () => { if (im.complete && im.naturalWidth) done(); else im.onload = done; }); handImgs.push(im); } };
  const drawHand = (k) => { let j = k; while (j >= 0 && !(handImgs[j] && handImgs[j].ok)) j--;
    if (j < 0) { j = k; while (j < HN && !(handImgs[j] && handImgs[j].ok)) j++; }
    if (j < 0 || j >= HN) return;
    if (j !== handDrawn) { if (hand.width !== 552) { hand.width = 552; hand.height = 1200; } handCtx.drawImage(handImgs[j], 0, 0, 552, 1200); handDrawn = j; handShown = j / 30; } };
  const recTime = (p) => { const want = videoT(p); if (p < .7 || p >= .8) return want;
    if (handShown !== null) return 3.8 + handShown;
    return 3.8 + clamp(Math.round((want - 3.8) * 30), 0, 41) / 30; };
  const sunDir = unit(16, 70);

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(DPR); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  const camera = new THREE.PerspectiveCamera(38, 1, 0.002, 2e5);
  let FOV = 38, D0 = 0.085;
  const scene = new THREE.Scene();
  const loader = new THREE.TextureLoader();
  const TEX = []; let texLeft = 0;
  // heavy downloads start only once the page loader has let go: the globe is several screens down, and the loader should not wait on it
  const afterLoad = (fn) => { if (window.pfLoaded || !document.documentElement.classList.contains('pf-loading')) fn(); else document.addEventListener('pf-loaded', fn, { once: true }); };
  const tex = (u, srgb = true) => { texLeft++; window.vsTexLeft = texLeft; const t = new THREE.Texture(); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; TEX.push(t);
    afterLoad(() => loader.load(u, (lt) => { t.image = lt.image; t.needsUpdate = true; texLeft--; window.vsTexLeft = texLeft; schedule(); warm(); }, undefined, () => { texLeft--; window.vsTexLeft = texLeft; })); return t; };
  // Upload every texture and compile every shader while the browser is idle, long before the scene scrolls in,
  // so the first frames of the flight never stall on GPU uploads or a shader compile.
  let warmed = false;
  const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 60));
  function warm() {
    if (warmed || texLeft > 0 || !noiseReady || !planeReady) return; warmed = true;
    const steps = TEX.map((t) => () => renderer.initTexture(t));
    steps.push(() => renderer.initTexture(noise3D));
    steps.push(() => (renderer.compileAsync ? renderer.compileAsync(worldScene, orthoCam) : renderer.compile(worldScene, orthoCam)));
    steps.push(() => (renderer.compileAsync ? renderer.compileAsync(scene, camera) : renderer.compile(scene, camera)));
    scene.traverse((o) => { const ms = o.material ? [].concat(o.material) : []; ms.forEach((m) => ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach((k) => m[k] && steps.push(() => renderer.initTexture(m[k])))); });
    steps.push(() => { worldRT.viewport.set(0, 0, 8, 8); renderer.setRenderTarget(worldRT); renderer.render(worldScene, orthoCam); renderer.setRenderTarget(null); setRt(); });
    steps.push(() => { const tiny = new THREE.WebGLRenderTarget(8, 8); renderer.setRenderTarget(tiny); renderer.render(scene, camera); renderer.setRenderTarget(null); tiny.dispose(); });
    const run = () => { const f = steps.shift(); if (!f) return; Promise.resolve(f()).then(() => idle(run), () => idle(run)); };
    idle(run);
  }

  /* ---------- world shader: earth + volumetric clouds + atmosphere ---------- */
  // phones: the whole-globe textures at 2K (a quarter of the GPU memory; iPhone Safari drops tabs that hold too much), corridor detail stays full
  const EG = small ? '/developer/media/earth/m/' : '/developer/media/earth/';
  let noiseReady = false; const noise3D = makeNoise3D(64, () => { noiseReady = true; warm(); });
  const CORR = new THREE.Vector4(0, 126, 18, 72), CCORR = new THREE.Vector4(5.625, 129.375, 22.5, 67.5), PATCH = new THREE.Vector4(76.5, 112.5, 40.5, 63);
  const worldMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false,
    uniforms: {
      uInvProj: { value: new THREE.Matrix4() }, uCamRot: { value: new THREE.Matrix3() }, uUp: { value: new THREE.Vector3() }, uAlt: { value: 10 },
      uSun: { value: sunDir }, uTime: { value: 0 }, uNoise: { value: noise3D },
      uGroundG: { value: tex(EG + 'ground-global.jpg?v=2') }, uGroundC: { value: tex('/developer/media/earth/ground-corridor.jpg?v=2') },
      uCloudG: { value: tex(EG + 'clouds-global.jpg', false) }, uCloudC: { value: tex('/developer/media/earth/clouds-corridor.jpg', false) },
      uStars: { value: tex(small ? EG + 'night-sky.jpg' : '/developer/media/earth/night-sky.png') }, uCorr: { value: CORR }, uCCorr: { value: CCORR }, uPatch: { value: PATCH },
      uGroundP: { value: tex('/developer/media/earth/ground-patch.jpg?v=1') },
      uSatG: { value: tex(EG + 'viirs-global.jpg?v=2') }, uSatC: { value: tex('/developer/media/earth/viirs-corridor.jpg?v=1') }, uSat: { value: 0 },
      uCloudAmt: { value: 1 }, uDetail: { value: 1 }, uSteps: { value: 64 }, uWind: { value: new THREE.Vector3() },
      uBoost: { value: unit(52, 28) }, uBoostAmt: { value: 1 }, uExposure: { value: 1 }, uDebug: { value: 0 }, uMap: { value: 0 }, uFine: { value: 1 },
      uMerc: { value: 0 }, uCloudVis: { value: 1 }, uFar: { value: 0 }, uPlaneLL: { value: new THREE.Vector2() }, uScr: { value: new THREE.Vector4(0, 0, 1, 1) }, uRtScale: { value: 1 }, uVpH: { value: 1 }, MERC_W: { value: 20.04 }, ANCHOR: { value: new THREE.Vector2(.533, .521) },
    },
    vertexShader: `out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: WORLD_FRAG,
  });
  const worldRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
  const worldScene = new THREE.Scene(); const worldQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), worldMat); worldQuad.frustumCulled = false; worldScene.add(worldQuad);
  const blitMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, uniforms: { tWorld: { value: worldRT.texture }, uMap: { value: 0 }, uTexel: { value: new THREE.Vector2(1, 1) }, uScale: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `varying vec2 vUv0; void main(){ vUv0 = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    toneMapped: false,
    fragmentShader: `uniform sampler2D tWorld; uniform float uMap; uniform vec2 uTexel, uScale; varying vec2 vUv0;
      vec3 aces(vec3 c){ c *= .6; return clamp((c * (2.51 * c + .03)) / (c * (2.43 * c + .59) + .14), 0., 1.); }
      void main(){ vec2 vUv = vUv0 * uScale; vec3 c0 = texture2D(tWorld, vUv).rgb;
        vec3 nb = texture2D(tWorld, vUv + vec2(uTexel.x, 0.)).rgb + texture2D(tWorld, vUv - vec2(uTexel.x, 0.)).rgb + texture2D(tWorld, vUv + vec2(0., uTexel.y)).rgb + texture2D(tWorld, vUv - vec2(0., uTexel.y)).rgb;
        vec3 soft = c0 * .4 + nb * .15;                        // the flight: a touch of softening
        vec3 sharp = max(c0 * 1.8 - nb * .2, 0.);             // the map: crisp like the recording
        // map mode: brightness and contrast matched to the recording (measured per channel in sRGB over the same area)
        vec3 s = pow(sharp, vec3(1. / 2.2));
        s = (s - vec3(.396, .432, .284)) * vec3(1.18, 1.05, 1.08) + vec3(.440, .487, .319);
        vec3 mapc = pow(clamp(s, 0., 1.), vec3(2.2));
        gl_FragColor = vec4(mix(aces(soft * 1.55), mapc, uMap), 1.);
      #include <colorspace_fragment>
    }`,
  });
  const blit = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat); blit.frustumCulled = false; blit.renderOrder = -10; scene.add(blit);
  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /* ---------- the plane ---------- */
  const planeG = new THREE.Group(); scene.add(planeG);
  const model = new THREE.Group(); model.scale.setScalar(0.001); planeG.add(model);
  const draco = new DRACOLoader(); draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
  const gl = new GLTFLoader(); gl.setDRACOLoader(draco);
  let planeReady = false;
  afterLoad(() => gl.load('/developer/models/a350-voyeva.glb?v=2', (g) => {
    const m = g.scene; const box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3());
    m.position.sub(c); m.position.y += 1.2;
    m.traverse((o) => { if (!o.isMesh) return; const mt = o.material; if (!mt) return;
      mt.envMapIntensity = .75;
      if (mt.transparent || mt.opacity < 1) { mt.color = new THREE.Color(0x0b1016); mt.roughness = .08; mt.metalness = .6; mt.opacity = .92; }
      else { mt.roughness = .32; mt.metalness = .05; }
    });
    model.add(m); planeReady = true; schedule(); warm();
  }));
  // light that matches the world: sun through the atmosphere + bright cloud deck below
  const sunL = new THREE.DirectionalLight(0xfff1de, 2.3); scene.add(sunL); scene.add(sunL.target);
  const hemi = new THREE.HemisphereLight(0x9cc4ff, 0xe8edf4, .7); scene.add(hemi);
  scene.environment = (() => {
    const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec3 vD; void main(){ float y = vD.y; vec3 sky = mix(vec3(.55,.72,.98), vec3(.2,.38,.8), clamp(y,0.,1.));
        vec3 deck = vec3(1.05,1.06,1.1) * (.85 + .15 * smoothstep(-.05,-.6,y)); gl_FragColor = vec4(y > -.02 ? sky : deck, 1.); }` })));
    return pm.fromScene(env, 0.02).texture;
  })();
  // contrails: two soft additive cones behind the engines
  const trailMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uOpacity: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vL; void main(){ vec4 w = modelMatrix*vec4(position,1.); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); vL = uv.y; gl_Position = projectionMatrix*viewMatrix*w;
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `uniform float uOpacity; varying vec3 vN; varying vec3 vV; varying float vL;
      #include <logdepthbuf_pars_fragment>
      void main(){ float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float a = edge * smoothstep(0., .04, 1. - vL) * (1. - smoothstep(.55, 1., 1. - vL)) * .55 * uOpacity; gl_FragColor = vec4(vec3(1.)*a, a);
      #include <logdepthbuf_fragment>
      }`,
  });
  trailMat.vertexShader = '#include <common>\n#include <logdepthbuf_pars_vertex>\n' + trailMat.vertexShader;
  const trailGeo = new THREE.CylinderGeometry(0.0016, 0.034, 2.6, 24, 1, true); trailGeo.rotateX(-Math.PI / 2); trailGeo.translate(0, 0, 1.3 + 0.045);
  [-1, 1].forEach((s) => { const t = new THREE.Mesh(trailGeo, trailMat); t.position.set(s * 0.0095, -0.0009, 0); t.frustumCulled = false; planeG.add(t); });

  /* ---------- routes: screen-space lines like the recap ---------- */
  const lines = [];
  const lineMat = (color, width) => new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uRes: { value: new THREE.Vector2(1, 1) }, uWidth: { value: width }, uDraw: { value: 0 }, uHead: { value: 1 }, uOpacity: { value: 1 }, uCamDir: { value: new THREE.Vector3() } },
    vertexShader: `uniform vec2 uRes; uniform float uWidth; uniform vec3 uCamDir; attribute vec3 prev; attribute vec3 next; attribute float side; attribute float along; varying float vAlong; varying float vSide; varying float vVis;
      void main(){ mat4 m = projectionMatrix*modelViewMatrix; vec4 c = m*vec4(position,1.), a = m*vec4(prev,1.), b = m*vec4(next,1.);
        vec2 d = normalize((b.xy/b.w - a.xy/a.w) * uRes + 1e-6); vec2 n = vec2(-d.y, d.x);
        c.xy += n * side * uWidth / uRes * c.w; gl_Position = c; vAlong = along; vSide = side;
        vVis = smoothstep(-.02, .03, dot(normalize(position), uCamDir) - 6371. / max(length(cameraPosition), 6372.)); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uDraw, uHead, uOpacity; varying float vAlong; varying float vSide; varying float vVis;
      void main(){ if (vAlong > uDraw) discard; float e = 1. - smoothstep(.55, 1., abs(vSide)); float a = e * vVis * uOpacity * smoothstep(0., .004, uDraw - vAlong + .004);
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`,
  });
  const addLine = (fn, color, width, start, end, n = 400) => {
    const pos = [], prv = [], nxt = [], side = [], along = [], idx = [];
    const pts = []; for (let i = 0; i <= n; i++) pts.push(fn(i / n).multiplyScalar(R + 12));
    pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
      for (const s of [-1, 1]) { pos.push(p.x, p.y, p.z); prv.push(a.x, a.y, a.z); nxt.push(b.x, b.y, b.z); side.push(s); along.push(i / n); }
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('prev', new THREE.Float32BufferAttribute(prv, 3));
    g.setAttribute('next', new THREE.Float32BufferAttribute(nxt, 3)); g.setAttribute('side', new THREE.Float32BufferAttribute(side, 1));
    g.setAttribute('along', new THREE.Float32BufferAttribute(along, 1)); g.setIndex(idx);
    // a dark casing under a bright core keeps the route readable over white cloud
    const glow = new THREE.Mesh(g, lineMat(0x041026, width * 2.5)); glow.material.uniforms.uOpacity.value = .55; glow.frustumCulled = false;
    const core = new THREE.Mesh(g, lineMat(color, width)); core.frustumCulled = false;
    scene.add(glow, core); const L = { glow, core, start, end, fn, width }; lines.push(L); return L;
  };
  const CYAN = 0x2fc6f0, GOLD = 0xf2b02c, RED = 0xef4b4b;
  const mainLine = addLine(main, CYAN, 3.4, 0, 0);
  addLine(polyPath(ROADS.VIE_BUD), GOLD, 3, 0, .1);
  addLine(polyPath(ROADS.PEK_CKG), RED, 3, .3, .5);
  addLine(polyPath(ROADS.CKG_YSO), GOLD, 3, .42, .58);
  addLine(flightArc(P.KWL, P.KIX), CYAN, 3, .5, .7);
  addLine(polyPath(ROADS.OSA_SKG), GOLD, 3, .62, .76);
  addLine(flightArc(P.NGO, P.CTS), CYAN, 3, .7, .84);
  addLine(flightArc(P.CTS, P.VIE), CYAN, 3, .8, 1);
  const dotTex = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,.28)'; x.beginPath(); x.arc(32, 32, 30, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 15, 0, 7); x.fill(); return c; })());
  // stop names, shown as each leg reaches them
  const STOPS = [['VIE', 'Vienna', 0, -1], ['BUD', 'Budapest', 0, 1], ['PEK', 'Beijing', .3, 1], ['XIY', "Xi'an", .4, -1], ['CKG', 'Chongqing', .5, -1],
    ['KWL', 'Guilin', .55, 1], ['KIX', 'Osaka', .7, -1], ['NGO', 'Nagoya', .68, 1], ['CTS', 'Sapporo', .84, 1]].map(([k, name, at, side]) => {
    const el = document.createElement('div'); el.className = 'vs-stop' + (side < 0 ? ' vs-stop-l' : ''); el.textContent = name; clipBox.insertBefore(el, planeIcon);
    return { el, P: unit(...P[k]).multiplyScalar(R + 12), at: lerp(.3, .52, at), side }; });
  const cities = ['VIE', 'BUD', 'PEK', 'KIX', 'CTS', 'CKG', 'NGO'].map((k) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, sizeAttenuation: false, depthTest: false, transparent: true, toneMapped: false }));
    s.position.copy(unit(...P[k])).multiplyScalar(R + 12); s.scale.setScalar(.012); scene.add(s); return s; });

  /* ---------- the plane's position: never stops, ties into the recap's own timing ---------- */
  // Camera distance from the plane in act A (log-space zoom), used to set the plane's speed.
  let Dg = R * 3.3;
  const zoomD = (p) => { const s = span(p, .015, .3), e = s < .5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
    return Math.exp(lerp(Math.log(D0), Math.log(Dg - R - CRUISE), e)); };
  const VMAX = 1.456;                               // flight fraction per unit of progress in the recap
  const fTable = new Float32Array(1001);
  function buildF() {
    // speed grows with altitude until it is the recap's speed; integrate backwards from the handoff
    const sp = (p) => Math.min(VMAX, VMAX * zoomD(Math.min(p, .3)) / 900);
    fTable[700] = recF(videoT(.7));
    for (let i = 700; i > 0; i--) fTable[i - 1] = fTable[i] - sp((i - .5) / 1000) / 1000;
    for (let i = 700; i < 1000; i++) fTable[i + 1] = fTable[i] + VMAX / 1000;
  }
  const flightF = (p) => { if (p >= .7) return recF(recTime(p)); const x = clamp(p) * 1000, i = Math.min(999, Math.floor(x)); return lerp(fTable[i], fTable[i + 1], x - i); };
  const planeAt = (f, out) => out.copy(main(clamp(f, 0, 1))).multiplyScalar(R + CRUISE);

  /* ---------- sizing & phone geometry ---------- */
  // render scale for the raymarched world: starts where it settled last time on this device, then follows the frame time
  // quality ladder for the raymarched world: cloud steps go first (they cost the most), then resolution.
  // It starts where it settled last time on this device and follows the frame time from there.
  const LADDER = small ? [[.5, 40], [.45, 36], [.42, 32], [.38, 28], [.34, 24]] : [[.55, 64], [.52, 52], [.5, 44], [.46, 38], [.43, 32], [.4, 28], [.36, 24], [.32, 22]];
  const RT_KEY = 'vs-q-' + (small ? 's' : 'l'), rtMax = LADDER[0][0];
  let lvl = small ? 2 : 3; try { const v = localStorage.getItem(RT_KEY); if (v !== null) lvl = Math.min(LADDER.length - 1, Math.max(0, +v | 0)); } catch (e) {}
  let fanRect = null, rtScale = LADDER[lvl][0], ftAvg = 14, lastT = 0, adaptAt = 0, warmUntil = 0, vsync = 16.7, upAt = 0, di = 0; const dts = new Float32Array(90);
  function adapt() {
    const now = performance.now(), dt = lastT ? now - lastT : 16; lastT = now; if (dt > 200) return;
    dts[di++ % 90] = dt; if (di % 30 === 0 && di >= 90) { const q = dts.slice().sort((a, b) => a - b); vsync = Math.max(6, q[18]); }   // the display's frame interval (11.1 ms at 90 Hz): 20th percentile of the last 90 frames
    ftAvg = ftAvg * .92 + dt * .08;
    if (now < adaptAt) return;
    // relative to the refresh rate: at 90 Hz an average of 14 ms already means every third frame is dropped
    const next = ftAvg > vsync * 1.25 ? Math.min(LADDER.length - 1, lvl + 1) : ftAvg < vsync * 1.06 && now > upAt ? Math.max(0, lvl - 1) : lvl;
    if (next !== lvl) { if (next > lvl) upAt = now + 8000;   // after stepping down, hold before trying the finer level again (no flicker)
      lvl = next; rtScale = LADDER[lvl][0]; worldMat.uniforms.uSteps.value = LADDER[lvl][1]; setRt(); adaptAt = now + (now < warmUntil ? 300 : 1100); try { localStorage.setItem(RT_KEY, lvl); } catch (e) {} }
  }
  let rtW = 2, rtH = 2;
  function setRt() {
    rtW = Math.max(2, Math.min(worldRT.width, Math.round(W * DPR * rtScale))); rtH = Math.max(2, Math.min(worldRT.height, Math.round(H * DPR * rtScale)));
    worldRT.viewport.set(0, 0, rtW, rtH);
    blitMat.uniforms.uTexel.value.set(.5 / worldRT.width, .5 / worldRT.height); blitMat.uniforms.uScale.value.set(rtW / worldRT.width, rtH / worldRT.height);
  }
  function measure() {
    W = sec.clientWidth; H = clipBox.clientHeight || window.innerHeight;   // the stage itself (dynamic viewport), not innerHeight: on iOS they differ while the toolbar moves
    const tall = H / W; FOV = tall > 1 ? Math.min(54, 38 * Math.pow(tall, .45)) : 38; D0 = tall > 1 ? .085 * Math.min(1.7, Math.pow(tall, .7)) : .085;
    renderer.setSize(W, H, false);
    // allocate the world target once at the largest scale; quality changes only move its viewport (no reallocation hitch)
    const aw = Math.max(2, Math.round(W * DPR * rtMax)), ah = Math.max(2, Math.round(H * DPR * rtMax));
    if (worldRT.width < aw || worldRT.height < ah) worldRT.setSize(Math.max(aw, worldRT.width), Math.max(ah, worldRT.height));   // only ever grows: the iOS toolbar resizing the stage never reallocates
    setRt();
    worldMat.uniforms.uSteps.value = LADDER[lvl][1];
    lines.forEach((l) => [l.glow, l.core].forEach((m) => m.material.uniforms.uRes.value.set(W, H)));
    const prev = fanC.style.transform; fanC.style.transform = 'none';
    const r = fanC.getBoundingClientRect(), s = videoBox.getBoundingClientRect(), st = sec.querySelector('.vs-stage').getBoundingClientRect();
    fanC.style.transform = prev;
    const k = Math.min((H * 0.82) / r.height, (W * 0.9) / r.width);
    fanRect = { x: r.left - st.left, y: r.top - st.top, w: r.width, h: r.height, k,
      sx: (s.left - r.left) / r.width, sy: (s.top - r.top) / r.height, sw: s.width / r.width, sh: s.height / r.height };
    fanRect.k0 = Math.max(W / (fanRect.sw * r.width), H / (fanRect.sh * r.height)) * 1.02;
    Dg = R * (1 + 2.3 * Math.max(1, .9 * H / W));
    buildF();
    worldMat.uniforms.uBoost.value.copy(main(clamp(flightF(0)))).normalize();
  }

  /* ---------- frame ---------- */
  const clock = new THREE.Clock();
  const pl = new THREE.Vector3(), plAhead = new THREE.Vector3(), upL = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), north = new THREE.Vector3();
  const tmp = new THREE.Vector3(), camPos = new THREE.Vector3(), target = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  let videoArmed = false, videoPrimed = false, recPainted = false, armT = 0;
  const seekT0 = () => { try { video.currentTime = T0; } catch (e) {} };
  const primeVideo = () => { video.preload = 'auto'; video.pause(); if (video.readyState >= 1) seekT0(); else { video.addEventListener('loadedmetadata', seekT0, { once: true }); video.load(); } };
  const kmAcross = 1300;                            // the recap shows about 1,300 km across the screen
  // the recap's map: Mercator, north up, 20.04 degrees of longitude across the screen (measured: 27.55 px per degree on 552 px);
  // the plane drifts slightly on screen during the clip, ANCHOR follows the measured position
  const MERC_W = 20.04, ANCHOR = recA(T0);
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + lat * DEG / 2));
  let scr = { x: 0, y: 0, w: 1, h: 1 }, mercK = 0;
  const pv = new THREE.Vector3();
  function toScreen(P, out) {
    pv.copy(P).project(camera); let x = (pv.x * .5 + .5) * W, y = (-pv.y * .5 + .5) * H;
    if (mercK > 0) { const ll = toLL(P), pll = planeLL;
      const mx = scr.x + (ANCHOR[0] + (ll.lon - pll.lon) / MERC_W) * scr.w;
      const my = scr.y + (ANCHOR[1] + (merc(pll.lat) - merc(ll.lat)) / (scr.h * (MERC_W / scr.w) * DEG)) * scr.h;
      x = lerp(x, mx, mercK); y = lerp(y, my, mercK); }
    out[0] = x; out[1] = y; return out; }
  let planeLL = { lat: 0, lon: 0 };

  function frameCamera(p, t) {
    const f = flightF(p);
    planeAt(f, pl); planeAt(f + .002, plAhead);
    upL.copy(pl).normalize(); fwd.subVectors(plAhead, pl).normalize(); right.crossVectors(fwd, upL).normalize(); fwd.crossVectors(upL, right).normalize();
    north.copy(Y).addScaledVector(upL, -upL.y).normalize();
    // plane orientation (nose = -Z of the model), a breath of roll
    const roll = Math.sin(t * .5) * .018 * (1 - span(p, .02, .12));
    const r2 = right.clone().applyAxisAngle(fwd, roll), u2 = upL.clone().applyAxisAngle(fwd, roll);
    planeG.matrixAutoUpdate = false; planeG.matrix.makeBasis(r2, u2, fwd.clone().negate()).setPosition(pl); planeG.matrixWorldNeedsUpdate = true;

    camera.clearViewOffset(); camera.fov = FOV; camera.aspect = W / H;
    let viewOffset = null;
    if (p < .3) {
      // Act A: a log-space pull back from behind the plane to straight above it, then up into space
      const d = zoomD(p), ld = Math.log(d);
      const k = ease(clamp((ld - Math.log(0.1)) / (Math.log(45) - Math.log(0.1))));
      const el = lerp(11, 90, k) * DEG, az = lerp(H > W ? -12 : -26, 0, k) * DEG;
      const back = fwd.clone().negate().applyAxisAngle(upL, az);
      camPos.copy(pl).addScaledVector(back, Math.cos(el) * d).addScaledVector(upL, Math.sin(el) * d);
      const lift = 0.006 * (1 - k);                 // the plane sits a little below centre at first
      target.copy(pl).addScaledVector(upL, lift).addScaledVector(fwd, 0.02 * (1 - k));
      camera.position.copy(camPos);
      const topK = ease(clamp((el / DEG - 55) / 35));
      camera.up.copy(upL).lerp(north, topK).normalize();
      camera.lookAt(target);
    } else {
      // Act B/C: over the globe; drift to frame the trip, then dive onto the plane in recap framing
      const ll0 = toLL(planeAt(flightF(.3), tmp));
      const b = easeIO(span(p, .3, .44)), b2 = easeIO(span(p, .44, .56)), cs = span(p, .555, .7), c = .5 - .5 * Math.cos(Math.PI * cs);
      let lat = lerp(ll0.lat, 47, b), lon = lerp(ll0.lon, 76, b), dist = Dg;
      lat = lerp(lat, 48, b2); lon = lerp(lon, 88, b2); dist = lerp(dist, Dg * .94, b2);
      // recap framing: the plane at 55% across the screen, ~1,300 km across it
      const k0 = fanRect ? fanRect.k0 : 1, scrW = fanRect ? fanRect.sw * fanRect.w * k0 : W;
      const hfov = 2 * Math.atan(Math.tan(FOV * DEG / 2) * W / H);
      const kmView = kmAcross * W / scrW, hH = kmView / (2 * Math.tan(hfov / 2));
      const pll = toLL(pl), dLon = (.05 * kmAcross) / (111.32 * Math.cos(pll.lat * DEG));
      const cl = .5 - .5 * Math.cos(Math.PI * Math.min(1, cs * 1.25));
      lat = lerp(lat, pll.lat, cl); lon = lerp(lon, pll.lon - dLon, cl); dist = R + Math.exp(lerp(Math.log(dist - R), Math.log(hH), c));
      camera.position.copy(unit(lat, lon)).multiplyScalar(dist);
      camera.up.copy(Y); camera.lookAt(0, 0, 0);
      // Act D: pull out of the phone. The camera keeps the recap framing; the image shrinks with the screen.
      if (p > .7 && fanRect) {
        const kk = revealScale(p), { sw, sh, sx, sy, w, h } = fanRect;
        const sW = sw * w * kk, sH = sh * h * kk;
        const cx = W / 2 + ((sx + sw / 2) - .5) * w * kk, cy = H / 2 + ((sy + sh / 2) - .5) * h * kk;
        const f0 = (H / 2) / Math.tan(FOV * DEG / 2), fpx = f0 * kk / fanRect.k0;
        camera.fov = 2 * Math.atan((sH / 2) / fpx) / DEG; camera.aspect = sW / sH;
        camera.setViewOffset(sW, sH, -(cx - sW / 2), -(cy - sH / 2), W, H);
        viewOffset = { x: cx - sW / 2, y: cy - sH / 2, w: sW, h: sH, kk };
      }
    }
    const alt = camera.position.length() - R;
    camera.near = Math.max(0.0015, Math.min(alt * .25, camera.position.distanceTo(pl) * .3));
    camera.far = 4 * (alt + R) + 2e4;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    return { f, viewOffset, alt, d: camera.position.distanceTo(pl) };
  }
  const revealScale = (p) => fanRect ? lerp(fanRect.k0, fanRect.k, easeIO(span(p, .7, .785))) : 1;

  // inline styles are written only when they change: Chrome recalculates style for every write, even of the same value,
  // and at 90 Hz the scene's labels, captions and plane rewrote theirs every frame (a quarter of all frames came late)
  const S = (el, k, v) => { v = typeof v === 'number' ? String(+v.toFixed(4)) : String(v); const c = el._sv || (el._sv = {}); if (c[k] !== v) { c[k] = v; el.style[k] = v; } };
  function render() {
    const p = progress, t = clock.getElapsedTime();
    if (p >= .6) drawHand(clamp(Math.round((videoT(p) - 3.8) * 30), 0, HN - 1));   // before the camera: the flight follows the frame on screen
    const { f, viewOffset, alt, d } = frameCamera(p, t);
    const u = worldMat.uniforms;
    planeLL = toLL(pl);
    if (fanRect) { const kk = revealScale(p), { sw, sh, sx, sy, w, h } = fanRect, sW = sw * w * kk, sH = sh * h * kk;
      const cx = W / 2 + ((sx + sw / 2) - .5) * w * kk, cy = H / 2 + ((sy + sh / 2) - .5) * h * kk; scr = { x: cx - sW / 2, y: cy - sH / 2, w: sW, h: sH }; }
    mercK = easeIO(span(p, .63, .7));
    const an = recA(p < .7 ? T0 : recTime(p)); ANCHOR[0] = an[0]; ANCHOR[1] = an[1]; u.ANCHOR.value.set(an[0], an[1]);
    u.uMerc.value = mercK; u.uPlaneLL.value.set(planeLL.lat, planeLL.lon); u.uScr.value.set(scr.x, scr.y, scr.w, scr.h);
    u.uRtScale.value = rtW / W; u.uVpH.value = H;
    u.uInvProj.value.copy(camera.projectionMatrixInverse); u.uCamRot.value.setFromMatrix4(camera.matrixWorld);
    u.uUp.value.copy(camera.position).normalize(); u.uAlt.value = alt; u.uTime.value = t;
    u.uWind.value.copy(fwd).multiplyScalar(-t * .22);           // the deck streams under the plane: ~800 km/h
    u.uDetail.value = 1 - span(Math.log(alt), Math.log(60), Math.log(900));
    u.uFine.value = 1 - span(Math.log(alt), Math.log(14), Math.log(60));
    u.uFar.value = span(Math.log(alt), Math.log(300), Math.log(4000));
    u.uSat.value = ease(span(Math.log(alt), Math.log(220), Math.log(2200)));
    u.uCloudAmt.value = window.__noClouds ? 0 : 1;
    u.uCloudVis.value = 1 - easeIO(span(p, .6, .67));            // the recap's map has no clouds
    u.uBoostAmt.value = 1 - span(p, .16, .3);
    u.uMap.value = blitMat.uniforms.uMap.value = easeIO(span(p, .62, .69));
    // the plane: real model while it is big enough, then the recap's icon
    const fpx = (H / 2) / Math.tan(camera.fov * DEG / 2) * (viewOffset ? 1 : 1);
    const planePx = 0.067 * fpx / Math.max(d, 1e-4);
    const modelK = clamp((planePx - 22) / 26);
    planeG.visible = planeReady && modelK > 0.001;
    if (planeG.visible) model.traverse((o) => { if (!o.isMesh) return; const m = o.material, o0 = m.userData.o ?? (m.userData.o = m.opacity);
      m.opacity = o0 * modelK; const tr = o0 < 1 || modelK < .999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.depthWrite = !tr || o0 >= 1; });
    trailMat.uniforms.uOpacity.value = modelK * (1 - span(Math.log(d), Math.log(1.5), Math.log(6)));
    sunL.position.copy(pl).addScaledVector(sunDir, 50); sunL.target.position.copy(pl); sunL.target.updateMatrixWorld();

    // lines: the flown part of Budapest → Beijing trails the plane; the rest of the trip draws itself
    const camDir = tmp.copy(camera.position).normalize();
    const lineK = span(Math.log(d), Math.log(60), Math.log(400));
    const wScale = viewOffset ? 1 : 1;
    mainLine.core.material.uniforms.uDraw.value = mainLine.glow.material.uniforms.uDraw.value = clamp(f);
    for (const L of lines) {
      const k = L === mainLine ? 1 : span(p, lerp(.3, .52, L.start), lerp(.3, .52, L.end));
      if (L !== mainLine) { L.core.material.uniforms.uDraw.value = L.glow.material.uniforms.uDraw.value = k; }
      const fade = L === mainLine ? lineK : lineK * (1 - easeIO(span(p, .6, .68)));
      L.core.material.uniforms.uOpacity.value = fade; L.glow.material.uniforms.uOpacity.value = .55 * fade * (1 - span(p, .62, .7));
      [L.core, L.glow].forEach((m) => { m.material.uniforms.uCamDir.value.copy(camDir); m.material.uniforms.uWidth.value = (m === L.glow ? L.width * 2.5 : L.width) * wScale; m.visible = fade > .002; });
    }
    const svgOn = p >= .62;
    if (svgOn) { mainLine.core.visible = mainLine.glow.visible = false; }
    S(routeSvg, 'display', svgOn && p < .79 ? '' : 'none');
    if (svgOn && p < .79) {
      routeSvg.setAttribute('width', W); routeSvg.setAttribute('height', H); routeSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const pts = [], q = [0, 0], N = 240, rr = R / camera.position.length(), cd = camera.position.clone().normalize();
      for (let i = 0; i <= N; i++) { const a = Math.min(f, i / N * f); const P = main(a).multiplyScalar(R + 12);
        if (mercK < .5 && P.clone().normalize().dot(cd) < rr) continue; toScreen(P, q); pts.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); }
      toScreen(pl, q); pts.push(q[0].toFixed(1) + ',' + q[1].toFixed(1));
      const lw = lerp(3.4, .0127 * scr.w, span(p, .7, .78));
      routeCore.setAttribute('points', pts.join(' ')); routeGlow.setAttribute('points', pts.join(' '));
      routeCore.setAttribute('stroke-width', lw); routeGlow.setAttribute('stroke-width', lw * 2.5);
      routeGlow.setAttribute('stroke-opacity', (.55 * (1 - span(p, .62, .7))).toFixed(3));
    }
    const stopVis = lineK * (1 - span(p, .58, .64));
    STOPS.forEach((st) => { const vis = stopVis * span(p, st.at, st.at + .02) * (st.P.clone().normalize().dot(camDir) > R / camera.position.length() + .02 ? 1 : 0);
      S(st.el, 'opacity', vis.toFixed(3)); if (vis <= 0) return;
      const v = st.P.clone().project(camera); S(st.el, 'transform', `translate(${((v.x * .5 + .5) * W).toFixed(1)}px, ${((-v.y * .5 + .5) * H).toFixed(1)}px)`); });
    cities.forEach((s) => { s.material.opacity = lineK * (1 - span(p, .6, .68)) * (s.position.clone().normalize().dot(camDir) > R / camera.position.length() ? 1 : 0); s.visible = s.material.opacity > 0; });

    // keep the globe until the recording clip really has a frame on screen (iOS decodes late): never a see-through phone
    const handOk = handDrawn >= 0, recOk = videoArmed && video.readyState >= 2 && !video.seeking && (recPainted || video.currentTime > armT + .1);
    if (p < .792 || (p < .8 && !handOk)) { renderer.setRenderTarget(worldRT); renderer.render(worldScene, orthoCam); renderer.setRenderTarget(null); renderer.render(scene, camera); }

    // plane icon (projected), same white plane as the recap
    const s0 = toScreen(pl, [0, 0]), s1 = toScreen(planeAt(f + .004, plAhead), [0, 0]);
    const px = s0[0], py = s0[1];
    const ang = Math.atan2(s1[1] - s0[1], s1[0] - s0[0]) + Math.PI / 2;
    const iconW = lerp(24, .054 * scr.w, span(p, .7, .78));   // grows by scale, not width: a width change is a layout pass every frame
    S(planeIcon, 'transform', `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -50%) rotate(${ang.toFixed(3)}rad) scale(${(iconW / 26).toFixed(3)})`);
    S(planeIcon, 'opacity', (1 - clamp((planePx - 22) / 26)) * span(p, .03, .05) * (1 - span(p, .775, .79)));

    // Act D/E: the phone, the recap video, the fan
    const settle = easeIO(span(p, .783, .88));
    if (fanRect) {
      const { x, y, w, h, k, sx, sy, sw, sh } = fanRect, cx = W / 2, cy = H / 2;
      const kk = settle > 0 ? lerp(k, 1, settle) : revealScale(p);
      const tx = lerp(cx - (x + w / 2), 0, settle), ty = lerp(cy - (y + h / 2), 0, settle);
      const bump = Math.sin(Math.PI * settle), bob = settle >= 1 ? Math.sin(t * 1.2) * 5 : 0;
      S(fanC, 'transform', `translate(${tx}px, ${ty + bob}px) scale(${kk}) rotateY(${-16 * bump}deg) rotateZ(${-4 * bump}deg)`);
      S(fanC, 'opacity', p > .7 ? 1 : 0);
      if (viewOffset) {
        const v = viewOffset, ins = { t: Math.max(0, v.y), l: Math.max(0, v.x), r: Math.max(0, W - v.x - v.w), b: Math.max(0, H - v.y - v.h) };
        S(clipBox, 'clipPath', `inset(${ins.t}px ${ins.r}px ${ins.b}px ${ins.l}px round ${v.w * .13 * span(p, .7, .74)}px)`);
      } else S(clipBox, 'clipPath', 'none');
      S(clipBox, 'opacity', handOk ? 1 - span(p, .772, .783) : 1);
      // the recap's own chrome (status bar, title, distance, controls) comes in from the screen edges
      const band = span(p, .705, .75), mid = span(p, .755, .779);
      const mask = `linear-gradient(to bottom, #000 0, #000 12%, rgba(0,0,0,${mid}) 18%, rgba(0,0,0,${mid}) 72%, #000 79%)`;
      { const mv = mid >= 1 ? 'none' : mask; S(hand, 'webkitMaskImage', mv); S(hand, 'maskImage', mv); }
      S(hand, 'opacity', band);
      const sl = easeIO(span(p, .79, .87)), sr = easeIO(span(p, .8, .88));
      const side = (s2, dir) => `translateX(${dir * 64 * s2}%) translateY(${36 * s2 + (s2 >= 1 ? Math.sin(t * 1.2 + dir) * 4 : 0)}px) rotate(${dir * 9 * s2}deg) rotateY(${-dir * 18 * s2}deg) scale(${.8 + .2 * s2})`;
      S(fanL, 'transform', side(sl, -1)); S(fanR, 'transform', side(sr, 1));
      S(fanL, 'opacity', span(p, .788, .82)); S(fanR, 'opacity', span(p, .796, .83));
      S(endCard, 'opacity', span(p, .74, .79));
      S(endText, 'opacity', span(p, .79, .85)); S(endText, 'transform', `translateY(${(1 - span(p, .79, .85)) * 40}px)`);
    }
    if (p > .55 && !videoPrimed) { videoPrimed = true; primeVideo(); }
    if (p > .3) loadHand();
    if (p < .8) { S(video, 'visibility', 'hidden'); S(video, 'opacity', 0); if (videoArmed) { videoArmed = false; video.pause(); } }
    else {
      S(video, 'visibility', 'visible'); S(video, 'opacity', recOk ? 1 : 0); S(hand, 'opacity', recOk ? 0 : 1);   // the last still stays until the recording is really playing
      if (!videoArmed && video.readyState >= 1) { videoArmed = true; recPainted = false; armT = videoT(.8); try { video.currentTime = armT; } catch (e) {} video.play().catch(() => {}); }
    }
    caps.forEach((el) => { const a = +el.dataset.a, b = +el.dataset.b; const o = span(p, a, a + .03) * (1 - span(p, b - .03, b)); S(el, 'opacity', o); S(el, 'transform', `translateY(${(1 - span(p, a, a + .03)) * 24}px)`); });
    return p < .79 || p > .99;
  }
  function recapIconW() { return fanRect ? fanRect.sw * fanRect.w * fanRect.k * .066 : 24; }

  /* ---------- loop ---------- */
  let active = false, raf = 0;
  const loop = () => { raf = 0; if (!active) return; render(); if (progress < .79) adapt(); else lastT = 0; raf = requestAnimationFrame(loop); };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(loop); };
  measure();
  const onResize = (fn) => { let w = innerWidth, t = 0; const touch = matchMedia('(pointer: coarse)').matches; addEventListener('resize', () => { clearTimeout(t); if (!touch || innerWidth !== w) { w = innerWidth; fn(); } else t = setTimeout(fn, 250); }, { passive: true }); };   // phones: the address bar sliding in and out only changes the height; apply that once it has settled, not mid-scroll
  onResize(() => { measure(); schedule(); });
  // the frame the recording clip is actually showing drives the flight while both are on screen
  // the recording counts as on screen once it has presented a frame after the seek, or its clock is visibly running
  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) { const vcb = (now, md) => { if (videoArmed && !recPainted && md.mediaTime >= armT - .02) { recPainted = true; schedule(); } video.requestVideoFrameCallback(vcb); }; video.requestVideoFrameCallback(vcb); }
  ['loadeddata', 'seeked', 'playing', 'timeupdate'].forEach((ev) => video.addEventListener(ev, () => schedule()));   // the recording becoming ready repaints at once
  // back from the background: the browser may have paused the recording or dropped the GL context; pick both up again
  const wake = () => { if (document.hidden) return; if (videoArmed && video.paused) video.play().catch(() => {}); if (active) { lastT = 0; schedule(); } };
  document.addEventListener('visibilitychange', wake); addEventListener('pageshow', wake);
  canvas.addEventListener('webglcontextrestored', () => schedule());
  video.dataset.manual = '1';
  if (reduce) { progress = 1; active = true; render(); active = false; return; }
  ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: (st) => { active = st.isActive; if (active) { loadHand(); warmUntil = performance.now() + 2500; lastT = 0; schedule(); } } });
  ScrollTrigger.create({ trigger: sec, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'vs-active' } });
  ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { progress = st.progress; schedule(); }, onRefresh: () => measure() });
  window.voyevaScene = { seek: (p) => { progress = p; render(); }, measure, u: worldMat.uniforms, lines, camera, renderer, scene, blit, state: () => ({ p: progress, f: flightF(progress), alt: camera.position.length() - R }) };
}

/* Tileable 3D noise, RGBA8: R = Perlin-Worley (cloud body), G/B/A = Worley fbm at rising frequency (erosion). */
function noiseData(N) {
  const data = new Uint8Array(N * N * N * 4);
  const hash = (x, y, z, s) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const worley = (cells, seed) => {
    const pts = new Float32Array(cells * cells * cells * 3);
    for (let i = 0; i < cells ** 3; i++) for (let k = 0; k < 3; k++) pts[i * 3 + k] = hash(i, k, cells, seed);
    const out = new Float32Array(N * N * N), cs = N / cells;
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const fx = x / cs, fy = y / cs, fz = z / cs, cx = Math.floor(fx), cy = Math.floor(fy), cz = Math.floor(fz); let md = 9;
      for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const ix = cx + dx, iy = cy + dy, iz = cz + dz, w = ((ix + cells) % cells) + ((iy + cells) % cells) * cells + ((iz + cells) % cells) * cells * cells;
        const ex = ix + pts[w * 3] - fx, ey = iy + pts[w * 3 + 1] - fy, ez = iz + pts[w * 3 + 2] - fz, dd = ex * ex + ey * ey + ez * ez; if (dd < md) md = dd; }
      out[x + y * N + z * N * N] = 1 - Math.min(1, Math.sqrt(md));
    }
    return out;
  };
  const value = (cells, seed) => {
    const out = new Float32Array(N * N * N), cs = N / cells, q = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const fx = x / cs, fy = y / cs, fz = z / cs, ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz), u = q(fx - ix), v = q(fy - iy), w = q(fz - iz);
      const g = (a, b, c) => hash((a + cells) % cells, (b + cells) % cells, (c + cells) % cells, seed);
      const l = (a, b, t) => a + (b - a) * t;
      out[x + y * N + z * N * N] = l(l(l(g(ix, iy, iz), g(ix + 1, iy, iz), u), l(g(ix, iy + 1, iz), g(ix + 1, iy + 1, iz), u), v),
        l(l(g(ix, iy, iz + 1), g(ix + 1, iy, iz + 1), u), l(g(ix, iy + 1, iz + 1), g(ix + 1, iy + 1, iz + 1), u), v), w);
    }
    return out;
  };
  const w4 = worley(4, 1), w8 = worley(8, 2), w16 = worley(16, 3), w32 = worley(32, 4);
  const v4 = value(4, 5), v8 = value(8, 6), v16 = value(16, 7);
  for (let i = 0; i < N * N * N; i++) {
    const perlin = v4[i] * .55 + v8[i] * .3 + v16[i] * .15;
    const wf = w4[i] * .625 + w8[i] * .25 + w16[i] * .125;
    const pw = Math.min(1, Math.max(0, (perlin - (wf - 1)) / (1 - (wf - 1)) * .9 - .25));
    data[i * 4] = pw * 255; data[i * 4 + 1] = (w8[i] * .625 + w16[i] * .25 + w32[i] * .125) * 255;
    data[i * 4 + 2] = (w16[i] * .625 + w32[i] * .375) * 255; data[i * 4 + 3] = w32[i] * 255;
  }
  return data;
}
// The noise takes ~250 ms to build: do it in a worker so the page never stalls; the texture fills in when it arrives.
function makeNoise3D(N, done) {
  const t = new THREE.Data3DTexture(new Uint8Array(N * N * N * 4), N, N, N);
  t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; t.minFilter = t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping; t.unpackAlignment = 1; t.needsUpdate = true;
  const fill = (d) => { t.image.data = d; t.needsUpdate = true; done && done(); };
  try {
    const src = `const noiseData = ${noiseData.toString()}; onmessage = (e) => { const d = noiseData(e.data); postMessage(d, [d.buffer]); };`;
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    w.onmessage = (e) => { fill(e.data); w.terminate(); }; w.onerror = () => setTimeout(() => fill(noiseData(N))); w.postMessage(N);
  } catch (e) { setTimeout(() => fill(noiseData(N))); }
  return t;
}

const WORLD_FRAG = /* glsl */`
precision highp float; precision highp sampler3D;
in vec2 vUv; out highp vec4 fragOut;
uniform mat4 uInvProj; uniform mat3 uCamRot; uniform vec3 uUp; uniform float uAlt; uniform vec3 uSun; uniform float uTime;
uniform highp sampler3D uNoise; uniform sampler2D uSatG, uSatC, uGroundG, uGroundC, uGroundP, uCloudG, uCloudC, uStars; uniform vec4 uCorr, uCCorr, uPatch;
uniform float uSat, uFar, uCloudVis, uCloudAmt, uDetail, uSteps, uBoostAmt, uExposure, uDebug, uMap, uFine, uMerc, uRtScale, uVpH; uniform vec2 uPlaneLL; uniform vec4 uScr;
uniform float MERC_W; uniform vec2 ANCHOR; uniform vec3 uWind, uBoost;
const float R = 6371.; const float CB = 1.4; const float CT = 7.8; const float AT = 70.;
const float PI = 3.14159265;
const vec3 BR = vec3(5.8e-3, 13.5e-3, 33.1e-3); const float BMIE = 2.2e-3; const float HR = 8.; const float HM = 1.2;
const vec3 SUN = vec3(1., .96, .9) * 18.;

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float remap(float v, float a, float b, float c, float d){ return c + (v - a) / (b - a) * (d - c); }
// ray from the camera (|o| = R + alt, unit up) against a sphere of radius R + hs
vec2 sph(float alt, float mu, float hs){ float r = R + alt, b = r * mu, c = (alt - hs) * (2. * R + alt + hs), D = b * b - c; if (D < 0.) return vec2(-1.); float s = sqrt(D); return vec2(-b - s, -b + s); }
// precise altitude of the point at distance t along the ray
float altAt(float t, float mu){ float r = R + uAlt; float q = uAlt * (2. * R + uAlt) + t * (2. * r * mu + t); return q / (sqrt(R * R + q) + R); }
vec3 unitLL(float lat, float lon){ float phi = (90. - lat) * PI / 180., th = (lon + 180.) * PI / 180.; return vec3(-sin(phi) * cos(th), cos(phi), sin(phi) * sin(th)); }
vec2 latlon(vec3 n){ float lat = asin(clamp(n.y, -1., 1.)); float lon = atan(n.z, -n.x) - PI; if (lon < -PI) lon += 2. * PI; return vec2(lat, lon) * (180. / PI); }
vec3 groundCol(vec3 n){ vec2 ll = latlon(n); vec3 g = texture(uGroundG, vec2((ll.y + 180.) / 360., (ll.x + 90.) / 180.)).rgb;
  vec2 cu = vec2((ll.y - uCorr.x) / (uCorr.y - uCorr.x), (ll.x - uCorr.z) / (uCorr.w - uCorr.z));
  float inC = smoothstep(0., .02, cu.x) * (1. - smoothstep(.98, 1., cu.x)) * smoothstep(0., .04, cu.y) * (1. - smoothstep(.96, 1., cu.y));
  if (inC > 0.) g = mix(g, texture(uGroundC, cu).rgb, inC);
  vec2 pu = vec2((ll.y - uPatch.x) / (uPatch.y - uPatch.x), (ll.x - uPatch.z) / (uPatch.w - uPatch.z));
  float inP = smoothstep(0., .03, pu.x) * (1. - smoothstep(.97, 1., pu.x)) * smoothstep(0., .03, pu.y) * (1. - smoothstep(.97, 1., pu.y));
  if (inP > 0.) g = mix(g, texture(uGroundP, pu).rgb, inP);
  return g; }
// the real Earth of 13 March 2026 (NOAA-20, NOAA-21, Suomi NPP VIIRS true colour, median of the three), clouds included
vec3 satCol(vec3 n){ vec2 ll = latlon(n); vec3 g = texture(uSatG, vec2((ll.y + 180.) / 360., (ll.x + 90.) / 180.)).rgb;
  vec2 cu = vec2((ll.y - uCorr.x) / (uCorr.y - uCorr.x), (ll.x - uCorr.z) / (uCorr.w - uCorr.z));
  float inC = smoothstep(0., .02, cu.x) * (1. - smoothstep(.98, 1., cu.x)) * smoothstep(0., .04, cu.y) * (1. - smoothstep(.96, 1., cu.y));
  if (inC > 0.) g = mix(g, texture(uSatC, cu).rgb, inC); return g; }
float coverRaw(vec3 n){ vec2 ll = latlon(n); float c = texture(uCloudG, vec2((ll.y + 180.) / 360., (ll.x + 90.) / 180.)).r;
  vec2 cu = vec2((ll.y - uCCorr.x) / (uCCorr.y - uCCorr.x), (ll.x - uCCorr.z) / (uCCorr.w - uCCorr.z));
  float inC = smoothstep(0., .02, cu.x) * (1. - smoothstep(.98, 1., cu.x)) * smoothstep(0., .04, cu.y) * (1. - smoothstep(.96, 1., cu.y));
  if (inC > 0.) c = mix(c, texture(uCloudC, cu).r, inC);
  return c; }
float cover(vec3 n){ float raw = coverRaw(n);
  if (uFar > .3) { vec3 t1 = normalize(cross(n, vec3(0., 1., 0.)) + 1e-4), t2 = cross(n, t1); float e = .0016; raw = mix(raw, (raw + coverRaw(normalize(n + t1 * e)) + coverRaw(normalize(n - t1 * e)) + coverRaw(normalize(n + t2 * e)) + coverRaw(normalize(n - t2 * e))) / 5., uFar); }
  float c = smoothstep(mix(.78, .74, uFar), mix(1.06, 1.16, uFar), raw + (texture(uNoise, n * 41.).r - .5) * .06 * (1. - uFar));
  // a broad, ragged weather system under the plane at the start (low-frequency noise, not a disc)
  float ang = acos(clamp(dot(n, uBoost), -1., 1.));
  vec4 wn = texture(uNoise, n * 9.); vec4 wn2 = texture(uNoise, n * 31. + .3);
  float field = max(smoothstep(.26, .58, wn.r * .7 + wn2.g * .45), (1. - smoothstep(.002, .012, ang)) * .8) * (1. - smoothstep(.02, .085, ang + (wn.g - .5) * .05));
  c = max(c, field * uBoostAmt * .74);
  return c * uCloudAmt; }
float density(vec3 p, float h, float cov, bool detail){
  float hf = (h - CB) / (CT - CB); if (hf <= 0. || hf >= 1. || cov < .01) return 0.;
  float top = mix(.28, 1., cov);
  float shape = smoothstep(0., .07, hf) * (1. - smoothstep(top * .5, top, hf));
  vec4 n = texture(uNoise, p * (1. / 22.) + uWind * (1. / 22.) * .3);
  float wf = n.g * .625 + n.b * .25 + n.a * .125;
  float base = mix(1., remap(n.r, wf - 1., 1., 0., 1.), uDetail * .9 + .1);
  float d = clamp(remap(base * shape, 1. - cov, 1., 0., 1.), 0., 1.) * cov;
  if (detail && d > 0. && uDetail > .01) {
    vec4 m = texture(uNoise, p * (1. / 3.1) + uWind * (1. / 3.1));
    float df = m.g * .625 + m.b * .25 + m.a * .125; df = mix(df, 1. - df, clamp(hf * 3., 0., 1.));
    d = clamp(remap(d, df * .34 * uDetail, 1., 0., 1.), 0., 1.);
    if (uFine > .01 && d > 0.) { vec4 f = texture(uNoise, p * (1. / .75) + uWind * (1. / .75) * 1.2); float ff = f.g * .6 + f.b * .4;
      d = clamp(remap(d, ff * .1 * uFine, 1., 0., 1.), 0., 1.); }
  }
  return d;
}
const float LS[51] = float[51](0.0000,0.0667,0.0784,0.0863,0.0941,0.1059,0.1216,0.1412,0.1725,0.2078,0.2549,0.3137,0.3804,0.4471,0.5098,0.5686,1.0000,0.0000,0.1216,0.1333,0.1412,0.1490,0.1569,0.1686,0.1843,0.2000,0.2235,0.2510,0.2902,0.3373,0.3882,0.4392,0.4902,1.0000,0.0000,0.0235,0.0314,0.0353,0.0431,0.0510,0.0588,0.0667,0.0824,0.1059,0.1333,0.1725,0.2157,0.2627,0.3098,0.3529,1.0000);
const float LD[51] = float[51](0.1388,0.2314,0.2549,0.2745,0.2902,0.3059,0.3216,0.3333,0.3529,0.3686,0.3922,0.4157,0.4392,0.4667,0.4980,0.5412,0.6386,0.1882,0.3137,0.3412,0.3569,0.3686,0.3804,0.3882,0.3961,0.4078,0.4157,0.4275,0.4353,0.4471,0.4627,0.4824,0.5137,0.6062,0.1059,0.1765,0.1922,0.2039,0.2118,0.2235,0.2314,0.2392,0.2471,0.2588,0.2706,0.2824,0.2980,0.3137,0.3333,0.3686,0.4349);
float lutc(float x, int c){ int b = c * 17; for (int i = 0; i < 16; i++) { float a = LS[b + i], z = LS[b + i + 1]; if (x <= z || i == 15) return mix(LD[b + i], LD[b + i + 1], clamp((x - a) / max(z - a, 1e-4), 0., 1.)); } return x; }
float hg(float c, float g){ float g2 = g * g; return (1. - g2) / (4. * PI * pow(1. + g2 - 2. * g * c, 1.5)); }
// single-scattering atmosphere between t0 and t1 along the ray; returns inscatter, writes transmittance
vec3 atmo(vec3 o, vec3 d, float mu, float t0, float t1, out vec3 T){
  T = vec3(1.); vec3 L = vec3(0.); if (t1 <= t0) return L;
  float cs = dot(d, uSun), pR = 3. / (16. * PI) * (1. + cs * cs), pM = hg(cs, .76);
  const int N = 10; float dt = (t1 - t0) / float(N); vec3 od = vec3(0.);
  for (int i = 0; i < N; i++) {
    float t = t0 + (float(i) + .5) * dt; float h = max(0., altAt(t, mu));
    float rR = exp(-h / HR), rM = exp(-h / HM);
    vec3 p = o + d * t; vec3 up = normalize(p); float muS = dot(up, uSun);
    // optical depth to the sun (Chapman-like approximation)
    float ch = 1. / max(muS + .15 * pow(max(0., 1.05 - muS), 2.5), .03);
    vec3 odS = (BR * HR * rR + BMIE * 1.1 * HM * rM) * ch;
    float lit = smoothstep(-.12, .04, muS);
    vec3 ext = BR * rR + BMIE * 1.1 * rM; od += ext * dt;
    vec3 tr = exp(-od - odS) * lit;
    L += tr * (BR * rR * pR + BMIE * rM * pM) * dt;
  }
  T = exp(-od);
  return L * SUN * .5;
}
void main(){
  if (uMap >= .999 && uMerc >= .999) {
    vec2 css = vec2(gl_FragCoord.x / uRtScale, uVpH - gl_FragCoord.y / uRtScale); vec2 fu = (css - uScr.xy) / uScr.zw;
    float lonM = uPlaneLL.y + (fu.x - ANCHOR.x) * MERC_W; float mP = log(tan(PI / 4. + uPlaneLL.x * PI / 360.));
    float latM = (2. * atan(exp(mP - (fu.y - ANCHOR.y) * uScr.w * (MERC_W / uScr.z) * PI / 180.)) - PI / 2.) * 180. / PI;
    vec3 g = pow(groundCol(unitLL(latM, lonM)), vec3(1. / 2.2)); vec3 gm = vec3(lutc(g.r, 0), lutc(g.g, 1), lutc(g.b, 2));
    fragOut = vec4(pow(clamp(gm, 0., 1.), vec3(2.2)), 1.); return;
  }
  vec4 v = uInvProj * vec4(vUv * 2. - 1., 1., 1.); vec3 d = normalize(uCamRot * (v.xyz / v.w));
  vec3 up = uUp; vec3 o = up * (R + uAlt); float mu = dot(up, d);
  vec2 eH = sph(uAlt, mu, 0.); float tE = eH.x > 0. ? eH.x : -1.;
  vec2 aH = sph(uAlt, mu, AT); float tA0 = max(0., aH.x), tA1 = tE > 0. ? tE : aH.y;
  // --- surface or space
  vec3 Ls;
  if (tE > 0.) {
    vec3 n = normalize(o + d * tE); vec3 g = groundCol(n);
    if (uSat > 0.) g = mix(g, pow(satCol(n), vec3(1.12)) * 1.04, uSat);
    float ndl = dot(n, uSun); float day = smoothstep(-.1, .2, ndl);
    vec3 gs = pow(g, vec3(1. / 2.2)); float water = smoothstep(.03, .1, gs.b - gs.r) * (1. - smoothstep(.15, .35, dot(gs, vec3(.33))));
    float sh = 1. - .7 * cover(normalize(n + uSun * .0012)) * uCloudVis * (1. - uSat);
    vec3 col = g * 1.35;
    Ls = col * (SUN * .1 * max(ndl, 0.) * sh + vec3(.12, .16, .24) * day * .5);
    vec3 hv = normalize(uSun - d); Ls += water * SUN * .05 * pow(max(dot(n, hv), 0.), 220.) * sh;
  } else {
    float sunD = smoothstep(.99985, .99995, dot(d, uSun));
    Ls = SUN * sunD * 2.;
    vec2 sll = latlon(d); vec3 st = texture(uStars, vec2((sll.y + 180.) / 360., (sll.x + 90.) / 180.)).rgb;
    Ls += st * st * .35 * smoothstep(60., 600., uAlt);
  }
  // --- clouds
  vec3 Lc = vec3(0.); float Tc = 1.; float tC = 0.;
  vec2 cTop = sph(uAlt, mu, CT), cBot = sph(uAlt, mu, CB);
  float t0, t1;
  if (uAlt > CT) { t0 = cTop.x; t1 = cBot.x > 0. ? cBot.x : cTop.y; } else { t0 = 0.; t1 = cBot.x > 0. ? cBot.x : cTop.y; }
  if (cTop.x > -1. && t1 > 0. && uCloudAmt > .001 && uCloudVis > .001 && uSat < .999) {
    t0 = max(t0, 0.); t1 = min(t1, t0 + 260.);
    int N = int(uSteps); float far = smoothstep(80., 1500., uAlt);
    N = int(mix(mix(float(N), 36., smoothstep(14., 70., uAlt)), 12., far));
    float dt = (t1 - t0) / float(N);
    float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));   // interleaved gradient noise, stable
    float cs = dot(d, uSun), ph = .62 + 4. * PI * .38 * mix(hg(cs, .8), hg(cs, -.2), .25);
    float wsum = 0.;
    for (int i = 0; i < 96; i++) {
      if (i >= N || Tc < .015) break;
      float t = t0 + (float(i) + j) * dt; vec3 p = o + d * t; float h = altAt(t, mu);
      vec3 n = normalize(p); float cov = cover(n);
      float den = density(p, h, cov, far < .5);
      if (den > .002) {
        // light march toward the sun (near); far away a cheap height-based estimate is enough
        float odl = 0.;
        if (uAlt < 45.) { float sl = .22; vec3 q = p;
          for (int k = 0; k < 5; k++) { q += uSun * sl; float hq = length(q) - R; odl += density(q, hq, cover(normalize(q)), false) * sl; sl *= 1.8; } }
        else { odl = cov * (1. - clamp((h - CB) / (CT - CB), 0., 1.)) * .9 / max(dot(n, uSun), .2); }
        float sig = mix(26., 4., far);
        float hf = clamp((h - CB) / (CT - CB), 0., 1.);
        vec3 sunC = SUN * .105 * smoothstep(-.05, .15, dot(n, uSun));
        float powder = mix(1., 1. - exp(-den * sig * .6), .45);
        vec3 S = sunC * (exp(-sig * odl) * ph + .32 * exp(-sig * .22 * odl) * (.7 + ph * .2) + .1 * exp(-sig * .05 * odl)) * powder
               + vec3(.42, .55, .8) * .6 * mix(.3, 1., hf * hf) * smoothstep(-.1, .2, dot(n, uSun));
        float tr = exp(-den * sig * dt);
        Lc += Tc * S * (1. - tr); wsum += Tc * (1. - tr); tC += t * Tc * (1. - tr); Tc *= tr;
      }
    }
    tC = wsum > 0. ? tC / wsum : t1;
    float cv = uCloudVis * (1. - uSat); Lc *= cv; Tc = mix(1., Tc, cv);
  }
  // --- atmosphere in front of and behind the clouds
  vec3 Ta, Tb; vec3 L1, L2;
  if (Tc < .999) { float tm = clamp(tC, tA0, tA1); L1 = atmo(o, d, mu, tA0, tm, Ta); L2 = atmo(o, d, mu, tm, tA1, Tb); }
  else { L1 = atmo(o, d, mu, tA0, tA1, Ta); L2 = vec3(0.); Tb = vec3(1.); }
  float haze = 1. - .42 * uSat;
  vec3 col = L1 * haze + mix(vec3(1.), Ta, haze) * (Lc + Tc * (L2 * haze + mix(vec3(1.), Tb, haze) * Ls));
  if (uMap > 0. && tE > 0.) {
    // the recap's map: flat satellite imagery, graded to Apple's look, no atmosphere
    vec3 nS = normalize(o + d * tE);
    // morph into the recap's flat Mercator map: same anchor, same degrees per screen width
    vec2 css = vec2(gl_FragCoord.x / uRtScale, uVpH - gl_FragCoord.y / uRtScale);
    vec2 fu = (css - uScr.xy) / uScr.zw;
    float lonM = uPlaneLL.y + (fu.x - ANCHOR.x) * MERC_W;
    float mP = log(tan(PI / 4. + uPlaneLL.x * PI / 360.));
    float mY = mP - (fu.y - ANCHOR.y) * uScr.w * (MERC_W / uScr.z) * PI / 180.;
    float latM = (2. * atan(exp(mY)) - PI / 2.) * 180. / PI;
    vec3 nM = unitLL(latM, lonM);
    vec3 g = pow(groundCol(normalize(mix(nS, nM, uMerc))), vec3(1. / 2.2));
    vec3 gm = vec3(lutc(g.r, 0), lutc(g.g, 1), lutc(g.b, 2));
    col = mix(col, pow(clamp(gm, 0., 1.), vec3(2.2)), uMap);
  }
  fragOut = vec4(col * uExposure, 1.);
}`;

// no WebGL2 (older Safari, some Android WebViews, blocked GPU) or the scene fails to start: a still end card instead of a black hole
const glOK = () => { if (/[?&]nogl\b/.test(location.search)) return false; try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } };
const fallback = () => {
  sec.classList.add('vs-static');
  const v = sec.querySelector('.fan-c video'); if (v) { v.preload = 'auto'; v.loop = true; v.muted = true; const pp = v.play(); if (pp && pp.catch) pp.catch(() => {}); }
  if (window.ScrollTrigger) ScrollTrigger.refresh();
};
if (sec) { if (glOK()) { try { init(); } catch (e) { console.error(e); fallback(); } } else fallback(); }
