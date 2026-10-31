/* US Alpha Mobile — πυρήνας: εργαλεία, αποθήκευση στο τηλέφωνο, πηγές δεδομένων, συγχρονισμός, AI.
   Οι κωδικοί (API keys) αποθηκεύονται ΜΟΝΟ στο τηλέφωνο. Δεν υπάρχει server: το τηλέφωνο μιλά
   απευθείας με τις πηγές (Massive, Finnhub) και με τον πάροχο AI, αν βάλεις κωδικό. */
"use strict";

// ================================================================== εργαλεία
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isNum = (v) => typeof v === "number" && isFinite(v);
const fmt = (v, d = 2) => (isNum(v) ? v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—");
const money = (v, d = 2) => (isNum(v) ? (v < 0 ? "−$" : "$") + fmt(Math.abs(v), d) : "—");
const pct = (v, d = 2) => (isNum(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}%` : "—");
const ratioPct = (v, d = 1) => (isNum(v) ? (v * 100).toFixed(d) + "%" : "—");
const big = (v) => !isNum(v) ? "—" : Math.abs(v) >= 1e12 ? (v / 1e12).toFixed(2) + "T" : Math.abs(v) >= 1e9 ? (v / 1e9).toFixed(2) + "B"
  : Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(0) + "K" : v.toFixed(0);
const cls = (v) => (isNum(v) ? (v > 0 ? "up" : v < 0 ? "down" : "") : "");
const topPct = (r) => (!isNum(r) ? "—" : r >= 0.5 ? `Top ${Math.max(1, Math.round((1 - r) * 100))}%` : `Τελευταίο ${Math.max(1, Math.round(r * 100))}%`);
const plain = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const parseISO = (iso) => new Date(iso && iso.length <= 10 ? iso + "T12:00:00Z" : iso);
const dday = (iso) => (iso ? parseISO(iso).toLocaleDateString("el-GR", { day: "numeric", month: "short", year: "numeric" }) : "—");
const dshort = (iso) => (iso ? parseISO(iso).toLocaleDateString("el-GR", { day: "numeric", month: "short" }) : "—");
const dt = (iso) => (iso ? parseISO(iso).toLocaleString("el-GR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const ago = (ms) => { if (!ms) return "—"; const s = (Date.now() - ms) / 1000; if (s < 90) return "μόλις τώρα"; if (s < 3600) return `πριν ${Math.round(s / 60)}′`; if (s < 86400) return `πριν ${Math.round(s / 3600)} ώρες`; return dday(new Date(ms).toISOString()); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HZ = { short: "1–5 ημέρες", swing: "Swing", day: "Day trade", invest: "Επένδυση" };

const _mem = {};
const store = {
  get(k, d) { try { const v = localStorage.getItem("uam." + k); return v === null ? (_mem[k] ?? d) : JSON.parse(v); } catch { return _mem[k] ?? d; } },
  set(k, v) { _mem[k] = v; try { localStorage.setItem("uam." + k, JSON.stringify(v)); } catch { /* ιδιωτική περιήγηση */ } },
};

function toast(msg, sev = "info") {
  const el = document.createElement("div");
  el.className = `toast ${sev}`; el.innerHTML = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), sev === "high" ? 9000 : 4500);
}

// ================================================================== IndexedDB (ίδια βάση με τον worker)
const DB_NAME = "usalpha-mobile", DB_VER = 1;
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
function reqP(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function kvGet(k) { const d = await idb(); return reqP(d.transaction("kv").objectStore("kv").get(k)); }
async function kvSet(k, v) { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
async function dayKeys() { const d = await idb(); return reqP(d.transaction("days").objectStore("days").getAllKeys()); }
async function dayCount() { const d = await idb(); const all = await reqP(d.transaction("days").objectStore("days").getAll()); return { total: all.length, data: all.filter((x) => x.n > 0).length, first: all.filter((x) => x.n > 0).map((x) => x.d).sort()[0], last: all.filter((x) => x.n > 0).map((x) => x.d).sort().pop() }; }
async function putDay(rec) { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction("days", "readwrite"); t.objectStore("days").put(rec); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
async function cacheGet(k, ttlMs) { try { const d = await idb(); const v = await reqP(d.transaction("cache").objectStore("cache").get(k)); return v && Date.now() - v.ts < ttlMs ? v.data : null; } catch { return null; } }
async function cacheSet(k, data) { try { const d = await idb(); const t = d.transaction("cache", "readwrite"); t.objectStore("cache").put({ ts: Date.now(), data }, k); } catch { /* */ } }
async function wipeAll() { const d = await idb(); for (const s of ["days", "kv", "cache"]) await new Promise((res) => { const t = d.transaction(s, "readwrite"); t.objectStore(s).clear(); t.oncomplete = res; }); }

// ================================================================== ρυθμίσεις (μόνο στο τηλέφωνο)
const Keys = {
  get massive() { return store.get("key.massive", ""); }, get finnhub() { return store.get("key.finnhub", ""); },
  get gemini() { return store.get("key.gemini", ""); }, get claude() { return store.get("key.claude", ""); },
  set(name, v) { store.set("key." + name, (v || "").trim()); },
  mask(v) { return v ? v.slice(0, 3) + "…" + v.slice(-4) : ""; },
};
const Settings = { get years() { return store.get("years", 2); }, set years(v) { store.set("years", v); } };

// ================================================================== Massive (πρώην Polygon): όλη η αγορά, 5 κλήσεις/λεπτό στο δωρεάν
const Limiter = {
  calls: [], queue: [], perMin: self.__UAM_TEST_FAST ? 100000 : 5, busy: false,
  acquire(priority = 0) { return new Promise((res) => { this.queue.push({ priority, res }); this.queue.sort((a, b) => b.priority - a.priority); this.pump(); }); },
  async pump() {
    if (this.busy) return; this.busy = true;
    while (this.queue.length) {
      const now = Date.now(); this.calls = this.calls.filter((t) => now - t < 61000);
      if (this.calls.length >= this.perMin) { const wait = 61000 - (now - this.calls[0]); this.nextAt = Date.now() + wait; await sleep(Math.min(wait, 2000)); continue; }
      this.calls.push(Date.now()); this.nextAt = 0; this.queue.shift().res();
    }
    this.busy = false;
  },
  penalize() { const now = Date.now(); this.calls = Array(this.perMin).fill(now); },
};
async function massive(path, params = {}, priority = 0) {
  if (!Keys.massive) throw new Error("Λείπει ο κωδικός Massive (Ρυθμίσεις)");
  const qs = new URLSearchParams({ ...params, apiKey: Keys.massive });
  for (let attempt = 0; attempt < 4; attempt++) {
    await Limiter.acquire(priority);
    let r;
    try { r = await fetch(`https://api.massive.com${path}?${qs}`); }
    catch { try { r = await fetch(`https://api.polygon.io${path}?${qs}`); } catch (e2) { if (attempt === 3) throw new Error("Δεν υπάρχει σύνδεση στο internet"); await sleep(3000); continue; } }
    if (r.status === 429) { Limiter.penalize(); continue; }
    let j = null; try { j = await r.json(); } catch { /* */ }
    if (r.status === 401) throw new Error("Ο κωδικός Massive δεν είναι σωστός");
    if (r.status === 403 || j?.status === "NOT_AUTHORIZED") { const e = new Error(j?.message || "Δεν επιτρέπεται στο δωρεάν πρόγραμμα"); e.code = "NA"; throw e; }
    if (!r.ok) { if (attempt === 3) throw new Error(j?.error || j?.message || `Massive ${r.status}`); await sleep(2000); continue; }
    return j;
  }
  throw new Error("Massive: πολλές αποτυχίες");
}

