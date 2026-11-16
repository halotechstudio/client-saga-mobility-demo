/* SAGA · rendered-car stage (Cycles renders in assets/render/). Built for 60 fps:
   - unveil(el, opts): the expo reveal. Light layers (DRL, LED livery, fully lit) are stacked with additive blending.
     The DRL sweep and LED run are "shutters" (black covers with a soft hole) that only animate transform and opacity,
     so the GPU composites every frame; nothing repaints.
   - spin(el, opts): a photo-real 360°. Frames are pre-decoded to ImageBitmaps and drawn to a canvas with a crossfade
     between neighbouring angles, so turning glides instead of stepping. Drag with inertia; slow idle turntable.
   Flutter: Stack + BlendMode.plus + AnimatedBuilder transforms for the unveil; precacheImage + CustomPainter for the spin. */
(function () {
  const R = "assets/render/";
  const cache = new Map();
  const load = src => {
    if (!cache.has(src)) cache.set(src, new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(() => res(i)); i.onerror = rej; i.src = src; }));
    return cache.get(src);
  };
  const bitmap = src => load(src).then(img => (window.createImageBitmap ? createImageBitmap(img).catch(() => img) : img));
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* dust in the top light: few, slow, drawn only while the stage is on screen */
  function motes(canvas, cone) {
    const g = canvas.getContext("2d"); let W = 0, H = 0, raf = 0, last = performance.now();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const P = Array.from({ length: 34 }, () => ({ x: Math.random(), y: Math.random(), r: .5 + Math.random() * 1.2, a: .1 + Math.random() * .3, vx: (Math.random() - .5) * .005, vy: -.004 - Math.random() * .008, t: Math.random() * 6 }));
    const tick = now => {
      raf = requestAnimationFrame(tick);
      if (!canvas.isConnected) { cancelAnimationFrame(raf); return; }
      if (document.hidden) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (canvas.clientWidth !== W) { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.fillStyle = "#fff";
      for (const p of P) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt; if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
        const dx = (p.x - cone.x) / cone.w, dy = (p.y - cone.y) / cone.h, k = 1 - Math.sqrt(dx * dx + dy * dy);
        if (k <= 0) continue;
        g.globalAlpha = p.a * k * (.6 + .4 * Math.sin(p.t * 1.7)); g.beginPath(); g.arc(p.x * W, p.y * H, p.r, 0, 6.283); g.fill();
      }
    };
    raf = requestAnimationFrame(tick);
  }

  /* ---------- unveil ---------- */
  const SETS = {
    p: { drl: "unveil-p-1-drl", led: "unveil-p-2-led", top: "unveil-p-3-top", lit: "unveil-p-4-lit", nose: [27, 49], cone: { x: .55, y: .32, w: .55, h: .45 } },
    p5: { drl: "unveil5-p-1-drl", led: "unveil5-p-2-led", top: "unveil5-p-3-top", lit: "unveil5-p-4-lit", nose: [20, 47], cone: { x: .5, y: .3, w: .6, h: .4 } },
    l: { drl: "unveil-l-1-drl", led: "unveil-l-2-led", lit: "unveil-l-4-lit", nose: [33, 47], cone: { x: .5, y: .3, w: .4, h: .5 } }
  };
  function unveil(el, o = {}) {
    const s = SETS[o.set || "p"], nose = o.nose || s.nose;
    el.classList.add("stg");
    el.style.setProperty("--nx", nose[0] + "%"); el.style.setProperty("--ny", nose[1] + "%");
    el.innerHTML = `<div class="cam"><img class="l-top" alt=""><div class="l-add l-drl"><img alt=""><i class="shut"></i></div><div class="l-add l-led"><img alt=""><i class="shut"></i></div><img class="l-lit" alt="SAGA Luxe"></div><canvas class="motes"></canvas>`;
    const tp = el.querySelector(".l-top"), dw = el.querySelector(".l-drl"), lw = el.querySelector(".l-led"), ti = el.querySelector(".l-lit");
    const di = dw.querySelector("img"), li = lw.querySelector("img");
    let hasTop = false;
    const api = {
      el,
      ready: Promise.all([load(R + s.drl + ".webp"), load(R + s.led + ".webp"), load(R + s.lit + ".webp")]).then(() => { di.src = R + s.drl + ".webp"; li.src = R + s.led + ".webp"; ti.src = R + s.lit + ".webp"; }),
      play() {
        el.classList.remove("open"); [tp, dw, lw, ti].forEach(x => { x.style.opacity = ""; x.style.transition = ""; });
        if (reduced() || o.instant) { el.classList.add("lit"); return api; }
        el.classList.remove("lit", "play"); void el.offsetWidth; el.classList.add("play");
        clearTimeout(api._t); api._t = setTimeout(() => { el.classList.add("lit"); el.classList.remove("play"); o.onLit && o.onLit(); }, 4600);
        return api;
      },
      /* light switches: lamps + showroom = full render; lamps only = DRL + LED; showroom only = top-light render; neither = dark */
      set(lights, top) {
        el.classList.remove("play", "lit"); el.classList.add("open"); clearTimeout(api._t);
        [tp, dw, lw, ti].forEach(x => (x.style.transition = "opacity .9s cubic-bezier(.4,0,.2,1)"));
        dw.style.opacity = lw.style.opacity = lights && !top ? 1 : 0;
        ti.style.opacity = (lights && top) || (top && !hasTop) ? 1 : 0;
        tp.style.opacity = top && !lights && hasTop ? 1 : 0;
      }
    };
    if (s.top) load(R + s.top + ".webp").then(() => { tp.src = R + s.top + ".webp"; hasTop = true; }).catch(() => {});
    motes(el.querySelector(".motes"), s.cone);
    if (o.autoplay !== false) api.ready.then(() => api.play());
    el.__stage = api;
    return api;
  }

  /* ---------- 360 spin ----------
     Positions are in 10° steps (0..36) whatever the frame count, so callers stay simple. */
  const SPIN = { spin: 36, spin2: 72, hero: 72 };
  function spin(el, o = {}) {
    const set = o.set || "spin2", n = SPIN[set] || 36, k = n / 36, fit = o.fit || "cover", zoom = o.zoom || 1, oy = o.oy || 0;
    el.classList.add("spin");
    el.innerHTML = `<canvas></canvas><span class="spin-load"><i></i></span>${o.hint === false ? "" : `<span class="spin-hint">${o.hintText || "Drag to turn"}</span>`}`;
    const cv = el.querySelector("canvas"), g = cv.getContext("2d", { alpha: !!o.alpha });
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    const frames = new Array(n); let got = 0;
    let pos = o.start || 0, vel = 0, drag = false, lx = 0, idle = o.idle !== false, lastTouch = 0, drawnAt = NaN, raf = 0;
    const src = i => `${R}${set}-${String(i).padStart(2, "0")}.webp`;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const near = i => { if (frames[i]) return frames[i]; for (let d = 1; d < n; d++) { const a = frames[(i + d) % n] || frames[(i - d + n) % n]; if (a) return a; } return null; };
    const rect = img => {
      const W = el.clientWidth, H = el.clientHeight, ir = img.width / img.height, er = W / H;
      let w, h; if ((fit === "cover") === (ir > er)) { h = H; w = H * ir; } else { w = W; h = W / ir; }
      w *= zoom; h *= zoom; return [(W - w) / 2, (H - h) / 2 + oy * H, w, h];
    };
    const draw = force => {
      const f = ((pos * k) % n + n) % n;
      if (!force && Math.abs(f - drawnAt) < .004) return;
      const a = Math.floor(f), b = (a + 1) % n, t = f - a, A = near(a); if (!A) return;
      const W = el.clientWidth, H = el.clientHeight;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalAlpha = 1; if (o.alpha) g.clearRect(0, 0, W, H); else { g.fillStyle = "#000"; g.fillRect(0, 0, W, H); }
      const r = rect(A); g.drawImage(A, r[0], r[1], r[2], r[3]);
      const B = frames[b]; if (B && t > .01) { g.globalAlpha = t; g.drawImage(B, r[0], r[1], r[2], r[3]); g.globalAlpha = 1; }
      drawnAt = f;
    };
    // nearest angles first
    const startIdx = Math.round(pos * k) % n, order = [0]; for (let d = 1; d <= n / 2; d++) { order.push(d); if (n - d !== d) order.push(n - d); }
    let chain = Promise.resolve();
    order.forEach(d => { const i = (startIdx + d) % n; chain = chain.then(() => bitmap(src(i)).then(img => { frames[i] = img; got++; el.style.setProperty("--p", Math.round(got / n * 100) + "%"); if (got === n) el.classList.add("ready"); draw(true); }).catch(() => {})); });
    let last = performance.now();
    const tick = now => {
      raf = requestAnimationFrame(tick);
      if (!el.isConnected) { cancelAnimationFrame(raf); return; }
      if (document.hidden) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!drag) {
        if (Math.abs(vel) > .002) { pos += vel * dt * 60; vel *= Math.pow(.04, dt); }
        else if (api.target != null) { const d = api.target - pos; if (Math.abs(d) < .01) { pos = api.target; api.target = null; } else pos += d * Math.min(1, dt * (o.ease || 3)); }
        else if (idle && got === n && now - lastTouch > 3500) pos += dt * (o.speed || 1.1);
      }
      draw();
    };
    raf = requestAnimationFrame(tick);
    const ppu = () => Math.max(5, el.clientWidth / 36); // pixels per 10°
    el.addEventListener("pointerdown", e => { drag = true; lx = e.clientX; vel = 0; api.target = null; el.setPointerCapture(e.pointerId); el.classList.add("touched"); });
    el.addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - lx; lx = e.clientX; const du = -dx / ppu(); pos += du; vel = vel * .5 + du * .5; lastTouch = performance.now(); });
    const up = () => { drag = false; lastTouch = performance.now(); };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    const api = { el, target: null, to(i) { api.target = i; return api; }, get pos() { return pos; }, set pos(v) { pos = v; }, stopIdle() { idle = false; } };
    el.__spin = api;
    return api;
  }

  window.SagaStage = { unveil, spin, load, R, src: name => R + name + ".webp" };
})();
