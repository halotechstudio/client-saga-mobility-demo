/* SAGA · interactive 3D car (rider app only). three.js from a CDN, one GLB (about 98k triangles, 1K textures).
   Interactions: drag to turn (with inertia), idle turntable, tap the car for lights, paint colours, view presets, pinch or wheel zoom,
   hotspot tags that appear only when that part of the car faces you. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const URL_GLB = new URL("assets/car.glb", import.meta.url).href;
let gltfP = null;
const loadGLB = () => (gltfP ||= new Promise((res, rej) => new GLTFLoader().load(URL_GLB, res, undefined, rej)));
let paintHex = "#0A0A0C", paintK = "matte", lightsOn = true;
const PAINT = { matte: { r: 0.58, cc: 0, m: 0 }, satin: { r: 0.36, cc: 0.4, m: 0.5 }, gloss: { r: 0.1, cc: 1, m: 0.6 } };

const VIEWS = { three: { yaw: 0.7, pitch: 0.16, dist: 6.5 }, side: { yaw: 0, pitch: 0.06, dist: 7.6 }, front: { yaw: Math.PI / 2, pitch: 0.1, dist: 7.2 }, rear: { yaw: -Math.PI / 2, pitch: 0.1, dist: 7.2 }, top: { yaw: 0.2, pitch: 1.25, dist: 8.2 } };
const ease = t => 1 - Math.pow(1 - t, 3);

function mount(el, opts = {}) {
  if (!el || el.__c3) return el && el.__c3;
  const full = opts.mode === "full";
  const W = () => el.clientWidth || 360, H = () => el.clientHeight || 220;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(W(), H());
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cv = renderer.domElement; cv.className = "c3-canvas"; el.appendChild(cv);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(full ? 30 : 26, W() / H(), 0.1, 100);
  const accent = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#092EC9");
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.PointLight(accent, 60, 14); rim.position.set(-4, 2.2, -3.5); scene.add(rim);
  const rim2 = new THREE.PointLight(accent, 30, 12); rim2.position.set(4, 1.5, -3); scene.add(rim2);
  const turn = new THREE.Group(); scene.add(turn);
  // contact shadow
  const sc = document.createElement("canvas"); sc.width = sc.height = 128; const g = sc.getContext("2d"); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, "rgba(0,0,0,.75)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, opacity: 0.8 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.005; scene.add(shadow);

  const K = opts.distK || 1, v0 = VIEWS[opts.start] || VIEWS.three;
  const st = { yaw: 1.9, pitch: 0.16, dist: 9 * K, ty: v0.yaw, tp: v0.pitch, td: v0.dist * K, vel: 0, drag: false, last: performance.now(), idle: true, intro: 0, spin: 0 };
  const api = { el, wheels: [], head: [], tail: [], paintMats: [], hot: [], dead: false };
  const tags = [];
  const loading = document.createElement("div"); loading.className = "c3-load"; el.appendChild(loading);

  loadGLB().then(gl => {
    if (api.dead) return;
    const car = gl.scene.clone(true);
    const box = new THREE.Box3().setFromObject(car), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const s = 4.2 / size.x; car.scale.setScalar(s); car.position.set(-c.x * s, -box.min.y * s, -c.z * s);
    const pivot = new THREE.Group(); pivot.add(car); turn.add(pivot); api.car = car;
    const h = size.y * s, w = size.z * s, L = 4.2;
    car.traverse(o => {
      if (!o.isMesh) return;
      const n = (o.name || "").toLowerCase(), mn = (o.material.name || "").toLowerCase().trim();
      if (/wheel/.test(n) && !/brake/.test(n)) api.wheels.push(o);
      if (mn === "car paint" || mn === "plastic") { o.material = o.material.clone(); o.material.map = null; o.material.envMapIntensity = 1.7; api.paintMats.push(o.material); }
      if (mn === "head light") { o.material = o.material.clone(); api.head.push(o.material); }
      if (mn === "tail light") { o.material = o.material.clone(); api.tail.push(o.material); }
    });
    api.paint(paintHex, true); api.lights(lightsOn, true);
    // DRL glow: soft additive flares at the lamp signature, visible from the front
    const gc = document.createElement("canvas"); gc.width = gc.height = 64; const gg = gc.getContext("2d"); const gz = gg.createRadialGradient(32, 32, 0, 32, 32, 32); gz.addColorStop(0, "rgba(255,255,255,1)"); gz.addColorStop(.25, "rgba(200,220,255,.6)"); gz.addColorStop(1, "rgba(120,160,255,0)"); gg.fillStyle = gz; gg.fillRect(0, 0, 64, 64);
    const gtex = new THREE.CanvasTexture(gc);
    api.glow = [];
    for (const z of [-1, 1]) for (const dy of [0, 1]) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.0 })); sp.scale.set(0.55, 0.32, 1); sp.position.set(L / 2 * 0.99, (dy ? 0.60 : 0.55) * h, z * w / 2 * 0.62); pivot.add(sp); api.glow.push(sp); }
    // hotspots in pivot space
    const P = (fx, fy, fz) => new THREE.Vector3(fx * L / 2, fy * h, fz * w / 2);
    (opts.hot || []).forEach(hs => {
      const d = document.createElement("button"); d.className = "c3-tag"; d.innerHTML = `<i></i><span>${hs.label}</span>`; d.dataset.id = hs.id; el.appendChild(d);
      tags.push({ d, p: P(...hs.at), n: new THREE.Vector3(...hs.n).normalize() });
    });
    loading.remove(); el.classList.add("c3-ready");
    st.intro = 1;
    if (opts.onReady) opts.onReady(api);
  }).catch(() => { loading.remove(); el.classList.add("c3-failed"); });

  api.paint = (hex, instant, kind) => { paintHex = hex; if (kind) paintK = kind; const pk = PAINT[paintK] || PAINT.matte; const col = new THREE.Color(hex); api.paintMats.forEach(m => { m.userData.to = col; if (instant) m.color.copy(col); m.roughness = pk.r; m.metalness = pk.m; m.envMapIntensity = pk.cc ? 1.6 : 0.22; if ("specularIntensity" in m) m.specularIntensity = pk.cc ? 1 : 0.35; if ("clearcoat" in m) { m.clearcoat = pk.cc; m.clearcoatRoughness = pk.cc ? 0.08 : 0.5; } }); };
  api.lights = (on, instant) => { lightsOn = on; const f = (m, c) => { m.emissive = new THREE.Color(c); m.userData.ei = on ? 3.2 : 0; if (instant) m.emissiveIntensity = m.userData.ei; }; api.head.forEach(m => f(m, 0xffffff)); api.tail.forEach(m => f(m, 0xff2a1f)); rim.intensity = on ? 90 : 60; (api.glow || []).forEach(g => (g.userData.to = on ? 0.9 : 0)); return on; };
  api.view = k => { const v = VIEWS[k] || VIEWS.three; st.idle = false; st.last = performance.now(); st.ty = v.yaw; st.tp = v.pitch; st.td = v.dist * K; };
  api.zoom = d => { st.td = Math.min(11 * K, Math.max(4.6 * K, st.td + d)); };
  api.spin = () => { st.spin = 1; };
  api.toggleLights = () => api.lights(!lightsOn);

  // interaction
  let sx = 0, sy = 0, t0 = 0, moved = 0, px = 0;
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; st.drag = true; st.idle = false; sx = px = e.clientX; sy = e.clientY; t0 = performance.now(); moved = 0; st.vel = 0; el.setPointerCapture(e.pointerId); el.classList.add("c3-drag"); el.classList.add("c3-touched"); });
  el.addEventListener("pointermove", e => { if (!st.drag) return; const dx = e.clientX - px, dy = e.clientY - sy; px = e.clientX; moved += Math.abs(dx); st.ty += dx * 0.011; st.yaw = st.ty; st.vel = dx * 0.011; if (full) { st.tp = Math.min(1.3, Math.max(0.03, st.tp - (e.clientY - sy) * 0.0045)); sy = e.clientY; } });
  const up = e => { if (!st.drag) return; st.drag = false; st.last = performance.now(); el.classList.remove("c3-drag"); if (moved < 6 && performance.now() - t0 < 320) { api.toggleLights(); api.spin(); if (opts.onTap) opts.onTap(lightsOn); } };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  el.addEventListener("wheel", e => { if (!full) return; e.preventDefault(); api.zoom(e.deltaY * 0.004); }, { passive: false });
  el.addEventListener("click", e => { const t = e.target.closest(".c3-tag"); if (t && opts.onHot) opts.onHot(t.dataset.id); });

  const v3 = new THREE.Vector3(), tgt = new THREE.Vector3(0, 0.62, 0);
  let raf = 0, prev = performance.now();
  const loop = now => {
    raf = requestAnimationFrame(loop);
    if (!el.isConnected) { api.destroy(); return; }
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    if (st.intro) { // fly in from behind to the three-quarter view
      st.yaw += (st.ty - st.yaw) * Math.min(1, dt * 2.6); st.dist += (st.td - st.dist) * Math.min(1, dt * 2.6);
      st.pitch += (st.tp - st.pitch) * Math.min(1, dt * 3);
      if (Math.abs(st.ty - st.yaw) < 0.01 && st.intro === 1) { st.intro = 2; api.lights(true); }
    } else { st.dist += (st.td - st.dist) * Math.min(1, dt * 4); st.pitch += (st.tp - st.pitch) * Math.min(1, dt * 4); }
    if (st.drag) { /* yaw follows finger */ st.yaw = st.ty; }
    else if (st.intro !== 1) {
      if (Math.abs(st.vel) > 0.0003) { st.ty += st.vel; st.vel *= 0.94; st.yaw = st.ty; }
      else { st.yaw += (st.ty - st.yaw) * Math.min(1, dt * 5); }
      if (!st.idle && now - st.last > 3200 && opts.auto !== false) st.idle = true;
      if (st.idle) { st.ty += dt * 0.22; st.yaw = st.ty; }
    }
    if (st.spin > 0) { api.wheels.forEach(w => (w.rotation.z -= ease(st.spin) * dt * 14)); st.spin = Math.max(0, st.spin - dt * 0.7); }
    api.paintMats.forEach(m => { if (m.userData.to) m.color.lerp(m.userData.to, Math.min(1, dt * 6)); });
    (api.glow || []).forEach(g => { const f = Math.max(0, st.yaw - Math.PI * 2 * Math.round(st.yaw / (Math.PI * 2))); const front = Math.cos(st.yaw - Math.PI / 2 + 0.2); const t = (g.userData.to || 0) * Math.max(0, front) * 0.9; g.material.opacity += (t - g.material.opacity) * Math.min(1, dt * 8); });
    [...api.head, ...api.tail].forEach(m => { m.emissiveIntensity += ((m.userData.ei || 0) - m.emissiveIntensity) * Math.min(1, dt * 8); });
    cam.position.set(Math.sin(st.yaw) * Math.cos(st.pitch) * st.dist, tgt.y + Math.sin(st.pitch) * st.dist, Math.cos(st.yaw) * Math.cos(st.pitch) * st.dist);
    cam.lookAt(tgt);
    shadow.material.opacity = 0.55 + 0.3 * Math.cos(st.pitch);
    renderer.render(scene, cam);
    tags.forEach(t => { v3.copy(t.p).applyMatrix4(turn.matrixWorld).project(cam); const camDir = cam.position.clone().normalize(); const facing = t.n.dot(camDir); const show = facing > 0.25 && v3.z < 1; t.d.classList.toggle("on", show); if (show) t.d.style.transform = `translate(${(v3.x * 0.5 + 0.5) * W()}px,${(-v3.y * 0.5 + 0.5) * H()}px)`; });
  };
  raf = requestAnimationFrame(loop);
  const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix(); }); ro.observe(el);
  api.destroy = () => { if (api.dead) return; api.dead = true; cancelAnimationFrame(raf); ro.disconnect(); try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {} };
  el.__c3 = api;
  return api;
}
window.SagaCar3D = { mount, VIEWS };
window.dispatchEvent(new Event("saga-car3d"));
