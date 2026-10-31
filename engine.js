/* US Alpha Mobile — μηχανή ανάλυσης (Web Worker). Τρέχει ολόκληρη μέσα στο τηλέφωνο:
   διαβάζει τις ημερήσιες τιμές όλης της αγοράς από το IndexedDB, υπολογίζει δείκτες, βαθμολογίες,
   setups με stop/στόχους, και εκπαιδεύει/ελέγχει ένα μοντέλο κατάταξης με walk-forward.
   Κανόνας: καμία τιμή στη μέρα t δεν χρησιμοποιεί δεδομένα μετά το t (χωρίς look-ahead). */
"use strict";

const DB_NAME = "usalpha-mobile", DB_VER = 1;
const MARKET = ["SPY", "QQQ", "DIA", "IWM"];
const SECTOR_ETF = { "Τεχνολογία": "XLK", "Χρηματοοικονομικά": "XLF", "Ενέργεια": "XLE", "Υγεία": "XLV", "Βιομηχανία": "XLI",
  "Καταναλωτικά (κυκλικά)": "XLY", "Καταναλωτικά (βασικά)": "XLP", "Κοινή ωφέλεια": "XLU", "Πρώτες ύλες": "XLB",
  "Ακίνητα": "XLRE", "Επικοινωνίες": "XLC", "Ημιαγωγοί": "SMH", "Βιοτεχνολογία": "XBI" };
const COST = 0.002;           // 2 × 10 μονάδες βάσης (είσοδος + έξοδος)
const MIN_DV_UNIVERSE = 1e6;  // ελάχιστος μέσος ημερήσιος τζίρος για το σύμπαν
const MIN_DV_SIGNAL = 5e6;    // ελάχιστος τζίρος για να προταθεί signal
const MIN_RR = 1.8;
const MAX_UNIVERSE = 5000;
const HORIZONS = {
  short: { label: "1–5 ημέρες", holding: "1-5 ημέρες", maxDays: 5, stopAtr: 1.2 },
  swing: { label: "Swing", holding: "1-6 εβδομάδες", maxDays: 25, stopAtr: 2.0 },
};
const GATES = { short: { score: 55, tech: 58, support: 3, need: ["volume"], independent: false },
  swing: { score: 58, tech: 52, support: 3, need: [], independent: true } };
const CAT_LABELS = { ml: "Μοντέλο", trend: "Τάση", momentum: "Momentum", volume: "Όγκος", relative: "Σχετική δύναμη",
  fundamentals: "Θεμελιώδη", news: "Ειδήσεις", sector: "Κλάδος", market: "Αγορά" };
const WEIGHTS = { ml: 0.30, technical: 0.20, momentum: 0.15, fundamentals: 0.10, news: 0.08, market: 0.07, risk: 0.10 };
const COMP_LABELS = { ml: "Μοντέλο πρόβλεψης", technical: "Τεχνική ανάλυση", momentum: "Momentum και όγκος",
  fundamentals: "Θεμελιώδη", news: "Ειδήσεις", market: "Συνθήκες αγοράς", risk: "Αξιολόγηση κινδύνου" };
const MODEL_H = { rank5: 5, rank21: 21 };
const FEATS = ["ret1", "ret5", "ret21", "ret63", "ret126", "vol21", "atrp", "rsi", "dhi", "dlo", "c50", "c200", "s50_200",
  "rvol", "ldv", "gap", "clv", "macdn", "bbpos", "udv", "ex21", "ex63", "dd21", "adx"];
const FEAT_LABELS = { ret1: "Κίνηση σήμερα", ret5: "Απόδοση εβδομάδας", ret21: "Απόδοση μήνα", ret63: "Απόδοση 3 μηνών",
  ret126: "Απόδοση 6 μηνών", vol21: "Μεταβλητότητα μήνα", atrp: "Ημερήσια διακύμανση (ATR%)", rsi: "RSI", dhi: "Απόσταση από υψηλό έτους",
  dlo: "Απόσταση από χαμηλό έτους", c50: "Τιμή vs ΚΜΟ 50", c200: "Τιμή vs ΚΜΟ 200", s50_200: "ΚΜΟ 50 vs ΚΜΟ 200", rvol: "Όγκος vs μέσο",
  ldv: "Τζίρος (μέγεθος)", gap: "Gap ανοίγματος", clv: "Θέση κλεισίματος στη μέρα", macdn: "MACD", bbpos: "Θέση στις Bollinger",
  udv: "Όγκος ανόδου vs πτώσης", ex21: "Υπεραπόδοση vs S&P (μήνας)", ex63: "Υπεραπόδοση vs S&P (3 μήνες)", dd21: "Μέγιστη πτώση μήνα", adx: "Δύναμη τάσης (ADX)" };

