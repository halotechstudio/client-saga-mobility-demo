/* SAGA sound: low, tactile and cinematic. Synthesised in Web Audio (no files), run through a shared room reverb.
   UI sounds are short filtered clicks with a sub-thump, like a well-damped car switch; the launch is scored like a film trailer. */
(() => {
  let ctx = null, bus = null, verb = null;
  const KEY = "saga.sfx";
  const on = () => { try { return localStorage.getItem(KEY) !== "0"; } catch (e) { return true; } };
  const impulse = (c, secs, decay) => { const len = c.sampleRate * secs, b = c.createBuffer(2, len, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); } return b; };
  const ac = () => {
    if (!on()) return null;
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ctx = new C();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.knee.value = 8;
      const out = ctx.createGain(); out.gain.value = 0.9; comp.connect(out); out.connect(ctx.destination);
      bus = ctx.createGain(); bus.gain.value = 1; bus.connect(comp);
      verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 2.8, 2.6); const wet = ctx.createGain(); wet.gain.value = 0.32; verb.connect(wet); wet.connect(comp);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const route = (node, wet = 0) => { node.connect(bus); if (wet) { const g = ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(verb); } };
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  const osc = (t, { f = 60, to = null, type = "sine", a = 0.005, d = 0.3, v = 0.2, wet = 0, lp = 0, detune = 0 }) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + a + d);
    let n = o; if (lp) { const f2 = ctx.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = lp; o.connect(f2); n = f2; }
    env(g, t, a, v, d); n.connect(g); route(g, wet); o.start(t); o.stop(t + a + d + 0.1);
  };
  const noise = (t, { a = 0.002, d = 0.05, v = 0.1, type = "bandpass", f = 2500, to = null, q = 1, wet = 0 }) => {
    const len = Math.ceil(ctx.sampleRate * (a + d + 0.1)), b = ctx.createBuffer(1, len, ctx.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = b; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (to) fl.frequency.exponentialRampToValueAtTime(to, t + a + d);
    env(g, t, a, v, d); s.connect(fl); fl.connect(g); route(g, wet); s.start(t); s.stop(t + a + d + 0.1);
  };
  const T = () => { const c = ac(); return c ? c.currentTime + 0.005 : 0; };
  // a deep cinematic hit: sub drop + body + noise transient + reverb
  const hit = (t, k = 1) => { osc(t, { f: 72, to: 34, a: 0.004, d: 0.9 * k, v: 0.55 * k, wet: 0.4 }); osc(t, { f: 145, to: 70, type: "triangle", a: 0.003, d: 0.25, v: 0.18 * k, lp: 900 }); noise(t, { d: 0.12, v: 0.22 * k, type: "lowpass", f: 3200, to: 300, wet: 0.6 }); };
  const SFX = {
    get enabled() { return on(); },
    set enabled(v) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} },
    /* tactile: a damped switch click */
    tap() { const t = T(); if (!t) return; noise(t, { d: 0.012, v: 0.12, f: 3400, q: 1.4 }); osc(t, { f: 150, to: 90, a: 0.001, d: 0.05, v: 0.12 }); },
    soft() { const t = T(); if (!t) return; noise(t, { d: 0.018, v: 0.08, f: 1800, q: 1.2 }); osc(t, { f: 110, to: 70, a: 0.001, d: 0.07, v: 0.14 }); },
    select() { const t = T(); if (!t) return; noise(t, { d: 0.01, v: 0.1, f: 4200, q: 2 }); noise(t + 0.035, { d: 0.012, v: 0.07, f: 5200, q: 2 }); osc(t, { f: 130, to: 85, a: 0.001, d: 0.06, v: 0.1 }); },
    /* the eco key: a low liquid gulp */
    bubble() { const t = T(); if (!t) return; osc(t, { f: 140, to: 320, a: 0.01, d: 0.16, v: 0.16, wet: 0.25 }); osc(t + 0.07, { f: 90, to: 60, a: 0.005, d: 0.25, v: 0.14 }); },
    /* payment confirmed: a warm low chord that blooms */
    success() { const t = T(); if (!t) return; osc(t, { f: 55, to: 50, a: 0.01, d: 0.8, v: 0.35, wet: 0.3 }); [[196, -6], [247, 4], [294, -3], [392, 5]].forEach(([f, dt], i) => osc(t + i * 0.025, { f, type: "sawtooth", a: 0.06, d: 1.6, v: 0.05, lp: 1400, detune: dt, wet: 0.6 })); },
    whoosh() { const t = T(); if (!t) return; noise(t, { a: 0.2, d: 0.35, v: 0.12, f: 400, to: 2800, q: 0.7, wet: 0.4 }); },
    /* the launch, scored to the shot (30 fps, after a 0.45 s lead-in) */
    launch() {
      const c = ac(); if (!c) return; const t0 = c.currentTime + 0.45, fr = n => t0 + n / 30;
      noise(t0 - 0.3, { a: 1.2, d: 0.2, v: 0.05, type: "lowpass", f: 200, to: 900, q: 0.5, wet: 0.5 });                 // air in the hall
      for (let i = 0; i < 12; i++) { const t = fr(8 + i * 2); noise(t, { d: 0.02, v: 0.16, f: 2600 - i * 60, q: 2.2, wet: 0.5 }); osc(t, { f: 95, to: 55, a: 0.002, d: 0.12, v: 0.12 }); } // runway relays clacking on toward you
      hit(fr(30), 1);                                                                                                       // DRLs: the first big hit
      osc(fr(36), { f: 220, to: 440, type: "sawtooth", a: 0.25, d: 0.9, v: 0.035, lp: 2200, wet: 0.6 });                   // LED decals: a charged sweep
      osc(fr(36), { f: 330, to: 660, type: "sawtooth", a: 0.25, d: 0.9, v: 0.025, lp: 2600, detune: 8, wet: 0.6 });
      osc(fr(40), { f: 38, to: 76, type: "sawtooth", a: 0.5, d: 1.6, v: 0.09, lp: 260, wet: 0.2 });                        // motor wakes: a sub swell
      osc(fr(46), { f: 880, to: 2400, type: "sine", a: 0.6, d: 1.2, v: 0.018, wet: 0.4 });                                 // inverter whine climbing with speed
      noise(fr(60), { a: 1.15, d: 0.45, v: 0.32, f: 260, to: 3600, q: 0.6, wet: 0.5 });                                     // the pass: a rushing riser
      osc(fr(92), { f: 180, to: 60, type: "triangle", a: 0.01, d: 0.8, v: 0.12, lp: 1200, wet: 0.4 });                    // doppler drop as it goes by
      const tt = fr(105) + 0.25; hit(tt, 1.25);                                                                            // title: the trailer hit
      [[65.4, -7], [65.4, 7], [98, -5], [130.8, 4], [196, -3]].forEach(([f, dt]) => osc(tt, { f, type: "sawtooth", a: 0.08, d: 3.2, v: 0.06, lp: 700, detune: dt, wet: 0.7 }));
      osc(tt + 0.6, { f: 1568, type: "sine", a: 0.8, d: 2.4, v: 0.012, wet: 0.9 });                                        // a thin shimmer on top
    }
  };
  window.SFX = SFX;
  document.addEventListener("pointerdown", e => {
    if (!on()) return;
    const el = e.target.closest(".tab-eco,.tab,.seg button,.chip,.tgl,.btn,.svc,.sv-card,.bn,.pk-row,.pk-hours button,.pk-days button,.lang,.ic-d,.row,[data-act],[data-go]");
    if (!el || el.matches('[data-act="launch"]')) return;
    if (el.matches(".tab-eco")) SFX.bubble();
    else if (el.matches(".tab")) SFX.soft();
    else if (el.matches(".seg button,.chip,.tgl,.pk-row,.pk-hours button,.pk-days button,.lang,.ic-d")) SFX.select();
    else SFX.tap();
  }, { capture: true, passive: true });
})();
