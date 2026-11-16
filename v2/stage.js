/* SAGA · rendered-car stage (replaces the real-time three.js car).
   Two pieces, both driven by Cycles renders in assets/render/:
   - unveil(el, opts): the expo reveal. Separate light layers (DRL, LED livery, fully lit) are stacked with
     additive blending and choreographed in CSS (ds.css .stg): dark → DRL sweep → LEDs run → top light flickers on.
   - spin(el, opts): a photo-real 360°, 36 frames, drawn to a canvas; drag with inertia, idle turntable.
   Flutter equivalent: Stack + AnimatedOpacity/ShaderMask for the layers; GestureDetector + precached frames for the spin. */
(function () {
  const R = "assets/render/";
  const cache = new Map();
  const load = src => {
    if (!cache.has(src)) cache.set(src, new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(() => res(i)); i.onerror = rej; i.src = src; }));
    return cache.get(src);
  };
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- dust motes in the top light: tiny, slow, only inside the cone ---------- */
  function motes(canvas, cone) {
    const g = canvas.getContext("2d"); let W = 0, H = 0, raf = 0;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const P = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: .4 + Math.random() * 1.3, a: .08 + Math.random() * .35, vx: (Math.random() - .5) * .006, vy: -.004 - Math.random() * .01, t: Math.random() * 6 }));
    const size = () => { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; };
    size();
    let last = performance.now();
    const tick = now => {
      raf = requestAnimationFrame(tick);
      if (!canvas.isConnected) { cancelAnimationFrame(raf); return; }
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (canvas.clientWidth !== W) size();
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      for (const p of P) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt;
        if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
        const dx = (p.x - cone.x) / cone.w, dy = (p.y - cone.y) / cone.h, inCone = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
        if (inCone <= 0) continue;
        g.globalAlpha = p.a * inCone * (.6 + .4 * Math.sin(p.t * 1.7));
        g.fillStyle = "#fff"; g.beginPath(); g.arc(p.x * W, p.y * H, p.r, 0, 6.283); g.fill();
      }
    };
    raf = requestAnimationFrame(tick);
  }

  /* ---------- unveil ---------- */
  const SETS = {
    p: { drl: "unveil-p-1-drl", led: "unveil-p-2-led", lit: "unveil-p-4-lit", top: "unveil-p-3-top", nose: [27, 49], cone: { x: .55, y: .32, w: .55, h: .45 } },
    l: { drl: "unveil-l-1-drl", led: "unveil-l-2-led", lit: "unveil-l-4-lit", nose: [33, 47], cone: { x: .5, y: .3, w: .4, h: .5 } }
  };
  function unveil(el, o = {}) {
    const s = SETS[o.set || "p"];
    el.classList.add("stg");
    const nose = o.nose || s.nose; el.style.setProperty("--nx", nose[0] + "%"); el.style.setProperty("--ny", nose[1] + "%");
    el.innerHTML = `<div class="cam"><img class="l-top" alt="" style="opacity:0"><img class="l-add l-drl" alt=""><img class="l-add l-led" alt=""><img class="l-lit" alt="SAGA Luxe"></div><canvas class="motes"></canvas>`;
    const [tp, di, li, ti] = el.querySelectorAll("img");
    let hasTop = false;
    const api = {
      el,
      ready: Promise.all([load(R + s.drl + ".webp"), load(R + s.led + ".webp"), load(R + s.lit + ".webp")]).then(() => { di.src = R + s.drl + ".webp"; li.src = R + s.led + ".webp"; ti.src = R + s.lit + ".webp"; }),
      play() {
        [tp, di, li, ti].forEach(i => { i.style.opacity = i === tp ? 0 : ""; i.style.transition = ""; });
        if (reduced() || o.instant) { el.classList.add("lit"); return api; }
        el.classList.remove("lit", "play"); void el.offsetWidth; el.classList.add("play");
        clearTimeout(api._t); api._t = setTimeout(() => { el.classList.add("lit"); el.classList.remove("play"); o.onLit && o.onLit(); }, 4600);
        return api;
      },
      /* light switches for The car page:
         lamps + showroom = the full render; lamps only = DRL + LED layers; showroom only = top-light layer; neither = dark stage */
      set(lights, top) {
        el.classList.remove("play", "lit"); clearTimeout(api._t);
        const showTop = top && !lights && hasTop;
        [tp, di, li, ti].forEach(i => (i.style.transition = "opacity .9s cubic-bezier(.4,0,.2,1)"));
        di.style.setProperty("--drl", "120%"); li.style.setProperty("--led", "110%");
        di.style.opacity = lights && !top ? 1 : 0; li.style.opacity = lights && !top ? 1 : 0;
        ti.style.opacity = (lights && top) || (top && !hasTop) ? 1 : 0;
        tp.style.opacity = showTop ? 1 : 0;
      }
    };
    if (s.top) load(R + s.top + ".webp").then(() => { tp.src = R + s.top + ".webp"; hasTop = true; }).catch(() => {});
    motes(el.querySelector(".motes"), s.cone);
    if (o.autoplay !== false) api.ready.then(() => api.play());
    el.__stage = api;
    return api;
  }

  /* ---------- 360 spin ---------- */
  function spin(el, o = {}) {
    const n = o.n || 36, set = o.set || "spin", fit = o.fit || "cover", zoom = o.zoom || 1, oy = o.oy || 0;
    el.classList.add("spin");
    el.innerHTML = `<canvas></canvas><span class="spin-load"><i></i></span>${o.hint === false ? "" : `<span class="spin-hint">${o.hintText || "Drag to turn"}</span>`}`;
    const cv = el.querySelector("canvas"), g = cv.getContext("2d");
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    const frames = new Array(n); let got = 0;
    let pos = o.start || 0, vel = 0, drag = false, lx = 0, idle = o.idle !== false, lastTouch = 0, drawn = -1, raf = 0;
    const src = i => `${R}${set}-${String(i).padStart(2, "0")}.webp`;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const draw = () => {
      const i = ((Math.round(pos) % n) + n) % n;
      let img = frames[i];
      if (!img) { for (let k = 1; k < n && !img; k++) img = frames[(i + k) % n] || frames[(i - k + n) % n]; }
      if (!img) return;
      const W = el.clientWidth, H = el.clientHeight;
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); drawn = -1; }
      if (drawn === i && img === frames[i]) return;
      const ir = img.width / img.height, er = W / H;
      let w, h; if ((fit === "cover") === (ir > er)) { h = H; w = H * ir; } else { w = W; h = W / ir; }
      w *= zoom; h *= zoom;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      g.drawImage(img, (W - w) / 2, (H - h) / 2 + oy * H, w, h);
      // feather the photo into the page so the stage has no visible edges
      const fe = o.feather == null ? .16 : o.feather, bg = o.bg || "#000";
      if (fe) {
        const x = (W - w) / 2, y = (H - h) / 2 + oy * H, clear = bg === "#000" ? "rgba(0,0,0,0)" : "rgba(242,243,247,0)";
        const lin = (x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, bg); gr.addColorStop(1, clear); return gr; };
        g.fillStyle = bg; g.fillRect(0, 0, W, Math.max(0, y)); g.fillRect(0, y + h, W, Math.max(0, H - y - h)); g.fillRect(0, 0, Math.max(0, x), H); g.fillRect(x + w, 0, Math.max(0, W - x - w), H);
        g.fillStyle = lin(x, 0, x + w * fe, 0); g.fillRect(x, y, w * fe, h);
        g.fillStyle = lin(x + w, 0, x + w - w * fe, 0); g.fillRect(x + w - w * fe, y, w * fe, h);
        g.fillStyle = lin(0, y, 0, y + h * fe); g.fillRect(x, y, w, h * fe);
        g.fillStyle = lin(0, y + h, 0, y + h - h * fe * 1.4); g.fillRect(x, y + h - h * fe * 1.4, w, h * fe * 1.4);
      }
      drawn = frames[i] ? i : -1;
    };
    // load the first frame now, then the rest outward from it so the nearest angles arrive first
    const order = [0]; for (let k = 1; k <= n / 2; k++) { order.push(k % n); if (n - k !== k) order.push((n - k) % n); }
    const startIdx = pos;
    let chain = Promise.resolve();
    order.forEach(k => { const i = (startIdx + k) % n; chain = chain.then(() => load(src(i)).then(img => { frames[i] = img; got++; el.style.setProperty("--p", Math.round(got / n * 100) + "%"); if (got === n) el.classList.add("ready"); draw(); }).catch(() => {})); });
    let last = performance.now();
    const tick = now => {
      raf = requestAnimationFrame(tick);
      if (!el.isConnected) { cancelAnimationFrame(raf); return; }
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!drag) {
        if (Math.abs(vel) > .02) { pos += vel; vel *= Math.pow(.05, dt); }
        else if (api.target != null) { const d = api.target - pos; if (Math.abs(d) < .05) { pos = api.target; api.target = null; } else pos += d * Math.min(1, dt * (o.ease || 3.2)); }
        else if (idle && got === n && now - lastTouch > 3500) pos += dt * (o.speed || 2.2);
      }
      draw();
    };
    raf = requestAnimationFrame(tick);
    const ppf = () => Math.max(6, el.clientWidth / 40); // pixels per frame
    el.addEventListener("pointerdown", e => { drag = true; lx = e.clientX; vel = 0; api.target = null; el.setPointerCapture(e.pointerId); el.classList.add("touched"); });
    el.addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - lx; lx = e.clientX; const df = -dx / ppf(); pos += df; vel = df; lastTouch = performance.now(); });
    const up = () => { drag = false; lastTouch = performance.now(); };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    const api = { el, target: null, to(i) { api.target = i; return api; }, get pos() { return pos; }, set pos(v) { pos = v; }, stopIdle() { idle = false; } };
    el.__spin = api;
    return api;
  }

  window.SagaStage = { unveil, spin, load, R, src: name => R + name + ".webp" };
})();