// ================================================================== IndexedDB
let _db = null;
function idb() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains("days")) d.createObjectStore("days", { keyPath: "d" });
      if (!d.objectStoreNames.contains("kv")) d.createObjectStore("kv");
      if (!d.objectStoreNames.contains("cache")) d.createObjectStore("cache");
    };
    r.onsuccess = () => { _db = r.result; res(_db); };
    r.onerror = () => rej(r.error);
  });
}
async function kvGet(k) { const d = await idb(); return new Promise((res) => { const q = d.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); }
async function kvSet(k, v) { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
async function allDays() { const d = await idb(); return new Promise((res) => { const q = d.transaction("days").objectStore("days").getAll(); q.onsuccess = () => res((q.result || []).filter((x) => x.n > 0).sort((a, b) => (a.d < b.d ? -1 : 1))); q.onerror = () => res([]); }); }

// ================================================================== βοηθητικά
const NaNf = NaN;
const isF = (v) => typeof v === "number" && isFinite(v);
const clip = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const r2 = (v, d = 2) => (isF(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
function emaArr(src, n) { const o = new Float64Array(src.length).fill(NaN); const a = 2 / (n + 1); let s = NaN, cnt = 0, sum = 0;
  for (let i = 0; i < src.length; i++) { const v = src[i]; if (!isF(v)) { o[i] = s; continue; }
    if (cnt < n) { sum += v; cnt++; if (cnt === n) { s = sum / n; o[i] = s; } } else { s = a * v + (1 - a) * s; o[i] = s; } } return o; }
function smaArr(src, n) { const o = new Float64Array(src.length).fill(NaN); let sum = 0;
  for (let i = 0; i < src.length; i++) { sum += src[i]; if (i >= n) sum -= src[i - n]; if (i >= n - 1) o[i] = sum / n; } return o; }
function wilderArr(src, n) { const o = new Float64Array(src.length).fill(NaN); let s = NaN, cnt = 0, sum = 0;
  for (let i = 0; i < src.length; i++) { const v = src[i]; if (!isF(v)) { o[i] = s; continue; }
    if (cnt < n) { sum += v; cnt++; if (cnt === n) { s = sum / n; o[i] = s; } } else { s = s + (v - s) / n; o[i] = s; } } return o; }
function stdArr(src, n) { const o = new Float64Array(src.length).fill(NaN); let s = 0, s2 = 0;
  for (let i = 0; i < src.length; i++) { const v = src[i]; s += v; s2 += v * v; if (i >= n) { s -= src[i - n]; s2 -= src[i - n] * src[i - n]; }
    if (i >= n - 1) { const m = s / n; o[i] = Math.sqrt(Math.max(0, s2 / n - m * m)); } } return o; }
/* κυλιόμενο max/min σε O(n) (μονοτονική ουρά). Παράθυρο [i-shift-n+1, i-shift], τουλάχιστον minP τιμές. */
function rollExt(src, n, shift, minP, isMax) {
  const L = src.length, o = new Float64Array(L).fill(NaN), q = new Int32Array(L); let head = 0, tail = 0;
  for (let i = 0; i < L; i++) {
    const r = i - shift; if (r < 0) continue;
    const v = src[r];
    while (tail > head && (isMax ? src[q[tail - 1]] <= v : src[q[tail - 1]] >= v)) tail--;
    q[tail++] = r;
    const lo = r - n + 1; while (q[head] < lo) head++;
    if (r + 1 >= minP) o[i] = src[q[head]];
  }
  return o;
}
const rollMax = (src, n, shift = 0, minP = n) => rollExt(src, n, shift, minP, true);
const rollMin = (src, n, shift = 0, minP = n) => rollExt(src, n, shift, minP, false);

/* Όλοι οι δείκτες για μία μετοχή (πυκνή σειρά χωρίς κενά). */
function indicators(S) {
  const { o, h, l, c, v } = S, n = c.length;
  const X = { n };
  X.ema9 = emaArr(c, 9); X.ema20 = emaArr(c, 20); X.ema50 = emaArr(c, 50); X.ema200 = emaArr(c, 200);
  X.sma20 = smaArr(c, 20); X.sma50 = smaArr(c, 50); X.sma100 = smaArr(c, 100); X.sma200 = smaArr(c, 200);
  const up = new Float64Array(n), dn = new Float64Array(n), tr = new Float64Array(n), pdm = new Float64Array(n), mdm = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const d = c[i] - c[i - 1]; up[i] = d > 0 ? d : 0; dn[i] = d < 0 ? -d : 0;
    tr[i] = Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
    const u = h[i] - h[i - 1], dd = l[i - 1] - l[i];
    pdm[i] = u > dd && u > 0 ? u : 0; mdm[i] = dd > u && dd > 0 ? dd : 0;
  }
  if (n) tr[0] = h[0] - l[0];
  up[0] = NaN; dn[0] = NaN; pdm[0] = NaN; mdm[0] = NaN;
  const au = wilderArr(up, 14), ad = wilderArr(dn, 14);
  X.rsi = new Float64Array(n).fill(NaN);
  for (let i = 0; i < n; i++) if (isF(au[i]) && isF(ad[i])) X.rsi[i] = ad[i] === 0 ? 100 : 100 - 100 / (1 + au[i] / ad[i]);
  const e12 = emaArr(c, 12), e26 = emaArr(c, 26);
  X.macd = new Float64Array(n).fill(NaN); for (let i = 0; i < n; i++) X.macd[i] = e12[i] - e26[i];
  X.macdSig = emaArr(X.macd, 9);
  X.macdHist = new Float64Array(n); for (let i = 0; i < n; i++) X.macdHist[i] = X.macd[i] - X.macdSig[i];
  const sd20 = stdArr(c, 20);
  X.bbUp = new Float64Array(n); X.bbLo = new Float64Array(n); X.bbW = new Float64Array(n);
  for (let i = 0; i < n; i++) { X.bbUp[i] = X.sma20[i] + 2 * sd20[i]; X.bbLo[i] = X.sma20[i] - 2 * sd20[i]; X.bbW[i] = (X.bbUp[i] - X.bbLo[i]) / X.sma20[i]; }
  X.atr = wilderArr(tr, 14);
  const trs = wilderArr(tr.map((x, i) => (i ? x : NaN)), 14), pdi = wilderArr(pdm, 14), mdi = wilderArr(mdm, 14);
  X.pdi = new Float64Array(n).fill(NaN); X.mdi = new Float64Array(n).fill(NaN); const dx = new Float64Array(n).fill(NaN);
  for (let i = 0; i < n; i++) { if (!isF(trs[i]) || trs[i] === 0) continue; X.pdi[i] = 100 * pdi[i] / trs[i]; X.mdi[i] = 100 * mdi[i] / trs[i];
    const s = X.pdi[i] + X.mdi[i]; dx[i] = s ? 100 * Math.abs(X.pdi[i] - X.mdi[i]) / s : NaN; }
  X.adx = wilderArr(dx, 14);
  // stoch RSI
  X.stK = new Float64Array(n).fill(NaN); X.stD = new Float64Array(n).fill(NaN); const st = new Float64Array(n).fill(NaN);
  for (let i = 13; i < n; i++) { let lo = Infinity, hi = -Infinity, ok = true; for (let j = i - 13; j <= i; j++) { const r = X.rsi[j]; if (!isF(r)) { ok = false; break; } if (r < lo) lo = r; if (r > hi) hi = r; }
    if (ok && hi > lo) st[i] = 100 * (X.rsi[i] - lo) / (hi - lo); }
  for (let i = 2; i < n; i++) { if (isF(st[i]) && isF(st[i - 1]) && isF(st[i - 2])) X.stK[i] = (st[i] + st[i - 1] + st[i - 2]) / 3; }
  for (let i = 2; i < n; i++) { if (isF(X.stK[i]) && isF(X.stK[i - 1]) && isF(X.stK[i - 2])) X.stD[i] = (X.stK[i] + X.stK[i - 1] + X.stK[i - 2]) / 3; }
  // VWAP 20, όγκοι, υψηλά/χαμηλά
  X.vwap20 = new Float64Array(n).fill(NaN); X.volAvg20 = new Float64Array(n).fill(NaN); X.rvol = new Float64Array(n).fill(NaN); X.dv20 = new Float64Array(n).fill(NaN);
  let spv = 0, sv = 0;
  for (let i = 0; i < n; i++) { const tp = (h[i] + l[i] + c[i]) / 3; spv += tp * v[i]; sv += v[i]; if (i >= 20) { const k = i - 20; spv -= ((h[k] + l[k] + c[k]) / 3) * v[k]; sv -= v[k]; } if (i >= 19 && sv > 0) X.vwap20[i] = spv / sv; }
  let s1 = 0, s2 = 0;
  for (let i = 1; i < n; i++) { s1 += v[i - 1]; s2 += v[i - 1] * c[i - 1]; if (i > 20) { s1 -= v[i - 21]; s2 -= v[i - 21] * c[i - 21]; }
    const k = Math.min(i, 20); if (k >= 10) { X.volAvg20[i] = s1 / k; X.dv20[i] = s2 / k; X.rvol[i] = X.volAvg20[i] > 0 ? v[i] / X.volAvg20[i] : NaN; } }
  X.hi20 = rollMax(h, 20, 1); X.lo20 = rollMin(l, 20, 1); X.hi55 = rollMax(h, 55, 1);
  X.hi252 = rollMax(h, 252, 0, 60); X.lo252 = rollMin(l, 252, 0, 60);
  const ret = (k) => { const r = new Float64Array(n).fill(NaN); for (let i = k; i < n; i++) r[i] = c[i] / c[i - k] - 1; return r; };
  X.ret1 = ret(1); X.ret5 = ret(5); X.ret21 = ret(21); X.ret63 = ret(63); X.ret126 = ret(126);
  X.vol21 = new Float64Array(n).fill(NaN);
  { let s = 0, q = 0; for (let i = 1; i < n; i++) { const r = X.ret1[i]; s += r; q += r * r; if (i > 21) { const k = X.ret1[i - 21]; s -= k; q -= k * k; } if (i >= 21) { const m = s / 21; X.vol21[i] = Math.sqrt(Math.max(0, q / 21 - m * m)) * Math.sqrt(252) * 100; } } }
  X.gap = new Float64Array(n).fill(NaN); for (let i = 1; i < n; i++) X.gap[i] = o[i] / c[i - 1] - 1;
  return X;
}

function recentCross(a, b, i, within) {
  if (i < within + 1) return null;
  let prev = null, changedUp = false, changedDn = false;
  for (let j = i - within; j <= i; j++) { const d = a[j] - b[j]; if (!isF(d)) continue; const s = Math.sign(d);
    if (prev !== null && s !== prev) { if (s > 0) changedUp = true; else if (s < 0) changedDn = true; } prev = s; }
  const last = Math.sign(a[i] - b[i]);
  if (changedUp && last > 0) return "up";
  if (changedDn && last < 0) return "down";
  return null;
}

function swings(h, l, from, to, k = 3) {
  const hi = [], lo = [];
  for (let i = from + k; i <= to - k; i++) {
    let isH = true, isL = true;
    for (let j = i - k; j <= i + k; j++) { if (h[j] > h[i]) isH = false; if (l[j] < l[i]) isL = false; }
    if (isH) hi.push(i); if (isL) lo.push(i);
  }
  return { hi, lo };
}
function supportResistance(S, X, i, lookback = 180) {
  const from = Math.max(0, i - lookback + 1);
  if (i - from < 30) return [];
  const { hi, lo } = swings(S.h, S.l, from, i);
  const pts = hi.map((j) => S.h[j]).concat(lo.map((j) => S.l[j])).sort((a, b) => a - b);
  if (!pts.length) return [];
  const price = S.c[i], a = isF(X.atr[i]) ? X.atr[i] : price * 0.02;
  const tol = Math.max(a * 0.5, price * 0.004);
  const cl = [];
  for (const p of pts) { const last = cl[cl.length - 1]; if (last && Math.abs(p - last.reduce((s, x) => s + x, 0) / last.length) <= tol) last.push(p); else cl.push([p]); }
  const lv = cl.map((c) => { const m = c.reduce((s, x) => s + x, 0) / c.length; return { price: r2(m, 4), touches: c.length, type: m > price ? "resistance" : "support" }; });
  lv.sort((a, b) => b.touches - a.touches || Math.abs(a.price - price) - Math.abs(b.price - price));
  return lv.slice(0, 6).sort((a, b) => a.price - b.price);
}
function divergences(S, X, i, lookback = 60, k = 3) {
  const from = Math.max(0, i - lookback - 2 * k), to = i - k;
  if (to - from < 2 * k + 3) return [];
  const { hi, lo } = swings(S.h, S.l, from, i);
  const H = hi.filter((j) => j <= to), L = lo.filter((j) => j <= to), out = [];
  if (L.length >= 2) { const [a, b] = L.slice(-2); if (S.l[b] < S.l[a] && X.rsi[b] > X.rsi[a] && X.rsi[b] < 45) out.push({ type: "bullish", text: `Bullish divergence: νέο χαμηλό τιμής αλλά RSI υψηλότερα (${X.rsi[a].toFixed(0)}→${X.rsi[b].toFixed(0)})` }); }
  if (H.length >= 2) { const [a, b] = H.slice(-2); if (S.h[b] > S.h[a] && X.rsi[b] < X.rsi[a] && X.rsi[a] > 60) out.push({ type: "bearish", text: `Bearish divergence: νέο υψηλό τιμής αλλά RSI χαμηλότερα (${X.rsi[a].toFixed(0)}→${X.rsi[b].toFixed(0)})` }); }
  return out;
}
function fibonacci(S, i, lookback = 120) {
  const from = Math.max(0, i - lookback + 1); if (i - from < 20) return null;
  let hiI = from, loI = from; for (let j = from; j <= i; j++) { if (S.h[j] > S.h[hiI]) hiI = j; if (S.l[j] < S.l[loI]) loI = j; }
  const hi = S.h[hiI], lo = S.l[loI]; if (hi <= lo) return null;
  const upMove = loI < hiI, rg = hi - lo, levels = {};
  for (const r of [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]) levels[r.toFixed(3)] = r2(upMove ? hi - r * rg : lo + r * rg, 4);
  return { direction: upMove ? "up" : "down", high: hi, low: lo, levels };
}
function volumeProfile(S, i, lookback = 120, bins = 24) {
  const from = Math.max(0, i - lookback + 1); if (i - from < 20) return null;
  let mn = Infinity, mx = -Infinity; const tps = [];
  for (let j = from; j <= i; j++) { const tp = (S.h[j] + S.l[j] + S.c[j]) / 3; tps.push([tp, S.v[j]]); if (tp < mn) mn = tp; if (tp > mx) mx = tp; }
  if (mx <= mn) return null;
  const hist = new Float64Array(bins), w = (mx - mn) / bins;
  for (const [tp, vol] of tps) hist[Math.min(bins - 1, Math.floor((tp - mn) / w))] += vol;
  let poc = 0; for (let b = 1; b < bins; b++) if (hist[b] > hist[poc]) poc = b;
  const order = [...hist.keys()].sort((a, b) => hist[b] - hist[a]), tot = hist.reduce((s, x) => s + x, 0);
  let acc = 0; const va = []; for (const b of order) { acc += hist[b]; va.push(b); if (acc >= 0.7 * tot) break; }
  return { poc: r2(mn + (poc + 0.5) * w, 4), vaLow: r2(mn + Math.min(...va) * w, 4), vaHigh: r2(mn + (Math.max(...va) + 1) * w, 4) };
}

// ================================================================== τεχνική ανάλυση (ίδιοι κανόνες με το πρόγραμμα του υπολογιστή)
function techAnalyze(S, X, i, spy) {
  if (i < 59) return { ok: false, reason: "Ανεπαρκές ιστορικό (χρειάζονται 60 ημέρες)" };
  const c = S.c[i], flags = [], pros = [], cons = []; let pts = 0;
  let votes = 0;
  for (const cond of [c > X.ema20[i], X.ema20[i] > X.ema50[i], isF(X.sma200[i]) ? c > X.sma200[i] : null, isF(X.sma200[i]) ? X.sma50[i] > X.sma200[i] : null]) {
    if (cond === null) continue; votes += cond ? 1 : -1; }
  if (votes >= 3) { flags.push("trend_up"); pros.push("Ανοδική τάση σε όλους τους μέσους όρους"); pts += 3; }
  else if (votes <= -3) { flags.push("trend_down"); cons.push("Καθοδική τάση σε όλους τους μέσους όρους"); pts -= 3; }
  else pts += votes * 0.5;
  const gc = recentCross(X.sma50, X.sma200, i, 15);
  if (gc === "up") { flags.push("golden_cross"); pros.push("Golden Cross (ΚΜΟ50 πάνω από ΚΜΟ200) τις τελευταίες 15 μέρες"); pts += 1.5; }
  else if (gc === "down") { flags.push("death_cross"); cons.push("Death Cross τις τελευταίες 15 μέρες"); pts -= 1.5; }
  const tc = recentCross(X.ema20, X.ema50, i, 5);
  if (tc === "up") { flags.push("trend_change_up"); pros.push("Πιθανή αλλαγή τάσης: EMA20 πέρασε πάνω από EMA50"); pts += 1; }
  else if (tc === "down") { flags.push("trend_change_down"); cons.push("Πιθανή αλλαγή τάσης προς τα κάτω"); pts -= 1; }
  const r = isF(X.rsi[i]) ? X.rsi[i] : 50;
  if (r >= 50 && r <= 70) { pts += 1.5; pros.push(`RSI ${r.toFixed(0)}: υγιές momentum`); }
  else if (r > 75) { flags.push("overbought"); cons.push(`RSI ${r.toFixed(0)}: υπεραγορασμένη, κίνδυνος διόρθωσης`); pts -= 1.5; }
  else if (r < 30) { flags.push("oversold"); pros.push(`RSI ${r.toFixed(0)}: υπερπουλημένη (πιθανό αναπήδημα, όχι βεβαιότητα)`); pts += 0.5; }
  else if (r < 45) { cons.push(`RSI ${r.toFixed(0)}: αδύναμο momentum`); pts -= 1; }
  if (isF(X.macdHist[i])) {
    if (X.macdHist[i] > 0 && X.macdHist[i] > X.macdHist[i - 1]) { pts += 1.5; pros.push("MACD θετικό και ανεβαίνει"); }
    else if (X.macdHist[i] < 0 && X.macdHist[i] < X.macdHist[i - 1]) { pts -= 1.5; cons.push("MACD αρνητικό και επιδεινώνεται"); }
  }
  if (isF(X.stK[i])) {
    if (X.stK[i] < 20 && X.stK[i] > X.stD[i]) { pts += 0.5; pros.push("Stoch RSI γυρίζει από υπερπουλημένη ζώνη"); }
    else if (X.stK[i] > 80 && X.stK[i] < X.stD[i]) { pts -= 0.5; cons.push("Stoch RSI γυρίζει από υπεραγορασμένη ζώνη"); }
  }
  const a = isF(X.adx[i]) ? X.adx[i] : 0;
  if (a >= 25) { if (X.pdi[i] > X.mdi[i]) { pts += 1; pros.push(`ADX ${a.toFixed(0)}: ισχυρή ανοδική τάση`); } else { pts -= 1; cons.push(`ADX ${a.toFixed(0)}: ισχυρή καθοδική τάση`); } }
  else if (a < 18) flags.push("no_trend");
  if (i > 130 && isF(X.bbW[i])) { const w = Array.from(X.bbW.slice(i - 125, i + 1)).filter(isF).sort((x, y) => x - y); if (w.length > 50 && X.bbW[i] <= w[Math.floor(w.length * 0.1)]) { flags.push("squeeze"); pros.push("Bollinger squeeze: συμπίεση μεταβλητότητας, πιθανή έντονη κίνηση (κατεύθυνση άγνωστη)"); } }
  const rv = isF(X.rvol[i]) ? X.rvol[i] : null;
  if (isF(X.hi20[i]) && c > X.hi20[i]) { if (rv && rv >= 1.5) { flags.push("breakout_20"); pros.push(`Breakout πάνω από υψηλό 20 ημερών με όγκο ${rv.toFixed(1)}x`); pts += 2; } else { flags.push("weak_breakout"); cons.push("Breakout χωρίς επιβεβαίωση όγκου"); } }
  if (isF(X.hi55[i]) && c > X.hi55[i] && rv && rv >= 1.3) { flags.push("breakout_55"); pts += 1; }
  let recentAbove = false; for (let j = i - 5; j < i; j++) if (j > 0 && isF(X.hi20[j]) && S.c[j] > X.hi20[j]) recentAbove = true;
  if (recentAbove && isF(X.hi20[i]) && c < X.hi20[i] * 0.99) { flags.push("fakeout"); cons.push("Πιθανό fakeout: έσπασε το υψηλό 20 ημερών αλλά επέστρεψε κάτω"); pts -= 2; }
  if (isF(X.lo20[i]) && c < X.lo20[i]) { flags.push("breakdown_20"); cons.push("Σπάσιμο κάτω από χαμηλό 20 ημερών"); pts -= 2; }
  for (const dv of divergences(S, X, i)) { if (dv.type === "bullish") { flags.push("bull_div"); pros.push(dv.text); pts += 1.5; } else { flags.push("bear_div"); cons.push(dv.text); pts -= 1.5; } }
  if (isF(X.vwap20[i])) pts += c > X.vwap20[i] ? 0.5 : -0.5;
  const technical = clip(50 + pts * 4.5);
  // momentum & όγκος
  let mp = 0; let rs = null;
  if (spy && spy.idx) {
    const t0 = S.dates[i], t63 = i >= 63 ? S.dates[i - 63] : null, t21 = i >= 21 ? S.dates[i - 21] : null;
    const bc = (d) => { const k = spy.idx.get(d); return k === undefined ? NaN : spy.c[k]; };
    if (t63 !== null) {
      const perf = c / S.c[i - 63] - 1, bperf = bc(t0) / bc(t63) - 1;
      let slope = 0; if (t21 !== null) slope = (c / bc(t0)) / (S.c[i - 21] / bc(t21)) - 1;
      let newHigh = true; const rl = c / bc(t0); for (let j = Math.max(0, i - 125); j < i; j++) { const b = bc(S.dates[j]); if (isF(b) && S.c[j] / b > rl) { newHigh = false; break; } }
      if (isF(bperf)) rs = { stock: perf * 100, bench: bperf * 100, excess: (perf - bperf) * 100, slope21: slope * 100, newHigh };
    }
  }
  if (rs) { mp += clip(rs.excess / 5, -3, 3); if (rs.newHigh) { mp += 1; pros.push("Σχετική δύναμη έναντι S&P 500 σε νέο υψηλό 6 μηνών"); }
    if (rs.excess > 10) pros.push(`Υπεραπόδοση ${rs.excess.toFixed(0)}% έναντι S&P 500 (3 μήνες)`); else if (rs.excess < -10) cons.push(`Υστέρηση ${Math.abs(rs.excess).toFixed(0)}% έναντι S&P 500 (3 μήνες)`); }
  if (isF(X.ret21[i])) mp += clip(X.ret21[i] * 100 / 6, -2, 2);
  if (rv !== null && rv >= 2) { flags.push("unusual_volume"); if (X.ret1[i] > 0) { mp += 2; pros.push(`Ασυνήθιστος όγκος ${rv.toFixed(1)}x με άνοδο (συσσώρευση)`); } else { mp -= 2; cons.push(`Ασυνήθιστος όγκος ${rv.toFixed(1)}x με πτώση (διανομή)`); } }
  let upv = 0, dnv = 0; for (let j = Math.max(1, i - 19); j <= i; j++) { if (X.ret1[j] > 0) upv += S.v[j]; else if (X.ret1[j] < 0) dnv += S.v[j]; }
  const ud = dnv > 0 ? upv / dnv : null; if (ud !== null) mp += clip((ud - 1) * 2, -2, 2);
  if (isF(X.hi252[i]) && c >= X.hi252[i] * 0.95) { flags.push("near_52w_high"); mp += 1; }
  if (isF(X.lo252[i]) && c <= X.lo252[i] * 1.05) { flags.push("near_52w_low"); mp -= 1; }
  const momentum = clip(50 + mp * 6);
  return { ok: true, technical: r2(technical, 1), momentum: r2(momentum, 1), flags: [...new Set(flags)], pros, cons, rs, ud,
    m: { close: c, chg: r2(X.ret1[i] * 100, 2), rsi: r2(r, 1), adx: r2(a, 1), macd: r2(X.macd[i], 4), macdSig: r2(X.macdSig[i], 4), macdHist: r2(X.macdHist[i], 4),
      stK: r2(X.stK[i], 1), stD: r2(X.stD[i], 1), ema9: r2(X.ema9[i]), ema20: r2(X.ema20[i]), ema50: r2(X.ema50[i]), ema200: r2(X.ema200[i]),
      sma20: r2(X.sma20[i]), sma50: r2(X.sma50[i]), sma100: r2(X.sma100[i]), sma200: r2(X.sma200[i]), bbUp: r2(X.bbUp[i]), bbLo: r2(X.bbLo[i]),
      vwap20: r2(X.vwap20[i]), atr: r2(X.atr[i], 4), atrPct: r2(X.atr[i] / c * 100, 2), rvol: r2(rv, 2), avgVol20: r2(X.volAvg20[i], 0), dv20: r2(X.dv20[i], 0),
      hi52: r2(X.hi252[i]), lo52: r2(X.lo252[i]), ret5: r2(X.ret5[i] * 100, 2), ret21: r2(X.ret21[i] * 100, 2), ret63: r2(X.ret63[i] * 100, 2), ret126: r2(X.ret126[i] * 100, 2),
      vol21: r2(X.vol21[i], 1), gap: r2(X.gap[i] * 100, 2), ud: r2(ud, 2) } };
}

function riskAnalyze(T) {
  const m = T.m, w = []; let pts = 0;
  if (m.close < 5) { pts -= 2; w.push({ text: "Μετοχή κάτω από $5: μεγάλες και απότομες κινήσεις" }); }
  if (m.atrPct > 7) { pts -= 2; w.push({ text: `Πολύ μεγάλη ημερήσια διακύμανση (±${m.atrPct.toFixed(1)}% τη μέρα)` }); } else if (m.atrPct > 4) pts -= 1; else if (m.atrPct < 2.5) pts += 1;
  if (m.vol21 > 80) { pts -= 1; w.push({ text: `Ετήσια μεταβλητότητα ${m.vol21.toFixed(0)}%` }); }
  if (!isF(m.dv20) || m.dv20 < MIN_DV_SIGNAL) { pts -= 2; w.push({ text: "Χαμηλή ρευστότητα: μεγάλη διαφορά αγοράς-πώλησης" }); } else if (m.dv20 > 1e8) pts += 1;
  if (Math.abs(m.gap || 0) > 8) { pts -= 1; w.push({ text: `Μεγάλο gap σήμερα (${m.gap.toFixed(1)}%)` }); }
  if (T.flags.includes("near_52w_low")) { pts -= 1; w.push({ text: "Κοντά στο χαμηλό της χρονιάς" }); }
  return { score: clip(60 + pts * 8), warnings: w };
}

// ================================================================== setups & επίπεδα (ίδιοι κανόνες με strategies.py)
function detectSetups(S, X, i) {
  if (i < 60) return [];
  const c = S.c[i], out = [];
  const ok = (...v) => v.every(isF);
  if (!ok(c, X.atr[i], X.ema20[i], X.ema50[i], X.rsi[i])) return out;
  const rvol = isF(X.rvol[i]) ? X.rvol[i] : 0, s200 = isF(X.sma200[i]);
  if (ok(X.hi20[i], X.vwap20[i]) && c > X.hi20[i] && rvol >= 1.5 && c > X.vwap20[i] && X.rsi[i] < 78 && c > S.o[i])
    out.push({ horizon: "short", bias: "bullish", name: "Breakout υψηλού 20 ημερών με όγκο", reasons: [`Κλείσιμο πάνω από ${X.hi20[i].toFixed(2)}`, `Όγκος ${rvol.toFixed(1)}x`, "Πάνω από VWAP20"] });
  else if (ok(X.gap[i]) && X.gap[i] > 0.03 && c > S.o[i] && rvol >= 2 && X.rsi[i] < 80)
    out.push({ horizon: "short", bias: "bullish", name: "Gap & Go", reasons: [`Gap ${(X.gap[i] * 100).toFixed(1)}% που κράτησε`, `Όγκος ${rvol.toFixed(1)}x`] });
  if (ok(X.lo20[i], X.vwap20[i]) && c < X.lo20[i] && rvol >= 1.5 && c < X.vwap20[i] && X.rsi[i] > 25 && c < S.o[i])
    out.push({ horizon: "short", bias: "bearish", name: "Breakdown χαμηλού 20 ημερών με όγκο", reasons: [`Κλείσιμο κάτω από ${X.lo20[i].toFixed(2)}`, `Όγκος ${rvol.toFixed(1)}x`] });
  const upT = X.ema20[i] > X.ema50[i] && (!s200 || X.ema50[i] > X.sma200[i]);
  const dnT = X.ema20[i] < X.ema50[i] && (!s200 || X.ema50[i] < X.sma200[i]);
  const mhUp = ok(X.macdHist[i], X.macdHist[i - 1]) && X.macdHist[i] > X.macdHist[i - 1];
  const mhDn = ok(X.macdHist[i], X.macdHist[i - 1]) && X.macdHist[i] < X.macdHist[i - 1];
  if (upT && S.l[i] <= X.ema20[i] * 1.01 && c > X.ema20[i] && X.rsi[i] >= 40 && X.rsi[i] <= 62 && mhUp)
    out.push({ horizon: "swing", bias: "bullish", name: "Pullback στον EMA20 σε ανοδική τάση", reasons: ["Τάση: EMA20 > EMA50 > ΚΜΟ200", `RSI ${X.rsi[i].toFixed(0)}`, "MACD ανεβαίνει"] });
  else if (ok(X.hi55[i], X.adx[i]) && c > X.hi55[i] && rvol >= 1.3 && X.adx[i] > 20 && upT)
    out.push({ horizon: "swing", bias: "bullish", name: "Breakout υψηλού 55 ημερών", reasons: [`Πάνω από ${X.hi55[i].toFixed(2)}`, `ADX ${X.adx[i].toFixed(0)}`, `Όγκος ${rvol.toFixed(1)}x`] });
  else if (ok(X.stK[i], X.stD[i]) && X.rsi[i] < 40 && X.rsi[i - 1] < X.rsi[i] && c > X.ema9[i] && X.stK[i] > X.stD[i] && X.stK[i] < 40 && s200 && c > X.sma200[i] * 0.9)
    out.push({ horizon: "swing", bias: "bullish", name: "Αντιστροφή από υπερπουλημένη ζώνη", reasons: [`RSI ${X.rsi[i].toFixed(0)} γυρίζει πάνω`, "Stoch RSI cross", "Πάνω από EMA9"] });
  if (dnT && S.h[i] >= X.ema20[i] * 0.99 && c < X.ema20[i] && X.rsi[i] >= 38 && X.rsi[i] <= 60 && mhDn)
    out.push({ horizon: "swing", bias: "bearish", name: "Απόρριψη στον EMA20 σε καθοδική τάση", reasons: ["Τάση: EMA20 < EMA50 < ΚΜΟ200", `RSI ${X.rsi[i].toFixed(0)}`, "MACD πέφτει"] });
  return out;
}
function levels(S, X, i, setup, sr) {
  const c = S.c[i], a = X.atr[i];
  if (!(a > 0) || !(c > 0)) return null;
  const H = HORIZONS[setup.horizon], long = setup.bias === "bullish", sgn = long ? 1 : -1;
  let lo, hi;
  if (setup.horizon === "short") { lo = c - 0.25 * a; hi = c + 0.25 * a; }
  else if (long) { lo = Math.max(X.ema20[i], c - 0.6 * a); hi = c + 0.2 * a; } else { lo = c - 0.2 * a; hi = Math.min(X.ema20[i], c + 0.6 * a); }
  [lo, hi] = [Math.min(lo, hi), Math.max(lo, hi)];
  const entry = (lo + hi) / 2;
  let stop = entry - sgn * H.stopAtr * a;
  const band = 1.5 * H.stopAtr * a;
  if (long) { const sup = (sr || []).map((x) => x.price).filter((p) => p >= entry - band && p <= entry - 0.5 * a); if (sup.length) stop = Math.max(...sup) - 0.25 * a; }
  else { const res = (sr || []).map((x) => x.price).filter((p) => p >= entry + 0.5 * a && p <= entry + band); if (res.length) stop = Math.min(...res) + 0.25 * a; }
  const R = Math.abs(entry - stop); if (!(R > 0)) return null;
  const tp1 = entry + sgn * 1.5 * R; let tp2 = entry + sgn * 2.5 * R; let tp3 = entry + sgn * 4 * R;
  const cands = (sr || []).map((x) => x.price).sort((x, y) => x - y);
  if (long) { const above = cands.filter((p) => p >= entry + 2 * R); if (above.length) tp2 = Math.min(above[0], tp3); if (above.length > 1) tp3 = Math.max(tp3, above[1]); }
  else { const below = cands.filter((p) => p <= entry - 2 * R).reverse(); if (below.length) tp2 = Math.max(below[0], tp3); }
  tp2 = long ? Math.max(tp2, tp1 + 0.1 * R) : Math.min(tp2, tp1 - 0.1 * R);
  if (long && tp3 <= tp2 + 0.5 * R) tp3 = tp2 + 1.5 * R;
  if (!long && tp3 >= tp2 - 0.5 * R) tp3 = tp2 - 1.5 * R;
  return { entryLow: r2(lo, 4), entryHigh: r2(hi, 4), entry: r2(entry, 4), stop: r2(stop, 4), tp1: r2(tp1, 4), tp2: r2(tp2, 4), tp3: r2(tp3, 4),
    rr: r2(Math.abs(tp2 - entry) / R, 2), riskPerShare: r2(R, 4), stopPct: r2(R / entry * 100, 2), holding: H.holding, maxDays: H.maxDays };
}

function confirmations(T, fund, news, ml, market, bias) {
  const f = new Set(T.flags), m = T.m, rs = T.rs || {}, votes = {};
  if (f.has("trend_up") || f.has("trend_change_up") || f.has("golden_cross")) votes.trend = 1;
  else if (f.has("trend_down") || f.has("trend_change_down") || f.has("death_cross")) votes.trend = -1;
  if (isF(m.rsi) && isF(m.macdHist)) {
    if (m.rsi >= 50 && m.rsi <= 72 && m.macdHist > 0) votes.momentum = 1; else if (m.rsi < 45 && m.macdHist < 0) votes.momentum = -1;
    else if (f.has("bull_div")) votes.momentum = 1; else if (f.has("bear_div") || m.rsi > 78) votes.momentum = -1;
  }
  if (f.has("breakout_20") || (m.rvol >= 1.5 && m.chg > 0) || (m.ud && m.ud > 1.3)) votes.volume = 1;
  else if ((m.rvol >= 1.5 && m.chg < 0) || (m.ud && m.ud < 0.75)) votes.volume = -1;
  if (isF(rs.excess)) { if (rs.excess > 3 && rs.slope21 > 0) votes.relative = 1; else if (rs.excess < -3 && rs.slope21 < 0) votes.relative = -1; }
  if (fund && isF(fund.score) && fund.coverage >= 0.3) { if (fund.score >= 60) votes.fundamentals = 1; else if (fund.score <= 40) votes.fundamentals = -1; }
  if (news && isF(news.score) && news.n > 0) { if (news.score >= 58) votes.news = 1; else if (news.score <= 42) votes.news = -1; }
  if (isF(ml)) { if (ml >= 75) votes.ml = 1; else if (ml <= 25) votes.ml = -1; }
  if (isF(market)) { if (market >= 60) votes.market = 1; else if (market <= 40) votes.market = -1; }
  const sg = bias === "bearish" ? -1 : 1;
  const sup = Object.keys(votes).filter((k) => votes[k] === sg), opp = Object.keys(votes).filter((k) => votes[k] === -sg);
  const techSide = sup.filter((k) => ["trend", "momentum", "volume", "relative"].includes(k)).length;
  const other = sup.filter((k) => ["ml", "fundamentals", "news", "sector", "market"].includes(k)).length;
  return { supporting: sup, opposing: opp, nSup: sup.length, nOpp: opp.length, independentOk: techSide >= 2 && other >= 1,
    conflicts: sup.length && opp.length ? ["Συγκρουόμενες ενδείξεις: υπέρ " + sup.map((k) => CAT_LABELS[k]).join(", ") + " / κατά " + opp.map((k) => CAT_LABELS[k]).join(", ")] : [] };
}
const confLevel = (s, o) => { const b = s - o; return b >= 5 ? "Υψηλή" : b >= 4 ? "Μέτρια-Υψηλή" : b >= 3 ? "Μέτρια" : "Χαμηλή"; };

function compose(comps) {
  let num = 0, den = 0, tot = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) { tot += w; const v = comps[k]; if (!isF(v)) continue; num += w * v; den += w; }
  return den ? { score: r2(num / den, 1), coverage: r2(den / tot, 2) } : { score: 50, coverage: 0 };
}
function scoreStock(T, R, extras, mk, mlScore) {
  const comps = { ml: mlScore, technical: T.technical, momentum: T.momentum, fundamentals: extras?.fund?.coverage > 0 ? extras.fund.score : null,
    news: extras?.news?.n > 0 ? extras.news.score : null, market: mk?.score, risk: R.score };
  const { score, coverage } = compose(comps);
  const bias = score >= 55 ? "bullish" : score <= 45 ? "bearish" : "neutral";
  const contrib = Object.keys(WEIGHTS).map((k) => ({ key: k, label: COMP_LABELS[k], score: isF(comps[k]) ? r2(comps[k], 1) : null, weight: WEIGHTS[k],
    impact: isF(comps[k]) ? (comps[k] - 50) * WEIGHTS[k] : null })).sort((a, b) => (b.impact === null ? -1 : Math.abs(b.impact)) - (a.impact === null ? -1 : Math.abs(a.impact)));
  return { score, coverage, bias, comps, contrib };
}

/* setups και επίπεδα για την τελευταία μέρα (χρειάζονται τις σειρές· υπολογίζονται μία φορά) */
function rawSetups(S, X, i, sr) {
  const raw = detectSetups(S, X, i).map((st) => ({ s: st, L: levels(S, X, i, st, sr) })).filter((x) => x.L);
  const mlLv = {};
  for (const hz of ["short", "swing"]) { const L = levels(S, X, i, { horizon: hz, bias: "bullish" }, sr); if (L) mlLv[hz] = L; }
  return { raw, mlLv, price: S.c[i], date: S.dates[i] };
}
function evaluate(ticker, RS, T, R, sc, extras, mk, model) {
  const raw = RS.raw.map((x) => ({ ...x.s, _L: x.L }));
  // ευκαιρίες που βρίσκει το επικυρωμένο μοντέλο κατάταξης (top 3% της αγοράς)
  for (const [hz, target] of [["rank5", "short"], ["rank21", "swing"]]) {
    const p = model?.[hz];
    if (p?.validated && p.rank >= 0.97 && (p.exp ?? 0) > COST && RS.mlLv[target] && !raw.some((x) => x.horizon === target && x.bias === "bullish"))
      raw.push({ horizon: target, bias: "bullish", name: "Μοντέλο: κορυφαία κατάταξη αγοράς", ml: true, _L: RS.mlLv[target],
        reasons: [`Top ${Math.max(1, Math.round((1 - p.rank) * 100))}% όλης της αγοράς (${MODEL_H[hz]} ημ.)`, `Ιστορικά +${(p.exp * 100).toFixed(2)}% έναντι αγοράς (σε άγνωστα δεδομένα)`] });
  }
  const acc = [], rej = [];
  for (const s of raw) {
    const L = s._L; delete s._L; if (!L) continue;
    const g = GATES[s.horizon], long = s.bias === "bullish", reasons = [];
    const score = long ? sc.score : 100 - sc.score, ts = long ? T.technical : 100 - T.technical;
    const conf = confirmations(T, extras?.fund, extras?.news, sc.comps.ml, mk?.score, s.bias);
    if (score < g.score - (s.ml ? 5 : 0)) reasons.push(`Συνολική βαθμολογία ${sc.score.toFixed(0)} κάτω από το όριο`);
    if (ts < g.tech && !s.ml) reasons.push("Αδύναμη τεχνική εικόνα για αυτή την κατεύθυνση");
    const rk = model?.[s.horizon === "short" ? "rank5" : "rank21"];
    let rank = null, exp = null;
    if (rk?.validated && isF(rk.rank)) { rank = rk.rank; exp = rk.exp;
      if (long && rank < 0.5) reasons.push(`Μοντέλο κατάταξης: στο κάτω μισό της αγοράς (${(rank * 100).toFixed(0)}%)`);
      if (!long && rank > 0.5) reasons.push("Μοντέλο κατάταξης: στο πάνω μισό της αγοράς, όχι για short"); }
    if (conf.nSup < g.support) reasons.push(`Μόνο ${conf.nSup} επιβεβαιώσεις (χρειάζονται ${g.support})`);
    const miss = g.need.filter((k) => !conf.supporting.includes(k));
    if (miss.length) reasons.push("Λείπει επιβεβαίωση: " + miss.map((k) => CAT_LABELS[k]).join(", "));
    if (g.independent && !conf.independentOk) reasons.push("Δεν υπάρχουν ανεξάρτητες επιβεβαιώσεις εκτός τεχνικής ανάλυσης");
    if (L.rr < MIN_RR) reasons.push(`Κέρδος/ρίσκο ${L.rr.toFixed(2)} κάτω από ${MIN_RR}`);
    if (!isF(T.m.dv20) || T.m.dv20 < MIN_DV_SIGNAL) reasons.push("Ανεπαρκής ρευστότητα (τζίρος κάτω από $5M/ημέρα)");
    const dte = extras?.fund?.daysToEarnings;
    if (isF(dte) && dte >= 0 && dte <= (s.horizon === "short" ? 5 : 0)) reasons.push(`Αποτελέσματα σε ${dte} μέρες, μέσα στο διάστημα διακράτησης`);
    const lvl = confLevel(conf.nSup, conf.nOpp);
    if (lvl === "Χαμηλή" && !reasons.length) reasons.push(`Χαμηλή επιβεβαίωση (${conf.nSup} υπέρ / ${conf.nOpp} κατά)`);
    const item = { ...s, ...L, ticker, setup: s.name, score: sc.score, price: RS.price, date: RS.date, conf, rank, exp,
      risks: R.warnings.map((w) => w.text).slice(0, 5) };
    if (reasons.length) rej.push({ ...item, rejected: reasons }); else acc.push({ ...item, confidence: lvl });
  }
  return { acc, rej };
}

// ================================================================== σύνθεση σειρών από την αποθήκη
let CACHE = null; // { dates, tickers, ref, series: Map(ticker -> {o,h,l,c,v,dates}), spy }
async function buildSeries() {
  const days = await allDays();
  const tickers = (await kvGet("tickers")) || [];
  const ref = (await kvGet("ref")) || {};
  const D = days.length;
  if (D < 2) return { D, dates: days.map((x) => x.d), tickers, ref, series: new Map() };
  const NT = tickers.length;
  // σύμπαν: παρόν στη τελευταία μέρα, τιμή ≥ $1, μέσος τζίρος 20 ημερών ≥ $1M, μετοχή (όχι warrant/ETF), + ETFs αγοράς
  const last = days.slice(-20);
  const dvSum = new Float64Array(NT), dvCnt = new Uint16Array(NT);
  for (const d of last) { const ids = d.ids, c = d.c, v = d.v; for (let k = 0; k < ids.length; k++) { dvSum[ids[k]] += c[k] * v[k]; dvCnt[ids[k]]++; } }
  const lastDay = days[D - 1], present = new Set(lastDay.ids);
  const special = new Set([...MARKET, ...Object.values(SECTOR_ETF)]);
  let cand = [];
  for (let id = 0; id < NT; id++) {
    const t = tickers[id];
    if (special.has(t)) { cand.push([id, Infinity]); continue; }
    if (!present.has(id) || dvCnt[id] < 10) continue;
    const typ = ref[t]?.t; if (typ && !["CS", "ADRC", "ADRP", "ADRS", "OS", "GDR", "NYRS"].includes(typ)) continue;
    if (!typ && /[.\-]|W$|WS$|U$|R$/.test(t) && t.length > 4) continue;
    const dv = dvSum[id] / dvCnt[id]; if (dv < MIN_DV_UNIVERSE) continue;
    cand.push([id, dv]);
  }
  cand.sort((a, b) => b[1] - a[1]); cand = cand.slice(0, MAX_UNIVERSE + special.size);
  const slot = new Int32Array(NT).fill(-1); cand.forEach(([id], k) => (slot[id] = k));
  const N = cand.length;
  const O = new Float32Array(N * D).fill(NaN), Hh = new Float32Array(N * D).fill(NaN), Ll = new Float32Array(N * D).fill(NaN), C = new Float32Array(N * D).fill(NaN), V = new Float32Array(N * D).fill(NaN);
  days.forEach((d, t) => { const ids = d.ids; for (let k = 0; k < ids.length; k++) { const s = slot[ids[k]]; if (s < 0) continue; const p = s * D + t; O[p] = d.o[k]; Hh[p] = d.h[k]; Ll[p] = d.l[k]; C[p] = d.c[k]; V[p] = d.v[k]; } });
  const dates = days.map((x) => x.d), series = new Map();
  cand.forEach(([id], s) => {
    const base = s * D, idx = [];
    for (let t = 0; t < D; t++) if (C[base + t] > 0) idx.push(t);
    const n = idx.length; if (n < 2) return;
    const S = { o: new Float32Array(n), h: new Float32Array(n), l: new Float32Array(n), c: new Float32Array(n), v: new Float32Array(n), dates: new Array(n), t: new Int32Array(n) };
    idx.forEach((t, k) => { const p = base + t; S.o[k] = O[p]; S.h[k] = Math.max(Hh[p], O[p], C[p]); S.l[k] = Math.min(Ll[p], O[p], C[p]); S.c[k] = C[p]; S.v[k] = V[p] || 0; S.dates[k] = dates[t]; S.t[k] = t; });
    series.set(tickers[id], S);
  });
  const spyS = series.get("SPY");
  const spy = spyS ? { c: spyS.c, idx: new Map(spyS.dates.map((d, k) => [d, k])) } : null;
  CACHE = { D, dates, tickers, ref, series, spy, built: Date.now() };
  return CACHE;
}

// ================================================================== συνθήκες αγοράς
function marketContext(C, breadth) {
  const S = C.series.get("SPY");
  if (!S || S.c.length < 60) return { ok: false, score: null, regime: null, pros: [], cons: ["Λείπει ιστορικό S&P 500 (SPY)"] };
  const X = indicators(S), i = S.c.length - 1;
  let pts = 0; const pros = [], cons = [];
  if (isF(X.sma200[i])) { if (S.c[i] > X.sma200[i]) { pts += 2; pros.push("S&P 500 πάνω από τον ΚΜΟ 200 (μακροπρόθεσμη ανοδική τάση)"); } else { pts -= 2; cons.push("S&P 500 κάτω από τον ΚΜΟ 200"); } }
  if (S.c[i] > X.sma50[i]) pts += 1; else { pts -= 1; cons.push("S&P 500 κάτω από τον ΚΜΟ 50"); }
  const vol = X.vol21[i];
  if (isF(vol)) { if (vol < 12) { pts += 1; pros.push(`Ήρεμη αγορά: μεταβλητότητα S&P 500 ${vol.toFixed(0)}%`); } else if (vol > 28) { pts -= 2.5; cons.push(`Νευρική αγορά: μεταβλητότητα S&P 500 ${vol.toFixed(0)}%`); } else if (vol > 20) { pts -= 1; cons.push(`Αυξημένη μεταβλητότητα S&P 500 (${vol.toFixed(0)}%)`); } }
  if (isF(breadth)) { if (breadth > 60) { pts += 1; pros.push(`Ευρεία συμμετοχή: ${breadth.toFixed(0)}% των μετοχών πάνω από ΚΜΟ 50`); } else if (breadth < 35) { pts -= 1; cons.push(`Στενή αγορά: μόνο ${breadth.toFixed(0)}% πάνω από ΚΜΟ 50`); } }
  const score = clip(50 + pts * 8);
  const idx = {};
  for (const t of MARKET) { const s = C.series.get(t); if (!s) continue; const n = s.c.length; idx[t] = { close: s.c[n - 1], chg: n > 1 ? (s.c[n - 1] / s.c[n - 2] - 1) * 100 : null, spark: Array.from(s.c.slice(-60)).map((x) => r2(x, 2)), date: s.dates[n - 1] }; }
  const spy21 = i >= 21 ? S.c[i] / S.c[i - 21] - 1 : null;
  const sectors = Object.entries(SECTOR_ETF).map(([name, etf]) => {
    const s = C.series.get(etf); if (!s || s.c.length < 64) return null; const n = s.c.length;
    const ret = (k) => (s.c[n - 1] / s.c[n - 1 - k] - 1) * 100;
    return { sector: name, etf, ret1: ret(1), ret5: ret(5), ret21: ret(21), ret63: ret(63), rel21: isF(spy21) ? ret(21) - spy21 * 100 : null };
  }).filter(Boolean).sort((a, b) => (b.rel21 ?? -99) - (a.rel21 ?? -99));
  return { ok: true, score: r2(score, 1), regime: score >= 62 ? "Risk-on" : score <= 38 ? "Risk-off" : "Ουδέτερο", pros, cons, vol: r2(vol, 1), breadth: r2(breadth, 1), idx, sectors, asOf: S.dates[i] };
}

// ================================================================== μοντέλο κατάταξης (ridge σε cross-sectional ranks)
function featRow(S, X, i, spyRet) {
  const c = S.c[i], f = new Float64Array(FEATS.length).fill(NaN);
  const g = (a) => (isF(a) ? a : NaN);
  let dd = 0; for (let j = Math.max(1, i - 20); j <= i; j++) if (X.ret1[j] < dd) dd = X.ret1[j];
  let upv = 0, dnv = 0; for (let j = Math.max(1, i - 19); j <= i; j++) { if (X.ret1[j] > 0) upv += S.v[j]; else if (X.ret1[j] < 0) dnv += S.v[j]; }
  const vals = [X.ret1[i], X.ret5[i], X.ret21[i], X.ret63[i], X.ret126[i], X.vol21[i], X.atr[i] / c, X.rsi[i], c / X.hi252[i] - 1, c / X.lo252[i] - 1,
    c / X.sma50[i] - 1, c / X.sma200[i] - 1, X.sma50[i] / X.sma200[i] - 1, X.rvol[i], Math.log(Math.max(1, X.dv20[i])), X.gap[i],
    S.h[i] > S.l[i] ? (c - S.l[i]) / (S.h[i] - S.l[i]) : 0.5, X.macdHist[i] / c, X.bbUp[i] > X.bbLo[i] ? (c - X.bbLo[i]) / (X.bbUp[i] - X.bbLo[i]) : NaN,
    dnv > 0 ? Math.log((upv + 1) / (dnv + 1)) : NaN, isF(spyRet?.r21) ? X.ret21[i] - spyRet.r21 : NaN, isF(spyRet?.r63) ? X.ret63[i] - spyRet.r63 : NaN, dd, X.adx[i]];
  for (let k = 0; k < vals.length; k++) f[k] = g(vals[k]);
  return f;
}
/* κατάταξη ανά ημέρα σε [-0.5, 0.5]· κενά -> 0 (ουδέτερο) */
function csRank(rows, nf) {
  const n = rows.length, out = rows.map(() => new Float32Array(nf));
  for (let k = 0; k < nf; k++) {
    const idx = []; for (let r = 0; r < n; r++) if (isF(rows[r][k])) idx.push(r);
    idx.sort((a, b) => rows[a][k] - rows[b][k]);
    const m = idx.length; idx.forEach((r, q) => { out[r][k] = m > 1 ? q / (m - 1) - 0.5 : 0; });
  }
  return out;
}
function rankPct(vals) { const idx = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]); const out = new Float64Array(vals.length); idx.forEach((i, q) => (out[i] = vals.length > 1 ? q / (vals.length - 1) : 0.5)); return out; }
function spearman(a, b) { if (a.length < 10) return NaN; const ra = rankPct(a), rb = rankPct(b); let sa = 0, sb = 0, sab = 0, saa = 0, sbb = 0; const n = a.length;
  for (let i = 0; i < n; i++) { sa += ra[i]; sb += rb[i]; } const ma = sa / n, mb = sb / n;
  for (let i = 0; i < n; i++) { const x = ra[i] - ma, y = rb[i] - mb; sab += x * y; saa += x * x; sbb += y * y; } return saa && sbb ? sab / Math.sqrt(saa * sbb) : NaN; }