// ================================================================== Finnhub: τιμές σε πραγματικό χρόνο, ειδήσεις, θεμελιώδη (60 κλήσεις/λεπτό)
const FH = { calls: [] };
async function finnhub(path, params = {}, ttlMs = 0) {
  if (!Keys.finnhub) return null;
  const ck = "fh:" + path + JSON.stringify(params);
  if (ttlMs) { const c = await cacheGet(ck, ttlMs); if (c) return c; }
  const now = Date.now(); FH.calls = FH.calls.filter((t) => now - t < 60000);
  if (FH.calls.length >= 55) await sleep(60000 - (now - FH.calls[0]));
  FH.calls.push(Date.now());
  try {
    const r = await fetch(`https://finnhub.io/api/v1${path}?${new URLSearchParams({ ...params, token: Keys.finnhub })}`);
    if (r.status === 401 || r.status === 403) { FH.error = "Ο κωδικός Finnhub δεν είναι σωστός ή δεν επιτρέπει αυτά τα δεδομένα"; return null; }
    if (!r.ok) return null;
    const j = await r.json(); FH.error = null;
    if (ttlMs) cacheSet(ck, j);
    return j;
  } catch { return null; }
}
async function quote(t) {
  const q = await finnhub("/quote", { symbol: t }, 20000);
  return q && q.c ? { price: q.c, chg: q.dp, prev: q.pc, ts: q.t * 1000, live: true } : null;
}
async function quotes(list) { const out = {}; await Promise.all(list.slice(0, 40).map(async (t) => { const q = await quote(t); if (q) out[t] = q; })); return out; }
async function companyExtras(t) {
  const today = new Date(), from = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10), to = today.toISOString().slice(0, 10);
  const later = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  if (Keys.finnhub) {
    const [m, p, n, e] = await Promise.all([finnhub("/stock/metric", { symbol: t, metric: "all" }, 864e5), finnhub("/stock/profile2", { symbol: t }, 7 * 864e5),
      finnhub("/company-news", { symbol: t, from, to }, 30 * 60000), finnhub("/calendar/earnings", { symbol: t, from: to, to: later }, 864e5)]);
    return { metric: m?.metric || null, profile: p && p.name ? p : null,
      news: (n || []).slice(0, 30).map((x) => ({ title: x.headline, summary: x.summary, url: x.url, source: x.source, ts: x.datetime * 1000 })),
      earnings: e?.earningsCalendar || [], source: "finnhub" };
  }
  // χωρίς Finnhub: ειδήσεις και στοιχεία εταιρείας από Massive (μετράνε στο όριο των 5/λεπτό)
  const out = { metric: null, profile: null, news: [], earnings: [], source: "massive" };
  const det = await cacheGet("mz:det:" + t, 7 * 864e5) || await massive(`/v3/reference/tickers/${encodeURIComponent(t)}`, {}, 5).then((j) => { cacheSet("mz:det:" + t, j); return j; }).catch(() => null);
  if (det?.results) out.profile = { name: det.results.name, finnhubIndustry: det.results.sic_description, marketCapitalization: det.results.market_cap ? det.results.market_cap / 1e6 : null, weburl: det.results.homepage_url, description: det.results.description };
  const nw = await cacheGet("mz:news:" + t, 30 * 60000) || await massive("/v2/reference/news", { ticker: t, limit: 20, order: "desc" }, 5).then((j) => { cacheSet("mz:news:" + t, j); return j; }).catch(() => null);
  out.news = (nw?.results || []).map((x) => ({ title: x.title, summary: x.description, url: x.article_url, source: x.publisher?.name, ts: Date.parse(x.published_utc) }));
  return out;
}
async function tickerBars(t, years = 2) {
  const to = new Date().toISOString().slice(0, 10), from = new Date(Date.now() - years * 365 * 864e5).toISOString().slice(0, 10);
  const ck = "mz:bars:" + t; const c = await cacheGet(ck, 6 * 3600e3); if (c) return c;
  const j = await massive(`/v2/aggs/ticker/${encodeURIComponent(t)}/range/1/day/${from}/${to}`, { adjusted: "true", sort: "asc", limit: 50000 }, 10);
  const bars = (j?.results || []).map((b) => ({ d: new Date(b.t).toISOString().slice(0, 10), o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
  cacheSet(ck, bars);
  return bars;
}

// ================================================================== ημερολόγιο αγοράς ΗΠΑ
const HOLIDAYS = new Set(["2024-01-01", "2024-01-15", "2024-02-19", "2024-03-29", "2024-05-27", "2024-06-19", "2024-07-04", "2024-09-02", "2024-11-28", "2024-12-25",
  "2025-01-01", "2025-01-09", "2025-01-20", "2025-02-17", "2025-04-18", "2025-05-26", "2025-06-19", "2025-07-04", "2025-09-01", "2025-11-27", "2025-12-25",
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24"]);
const EARLY = new Set(["2026-11-27", "2026-12-24", "2027-11-26"]);
function nyParts(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, h: +p.hour % 24, m: +p.minute, wd: p.weekday };
}
const isTradingDay = (iso) => { const wd = new Date(iso + "T12:00:00Z").getUTCDay(); return wd > 0 && wd < 6 && !HOLIDAYS.has(iso); };
function tradingDaysBack(years) {
  const ny = nyParts(); const out = [];
  // τα δεδομένα μιας μέρας είναι διαθέσιμα μετά το κλείσιμο (ασφαλώς από τις 17:30 ώρα Ν. Υόρκης)
  let d = new Date(ny.date + "T12:00:00Z");
  if (!(ny.h > 17 || (ny.h === 17 && ny.m >= 30))) d = new Date(d.getTime() - 864e5);
  const stop = new Date(Date.now() - years * 365.25 * 864e5 + 3 * 864e5);
  while (d > stop) { const iso = d.toISOString().slice(0, 10); if (isTradingDay(iso)) out.push(iso); d = new Date(d.getTime() - 864e5); }
  return out; // νεότερη πρώτα
}
function sessionInfo() {
  // ώρες της (επόμενης) συνεδρίασης σε ώρα Ελλάδας
  const ny = nyParts(); let day = ny.date;
  const after = ny.h >= 20;
  const nextTD = (iso) => { let d = new Date(iso + "T12:00:00Z"); do { d = new Date(d.getTime() + 864e5); } while (!isTradingDay(d.toISOString().slice(0, 10))); return d.toISOString().slice(0, 10); };
  if (!isTradingDay(day) || after) day = nextTD(day);
  // offset Ν. Υόρκης εκείνη τη μέρα
  const probe = new Date(day + "T12:00:00Z");
  const nyH = +new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false }).format(probe);
  const off = 12 - nyH; // ώρες που απέχει η Ν. Υόρκη από UTC
  const at = (h, m) => Date.parse(day + "T00:00:00Z") + ((h + off) * 60 + m) * 60000;
  return { day, pre: at(4, 0), open: at(9, 30), close: EARLY.has(day) ? at(13, 0) : at(16, 0), end: at(20, 0) };
}

// ================================================================== συγχρονισμός όλης της αγοράς
const Sync = {
  running: false, stopFlag: false, st: { phase: "idle", done: 0, total: 0, msg: "", error: null, lastAt: store.get("sync.lastAt", 0) },
  listeners: new Set(),
  emit() { this.listeners.forEach((f) => { try { f(this.st); } catch { /* */ } }); },
  async ensureRef(force = false) {
    const meta = (await kvGet("refAt")) || 0;
    if (!force && Date.now() - meta < 7 * 864e5 && (await kvGet("ref"))) return;
    this.st = { ...this.st, phase: "ref", msg: "Λίστα όλων των αμερικανικών μετοχών", done: 0, total: 0 }; this.emit();
    const ref = {}; let url = "/v3/reference/tickers", params = { market: "stocks", active: "true", limit: 1000 }, pages = 0;
    while (url && pages < 30 && !this.stopFlag) {
      const j = await massive(url, params, 1); pages++;
      for (const x of j.results || []) ref[x.ticker] = { n: x.name, t: x.type, x: x.primary_exchange };
      this.st.msg = `Λίστα μετοχών: ${Object.keys(ref).length}`; this.emit();
      if (j.next_url) { const u = new URL(j.next_url); url = u.pathname; params = Object.fromEntries([...u.searchParams].filter(([k]) => k !== "apiKey")); } else url = null;
    }
    if (Object.keys(ref).length > 100) { await kvSet("ref", ref); await kvSet("refAt", Date.now()); }
  },
  async start({ onBatch } = {}) {
    if (this.running || !Keys.massive) return;
    this.running = true; this.stopFlag = false;
    try {
      try { await navigator.storage?.persist?.(); } catch { /* */ }
      await this.ensureRef();
      const ref = (await kvGet("ref")) || {};
      const KEEP_ETF = new Set(["SPY", "QQQ", "DIA", "IWM", "XLK", "XLF", "XLE", "XLV", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "XLC", "SMH", "XBI"]);
      const okType = (t) => { const r = ref[t]; if (KEEP_ETF.has(t)) return true; if (r) return ["CS", "ADRC", "ADRP", "ADRS", "OS", "GDR", "NYRS"].includes(r.t); return !/[.\-]/.test(t) && t.length <= 5; };
      let tickers = (await kvGet("tickers")) || []; const tid = new Map(tickers.map((t, i) => [t, i]));
      const have = new Set(await dayKeys());
      const target = tradingDaysBack(Settings.years), todo = target.filter((d) => !have.has(d));
      const retry = (await kvGet("retryDays")) || {};
      this.st = { ...this.st, phase: "days", done: target.length - todo.length, total: target.length, error: null }; this.emit();
      let since = 0, fetched = 0;
      for (const d of todo) {
        if (this.stopFlag) break;
        if (retry[d] && Date.now() - retry[d] < 3 * 3600e3) continue;
        this.st.msg = `Ημέρα ${dday(d)}`; this.emit();
        let j;
        try { j = await massive(`/v2/aggs/grouped/locale/us/market/stocks/${d}`, { adjusted: "true" }, 0); }
        catch (e) {
          if (e.code === "NA") {
            const recent = Date.now() - Date.parse(d) < 5 * 864e5;
            if (recent) { retry[d] = Date.now(); await kvSet("retryDays", retry); continue; }
            await putDay({ d, n: 0, na: true }); this.st.done++; this.emit(); continue; // πέρα από το όριο του δωρεάν προγράμματος
          }
          throw e;
        }
        const res = (j.results || []).filter((x) => x.c >= 1 && x.v > 0 && okType(x.T));
        if (!res.length) { if (Date.now() - Date.parse(d) < 5 * 864e5) { retry[d] = Date.now(); await kvSet("retryDays", retry); continue; } await putDay({ d, n: 0 }); this.st.done++; this.emit(); continue; }
        const n = res.length, ids = new Uint16Array(n), o = new Float32Array(n), h = new Float32Array(n), l = new Float32Array(n), c = new Float32Array(n), v = new Float32Array(n);
        res.forEach((x, k) => { let id = tid.get(x.T); if (id === undefined) { id = tickers.length; tickers.push(x.T); tid.set(x.T, id); } ids[k] = id; o[k] = x.o; h[k] = x.h; l[k] = x.l; c[k] = x.c; v[k] = x.v; });
        await kvSet("tickers", tickers);
        await putDay({ d, n, ids, o, h, l, c, v });
        delete retry[d];
        this.st.done++; since++; fetched++; this.st.lastAt = Date.now(); store.set("sync.lastAt", this.st.lastAt); this.emit();
        const cnt = this.st.done;
        if (onBatch && (cnt === 60 || cnt === 130 || cnt === 260 || cnt === 320 || (since >= 60 && cnt > 320))) { since = 0; onBatch(cnt); }
      }
      await kvSet("retryDays", retry);
      this.st = { ...this.st, phase: "done", msg: "Ενημερωμένο", error: null }; this.emit();
      if (onBatch && fetched > 0) onBatch(this.st.done, true);
    } catch (e) {
      this.st = { ...this.st, phase: "error", error: e.message }; this.emit();
    } finally { this.running = false; this.emit(); }
  },
  stop() { this.stopFlag = true; },
};

// ================================================================== worker (μηχανή ανάλυσης)
const Engine = {
  w: null, seq: 0, pending: new Map(), progress: null, onProgress: null,
  init() { this.w = new Worker("js/engine.js"); this.w.onmessage = (e) => { const m = e.data, p = this.pending.get(m.id);
    if (m.type === "progress") { this.progress = m; this.onProgress?.(m); return; }
    if (!p) return; this.pending.delete(m.id); this.progress = null; this.onProgress?.(null);
    if (m.type === "error") p.rej(new Error(m.error)); else p.res(m.result); };
    this.w.onerror = (e) => { for (const p of this.pending.values()) p.rej(new Error(e.message || "Σφάλμα μηχανής")); this.pending.clear(); };
  },
  call(cmd, args) { if (!this.w) this.init(); const id = ++this.seq; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.w.postMessage({ id, cmd, args }); }); },
  busy() { return this.pending.size > 0; },
};

