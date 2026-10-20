import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Audio } from './audio.js';

const Q = new URLSearchParams(location.search);
const isMobile = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent) || Q.has('mobile');
let quality = Q.get('q') || (isMobile ? 'low' : 'high');
const R = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const TAU = Math.PI * 2;

// ---------- renderer / scene ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance', preserveDrawingBuffer: Q.has('shot') });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070414);
scene.fog = new THREE.FogExp2(0x120818, 0.006);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
camera.position.set(0, 40, 150);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.45, 0.72);
composer.addPass(bloom);
composer.addPass(new OutputPass());
function resize() {
  const pr = quality === 'high' ? Math.min(devicePixelRatio, 2) : Math.min(devicePixelRatio, 1);
  renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth / 2, innerHeight / 2);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---------- lights ----------
scene.add(new THREE.HemisphereLight(0x6a5aa0, 0x3a2008, 0.9));
const moon = new THREE.DirectionalLight(0x8899ff, 0.45); moon.position.set(-80, 120, 60); scene.add(moon);
const warmLights = [];
[[0, 14, 10, 0xffa040], [-40, 6, -8, 0xff60c0], [30, 20, -10, 0x40c0ff], [-15, 16, 30, 0xffd060], [45, 24, 22, 0x80ff80], [0, 10, 60, 0xff5050], [0, 25, -110, 0xff7a20]]
  .forEach(([x, y, z, c]) => { const l = new THREE.PointLight(c, 500, 90, 1.6); l.position.set(x, y, z); scene.add(l); warmLights.push(l); });
const effigyLight = warmLights[6]; effigyLight.intensity = 300;

// ---------- helpers ----------
const M = (c, e = 0, ei = 1, extra = {}) => new THREE.MeshStandardMaterial({ color: c, emissive: e || 0, emissiveIntensity: ei, roughness: 0.6, metalness: 0.1, ...extra });
const glow = c => new THREE.MeshBasicMaterial({ color: c });
function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }
function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const NEON = [0xff2d6f, 0xffc400, 0x00e5ff, 0x76ff03, 0xff6d00, 0xd500f9, 0xffffff, 0xff1744];
const FONT = '"Noto Sans Devanagari","Mangal","Nirmala UI",sans-serif';

// ---------- sky ----------
{
  const n = 2500, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const th = R(0, TAU), ph = R(0.05, 1.45), r = 600; p.set([r * Math.cos(th) * Math.cos(ph), r * Math.sin(ph), r * Math.sin(th) * Math.cos(ph)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false })));
  const moonM = mesh(new THREE.SphereGeometry(14, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff1c8, fog: false }), -260, 260, -380);
  // horizon glow dome
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 v;void main(){float h=clamp(v.y,0.,1.);vec3 c=mix(vec3(0.20,0.07,0.10),vec3(0.015,0.01,0.05),pow(h,0.35));gl_FragColor=vec4(c,1.);}' }));
  sky.renderOrder = -1; scene.add(sky);
}

// ---------- ground ----------
{
  const tex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#3b2a1e'; c.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${R(30, 90) | 0},${R(20, 60) | 0},${R(10, 40) | 0},.5)`; c.fillRect(R(0, w), R(0, h), 2, 2); } });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(40, 40);
  const g = mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.15, color: 0x7a6a60 }));
  g.rotation.x = -Math.PI / 2;
  // dark tree line silhouettes
  const treeG = new THREE.ConeGeometry(6, 22, 6), trees = new THREE.InstancedMesh(treeG, M(0x0b120c), 140), d = new THREE.Object3D();
  for (let i = 0; i < 140; i++) { const a = i / 140 * TAU, r = R(175, 220); d.position.set(Math.cos(a) * r, 10, Math.sin(a) * r); d.scale.setScalar(R(0.7, 1.6)); d.updateMatrix(); trees.setMatrixAt(i, d.matrix); }
  scene.add(trees);
}

// ---------- string lights (instanced bulbs) ----------
const bulbs = []; // {pos, color}
function strand(a, b, n, sag = 2, colors = NEON) {
  for (let i = 0; i <= n; i++) { const t = i / n; const p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * sag; bulbs.push({ p, c: new THREE.Color(colors[i % colors.length]) }); }
}
function pole(x, z, h = 9) { mesh(new THREE.CylinderGeometry(0.15, 0.2, h, 6), M(0x333333), x, h / 2, z); return new THREE.Vector3(x, h, z); }

// ---------- people (instanced) ----------
const CLOTH = [0xe91e63, 0xff9800, 0xffeb3b, 0x9c27b0, 0x2196f3, 0x4caf50, 0xf44336, 0x00bcd4, 0xffffff, 0xff5722, 0x3f51b5, 0xffc107, 0x8bc34a, 0xd81b60, 0x009688, 0xfff3e0];
const SKIN = [0x8d5524, 0xa0673a, 0xc68642, 0x7a4a2a, 0xb07040];
const people = [];
const extraRiders = []; // static meshes for riders get added on rides
function personMesh(parent, scale = 1) { // small single person for rides
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.9, 6), M(pick(CLOTH)), 0, 0.45, 0, g);
  mesh(new THREE.SphereGeometry(0.2, 8, 6), M(pick(SKIN)), 0, 1.1, 0, g);
  mesh(new THREE.SphereGeometry(0.21, 8, 6, 0, TAU, 0, 1.4), M(0x111111), 0, 1.15, 0, g);
  g.scale.setScalar(scale); parent.add(g); return g;
}

