// RORUBARU · Live Hand-Roll Counter
// A real-time miniature of the Wan Chai bar, built from the premises floor plan
// (26 seats around a U-shaped counter, DJ booth at the glass shopfront, entrance
// and reception front-left, open kitchen at the back, washrooms on the right).
//
// LIVE DATA: the scene runs a simulation by default. Real numbers plug in three ways
// (see LIVE below): ?feed=<url-to-json> polled every 20 s, a postMessage from the page
// that embeds this iframe, or window.RORUBARU_LIVE.set({...}) from code on this page.
// Shape: { rolls_today, queue, seats_filled, dj } — any subset. (wait_min is accepted but not shown:
// no wait time is displayed until a real queue count exists.) Until real data arrives the on-screen
// stats are labelled DEMO.

import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { buildCity } from './city.js';
import { hkStatus } from './hours.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const COMPACT = params.has('compact');

// ---------- seeded random (deterministic loop, same scene every load) ----------
let _seed = 20260321;
function rand() { _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0; let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const rr = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---------- brand ----------
const ORANGE = 0xF64501, CREAM = 0xF6F3E7;

// ---------- layout (metres; x = along Queen's Road East frontage → east, z = toward the back wall is −z) ----------
const L = {
  glassX: -7.4,          // glass shopfront on Queen's Road East
  eastX: 6.5,            // east wall (washrooms beyond)
  southZ: 4.1,           // side wall along the long counter run (teal panels)
  backZ: -1.75,          // open kitchen line (bottle fridges)
  northZ: -4.2,          // rear wall of the kitchen
  doorZ: -2.9,           // entrance, front-left
  F: 2.2,                // long counter run, centre line
  XL: -4.6, XR: 4.9,     // counter legs, centre lines
  ZB: -0.95,             // where the legs end (U opens to the kitchen)
  CH: 1.0,               // counter height
  walkX: -5.95,          // aisle between shopfront and the left leg
  corrZ: 3.45,           // corridor behind the long-run seats
  laneZ: 1.35,           // chefs' lane inside the U
};

// ---------- LIVE data adapter ----------
const LIVE = {
  source: 'sim',          // 'sim' | 'feed' | 'push'
  stats: null,            // last real stats received
  rollsOffset: 0,
  set(s) {
    if (!s || typeof s !== 'object') return;
    this.stats = Object.assign({}, this.stats || {}, s);
    if (this.source === 'sim') this.source = 'push';
    if (typeof s.rolls_today === 'number') { sim.rollsToday = s.rolls_today; }
    if (typeof s.queue === 'number') sim.queueTarget = Math.max(0, Math.min(14, Math.round(s.queue)));
    if (typeof s.seats_filled === 'number') sim.seatTarget = Math.max(0, Math.min(26, Math.round(s.seats_filled)));
    updateSourceTag();
  },
};
window.RORUBARU_LIVE = LIVE;
window.addEventListener('message', (e) => {
  const d = e.data;
  if (d && d.type === 'rorubaru-live') LIVE.set(d);
});
const feed = params.get('feed');
if (feed) {
  LIVE.source = 'feed';
  const poll = () => fetch(feed, { cache: 'no-store' }).then(r => r.json()).then(j => { LIVE.set(j); LIVE.source = 'feed'; updateSourceTag(); }).catch(() => {});
  poll(); setInterval(poll, 20000);
}
function updateSourceTag() {
  const t = document.getElementById('srcTag');
  if (t) t.textContent = LIVE.source === 'sim' ? 'demo data' : 'live';
}

// ---------- renderer / scene ----------
const canvas = document.getElementById('scene');
const isSmall = Math.min(innerWidth, innerHeight) < 600;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: CAPTURE });
// quality tiers: low (small/older phones), mid (phones), high (laptops/desktops). ?q=low|mid|high forces one.
const QUALITY = (() => { const q = new URLSearchParams(location.search).get('q'); if (['low', 'mid', 'high'].includes(q)) return q;
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  if (isSmall && (cores <= 4 || mem <= 3)) return 'low'; return isSmall ? 'mid' : 'high'; })();
document.documentElement.dataset.q = QUALITY;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QUALITY === 'low' ? 1.25 : QUALITY === 'mid' ? 1.6 : 2));
if (QUALITY === 'high') { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, 38, 75);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 7;
controls.maxDistance = 48;
controls.minPolarAngle = 0.28;
controls.maxPolarAngle = 1.32;
controls.minAzimuthAngle = -1.25;
controls.maxAzimuthAngle = 1.25;
controls.screenSpacePanning = false;
canvas.tabIndex = 0;

// lights: night street + warm counter + teal wall
scene.add(new THREE.HemisphereLight(0xa9b8d8, 0x2a2018, 1.25));
scene.add(new THREE.AmbientLight(0xffe2c8, 0.35));
const moon = new THREE.DirectionalLight(0xc9d6ff, 0.55); moon.position.set(-10, 18, 8); scene.add(moon);
function pLight(color, intensity, dist, x, y, z) { const l = new THREE.PointLight(color, intensity, dist, 1.6); l.position.set(x, y, z); scene.add(l); return l; }
pLight(0xffc48a, 26, 9, -2.2, 2.6, 1.0);
pLight(0xffc48a, 26, 9, 2.6, 2.6, 1.0);
pLight(0x2fe0d0, 18, 8, 0.5, 1.4, 3.7);
pLight(0x2fe0d0, 12, 7, 6.0, 1.6, 0.6);
const djLight = pLight(ORANGE, 14, 6, -6.0, 1.9, 1.6);
pLight(0xffd0a8, 10, 6, -6.2, 2.7, -1.0);
pLight(0xff6a9a, 8, 7, -6.4, 2.4, -2.2);
// the room's own lights (not the street lamps outside the glass) dim after hours
const roomLights = scene.children.filter((o) => o.isPointLight && o !== djLight && o.position.x > L.glassX).map((l) => ({ l, base: l.intensity }));
pLight(0xffd9a0, 16, 10, -9.2, 4.5, -6.5);
pLight(0xffd9a0, 12, 10, -9.2, 4.5, 4.0);

// ---------- materials / helpers ----------
const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (matCache.has(key)) return matCache.get(key);
  const m = opts.basic ? new THREE.MeshBasicMaterial(Object.assign({ color }, opts.o || {}))
    : new THREE.MeshLambertMaterial(Object.assign({ color, flatShading: false }, opts.o || {}));
  matCache.set(key, m); return m;
}
const glow = (color, o = {}) => mat(color, { basic: true, o });
function box(w, h, d, m, x, y, z, parent = scene) { const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.position.set(x, y, z); parent.add(g); return g; }
function cyl(rt, rb, h, seg, m, x, y, z, parent = scene) { const g = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); g.position.set(x, y, z); parent.add(g); return g; }

function textTexture(lines, { w = 1024, h = 256, font = '900 150px Geist, sans-serif', color = '#F6F3E7', bg = null, glowColor = null, align = 'center', mirror = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  if (mirror) { g.translate(w, 0); g.scale(-1, 1); }
  g.font = font; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color;
  if (glowColor) { g.shadowColor = glowColor; g.shadowBlur = 28; }
  const arr = Array.isArray(lines) ? lines : [lines];
  arr.forEach((t, i) => g.fillText(t, align === 'center' ? w / 2 : 20, h * (i + 0.5) / arr.length));
  if (glowColor) g.fillText(arr[0], w / 2, h / 2 / arr.length);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}
// canvas signs whose words follow the language toggle (Dominic, Oct 13: one language at a time)
const LANG_SIGNS = [];
const langNow = () => (['zh', 'ja'].includes(document.documentElement.dataset.lang) ? document.documentElement.dataset.lang : 'en');
function langSign(material, byLang, opt) { material.map = textTexture(byLang[langNow()] || byLang.en, opt); LANG_SIGNS.push({ material, byLang, opt, l: langNow() }); return material; }
new MutationObserver(() => {
  const l = langNow();
  for (const s of LANG_SIGNS) { if (s.l === l) continue; s.l = l; const old = s.material.map; s.material.map = textTexture(s.byLang[l] || s.byLang.en, s.opt); s.material.needsUpdate = true; if (old) old.dispose(); }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
function plane(w, h, material, x, y, z, ry = 0, parent = scene) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); p.position.set(x, y, z); p.rotation.y = ry; parent.add(p); return p; }

// ---------- the world ----------
const world = new THREE.Group(); scene.add(world);

// The street outside is the real block (OpenStreetMap), built by city.js after the room is batched.

// ---------- the room shell ----------
const floorMat = mat(0x68635d);   // light grey polished concrete floor (his photos: DSC07596, DSC07643)
box(L.eastX - L.glassX, 0.06, L.southZ - L.northZ, floorMat, (L.eastX + L.glassX) / 2, 0.03, (L.southZ + L.northZ) / 2);
const stoneTex = new THREE.TextureLoader().load('tex/meshstone.jpg'); stoneTex.colorSpace = THREE.SRGBColorSpace; stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
const wallMat = new THREE.MeshLambertMaterial({ color: 0x5f5a54, map: stoneTex }); wallMat.userData.wuv = 1.8;   // split-face stone behind perforated metal mesh (his hero photo)
const H = 3.2;
box(L.eastX - L.glassX + 0.3, H, 0.16, wallMat, (L.eastX + L.glassX) / 2, H / 2, L.northZ);    // rear wall
box(0.16, H, L.southZ - L.northZ, wallMat, L.eastX, H / 2, (L.southZ + L.northZ) / 2);         // east wall
box(L.eastX - L.glassX, 1.05, 0.16, wallMat, (L.eastX + L.glassX) / 2, 0.525, L.southZ);       // side wall (cut low for the view)
// backlit walls: rough stone behind perforated metal mesh in black steel frames, lit teal (and red after dark), as in his photos
const WALL_TEAL = new THREE.Color(0x6ff0e4), WALL_RED = new THREE.Color(0xff3a2c);
const teal = new THREE.MeshBasicMaterial({ color: 0x23d6c4 });
const meshTex = new THREE.TextureLoader().load('tex/meshstone.jpg'); meshTex.colorSpace = THREE.SRGBColorSpace; meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;
const tealPanel = new THREE.MeshBasicMaterial({ color: 0x6ff0e4, map: meshTex }); tealPanel.userData.wuv = 1.3;
const frameBlk = mat(0x0b0b0d);
box(L.eastX - L.glassX - 0.5, 0.82, 0.03, tealPanel, (L.eastX + L.glassX) / 2 + 0.05, 0.6, L.southZ - 0.1);
for (let x = -6.85; x <= 6.2; x += 1.2) box(0.05, 0.84, 0.05, frameBlk, x, 0.6, L.southZ - 0.12);
box(L.eastX - L.glassX - 0.4, 0.05, 0.05, frameBlk, (L.eastX + L.glassX) / 2, 1.03, L.southZ - 0.12);
box(L.eastX - L.glassX - 0.4, 0.05, 0.05, frameBlk, (L.eastX + L.glassX) / 2, 0.18, L.southZ - 0.12);
box(0.03, 2.5, 5.4, tealPanel, L.eastX - 0.1, 1.45, 1.25);
for (let z = -1.45; z <= 3.95; z += 1.08) box(0.05, 2.52, 0.05, frameBlk, L.eastX - 0.12, 1.45, z);
for (const y of [0.2, 2.1, 2.7]) box(0.05, 0.05, 5.45, frameBlk, L.eastX - 0.12, y, 1.25);
// the light spills onto the floor in front of the backlit walls
const wallWash = new THREE.MeshBasicMaterial({ color: 0x6ff0e4, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, map: (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 64; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 64); return new THREE.CanvasTexture(c); })() });
{ const w1 = plane(L.eastX - L.glassX - 0.4, 0.9, wallWash, (L.eastX + L.glassX) / 2, 0.075, L.southZ - 0.55); w1.rotation.set(-Math.PI / 2, 0, Math.PI); w1.userData.keep = true;
  const w2 = plane(5.4, 1.1, wallWash, L.eastX - 0.65, 0.075, 1.25); w2.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); w2.userData.keep = true; }

