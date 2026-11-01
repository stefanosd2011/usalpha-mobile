/* US Alpha Mobile — πυρήνας: εργαλεία, αποθήκευση στο τηλέφωνο, δεδομένα από την ανάλυση στο cloud, AI.
   Η ανάλυση γίνεται κάθε βράδυ στο GitHub (ίδιος αλγόριθμος με το πρόγραμμα του υπολογιστή).
   Δεν χρειάζεται κανένας κωδικός: τιμές μέσα στη μέρα έρχονται κι αυτές από το cloud κάθε 30 λεπτά. */
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
const HZ = { short: "1–5 ημέρες", swing: "Swing (έως 5 εβδ.)", day: "Day trade αύριο", invest: "Επένδυση" };

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
async function cacheGet(k, ttlMs) { try { const d = await idb(); const v = await reqP(d.transaction("cache").objectStore("cache").get(k)); return v && Date.now() - v.ts < ttlMs ? v.data : null; } catch { return null; } }
async function cacheSet(k, data) { try { const d = await idb(); const t = d.transaction("cache", "readwrite"); t.objectStore("cache").put({ ts: Date.now(), data }, k); } catch { /* */ } }
async function wipeAll() { const d = await idb(); for (const s of ["days", "kv", "cache"]) await new Promise((res) => { const t = d.transaction(s, "readwrite"); t.objectStore(s).clear(); t.oncomplete = res; }); }

// ================================================================== ρυθμίσεις (μόνο στο τηλέφωνο)
const Keys = {
  get finnhub() { return store.get("key.finnhub", ""); },
  get gemini() { return store.get("key.gemini", ""); }, get claude() { return store.get("key.claude", ""); },
  set(name, v) { store.set("key." + name, (v || "").trim()); },
  mask(v) { return v ? v.slice(0, 3) + "…" + v.slice(-4) : ""; },
};

// ================================================================== δεδομένα από την καθημερινή ανάλυση στο cloud
// Κάθε βράδυ, μετά το κλείσιμο της αγοράς, το GitHub τρέχει τον πλήρη αλγόριθμο (ίδιο με του υπολογιστή)
// και δημοσιεύει έτοιμα αποτελέσματα. Η εφαρμογή απλώς τα διαβάζει: δεν χρειάζεται κωδικό ούτε server.
const Data = {
  snap: null, shards: new Map(), error: null, loadedAt: 0, server: false, serverAI: false,
  // στον υπολογιστή η ίδια εφαρμογή σερβίρεται από το πρόγραμμα (ζωντανά δεδομένα + AI του προγράμματος)
  async detectServer() {
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 2500);
      const r = await fetch("api/status", { cache: "no-store", signal: ctl.signal }); clearTimeout(t);
      if (!r.ok || !(r.headers.get("content-type") || "").includes("json")) return false;
      const j = await r.json(); this.server = !!j.session; this.serverAI = !!j.ai_enabled;
    } catch { this.server = false; }
    return this.server;
  },
  async load() {
    try {
      const r = await fetch("data/snapshot.json", { cache: "no-cache" });
      if (r.status === 404) { this.error = "pending"; return this.snap; }
      if (!r.ok) throw new Error("HTTP " + r.status);
      this.snap = await r.json(); this.error = null; this.loadedAt = Date.now(); this.fromCache = false;
      this.byT = new Map(this.snap.rows.map((x) => [x.t, x]));
      cacheSet("snap", this.snap);
    } catch (e) { this.error = navigator.onLine === false ? "offline" : e.message; }
    return this.snap;
  },
  // άμεσο άνοιγμα: η τελευταία ανάλυση από τη μνήμη της συσκευής, και μετά ανανέωση από το δίκτυο
  async loadCached() {
    const c = await cacheGet("snap", 5 * 864e5);
    if (c && !this.snap) { this.snap = c; this.byT = new Map(c.rows.map((x) => [x.t, x])); this.fromCache = true; }
    const a = await cacheGet("ai", 3 * 864e5);
    if (a && !this.ai) this.ai = a;
    return !!c;
  },
  // έτοιμες σημειώσεις AI της βραδινής ανάλυσης (αν έχει οριστεί το κρυφό κλειδί στο GitHub)
  ai: null,
  async loadAI() {
    try {
      const r = await fetch("data/ai.json", { cache: "no-cache" });
      if (!r.ok) return null;
      const j = await r.json();
      if (j && (j.market || j.brief || Object.keys(j.stocks || {}).length)) { this.ai = j; cacheSet("ai", j); }
    } catch { /* χωρίς AI η εφαρμογή δουλεύει κανονικά */ }
    return this.ai;
  },
  aiFor(t) { return this.ai?.stocks?.[String(t || "").toUpperCase()] || null; },
  row(t) { return this.byT?.get(t) || null; },
  // τιμές μέσα στη μέρα (κάθε 30′ από το cloud, χωρίς κωδικό)
  quotesAt: 0,
  async loadQuotes() {
    try {
      const r = await fetch("data/quotes.json", { cache: "no-cache" });
      if (!r.ok) return 0;
      const j = await r.json();
      if (!this.snap || !j.day || j.day <= (this.snap.asOf || "")) return 0;
      const ts = Date.parse(j.at); this.quotesAt = ts;
      for (const [t, [p, c]] of Object.entries(j.q || {})) if (!App.quotes[t] || App.quotes[t].src === "cloud") App.quotes[t] = { price: p, chg: c, ts, src: "cloud" };
      return Object.keys(j.q || {}).length;
    } catch { return 0; }
  },
  async stock(t) {
    const k = t.toUpperCase();
    if (this.shards.has(k)) return this.shards.get(k);
    const r = await fetch(`data/s/${encodeURIComponent(k.replace("^", "_").replace("/", "_"))}.json`, { cache: "no-cache" }).catch(() => null);
    if (!r) throw new Error("Δεν υπάρχει σύνδεση στο internet");
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    if (this.shards.size > 25) this.shards.delete(this.shards.keys().next().value);
    this.shards.set(k, j);
    return j;
  },
};

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
  return q && q.c ? { price: q.c, chg: q.dp, prev: q.pc, ts: q.t * 1000, live: true, src: "finnhub" } : null;
}
async function quotes(list) { const out = {}; await Promise.all(list.slice(0, 40).map(async (t) => { const q = await quote(t); if (q) out[t] = q; })); return out; }
async function liveNews(t) {
  if (!Keys.finnhub) return [];
  const from = new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10), to = new Date().toISOString().slice(0, 10);
  const n = await finnhub(t ? "/company-news" : "/news", t ? { symbol: t, from, to } : { category: "general" }, 30 * 60000);
  return (n || []).slice(0, 25).map((x) => ({ title: x.headline, url: x.url, source: x.source, at: new Date(x.datetime * 1000).toISOString() }));
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