// ---------- RIDES ----------
const rides = {};
// Ferris wheel
{
  const W = new THREE.Group(); W.position.set(-55, 0, -25); scene.add(W);
  const Rr = 20, H = 23;
  const legM = M(0xdddddd, 0x332211);
  for (const s of [-1, 1]) for (const zz of [-3, 3]) { const leg = mesh(new THREE.CylinderGeometry(0.4, 0.5, 25, 6), legM, s * 7, H / 2, zz, W); leg.rotation.z = s * 0.3; }
  const wheel = new THREE.Group(); wheel.position.y = H; W.add(wheel);
  const spokeN = 16;
  for (const zz of [-1.6, 1.6]) {
    const ring = mesh(new THREE.TorusGeometry(Rr, 0.25, 6, 64), glow(0xff3cac), 0, 0, zz, wheel);
    mesh(new THREE.TorusGeometry(Rr * 0.6, 0.15, 6, 48), glow(0x00e5ff), 0, 0, zz, wheel);
    for (let i = 0; i < spokeN; i++) { const s = mesh(new THREE.BoxGeometry(0.15, Rr, 0.15), glow(i % 2 ? 0xffb000 : 0xff70d0), 0, 0, zz, wheel); s.rotation.z = i / spokeN * TAU; s.translateY(Rr / 2); }
  }
  mesh(new THREE.CylinderGeometry(1.2, 1.2, 4, 12), glow(0xffaa00), 0, 0, 0, wheel).rotation.x = Math.PI / 2;
  const cabins = [];
  const cabCols = [0xff1744, 0xffc400, 0x00e676, 0x2979ff, 0xd500f9, 0xff6d00];
  for (let i = 0; i < spokeN; i++) {
    const a = i / spokeN * TAU, pivot = new THREE.Group(); pivot.position.set(Math.cos(a) * Rr, Math.sin(a) * Rr, 0); wheel.add(pivot);
    const cab = new THREE.Group(); pivot.add(cab);
    mesh(new THREE.BoxGeometry(2.4, 0.3, 2.4), M(cabCols[i % 6], cabCols[i % 6], 0.4), 0, -2.6, 0, cab);
    mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 8), M(cabCols[i % 6], cabCols[i % 6], 0.6), 0, -0.5, 0, cab);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 4), M(0xcccccc), 1.1, -1.5, 1.1, cab); mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 4), M(0xcccccc), -1.1, -1.5, -1.1, cab);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 4), M(0xcccccc), 1.1, -1.5, -1.1, cab); mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 4), M(0xcccccc), -1.1, -1.5, 1.1, cab);
    const p1 = personMesh(cab, 0.9); p1.position.set(-0.5, -2.45, -0.7); const p2 = personMesh(cab, 0.7); p2.position.set(0.5, -2.45, -0.6);
    cabins.push({ pivot, cab, ph: R(0, 6) });
  }
  // bulbs on rim
  for (let i = 0; i < 64; i++) { const a = i / 64 * TAU; mesh(new THREE.SphereGeometry(0.28, 6, 4), glow(NEON[i % NEON.length]), Math.cos(a) * (Rr + 0.4), Math.sin(a) * (Rr + 0.4), 1.7, wheel); }
  rides.wheel = { W, wheel, cabins, H };
}
// Pirate ship
{
  const G = new THREE.Group(); G.position.set(42, 0, -12); scene.add(G);
  const fr = M(0x444455, 0x110022);
  for (const s of [-1, 1]) for (const z of [-5, 5]) { const l = mesh(new THREE.CylinderGeometry(0.35, 0.45, 17, 6), fr, s * 5, 8, z, G); l.rotation.z = s * 0.32; }
  const arm = new THREE.Group(); arm.position.y = 16; G.add(arm);
  mesh(new THREE.BoxGeometry(0.5, 11, 0.5), glow(0xffd000), 0, -5.5, -3, arm); mesh(new THREE.BoxGeometry(0.5, 11, 0.5), glow(0xffd000), 0, -5.5, 3, arm);
  const hull = new THREE.Group(); hull.position.y = -12; arm.add(hull);
  const hg = new THREE.CylinderGeometry(3, 3, 16, 16, 1, false, Math.PI / 2, Math.PI); hg.rotateZ(Math.PI / 2);
  const hullM = M(0x7a1f0f, 0x220500); const hm = mesh(hg, hullM, 0, 0, 0, hull); hm.scale.set(1, 1, 1.25); hm.material.side = THREE.DoubleSide;
  mesh(new THREE.BoxGeometry(16, 0.25, 6.6), M(0x8d6e63), 0, 0.1, 0, hull);
  for (let i = 0; i < 14; i++) { const p = personMesh(hull, 0.9); p.position.set(-6.5 + (i % 7) * 2.1, 0.2, i < 7 ? -1.5 : 1.5); }
  // dragon heads ends
  mesh(new THREE.ConeGeometry(0.8, 3, 6), glow(0x00e676), 9, 1.5, 0, hull).rotation.z = -1.0;
  mesh(new THREE.ConeGeometry(0.8, 3, 6), glow(0x00e676), -9, 1.5, 0, hull).rotation.z = 1.0;
  for (let i = 0; i < 20; i++) mesh(new THREE.SphereGeometry(0.22, 6, 4), glow(NEON[i % 8]), -7.6 + i * 0.8, 0.5, 3.8, hull);
  for (let i = 0; i < 20; i++) mesh(new THREE.SphereGeometry(0.22, 6, 4), glow(NEON[(i + 3) % 8]), -7.6 + i * 0.8, 0.5, -3.8, hull);
  rides.ship = { arm, hull, G };
}
// Chain swing
{
  const G = new THREE.Group(); G.position.set(48, 0, 34); scene.add(G);
  mesh(new THREE.CylinderGeometry(0.8, 1.2, 14, 10), M(0xffffff, 0x442200), 0, 7, 0, G);
  const top = new THREE.Group(); top.position.y = 14; G.add(top);
  const canopy = mesh(new THREE.ConeGeometry(9, 3, 24, 1, true), M(0xff2d6f, 0xff2d6f, 0.35, { side: THREE.DoubleSide }), 0, 1.5, 0, top);
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; mesh(new THREE.SphereGeometry(0.25, 6, 4), glow(NEON[i % 8]), Math.cos(a) * 9, 0, Math.sin(a) * 9, top); }
  const seats = [];
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU, piv = new THREE.Group(); piv.position.set(Math.cos(a) * 7.5, 0, Math.sin(a) * 7.5); top.add(piv);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 7, 3), M(0xbbbbbb), 0, -3.5, 0, piv);
    mesh(new THREE.BoxGeometry(0.7, 0.15, 0.7), M(0xffc400), 0, -7, 0, piv);
    const p = personMesh(piv, 0.8); p.position.y = -6.95;
    seats.push({ piv, a });
  }
  rides.chain = { top, seats };
}
// Merry-go-round
{
  const G = new THREE.Group(); G.position.set(-32, 0, 38); scene.add(G);
  mesh(new THREE.CylinderGeometry(9, 9.5, 1, 24), M(0xffe082, 0x332200), 0, 0.5, 0, G);
  const rot = new THREE.Group(); G.add(rot);
  mesh(new THREE.CylinderGeometry(1.2, 1.2, 7, 12), M(0xffd54f, 0xffa000, 0.5), 0, 4.5, 0, rot);
  const roof = mesh(new THREE.ConeGeometry(10, 4, 24), M(0xff1744, 0x660011, 0.6), 0, 10, 0, rot);
  // striped roof via canvas
  roof.material.map = canvasTex(256, 32, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#e91e63'; c.fillRect(i * 16, 0, 16, h); } });
  roof.material.color.set(0xffffff);
  for (let i = 0; i < 32; i++) { const a = i / 32 * TAU; mesh(new THREE.SphereGeometry(0.25, 6, 4), glow(i % 2 ? 0xffe100 : 0xffffff), Math.cos(a) * 9.6, 8, Math.sin(a) * 9.6, rot); }
  const horses = [];
  const hc = [0xffffff, 0xff80ab, 0x80d8ff, 0xffe57f, 0xb388ff, 0xccff90];
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 10; i++) {
    const a = (i + ring * 0.5) / 10 * TAU, r = ring ? 5 : 7.5, h = new THREE.Group();
    h.position.set(Math.cos(a) * r, 2.5, Math.sin(a) * r); h.rotation.y = -a; rot.add(h);
    mesh(new THREE.CylinderGeometry(0.07, 0.07, 9, 4), glow(0xffd700), 0, 2.5, 0, h);
    const col = M(hc[(i + ring) % 6], 0x111111);
    mesh(new THREE.BoxGeometry(0.6, 0.7, 1.8), col, 0, 0, 0, h);
    const nk = mesh(new THREE.BoxGeometry(0.4, 1.0, 0.45), col, 0, 0.6, 0.85, h); nk.rotation.x = 0.5;
    mesh(new THREE.BoxGeometry(0.4, 0.4, 0.8), col, 0, 1.0, 1.3, h);
    for (const [lx, lz] of [[0.2, 0.6], [-0.2, 0.6], [0.2, -0.6], [-0.2, -0.6]]) mesh(new THREE.BoxGeometry(0.14, 0.9, 0.14), col, lx, -0.7, lz, h);
    mesh(new THREE.BoxGeometry(0.62, 0.15, 0.6), M(0xd50000), 0, 0.4, 0, h);
    if (Math.random() < 0.6) { const p = personMesh(h, 0.7); p.position.set(0, 0.25, -0.1); }
    horses.push({ h, ph: i * 0.9 + ring });
  }
  rides.merry = { rot, horses };
}
// Bumper cars
{
  const G = new THREE.Group(); G.position.set(4, 0, 66); scene.add(G);
  mesh(new THREE.BoxGeometry(30, 0.3, 18), M(0x263238, 0, 1, { metalness: 0.6, roughness: 0.25 }), 0, 0.15, 0, G);
  const roofM = M(0x1a237e, 0x0d0050, 0.5);
  mesh(new THREE.BoxGeometry(31, 0.4, 19), roofM, 0, 6, 0, G);
  for (const [x, z] of [[-15, -9], [15, -9], [-15, 9], [15, 9]]) mesh(new THREE.CylinderGeometry(0.25, 0.25, 6, 6), M(0xaaaaaa), x, 3, z, G);
  const sign = mesh(new THREE.PlaneGeometry(14, 2.5), new THREE.MeshBasicMaterial({ map: canvasTex(512, 96, (c, w, h) => { c.fillStyle = '#100030'; c.fillRect(0, 0, w, h); c.font = `bold 54px ${FONT}`; c.textAlign = 'center'; c.fillStyle = '#00e5ff'; c.shadowColor = '#00e5ff'; c.shadowBlur = 12; c.fillText('टकराती गाड़ी • BUMPER CARS', w / 2, 66); }) }), 0, 7.6, 9.6, G);
  for (let i = 0; i < 40; i++) mesh(new THREE.SphereGeometry(0.2, 6, 4), glow(NEON[i % 8]), -15 + i * 0.77, 6.25, 9.6, G);
  const cars = [];
  for (let i = 0; i < 10; i++) {
    const car = new THREE.Group(); G.add(car); const col = NEON[i % 8] === 0xffffff ? 0xff4081 : NEON[i % 8];
    mesh(new THREE.BoxGeometry(1.8, 0.6, 2.4), M(col, col, 0.35, { metalness: 0.4, roughness: 0.3 }), 0, 0.6, 0, car);
    mesh(new THREE.TorusGeometry(1.25, 0.18, 6, 16), M(0x111111), 0, 0.45, 0, car).rotation.x = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 5.4, 3), M(0x999999), 0, 3.3, -0.9, car);
    const p = personMesh(car, 0.8); p.position.set(0, 0.6, 0.2);
    cars.push({ car, x: R(-12, 12), z: R(-7, 7), a: R(0, TAU), v: R(3, 5), turn: R(-1, 1) });
  }
  rides.bumper = { cars };
}
// Roller coaster
{
  const C = new THREE.Vector3(85, 0, -55);
  const pts = []; for (let i = 0; i < 40; i++) { const t = i / 40 * TAU; pts.push(new THREE.Vector3(C.x + Math.cos(t) * 26, 3 + 6 + 5 * Math.sin(t * 2) + (Math.sin(t) > 0.6 ? 6 : 0), C.z + Math.sin(t) * 14)); }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const tube = mesh(new THREE.TubeGeometry(curve, 300, 0.3, 6, true), glow(0xff3cac), 0, 0, 0);
  const tube2 = new THREE.Mesh(new THREE.TubeGeometry(curve, 300, 0.12, 4, true), glow(0x00e5ff)); tube2.position.y = -0.6; scene.add(tube2);
  for (let i = 0; i < 60; i++) { const p = curve.getPointAt(i / 60); mesh(new THREE.CylinderGeometry(0.15, 0.15, p.y, 4), M(0x777777), p.x, p.y / 2, p.z); }
  const train = [];
  for (let i = 0; i < 5; i++) { const car = new THREE.Group(); scene.add(car); mesh(new THREE.BoxGeometry(1.5, 0.8, 2.2), M(0xffc400, 0xff8f00, 0.6), 0, 0.5, 0, car); const p = personMesh(car, 0.75); p.position.y = 0.6; train.push(car); }
  rides.coaster = { curve, train, u: 0 };
}

