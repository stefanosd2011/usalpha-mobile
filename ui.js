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
const pills = (items, on, attr) => `<div class="pills" role="tablist">${items.map(([k, l]) => `<button type="button" class="${k === on ? "on" : ""}" data-${attr}="${esc(k)}">${l}</button>`).join("")}</div>`;

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

function decileBars(dec) {
  if (!dec?.length) return "";
  const vals = dec.map((x) => (x.avg ?? 0) * 100), mx = Math.max(...vals.map(Math.abs), 1e-9), W = 360, H = 170, mid = 76, top = 12, bw = W / dec.length;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Απόδοση ανά δεκατημόριο πρόβλεψης"><line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="var(--line-2)"/>
    ${dec.map((x, i) => { const v = vals[i], h = (Math.abs(v) / mx) * (mid - top), y = v >= 0 ? mid - h : mid;
      return `<rect x="${(i * bw + 5).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 10).toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="3" fill="${v >= 0 ? "var(--up)" : "var(--down)"}" opacity="${x.decile === 10 ? 1 : 0.65}"/><text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 22}" fill="var(--muted)" font-size="11" text-anchor="middle">${x.decile}</text>`; }).join("")}
    <text x="0" y="${H - 4}" fill="var(--muted)" font-size="11">χειρότερες προβλέψεις</text><text x="${W}" y="${H - 4}" fill="var(--muted)" font-size="11" text-anchor="end">καλύτερες</text></svg>`;
}
const isStandalone = () => window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
// ================================================================== γραμμές λίστας, κάρτες
const SP = (s) => ({ ...s, entryLow: s.entryLow ?? s.entry_low, entryHigh: s.entryHigh ?? s.entry_high, stopPct: s.stopPct ?? s.stop_pct });
function rowItem(r, right = "chg") {
  const q = App.quotes[r.t], p = q?.price ?? r.p, c = q?.chg ?? r.ch;
  const rt = right === "rv" ? `${fmt(r.rv, 1)}× όγκος` : right === "r5" ? topPct(r.r5) : right === "r21" ? topPct(r.r21) : right === "ml" ? (isNum(r.ml) ? `ML ${r.ml.toFixed(0)}` : "—")
    : right === "m1" ? pct(r.m1, 1) : right === "atr" ? `±${fmt(r.atr, 1)}%` : pct(c);
  const rc = right === "chg" ? cls(c) : right === "m1" ? cls(r.m1) : ["r5", "r21", "ml"].includes(right) ? "sodium" : "";
  return `<a class="row" href="#/s/${encodeURIComponent(r.t)}"><div style="min-width:0"><div class="tk">${esc(r.t)}</div><div class="nm">${esc(r.n || "")}</div></div>
    ${spark(r.sp, { w: 76, h: 26 })}<div class="right"><b class="num">${fmt(p)}</b><span class="num ${rc}">${rt}</span></div>${ring(r.s, "sm")}</a>`;
}
function oppCard(s) {
  s = SP(s);
  const q = App.quotes[s.ticker], cur = q?.price ?? s.cur ?? s.price, chg = q?.chg ?? s.chg;
  const model = isNum(s.rank) ? chip(`${topPct(s.rank)} της αγοράς`, "sodium") : "";
  const st = { new: "", active: chip("Μέσα στη ζώνη εισόδου", "accent"), tp1: chip("Πιάστηκε στόχος 1", "up"), tp2: chip("Πιάστηκε στόχος 2", "up") }[s.status] || "";
  return `<a class="opp" href="#/s/${encodeURIComponent(s.ticker)}"><div class="opp-top"><div style="min-width:0"><div class="tk">${esc(s.ticker)} ${s.bias === "bearish" ? chip("Short", "down") : ""}</div><div class="nm">${esc(s.name || "")}</div></div>
    ${spark(s.spark, { w: 64, h: 30 })}${ring(s.score, "sm")}<div class="px"><b class="num">${money(cur)}</b><span class="num ${cls(chg)}">${pct(chg)}</span></div></div>
    <div class="setup-name">${esc(s.setup || "")}</div>${ladder(s, cur)}
    <div class="opp-foot">${chip(esc(HZ[s.horizon] || s.horizon), "accent")}${s.confidence ? chip(esc(s.confidence) + " επιβεβαίωση") : ""}${model}${st}${s.created ? `<span class="small muted">από ${dshort(s.created)}</span>` : ""}</div></a>`;
}
function newsItem(n) {
  const s = n.sent;
  return `<a class="news-item" href="${esc(n.url || "#")}" target="_blank" rel="noopener"><div class="ttl">${esc(n.title)}</div>
    <div class="nm2">${n.t ? `<b>${esc(n.t)}</b>` : ""}<span>${n.at ? dt(n.at) : ""}</span><span>${esc(n.source || "")}</span>${isNum(s) ? (s > 0.15 ? chip("Θετική", "up") : s < -0.15 ? chip("Αρνητική", "down") : chip("Ουδέτερη")) : ""}${n.cat && n.cat !== "Γενικό" && n.cat !== "general" ? chip(esc(n.cat)) : ""}</div></a>`;
}

// ================================================================== κατάσταση εφαρμογής
const App = { quotes: {}, watch: store.get("watch", ["AEHR", "NVDA", "AAPL"]), route: "" };
const REGIME = { "Risk-on": { tone: "up", head: "Η αγορά είναι σε καλή διάθεση", label: "Θετική" }, "Risk-off": { tone: "down", head: "Η αγορά είναι φοβισμένη", label: "Φοβισμένη" },
  "Ουδέτερο": { tone: "neutral", head: "Η αγορά δεν έχει καθαρή κατεύθυνση", label: "Ουδέτερη" } };
function saveWatch() { store.set("watch", App.watch); }
const D = () => Data.snap;
const qTime = (q) => new Date(q.ts).toLocaleTimeString("el-GR", { timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit", hour12: false });
const qChip = (q, asOf) => (q?.src === "finnhub" ? chip("Ζωντανή τιμή", "up") : q?.src === "cloud" ? chip(`Τιμή ${qTime(q)} ώρα Ελλάδας`, "accent") : chip(`Κλείσιμο ${dshort(asOf)}`));
const validated = () => Object.entries(D()?.model || {}).filter(([, m]) => m.validated).map(([k]) => k);

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

// ================================================================== πόσο φρέσκα είναι τα δεδομένα
function freshness() {
  const d = D();
  if (!d) {
    if (Data.error === "pending") return `<div class="callout info"><b>Η πρώτη πλήρης ανάλυση τρέχει τώρα στο cloud.</b> Κατεβαίνουν 10 χρόνια τιμών για όλη την αγορά ΗΠΑ, οικονομικά από την SEC και εκπαιδεύεται το μοντέλο. Θέλει 1–2 ώρες την πρώτη φορά· μετά ενημερώνεται μόνο του κάθε βράδυ. Άνοιξε ξανά την εφαρμογή αργότερα.</div>`;
    return `<div class="callout"><b>Δεν φορτώθηκαν τα δεδομένα.</b> ${Data.error === "offline" ? "Δεν υπάρχει σύνδεση στο internet." : esc(Data.error || "")}<div style="margin-top:10px"><button class="btn" onclick="reload()">${icon("refresh")}Δοκίμασε ξανά</button></div></div>`;
  }
  const ageH = (Date.now() - Date.parse(d.builtAt)) / 3600e3;
  if (ageH > 54) return `<div class="callout"><b>Τα δεδομένα είναι από ${dt(d.builtAt)}.</b> Η αυτόματη βραδινή ενημέρωση άργησε. Οι τιμές κλεισίματος είναι της ${dday(d.asOf)}.</div>`;
  return "";
}
async function reload() { await Data.load(); router(); }

// ================================================================== ΑΡΧΙΚΗ
routes.home = async () => {
  const d = D();
  if (!d) { $("#view").innerHTML = `<div class="stack">${freshness()}${welcomeBand()}</div>`; return; }
  const m = d.market || {}, R = REGIME[m.regime] || { tone: "neutral", head: "Αγορά", label: "—" };
  const lines = (m.simple || []).slice(0, 5);
  const hero = `<section class="band hero"><div class="hero-row"><div style="flex:1;min-width:0"><h1>${R.head}</h1></div>${gauge(m.score, R.label, R.tone)}</div>
    <ul style="margin-top:6px">${lines.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    <div class="small muted" style="margin-top:10px">Ανάλυση ${fmt(d.analyzed, 0)} μετοχών με τιμές κλεισίματος ${dday(d.asOf)}${Data.quotesAt ? `. Τρέχουσες τιμές: ${dt(new Date(Data.quotesAt).toISOString())}` : ""}.</div></section>`;
  const tile = (t, name) => { const x = d.idx?.[t]; const q = App.quotes[t]; const p = q?.price ?? x?.p, c = q?.chg ?? x?.ch;
    return `<a class="tile" href="#/s/${t}"><div class="t-name">${name}</div><div class="t-val num">${fmt(p)}</div><div class="t-chg num ${cls(c)}">${pct(c)}<span class="muted" style="font-weight:500">${q ? ` ${qTime(q)}` : " κλείσιμο"}</span></div>${spark(x?.sp)}</a>`; };
  const tiles = `<section class="band"><div class="tiles">${tile("SPY", "S&P 500 (SPY)")}${tile("QQQ", "Nasdaq 100 (QQQ)")}${tile("DIA", "Dow Jones (DIA)")}${tile("IWM", "Russell 2000 (IWM)")}</div></section>`;
  const sig = d.signals || [];
  const opps = band("Οι καλύτερες ευκαιρίες", sig.length ? sig.slice(0, 5).map(oppCard).join("") : emptyBox("Καμία ευκαιρία σήμερα", "Προτείνεται είσοδος μόνο όταν συμφωνούν τάση, όγκος, μοντέλο και ρίσκο. Η αναμονή είναι κι αυτή θέση."),
    { flush: true, right: sig.length > 5 ? `<a href="#/signals" class="small">Όλες (${sig.length})</a>` : "" });
  const val = validated(), rk = val.find((h) => h === "rank5" || h === "rank21");
  let model;
  if (rk) {
    const key = rk === "rank5" ? "r5" : "r21", days = rk === "rank5" ? 5 : 21;
    const top = d.rows.filter((r) => isNum(r[key])).sort((a, b) => b[key] - a[key]).slice(0, 8);
    model = band("Τι βλέπει το μοντέλο", top.map((r) => rowItem(r, key)).join("") + `<div class="small muted" style="padding:10px 16px">«Top 2%» = στο καλύτερο 2% όλης της αγοράς για τις επόμενες ${days} ημέρες, σε σχέση με τις υπόλοιπες μετοχές. Δεν είναι εγγύηση ανόδου.</div>`, { flush: true });
  } else {
    const any = Object.keys(d.model || {}).length;
    model = band("Τι βλέπει το μοντέλο", `<div style="padding:4px 16px 14px"><div class="note">${any ? (val.length ? `Επικυρωμένα: ${val.map((h) => esc(d.model[h].label)).join(", ")}. Χρησιμοποιούνται στις ευκαιρίες.` : "Το μοντέλο εκπαιδεύτηκε σε 10 χρόνια δεδομένων, αλλά σε περιόδους που δεν είχε δει δεν απέδειξε αρκετό πλεονέκτημα. Γι' αυτό δεν επηρεάζει τίποτα. Αυτό είναι προστασία, όχι βλάβη.") : "Το μοντέλο εκπαιδεύεται στην πρώτη πλήρη ανάλυση."} <a href="#/model">Λεπτομέρειες</a></div></div>`, { flush: true });
  }
  const mvTab = store.get("movers", "up"), rows = d.rows || [];
  const liquid = rows.filter((r) => (r.dv || 0) >= 5e6);
  const movers = band("Κινήσεις ημέρας", `<div style="padding:0 16px 8px">${pills([["up", "Άνοδοι"], ["down", "Πτώσεις"], ["vol", "Ασυνήθιστος όγκος"]], mvTab, "mv")}</div>
    <div data-pane="up" ${mvTab !== "up" ? "hidden" : ""}>${[...liquid].filter((r) => isNum(r.ch)).sort((a, b) => b.ch - a.ch).slice(0, 8).map((r) => rowItem(r)).join("")}</div>
    <div data-pane="down" ${mvTab !== "down" ? "hidden" : ""}>${[...liquid].filter((r) => isNum(r.ch)).sort((a, b) => a.ch - b.ch).slice(0, 8).map((r) => rowItem(r)).join("")}</div>
    <div data-pane="vol" ${mvTab !== "vol" ? "hidden" : ""}>${[...liquid].filter((r) => isNum(r.rv)).sort((a, b) => b.rv - a.rv).slice(0, 8).map((r) => rowItem(r, "rv")).join("")}</div>`, { flush: true, sub: "Μετοχές με τζίρο πάνω από 5 εκ. $ τη μέρα" });
  const heat = (v) => (!isNum(v) ? "var(--surface-2)" : `color-mix(in srgb, ${v >= 0 ? "var(--up)" : "var(--down)"} ${(Math.min(1, Math.abs(v) / 6) * 46 + 6).toFixed(0)}%, var(--surface-2))`);
  const sectors = (d.sectors || []).length ? band("Κλάδοι", `<div class="heat">${d.sectors.slice(0, 12).map((s) => `<a href="#/s/${encodeURIComponent(s.etf || "")}" style="background:${heat(s.rel21)}"><div class="h-name">${esc(s.sector)}</div><div class="h-val num">${pct(s.rel21, 1)}</div><div class="h-sub">vs S&P 500, 1 μήνας</div></a>`).join("")}</div>`) : "";
  const news = (d.news || []).length ? band("Ειδήσεις", d.news.slice(0, 8).map(newsItem).join(""), { flush: true, right: `<a class="small" href="#/news">Όλες</a>` }) : "";
  $("#view").innerHTML = `<div class="stack">${freshness()}${hero}${tiles}${opps}${model}${movers}${sectors}${news}</div>`;
  $$("[data-mv]").forEach((b) => b.addEventListener("click", () => { store.set("movers", b.dataset.mv); $$("[data-mv]").forEach((x) => x.classList.toggle("on", x === b)); $$("[data-pane]").forEach((x) => (x.hidden = x.dataset.pane !== b.dataset.mv)); }));
};
function welcomeBand() {
  return `<section class="band hero"><h1>US Alpha Mobile</h1><ul><li>Ανάλυση όλης της αμερικανικής αγοράς με τον ίδιο αλγόριθμο του προγράμματος του υπολογιστή.</li><li>Ευκαιρίες με είσοδο, stop και στόχους, εξηγημένες απλά.</li><li>Μοντέλο πρόβλεψης που ελέγχεται τίμια σε δεδομένα που δεν έχει δει.</li></ul></section>
    ${isIOS() && !isStandalone() ? band("Βάλ' την στην αρχική οθόνη", installSteps()) : ""}`;
}

// ================================================================== SCANNER
routes.scan = async () => {
  const d = D();
  if (!d) { $("#view").innerHTML = `<div class="stack">${freshness()}</div>`; return; }
  const st = { cat: "", sort: "s", q: "", sec: "", liq: true, ...store.get("scanf2", {}) };
  const CATS = [["", "Όλες"], ...Object.entries(d.cats || {})];
  const SORTS = { s: "Συνολικό score", ml: "Μοντέλο (σύνολο)", r5: "Μοντέλο 5 ημερών", r21: "Μοντέλο 1 μήνα", ch: "Μεταβολή σήμερα", rv: "Ασυνήθιστος όγκος", m1: "Απόδοση μήνα", atr: "Μεταβλητότητα" };
  const secs = [...new Set(d.rows.map((r) => r.sec).filter(Boolean))].sort();
  let list = d.rows.filter((r) => (!st.cat || r.cats.includes(st.cat)) && (!st.sec || r.sec === st.sec) && (!st.liq || (r.dv || 0) >= 5e6)
    && (!st.q || plain(r.t + " " + r.n).includes(plain(st.q))));
  list.sort((a, b) => (isNum(b[st.sort]) ? b[st.sort] : -1e9) - (isNum(a[st.sort]) ? a[st.sort] : -1e9));
  let shown = 60;
  const right = ["rv", "r5", "r21", "ml", "m1", "atr"].includes(st.sort) ? st.sort : "chg";
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Scanner</h1><p>${fmt(d.analyzed, 0)} μετοχές όλης της αγοράς, κλείσιμο ${dday(d.asOf)}</p></div>${freshness()}
    ${pills(CATS, st.cat, "c")}
    <div class="grid2"><select class="input" id="sortSel" aria-label="Ταξινόμηση">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}" ${k === st.sort ? "selected" : ""}>${v}</option>`).join("")}</select>
      <select class="input" id="secSel" aria-label="Κλάδος"><option value="">Όλοι οι κλάδοι</option>${secs.map((s) => `<option ${s === st.sec ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></div>
    <div class="grid2"><input class="input" id="qIn" placeholder="Φίλτρο ονόματος" value="${esc(st.q)}" autocomplete="off" autocapitalize="characters">
      <label class="input" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="liq" ${st.liq ? "checked" : ""}>Μόνο ρευστές</label></div>
    ${band(`${list.length} αποτελέσματα`, `<div id="scanList">${list.slice(0, shown).map((r) => rowItem(r, right)).join("") || emptyBox("Τίποτα με αυτά τα φίλτρα")}</div>
      ${list.length > shown ? `<div style="padding:12px 16px"><button class="btn block" id="moreBtn">Δείξε περισσότερες</button></div>` : ""}`, { flush: true, sub: st.liq ? "Τζίρος πάνω από 5 εκ. $ τη μέρα" : "" })}</div>`;
  const save = () => { store.set("scanf2", st); router({ soft: true }); };
  $$("[data-c]").forEach((b) => b.addEventListener("click", () => { st.cat = b.dataset.c; save(); }));
  $("#sortSel").addEventListener("change", (e) => { st.sort = e.target.value; save(); });
  $("#secSel").addEventListener("change", (e) => { st.sec = e.target.value; save(); });
  $("#liq").addEventListener("change", (e) => { st.liq = e.target.checked; save(); });
  let tmr; $("#qIn").addEventListener("input", (e) => { clearTimeout(tmr); tmr = setTimeout(() => { st.q = e.target.value.trim(); save(); }, 400); });
  $("#moreBtn")?.addEventListener("click", (e) => { shown += 60; $("#scanList").innerHTML = list.slice(0, shown).map((r) => rowItem(r, right)).join(""); if (shown >= list.length) e.currentTarget.remove(); });
};

// ================================================================== ΕΥΚΑΙΡΙΕΣ
routes.signals = async () => {
  const tab = store.get("sigtab", "active"), d = D();
  if (!d) { $("#view").innerHTML = `<div class="stack">${freshness()}</div>`; return; }
  const hist = d.hist || [], closed = hist.filter((h) => h.status === "closed" || h.status === "expired");
  const wins = closed.filter((h) => (h.ret ?? 0) > 0), avg = closed.length ? closed.reduce((s, h) => s + (h.ret || 0), 0) / closed.length : null;
  const OUT = (h) => h.outcome === "tp3" ? chip("Στόχος 3 ✓", "up") : /^stop μετά/.test(h.outcome || "") ? chip("Στόχος, μετά stop", "up") : h.outcome === "stop" ? chip("Stop", "down") : h.status === "expired" ? chip("Έληξε") : h.status === "new" ? chip("Αναμονή εισόδου", "accent") : chip("Ανοιχτή", "accent");
  const byHz = Object.entries(d.sigStats || {}).map(([h, s]) => [HZ[h] || h, `${s.n} · ${s.win_rate}% κερδοφόρες · μέσο ${pct(s.avg_return)}`, s.avg_return >= 0 ? "up" : "down"]);
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Ευκαιρίες</h1><p>Σχέδιο με είσοδο, stop και στόχους. Είναι ανάλυση, όχι εντολή αγοράς.</p></div>${freshness()}
    ${pills([["active", "Σημερινές"], ["hist", "Πώς πήγαν"]], tab, "sg")}
    ${tab === "active" ? band(`${(d.signals || []).length} ενεργές ευκαιρίες, ${dday(d.asOf)}`, (d.signals || []).map(oppCard).join("") || emptyBox("Καμία ευκαιρία", "Το σύστημα δεν προτείνει είσοδο όταν οι επιβεβαιώσεις ή η σχέση κέρδους/ρίσκου δεν επαρκούν."), { flush: true })
    : `${band("Πραγματικά αποτελέσματα", closed.length ? kv([["Ολοκληρωμένες", closed.length], ["Κερδοφόρες", `${Math.round(wins.length / closed.length * 100)}%`, wins.length / closed.length >= 0.5 ? "up" : "down"], ["Μέση απόδοση", pct(avg), cls(avg)], ["Ανοιχτές", hist.length - closed.length], ...byHz])
      : `<div class="note">Δεν έχει ολοκληρωθεί ακόμα καμία ευκαιρία. Κάθε πρόταση παρακολουθείται αυτόματα κάθε βράδυ με το υψηλό και το χαμηλό της ημέρας. Αν την ίδια μέρα πιαστούν stop και στόχος, μετράει το stop.</div>`)}
      ${band("Ιστορικό", hist.slice(0, 120).map((h) => `<a class="row" style="grid-template-columns:minmax(0,1fr) auto" href="#/s/${encodeURIComponent(h.ticker)}"><div><div class="tk">${esc(h.ticker)} <span class="muted small">${esc(HZ[h.horizon] || h.horizon)}</span></div><div class="nm">${esc(h.setup || "")}, ${dshort(h.date)}</div></div>
        <div class="right">${OUT(h)}<span class="num ${cls(h.ret)}" style="display:block;margin-top:4px">${isNum(h.ret) ? pct(h.ret) : ""}</span></div></a>`).join("") || emptyBox("Κενό ιστορικό"), { flush: true })}`}
  </div>`;
  $$("[data-sg]").forEach((b) => b.addEventListener("click", () => { store.set("sigtab", b.dataset.sg); router({ soft: true }); }));
};

// ================================================================== WATCHLIST
routes.watch = async () => {
  if (Keys.finnhub) { const q = await quotes(App.watch); Object.assign(App.quotes, q); }
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Watchlist</h1><p>${Data.quotesAt ? `Τιμές ${dt(new Date(Data.quotesAt).toISOString())}, ενημέρωση κάθε 30′ όσο είναι ανοιχτή η αγορά.` : "Τιμές κλεισίματος. Όσο είναι ανοιχτή η αγορά ενημερώνονται κάθε 30′."}</p></div>
    <form id="wf" style="display:flex;gap:8px"><input class="input" id="wIn" placeholder="Σύμβολο, π.χ. AEHR" autocapitalize="characters" autocomplete="off"><button class="btn primary" aria-label="Προσθήκη">${icon("plus")}</button></form>
    ${band("", App.watch.map((t) => { const r = Data.row(t) || { t, n: "Εκτός ανάλυσης", sp: [], p: null, ch: null, s: null };
      return `<div style="display:grid;grid-template-columns:1fr 44px;align-items:center">${rowItem(r)}<button class="icon-btn" style="border:0;background:none" data-del="${esc(t)}" aria-label="Αφαίρεση ${esc(t)}">${icon("trash")}</button></div>`; }).join("") || emptyBox("Άδεια watchlist"), { flush: true })}</div>`;
  $("#wf").addEventListener("submit", (e) => { e.preventDefault(); const t = $("#wIn").value.trim().toUpperCase(); if (!t || App.watch.includes(t)) return; App.watch.unshift(t); saveWatch(); router({ soft: true }); });
  $$("[data-del]").forEach((b) => b.addEventListener("click", () => { App.watch = App.watch.filter((x) => x !== b.dataset.del); saveWatch(); router({ soft: true }); }));
};

// ================================================================== ΜΕΤΟΧΗ
const STABS = [["ov", "Επισκόπηση"], ["model", "Πρόβλεψη"], ["setups", "Setups"], ["co", "Εταιρεία"], ["news", "Ειδήσεις"], ["tech", "Τεχνικά"]];
routes.s = async (ticker) => {
  ticker = (ticker || "").toUpperCase();
  const view = $("#view");
  view.innerHTML = `<div class="loading"><span class="spinner"></span>Ανάλυση ${esc(ticker)}…</div>`;
  const [a, fq] = await Promise.all([Data.stock(ticker), quote(ticker.replace("^", ""))]);
  if (App.route !== "s") return;
  if (fq) App.quotes[ticker] = fq;
  const q = App.quotes[ticker] || null;
  if (!a) {
    view.innerHTML = `<div class="stack">${band("", `<div class="stock-head"><div class="t1"><div><h1>${esc(ticker)}</h1></div>${q ? `<div><div class="pv num">${money(q.price)}</div><div class="pc num ${cls(q.chg)}">${pct(q.chg)}</div></div>` : ""}</div></div>`)}
      ${band("", emptyBox(`Η ${esc(ticker)} δεν είναι στην ανάλυση`, "Αναλύονται όλες οι μετοχές NASDAQ, NYSE και AMEX με τιμή πάνω από 1$ και αρκετό τζίρο. Έλεγξε ότι το σύμβολο είναι σωστό."))}</div>`;
    return;
  }
  a.q = q; App.last = a;
  const price = q?.price ?? a.price, chg = q?.chg ?? a.chg, inW = App.watch.includes(ticker);
  if (a.index) {
    view.innerHTML = `<div class="stack"><section class="band"><div class="stock-head"><div class="t1"><div><h1>${esc(ticker)}</h1><div class="nm">Δείκτης / ETF</div></div><div><div class="pv num">${money(price)}</div><div class="pc num ${cls(chg)}">${pct(chg)}</div></div></div></div></section>
      ${band("Γράφημα", chartShell(), { sub: `Ημερήσιες τιμές έως ${dday(a.asOf)}` })}</div>`;
    drawChart(a); return;
  }
  const tab = STABS.some(([k]) => k === store.get("stab")) ? store.get("stab") : "ov";
  view.innerHTML = `<div class="stack"><section class="band"><div class="stock-head">
      <div class="t1"><div style="min-width:0"><h1>${esc(ticker)}</h1><div class="nm" style="font-size:14px">${esc(a.name || "")}</div></div>
        <div><div class="pv num">${money(price)}</div><div class="pc num ${cls(chg)}">${pct(chg)}</div></div></div>
      <div class="chips">${qChip(q, a.asOf)}${a.sector ? chip(esc(a.sector)) : ""}${biasChip(a.sc.bias)}</div>
      <div class="grid2"><button class="btn primary" data-ask="${esc(ticker)}">${icon("chat")}Εξήγησέ μου</button><button class="btn" id="wBtn">${icon("star")}${inW ? "Στη watchlist" : "Watchlist"}</button></div></div>
    <div class="tabs" role="tablist">${STABS.map(([k, l]) => `<button type="button" data-st="${k}" class="${k === tab ? "on" : ""}">${l}</button>`).join("")}</div></section><div id="stab" class="stack"></div></div>`;
  const show = (k) => { store.set("stab", k); $$("[data-st]").forEach((b) => b.classList.toggle("on", b.dataset.st === k)); disposeCharts(); $("#stab").innerHTML = STOCK_TABS[k](a, price); if (k === "ov") drawChart(a); if (k === "news") loadLiveNews(a); };
  $$("[data-st]").forEach((b) => b.addEventListener("click", () => show(b.dataset.st)));
  $("#wBtn").addEventListener("click", () => { if (inW) App.watch = App.watch.filter((x) => x !== ticker); else App.watch.unshift(ticker); saveWatch(); router({ soft: true }); });
  show(tab);
};

function simpleStock(a) {
  const s = a.simple || {}, risks = [...(s.risks || []), ...(a.risk?.warnings || [])];
  const best = a.acc[0];
  for (const c of (best?.conf?.conflicts || [])) risks.push(c);
  const fm = a.fund?.m || {};
  if (isNum(fm.days_to_earnings) && fm.days_to_earnings >= 0 && fm.days_to_earnings <= 14) risks.unshift(`Ανακοινώνει αποτελέσματα σε ${fm.days_to_earnings} μέρες (${dshort(fm.earnings_date)}): η τιμή μπορεί να κινηθεί απότομα.`);
  return { tone: s.tone || "neutral", verdict: s.verdict || "—", headline: s.headline || "", pts: s.points || [], model: s.model || [], plan: s.plan || null, risks: [...new Set(risks)].slice(0, 6) };
}
function setupCard(a, s0, rej) {
  const s = SP(s0);
  return `<div class="setup ${rej ? "rejected" : ""}"><div class="chips">${chip(esc(HZ[s.horizon] || s.horizon), "accent")}${biasChip(s.bias)}${rej ? chip("Δεν προτείνεται", "warn") : chip(`Περνά τους ελέγχους: ${esc(s.confidence || "")}`, "up")}</div>
    <b>${esc(s.setup)}</b>${ladder(s, a.q?.price ?? a.price)}
    ${kv([["Ζώνη εισόδου", `${fmt(s.entryLow)}–${fmt(s.entryHigh)}`], ["Stop", `${fmt(s.stop)} (${fmt(s.stopPct, 1)}%)`, "down"], ["Στόχος 1 / 2", `${fmt(s.tp1)} / ${fmt(s.tp2)}`, "up"], ["Στόχος 3", fmt(s.tp3), "up"], ["Κέρδος / ρίσκο", fmt(s.rr, 2)], ["Διάρκεια", esc(s.holding || "")],
      s.pos ? ["Μέγεθος (λογ. 10.000$)", `${s.pos.shares} μετοχές, ρίσκο ${money(s.pos.risk, 0)}`] : null])}
    <div class="chips">${(s.reasons || []).map((x) => chip(esc(x))).join("")}</div>
    ${(s.conf?.sup || []).length || (s.conf?.opp || []).length ? `<div class="small soft">Υπέρ: ${(s.conf.sup || []).map((k) => LBL[k] || k).join(", ") || "—"}. Κατά: ${(s.conf.opp || []).map((k) => LBL[k] || k).join(", ") || "—"}.</div>` : ""}
    ${rej ? `<ul class="list risks">${(s.why || []).map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}</div>`;
}
const LBL = { ml: "Μοντέλο", trend: "Τάση", momentum: "Momentum", volume: "Όγκος", relative: "Σχετική δύναμη", fundamentals: "Θεμελιώδη", news: "Ειδήσεις", sector: "Κλάδος", market: "Αγορά" };
const chartShell = () => `<div class="pills" id="tb" style="margin-bottom:10px"></div><div class="chart-box"><div class="chart-legend" id="lg"></div><div class="chart-main" id="cMain"></div><div class="chart-sub" id="cRsi"></div></div>`;
function predLine(p) {
  if (p.kind === "rank") return `${topPct(p.rank)} της αγοράς για τις επόμενες ${p.days} ημέρες${isNum(p.exp) ? `, ιστορικά ${pct(p.exp * 100, 2)} σε σχέση με την αγορά` : ""}`;
  return `${isNum(p.p) ? Math.round(p.p * 100) + "%" : "—"} πιθανότητα να πιάσει τον στόχο πριν το stop${isNum(p.breakeven) ? ` (χρειάζεται πάνω από ${Math.round(p.breakeven * 100)}% για κέρδος)` : ""}`;
}

const STOCK_TABS = {
  ov(a, price) {
    const s = simpleStock(a), best = a.acc[0];
    return `${band("", `<div class="verdict t-${s.tone}"><div><h3>${esc(s.verdict)}</h3><p class="vh">${esc(s.headline)}</p><ul>${s.pts.map((x) => `<li>${esc(x)}</li>`).join("")}${s.model.map((x) => `<li><b>${esc(x)}</b></li>`).join("")}</ul>
      ${s.plan ? `<div class="plan"><b>${esc(s.plan.title)}</b><ul>${(s.plan.lines || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${s.risks.length ? `<div class="warn-box"><b>Προσοχή</b><ul>${s.risks.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}</div></div>`)}
    ${band("Γράφημα", chartShell(), { sub: `Ημερήσιες τιμές έως ${dday(a.asOf)}` })}
    ${best ? band("Σχέδιο συναλλαγής", vladder(SP(best), price), { sub: `${esc(HZ[best.horizon] || best.horizon)}: ${esc(best.setup)}` }) : ""}
    ${band("Βαθμολογία", `<div style="display:flex;gap:14px;align-items:center;margin-bottom:8px">${ring(a.sc.score, "lg")}<div class="small soft">0 = πολύ αρνητικό, 100 = πολύ θετικό. Δεν είναι πιθανότητα. Κάλυψη δεδομένων ${Math.round((a.sc.coverage || 0) * 100)}%.</div></div>
      ${a.sc.contrib.map((c) => `<div class="meter"><span>${esc(c.label)}</span><div class="bar"><i style="width:${clamp(c.score ?? 0)}%;background:${c.score >= 60 ? "var(--up)" : c.score <= 40 ? "var(--down)" : "var(--accent)"}"></i></div><b class="num">${isNum(c.score) ? c.score.toFixed(0) : "—"}</b></div>`).join("")}
      ${(a.sc.explain?.what_changes || []).length ? `<div class="small muted" style="margin-top:12px">Τι θα άλλαζε την εικόνα</div><ul class="list">${a.sc.explain.what_changes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}`)}`;
  },
  model(a) {
    const ps = Object.entries(a.pred || {}).sort(([, x], [, y]) => (y.validated - x.validated) || (x.kind === "rank" ? -1 : 1));
    if (!ps.length) return band("Πρόβλεψη", emptyBox("Δεν υπάρχει πρόβλεψη για αυτή τη μετοχή", "Το μοντέλο προβλέπει μόνο μετοχές με αρκετό ιστορικό και τζίρο."));
    return ps.map(([, p]) => band(esc(p.label || ""), `<div class="num ${p.validated ? (p.kind === "rank" ? (p.rank >= 0.8 ? "up" : p.rank <= 0.2 ? "down" : "") : "") : "muted"}" style="font-size:26px;font-weight:760">${p.kind === "rank" ? topPct(p.rank) : isNum(p.p) ? Math.round(p.p * 100) + "%" : "—"}</div>
      <div class="small soft" style="margin-top:4px">${esc(predLine(p))}</div>
      <div style="margin:10px 0">${p.validated ? chip("Επικυρωμένο σε άγνωστα δεδομένα", "up") : chip("Μη επικυρωμένο: δεν λαμβάνεται υπόψη", "warn")}</div>
      ${p.kind !== "rank" && isNum(p.exp) ? `<div class="soft small">Σε παρόμοιες περιπτώσεις στο παρελθόν: <b class="${cls(p.exp)}">${p.exp >= 0 ? "+" : ""}${fmt(p.exp, 2)}R</b> (για κάθε 100$ ρίσκου, ${p.exp >= 0 ? "κέρδος" : "απώλεια"} ${fmt(Math.abs(p.exp) * 100, 0)}$ κατά μέσο όρο).</div>` : ""}
      ${p.drivers?.length ? `<div class="small muted" style="margin:12px 0 6px">Τι σπρώχνει την πρόβλεψη πάνω (πράσινο) ή κάτω (κόκκινο)</div>${p.drivers.map((x) => `<div class="driver"><span>${esc(x.label)}</span><div class="dbar"><i style="${x.effect >= 0 ? "left:50%" : "right:50%"};width:${Math.min(50, Math.abs(x.effect) * 120).toFixed(1)}%;background:${x.effect >= 0 ? "var(--up)" : "var(--down)"}"></i></div><span class="num muted" style="text-align:right">${fmt(x.value, 2)}</span></div>`).join("")}` : ""}`)).join("")
      + `<div class="note">Το μοντέλο (LightGBM, 173 στοιχεία ανά μετοχή, 10 χρόνια ιστορικό) εκπαιδεύεται κάθε εβδομάδα στο cloud. Χρησιμοποιείται στη βαθμολογία και στις ευκαιρίες μόνο αν πέρασε τον έλεγχο σε δεδομένα που δεν είχε δει. <a href="#/model">Πώς ελέγχθηκε</a></div>`;
  },
  setups(a) {
    const all = [...a.acc.map((s) => setupCard(a, s, false)), ...a.rej.map((s) => setupCard(a, s, true))];
    return band("Όλα τα setups που εξετάστηκαν", all.length ? `<div class="stack" style="gap:12px">${all.join("")}</div>` : emptyBox("Κανένα setup σήμερα", "Όταν δεν υπάρχει καθαρή εικόνα, το σύστημα δεν προτείνει τίποτα."));
  },
  co(a) {
    const m = a.fund?.m || {}, p = a.profile || {};
    const P = (v, d = 1) => (isNum(v) ? pct(v * 100, d) : "—");
    return `${band("Θεμελιώδη", kv([["Κεφαλαιοποίηση", isNum(m.market_cap) ? "$" + big(m.market_cap) : "—"], ["P/E", fmt(m.pe, 1)], ["Forward P/E", fmt(m.forward_pe, 1)], ["Έσοδα σε 1 χρόνο", P(m.revenue_growth), cls(m.revenue_growth)],
      ["Κέρδη σε 1 χρόνο", P(m.earnings_growth), cls(m.earnings_growth)], ["Λειτουργικό περιθώριο", P(m.op_margin)], ["ROE", P(m.roe)], ["Χρέος / ίδια κεφάλαια", isNum(m.debt_to_equity) ? fmt(m.debt_to_equity / 100, 2) : "—"],
      ["Short (% float)", P(m.short_pct_float)], ["Θεσμικοί", P(m.inst_pct, 0)], ["Beta", fmt(m.beta, 2)], ["Μέση τιμή-στόχος αναλυτών", isNum(m.target_mean) ? `${money(m.target_mean)} (${pct(m.analyst_upside_pct, 0)})` : "—"],
      ["Επόμενα αποτελέσματα", m.earnings_date ? `${dshort(m.earnings_date)}${isNum(m.days_to_earnings) ? ` (σε ${m.days_to_earnings} ημ.)` : ""}` : "—"]])
      + `<div class="small muted" style="margin-top:10px">Βαθμολογία θεμελιωδών ${isNum(a.fund?.score) ? a.fund.score.toFixed(0) : "—"}/100, κάλυψη ${Math.round((a.fund?.coverage || 0) * 100)}%. Πηγές: SEC, Yahoo.</div>`, { sub: esc([a.sector, a.industry].filter(Boolean).join(", ")) })}
      ${(a.fund?.pros || []).length || (a.fund?.cons || []).length ? band("Υπέρ και κατά", `<ul class="list pros">${a.fund.pros.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><ul class="list cons">${[...a.fund.cons, ...(a.fund.risks || [])].map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`) : ""}
      ${p.summary ? band("Τι κάνει η εταιρεία", `<p class="soft" style="margin:0">${esc(p.summary)}</p>`) : ""}
      ${(a.analysts || []).length ? band("Αναλυτές", a.analysts.map((x) => `<div class="meter" style="grid-template-columns:1fr auto"><span class="small">${esc(x.firm || x.Firm || "")} ${esc(x.action || x.Action || "")} ${esc(x.to || x.ToGrade || "")}</span><span class="small muted">${esc(String(x.date || x.GradeDate || "").slice(0, 10))}</span></div>`).join("")) : ""}
      ${p.website ? `<a class="btn ghost" href="${esc(p.website)}" target="_blank" rel="noopener">Ιστοσελίδα εταιρείας</a>` : ""}`;
  },
  news(a) {
    const n = a.news || {};
    return `${band("Ειδήσεις", (n.items || []).length ? n.items.map((x) => newsItem({ ...x, t: null })).join("") : emptyBox("Καμία πρόσφατη είδηση στην ανάλυση"), { flush: true, sub: n.n ? `Βαθμολογία ειδήσεων ${isNum(n.score) ? n.score.toFixed(0) : "—"}/100` : "" })}<div id="liveNews"></div>`;
  },
  tech(a) {
    const m = a.tech.m || {};
    return `${band("Δείκτες", kv([["RSI 14", fmt(m.rsi, 1)], ["ADX", fmt(m.adx, 1)], ["MACD / σήμα", `${fmt(m.macd, 3)} / ${fmt(m.macd_signal, 3)}`], ["Stochastic", `${fmt(m.stoch_k, 0)} / ${fmt(m.stoch_d, 0)}`],
      ["EMA 20 / 50", `${fmt(m.ema20)} / ${fmt(m.ema50)}`], ["ΚΜΟ 50 / 200", `${fmt(m.sma50)} / ${fmt(m.sma200)}`], ["Bollinger", `${fmt(m.bb_lo)}–${fmt(m.bb_up)}`], ["VWAP 20 ημ.", fmt(m.vwap20)],
      ["ATR", `${fmt(m.atr)} (${fmt(m.atr_pct, 1)}%)`], ["Όγκος vs μέσο", fmt(m.rvol, 2) + "×"], ["Τζίρος/ημέρα", "$" + big(m.dollar_vol20)], ["Υψηλό / χαμηλό έτους", `${fmt(m.hi52)} / ${fmt(m.lo52)}`],
      ["Απόδοση 1 / 3 / 6 μήνες", `${pct(m.ret21, 1)} / ${pct(m.ret63, 1)} / ${pct(m.ret126, 1)}`], ["vs S&P 500 (3 μήνες)", pct(a.tech.rs?.excess, 1), cls(a.tech.rs?.excess)]])
      + `<div class="chips" style="margin-top:12px">${(a.tech.flags || []).map((f) => chip(esc(f))).join("")}</div>`)}
      ${band("Στηρίξεις και αντιστάσεις", (a.tech.levels || []).length ? a.tech.levels.slice().reverse().map((l) => `<div class="meter" style="grid-template-columns:1fr auto auto"><span>${l.type === "support" ? chip("Στήριξη", "up") : chip("Αντίσταση", "down")}</span><b class="num">${fmt(l.price)}</b><span class="muted small">${l.touches}×</span></div>`).join("") : emptyBox("Δεν βρέθηκαν καθαρά επίπεδα"))}
      ${a.tech.vp ? `<div class="note">Τιμή με τον περισσότερο όγκο: ${fmt(a.tech.vp.poc)} (ζώνη ${fmt(a.tech.vp.vaLow)}–${fmt(a.tech.vp.vaHigh)}).</div>` : ""}
      ${(a.tech.pros || []).length || (a.tech.cons || []).length ? band("Υπέρ και κατά", `<ul class="list pros">${a.tech.pros.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><ul class="list cons">${a.tech.cons.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`) : ""}`;
  },
};
async function loadLiveNews(a) {
  if (!Keys.finnhub) return;
  const n = await liveNews(a.ticker); const el = $("#liveNews");
  if (el && n.length) el.outerHTML = band("Τελευταίες ειδήσεις (ζωντανά)", n.slice(0, 12).map(newsItem).join(""), { flush: true, sub: "Finnhub" });
}

// ================================================================== γράφημα (δείκτες υπολογίζονται στο τηλέφωνο από τις τιμές)
function emaA(c, n) { const k = 2 / (n + 1), o = new Array(c.length).fill(null); let e = null; for (let i = 0; i < c.length; i++) { const v = c[i]; if (!isNum(v)) continue; e = e === null ? v : v * k + e * (1 - k); if (i >= n - 1) o[i] = e; } return o; }
function bbA(c, n = 20, k = 2) { const up = new Array(c.length).fill(null), lo = up.slice(); for (let i = n - 1; i < c.length; i++) { const w = c.slice(i - n + 1, i + 1), m = w.reduce((s, x) => s + x, 0) / n, sd = Math.sqrt(w.reduce((s, x) => s + (x - m) ** 2, 0) / n); up[i] = m + k * sd; lo[i] = m - k * sd; } return [up, lo]; }
function rsiA(c, n = 14) { const o = new Array(c.length).fill(null); let g = 0, l = 0; for (let i = 1; i < c.length; i++) { const d = c[i] - c[i - 1], G = Math.max(d, 0), L = Math.max(-d, 0); if (i <= n) { g += G / n; l += L / n; if (i === n) o[i] = l ? 100 - 100 / (1 + g / l) : 100; } else { g = (g * (n - 1) + G) / n; l = (l * (n - 1) + L) / n; o[i] = l ? 100 - 100 / (1 + g / l) : 100; } } return o; }
function drawChart(a) {
  const b = a.bars, main = $("#cMain");
  if (!b?.d?.length) { main.innerHTML = emptyBox("Δεν υπάρχουν τιμές"); return; }
  if (!window.LightweightCharts) { main.innerHTML = emptyBox("Το γράφημα θέλει σύνδεση την πρώτη φορά"); return; }
  const opts = store.get("ind", { ema: true, bb: false, lv: true });
  $("#tb").innerHTML = [["ema", "EMA 20/50/200"], ["bb", "Bollinger"], ["lv", "Στηρίξεις"]].map(([k, l]) => `<button type="button" class="${opts[k] ? "on" : ""}" data-ind="${k}">${l}</button>`).join("");
  $$("[data-ind]").forEach((x) => x.addEventListener("click", () => { opts[x.dataset.ind] = !opts[x.dataset.ind]; store.set("ind", opts); disposeCharts(); drawChart(a); }));
  main.innerHTML = ""; $("#cRsi").innerHTML = "";
  const up = css("--up"), dn = css("--down"), acc = css("--accent"), sod = css("--sodium");
  const T = b.d, C = b.c, ser = (arr) => arr.map((v, i) => (isNum(v) ? { time: T[i], value: v } : null)).filter(Boolean);
  const c = mkChart(main, main.clientHeight || 340);
  const cs = c.addCandlestickSeries({ upColor: up, downColor: dn, wickUpColor: up, wickDownColor: dn, borderVisible: false });
  cs.setData(T.map((t, i) => ({ time: t, open: b.o[i], high: b.h[i], low: b.l[i], close: C[i] })));
  const vs = c.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false });
  c.priceScale("vol").applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
  vs.setData(T.map((t, i) => ({ time: t, value: b.v[i], color: alpha(C[i] >= b.o[i] ? up : dn, 0.35) })));
  const line = (d, col, w = 1, st = 0) => { if (!d?.length) return; c.addLineSeries({ color: col, lineWidth: w, lineStyle: st, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }).setData(d); };
  const leg = [];
  if (opts.ema) { line(ser(emaA(C, 20)), acc); line(ser(emaA(C, 50)), sod, 2); line(ser(emaA(C, 200)), "#f472b6", 2); leg.push(["EMA20", acc], ["EMA50", sod], ["EMA200", "#f472b6"]); }
  if (opts.bb) { const [u, l] = bbA(C); line(ser(u), "#64748b", 1, 1); line(ser(l), "#64748b", 1, 1); leg.push(["Bollinger", "#64748b"]); }
  if (opts.lv) (a.tech?.levels || []).forEach((l) => cs.createPriceLine({ price: l.price, color: alpha(l.type === "support" ? up : dn, 0.55), lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" }));
  const best = a.acc?.[0];
  if (best) { cs.createPriceLine({ price: best.stop, color: dn, lineWidth: 2, title: "Stop" }); cs.createPriceLine({ price: best.tp2, color: up, lineWidth: 2, title: "Στόχος" }); }
  c.timeScale().setVisibleLogicalRange({ from: T.length - 120, to: T.length + 2 });
  $("#lg").innerHTML = leg.map(([l, col]) => `<span style="color:${col}">${l}</span>`).join("");
  const r = mkChart($("#cRsi"), 100, { timeScale: { visible: false } });
  const rs = r.addLineSeries({ color: acc, lineWidth: 1, priceLineVisible: false }); rs.setData(ser(rsiA(C)));
  rs.createPriceLine({ price: 70, color: alpha(dn, 0.7), lineStyle: 2, lineWidth: 1, title: "RSI 70" }); rs.createPriceLine({ price: 30, color: alpha(up, 0.7), lineStyle: 2, lineWidth: 1, title: "30" });
  [c, r].forEach((x) => x.timeScale().subscribeVisibleLogicalRangeChange((rg) => { if (rg) [c, r].forEach((y) => y !== x && y.timeScale().setVisibleLogicalRange(rg)); }));
}

// ================================================================== ΕΙΔΗΣΕΙΣ
routes.news = async () => {
  const d = D(), live = Keys.finnhub ? await liveNews(null) : [];
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Ειδήσεις</h1><p>Με ημερομηνία και πηγή. Η εκτίμηση θετική/αρνητική βγαίνει από λέξεις-κλειδιά και μπορεί να κάνει λάθος.</p></div>
    ${live.length ? band("Τώρα (Finnhub)", live.map(newsItem).join(""), { flush: true }) : ""}
    ${band("Από τη βραδινή ανάλυση", (d?.news || []).map(newsItem).join("") || emptyBox("Καμία είδηση"), { flush: true })}</div>`;
};

// ================================================================== ΠΕΡΙΣΣΟΤΕΡΑ
routes.more = async () => {
  const item = (href, ic, t, sub) => `<a class="row" style="grid-template-columns:28px 1fr" href="${href}">${icon(ic)}<div><div style="font-weight:650">${t}</div><div class="nm">${sub}</div></div></a>`;
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Περισσότερα</h1></div>${band("", item("#/model", "model", "Μοντέλο πρόβλεψης", "Πώς ελέγχθηκε και αν επικυρώθηκε") + item("#/news", "info", "Ειδήσεις", "Αγορά και μετοχές")
    + item("#/data", "data", "Δεδομένα", "Πότε ενημερώθηκε, πηγές, έλεγχοι") + item("#/settings", "theme", "Εμφάνιση", "Φωτεινό ή σκούρο θέμα") + item("#/guide", "info", "Οδηγός", "Εγκατάσταση στο iPhone, τι να περιμένεις"), { flush: true })}
    <div class="note">US Alpha Mobile: ανάλυση και προτάσεις, όχι επενδυτική συμβουλή. Καμία αυτόματη εντολή.</div></div>`;
};
routes.model = async () => {
  const d = D(), M = d?.model || {}, st = d?.stats || {};
  const order = ["rank21", "rank5", "swing", "short", "day"];
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Μοντέλο πρόβλεψης</h1><p>Ίδιο με το πρόγραμμα του υπολογιστή. Εκπαιδεύεται κάθε εβδομάδα στο cloud.</p></div>
    <div class="note"><b>Τι κάνει.</b> Δύο είδη πρόβλεψης: <b>κατάταξη</b> (ποιες μετοχές θα πάνε καλύτερα από τις υπόλοιπες σε 5 ή 21 ημέρες) και <b>στόχος πριν το stop</b> (για day trade, 5 ημέρες, swing). Κοιτάζει ${st.features || 173} στοιχεία ανά μετοχή: τιμές, όγκους, μεταβλητότητα, σύγκριση με αγορά και κλάδο, οικονομικά από την SEC, ημερομηνίες αποτελεσμάτων.<br><br>
    <b>Πώς ελέγχεται.</b> Μαθαίνει μόνο από το παρελθόν και δοκιμάζεται σε επόμενη περίοδο που δεν έχει δει, ξανά και ξανά μέχρι σήμερα. Χρησιμοποιείται <b>μόνο</b> αν περάσει όλα τα κριτήρια.</div>
    ${d ? `<section class="band"><div class="tiles"><div class="tile"><div class="t-name">Ιστορικό</div><div class="t-val num">${d.historyYears || "—"} χρόνια</div><div class="t-chg muted">${dday(d.firstDate)} έως ${dday(d.asOf)}</div></div>
      <div class="tile"><div class="t-name">Μετοχές με ιστορικό</div><div class="t-val num">${fmt(d.histTickers, 0)}</div><div class="t-chg muted">${fmt(st.rawBars, 0)} ημερήσιες τιμές</div></div>
      <div class="tile"><div class="t-name">Στοιχεία εκπαίδευσης</div><div class="t-val num">${big(st.values)}</div><div class="t-chg muted">σε ${fmt(st.seconds, 0)} δευτ.</div></div>
      <div class="tile"><div class="t-name">Ταχύτητα (μετρημένη)</div><div class="t-val num">${isNum(st.perSec) ? (st.perSec / 1e6).toFixed(1) + " εκ./δ" : "—"}</div><div class="t-chg muted">${esc(st.engine || "")}, στο cloud</div></div></div></section>` : freshness()}
    ${order.filter((k) => M[k]).map((k) => { const m = M[k], rank = m.kind === "rank";
      return band(esc(m.label || k), `<ul class="list">${(m.gate || []).map((g) => `<li><b class="${g.startsWith("✓") ? "up" : "down"}">${g.startsWith("✓") ? "✓" : "✗"}</b><span>${esc(g.replace(/^[✓✗]\s*/, ""))}</span></li>`).join("")}</ul>
        <div style="margin:12px 0">${kv(rank ? [["Συσχέτιση (IC)", `${fmt(m.ic, 4)} (t = ${fmt(m.icT, 2)})`], ["Μέρες με θετική συσχέτιση", ratioPct(m.icPos, 0)], ["Top 10% vs αγορά", pct((m.top ?? NaN) * 100, 2), cls(m.top)], ["Top μείον bottom 10%", pct((m.ls ?? NaN) * 100, 2), cls(m.ls)]]
          : [["AUC", fmt(m.auc, 3)], ["Επιτυχία top 10%", ratioPct(m.hit, 1)], ["Μέση επιτυχία", ratioPct(m.base, 1)], ["Top 10% σε R", `${fmt(m.top, 3)}R`, cls(m.top)]])}</div>
        ${m.deciles?.length ? `<div class="small muted" style="margin-bottom:6px">${rank ? "Υπεραπόδοση" : "Αποτέλεσμα σε R"} ανά δεκατημόριο πρόβλεψης, σε δεδομένα που δεν είχε δει</div>${decileBars(m.deciles)}` : ""}
        ${m.folds?.length ? `<details style="margin-top:10px"><summary>Κάθε περίοδος ελέγχου (${m.folds.length})</summary>${m.folds.map((f) => `<div class="meter" style="grid-template-columns:1fr auto auto"><span class="small">${dshort(f.test?.[0])} ${(f.test?.[0] || "").slice(0, 4)}–${dshort(f.test?.[1])} ${(f.test?.[1] || "").slice(0, 4)}</span><span class="num small ${cls(rank ? f.ic : f.top)}">${rank ? `IC ${fmt(f.ic, 3)}` : `AUC ${fmt(f.auc, 3)}`}</span><span class="num small ${cls(f.top)}">${rank ? pct((f.top ?? NaN) * 100, 2) : fmt(f.top, 2) + "R"}</span></div>`).join("")}</details>` : ""}`,
        { right: m.validated ? chip("Επικυρωμένο", "up") : chip("Δεν επικυρώθηκε", "warn"), sub: `Εκπαιδεύτηκε ${dt(m.createdAt)}, ${fmt(m.nTrain, 0)} παραδείγματα, δεδομένα έως ${dday(m.dataEnd)}` }); }).join("") || band("", emptyBox("Δεν υπάρχει ακόμα μοντέλο"))}</div>`;
};
routes.data = async () => {
  const d = D();
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Δεδομένα</h1><p>Η ανάλυση γίνεται κάθε βράδυ στο cloud, μετά το κλείσιμο της αγοράς ΗΠΑ.</p></div>${freshness()}
    ${d ? band("Τελευταία ανάλυση", kv([["Ενημερώθηκε", dt(d.builtAt)], ["Τιμές κλεισίματος", dday(d.asOf)], ["Μετοχές σε ανάλυση", fmt(d.analyzed, 0)], ["Μετοχές με ιστορικό", fmt(d.histTickers, 0)],
      ["Ιστορικό", `${d.historyYears} χρόνια (από ${dday(d.firstDate)})`], ["Ενεργές ευκαιρίες", (d.signals || []).length], ["Επόμενη ενημέρωση", "Κάθε βράδυ Δευτ.–Παρ., γύρω στα μεσάνυχτα ώρα Ελλάδας"], ["Φορτώθηκε στο τηλέφωνο", ago(Data.loadedAt)]])) : ""}
    ${band("Πηγές", `<ul class="list"><li><b>Τιμές:</b> Yahoo Finance, ημερήσιες, όλες οι μετοχές NASDAQ/NYSE/AMEX.</li><li><b>Λίστα μετοχών:</b> Nasdaq Trader και SEC.</li><li><b>Οικονομικά:</b> SEC (επίσημες καταθέσεις XBRL) και Yahoo.</li><li><b>Ειδήσεις:</b> Yahoo, Google News, με ημερομηνία και πηγή.</li><li><b>Τιμές μέσα στη μέρα:</b> Yahoo Finance, κάθε 30′ όσο είναι ανοιχτή η αγορά.</li></ul>`)}
    ${d?.run?.notes ? band("Σημειώσεις ανάλυσης", `<pre class="small soft" style="white-space:pre-wrap;margin:0">${esc(d.run.notes)}</pre>`) : ""}
    <button class="btn block" id="rl">${icon("refresh")}Φόρτωσε ξανά</button></div>`;
  $("#rl").addEventListener("click", async () => { await Data.load(); toast(Data.snap ? "Ενημερώθηκε" : "Δεν φορτώθηκε"); router({ soft: true }); });
};
routes.settings = async () => {
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Εμφάνιση</h1><p>Η εφαρμογή δεν χρειάζεται κωδικούς ούτε ρυθμίσεις: όλα έρχονται έτοιμα από την ανάλυση στο cloud.</p></div>
    ${band("Θέμα", `<button class="btn block" id="themeBtn2">${icon("theme")}Φωτεινό / σκούρο θέμα</button>`)}</div>`;
  $("#themeBtn2").addEventListener("click", toggleTheme);
};
routes.guide = async () => {
  $("#view").innerHTML = `<div class="stack"><div class="page-head"><h1>Οδηγός</h1></div>${band("Εγκατάσταση στο iPhone", installSteps())}
    ${band("Τι να περιμένεις", `<ul class="list"><li>Κάθε βράδυ (Δευτέρα–Παρασκευή), μετά το κλείσιμο της αμερικανικής αγοράς, γίνεται αυτόματα πλήρης ανάλυση όλης της αγοράς στο cloud. Ο υπολογιστής σου δεν χρειάζεται να είναι ανοιχτός.</li>
      <li>Το πρωί βρίσκεις έτοιμες τις ευκαιρίες για την επόμενη συνεδρίαση, με είσοδο, stop και στόχους.</li><li>Όσο είναι ανοιχτή η αμερικανική αγορά (16:30–23:00 ώρα Ελλάδας), οι τιμές ενημερώνονται κάθε 30 λεπτά, με καθυστέρηση έως ~15 λεπτά από την πηγή.</li>
      <li>Ο βοηθός εξηγεί απλά κάθε μετοχή και την αγορά, με τα στοιχεία του συστήματος. Δεν χρειάζεται κανένας κωδικός.</li><li>Είναι ανάλυση, όχι επενδυτική συμβουλή. Καμία αυτόματη εντολή.</li></ul>`)}</div>`;
};
function installSteps() {
  return `<ol class="steps"><li><div>Άνοιξε αυτή τη σελίδα στο <b>Safari</b> του iPhone.</div></li><li><div>Πάτα το κουμπί <b>Κοινοποίηση</b> ${icon("share")} κάτω στη μέση.</div></li><li><div>Διάλεξε <b>«Προσθήκη στην οικ. οθόνη»</b> και μετά «Προσθήκη».</div></li><li><div>Άνοιγε την εφαρμογή από το εικονίδιο <b>US Alpha</b> στην αρχική οθόνη.</div></li></ol>`;
}

// ================================================================== αναζήτηση
async function openSearch() {
  const rows = D()?.rows || [];
  const sh = document.createElement("div"); sh.className = "sheet"; sh.setAttribute("role", "dialog");
  sh.innerHTML = `<div class="sheet-head"><input class="input search-in" id="sIn" placeholder="Σύμβολο ή εταιρεία (π.χ. AEHR)" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="icon-btn" id="sX" aria-label="Κλείσιμο">${icon("x")}</button></div><div class="results" id="sRes"></div>`;
  document.body.appendChild(sh);
  const close = () => sh.remove();
  $("#sX", sh).addEventListener("click", close);
  const render = (q) => {
    const Q = q.trim().toUpperCase(), P = plain(q);
    let hits = [];
    if (Q) { for (const r of rows) { if (r.t === Q) hits.unshift([r, 3]); else if (r.t.startsWith(Q)) hits.push([r, 2]); else if (P.length > 2 && plain(r.n).includes(P)) hits.push([r, 1]); }
      hits.sort((a, b) => b[1] - a[1] || (b[0].dv || 0) - (a[0].dv || 0)); hits = hits.slice(0, 30).map((h) => h[0]);
      if (/^[A-Z^][A-Z0-9.\-]{0,9}$/.test(Q) && !hits.some((h) => h.t === Q)) hits.push({ t: Q, n: "Δοκίμασε αυτό το σύμβολο" }); }
    else hits = App.watch.map((t) => Data.row(t) || { t, n: "" });
    $("#sRes", sh).innerHTML = hits.map((r) => `<a href="#/s/${encodeURIComponent(r.t)}"><b>${esc(r.t)}</b><span class="nm">${esc(r.n || "")}</span><span class="k">${isNum(r.p) ? fmt(r.p) : ""}</span></a>`).join("") || `<div class="empty">Τίποτα δεν ταιριάζει</div>`;
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
    : `<div class="msg bot">Γεια! Γράψε ένα σύμβολο (π.χ. <b>AEHR</b>) και σου την εξηγώ απλά: αν υπάρχει ευκαιρία, πού μπαίνεις, πού βγαίνεις και τι ρισκάρεις. Ή ρώτα «τι κάνει η αγορά σήμερα;».</div>`)
    + (bot.busy ? `<div class="msg bot thinking">Αναλύω…</div>` : "");
  box.scrollTop = box.scrollHeight;
  const t = bot.ticker, chips = t ? [`Εξήγησέ μου την ${t}`, `Πού να βάλω stop στην ${t};`, `Ποια τα ρίσκα της ${t};`] : ["Τι κάνει η αγορά σήμερα;", "Ποιες είναι οι καλύτερες ευκαιρίες;", "Τι βλέπει το μοντέλο;"];
  $("#bChips").innerHTML = chips.map((c) => `<button type="button">${esc(c)}</button>`).join("");
  $$("#bChips button").forEach((b) => b.addEventListener("click", () => botAsk(b.textContent)));
}
function detectTicker(text) {
  const has = (u) => !!Data.row(u);
  const words = text.match(/[A-Za-z][A-Za-z0-9.\-]{0,7}/g) || [], skip = ["AI", "ETF", "RSI", "OK", "ATR", "EMA", "SMA", "USA", "CEO", "A", "I", "IS", "IT", "ON", "SO", "BE", "ALL"];
  for (const w of words) { const u = w.toUpperCase(); if (w === u && has(u) && !skip.includes(u)) return u; }
  for (const w of words) { const u = w.toUpperCase(); if (u.length >= 2 && has(u) && !skip.includes(u)) return u; }
  return null;
}
function explainText(a) {
  const s = simpleStock(a);
  return [`**${a.ticker}: ${s.verdict}**`, s.headline, ...s.pts.map((x) => "• " + x), ...s.model.map((x) => "• " + x), s.plan ? `\n**${s.plan.title}**\n` + (s.plan.lines || []).map((x) => "• " + x).join("\n") : "",
    s.risks.length ? "\n**Προσοχή**\n" + s.risks.map((x) => "• " + x).join("\n") : "", `\nΣτοιχεία κλεισίματος ${dday(a.asOf)}. Ανάλυση, όχι επενδυτική συμβουλή.`].filter(Boolean).join("\n");
}
function marketText() {
  const d = D(); if (!d) return "Δεν έχουν φορτωθεί ακόμα τα αποτελέσματα της ανάλυσης.";
  const m = d.market || {}, R = REGIME[m.regime];
  const sig = (d.signals || []).slice(0, 5).map((s) => `• ${s.ticker} (${HZ[s.horizon] || s.horizon}): είσοδος ${fmt(s.entryLow)}–${fmt(s.entryHigh)}, stop ${fmt(s.stop)}, στόχος ${fmt(s.tp2)}`);
  return [`**${R?.head || "Αγορά"}** (${fmt(m.score, 0)}/100, κλείσιμο ${dday(d.asOf)})`, ...(m.simple || []).map((x) => "• " + x),
    sig.length ? "\n**Καλύτερες ευκαιρίες τώρα**\n" + sig.join("\n") : "\nΚαμία ευκαιρία δεν περνά όλους τους ελέγχους σήμερα."].join("\n");
}
async function botAsk(text) {
  text = (text || "").trim(); if (!text || bot.busy) return;
  bot.hist.push({ r: "u", t: text }); bot.busy = true; botRender();
  let reply;
  try {
    const tk = detectTicker(text) || (/\b(αυτή|αυτήν|την|stop|ρίσκα|μετοχή)\b/i.test(text) ? bot.ticker : null);
    let a = null;
    if (tk) { bot.ticker = tk; $("#bCtx") && ($("#bCtx").textContent = tk); a = App.last?.ticker === tk ? App.last : await Data.stock(tk).catch(() => null); }
    if (AI.enabled()) {
      const d = D();
      const ctx = a ? { ticker: tk, name: a.name, date: a.asOf, price: a.q?.price ?? a.price, live_price: !!a.q, score: a.sc.score, bias: a.sc.bias, components: a.sc.contrib, metrics: a.tech.m, flags: a.tech.flags,
        pros: a.tech.pros, cons: a.tech.cons, risks: [...(a.risk?.warnings || []), ...(a.simple?.risks || [])], plain_summary: a.simple,
        accepted_setups: a.acc.map((s) => ({ horizon: s.horizon, setup: s.setup, entry: [s.entry_low, s.entry_high], stop: s.stop, targets: [s.tp1, s.tp2, s.tp3], rr: s.rr, holding: s.holding })),
        rejected_setups: a.rej.map((s) => ({ setup: s.setup, why: s.why })), model: Object.fromEntries(Object.entries(a.pred || {}).map(([k, p]) => [k, { label: p.label, kind: p.kind, rank_pct: p.rank, p_target: p.p, hist_expect: p.exp, validated: p.validated }])),
        fundamentals: { score: a.fund?.score, ...a.fund?.m, pros: a.fund?.pros, cons: a.fund?.cons }, news: (a.news?.items || []).slice(0, 8).map((n) => ({ date: (n.at || "").slice(0, 10), title: n.title, source: n.source })) }
        : { market: d?.market ? { regime: d.market.regime, score: d.market.score, summary: d.market.simple, sectors: (d.sectors || []).slice(0, 5), as_of: d.asOf } : null,
          opportunities: (d?.signals || []).slice(0, 8).map((s) => ({ ticker: s.ticker, horizon: s.horizon, setup: s.setup, entry: [s.entryLow, s.entryHigh], stop: s.stop, targets: [s.tp1, s.tp2], model_rank: s.rank })),
          model_validated: Object.fromEntries(Object.entries(d?.model || {}).map(([k, m]) => [k, !!m.validated])) };
      const sys = "Είσαι βοηθός ανάλυσης αμερικανικών μετοχών μέσα σε μια εφαρμογή. Απαντάς στα ελληνικά, απλά και σύντομα, σαν να εξηγείς σε φίλο που δεν είναι ειδικός. Χρησιμοποιείς ΜΟΝΟ τα δεδομένα JSON που σου δίνονται· αν κάτι λείπει, το λες. Δεν υπόσχεσαι κέρδη και δεν παρουσιάζεις προβλέψεις ως βεβαιότητες. Αναφέρεις πάντα τα βασικά ρίσκα και τις ημερομηνίες των ειδήσεων. Αν το μοντέλο δεν είναι επικυρωμένο, λες ότι δεν λαμβάνεται υπόψη. Κλείνεις με: «Ανάλυση, όχι επενδυτική συμβουλή.»";
      const hist = bot.hist.slice(-7, -1).map((m) => `${m.r === "u" ? "Χρήστης" : "Βοηθός"}: ${m.t}`).join("\n");
      reply = await AI.ask(sys, `Δεδομένα (JSON):\n${JSON.stringify(ctx)}\n\nΠροηγούμενη συζήτηση:\n${hist}\n\nΕρώτηση: ${text}`);
    } else if (a) reply = explainText(a);
    else if (tk) reply = `Η ${tk} δεν είναι στην ανάλυση (μόνο μετοχές NASDAQ/NYSE/AMEX με αρκετό τζίρο).`;
    else if (/μοντέλο/i.test(text)) { const v = validated(); reply = v.length ? `Επικυρωμένα μοντέλα: ${v.map((h) => D().model[h].label).join(", ")}. Οι κορυφαίες επιλογές είναι στην αρχική, στο «Τι βλέπει το μοντέλο».` : "Το μοντέλο δεν έχει αποδείξει αρκετό πλεονέκτημα σε δεδομένα που δεν είχε δει, γι' αυτό δεν επηρεάζει τις ευκαιρίες. Λεπτομέρειες στο Περισσότερα → Μοντέλο πρόβλεψης."; }
    else reply = marketText();
  } catch (e) { reply = "Δεν ολοκληρώθηκε: " + e.message; }
  bot.hist.push({ r: "b", t: reply || "—" }); bot.busy = false;
  try { sessionStorage.setItem("uam.bot", JSON.stringify(bot.hist.slice(-30))); } catch { /* */ }
  botRender();
}

// ================================================================== ζωντανές τιμές (προαιρετικά)
async function refreshQuotes() {
  await Data.loadQuotes();
  if (!Keys.finnhub) return;
  const d = D(), list = [...new Set([...App.watch, ...(d?.signals || []).slice(0, 12).map((s) => s.ticker), "SPY", "QQQ", "DIA", "IWM"])];
  Object.assign(App.quotes, await quotes(list));
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
  if (location.hash === "#/welcome") location.hash = "#/home";
  await Data.load();
  router();
  refreshQuotes().then(() => { if (Object.keys(App.quotes).length && ["home", "watch", "signals", "scan"].includes(App.route)) router({ soft: true }); });
  setInterval(() => { if (document.visibilityState === "visible") refreshQuotes().then(() => { if (["home", "watch", "signals"].includes(App.route)) router({ soft: true }); }); }, 5 * 60000);
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible") return;
    renderSession();
    if (Date.now() - Data.loadedAt > 15 * 60000) { const old = Data.snap?.builtAt; await Data.load(); if (Data.snap?.builtAt !== old && !["s"].includes(App.route)) { Data.shards.clear(); router({ soft: true }); toast("Νέα ανάλυση φορτώθηκε"); } }
    refreshQuotes().then(() => { if (["home", "watch", "signals"].includes(App.route)) router({ soft: true }); });
  });
}
boot();