// glass shopfront on Queen's Road East, with the door at the front-left
const glassMat = new THREE.MeshPhongMaterial({ color: 0xa9c6d6, transparent: true, opacity: 0.12, shininess: 90, depthWrite: false, side: THREE.DoubleSide });
const gz0 = L.doorZ + 0.6, gz1 = L.southZ;
plane(gz1 - gz0, H, glassMat, L.glassX, H / 2, (gz0 + gz1) / 2, Math.PI / 2);
box(0.1, H, 0.1, mat(0x111216), L.glassX, H / 2, gz0);
box(0.1, H, 0.1, mat(0x111216), L.glassX, H / 2, gz1);
box(0.12, 0.12, L.southZ - L.northZ, mat(0x111216), L.glassX, H, (L.southZ + L.northZ) / 2);
box(0.16, H, L.doorZ - 0.6 - L.northZ, wallMat, L.glassX, H / 2, (L.doorZ - 0.6 + L.northZ) / 2); // solid return by the kitchen
// door frame + open door leaf
box(0.12, 0.12, 1.2, mat(0x111216), L.glassX, 2.3, L.doorZ);
const door = new THREE.Group(); door.position.set(L.glassX, 0, L.doorZ - 0.6); scene.add(door);
box(0.05, 2.25, 1.15, new THREE.MeshPhongMaterial({ color: 0xa9c6d6, transparent: true, opacity: 0.2, depthWrite: false }), 0, 1.15, 0.58, door);
door.rotation.y = -0.9;
// frosted RORUBARU letters on the glass (read from the street; mirrored from inside, as in the footage)
// real shopfront, from Dominic's own storefront photo: frosted teal glass with the RORUBARU letters, black fascia with the ロールバール neon
const texL = new THREE.TextureLoader();
function photoTex(src, rep) { const t = texL.load(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }
const GLASS_H = 2.35;
const glassLetters = plane(gz1 - gz0, GLASS_H, new THREE.MeshBasicMaterial({ map: photoTex('tex/glass.jpg'), transparent: true, opacity: 0.94, depthWrite: false }), L.glassX - 0.03, GLASS_H / 2, (gz0 + gz1) / 2, -Math.PI / 2);
box(0.08, H - GLASS_H, gz1 - gz0 + 0.1, mat(0x07080b), L.glassX - 0.02, GLASS_H + (H - GLASS_H) / 2, (gz0 + gz1) / 2); // black fascia band
// the fascia photo itself carries the real neon (icy blue-white ロールバール, as on the street); it dims by day
const neon = plane(gz1 - gz0, H - GLASS_H - 0.04, new THREE.MeshBasicMaterial({ map: photoTex('tex/fascia.jpg') }), L.glassX - 0.075, GLASS_H + (H - GLASS_H) / 2, (gz0 + gz1) / 2, -Math.PI / 2);
// the projecting GF RORUBARU light box at the right-hand end of the front
{ const lbm = new THREE.MeshBasicMaterial({ map: photoTex('tex/lightbox.jpg'), side: THREE.DoubleSide });
  box(0.42, 0.86, 0.06, mat(0x0c0d10), L.glassX - 0.42, 2.72, gz1 + 0.12);
  const lbp = plane(0.38, 0.8, lbm, L.glassX - 0.42, 2.72, gz1 + 0.155, 0); lbp.userData.keep = true;
  const lbp2 = plane(0.38, 0.8, lbm, L.glassX - 0.42, 2.72, gz1 + 0.085, Math.PI); lbp2.userData.keep = true; }
// pavement tiles in front of the shop: the photo's herringbone, toned to a muted grey HK footpath (Dominic Oct 11: the red read like a rug); long soft blend into the street pavement, no hard ends
{ const pt = photoTex('tex/paving_grey.jpg', true); pt.repeat.set(18, 2.6);
  const c = document.createElement('canvas'); c.width = 256; c.height = 8; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.1, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.9, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 8);
  const am = new THREE.CanvasTexture(c);
  const pv = plane(26, 3.4, new THREE.MeshLambertMaterial({ color: 0x8a8682, map: pt, alphaMap: am, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), L.glassX - 1.75, 0.02, 0.6, -Math.PI / 2);
  pv.rotation.set(-Math.PI / 2, 0, Math.PI / 2); pv.userData.keep = true; }
// awning light strip + street-side logo plate by the door
box(0.06, 0.05, L.southZ - gz0, glow(ORANGE), L.glassX - 0.12, 3.2, (gz0 + L.southZ) / 2);
const logoTex = new THREE.TextureLoader().load('logo.png'); logoTex.colorSpace = THREE.SRGBColorSpace;
box(0.06, 0.62, 1.15, mat(0x111216), L.glassX - 0.12, 2.75, L.doorZ - 1.35);
plane(1.0, 0.54, new THREE.MeshBasicMaterial({ map: logoTex, transparent: true }), L.glassX - 0.16, 2.75, L.doorZ - 1.35, -Math.PI / 2);


// ---------- past events photo wall (rear wall by the entrance) — real photos from rorubaru.com ----------
const EVW = { x: -6.0, y: 1.95, z: L.northZ + 0.1, w: 2.5, h: 1.62 };
{
  const c = document.createElement('canvas'); c.width = 1200; c.height = 780;
  const g = c.getContext('2d'); g.fillStyle = '#14151b'; g.fillRect(0, 0, c.width, c.height);
  const evTex = new THREE.CanvasTexture(c); evTex.colorSpace = THREE.SRGBColorSpace;
  const srcs = ['events/grand-opening/01-t.jpg', 'events/delia-x-rorubaru/02-t.jpg', 'events/invite-only-opening/01-t.jpg', 'events/delia-x-rorubaru/05-t.jpg', 'events/grand-opening/04-t.jpg', 'events/invite-only-opening/04-t.jpg'];
  const cw = 376, chh = 366, gap = 18;
  srcs.forEach((s, i) => { const im = new Image(); im.onload = () => {
    const cx = gap + (i % 3) * (cw + gap), cy = gap + Math.floor(i / 3) * (chh + gap);
    const r = Math.max(cw / im.width, chh / im.height), sw = cw / r, sh = chh / r;
    g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, cx, cy, cw, chh); evTex.needsUpdate = true; }; im.src = s; });
  plane(EVW.w, EVW.h, new THREE.MeshBasicMaterial({ map: evTex, color: 0xe8e2d4 }), EVW.x, EVW.y, EVW.z);
  const fr = glow(ORANGE);
  box(EVW.w + 0.1, 0.035, 0.03, fr, EVW.x, EVW.y + EVW.h / 2 + 0.03, EVW.z);
  box(EVW.w + 0.1, 0.035, 0.03, fr, EVW.x, EVW.y - EVW.h / 2 - 0.03, EVW.z);
  box(0.035, EVW.h + 0.1, 0.03, fr, EVW.x - EVW.w / 2 - 0.03, EVW.y, EVW.z);
  box(0.035, EVW.h + 0.1, 0.03, fr, EVW.x + EVW.w / 2 + 0.03, EVW.y, EVW.z);
  const evHead = langSign(new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), { en: ['PAST EVENTS'], zh: ['過往活動'], ja: ['過去のイベント'] }, { w: 1024, h: 160, font: '900 112px Geist, sans-serif', color: '#FFE3D2', glowColor: '#F64501' });
  plane(1.7, 0.27, evHead, EVW.x, EVW.y + EVW.h / 2 + 0.27, EVW.z + 0.01);
  // soft wash of light on the floor in front of it
  const wash = plane(2.6, 1.4, new THREE.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending }), EVW.x, 0.07, EVW.z + 0.75);
  wash.rotation.x = -Math.PI / 2;
}

// reception (front-left, by the door): dark ribbed metal desk
box(0.7, 1.05, 1.1, mat(0x1b1c21), -6.85, 0.525, -1.75);
for (let z = -2.25; z < -1.2; z += 0.09) box(0.02, 0.95, 0.03, mat(0x2f3138), -6.49, 0.5, z);
box(0.75, 0.04, 1.15, mat(0x3a332d), -6.85, 1.07, -1.75);

// ---------- the U-shaped hand-roll counter ----------
const _tl = new THREE.TextureLoader();
const _rt = (s) => { const t = _tl.load(s); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
const counterTop = new THREE.MeshLambertMaterial({ color: 0xffcabb, map: _rt('tex/wood.jpg') }); counterTop.userData.wuv = 1.6;   // deep oxblood-brown wood top (DSC07596)
const counterBody = new THREE.MeshLambertMaterial({ color: 0x8c8782, map: _rt('tex/cbase.jpg') }); counterBody.userData.wuv = 1.1; // dark split-face stone front (photo)
const steel = new THREE.MeshLambertMaterial({ color: 0x7f8c9a, map: _rt('tex/steel.jpg') }); steel.userData.wuv = 0.9;   // brushed stainless (DSC07596, L1052984)
const inlay = mat(0xd9dde2), underGlow = new THREE.MeshBasicMaterial({ color: 0xffb070 });
function counterRun(x0, z0, x1, z1, guestDir) {
  // guestDir: unit vector from counter centre toward the guests
  const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const w = alongX ? len : 0.78, d = alongX ? 0.78 : len;
  box(w, 0.06, d, counterTop, cx, L.CH, cz);
  // body sits on the chef side so guests' knees fit under the overhang
  const bw = alongX ? len : 0.42, bd = alongX ? 0.42 : len;
  box(bw, L.CH - 0.03, bd, counterBody, cx - guestDir[0] * 0.18, (L.CH - 0.03) / 2, cz - guestDir[1] * 0.18);
  // warm under-glow on the guest side
  box(alongX ? len : 0.02, 0.02, alongX ? 0.02 : len, underGlow, cx + guestDir[0] * 0.36, L.CH - 0.05, cz + guestDir[1] * 0.36);
  // thin metal inlay along the bevelled guest edge
  box(alongX ? len : 0.014, 0.014, alongX ? 0.014 : len, inlay, cx + guestDir[0] * 0.392, L.CH - 0.012, cz + guestDir[1] * 0.392);
  // raised wooden back ledge on the chef side (the step behind the guest counter in the photos)
  box(alongX ? len : 0.26, 0.11, alongX ? 0.26 : len, counterTop, cx - guestDir[0] * 0.27, L.CH + 0.085, cz - guestDir[1] * 0.27);
  box(alongX ? len : 0.012, 0.012, alongX ? 0.012 : len, inlay, cx - guestDir[0] * 0.135, L.CH + 0.135, cz - guestDir[1] * 0.135);
}
counterRun(L.XL - 0.39, L.F, L.XR + 0.39, L.F, [0, 1]);
counterRun(L.XL, L.ZB, L.XL, L.F - 0.39, [-1, 0]);
counterRun(L.XR, L.ZB, L.XR, L.F - 0.39, [1, 0]);
// nori boxes, sauce bottles, hinoki boxes along the counter
for (let x = L.XL + 0.6; x < L.XR - 0.4; x += 1.3) {
  box(0.24, 0.06, 0.14, mat(0xc9a77a), x, L.CH + 0.17, L.F - 0.28);
  cyl(0.025, 0.025, 0.12, 6, mat(0x2b1a12), x + 0.3, L.CH + 0.2, L.F - 0.3);
}

// central bar + preparation station inside the U (stainless)
box(5.2, 0.92, 1.0, steel, 0, 0.46, 0.05);
box(5.3, 0.04, 1.1, mat(0x737980), 0, 0.93, 0.05);
for (let x = -2.2; x <= 2.2; x += 1.1) { cyl(0.17, 0.17, 0.2, 12, mat(0xa47c4e), x, 1.04, 0.05); cyl(0.172, 0.172, 0.025, 12, mat(0x6b6f75), x, 1.0, 0.05); }   // hinoki rice ohitsu, metal band
for (let x = -1.65; x <= 1.7; x += 1.1) box(0.42, 0.05, 0.3, mat(0x1d2a1e), x, 0.98, 0.05);   // nori stacks
cyl(0.22, 0.22, 0.34, 10, mat(0xd8dde4), 2.75, 0.17 + 0.92, -0.75); // rice cooker

// open kitchen line: glass-door fridges lit cool white, bottles on glass shelves, stainless frames (his drive photos 184035, trip.com counter shot)
const fridgeTex = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 256, 0); bg.addColorStop(0, '#9fb3c2'); bg.addColorStop(0.5, '#e9f3fb'); bg.addColorStop(1, '#9fb3c2');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 512);
  const cols = ['#1f3b2a', '#2a4a30', '#5a3418', '#3a2414', '#14161a', '#dfe6e8', '#cfc6b0', '#7a8f6a', '#2b2f45'];
  let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let s = 0; s < 4; s++) {
    const base = 120 + s * 122;
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, base, 256, 4);   // glass shelf edge
    let x = 8;
    while (x < 240) {
      const w = 18 + rnd() * 10, h = 70 + rnd() * 30, col = cols[Math.floor(rnd() * cols.length)];
      g.fillStyle = col; g.fillRect(x, base - h * 0.62, w, h * 0.62);
      g.fillRect(x + w * 0.3, base - h, w * 0.4, h * 0.4);
      if (rnd() > 0.35) { g.fillStyle = rnd() > 0.5 ? '#f3efe4' : '#e8c46a'; g.fillRect(x + 2, base - h * 0.45, w - 4, h * 0.2); }   // labels
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 3, base - h * 0.6, 3, h * 0.55);   // glass highlight
      x += w + 4;
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const fridgeFace = new THREE.MeshBasicMaterial({ map: fridgeTex, color: 0xdfe9f2 });
for (let i = 0; i < 6; i++) {
  const x = -3.7 + i * 1.5;
  if (i === 3) { box(1.2, 2.3, 0.1, mat(0x101114), x, 1.15, L.backZ - 0.2); continue; } // pass to the kitchen
  box(1.2, 2.0, 0.6, steel, x, 1.0, L.backZ - 0.35);
  plane(1.05, 1.75, fridgeFace, x, 1.05, L.backZ - 0.04);
  box(0.04, 1.8, 0.03, mat(0x2a2d32), x, 1.05, L.backZ - 0.03);   // door split
}
box(9.2, 0.07, 0.02, glow(0xff8a5c), 0, 2.45, L.backZ - 0.02);
// back kitchen (behind the line)
box(4.6, 0.92, 0.7, steel, -2.3, 0.46, L.northZ + 0.5);
box(3.0, 0.92, 0.7, steel, 3.3, 0.46, L.northZ + 0.5);
cyl(0.25, 0.25, 0.3, 10, mat(0x9aa1ab), -3.2, 1.07, L.northZ + 0.5);
box(1.2, 0.5, 0.6, mat(0x5b616a), 1.0, 2.2, L.northZ + 0.45);

// rear wall behind the kitchen: full-height brushed stainless panels (L1052984, L1053624), a red light slit beside the events wall (L1053430)
{ const sw = plane(9.0, 2.9, steel, 0.3, 1.47, L.northZ + 0.09);
  for (let x = -4.0; x <= 4.6; x += 1.2) box(0.012, 2.9, 0.01, mat(0x5c6168), x, 1.47, L.northZ + 0.1);
  box(0.07, 2.3, 0.03, glow(0xff2a1c), -4.5, 1.45, L.northZ + 0.11);
  const rw = plane(0.9, 1.6, new THREE.MeshBasicMaterial({ color: 0xff2a1c, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }), -4.5, 1.45, L.northZ + 0.12); rw.userData.keep = true; }
// exposed silver ducts under the black ceiling, over the back kitchen
cyl(0.16, 0.16, 9.0, 12, mat(0xaab0b8), 0.3, 2.98, L.northZ + 0.55).rotation.z = Math.PI / 2;
for (let x = -4; x <= 4; x += 4) cyl(0.17, 0.17, 0.05, 12, mat(0x6d737b), x, 2.98, L.northZ + 0.55).rotation.z = Math.PI / 2;

// washrooms (right)
box(0.12, H, 3.0, wallMat, L.eastX - 1.6, H / 2, L.northZ + 1.5);
box(0.04, 2.1, 0.85, mat(0x3b2a22), L.eastX - 1.66, 1.05, L.northZ + 2.4);

// ceiling LED outline above the counter (the white light loop in the photos)
const ledMat = glow(0xdfe6f5);
const ledPts = [[-5.4, -1.3], [-5.4, 2.55], [-4.75, 3.2], [5.05, 3.2], [5.7, 2.55], [5.7, -1.3]];
for (let i = 0; i < ledPts.length - 1; i++) {
  const [ax, az] = ledPts[i], [bx, bz] = ledPts[i + 1];
  const len = Math.hypot(bx - ax, bz - az);
  const m = box(len, 0.035, 0.035, ledMat, (ax + bx) / 2, 2.85, (az + bz) / 2);
  m.rotation.y = -Math.atan2(bz - az, bx - ax);
}
// exposed ducts (painted black ceiling services)