/* ridge με αθροισμένα στατιστικά ανά ημέρα: A = Σ X'X, b = Σ X'y (γρήγορο για πολλές περιόδους ελέγχου) */
function dateStats(X, y, ok) {
  const p = FEATS.length + 1, A = new Float64Array(p * p), bb = new Float64Array(p); let n = 0;
  const row = new Float64Array(p); row[0] = 1;
  for (let r = 0; r < X.length; r++) { if (!ok[r]) continue; n++; const x = X[r];
    for (let k = 0; k < p - 1; k++) row[k + 1] = x[k];
    for (let i = 0; i < p; i++) { const ri = row[i]; bb[i] += ri * y[r]; if (!ri) continue; const o = i * p; for (let j = i; j < p; j++) A[o + j] += ri * row[j]; } }
  return { A, b: bb, n };
}
function solveRidge(stats) {
  const p = FEATS.length + 1, A = new Float64Array(p * p), bb = new Float64Array(p); let n = 0;
  for (const st of stats) { n += st.n; for (let k = 0; k < p * p; k++) A[k] += st.A[k]; for (let k = 0; k < p; k++) bb[k] += st.b[k]; }
  const lam = n / 12 * 0.1;
  const M = Array.from({ length: p }, (_, i) => { const r = new Float64Array(p + 1); for (let j = 0; j < p; j++) r[j] = j >= i ? A[i * p + j] : A[j * p + i]; if (i) r[i] += lam; r[p] = bb[i]; return r; });
  for (let c = 0; c < p; c++) { let piv = c; for (let r = c + 1; r < p; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r; [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c] || 1e-12; for (let j = c; j <= p; j++) M[c][j] /= d;
    for (let r = 0; r < p; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = c; j <= p; j++) M[r][j] -= f * M[c][j]; } }
  return { w: M.map((r) => r[p]), n };
}
const predict = (w, x) => { let s = w[0]; for (let k = 0; k < x.length; k++) s += w[k + 1] * x[k]; return s; };