// ================================================================== AI βοηθός (προαιρετικά: Gemini ή Claude, με κωδικό στο τηλέφωνο)
const AI = {
  enabled() { return !!(Keys.gemini || Keys.claude); },
  async server(message, ticker, history) {
    const r = await fetch("api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, ticker, history }) });
    if (!r.ok) throw new Error("Βοηθός προγράμματος " + r.status);
    return r.json();
  },
  async ask(system, prompt) {
    if (Keys.claude) { try { return await this.claude(system, prompt); } catch (e) { if (!Keys.gemini) throw e; } }
    return this.gemini(system, prompt);
  },
  // ανάγνωση εικόνας (π.χ. screenshot χαρτοφυλακίου): κλειδί της συσκευής, αλλιώς το AI του προγράμματος στον υπολογιστή
  async vision(system, prompt, image) {
    const errs = [];
    if (Keys.claude) { try { return await this.claude(system, prompt, image); } catch (e) { errs.push(e.message); } }
    if (Keys.gemini) { try { return await this.gemini(system, prompt, image); } catch (e) { errs.push(e.message); } }
    if (Data.server) {
      try { const r = await fetch("api/vision", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ system, prompt, image: image.b64, mime: image.mime }) });
        const j = await r.json(); if (r.ok && j.text) return j.text; errs.push(j.detail || j.error || "AI προγράμματος " + r.status); } catch (e) { errs.push(e.message); }
    }
    throw new Error(errs.length ? errs.join(" · ") : "Δεν υπάρχει κλειδί AI");
  },
  canVision() { return !!(Keys.claude || Keys.gemini || Data.server); },
  async gemini(system, prompt, image = null) {
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
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }, ...(image ? [{ inline_data: { mime_type: image.mime, data: image.b64 } }] : [])] }],
        generationConfig: { temperature: image ? 0 : 0.3, maxOutputTokens: image ? 3000 : 1200, ...(image ? { responseMimeType: "application/json" } : {}) } }) });
    if (r.status === 404) { store.set("ai.geminiModel", ""); throw new Error("Το μοντέλο Gemini άλλαξε, δοκίμασε ξανά"); }
    if (!r.ok) throw new Error("Gemini " + r.status);
    const j = await r.json();
    return (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
  },
  async claude(system, prompt, image = null) {
    const content = image ? [{ type: "image", source: { type: "base64", media_type: image.mime, data: image.b64 } }, { type: "text", text: prompt }] : prompt;
    const call = (model) => fetch("https://api.anthropic.com/v1/messages", { method: "POST",
      headers: { "content-type": "application/json", "x-api-key": Keys.claude, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model, max_tokens: image ? 3000 : 1200, system, messages: [{ role: "user", content }] }) });
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