// stools: 26 seats (6 on each leg, 14 on the long run) — straight from the floor plan
// stools as in his photos (DSC07596, DSC07643): taupe leather seat, curved padded back rail, dark wood legs, chrome foot ring
const stoolSeat = mat(0x8f775c), stoolFrame = mat(0x3a2418), chrome = mat(0x9ea4ab);
const plateRim = mat(0x6f9a94), plateIn = mat(0xe6e0d4), chopMat = mat(0x2a1a12), porcelain = mat(0xf1eee6);
const seats = [];
const legZs = [-0.7, -0.2, 0.3, 0.8, 1.3, 1.8];
for (const z of legZs) seats.push({ x: L.XL - 0.62, z, side: 'L' });
for (let i = 0; i < 14; i++) seats.push({ x: L.XL + 0.45 + i * (L.XR - L.XL - 0.9) / 13, z: L.F + 0.62, side: 'F' });
for (const z of legZs) seats.push({ x: L.XR + 0.62, z, side: 'R' });
const _arcGeo = new THREE.TorusGeometry(0.21, 0.034, 6, 16, Math.PI);
const _ringGeo = new THREE.TorusGeometry(0.165, 0.009, 4, 18);
seats.forEach((s, si) => {
  s.occupied = null; s.reserved = false;
  if (s.side === 'F') { s.face = Math.PI; s.chef = { x: s.x, z: L.F - 0.6 }; s.chefFace = 0; s.plate = { x: s.x, z: L.F + 0.2 }; }
  if (s.side === 'L') { s.face = Math.PI / 2; s.chef = { x: L.XL + 0.6, z: s.z }; s.chefFace = -Math.PI / 2; s.plate = { x: L.XL - 0.2, z: s.z }; }
  if (s.side === 'R') { s.face = -Math.PI / 2; s.chef = { x: L.XR - 0.6, z: s.z }; s.chefFace = Math.PI / 2; s.plate = { x: L.XR + 0.2, z: s.z }; }
  const bx = -Math.sin(s.face), bz = -Math.cos(s.face);   // toward the stool's back (away from the counter)
  const px = -bz, pz = bx;
  cyl(0.2, 0.19, 0.08, 14, stoolSeat, s.x, 0.72, s.z);
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) box(0.035, 0.68, 0.035, stoolFrame, s.x + 0.13 * (a * bx + b * px), 0.34, s.z + 0.13 * (a * bz + b * pz));
  const rg = new THREE.Mesh(_ringGeo, chrome); rg.position.set(s.x, 0.27, s.z); rg.rotation.x = Math.PI / 2; scene.add(rg);
  for (const b of [1, -1]) box(0.035, 0.22, 0.035, stoolFrame, s.x + 0.15 * bx + 0.15 * b * px, 0.86, s.z + 0.15 * bz + 0.15 * b * pz);
  const arc = new THREE.Mesh(_arcGeo, stoolSeat); arc.rotation.order = 'YXZ'; arc.rotation.set(-Math.PI / 2, s.face, 0); arc.scale.z = 2.3; arc.position.set(s.x, 0.98, s.z); scene.add(arc);
  // place setting: stoneware plate with a sea-green glaze rim, chopsticks, soy dish; a white tokkuri carafe every few seats
  const ux = -bx, uz = -bz;   // toward the counter
  const _n0 = scene.children.length;
  cyl(0.125, 0.115, 0.012, 16, plateRim, s.plate.x, L.CH + 0.036, s.plate.z);
  cyl(0.1, 0.1, 0.014, 16, plateIn, s.plate.x, L.CH + 0.038, s.plate.z);
  const ch = box(0.22, 0.008, 0.012, chopMat, s.plate.x + 0.15 * bx, L.CH + 0.035, s.plate.z + 0.15 * bz); ch.rotation.y = s.side === 'F' ? 0 : Math.PI / 2;
  cyl(0.04, 0.035, 0.015, 10, porcelain, s.plate.x - 0.16 * px + 0.06 * ux, L.CH + 0.038, s.plate.z - 0.16 * pz + 0.06 * uz);
  if (si % 3 === 1) { const tx = s.plate.x - 0.17 * px - 0.06 * ux, tz = s.plate.z - 0.17 * pz - 0.06 * uz; cyl(0.022, 0.045, 0.1, 10, porcelain, tx, L.CH + 0.08, tz); cyl(0.012, 0.022, 0.05, 10, porcelain, tx, L.CH + 0.155, tz); }
  for (let k = _n0; k < scene.children.length; k++) scene.children[k].userData.setting = true;   // cleared when the shop is closed
});
// dried flowers in a glass bottle at each front corner of the counter (DSC07596)
{ const vase = new THREE.MeshPhongMaterial({ color: 0xc8dde0, transparent: true, opacity: 0.45, shininess: 80, depthWrite: false });
  const stem = mat(0x7f8a6a), bloom = mat(0x8e86a8);
  for (const [vx, vz] of [[L.XL - 0.12, L.F + 0.14], [L.XR + 0.12, L.F + 0.14]]) {
    cyl(0.05, 0.065, 0.26, 10, vase, vx, L.CH + 0.16, vz);
    for (let k = 0; k < 9; k++) { const a = k * 2.4, tl = 0.1 + (k % 3) * 0.06; const h = 0.42 + (k % 4) * 0.07;
      const sm = cyl(0.004, 0.004, h, 4, stem, vx + Math.cos(a) * tl * 0.5, L.CH + 0.06 + h / 2, vz + Math.sin(a) * tl * 0.5); sm.rotation.set(Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28);
      cyl(0.016, 0.006, 0.07, 5, bloom, vx + Math.cos(a) * tl * 1.1, L.CH + 0.06 + h, vz + Math.sin(a) * tl * 1.1); } } }

// ---------- DJ booth (on the plan against the glass, DJ faces into the room) ----------
const dj = { x: -6.55, z: 1.55 };
box(0.7, 1.0, 1.5, mat(0x121216), dj.x, 0.5, dj.z);
box(0.02, 0.06, 1.5, glow(ORANGE), dj.x + 0.36, 0.12, dj.z);
const boothFront = plane(1.5, 0.55, new THREE.MeshBasicMaterial({ map: textTexture('RORUBARU', { font: '900 150px Geist, sans-serif', color: '#F64501' }), transparent: true }), dj.x + 0.356, 0.62, dj.z, Math.PI / 2);
box(0.72, 0.04, 1.55, mat(0x2a2b30), dj.x, 1.02, dj.z);
const jogs = [];
for (const dz of [-0.45, 0.45]) {
  box(0.4, 0.05, 0.38, mat(0x1a1b1f), dj.x, 1.06, dj.z + dz);
  const jog = cyl(0.12, 0.12, 0.02, 16, mat(0x8a8f99), dj.x, 1.095, dj.z + dz); jogs.push(jog);
  box(0.06, 0.008, 0.2, glow(0xffd23a), dj.x - 0.15, 1.09, dj.z + dz);
}
box(0.36, 0.05, 0.3, mat(0x1a1b1f), dj.x, 1.06, dj.z);
for (let i = 0; i < 4; i++) box(0.04, 0.012, 0.04, glow(i % 2 ? 0x37e3ff : 0xff3dbb), dj.x + 0.1, 1.09, dj.z - 0.1 + i * 0.065);
// speakers
for (const dz of [-1.05, 1.05]) { box(0.38, 0.62, 0.38, mat(0x101013), dj.x, 1.35, dj.z + dz); cyl(0.1, 0.1, 0.02, 12, mat(0x2b2c31), dj.x + 0.2, 1.4, dj.z + dz).rotation.z = Math.PI / 2; }

// Traffic lives in city.js: buses, minibuses, taxis and vans on the real roads, driving on the left;
// trams only on the Johnston Road / Hennessy Road tracks. (No tram on Queen's Road East.)

// ---------- people ----------
const G = {
  leg: new THREE.CapsuleGeometry(0.068, 0.64, 3, 8).translate(0, -0.39, 0),
  torso: new THREE.LatheGeometry([[0.0, -0.31], [0.165, -0.31], [0.175, -0.12], [0.19, 0.1], [0.2, 0.2], [0.17, 0.28], [0.08, 0.31], [0.0, 0.32]].map(([r, y]) => new THREE.Vector2(r, y)), 12),
  shoe: new THREE.CapsuleGeometry(0.06, 0.1, 2, 8).rotateX(Math.PI / 2).translate(0, -0.77, 0.04),
  hand: new THREE.SphereGeometry(0.048, 8, 6),
  head: new THREE.SphereGeometry(0.15, 12, 9),
  hair: new THREE.SphereGeometry(0.158, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
  arm: new THREE.CapsuleGeometry(0.047, 0.47, 3, 8).translate(0, -0.28, 0),
  cap: new THREE.CylinderGeometry(0.165, 0.165, 0.09, 12),
  brim: new THREE.BoxGeometry(0.2, 0.02, 0.14),
  apron: new THREE.BoxGeometry(0.36, 0.62, 0.02),
  phones: new THREE.TorusGeometry(0.165, 0.025, 6, 14, Math.PI),
  cup: new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10),
  shadow: new THREE.CircleGeometry(0.3, 16).rotateX(-Math.PI / 2),
  roll: new THREE.CylinderGeometry(0.05, 0.042, 0.17, 10),
  rice: new THREE.SphereGeometry(0.046, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  fish: new THREE.SphereGeometry(0.03, 6, 5),
};
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
const SKIN = [0xf1c9a5, 0xe0ac84, 0xc68c64, 0x8d5a3b, 0xf6d6bd];
const HAIR = [0x1a1412, 0x2b1d14, 0x3d2a1c, 0x8a6a45, 0x111111, 0xb9b2a8];
const SHIRTS = [0xf6f3e7, 0x2a3a5c, 0x6b2f2f, 0x2f5b4a, 0xd6a24a, 0x444a55, 0xc0d4e6, 0x8b5ca6, 0xe07a5f, 0x1f1f24, 0x9bb7a0];
const PANTS = [0x22252c, 0x3b4a66, 0x5b4636, 0x1a1a1d, 0x8c8577];

class Person {
  constructor(o = {}) {
    const g = this.group = new THREE.Group();
    this.body = new THREE.Group(); g.add(this.body);
    const skin = mat(o.skin ?? pick(SKIN)), shirt = mat(o.shirt ?? pick(SHIRTS)), pants = mat(o.pants ?? pick(PANTS));
    this.legs = [-0.085, 0.085].map(x => { const l = new THREE.Mesh(G.leg, pants); l.position.set(x, 0.8, 0); l.add(new THREE.Mesh(G.shoe, mat(0x1c1c20))); this.body.add(l); return l; });
    const t = new THREE.Mesh(G.torso, shirt); t.position.y = 1.11; this.body.add(t);
    this.arms = [-0.235, 0.235].map(x => { const a = new THREE.Mesh(G.arm, shirt); a.position.set(x, 1.38, 0); this.body.add(a); return a; });
    const hand = new THREE.Mesh(G.hand, skin); hand.position.y = -0.57; this.arms[1].add(hand);
    const hand2 = hand.clone(); this.arms[0].add(hand2);
    const neck = new THREE.Mesh(G.cup, skin); neck.scale.set(1.1, 1.6, 1.1); neck.position.y = 1.45; this.body.add(neck);
    const head = this.head = new THREE.Mesh(G.head, skin); head.position.y = 1.6; head.scale.set(0.95, 1.08, 1.0); this.body.add(head);
    if (o.cap) {
      const c = new THREE.Mesh(G.cap, mat(o.cap)); c.position.y = 0.09; head.add(c);
      const b = new THREE.Mesh(G.brim, mat(o.cap)); b.position.set(0, 0.06, 0.15); head.add(b);
    } else if (!o.bald) { const h = new THREE.Mesh(G.hair, mat(o.hair ?? pick(HAIR))); h.position.y = 0.01; head.add(h); }
    if (o.apron) { const a = new THREE.Mesh(G.apron, mat(o.apron)); a.position.set(0, 1.0, 0.2); this.body.add(a); }
    if (o.phones) { const p = new THREE.Mesh(G.phones, mat(0x111111)); p.position.y = 0.04; p.rotation.y = Math.PI / 2; head.add(p); }
    const sh = new THREE.Mesh(G.shadow, shadowMat); sh.position.y = 0.075; sh.userData.noShadow = true; g.add(sh); this.shadow = sh; g.children[0].userData.person = true; this.body.userData.person = true;
    const s = o.scale ?? rr(0.92, 1.06); this.body.scale.setScalar(s);
    if (QUALITY === 'high') this.body.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    this.path = []; this.speed = o.speed ?? rr(1.15, 1.45); this.phase = rand() * 6.28; this.seated = false;
    this.moving = false; this.heading = 0; this.targetHeading = null; this.anim = null; this.animT = 0;
    scene.add(g);
  }
  get x() { return this.group.position.x; } get z() { return this.group.position.z; }
  place(x, z) { this.group.position.set(x, 0, z); }
  go(points, done) { this.path = points.map(p => ({ x: p.x + (p.j ? 0 : 0), z: p.z })); this.done = done; }
  sit(face) {
    this.seated = true; this.targetHeading = face;
    this.legs.forEach(l => l.rotation.x = -Math.PI / 2);
    this.body.position.y = -0.02; this.shadow.visible = false;
  }
  stand() { this.seated = false; this.legs.forEach(l => l.rotation.x = 0); this.body.position.y = 0; this.shadow.visible = true; }
  update(dt, t) {
    const p = this.group.position;
    if (this.path.length) {
      const tgt = this.path[0];
      const dx = tgt.x - p.x, dz = tgt.z - p.z, d = Math.hypot(dx, dz);
      const step = this.speed * dt;
      if (d <= step) { p.x = tgt.x; p.z = tgt.z; this.path.shift(); if (!this.path.length) { this.moving = false; const cb = this.done; this.done = null; cb && cb(); } }
      else { p.x += dx / d * step; p.z += dz / d * step; this.moving = true; this.targetHeading = Math.atan2(dx, dz); }
    } else this.moving = false;
    if (this.targetHeading !== null) {
      let diff = this.targetHeading - this.heading; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.heading += diff * Math.min(1, dt * 10); this.group.rotation.y = this.heading;
    }
    // limbs
    if (this.moving) {
      this.phase += dt * this.speed * 6.5;
      const s = Math.sin(this.phase) * 0.55;
      this.legs[0].rotation.x = s; this.legs[1].rotation.x = -s;
      if (!this.anim) { this.arms[0].rotation.x = -s * 0.8; this.arms[1].rotation.x = s * 0.8; }
      this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.035;
    } else if (!this.seated) {
      this.legs[0].rotation.x *= 0.8; this.legs[1].rotation.x *= 0.8; this.body.position.y *= 0.8;
      if (!this.anim) { this.arms[0].rotation.x *= 0.85; this.arms[1].rotation.x *= 0.85; }
    }
    if (this.anim) { this.animT += dt; this.anim(this, this.animT, dt, t); }
    else if (!this.moving) { this.arms[0].rotation.z = 0; this.arms[1].rotation.z = 0; }
  }
  setAnim(fn) { this.anim = fn; this.animT = 0; if (!fn) { this.arms.forEach(a => { a.rotation.z = 0; }); } }
  remove() { scene.remove(this.group); }
}

// ---------- hand rolls: cylinders of crisp nori, warm rice, the day's topping ----------
const noriMat = mat(0x1b2419), riceMat = mat(0xf7f3ea);
const TOPPINGS = [0xe0533c, 0xf08a5d, 0xffb38a, 0xc9302c, 0xf3c969, 0xe86f68];
function makeRoll() {
  const g = new THREE.Group();
  const r = new THREE.Mesh(G.roll, noriMat); g.add(r);
  const rice = new THREE.Mesh(G.rice, riceMat); rice.position.y = 0.083; g.add(rice);
  const top = pick(TOPPINGS);
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(G.fish, mat(top)); f.position.set(rr(-0.02, 0.02), 0.1 + rr(0, 0.015), rr(-0.02, 0.02)); g.add(f); }
  return g;
}

// ---------- hotspots: the room is the site — tap a thing, a panel opens and the camera moves in ----------
const labelLayer = document.getElementById('labels');
const labels = [];
function addLabel(text, x, y, z, key) {
  const el = document.createElement('div'); el.className = 'lbl'; el.innerHTML = text; labelLayer.appendChild(el);
  const l = { el, pos: new THREE.Vector3(x, y, z), key }; labels.push(l); return l;
}
const pops = document.getElementById('pops');
const _v = new THREE.Vector3();
function project(v) { _v.copy(v).project(camera); return { x: (_v.x * 0.5 + 0.5) * innerWidth, y: (-_v.y * 0.5 + 0.5) * innerHeight, vis: _v.z < 1 }; }
function popAt(world) {
  if (popList.length > 8) return;
  const el = document.createElement('div'); el.className = 'pop'; el.textContent = '+1'; pops.appendChild(el);
  popList.push({ el, w: world.clone().setY(world.y + 0.25), t: 0 });
}

