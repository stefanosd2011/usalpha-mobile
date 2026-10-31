/* US Alpha Mobile — οθόνες εφαρμογής. */
"use strict";

// ================================================================== εικονίδια & στοιχεία
const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>', filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>', dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>', send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>', theme: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4"/>', play: '<path d="M7 4v16l13-8z"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', plus: '<path d="M12 5v14M5 12h14"/>', back: '<path d="m15 18-6-6 6-6"/>',
  model: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
};
const icon = (n) => `<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ""}</svg></span>`;
const chip = (t, k = "", title = "") => `<span class="chip ${k}"${title ? ` title="${esc(title)}"` : ""}>${t}</span>`;
const biasChip = (b) => (b === "bullish" ? chip("Ανοδικό", "up") : b === "bearish" ? chip("Πτωτικό", "down") : chip("Ουδέτερο"));
const emptyBox = (t, x = "") => `<div class="empty"><b>${t}</b>${x}</div>`;
const kv = (pairs) => `<dl class="kv">${pairs.filter(Boolean).map(([k, v, c]) => `<div><dt>${k}</dt><dd class="num ${c || ""}">${v}</dd></div>`).join("")}</dl>`;
function band(title, body, { sub = "", right = "", flush = false } = {}) {
  return `<section class="band">${title ? `<div class="band-head"><h2>${title}</h2>${right ? `<div class="right">${right}</div>` : ""}${sub ? `<div class="sub">${sub}</div>` : ""}</div>` : ""}<div class="band-body ${flush ? "flush" : ""}">${body}</div></section>`;
}
function spark(arr, { w = 120, h = 30, up = null } = {}) {
  const a = (arr || []).filter(isNum); if (a.length < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}"></svg>`;
  const mn = Math.min(...a), mx = Math.max(...a), rg = mx - mn || 1;
  const d = a.map((v, i) => `${i ? "L" : "M"}${((i / (a.length - 1)) * w).toFixed(1)} ${(h - 2 - ((v - mn) / rg) * (h - 4)).toFixed(1)}`).join("");
  const col = (up ?? a[a.length - 1] >= a[0]) ? "var(--up)" : "var(--down)";
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}L${w} ${h}L0 ${h}Z" fill="${col}" opacity=".1"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}
function ring(s, size = "") {
  const C = 2 * Math.PI * 16, tr = `<circle cx="20" cy="20" r="16" fill="none" stroke="var(--surface-3)" stroke-width="4"/>`;
  if (!isNum(s)) return `<div class="ring ${size}"><svg viewBox="0 0 40 40">${tr}</svg><b class="muted">—</b></div>`;
  const col = s >= 60 ? "var(--up)" : s <= 40 ? "var(--down)" : "var(--accent)";
  return `<div class="ring ${size}" aria-label="Βαθμολογία ${s.toFixed(0)}"><svg viewBox="0 0 40 40">${tr}<circle cx="20" cy="20" r="16" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(clamp(s) / 100 * C).toFixed(1)} ${C.toFixed(1)}"/></svg><b>${s.toFixed(0)}</b></div>`;
}
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
function gauge(v, label, tone) {
  const R = 88, cx = 110, cy = 108, pt = (f) => { const a = Math.PI * (1 - f); return [cx + R * Math.cos(a), cy - R * Math.sin(a)]; };
  const arc = (f0, f1) => { const [x0, y0] = pt(f0), [x1, y1] = pt(f1); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  const f = isNum(v) ? Math.max(0.001, Math.min(1, v / 100)) : 0, col = tone === "up" ? "var(--up)" : tone === "down" ? "var(--down)" : "var(--warn)";
  return `<div class="gauge"><svg viewBox="0 0 220 136" role="img" aria-label="Διάθεση αγοράς ${isNum(v) ? v.toFixed(0) : "—"} στα 100"><path d="${arc(0, 1)}" fill="none" stroke="var(--surface-3)" stroke-width="16" stroke-linecap="round"/>
    ${isNum(v) ? `<path d="${arc(0, f)}" fill="none" stroke="${col}" stroke-width="16" stroke-linecap="round"/>` : ""}<text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="var(--text)" font-size="44" font-weight="760">${isNum(v) ? v.toFixed(0) : "—"}</text>
    <text x="4" y="134" fill="var(--muted)" font-size="13">Φόβος</text><text x="216" y="134" text-anchor="end" fill="var(--muted)" font-size="13">Αισιοδοξία</text></svg><div class="g-lbl">${esc(label || "—")}</div></div>`;
}
function ladder(s, cur) {
  const a = s.stop, b = s.tp3; if (![a, b, s.tp1, s.tp2].every(isNum) || a === b) return "";
  const pos = (v) => clamp(((v - a) / (b - a)) * 100, -1, 101);
  const z0 = Math.min(pos(s.entryLow), pos(s.entryHigh)), z1 = Math.max(pos(s.entryLow), pos(s.entryHigh));
  return `<div class="ladder" role="img" aria-label="Stop ${fmt(a)}, είσοδος ${fmt(s.entryLow)}–${fmt(s.entryHigh)}, στόχοι ${fmt(s.tp1)}, ${fmt(s.tp2)}, ${fmt(b)}"><div class="track"></div>
    <div class="zone" style="left:${z0}%;width:${Math.max(2, z1 - z0)}%"></div><i class="mk stop" style="left:0"></i><i class="mk tp" style="left:${pos(s.tp1)}%"></i><i class="mk tp" style="left:${pos(s.tp2)}%"></i><i class="mk tp" style="left:100%"></i>
    ${isNum(cur) ? `<i class="mk now" style="left:${pos(cur)}%"></i>` : ""}<span class="lb stop">${fmt(a)}</span><span class="lb" style="left:${(z0 + z1) / 2}%">${fmt(s.entry)}</span>
    <span class="lb tp" style="left:${pos(s.tp2)}%">${fmt(s.tp2)}</span><span class="lb tp last">${fmt(b)}</span></div>`;
}
function vladder(s, cur) {
  const R = Math.abs(s.entry - s.stop) || 1, ch = (v) => (isNum(cur) && cur ? pct((v / cur - 1) * 100, 1) : "");
  const rows = [{ k: "tp", l: "Στόχος 3", v: s.tp3, n: `${fmt(Math.abs(s.tp3 - s.entry) / R, 1)}R · ${ch(s.tp3)}` }, { k: "tp", l: "Στόχος 2", v: s.tp2, n: `${fmt(Math.abs(s.tp2 - s.entry) / R, 1)}R · ${ch(s.tp2)}` },
    { k: "tp", l: "Στόχος 1", v: s.tp1, n: `${ch(s.tp1)}, μετά stop στην είσοδο` }, { k: "en", l: "Είσοδος", v: s.entry, n: `${fmt(s.entryLow)}–${fmt(s.entryHigh)}` }, { k: "st", l: "Stop", v: s.stop, n: `ρίσκο ${fmt(s.stopPct, 1)}%` }];
  if (isNum(cur)) rows.push({ k: "nw", l: "Τώρα", v: cur, n: "τρέχουσα τιμή" });
  rows.sort((x, y) => y.v - x.v);
  return `<div class="vladder">${rows.map((r) => `<div class="${r.k}"><span>${r.l}</span><span class="muted">${esc(r.n)}</span><b class="num">${fmt(r.v)}</b></div>`).join("")}</div>`;
}
function rowItem(r, right = "chg") {
  const q = App.quotes[r.t];
  const p = q?.price ?? r.p, c = q?.chg ?? r.ch;
  return `<a class="row" href="#/s/${encodeURIComponent(r.t)}"><div style="min-width:0"><div class="tk">${esc(r.t)}</div><div class="nm">${esc(r.n || "")}</div></div>
    ${spark(r.sp, { w: 76, h: 26 })}<div class="right"><b class="num">${fmt(p)}</b><span class="num ${right === "chg" ? cls(c) : right === "rank" ? "sodium" : ""}">${right === "rv" ? fmt(r.rv, 1) + "× όγκος" : right === "rank" ? topPct(r.r5) : pct(c)}</span></div>${ring(r.s, "sm")}</a>`;
}
function oppCard(s) {
  const q = App.quotes[s.ticker], cur = q?.price ?? s.price, chg = q?.chg ?? s.chg;
  const model = isNum(s.rank) ? chip(`${topPct(s.rank)} της αγοράς`, "sodium") : "";
  return `<a class="opp" href="#/s/${encodeURIComponent(s.ticker)}"><div class="opp-top"><div style="min-width:0"><div class="tk">${esc(s.ticker)} ${s.bias === "bearish" ? chip("Short", "down") : ""}</div><div class="nm">${esc(s.name || "")}</div></div>
    ${spark(s.spark, { w: 64, h: 30 })}${ring(s.score, "sm")}<div class="px"><b class="num">${money(cur)}</b><span class="num ${cls(chg)}">${pct(chg)}</span></div></div>
    <div class="setup-name">${esc(s.setup)}</div>${ladder(s, cur)}
    <div class="opp-foot">${chip(esc(HZ[s.horizon] || s.horizon), "accent")}${s.confidence ? chip(esc(s.confidence) + " επιβεβαίωση") : ""}${model}</div></a>`;
}
function newsItem(n) {
  const s = n.sent;
  return `<a class="news-item" href="${esc(n.url || "#")}" target="_blank" rel="noopener"><div class="ttl">${esc(n.title)}</div>
    <div class="nm2">${n.ticker ? `<b>${esc(n.ticker)}</b>` : ""}<span>${n.ts ? dt(new Date(n.ts).toISOString()) : ""}</span><span>${esc(n.source || "")}</span>${isNum(s) ? (s > 0.15 ? chip("Θετική", "up") : s < -0.15 ? chip("Αρνητική", "down") : chip("Ουδέτερη")) : ""}${n.cat && n.cat !== "Γενικό" ? chip(esc(n.cat)) : ""}</div></a>`;
}
const pills = (items, on, attr) => `<div class="pills" role="tablist">${items.map(([k, l]) => `<button type="button" class="${k === on ? "on" : ""}" data-${attr}="${esc(k)}">${l}</button>`).join("")}</div>`;

// ================================================================== κατάσταση εφαρμογής
const App = { scan: null, quotes: {}, ref: null, watch: store.get("watch", ["AEHR", "NVDA", "AAPL"]), route: "" };
const REGIME = { "Risk-on": { tone: "up", head: "Η αγορά είναι σε καλή διάθεση", label: "Θετική" }, "Risk-off": { tone: "down", head: "Η αγορά είναι φοβισμένη", label: "Φοβισμένη" },
  "Ουδέτερο": { tone: "neutral", head: "Η αγορά δεν έχει καθαρή κατεύθυνση", label: "Ουδέτερη" } };
async function loadRef() { if (!App.ref) App.ref = (await kvGet("ref")) || {}; return App.ref; }
function saveWatch() { store.set("watch", App.watch); }

// ================================================================== router
const routes = {};
async function router(opt = {}) {
  const h = location.hash.replace(/^#\/?/, "") || "home";
  const [name, ...rest] = h.split("/");
  const changed = name !== App.route; App.route = name;
  const tab = { home: "home", scan: "scan", s: "scan", signals: "signals", watch: "watch" }[name] || "more";
  $$(".tabbar a").forEach((a) => a.classList.toggle("on", a.dataset.r === tab));
  disposeCharts();
  const view = $("#view"), y = window.scrollY;
  if (!opt.soft) view.innerHTML = `<div class="loading"><span class="spinner"></span>Φόρτωση…</div>`;
  try { await (routes[name] || routes.home)(...rest.map(decodeURIComponent)); if (opt.soft) window.scrollTo(0, y); else if (changed) window.scrollTo(0, 0); }
  catch (e) { view.innerHTML = band("", `<div class="callout"><b>Δεν φόρτωσε.</b> ${esc(e.message)}</div><div style="margin-top:12px"><button class="btn" onclick="router()">Δοκίμασε ξανά</button></div>`); }
}
window.addEventListener("hashchange", () => router());

// ================================================================== μπάρα συνεδρίασης
function renderSession() {
  const T = sessionInfo(), now = Date.now(), span = T.end - T.pre, p = (t) => clamp(((t - T.pre) / span) * 100);
  const ath = (t) => new Date(t).toLocaleTimeString("el-GR", { timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit", hour12: false });
  const left = (ms) => { const m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60); return h ? `${h} ώρ. ${m % 60}′` : `${m}′`; };
  const f = (d) => d.toLocaleDateString("el-GR", { timeZone: "Europe/Athens" });
  const dayW = () => { const o = new Date(T.open); return f(o) === f(new Date()) ? "σήμερα" : f(o) === f(new Date(now + 864e5)) ? "αύριο" : o.toLocaleDateString("el-GR", { timeZone: "Europe/Athens", weekday: "long" }); };
  const s = now < T.pre ? "closed" : now < T.open ? "pre" : now < T.close ? "regular" : now < T.end ? "post" : "closed";
  const [title, sub, dot] = s === "regular" ? ["Ανοιχτή αγορά", `Κλείνει σε ${left(T.close - now)}`, "live"] : s === "pre" ? ["Premarket", `Ανοίγει σε ${left(T.open - now)}`, "pre"]
    : s === "post" ? ["After-hours", `Τέλος σε ${left(T.end - now)}`, "pre"] : ["Κλειστή αγορά", `Ανοίγει ${dayW()} ${ath(T.open)}`, ""];
  $("#session").innerHTML = `<div class="session-state"><b><span class="dot ${dot}"></span>${title}</b><small>${sub}</small></div>
    <div class="ribbon" aria-hidden="true"><div class="ribbon-track"><i class="pre" style="width:${p(T.open)}%"></i><i class="reg" style="width:${p(T.close) - p(T.open)}%"></i><i class="post" style="flex:1"></i></div>
    ${now >= T.pre && now <= T.end ? `<div class="ribbon-now" style="left:${p(now)}%"></div>` : ""}
    <div class="ribbon-ticks"><span style="left:0;transform:none">${ath(T.pre)}</span><span style="left:${p(T.open)}%">${ath(T.open)}</span><span style="left:${p(T.close)}%">${ath(T.close)}</span><span style="left:100%;transform:translateX(-100%)">${ath(T.end)}</span></div></div>`;
}

// ================================================================== ανάλυση / συγχρονισμός
let _scanQueued = false, _scanning = false;
async function runScan(train = false) {
  if (_scanning) { _scanQueued = true; return; }
  _scanning = true;
  try {
    const r = await Engine.call("scan", { train });
    if (r?.ok) { App.scan = r; refreshQuotes(); if (["home", "scan", "signals", "watch", "model"].includes(App.route)) router({ soft: true }); }
  } catch (e) { toast("Η ανάλυση σταμάτησε: " + esc(e.message), "high"); }
  _scanning = false;
  if (_scanQueued) { _scanQueued = false; runScan(); }
}
function startSync() {
  if (!Keys.massive || Sync.running) return;
  Sync.start({ onBatch: () => runScan() });
}
Sync.listeners.add(() => { const el = $("#syncCard"); if (el) el.outerHTML = syncCard(); });
Engine.onProgress = () => { const el = $("#syncCard"); if (el) el.outerHTML = syncCard(); };
function syncCard() {
  const st = Sync.st, pr = Engine.progress;
  if (!Keys.massive) return `<div id="syncCard"></div>`;
  const pctDone = st.total ? Math.round(st.done / st.total * 100) : 0;
  const waitS = Limiter.nextAt ? Math.max(0, Math.round((Limiter.nextAt - Date.now()) / 1000)) : 0;
  const remaining = st.total ? Math.max(0, st.total - st.done) : 0;
  if (pr) return `<div id="syncCard" class="callout info"><b>Ανάλυση στο τηλέφωνο:</b> ${esc(pr.step)}<div class="progress" style="margin-top:8px"><i style="width:${pr.pct || 0}%"></i></div></div>`;
  if (st.phase === "error") return `<div id="syncCard" class="callout"><b>Ο συγχρονισμός σταμάτησε:</b> ${esc(st.error)}<div style="margin-top:10px"><button class="btn" onclick="startSync()">${icon("refresh")}Συνέχεια</button></div></div>`;
  if (Sync.running && st.phase === "ref") return `<div id="syncCard" class="callout info"><b>Ετοιμασία:</b> ${esc(st.msg)}</div>`;
  if (Sync.running && remaining > 0) return `<div id="syncCard" class="callout info"><b>Κατέβασμα όλης της αγοράς:</b> ${st.done} από ${st.total} ημέρες (${pctDone}%)
    <div class="progress" style="margin-top:8px"><i style="width:${pctDone}%"></i></div><div class="small soft" style="margin-top:6px">${esc(st.msg)}. Περίπου ${Math.ceil(remaining / 5)} λεπτά ακόμα με την εφαρμογή ανοιχτή${waitS ? `, επόμενη κλήση σε ${waitS}″` : ""}. Αν την κλείσεις, συνεχίζει από εκεί που έμεινε.</div></div>`;
  return `<div id="syncCard"></div>`;
}
setInterval(() => { const el = $("#syncCard"); if (el && Sync.running) el.outerHTML = syncCard(); }, 2000);
async function refreshQuotes() {
  if (!Keys.finnhub || !App.scan) return;
  const list = [...new Set([...App.watch, ...(App.scan.signals || []).slice(0, 12).map((s) => s.ticker), "SPY", "QQQ", "DIA", "IWM"])];
  const q = await quotes(list); Object.assign(App.quotes, q);
}

// ================================================================== ΑΡΧΙΚΗ
routes.home = async () => {
  if (!Keys.massive) { location.hash = "#/welcome"; return; }
  const d = App.scan, m = d?.market || {}, R = REGIME[m.regime] || { tone: "neutral", head: "Η πρώτη ανάλυση ετοιμάζεται", label: "—" };
  const lines = [...(m.pros || []), ...(m.cons || [])].slice(0, 4);
  const nSig = (d?.signals || []).length;
  if (d) lines.push(nSig ? `${nSig} ευκαιρίες πέρασαν όλους τους ελέγχους σήμερα.` : "Καμία ευκαιρία δεν περνά όλους τους ελέγχους σήμερα. Η αναμονή είναι κι αυτή θέση.");
  const hero = `<section class="band hero"><div class="hero-row"><div style="flex:1;min-width:0"><h1>${R.head}</h1></div>${gauge(m.score, R.label, R.tone)}</div>
    <ul style="margin-top:6px">${lines.map((x) => `<li>${esc(x)}</li>`).join("") || `<li>Μόλις κατέβουν οι πρώτες 60 ημέρες, εμφανίζονται εδώ η αγορά και οι ευκαιρίες.</li>`}</ul>
    ${d ? `<div class="small muted" style="margin-top:10px">Ανάλυση ${d.universe} μετοχών, τιμές κλεισίματος ${dday(d.asOf)}</div>` : ""}</section>`;
  const tile = (t, name) => { const x = m.idx?.[t]; const q = App.quotes[t]; const p = q?.price ?? x?.close, c = q?.chg ?? x?.chg;
    return `<a class="tile" href="#/s/${t}"><div class="t-name">${name}</div><div class="t-val num">${fmt(p)}</div><div class="t-chg num ${cls(c)}">${pct(c)}${q ? "" : `<span class="muted" style="font-weight:500"> κλείσιμο</span>`}</div>${spark(x?.spark)}</a>`; };
  const tiles = d ? `<section class="band"><div class="tiles">${tile("SPY", "S&P 500 (SPY)")}${tile("QQQ", "Nasdaq 100 (QQQ)")}${tile("DIA", "Dow Jones (DIA)")}${tile("IWM", "Russell 2000 (IWM)")}</div></section>` : "";
  const opps = d ? band("Οι καλύτερες ευκαιρίες", nSig ? (d.signals.slice(0, 5).map(oppCard).join("")) : emptyBox("Καμία ευκαιρία σήμερα", "Προτείνεται είσοδος μόνο όταν συμφωνούν τάση, όγκος, μοντέλο και ρίσκο."),
    { flush: true, right: nSig > 5 ? `<a href="#/signals" class="small">Όλες (${nSig})</a>` : "" }) : "";
  const mv = d?.model || {}, anyVal = Object.values(mv).some((x) => x.validated);
  const top = anyVal ? d.rows.filter((r) => r.mv?.rank5 && isNum(r.r5)).sort((a, b) => b.r5 - a.r5).slice(0, 8) : [];
  const model = d ? band("Τι βλέπει το μοντέλο", anyVal ? top.map((r) => rowItem(r, "rank")).join("") + `<div class="small muted" style="padding:10px 16px">«Top 2%» = στο καλύτερο 2% όλης της αγοράς για τις επόμενες 5 ημέρες, σε σχέση με τις υπόλοιπες μετοχές. Δεν είναι εγγύηση ανόδου.</div>`
    : `<div style="padding:4px 16px 14px"><div class="note">${Object.values(mv).some((x) => x.ok) ? "Το μοντέλο εκπαιδεύτηκε, αλλά σε δεδομένα που δεν είχε δει δεν απέδειξε ότι προβλέπει. Γι' αυτό δεν επηρεάζει τίποτα. Αυτό είναι προστασία, όχι βλάβη." : esc(mv.rank5?.reason || "Το μοντέλο θα εκπαιδευτεί όταν κατέβει αρκετό ιστορικό.")} <a href="#/model">Λεπτομέρειες</a></div></div>`, { flush: true }) : "";
  const mvTab = store.get("movers", "up");
  const rows = d?.rows || [];
  const movers = d ? band("Κινήσεις ημέρας", `<div style="padding:0 16px 8px">${pills([["up", "Άνοδοι"], ["down", "Πτώσεις"], ["vol", "Ασυνήθιστος όγκος"]], mvTab, "mv")}</div>
    <div data-pane="up" ${mvTab !== "up" ? "hidden" : ""}>${[...rows].filter((r) => isNum(r.ch)).sort((a, b) => b.ch - a.ch).slice(0, 8).map((r) => rowItem(r)).join("")}</div>
    <div data-pane="down" ${mvTab !== "down" ? "hidden" : ""}>${[...rows].filter((r) => isNum(r.ch)).sort((a, b) => a.ch - b.ch).slice(0, 8).map((r) => rowItem(r)).join("")}</div>
    <div data-pane="vol" ${mvTab !== "vol" ? "hidden" : ""}>${[...rows].filter((r) => isNum(r.rv)).sort((a, b) => b.rv - a.rv).slice(0, 8).map((r) => rowItem(r, "rv")).join("")}</div>`, { flush: true }) : "";
  const heat = (v) => (!isNum(v) ? "var(--surface-2)" : `color-mix(in srgb, ${v >= 0 ? "var(--up)" : "var(--down)"} ${(Math.min(1, Math.abs(v) / 6) * 46 + 6).toFixed(0)}%, var(--surface-2))`);
  const sectors = d && (m.sectors || []).length ? band("Κλάδοι", `<div class="heat">${m.sectors.map((s) => `<a href="#/s/${s.etf}" style="background:${heat(s.rel21)}"><div class="h-name">${esc(s.sector)}</div><div class="h-val num">${pct(s.rel21, 1)}</div><div class="h-sub">vs S&P 500, 1 μήνας</div></a>`).join("")}</div>`) : "";
  $("#view").innerHTML = `<div class="stack">${syncCard()}${hero}${tiles}${opps}${model}${movers}${sectors}<div id="mnews"></div></div>`;
  $$("[data-mv]").forEach((b) => b.addEventListener("click", () => { store.set("movers", b.dataset.mv); $$("[data-mv]").forEach((x) => x.classList.toggle("on", x === b)); $$("[data-pane]").forEach((x) => (x.hidden = x.dataset.pane !== b.dataset.mv)); }));
  if (Keys.finnhub) finnhub("/news", { category: "general" }, 30 * 60000).then((n) => {
    const el = $("#mnews"); if (!el || !n?.length) return;
    el.outerHTML = band("Ειδήσεις αγοράς", n.slice(0, 8).map((x) => newsItem({ title: x.headline, url: x.url, source: x.source, ts: x.datetime * 1000 })).join(""), { flush: true });
  });
};

// ================================================================== SCANNER
routes.scan = async () => {
  const d = App.scan;
  if (!d) { $("#view").innerHTML = `<div class="stack">${syncCard()}${band("", emptyBox("Δεν υπάρχει ακόμα ανάλυση", "Χρειάζονται τουλάχιστον 60 ημέρες τιμών. Η πρόοδος φαίνεται στην αρχική."))}</div>`; return; }
  const st = store.get("scanf", { cat: "", sort: "s", q: "" });
  const CATS = [["", "Όλες"], ["model", "Top μοντέλου"], ["breakout", "Breakout"], ["volume", "Ασυνήθιστος όγκος"], ["momentum", "Momentum"], ["reversal", "Πιθανή αντιστροφή"], ["squeeze", "Squeeze"], ["volatile", "Υψηλή μεταβλητότητα"]];
  const SORTS = { s: "Συνολικό score", r5: "Μοντέλο 5 ημερών", r21m: "Μοντέλο 1 μήνα", ch: "Μεταβολή σήμερα", rv: "Ασυνήθιστος όγκος", r21: "Απόδοση μήνα" };
  let list = d.rows.filter((r) => (!st.cat || r.cats.includes(st.cat)) && (!st.q || plain(r.t + " " + r.n).includes(plain(st.q))));
  list.sort((a, b) => (isNum(b[st.sort]) ? b[st.sort] : -1e9) - (isNum(a[st.sort]) ? a[st.sort] : -1e9));
  let shown = 60;
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Scanner</h1><p>${d.universe} μετοχές όλης της αγοράς, κλείσιμο ${dday(d.asOf)}</p></div>
    ${pills(CATS, st.cat, "c")}
    <div class="grid2"><select class="input" id="sortSel" aria-label="Ταξινόμηση">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}" ${k === st.sort ? "selected" : ""}>${v}</option>`).join("")}</select>
      <input class="input" id="qIn" placeholder="Φίλτρο ονόματος" value="${esc(st.q)}" autocomplete="off" autocapitalize="characters"></div>
    ${band(`${list.length} αποτελέσματα`, `<div id="scanList">${list.slice(0, shown).map((r) => rowItem(r, st.sort === "rv" ? "rv" : st.sort.startsWith("r") && st.sort !== "r21" ? "rank" : "chg")).join("") || emptyBox("Τίποτα με αυτά τα φίλτρα")}</div>
      ${list.length > shown ? `<div style="padding:12px 16px"><button class="btn block" id="moreBtn">Δείξε περισσότερες</button></div>` : ""}`, { flush: true })}</div>`;
  const save = () => { store.set("scanf", st); router({ soft: true }); };
  $$("[data-c]").forEach((b) => b.addEventListener("click", () => { st.cat = b.dataset.c; save(); }));
  $("#sortSel").addEventListener("change", (e) => { st.sort = e.target.value; save(); });
  let tmr; $("#qIn").addEventListener("input", (e) => { clearTimeout(tmr); tmr = setTimeout(() => { st.q = e.target.value.trim(); save(); }, 400); });
  $("#moreBtn")?.addEventListener("click", (e) => { shown += 60; $("#scanList").innerHTML = list.slice(0, shown).map((r) => rowItem(r)).join(""); if (shown >= list.length) e.currentTarget.remove(); });
};

// ================================================================== ΕΥΚΑΙΡΙΕΣ
routes.signals = async () => {
  const tab = store.get("sigtab", "active"), d = App.scan;
  const hist = ((await kvGet("sighist")) || []).slice().reverse();
  const closed = hist.filter((h) => h.status !== "open"), wins = closed.filter((h) => (h.ret ?? 0) > 0);
  const avg = closed.length ? closed.reduce((s, h) => s + (h.ret || 0), 0) / closed.length : null;
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Ευκαιρίες</h1><p>Σχέδιο με είσοδο, stop και στόχους. Είναι ανάλυση, όχι εντολή αγοράς.</p></div>
    ${pills([["active", "Σημερινές"], ["hist", "Πώς πήγαν"]], tab, "sg")}
    ${tab === "active" ? band(d ? `${(d.signals || []).length} ευκαιρίες, ${dday(d.asOf)}` : "Ευκαιρίες", (d?.signals || []).map(oppCard).join("") || emptyBox("Καμία ευκαιρία", "Το σύστημα δεν προτείνει είσοδο όταν οι επιβεβαιώσεις ή η σχέση κέρδους/ρίσκου δεν επαρκούν."), { flush: true })
    : `${band("Πραγματικά αποτελέσματα", closed.length ? kv([["Ολοκληρωμένες", closed.length], ["Κερδοφόρες", `${Math.round(wins.length / closed.length * 100)}%`, wins.length / closed.length >= 0.5 ? "up" : "down"], ["Μέση απόδοση", pct(avg), cls(avg)], ["Ανοιχτές", hist.length - closed.length]])
      : `<div class="note">Δεν έχει ολοκληρωθεί ακόμα καμία ευκαιρία. Κάθε πρόταση παρακολουθείται αυτόματα: είσοδος στο επόμενο άνοιγμα, και αν πιαστούν stop και στόχος την ίδια μέρα μετράει το stop.</div>`)}
      ${band("Ιστορικό", hist.slice(0, 80).map((h) => `<a class="row" style="grid-template-columns:minmax(0,1fr) auto" href="#/s/${encodeURIComponent(h.ticker)}"><div><div class="tk">${esc(h.ticker)} <span class="muted small">${esc(HZ[h.horizon] || h.horizon)}</span></div><div class="nm">${esc(h.setup)}, ${dshort(h.date)}</div></div>
        <div class="right">${h.status === "open" ? chip("Ανοιχτή", "accent") : h.status === "target" ? chip("Στόχος ✓", "up") : h.status === "stop" ? chip("Stop", "down") : chip("Έληξε")}<span class="num ${cls(h.ret)}" style="display:block;margin-top:4px">${h.status === "open" ? "" : pct(h.ret)}</span></div></a>`).join("") || emptyBox("Κενό ιστορικό"), { flush: true })}`}
  </div>`;
  $$("[data-sg]").forEach((b) => b.addEventListener("click", () => { store.set("sigtab", b.dataset.sg); router({ soft: true }); }));
};

// ================================================================== WATCHLIST
routes.watch = async () => {
  const d = App.scan, byT = new Map((d?.rows || []).map((r) => [r.t, r]));
  if (Keys.finnhub) { const q = await quotes(App.watch); Object.assign(App.quotes, q); }
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Watchlist</h1><p>${Keys.finnhub ? "Τιμές σε πραγματικό χρόνο από Finnhub." : "Τιμές κλεισίματος. Με κωδικό Finnhub γίνονται ζωντανές."}</p></div>
    <form id="wf" style="display:flex;gap:8px"><input class="input" id="wIn" placeholder="Σύμβολο, π.χ. AEHR" autocapitalize="characters" autocomplete="off"><button class="btn primary">${icon("plus")}</button></form>
    ${band("", App.watch.map((t) => { const r = byT.get(t) || { t, n: App.ref?.[t]?.n || "", sp: [], p: null, ch: null, s: null };
      return `<div style="display:grid;grid-template-columns:1fr 44px;align-items:center">${rowItem(r)}<button class="icon-btn" style="border:0;background:none" data-del="${esc(t)}" aria-label="Αφαίρεση ${esc(t)}">${icon("trash")}</button></div>`; }).join("") || emptyBox("Άδεια watchlist"), { flush: true })}</div>`;
  $("#wf").addEventListener("submit", (e) => { e.preventDefault(); const t = $("#wIn").value.trim().toUpperCase(); if (!t || App.watch.includes(t)) return; App.watch.unshift(t); saveWatch(); router({ soft: true }); });
  $$("[data-del]").forEach((b) => b.addEventListener("click", () => { App.watch = App.watch.filter((x) => x !== b.dataset.del); saveWatch(); router({ soft: true }); }));
};

// ================================================================== ΜΕΤΟΧΗ
const STABS = [["ov", "Επισκόπηση"], ["model", "Πρόβλεψη"], ["setups", "Setups"], ["co", "Εταιρεία"], ["news", "Ειδήσεις"], ["tech", "Τεχνικά"]];
routes.s = async (ticker) => {
  ticker = (ticker || "").toUpperCase();
  const view = $("#view");
  view.innerHTML = `<div class="loading"><span class="spinner"></span><span id="ldMsg">Ανάλυση ${esc(ticker)}…</span></div>`;
  const inLocal = !!App.scan?.rows?.some((r) => r.t === ticker);
  let bars = null;
  if (!inLocal && Keys.massive) {
    const wait = Limiter.nextAt ? Math.round((Limiter.nextAt - Date.now()) / 1000) : 0;
    if (wait > 1 && $("#ldMsg")) $("#ldMsg").textContent = `Κατέβασμα ιστορικού ${ticker} (σειρά στο όριο 5 κλήσεων/λεπτό, ~${wait}″)…`;
    try { bars = await tickerBars(ticker); } catch (e) { if (!App.scan) throw e; }
  }
  const [extras, q] = await Promise.all([companyExtras(ticker).catch(() => ({})), quote(ticker)]);
  if (q) App.quotes[ticker] = q;
  const a = await Engine.call("analyze", { ticker, bars, extras });
  if (App.route !== "s") return;
  if (!a.ok) { view.innerHTML = band("", emptyBox(`Δεν βρέθηκαν δεδομένα για ${esc(ticker)}`, esc(a.reason || ""))); return; }
  a.extras = extras; a.q = q; App.last = a;
  const name = extras?.profile?.name || App.ref?.[ticker]?.n || (await loadRef())[ticker]?.n || "";
  const price = q?.price ?? a.T.m.close, chg = q?.chg ?? a.T.m.chg;
  const inW = App.watch.includes(ticker);
  const tab = STABS.some(([k]) => k === store.get("stab")) ? store.get("stab") : "ov";
  view.innerHTML = `<div class="stack"><section class="band"><div class="stock-head">
      <div class="t1"><div style="min-width:0"><h1>${esc(ticker)}</h1><div class="nm" style="font-size:14px">${esc(name)}</div></div>
        <div><div class="pv num">${money(price)}</div><div class="pc num ${cls(chg)}">${pct(chg)}</div></div></div>
      <div class="chips">${q ? chip("Ζωντανή τιμή", "up") : chip(`Κλείσιμο ${dshort(a.asOf)}`)}${extras?.profile?.finnhubIndustry ? chip(esc(extras.profile.finnhubIndustry)) : ""}${biasChip(a.sc.bias)}</div>
      <div class="grid2"><button class="btn primary" data-ask="${esc(ticker)}">${icon("chat")}Εξήγησέ μου</button><button class="btn" id="wBtn">${icon("star")}${inW ? "Στη watchlist" : "Watchlist"}</button></div></div>
    <div class="tabs" role="tablist">${STABS.map(([k, l]) => `<button type="button" data-st="${k}" class="${k === tab ? "on" : ""}">${l}</button>`).join("")}</div></section><div id="stab" class="stack"></div></div>`;
  const show = (k) => { store.set("stab", k); $$("[data-st]").forEach((b) => b.classList.toggle("on", b.dataset.st === k)); disposeCharts(); $("#stab").innerHTML = STOCK_TABS[k](a, price); if (k === "ov") drawChart(a); };
  $$("[data-st]").forEach((b) => b.addEventListener("click", () => show(b.dataset.st)));
  $("#wBtn").addEventListener("click", () => { if (inW) App.watch = App.watch.filter((x) => x !== ticker); else App.watch.unshift(ticker); saveWatch(); router({ soft: true }); });
  show(tab);
};

function simpleStock(a, price) {
  const m = a.T.m, sc = a.sc, best = a.setups.acc[0], pts = [], risks = [...a.R.warnings.map((w) => w.text)];
  const tone = best ? (best.bias === "bullish" ? "up" : "down") : sc.bias === "bullish" ? "up" : sc.bias === "bearish" ? "down" : "neutral";
  const verdict = best ? (best.bias === "bullish" ? "Υπάρχει ευκαιρία αγοράς" : "Πτωτική ευκαιρία (short)") : sc.bias === "bullish" ? "Θετική εικόνα, χωρίς σήμα εισόδου ακόμα" : sc.bias === "bearish" ? "Αρνητική εικόνα" : "Ουδέτερη εικόνα: καλύτερα αναμονή";
  const headline = best ? `Η ${a.ticker} πέρασε όλους τους ελέγχους για ${HZ[best.horizon]}. Παρακάτω είναι το σχέδιο.` : sc.bias === "bullish" ? `Η ${a.ticker} δείχνει καλά, αλλά δεν υπάρχει καθαρό σημείο εισόδου σήμερα.`
    : sc.bias === "bearish" ? `Η ${a.ticker} δεν δείχνει καλά τώρα. Το σύστημα δεν βλέπει λόγο για αγορά.` : `Η ${a.ticker} δεν δίνει καθαρή εικόνα. Δεν υπάρχει λόγος βιασύνης.`;
  if (isNum(m.ret21) && isNum(m.ret63)) pts.push(m.ret63 > 15 ? `Ανεβαίνει δυνατά τους τελευταίους μήνες (1 μήνας ${pct(m.ret21, 1)}, 3 μήνες ${pct(m.ret63, 1)}).` : m.ret63 < -15 ? `Πέφτει σταθερά τους τελευταίους μήνες (1 μήνας ${pct(m.ret21, 1)}, 3 μήνες ${pct(m.ret63, 1)}).` : `Κινείται χωρίς μεγάλη τάση (1 μήνας ${pct(m.ret21, 1)}, 3 μήνες ${pct(m.ret63, 1)}).`);
  if (a.T.rs && isNum(a.T.rs.excess)) pts.push(a.T.rs.excess > 5 ? `Τα πάει καλύτερα από τη γενική αγορά (${pct(a.T.rs.excess, 0)} διαφορά σε 3 μήνες).` : a.T.rs.excess < -5 ? `Τα πάει χειρότερα από τη γενική αγορά (${pct(a.T.rs.excess, 0)} διαφορά σε 3 μήνες).` : "Κινείται περίπου όσο και η γενική αγορά.");
  if (isNum(m.atrPct)) pts.push(m.atrPct > 5 ? `Είναι νευρική μετοχή: κινείται κατά μέσο όρο ±${m.atrPct.toFixed(1)}% τη μέρα.` : `Κινείται κατά μέσο όρο ±${m.atrPct.toFixed(1)}% τη μέρα.`);
  if (a.T.flags.includes("near_52w_high")) pts.push("Είναι κοντά στο υψηλότερο σημείο της χρονιάς."); if (a.T.flags.includes("near_52w_low")) pts.push("Είναι κοντά στο χαμηλότερο σημείο της χρονιάς.");
  if (a.T.flags.includes("unusual_volume")) pts.push(`Σήμερα έγιναν πολύ περισσότερες συναλλαγές από το συνηθισμένο (${fmt(m.rvol, 1)}×).`);
  if (a.fund?.pros?.length) pts.push(...a.fund.pros.slice(0, 1)); if (a.fund?.cons?.length) pts.push(...a.fund.cons.slice(0, 1));
  const model = [];
  for (const p of Object.values(a.pred || {})) {
    if (!isNum(p.rank)) continue;
    if (!p.validated) continue;
    const where = p.rank >= 0.5 ? `στο καλύτερο ${Math.max(1, Math.round((1 - p.rank) * 100))}%` : `στο χειρότερο ${Math.max(1, Math.round(p.rank * 100))}%`;
    model.push(`Μοντέλο (${p.days} ημ.): ${where} όλης της αγοράς.${isNum(p.exp) ? ` Ιστορικά τέτοιες μετοχές πήγαν ${pct(p.exp * 100, 2)} σε σχέση με την αγορά.` : ""}`);
  }
  if (!model.length && Object.keys(a.pred || {}).length) model.push("Το μοντέλο δεν έχει αποδείξει ακόμα ότι προβλέπει, οπότε δεν το λαμβάνουμε υπόψη.");
  let plan = null;
  if (best) plan = { title: `Σχέδιο: ${HZ[best.horizon]} (${best.holding})`, lines: [`Είσοδος κοντά στα ${fmt(best.entryLow)}–${fmt(best.entryHigh)}, όχι κυνηγώντας την τιμή αν ανοίξει πολύ ψηλότερα.`,
    `Stop στα ${fmt(best.stop)}: αν πάει εκεί, βγαίνεις με απώλεια περίπου ${fmt(best.stopPct, 1)}%.`, `Στόχοι: ${fmt(best.tp1)}, μετά ${fmt(best.tp2)} και ${fmt(best.tp3)}. Στον πρώτο στόχο το stop πάει στην τιμή εισόδου.`] };
  if (isNum(a.fund?.daysToEarnings) && a.fund.daysToEarnings <= 14) risks.unshift(`Ανακοινώνει αποτελέσματα σε ${a.fund.daysToEarnings} μέρες (${dshort(a.fund.earningsDate)}): η τιμή μπορεί να κινηθεί απότομα.`);
  for (const c of (best?.conf?.conflicts || [])) risks.push(c);
  return { tone, verdict, headline, pts, model, plan, risks: [...new Set(risks)].slice(0, 5) };
}

function setupCard(a, s, rej) {
  return `<div class="setup ${rej ? "rejected" : ""}"><div class="chips">${chip(esc(HZ[s.horizon]), "accent")}${biasChip(s.bias)}${rej ? chip("Δεν προτείνεται", "warn") : chip(`Περνά τους ελέγχους: ${esc(s.confidence)}`, "up")}</div>
    <b>${esc(s.setup)}</b>${ladder(s, a.q?.price ?? a.T.m.close)}
    ${kv([["Ζώνη εισόδου", `${fmt(s.entryLow)}–${fmt(s.entryHigh)}`], ["Stop", `${fmt(s.stop)} (${fmt(s.stopPct, 1)}%)`, "down"], ["Στόχος 1 / 2", `${fmt(s.tp1)} / ${fmt(s.tp2)}`, "up"], ["Στόχος 3", fmt(s.tp3), "up"], ["Κέρδος / ρίσκο", fmt(s.rr, 2)], ["Διάρκεια", esc(s.holding)]])}
    <div class="chips">${(s.reasons || []).map((x) => chip(esc(x))).join("")}</div>
    ${(s.conf?.supporting || []).length || (s.conf?.opposing || []).length ? `<div class="small soft">Υπέρ: ${(s.conf.supporting || []).map((k) => LBL[k]).join(", ") || "—"}. Κατά: ${(s.conf.opposing || []).map((k) => LBL[k]).join(", ") || "—"}.</div>` : ""}
    ${rej ? `<ul class="list risks">${s.rejected.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}</div>`;
}
const LBL = { ml: "Μοντέλο", trend: "Τάση", momentum: "Momentum", volume: "Όγκος", relative: "Σχετική δύναμη", fundamentals: "Θεμελιώδη", news: "Ειδήσεις", sector: "Κλάδος", market: "Αγορά" };

const STOCK_TABS = {
  ov(a, price) {
    const s = simpleStock(a, price), best = a.setups.acc[0];
    return `${band("", `<div class="verdict t-${s.tone}"><div><h3>${esc(s.verdict)}</h3><p class="vh">${esc(s.headline)}</p><ul>${s.pts.map((x) => `<li>${esc(x)}</li>`).join("")}${s.model.map((x) => `<li><b>${esc(x)}</b></li>`).join("")}</ul>
      ${s.plan ? `<div class="plan"><b>${esc(s.plan.title)}</b><ul>${s.plan.lines.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${s.risks.length ? `<div class="warn-box"><b>Προσοχή</b><ul>${s.risks.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}</div></div>`)}
    ${band("Γράφημα", `<div class="pills" id="tb" style="margin-bottom:10px"></div><div class="chart-box"><div class="chart-legend" id="lg"></div><div class="chart-main" id="cMain"></div><div class="chart-sub" id="cRsi"></div></div>`, { sub: `Ημερήσιες τιμές έως ${dday(a.asOf)}` })}
    ${best ? band("Σχέδιο συναλλαγής", vladder(best, price), { sub: `${esc(HZ[best.horizon])}: ${esc(best.setup)}` }) : ""}
    ${band("Βαθμολογία", `<div style="display:flex;gap:14px;align-items:center;margin-bottom:8px">${ring(a.sc.score, "lg")}<div class="small soft">0 = πολύ αρνητικό, 100 = πολύ θετικό. Δεν είναι πιθανότητα. Κάλυψη δεδομένων ${Math.round(a.sc.coverage * 100)}%.</div></div>
      ${a.sc.contrib.map((c) => `<div class="meter"><span>${esc(c.label)}</span><div class="bar"><i style="width:${clamp(c.score ?? 0)}%;background:${c.score >= 60 ? "var(--up)" : c.score <= 40 ? "var(--down)" : "var(--accent)"}"></i></div><b class="num">${isNum(c.score) ? c.score.toFixed(0) : "—"}</b></div>`).join("")}`)}`;
  },
  model(a) {
    const ps = Object.values(a.pred || {});
    if (!ps.length) return band("Πρόβλεψη", emptyBox("Το μοντέλο δεν έχει εκπαιδευτεί ακόμα", "Εκπαιδεύεται στο τηλέφωνο όταν κατέβουν τουλάχιστον 300 ημέρες ιστορικού."));
    return ps.map((p) => band(esc(p.label), `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="num ${p.validated ? (p.rank >= 0.8 ? "up" : p.rank <= 0.2 ? "down" : "") : "muted"}" style="font-size:30px;font-weight:760">${topPct(p.rank)}</div>
        <div class="small soft" style="flex:1;min-width:150px">της αγοράς για τις επόμενες ${p.days} ημέρες, σε σχέση με τις υπόλοιπες μετοχές</div></div>
      <div style="margin:10px 0">${p.validated ? chip("Επικυρωμένο σε άγνωστα δεδομένα", "up") : chip("Μη επικυρωμένο, μόνο ενδεικτικό", "warn")}</div>
      ${isNum(p.exp) ? `<div class="soft small">Ιστορικά, μετοχές σε αυτή τη θέση πήγαν <b class="${cls(p.exp)}">${pct(p.exp * 100, 2)}</b> σε σχέση με τον μέσο όρο της αγοράς.</div>` : ""}
      ${p.drivers?.length ? `<div class="small muted" style="margin:12px 0 6px">Τι σπρώχνει την πρόβλεψη πάνω (πράσινο) ή κάτω (κόκκινο)</div>${p.drivers.map((x) => `<div class="driver"><span>${esc(x.label)}</span><div class="dbar"><i style="${x.effect >= 0 ? "left:50%" : "right:50%"};width:${Math.min(50, Math.abs(x.effect) * 250).toFixed(1)}%;background:${x.effect >= 0 ? "var(--up)" : "var(--down)"}"></i></div><span class="num muted" style="text-align:right">${fmt(x.value, 2)}</span></div>`).join("")}` : ""}`)).join("")
      + `<div class="note">Το μοντέλο τρέχει μέσα στο τηλέφωνο. Χρησιμοποιείται στη βαθμολογία και στις ευκαιρίες μόνο αν πέρασε τον έλεγχο σε δεδομένα που δεν είχε δει. <a href="#/model">Πώς ελέγχθηκε</a></div>`;
  },
  setups(a) {
    const all = [...a.setups.acc.map((s) => setupCard(a, s, false)), ...a.setups.rej.map((s) => setupCard(a, s, true))];
    return band("Όλα τα setups που εξετάστηκαν", all.length ? `<div class="stack" style="gap:12px">${all.join("")}</div>` : emptyBox("Κανένα setup σήμερα", "Όταν δεν υπάρχει καθαρή εικόνα, το σύστημα δεν προτείνει τίποτα."));
  },
  co(a) {
    const m = a.extras?.metric || {}, p = a.extras?.profile || {};
    if (!a.extras?.metric && !p.name) return band("Εταιρεία", `<div class="note">${Keys.finnhub ? "Δεν βρέθηκαν θεμελιώδη για αυτή τη μετοχή." : "Τα θεμελιώδη έρχονται από το Finnhub. Βάλε δωρεάν κωδικό Finnhub στις Ρυθμίσεις."}</div>`);
    return `${band("Θεμελιώδη", kv([["Κεφαλαιοποίηση", isNum(p.marketCapitalization) ? "$" + big(p.marketCapitalization * 1e6) : "—"], ["P/E", fmt(m.peTTM, 1)], ["Έσοδα σε 1 χρόνο", pct(m.revenueGrowthTTMYoy, 1), cls(m.revenueGrowthTTMYoy)],
      ["Κέρδη ανά μετοχή σε 1 χρόνο", pct(m.epsGrowthTTMYoy, 1), cls(m.epsGrowthTTMYoy)], ["Καθαρό περιθώριο", pct(m.netProfitMarginTTM, 1)], ["ROE", pct(m.roeTTM, 1)], ["Χρέος / ίδια κεφάλαια", fmt(m["totalDebt/totalEquityQuarterly"], 2)],
      ["Beta", fmt(m.beta, 2)], ["Υψηλό / χαμηλό 52 εβδ.", `${fmt(m["52WeekHigh"])} / ${fmt(m["52WeekLow"])}`], ["Επόμενα αποτελέσματα", a.fund?.earningsDate ? `${dshort(a.fund.earningsDate)} (σε ${a.fund.daysToEarnings} ημ.)` : "—"]])
      + (a.fund ? `<div class="small muted" style="margin-top:10px">Βαθμολογία θεμελιωδών ${isNum(a.fund.score) ? a.fund.score.toFixed(0) : "—"}/100, κάλυψη ${Math.round((a.fund.coverage || 0) * 100)}%.</div>` : ""), { sub: esc(p.name || "") })}
      ${p.description ? band("Τι κάνει η εταιρεία", `<p class="soft" style="margin:0">${esc(p.description)}</p>`) : ""}${p.weburl ? `<a class="btn ghost" href="${esc(p.weburl)}" target="_blank" rel="noopener">Ιστοσελίδα εταιρείας</a>` : ""}`;
  },
  news(a) {
    const n = a.news;
    return band("Ειδήσεις", n?.items?.length ? n.items.map(newsItem).join("") : emptyBox("Καμία πρόσφατη είδηση"), { flush: true, sub: n?.n ? `Βαθμολογία ειδήσεων ${n.score?.toFixed(0)}/100 (εκτίμηση από λέξεις-κλειδιά, τελευταίες 14 ημέρες)` : "" });
  },
  tech(a) {
    const m = a.T.m;
    return `${band("Δείκτες", kv([["RSI 14", fmt(m.rsi, 1)], ["ADX", fmt(m.adx, 1)], ["MACD / σήμα", `${fmt(m.macd, 3)} / ${fmt(m.macdSig, 3)}`], ["Stoch RSI", `${fmt(m.stK, 0)} / ${fmt(m.stD, 0)}`],
      ["EMA 20 / 50", `${fmt(m.ema20)} / ${fmt(m.ema50)}`], ["ΚΜΟ 50 / 200", `${fmt(m.sma50)} / ${fmt(m.sma200)}`], ["Bollinger", `${fmt(m.bbLo)}–${fmt(m.bbUp)}`], ["VWAP 20 ημ.", fmt(m.vwap20)],
      ["ATR", `${fmt(m.atr)} (${fmt(m.atrPct, 1)}%)`], ["Όγκος vs μέσο", fmt(m.rvol, 2) + "×"], ["Τζίρος/ημέρα", "$" + big(m.dv20)], ["Υψηλό / χαμηλό έτους", `${fmt(m.hi52)} / ${fmt(m.lo52)}`]])
      + `<div class="chips" style="margin-top:12px">${a.T.flags.map((f) => chip(esc(f))).join("")}</div>`)}
      ${band("Στηρίξεις και αντιστάσεις", a.sr.length ? a.sr.slice().reverse().map((l) => `<div class="meter" style="grid-template-columns:1fr auto auto"><span>${l.type === "support" ? chip("Στήριξη", "up") : chip("Αντίσταση", "down")}</span><b class="num">${fmt(l.price)}</b><span class="muted small">${l.touches}×</span></div>`).join("") : emptyBox("Δεν βρέθηκαν καθαρά επίπεδα"))}
      ${a.vp ? `<div class="note">Τιμή με τον περισσότερο όγκο τους τελευταίους 6 μήνες: ${fmt(a.vp.poc)} (ζώνη ${fmt(a.vp.vaLow)}–${fmt(a.vp.vaHigh)}).</div>` : ""}
      ${a.T.pros.length || a.T.cons.length ? band("Υπέρ και κατά", `<ul class="list pros">${a.T.pros.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><ul class="list cons">${a.T.cons.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`) : ""}`;
  },
};

// ================================================================== γράφημα
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const alpha = (hex, a) => { const h = hex.replace("#", ""); if (h.length !== 6) return hex; const n = parseInt(h, 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
let _charts = [];
function disposeCharts() { _charts.forEach(({ c, ro }) => { try { ro.disconnect(); c.remove(); } catch { /* */ } }); _charts = []; }
function mkChart(el, h, extra = {}) {
  const c = LightweightCharts.createChart(el, { width: el.clientWidth || 360, height: h, layout: { background: { type: "solid", color: css("--surface") }, textColor: css("--text-2"), fontFamily: "Commissioner, -apple-system, sans-serif", fontSize: 11 },
    grid: { vertLines: { color: alpha(css("--line"), 0.5) }, horzLines: { color: alpha(css("--line"), 0.5) } }, rightPriceScale: { borderColor: css("--line") }, timeScale: { borderColor: css("--line") }, crosshair: { mode: 0 }, ...extra });
  const ro = new ResizeObserver(() => { if (el.clientWidth) c.applyOptions({ width: el.clientWidth }); }); ro.observe(el); _charts.push({ c, ro }); return c;
}
function drawChart(a) {
  const ch = a.chart, main = $("#cMain");
  if (!window.LightweightCharts) { main.innerHTML = emptyBox("Το γράφημα θέλει σύνδεση την πρώτη φορά"); return; }
  const opts = store.get("ind", { ema: true, bb: false, lv: true });
  $("#tb").innerHTML = [["ema", "EMA 20/50/200"], ["bb", "Bollinger"], ["lv", "Στηρίξεις"]].map(([k, l]) => `<button type="button" class="${opts[k] ? "on" : ""}" data-ind="${k}">${l}</button>`).join("");
  $$("[data-ind]").forEach((b) => b.addEventListener("click", () => { opts[b.dataset.ind] = !opts[b.dataset.ind]; store.set("ind", opts); disposeCharts(); drawChart(a); }));
  main.innerHTML = ""; $("#cRsi").innerHTML = "";
  const up = css("--up"), dn = css("--down"), acc = css("--accent"), sod = css("--sodium");
  const c = mkChart(main, main.clientHeight || 340);
  const cs = c.addCandlestickSeries({ upColor: up, downColor: dn, wickUpColor: up, wickDownColor: dn, borderVisible: false }); cs.setData(ch.candles);
  const vs = c.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false });
  c.priceScale("vol").applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
  vs.setData(ch.volume.map((v) => ({ time: v.time, value: v.value, color: alpha(v.up ? up : dn, 0.35) })));
  const line = (d, col, w = 1, st = 0) => { if (!d?.length) return; c.addLineSeries({ color: col, lineWidth: w, lineStyle: st, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }).setData(d); };
  const leg = [];
  if (opts.ema) { line(ch.ema20, acc); line(ch.ema50, sod, 2); line(ch.ema200, "#f472b6", 2); leg.push(["EMA20", acc], ["EMA50", sod], ["EMA200", "#f472b6"]); }
  if (opts.bb) { line(ch.bbUp, "#64748b", 1, 1); line(ch.bbLo, "#64748b", 1, 1); leg.push(["Bollinger", "#64748b"]); }
  if (opts.lv) { a.sr.forEach((l) => cs.createPriceLine({ price: l.price, color: alpha(l.type === "support" ? up : dn, 0.55), lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" })); }
  const best = a.setups.acc[0];
  if (best) { cs.createPriceLine({ price: best.stop, color: dn, lineWidth: 2, title: "Stop" }); cs.createPriceLine({ price: best.tp2, color: up, lineWidth: 2, title: "Στόχος" }); }
  c.timeScale().setVisibleLogicalRange({ from: ch.candles.length - 120, to: ch.candles.length + 2 });
  $("#lg").innerHTML = leg.map(([l, col]) => `<span style="color:${col}">${l}</span>`).join("");
  const r = mkChart($("#cRsi"), 100, { timeScale: { visible: false } });
  const rs = r.addLineSeries({ color: acc, lineWidth: 1, priceLineVisible: false }); rs.setData(ch.rsi);
  rs.createPriceLine({ price: 70, color: alpha(dn, 0.7), lineStyle: 2, lineWidth: 1, title: "RSI 70" }); rs.createPriceLine({ price: 30, color: alpha(up, 0.7), lineStyle: 2, lineWidth: 1, title: "30" });
  [c, r].forEach((x) => x.timeScale().subscribeVisibleLogicalRangeChange((rg) => { if (rg) [c, r].forEach((y) => y !== x && y.timeScale().setVisibleLogicalRange(rg)); }));
}

// ================================================================== ΠΕΡΙΣΣΟΤΕΡΑ
routes.more = async () => {
  const item = (href, ic, t, sub) => `<a class="row" style="grid-template-columns:28px 1fr" href="${href}">${icon(ic)}<div><div style="font-weight:650">${t}</div><div class="nm">${sub}</div></div></a>`;
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Περισσότερα</h1></div>${band("", item("#/model", "model", "Μοντέλο πρόβλεψης", "Πώς ελέγχθηκε και αν επικυρώθηκε") + item("#/data", "data", "Δεδομένα", "Συγχρονισμός, χώρος, νέα ανάλυση")
    + item("#/settings", "key", "Ρυθμίσεις και κωδικοί", "Massive, Finnhub, AI") + item("#/guide", "info", "Οδηγός", "Κωδικοί, εγκατάσταση στο iPhone"), { flush: true })}
    <div class="note">US Alpha Mobile: ανάλυση και προτάσεις, όχι επενδυτική συμβουλή. Καμία αυτόματη εντολή. Όλα τρέχουν μέσα στο τηλέφωνό σου.</div></div>`;
};
function decileBars(dec) {
  if (!dec?.length) return "";
  const vals = dec.map((x) => (x.avg ?? 0) * 100), mx = Math.max(...vals.map(Math.abs), 1e-9), W = 360, H = 170, mid = 76, top = 12, bw = W / dec.length;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Απόδοση ανά δεκατημόριο πρόβλεψης"><line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="var(--line-2)"/>
    ${dec.map((x, i) => { const v = vals[i], h = (Math.abs(v) / mx) * (mid - top), y = v >= 0 ? mid - h : mid;
      return `<rect x="${(i * bw + 5).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 10).toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="3" fill="${v >= 0 ? "var(--up)" : "var(--down)"}" opacity="${x.decile === 10 ? 1 : 0.65}"/><text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 22}" fill="var(--muted)" font-size="11" text-anchor="middle">${x.decile}</text>`; }).join("")}
    <text x="0" y="${H - 4}" fill="var(--muted)" font-size="11">χειρότερες προβλέψεις</text><text x="${W}" y="${H - 4}" fill="var(--muted)" font-size="11" text-anchor="end">καλύτερες</text></svg>`;
}
routes.model = async () => {
  const d = App.scan, M = d?.model || {};
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Μοντέλο πρόβλεψης</h1><p>Εκπαιδεύεται και ελέγχεται μέσα στο τηλέφωνο.</p></div>
    <div class="note"><b>Τι κάνει.</b> Κατατάσσει όλη την αγορά: ποιες μετοχές θα πάνε καλύτερα από τις υπόλοιπες τις επόμενες 5 ή 21 ημέρες. Κοιτάζει ${24} στοιχεία ανά μετοχή (αποδόσεις, μεταβλητότητα, όγκους, θέση στο εύρος της χρονιάς, σύγκριση με το S&P 500 κ.ά.).<br><br>
    <b>Πώς ελέγχεται.</b> Μαθαίνει μόνο από το παρελθόν και δοκιμάζεται στον επόμενο μήνα που δεν έχει δει, ξανά και ξανά μέχρι σήμερα. Χρησιμοποιείται <b>μόνο</b> αν περάσει όλα τα κριτήρια.</div>
    ${d ? `<section class="band"><div class="tiles"><div class="tile"><div class="t-name">Ημέρες ιστορικού</div><div class="t-val num">${d.days}</div><div class="t-chg muted">${dday(d.firstDate)} έως ${dday(d.asOf)}</div></div>
      <div class="tile"><div class="t-name">Μετοχές</div><div class="t-val num">${d.universe}</div><div class="t-chg muted">όλη η αγορά</div></div>
      <div class="tile"><div class="t-name">Στοιχεία ανάλυσης</div><div class="t-val num">${big(d.stats?.values)}</div><div class="t-chg muted">σε ${d.stats?.seconds} δευτ.</div></div>
      <div class="tile"><div class="t-name">Ταχύτητα (μετρημένη)</div><div class="t-val num">${isNum(d.stats?.perSec) ? (d.stats.perSec / 1e6).toFixed(1) + " εκ./δ" : "—"}</div><div class="t-chg muted">στο τηλέφωνό σου</div></div></div></section>` : ""}
    ${Object.entries(M).map(([k, m]) => band(k === "rank5" ? "Κατάταξη 5 ημερών" : "Κατάταξη 1 μήνα", !m.ok ? `<div class="note">${esc(m.reason || "Δεν έχει εκπαιδευτεί")}</div>`
      : `<ul class="list">${m.gate.map((g) => `<li><b class="${g.pass ? "up" : "down"}">${g.pass ? "✓" : "✗"}</b><span>${esc(g.text)}</span></li>`).join("")}</ul>
        <div style="margin:12px 0">${kv([["Συσχέτιση (IC)", `${fmt(m.icMean, 3)} (t = ${m.icT ?? "—"})`], ["Μέρες με θετική συσχέτιση", ratioPct(m.icPos, 0)], ["Top 10% vs αγορά", pct((m.top ?? NaN) * 100, 2), cls(m.top)], ["Top μείον bottom 10%", pct((m.longShort ?? NaN) * 100, 2), cls(m.longShort)]])}</div>
        <div class="small muted" style="margin-bottom:6px">Υπεραπόδοση ανά δεκατημόριο πρόβλεψης, σε δεδομένα που δεν είχε δει</div>${decileBars(m.deciles)}
        <details style="margin-top:10px"><summary>Κάθε περίοδος ελέγχου (${m.folds.length})</summary>${m.folds.map((f) => `<div class="meter" style="grid-template-columns:1fr auto auto"><span class="small">${dshort(f.test[0])}–${dshort(f.test[1])}</span><span class="num small ${cls(f.ic)}">IC ${fmt(f.ic, 3)}</span><span class="num small ${cls(f.top)}">${pct(f.top * 100, 2)}</span></div>`).join("")}</details>`,
    { right: m.ok ? (m.validated ? chip("Επικυρωμένο", "up") : chip("Δεν επικυρώθηκε", "warn")) : "", sub: m.ok ? `Εκπαιδεύτηκε ${dt(m.trainedAt)}` : "" })).join("") || band("", emptyBox("Δεν υπάρχει ακόμα μοντέλο"))}
    <button class="btn block" id="retrain" ${_scanning ? "disabled" : ""}>${icon("refresh")}Νέα εκπαίδευση τώρα</button></div>`;
  $("#retrain").addEventListener("click", () => { toast("Η εκπαίδευση ξεκίνησε στο τηλέφωνο"); router(); runScan(true); });
};
routes.data = async () => {
  const c = await dayCount(); let est = null; try { est = await navigator.storage?.estimate?.(); } catch { /* */ }
  const persisted = await navigator.storage?.persisted?.().catch(() => null);
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Δεδομένα</h1><p>Όλα αποθηκεύονται μόνο στο τηλέφωνο.</p></div>${syncCard()}
    ${band("Ιστορικό αγοράς", kv([["Ημέρες με τιμές", c.data], ["Από", dday(c.first)], ["Έως", dday(c.last)], ["Στόχος", `${Settings.years} ${Settings.years === 1 ? "χρόνος" : "χρόνια"}`],
      ["Χώρος που χρησιμοποιείται", est ? big(est.usage) + "B" : "—"], ["Μόνιμη αποθήκευση", persisted ? "Ναι" : "Όχι (εγκατάστησέ την στην αρχική οθόνη)"], ["Τελευταίος συγχρονισμός", ago(Sync.st.lastAt)], ["Τελευταία ανάλυση", App.scan ? dt(App.scan.builtAt) : "—"]]))}
    <div class="grid2"><button class="btn primary" id="syncBtn">${icon(Sync.running ? "stop" : "refresh")}${Sync.running ? "Διακοπή" : "Συγχρονισμός"}</button><button class="btn" id="scanBtn" ${_scanning ? "disabled" : ""}>${icon("play")}Νέα ανάλυση</button></div>
    ${band("Διαγραφή", `<p class="small soft" style="margin-top:0">Σβήνει όλες τις τιμές και τα αποτελέσματα από το τηλέφωνο. Οι κωδικοί και η watchlist μένουν.</p><button class="btn danger block" id="wipeBtn">${icon("trash")}Διαγραφή δεδομένων</button>`)}</div>`;
  $("#syncBtn").addEventListener("click", () => { if (Sync.running) Sync.stop(); else startSync(); setTimeout(() => router({ soft: true }), 400); });
  $("#scanBtn").addEventListener("click", () => { runScan(); setTimeout(() => router({ soft: true }), 300); });
  let armed = false;
  $("#wipeBtn").addEventListener("click", async (e) => { if (!armed) { armed = true; e.currentTarget.textContent = "Πάτα ξανά για επιβεβαίωση"; return; }
    Sync.stop(); await wipeAll(); App.scan = null; await Engine.call("invalidate"); toast("Τα δεδομένα διαγράφηκαν"); router(); });
};
routes.settings = async () => {
  const keyField = (k, label, help, ph) => `<label class="field"><span><b>${label}</b> ${Keys[k] ? chip(`Ορισμένο ${esc(Keys.mask(Keys[k]))}`, "up") : chip("Κενό")}</span>
    <span style="display:flex;gap:8px"><input class="input" type="password" name="${k}" placeholder="${Keys[k] ? "Νέος κωδικός για αλλαγή" : ph}" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="btn" data-test="${k}">Δοκιμή</button></span><span class="small muted">${help}</span></label>`;
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Ρυθμίσεις</h1><p>Οι κωδικοί μένουν μόνο σε αυτό το τηλέφωνο.</p></div>
    ${band("Κωδικοί πηγών", `<form id="kf" class="form">${keyField("massive", "Massive (απαραίτητο)", "Όλη η αγορά ΗΠΑ. Δωρεάν στο massive.com.", "Επικόλληση κωδικού")}
      ${keyField("finnhub", "Finnhub (προτείνεται)", "Ζωντανές τιμές, ειδήσεις, θεμελιώδη. Δωρεάν στο finnhub.io.", "Επικόλληση κωδικού")}
      ${keyField("gemini", "Google Gemini (προαιρετικό)", "Για συζήτηση με τον βοηθό. Δωρεάν στο aistudio.google.com.", "Επικόλληση κωδικού")}
      ${keyField("claude", "Claude (προαιρετικό)", "Εναλλακτικά του Gemini, από console.anthropic.com.", "Επικόλληση κωδικού")}
      <button class="btn primary block">Αποθήκευση</button></form>`)}
    ${band("Ιστορικό", `<label class="field">Πόσο πίσω να κατεβάσει<select class="input" id="yrs"><option value="1" ${Settings.years === 1 ? "selected" : ""}>1 χρόνο (≈50 λεπτά την πρώτη φορά)</option><option value="2" ${Settings.years === 2 ? "selected" : ""}>2 χρόνια, το μέγιστο δωρεάν (≈100 λεπτά, καλύτερο μοντέλο)</option></select></label>`)}
    ${band("Εμφάνιση", `<button class="btn block" id="themeBtn2">${icon("theme")}Φωτεινό / σκούρο θέμα</button>`)}</div>`;
  $("#kf").addEventListener("submit", (e) => { e.preventDefault(); let n = 0; new FormData(e.target).forEach((v, k) => { if (v.trim()) { Keys.set(k, v); n++; } }); if (!n) return toast("Δεν γράφτηκε κανένας κωδικός");
    toast("Αποθηκεύτηκε"); store.set("ai.geminiModel", ""); startSync(); router({ soft: true }); });
  $$("[data-test]").forEach((b) => b.addEventListener("click", async () => {
    const k = b.dataset.test, inp = $(`input[name=${k}]`); if (inp.value.trim()) Keys.set(k, inp.value);
    b.disabled = true; b.textContent = "…";
    try {
      if (k === "massive") { await massive("/v3/reference/tickers", { limit: 1 }, 20); toast("Massive: λειτουργεί"); }
      else if (k === "finnhub") { const q = await finnhub("/quote", { symbol: "AAPL" }); toast(q?.c ? `Finnhub: λειτουργεί (AAPL ${fmt(q.c)})` : esc(FH.error || "Finnhub: δεν απάντησε"), q?.c ? "info" : "high"); }
      else { const r = k === "gemini" ? await AI.gemini("Απάντα σύντομα.", "Γράψε μόνο: ΟΚ") : await AI.claude("Απάντα σύντομα.", "Γράψε μόνο: ΟΚ"); toast(`${k === "gemini" ? "Gemini" : "Claude"}: ${esc(r.slice(0, 40))}`); }
    } catch (e) { toast(esc(e.message), "high"); }
    b.disabled = false; b.textContent = "Δοκιμή";
  }));
  $("#yrs").addEventListener("change", (e) => { Settings.years = +e.target.value; toast("Αποθηκεύτηκε"); startSync(); });
  $("#themeBtn2").addEventListener("click", toggleTheme);
};
const isStandalone = () => window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function installSteps() {
  return `<ol class="steps"><li><div>Άνοιξε αυτή τη σελίδα στο <b>Safari</b> του iPhone.</div></li><li><div>Πάτα το κουμπί <b>Κοινοποίηση</b> ${icon("share")} κάτω στη μέση.</div></li><li><div>Διάλεξε <b>«Προσθήκη στην οικ. οθόνη»</b> και μετά «Προσθήκη».</div></li><li><div>Άνοιξε την εφαρμογή από το εικονίδιο <b>US Alpha</b> στην αρχική οθόνη και βάλε εκεί τους κωδικούς.</div></li></ol>
    <div class="small muted" style="margin-top:10px">Η εφαρμογή στην αρχική οθόνη έχει δική της μνήμη, χωριστή από το Safari. Γι' αυτό οι κωδικοί μπαίνουν αφού την εγκαταστήσεις.</div>`;
}
function keySteps() {
  return `<ol class="steps"><li><div><b>Massive (απαραίτητο, δωρεάν):</b> μπες στο <a href="https://massive.com" target="_blank" rel="noopener">massive.com</a> → Sign up → στο Dashboard διάλεξε <b>API Keys</b> και αντίγραψε τον κωδικό.</div></li>
    <li><div><b>Finnhub (προτείνεται, δωρεάν):</b> <a href="https://finnhub.io/register" target="_blank" rel="noopener">finnhub.io/register</a> → μετά την εγγραφή ο κωδικός φαίνεται στο Dashboard.</div></li>
    <li><div><b>Gemini (προαιρετικό):</b> <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> → «Create API key».</div></li><li><div>Επικόλλησε τους κωδικούς παρακάτω και πάτα «Ξεκίνα».</div></li></ol>`;
}
routes.guide = async () => {
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Οδηγός</h1></div>${band("Εγκατάσταση στο iPhone", installSteps())}${band("Δωρεάν κωδικοί", keySteps())}
    ${band("Τι να περιμένεις", `<ul class="list"><li>Το πρώτο κατέβασμα όλης της αγοράς θέλει περίπου 1–2 ώρες με την εφαρμογή ανοιχτή (όριο 5 κλήσεων το λεπτό στο δωρεάν Massive). Αν την κλείσεις, συνεχίζει από εκεί που έμεινε.</li>
      <li>Μετά από 60 ημέρες ιστορικού εμφανίζονται scanner και ευκαιρίες. Το μοντέλο εκπαιδεύεται όταν φτάσει τις 300 ημέρες.</li><li>Κάθε μέρα μετά το κλείσιμο της αμερικανικής αγοράς χρειάζεται μόνο μία κλήση για όλη την αγορά.</li>
      <li>Το iPhone δεν αφήνει την εφαρμογή να δουλεύει κλειστή. Ενημερώνεται όταν την ανοίγεις.</li></ul>`)}</div>`;
};
routes.welcome = async () => {
  $("#view").innerHTML = `<div class="stack"><section class="band hero"><h1>Καλώς ήρθες στο US Alpha Mobile</h1><ul><li>Ανάλυση όλης της αμερικανικής αγοράς μέσα στο τηλέφωνό σου, χωρίς server.</li><li>Ευκαιρίες με είσοδο, stop και στόχους, εξηγημένες απλά.</li><li>Μοντέλο πρόβλεψης που ελέγχεται τίμια σε δεδομένα που δεν έχει δει.</li></ul></section>
    ${isIOS() && !isStandalone() ? band("Πρώτα: βάλ' την στην αρχική οθόνη", installSteps()) : ""}
    ${band("Δωρεάν κωδικοί", keySteps() + `<form id="wk" class="form" style="margin-top:14px"><label class="field"><b>Κωδικός Massive</b><input class="input" name="massive" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Επικόλληση"></label>
      <label class="field"><b>Κωδικός Finnhub</b> (προαιρετικό)<input class="input" name="finnhub" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Επικόλληση"></label>
      <label class="field"><b>Κωδικός Gemini</b> (προαιρετικό)<input class="input" name="gemini" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Επικόλληση"></label>
      <button class="btn primary block">${icon("play")}Ξεκίνα</button></form>`)}
    <div class="note">Οι κωδικοί αποθηκεύονται μόνο σε αυτό το τηλέφωνο και χρησιμοποιούνται μόνο για να ζητηθούν δεδομένα από τις αντίστοιχες υπηρεσίες.</div></div>`;
  $("#wk").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const btn = e.target.querySelector("button"); btn.disabled = true; btn.textContent = "Έλεγχος κωδικού…";
    Keys.set("massive", f.massive); if (f.finnhub) Keys.set("finnhub", f.finnhub); if (f.gemini) Keys.set("gemini", f.gemini);
    try { await massive("/v3/reference/tickers", { limit: 1 }, 20); toast("Ο κωδικός λειτουργεί. Ξεκινά το κατέβασμα της αγοράς."); startSync(); location.hash = "#/home"; }
    catch (er) { toast(esc(er.message), "high"); btn.disabled = false; btn.innerHTML = `${icon("play")}Ξεκίνα`; }
  });
};

// ================================================================== αναζήτηση
async function openSearch() {
  const ref = await loadRef(), rows = App.scan?.rows || [], byT = new Map(rows.map((r) => [r.t, r]));
  const sh = document.createElement("div"); sh.className = "sheet"; sh.setAttribute("role", "dialog");
  sh.innerHTML = `<div class="sheet-head"><input class="input search-in" id="sIn" placeholder="Σύμβολο ή εταιρεία (π.χ. AEHR)" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="icon-btn" id="sX" aria-label="Κλείσιμο">${icon("x")}</button></div><div class="results" id="sRes"></div>`;
  document.body.appendChild(sh);
  const close = () => sh.remove();
  $("#sX", sh).addEventListener("click", close);
  const render = (q) => {
    const Q = q.trim().toUpperCase(), P = plain(q);
    let hits = [];
    if (Q) { const all = Object.keys(ref).length ? Object.entries(ref) : rows.map((r) => [r.t, { n: r.n }]);
      for (const [t, r] of all) { if (t === Q) hits.unshift([t, r, 3]); else if (t.startsWith(Q)) hits.push([t, r, 2]); else if (P.length > 2 && plain(r.n).includes(P)) hits.push([t, r, 1]); if (hits.length > 300) break; }
      hits.sort((a, b) => b[2] - a[2] || (byT.get(b[0])?.dv || 0) - (byT.get(a[0])?.dv || 0)); hits = hits.slice(0, 30);
      if (/^[A-Z][A-Z0-9.\-]{0,9}$/.test(Q) && !hits.some((h) => h[0] === Q)) hits[hits.length ? "push" : "unshift"]([Q, { n: "Δοκίμασε αυτό το σύμβολο" }, 0]); }
    else hits = App.watch.map((t) => [t, ref[t] || { n: "" }, 0]);
    $("#sRes", sh).innerHTML = hits.map(([t, r]) => `<a href="#/s/${encodeURIComponent(t)}"><b>${esc(t)}</b><span class="nm">${esc(r.n || "")}</span><span class="k">${byT.get(t) ? fmt(byT.get(t).p) : ""}</span></a>`).join("") || `<div class="empty">Τίποτα δεν ταιριάζει</div>`;
  };
  $("#sRes", sh).addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  $("#sIn", sh).addEventListener("input", (e) => render(e.target.value));
  $("#sIn", sh).addEventListener("keydown", (e) => { if (e.key === "Enter") { const a = $("#sRes a", sh); if (a) { location.hash = a.getAttribute("href"); close(); } } if (e.key === "Escape") close(); });
  render(""); setTimeout(() => $("#sIn", sh).focus(), 50);
}

// ================================================================== βοηθός
const bot = { hist: [], ticker: null, busy: false };
try { bot.hist = JSON.parse(sessionStorage.getItem("uam.bot") || "[]"); } catch { bot.hist = []; }
const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
function openBot(ticker) {
  if (ticker !== undefined) bot.ticker = ticker || null;
  let sh = $("#botSheet");
  if (!sh) { sh = document.createElement("div"); sh.className = "sheet"; sh.id = "botSheet"; document.body.appendChild(sh); }
  sh.innerHTML = `<div class="sheet-head"><b>Βοηθός</b><span class="muted" id="bCtx">${esc(bot.ticker || "")}</span><button class="icon-btn" id="bX" aria-label="Κλείσιμο">${icon("x")}</button></div>
    <div class="bot-msgs" id="bMsgs"></div><div class="bot-chips" id="bChips"></div><form class="bot-form" id="bF"><input class="input" id="bIn" placeholder="Ρώτα κάτι…" autocomplete="off"><button class="btn primary" aria-label="Αποστολή">${icon("send")}</button></form>`;
  $("#bX").addEventListener("click", () => sh.remove());
  $("#bF").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#bIn").value; $("#bIn").value = ""; botAsk(v); });
  botRender();
}
function botRender() {
  const box = $("#bMsgs"); if (!box) return;
  box.innerHTML = (bot.hist.length ? bot.hist.map((m) => `<div class="msg ${m.r === "u" ? "user" : "bot"}">${m.r === "u" ? esc(m.t) : md(m.t)}</div>`).join("")
    : `<div class="msg bot">Γεια! Γράψε ένα σύμβολο (π.χ. <b>AEHR</b>) και σου την εξηγώ απλά: αν υπάρχει ευκαιρία, πού μπαίνεις, πού βγαίνεις και τι ρισκάρεις. Ή ρώτα «τι κάνει η αγορά σήμερα;».${AI.enabled() ? "" : "<br><br><span class='muted'>Χωρίς κωδικό AI απαντώ με τους κανόνες του συστήματος. Με κωδικό Gemini μπορούμε να συζητάμε ελεύθερα.</span>"}</div>`)
    + (bot.busy ? `<div class="msg bot thinking">Αναλύω…</div>` : "");
  box.scrollTop = box.scrollHeight;
  const t = bot.ticker, chips = t ? [`Εξήγησέ μου την ${t}`, `Πού να βάλω stop στην ${t};`, `Ποια τα ρίσκα της ${t};`] : ["Τι κάνει η αγορά σήμερα;", "Ποιες είναι οι καλύτερες ευκαιρίες;", "Τι βλέπει το μοντέλο;"];
  $("#bChips").innerHTML = chips.map((c) => `<button type="button">${esc(c)}</button>`).join("");
  $$("#bChips button").forEach((b) => b.addEventListener("click", () => botAsk(b.textContent)));
}
async function detectTicker(text) {
  const ref = await loadRef(), rows = new Set((App.scan?.rows || []).map((r) => r.t));
  for (const w of (text.match(/\b[A-Za-z]{1,5}\b/g) || [])) { const u = w.toUpperCase(); if (w === u && (ref[u] || rows.has(u)) && !["AI", "ETF", "RSI", "OK", "ATR", "EMA", "SMA", "USA", "CEO"].includes(u)) return u; }
  for (const w of (text.match(/\b[A-Za-z]{2,5}\b/g) || [])) { const u = w.toUpperCase(); if (rows.has(u)) return u; }
  return null;
}
function explainText(a) {
  const s = simpleStock(a, a.q?.price ?? a.T.m.close);
  return [`**${a.ticker}: ${s.verdict}**`, s.headline, ...s.pts.map((x) => "• " + x), ...s.model.map((x) => "• " + x), s.plan ? `\n**${s.plan.title}**\n` + s.plan.lines.map((x) => "• " + x).join("\n") : "",
    s.risks.length ? "\n**Προσοχή**\n" + s.risks.map((x) => "• " + x).join("\n") : "", "\nΑνάλυση, όχι επενδυτική συμβουλή."].filter(Boolean).join("\n");
}
function marketText() {
  const d = App.scan; if (!d) return "Δεν έχει γίνει ακόμα ανάλυση της αγοράς. Περίμενε να κατέβουν τουλάχιστον 60 ημέρες τιμών.";
  const m = d.market || {}, R = REGIME[m.regime];
  const sig = (d.signals || []).slice(0, 5).map((s) => `• ${s.ticker} (${HZ[s.horizon]}): είσοδος ${fmt(s.entryLow)}–${fmt(s.entryHigh)}, stop ${fmt(s.stop)}, στόχος ${fmt(s.tp2)}`);
  return [`**${R?.head || "Αγορά"}** (${fmt(m.score, 0)}/100, κλείσιμο ${dday(d.asOf)})`, ...[...(m.pros || []), ...(m.cons || [])].map((x) => "• " + x),
    sig.length ? "\n**Καλύτερες ευκαιρίες τώρα**\n" + sig.join("\n") : "\nΚαμία ευκαιρία δεν περνά όλους τους ελέγχους σήμερα."].join("\n");
}
async function botAsk(text) {
  text = (text || "").trim(); if (!text || bot.busy) return;
  bot.hist.push({ r: "u", t: text }); bot.busy = true; botRender();
  let reply;
  try {
    const tk = await detectTicker(text) || (/\b(αυτή|αυτήν|την|stop|ρίσκα|μετοχή)\b/i.test(text) ? bot.ticker : null);
    let a = null;
    if (tk) { bot.ticker = tk; $("#bCtx") && ($("#bCtx").textContent = tk); a = App.last?.ticker === tk ? App.last : null;
      if (!a) { const [ex, q] = await Promise.all([companyExtras(tk).catch(() => ({})), quote(tk)]); let bars = null; if (!App.scan?.rows?.some((r) => r.t === tk) && Keys.massive) bars = await tickerBars(tk).catch(() => null);
        a = await Engine.call("analyze", { ticker: tk, bars, extras: ex }); if (a.ok) { a.extras = ex; a.q = q; } } }
    if (AI.enabled()) {
      const ctx = a?.ok ? { ticker: tk, date: a.asOf, price: a.q?.price ?? a.T.m.close, live_price: !!a.q, score: a.sc.score, bias: a.sc.bias, components: a.sc.comps, metrics: a.T.m, flags: a.T.flags,
        pros: a.T.pros, cons: a.T.cons, risks: a.R.warnings.map((w) => w.text), accepted_setups: a.setups.acc.map((s) => ({ horizon: s.horizon, setup: s.setup, entry: [s.entryLow, s.entryHigh], stop: s.stop, targets: [s.tp1, s.tp2, s.tp3], rr: s.rr })),
        rejected_setups: a.setups.rej.map((s) => ({ setup: s.setup, why: s.rejected })), model: Object.fromEntries(Object.entries(a.pred).map(([k, p]) => [k, { rank_pct: p.rank, validated: p.validated, hist_excess: p.exp }])),
        fundamentals: a.fund, news: (a.news?.items || []).slice(0, 8).map((n) => ({ date: n.ts ? new Date(n.ts).toISOString().slice(0, 10) : null, title: n.title, source: n.source })) }
        : { market: App.scan?.market ? { regime: App.scan.market.regime, score: App.scan.market.score, pros: App.scan.market.pros, cons: App.scan.market.cons, sectors: (App.scan.market.sectors || []).slice(0, 5), as_of: App.scan.asOf } : null,
          opportunities: (App.scan?.signals || []).slice(0, 8).map((s) => ({ ticker: s.ticker, horizon: s.horizon, setup: s.setup, entry: [s.entryLow, s.entryHigh], stop: s.stop, targets: [s.tp1, s.tp2], model_rank: s.rank })),
          model_validated: Object.fromEntries(Object.entries(App.scan?.model || {}).map(([k, m]) => [k, !!m.validated])) };
      const sys = "Είσαι βοηθός ανάλυσης αμερικανικών μετοχών μέσα σε μια εφαρμογή. Απαντάς στα ελληνικά, απλά και σύντομα, σαν να εξηγείς σε φίλο που δεν είναι ειδικός. Χρησιμοποιείς ΜΟΝΟ τα δεδομένα JSON που σου δίνονται· αν κάτι λείπει, το λες. Δεν υπόσχεσαι κέρδη και δεν παρουσιάζεις προβλέψεις ως βεβαιότητες. Αναφέρεις πάντα τα βασικά ρίσκα και τις ημερομηνίες των ειδήσεων. Αν το μοντέλο δεν είναι επικυρωμένο, λες ότι δεν λαμβάνεται υπόψη. Κλείνεις με: «Ανάλυση, όχι επενδυτική συμβουλή.»";
      const hist = bot.hist.slice(-7, -1).map((m) => `${m.r === "u" ? "Χρήστης" : "Βοηθός"}: ${m.t}`).join("\n");
      reply = await AI.ask(sys, `Δεδομένα (JSON):\n${JSON.stringify(ctx)}\n\nΠροηγούμενη συζήτηση:\n${hist}\n\nΕρώτηση: ${text}`);
    } else if (a?.ok) reply = explainText(a);
    else if (tk && a && !a.ok) reply = `Δεν βρήκα αρκετά δεδομένα για την ${tk}: ${a.reason}`;
    else if (/μοντέλο/i.test(text)) { const M = App.scan?.model || {}; reply = Object.values(M).some((m) => m.validated) ? "Το μοντέλο πέρασε τον έλεγχο σε δεδομένα που δεν είχε δει. Οι κορυφαίες του επιλογές είναι στην αρχική, στην ενότητα «Τι βλέπει το μοντέλο»." : "Το μοντέλο δεν έχει αποδείξει ακόμα ότι προβλέπει, γι' αυτό δεν επηρεάζει τις ευκαιρίες. Λεπτομέρειες στο Περισσότερα → Μοντέλο πρόβλεψης."; }
    else reply = marketText();
  } catch (e) { reply = "Δεν ολοκληρώθηκε: " + e.message; }
  bot.hist.push({ r: "b", t: reply || "—" }); bot.busy = false;
  try { sessionStorage.setItem("uam.bot", JSON.stringify(bot.hist.slice(-30))); } catch { /* */ }
  botRender();
}

// ================================================================== εκκίνηση
function toggleTheme() { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; store.set("theme", t);
  $('meta[name="theme-color"]').setAttribute("content", t === "dark" ? "#0d1424" : "#f2f4f9"); router({ soft: true }); }
async function boot() {
  document.documentElement.dataset.theme = store.get("theme", "dark");
  $('meta[name="theme-color"]')?.setAttribute("content", store.get("theme", "dark") === "dark" ? "#0d1424" : "#f2f4f9");
  $("#tabbar").innerHTML = [["home", "Αρχική", "home"], ["scan", "Scanner", "filter"], ["signals", "Ευκαιρίες", "target"], ["watch", "Watchlist", "star"], ["more", "Περισσότερα", "dots"]]
    .map(([r, l, i]) => `<a href="#/${r}" data-r="${r}">${icon(i)}<span>${l}</span></a>`).join("");
  $("#searchBtn").innerHTML = icon("search"); $("#themeBtn").innerHTML = icon("theme"); $("#botFab").innerHTML = `${icon("chat")}Βοηθός`;
  $("#searchBtn").addEventListener("click", openSearch); $("#themeBtn").addEventListener("click", toggleTheme);
  $("#botFab").addEventListener("click", () => { const m = location.hash.match(/#\/s\/([^/]+)/); openBot(m ? decodeURIComponent(m[1]).toUpperCase() : bot.ticker); });
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-ask]"); if (!b) return; e.preventDefault(); openBot(b.dataset.ask); botAsk(`Εξήγησέ μου την ${b.dataset.ask}`); });
  renderSession(); setInterval(renderSession, 20000);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { /* */ });
  Engine.init();
  App.scan = (await kvGet("scan").catch(() => null)) || null;
  router();
  if (Keys.massive) {
    refreshQuotes();
    const c = await dayCount().catch(() => ({ data: 0 }));
    startSync();
    if (c.data >= 60 && (!App.scan || App.scan.days < c.data)) runScan();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !Keys.massive) return;
    renderSession();
    if (!Sync.running && Date.now() - (Sync.st.lastAt || 0) > 30 * 60000) startSync();
    refreshQuotes().then(() => { if (["home", "watch", "signals"].includes(App.route)) router({ soft: true }); });
  });
}
boot();
