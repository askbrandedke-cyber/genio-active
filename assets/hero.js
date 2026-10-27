/*
 * Hero: a sheet of liquid "performance fabric" rendered with Three.js.
 * Waves are computed in the vertex shader; the cursor sends a ripple through it.
 * Falls back to the CSS gradient behind the canvas if WebGL or Three is missing.
 */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || !window.THREE) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 7.5);

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(10, 10) },
    uPress: { value: 0 },
    uA: { value: new THREE.Color('#d9d9d9') },
    uB: { value: new THREE.Color('#ffffff') },
    uC: { value: new THREE.Color('#ffffff') },
    uAccent: { value: new THREE.Color('#bdbdbd') }
  };

  const vert = [
    'uniform float uTime; uniform vec2 uMouse; uniform float uPress;',
    'varying vec3 vN; varying vec3 vPos; varying vec2 vUv; varying float vH;',
    'float h(vec2 p){',
    '  float t = uTime * 0.35;',
    '  float z = sin(p.x * 0.85 + t * 1.3) * 0.38;',
    '  z += sin(p.y * 1.35 - t * 0.9 + p.x * 0.45) * 0.26;',
    '  z += sin((p.x + p.y) * 2.2 + t * 1.7) * 0.07;',
    '  z += sin(p.x * 3.1 - p.y * 0.7 - t * 2.1) * 0.03;',
    '  vec2 d = p - uMouse; float r = length(d);',
    '  z += (0.32 + uPress * 0.5) * exp(-r * r * 0.55) * sin(r * 3.2 - uTime * 2.6);',
    '  return z;',
    '}',
    'void main(){',
    '  vec3 p = position; float e = 0.02; float z = h(p.xy);',
    '  vec3 a = vec3(e, 0.0, h(p.xy + vec2(e, 0.0)) - z);',
    '  vec3 b = vec3(0.0, e, h(p.xy + vec2(0.0, e)) - z);',
    '  vN = normalize(normalMatrix * normalize(cross(a, b)));',
    '  p.z = z; vH = z; vUv = uv;',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0); vPos = mv.xyz;',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  const frag = [
    'uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uAccent;',
    'varying vec3 vN; varying vec3 vPos; varying vec2 vUv; varying float vH;',
    'void main(){',
    '  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;',
    '  vec3 v = normalize(-vPos);',
    '  vec3 l1 = normalize(vec3(-0.5, 0.8, 0.7));',
    '  vec3 l2 = normalize(vec3(0.8, -0.3, 0.5));',
    '  float d1 = max(dot(n, l1), 0.0);',
    '  float s1 = pow(max(dot(reflect(-l1, n), v), 0.0), 26.0);',
    '  float s2 = pow(max(dot(reflect(-l2, n), v), 0.0), 10.0);',
    '  float fr = pow(1.0 - max(dot(n, v), 0.0), 2.4);',
    '  float knit = 0.5 + 0.5 * sin(vUv.y * 700.0);',
    '  vec3 col = mix(uA, uB, d1 * 0.55) * (0.3 + 0.7 * d1);',
    '  col += uC * s1 * 1.15 + uAccent * s2 * 0.45 + mix(uC, uAccent, 0.35) * fr * 0.5;',
    '  col *= 0.93 + 0.07 * knit;',
    '  float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x) * smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);',
    '  gl_FragColor = vec4(col, edge);',
    '}'
  ].join('\n');

  const geo = new THREE.PlaneGeometry(12, 7, 260, 150);
  const mat = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: vert, fragmentShader: frag, transparent: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.set(-0.95, 0.1, -0.32);
  mesh.position.set(1.2, -0.2, 0);
  scene.add(mesh);

  // Fine metallic dust drifting above the fabric
  const N = 420, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 7;
    pos[i * 3 + 2] = (Math.random() - 0.3) * 3;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x8a8a8a, size: 0.018, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(dust);

  // Map the cursor onto the plane in its local coordinates
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), target = new THREE.Vector2(10, 10), tilt = new THREE.Vector2();
  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    tilt.set(ndc.x, ndc.y);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(mesh)[0];
    if (hit) { const lp = mesh.worldToLocal(hit.point.clone()); target.set(lp.x, lp.y); }
  }
  const hero = canvas.parentElement;
  hero.addEventListener('pointermove', onMove);
  hero.addEventListener('pointerdown', function () { press = 1; });
  window.addEventListener('pointerup', function () { press = 0; });
  let press = 0;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 700 ? 10 : 7.5;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let visible = true;
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  let scrollY = 0;
  window.addEventListener('scroll', function () { scrollY = window.scrollY; }, { passive: true });

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uMouse.value.lerp(target, 0.06);
    uniforms.uPress.value += (press - uniforms.uPress.value) * 0.08;
    mesh.rotation.y += ((0.1 + tilt.x * 0.12) - mesh.rotation.y) * 0.04;
    mesh.rotation.x += ((-0.95 - tilt.y * 0.08 + scrollY * 0.0006) - mesh.rotation.x) * 0.04;
    dust.rotation.z = t * 0.01;
    dust.position.y = scrollY * 0.0015;
    renderer.render(scene, camera);
  }

  if (reduce) {
    uniforms.uTime.value = 4.2;
    renderer.render(scene, camera);
    window.addEventListener('resize', function () { renderer.render(scene, camera); });
  } else {
    frame();
  }
  document.documentElement.classList.add('has-webgl');
})();