// ---------- simulation ----------
const sim = {
  t: 0, rollsToday: 0, queueTarget: 9, seatTarget: 26,
  queue: [], inside: [], leaving: [], orders: [], chefs: [], served: 0, spawnCooldown: 0,
};
// opening hours drive the room: the same Hong Kong state as the header clock (hours.js)
const SHOP = { state: hkStatus(new Date()).state, k: 0, closedAt: 0 };
// seed today's count from the HK clock (demo: about 1.15 rolls a minute since noon)
function hkNow() { const d = new Date(Date.now() + 8 * 3600e3); return { h: d.getUTCHours(), m: d.getUTCMinutes() }; }
{ const { h, m } = hkNow(); const mins = (h - 12) * 60 + m; sim.rollsToday = Math.max(0, Math.round(Math.min(mins, 630) * 1.15)); }

const QX = -8.25, QZ0 = L.doorZ - 0.85, QGAP = 0.62;
const slot = (i) => ({ x: QX + (i % 2 ? 0.05 : -0.05), z: QZ0 - i * QGAP });
function reflowQueue() {
  sim.queue.forEach((g, i) => {
    const s = slot(i);
    if (Math.abs(g.x - s.x) > 0.02 || Math.abs(g.z - s.z) > 0.02) {
      g.atSlot = false;
      const pts = (g.state === 'arriving' && g.z < s.z - 1.2) ? [{ x: -9.45, z: s.z - 0.6 }, s] : [s];
      g.go(pts, () => { g.atSlot = true; g.state = 'queued'; g.targetHeading = 0; });
    }
  });
}
function spawnArrival(direct = false) {
  const g = new Person();
  g.state = 'arriving'; g.atSlot = false;
  const i = sim.queue.length; sim.queue.push(g);
  if (direct) { const s = slot(i); g.place(s.x, s.z); g.atSlot = true; g.state = 'queued'; g.heading = g.targetHeading = 0; g.group.rotation.y = 0; }
  else { g.place(-9.45, -34); reflowQueue(); }
  // idle fidget: phone glance
  g.idleFn = rand() < 0.4 ? 'phone' : null;
}
const freeSeats = () => seats.filter(s => !s.occupied && !s.reserved);
function seatPath(s) {
  const p = [{ x: -8.0, z: L.doorZ }, { x: L.glassX + 0.6, z: L.doorZ }, { x: L.walkX, z: L.doorZ + 0.7 }];
  if (s.side === 'L') p.push({ x: L.walkX, z: s.z }, { x: s.x, z: s.z });
  else if (s.side === 'F') p.push({ x: L.walkX, z: L.corrZ }, { x: s.x, z: L.corrZ }, { x: s.x, z: s.z });
  else p.push({ x: L.walkX, z: L.corrZ }, { x: 6.05, z: L.corrZ }, { x: 6.05, z: s.z }, { x: s.x, z: s.z });
  return p;
}
function seatGuest(g, s, direct = false) {
  s.reserved = true; g.seat = s; g.want = 3 + Math.floor(rand() * 2); g.eaten = 0; g.plate = []; g.holding = null; g.ordered = 0;
  g.state = 'entering';
  const arrive = () => {
    s.reserved = false; s.occupied = g; g.state = 'seated';
    g.place(s.x, s.z); g.sit(s.face);
    g.cup = new THREE.Mesh(G.cup, mat(CREAM)); scene.add(g.cup);
    const off = s.side === 'F' ? [0.22, 0] : [0, s.side === 'L' ? -0.22 : 0.22];
    g.cup.position.set(s.plate.x + off[0], L.CH + 0.06, s.plate.z + off[1]);
    order(g);
    g.setAnim(guestIdle);
  };
  sim.inside.push(g);
  if (direct) { g.eaten = Math.floor(rand() * (g.want - 1)); g.ordered = g.eaten; arrive(); return; }
  g.go(seatPath(s), arrive);
}
function order(g) { if (SHOP.state === 'closed') return; if (g.ordered < g.want) { g.ordered++; sim.orders.push({ g, t: sim.t }); } }
function leave(g) {
  const s = g.seat; s.occupied = null; g.state = 'leaving'; g.stand(); g.setAnim(null);
  if (g.cup) { scene.remove(g.cup); g.cup = null; }
  sim.inside.splice(sim.inside.indexOf(g), 1); sim.leaving.push(g);
  const p = seatPath(s).reverse().slice(1);
  p.push({ x: -9.6, z: L.doorZ + 0.6 }, { x: -9.9, z: 34 });
  g.speed = rr(1.2, 1.5);
  g.go(p, () => drop(g));
}
// a figure that has left the scene for good
function drop(g) {
  if (g._gone) return; g._gone = true; cancelFade(g); g.remove(); g.path = []; g.done = null;
  for (const a of [sim.queue, sim.inside, sim.leaving]) { const i = a.indexOf(g); if (i >= 0) a.splice(i, 1); }
  if (g.seat) { if (g.seat.occupied === g) g.seat.occupied = null; g.seat.reserved = false; }
  if (g.cup) { scene.remove(g.cup); g.cup = null; }
  for (const r of g.plate || []) scene.remove(r); g.plate = [];
}

// guest animations
function guestIdle(p, t, dt) {
  // reach for the next roll on the plate
  if (!p.holding && p.plate.length && t > 0.3) {
    const r = p.plate.shift(); p.holding = r; r.userData.left = 1;
    p.arms[1].add(r); r.position.set(0, -0.6, 0.02); r.rotation.set(Math.PI / 2, 0, 0); p.eatT = 0;
  }
  if (p.holding) {
    p.eatT += dt;
    const k = Math.min(1, p.eatT / p.eatDur);
    const bite = (Math.sin(p.eatT * 2.4) + 1) / 2;
    p.arms[1].rotation.x = -0.8 - Math.pow(bite, 4) * 0.75;
    p.arms[1].rotation.z = 0.35;
    p.holding.scale.y = Math.max(0.12, 1 - k * 0.9);
    p.head.rotation.x = 0.12 - Math.pow(bite, 3) * 0.12;
    if (k > 0.55 && p.ordered < p.want && p.ordered === p.eaten + 1 + p.plate.length) order(p);
    if (k >= 1) {
      p.arms[1].remove(p.holding); p.holding = null; p.eaten++;
      p.arms[1].rotation.x = -0.4; p.head.rotation.x = 0;
      if (p.eaten >= p.want) { p.leaveIn = SHOP.state === 'closing' ? rr(40, 240) : 1.6; }
      else if (p.ordered <= p.eaten + p.plate.length) order(p);
    }
  } else {
    p.arms[1].rotation.x += (-0.7 - p.arms[1].rotation.x) * Math.min(1, dt * 4);
    p.arms[0].rotation.x += (-0.7 - p.arms[0].rotation.x) * Math.min(1, dt * 4);
    p.head.rotation.y = Math.sin(t * 0.7 + p.phase) * 0.35; // chatting / watching the chefs
  }
  if (p.leaveIn !== undefined) { p.leaveIn -= dt; if (p.leaveIn <= 0) { p.leaveIn = undefined; p.head.rotation.set(0, 0, 0); leave(p); } }
}

// chefs (black tees, grey aprons, caps — as on opening night)
const CHEF_HOMES = [-3.4, -1.9, -0.4, 1.1, 2.6, 3.9].map(x => ({ x, z: 0.95 }));
CHEF_HOMES.forEach((h, i) => {
  const c = new Person({ shirt: 0x17171a, pants: 0x1c1c20, apron: 0x6f737b, cap: i === 2 ? ORANGE : (i % 2 ? 0x111111 : CREAM), speed: 1.7, scale: 1 });
  c.place(h.x, h.z); c.home = h; c.state = 'idle'; c.heading = c.targetHeading = Math.PI; c.group.rotation.y = Math.PI;
  sim.chefs.push(c);
});
function chefRoute(c, to) {
  const pts = [];
  if (Math.abs(c.z - L.laneZ) > 0.05) pts.push({ x: c.x, z: L.laneZ });
  if (Math.abs(c.x - to.x) > 0.05) pts.push({ x: to.x, z: L.laneZ });
  pts.push(to); return pts;
}
function chefRolling(c, t) {
  const w = Math.sin(t * 9) * 0.18;
  c.arms[0].rotation.x = -1.15 + w; c.arms[1].rotation.x = -1.15 - w;
  c.arms[0].rotation.z = -0.35; c.arms[1].rotation.z = 0.35;
  c.head.rotation.x = 0.35;
}
function assignChef(c) {
  if (!sim.orders.length) {
    if (Math.hypot(c.x - c.home.x, c.z - c.home.z) > 0.05) { c.state = 'walk'; c.go(chefRoute(c, c.home), () => { c.state = 'idle'; c.targetHeading = Math.PI; }); }
    else c.state = 'idle';
    return;
  }
  let best = 0, bestCost = 1e9;
  for (let i = 0; i < Math.min(sim.orders.length, 8); i++) {
    const o = sim.orders[i], s = o.g.seat;
    const cost = Math.hypot(c.x - s.chef.x, c.z - s.chef.z) - (sim.t - o.t) * 0.9;
    if (cost < bestCost) { bestCost = cost; best = i; }
  }
  const o = sim.orders.splice(best, 1)[0];
  c.order = o; c.state = 'walk';
  c.go(chefRoute(c, o.g.seat.chef), () => {
    c.state = 'roll'; c.targetHeading = o.g.seat.chefFace; c.rollDur = rr(1.5, 2.1);
    c.setAnim((p, t) => {
      chefRolling(p, t);
      if (t > 0.5 && !p.roll) { p.roll = makeRoll(); p.arms[1].add(p.roll); p.roll.position.set(-0.05, -0.62, 0.08); p.roll.rotation.set(1.2, 0, 0); }
      if (t > p.rollDur) handOver(p);
    });
  });
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
const flying = [];
function handOver(c) {
  const o = c.order, g = o.g, s = g.seat, r = c.roll;
  c.roll = null; c.order = null;
  r.getWorldPosition(_a); scene.attach(r);
  flying.push({ r, from: _a.clone(), to: new THREE.Vector3(s.plate.x, L.CH + 0.09, s.plate.z), t: 0, dur: 0.55, g, s });
  c.state = 'hand';
  c.setAnim((p, t) => {
    p.arms[1].rotation.x = -1.5; p.arms[0].rotation.x = -0.4; p.arms[0].rotation.z = 0; p.arms[1].rotation.z = 0; p.head.rotation.x = 0.1;
    if (t > 0.45) { p.setAnim(null); p.head.rotation.x = 0; assignChef(p); }
  });
}
function updateFlying(dt) {
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i]; f.t += dt; const k = Math.min(1, f.t / f.dur);
    f.r.position.lerpVectors(f.from, f.to, k); f.r.position.y += Math.sin(k * Math.PI) * 0.18;
    f.r.rotation.x = 1.2 + k * 0.37;
    if (k >= 1) {
      flying.splice(i, 1);
      f.r.rotation.set(Math.PI / 2, 0, 0);
      if (f.s.side !== 'F') f.r.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      if (f.g.state === 'seated') { f.g.plate.push(f.r); f.g.eatDur = rr(10, 14); }
      else scene.remove(f.r);
      sim.served++; if (LIVE.source !== 'feed') sim.rollsToday++;
      popAt(f.to);
    }
  }
}

// DJ, host and back-kitchen cook
const djP = new Person({ shirt: 0x111114, pants: 0x1a1a1d, phones: true, hair: 0x111111, speed: 1, scale: 1.02 });
djP.place(dj.x - 0.55, dj.z); djP.heading = djP.targetHeading = Math.PI / 2; djP.group.rotation.y = Math.PI / 2;
djP.setAnim((p, t) => {
  const beat = t * (124 / 60) * Math.PI * 2;
  p.body.position.y = Math.abs(Math.sin(beat / 2)) * 0.05;
  p.head.rotation.x = Math.sin(beat) * 0.12;
  p.arms[0].rotation.x = -0.9 + Math.sin(beat / 4) * 0.15; p.arms[0].rotation.z = -0.25;
  p.arms[1].rotation.x = -0.75 + (Math.sin(beat / 8) > 0.6 ? Math.sin(beat * 2) * 0.35 : 0); p.arms[1].rotation.z = 0.2;
  if (t % 16 > 13) p.arms[0].rotation.x = -2.6 + Math.sin(beat) * 0.2; // hands up for the drop
});
const host = new Person({ shirt: 0x17171a, pants: 0x1c1c20, speed: 1 });
host.place(-6.2, -0.95); host.heading = host.targetHeading = -2.3; host.group.rotation.y = -2.3;
const cook = new Person({ shirt: 0xf6f3e7, pants: 0x1c1c20, apron: 0x6f737b, cap: 0x111111, speed: 1.1 });
cook.place(-2.5, L.northZ + 1.2);
function cookLoop() { cook.go([{ x: 2.8, z: L.northZ + 1.2 }], () => { cook.targetHeading = Math.PI; cook.setAnim(chefRolling); setTimeoutSim(() => { cook.setAnim(null); cook.head.rotation.x = 0; cook.go([{ x: -2.5, z: L.northZ + 1.2 }], () => { cook.targetHeading = Math.PI; cook.setAnim(chefRolling); setTimeoutSim(() => { cook.setAnim(null); cook.head.rotation.x = 0; cookLoop(); }, 5); }); }, 4); }); }
const simTimers = [];
function setTimeoutSim(fn, s) { simTimers.push({ fn, at: sim.t + s }); }
cookLoop();

// ---------- tick ----------
function stepSim(dt) {
  sim.t += dt;
  for (let i = simTimers.length - 1; i >= 0; i--) if (simTimers[i].at <= sim.t) { const f = simTimers[i].fn; simTimers.splice(i, 1); f(); }
  // queue target drifts so the line breathes (unless a real number is set)
  if (!LIVE.stats || typeof LIVE.stats.queue !== 'number') sim.queueTarget = Math.round(8 + 3 * Math.sin(sim.t / 70) + 1.5 * Math.sin(sim.t / 23));
  sim.spawnCooldown -= dt;
  if (SHOP.state === 'open' && sim.queue.length < Math.min(14, sim.queueTarget) && sim.spawnCooldown <= 0) { spawnArrival(); sim.spawnCooldown = sim.queue.length < sim.queueTarget - 3 ? rr(0.45, 0.9) : rr(1.1, 2.4); }
  // seat the head of the line
  const filled = seats.filter(s => s.occupied || s.reserved).length;
  const head = sim.queue[0];
  if (SHOP.state === 'open' && head && head.atSlot && filled < sim.seatTarget) {
    const fs = freeSeats();
    if (fs.length) {
      const s = pick(fs);
      sim.queue.shift(); seatGuest(head, s); reflowQueue();
      door.rotation.y = -1.3; doorOpenT = 1.6;
    }
  }
  if (doorOpenT > 0) { doorOpenT -= dt; if (doorOpenT <= 0) door.rotation.y = -0.9; }
  for (const c of sim.chefs) if (c.state === 'idle' && sim.orders.length) assignChef(c);
  for (const c of sim.chefs) c.update(dt, sim.t);
  for (const g of sim.queue) {
    g.update(dt, sim.t);
    if (g.state === 'queued' && g.idleFn === 'phone') { g.arms[1].rotation.x = -1.3; g.head.rotation.x = 0.35; }
  }
  for (const g of sim.inside.slice()) g.update(dt, sim.t);
  for (const g of sim.leaving.slice()) g.update(dt, sim.t);
  djP.update(dt, sim.t); host.update(dt, sim.t); cook.update(dt, sim.t);
  host.head.rotation.y = Math.sin(sim.t * 0.5) * 0.5;
  updateFlying(dt);
  // DJ booth details
  jogs.forEach((j, i) => j.rotation.y += dt * (i ? 3.4 : 2.9));
  djLight.intensity = (7 + 5 * Math.max(0, Math.sin(sim.t * (124 / 60) * Math.PI * 2))) * (1 - SHOP.k);
  stepShop(dt);
}
let doorOpenT = 0;