// ---------- STALLS ----------
const steamSources = [];
function stall(x, z, rotY, hi, en, col, item) {
  const G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = rotY; scene.add(G);
  mesh(new THREE.BoxGeometry(6, 1.2, 2.5), M(0x6d4c41), 0, 0.6, 0.5, G);
  mesh(new THREE.BoxGeometry(6, 3.2, 0.2), M(0x3e2723), 0, 1.6, -1.2, G);
  for (const sx of [-2.9, 2.9]) for (const sz of [-1.2, 1.6]) mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 4), M(0x999999), sx, 2, sz, G);
  const awn = mesh(new THREE.BoxGeometry(6.6, 0.2, 3.6), new THREE.MeshStandardMaterial({ map: canvasTex(128, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : col; c.fillRect(i * 16, 0, 16, h); } }), emissive: 0x331100 }), 0, 4.1, 0.2, G);
  awn.rotation.x = 0.12;
  const sign = mesh(new THREE.PlaneGeometry(5.6, 1.4), new THREE.MeshBasicMaterial({ map: canvasTex(512, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, col); g.addColorStop(1, '#3a0a00'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffd54f'; c.lineWidth = 6; c.strokeRect(4, 4, w - 8, h - 8);
    c.textAlign = 'center'; c.fillStyle = '#fff8e1'; c.shadowColor = '#000'; c.shadowBlur = 6;
    c.font = `bold 58px ${FONT}`; c.fillText(hi, w / 2, 62); c.font = `bold 34px sans-serif`; c.fillStyle = '#ffe082'; c.fillText(en, w / 2, 108);
  }) }), 0, 5, 2.05, G); sign.rotation.x = 0;
  // goods on counter
  const goodsCol = { golgappa: 0xffb74d, jalebi: 0xff9800, chaat: 0xa1887f, ice: 0xf8bbd0, candy: 0xff80ab, sweets: 0xffeb3b, toys: 0x29b6f6, game: 0xef5350, balloon: 0xe040fb, bangles: 0xd500f9 }[item];
  for (let i = 0; i < 7; i++) mesh(new THREE.SphereGeometry(0.22, 8, 6), M(goodsCol, goodsCol, 0.25), -2.4 + i * 0.8, 1.35, 1.2, G);
  if (item === 'candy') for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(0.45, 8, 6), M(0xff80ab, 0xff4081, 0.4), -2 + i, 2.1, 1.0, G);
  if (item === 'game') for (let i = 0; i < 12; i++) mesh(new THREE.SphereGeometry(0.25, 8, 6), glow(NEON[i % 8]), -2.4 + (i % 6) * 0.95, 2 + ((i / 6) | 0) * 0.8, -1.0, G);
  // bulbs under awning
  for (let i = 0; i < 12; i++) mesh(new THREE.SphereGeometry(0.12, 6, 4), glow(i % 2 ? 0xffe082 : 0xff6d00), -3 + i * 0.55, 3.8, 1.95, G);
  // vendor
  const v = personMesh(G, 1.1); v.position.set(0, 0, -0.5);
  const wp = new THREE.Vector3(0, 1.5, 0.8).applyMatrix4(G.matrixWorld.compose(G.position, G.quaternion, G.scale));
  if (['golgappa', 'jalebi', 'chaat', 'sweets'].includes(item)) steamSources.push(wp);
  return G;
}
const STALLS = [
  ['गोलगप्पे', 'GOLGAPPA ₹20', '#c62828', 'golgappa'], ['जलेबी', 'GARMA GARAM JALEBI', '#ef6c00', 'jalebi'], ['चाट भंडार', 'CHAAT BHANDAR', '#2e7d32', 'chaat'],
  ['आइसक्रीम', 'ICE CREAM', '#0277bd', 'ice'], ['बुढ़िया के बाल', 'COTTON CANDY', '#ad1457', 'candy'], ['मिठाई', 'SWEETS • LADDOO', '#f9a825', 'sweets'],
  ['खिलौने', 'TOYS', '#6a1b9a', 'toys'], ['निशाना लगाओ', 'SHOOTING GAME', '#b71c1c', 'game'], ['गुब्बारे', 'BALLOONS', '#00838f', 'balloon'],
  ['चूड़ियाँ', 'BANGLES', '#4527a0', 'bangles'], ['गोलगप्पे', 'PANI PURI', '#c62828', 'golgappa'], ['जलेबी', 'JALEBI RABRI', '#ef6c00', 'jalebi'],
];
// two rows facing a central avenue along x at z ~ 8
STALLS.forEach((s, i) => { const row = i % 2, k = (i / 2) | 0; stall(-30 + k * 12, row ? 18 : 2, row ? Math.PI : 0, ...s); });
// string lights over avenue
for (let k = 0; k < 7; k++) { const x = -36 + k * 12; const a = pole(x, -1), b = pole(x, 21); strand(a, b, 26, 2); if (k < 6) { strand(a, new THREE.Vector3(x + 12, 9, -1), 24, 1.2); strand(b, new THREE.Vector3(x + 12, 9, 21), 24, 1.2); } }
// lights around fair perimeter / to rides
const perim = [[-80, -60], [-80, 70], [80, 70], [110, -10], [60, -95], [-60, -95]];
const pv = perim.map(([x, z]) => pole(x, z, 12));
for (let i = 0; i < pv.length; i++) { strand(pv[i], pv[(i + 1) % pv.length], 90, 4); }
strand(new THREE.Vector3(-55, 44, -25), new THREE.Vector3(-80, 0.5, -60), 40, 0, [0xffd000, 0xff2d6f]);
strand(new THREE.Vector3(-55, 44, -25), new THREE.Vector3(-30, 0.5, -60), 40, 0, [0xffd000, 0x00e5ff]);
// entry gate
{
  const G = new THREE.Group(); G.position.set(0, 0, 95); scene.add(G);
  for (const s of [-1, 1]) { mesh(new THREE.BoxGeometry(2.5, 14, 2.5), M(0xff8f00, 0x7a2e00, 0.5), s * 12, 7, 0, G); mesh(new THREE.ConeGeometry(2.2, 3, 4), glow(0xffd000), s * 12, 15.5, 0, G); }
  mesh(new THREE.PlaneGeometry(22, 4), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: canvasTex(1024, 192, (c, w, h) => { c.fillStyle = '#7a0019'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffd54f'; c.lineWidth = 10; c.strokeRect(6, 6, w - 12, h - 12); c.textAlign = 'center'; c.fillStyle = '#ffeb3b'; c.shadowColor = '#ff6f00'; c.shadowBlur = 18; c.font = `bold 88px ${FONT}`; c.fillText('दशहरा मेला', w / 2, 95); c.font = 'bold 50px sans-serif'; c.fillStyle = '#fff'; c.fillText('✦ SHUBH DUSSEHRA ✦ JAI SHRI RAM ✦', w / 2, 165); }) }), 0, 12, 0, G);
  for (let i = 0; i < 50; i++) mesh(new THREE.SphereGeometry(0.2, 6, 4), glow(NEON[i % 8]), -11 + i * 0.45, 9.8, 0.2, G);
}
// banners (painted canvas) on tall poles
function banner(x, z, ry, lines, bg) {
  const G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = ry; scene.add(G);
  mesh(new THREE.CylinderGeometry(0.15, 0.15, 13, 6), M(0x555555), -2.6, 6.5, 0, G); mesh(new THREE.CylinderGeometry(0.15, 0.15, 13, 6), M(0x555555), 2.6, 6.5, 0, G);
  const t = canvasTex(256, 384, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, bg); g.addColorStop(1, '#ff6f00'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffd54f'; c.lineWidth = 8; c.strokeRect(8, 8, w - 16, h - 16);
    // bow and arrow motif
    c.strokeStyle = '#fff3c4'; c.lineWidth = 6; c.beginPath(); c.arc(w / 2, 150, 70, -Math.PI * 0.75, Math.PI * 0.75, true); c.stroke();
    c.beginPath(); c.moveTo(w / 2 + 70 * Math.cos(Math.PI * .75), 150 - 70 * Math.sin(Math.PI * .75)); c.lineTo(w / 2 + 70 * Math.cos(Math.PI * .75), 150 + 70 * Math.sin(Math.PI * .75)); c.lineWidth = 2; c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2 - 70, 150); c.lineTo(w / 2 + 90, 150); c.stroke(); c.beginPath(); c.moveTo(w / 2 + 90, 150); c.lineTo(w / 2 + 75, 140); c.lineTo(w / 2 + 75, 160); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = `bold 46px ${FONT}`; c.shadowColor = '#000'; c.shadowBlur = 8;
    lines.forEach((l, i) => c.fillText(l, w / 2, 270 + i * 54));
  });
  mesh(new THREE.PlaneGeometry(5, 7.5), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }), 0, 8.6, 0, G);
}
banner(-20, -70, 0, ['जय श्री राम', 'Jai Shri Ram'], '#b71c1c');
banner(20, -70, 0, ['शुभ दशहरा', 'Shubh Dussehra'], '#4a148c');
banner(-45, 85, Math.PI, ['जय हनुमान', 'Jai Hanuman'], '#e65100');
banner(45, 85, Math.PI, ['सिया राम', 'Siya Ram'], '#1a237e');
banner(-60, 8, Math.PI / 2, ['असत्य पर', 'सत्य की जीत'], '#880e4f');
// flags along top of effigy fence
{
  const fg = new THREE.ConeGeometry(0.6, 1.4, 3); fg.rotateZ(Math.PI / 2);
  const flags = new THREE.InstancedMesh(fg, new THREE.MeshBasicMaterial({ color: 0xffffff }), 80), d = new THREE.Object3D();
  for (let i = 0; i < 80; i++) { d.position.set(-40 + i, 7 - Math.sin(i / 80 * Math.PI * 4) * 0.6, -82); d.rotation.set(0, 0, -Math.PI / 2); d.updateMatrix(); flags.setMatrixAt(i, d.matrix); flags.setColorAt(i, new THREE.Color([0xff6f00, 0xffeb3b, 0xe91e63, 0x00e676][i % 4])); }
  scene.add(flags); strand(new THREE.Vector3(-40, 7.5, -82), new THREE.Vector3(40, 7.5, -82), 60, 1.2, [0xff6d00, 0xffd000]);
}