// ================================================================== AI βοηθός (προαιρετικά: Gemini ή Claude, με κωδικό στο τηλέφωνο)
const AI = {
  enabled() { return !!(Keys.gemini || Keys.claude); },
  async ask(system, prompt) {
    if (Keys.claude) { try { return await this.claude(system, prompt); } catch (e) { if (!Keys.gemini) throw e; } }
    return this.gemini(system, prompt);
  },
  async gemini(system, prompt) {
    let model = store.get("ai.geminiModel", "");
    if (!model) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(Keys.gemini)}&pageSize=200`);
      if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? "Ο κωδικός Gemini δεν είναι σωστός" : "Gemini " + r.status);
      const j = await r.json();
      const cands = (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes("generateContent") && /flash/.test(m.name) && !/lite|image|tts|live|exp|preview|thinking/.test(m.name));
      const ver = (n) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [0, 0])[1]);
      cands.sort((a, b) => ver(b.name) - ver(a.name));
      model = (cands[0] || (j.models || []).find((m) => /flash/.test(m.name)))?.name;
      if (!model) throw new Error("Δεν βρέθηκε μοντέλο Gemini");
      store.set("ai.geminiModel", model);
    }
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${encodeURIComponent(Keys.gemini)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 1200 } }) });
    if (r.status === 404) { store.set("ai.geminiModel", ""); throw new Error("Το μοντέλο Gemini άλλαξε, δοκίμασε ξανά"); }
    if (!r.ok) throw new Error("Gemini " + r.status);
    const j = await r.json();
    return (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
  },
  async claude(system, prompt) {
    const call = (model) => fetch("https://api.anthropic.com/v1/messages", { method: "POST",
      headers: { "content-type": "application/json", "x-api-key": Keys.claude, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model, max_tokens: 1200, system, messages: [{ role: "user", content: prompt }] }) });
    let model = store.get("ai.claudeModel", "claude-haiku-5-5");
    let r = await call(model);
    if (r.status === 404) {
      const lm = await fetch("https://api.anthropic.com/v1/models?limit=50", { headers: { "x-api-key": Keys.claude, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } });
      const j = lm.ok ? await lm.json() : { data: [] };
      model = (j.data || []).map((m) => m.id).find((id) => /haiku/.test(id)) || (j.data || [])[0]?.id;
      if (!model) throw new Error("Δεν βρέθηκε μοντέλο Claude");
      store.set("ai.claudeModel", model); r = await call(model);
    }
    if (r.status === 401) throw new Error("Ο κωδικός Claude δεν είναι σωστός");
    if (!r.ok) throw new Error("Claude " + r.status);
    const j = await r.json();
    return (j.content || []).map((c) => c.text || "").join("").trim();
  },
};
