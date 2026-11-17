/* SAGA sound: a small, quiet palette synthesised in Web Audio (no files). Off when the rider mutes it or prefers reduced motion. */
(() => {
  let ctx = null, master = null;
  const KEY = "saga.sfx";
  const on = () => { try { return localStorage.getItem(KEY) !== "0"; } catch (e) { return true; } };
  const ac = () => {
    if (!on()) return null;
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ctx = new C(); master = ctx.createGain(); master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  const tone = (f, t, { type = "sine", a = 0.004, d = 0.12, v = 0.08, to = null, dest = null } = {}) => {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + a + d);
    env(g, t, a, v, d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + a + d + 0.05);
  };
  const noise = (t, { d = 0.4, v = 0.06, f0 = 400, f1 = 3000, q = 0.8, a = 0.05 } = {}) => {
    const c = ac(); if (!c) return;
    const len = Math.ceil(c.sampleRate * (a + d + 0.1)), buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; bp.type = "bandpass"; bp.Q.value = q; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    env(g, t, a, v, d); src.connect(bp); bp.connect(g); g.connect(master); src.start(t); src.stop(t + a + d + 0.1);
  };
  const now = () => (ac() ? ctx.currentTime : 0);
  const SFX = {
    get enabled() { return on(); },
    set enabled(v) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} },
    tap() { const t = now(); if (t) tone(1800, t, { type: "sine", d: 0.035, v: 0.035, to: 1400 }); },
    soft() { const t = now(); if (t) tone(620, t, { type: "sine", d: 0.06, v: 0.04, to: 520 }); },
    select() { const t = now(); if (t) { tone(880, t, { d: 0.06, v: 0.04 }); tone(1320, t + 0.045, { d: 0.08, v: 0.03 }); } },
    bubble() { const t = now(); if (t) { tone(380, t, { d: 0.12, v: 0.05, to: 900 }); tone(520, t + 0.09, { d: 0.1, v: 0.035, to: 1200 }); } },
    success() { const t = now(); if (t) [[784, 0], [988, 0.09], [1318, 0.18]].forEach(([f, dt]) => tone(f, t + dt, { d: 0.45, v: 0.05, type: "triangle" })); },
    whoosh() { const t = now(); if (t) noise(t, { d: 0.35, v: 0.035, f0: 600, f1: 2400 }); },
    /* the launch shot, scored to its frames (30 fps, starts after the 0.45 s lead-in) */
    launch() {
      const c = ac(); if (!c) return; const t0 = c.currentTime + 0.45, fr = n => t0 + n / 30;
      for (let i = 0; i < 12; i++) tone(1200 + i * 40, fr(8 + i * 2), { type: "square", a: 0.002, d: 0.03, v: 0.012 });   // runway lamps clicking on
      tone(90, fr(30), { type: "sine", a: 0.01, d: 0.35, v: 0.12, to: 60 });                                              // DRL: a soft thunk
      tone(440, fr(36), { type: "sine", a: 0.2, d: 0.7, v: 0.03, to: 880 }); tone(660, fr(38), { type: "sine", a: 0.2, d: 0.7, v: 0.02, to: 1320 }); // LED decals shimmer up
      tone(55, fr(40), { type: "sawtooth", a: 0.35, d: 1.4, v: 0.025, to: 110 });                                         // electric motor hum rises
      noise(fr(70), { a: 0.9, d: 0.35, v: 0.09, f0: 300, f1: 3200, q: 0.6 });                                            // the pass: a building whoosh
      tone(320, fr(88), { type: "sine", a: 0.05, d: 0.6, v: 0.04, to: 120 });                                            // doppler drop as it passes
      [[262, 0], [330, 0.12], [392, 0.24], [523, 0.36]].forEach(([f, dt]) => tone(f, fr(105) + 0.9 + dt, { type: "sine", a: 0.25, d: 2.2, v: 0.03 })); // title chord
    }
  };
  window.SFX = SFX;
  // quiet feedback on touch; nothing on scroll
  document.addEventListener("pointerdown", e => {
    if (!on()) return;
    const el = e.target.closest(".tab-eco,.tab,.seg button,.chip,.tgl,.btn,.svc,.sv-card,.bn,.pk-row,.pk-hours button,.pk-days button,.lang,.ic-d,.row,[data-act],[data-go]");
    if (!el) return;
    if (el.matches(".tab-eco")) SFX.bubble();
    else if (el.matches(".tab")) SFX.soft();
    else if (el.matches(".seg button,.chip,.tgl,.pk-row,.pk-hours button,.pk-days button,.lang,.ic-d")) SFX.select();
    else SFX.tap();
  }, { capture: true, passive: true });
})();