// ---------- marigold garlands & diyas ----------
const marigoldGeo = new THREE.SphereGeometry(0.22, 6, 4);
const mg = []; // positions
for (let k = 0; k < 6; k++) { const x = -36 + k * 12; for (let i = 0; i <= 30; i++) { const t = i / 30; mg.push(new THREE.Vector3(x + t * 12, 7.6 - Math.sin(t * Math.PI) * 1.5, -0.9)); mg.push(new THREE.Vector3(x + t * 12, 7.6 - Math.sin(t * Math.PI) * 1.5, 20.9)); } }
for (let i = 0; i <= 60; i++) { const t = i / 60; mg.push(new THREE.Vector3(-11 + t * 22, 13.8 - Math.sin(t * Math.PI) * 2.5, 94.6)); }
{ const im = new THREE.InstancedMesh(marigoldGeo, M(0xffffff, 0xff6f00, 0.35), mg.length), d = new THREE.Object3D();
  mg.forEach((p, i) => { d.position.copy(p); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, new THREE.Color(i % 3 ? 0xff9800 : 0xffc107)); }); scene.add(im); }
const diyaPos = [];
for (let i = 0; i < 70; i++) diyaPos.push(new THREE.Vector3(-35 + i, 0.15, -78));
for (let i = 0; i < 40; i++) { diyaPos.push(new THREE.Vector3(-14 + i * 0.7, 0.15, 93)); }
for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; diyaPos.push(new THREE.Vector3(Math.cos(a) * 12, 0.15, -110 + Math.sin(a) * 12)); }
const diyaBase = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.12, 0.2, 8), M(0x8d3e1f), diyaPos.length);
const diyaFlame = new THREE.InstancedMesh(new THREE.ConeGeometry(0.08, 0.3, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), diyaPos.length);
{ const d = new THREE.Object3D(); diyaPos.forEach((p, i) => { d.position.copy(p); d.updateMatrix(); diyaBase.setMatrixAt(i, d.matrix); d.position.y += 0.25; d.updateMatrix(); diyaFlame.setMatrixAt(i, d.matrix); diyaFlame.setColorAt(i, new THREE.Color(0xffa000)); }); }
scene.add(diyaBase, diyaFlame);

// ---------- bulbs instanced (all strands) ----------
const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), bulbs.length);
{ const d = new THREE.Object3D(); bulbs.forEach((b, i) => { d.position.copy(b.p); d.updateMatrix(); bulbMesh.setMatrixAt(i, d.matrix); bulbMesh.setColorAt(i, b.c); }); scene.add(bulbMesh); }

// ---------- balloons ----------
const balloons = [];
{
  const n = 70, im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 10, 8), M(0xffffff, 0x000000, 1, { roughness: 0.25, metalness: 0.1 }), n);
  for (let i = 0; i < n; i++) {
    const cluster = i < 30; const c = new THREE.Color(pick(NEON));
    balloons.push({ base: cluster ? new THREE.Vector3(-30 + 12 * 4 + R(-1.5, 1.5), R(4, 7), 2 + R(-1, 2)) : new THREE.Vector3(R(-70, 80), R(18, 60), R(-90, 80)), ph: R(0, 6), free: !cluster, vy: R(0.3, 0.9) });
    im.setColorAt(i, c);
  }
  im.material.emissive = new THREE.Color(0x222222);
  scene.add(im); rides.balloons = im;
}

