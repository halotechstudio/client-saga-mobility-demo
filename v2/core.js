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
        ? { bg: "#000000", surface: "#0D0E14", surface2: "#16171F", surface3: "#20222C", fg: "#F4F5FA", fg2: "#A7ACC0", fg3: "#6D7186", hair: "#1E2029" }
        : { bg: T(.925, .012), surface: "#FFFFFF", surface2: T(.895, .016), surface3: T(.85, .02), fg: T(.18, .012), fg2: T(.4, .016), fg3: T(.58, .016), hair: T(.83, .012) };
    } else {
      t = dark
        ? { bg: "#000000", surface: "#0D0E14", surface2: "#16171F", surface3: "#20222C", fg: "#F4F5FA", fg2: "#A7ACC0", fg3: "#6D7186", hair: "#1E2029" }
        : { bg: "#F2F3F7", surface: "#FFFFFF", surface2: "#E9EBF2", surface3: "#DCDFEA", fg: "#0A0E21", fg2: "#4B5170", fg3: "#7C819A", hair: "#D9DCE6" };
    }
    const accent = dark ? okHex(Math.min(Math.max(L, .62), .7), Math.max(C, .17), H) : hex;
    Object.assign(t, {
      accent, onAccent: onColor(accent),
      accentInk: dark ? okHex(Math.max(L, .78), Math.min(C, .14), H) : (L > .55 ? okHex(.48, C, H) : hex),
      accentSoft: dark ? okHex(.3, Math.min(C, .08), H) : okHex(.945, Math.min(C, .045), H),
      onAccentSoft: dark ? okHex(.9, Math.min(C, .07), H) : okHex(.34, Math.min(C, .16), H),
      success: dark ? "#3DD68C" : "#0F8A4F", warning: dark ? "#F5B53D" : "#A86200", danger: dark ? "#FF6B61" : "#C8261B",
      stage: "#000000", stage2: "#0D0E14", glow: "#2CC8F5", glowSoft: dark ? "rgba(44,200,245,.18)" : "rgba(44,200,245,.22)", tertiary: dark ? "#FFB37A" : "#8F4700", neon: "#4BE36B", onStage: "#F4F4F6", onStage2: "#A9ABB3",
      glass: dark ? "rgba(18,19,27,.62)" : "rgba(255,255,255,.66)",
      glassLine: dark ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.85)",
      glass2: dark ? "rgba(24,25,34,.56)" : "rgba(255,255,255,.56)", glassHi: dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.95)",
      ink: dark ? "#16171F" : "#0A0E21", onInk: "#F5F5F7", onInk2: "#9A9CA5",
      shadow: dark ? "0 10px 30px rgba(0,0,0,.5)" : "0 10px 30px rgba(15,18,30,.10)",
      mapLand: dark ? "#0B0C10" : (os === "android" ? T(.965, .006) : "#F3F2EF"),
      mapBlock: dark ? "#101116" : (os === "android" ? T(.945, .008) : "#ECEAE6"),
      mapWater: dark ? "#0A1324" : okHex(.88, .045, H),
      mapPark: dark ? "#0D1512" : "#DCEAD6",
      mapRoad: dark ? "#1C1E26" : "#FFFFFF",
      mapCase: dark ? "#08090C" : "#E1DED8",
      mapMajor: dark ? "#2A2D38" : "#FFFFFF",
      mapMajorCase: dark ? "#08090C" : "#CFCBC4",
      mapLabel: dark ? "#7A7F93" : "#62666F",
      mapSand: dark ? "#16140F" : "#EFE6D2"
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

  /* SAGA logo: traced from the client's artwork (brand/client/saga-logo-dark-src.jpg), one path per colour.
     Letters use currentColor (white on dark, navy on light); the mark keeps the client's cyan, green and blue. */
  const LG = {"s":"M86.6 23.8Q90.1 23 95.1 22.7Q100 22.4 132.5 22.4Q165 22.4 167 22.5Q169 22.6 170.2 23.3L171.5 24L171.9 26.5Q172.4 29 172.2 36Q172 43 171.6 44.5L171.2 46L170.1 46.6Q169 47.3 166 47.9Q163 48.5 152.5 48.1Q142 47.8 134.5 48.1Q127 48.5 110 48.5Q93 48.5 91 48.8Q89 49.1 86 50.3Q83 51.5 80.1 53.3Q77.2 55 74.6 57.6Q72 60.2 70.3 63.1Q68.5 66 67.3 69Q66.1 72 65.9 78.5Q65.8 85 67.2 89.5Q68.5 94 70.8 97.4Q73 100.9 77 104Q81 107.2 84.5 108.9Q88 110.5 95 111.4Q102 112.3 110 112.1Q118 111.9 119.5 112.2Q121 112.4 136 112.5L151 112.6L151.5 113Q152 113.4 156.5 114.1Q161 114.7 162.5 115.5Q164 116.3 165 116.4Q166 116.5 167.5 117.5Q169 118.4 170 118.5Q171 118.6 176.5 122.1Q182 125.7 185.2 128.8Q188.4 132 190.4 134.5Q192.4 137 193.9 139.5Q195.4 142 197.5 146.5Q199.5 151 200.4 154Q201.2 157 201.7 160.5Q202.1 164 202.2 168.5Q202.3 173 201.9 177.5Q201.5 182 200.8 183Q200.2 184 199.8 186.5Q199.4 189 197.5 193Q195.5 197 192.4 201.5Q189.3 206 185.6 209.7Q182 213.4 177.5 216.3Q173 219.1 169.5 220.8Q166 222.5 161 223.9Q156 225.3 151.5 225.9Q147 226.4 101.5 226.5Q56 226.6 54.5 227.5Q53 228.3 52 229.7L51 231L51.2 235Q51.5 239 50.9 240.5L50.3 242L49.6 242.4Q49 242.7 47.5 242.6Q46 242.4 29 230.3Q12 218.2 11.1 217.1Q10.3 216 10 215Q9.7 214 10 213Q10.3 212 11.7 210.5Q13 209 29 197.4Q45 185.7 47 185.4L49 185.1L50.2 186.1L51.3 187L51.4 192.5Q51.5 198 52.3 199.2Q53 200.3 55 201.2Q57 202.1 95.5 202.1Q134 202.1 142 201.7Q150 201.3 155 199.8Q160 198.2 163.5 195.7Q167 193.2 170.2 189.1Q173.4 185 174.3 183Q175.3 181 175.4 179.5Q175.6 178 176 177Q176.5 176 176.9 171.5Q177.4 167 175.9 161.5Q174.4 156 173.1 153.5Q171.7 151 169.4 148.3Q167 145.7 165 144.2Q163 142.7 158.5 140.6Q154 138.5 151.5 138.1Q149 137.7 120.5 137.1Q92 136.5 89 135.6Q86 134.8 83.5 134.6Q81 134.4 76 132.4Q71 130.4 66.5 127.4Q62 124.4 56.9 119.2Q51.7 114 49.2 110Q46.6 106 45.6 104Q44.5 102 43 97Q41.5 92 41 88.5Q40.5 85 40.5 80.5Q40.5 76 41 71.5Q41.5 67 43.5 61.5Q45.5 56 46.5 54Q47.6 52 51.6 46.5Q55.7 41 59.9 37.5Q64 33.9 66.5 32.2Q69 30.6 73 28.6Q77 26.7 80 25.7Q83 24.6 86.6 23.8Z","sq":"M186.5 12.3Q188 12 190.5 11.7Q193 11.4 205 11.2Q217 11.1 219 11.7Q221 12.4 222.8 13.7Q224.6 15 225.6 17Q226.6 19 227 21.5Q227.5 24 227.4 35Q227.3 46 226.6 50L226 54L223.5 55.8Q221 57.6 218 58Q215 58.4 203.5 58.4Q192 58.4 188.5 58.2L185 58L184.4 57.5Q183.9 57 183.6 56Q183.3 55 182.2 54L181.1 53L180.7 51Q180.2 49 180 36Q179.8 23 180.4 20.5Q181 18 182.3 16Q183.5 14 184.3 13.3Q185 12.6 186.5 12.3ZM197.5 22.2Q202 22 208 22Q214 22.1 215.2 22.5L216.3 23L216.6 23.5Q216.8 24 217 31Q217.3 38 216.9 41.5Q216.5 45 215.7 46.5L215 48L205.5 48.1Q196 48.3 194.5 47.9Q193 47.5 192.1 46.8L191.2 46L190.9 41.5Q190.6 37 190.8 30.5Q191 24 191.3 23.5L191.6 23L192.3 22.7Q193 22.5 197.5 22.2Z","a1":"M430 43.8Q433.9 43 438 42.8Q442 42.6 445 43Q448 43.5 451 44.5Q454 45.5 457 47.8Q460 50 462.3 52.5Q464.5 55 489.5 96.5Q514.5 138 519.9 146.5Q525.3 155 526 156.5Q526.6 158 537 175Q547.5 192 547.5 192.5Q547.5 193 550 196.5Q552.5 200 553.5 202.5L554.5 205L553.8 206.2Q553 207.5 552 207.9Q551 208.3 547 207.9Q543 207.6 539.5 207.9Q536 208.1 532 207.9Q528 207.7 525.5 208Q523 208.4 521 207.9Q519 207.5 517.3 206.3Q515.7 205 510.6 197Q505.5 189 504 186Q502.5 183 501.6 182Q500.8 181 496.1 173Q491.5 165 490 163Q488.5 161 488.5 160.5Q488.5 160 482.5 150.5Q476.5 141 476.4 140.5Q476.4 140 472.5 134Q468.5 128 459.5 112.5Q450.4 97 446.4 91Q442.4 85 440.7 84L439 82.9L437.5 83.4Q436 83.9 434 85.3Q432 86.8 430.4 88.9Q428.7 91 422.1 102.5Q415.5 114 405 130.5Q394.6 147 378 174.5Q361.4 202 359.8 204Q358.3 206 357.1 206.7Q356 207.3 353.5 207.9Q351 208.4 347 208Q343 207.6 334 207.9Q325 208.2 323.5 207.9Q322 207.5 320.8 206.8L319.6 206L320.1 204.5Q320.5 203 323 198.5Q325.6 194 355.5 146.5Q385.4 99 398.5 77.5Q411.6 56 414.1 53Q416.6 50 418.3 48.8Q420 47.6 423 46.1Q426 44.7 430 43.8Z","g":"M734.9 45.3Q740.8 45 799.9 44.8Q859 44.5 861 45Q863 45.5 864.2 46.8L865.4 48L865.4 60L865.5 72L864.3 73.8L863 75.5L861.5 75.9Q860 76.4 797.5 76.4Q735 76.5 728.5 78.1Q722 79.7 717 82.6Q712 85.6 709.3 88.3Q706.5 91 705 93Q703.5 95 701.5 99Q699.5 103 697.5 111Q695.5 119 695.5 128Q695.5 137 696 140Q696.6 143 698.1 148Q699.7 153 701.2 156Q702.7 159 704.1 161Q705.5 163 708.8 166.3Q712 169.5 714.5 171Q717 172.5 719.5 173.5Q722 174.5 726 175.5Q730 176.5 735 176.9Q740 177.3 773.5 177.4Q807 177.4 813 176.9Q819 176.5 821 176Q823 175.5 823.5 175.1Q824 174.7 825 174.5Q826 174.4 827.5 173.1Q829 171.9 830.2 170.5Q831.5 169 832.5 167Q833.4 165 833.9 162Q834.4 159 834.4 152.5L834.4 146L832.7 144.4L831 142.7L830 142.6Q829 142.5 802.5 142.5Q776 142.5 771.5 142.9Q767 143.3 765 142.9Q763 142.5 761.8 141.2L760.5 140L760.5 128.5Q760.5 117 761 116Q761.5 115 762.8 114.3Q764 113.5 766 113.4Q768 113.2 809 113.4Q850 113.5 854.5 113.2Q859 112.9 862 113.2Q865 113.6 866 114.3Q867.1 115 867.8 116.5Q868.5 118 868.4 138Q868.3 158 867.9 162.5Q867.4 167 866.5 171.5Q865.5 176 863.5 180.5Q861.5 185 860 187.5Q858.4 190 854.2 194.1Q850 198.3 847.5 199.9Q845 201.5 841.5 203Q838 204.5 834.5 205.5Q831 206.5 827 206.9Q823 207.3 781.5 207.4Q740 207.5 731 207Q722 206.5 715 205Q708 203.5 702 200.9Q696 198.4 690 193.9Q684 189.5 679.9 184.7Q675.7 180 672.8 175Q669.8 170 667.8 165Q665.7 160 663.7 152Q661.7 144 661.2 139Q660.7 134 660.6 129Q660.5 124 661.1 117.5Q661.7 111 662.1 110.5Q662.4 110 662.5 108.5Q662.6 107 663.6 103Q664.7 99 666.6 94Q668.5 89 671.1 84Q673.7 79 676.6 75Q679.5 71 683.8 66.8Q688 62.6 691.5 60Q695 57.5 700.5 54.6Q706 51.6 712 49.6Q718 47.6 723.5 46.6Q729 45.6 734.9 45.3Z","a2":"M1094.2 43.8Q1098.3 43 1102.2 42.9Q1106 42.7 1109 43.1Q1112 43.5 1115 44.5Q1118 45.5 1121 47.6Q1124 49.7 1126.3 52.4Q1128.5 55 1172.4 128Q1216.3 201 1216.9 202.5Q1217.5 204 1217.3 205.3L1217 206.5L1214 207.5Q1211 208.5 1205 208Q1199 207.5 1192.5 208Q1186 208.5 1184 207.9Q1182 207.4 1180.5 206Q1179 204.6 1177.9 203.3Q1176.7 202 1176.1 200.5Q1175.4 199 1170 190.5Q1164.6 182 1158.1 170.5Q1151.5 159 1150 157Q1148.5 155 1148.5 154.5Q1148.4 154 1137.9 136.5Q1127.3 119 1117.9 104Q1108.5 89 1108.5 88.5Q1108.4 88 1107.2 86.4Q1106 84.7 1104 83.8L1102 82.8L1100.5 83.3Q1099 83.7 1096.3 86.4Q1093.6 89 1083.1 107Q1072.5 125 1063 139.5Q1053.5 154 1048 163.5Q1042.4 173 1040 176.5Q1037.6 180 1037.5 180.5Q1037.5 181 1035.1 184.5Q1032.6 188 1030 193Q1027.4 198 1024.9 201.5Q1022.4 205 1020.7 206.3Q1019 207.5 1017 207.8Q1015 208 1002 208.2Q989 208.3 987 207.9Q985 207.4 984.3 206.7L983.5 206L983.6 205Q983.6 204 984.1 203Q984.6 202 996.1 184Q1007.5 166 1011.6 159Q1015.7 152 1019.1 147Q1022.5 142 1024 139Q1025.6 136 1026.5 135Q1027.4 134 1027.4 133.5Q1027.5 133 1051.1 95Q1074.6 57 1077.8 53.3Q1081 49.5 1083 48.1Q1085 46.7 1087.5 45.7Q1090 44.6 1094.2 43.8Z","d1":"M434 155.8Q438 155 440.9 155.5Q443.8 156 446.9 157.4Q450 158.7 451.5 159.9Q453 161.1 455.2 164.1Q457.4 167 458.4 171Q459.4 175 458.9 179Q458.3 183 456.9 186Q455.4 189 451.7 192Q448 195.1 445.5 196.1Q443 197.1 441 197.4Q439 197.6 434.5 196.9Q430 196.2 427.1 194.6Q424.2 193 421.5 189.5Q418.8 186 417.8 183Q416.8 180 416.7 178.5Q416.7 177 417.2 173Q417.6 169 418.7 167Q419.7 165 421.3 163Q422.9 161 426.4 158.8Q430 156.6 434 155.8Z","d2":"M1094.3 156.4Q1095.6 156 1099.3 155.6Q1103 155.3 1106.5 155.9Q1110 156.5 1112.7 158.2Q1115.4 160 1118.3 163.5Q1121.3 167 1122.2 171Q1123.2 175 1122.7 178.5Q1122.2 182 1120 186Q1117.7 190 1113.8 193.1Q1110 196.3 1106 196.9Q1102 197.6 1099.5 197.4Q1097 197.1 1094.5 196.3Q1092 195.4 1091 194.8Q1090 194.3 1087 191.4Q1084 188.5 1082.5 185.2Q1081 182 1080.8 177.5Q1080.6 173 1081.1 170.5Q1081.6 168 1082.2 167Q1082.8 166 1084.9 163.3Q1087 160.6 1090 158.7Q1093 156.9 1094.3 156.4Z"};
  S.logoSvg = (cls = "") => `<svg class="wordmark logo-svg ${cls}" viewBox="6 8 1216 238" role="img" aria-label="SAGA"><g class="lg-mark"><path class="lg-s" fill="#18D2F5" d="${LG.s}"/><path class="lg-sq" fill="#3BEA68" fill-rule="evenodd" d="${LG.sq}"/></g><g class="lg-word" fill="currentColor"><path class="lg-a1" d="${LG.a1}"/><path class="lg-g" d="${LG.g}"/><path class="lg-a2" d="${LG.a2}"/></g><g class="lg-dots" fill="#18B8F3"><path class="lg-d1" d="${LG.d1}"/><path class="lg-d2" d="${LG.d2}"/></g></svg>`;
  S.logoMark = (cls = "") => `<svg class="logo-mark ${cls}" viewBox="6 8 224 238" role="img" aria-label="SAGA"><path fill="#18D2F5" d="${LG.s}"/><path fill="#3BEA68" fill-rule="evenodd" d="${LG.sq}"/></svg>`;
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
    // the real car seen from above (Cycles render), nose up; free cars get a soft brand glow
    const mine = kind === "me" || kind === "free";
    return `<g class="m-car ${mine ? "m-car-me" : ""} ${kind === "busy" ? "m-car-busy" : ""}" transform="translate(${x} ${y}) rotate(${ang})">
      ${mine ? `<ellipse rx="15" ry="22" fill="#7C89FF" opacity=".75" style="filter:blur(5px)"/>` : ""}<image href="assets/render/top-down.webp" x="-16" y="-16" width="32" height="32" ${kind === "busy" ? 'opacity=".55"' : ""}/></g>`;
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
  S.car = (o = {}) => `<img class="carimg ${o.cls || ""}" src="assets/render/cut-side.webp" alt="SAGA Luxe" draggable="false" loading="lazy">`;
  S.carSvg = function (o = {}) {
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