// Central teaser pin (not a model of the shop — just a marker down the road)
const CENTRAL = { x: -10.9, z: -44 }; // up Queen's Road East toward Admiralty / Central (west)
{
  const pinMat = glow(ORANGE);
  cyl(0.06, 0.06, 3.4, 6, pinMat, CENTRAL.x, 1.7, CENTRAL.z);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), pinMat); head.position.set(CENTRAL.x, 3.6, CENTRAL.z); scene.add(head);
  const sign = new THREE.Sprite(langSign(new THREE.SpriteMaterial({ transparent: true, fog: false }), { en: ['CENTRAL', 'COMING SOON'], zh: ['中環', '即將開業'], ja: ['セントラル', '近日オープン'] }, { w: 1024, h: 420, font: '900 112px Geist, sans-serif', color: '#F6F3E7', bg: 'rgba(246,69,1,0.94)' }));
  sign.scale.set(4.6, 1.9, 1); sign.position.set(CENTRAL.x, 5.4, CENTRAL.z); scene.add(sign);
}

const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
const proxies = [];
function proxy(key, w, h, d, x, y, z, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), proxyMat); m.position.set(x, y, z); m.userData.hot = key; parent.add(m); proxies.push(m); return m;
}
// floor glow rings that pulse under each tappable thing
const ringGeo = new THREE.RingGeometry(0.62, 0.8, 28); ringGeo.rotateX(-Math.PI / 2);
const rings = [];
function ring(x, y, z, s = 1, parent = scene) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.set(x, y, z); m.scale.setScalar(s); m.userData.s = s; m.userData.ph = rings.length * 0.9; parent.add(m); rings.push(m); return m;
}
const keyChef = sim.chefs[2];
const HOT = {
  menu:    { label: 'Menu',            anchor: new THREE.Vector3(0.9, 1.75, L.F + 0.1), view: { t: [0.2, 0.9, 2.0], az: -0.25, pol: 0.95, d: 10.5 } },
  build:   { label: 'How it’s rolled', anchor: () => _hotA.copy(keyChef.group.position).setY(2.15), view: { t: () => [keyChef.group.position.x, 1.2, 1.0], az: -0.12, pol: 1.0, d: 7.6 } },
  dj:      { label: 'DJ night',        anchor: new THREE.Vector3(dj.x, 2.1, dj.z), view: { t: [-6.6, 1.1, 1.5], az: 1.12, pol: 1.04, d: 6.6 } },
  drinks:  { label: 'Drinks',          anchor: new THREE.Vector3(-2.2, 2.65, L.backZ - 0.3), view: { t: [-1.4, 1.2, -2.0], az: -0.1, pol: 1.05, d: 9.5 } },
  walkin:  { label: 'Walk-ins',        anchor: new THREE.Vector3(QX, 2.2, QZ0 - 1.3), view: { t: [-8.3, 0.8, -6.2], az: -0.9, pol: 0.95, d: 11 } },
  visit:   { label: 'Visit',           anchor: new THREE.Vector3(L.glassX - 0.3, 2.6, L.doorZ - 1.35), view: { t: [-7.6, 1.2, -2.9], az: -1.2, pol: 1.05, d: 9.5 } },
  central: { label: 'Central · coming soon', anchor: new THREE.Vector3(CENTRAL.x, 6.7, CENTRAL.z), view: { t: [CENTRAL.x, 2.0, CENTRAL.z + 4], az: -0.75, pol: 0.86, d: 30 } },
  events:  { label: 'Events',     anchor: new THREE.Vector3(EVW.x + 1.5, EVW.y + EVW.h / 2 + 1.75, EVW.z + 0.2), view: { t: [EVW.x + 0.3, 1.95, EVW.z + 0.4], az: -0.22, pol: 1.36, d: 4.4 } },
  delivery: { label: 'Delivery', anchor: new THREE.Vector3(L.glassX, 0.3, 2.5), view: { t: [-7.6, 1.2, -2.9], az: -1.2, pol: 1.05, d: 9.5 } },
  lunch:   { view: { t: [2.6, 0.9, 2.0], az: 0.12, pol: 0.92, d: 10.5 } },
  social:  { label: 'IG · FB',         anchor: new THREE.Vector3(3.35, 1.55, L.F + 0.13), view: { t: [3.2, 1.0, 2.2], az: 0.3, pol: 0.82, d: 5.2 } },
};
const _hotA = new THREE.Vector3();
// proxies (what a tap on the 3D room hits)
proxy('menu', L.XR - L.XL + 1.6, 1.3, 1.3, (L.XL + L.XR) / 2, 0.65, L.F);
proxy('menu', 1.3, 1.3, L.F - L.ZB + 0.6, L.XL, 0.65, (L.F + L.ZB) / 2);
proxy('menu', 1.3, 1.3, L.F - L.ZB + 0.6, L.XR, 0.65, (L.F + L.ZB) / 2);
for (const c of sim.chefs) { proxy('build', 0.75, 1.9, 0.75, 0, 0.95, 0, c.group); }
proxy('dj', 1.3, 2.2, 3.8, dj.x, 1.1, dj.z);
proxy('drinks', 9.4, 2.5, 0.9, 0, 1.25, L.backZ - 0.3);
proxy('walkin', 1.8, 2.2, 10, QX, 1.1, QZ0 - 4.6);
proxy('visit', 1.2, 3.2, 2.6, L.glassX - 0.2, 1.6, L.doorZ - 0.4);
proxy('central', 2.2, 7, 2.2, CENTRAL.x, 3.5, CENTRAL.z);
proxy('events', EVW.w + 0.2, EVW.h + 0.6, 0.4, EVW.x, EVW.y + 0.2, EVW.z + 0.1);
// small lit DELIVERY plate on the street wall beside the door (opens foodpanda / Keeta); its word follows the language toggle
{ const dm = langSign(new THREE.MeshBasicMaterial({ transparent: true }), { en: ['DELIVERY'], zh: ['外賣'], ja: ['デリバリー'] }, { w: 512, h: 300, font: '900 92px Geist, sans-serif', color: '#F6F3E7', bg: 'rgba(246,69,1,0.94)' });
  box(0.05, 0.46, 0.76, mat(0x111216), L.glassX - 0.12, 2.0, L.doorZ - 1.35);
  const dp = plane(0.7, 0.4, dm, L.glassX - 0.15, 2.0, L.doorZ - 1.35, -Math.PI / 2); dp.userData.keep = true;
  proxy('delivery', 0.4, 0.6, 0.9, L.glassX - 0.2, 2.0, L.doorZ - 1.35); }
// ---------- Instagram + Facebook: a phone on the bar (Dominic, Oct 13: phone only, no neon / polaroids) ----------
// the panel ('social', index.html tpl-social) carries the real links, as on rorubaru.com's own footer
const softGlowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// a phone lying on the bar counter; now and then it buzzes and a notification lights the screen
const PHONE = { x: 3.35, z: L.F + 0.13, y: L.CH + 0.032, buzzAt: 3, buzzT: -1, lit: 0 };
{
  const grp = new THREE.Group(); grp.position.set(PHONE.x, PHONE.y, PHONE.z); grp.rotation.y = 0.42; scene.add(grp);
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const thumbs = [];
  ['social/p1.jpg', 'social/p3.jpg'].forEach((s) => { const im = new Image(); im.onload = () => { thumbs.push(im); draw(PHONE.lit); }; im.src = s; });
  function draw(on) {
    g.clearRect(0, 0, 256, 512);
    const bg = g.createLinearGradient(0, 0, 0, 512); bg.addColorStop(0, on ? '#2a1830' : '#07080b'); bg.addColorStop(1, on ? '#0d1830' : '#050608'); g.fillStyle = bg; g.fillRect(0, 0, 256, 512);
    g.fillStyle = on ? '#F6F3E7' : 'rgba(246,243,231,0.28)'; g.textAlign = 'center'; g.font = '700 64px Geist, sans-serif'; g.fillText('9:41', 128, 120);
    if (!on) return void (tex.needsUpdate = true);
    // notification card
    g.fillStyle = 'rgba(246,243,231,0.92)'; rrect(g, 14, 168, 228, 132, 22); g.fill();
    const ig = g.createLinearGradient(26, 220, 70, 180); ig.addColorStop(0, '#FEDA75'); ig.addColorStop(0.4, '#FA7E1E'); ig.addColorStop(0.7, '#D62976'); ig.addColorStop(1, '#4F5BD5');
    g.fillStyle = ig; rrect(g, 26, 182, 40, 40, 11); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3.5; rrect(g, 34, 190, 24, 24, 7); g.stroke(); g.beginPath(); g.arc(46, 202, 6, 0, 7); g.stroke();
    g.textAlign = 'left'; g.fillStyle = '#14151b'; g.font = '700 21px Geist, sans-serif'; g.fillText('rorubaru', 76, 200);
    g.font = '500 18px Geist, sans-serif'; g.fillStyle = '#3a3b44'; g.fillText('new post', 76, 222);
    if (thumbs[0]) g.drawImage(thumbs[0], 26, 236, 52, 52); if (thumbs[1]) g.drawImage(thumbs[1], 84, 236, 52, 52);
    g.fillStyle = '#F64501'; g.font = '800 18px Geist, sans-serif'; g.fillText('tap', 150, 268);
    // two big buttons, as in the panel
    g.fillStyle = ig; rrect(g, 22, 330, 212, 56, 16); g.fill();
    g.fillStyle = '#1877F2'; rrect(g, 22, 400, 212, 56, 16); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 24px Geist, sans-serif'; g.fillText('Instagram', 128, 366); g.fillText('Facebook', 128, 436);
    tex.needsUpdate = true;
  }
  draw(false);
  const W = 0.15, D = 0.3;   // a touch bigger than life so it reads from the home view
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, 0.016, D), mat(0x15161a)); body.position.y = 0.008; grp.add(body);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.008, 0.012, D + 0.008), mat(0x8a8f98)); rim.position.y = 0.006; grp.add(rim);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.014, D - 0.018), new THREE.MeshBasicMaterial({ map: tex })); scr.rotation.x = -Math.PI / 2; scr.position.y = 0.0165; grp.add(scr);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshBasicMaterial({ map: softGlowTex, color: 0xffb08a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.003; grp.add(halo);
  PHONE.grp = grp; PHONE.draw = draw; PHONE.halo = halo;
  proxy('social', 0.6, 0.45, 0.62, PHONE.x, PHONE.y + 0.2, PHONE.z);
}
function stepPhone(dt) {
  if (!PHONE.grp) return;
  PHONE.buzzAt -= dt;
  if (PHONE.buzzAt <= 0) { PHONE.buzzAt = 7 + Math.random() * 5; PHONE.buzzT = 0; if (!PHONE.lit) { PHONE.lit = 1; PHONE.draw(true); } }
  let jig = 0;
  if (PHONE.buzzT >= 0) {
    PHONE.buzzT += dt;
    const b = PHONE.buzzT;
    if ((b < 0.45) || (b > 0.6 && b < 1.05)) jig = Math.sin(b * 95) * 0.006;
    if (b > 4.2) { PHONE.buzzT = -1; PHONE.lit = 0; PHONE.draw(false); }
  }
  PHONE.grp.position.x = PHONE.x + jig; PHONE.grp.rotation.y = 0.42 + jig * 3;
  const want = PHONE.lit ? 0.6 : 0; PHONE.halo.material.opacity += (want - PHONE.halo.material.opacity) * Math.min(1, dt * 6);
}
ring(PHONE.x, L.CH + 0.035, PHONE.z, 0.55);
ring(0.9, 1.02, L.F, 1.2);
ring(0, 0.03, 0, 0.75, keyChef.group);
ring(dj.x + 0.9, 0.03, dj.z, 1.3);
ring(-2.2, 0.03, L.backZ + 0.5, 1.2);
ring(QX, 0.03, QZ0 - 0.6, 1.1);
ring(L.glassX - 0.8, 0.03, L.doorZ, 1.1);
ring(CENTRAL.x, 0.04, CENTRAL.z, 2.2);
ring(EVW.x, 0.03, EVW.z + 0.75, 1.0);

const hotLayer = document.getElementById('hotspots');
const hotEls = [];
// pins over the room: only what the bottom bar doesn't already carry (v20 declutter), plus Delivery
// (Dominic, Oct 13 2026: wants it clickable in the room too). Menu, drinks,
// walk-ins and Central still open from a tap on the room itself, the bottom bar or More.
const NO_PIN = new Set(['menu', 'drinks', 'walkin', 'central']);
for (const [key, h] of Object.entries(HOT)) {
  if (!h.label || NO_PIN.has(key)) continue;
  // a pin with an href is a plain link (Instagram): a real <a>, so it opens in a new tab everywhere
  const b = document.createElement(h.href ? 'a' : 'button'); b.className = 'hs' + (key === 'central' ? ' hs-central' : '') + (h.href ? ' hs-link' : '');
  if (h.href) { b.href = h.href; b.target = '_blank'; b.rel = 'noopener'; } else { b.type = 'button'; b.dataset.open = key; }
  b.innerHTML = '<span class="hs-dot" aria-hidden="true"></span><span class="hs-t" data-t="hs.' + key + '">' + h.label + '</span>';
  b.setAttribute('aria-label', h.href ? 'RORUBARU on Instagram (opens in a new tab)' : key === 'social' ? 'Open Instagram and Facebook' : 'Open ' + h.label.replace('·', ''));
  hotLayer.appendChild(b); hotEls.push({ el: b, key, h });
}
if (window.RORU_I18N) window.RORU_I18N.apply(hotLayer);

// ---------- camera moves (smooth fly to a hotspot, and home again) ----------
const fly = { on: false, t: 0, dur: 1.1, from: null, to: null, offFrom: [0, 0], offTo: [0, 0] };
let viewOff = [0, 0];
let activeKey = null;
function camState() {
  const sp = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  return { t: controls.target.clone(), az: sp.theta, pol: sp.phi, d: sp.radius };
}
function viewFor(key) {
  if (!key) return { t: homeView.target.clone(), az: homeView.az, pol: homeView.polar, d: homeView.dist };
  const v = HOT[key].view; const tt = typeof v.t === 'function' ? v.t() : v.t;
  const portrait = innerWidth / innerHeight < 0.9;
  return { t: new THREE.Vector3(...tt), az: v.az, pol: v.pol, d: key === 'central' ? v.d * (portrait ? 1.05 : 1) : v.d * (portrait ? 1.45 : 1.22) };
}
function offsetFor(key) {
  if (!key) return [0, 0];
  const portrait = innerWidth < 760;
  // keep the object clear of the panel: sheet from the bottom on phones, side panel on desktop
  if (portrait) {
    const pEl = document.getElementById('panel');
    const ph = pEl && !pEl.hidden ? pEl.offsetHeight : innerHeight * 0.5;
    const topH = 110, tabsH = 62;
    const panelTop = innerHeight - tabsH - ph;
    const centre = (topH + panelTop) / 2;
    return [0, Math.max(0, Math.min(innerHeight * 0.34, innerHeight / 2 - centre))];
  }
  return [Math.min(220, innerWidth * 0.16), 0];
}
const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
function flyTo(key, dur) {
  activeKey = key;
  fly.from = camState(); fly.to = viewFor(key);
  // shortest way round
  fly.offFrom = viewOff.slice(); fly.offTo = offsetFor(key);
  fly.t = 0; fly.start = performance.now(); fly.dur = dur || (key === 'central' || fly.from.d > 30 && key ? 1.5 : 1.15); fly.on = true;
  controls.autoRotate = false; lastInteract = performance.now();
}
function applyOffset() {
  if (viewOff[0] === 0 && viewOff[1] === 0) camera.clearViewOffset();
  else camera.setViewOffset(innerWidth, innerHeight, viewOff[0], viewOff[1], innerWidth, innerHeight);
}
function stepFly(dt) {
  if (!fly.on) return;
  // wall-clock timing so a slow frame rate never stretches the move (capture mode steps by dt)
  fly.t = CAPTURE ? fly.t + dt / fly.dur : (performance.now() - fly.start) / 1000 / fly.dur;
  const k = ease(Math.min(1, fly.t));
  if (activeKey === 'build') { const tt = HOT.build.view.t(); fly.to.t.set(tt[0], tt[1], tt[2]); }
  controls.target.lerpVectors(fly.from.t, fly.to.t, k);
  // central: lift up and out, then glide
  const lift = (activeKey === 'central' || (fly.from.d > 30 && !activeKey)) ? 0 : Math.sin(k * Math.PI) * 0.12;
  const sp = new THREE.Spherical(fly.from.d + (fly.to.d - fly.from.d) * k, Math.max(0.3, fly.from.pol + (fly.to.pol - fly.from.pol) * k - lift), fly.from.az + (fly.to.az - fly.from.az) * k);
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sp));
  camera.lookAt(controls.target);
  viewOff = [fly.offFrom[0] + (fly.offTo[0] - fly.offFrom[0]) * k, fly.offFrom[1] + (fly.offTo[1] - fly.offFrom[1]) * k];
  applyOffset();
  if (fly.t >= 1) fly.on = false;
}
// the UI layer (ui.js) owns the panels; the room asks it to open one, and it tells the room where to look
window.addEventListener('roru:panel', (e) => {
  const key = e.detail && e.detail.key;
  if (!key && mode !== 'room') { document.body.classList.remove('panel-open'); return; }
  if (key && mode !== 'room') { mode = 'room'; document.body.dataset.mode = 'room'; const wasWalk = document.body.dataset.walking === '1'; document.querySelectorAll('.dock [data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === 'room'))); if (!walkHud.hidden) exitWalk(); Object.assign(controls, ROOM_LIMITS); controls.enabled = true; city.setGhost(true); frame(false); }
  flyTo(key && HOT[key] ? key : null);
  document.body.classList.toggle('panel-open', !!key);
});

// tap detection on the canvas (a tap, not a drag, picks the thing under the finger)
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; }, { passive: true });
canvas.addEventListener('pointerup', (e) => {
  if (!down || e.pointerId !== down.id) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dtp = performance.now() - down.t; down = null;
  if (moved > 10 || dtp > 600) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(proxies, false)[0];
  if (hit) window.RORU_UI && window.RORU_UI.open(hit.object.userData.hot, 'room');
  else if (activeKey && innerWidth >= 760) window.RORU_UI && window.RORU_UI.close();
}, { passive: true });
let hoverRaf = 0;
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || hoverRaf) return;
  hoverRaf = requestAnimationFrame(() => {
    hoverRaf = 0;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    canvas.style.cursor = ray.intersectObjects(proxies, false).length ? 'pointer' : '';
  });
}, { passive: true });