// ---------- RAVANA EFFIGY ----------
const ravana = { G: new THREE.Group(), mats: [], state: 'idle', t: 0 };
{
  const G = ravana.G; G.position.set(0, 0, -110); scene.add(G);
  const S = 1.0;
  const body = M(0xc62828, 0x220000), gold = M(0xffc107, 0x553300), green = M(0x2e7d32, 0x001a00), skin = M(0x4e6b9a, 0x0a0a20);
  ravana.mats.push(body, gold, green, skin);
  // platform
  mesh(new THREE.CylinderGeometry(9, 10, 1.5, 24), M(0x5d4037), 0, 0.75, 0, G);
  const fig = new THREE.Group(); G.add(fig); ravana.fig = fig;
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(1.0, 1.3, 14, 8), green, s * 2.6, 8.5, 0, fig);
  mesh(new THREE.CylinderGeometry(4.5, 7, 9, 16), body, 0, 15, 0, fig); // skirt/dhoti
  mesh(new THREE.CylinderGeometry(4.2, 4.5, 2, 16), gold, 0, 20, 0, fig);
  mesh(new THREE.CylinderGeometry(5.5, 4.2, 10, 16), body, 0, 26, 0, fig); // torso
  mesh(new THREE.TorusGeometry(3.4, 0.4, 6, 24), gold, 0, 28, 2.6, fig).rotation.x = 1.2;
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 6, 30, 0); fig.add(arm);
    const up = mesh(new THREE.CylinderGeometry(1, 0.9, 9, 8), skin, s * 2.5, -3, 0, arm); up.rotation.z = s * 0.6;
    const sh = mesh(new THREE.SphereGeometry(1.7, 10, 8), gold, 0, 0, 0, arm);
    // sword / shield
    if (s > 0) { mesh(new THREE.BoxGeometry(0.4, 12, 1.2), M(0xb0bec5, 0x223344, 0.6, { metalness: 0.8, roughness: 0.2 }), 5.5, -1, 0, arm); }
    else mesh(new THREE.CylinderGeometry(3, 3, 0.4, 20), gold, -5.5, -6, 0.5, arm).rotation.x = Math.PI / 2;
  }
  // faces texture
  const faceTex = (angry) => canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#5d7fb8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(80, 105, 32, 22, 0, 0, TAU); c.ellipse(176, 105, 32, 22, 0, 0, TAU); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(84, 107, 12, 0, TAU); c.arc(172, 107, 12, 0, TAU); c.fill();
    c.strokeStyle = '#111'; c.lineWidth = 12; c.beginPath(); c.moveTo(40, 70); c.lineTo(115, 82); c.moveTo(216, 70); c.lineTo(141, 82); c.stroke();
    c.fillStyle = '#111'; c.beginPath(); c.moveTo(128, 170); c.quadraticCurveTo(70, 150, 30, 190); c.quadraticCurveTo(80, 175, 128, 185); c.quadraticCurveTo(176, 175, 226, 190); c.quadraticCurveTo(186, 150, 128, 170); c.fill();
    c.fillStyle = '#b71c1c'; c.fillRect(100, 200, 56, 14);
    c.fillStyle = '#ffeb3b'; c.fillRect(0, 0, w, 28); c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(128, 30); c.lineTo(118, 55); c.lineTo(138, 55); c.fill();
  });
  const ft = faceTex();
  const headMat = new THREE.MeshStandardMaterial({ map: ft, emissive: 0x111122, roughness: 0.7 }); ravana.mats.push(headMat);
  const heads = new THREE.Group(); heads.position.y = 34; fig.add(heads); ravana.heads = heads;
  for (let i = 0; i < 10; i++) {
    const x = (i - 4.5) * 3.3, y = -Math.abs(i - 4.5) * 0.35 + (i === 4 ? 1 : 0);
    const big = i === 4 ? 1.3 : 1;
    const hgrp = new THREE.Group(); hgrp.position.set(x * (i === 4 ? 0.3 : 1) + (i === 5 ? 1.2 : 0), y + 2.4, i === 4 ? 0.8 : 0); hgrp.scale.setScalar(big); heads.add(hgrp);
    const face = mesh(new THREE.BoxGeometry(3.1, 3.6, 2.4), [skin, skin, skin, skin, headMat, skin].map(m => m), 0, 0, 0, hgrp);
    face.material = [skin, skin, skin, skin, headMat, skin];
    mesh(new THREE.CylinderGeometry(1.0, 1.5, 2.4, 8), gold, 0, 3, 0, hgrp);
    mesh(new THREE.ConeGeometry(0.9, 1.6, 8), gold, 0, 4.9, 0, hgrp);
    mesh(new THREE.SphereGeometry(0.35, 8, 6), glow(0xff1744), 0, 3.2, 1.25, hgrp);
  }
  // fix overlapping centre: rebuild order so heads spread evenly
  heads.children.forEach((h, i) => { h.position.x = (i - 4.5) * 3.3; h.position.z = 0; h.position.y = 2.4 - Math.abs(i - 4.5) * 0.35; });
  // fence
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 4), M(0xaaaaaa), Math.cos(a) * 18, 0.7, Math.sin(a) * 18, G); }
  // firecracker strings on body (glowing dots)
  for (let i = 0; i < 30; i++) mesh(new THREE.SphereGeometry(0.3, 6, 4), glow(0xffeb3b), Math.sin(i) * 5, 12 + i * 0.7, 4.5 + Math.cos(i) * 0.5, fig);
  ravana.baseColors = ravana.mats.map(m => m.color.clone());
}

