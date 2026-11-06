/* US Alpha — οθόνες (ίδιες σε κινητό και υπολογιστή). Ο βοηθός είναι στο bot.js. */
"use strict";

// ================================================================== εικονίδια & μικρά στοιχεία
const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>', filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>', bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>', send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>', theme: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4"/>', plus: '<path d="M12 5v14M5 12h14"/>', back: '<path d="m15 18-6-6 6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', chev: '<path d="m9 6 6 6-6 6"/>',
  model: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>', spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>', pc: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7z"/><path d="M4 7l11-3v3"/><circle cx="16" cy="13.5" r="1.2" fill="currentColor"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
};
const icon = (n) => `<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ""}</svg></span>`;
const chip = (t, k = "") => `<span class="chip ${k}">${t}</span>`;
const biasChip = (b) => (b === "bullish" ? chip("Ανοδικό", "up") : b === "bearish" ? chip("Πτωτικό", "down") : chip("Ουδέτερο"));
const emptyBox = (t, x = "") => `<div class="empty"><b>${t}</b>${x}</div>`;
const kv = (pairs) => `<dl class="kv">${pairs.filter(Boolean).map(([k, v, c]) => `<div><dt>${k}</dt><dd class="num ${c || ""}">${v}</dd></div>`).join("")}</dl>`;
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const chgPill = (c) => `<span class="pill num ${isNum(c) ? (c > 0 ? "up" : c < 0 ? "down" : "flat") : "flat"}">${pct(c)}</span>`;
const sec = (title, more = "", sub = "") => `<div class="sec-head"><h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ""}${more}</div>`;
const card = (body, cls = "") => `<section class="card ${cls}">${body}</section>`;
function hue(t) { let h = 0; for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
function logo(t, lg = false) {
  const s = String(t || "?"), ini = s.replace(/^\^/, "").replace(/[^A-Z0-9]/g, "").slice(0, s.length > 3 ? 2 : 3);
  const img = /^[A-Z.\-]{1,6}$/.test(s) ? `<img loading="lazy" alt="" src="https://financialmodelingprep.com/image-stock/${encodeURIComponent(s)}.png" onerror="this.remove()">` : "";
  return `<span class="logo ${lg ? "lg" : ""}" style="background:hsl(${hue(s)} 55% 42%)">${esc(ini)}${img}</span>`;
}
function spark(arr, { w = 120, h = 30, up = null, cls = "spark" } = {}) {
  const a = (arr || []).filter(isNum); if (a.length < 2) return `<svg class="${cls}" viewBox="0 0 ${w} ${h}"></svg>`;
  const mn = Math.min(...a), mx = Math.max(...a), rg = mx - mn || 1;
  const d = a.map((v, i) => `${i ? "L" : "M"}${((i / (a.length - 1)) * w).toFixed(1)} ${(h - 2 - ((v - mn) / rg) * (h - 4)).toFixed(1)}`).join("");
  const col = cls === "h-spark" ? "#fff" : (up ?? a[a.length - 1] >= a[0]) ? "var(--up)" : "var(--down)";
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}L${w} ${h}L0 ${h}Z" fill="${col}" opacity=".12"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>`;
}
function ring(s, size = "") {
  const C = 2 * Math.PI * 16, tr = `<circle cx="20" cy="20" r="16" fill="none" stroke="var(--card-3)" stroke-width="4"/>`;
  if (!isNum(s)) return `<div class="ring ${size}"><svg viewBox="0 0 40 40">${tr}</svg><b class="muted">—</b></div>`;
  const col = s >= 60 ? "var(--up)" : s <= 40 ? "var(--down)" : "var(--warn)";
  return `<div class="ring ${size}" aria-label="Βαθμολογία ${s.toFixed(0)}"><svg viewBox="0 0 40 40">${tr}<circle cx="20" cy="20" r="16" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(clamp(s) / 100 * C).toFixed(1)} ${C.toFixed(1)}"/></svg><b>${s.toFixed(0)}</b></div>`;
}
const SP = (s) => ({ ...s, entryLow: s.entryLow ?? s.entry_low, entryHigh: s.entryHigh ?? s.entry_high, stopPct: s.stopPct ?? s.stop_pct });
function ladder(s0, cur) {
  const s = SP(s0), a = s.stop, b = s.tp3; if (![a, b, s.tp1, s.tp2].every(isNum) || a === b) return "";
  const pos = (v) => clamp(((v - a) / (b - a)) * 100, -1, 101);
  const z0 = Math.min(pos(s.entryLow), pos(s.entryHigh)), z1 = Math.max(pos(s.entryLow), pos(s.entryHigh));
  return `<div class="ladder" role="img" aria-label="Stop ${fmt(a)}, είσοδος ${fmt(s.entryLow)}–${fmt(s.entryHigh)}, στόχοι ${fmt(s.tp1)}, ${fmt(s.tp2)}, ${fmt(b)}"><div class="track"></div>
    <div class="zone" style="left:${z0}%;width:${Math.max(2, z1 - z0)}%"></div><i class="mk stop" style="left:0"></i><i class="mk tp" style="left:${pos(s.tp1)}%"></i><i class="mk tp" style="left:${pos(s.tp2)}%"></i><i class="mk tp" style="left:100%"></i>
    ${isNum(cur) ? `<i class="mk now" style="left:${pos(cur)}%"></i>` : ""}<span class="lb stop">${fmt(a)}</span><span class="lb" style="left:${(z0 + z1) / 2}%">${fmt(s.entry)}</span>
    <span class="lb tp" style="left:${pos(s.tp2)}%">${fmt(s.tp2)}</span><span class="lb tp last">${fmt(b)}</span></div>`;
}
function vladder(s0, cur) {
  const s = SP(s0), R = Math.abs(s.entry - s.stop) || 1, ch = (v) => (isNum(cur) && cur ? pct((v / cur - 1) * 100, 1) : "");
  const rows = [{ k: "tp", l: "Στόχος 3", v: s.tp3, n: `${fmt(Math.abs(s.tp3 - s.entry) / R, 1)}R · ${ch(s.tp3)}` }, { k: "tp", l: "Στόχος 2", v: s.tp2, n: `${fmt(Math.abs(s.tp2 - s.entry) / R, 1)}R · ${ch(s.tp2)}` },
    { k: "tp", l: "Στόχος 1", v: s.tp1, n: `${ch(s.tp1)}, μετά stop στην είσοδο` }, { k: "en", l: "Είσοδος", v: s.entry, n: `${fmt(s.entryLow)}–${fmt(s.entryHigh)}` }, { k: "st", l: "Stop", v: s.stop, n: `ρίσκο ${fmt(s.stopPct, 1)}%` }];
  if (isNum(cur)) rows.push({ k: "nw", l: "Τώρα", v: cur, n: "τρέχουσα τιμή" });
  rows.sort((x, y) => y.v - x.v);
  return `<div class="vladder">${rows.map((r) => `<div class="${r.k}"><span>${r.l}</span><span class="muted">${esc(r.n)}</span><b class="num">${fmt(r.v)}</b></div>`).join("")}</div>`;
}
const seg = (items, on, attr) => `<div class="seg" role="tablist">${items.map(([k, l]) => `<button type="button" class="${k === on ? "on" : ""}" data-${attr}="${esc(k)}">${l}</button>`).join("")}</div>`;

// ================================================================== κατάσταση
const App = { quotes: {}, watch: store.get("watch", ["AEHR", "NVDA", "AAPL"]), route: "" };
const REGIME = { "Risk-on": { tone: "up", head: "Θετική", long: "Η αγορά είναι σε καλή διάθεση" }, "Risk-off": { tone: "down", head: "Φοβισμένη", long: "Η αγορά είναι φοβισμένη" },
  "Ουδέτερο": { tone: "neutral", head: "Ουδέτερη", long: "Η αγορά δεν έχει καθαρή κατεύθυνση" } };