const settingMeshes = [];   // place settings (plates, chopsticks, soy dishes, carafes), hidden after hours
// ---------- batch the static set: one draw call per material instead of one per box (keeps phones smooth) ----------
{
  scene.updateMatrixWorld(true);
  const skip = new Set([...jogs, ...rings, ...proxies]);
  const groups = new Map();
  for (const o of [...scene.children, ...world.children]) {
    if (!o.isMesh || skip.has(o) || !o.geometry.index) continue;
    const k = o.material.uuid + (o.userData.setting ? ':set' : '');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(o);
  }
  let merged = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const geos = list.map((m) => { const g = m.geometry.clone().applyMatrix4(m.matrixWorld); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); return g; });
    const g = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    if (!g) continue;
    const mesh = new THREE.Mesh(g, list[0].material);
    mesh.renderOrder = list[0].renderOrder;
    if (list[0].userData.setting) mesh.userData.setting = true;
    scene.add(mesh);
    for (const m of list) { m.parent.remove(m); m.geometry.dispose(); }
    merged += list.length;
  }
  window.__merged = merged;
  for (const o of scene.children) if (o.userData.setting) settingMeshes.push(o);
  // photo textures tile in metres (world space), so long counters and walls don't stretch them
  scene.updateMatrixWorld(true);
  for (const o of [...scene.children]) worldUV(o);
  // soft shadows on the high tier: one warm key light over the counter
  if (QUALITY === 'high') {
    const key = new THREE.DirectionalLight(0xffe0bf, 0.55); key.position.set(-3, 9, 5); key.target.position.set(0, 0, 0.5);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 4; key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6, near: 1, far: 20 }); scene.add(key, key.target);
    for (const o of scene.children) if (o.isMesh) { if (o.material === counterTop || o.material === counterBody || o.material === steel) o.castShadow = true; if (o.material === floorMat || o.material === counterTop) o.receiveShadow = true; }
    for (const o of scene.children) if (o.isGroup && o.children.some((c) => c.userData.person)) o.traverse((c) => { if (c.isMesh && !c.userData.noShadow) c.castShadow = true; });
  }
}
function worldUV(o) {
  const s = o.isMesh && o.material && o.material.userData && o.material.userData.wuv; if (!s) return;
  const g = o.geometry, P0 = g.attributes.position, N0 = g.attributes.normal, U = g.attributes.uv; if (!U || !N0) return;
  o.updateMatrixWorld(true);
  const _p = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
  for (let i = 0; i < P0.count; i++) {
    _p.fromBufferAttribute(P0, i).applyMatrix4(o.matrixWorld); _n.fromBufferAttribute(N0, i).applyMatrix3(_nm);
    const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
    if (ay >= ax && ay >= az) U.setXY(i, _p.x / s, _p.z / s); else if (ax >= az) U.setXY(i, _p.z / s, _p.y / s); else U.setXY(i, _p.x / s, _p.y / s);
  }
  U.needsUpdate = true;
}