function trainModels(panel, post) {
  // panel: { dates: [t...], rows: Map(t -> [{ticker, f(raw), fwd5, fwd21}]) }
  const tsAll = [...panel.rows.keys()].sort((a, b) => a - b);
  const prepared = new Map();
  for (const t of tsAll) { const rows = panel.rows.get(t); if (rows.length < 50) continue; prepared.set(t, { rows, X: csRank(rows.map((r) => r.f), FEATS.length) }); }
  const out = {};
  for (const [hz, H] of Object.entries(MODEL_H)) {
    post({ type: "progress", step: `Μοντέλο ${H} ημερών: έλεγχος σε δεδομένα που δεν έχει δει`, pct: hz === "rank5" ? 20 : 60 });
    const key = "fwd" + H;
    const ts = [...prepared.keys()].filter((t) => prepared.get(t).rows.some((r) => isF(r[key])));
    if (ts.length < 60) { out[hz] = { ok: false, reason: "Ανεπαρκές ιστορικό για έλεγχο (χρειάζονται περίπου 18 μήνες)" }; continue; }
    const ysOf = (t) => { const P = prepared.get(t); const vals = P.rows.map((r) => r[key]); const ok = vals.map(isF); const rk = rankPct(vals.map((v) => (isF(v) ? v : 0)));
      const mean = vals.filter(isF).reduce((s, v) => s + v, 0) / Math.max(1, vals.filter(isF).length); return { y: Array.from(rk, (v) => v - 0.5), ok, ex: vals.map((v) => (isF(v) ? v - mean : NaN)) }; };
    const Y = new Map(ts.map((t) => [t, ysOf(t)]));
    const ST = new Map(ts.map((t) => { const yy = Y.get(t); return [t, dateStats(prepared.get(t).X, yy.y, yy.ok)]; }));
    const minTrain = Math.floor(ts.length * 0.45), block = Math.max(5, Math.round(21 / panel.step)), emb = Math.ceil((H + 2) / panel.step);
    const folds = [], oos = [];
    for (let s = minTrain; s < ts.length; s += block) {
      const trT = ts.slice(0, Math.max(0, s - emb)), teT = ts.slice(s, s + block);
      if (trT.length < 30 || !teT.length) continue;
      const { w } = solveRidge(trT.map((t) => ST.get(t)));
      const ics = [], tops = [];
      for (const t of teT) { const P = prepared.get(t), yy = Y.get(t); const pr = [], ex = [];
        P.X.forEach((x, r) => { if (yy.ok[r]) { pr.push(predict(w, x)); ex.push(yy.ex[r]); } });
        const ic = spearman(pr, ex); if (isF(ic)) ics.push(ic);
        const rp = rankPct(pr); let ts_ = 0, tn = 0; rp.forEach((q, k) => { if (q >= 0.9) { ts_ += ex[k]; tn++; } oos.push([q, ex[k], t]); }); if (tn) tops.push(ts_ / tn); }
      const icm = ics.reduce((a, b) => a + b, 0) / Math.max(1, ics.length), topm = tops.reduce((a, b) => a + b, 0) / Math.max(1, tops.length);
      folds.push({ trainEnd: panel.dates[trT[trT.length - 1]], test: [panel.dates[teT[0]], panel.dates[teT[teT.length - 1]]], ic: r2(icm, 4), top: r2(topm, 5), n: ics.length });
    }
    if (folds.length < 3) { out[hz] = { ok: false, reason: "Ανεπαρκές ιστορικό για αρκετές περιόδους ελέγχου" }; continue; }
    // IC ανά ημέρα με ημέρες που απέχουν τουλάχιστον H (χωρίς επικαλυπτόμενες αποδόσεις)
    const byT = new Map(); for (const [q, ex, t] of oos) { if (!byT.has(t)) byT.set(t, [[], []]); byT.get(t)[0].push(q); byT.get(t)[1].push(ex); }
    const tsO = [...byT.keys()].sort((a, b) => a - b), gap = Math.max(1, Math.ceil(H / panel.step));
    const icsAll = tsO.map((t) => spearman(byT.get(t)[0], byT.get(t)[1])).filter(isF);
    const icsNo = tsO.filter((t, k) => k % gap === 0).map((t) => spearman(byT.get(t)[0], byT.get(t)[1])).filter(isF);
    const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
    const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1)); };
    const icMean = mean(icsAll), icT = icsNo.length > 5 && sd(icsNo) > 0 ? mean(icsNo) / (sd(icsNo) / Math.sqrt(icsNo.length)) : NaN;
    const dec = Array.from({ length: 10 }, (_, k) => ({ decile: k + 1, sum: 0, n: 0 }));
    for (const [q, ex] of oos) { if (!isF(ex)) continue; const k = Math.min(9, Math.floor(q * 10)); dec[k].sum += ex; dec[k].n++; }
    const deciles = dec.map((d) => ({ decile: d.decile, n: d.n, avg: d.n ? r2(d.sum / d.n, 5) : null }));
    const top = deciles[9].avg ?? -1, bottom = deciles[0].avg ?? 0;
    const posFolds = folds.filter((f) => f.top > 0).length;
    const gate = [
      [icMean >= 0.015 && icT >= 2.5, `Συσχέτιση πρόβλεψης–απόδοσης ${icMean.toFixed(3)} με t=${isF(icT) ? icT.toFixed(1) : "—"} (χρειάζεται ≥ 0.015 και t ≥ 2.5)`],
      [top >= COST, `Top 10% έναντι αγοράς ${(top * 100).toFixed(2)}% (χρειάζεται ≥ ${(COST * 100).toFixed(2)}% για τα κόστη)`],
      [posFolds / folds.length >= 0.6, `Θετικό top 10% σε ${posFolds}/${folds.length} περιόδους (χρειάζεται ≥ 60%)`],
      [folds[folds.length - 1].ic > 0, folds[folds.length - 1].ic > 0 ? "Θετική συσχέτιση και στην πιο πρόσφατη περίοδο" : "Αρνητική συσχέτιση στην πιο πρόσφατη περίοδο"],
    ];
    const validated = gate.every((g) => g[0]);
    // τελικό μοντέλο σε όλο το ιστορικό
    const fin = solveRidge(ts.map((t) => ST.get(t))), w = fin.w, Xs = { length: fin.n };
    out[hz] = { ok: true, H, validated, gate: gate.map(([p, t]) => ({ pass: !!p, text: t })), icMean: r2(icMean, 4), icT: r2(icT, 2),
      icPos: r2(icsAll.filter((x) => x > 0).length / Math.max(1, icsAll.length), 3), top: r2(top, 5), longShort: r2(top - bottom, 5),
      deciles, folds, w: Array.from(w), nTrain: Xs.length, nDates: ts.length, trainedAt: new Date().toISOString(), dataEnd: panel.dates[ts[ts.length - 1]] };
  }
  return out;
}