const D = () => Data.snap;
const validated = () => Object.entries(D()?.model || {}).filter(([, m]) => m.validated).map(([k]) => k);
function saveWatch() { store.set("watch", App.watch); }
const qTime = (q) => new Date(q.ts).toLocaleTimeString("el-GR", { timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit", hour12: false });
const qChip = (q, asOf) => (q?.src === "finnhub" ? chip("Ζωντανή τιμή", "up") : q?.src === "cloud" ? chip(`Τιμή ${qTime(q)}`, "accent") : chip(`Κλείσιμο ${dshort(asOf)}`));
const curPx = (t, p) => App.quotes[t]?.price ?? p;
const curCh = (t, c) => App.quotes[t]?.chg ?? c;

// ================================================================== router
const routes = {};
const skeleton = () => `<div class="stack" aria-busy="true" aria-label="Φόρτωση"><div class="skel" style="height:150px;border-radius:28px"></div><div class="skel" style="height:22px;width:40%"></div><div class="skel" style="height:120px"></div><div class="skel" style="height:120px"></div></div>`;
function setMood() {
  const d = D(), q = App.quotes?.SPY, c = q?.chg ?? d?.idx?.SPY?.ch;
  document.documentElement.dataset.mood = !isNum(c) ? "flat" : c >= 0.15 ? "up" : c <= -0.15 ? "down" : "flat";
}
addEventListener("scroll", () => document.body.classList.toggle("scrolled", scrollY > 8), { passive: true });
async function router(opt = {}) {
  try { setMood(); } catch { /* πριν φορτώσουν τα δεδομένα */ }
  const h = location.hash.replace(/^#\/?/, "") || "home";
  const [name, ...rest] = h.split("/");
  const first = !App.route, changed = name !== App.route; App.route = name;
  const tab = { home: "home", day: "day", signals: "signals", scan: "scan", s: "scan", watch: "watch", tools: "tools", pf: "pf", goal: "pf" }[name] || "";
  $$(".tabbar a").forEach((a) => a.classList.toggle("on", a.dataset.r === tab));
  disposeCharts();
  const view = $("#view"), y = window.scrollY;
  if (!opt.soft) {
    const swap = () => { view.innerHTML = skeleton(); };
    // μία ήπια μετάβαση στην αλλαγή σελίδας (όπου το υποστηρίζει ο browser και δεν έχει ζητηθεί λιγότερη κίνηση)
    if (changed && !first && document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      try { await document.startViewTransition(swap).updateCallbackDone; } catch { swap(); }
    } else swap();
  }
  try { await (routes[name] || routes.home)(...rest.map(decodeURIComponent)); if (opt.soft) window.scrollTo(0, y); else if (changed) window.scrollTo(0, 0); }
  catch (e) { view.innerHTML = `<div class="stack"><div class="callout"><b>Δεν φόρτωσε.</b> ${esc(e.message)}</div><button class="btn" onclick="router()">Δοκίμασε ξανά</button></div>`; }
}
window.addEventListener("hashchange", () => router());

// ================================================================== συνεδρίαση
function renderSession() {
  const T = sessionInfo(), now = Date.now();
  const ath = (t) => new Date(t).toLocaleTimeString("el-GR", { timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit", hour12: false });
  const left = (ms) => { const m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60); return h ? `${h} ώρ. ${m % 60}′` : `${m}′`; };
  const f = (d) => d.toLocaleDateString("el-GR", { timeZone: "Europe/Athens" });
  const dayW = () => { const o = new Date(T.open); return f(o) === f(new Date()) ? "σήμερα" : f(o) === f(new Date(now + 864e5)) ? "αύριο" : o.toLocaleDateString("el-GR", { timeZone: "Europe/Athens", weekday: "long" }); };
  const s = now < T.pre ? "closed" : now < T.open ? "pre" : now < T.close ? "regular" : now < T.end ? "post" : "closed";
  const [title, sub, dot] = s === "regular" ? ["Ανοιχτή αγορά", `κλείνει σε ${left(T.close - now)}`, "live"] : s === "pre" ? ["Premarket", `ανοίγει σε ${left(T.open - now)}`, "pre"]
    : s === "post" ? ["After-hours", `τέλος σε ${left(T.end - now)}`, "pre"] : ["Κλειστή αγορά", `ανοίγει ${dayW()} ${ath(T.open)}`, ""];
  $("#session").innerHTML = `<span class="dot ${dot}"></span><b>${title}</b><span>· ${sub}</span>`;
}

// ================================================================== οι προβλέψεις μου (εταιρείες που διαλέγει ο χρήστης)
const myList = () => store.get("mypreds", []);
const setMy = (l) => store.set("mypreds", [...new Set(l.map((x) => String(x).toUpperCase()))].slice(0, 40));
const inMy = (t) => myList().includes(String(t).toUpperCase());
function toggleMy(t) { const T = String(t).toUpperCase(); setMy(inMy(T) ? myList().filter((x) => x !== T) : [T, ...myList()]); toast(inMy(T) ? `Η ${T} μπήκε στις προβλέψεις σου` : `Η ${T} βγήκε από τις προβλέψεις σου`); }
const M4 = (h) => D()?.model4?.models?.[h] || null;
// ποιο μοντέλο δείχνουμε: το v4 όπου είναι ενεργό ή μετρήθηκε καλύτερο από το παλιό, αλλιώς το v3
const useV4 = (h) => !!(M4(h)?.active || M4(h)?.better);
function rankOf(r, h) {
  const k = h === "rank5" ? "5" : "21", v4 = r?.["q" + k], v3 = r?.["r" + k];
  if (isNum(v4) && useV4(h)) return { v: v4, ver: "v4", ok: !!M4(h)?.active };
  return isNum(v3) ? { v: v3, ver: "v3", ok: !!D()?.model?.[h]?.validated } : isNum(v4) ? { v: v4, ver: "v4", ok: !!M4(h)?.active } : null;
}
function rankBar(x) {
  if (!x) return `<span class="muted small">—</span>`;
  const col = x.v >= 0.6 ? "var(--up)" : x.v <= 0.4 ? "var(--down)" : "var(--warn)";
  return `<span class="rbar" aria-hidden="true"><i style="width:${clamp(x.v * 100, 3, 100).toFixed(0)}%;background:${col}"></i></span><b class="num small">${topPct(x.v)}</b>`;
}
function myCard(t) {
  const r = Data.row(t) || { t, n: "", p: null, ch: null }, seen = store.get("mySeen", {}), fresh = D()?.asOf && seen[t] !== D().asOf;
  const a5 = rankOf(r, "rank5"), a21 = rankOf(r, "rank21");
  return `<a class="mp" href="#/s/${encodeURIComponent(t)}"><div class="mp-top">${logo(t)}<div style="min-width:0"><div class="tk">${esc(t)}</div><div class="nm">${esc(r.n || "")}</div></div>
    <div class="px"><b class="num">${fmt(curPx(t, r.p))}</b>${chgPill(curCh(t, r.ch))}</div></div>
    <div class="mp-row"><span>5 ημέρες</span>${rankBar(a5)}</div><div class="mp-row"><span>1 μήνας</span>${rankBar(a21)}</div>
    ${fresh ? `<div class="chips">${chip("Νέα πρόβλεψη", "accent")}</div>` : ""}</a>`;
}

// ================================================================== κάρτες
function rowItem(r, right = "chg") {
  const p = curPx(r.t, r.p), c = curCh(r.t, r.ch);
  const rt = right === "rv" ? `${fmt(r.rv, 1)}× όγκος` : right === "r5" ? topPct(r.r5) : right === "r21" ? topPct(r.r21) : right === "m1" ? pct(r.m1, 1) : right === "atr" ? `±${fmt(r.atr, 1)}%` : right === "s" ? `Score ${isNum(r.s) ? r.s.toFixed(0) : "—"}` : null;
  return `<a class="row" href="#/s/${encodeURIComponent(r.t)}">${logo(r.t)}<div style="min-width:0"><div class="tk">${esc(r.t)}</div><div class="nm">${esc(r.n || "")}</div></div>
    <div class="right"><b class="num">${fmt(p)}</b>${rt === null ? chgPill(c) : `<span class="small num ${right === "m1" ? cls(r.m1) : "soft"}">${rt}</span>`}</div></a>`;
}
function tradeCard(s0, kind = "sig") {
  const s = SP(s0), cur = curPx(s.ticker, s.cur ?? s.price), chg = curCh(s.ticker, s.chg);
  const why = kind === "day" ? (s.reasons || []).slice(0, 2).join(". ") : s.setup;
  const status = { active: chip("Μέσα στη ζώνη εισόδου", "accent"), tp1: chip("Πιάστηκε στόχος 1", "up"), tp2: chip("Πιάστηκε στόχος 2", "up") }[s.status] || "";
  return `<a class="trade" href="#/s/${encodeURIComponent(s.ticker)}"><div class="t-top">${logo(s.ticker)}<div style="min-width:0"><div class="tk">${esc(s.ticker)} ${s.bias === "bearish" ? chip("Short", "down") : ""}</div><div class="nm">${esc(s.name || "")}</div></div>
    <div class="px"><b class="num">${money(cur)}</b>${chgPill(chg)}</div></div>
    ${why ? `<div class="why">${esc(why)}</div>` : ""}
    ${kind === "day" && Data.aiFor(s.ticker) ? `<div class="ai-line"><b>AI</b> ${esc(Data.aiFor(s.ticker))}</div>` : ""}
    <div class="levels"><div><small>Είσοδος</small><b class="num">${fmt(s.entryLow)}–${fmt(s.entryHigh)}</b></div><div class="st"><small>Stop</small><b class="num">${fmt(s.stop)}</b></div><div class="tg"><small>Στόχος</small><b class="num">${fmt(s.tp2)}</b></div></div>
    ${ladder(s, cur)}
    <div class="chips">${kind === "day" ? chip("Day trade", "accent") : chip(esc(HZ[s.horizon] || s.horizon), "accent")}${s.confidence ? chip(esc(s.confidence) + " επιβεβαίωση") : ""}${isNum(s.rank) ? chip(topPct(s.rank) + " αγοράς", "sodium") : ""}${status}${isNum(s.rr) ? chip(`R/R ${fmt(s.rr, 1)}`) : ""}</div></a>`;
}
function newsItem(n) {
  const s = n.sent;
  return `<a class="news-item" href="${esc(n.url || "#")}" target="_blank" rel="noopener"><div class="ttl">${esc(n.title)}</div>
    <div class="nm2">${n.t ? `<b>${esc(n.t)}</b>` : ""}<span>${n.at ? dt(n.at) : ""}</span><span>${esc(n.source || "")}</span>${isNum(s) ? (s > 0.15 ? chip("Θετική", "up") : s < -0.15 ? chip("Αρνητική", "down") : chip("Ουδέτερη")) : ""}</div></a>`;
}

// ================================================================== φρεσκάδα δεδομένων
function freshness() {
  const d = D();
  if (!d) {
    if (Data.error === "pending") return `<div class="callout info"><b>Η πρώτη πλήρης ανάλυση τρέχει.</b> Άνοιξε ξανά σε λίγο.</div>`;
    return `<div class="callout"><b>Δεν φορτώθηκαν τα δεδομένα.</b> ${Data.error === "offline" ? "Δεν υπάρχει σύνδεση στο internet." : esc(Data.error || "")}<div style="margin-top:10px"><button class="btn" onclick="reload()">${icon("refresh")}Δοκίμασε ξανά</button></div></div>`;
  }
  const ageH = (Date.now() - Date.parse(d.builtAt)) / 3600e3;
  return ageH > 60 ? `<div class="callout"><b>Τα δεδομένα είναι από ${dt(d.builtAt)}.</b> Η βραδινή ενημέρωση άργησε. Τιμές κλεισίματος ${dday(d.asOf)}.</div>` : "";
}
async function reload() { await Data.load(); router(); }

// ================================================================== ΑΡΧΙΚΗ
routes.home = async () => {
  const d = D();
  if (!d) { $("#view").innerHTML = `<div class="stack">${freshness()}</div>`; return; }
  const m = d.market || {}, R = REGIME[m.regime] || { tone: "neutral", head: "—", long: "Αγορά" };
  const spy = d.idx?.SPY || {}, q = App.quotes.SPY, sp = q?.price ?? spy.p, sc = q?.chg ?? spy.ch;
  const hero = `<section class="hero">${spark(spy.sp, { w: 200, h: 80, cls: "h-spark" })}<div class="h-lbl">S&P 500 (SPY) · ${q ? `τιμή ${qTime(q)}` : `κλείσιμο ${dshort(d.asOf)}`}</div>
    <div class="h-val num">${fmt(sp)}</div><div class="h-chg num">${pct(sc)}</div>
    <div class="h-mood">Διάθεση αγοράς: ${R.head} ${isNum(m.score) ? `(${m.score.toFixed(0)}/100)` : ""}<small>${esc((m.simple || [])[0] || R.long)}</small></div>
    <div class="meter"><i style="width:${clamp(m.score ?? 0)}%"></i></div></section>`;
  const actions = `<div class="actions"><button class="act" data-go="#/day"><span class="c pri">${icon("bolt")}</span>Day trade</button><button class="act" data-go="#/signals"><span class="c">${icon("target")}</span>Ευκαιρίες</button>
    <button class="act" data-go="#/scan"><span class="c">${icon("filter")}</span>Scanner</button><button class="act" data-bot="1"><span class="c">${icon("chat")}</span>Βοηθός</button></div>`;
  const my = myList();
  const mine = my.length ? `${sec("Οι προβλέψεις μου", `<a class="more" href="#/my">Ρυθμίσεις</a>`)}<div class="hscroll">${my.slice(0, 12).map(myCard).join("")}</div>`
    : card(`<div class="cta-row"><span class="c">${icon("star")}</span><div><b>Οι προβλέψεις μου</b><div class="nm">Διάλεξε εταιρείες και δες εδώ κάθε μέρα τι προβλέπουν τα μοντέλα.</div></div><a class="btn sm" href="#/my">Διάλεξε</a></div>`);
  const bh = typeof briefHomeCard === "function" ? briefHomeCard() : "";
  const ai = bh || (Data.ai?.market ? card(`<div class="ai-head">${icon("spark")}<b>Σύνοψη AI</b><span class="muted small">${Data.ai.at ? dt(Data.ai.at) : ""}</span></div><p class="ai-text">${esc(Data.ai.market)}</p><div class="small muted">Γράφτηκε από AI μόνο με τα δεδομένα του συστήματος. Μπορεί να κάνει λάθος.</div><a class="btn sm brief-more" href="#/brief">Ενημερώσεις AI</a>`) : "");
  const dl = d.day?.long || [];
  const day = `${sec("Day trade για αύριο", `<a class="more" href="#/day">Όλα</a>`)}${dl.length ? `<div class="hscroll">${dl.slice(0, 6).map((x) => tradeCard(x, "day")).join("")}</div>` : card(dayEmpty(d, "Καμία υποψήφια σήμερα", "Δεν βρέθηκε μετοχή που να περνά όλα τα κριτήρια για day trade."))}`;
  const sig = d.signals || [];
  const opps = `${sec("Οι καλύτερες ευκαιρίες", sig.length > 3 ? `<a class="more" href="#/signals">Όλες (${sig.length})</a>` : "")}${sig.length ? `<div class="stack" style="gap:12px">${sig.slice(0, 3).map((s) => tradeCard(s)).join("")}</div>` : card(emptyBox("Καμία ευκαιρία σήμερα", "Η αναμονή είναι κι αυτή θέση."))}`;
  const tiles = `<div class="hscroll sm">${[["QQQ", "Nasdaq 100"], ["DIA", "Dow Jones"], ["IWM", "Russell 2000"], ["^VIX", "VIX (φόβος)"]].map(([t, n]) => { const x = d.idx?.[t]; const qq = App.quotes[t];
    return `<a class="tile" href="#/s/${encodeURIComponent(t)}"><div class="t-name">${n}</div><div class="t-val num">${fmt(qq?.price ?? x?.p)}</div><div class="t-chg num ${cls(qq?.chg ?? x?.ch)}">${pct(qq?.chg ?? x?.ch)}</div>${spark(x?.sp)}</a>`; }).join("")}</div>`;
  const val = validated(), rk = val.find((h) => h === "rank5" || h === "rank21"), rkey = rk === "rank5" ? "r5" : "r21";
  const model = rk ? `${sec("Τι βλέπει το μοντέλο")}${card(d.rows.filter((r) => isNum(r[rkey])).sort((a, b) => b[rkey] - a[rkey]).slice(0, 6).map((r) => rowItem(r, rkey)).join(""), "flush")}` : "";
  const mvTab = store.get("movers", "up"), liquid = (d.rows || []).filter((r) => (r.dv || 0) >= 5e6);
  const mv = (k) => k === "up" ? [...liquid].filter((r) => isNum(r.ch)).sort((a, b) => b.ch - a.ch) : k === "down" ? [...liquid].filter((r) => isNum(r.ch)).sort((a, b) => a.ch - b.ch) : [...liquid].filter((r) => isNum(r.rv)).sort((a, b) => b.rv - a.rv);
  const movers = `${sec("Κινήσεις ημέρας")}${seg([["up", "Άνοδοι"], ["down", "Πτώσεις"], ["vol", "Όγκος"]], mvTab, "mv")}${card(`<div id="mvList">${mv(mvTab).slice(0, 6).map((r) => rowItem(r, mvTab === "vol" ? "rv" : "chg")).join("")}</div>`, "flush")}`;
  const secs = (d.sectors || []).filter((s) => isNum(s.rel21)).slice(0, 11);
  const mx = Math.max(1, ...secs.map((s) => Math.abs(s.rel21)));
  const sectors = secs.length ? `${sec("Κλάδοι", "", "vs S&P 500, 1 μήνας")}${card(secs.map((s) => `<a class="sector-row" href="#/s/${encodeURIComponent(s.etf || "")}"><span>${esc(s.sector)}</span><span class="bar"><i style="${s.rel21 >= 0 ? "left:50%" : "right:50%"};width:${(Math.abs(s.rel21) / mx * 50).toFixed(1)}%;background:${s.rel21 >= 0 ? "var(--up)" : "var(--down)"}"></i></span><b class="num ${cls(s.rel21)}" style="text-align:right">${pct(s.rel21, 1)}</b></a>`).join(""), "flush")}` : "";
  const news = (d.news || []).length ? `${sec("Ειδήσεις", `<a class="more" href="#/news">Όλες</a>`)}${card(d.news.slice(0, 5).map(newsItem).join(""), "flush")}` : "";
  const pfc = typeof pfHomeCard === "function" ? pfHomeCard() : "";
  $("#view").innerHTML = `<div class="stack">${freshness()}${hero}${actions}${ai}${pfc}${mine}${day}<div class="wide2"><div class="stack">${opps}</div><div class="stack">${sec("Δείκτες")}${tiles}${model}${movers}</div></div><div class="wide2"><div class="stack">${sectors}</div><div class="stack">${news}</div></div>
    <div class="small muted" style="text-align:center">Ανάλυση ${fmt(d.analyzed, 0)} μετοχών, κλείσιμο ${dday(d.asOf)}, ενημέρωση ${dt(d.builtAt)}. Ανάλυση, όχι επενδυτική συμβουλή.</div></div>`;
  $$("[data-mv]").forEach((b) => b.addEventListener("click", () => { store.set("movers", b.dataset.mv); $$("[data-mv]").forEach((x) => x.classList.toggle("on", x === b)); $("#mvList").innerHTML = mv(b.dataset.mv).slice(0, 6).map((r) => rowItem(r, b.dataset.mv === "vol" ? "rv" : "chg")).join(""); }));
};
document.addEventListener("click", (e) => { const g = e.target.closest("[data-go]"); if (g) location.hash = g.dataset.go; const b = e.target.closest("[data-bot]"); if (b) openBot(); });

// ================================================================== DAY TRADE
// Πριν τρέξει η πρώτη ανάλυση με day trade δεν υπάρχουν υποψήφιες: το λέμε καθαρά αντί για «καμία».
const dayEmpty = (d, t, x) => (d?.day?.at ? emptyBox(t, x) : emptyBox("Ετοιμάζονται", `Οι υποψήφιες για day trade βγαίνουν με την επόμενη ημερήσια ανάλυση, μετά το κλείσιμο της αγοράς.${Data.server ? ' <a href="#/tools">Ανάλυση τώρα</a>' : ""}`));
routes.day = async () => {
  const d = D();
  if (!d) { $("#view").innerHTML = `<div class="stack">${freshness()}</div>`; return; }
  const tab = store.get("daytab", "long"), x = d.day || {}, list = tab === "short" ? x.short || [] : x.long || [];
  $("#view").innerHTML = `<div class="stack"><div><h1 class="page-title">Day trade για αύριο</h1><p class="page-sub">Μπαίνεις και βγαίνεις την ίδια μέρα. Είσοδος μόνο μέσα στη ζώνη, έξοδος στο stop, στον στόχο ή πριν το κλείσιμο.</p></div>
    ${seg([["long", `Αγορά (${(x.long || []).length})`], ["short", `Short (${(x.short || []).length})`]], tab, "dt")}
    ${list.length ? `<div class="stack" style="gap:12px">${list.map((s) => tradeCard(s, "day")).join("")}</div>` : card(dayEmpty(d, "Καμία υποψήφια", "Σήμερα καμία μετοχή δεν περνά όλα τα κριτήρια."))}
    ${!(x.rules || []).length ? "" : card(`<h3>Πώς επιλέγονται</h3><ul class="list">${(x.rules || []).map((r) => `<li><span>${esc(r)}</span></li>`).join("")}</ul>${x.n ? `<div class="small muted" style="margin-top:10px">${x.n} μετοχές πέρασαν τα κριτήρια, εδώ οι καλύτερες.</div>` : ""}`)}
    ${x.note ? `<div class="note">${esc(x.note)}</div>` : ""}</div>`;
  $$("[data-dt]").forEach((b) => b.addEventListener("click", () => { store.set("daytab", b.dataset.dt); router({ soft: true }); }));
};

// ================================================================== ΕΥΚΑΙΡΙΕΣ
routes.signals = async () => {
  const tab = store.get("sigtab", "active"), d = D();
  if (!d) { $("#view").innerHTML = `<div class="stack">${freshness()}</div>`; return; }
  const hist = d.hist || [], closed = hist.filter((h) => h.status === "closed" || h.status === "expired");
  const wins = closed.filter((h) => (h.ret ?? 0) > 0), avg = closed.length ? closed.reduce((s, h) => s + (h.ret || 0), 0) / closed.length : null;
  const OUT = (h) => h.outcome === "tp3" ? chip("Στόχος 3 ✓", "up") : /^stop μετά/.test(h.outcome || "") ? chip("Στόχος, μετά stop", "up") : h.outcome === "stop" ? chip("Stop", "down") : h.status === "expired" ? chip("Έληξε") : h.status === "new" ? chip("Αναμονή εισόδου", "accent") : chip("Ανοιχτή", "accent");
  const hz = store.get("sighz", ""), sigs = (d.signals || []).filter((s) => !hz || s.horizon === hz);
  const hzs = [...new Set((d.signals || []).map((s) => s.horizon))];
  $("#view").innerHTML = `<div class="stack"><div><h1 class="page-title">Ευκαιρίες</h1><p class="page-sub">Σχέδιο με είσοδο, stop και στόχους, μόνο όταν περνούν όλους τους ελέγχους. Ανάλυση, όχι εντολή αγοράς.</p></div>
    ${seg([["active", "Σημερινές"], ["hist", "Πώς πήγαν"]], tab, "sg")}
    ${tab === "active" ? `${hzs.length > 1 ? seg([["", "Όλες"], ...hzs.map((h) => [h, HZ[h] || h])], hz, "hz") : ""}${sigs.length ? `<div class="stack" style="gap:12px">${sigs.map((s) => tradeCard(s)).join("")}</div>` : card(emptyBox("Καμία ευκαιρία", "Το σύστημα δεν προτείνει είσοδο όταν οι επιβεβαιώσεις ή η σχέση κέρδους/ρίσκου δεν επαρκούν."))}`
    : `${card(closed.length ? kv([["Ολοκληρωμένες", closed.length], ["Κερδοφόρες", `${Math.round(wins.length / closed.length * 100)}%`, wins.length / closed.length >= 0.5 ? "up" : "down"], ["Μέση απόδοση", pct(avg), cls(avg)], ["Ανοιχτές", hist.length - closed.length]])
      : `<div class="soft">Δεν έχει ολοκληρωθεί ακόμα καμία ευκαιρία. Κάθε πρόταση ελέγχεται αυτόματα κάθε βράδυ με το υψηλό και το χαμηλό της ημέρας. Αν την ίδια μέρα πιαστούν stop και στόχος, μετράει το stop.</div>`)}
      ${card(hist.slice(0, 120).map((h) => `<a class="row" href="#/s/${encodeURIComponent(h.ticker)}">${logo(h.ticker)}<div style="min-width:0"><div class="tk">${esc(h.ticker)} <span class="muted small">${esc(HZ[h.horizon] || h.horizon)}</span></div><div class="nm">${esc(h.setup || "")}, ${dshort(h.date)}</div></div>
        <div class="right">${OUT(h)}<span class="num small ${cls(h.ret)}" style="display:block;margin-top:4px">${isNum(h.ret) ? pct(h.ret) : ""}</span></div></a>`).join("") || emptyBox("Κενό ιστορικό"), "flush")}`}</div>`;
  $$("[data-sg]").forEach((b) => b.addEventListener("click", () => { store.set("sigtab", b.dataset.sg); router({ soft: true }); }));
  $$("[data-hz]").forEach((b) => b.addEventListener("click", () => { store.set("sighz", b.dataset.hz); router({ soft: true }); }));
};

// ================================================================== SCANNER
routes.scan = async () => {
  const d = D();
  if (!d) { $("#view").innerHTML = `<div class="stack">${freshness()}</div>`; return; }
  const st = { cat: "", sort: "s", q: "", sec: "", liq: true, ...store.get("scanf2", {}) };
  const CATS = [["", "Όλες"], ...Object.entries(d.cats || {})];
  const SORTS = { s: "Συνολικό score", r5: "Μοντέλο 5 ημερών", r21: "Μοντέλο 1 μήνα", ch: "Μεταβολή σήμερα", rv: "Ασυνήθιστος όγκος", m1: "Απόδοση μήνα", atr: "Μεταβλητότητα" };
  const secs = [...new Set(d.rows.map((r) => r.sec).filter(Boolean))].sort();
  const list = d.rows.filter((r) => (!st.cat || r.cats.includes(st.cat)) && (!st.sec || r.sec === st.sec) && (!st.liq || (r.dv || 0) >= 5e6) && (!st.q || plain(r.t + " " + r.n).includes(plain(st.q))));
  list.sort((a, b) => (isNum(b[st.sort]) ? b[st.sort] : -1e9) - (isNum(a[st.sort]) ? a[st.sort] : -1e9));
  let shown = 60;
  const right = ["rv", "r5", "r21", "m1", "atr", "s"].includes(st.sort) ? st.sort : "chg";
  $("#view").innerHTML = `<div class="stack"><div><h1 class="page-title">Scanner</h1><p class="page-sub">${fmt(d.analyzed, 0)} μετοχές, κλείσιμο ${dday(d.asOf)}</p></div>
    ${seg(CATS, st.cat, "c")}
    <div class="grid2"><select class="input" id="sortSel" aria-label="Ταξινόμηση">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}" ${k === st.sort ? "selected" : ""}>${v}</option>`).join("")}</select>
      <select class="input" id="secSel" aria-label="Κλάδος"><option value="">Όλοι οι κλάδοι</option>${secs.map((s) => `<option ${s === st.sec ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></div>
    <div class="grid2"><input class="input" id="qIn" placeholder="Φίλτρο ονόματος" value="${esc(st.q)}" autocomplete="off" autocapitalize="characters">
      <label class="input" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="liq" ${st.liq ? "checked" : ""}>Μόνο ρευστές</label></div>
    ${sec(`${list.length} μετοχές`)}${card(`<div id="scanList">${list.slice(0, shown).map((r) => rowItem(r, right)).join("") || emptyBox("Τίποτα με αυτά τα φίλτρα")}</div>${list.length > shown ? `<div style="padding:12px 16px"><button class="btn block" id="moreBtn">Δείξε περισσότερες</button></div>` : ""}`, "flush")}</div>`;
  const save = () => { store.set("scanf2", st); router({ soft: true }); };
  $$("[data-c]").forEach((b) => b.addEventListener("click", () => { st.cat = b.dataset.c; save(); }));
  $("#sortSel").addEventListener("change", (e) => { st.sort = e.target.value; save(); });
  $("#secSel").addEventListener("change", (e) => { st.sec = e.target.value; save(); });
  $("#liq").addEventListener("change", (e) => { st.liq = e.target.checked; save(); });
  let tmr; $("#qIn").addEventListener("input", (e) => { clearTimeout(tmr); tmr = setTimeout(() => { st.q = e.target.value.trim(); save(); }, 400); });
  $("#moreBtn")?.addEventListener("click", (e) => { shown += 60; $("#scanList").innerHTML = list.slice(0, shown).map((r) => rowItem(r, right)).join(""); if (shown >= list.length) e.currentTarget.remove(); });
};

// ================================================================== WATCHLIST
routes.watch = async () => {
  if (Keys.finnhub) Object.assign(App.quotes, await quotes(App.watch));
  $("#view").innerHTML = `<div class="stack"><div><h1 class="page-title">Η λίστα μου</h1><p class="page-sub">${Data.quotesAt ? `Τιμές ${dt(new Date(Data.quotesAt).toISOString())}.` : "Τιμές κλεισίματος."}</p></div>
    <form id="wf" style="display:flex;gap:8px"><input class="input" id="wIn" placeholder="Πρόσθεσε σύμβολο, π.χ. AEHR" autocapitalize="characters" autocomplete="off"><button class="btn primary" aria-label="Προσθήκη" style="width:46px;padding:0">${icon("plus")}</button></form>
    ${card(App.watch.map((t) => { const r = Data.row(t) || { t, n: "Εκτός ανάλυσης", p: null, ch: null };
      return `<div style="display:grid;grid-template-columns:1fr 44px;align-items:center">${rowItem(r)}<button class="round-btn" style="background:none" data-del="${esc(t)}" aria-label="Αφαίρεση ${esc(t)}">${icon("trash")}</button></div>`; }).join("") || emptyBox("Άδεια λίστα"), "flush")}
    <button class="btn block" data-ask="__watch">${icon("chat")}Τι κάνει η λίστα μου;</button></div>`;
  $("#wf").addEventListener("submit", (e) => { e.preventDefault(); const t = $("#wIn").value.trim().toUpperCase(); if (!t || App.watch.includes(t)) return; App.watch.unshift(t); saveWatch(); router({ soft: true }); });
  $$("[data-del]").forEach((b) => b.addEventListener("click", () => { App.watch = App.watch.filter((x) => x !== b.dataset.del); saveWatch(); router({ soft: true }); }));
};

// ================================================================== ΜΕΤΟΧΗ
const STABS = [["model", "Πρόβλεψη"], ["setups", "Setups"], ["co", "Εταιρεία"], ["news", "Ειδήσεις"], ["tech", "Τεχνικά"]];
function dayFor(t) { const x = D()?.day || {}; return [...(x.long || []), ...(x.short || [])].find((c) => c.ticker === t) || null; }
routes.s = async (ticker) => {
  ticker = (ticker || "").toUpperCase();
  const view = $("#view");
  view.innerHTML = `<div class="loading"><span class="spinner"></span>Ανάλυση ${esc(ticker)}…</div>`;
  const [a, fq] = await Promise.all([Data.stock(ticker), quote(ticker.replace("^", ""))]);
  if (App.route !== "s") return;
  if (fq) App.quotes[ticker] = fq;
  const q = App.quotes[ticker] || null;
  if (!a) { view.innerHTML = `<div class="stack">${card(`<div class="stock-top">${logo(ticker, true)}<div><h1>${esc(ticker)}</h1></div></div>${emptyBox(`Η ${esc(ticker)} δεν είναι στην ανάλυση`, "Αναλύονται όλες οι μετοχές NASDAQ, NYSE και AMEX με τιμή πάνω από 1$ και αρκετό τζίρο.")}`)}</div>`; return; }
  a.q = q; App.last = a;
  const price = q?.price ?? a.price, chg = q?.chg ?? a.chg, inW = App.watch.includes(ticker);
  const head = `<section class="card"><div class="stock-top">${logo(ticker, true)}<div style="min-width:0"><h1>${esc(ticker)}</h1><div class="nm">${esc(a.name || (a.index ? "Δείκτης / ETF" : ""))}${a.sector ? ` · ${esc(a.sector)}` : ""}</div></div></div>
    <div class="price-big num" id="sPx">${money(price)}</div><div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap"><span id="sPxMeta" style="display:contents">${chgPill(chg)}${qChip(q, a.asOf)}</span>${a.sc ? biasChip(a.sc.bias) : ""}
      ${a.index ? "" : `<button class="chip-btn ${inMy(ticker) ? "on" : ""}" id="myBtn" aria-pressed="${inMy(ticker)}">${icon("star")}${inMy(ticker) ? "Στις προβλέψεις μου" : "Πρόσθεσε στις προβλέψεις μου"}</button>`}</div>
    ${a.index ? "" : `<div class="actions" style="margin-top:16px"><button class="act" data-ask="${esc(ticker)}"><span class="c pri">${icon("chat")}</span>Εξήγησέ μου</button><button class="act" id="wBtn"><span class="c">${icon("star")}</span>${inW ? "Στη λίστα" : "Λίστα"}</button>
      <button class="act" data-q="Ποια τα ρίσκα της ${esc(ticker)};"><span class="c">${icon("shield")}</span>Ρίσκα</button><button class="act" data-q="Πού να βάλω stop στην ${esc(ticker)};"><span class="c">${icon("target")}</span>Stop</button></div>`}</section>`;
  const chartC = card(`<div class="seg" id="tb" style="margin-bottom:10px"></div><div class="chart-box"><div class="chart-legend" id="lg"></div><div class="chart-main" id="cMain"></div><div class="chart-sub" id="cRsi"></div></div><div class="small muted" style="margin-top:6px">Ημερήσιες τιμές έως ${dday(a.asOf)}</div>`);
  if (a.index) { view.innerHTML = `<div class="stack">${head}${chartC}</div>`; drawChart(a); return; }
  const s = simpleStock(a), best = a.acc[0], dtr = dayFor(ticker), tab = STABS.some(([k]) => k === store.get("stab2")) ? store.get("stab2") : "model";
  const verdict = card(`<div class="verdict t-${s.tone}"><span class="tag">${esc(s.verdict)}</span><p class="vh">${esc(s.headline)}</p><ul>${s.pts.map((x) => `<li>${esc(x)}</li>`).join("")}${s.model.map((x) => `<li><b>${esc(x)}</b></li>`).join("")}</ul>
      ${s.plan ? `<div class="plan"><b>${esc(s.plan.title)}</b><ul>${(s.plan.lines || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${s.risks.length ? `<div class="warn-box"><b>Προσοχή</b><ul>${s.risks.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}</div>`);
  const aiNow = typeof briefStockCard === "function" ? briefStockCard(ticker) : "";
  const aiNote = aiNow + (Data.aiFor(ticker) ? card(`<div class="ai-head">${icon("spark")}<b>Τι λέει το AI</b><span class="muted small">${Data.ai?.at ? dt(Data.ai.at) : ""}</span></div><p class="ai-text">${esc(Data.aiFor(ticker))}</p>`) : "");
  const plan = best ? card(`<h3>Σχέδιο: ${esc(HZ[best.horizon] || best.horizon)}</h3><div class="small muted" style="margin:-4px 0 10px">${esc(best.setup)}</div>${vladder(best, price)}`) : "";
  const dayC = dtr ? card(`<h3>Day trade για αύριο</h3><div class="small muted" style="margin:-4px 0 10px">${esc((dtr.reasons || []).slice(0, 2).join(". "))}</div>${vladder(dtr, price)}<div class="small muted" style="margin-top:8px">Υποψήφια με κανόνες, όχι επικυρωμένη πρόβλεψη. Έξοδος πάντα μέσα στην ίδια μέρα.</div>`) : "";
  const score = card(`<h3>Βαθμολογία</h3><div style="display:flex;gap:14px;align-items:center;margin-bottom:8px">${ring(a.sc.score, "lg")}<div class="small soft">0 = πολύ αρνητικό, 100 = πολύ θετικό. Δεν είναι πιθανότητα. Κάλυψη δεδομένων ${Math.round((a.sc.coverage || 0) * 100)}%.</div></div>
      ${a.sc.contrib.map((c) => `<div class="meter"><span>${esc(c.label)}</span><div class="bar"><i style="width:${clamp(c.score ?? 0)}%;background:${c.score >= 60 ? "var(--up)" : c.score <= 40 ? "var(--down)" : "var(--warn)"}"></i></div><b class="num">${isNum(c.score) ? c.score.toFixed(0) : "—"}</b></div>`).join("")}
      ${(a.sc.explain?.what_changes || []).length ? `<div class="small muted" style="margin-top:12px">Τι θα άλλαζε την εικόνα</div><ul class="list" style="margin-top:6px">${a.sc.explain.what_changes.map((x) => `<li><span>${esc(x)}</span></li>`).join("")}</ul>` : ""}`);
  view.innerHTML = `<div class="stack">${head}${chartC}<div class="wide2"><div class="stack">${verdict}${aiNote}${dayC}${plan}</div><div class="stack">${score}</div></div>
    ${seg(STABS, tab, "st")}<div id="stab" class="stack"></div></div>`;
  drawChart(a);
  const show = (k) => { store.set("stab2", k); $$("[data-st]").forEach((b) => b.classList.toggle("on", b.dataset.st === k)); $("#stab").innerHTML = STOCK_TABS[k](a, price); if (k === "news") loadLiveNews(a); };
  $$("[data-st]").forEach((b) => b.addEventListener("click", () => show(b.dataset.st)));
  $("#wBtn").addEventListener("click", () => { if (inW) App.watch = App.watch.filter((x) => x !== ticker); else App.watch.unshift(ticker); saveWatch(); router({ soft: true }); });
  $("#myBtn")?.addEventListener("click", () => { toggleMy(ticker); router({ soft: true }); });
  show(tab);
};
document.addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (!b) return; e.preventDefault(); openBot(); botAsk(b.dataset.q); });

function simpleStock(a) {
  const s = a.simple || {}, risks = [...(s.risks || [])];
  const earnSaid = risks.some((x) => /αποτελέσματα/i.test(x));
  for (const w of (a.risk?.warnings || [])) if (!(earnSaid && /^Earnings/i.test(w))) risks.push(w);
  for (const c of (a.acc[0]?.conf?.conflicts || [])) risks.push(c);
  return { tone: s.tone || "neutral", verdict: s.verdict || "—", headline: s.headline || "", pts: s.points || [], model: s.model || [], plan: s.plan || null, risks: [...new Set(risks)].slice(0, 6) };
}
const LBL = { ml: "Μοντέλο", trend: "Τάση", momentum: "Momentum", volume: "Όγκος", relative: "Σχετική δύναμη", fundamentals: "Θεμελιώδη", news: "Ειδήσεις", sector: "Κλάδος", market: "Αγορά" };
function setupCard(a, s0, rej) {
  const s = SP(s0);
  return `<div class="setup"><div class="chips">${chip(esc(HZ[s.horizon] || s.horizon), "accent")}${biasChip(s.bias)}${rej ? chip("Δεν προτείνεται", "warn") : chip(`Περνά τους ελέγχους: ${esc(s.confidence || "")}`, "up")}</div>
    <b>${esc(s.setup)}</b>${ladder(s, a.q?.price ?? a.price)}
    ${kv([["Ζώνη εισόδου", `${fmt(s.entryLow)}–${fmt(s.entryHigh)}`], ["Stop", `${fmt(s.stop)} (${fmt(s.stopPct, 1)}%)`, "down"], ["Στόχος 1 / 2", `${fmt(s.tp1)} / ${fmt(s.tp2)}`, "up"], ["Στόχος 3", fmt(s.tp3), "up"], ["Κέρδος / ρίσκο", fmt(s.rr, 2)], ["Διάρκεια", esc(s.holding || "")]])}
    ${(s.conf?.sup || []).length || (s.conf?.opp || []).length ? `<div class="small soft">Υπέρ: ${(s.conf.sup || []).map((k) => LBL[k] || k).join(", ") || "—"}. Κατά: ${(s.conf.opp || []).map((k) => LBL[k] || k).join(", ") || "—"}.</div>` : ""}
    ${rej ? `<ul class="list risks">${(s.why || []).map((r) => `<li><span>${esc(r)}</span></li>`).join("")}</ul>` : ""}</div>`;
}
function predLine(p) {
  if (p.kind === "rank") return `${topPct(p.rank)} της αγοράς για τις επόμενες ${p.days} ημέρες${isNum(p.exp) ? `, ιστορικά ${pct(p.exp * 100, 2)} σε σχέση με την αγορά` : ""}`;
  return `${isNum(p.p) ? Math.round(p.p * 100) + "%" : "—"} πιθανότητα να πιάσει τον στόχο πριν το stop${isNum(p.breakeven) ? ` (χρειάζεται πάνω από ${Math.round(p.breakeven * 100)}% για κέρδος)` : ""}`;
}
const HZ_ORDER = ["rank5", "rank21", "day", "short", "swing"];
// για κάθε ορίζοντα: ποια πρόβλεψη δείχνουμε (v4 όπου είναι ενεργό ή καλύτερο, αλλιώς v3) και η άλλη για σύγκριση
function predPick(a, h) {
  const p3 = a.pred?.[h], p4 = a.pred4?.[h];
  if (p4 && (p4.active || useV4(h))) return { p: { ...p4, validated: !!p4.active }, ver: "v4", other: p3 ? { ...p3, ver: "v3" } : null };
  if (p3) return { p: p3, ver: "v3", other: p4 ? { ...p4, validated: !!p4.active, ver: "v4" } : null };
  return p4 ? { p: { ...p4, validated: !!p4.active }, ver: "v4", other: null } : null;
}
const predVal = (p) => (p.kind === "rank" ? topPct(p.rank) : isNum(p.p) ? Math.round(p.p * 100) + "%" : "—");
const STOCK_TABS = {
  model(a) {
    const picks = HZ_ORDER.map((h) => predPick(a, h)).filter(Boolean).sort((x, y) => (y.p.validated - x.p.validated));
    if (!picks.length) return card(emptyBox("Δεν υπάρχει πρόβλεψη για αυτή τη μετοχή"));
    return picks.map(({ p, ver, other }) => card(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h3 style="margin:0;flex:1">${esc(p.label || "")}</h3>${ver === "v4" ? chip("Νέο μοντέλο v4", "accent") : chip("Μοντέλο v3")}</div>
      <div class="num" style="font-size:28px;font-weight:780;margin-top:8px">${predVal(p)}</div>
      <div class="small soft" style="margin-top:4px">${esc(predLine(p))}</div>
      ${other ? `<div class="small muted" style="margin-top:6px">${other.ver === "v4" ? "Νέο μοντέλο v4" : "Παλιό μοντέλο v3"}: ${predVal(other)}</div>` : ""}
      <div style="margin:10px 0">${p.validated ? chip("Επικυρωμένο σε άγνωστα δεδομένα", "up") : chip("Μη επικυρωμένο: δεν λαμβάνεται υπόψη", "warn")}</div>
      ${p.kind !== "rank" && isNum(p.exp) ? `<div class="soft small">Σε παρόμοιες περιπτώσεις: <b class="${cls(p.exp)}">${p.exp >= 0 ? "+" : ""}${fmt(p.exp, 2)}R</b> (για κάθε 100$ ρίσκου, ${p.exp >= 0 ? "κέρδος" : "απώλεια"} ${fmt(Math.abs(p.exp) * 100, 0)}$ κατά μέσο όρο).</div>` : ""}
      ${p.drivers?.length ? `<div class="small muted" style="margin:12px 0 6px">Τι σπρώχνει την πρόβλεψη πάνω (πράσινο) ή κάτω (κόκκινο)</div>${p.drivers.map((x) => `<div class="driver"><span>${esc(x.label)}</span><div class="dbar"><i style="${x.effect >= 0 ? "left:50%" : "right:50%"};width:${Math.min(50, Math.abs(x.effect) * 120).toFixed(1)}%;background:${x.effect >= 0 ? "var(--up)" : "var(--down)"}"></i></div><span class="num muted" style="text-align:right">${fmt(x.value, 2)}</span></div>`).join("")}` : ""}`)).join("")
      + `<div class="note">Τα μοντέλα (LightGBM, ${D()?.model4?.features || 173} στοιχεία ανά μετοχή, 10 χρόνια ιστορικό) χρησιμοποιούνται μόνο αν πέρασαν τον έλεγχο σε δεδομένα που δεν είχαν δει. <a href="#/model">Πώς ελέγχθηκαν</a></div>`;
  },
  setups(a) {
    const all = [...a.acc.map((s) => setupCard(a, s, false)), ...a.rej.map((s) => setupCard(a, s, true))];
    return card(`<h3>Όλα τα setups που εξετάστηκαν</h3>${all.length ? `<div class="stack" style="gap:12px">${all.join("")}</div>` : emptyBox("Κανένα setup σήμερα", "Όταν δεν υπάρχει καθαρή εικόνα, το σύστημα δεν προτείνει τίποτα.")}`);
  },
  co(a) {
    const m = a.fund?.m || {}, p = a.profile || {}, P = (v, d = 1) => (isNum(v) ? pct(v * 100, d) : "—");
    return `${card(`<h3>Θεμελιώδη</h3>${kv([["Κεφαλαιοποίηση", isNum(m.market_cap) ? "$" + big(m.market_cap) : "—"], ["P/E", fmt(m.pe, 1)], ["Forward P/E", fmt(m.forward_pe, 1)], ["Έσοδα σε 1 χρόνο", P(m.revenue_growth), cls(m.revenue_growth)],
      ["Κέρδη σε 1 χρόνο", P(m.earnings_growth), cls(m.earnings_growth)], ["Λειτουργικό περιθώριο", P(m.op_margin)], ["ROE", P(m.roe)], ["Χρέος / ίδια κεφάλαια", isNum(m.debt_to_equity) ? fmt(m.debt_to_equity / 100, 2) : "—"],
      ["Short (% float)", P(m.short_pct_float)], ["Beta", fmt(m.beta, 2)], ["Τιμή-στόχος αναλυτών", isNum(m.target_mean) ? `${money(m.target_mean)} (${pct(m.analyst_upside_pct, 0)})` : "—"],
      ["Επόμενα αποτελέσματα", m.earnings_date ? `${dshort(m.earnings_date)}${isNum(m.days_to_earnings) ? ` (σε ${m.days_to_earnings} ημ.)` : ""}` : isNum(m.days_to_earnings) ? `σε ${m.days_to_earnings} ημ.` : "—"]])}
      <div class="small muted" style="margin-top:10px">Βαθμολογία θεμελιωδών ${isNum(a.fund?.score) ? a.fund.score.toFixed(0) : "—"}/100, κάλυψη ${Math.round((a.fund?.coverage || 0) * 100)}%. ${esc([a.sector, a.industry].filter(Boolean).join(", "))}</div>`)}
      ${(a.fund?.pros || []).length || (a.fund?.cons || []).length ? card(`<h3>Υπέρ και κατά</h3><ul class="list pros">${a.fund.pros.map((x) => `<li><span>${esc(x)}</span></li>`).join("")}</ul><ul class="list cons" style="margin-top:8px">${[...a.fund.cons, ...(a.fund.risks || [])].map((x) => `<li><span>${esc(x)}</span></li>`).join("")}</ul>`) : ""}
      ${p.summary ? card(`<h3>Τι κάνει η εταιρεία</h3><p class="soft" style="margin:0">${esc(p.summary)}</p>${p.website ? `<a class="btn" style="margin-top:12px" href="${esc(p.website)}" target="_blank" rel="noopener">Ιστοσελίδα εταιρείας</a>` : ""}`) : ""}`;
  },
  news(a) {
    const n = a.news || {};
    return `${card((n.items || []).length ? n.items.map((x) => newsItem({ ...x, t: null })).join("") : emptyBox("Καμία πρόσφατη είδηση"), "flush")}<div id="liveNews"></div>`;
  },
  tech(a) {
    const m = a.tech.m || {};
    return `${card(`<h3>Δείκτες</h3>${kv([["RSI 14", fmt(m.rsi, 1)], ["ADX", fmt(m.adx, 1)], ["MACD / σήμα", `${fmt(m.macd, 3)} / ${fmt(m.macd_signal, 3)}`], ["Stochastic", `${fmt(m.stoch_k, 0)} / ${fmt(m.stoch_d, 0)}`],
      ["EMA 20 / 50", `${fmt(m.ema20)} / ${fmt(m.ema50)}`], ["ΚΜΟ 50 / 200", `${fmt(m.sma50)} / ${fmt(m.sma200)}`], ["Bollinger", `${fmt(m.bb_lo)}–${fmt(m.bb_up)}`], ["VWAP 20 ημ.", fmt(m.vwap20)],
      ["ATR", `${fmt(m.atr)} (${fmt(m.atr_pct, 1)}%)`], ["Όγκος vs μέσο", fmt(m.rvol, 2) + "×"], ["Τζίρος/ημέρα", "$" + big(m.dollar_vol20)], ["Υψηλό / χαμηλό έτους", `${fmt(m.hi52)} / ${fmt(m.lo52)}`],
      ["1 / 3 / 6 μήνες", `${pct(m.ret21, 1)} / ${pct(m.ret63, 1)} / ${pct(m.ret126, 1)}`], ["vs S&P 500 (3μ)", pct(a.tech.rs?.excess, 1), cls(a.tech.rs?.excess)]])}`)}
      ${card(`<h3>Στηρίξεις και αντιστάσεις</h3>${(a.tech.levels || []).length ? a.tech.levels.slice().reverse().map((l) => `<div class="meter" style="grid-template-columns:1fr auto auto"><span>${l.type === "support" ? chip("Στήριξη", "up") : chip("Αντίσταση", "down")}</span><b class="num">${fmt(l.price)}</b><span class="muted small">${l.touches}×</span></div>`).join("") : emptyBox("Δεν βρέθηκαν καθαρά επίπεδα")}
        ${a.tech.vp ? `<div class="small muted" style="margin-top:10px">Τιμή με τον περισσότερο όγκο: ${fmt(a.tech.vp.poc)} (ζώνη ${fmt(a.tech.vp.vaLow)}–${fmt(a.tech.vp.vaHigh)}).</div>` : ""}`)}
      ${(a.tech.pros || []).length || (a.tech.cons || []).length ? card(`<h3>Υπέρ και κατά</h3><ul class="list pros">${a.tech.pros.map((x) => `<li><span>${esc(x)}</span></li>`).join("")}</ul><ul class="list cons" style="margin-top:8px">${a.tech.cons.map((x) => `<li><span>${esc(x)}</span></li>`).join("")}</ul>`) : ""}`;
  },
};
async function loadLiveNews(a) {
  if (!Keys.finnhub) return;
  const n = await liveNews(a.ticker); const el = $("#liveNews");
  if (el && n.length) el.outerHTML = card(n.slice(0, 12).map(newsItem).join(""), "flush");
}

// ================================================================== γράφημα (δείκτες από τις τιμές)
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const alpha = (hex, a) => { const h = hex.replace("#", ""); if (h.length !== 6) return hex; const n = parseInt(h, 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
let _charts = [];
function disposeCharts() { _charts.forEach(({ c, ro }) => { try { ro.disconnect(); c.remove(); } catch { /* */ } }); _charts = []; }
function mkChart(el, h, extra = {}) {
  const c = LightweightCharts.createChart(el, { width: el.clientWidth || 360, height: h, layout: { background: { type: "solid", color: css("--card") }, textColor: css("--text-2"), fontFamily: "Commissioner, -apple-system, sans-serif", fontSize: 11 },
    grid: { vertLines: { visible: false }, horzLines: { color: alpha(css("--line"), 0.7) } }, rightPriceScale: { borderVisible: false }, timeScale: { borderVisible: false }, crosshair: { mode: 0 }, ...extra });
  const ro = new ResizeObserver(() => { if (el.clientWidth) c.applyOptions({ width: el.clientWidth }); }); ro.observe(el); _charts.push({ c, ro }); return c;
}
function emaA(c, n) { const k = 2 / (n + 1), o = new Array(c.length).fill(null); let e = null; for (let i = 0; i < c.length; i++) { const v = c[i]; if (!isNum(v)) continue; e = e === null ? v : v * k + e * (1 - k); if (i >= n - 1) o[i] = e; } return o; }
function bbA(c, n = 20, k = 2) { const up = new Array(c.length).fill(null), lo = up.slice(); for (let i = n - 1; i < c.length; i++) { const w = c.slice(i - n + 1, i + 1), m = w.reduce((s, x) => s + x, 0) / n, sd = Math.sqrt(w.reduce((s, x) => s + (x - m) ** 2, 0) / n); up[i] = m + k * sd; lo[i] = m - k * sd; } return [up, lo]; }
function rsiA(c, n = 14) { const o = new Array(c.length).fill(null); let g = 0, l = 0; for (let i = 1; i < c.length; i++) { const d = c[i] - c[i - 1], G = Math.max(d, 0), L = Math.max(-d, 0); if (i <= n) { g += G / n; l += L / n; if (i === n) o[i] = l ? 100 - 100 / (1 + g / l) : 100; } else { g = (g * (n - 1) + G) / n; l = (l * (n - 1) + L) / n; o[i] = l ? 100 - 100 / (1 + g / l) : 100; } } return o; }
function drawChart(a) {
  const b = a.bars, main = $("#cMain");
  if (!main) return;
  if (!b?.d?.length) { main.innerHTML = emptyBox("Δεν υπάρχουν τιμές"); return; }
  if (!window.LightweightCharts) { main.innerHTML = emptyBox("Το γράφημα θέλει σύνδεση την πρώτη φορά"); return; }
  const opts = { ema: true, bb: false, lv: true, range: 120, ...store.get("ind2", {}) };
  $("#tb").innerHTML = [["r60", "3Μ"], ["r120", "6Μ"], ["r250", "1Ε"], ["ema", "EMA"], ["bb", "Bollinger"], ["lv", "Στηρίξεις"]].map(([k, l]) => `<button type="button" class="${(k.startsWith("r") ? opts.range === +k.slice(1) : opts[k]) ? "on" : ""}" data-ind="${k}">${l}</button>`).join("");
  $$("[data-ind]").forEach((x) => x.addEventListener("click", () => { const k = x.dataset.ind; if (k.startsWith("r")) opts.range = +k.slice(1); else opts[k] = !opts[k]; store.set("ind2", opts); disposeCharts(); drawChart(a); }));
  main.innerHTML = ""; $("#cRsi").innerHTML = "";
  const up = css("--up"), dn = css("--down"), acc = css("--accent"), war = css("--warn");
  const T = b.d, C = b.c, ser = (arr) => arr.map((v, i) => (isNum(v) ? { time: T[i], value: v } : null)).filter(Boolean);
  const c = mkChart(main, main.clientHeight || 300);
  const cs = c.addCandlestickSeries({ upColor: up, downColor: dn, wickUpColor: up, wickDownColor: dn, borderVisible: false });
  cs.setData(T.map((t, i) => ({ time: t, open: b.o[i], high: b.h[i], low: b.l[i], close: C[i] })));
  const vs = c.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false });
  c.priceScale("vol").applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
  vs.setData(T.map((t, i) => ({ time: t, value: b.v[i], color: alpha(C[i] >= b.o[i] ? up : dn, 0.3) })));
  const line = (d, col, w = 1, st = 0) => { if (!d?.length) return; c.addLineSeries({ color: col, lineWidth: w, lineStyle: st, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }).setData(d); };
  const leg = [];
  if (opts.ema) { line(ser(emaA(C, 20)), acc); line(ser(emaA(C, 50)), war, 2); line(ser(emaA(C, 200)), "#e879f9", 2); leg.push(["EMA20", acc], ["EMA50", war], ["EMA200", "#e879f9"]); }
  if (opts.bb) { const [u, l] = bbA(C); line(ser(u), "#94a3b8", 1, 1); line(ser(l), "#94a3b8", 1, 1); leg.push(["Bollinger", "#94a3b8"]); }
  if (opts.lv) (a.tech?.levels || []).forEach((l) => cs.createPriceLine({ price: l.price, color: alpha(l.type === "support" ? up : dn, 0.5), lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" }));
  const best = a.acc?.[0] || dayFor(a.ticker);
  if (best) { cs.createPriceLine({ price: best.stop, color: dn, lineWidth: 2, title: "Stop" }); cs.createPriceLine({ price: best.tp2, color: up, lineWidth: 2, title: "Στόχος" }); }
  c.timeScale().setVisibleLogicalRange({ from: T.length - opts.range, to: T.length + 2 });
  $("#lg").innerHTML = leg.map(([l, col]) => `<span style="color:${col}">${l}</span>`).join("");
  const r = mkChart($("#cRsi"), 90, { timeScale: { visible: false } });
  const rs = r.addLineSeries({ color: acc, lineWidth: 1, priceLineVisible: false }); rs.setData(ser(rsiA(C)));
  rs.createPriceLine({ price: 70, color: alpha(dn, 0.7), lineStyle: 2, lineWidth: 1, title: "RSI 70" }); rs.createPriceLine({ price: 30, color: alpha(up, 0.7), lineStyle: 2, lineWidth: 1, title: "30" });
  [c, r].forEach((x) => x.timeScale().subscribeVisibleLogicalRangeChange((rg) => { if (rg) [c, r].forEach((y) => y !== x && y.timeScale().setVisibleLogicalRange(rg)); }));
}

// ================================================================== ΠΕΡΙΣΣΟΤΕΡΑ & σελίδες
const menu = (href, ic, t, sub) => `<a class="menu-row" href="${href}"><span class="c">${icon(ic)}</span><div><div style="font-weight:650">${t}</div><div class="nm">${sub}</div></div>${icon("chev")}</a>`;
routes.more = async () => {
  $("#view").innerHTML = `<div class="stack"><h1 class="page-title">Περισσότερα</h1>
    ${card(menu("#/pf", "wallet", "Χαρτοφυλάκιο", "Οι μετοχές σου, αποδόσεις, βαθμολογία, από φωτογραφία") + menu("#/goal", "target", "Ο στόχος μου", "π.χ. 1000 € → 2000 €: πόσο ρεαλιστικό και πώς"), "flush")}
    ${card(menu("#/brief", "spark", "Ενημερώσεις AI", "Πρωί, πριν το άνοιγμα, κλείσιμο: αγορές, ειδήσεις, οι μετοχές σου"), "flush")}
    ${card(menu("#/my", "star", "Οι προβλέψεις μου", myList().length ? `${myList().length} εταιρείες` : "Διάλεξε εταιρείες για καθημερινές προβλέψεις"), "flush")}
    ${card(menu("#/model", "model", "Μοντέλο πρόβλεψης", "Πώς ελέγχθηκε και αν επικυρώθηκε") + menu("#/news", "news", "Ειδήσεις", "Αγορά και μετοχές") + menu("#/data", "data", "Δεδομένα", "Πότε ενημερώθηκε, πηγές")
      + menu("#/settings", "theme", "Εμφάνιση", "Φωτεινό ή σκούρο θέμα") + menu("#/guide", "info", "Οδηγός", "Εγκατάσταση στο iPhone, τι να περιμένεις"), "flush")}
    ${Data.server ? card(menu("#/tools", "model", "Εργαλεία υπολογιστή", "Εκπαίδευση μοντέλων, νέα ανάλυση τώρα") + menu("classic", "pc", "Πλήρες πρόγραμμα", "Backtest, paper trading, αναφορές, ρυθμίσεις: όλα όπως ήταν"), "flush") : ""}
    ${card(menu("#/ai", "spark", "Σύνδεση AI (κλειδί Claude ή Gemini)", AI.enabled() ? `Συνδεδεμένο${Keys.claude ? ": Claude" : ""}${Keys.gemini ? (Keys.claude ? " + Gemini" : ": Gemini") : ""}` : Data.serverAI ? "AI προγράμματος" : "Βάλε κλειδί για φωτογραφίες και ελεύθερη συζήτηση"), "flush")}
    <div class="note">US Alpha: ανάλυση και προτάσεις, όχι επενδυτική συμβουλή. Καμία αυτόματη εντολή.</div></div>`;
};
// Οι προβλέψεις μου: ο χρήστης διαλέγει εταιρείες και βλέπει εδώ ό,τι προβλέπουν τα μοντέλα, με σήμα «νέο» κάθε μέρα
function myVerdict(a5, a21) {
  if (!a5 && !a21) return "Δεν υπάρχει ακόμα πρόβλεψη κατάταξης.";
  const v = [a5?.v, a21?.v].filter(isNum), avg = v.reduce((s, x) => s + x, 0) / v.length;
  return avg >= 0.7 ? "Τα μοντέλα τη βλέπουν πάνω από τις περισσότερες μετοχές της αγοράς." : avg <= 0.3 ? "Τα μοντέλα τη βλέπουν κάτω από τις περισσότερες μετοχές της αγοράς." : "Χωρίς καθαρή εικόνα: κοντά στη μέση της αγοράς.";
}
routes.my = async () => {
  const d = D(), list = myList();
  const seen = store.get("mySeen", {}); if (d?.asOf) { list.forEach((t) => { seen[t] = d.asOf; }); store.set("mySeen", seen); }
  const anyOk = Object.values(d?.model || {}).some((m) => m.validated) || Object.values(d?.model4?.models || {}).some((m) => m.active);
  const addW = App.watch.filter((t) => !list.includes(t));
  $("#view").innerHTML = `<div class="stack"><div><h1 class="page-title">Οι προβλέψεις μου</h1><p class="page-sub">Διάλεξε εταιρείες. Κάθε βράδυ, μετά την ανάλυση, εδώ βλέπεις τι προβλέπουν τα μοντέλα για αυτές.</p></div>
    <div class="grid2"><button class="btn primary" id="myAdd">${icon("plus")}Πρόσθεσε εταιρεία</button>${addW.length ? `<button class="btn" id="myW">${icon("star")}Πρόσθεσε τη λίστα μου (${addW.length})</button>` : ""}</div>
    ${!anyOk ? `<div class="callout info">Κανένα μοντέλο δεν έχει ακόμα επικυρωθεί σε δεδομένα που δεν είχε δει. Δες τις προβλέψεις ως ένδειξη, όχι ως απόφαση.</div>` : ""}
    <div id="myCards" class="stack">${list.length ? list.map((t) => `<div class="skel" style="height:220px" data-myph="${esc(t)}"></div>`).join("") : card(emptyBox("Δεν έχεις διαλέξει εταιρείες", "Πάτα «Πρόσθεσε εταιρεία» ή το κουμπί στη σελίδα κάθε μετοχής."))}</div></div>`;
  $("#myAdd").addEventListener("click", () => openSearch((t) => { setMy([t, ...myList()]); toast(`Η ${t} μπήκε στις προβλέψεις σου`); router({ soft: true }); }));
  $("#myW")?.addEventListener("click", () => { setMy([...myList(), ...addW]); router({ soft: true }); });
  const shards = await Promise.all(list.map((t) => Data.stock(t).catch(() => null)));
  if (App.route !== "my") return;
  list.forEach((t, i) => {
    const a = shards[i], r = Data.row(t) || { t, n: a?.name || "" }, ph = $(`[data-myph="${CSS.escape(t)}"]`);
    if (!ph) return;
    const a5 = rankOf(r, "rank5"), a21 = rankOf(r, "rank21");
    const SHORT = { day: "Day trade αύριο", short: "Στόχος σε 5 ημέρες", swing: "Στόχος σε 25 ημέρες" };
    const lines = a ? ["day", "short", "swing"].map((h) => [h, predPick(a, h)]).filter(([, x]) => x).map(([h, { p, ver }]) => `<li><span><b>${SHORT[h]}:</b> ${esc(predVal(p))} πιθανότητα να πιάσει τον στόχο πριν το stop${isNum(p.breakeven) ? ` (χρειάζεται >${Math.round(p.breakeven * 100)}%)` : ""} ${ver === "v4" ? chip("v4", "accent") : ""}${p.validated ? chip("επικυρωμένο", "up") : ""}</span></li>`).join("") : "";
    ph.outerHTML = card(`<div class="mp-top" style="margin-bottom:10px">${logo(t)}<div style="min-width:0"><div class="tk">${esc(t)}</div><div class="nm">${esc(r.n || a?.name || "")}</div></div>
      <div class="px"><b class="num">${fmt(curPx(t, r.p ?? a?.price))}</b>${chgPill(curCh(t, r.ch ?? a?.chg))}</div></div>
      <div class="mp-row"><span>5 ημέρες</span>${rankBar(a5)}</div><div class="mp-row"><span>1 μήνας</span>${rankBar(a21)}</div>
      <p class="soft" style="margin:10px 0 0">${esc(myVerdict(a5, a21))}</p>
      ${lines ? `<ul class="list" style="margin-top:8px">${lines}</ul>` : `<div class="small muted" style="margin-top:8px">${a ? "" : "Η εταιρεία δεν είναι στη σημερινή ανάλυση (πολύ μικρός τζίρος ή χωρίς τιμές)."}</div>`}
      ${Data.aiFor(t) ? `<div class="ai-line" style="margin-top:10px"><b>AI</b> ${esc(Data.aiFor(t))}</div>` : ""}
      <div class="grid2" style="margin-top:12px"><a class="btn" href="#/s/${encodeURIComponent(t)}">Ανάλυση</a><button class="btn" data-myrm="${esc(t)}">${icon("trash")}Αφαίρεση</button></div>`);
  });
  $$("[data-myrm]").forEach((b) => b.addEventListener("click", () => { setMy(myList().filter((x) => x !== b.dataset.myrm)); router({ soft: true }); }));
};
// Εργαλεία του προγράμματος υπολογιστή (εκπαίδευση, ανάλυση). Τίποτα δεν αφαιρέθηκε: όλα υπάρχουν και στο «Πλήρες πρόγραμμα».
let _toolsTimer = 0;
routes.tools = async () => {
  if (!Data.server) { location.hash = "#/more"; return; }
  clearTimeout(_toolsTimer);
  const s = await fetch("api/status", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (App.route !== "tools") return;
  const ml = s?.ml_progress || {}, ml4 = s?.ml4_progress || {}, sc = s?.scan_progress || {}, ls = s?.last_scan || {}, M = D()?.model || {};
  const trained = Object.values(M).map((m) => m.createdAt).filter(Boolean).sort().pop();
  const nVal = Object.values(M).filter((m) => m.validated).length, nAll = Object.keys(M).length;
  const bar = (p) => `<div class="pbar" role="progressbar" aria-valuenow="${Math.round(p || 0)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.max(3, Math.min(100, p || 0))}%"></i></div>`;
  const scPct = sc.total ? (sc.done / sc.total) * 100 : 0;
  $("#view").innerHTML = `<div class="stack"><h1 class="page-title">Εργαλεία υπολογιστή</h1><p class="page-sub">Ό,τι έκανε το πρόγραμμα συνεχίζει να γίνεται και αυτόματα, όπως πριν. Εδώ τα ξεκινάς και με ένα πάτημα.</p>
    ${card(`<h3>Εκπαίδευση μοντέλων πρόβλεψης</h3>${kv([["Τελευταία εκπαίδευση", trained ? dt(trained) : "—"], ["Μοντέλα", nAll ? `${nAll} (${nVal} επικυρωμένα)` : "—"], ["Τελευταία πρόβλεψη", s?.ml_predicted_at ? dday(s.ml_predicted_at) : "—"]])}
      ${ml.running || ml4.running ? `<div style="margin-top:12px"><b>Τρέχει τώρα:</b> ${esc(ml.running ? ml.step || "" : "Νέο μοντέλο v4: " + (ml4.step || ""))}${bar(ml.running ? ml.pct : ml4.pct)}<div class="small muted">Μπορείς να κλείσεις τη σελίδα, η εκπαίδευση συνεχίζει στο πρόγραμμα.</div></div>`
        : `${ml.error ? `<p class="down small">Τελευταίο σφάλμα: ${esc(ml.error)}</p>` : ""}${ml4.error ? `<p class="down small">Τελευταίο σφάλμα v4: ${esc(ml4.error)}</p>` : ""}<button class="btn primary block" id="tTrain" style="margin-top:12px">${icon("model")}Εκπαίδευση τώρα (v3 και νέο v4)</button>
          <button class="btn block" id="tTrain4" style="margin-top:8px">${icon("spark")}Μόνο το νέο μοντέλο v4</button><div class="small muted" style="margin-top:8px">Κατεβάζει ιστορικό, εκπαιδεύει και ελέγχει τα μοντέλα. Το v4 μετριέται δίπλα στο v3 και χρησιμοποιείται μόνο αν βγει καλύτερο. Παίρνει αρκετή ώρα.</div>`}`)}
    ${card(`<h3>Πλήρης ανάλυση αγοράς</h3>${kv([["Τελευταία ανάλυση", ls.finished_at ? dt(ls.finished_at) : "—"], ["Μετοχές", ls.n_ok ? fmt(ls.n_ok, 0) : "—"]])}
      ${sc.running ? `<div style="margin-top:12px"><b>Τρέχει τώρα:</b> ${esc(sc.step || "")}${sc.total ? ` (${fmt(sc.done, 0)}/${fmt(sc.total, 0)})` : ""}${bar(scPct)}</div>`
        : `<button class="btn block" id="tScan" style="margin-top:12px">${icon("refresh")}Νέα ανάλυση τώρα</button><div class="small muted" style="margin-top:8px">Γίνεται και αυτόματα κάθε μέρα μετά το κλείσιμο. Βγάζει ευκαιρίες, day trade και προβλέψεις.</div>`}`)}
    ${card(`<h3>Όλα τα υπόλοιπα</h3><p class="soft" style="margin-top:0">Backtest, paper trading, αναφορές, ρυθμίσεις και κωδικοί υπάρχουν όπως ήταν στο πλήρες πρόγραμμα.</p><a class="btn block" href="classic">${icon("pc")}Άνοιγμα πλήρους προγράμματος</a>`)}</div>`;
  const go = (id, url, msg) => $(id)?.addEventListener("click", async (e) => { const b = e.currentTarget;
    if (!b.dataset.sure) { b.dataset.sure = "1"; b.lastChild.textContent = "Πάτα ξανά για να ξεκινήσει"; return; }
    b.disabled = true; const j = await fetch(url, { method: "POST" }).then((r) => r.json()).catch(() => null);
    toast(j?.status === "started" ? msg : j?.status === "already_running" ? "Τρέχει ήδη" : "Δεν ξεκίνησε, δοκίμασε ξανά", j ? "info" : "high"); setTimeout(() => router({ soft: true }), 800); });
  go("#tTrain", "api/ml/train", "Η εκπαίδευση ξεκίνησε"); go("#tTrain4", "api/ml4/train", "Η εκπαίδευση του v4 ξεκίνησε"); go("#tScan", "api/scan", "Η ανάλυση ξεκίνησε");
  if (ml.running || ml4.running || sc.running) _toolsTimer = setTimeout(() => { if (App.route === "tools") router({ soft: true }); }, 4000);
};
routes.ai = async () => {
  const row = (name, k) => Keys[k] ? `<div class="kv-row"><div><b>${name}</b><div class="small muted">Συνδεδεμένο σε αυτή τη συσκευή</div></div><button class="btn sm danger" data-koff="${k}">Αποσύνδεση</button></div>` : "";
  $("#view").innerHTML = `<div class="stack"><h1 class="page-title">Σύνδεση AI</h1><p class="page-sub">Με κλειδί AI η εφαρμογή διαβάζει φωτογραφίες (π.χ. το χαρτοφυλάκιό σου από screenshot) και ο βοηθός συζητά ελεύθερα. Το κλειδί μένει μόνο σε αυτή τη συσκευή.</p>
    ${Data.server ? card(Data.serverAI ? `<b>Το πρόγραμμα του υπολογιστή έχει δικό του AI.</b><p class="soft small" style="margin:4px 0 0">Ο κωδικός του μένει στον υπολογιστή. Μπορείς να βάλεις και κλειδί εδώ, για φωτογραφίες.</p>` : `<b>Το πρόγραμμα του υπολογιστή δεν έχει κλειδί AI.</b><p class="soft small" style="margin:4px 0 0">Βάλε κλειδί εδώ ή από το πλήρες πρόγραμμα → Ρυθμίσεις.</p>`) : ""}
    ${AI.enabled() ? card(row("Claude", "claude") + row("Gemini", "gemini")) : ""}
    ${!Keys.claude || !Keys.gemini ? keyBox(() => router({ soft: true })) : ""}
    <div class="note">Στο GitHub υπάρχει και κρυφό κλειδί (Settings → Secrets → Actions): GEMINI_API_KEY ή ANTHROPIC_API_KEY. Με αυτό το AI γράφει κάθε βράδυ τις σημειώσεις της αγοράς για όλους, χωρίς να βάλεις κλειδί στο κινητό.</div></div>`;
  $$("[data-koff]").forEach((b) => b.addEventListener("click", () => { Keys.set(b.dataset.koff, ""); store.set(b.dataset.koff === "gemini" ? "ai.geminiModel" : "ai.claudeModel", ""); toast("Αποσυνδέθηκε"); router({ soft: true }); }));
};
function decileBars(dec) {
  if (!dec?.length) return "";
  const vals = dec.map((x) => (x.avg ?? 0) * 100), mx = Math.max(...vals.map(Math.abs), 1e-9), W = 360, H = 170, mid = 76, top = 12, bw = W / dec.length;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Απόδοση ανά δεκατημόριο πρόβλεψης"><line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="var(--line)"/>
    ${dec.map((x, i) => { const v = vals[i], h = (Math.abs(v) / mx) * (mid - top), y = v >= 0 ? mid - h : mid;
      return `<rect x="${(i * bw + 5).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 10).toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="4" fill="${v >= 0 ? "var(--up)" : "var(--down)"}" opacity="${x.decile === 10 ? 1 : 0.6}"/><text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 22}" fill="var(--muted)" font-size="11" text-anchor="middle">${x.decile}</text>`; }).join("")}
    <text x="0" y="${H - 4}" fill="var(--muted)" font-size="11">χειρότερες προβλέψεις</text><text x="${W}" y="${H - 4}" fill="var(--muted)" font-size="11" text-anchor="end">καλύτερες</text></svg>`;
}
// Η εκπαίδευση γίνεται μόνη της: κάθε βράδυ νέες προβλέψεις, κάθε εβδομάδα νέα εκπαίδευση
function autoTrainCard(d) {
  if (!d) return "";
  const days = d.stats?.retrainDays || 7;
  const last = [...Object.values(d.model || {}).map((m) => m.createdAt), ...Object.values(d.model4?.models || {}).map((m) => m.createdAt)].filter(Boolean).sort();
  const oldest = last[0], newest = last[last.length - 1], next = oldest ? new Date(Date.parse(oldest) + Math.max(1, Math.round(days)) * 864e5) : null;
  return card(`<h3>Μαθαίνει μόνο του</h3><ul class="list"><li><span>Κάθε βράδυ, μετά το κλείσιμο, νέες προβλέψεις για όλες τις μετοχές με τα τελευταία δεδομένα.</span></li>
    <li><span>${days <= 1.5 ? "Κάθε βράδυ" : `Κάθε ${days} ημέρες`} νέα εκπαίδευση από την αρχή: το παλιό μοντέλο, το νέο v4 και όλες οι παραλλαγές του, στις ίδιες περιόδους. Κρατιέται αυτόματα το καλύτερο.</span></li>
    <li><span>Κάθε πρόταση παρακολουθείται μέχρι να κλείσει, ώστε να φαίνεται πώς πήγε στην πράξη.</span></li>
    <li><span>Αυτόματη βελτίωση: κάθε βράδυ δοκιμάζει νέους συνδυασμούς ρυθμίσεων και στοιχείων στις ίδιες περιόδους ελέγχου. Ο καλύτερος κρατιέται και αλλάζει μόνο αν βρεθεί κάτι που τον ξεπερνά. Όσο περισσότερες δοκιμές, τόσο αυστηρότερο το όριο, για να μη «φουσκώνει» το αποτέλεσμα.</span></li></ul>
    <div style="margin-top:12px">${kv([["Τελευταία εκπαίδευση", newest ? dt(newest) : "—"], ["Επόμενη αυτόματη", next ? dday(next.toISOString().slice(0, 10)) : "στην επόμενη ανάλυση"],
      ...(autoTried(d) ? [["Δοκιμές αυτόματης βελτίωσης", fmt(autoTried(d), 0)], ["Βελτιώσεις που κρατήθηκαν", fmt(autoWins(d), 0)]] : [])])}</div>`);
}
const autoTried = (d) => Object.values(d?.model4?.models || {}).reduce((a, m) => a + (m.auto?.tried || 0), 0);
const autoWins = (d) => Object.values(d?.model4?.models || {}).reduce((a, m) => a + (m.auto?.changed ? 1 : 0), 0);
function autoLine(m) {
  const a = m.auto; if (!a) return "";
  const nm = (m.variantNames || {})[m.variant] || m.variant || "—";
  return `<div class="auto-line"><div><span class="muted">Επιλέχθηκε:</span> ${esc(m.variant || "")} — ${esc(nm)}</div>
    <div><span class="muted">Αυτόματη βελτίωση:</span> ${fmt(a.tried, 0)} δοκιμές συνολικά, απόψε ${fmt(a.tonight, 0)}. ${a.changed ? `<b class="up">Βρέθηκε καλύτερος συνδυασμός.</b>` : "Ο καλύτερος μέχρι τώρα δεν ξεπεράστηκε."}</div>
    ${String(m.variant || "").startsWith("S") ? "" : `<div class="small muted">Καλύτερος της αναζήτησης μέχρι τώρα: ${esc(a.champion || "—")}</div>`}</div>`;
}
// Νέο μοντέλο v4: μετρήθηκε στις ΙΔΙΕΣ περιόδους με το v3, ώστε το «πριν / μετά» να είναι πραγματικό
function model4Section(d) {
  const m4 = d?.model4 || {}, M = m4.models || {}, keys = ["rank21", "rank5", "short", "day", "swing"].filter((k) => M[k]);
  const pr = m4.progress || {};
  if (!keys.length) return card(`<h3>Νέο μοντέλο v4</h3><p class="soft" style="margin:0">Πιο δυνατή έκδοση με περισσότερα στοιχεία ανά μετοχή (καθαρό momentum χωρίς την αγορά, ιδιοσυγκρατικός κίνδυνος, εποχικότητα, νυχτερινές κινήσεις, ρευστότητα, επιτόκια, δολάριο, πετρέλαιο, σύγκριση με κλάδο και βιομηχανία). Εκπαιδεύεται στην επόμενη βραδινή ανάλυση και θα δεις εδώ πώς τα πάει απέναντι στο σημερινό.</p>${pr.running ? `<div class="small muted" style="margin-top:8px">Τώρα: ${esc(pr.step || "")}</div>` : ""}`);
  const P = (v, n = 2) => (isNum(v) ? pct(v * 100, n) : "—");
  const row = (k) => { const m = M[k], rank = m.kind === "rank", a = m.v3 || {}, b = m.v4 || {};
    const st = m.active ? chip("Ενεργό: καλύτερο και επικυρωμένο", "up") : m.better ? chip("Καλύτερο από το v3, όχι ακόμα επικυρωμένο", "accent") : chip("Δεν ξεπέρασε το v3", "warn");
    const cmp = rank ? [["Σταθερότητα πρόβλεψης (t)", fmt(a.icT, 2), fmt(b.icT, 2), (b.icT ?? -9) > (a.icT ?? -9)], ["Top 10% vs αγορά", P(a.top), P(b.top), (b.top ?? -9) >= (a.top ?? -9)], ["Top − bottom 10%", P(a.ls), P(b.ls), (b.ls ?? -9) >= (a.ls ?? -9)]]
      : [["AUC (0.5 = τύχη)", fmt(a.auc, 3), fmt(b.auc, 3), (b.auc ?? 0) > (a.auc ?? 0)], ["Top 10% μέσο R", `${fmt(a.top, 3)}R`, `${fmt(b.top, 3)}R`, (b.top ?? -9) >= (a.top ?? -9)], ["Επιτυχία top 10%", ratioPct(a.hit, 1), ratioPct(b.hit, 1), (b.hit ?? 0) >= (a.hit ?? 0)]];
    return `<div class="m4"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="flex:1 1 220px">${esc(m.label || k)}</b>${st}</div>
      <table class="cmp"><thead><tr><th></th><th>v3</th><th>v4</th></tr></thead><tbody>${cmp.map(([n, x, y, good]) => `<tr><td>${n}</td><td class="num">${x}</td><td class="num ${good ? "up" : "down"}">${y}</td></tr>`).join("")}</tbody></table>${autoLine(m)}
      <details><summary>Έλεγχοι και τι μετράει περισσότερο</summary><ul class="list">${(m.gate || []).map((g) => `<li><span>${esc(g)}</span></li>`).join("")}</ul>
      ${(m.importance || []).length ? `<div class="small muted" style="margin:10px 0 4px">Τα πιο χρήσιμα στοιχεία</div>${m.importance.slice(0, 8).map((i) => `<div class="small">${esc(i.label)} ${i.new ? chip("νέο", "accent") : ""}</div>`).join("")}` : ""}</details></div>`; };
  return card(`<h3>Νέο μοντέλο v4</h3><p class="soft" style="margin:0 0 10px">${fmt(m4.features, 0)} στοιχεία ανά μετοχή (${fmt(m4.newFeatures, 0)} νέα). Εκπαιδεύτηκε δίπλα στο σημερινό και μετρήθηκε στις ίδιες περιόδους που δεν είχε δει. Χρησιμοποιείται μόνο όπου βγαίνει επικυρωμένο και καλύτερο. Το t διορθώνεται για επικάλυψη ημερών, άρα είναι αυστηρότερο.</p>
    ${keys.map(row).join("")}${pr.running ? `<div class="small muted" style="margin-top:8px">Τώρα: ${esc(pr.step || "")}</div>` : ""}`);
}
routes.model = async () => {
  const d = D(), M = d?.model || {}, st = d?.stats || {};
  $("#view").innerHTML = `<div class="stack"><h1 class="page-title">Μοντέλο πρόβλεψης</h1>
    ${card(`<p style="margin:0" class="soft"><b>Τι κάνει.</b> Κατάταξη (ποιες θα πάνε καλύτερα σε 5 ή 21 ημέρες) και στόχος πριν το stop (day trade, 5 ημέρες, swing). Κοιτάζει ${st.features || 173} στοιχεία ανά μετοχή: τιμές, όγκους, μεταβλητότητα, σύγκριση με αγορά και κλάδο, οικονομικά, ημερομηνίες αποτελεσμάτων.<br><br><b>Πώς ελέγχεται.</b> Μαθαίνει μόνο από το παρελθόν και δοκιμάζεται σε περίοδο που δεν έχει δει. Χρησιμοποιείται μόνο αν περάσει όλα τα κριτήρια.</p>`)}
    ${d ? `<div class="grid2">${[["Ιστορικό", `${d.historyYears || "—"} χρόνια`, `${dday(d.firstDate)} – ${dday(d.asOf)}`], ["Μετοχές", fmt(d.histTickers, 0), `${big(st.rawBars)} τιμές`], ["Στοιχεία εκπαίδευσης", big(st.values), `σε ${fmt(st.seconds, 0)} δευτ.`], ["Ταχύτητα", isNum(st.perSec) ? (st.perSec / 1e6).toFixed(1) + " εκ./δ" : "—", esc(st.engine || "")]]
      .map(([n, v, s]) => `<div class="tile"><div class="t-name">${n}</div><div class="t-val num">${v}</div><div class="small muted">${s}</div></div>`).join("")}</div>` : freshness()}
    ${autoTrainCard(d)}
    ${model4Section(d)}
    ${sec("Μοντέλο v3 (σημερινό)")}
    ${["rank21", "rank5", "swing", "short", "day"].filter((k) => M[k]).map((k) => { const m = M[k], rank = m.kind === "rank";
      return card(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h3 style="margin:0;flex:1">${esc(m.label || k)}</h3>${m.validated ? chip("Επικυρωμένο", "up") : chip("Δεν επικυρώθηκε", "warn")}</div><div class="small muted" style="margin:4px 0 10px">Εκπαίδευση ${dt(m.createdAt)}, ${fmt(m.nTrain, 0)} παραδείγματα</div>
        <ul class="list gate">${(m.gate || []).map((g) => `<li><b class="${g.startsWith("✓") ? "up" : "down"}">${g.startsWith("✓") ? "✓" : "✗"}</b><span>${esc(g.replace(/^[✓✗]\s*/, ""))}</span></li>`).join("")}</ul>
        <div style="margin:12px 0">${kv(rank ? [["Συσχέτιση (IC)", `${fmt(m.ic, 4)} (t=${fmt(m.icT, 2)})`], ["Μέρες με θετικό IC", ratioPct(m.icPos, 0)], ["Top 10% vs αγορά", pct((m.top ?? NaN) * 100, 2), cls(m.top)], ["Top − bottom 10%", pct((m.ls ?? NaN) * 100, 2), cls(m.ls)]]
          : [["AUC", fmt(m.auc, 3)], ["Επιτυχία top 10%", ratioPct(m.hit, 1)], ["Μέση επιτυχία", ratioPct(m.base, 1)], ["Top 10% σε R", `${fmt(m.top, 3)}R`, cls(m.top)]])}</div>
        ${decileBars(m.deciles)}`); }).join("") || card(emptyBox("Δεν υπάρχει ακόμα μοντέλο"))}
    ${Data.server ? `<a class="btn block" href="#/tools">${icon("model")}Εκπαίδευση μοντέλων στον υπολογιστή</a>` : ""}</div>`;
};
routes.news = async () => {
  const d = D(), live = Keys.finnhub ? await liveNews(null) : [];
  $("#view").innerHTML = `<div class="stack"><h1 class="page-title">Ειδήσεις</h1><p class="page-sub">Με ημερομηνία και πηγή. Το θετική/αρνητική είναι εκτίμηση και μπορεί να κάνει λάθος.</p>
    ${live.length ? card(live.map(newsItem).join(""), "flush") : ""}${card((d?.news || []).map(newsItem).join("") || emptyBox("Καμία είδηση"), "flush")}</div>`;
};
routes.data = async () => {
  const d = D();
  $("#view").innerHTML = `<div class="stack"><h1 class="page-title">Δεδομένα</h1><p class="page-sub">${Data.server ? "Ζωντανά από το πρόγραμμα του υπολογιστή." : "Πλήρης ανάλυση κάθε βράδυ στο cloud, τιμές κάθε 30′ όσο είναι ανοιχτή η αγορά."}</p>${freshness()}
    ${d ? card(kv([["Ενημέρωση", dt(d.builtAt)], ["Τιμές κλεισίματος", dday(d.asOf)], ["Μετοχές σε ανάλυση", fmt(d.analyzed, 0)], ["Ιστορικό", `${d.historyYears} χρόνια`], ["Ενεργές ευκαιρίες", (d.signals || []).length], ["Day trade υποψήφιες", ((d.day?.long || []).length + (d.day?.short || []).length)], ["Τρέχουσες τιμές", Data.quotesAt ? dt(new Date(Data.quotesAt).toISOString()) : "—"], ["Φορτώθηκε", ago(Data.loadedAt)]])) : ""}
    ${card(`<h3>Πηγές</h3><ul class="list"><li><span><b>Τιμές:</b> Yahoo Finance, όλες οι μετοχές NASDAQ/NYSE/AMEX.</span></li><li><span><b>Λίστα και κλάδοι:</b> Nasdaq, SEC.</span></li><li><span><b>Οικονομικά:</b> SEC (όπου είναι διαθέσιμη) και Yahoo.</span></li><li><span><b>Ειδήσεις:</b> Yahoo, Google News, με ημερομηνία και πηγή.</span></li></ul>`)}
    <button class="btn block" id="rl">${icon("refresh")}Φόρτωσε ξανά</button></div>`;
  $("#rl").addEventListener("click", async () => { await Data.load(); await refreshQuotes(); toast(Data.snap ? "Ενημερώθηκε" : "Δεν φορτώθηκε"); router({ soft: true }); });
};
routes.settings = async () => {
  $("#view").innerHTML = `<div class="stack"><h1 class="page-title">Εμφάνιση</h1><p class="page-sub">Η εφαρμογή δεν χρειάζεται κωδικούς ούτε ρυθμίσεις.</p>${card(`<button class="btn block" id="themeBtn2">${icon("theme")}Φωτεινό / σκούρο θέμα</button>`)}</div>`;
  $("#themeBtn2").addEventListener("click", toggleTheme);
};
const isStandalone = () => window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function installSteps() {
  return `<ol class="steps"><li><div>Άνοιξε αυτή τη σελίδα στο <b>Safari</b> του iPhone.</div></li><li><div>Πάτα <b>Κοινοποίηση</b> κάτω στη μέση.</div></li><li><div>Διάλεξε <b>«Προσθήκη στην οικ. οθόνη»</b>.</div></li><li><div>Άνοιγε την εφαρμογή από το εικονίδιο <b>US Alpha</b>.</div></li></ol>`;
}
routes.guide = async () => {
  $("#view").innerHTML = `<div class="stack"><h1 class="page-title">Οδηγός</h1>${card(`<h3>Εγκατάσταση στο iPhone</h3>${installSteps()}`)}
    ${card(`<h3>Τι να περιμένεις</h3><ul class="list"><li><span>Κάθε βράδυ Δευτέρα–Παρασκευή γίνεται αυτόματα πλήρης ανάλυση όλης της αγοράς. Ο υπολογιστής σου δεν χρειάζεται να είναι ανοιχτός.</span></li>
      <li><span>Το πρωί βρίσκεις έτοιμα day trades και ευκαιρίες με είσοδο, stop και στόχους.</span></li><li><span>Όσο είναι ανοιχτή η αγορά (16:30–23:00 ώρα Ελλάδας) οι τιμές ενημερώνονται κάθε 30 λεπτά.</span></li>
      <li><span>Ο βοηθός απαντά σε ερωτήσεις για μετοχές, την αγορά, day trades, ρίσκο, όρους. Ανάλυση, όχι επενδυτική συμβουλή.</span></li></ul>`)}</div>`;
};

// ================================================================== αναζήτηση
async function openSearch(onPick = null) {
  if (typeof onPick !== "function") onPick = null; // από το κουμπί αναζήτησης έρχεται το click event, όχι συνάρτηση
  const rows = D()?.rows || [];
  const sh = document.createElement("div"); sh.className = "sheet"; sh.setAttribute("role", "dialog");
  sh.innerHTML = `<div class="sheet-head"><input class="input" id="sIn" placeholder="${onPick ? "Ποια εταιρεία θέλεις στις προβλέψεις;" : "Σύμβολο ή εταιρεία (π.χ. AEHR)"}" autocomplete="off" autocapitalize="characters" spellcheck="false" style="border-radius:999px"><button class="round-btn" id="sX" aria-label="Κλείσιμο">${icon("x")}</button></div><div class="results" id="sRes"></div>`;
  document.body.appendChild(sh);
  const close = () => sh.remove();
  $("#sX", sh).addEventListener("click", close);
  const render = (q) => {
    const Q = q.trim().toUpperCase(), P = plain(q);
    let hits = [];
    if (Q) { for (const r of rows) { if (r.t === Q) hits.unshift([r, 3]); else if (r.t.startsWith(Q)) hits.push([r, 2]); else if (P.length > 2 && plain(r.n).includes(P)) hits.push([r, 1]); }
      hits.sort((a, b) => b[1] - a[1] || (b[0].dv || 0) - (a[0].dv || 0)); hits = hits.slice(0, 30).map((h) => h[0]);
      if (/^[A-Z^][A-Z0-9.\-]{0,9}$/.test(Q) && !hits.some((h) => h.t === Q)) hits.push({ t: Q, n: "Δοκίμασε αυτό το σύμβολο" }); }
    else hits = [...new Set([...store.get("recent", []), ...App.watch])].slice(0, 14).map((t) => Data.row(t) || { t, n: "" });
    $("#sRes", sh).innerHTML = hits.map((r) => `<a href="#/s/${encodeURIComponent(r.t)}">${logo(r.t)}<span style="min-width:0"><b>${esc(r.t)}</b><span class="nm">${esc(r.n || "")}</span></span><span class="num">${isNum(curPx(r.t, r.p)) ? fmt(curPx(r.t, r.p)) : ""}</span></a>`).join("") || `<div class="empty">Τίποτα δεν ταιριάζει</div>`;
  };
  $("#sRes", sh).addEventListener("click", (e) => { const a = e.target.closest("a"); if (!a) return;
    const t = decodeURIComponent(a.getAttribute("href").replace("#/s/", "")); store.set("recent", [t, ...store.get("recent", []).filter((x) => x !== t)].slice(0, 8));
    if (onPick) { e.preventDefault(); onPick(t); } close(); });
  $("#sIn", sh).addEventListener("input", (e) => render(e.target.value));
  $("#sIn", sh).addEventListener("keydown", (e) => { if (e.key === "Enter") { const a = $("#sRes a", sh); if (a) { if (onPick) onPick(decodeURIComponent(a.getAttribute("href").replace("#/s/", ""))); else location.hash = a.getAttribute("href"); close(); } } if (e.key === "Escape") close(); });
  render(""); setTimeout(() => $("#sIn", sh).focus(), 50);
}

// ================================================================== ζωντανές τιμές
async function refreshQuotes() {
  await Data.loadQuotes();
  livePx();
  if (!Keys.finnhub) return;
  const d = D(), list = [...new Set([...App.watch, ...(d?.signals || []).slice(0, 12).map((s) => s.ticker), "SPY", "QQQ", "DIA", "IWM"])];
  Object.assign(App.quotes, await quotes(list));
  livePx();
}
// σελίδα μετοχής ανοιχτή: η τιμή ενημερώνεται μόνη της όταν έρχονται νέες τιμές (χωρίς να ξαναφορτώνει η σελίδα)
function livePx() {
  try {
    const a = App.last, t = a?.ticker;
    if (App.route !== "s" || !t) return;
    const q = App.quotes[t], px = $("#sPx"), m = $("#sPxMeta");
    if (!q || !px || !m || !location.hash.toUpperCase().includes(encodeURIComponent(t).toUpperCase())) return;
    a.q = q;
    px.innerHTML = money(q.price ?? a.price);
    m.innerHTML = chgPill(q.chg ?? a.chg) + qChip(q, a.asOf);
  } catch { /* η σελίδα άλλαξε στο μεταξύ */ }
}

// ================================================================== αυτόματη ενημέρωση εφαρμογής
// Όταν ανεβαίνει νέα έκδοση, το κινητό την παίρνει μόνο του: έλεγχος κάθε φορά που ανοίγει/επιστρέφει η εφαρμογή
// και ανανέωση της σελίδας (εκτός αν ο χρήστης γράφει κάτι εκείνη τη στιγμή — τότε ρωτάμε με ένα κουμπί).
function setupUpdates() {
  const sw = navigator.serviceWorker, hadCtl = !!sw.controller;
  let reloading = false;
  const reload = () => { if (reloading) return; reloading = true; location.reload(); };
  sw.addEventListener("controllerchange", () => {
    if (!hadCtl || reloading) return; // πρώτη εγκατάσταση: τίποτα
    const busy = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (!busy && !$(".sheet")) return reload(); // ο βοηθός ή η αναζήτηση είναι ανοιχτά: ρωτάμε
    if ($("#updBar")) return;
    document.body.insertAdjacentHTML("beforeend", `<button id="updBar" class="upd-bar">Νέα έκδοση της εφαρμογής · πάτα για ανανέωση</button>`);
    $("#updBar").addEventListener("click", reload);
  });
  sw.register("sw.js", { updateViaCache: "none" }).then((reg) => {
    const check = () => reg.update().catch(() => { /* εκτός σύνδεσης */ });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    setInterval(check, 30 * 60 * 1000);
  }).catch(() => { /* */ });
}
// ================================================================== εκκίνηση (καλείται από το bot.js)
function toggleTheme() { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; store.set("theme", t);
  $('meta[name="theme-color"]').setAttribute("content", t === "dark" ? "#070b16" : "#edf0f7"); router({ soft: true }); }
async function boot() {
  document.documentElement.dataset.theme = store.get("theme", "dark");
  $('meta[name="theme-color"]')?.setAttribute("content", store.get("theme", "dark") === "dark" ? "#070b16" : "#edf0f7");
  $("#tabbar").innerHTML = [["home", "Αρχική", "home"], ["day", "Day trade", "bolt"], ["signals", "Ευκαιρίες", "target"], ["pf", "Χαρτοφυλάκιο", "wallet"], ["scan", "Scanner", "filter"], ["watch", "Λίστα", "star"]]
    .map(([r, l, i]) => `<a href="#/${r}" data-r="${r}">${icon(i)}<span>${l}</span></a>`).join("");
  $("#searchIco").innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS.search}</svg>`;
  $("#themeBtn").innerHTML = icon("theme"); $("#botFab").innerHTML = `${icon("chat")}Βοηθός`;
  $("#searchBtn").addEventListener("click", () => openSearch()); $("#themeBtn").addEventListener("click", toggleTheme); $("#meBtn").addEventListener("click", () => { location.hash = "#/more"; });
  $("#botFab").addEventListener("click", () => { const m = location.hash.match(/#\/s\/([^/]+)/); openBot(m ? decodeURIComponent(m[1]).toUpperCase() : bot.ticker); });
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-ask]"); if (!b) return; e.preventDefault(); if (b.dataset.ask === "__watch") { openBot(null); botAsk("Τι κάνει η λίστα μου;"); return; } openBot(b.dataset.ask); botAsk(`Εξήγησέ μου την ${b.dataset.ask}`); });
  renderSession(); setInterval(renderSession, 20000);
  if ("serviceWorker" in navigator) setupUpdates();
  if (location.hash === "#/welcome") location.hash = "#/home";
  const cached = await Data.loadCached();
  if (cached) router();
  await Data.detectServer();
  if (Data.server) $("#tabbar").insertAdjacentHTML("beforeend", `<a href="#/tools" data-r="tools" class="desk-only">${icon("model")}<span>Εργαλεία</span></a>`);
  const before = Data.snap?.builtAt;
  await Promise.all([Data.load(), Data.loadAI()]);
  if (!cached) router();
  else if (Data.snap?.builtAt !== before || Data.server) { Data.shards.clear(); router({ soft: true }); }
  refreshQuotes().then(() => { if (Object.keys(App.quotes).length && ["home", "watch", "signals", "day"].includes(App.route)) router({ soft: true }); });
  setInterval(() => { if (document.visibilityState === "visible") refreshQuotes().then(() => { if (["home", "watch", "signals", "day"].includes(App.route)) router({ soft: true }); }); }, (Data.server ? 1 : 2) * 60000);
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible") return;
    renderSession();
    if (Date.now() - Data.loadedAt > 15 * 60000) { const old = Data.snap?.builtAt, oldB = Data.ai?.brief?.at; await Promise.all([Data.load(), Data.loadAI()]);
      if (Data.ai?.brief?.at && Data.ai.brief.at !== oldB) { toast(`Νέα ${esc(Data.ai.brief.label || "ενημέρωση AI")}: ${esc(Data.ai.brief.headline || "")}`); if (App.route === "home" || App.route === "brief") router({ soft: true }); } if (Data.snap?.builtAt !== old && App.route !== "s") { Data.shards.clear(); router({ soft: true }); toast("Νέα ανάλυση φορτώθηκε"); } }
    refreshQuotes().then(() => { if (["home", "watch", "signals", "day"].includes(App.route)) router({ soft: true }); });
  });
}