// ---------- the real street around the shop (OpenStreetMap), day/night, and the three ways to look ----------
const city = buildCity(scene);
camera.far = 3200; camera.updateProjectionMatrix();
scene.fog = new THREE.Fog(0x0b0d12, 150, 640);
// pieces that only exist while you walk inside: a ceiling and the full-height side wall
const walkShell = new THREE.Group(); walkShell.visible = false; scene.add(walkShell);
box(L.eastX - L.glassX, 0.08, L.southZ - L.northZ, mat(0x1b1b20), (L.eastX + L.glassX) / 2, H + 0.06, (L.southZ + L.northZ) / 2, walkShell);
box(L.eastX - L.glassX, H - 1.05, 0.16, wallMat, (L.eastX + L.glassX) / 2, 1.05 + (H - 1.05) / 2, L.southZ, walkShell);
walkShell.children.forEach(worldUV);
// a halo behind the ロールバール neon, on at night
const haloTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 64, 4, 128, 64, 120); gr.addColorStop(0, 'rgba(120,200,255,0.75)'); gr.addColorStop(1, 'rgba(60,140,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const neonHalo = plane(7.4, 1.9, new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), L.glassX - 0.12, 2.8, 1.6, -Math.PI / 2);
neonHalo.renderOrder = -1;

// backlit walls: teal; after dark they drift slowly to red and back, as the real panels do (L1053405, Desktop Home Hero)
const _wc = new THREE.Color(), _gw = new THREE.Color(0xffb070), _gr = new THREE.Color(0xff5a3c);
function wallGlow(t) {
  const cyc = 0.5 - 0.5 * Math.cos(t * Math.PI * 2 / 48);
  const r = DN.k * Math.min(1, Math.max(0, (cyc - 0.45) / 0.35));
  _wc.copy(WALL_TEAL).lerp(WALL_RED, r);
  _wc.multiplyScalar(1 - 0.5 * SHOP.k);   // after hours the backlit walls run at half
  tealPanel.color.copy(_wc); wallWash.color.copy(_wc); teal.color.copy(_wc);
  underGlow.color.copy(_gw).lerp(_gr, r * 0.8).multiplyScalar(1 - 0.6 * SHOP.k);
}
// day / night: automatic by Hong Kong time, or the toggle
const hemiL = scene.children.find((o) => o.isHemisphereLight), ambL = scene.children.find((o) => o.isAmbientLight);
const DN = { k: 1, target: 1, manual: false };
const hkHour = () => { const d = new Date(Date.now() + 8 * 3600e3); return d.getUTCHours() + d.getUTCMinutes() / 60; };
const autoNight = () => { const h = hkHour(); return (h >= 18.5 || h < 6.5) ? 1 : 0; };
DN.target = DN.k = params.has('day') ? 0 : params.has('night') ? 1 : autoNight();
const C = { bgN: new THREE.Color(0x0b0d12), bgD: new THREE.Color(0xa7c2da), hN: new THREE.Color(0xa9b8d8), hD: new THREE.Color(0xeef3f8), gN: new THREE.Color(0x2a2018), gD: new THREE.Color(0x8d8371), sN: new THREE.Color(0xc9d6ff), sD: new THREE.Color(0xfff0d8) };
const SOUTH = new THREE.Vector3(-city.north[0], 0, -city.north[1]);
function applyDN(k) {
  scene.background.lerpColors(C.bgD, C.bgN, k); scene.fog.color.copy(scene.background);
  scene.fog.near = 170 - 20 * k; scene.fog.far = 820 - 180 * k;
  hemiL.color.lerpColors(C.hD, C.hN, k); hemiL.groundColor.lerpColors(C.gD, C.gN, k); hemiL.intensity = 1.9 - 1.25 * k;
  if (ambL) ambL.intensity = 0.55 - 0.33 * k;
  moon.color.lerpColors(C.sD, C.sN, k); moon.intensity = 2.0 - 1.72 * k;
  moon.position.set(SOUTH.x * 60 - 20 * k, 90 - 72 * k, SOUTH.z * 60 + 8);
  renderer.toneMappingExposure = 1.02 + 0.28 * k;
  city.setNight(k);
  neon.material.color.setScalar(0.6 + 0.4 * k); neonHalo.material.opacity = 0.55 * k; glassLetters.material.color.setScalar(0.8 + 0.2 * k);
  const b = document.getElementById('dayNight');
  if (b) { const night = DN.target > 0.5; b.setAttribute('aria-pressed', String(!night)); b.setAttribute('aria-label', night ? 'Night view. Switch to day' : 'Day view. Switch to night'); b.querySelector('span').textContent = night ? '☾' : '☀'; b.title = night ? 'Night (tap for day)' : 'Day (tap for night)'; }
}
applyDN(DN.k);
document.getElementById('dayNight')?.addEventListener('click', () => { DN.target = DN.target > 0.5 ? 0 : 1; DN.manual = true; applyDN(DN.k); });
setInterval(() => { if (!DN.manual) DN.target = autoNight(); }, 60000);

// labels on the street: bilingual road names, landmarks, MTR exit, the bus stop by the door
const cityLabels = [];
// one language at a time (Dominic, Oct 13): EN shows English, 繁中 the Chinese name, 日本語 the kanji name (as Japanese guides print HK streets)
const tri = (en, zh, ja) => zh ? `<span class="l-en">${en}</span><span class="l-zh" lang="zh-Hant">${zh}</span><span class="l-ja" lang="ja">${ja || zh}</span>` : en;
function cLabel(html, x, y, z, kind, modes, maxD) {
  const el = document.createElement(kind === 'shop' ? 'button' : 'div'); el.className = 'clbl ' + kind; el.innerHTML = html; labelLayer.appendChild(el);
  const l = { el, pos: new THREE.Vector3(x, y, z), kind, modes, maxD }; cityLabels.push(l); return l;
}
cLabel(tri("Queen's Road East", '皇后大道東'), -17.2, 0.3, 7.5, 'road', ['room'], 80);
for (const r of city.labels) cLabel(tri(r.en, r.zh), r.x, 0.5, r.z, 'road' + (r.major ? ' major' : ''), ['street'], r.major ? 650 : 260);
for (const m of city.landmarks) cLabel(tri(m.en, m.zh), m.x, Math.min(m.y, 60), m.z, 'lm', ['street'], 900);
for (const s of city.stops) {
  if (s.t === 'mtr' && s.ref === 'D') cLabel(tri('MTR Wan Chai · Exit D', '港鐵灣仔站 D 出口', 'MTR ワンチャイ駅 D出口'), s.x, 4.2, s.z, 'mtr', ['street', 'walk'], 700);
}
{ const s = city.stops.filter((q) => q.t === 'bus').sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
  if (s) cLabel(tri('Bus stop · Lun Fat Street', '巴士站 · 聯發街', 'バス停 · 聯發街'), s.x, 3.4, s.z, 'bus', ['street'], 160); }
const shopPin = cLabel('<b>RORUBARU</b><span>G/F 100–102 · step inside</span>', -4, 30, 0, 'shop', ['street'], 2000);
shopPin.el.type = 'button'; shopPin.el.addEventListener('click', () => setMode('room'));
function updateCityLabels() {
  const cp = camera.position; let shown = 0;
  for (const l of cityLabels) {
    let on = l.modes.includes(mode) && !document.body.classList.contains('panel-open') && cp.distanceTo(l.pos) < l.maxD;
    let s;
    if (on) { s = project(l.pos); on = s.vis && s.x > -40 && s.x < innerWidth + 40 && s.y > 60 && s.y < innerHeight - 70; }
    if (on && l.kind.startsWith('road') && mode === 'street' && !l.kind.includes('major') && shown > 22) on = false;
    if (l.on !== on) { l.el.style.display = on ? '' : 'none'; l.on = on; }
    if (!on) continue; shown++;
    l.el.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) translate(-50%,-100%)`;
  }
}

// compass: the needle shows true north as OSM has it
const needle = document.getElementById('needle');
function updateCompass() {
  if (!needle) return;
  const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-6) return; f.normalize();
  const n = city.north; const up = n[0] * f.x + n[1] * f.z, right = n[0] * -f.z + n[1] * f.x;
  needle.style.transform = `rotate(${Math.atan2(right, up).toFixed(3)}rad)`;
}

// modes: room (the bar), street (the block from above), walk (ground level from the MTR)
let mode = 'room';
const ROOM_LIMITS = { minDistance: 7, maxDistance: 48, minPolarAngle: 0.28, maxPolarAngle: 1.32, minAzimuthAngle: -1.25, maxAzimuthAngle: 1.25 };
const STREET_LIMITS = { minDistance: 10, maxDistance: 560, minPolarAngle: 0.05, maxPolarAngle: 1.45, minAzimuthAngle: -Infinity, maxAzimuthAngle: Infinity };
const NORTH_AZ = Math.atan2(-city.north[0], -city.north[1]);
function streetView() { const portrait = innerWidth / innerHeight < 0.9; return { t: new THREE.Vector3(-4, 0, 30), az: NORTH_AZ + 0.32, pol: portrait ? 0.5 : 0.6, d: portrait ? 400 : 300 }; }
function flyToView(v, dur) {
  activeKey = null; fly.from = camState(); fly.to = v; fly.offFrom = viewOff.slice(); fly.offTo = [0, 0];
  let daz = v.az - fly.from.az; daz = Math.atan2(Math.sin(daz), Math.cos(daz)); fly.to = { ...v, az: fly.from.az + daz };
  fly.t = 0; fly.start = performance.now(); fly.dur = dur || 1.8; fly.on = true; controls.autoRotate = false; lastInteract = performance.now();
}
function setMode(m, opt = {}) {
  if (m === mode && !opt.force) { if (m === 'street') flyToView(streetView()); return; }
  const prev = mode; mode = m; document.body.dataset.mode = m;
  document.querySelectorAll('[data-mode]').forEach((b) => b.closest('.dock') && b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  if (prev === 'walk') exitWalk();
  if (m !== 'room' && window.RORU_UI && window.RORU_UI.current) window.RORU_UI.close();
  if (m === 'room') { Object.assign(controls, ROOM_LIMITS); controls.enabled = true; city.setGhost(true); frame(false); flyToView(viewFor(null), prev === 'walk' ? 2.0 : 1.6); }
  if (m === 'street') { Object.assign(controls, STREET_LIMITS); controls.enabled = true; city.setGhost(true); flyToView(streetView(), 1.9); }
  if (m === 'walk') enterWalk(opt.s);
  if (history.replaceState && !opt.quiet) history.replaceState(null, '', m === 'room' ? location.pathname + location.search : '#' + m);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]'); if (b) { e.preventDefault(); setMode(b.dataset.mode); return; }
  if (e.target.closest('[data-home]') && mode !== 'room') setMode('room');
  if (e.target.closest('#compass')) { if (mode === 'walk') { WALK.userYaw = 0; WALK.yaw = NORTH_AZ + Math.PI; WALK.auto = false; syncWalkUI(); } else { const st = camState(); flyToView({ t: st.t, az: NORTH_AZ, pol: st.pol, d: st.d }, 1.0); } }
});

// ---------- walk mode ----------
const hint = document.getElementById('hint');

const WALK = { s: 0, yaw: 0, pitch: -0.03, auto: true, speed: params.has('walkspeed') ? +params.get('walkspeed') : 4.4, userYaw: 0, userPitch: 0, lastLook: 0, pos: new THREE.Vector3(), keys: {}, joy: { x: 0, y: 0 }, arrived: false, bob: 0 };
const walkHud = document.getElementById('walkHud'), walkWhere = document.getElementById('walkWhere'), walkAuto = document.getElementById('walkAuto'), arriveEl = document.getElementById('arrive');
const DOOR_S = city.walkDoor, TURN_S = city.walkTurn;
const _pa = { x: 0, z: 0 }, _pb = { x: 0, z: 0 };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
function syncWalkUI() {
  if (walkAuto) { walkAuto.textContent = WALK.auto ? 'Pause' : (WALK.arrived ? 'Walk it again' : 'Resume the walk'); walkAuto.setAttribute('aria-pressed', String(WALK.auto)); }
}
function enterWalk(s0) {
  WALK.s = Math.max(0, Math.min(city.walk.L, s0 ?? 0)); WALK.auto = true; WALK.arrived = false; WALK.userYaw = 0; WALK.userPitch = 0;
  fly.on = false; controls.enabled = false; controls.autoRotate = false; viewOff = [0, 0]; camera.clearViewOffset();
  city.setGhost(false); walkShell.visible = true;
  camera.fov = innerWidth / innerHeight < 0.9 ? 72 : 62; camera.near = 0.08; camera.updateProjectionMatrix();
  city.walk.at(WALK.s, _pa); city.walk.at(WALK.s + 6, _pb); WALK.pos.set(_pa.x, 1.62, _pa.z); WALK.yaw = Math.atan2(_pb.x - _pa.x, _pb.z - _pa.z);
  walkHud.hidden = false; arriveEl.hidden = true; hint.classList.add('gone');
  syncWalkUI(); stepWalk(0);
}
function exitWalk() {
  walkHud.hidden = true; arriveEl.hidden = true; walkShell.visible = false; camera.near = 0.1;
  const f = new THREE.Vector3(Math.sin(WALK.yaw), 0, Math.cos(WALK.yaw));
  controls.target.copy(camera.position).addScaledVector(f, 10).setY(0.4);
  camera.fov = (innerWidth / innerHeight < 0.9 ? VIEW.tall : VIEW.wide).fov; camera.updateProjectionMatrix();
}
const END_YAW = Math.atan2(5.6, 2.6); // last steps: turn to face the counter and the chefs
function stepWalk(dt) {
  const P = city.walk;
  const kx = (WALK.keys.d || WALK.keys.arrowright ? 1 : 0) - (WALK.keys.a || WALK.keys.arrowleft ? 1 : 0);
  const ky = (WALK.keys.s || WALK.keys.arrowdown ? 1 : 0) - (WALK.keys.w || WALK.keys.arrowup ? 1 : 0);
  const mx = Math.max(-1, Math.min(1, WALK.joy.x + kx)), my = Math.max(-1, Math.min(1, WALK.joy.y + ky));
  let moving = false;
  if (Math.abs(mx) + Math.abs(my) > 0.08) {
    if (WALK.auto) { WALK.auto = false; WALK.yaw += WALK.userYaw; WALK.userYaw = 0; syncWalkUI(); }
    arriveEl.hidden = true;
    const sp = 3.8 * dt; const fx = Math.sin(WALK.yaw), fz = Math.cos(WALK.yaw);
    // stick: up = forward, sideways = turn (feels right on a phone), keys A/D strafe-turn the same way
    WALK.yaw -= mx * dt * 1.6;
    WALK.pos.x += fx * -my * sp; WALK.pos.z += fz * -my * sp;
    const r = Math.hypot(WALK.pos.x, WALK.pos.z); if (r > city.R - 25) { WALK.pos.x *= (city.R - 25) / r; WALK.pos.z *= (city.R - 25) / r; }
    moving = Math.abs(my) > 0.1;
  } else if (WALK.auto) {
    WALK.s = Math.min(P.L, WALK.s + WALK.speed * dt * (WALK.s > DOOR_S - 2 ? 0.6 : 1));
    P.at(WALK.s, _pa); WALK.pos.x = _pa.x; WALK.pos.z = _pa.z;
    let ty;
    const left = P.L - WALK.s;
    if (left < 0.05) { ty = END_YAW; if (!WALK.arrived) { WALK.arrived = true; WALK.auto = false; arriveEl.hidden = false; syncWalkUI(); } }
    else { P.at(Math.min(P.L, WALK.s + 7), _pb); ty = Math.atan2(_pb.x - _pa.x, _pb.z - _pa.z); if (left < 5) ty = ty + angDiff(END_YAW, ty) * (1 - left / 5); }
    WALK.yaw += angDiff(ty, WALK.yaw) * Math.min(1, dt * 2.6);
    moving = left > 0.05;
  }
  if (performance.now() - WALK.lastLook > 2600 && WALK.auto) { WALK.userYaw *= 1 - Math.min(1, dt * 1.4); WALK.userPitch *= 1 - Math.min(1, dt * 1.4); }
  if (moving) WALK.bob += dt * 8.5;
  const yaw = WALK.yaw + WALK.userYaw, pitch = Math.max(-0.7, Math.min(0.7, WALK.pitch + WALK.userPitch));
  camera.position.set(WALK.pos.x, 1.62 + (moving ? Math.sin(WALK.bob) * 0.025 : 0), WALK.pos.z);
  _v.set(WALK.pos.x + Math.sin(yaw) * Math.cos(pitch), camera.position.y + Math.sin(pitch), WALK.pos.z + Math.cos(yaw) * Math.cos(pitch));
  camera.lookAt(_v); controls.target.copy(_v);
  // where am I
  if (walkWhere) {
    let t;
    const m10 = Math.round((DOOR_S - WALK.s) / 10) * 10, m5 = Math.max(5, Math.round((DOOR_S - WALK.s) / 5) * 5);
    if (!WALK.auto && !WALK.arrived && Math.hypot(WALK.pos.x - _pa.x, WALK.pos.z - _pa.z) > 4) t = tri('Free walk · tap “Resume the walk” to follow the route', '自由行走 · 按「繼續路線」跟住路線行', '自由歩行 · 「ルートに戻る」をタップしてルートへ');
    else if (WALK.s < 12) t = tri('MTR Wan Chai · Exit D', '港鐵灣仔站 D 出口', 'MTR ワンチャイ駅 D出口');
    else if (WALK.s < TURN_S) t = tri(`Lee Tung Avenue · ${m10} m to go`, `利東街 · 仲有 ${m10} 米`, `利東街 · あと ${m10} m`);
    else if (WALK.s < DOOR_S - 4) t = tri(`Queen’s Road East · ${m5} m to go`, `皇后大道東 · 仲有 ${m5} 米`, `皇后大道東 · あと ${m5} m`);
    else t = tri('RORUBARU · G/F, 100–102 Queen’s Road East', 'RORUBARU · 皇后大道東 100–102 號地下', 'RORUBARU · 皇后大道東 100–102 1階');
    if (walkWhere._t !== t) { walkWhere.innerHTML = t; walkWhere._t = t; }
  }
}
walkAuto?.addEventListener('click', () => {
  if (WALK.auto) { WALK.auto = false; }
  else {
    if (WALK.arrived) { WALK.s = 0; WALK.arrived = false; arriveEl.hidden = true; }
    else { const n = city.walk.nearest(WALK.pos.x, WALK.pos.z); WALK.s = n.s; }
    WALK.yaw += WALK.userYaw; WALK.userYaw = 0; WALK.auto = true;
  }
  syncWalkUI();
});
document.getElementById('walkSkip')?.addEventListener('click', () => { WALK.s = Math.max(WALK.s, DOOR_S - 16); WALK.auto = true; WALK.arrived = false; arriveEl.hidden = true; WALK.userYaw = 0; syncWalkUI(); });
document.getElementById('walkExit')?.addEventListener('click', () => setMode('room'));
// look around: drag anywhere on the scene
{
  let last = null;
  canvas.addEventListener('pointerdown', (e) => { if (mode !== 'walk') return; last = { x: e.clientX, y: e.clientY, id: e.pointerId }; canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (mode !== 'walk' || !last || e.pointerId !== last.id) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y; last.x = e.clientX; last.y = e.clientY;
    const k = 0.0052;
    if (WALK.auto) { WALK.userYaw += dx * k; WALK.userPitch += dy * k * 0.8; } else { WALK.yaw += dx * k; WALK.pitch = Math.max(-0.7, Math.min(0.7, WALK.pitch + dy * k * 0.8)); }
    WALK.lastLook = performance.now();
  });
  const end = (e) => { if (last && e.pointerId === last.id) last = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
}
// joystick
{
  const joy = document.getElementById('joy'), knob = joy && joy.querySelector('i');
  let id = null, cx = 0, cy = 0;
  const setK = (x, y) => { WALK.joy.x = x; WALK.joy.y = y; if (knob) knob.style.transform = `translate(${x * 30}px,${y * 30}px)`; };
  joy?.addEventListener('pointerdown', (e) => { id = e.pointerId; const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; joy.setPointerCapture(id); e.preventDefault(); });
  joy?.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; let x = (e.clientX - cx) / 40, y = (e.clientY - cy) / 40; const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } setK(x, y); });
  const up = (e) => { if (e.pointerId !== id) return; id = null; setK(0, 0); };
  joy?.addEventListener('pointerup', up); joy?.addEventListener('pointercancel', up);
}
addEventListener('keydown', (e) => {
  if (mode !== 'walk') return; const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { WALK.keys[k] = true; e.preventDefault(); }
  if (k === 'escape' && !(window.RORU_UI && window.RORU_UI.current)) setMode('room');
});
addEventListener('keyup', (e) => { WALK.keys[e.key.toLowerCase()] = false; });

// ---------- camera framing ----------
const VIEW = {
  wide: { target: new THREE.Vector3(0.2, 0.4, -0.9), az: -0.45, polar: 0.95, dist: 23.5, fov: 38 },
  tall: { target: new THREE.Vector3(-3.6, 0.4, -0.2), az: -0.62, polar: 0.82, dist: 33, fov: 55 },
};
let homeView;
function frame(initial) {
  const a = innerWidth / innerHeight;
  const v = a < 0.9 ? VIEW.tall : VIEW.wide;
  const dist = a < 0.9 ? v.dist * Math.min(1.3, Math.max(0.85, 0.46 / a)) : v.dist * Math.max(0.85, Math.min(1.35, 1.6 / a));
  camera.fov = params.has('fov') ? +params.get('fov') : v.fov; camera.updateProjectionMatrix();
  if (params.has('az')) { v.az = +params.get('az'); v.polar = +params.get('pol'); v.target.set(+params.get('tx'), 0.4, +params.get('tz')); }
  homeView = { target: v.target.clone(), az: v.az, polar: v.polar, dist: params.has('dist') ? +params.get('dist') : dist };
  if (initial) {
    controls.target.copy(v.target);
    camera.position.copy(v.target).add(new THREE.Vector3().setFromSphericalCoords(homeView.dist, v.polar, v.az));
  }
}
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  frame(false);
  if (typeof applyOffset === 'function') { viewOff = offsetFor(activeKey); applyOffset(); }
}
frame(true); resize();
addEventListener('resize', resize);

// idle drift: after a pause the camera sways gently around the home angle
let lastInteract = -1e9;
controls.addEventListener('start', () => { lastInteract = performance.now(); controls.autoRotate = false; });
controls.addEventListener('end', () => { lastInteract = performance.now(); });

// ---------- HUD ----------
const $ = (id) => document.getElementById(id);
const PROFILE = [0.55, 0.9, 0.7, 0.35, 0.3, 0.45, 0.7, 1.0, 0.95, 0.75, 0.5]; // 12:00 → 22:00
let shownRolls = sim.rollsToday;
function updateHUD() {
  const { h, m } = hkNow();
  const clk = $('clock'); if (clk) clk.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  const target = (LIVE.stats && typeof LIVE.stats.rolls_today === 'number' && LIVE.source !== 'sim') ? LIVE.stats.rolls_today : sim.rollsToday;
  shownRolls += Math.sign(target - shownRolls) * Math.max(1, Math.round(Math.abs(target - shownRolls) / 8));
  if (Math.abs(target - shownRolls) < 1) shownRolls = target;
  const rl = $('rolls'); if (rl) rl.textContent = shownRolls.toLocaleString('en-HK');
  const st = LIVE.stats || {};
  const filled = typeof st.seats_filled === 'number' ? st.seats_filled : seats.filter(s => s.occupied).length;
  const se = $('seats'); if (se) se.textContent = filled;
}

// pops ride the sim clock so screen captures look the same as live
const popList = [];
function updatePops(dt) {
  for (let i = popList.length - 1; i >= 0; i--) {
    const p = popList[i]; p.t += dt;
    const s = project(p.w);
    const k = p.t / 1.2;
    p.el.style.transform = `translate(${s.x.toFixed(1)}px,${(s.y - 40 * k).toFixed(1)}px) translate(-50%,-100%)`;
    p.el.style.opacity = String(Math.max(0, 1 - k));
    if (k >= 1 || !s.vis) { p.el.remove(); popList.splice(i, 1); }
  }
}
function updateLabels() {
  for (const l of labels) {
    const s = project(l.pos);
    const on = s.vis && s.x > -30 && s.x < innerWidth + 30 && s.y > 40 && s.y < innerHeight;
    l.el.style.display = on ? '' : 'none';
    if (!on) continue;
    if (!l.w || l.wAt !== innerWidth) { l.w = l.el.offsetWidth; l.wAt = innerWidth; }
    const x = Math.max(l.w / 2 + 6, Math.min(innerWidth - l.w / 2 - 6, s.x));
    l.el.style.transform = `translate(${x.toFixed(1)}px,${(s.y - 14).toFixed(1)}px) translate(-50%,-100%)`;
  }
}


// ---------- opening hours: the room follows the real Hong Kong clock ----------
// open (12:00–21:30): the usual service. closing soon (21:30–22:00): no new walk-ins, the line outside
// disperses, last orders are served and seated guests finish and drift out. closed (22:00–12:00): nobody
// in the room, no chefs, counter cleared, room lights down; the neon stays on. Re-checked every 15 s.
const staff = () => [...sim.chefs, cook, host, djP];
const fades = [];
function fade(p, to, dur, delay = 0, done = null) {
  cancelFade(p);
  if (to > 0) p.group.visible = true;
  const swaps = [];   // per-figure copies of the shared materials, so only this figure fades
  p.group.traverse((o) => { if (o.isMesh && !rings.includes(o)) { const m = o.material.clone(); m.transparent = true; m.opacity = to > 0 ? 0 : o.material.opacity; swaps.push([o, o.material, m]); o.material = m; } });
  fades.push({ p, to, dur, t: -delay, swaps, done });
}
function endFade(f) { for (const [o, orig, m] of f.swaps) { o.material = orig; m.dispose(); } }
function cancelFade(p) { const i = fades.findIndex((f) => f.p === p); if (i >= 0) { endFade(fades[i]); fades.splice(i, 1); } }
function stepFades(dt) {
  for (let i = fades.length - 1; i >= 0; i--) {
    const f = fades[i]; f.t += dt;
    const k = Math.max(0, Math.min(1, f.t / f.dur)), a = f.to > 0 ? k : 1 - k;
    for (const [, orig, m] of f.swaps) m.opacity = orig.opacity * a;
    if (k >= 1) { fades.splice(i, 1); endFade(f); if (f.to <= 0) f.p.group.visible = false; if (f.done) f.done(); }
  }
}
function sendQueueAway(live) {
  for (const g of sim.queue.splice(0)) {
    g.state = 'leaving'; g.atSlot = false; g.setAnim(null);
    if (!live) { g._gone = true; g.remove(); continue; }
    sim.leaving.push(g); g.speed = rr(1.2, 1.5); g.arms[1].rotation.x = 0; g.head.rotation.x = 0;
    g.go([{ x: -9.45, z: g.z }, { x: -9.45, z: g.z - 9 }], () => fade(g, 0, 1.2, 0, () => drop(g)));
  }
}
function lastOrders() {   // after last order: whatever is already ordered is the last roll
  for (const g of sim.inside) {
    g.want = Math.max(g.ordered, 1);
    if (g.state === 'seated' && !g.holding && !g.plate.length && g.eaten >= g.want && g.leaveIn === undefined) g.leaveIn = rr(40, 240);
  }
}
function guestsOut(live) {
  sim.orders.length = 0;
  for (const f of flying.splice(0)) scene.remove(f.r);
  for (const g of sim.inside.slice()) {
    if (live && g.state === 'seated') {   // finish up, stand, walk out of the door
      for (const r of g.plate) scene.remove(r); g.plate = []; g.leaveIn = undefined; g.head.rotation.set(0, 0, 0);
      setTimeoutSim(() => { if (g.state === 'seated') leave(g); }, rr(0.2, 3.5));
    } else if (live) { g.path = []; g.done = null; sim.inside.splice(sim.inside.indexOf(g), 1); sim.leaving.push(g); if (g.seat) g.seat.reserved = false; fade(g, 0, 1.2, 0, () => drop(g)); }
    else drop(g);
  }
  if (!live) for (const g of sim.leaving.slice()) drop(g);
}
function staffOut(live) {
  for (const c of staff()) {
    if (sim.chefs.includes(c)) { c.path = []; c.done = null; c.setAnim(null); c.head.rotation.x = 0; }   // the DJ and the back cook keep their loops, unseen
    if (c.roll) { c.roll.parent && c.roll.parent.remove(c.roll); c.roll = null; }
    c.order = null; if (sim.chefs.includes(c)) c.state = 'off';
    const home = () => { if (c.home) { c.place(c.home.x, c.home.z); c.heading = c.targetHeading = Math.PI; c.group.rotation.y = Math.PI; } };
    if (live) fade(c, 0, 2.5, 4, home); else { cancelFade(c); c.group.visible = false; home(); }
  }
}
function staffIn(live) {
  for (const c of staff()) {
    if (sim.chefs.includes(c)) { c.state = 'idle'; c.path = []; c.done = null; c.setAnim(null); }
    if (live) fade(c, 1, 1.5); else { cancelFade(c); c.group.visible = true; }
  }
}
function applyShop(st, live) {
  SHOP.state = st; document.body.dataset.shop = st;
  if (st !== 'open') sendQueueAway(live);
  if (st === 'closing') lastOrders();
  if (st === 'closed') { guestsOut(live); staffOut(live); SHOP.closedAt = sim.t; }
  else { if (!sim.chefs[0].group.visible || sim.chefs[0].state === 'off') staffIn(live); for (const m of settingMeshes) m.visible = true; }
}
function stepShop(dt) {
  const tk = SHOP.state === 'closed' ? 1 : 0;
  if (SHOP.k !== tk) {
    SHOP.k += Math.sign(tk - SHOP.k) * Math.min(Math.abs(tk - SHOP.k), dt / 5);
    for (const r of roomLights) r.l.intensity = r.base * (1 - 0.72 * SHOP.k);
  }
  stepFades(dt);
  if (SHOP.state !== 'closed') return;
  // guests heading home fade once they are out on the pavement
  for (const g of sim.leaving) if (!g._fading && g.x < -9.0) { g._fading = true; fade(g, 0, 1.4, 0, () => drop(g)); }
  if (!sim.inside.length) for (const m of settingMeshes) if (m.visible) m.visible = false;
  // nobody lingers after hours
  if (sim.t - SHOP.closedAt > 40) for (const g of [...sim.queue, ...sim.inside, ...sim.leaving]) drop(g);
}
function checkShop() { const st = hkStatus(new Date()).state; if (st !== SHOP.state) applyShop(st, true); }
setInterval(checkShop, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkShop(); });
const shopFigures = () => {
  const vis = (p) => !!p.group.parent && p.group.visible;
  return { guests: [...sim.queue, ...sim.inside, ...sim.leaving].filter(vis).length, staff: staff().filter(vis).length };
};

// ---------- start: warm the scene so it opens mid-service ----------
applyShop(SHOP.state, false);
if (SHOP.state === 'open') {
  for (let i = 0; i < 8; i++) spawnArrival(true);
  const order26 = seats.map((s, i) => i).sort(() => rand() - 0.5).slice(0, 21);
  for (const i of order26) { const g = new Person(); seatGuest(g, seats[i], true); }
} else if (SHOP.state === 'closing') {   // a thinning counter, nobody waiting outside
  const { h, m } = hkNow(), left = Math.max(0, 22 * 60 - (h * 60 + m));
  const n = Math.round(5 + 10 * Math.min(1, left / 30));
  const some = seats.map((s, i) => i).sort(() => rand() - 0.5).slice(0, n);
  for (const i of some) { const g = new Person(); seatGuest(g, seats[i], true); }
  lastOrders();
}
for (let i = 0; i < 25 * 30; i++) stepSim(1 / 30);
updateHUD();
shownRolls = sim.rollsToday;

let last = performance.now(), hudT = 0, clockT = 0;
controls.addEventListener('start', () => { fly.on = false; });
function updateHotspots() {
  const hide = document.body.classList.contains('panel-open') || mode !== 'room';
  const placed = [];
  for (const h of hotEls) {
    const a = typeof h.h.anchor === 'function' ? h.h.anchor() : h.h.anchor;
    const s = project(a);
    let on = !hide && s.vis && s.x > 20 && s.x < innerWidth - 20 && s.y > 70 && s.y < innerHeight - 70;
    if (on) {
      if (!h.w || h.wAt !== innerWidth) { h.w = h.el.offsetWidth || 120; h.wAt = innerWidth; }
      // pin's box: the dot sits on the anchor, the label runs to the right
      let x = Math.min(s.x, innerWidth - h.w + 16), y = s.y;
      // nudge apart from pins already placed so two never overlap (thumbs need clear targets)
      for (let pass = 0; pass < 3; pass++) {
        let moved = false;
        for (const q of placed) {
          const ox = Math.min(x - 22 + h.w, q.x - 22 + q.w) - Math.max(x - 22, q.x - 22);
          const oy = 48 - Math.abs(y - q.y);
          if (ox > 0 && oy > 0) { y += (y >= q.y ? oy : -oy); moved = true; }
        }
        if (!moved) break;
      }
      placed.push({ x, y, w: h.w });
      h.x = x; h.y = y;
    }
    if (h.on !== on) { h.el.classList.toggle('off', !on); h.el.tabIndex = on ? 0 : -1; h.on = on; }
    if (on) h.el.style.transform = `translate(${h.x.toFixed(1)}px,${h.y.toFixed(1)}px)`;
  }
}
function render(dt) {
  stepSim(dt);
  clockT += dt;
  wallGlow(window.__glowT != null ? window.__glowT : clockT);
  stepPhone(dt);
  for (const r of rings) { r.visible = mode !== 'walk'; const k = (Math.sin(clockT * 2.4 + r.userData.ph) + 1) / 2; r.material.opacity = 0.25 + 0.55 * k; r.scale.setScalar(r.userData.s * (0.9 + 0.2 * k)); }
  // idle sway (only on the home view)
  if (!CAPTURE && mode === 'room' && !activeKey && !fly.on && performance.now() - lastInteract > 9000) {
    const az = controls.getAzimuthalAngle();
    if (!controls.autoRotate) { controls.autoRotate = true; controls.autoRotateSpeed = 0.35; }
    if (az > homeView.az + 0.35) controls.autoRotateSpeed = 0.35;
    if (az < homeView.az - 0.35) controls.autoRotateSpeed = -0.35;
  } else if (activeKey && controls.autoRotate) controls.autoRotate = false;
  if (mode === 'walk') stepWalk(dt); else if (fly.on) stepFly(dt); else controls.update(dt);
  if (mode === 'street' && !fly.on) { const t = controls.target; const r = Math.hypot(t.x, t.z); if (r > 300) { t.x *= 300 / r; t.z *= 300 / r; } t.y = Math.max(0, Math.min(30, t.y)); }
  if (Math.abs(DN.k - DN.target) > 0.002) { DN.k += Math.sign(DN.target - DN.k) * Math.min(Math.abs(DN.target - DN.k), dt / 1.1); applyDN(DN.k); }
  const camD = camera.position.distanceTo(controls.target);
  if (mode === 'walk') city.setCut(0, false, 0); else if (mode === 'room') city.setCut(camD > 60 ? 10 : 0, true, camD > 60 ? 0 : 28); else city.setCut(Math.min(40, 12 + camD * 0.06), true, 0, camD > 90 ? camD * 0.42 : 0);
  city.update(dt, camera, controls.target, mode);
  renderer.render(scene, camera);
  updateLabels(); updatePops(dt); updateHotspots(); updateCityLabels(); updateCompass();
  hudT += dt; if (hudT > 0.25) { hudT = 0; updateHUD(); }
}
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  render(dt);
  requestAnimationFrame(loop);
}
window.__roru = { ready: true, hots: () => proxies.map((o) => o.userData.hot), buzz: () => { PHONE.buzzAt = 0; }, shop: { get state() { return SHOP.state; }, get k() { return SHOP.k; }, figures: shopFigures, check: checkShop }, step: (sec) => { for (let i = 0; i < sec * 30; i++) stepSim(1 / 30); }, wallGlow, sim, LIVE, camera, controls, renderer, homeView: () => homeView, flyTo, setMode, city, WALK, DN, applyDN, get mode() { return mode; }, get activeKey() { return activeKey; } };
// deep links: …/#street and …/#walk
{ const h = location.hash.slice(1); if (h === 'street' || h === 'walk') setTimeout(() => setMode(h, { quiet: true }), 80); }
addEventListener('hashchange', () => { const h = location.hash.slice(1); if ((h === 'street' || h === 'walk') && h !== mode) setMode(h, { quiet: true }); });
window.__tick = (ms) => { const n = Math.max(1, Math.round(ms / (1000 / 60))); for (let i = 0; i < n - 1; i++) { stepSim(1 / 60); if (mode === 'walk') stepWalk(1 / 60); city.update(1 / 60, camera, controls.target, mode); if (Math.abs(DN.k - DN.target) > 0.002) { DN.k += Math.sign(DN.target - DN.k) * Math.min(Math.abs(DN.target - DN.k), (1 / 60) / 1.1); applyDN(DN.k); } } if (fly.on) fly.t += (n - 1) / 60 / fly.dur; render(1 / 60); updateHUD(); };
window.__cam = (az, pol, dist, tx, ty, tz) => { controls.target.set(tx, ty, tz); camera.position.copy(controls.target).add(new THREE.Vector3().setFromSphericalCoords(dist, pol, az)); camera.lookAt(controls.target); };
window.__orbit = (daz, dpol, ddist) => { const sp = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)); sp.theta += daz || 0; sp.phi += dpol || 0; sp.radius *= (ddist || 1); camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sp)); controls.update(); };
if (!CAPTURE) requestAnimationFrame((n) => { last = n; loop(n); });
else render(1 / 60);
updateSourceTag();