// ================================================================== πλήρες scan όλης της αγοράς
async function fullScan({ train = false } = {}, post) {
  const t0 = performance.now();
  post({ type: "progress", step: "Φόρτωση τιμών από τη μνήμη του τηλεφώνου", pct: 2 });
  const C = await buildSeries();
  if (!C.series.size) return { ok: false, reason: "Δεν υπάρχουν ακόμα δεδομένα. Ξεκίνα τον συγχρονισμό." };
  const spyS = C.series.get("SPY");
  const spyX = spyS ? indicators(spyS) : null;
  const spyRetAt = (d) => { if (!spyS) return null; const k = C.spy.idx.get(d); if (k === undefined) return null; return { r21: spyX.ret21[k], r63: spyX.ret63[k] }; };
  const special = new Set([...MARKET, ...Object.values(SECTOR_ETF)]);
  let model = (await kvGet("model")) || {};
  const age = Date.now() - Date.parse(model.rank5?.trainedAt || 0);
  const enough = C.D >= 300;
  const needTrain = enough && (train || !model.rank5?.ok || !(age < 6 * 864e5) || (model.days || 0) + 20 <= C.D);
  if (!enough) model = { rank5: { ok: false, reason: `Χρειάζονται τουλάχιστον 300 ημέρες ιστορικού για να εκπαιδευτεί και να ελεγχθεί (τώρα ${C.D}).` },
    rank21: { ok: false, reason: `Χρειάζονται τουλάχιστον 300 ημέρες ιστορικού (τώρα ${C.D}).` } };
  const step = 3, panelRows = new Map(); // δείγμα κάθε 3η μέρα για εκπαίδευση, στις 1500 πιο ρευστές μετοχές
  const trainSet = new Set([...C.series.entries()].filter(([t]) => !special.has(t)).map(([t, S]) => { const n = S.c.length; let dv = 0; for (let j = Math.max(0, n - 20); j < n; j++) dv += S.c[j] * S.v[j]; return [t, dv]; })
    .sort((a, b) => b[1] - a[1]).slice(0, 1500).map((x) => x[0]));
  const latestRows = [], perT = [];
  let above50 = 0, nBreadth = 0, k = 0, values = 0;
  for (const [ticker, S] of C.series) {
    k++; if (k % 400 === 0) post({ type: "progress", step: `Ανάλυση μετοχών: ${k}/${C.series.size}`, pct: 5 + Math.round(k / C.series.size * (needTrain ? 30 : 80)) });
    const n = S.c.length; if (n < 60 || special.has(ticker)) continue;
    const X = indicators(S); values += n * 40;
    const i = n - 1;
    if (S.t[i] !== C.D - 1) continue; // δεν διαπραγματεύτηκε την τελευταία μέρα
    if (isF(X.sma50[i])) { nBreadth++; if (S.c[i] > X.sma50[i]) above50++; }
    if (needTrain && trainSet.has(ticker)) {
      for (let j = 63; j < n - 1; j++) {
        if (S.t[j] % step) continue;
        const f = featRow(S, X, j, spyRetAt(S.dates[j]));
        const e = S.o[j + 1];
        const fwd = (H) => (j + H < n && S.t[j + H] - S.t[j] <= H + 3 && e > 0 ? S.c[j + H] / e - 1 : NaN);
        const tt = S.t[j]; if (!panelRows.has(tt)) panelRows.set(tt, []);
        panelRows.get(tt).push({ f: Float32Array.from(f), fwd5: fwd(5), fwd21: fwd(21) });
      }
    }
    latestRows.push({ ticker, f: featRow(S, X, i, spyRetAt(S.dates[i])) });
    const T = techAnalyze(S, X, i, C.spy); if (!T.ok) continue;
    const sr = supportResistance(S, X, i);
    perT.push({ ticker, T, R: riskAnalyze(T), RS: rawSetups(S, X, i, sr), sp: Array.from(S.c.slice(-40)).map((x) => r2(x, 3)), close: S.c[i] });
  }
  const breadth = nBreadth ? above50 / nBreadth * 100 : null;
  C.latestF = new Map(latestRows.map((r) => [r.ticker, r.f]));
  const mk = marketContext(C, breadth);
  if (needTrain) {
    const res = trainModels({ rows: panelRows, dates: C.dates, step }, post);
    model = { ...res, values, days: C.D, builtAt: new Date().toISOString() };
    await kvSet("model", model);
  }
  panelRows.clear();
  // πρόβλεψη για σήμερα
  post({ type: "progress", step: "Πρόβλεψη και ευκαιρίες για σήμερα", pct: 85 });
  const Xl = csRank(latestRows.map((r) => r.f), FEATS.length);
  const pred = {};
  for (const hz of Object.keys(MODEL_H)) {
    const m = model[hz]; if (!m?.ok) continue;
    const raw = Xl.map((x) => predict(m.w, x)), rp = rankPct(raw);
    latestRows.forEach((r, q) => { (pred[r.ticker] ||= {})[hz] = { rank: rp[q], exp: m.deciles[Math.min(9, Math.floor(rp[q] * 10))]?.avg ?? null, validated: m.validated }; });
  }
  const latestX = new Map(latestRows.map((r, q) => [r.ticker, Xl[q]]));
  const rows = [], signals = [];
  for (const { ticker, T, R, RS, sp, close } of perT) {
    const p = pred[ticker] || {};
    const val = ["rank5", "rank21"].filter((h) => p[h]?.validated).map((h) => p[h].rank);
    const mlScore = val.length ? val.reduce((a, b) => a + b, 0) / val.length * 100 : null;
    const sc = scoreStock(T, R, null, mk, mlScore);
    const ev = evaluate(ticker, RS, T, R, sc, null, mk, p);
    const cats = [];
    if (T.flags.includes("breakout_20") || T.flags.includes("breakout_55")) cats.push("breakout");
    if (T.flags.includes("unusual_volume")) cats.push("volume");
    if ((T.m.ret63 ?? 0) > 25 && T.flags.includes("trend_up")) cats.push("momentum");
    if (T.flags.includes("oversold") || T.flags.includes("bull_div")) cats.push("reversal");
    if ((T.m.atrPct ?? 0) > 6) cats.push("volatile");
    if (val.length && Math.max(...val) >= 0.95) cats.push("model");
    if (T.flags.includes("squeeze")) cats.push("squeeze");
    rows.push({ t: ticker, n: C.ref[ticker]?.n || "", p: r2(close, 4), ch: T.m.chg, s: sc.score, te: T.technical, mo: T.momentum, rsi: T.m.rsi, rv: T.m.rvol,
      atr: T.m.atrPct, r21: T.m.ret21, r63: T.m.ret63, dv: T.m.dv20, r5: p.rank5?.rank ?? null, r21m: p.rank21?.rank ?? null, mv: { rank5: !!p.rank5?.validated, rank21: !!p.rank21?.validated },
      sp, su: ev.acc.map((a) => a.horizon + ":" + a.bias), cats, fl: T.flags });
    for (const a of ev.acc) signals.push({ ...a, name: C.ref[ticker]?.n || "", spark: sp, chg: T.m.chg });
  }
  // καλύτερες 10 ανά κατηγορία: μοντέλο κατάταξης → βαθμολογία → κέρδος/ρίσκο
  const key = (s) => [s.rank ?? -1, s.bias === "bullish" ? s.score : 100 - s.score, s.rr];
  const cmp = (a, b) => { const x = key(a), y = key(b); for (let q = 0; q < x.length; q++) if (x[q] !== y[q]) return y[q] - x[q]; return 0; };
  const picked = [];
  for (const hz of Object.keys(HORIZONS)) picked.push(...signals.filter((s) => s.horizon === hz).sort(cmp).slice(0, 10));
  picked.sort(cmp);
  rows.sort((a, b) => b.s - a.s);
  const secs = (performance.now() - t0) / 1000;
  const summary = { ok: true, asOf: C.dates[C.D - 1], days: C.D, firstDate: C.dates[0], universe: rows.length, market: mk, rows, signals: picked,
    model: Object.fromEntries(Object.entries(model).filter(([k2]) => MODEL_H[k2]).map(([k2, v]) => [k2, { ...v, w: undefined }])),
    stats: { seconds: r2(secs, 1), values, perSec: Math.round(values / Math.max(secs, 0.001)) }, builtAt: new Date().toISOString() };
  await kvSet("scan", summary);
  await trackSignals(picked, C);
  return summary;
}