// ---------- particle system ----------
class Particles {
  constructor(max, size, blending = THREE.AdditiveBlending, tex) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.base = new Float32Array(max * 3); this.drag = new Float32Array(max); this.grav = new Float32Array(max); this.kind = new Uint8Array(max);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2000);
    this.mat = new THREE.PointsMaterial({ size, vertexColors: true, blending, depthWrite: false, transparent: true, map: tex, sizeAttenuation: true });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; scene.add(this.points);
    this.head = 0; this.life.fill(0);
  }
  emit(p, v, c, life, drag = 0.98, grav = -9.8, kind = 0) {
    const i = this.head; this.head = (this.head + 1) % this.max;
    this.pos.set([p.x, p.y, p.z], i * 3); this.vel.set([v.x, v.y, v.z], i * 3); this.base.set([c.r, c.g, c.b], i * 3);
    this.life[i] = life; this.maxLife[i] = life; this.drag[i] = drag; this.grav[i] = grav; this.kind[i] = kind; return i;
  }
  update(dt, onDie) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 0; this.pos[i * 3 + 1] = -999; continue; }
      this.life[i] -= dt; const k = i * 3, d = Math.pow(this.drag[i], dt * 60);
      this.vel[k] *= d; this.vel[k + 1] = this.vel[k + 1] * d + this.grav[i] * dt; this.vel[k + 2] *= d;
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      let f = Math.max(this.life[i] / this.maxLife[i], 0);
      if (this.kind[i] === 2) f *= (Math.random() < 0.5 ? 1.5 : 0.2); // crackle
      this.col[k] = this.base[k] * f; this.col[k + 1] = this.base[k + 1] * f; this.col[k + 2] = this.base[k + 2] * f;
      if (this.life[i] <= 0 && onDie) onDie(i, this);
    }
    this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.attributes.color.needsUpdate = true;
  }
}
const dotTex = canvasTex(64, 64, (c, w) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.3, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
const smokeTex = canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
const fw = new Particles(9000, 1.3, THREE.AdditiveBlending, dotTex);
const fire = new Particles(5000, 3.4, THREE.AdditiveBlending, dotTex);
const smoke = new Particles(1500, 7, THREE.NormalBlending, smokeTex); smoke.mat.opacity = 0.35;
const steam = new Particles(600, 1.4, THREE.NormalBlending, smokeTex); steam.mat.opacity = 0.35;
const rockets = [];
const tmpV = new THREE.Vector3(), tmpC = new THREE.Color();
function launchRocket(x, z, big = false) {
  const p = new THREE.Vector3(x, 1, z), v = new THREE.Vector3(R(-3, 3), R(38, 52) * (big ? 1.15 : 1), R(-3, 3));
  rockets.push({ p, v, t: R(1.3, 1.9), big, col: new THREE.Color(pick(NEON)), col2: new THREE.Color(pick(NEON)) });
  audio.whistle(p);
}
function burst(r) {
  const n = r.big ? 420 : 240, type = (Math.random() * 4) | 0, sp = r.big ? 26 : 20;
  for (let i = 0; i < n; i++) {
    tmpV.set(R(-1, 1), R(-1, 1), R(-1, 1)).normalize();
    let s = sp * (type === 1 ? 1 : R(0.85, 1.05)); if (type === 2) { tmpV.y *= 0.2; tmpV.normalize(); }
    const c = (type === 3 && i % 2) ? r.col2 : r.col;
    fw.emit(r.p, tmpV.multiplyScalar(s), c, R(1.6, 2.6), 0.955, -6, type === 1 && i % 3 === 0 ? 2 : 0);
  }
  for (let i = 0; i < 30; i++) fw.emit(r.p, tmpV.set(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(6), tmpC.set(0xffffff), 0.4, 0.9, 0);
  flash = Math.min(flash + (r.big ? 0.5 : 0.3), 1); flashColor.copy(r.col);
  audio.boom(r.p, r.big); if (type === 1 || Math.random() < 0.4) setTimeout(() => audio.crackle(r.p), 600);
}
let flash = 0; const flashColor = new THREE.Color(); const flashLight = new THREE.PointLight(0xffffff, 0, 400, 1.2); flashLight.position.set(0, 60, -80); scene.add(flashLight);

// ---------- crowd ----------
const CROWD_MAX = 900;
const bodyGeo = new THREE.CylinderGeometry(0.22, 0.42, 1.25, 7); bodyGeo.translate(0, 0.62, 0);
const headGeo = new THREE.SphereGeometry(0.2, 8, 6); headGeo.translate(0, 1.47, 0);
const hairGeo = new THREE.SphereGeometry(0.215, 8, 6, 0, TAU, 0, 1.5); hairGeo.translate(0, 1.5, 0);
const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 4); legGeo.translate(0, 0.25, 0);
const crowdBody = new THREE.InstancedMesh(bodyGeo, M(0xffffff, 0x000000, 1, { roughness: 0.8 }), CROWD_MAX);
const crowdHead = new THREE.InstancedMesh(headGeo, M(0xffffff, 0, 1, { roughness: 0.9 }), CROWD_MAX);
const crowdHair = new THREE.InstancedMesh(hairGeo, M(0x111111), CROWD_MAX);
const crowdDup = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), M(0xffffff), CROWD_MAX); // dupatta / shoulder cloth
[crowdBody, crowdHead, crowdHair, crowdDup].forEach(m => { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); });
const POI = [[-55, -8], [42, 4], [48, 20], [-32, 24], [4, 52], [85, -35], [0, -88], [-30, 10], [-6, 10], [18, 10], [42, 10], [0, 85], [-60, 60], [70, 50], [-75, -40], [20, -50], [-20, -50]];
function okSpot(x, z) { // keep out of rides / stalls footprints
  if (Math.hypot(x + 55, z + 25) < 9) return false; if (Math.abs(x - 42) < 10 && Math.abs(z + 12) < 6) return false;
  if (Math.hypot(x - 48, z - 34) < 11) return false; if (Math.hypot(x + 32, z - 38) < 11) return false;
  if (Math.abs(x - 4) < 16 && Math.abs(z - 66) < 10) return false; if (Math.hypot(x, z + 110) < 19) return false;
  if (x > -34 && x < 38 && ((z > 0 && z < 4.5) || (z > 15.5 && z < 20))) return false; return true;
}
for (let i = 0; i < CROWD_MAX; i++) {
  let x, z; const p = pick(POI); do { x = p[0] + R(-14, 14); z = p[1] + R(-12, 12); } while (!okSpot(x, z));
  const female = Math.random() < 0.5, child = Math.random() < 0.22;
  const s = child ? R(0.55, 0.7) : R(0.9, 1.08);
  people.push({ x, z, tx: x, tz: z, s, speed: R(0.8, 1.6) * (child ? 1.3 : 1), idle: Math.random() < 0.35 ? R(1, 20) : 0, ph: R(0, 6), yaw: R(0, TAU), female, watch: null });
  crowdBody.setColorAt(i, new THREE.Color(pick(CLOTH))); crowdHead.setColorAt(i, new THREE.Color(pick(SKIN)));
  crowdDup.setColorAt(i, new THREE.Color(female ? pick(CLOTH) : pick([0xffffff, 0xfff3e0, 0xffcc80])));
}
function newTarget(pp) { const p = pick(POI); let x, z, k = 0; do { x = p[0] + R(-12, 12); z = p[1] + R(-10, 10); } while (!okSpot(x, z) && ++k < 20); pp.tx = x; pp.tz = z; }
people.forEach(newTarget);
let crowdCount = quality === 'high' ? CROWD_MAX : 450;
const dummy = new THREE.Object3D();
function updateCrowd(t, dt) {
  const dahan = ravana.state === 'burning' || ravana.state === 'show';
  for (let i = 0; i < crowdCount; i++) {
    const p = people[i];
    let tx = p.tx, tz = p.tz;
    if (dahan && i % 2 === 0) { if (!p.watch) { const a = R(-1.2, 1.2) - Math.PI / 2, r = R(24, 50); p.watch = [Math.cos(a) * r * -1 * 0 + Math.sin(a) * 0 + R(-35, 35), -110 + r]; } tx = p.watch[0]; tz = p.watch[1]; }
    else if (p.watch) p.watch = null;
    let moving = false;
    if (p.idle > 0) { p.idle -= dt; }
    else {
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (d < 0.5) { if (!dahan) { p.idle = Math.random() < 0.5 ? R(2, 12) : 0; newTarget(p); } }
      else { const sp = p.speed * (dahan ? 1.6 : 1) * dt; const nx = p.x + dx / d * sp, nz = p.z + dz / d * sp; if (okSpot(nx, nz)) { p.x = nx; p.z = nz; } else { newTarget(p); } p.yaw = Math.atan2(dx, dz); moving = true; }
    }
    if (dahan && p.watch) p.yaw = Math.atan2(0 - p.x, -110 - p.z);
    const bob = moving ? Math.abs(Math.sin(t * 8 * p.speed + p.ph)) * 0.08 : (dahan ? Math.abs(Math.sin(t * 6 + p.ph)) * 0.25 : 0);
    dummy.position.set(p.x, bob, p.z); dummy.rotation.set(0, p.yaw, moving ? Math.sin(t * 8 + p.ph) * 0.05 : 0); dummy.scale.setScalar(p.s); dummy.updateMatrix();
    crowdBody.setMatrixAt(i, dummy.matrix); crowdHead.setMatrixAt(i, dummy.matrix); crowdHair.setMatrixAt(i, dummy.matrix);
    dummy.position.y = bob + 1.2 * p.s; dummy.rotation.z = p.female ? 0.4 : 0; dummy.updateMatrix(); crowdDup.setMatrixAt(i, dummy.matrix);
  }
  for (const m of [crowdBody, crowdHead, crowdHair, crowdDup]) { m.count = crowdCount; m.instanceMatrix.needsUpdate = true; }
}

// ---------- audio ----------
const audio = new Audio();

// ---------- controls ----------
const ui = document.getElementById('ui'), msgEl = document.getElementById('msg');
let mode = 'tour', fly = false, yaw = Math.PI, pitch = -0.1;
const pos = new THREE.Vector3(0, 1.7, 100), keys = {};
let msgT = 0; function say(s, d = 3) { msgEl.textContent = s; msgT = d; }
function setMode(m) {
  mode = m; document.querySelectorAll('#ui button').forEach(b => b.classList.toggle('on', b.dataset.a === m || (b.dataset.a === 'fly' && fly)));
  if (m === 'explore') { pos.copy(camera.position); if (!fly) pos.y = 1.7; const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ'); yaw = e.y; pitch = e.x; say(isMobile ? 'Joystick se chalo, drag karke dekho' : 'Click karo, phir WASD + mouse • Shift = daudo', 4); }
  if (m === 'wheel') say('🎡 Giant Wheel ki sawaari! Upar se mela dekho', 4);
  if (m === 'swing') say('⛵ Nav jhoola – pakad ke baitho!', 4);
  if (m === 'tour') { tourT = 0; say('🎥 Mela tour', 3); }
}
addEventListener('keydown', e => { keys[e.code] = true; if (started && mode === 'tour' && /Key[WASD]|Arrow/.test(e.code)) setMode('explore'); if (e.code === 'KeyR' && started) startDahan(); });
addEventListener('keyup', e => keys[e.code] = false);
canvas.addEventListener('click', () => { if (!isMobile && started && (mode === 'explore') && canvas.requestPointerLock) canvas.requestPointerLock(); if (started && mode === 'tour' && !isMobile) { setMode('explore'); canvas.requestPointerLock?.(); } });
addEventListener('mousemove', e => { if (document.pointerLockElement === canvas) { yaw -= e.movementX * 0.0022; pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.0022, -1.4, 1.4); } });
// touch: joystick + drag look
const joy = document.getElementById('joy'), knob = document.getElementById('knob'); let joyV = { x: 0, y: 0 }, joyId = null, lookId = null, lx = 0, ly = 0;
canvas.addEventListener('touchstart', e => { for (const t of e.changedTouches) { if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; } } if (started && mode === 'tour') setMode('explore'); }, { passive: true });
canvas.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === lookId) { yaw -= (t.clientX - lx) * 0.005; pitch = THREE.MathUtils.clamp(pitch - (t.clientY - ly) * 0.005, -1.4, 1.4); lx = t.clientX; ly = t.clientY; } }, { passive: true });
canvas.addEventListener('touchend', e => { for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null; });
joy.addEventListener('touchstart', e => { joyId = e.changedTouches[0].identifier; if (mode !== 'explore') setMode('explore'); e.preventDefault(); }, { passive: false });
joy.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === joyId) { const r = joy.getBoundingClientRect(); let x = (t.clientX - r.left - 60) / 50, y = (t.clientY - r.top - 60) / 50; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } joyV = { x, y }; knob.style.left = 35 + x * 40 + 'px'; knob.style.top = 35 + y * 40 + 'px'; } e.preventDefault(); }, { passive: false });
joy.addEventListener('touchend', () => { joyV = { x: 0, y: 0 }; knob.style.left = knob.style.top = '35px'; });
ui.addEventListener('click', e => {
  const a = e.target.closest('button')?.dataset.a; if (!a) return; e.stopPropagation();
  if (a === 'dahan') startDahan();
  else if (a === 'sound') { const on = audio.toggle(); e.target.textContent = on ? '🔊 Sound' : '🔇 Sound'; }
  else if (a === 'quality') { setQuality(quality === 'high' ? 'low' : 'high'); }
  else if (a === 'fly') { fly = !fly; if (mode !== 'explore') setMode('explore'); else setMode('explore'); say(fly ? '🕊️ Udo! Space/C ya joystick' : '🚶 Zameen par wapas', 2); }
  else setMode(a);
});
function setQuality(q) {
  quality = q; document.querySelector('[data-a=quality]').textContent = q === 'high' ? '✨ High' : '⚡ Low';
  crowdCount = q === 'high' ? CROWD_MAX : 450; bloom.enabled = true; bloom.strength = q === 'high' ? 0.85 : 0.7;
  renderer.shadowMap.enabled = false; resize();
}

