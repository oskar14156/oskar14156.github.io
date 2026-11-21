/*
 * Ink intro. Ported from the MONTEVIER ink study (same author).
 * The document scrolls; the scene does not. Scroll progress through #intro
 * raises an ink surface from paper to the brand ink colour. No idle render loop:
 * frames are drawn only while progress or the pointer influence changes.
 * WebGL1, with a plain CSS fallback when it is unavailable or motion is reduced.
 */
(function () {
  const track = document.querySelector('#intro');
  const stage = document.querySelector('#intro-stage');
  const canvas = document.querySelector('#ink-canvas');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!track || !stage || !canvas || reduce.matches) return;

  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return;

  const vertexSource = 'attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.0,1.0);}';
  const fragmentSource = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_progress;
    uniform vec2 u_pointer;
    uniform float u_pointerInfluence;
    uniform vec3 u_paper;
    uniform vec3 u_ink;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}
    float fbm(vec2 p){float v=0.0;v+=0.54*noise(p);p=mat2(0.82,-0.57,0.57,0.82)*p*2.01;v+=0.29*noise(p);
      p=mat2(0.82,-0.57,0.57,0.82)*p*2.17;v+=0.17*noise(p);return v;}
    vec2 eddy(vec2 p,vec2 c,float s,float r){vec2 v=p-c;float a=s*exp(-dot(v,v)/(r*r));float sn=sin(a);float cs=cos(a);return c+mat2(cs,-sn,sn,cs)*v;}
    void main(){
      vec2 uv=gl_FragCoord.xy/u_resolution.xy;
      float aspect=u_resolution.x/u_resolution.y;
      vec2 p=vec2((uv.x-0.5)*aspect,uv.y-0.5);
      float t=clamp(u_progress,0.0,1.0);
      float motion=sin(3.14159265*t);
      float drift=t*5.4;
      vec2 q=p;
      vec2 pointer=vec2((u_pointer.x-0.5)*aspect,u_pointer.y-0.5);
      vec2 fp=q-pointer;
      q+=vec2(-fp.y,fp.x)*(0.26*u_pointerInfluence*exp(-dot(fp,fp)/0.095));
      q=eddy(q,vec2(-0.32*aspect,-0.17+t*0.29),(2.35+0.35*sin(drift))*motion,0.48);
      q=eddy(q,vec2(0.27*aspect,0.20-t*0.19),(-2.05+0.25*cos(drift*1.3))*motion,0.41);
      float n1=fbm(q*2.55+vec2(drift*0.42,-drift*0.25));
      float n2=fbm(q*3.65+vec2(-drift*0.28,drift*0.32)+12.4);
      vec2 warped=q+vec2(n1-0.5,n2-0.5)*(0.29*motion+0.035);
      float surface=warped.y+sin(warped.x*3.1+2.7*n1+drift*0.75)*0.10
        +sin(warped.x*7.1-drift*1.38+n2*5.0)*0.065+sin(warped.x*17.0+n1*7.1-drift*2.1)*0.014
        +(n2-0.5)*(0.23*motion+0.05);
      float signedInk=mix(-0.79,0.79,t)-surface;
      vec2 dA=warped-vec2(-0.29*aspect+t*0.22,-0.82+t*1.12);
      vec2 dB=warped-vec2(0.28*aspect-t*0.24,-0.65+t*0.94);
      float detached=max((0.125-length(dA))*0.85,(0.092-length(dB))*0.72);
      float win=smoothstep(0.075,0.25,t)*(1.0-smoothstep(0.68,0.90,t));
      signedInk=max(signedInk,detached*win-(1.0-win));
      float edge=0.013+0.003*motion;
      float ink=smoothstep(-edge,edge,signedInk);
      vec3 inkColor=u_ink+(n1*0.61+n2*0.39-0.5)*0.035;
      inkColor+=vec3(sin((warped.x+n1*0.13)*29.0+warped.y*11.0-drift*1.7)*0.010*motion);
      float rim=signedInk*26.0;
      float meniscus=exp(-(rim*rim))*(0.058+0.044*n1);
      vec3 color=mix(u_paper,inkColor,ink);
      // A lime glint rides the interface: the one accent colour of the brand.
      color+=vec3(0.84,0.98,0.38)*meniscus*0.9;
      color-=vec3(smoothstep(0.004,0.038,signedInk)*(1.0-smoothstep(0.04,0.13,signedInk))*0.021);
      color+=(hash(gl_FragCoord.xy*0.41)-0.5)*0.005;
      gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);
    }`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, vertexSource);
  const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vs || !fs) return;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const u = (n) => gl.getUniformLocation(program, n);
  const uRes = u('u_resolution'), uProg = u('u_progress'), uPtr = u('u_pointer'), uInf = u('u_pointerInfluence');
  const uPaper = u('u_paper'), uInk = u('u_ink');

  // Colours follow the page theme: paper + ink in light, ink-on-deeper-ink in dark.
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  // Light: dark ink rises over paper. Dark: cream ink rises over the night page, then
  // fades away near the end so the dark scene after it follows without a seam.
  let dark = false;
  const setColors = () => {
    dark = document.body.dataset.themeResolved === 'dark';
    gl.uniform3fv(uPaper, hex(dark ? '#0b100e' : '#f4f3ec'));
    gl.uniform3fv(uInk, hex(dark ? '#e8e7dd' : '#111916'));
  };

  let progress = 0, target = 0, raf = 0, px = .5, py = .5, inf = 0, infTarget = 0, timer;
  const resize = () => {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    const d = Math.min(window.devicePixelRatio || 1, 1.4, Math.sqrt(1300000 / (w * h)));
    canvas.width = Math.round(w * d);
    canvas.height = Math.round(h * d);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  const draw = () => {
    gl.uniform1f(uProg, progress);
    gl.uniform2f(uPtr, px, py);
    gl.uniform1f(uInf, inf);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    track.style.setProperty('--ink', progress.toFixed(4));
    const f = dark ? Math.min(1, Math.max(0, (progress - .8) / .16)) : 0;
    canvas.style.opacity = String(1 - f * f * (3 - 2 * f));
    document.body.classList.toggle('ink-cream', dark && progress > .42 && progress < .9);
  };
  const frame = () => {
    raf = 0;
    const d = target - progress;
    progress = Math.abs(d) < .00022 ? target : progress + d * .2;
    inf = Math.abs(inf - infTarget) < .007 ? infTarget : inf + (infTarget - inf) * .14;
    draw();
    if (progress !== target || inf !== infTarget) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const update = () => {
    const distance = Math.max(1, track.offsetHeight - window.innerHeight);
    target = Math.max(0, Math.min(1, -track.getBoundingClientRect().top / distance));
    kick();
  };
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = stage.getBoundingClientRect();
    px = (e.clientX - r.left) / r.width;
    py = 1 - (e.clientY - r.top) / r.height;
    infTarget = .7;
    clearTimeout(timer);
    timer = setTimeout(() => { infTarget = 0; kick(); }, 180);
    kick();
  });
  window.addEventListener('scroll', update, { passive: true });
  const onResize = (fn) => { let w = innerWidth, t = 0; const touch = matchMedia('(pointer: coarse)').matches; addEventListener('resize', () => { clearTimeout(t); if (!touch || innerWidth !== w) { w = innerWidth; fn(); } else t = setTimeout(fn, 250); }, { passive: true }); };   // phones: the address bar sliding in and out only changes the height; apply that once it has settled, not mid-scroll
  onResize(() => { resize(); update(); });
  document.addEventListener('pf-theme', () => { setColors(); draw(); });
  document.documentElement.classList.add('has-ink');
  setColors();
  resize();
  update();
  progress = target;
  draw();
})();