/* ιστορικό ευκαιριών: πώς πήγαν (είσοδος στο επόμενο άνοιγμα, αν πιαστούν stop και στόχος την ίδια μέρα μετράει το stop) */
async function trackSignals(picked, C) {
  const hist = (await kvGet("sighist")) || [];
  const keyOf = (s) => `${s.ticker}|${s.horizon}|${s.date}`;
  const have = new Set(hist.map(keyOf));
  for (const s of picked) if (!have.has(keyOf(s))) hist.push({ ticker: s.ticker, horizon: s.horizon, bias: s.bias, setup: s.setup, date: s.date, entry: s.entry, stop: s.stop, tp1: s.tp1, tp2: s.tp2, maxDays: s.maxDays, status: "open" });
  for (const h of hist) {
    if (h.status !== "open") continue;
    const S = C.series.get(h.ticker); if (!S) continue;
    const j0 = S.dates.indexOf(h.date); if (j0 < 0 || j0 >= S.c.length - 1) continue;
    const long = h.bias === "bullish", e = S.o[j0 + 1]; let res = null;
    for (let j = j0 + 1; j < S.c.length && j <= j0 + h.maxDays; j++) {
      const hitStop = long ? S.l[j] <= h.stop : S.h[j] >= h.stop, hitTp = long ? S.h[j] >= h.tp2 : S.l[j] <= h.tp2;
      if (hitStop) { res = { status: "stop", exit: h.stop, exitDate: S.dates[j] }; break; }
      if (hitTp) { res = { status: "target", exit: h.tp2, exitDate: S.dates[j] }; break; }
      if (j === j0 + h.maxDays) res = { status: "expired", exit: S.c[j], exitDate: S.dates[j] };
    }
    if (res) Object.assign(h, res, { fill: e, ret: r2(((res.exit / e) - 1) * (long ? 100 : -100), 2) });
  }
  await kvSet("sighist", hist.slice(-400));
}