// ---------- tour path ----------
const tourKeys = [
  [[0, 55, 160], [0, 10, -40]], [[0, 25, 120], [0, 8, 0]], [[0, 3, 96], [0, 5, 40]], [[-4, 2.2, 30], [0, 3, 0]], [[0, 2, 10], [10, 3, 10]],
  [[20, 2.2, 10], [40, 4, 10]], [[-20, 2.5, 26], [-32, 4, 38]], [[-40, 6, 10], [-55, 22, -25]], [[-30, 12, -10], [-55, 25, -25]],
  [[15, 8, 10], [42, 10, -12]], [[30, 6, 40], [48, 10, 34]], [[60, 20, -10], [85, 10, -55]], [[30, 35, -40], [0, 30, -110]], [[0, 18, -60], [0, 30, -110]], [[0, 60, -20], [0, 60, -120]], [[0, 55, 160], [0, 10, -40]],
];
const tourPos = new THREE.CatmullRomCurve3(tourKeys.map(k => new THREE.Vector3(...k[0]))), tourLook = new THREE.CatmullRomCurve3(tourKeys.map(k => new THREE.Vector3(...k[1])));
let tourT = 0; const TOUR_LEN = 80;

// ---------- Ravan dahan ----------
let nextAutoDahan = 120, nextFw = 6;
function startDahan() {
  if (ravana.state !== 'idle') return; ravana.state = 'arrow'; ravana.t = 0; say('🏹 Jai Shri Ram! Ravan Dahan shuru!', 4);
  arrow.visible = true; audio.cheer(new THREE.Vector3(0, 2, -80), 1.5);
}
const arrow = new THREE.Group(); { mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), glow(0xffd54f), 0, 0, 0, arrow).rotation.x = Math.PI / 2; mesh(new THREE.ConeGeometry(0.4, 1.2, 6), glow(0xff3d00), 0, 0, -3.4, arrow).rotation.x = -Math.PI / 2; arrow.visible = false; scene.add(arrow); }
function updateRavana(t, dt) {
  const R0 = ravana; R0.t += dt; const fig = R0.fig;
  if (R0.state === 'arrow') {
    const k = Math.min(R0.t / 2.2, 1); arrow.position.set(0, 2 + Math.sin(k * Math.PI) * 25 + k * 18, -70 - k * 38); arrow.rotation.x = -0.6 + k * 0.9;
    for (let i = 0; i < 3; i++) fire.emit(arrow.position, tmpV.set(R(-1, 1), R(0, 2), R(-1, 1)), tmpC.setRGB(1, 0.6, 0.1), 0.5, 0.95, 2);
    if (k >= 1) { R0.state = 'burning'; R0.t = 0; arrow.visible = false; audio.boom(new THREE.Vector3(0, 20, -110), true); audio.fireRoar(true); }
  } else if (R0.state === 'burning') {
    const k = Math.min(R0.t / 14, 1), rate = (quality === 'high' ? 160 : 80) * (0.4 + k);
    for (let i = 0; i < rate * dt * 4; i++) {
      const h = R(1, 40 * (1 - k * 0.6)); const w = h > 32 ? 17 : 6;
      fire.emit(tmpV.set(R(-w, w), h, -110 + R(-3, 3)), new THREE.Vector3(R(-1.5, 1.5), R(4, 11), R(-1.5, 1.5)), tmpC.setHSL(R(0.02, 0.11), 1, R(0.5, 0.65)), R(0.6, 1.4), 0.97, 3);
    }
    for (let i = 0; i < rate * dt * 0.6; i++) smoke.emit(tmpV.set(R(-8, 8), R(20, 40), -110), new THREE.Vector3(R(-1, 1) + 1.5, R(4, 8), R(-1, 1)), tmpC.setRGB(0.25, 0.22, 0.2), R(4, 7), 0.99, 0.4);
    if (Math.random() < dt * 12) { fw.emit(tmpV.set(R(-8, 8), R(8, 36), -105), new THREE.Vector3(R(-10, 10), R(5, 20), R(-10, 10)), tmpC.setRGB(1, 0.9, 0.5), R(0.5, 1.2), 0.96, -9, 2); audio.pop(tmpV); }
    R0.mats.forEach((m, i) => { m.color.copy(R0.baseColors[i]).lerp(tmpC.setRGB(0.08, 0.05, 0.04), k); m.emissive.setRGB(0.5 * k * (0.6 + Math.random() * 0.4), 0.15 * k, 0); });
    effigyLight.intensity = 3000 * (0.6 + 0.4 * Math.random()) * (0.3 + k);
    fig.rotation.z = Math.sin(t * 3) * 0.01 * k;
    if (R0.t > 9) { const c = (R0.t - 9) / 5; R0.heads.rotation.x = Math.min(c, 1) * 0.9; R0.heads.position.y = 34 - Math.min(c, 1) * 10; }
    if (R0.t > 11) { const c = Math.min((R0.t - 11) / 4, 1); fig.rotation.x = -c * 1.35 * c; fig.position.y = -c * 6; }
    if (R0.t > 15) { R0.state = 'show'; R0.t = 0; say('🎆 Shubh Dussehra! Asatya par satya ki jeet 🎆', 6); audio.cheer(new THREE.Vector3(0, 2, -80), 2); }
  } else if (R0.state === 'show') {
    effigyLight.intensity = Math.max(effigyLight.intensity * 0.995, 400);
    if (R0.t < 25) { for (let i = 0; i < rate(1.6); i++) if (Math.random() < dt * 3.2) launchRocket(R(-60, 60), -95 + R(-15, 15), Math.random() < 0.4); }
    if (Math.random() < dt * 10) fire.emit(tmpV.set(R(-6, 6), R(1, 4), -110), new THREE.Vector3(R(-1, 1), R(2, 5), R(-1, 1)), tmpC.setHSL(0.06, 1, 0.5), R(0.5, 1), 0.97, 2);
    if (R0.t > 40) resetRavana();
  }
  function rate(x) { return x; }
}
function resetRavana() { const R0 = ravana; R0.state = 'idle'; R0.fig.rotation.set(0, 0, 0); R0.fig.position.y = 0; R0.heads.rotation.x = 0; R0.heads.position.y = 34; R0.mats.forEach((m, i) => { m.color.copy(R0.baseColors[i]); m.emissive.setRGB(0.05, 0.02, 0.02); }); effigyLight.intensity = 300; nextAutoDahan = clock.elapsedTime + 120; say('Ravan phir taiyaar hai… agla dahan 2 minute mein', 3); audio.fireRoar(false); }

