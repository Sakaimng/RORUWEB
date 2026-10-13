// The exploding hand roll from the v2 site, as a small viewer inside the "How it's rolled" panel.
import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.module.js';

const LINES = [
  'Built to order, then handed straight over the counter.',
  'Crisp nori, the shell that holds it all.',
  'Warm, seasoned rice.',
  'The filling, with a sauce tuned to the fish.',
  'Garlic crumb and toppings to finish.',
];
const OUT = {
  nori: { p: [0, -1.05, 0.15], r: [0.35, 0, 0.12] },
  rice: { p: [0, -0.2, 0.05], r: [0.12, 0.5, 0] },
  crab: { p: [0, 0.55, -0.05], r: [-0.12, -0.6, 0.08] },
  top: { p: [0, 1.25, 0], r: [-0.2, 0.9, -0.1] },
};
const ORDER = ['nori', 'rice', 'crab', 'top'];
let gltfPromise = null;
const smooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

export function mount(root) {
  const canvas = root.querySelector('#rollCanvas');
  if (!canvas || canvas.dataset.on) return;
  canvas.dataset.on = '1';
  const loading = root.querySelector('#rollLoading');
  const lineEl = root.querySelector('#layerLine');
  const btns = [...root.querySelectorAll('[data-layer]')];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0xc9a37e, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2.5, 5, 4); scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
  const tilt = new THREE.Group(); scene.add(tilt); const spin = new THREE.Group(); tilt.add(spin);
  tilt.rotation.x = 0.3;
  let pieces = null, step = 0, auto = true, shown = 0, alive = true, last = performance.now(), cycle = 0, rot = 0;

  if (!gltfPromise) { const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder); gltfPromise = l.loadAsync('models/roll.glb'); }
  gltfPromise.then((gltf) => {
    if (!alive) return;
    const main = gltf.scene.clone(true);
    const holder = new THREE.Group(); holder.add(main);
    const box = new THREE.Box3().setFromObject(main);
    const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const k = 2.0 / Math.max(size.x, size.z); main.scale.setScalar(k); main.position.copy(ctr).multiplyScalar(-k);
    main.traverse((m) => { if (!m.isMesh) return; const mats = Array.isArray(m.material) ? m.material : [m.material]; mats.forEach((mt) => { mt.side = THREE.DoubleSide; if ('metalness' in mt) { mt.metalness = 0; mt.roughness = 0.62; } }); });
    spin.add(holder);
    pieces = {};
    for (const n of ORDER) {
      const o = main.getObjectByName(n); if (!o) continue;
      let div = 1; for (let p = o.parent; p && p !== holder; p = p.parent) div *= p.scale.x;
      pieces[n] = { obj: o, base: o.position.clone(), rot: o.rotation.clone(), div };
    }
    if (loading) loading.remove();
  }).catch(() => { if (loading) loading.textContent = 'Couldn’t load the 3D roll.'; });

  function setStep(n, user) {
    step = n; if (user) auto = false;
    btns.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.layer === n)));
    if (lineEl) lineEl.textContent = LINES[n];
  }
  btns.forEach((b) => b.addEventListener('click', () => setStep(+b.dataset.layer === step ? 0 : +b.dataset.layer, true)));
  setStep(0);

  const tmp = new THREE.Vector3();
  function resize() {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 220;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function tick(now) {
    if (!alive) return;
    if (!canvas.isConnected) { alive = false; renderer.dispose(); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (auto) { cycle += dt; if (cycle > 1.9) { cycle = 0; setStep((step + 1) % 5); } }
    shown += (step - shown) * Math.min(1, dt * 5);
    resize();
    if (pieces) {
      ORDER.forEach((n, i) => {
        const pc = pieces[n]; if (!pc) return;
        const t = smooth(shown - i);
        const o = OUT[n];
        tmp.set(o.p[0] * t, o.p[1] * t, o.p[2] * t).divideScalar(pc.div);
        pc.obj.position.copy(pc.base).add(tmp);
        pc.obj.rotation.set(pc.rot.x + o.r[0] * t, pc.rot.y + o.r[1] * t, pc.rot.z + o.r[2] * t);
      });
    }
    rot += dt * 0.4; spin.rotation.y = rot;
    const ex = Math.min(1, shown / 4);
    const dist = 6.2 + ex * 2.6;
    camera.position.set(0, 0.6 + ex * 0.4, dist); camera.lookAt(0, ex * 0.1, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.addEventListener('roru:closed', () => { alive = false; renderer.dispose(); }, { once: true });
}