// ================================================================== ανάλυση μίας μετοχής (σελίδα μετοχής)
const POS = new Set("beat beats record surge surges soar soars jump jumps rally gain gains strong growth raise raises raised upgrade upgraded outperform approval approved win wins won award awarded expand expansion profit profitable exceed exceeds boost bullish breakthrough positive accelerate higher upside partnership milestone success".split(" "));
const NEG = new Set("miss misses missed plunge plunges plummet tumble tumbles fall falls fell drop drops slump weak decline declines loss losses cut cuts lower lowers lowered downgrade downgraded underperform reject rejected delay delayed halt recall lawsuit probe investigation fraud bankruptcy dilution offering warn warns warning bearish negative concern fears layoffs selloff slowdown default disappoint disappointing crash".split(" "));
const CATS = [["Χρεοκοπία", /\b(bankruptcy|chapter 11|going concern|delist)/i, -0.9], ["Αύξηση κεφαλαίου", /\b(public offering|stock offering|registered direct|at-the-market|private placement|convertible notes?)/i, -0.6],
  ["FDA / κλινικές", /\b(fda|pdufa|phase (1|2|3|i|ii|iii)|clinical trial)/i, 0], ["Αποτελέσματα", /\b(earnings|quarterly results|q[1-4] results|eps|revenue (beat|miss))/i, 0],
  ["Guidance", /\b(guidance|outlook|forecast)\b/i, 0], ["Εξαγορά", /\b(acquire|acquisition|merger|takeover|buyout|tender offer)/i, 0.3], ["Συμβόλαιο", /\b(contract|awarded|order worth|purchase order)/i, 0.5],
  ["Συνεργασία", /\b(partner(ship)?|collaborat|joint venture)/i, 0.4], ["Αναβάθμιση", /\b(upgrade[sd]?|raises? (price )?target)/i, 0.6], ["Υποβάθμιση", /\b(downgrade[sd]?|cuts? (price )?target|lowers? (price )?target)/i, -0.6],
  ["Νομικά", /\b(lawsuit|sued|investigation|subpoena|class action|probe|fraud)/i, -0.5], ["Επαναγορά", /\b(buyback|repurchase)/i, 0.5]];