// ---------- main loop ----------
const clock = new THREE.Clock(); let started = false;
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(0, 0, 0, 'YXZ');
function cameraUpdate(t, dt) {
  if (mode === 'tour') {
    tourT = (tourT + dt / TOUR_LEN) % 1; const u = tourT;
    camera.position.copy(tourPos.getPointAt(u)); const L = tourLook.getPointAt(Math.min(u + 0.004, 1));
    camera.position.x += Math.sin(t * 1.3) * 0.15; camera.position.y += Math.sin(t * 1.7) * 0.1;
    camera.lookAt(L); camera.rotation.z += Math.sin(t * 0.9) * 0.008;
  } else if (mode === 'explore') {
    let mx = 0, mz = 0; if (keys.KeyW || keys.ArrowUp) mz += 1; if (keys.KeyS || keys.ArrowDown) mz -= 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
    mx += joyV.x; mz -= joyV.y;
    const sp = (keys.ShiftLeft || keys.ShiftRight ? 14 : 6) * (fly ? 2.5 : 1);
    tmpE.set(pitch, yaw, 0); camera.quaternion.setFromEuler(tmpE);
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); if (fly) fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    pos.addScaledVector(fwd, mz * sp * dt).addScaledVector(right, mx * sp * dt);
    if (fly) { if (keys.Space) pos.y += sp * dt; if (keys.KeyC) pos.y -= sp * dt; pos.y = THREE.MathUtils.clamp(pos.y, 1.7, 150); }
    else { pos.y = THREE.MathUtils.lerp(pos.y, 1.7, 0.1); }
    pos.x = THREE.MathUtils.clamp(pos.x, -170, 170); pos.z = THREE.MathUtils.clamp(pos.z, -170, 170);
    const walking = Math.abs(mx) + Math.abs(mz) > 0.1 && !fly;
    camera.position.copy(pos); if (walking) camera.position.y += Math.sin(t * 9) * 0.05;
  } else if (mode === 'wheel') {
    const c = rides.wheel.cabins[0].cab; c.updateWorldMatrix(true, false); c.getWorldPosition(camera.position); camera.position.y -= 1.35; camera.position.z += 0.5;
    if (document.pointerLockElement !== canvas && !lookId) yaw = Math.PI * 0.75 + Math.sin(t * 0.1) * 0.6;
    tmpE.set(pitch * 0.5 - 0.15, yaw, 0); camera.quaternion.setFromEuler(tmpE);
  } else if (mode === 'swing') {
    const h = rides.ship.hull; h.updateWorldMatrix(true, false); camera.position.set(-5.2, 2.2, 0).applyMatrix4(h.matrixWorld);
    tmpQ.setFromRotationMatrix(h.matrixWorld); tmpE.set(pitch * 0.5 - 0.12, yaw - Math.PI / 2, 0); camera.quaternion.copy(tmpQ).multiply(new THREE.Quaternion().setFromEuler(tmpE));
    if (document.pointerLockElement !== canvas && !lookId) { yaw = 0; pitch = 0; }
  }
}
const bulbCol = new THREE.Color();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  // rides
  const W = rides.wheel; W.wheel.rotation.z = t * 0.07; W.cabins.forEach(c => { c.pivot.rotation.z = -W.wheel.rotation.z; c.cab.rotation.z = Math.sin(t * 1.2 + c.ph) * 0.06; });
  const shipA = Math.sin(t * 0.85) * 1.15; rides.ship.arm.rotation.z = shipA;
  rides.chain.top.rotation.y = t * 1.6; rides.chain.top.rotation.z = Math.sin(t * 0.5) * 0.12; rides.chain.seats.forEach(s => { s.piv.rotation.z = 0; s.piv.rotation.x = 0; s.piv.rotation.set(0, 0, 0); const v = new THREE.Vector3(Math.cos(s.a), 0, Math.sin(s.a)); s.piv.rotation.z = v.x * 0.75; s.piv.rotation.x = -v.z * 0.75; });
  rides.merry.rot.rotation.y = t * 0.45; rides.merry.horses.forEach(h => { h.h.position.y = 2.5 + Math.sin(t * 2.2 + h.ph) * 0.6; });
  rides.bumper.cars.forEach(c => { c.turn += R(-1, 1) * dt * 3; c.turn = THREE.MathUtils.clamp(c.turn, -1.5, 1.5); c.a += c.turn * dt; c.x += Math.sin(c.a) * c.v * dt; c.z += Math.cos(c.a) * c.v * dt; if (Math.abs(c.x) > 13.5) { c.x = Math.sign(c.x) * 13.5; c.a = -c.a; } if (Math.abs(c.z) > 7.5) { c.z = Math.sign(c.z) * 7.5; c.a = Math.PI - c.a; } c.car.position.set(c.x, 0, c.z); c.car.rotation.y = c.a; });
  const C = rides.coaster; C.u = (C.u + dt * (0.045 + 0.02 * Math.sin(t))) % 1; C.train.forEach((car, i) => { const u = (C.u - i * 0.014 + 1) % 1; car.position.copy(C.curve.getPointAt(u)); car.lookAt(C.curve.getPointAt((u + 0.005) % 1)); });
  // balloons
  for (let i = 0; i < balloons.length; i++) { const b = balloons[i]; if (b.free) { b.base.y += b.vy * dt; if (b.base.y > 90) b.base.y = 3; } dummy.position.set(b.base.x + Math.sin(t + b.ph) * 0.3, b.base.y + Math.sin(t * 1.3 + b.ph) * 0.2, b.base.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1.2, 1); dummy.updateMatrix(); rides.balloons.setMatrixAt(i, dummy.matrix); }
  rides.balloons.instanceMatrix.needsUpdate = true;
  // twinkle bulbs (chase)
  for (let i = 0; i < bulbs.length; i++) { const f = 0.55 + 0.45 * Math.sin(t * 4 - i * 0.5); bulbCol.copy(bulbs[i].c).multiplyScalar(f * 1.6); bulbMesh.setColorAt(i, bulbCol); }
  bulbMesh.instanceColor.needsUpdate = true;
  for (let i = 0; i < diyaPos.length; i++) { bulbCol.setRGB(1, 0.55 + Math.random() * 0.15, 0.1).multiplyScalar(1.5 + Math.random() * 0.8); diyaFlame.setColorAt(i, bulbCol); } diyaFlame.instanceColor.needsUpdate = true;
  warmLights.forEach((l, i) => { if (l !== effigyLight) l.intensity = 500 * (0.85 + 0.15 * Math.sin(t * 2 + i)); });
  // steam
  if (Math.random() < 0.8) { const s = pick(steamSources); steam.emit(s, new THREE.Vector3(R(-0.2, 0.2), R(0.8, 1.4), R(-0.2, 0.2)), tmpC.setRGB(0.9, 0.85, 0.8), R(1.5, 2.5), 0.99, 0.1); }
  updateCrowd(t, dt);
  // fireworks & dahan
  if (started && t > nextFw && ravana.state === 'idle') { launchRocket(R(-80, 80), R(-100, -40)); if (Math.random() < 0.5) launchRocket(R(-80, 80), R(-100, -40)); nextFw = t + R(5, 12); }
  if (started && t > nextAutoDahan && ravana.state === 'idle') startDahan();
  for (let i = rockets.length - 1; i >= 0; i--) { const r = rockets[i]; r.t -= dt; r.v.y -= 9.8 * dt * 0.5; r.p.addScaledVector(r.v, dt); fw.emit(r.p, tmpV.set(R(-1, 1), R(-2, 0), R(-1, 1)), tmpC.setRGB(1, 0.7, 0.3), 0.6, 0.95, -2); if (r.t <= 0) { burst(r); rockets.splice(i, 1); } }
  updateRavana(t, dt);
  fw.update(dt); fire.update(dt); smoke.update(dt); steam.update(dt);
  flash *= Math.pow(0.02, dt); flashLight.intensity = flash * 1500; flashLight.color.copy(flashColor);
  cameraUpdate(t, dt);
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) msgEl.textContent = ''; }
  audio.update(camera, t, { wheelSpeed: 1, ship: shipA, dahan: ravana.state });
  composer.render();
  frames++;
}
let frames = 0;
window.__mela = { setMode, startDahan, camera, get frames() { return frames; }, ravana, launchRocket, setPose(p, l) { mode = 'pose'; camera.position.set(...p); camera.lookAt(...l); }, step(n, dt = 1 / 30) { for (let i = 0; i < n; i++) { clock.elapsedTime += 0; animateFixed(dt); } } };
function animateFixed(dt) { clock.getDelta(); const old = clock.getDelta; clock.getDelta = () => dt; clock.elapsedTime += dt; animate(); clock.getDelta = old; }
resize(); setQuality(quality);
renderer.setAnimationLoop(animate);
document.getElementById('go').onclick = () => {
  document.getElementById('start').classList.add('hidden'); ui.classList.remove('hidden'); if (isMobile) document.getElementById('joy').classList.remove('hidden');
  started = true; audio.start(); setMode('tour'); nextFw = clock.elapsedTime + 3; nextAutoDahan = clock.elapsedTime + 75;
};
