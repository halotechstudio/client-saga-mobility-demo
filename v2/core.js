/* SAGA v2 · shared core
   Theming from one client hex, light/dark, iOS/Android tokens, i18n helper,
   icons, the branded map, the vehicle illustration and the voice engine.
   Every app page (rider, driver, hotel, ops, suite) loads this file. */
(function () {
  const S = (window.SAGA = {});

  /* ---------- storage (shared across every page and iframe on this origin) ---------- */
  const KEY = "saga3.";
  S.get = (k, d) => { try { const v = localStorage.getItem(KEY + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  S.put = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) {} };
  const qs = (S.qs = new URLSearchParams(location.search));

  /* ---------- the one place the vehicle is described ----------
     SAGA Luxe: SAGA's 7-seat electric SUV (chauffeur + 6 riders). Never shown with a make or model name.
     If SAGA's cars are configured differently, change `rows` and everything follows. */
  S.VEHICLE = {
    make: "SAGA", model: "Luxe", short: "SAGA Luxe",
    rows: [2, 3, 2],              // front row (chauffeur + 1), rear row
    bags: 3, colour: "Matte black",
    plate: "AP 39 EV 2041"
  };
  S.riders = () => S.VEHICLE.rows.reduce((a, b) => a + b, 0) - 1;

  /* ---------- state ---------- */
  S.state = {
    hex: S.get("hex", "#3F51B5"),
    logo: S.get("logo", null),
    theme: qs.get("theme") || S.get("theme", "dark"),
    lang: qs.get("lang") || S.get("lang", "en"),
    text: S.get("text", "standard"),
    os: qs.get("os") || "ios"
  };

  /* ---------- colour maths (OKLCH) ---------- */
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const gam = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  function hexRgb(h) {
    h = String(h || "").replace("#", "").trim();
    if (h.length === 3) h = h.split("").map(x => x + x).join("");
    if (!/^[0-9a-f]{6}$/i.test(h)) h = "3F51B5";
    const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function oklch(hex) {
    let [r, g, b] = hexRgb(hex).map(lin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
  }
  function okRgb(L, C, H) {
    const a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  }
  function okHex(L, C, H) {
    let rgb = okRgb(L, C, H);
    for (let i = 0; i < 40 && !rgb.every(v => v >= -0.001 && v <= 1.001); i++) { C *= 0.9; rgb = okRgb(L, C, H); }
    return "#" + rgb.map(v => Math.round(Math.min(1, Math.max(0, gam(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, "0")).join("");
  }
  const lum = hex => { const [r, g, b] = hexRgb(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  S.contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const onColor = bg => (S.contrast(bg, "#FFFFFF") >= S.contrast(bg, "#0A0A0C") ? "#FFFFFF" : "#0A0A0C");
  S.okHex = okHex; S.oklch = oklch;

  /* ---------- design tokens: one function, every app ----------
     This is the same table the Flutter ThemeExtension is generated from (see brief.html). */
  S.tokens = function (os, theme, hex) {
    const [L, C, H] = oklch(hex);
    const dark = theme === "dark";
    const T = (l, c) => okHex(l, c, H); // brand-tinted neutral (Android dynamic colour)
    let t;
    if (os === "android") {
      t = dark
        ? { bg: "#05070F", surface: "#0A0E21", surface2: "#121834", surface3: "#1B2244", fg: "#EEF1FF", fg2: "#A9B0D6", fg3: "#6E759E", hair: "#1A2348" }
        : { bg: T(.925, .012), surface: "#FFFFFF", surface2: T(.895, .016), surface3: T(.85, .02), fg: T(.18, .012), fg2: T(.4, .016), fg3: T(.58, .016), hair: T(.83, .012) };
    } else {
      t = dark
        ? { bg: "#05070F", surface: "#0A0E21", surface2: "#121834", surface3: "#1B2244", fg: "#EEF1FF", fg2: "#A9B0D6", fg3: "#6E759E", hair: "#1A2348" }
        : { bg: "#E9EBF5", surface: "#FFFFFF", surface2: "#E1E4F2", surface3: "#CFD3E8", fg: "#0A0E21", fg2: "#4A5078", fg3: "#6E759E", hair: "#C9CDE3" };
    }
    const accent = dark ? okHex(Math.min(Math.max(L, .6), .78), C, H) : hex;
    Object.assign(t, {
      accent, onAccent: onColor(accent),
      accentInk: dark ? okHex(Math.max(L, .78), Math.min(C, .14), H) : (L > .55 ? okHex(.48, C, H) : hex),
      accentSoft: dark ? okHex(.3, Math.min(C, .08), H) : okHex(.945, Math.min(C, .045), H),
      onAccentSoft: dark ? okHex(.9, Math.min(C, .07), H) : okHex(.34, Math.min(C, .16), H),
      success: dark ? "#3DD68C" : "#0F8A4F", warning: dark ? "#F5B53D" : "#A86200", danger: dark ? "#FF6B61" : "#C8261B",
      stage: "#05070F", stage2: "#0E1430", glow: "#2CC8F5", glowSoft: dark ? "rgba(44,200,245,.18)" : "rgba(44,200,245,.22)", tertiary: dark ? "#FFB37A" : "#8F4700", neon: "#4BE36B", onStage: "#F4F4F6", onStage2: "#A9ABB3",
      glass: dark ? "rgba(10,14,33,.66)" : "rgba(255,255,255,.66)",
      glassLine: dark ? "rgba(44,200,245,.22)" : "rgba(255,255,255,.85)",
      glass2: dark ? "rgba(18,24,52,.56)" : "rgba(255,255,255,.56)", glassHi: dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.95)",
      ink: dark ? "#0E1430" : "#0A0E21", onInk: "#F5F5F7", onInk2: "#9A9CA5",
      shadow: dark ? "0 10px 30px rgba(0,0,0,.5)" : "0 10px 30px rgba(15,18,30,.10)",
      mapLand: dark ? "#060914" : (os === "android" ? T(.965, .006) : "#F3F2EF"),
      mapBlock: dark ? "#0A0F22" : (os === "android" ? T(.945, .008) : "#ECEAE6"),
      mapWater: dark ? "#081634" : okHex(.88, .045, H),
      mapPark: dark ? "#08161A" : "#DCEAD6",
      mapRoad: dark ? "#152450" : "#FFFFFF",
      mapCase: dark ? "#070B18" : "#E1DED8",
      mapMajor: dark ? "#1F6FA8" : "#FFFFFF",
      mapMajorCase: dark ? "#0A1A33" : "#CFCBC4",
      mapLabel: dark ? "#7F8BC0" : "#62666F",
      mapSand: dark ? "#14131E" : "#EFE6D2"
    });
    return t;
  };
  const kebab = s => s.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
  S.resolvedTheme = () => (S.state.theme === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : S.state.theme);
  S.apply = function (root) {
    root = root || document.documentElement;
    const theme = S.resolvedTheme();
    const t = S.tokens(S.state.os, theme, S.state.hex);
    for (const [k, v] of Object.entries(t)) root.style.setProperty("--" + kebab(k), v);
    root.dataset.theme = theme; root.dataset.os = S.state.os; root.dataset.lang = S.state.lang; root.dataset.text = S.state.text;
    root.lang = S.state.lang;
    return t;
  };

  /* ---------- i18n: inline triples, rendered on every language change ---------- */
  S.L = (en, te, hi) => (S.state.lang === "te" && te) || (S.state.lang === "hi" && hi) || en;
  S.LANGS = [
    { id: "en", name: "English", native: "English", sr: "en-IN" },
    { id: "te", name: "Telugu", native: "తెలుగు", sr: "te-IN" },
    { id: "hi", name: "Hindi", native: "हिन्दी", sr: "hi-IN" }
  ];
  S.inr = n => "₹" + Number(n).toLocaleString("en-IN");

  /* ---------- sync between pages / iframes ---------- */
  const listeners = [];
  S.onChange = fn => listeners.push(fn);
  S.set = function (patch, silent) {
    Object.assign(S.state, patch);
    for (const k of ["hex", "logo", "theme", "lang", "text"]) if (k in patch) S.put(k, patch[k]);
    listeners.forEach(fn => fn(patch));
    if (!silent) {
      try { S.bc && S.bc.postMessage(patch); } catch (e) {}
      try { if (parent !== window) parent.postMessage({ saga: "state", patch }, "*"); } catch (e) {}
    }
  };
  try { S.bc = new BroadcastChannel("saga2"); S.bc.onmessage = e => S.set(e.data, true); } catch (e) {}
  window.addEventListener("message", e => { if (e.data && e.data.saga === "set") S.set(e.data.patch, true); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (S.state.theme === "system") S.set({}, true); });

  /* SAGA mark drawn from the client logo: cyan S-arrow, green square, A G A with blue dots. Letters use currentColor. */
  S.logoSvg = (cls = "") => `<svg class="wordmark logo-svg ${cls}" viewBox="0 0 236 56" role="img" aria-label="SAGA" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M40 9H22a9.5 9.5 0 0 0 0 19h9a9.5 9.5 0 0 1 0 19H7M14 40l-7 7 7 7" stroke="#2CC8F5" stroke-width="5"/><rect x="44.5" y="2.5" width="8" height="8" rx="1" stroke="#4BE36B" stroke-width="3"/><g stroke="currentColor" stroke-width="7"><path d="M74 50 92 12l18 38"/><path d="M171 18.5a18 18 0 1 0 0 25V33h-12"/><path d="M190 50l18-38 18 38"/></g><circle cx="92" cy="41" r="4.5" fill="#2C8CF5"/><circle cx="208" cy="41" r="4.5" fill="#2C8CF5"/></svg>`;
  /* ---------- logo: the client's file when supplied, otherwise a neutral wordmark ---------- */
  S.logo = (cls = "") => S.state.logo
    ? `<img class="logo-img ${cls}" src="${S.state.logo}" alt="SAGA">`
    : S.logoSvg(cls);

  /* ---------- icons (24px, stroke) ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    cal: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    calcheck: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M9 15l2 2 4-4"/>',
    tag: '<path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8L13.8 21a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    mic: '<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    route: '<circle cx="6" cy="19" r="2.5"/><path d="M8.5 19h9a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H16"/><circle cx="18" cy="5" r="2.5"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    chevr: '<path d="m9 6 6 6-6 6"/>', chevl: '<path d="m15 6-6 6 6 6"/>', chevd: '<path d="m6 9 6 6 6-6"/>', chevu: '<path d="m6 15 6-6 6 6"/>',
    arrowl: '<path d="M19 12H5M11 18l-6-6 6-6"/>', arrowr: '<path d="M5 12h14M13 6l6 6-6 6"/>', arrowu: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z"/>',
    shield: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
    spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    seat: '<path d="M8 3.5h4.5a2 2 0 0 1 2 2V13H8a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"/><path d="M6 13.5V15a2 2 0 0 0 2 2h9.5a1.5 1.5 0 0 0 1.5-1.5V13M9 17v4M16 17v4"/>',
    bag: '<rect x="5" y="7" width="14" height="13" rx="2"/><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7M9 11v5M15 11v5"/>',
    snow: '<path d="M12 2v20M4.9 7l14.2 10M4.9 17 19.1 7"/><path d="m9 3.5 3 2 3-2M9 20.5l3-2 3 2"/>',
    drop: '<path d="M12 2.5s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
    battery: '<rect x="2" y="7" width="17" height="10" rx="2.2"/><path d="M22 11v2M6 10v4M10 10v4"/>',
    hotel: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.6 3.5 6"/>',
    ticket: '<path d="M3 8a2 2 0 0 0 2-2V5h14v1a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2v1H5v-1a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4Z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 6 9-6"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16Z"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/>',
    text: '<path d="M4 7V5h10v2M9 5v14M7 19h4M14 13v-1h7v1M17.5 12v7M16 19h3"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    nav: '<path d="M12 2 19 21l-7-4-7 4Z"/>',
    grid: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 9h-5a3 3 0 0 0 0 6h5Z"/>',
    receipt: '<path d="M5 2.5h14v19l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 8h6M9 12h6"/>',
    device: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
    quiet: '<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="m16 9 5 6M21 9l-5 6"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0"/><path d="M12 19.5h.01"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8Z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 14.5V21M9.6 11.2 3.5 9.5M14.4 11.2l6.1-1.7"/>',
    hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
    building: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1Z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M7 12h10"/>',
    upload: '<path d="M12 15V3M7 8l5-5 5 5M5 21h14"/>',
    sos: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16h.01"/>',
    landing: '<path d="M2 22h20"/><path d="M3.8 6.6 5 5.4l3.6 2.1 3.4-1.8L5.8 2.6 7.3 2l8.3 3 4 1.4c1.1.4 1.6 1.5 1.2 2.6-.3.7-1 1.2-1.8 1.2H17l-4.6 3.2H10l1.6-3.4-4.3-.3Z"/>',
    takeoff: '<path d="M2 22h20"/><path d="M6.4 17.4 2.6 14l1.4-1 3.6 1.2 3.4-2.5-5.4-4.6 1.8-.8 7.8 3 3.5-2.5c1-.7 2.3-.5 3 .5s.4 2.3-.6 3l-12 8.2Z"/>'
  };
  S.ICONS = P;
  S.icon = (n, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;

  /* ---------- the branded city map (SVG, grid space rotated to read as a real street plan) ----------
     In Flutter this is google_maps_flutter with the JSON style in brief.html; the colours come from the same tokens. */
  const ROT = -9, CX = 200, CY = 430;
  const rp = (x, y) => { const a = ROT * Math.PI / 180, dx = x - CX, dy = y - CY; return [CX + dx * Math.cos(a) - dy * Math.sin(a), CY + dx * Math.sin(a) + dy * Math.cos(a)]; };
  const COAST = [[318, -40], [306, 60], [300, 140], [306, 200], [296, 270], [284, 340], [278, 410], [270, 470], [252, 540], [238, 610], [216, 680], [188, 750], [152, 820], [118, 900], [100, 960]];
  const sm = pts => pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join("");
  const MAP_BASE = (() => {
    const land = sm(COAST) + "L-200 960L-200 -40Z";
    const sea = sm(COAST) + "L700 960L700 -40Z";
    let minor = "";
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let x = -100; x <= 400; x += 40) for (let y = -60; y <= 940; y += 40) {
      if (rnd() > .18) minor += `M${x} ${y}L${x} ${y + 40}`;
      if (rnd() > .18) minor += `M${x} ${y}L${x + 40} ${y}`;
    }
    const blocks = [];
    for (let x = -100; x < 400; x += 40) for (let y = -60; y < 940; y += 40) if (rnd() > .55) blocks.push(`<rect x="${x + 7}" y="${y + 7}" width="${26 - (rnd() * 8 | 0)}" height="${26 - (rnd() * 8 | 0)}" rx="2"/>`);
    const major = "M-100 180H400M-100 340H400M-100 500H400M-100 660H400M140 -60V960M260 -60V960";
    const beach = "M302 -40L290 60L284 140L290 200L280 270L268 340L262 410L254 470L236 540L222 610L200 680L172 750L136 820L104 900";
    const nh = "M20 -60C60 120 110 260 100 400S40 700 -20 960";
    return `<defs><clipPath id="mland"><path d="${land}"/></clipPath></defs>
      <rect x="-300" y="-300" width="1000" height="1500" class="m-water"/>
      <path d="${land}" class="m-land"/>
      <g clip-path="url(#mland)">
        <g class="m-block">${blocks.join("")}</g>
        <rect x="170" y="226" width="52" height="40" rx="8" class="m-park"/><rect x="52" y="388" width="44" height="66" rx="8" class="m-park"/>
        <rect x="150" y="530" width="66" height="44" rx="8" class="m-park"/><ellipse cx="262" cy="104" rx="34" ry="26" class="m-park"/>
        <path d="${minor}" class="m-road-case"/><path d="${minor}" class="m-road"/>
        <path d="${major} ${nh}" class="m-major-case"/><path d="${major} ${nh}" class="m-major"/>
        <path d="${beach}" class="m-major-case"/><path d="${beach}" class="m-major"/>
      </g>
      <path d="${sm(COAST)}" class="m-sand"/>`;
  })();
  const LABELS = [
    [258, 70, "Rushikonda"], [212, 220, "MVP Colony"], [196, 410, "Siripuram"], [86, 520, "Dwaraka Nagar"], [140, 700, "Gajuwaka Rd"], [300, 432, "RK Beach", 1]
  ];
  S.PTS = { home: [220, 300], office: [100, 580], car: [260, 180], car2: [180, 440], beach: [262, 470], airportN: [140, -40] };
  S.ROUTES = {
    trip: [[220, 300], [220, 340], [140, 340], [140, 500], [100, 500], [100, 580]],
    pickup: [[260, 180], [260, 300], [220, 300]],
    airport: [[220, 300], [220, 180], [140, 180], [140, -60]]
  };
  /* opts: { view:[x,y,w,h], route:'trip'|'pickup'|'airport', pins:true, car:[x,y,angle], cars:[[x,y,a],...], pulse:true, labelPickup, labelDrop } */
  S.map = function (o = {}) {
    const v = o.view || [20, 120, 360, 700];
    let route = "", over = "";
    if (o.route) {
      const pts = S.ROUTES[o.route].map(p => rp(p[0], p[1]));
      const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
      route = `<path d="${d}" class="m-route-case"/><path d="${d}" class="m-route ${o.dashed ? "m-route-dash" : ""}"/>`;
      const a = pts[0], b = pts[pts.length - 1];
      if (o.pins !== false) {
        if (o.route === "pickup") over += pin(b, "pick", o.labelPickup);
        else {
          over += pin(a, "pick", o.labelPickup);
          if (o.route !== "airport") over += pin(b, "drop", o.labelDrop);
        }
      }
    } else if (o.pickup) over += pin(rp(...S.PTS.home), "pick", o.labelPickup);
    if (o.pulse) { const p = rp(...S.PTS.home); over = `<circle cx="${p[0]}" cy="${p[1]}" r="26" class="m-pulse"/><circle cx="${p[0]}" cy="${p[1]}" r="52" class="m-pulse m-pulse2"/>` + over; }
    (o.stops || []).forEach((s, i) => { over += stopPin(rp(s.p[0], s.p[1]), i + 1, s.type); });
    (o.cars || []).forEach(c => { over += carMark(rp(c[0], c[1]), (c[2] || 0) + ROT, c[3]); });
    (o.tags || []).forEach(t => { const p = rp(t[0], t[1]); over += `<g class="m-tag" transform="translate(${p[0]} ${p[1] - 26})"><rect x="${-t[2].length * 3.6 - 11}" y="-13" width="${t[2].length * 7.2 + 22}" height="26" rx="13"/><text y="4.6" text-anchor="middle">${t[2]}</text></g>`; });
    if (o.car) over += carMark(rp(o.car[0], o.car[1]), (o.car[2] || 0) + ROT, "me");
    const labels = LABELS.map(([x, y, t, sea]) => { const p = rp(x, y); return `<text x="${p[0]}" y="${p[1]}" class="m-label ${sea ? "m-label-sea" : ""}">${t}</text>`; }).join("")
      + (() => { const p = rp(330, 600); return `<text x="${p[0]}" y="${p[1]}" class="m-label m-label-water" transform="rotate(-72 ${p[0]} ${p[1]})">Bay of Bengal</text>`; })();
    return `<svg class="map" viewBox="${v.join(" ")}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g transform="rotate(${ROT} ${CX} ${CY})">${MAP_BASE}</g>${labels}${route}${over}</svg>`;
  };
  function pin(p, kind, label) {
    const [x, y] = p;
    const lab = label ? `<g class="m-callout" transform="translate(${x} ${y - 30})"><rect x="${-label.length * 3.3 - 10}" y="-13" width="${label.length * 6.6 + 20}" height="26" rx="13"/><text y="4.5" text-anchor="middle">${label}</text></g>` : "";
    return kind === "pick"
      ? `<g class="m-pin-pick"><circle cx="${x}" cy="${y}" r="9"/><circle cx="${x}" cy="${y}" r="3.6" class="dot"/></g>${lab}`
      : `<g class="m-pin-drop"><rect x="${x - 8}" y="${y - 8}" width="16" height="16" rx="3"/><rect x="${x - 3}" y="${y - 3}" width="6" height="6" class="dot"/></g>${lab}`;
  }
  function stopPin(p, n, type) {
    const [x, y] = p;
    return `<g class="m-stop ${type === "pickup" ? "m-stop-pick" : ""}"><circle cx="${x}" cy="${y}" r="12"/><text x="${x}" y="${y + 4.6}" text-anchor="middle">${n}</text></g>`;
  }
  function carMark(p, ang, kind) {
    const [x, y] = p;
    return `<g class="m-car ${kind === "me" || kind === "free" ? "m-car-me" : ""} ${kind === "busy" ? "m-car-busy" : ""}" transform="translate(${x} ${y}) rotate(${ang})">
      <rect x="-7.5" y="-13" width="15" height="26" rx="5" class="body"/><rect x="-5.5" y="-6.5" width="11" height="6" rx="1.6" class="glass"/><rect x="-5.5" y="5" width="11" height="4" rx="1.4" class="glass"/></g>`;
  }

  /* the map in SAGA's dark style, whatever the app theme (for hero map cards) */
  S.darkMap = () => { const d = S.tokens(S.state.os === "android" ? "android" : "ios", "dark", S.state.hex); return ["mapLand", "mapBlock", "mapWater", "mapPark", "mapRoad", "mapCase", "mapMajor", "mapMajorCase", "mapLabel", "mapSand"].map(k => "--" + k.replace(/[A-Z]/g, m => "-" + m.toLowerCase()) + ":" + d[k]).join(";") + ";--bg:#0B0C0F;--fg:#F5F5F7"; };

  /* regional schematic for intercity trips */
  S.region = function (dest) {
    const C = { Visakhapatnam: [250, 330], Vizianagaram: [292, 236], Srikakulam: [380, 150], "Araku Valley": [168, 200], Kakinada: [118, 470], Rajahmundry: [52, 470] };
    const d = C[dest] || C.Vizianagaram, s = C.Visakhapatnam;
    const mid = [(s[0] + d[0]) / 2 - 30, (s[1] + d[1]) / 2 - 20];
    return `<svg class="map" viewBox="0 60 420 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect x="0" y="0" width="420" height="600" class="m-land"/>
      <path d="M420 120C380 200 330 300 290 370S170 470 120 520L120 600H420Z" class="m-water"/>
      <path d="M420 120C380 200 330 300 290 370S170 470 120 520" class="m-sand"/>
      <path d="M120 120c40 30 60 80 40 130M60 260c50 10 90 40 100 90" class="m-major-case"/><path d="M120 120c40 30 60 80 40 130M60 260c50 10 90 40 100 90" class="m-major"/>
      <ellipse cx="160" cy="190" rx="70" ry="44" class="m-park" opacity=".8"/>
      <path d="M${s[0]} ${s[1]}Q${mid[0]} ${mid[1]} ${d[0]} ${d[1]}" class="m-route-case"/><path d="M${s[0]} ${s[1]}Q${mid[0]} ${mid[1]} ${d[0]} ${d[1]}" class="m-route"/>
      ${Object.entries(C).map(([n, p]) => `<circle cx="${p[0]}" cy="${p[1]}" r="${n === dest || n === "Visakhapatnam" ? 7 : 4}" class="${n === dest ? "m-city-on" : n === "Visakhapatnam" ? "m-city-home" : "m-city"}"/><text x="${p[0] + 11}" y="${p[1] + 4}" class="m-label ${n === dest || n === "Visakhapatnam" ? "m-label-strong" : ""}">${n}</text>`).join("")}
    </svg>`;
  };

  /* ---------- vehicle illustration: compact electric SUV, side profile ----------
     Neutral compact-SUV illustration used as the photo stand-in for SAGA Luxe.
     graphite aero wheels, LED signature front and rear. A neutral illustration, not a manufacturer drawing. Replace with SAGA's own photography when supplied. */
  let carN = 0;
  S.car = function (o = {}) {
    const id = "c" + (++carN);
    const reflect = o.reflect !== false;
    const SIL = "M50 206L46 198C42 188 41 172 41 156L43 132C45 104 57 70 74 49C79 42 86 36 98 34L296 31C308 31 316 36 324 43L386 99C390 103 395 105 402 106L494 118C508 121 517 129 519 143L520 180C520 192 517 200 509 206L482 206A50 50 0 1 0 388 206L170 206A50 50 0 1 0 76 206Z";
    const spokes = [0, 72, 144, 216, 288].map(a => `<path d="M-2.6 -9L-4.4 -27Q0 -29.5 4.4 -27L2.6 -9Z" class="cb-spoke" transform="rotate(${a})"/>`).join("");
    const wheel = cx => `<g transform="translate(${cx} 189)"><circle r="41" class="cb-tyre"/><circle r="37" class="cb-wall"/><circle r="29.5" fill="url(#${id}r)"/><circle r="26" class="cb-dish"/>${spokes}<circle r="7.5" class="cb-hub"/><circle r="2.8" class="cb-cap"/></g>`;
    const body = `
      <circle cx="123" cy="189" r="51" class="cb-well"/><circle cx="435" cy="189" r="51" class="cb-well"/>
      <path class="cb-body" fill="url(#${id}b)" d="${SIL}"/>
      <path class="cb-shoulder" d="M52 128C170 119 330 117 505 132"/>
      <path class="cb-crease" d="M52 132C170 123 330 121 505 136"/>
      <path class="cb-green" d="M50 106C52 90 60 66 74 49C79 42 86 36 98 34L296 31C308 31 316 36 324 43L386 99C390 103 394 105 400 106Z"/>
      <path class="cb-glass" fill="url(#${id}g)" d="M70 102L91 49C93 46 96 45 100 45L219 43L219 102ZM240 43L296 41C303 41 308 43 313 47L368 97C371 100 370 102 366 102L240 102Z"/>
      <path class="cb-sheen" d="M118 45L150 44L110 102L78 102ZM266 42L292 41L254 102L228 102Z"/>
      <path class="cb-trim" d="M70 104.5H368"/>
      <path class="cb-rail" d="M110 27L292 24M122 27V31M280 24.5V30"/>
      <path class="cb-cut" d="M240 106V204M152 108L150 148M376 108C379 130 381 150 384 162"/>
      <rect class="cb-handle" x="186" y="121" width="22" height="4.6" rx="2.3"/><rect class="cb-handle" x="302" y="120" width="22" height="4.6" rx="2.3"/>
      <path class="cb-mirror" d="M366 96L384 94C388 94 389 97 388 100L385 104L368 105Z"/>
      <path class="cb-sill" d="M178 197H380"/>
      <path class="cb-brandline" d="M178 192H380"/>
      <text class="cb-brand" x="262" y="162" text-anchor="middle">SAGA</text>
      <path class="cb-grille" d="M493 143L518 147L519 172L497 170Z"/>
      <path class="cb-head" d="M474 121L507 126C513 127 516 130 516 134L515 138C500 134 486 132 468 130Z"/>
      <path class="cb-drl" d="M478 124L510 129"/>
      <path class="cb-tail" d="M44 118L48 150"/>
      ${wheel(123)}${wheel(435)}`;
    return `<svg class="carsvg ${o.cls || ""}" viewBox="26 14 508 ${reflect ? 300 : 228}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="cg-b0"/><stop offset=".34" class="cg-b1"/><stop offset=".8" class="cg-b2"/><stop offset="1" class="cg-b3"/></linearGradient>
        <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3A4658"/><stop offset=".55" stop-color="#151A23"/><stop offset="1" stop-color="#0A0D12"/></linearGradient>
        <radialGradient id="${id}r" cx=".4" cy=".35"><stop offset="0" stop-color="#F1F3F6"/><stop offset=".6" stop-color="#9EA4AE"/><stop offset="1" stop-color="#4B515B"/></radialGradient>
        <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <linearGradient id="${id}w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <clipPath id="${id}c"><path d="${SIL}"/></clipPath>
        <mask id="${id}m"><rect x="0" y="232" width="640" height="120" fill="url(#${id}f)"/></mask>
        <filter id="${id}s" x="-20%" y="-300%" width="140%" height="700%"><feGaussianBlur stdDeviation="7"/></filter>
      </defs>
      <ellipse cx="282" cy="231" rx="244" ry="8" class="cb-shadow" filter="url(#${id}s)"/>
      <g class="cb-all">${body}
        <g clip-path="url(#${id}c)"><g class="cb-sweep"><rect x="-90" y="20" width="70" height="220" transform="skewX(-24)" fill="url(#${id}w)"/></g></g></g>
      ${reflect ? `<g mask="url(#${id}m)" transform="translate(0 462) scale(1 -1)" opacity=".85">${body}</g>` : ""}
    </svg>`;
  };

  /* top-down seat plan, driven by S.VEHICLE.rows. India: chauffeur sits front right. */
  S.seats = function () {
    const rows = S.VEHICLE.rows, W = 150, rowH = 74;
    const H = 60 + rows.length * rowH + 40;
    let g = "", y = 70;
    rows.forEach((n, ri) => {
      const sw = n === 3 ? 34 : 40, gap = n === 3 ? 6 : 22, total = n * sw + (n - 1) * gap, x0 = (W - total) / 2 + 10;
      for (let i = 0; i < n; i++) {
        const x = x0 + i * (sw + gap), drv = ri === 0 && i === n - 1;
        g += `<g class="seat ${drv ? "seat-drv" : ""}"><rect x="${x}" y="${y}" width="${sw}" height="44" rx="10"/><rect x="${x + 4}" y="${y + 36}" width="${sw - 8}" height="12" rx="5" class="back"/></g>`;
        if (drv) g += `<circle cx="${x + sw / 2}" cy="${y - 10}" r="9" class="wheel"/>`;
      }
      y += rowH;
    });
    return `<svg class="seatsvg" viewBox="0 0 170 ${H}" aria-hidden="true"><rect x="12" y="8" width="146" height="${H - 16}" rx="44" class="shell"/><rect x="26" y="26" width="118" height="22" rx="10" class="wind"/>${g}</svg>`;
  };



  /* ---------- live link between the rider and chauffeur apps (same browser: suite phones, tabs) ---------- */
  S.live = (() => {
    const fns = []; let ch = null; const me = Math.random().toString(36).slice(2);
    try { ch = new BroadcastChannel("saga-live"); ch.onmessage = e => { if (e.data && e.data.from !== me) fns.forEach(f => f(e.data)); }; } catch (e) {}
    addEventListener("storage", e => { if (e.key === "saga2.live" && e.newValue) { try { const d = JSON.parse(e.newValue); if (d.from !== me && !ch) fns.forEach(f => f(d)); } catch (_) {} } });
    return {
      send(t, data = {}) { const d = Object.assign({ t, from: me, at: Date.now() }, data); try { ch && ch.postMessage(d); } catch (e) {} try { localStorage.setItem("saga2.live", JSON.stringify(d)); } catch (e) {} },
      on(fn) { fns.push(fn); }
    };
  })();
  /* one shared chat log for the demo */
  S.chat = { get: () => S.get("chat", [{ who: "driver", k: "onway", at: "8:52" }]), add(m) { const c = S.chat.get(); c.push(m); S.put("chat", c.slice(-30)); return c; }, reset() { S.put("chat", [{ who: "driver", k: "onway", at: "8:52" }]); } };
  /* canned messages, written once, shown in each reader's language */
  S.MSG = {
    onway: ["I'm on my way. See you in a few minutes.", "నేను బయలుదేరాను. కొద్ది నిమిషాల్లో కలుస్తాను.", "मैं रास्ते में हूँ। कुछ मिनट में मिलते हैं।"],
    arrived: ["I've arrived at Gate 2.", "నేను గేట్ 2 వద్దకు వచ్చాను.", "मैं गेट 2 पर पहुँच गया हूँ।"],
    traffic: ["Slight traffic, 3 minutes more.", "కొంచెం ట్రాఫిక్, ఇంకో 3 నిమిషాలు.", "थोड़ा ट्रैफ़िक है, 3 मिनट और।"],
    gate: ["Which gate should I come to?", "ఏ గేట్ వద్దకు రావాలి?", "किस गेट पर आऊँ?"],
    coming: ["Coming down now.", "ఇప్పుడే కిందకు వస్తున్నాను.", "अभी नीचे आ रहा हूँ।"],
    atgate: ["I'm at Gate 2, near the park.", "నేను గేట్ 2 వద్ద, పార్క్ దగ్గర ఉన్నాను.", "मैं गेट 2 पर हूँ, पार्क के पास।"],
    bags: ["I have 2 bags, please help.", "నా దగ్గర 2 బ్యాగులు ఉన్నాయి, సాయం చేయండి.", "मेरे पास 2 बैग हैं, कृपया मदद करें।"],
    cooler: ["Could you make it a little cooler?", "AC కొంచెం పెంచగలరా?", "AC थोड़ा ठंडा कर देंगे?"],
    quiet: ["A quiet ride, please.", "నిశ్శబ్దంగా వెళ్దాం, దయచేసి.", "कृपया शांत सफ़र रखें।"],
    stop: ["Please stop here.", "దయచేసి ఇక్కడ ఆపండి.", "कृपया यहाँ रोकिए।"],
    sure: ["Sure, done.", "సరే, చేశాను.", "ठीक है, कर दिया।"]
  };
  S.msg = k => { const m = S.MSG[k]; return m ? S.L(m[0], m[1], m[2]) : k; };

  /* ---------- slide-to-confirm: for actions that cost money or matter for safety ---------- */
  S.slider = (label, attrs = "", cls = "") => `<div class="slide ${cls}" ${attrs} tabindex="0" role="button" aria-label="${label}"><span class="sl-fill"></span><span class="sl-txt">${label}</span><span class="sl-knob">${S.icon("arrowr")}</span></div>`;
  S.initSliders = (onDone) => {
    let drag = null;
    const set = (tr, x) => { const k = tr.querySelector(".sl-knob"), max = tr.offsetWidth - k.offsetWidth - 8; x = Math.max(0, Math.min(max, x)); k.style.transform = `translateX(${x}px)`; tr.querySelector(".sl-fill").style.width = x + 64 + "px"; return x / max; };
    const finish = tr => { tr.classList.add("done"); set(tr, 9999); tr.querySelector(".sl-knob").innerHTML = S.icon("check"); setTimeout(() => onDone(tr), 380); };
    document.addEventListener("pointerdown", e => { const k = e.target.closest(".sl-knob"); if (!k) return; const tr = k.parentElement; if (tr.classList.contains("done")) return; const r = tr.getBoundingClientRect(); drag = { tr, x0: e.clientX, z: r.width / tr.offsetWidth || 1 }; tr.classList.add("dragging"); try { k.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
    document.addEventListener("pointermove", e => { if (drag) drag.p = set(drag.tr, (e.clientX - drag.x0) / drag.z); });
    document.addEventListener("pointerup", () => { if (!drag) return; const { tr, p } = drag; drag = null; tr.classList.remove("dragging"); if (p > .82) finish(tr); else { set(tr, 0); } });
    document.addEventListener("click", e => { const tr = e.target.closest(".slide"); if (!tr || tr.classList.contains("done") || e.target.closest(".sl-knob")) return; tr.classList.remove("shake"); void tr.offsetWidth; tr.classList.add("shake"); });
    document.addEventListener("keydown", e => { const tr = e.target.closest && e.target.closest(".slide"); if (tr && (e.key === "Enter" || e.key === " ") && !tr.classList.contains("done")) { e.preventDefault(); finish(tr); } });
    S.completeSlider = finish;
  };
  /* count numbers up when a screen appears */
  S.countUp = root => root.querySelectorAll("[data-count]").forEach(el => { const to = +el.dataset.count, dec = (el.dataset.count.split(".")[1] || "").length, t0 = Date.now(), d = 900; const fmt = v => dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-IN"); const tick = () => { const p = Math.min(1, (Date.now() - t0) / d), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(to * e); if (p < 1) setTimeout(tick, 16); }; tick(); });
  /* stagger children of the entering screen */
  S.enter = el => { el.classList.add("enter"); el.querySelectorAll(".content>*").forEach((c, i) => c.style.setProperty("--i", Math.min(i, 10))); S.countUp(el); setTimeout(() => el.classList.remove("enter"), 2200); };

  /* ---------- voice engine (Web Speech API when present; scripted otherwise) ---------- */
  S.voice = {
    supported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    listen(lang, onText, onEnd, onErr) {
      const R = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!R) { onErr && onErr("unsupported"); return null; }
      const r = new R(); r.lang = (S.LANGS.find(l => l.id === lang) || S.LANGS[0]).sr; r.interimResults = true; r.maxAlternatives = 1;
      r.onresult = e => { const res = e.results[e.results.length - 1]; onText(res[0].transcript, res.isFinal); };
      r.onerror = e => onErr && onErr(e.error); r.onend = () => onEnd && onEnd();
      try { r.start(); } catch (e) { onErr && onErr("busy"); }
      return r;
    },
    say(text, lang) {
      try {
        if (!window.speechSynthesis) return;
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text), code = (S.LANGS.find(l => l.id === lang) || S.LANGS[0]).sr;
        u.lang = code; const v = speechSynthesis.getVoices().find(v => v.lang === code || v.lang.replace("_", "-").startsWith(code.slice(0, 2)));
        if (!v && lang !== "en") return; if (v) u.voice = v; u.rate = 1; speechSynthesis.speak(u);
      } catch (e) {}
    }
  };
  /* intent matcher shared by the rider app; keywords in English, Telugu and Hindi */
  S.INTENTS = [
    { id: "airport", k: ["airport", "flight", "pnr", "plane", "విమాన", "ఎయిర్‌పోర్ట్", "ఎయిర్ పోర్ట్", "ఫ్లైట్", "एयरपोर्ट", "हवाई", "फ्लाइट", "उड़ान", "विमान"] },
    { id: "schedule", k: ["schedule", "every day", "daily", "repeat", "weekday", "office every", "ప్రతి రోజు", "రోజూ", "షెడ్యూల్", "रोज़", "रोज", "हर दिन", "शेड्यूल"] },
    { id: "intercity", k: ["intercity", "outstation", "araku", "vizianagaram", "srikakulam", "rajahmundry", "kakinada", "అరకు", "విజయనగరం", "శ్రీకాకుళం", "వేరే ఊరు", "अरकू", "दूसरे शहर", "बाहर"] },
    { id: "call", k: ["call", "phone", "ఫోన్", "కాల్", "कॉल", "फ़ोन", "फोन"] },
    { id: "where", k: ["where is", "where's", "driver", "chauffeur", "my car", "డ్రైవర్", "ఎక్కడ", "ड्राइवर", "कहाँ है", "कहां है", "गाड़ी कहाँ"] },
    { id: "trips", k: ["my rides", "my trips", "trips", "bookings", "నా రైడ్", "నా ప్రయాణ", "मेरी राइड", "मेरी बुकिंग", "मेरे सफ़र"] },
    { id: "offers", k: ["offer", "discount", "coupon", "points", "ఆఫర్", "డిస్కౌంట్", "ऑफ़र", "ऑफर", "छूट", "कूपन"] },
    { id: "dark", k: ["dark", "night mode", "డార్క్", "చీకటి", "डार्क", "अंधेरा"] },
    { id: "light", k: ["light mode", "bright", "లైట్", "लाइट मोड"] },
    { id: "te", k: ["telugu", "తెలుగు"] }, { id: "hi", k: ["hindi", "हिंदी", "हिन्दी"] }, { id: "en", k: ["english", "ఇంగ్లీష్", "अंग्रेज़ी", "इंग्लिश"] },
    { id: "ride", k: ["ride", "book", "take me", "go to", "cab", "taxi", "వెళ్ళాలి", "వెళ్లాలి", "బుక్", "రైడ్", "जाना", "बुक", "ले चलो", "राइड", "गाड़ी"] },
    { id: "help", k: ["help", "what can you", "సహాయం", "मदद"] }
  ];
  S.matchIntent = text => {
    const t = String(text || "").toLowerCase();
    const hit = S.INTENTS.find(i => i.k.some(k => t.includes(k)));
    return hit ? hit.id : "unknown";
  };

  S.apply();
})();