function newsScore(items) {
  if (!items?.length) return { n: 0, score: null, items: [] };
  const now = Date.now(); let num = 0, den = 0;
  const seen = new Set(), out = [];
  for (const it of items) {
    const key = (it.title || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").slice(0, 8).join(" "); if (seen.has(key)) continue; seen.add(key);
    const text = `${it.title} ${it.summary || ""}`;
    let cat = "Γενικό", prior = 0; for (const [nm, re, pr] of CATS) if (re.test(text)) { cat = nm; prior = pr; break; }
    const words = text.toLowerCase().match(/[a-z][a-z'-]+/g) || []; let s = 0, c = 0;
    words.forEach((w, i) => { const v = POS.has(w) ? 1 : NEG.has(w) ? -1 : 0; if (!v) return; const neg = ["not", "no", "never", "without"].includes(words[i - 1]); s += neg ? -v : v; c++; });
    const sent = Math.max(-1, Math.min(1, (c ? s / Math.sqrt(c + 1) * 0.6 : 0) + prior * 0.5));
    const age = (now - (it.ts || now)) / 864e5, wgt = Math.exp(-age / 5);
    num += sent * wgt; den += wgt; out.push({ ...it, cat, sent: r2(sent, 2) });
  }
  return { n: out.length, score: den ? r2(50 + 50 * Math.tanh(num / den * 1.5), 1) : null, items: out };
}
function fundScore(m, profile, earn) {
  if (!m) return null;
  const pts = [], pros = [], cons = []; let have = 0, tot = 0;
  const add = (v, f) => { tot++; if (isF(v)) { have++; f(v); } };
  add(m.revenueGrowthTTMYoy, (v) => { pts.push(clip(v / 3, -3, 3)); if (v > 15) pros.push(`Έσοδα +${v.toFixed(0)}% σε 1 χρόνο`); else if (v < -5) cons.push(`Έσοδα ${v.toFixed(0)}% σε 1 χρόνο`); });
  add(m.epsGrowthTTMYoy, (v) => { pts.push(clip(v / 10, -2, 2)); });
  add(m.netProfitMarginTTM, (v) => { pts.push(v > 15 ? 2 : v > 5 ? 1 : v > 0 ? 0 : -2); if (v < 0) cons.push("Η εταιρεία είναι ζημιογόνα"); });
  add(m.roeTTM, (v) => pts.push(v > 20 ? 1.5 : v > 10 ? 0.5 : v < 0 ? -1 : 0));
  add(m["totalDebt/totalEquityQuarterly"], (v) => { pts.push(v > 2 ? -1.5 : v < 0.5 ? 1 : 0); if (v > 2) cons.push("Υψηλός δανεισμός"); });
  add(m.currentRatioQuarterly, (v) => pts.push(v < 1 ? -1 : v > 2 ? 0.5 : 0));
  add(m.peTTM, (v) => { pts.push(v <= 0 ? -0.5 : v < 15 ? 1 : v > 60 ? -1 : 0); });
  const raw = pts.reduce((s, x) => s + x, 0);
  let dte = null, edate = null;
  if (earn?.length) { const today = new Date().toISOString().slice(0, 10); const nx = earn.map((e) => e.date).filter((d) => d >= today).sort()[0]; if (nx) { edate = nx; dte = Math.round((Date.parse(nx) - Date.parse(today)) / 864e5); } }
  return { score: have ? r2(clip(50 + raw * 6), 1) : null, coverage: r2(have / tot, 2), pros, cons, daysToEarnings: dte, earningsDate: edate };
}

function chartSeries(S, X, bars = 400) {
  const n = S.c.length, from = Math.max(0, n - bars), L = (a) => { const o = []; for (let i = from; i < n; i++) if (isF(a[i])) o.push({ time: S.dates[i], value: r2(a[i], 4) }); return o; };
  const candles = [], volume = [];
  for (let i = from; i < n; i++) { candles.push({ time: S.dates[i], open: r2(S.o[i], 4), high: r2(S.h[i], 4), low: r2(S.l[i], 4), close: r2(S.c[i], 4) }); volume.push({ time: S.dates[i], value: S.v[i], up: S.c[i] >= S.o[i] }); }
  return { candles, volume, ema9: L(X.ema9), ema20: L(X.ema20), ema50: L(X.ema50), ema200: L(X.ema200), sma50: L(X.sma50), sma200: L(X.sma200),
    bbUp: L(X.bbUp), bbLo: L(X.bbLo), vwap20: L(X.vwap20), rsi: L(X.rsi), macd: L(X.macd), macdSig: L(X.macdSig), macdHist: L(X.macdHist) };
}

async function analyzeOne({ ticker, bars, extras }) {
  const C = CACHE || await buildSeries();
  let S = C.series.get(ticker);
  if (bars && bars.length > 30 && (!S || bars.length > S.c.length)) {
    const n = bars.length; S = { o: new Float64Array(n), h: new Float64Array(n), l: new Float64Array(n), c: new Float64Array(n), v: new Float64Array(n), dates: new Array(n), t: new Int32Array(n) };
    bars.forEach((b, k) => { S.o[k] = b.o; S.h[k] = b.h; S.l[k] = b.l; S.c[k] = b.c; S.v[k] = b.v || 0; S.dates[k] = b.d; S.t[k] = k; });
  }
  if (!S || S.c.length < 60) return { ok: false, reason: S ? `Μόνο ${S.c.length} ημέρες ιστορικού (χρειάζονται 60)` : "Δεν υπάρχουν δεδομένα για αυτή τη μετοχή" };
  const X = indicators(S), i = S.c.length - 1;
  const T = techAnalyze(S, X, i, C.spy), R = riskAnalyze(T);
  const scan = await kvGet("scan"), model = (await kvGet("model")) || {};
  const mk = scan?.market;
  const fund = fundScore(extras?.metric, extras?.profile, extras?.earnings);
  const news = newsScore(extras?.news);
  // πρόβλεψη: θέση στην κατάταξη της τελευταίας ημέρας της αγοράς + τι την οδηγεί (συνεισφορά κάθε χαρακτηριστικού)
  const pred = {};
  const row = scan?.rows?.find((r) => r.t === ticker);
  if (!C.latestF && C.series.size > 50) {
    const sp = C.series.get("SPY"), spx = sp ? indicators(sp) : null, ld = C.dates[C.D - 1];
    C.latestF = new Map();
    for (const [t2, S2] of C.series) { const n2 = S2.c.length; if (n2 < 64 || S2.dates[n2 - 1] !== ld) continue;
      const k2 = sp ? C.spy.idx.get(ld) : undefined; C.latestF.set(t2, featRow(S2, indicators(S2), n2 - 1, k2 === undefined ? null : { r21: spx.ret21[k2], r63: spx.ret63[k2] })); }
  }
  const spyRet = (() => { const s = C.series.get("SPY"); if (!s) return null; const sx = indicators(s); const k = s.dates.indexOf(S.dates[i]); return k < 0 ? null : { r21: sx.ret21[k], r63: sx.ret63[k] }; })();
  for (const hz of Object.keys(MODEL_H)) {
    const m = model[hz]; if (!m?.ok) continue;
    const rank = hz === "rank5" ? row?.r5 : row?.r21m;
    const drivers = [];
    if (C.latestF && C.latestF.size > 50 && S.dates[i] === C.dates[C.D - 1]) {
      // θέση κάθε χαρακτηριστικού έναντι όλης της αγοράς την ίδια ημέρα × βάρος του μοντέλου
      const f = C.latestF.get(ticker) || featRow(S, X, i, spyRet);
      const sample = [...C.latestF.values()];
      FEATS.forEach((nm, k) => { if (!isF(f[k])) return; const vals = sample.map((r) => r[k]).filter(isF); if (vals.length < 20) return;
        const q = vals.filter((v) => v < f[k]).length / vals.length - 0.5; drivers.push({ label: FEAT_LABELS[nm], value: r2(f[k], 4), effect: m.w[k + 1] * q }); });
      const tot = drivers.reduce((s, d) => s + Math.abs(d.effect), 0) || 1; drivers.forEach((d) => (d.effect = r2(d.effect / tot, 4)));
      drivers.sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
    }
    pred[hz] = { label: hz === "rank5" ? "Κατάταξη 5 ημερών" : "Κατάταξη 1 μήνα", days: m.H, rank: rank ?? null, validated: m.validated,
      exp: isF(rank) ? m.deciles[Math.min(9, Math.floor(rank * 10))]?.avg : null, drivers: drivers.slice(0, 8) };
  }
  const val = Object.values(pred).filter((p) => p.validated && isF(p.rank)).map((p) => p.rank);
  const mlScore = val.length ? val.reduce((a, b) => a + b, 0) / val.length * 100 : null;
  const sc = scoreStock(T, R, { fund, news }, mk, mlScore);
  const sr = supportResistance(S, X, i);
  const ev = evaluate(ticker, rawSetups(S, X, i, sr), T, R, sc, { fund, news }, mk, pred);
  return { ok: true, ticker, asOf: S.dates[i], T, R, sc, fund, news, pred, setups: ev, sr, fib: fibonacci(S, i), vp: volumeProfile(S, i), chart: chartSeries(S, X), market: mk };
}

// ================================================================== μηνύματα
self.onmessage = async (e) => {
  const { id, cmd, args } = e.data || {};
  const post = (m) => self.postMessage({ id, ...m });
  try {
    let result;
    if (cmd === "scan") result = await fullScan(args || {}, post);
    else if (cmd === "analyze") result = await analyzeOne(args);
    else if (cmd === "invalidate") { CACHE = null; result = { ok: true }; }
    else throw new Error("Άγνωστη εντολή " + cmd);
    post({ type: "done", result });
  } catch (err) {
    post({ type: "error", error: String(err && err.message || err) });
  }
};
