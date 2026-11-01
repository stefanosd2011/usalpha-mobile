/* US Alpha — ενημερώσεις AI πρωί / πριν το άνοιγμα / μετά το κλείσιμο (+ βραδινή ανάλυση).
   Τα δεδομένα έρχονται από το data/ai.json (cloud: notes.yml, υπολογιστής: scheduler). Οι αριθμοί είναι από τον κώδικα·
   το AI γράφει μόνο το κείμενο. Ίδιο αρχείο σε κινητό και υπολογιστή. */
"use strict";

Object.assign(ICONS, {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
});
const SLOT_ICON = { morning: "sun", premarket: "bell", evening: "moon", night: "moon" };
const SLOT_ORDER = ["morning", "premarket", "evening"];
const SLOT_NAME = { morning: "Πρωινή ενημέρωση", premarket: "Πριν το άνοιγμα", evening: "Κλείσιμο Wall Street", night: "Βραδινή ανάλυση" };
const SLOT_SHORT = { morning: ["Πρωί", "~09:15"], premarket: ["Μεσημέρι", "πριν το άνοιγμα"], evening: ["Βράδυ", "~23:15"] };
const TONE = { "θετικό": ["Θετικό κλίμα", "up"], "αρνητικό": ["Αρνητικό κλίμα", "down"], "ουδέτερο": ["Ουδέτερο κλίμα", ""] };
const STRIP = ["ES=F", "NQ=F", "^VIX", "^TNX", "DX-Y.NYB", "CL=F", "GC=F", "BTC-USD", "^GDAXI", "^STOXX50E", "^N225", "^HSI", "EURUSD=X", "YM=F", "RTY=F", "^FTSE"];
const SHORTN = { "ES=F": "S&P fut", "NQ=F": "Nasdaq fut", "YM=F": "Dow fut", "RTY=F": "Russell fut", "^VIX": "VIX", "^TNX": "10ετές", "DX-Y.NYB": "Δολάριο",
  "EURUSD=X": "EUR/USD", "CL=F": "Πετρέλαιο", "GC=F": "Χρυσός", "BTC-USD": "Bitcoin", "^STOXX50E": "Stoxx 50", "^GDAXI": "DAX", "^FTSE": "FTSE", "^N225": "Nikkei", "^HSI": "Hang Seng" };

const hm = (iso) => (iso ? parseISO(iso).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" }) : "");
function briefOf() { return Data.ai?.brief || null; }
function briefFresh(b = briefOf()) { return !!b && Date.now() - Date.parse(b.at) < 20 * 3600e3; }
// οι μετοχές που ενδιαφέρουν τον χρήστη: χαρτοφυλάκιο, «οι προβλέψεις μου», λίστα
function myTickers() {
  const pf = typeof PF !== "undefined" ? PF.list.map((h) => h.t) : [];
  return [...new Set([...pf, ...myList(), ...(App.watch || [])].map((t) => String(t).toUpperCase()))];
}
function moveVal(m) {
  if (m.unit === "bp") return `${fmt(m.p, 2)}%`;
  return m.p >= 1000 ? fmt(m.p, 0) : fmt(m.p, m.p < 10 ? 4 : 2);
}
const moveChg = (m) => (m.unit === "bp" ? `${m.ch > 0 ? "+" : m.ch < 0 ? "−" : ""}${fmt(Math.abs(m.ch), 0)} bp` : pct(m.ch));
// για VIX και αποδόσεις η άνοδος δεν είναι «καλή» για τις μετοχές: χρώμα ανάποδα
const moveCls = (m) => (["^VIX", "^TNX", "DX-Y.NYB"].includes(m.sym) ? cls(-m.ch) : cls(m.ch));

function mktStrip(b, n = 9) {
  const by = Object.fromEntries((b.moves || []).map((m) => [m.sym, m]));
  const list = STRIP.map((s) => by[s]).filter(Boolean).slice(0, n);
  if (!list.length) return "";
  return `<div class="mkt-strip">${list.map((m) => `<span class="mkt"><span class="n">${esc(SHORTN[m.sym] || m.name)}</span><b class="num ${moveCls(m)}">${moveChg(m)}</b></span>`).join("")}</div>`;
}
// «για τις μετοχές σου»: σημείωση AI, κίνηση εκτός ωραρίου/ημέρας και φρέσκια είδηση
function briefMine(b, max = 6) {
  const mine = new Set(myTickers()), out = [];
  const gap = Object.fromEntries((b.gaps || []).map((g) => [g.t, g]));
  for (const t of mine) {
    const note = b.stocks?.[t], g = gap[t], dy = b.day?.[t], nw = (b.news || []).find((n) => n.t === t);
    if (!note && !g && !dy && !nw) continue;
    out.push({ t, note, g, dy, nw });
  }
  return out.slice(0, max);
}
function mineRow(x) {
  const mv = x.g ? `<span class="pill num ${cls(x.g.gap)}">${pct(x.g.gap)}</span>` : x.dy ? `<span class="pill num ${cls(x.dy[1])}">${pct(x.dy[1])}</span>` : "";
  return `<a class="brief-mine" href="#/s/${encodeURIComponent(x.t)}">${logo(x.t)}<div><div class="row1"><b>${esc(x.t)}</b>${mv}</div>
    <div class="txt">${esc(x.note || (x.nw ? `${x.nw.title}` : x.g ? "Κίνηση εκτός ωραρίου" : "Κίνηση ημέρας"))}</div></div></a>`;
}
function slotHead(b, big = false) {
  const t = TONE[b.tone];
  return `<div class="brief-top"><span class="brief-slot">${icon(SLOT_ICON[b.slot] || "spark")}${esc(b.label || SLOT_NAME[b.slot] || "Ενημέρωση")}</span>
    <span class="muted small">${b.nyDate && new Date().toISOString().slice(0, 10) !== b.at.slice(0, 10) ? dshort(b.at) + " · " : ""}${hm(b.at)}</span>${t && big ? chip(t[0], t[1]) : ""}</div>`;
}

// ------------------------------------------------------------------ αρχική: κάρτα ενημέρωσης
function briefHomeCard() {
  const b = briefOf();
  if (!b || !briefFresh(b)) return "";
  const mine = briefMine(b, 3);
  const body = b.summary
    ? `<h3 class="brief-h">${esc(b.headline || "")}</h3><p class="ai-text clamp4">${esc(b.summary)}</p>`
    : `<p class="ai-text">${b.moves?.length ? "Οι αγορές τώρα. Το κείμενο AI γράφεται όταν υπάρχει κλειδί AI." : ""}</p>`;
  return card(`${slotHead(b)}${body}${mktStrip(b)}
    ${mine.length ? `<div class="brief-sub">Για τις μετοχές σου</div><div class="brief-mines">${mine.map(mineRow).join("")}</div>` : ""}
    <a class="btn sm brief-more" href="#/brief">Όλη η ενημέρωση${b.watch?.length ? ` · ${b.watch.length} πράγματα να προσέξεις` : ""}</a>`, "brief");
}

// ------------------------------------------------------------------ σελίδα: όλη η ενημέρωση
routes.brief = async () => {
  if (!Data.ai) await Data.loadAI();
  const b = briefOf(), ai = Data.ai;
  if (!b) {
    $("#view").innerHTML = `<div class="stack"><h1 class="page-title">Ενημερώσεις AI</h1>${card(emptyBox("Δεν υπάρχει ακόμα ενημέρωση", "Οι ενημερώσεις βγαίνουν τρεις φορές τη μέρα: πρωί, πριν ανοίξει η Wall Street και μετά το κλείσιμο."))}
      ${ai?.market ? card(`<div class="ai-head">${icon("spark")}<b>Βραδινή σύνοψη</b><span class="muted small">${dt(ai.at)}</span></div><p class="ai-text">${esc(ai.market)}</p>`) : ""}
      ${Data.server ? `<button class="btn block" id="briefNow">${icon("refresh")}Νέα ενημέρωση τώρα</button>` : ""}</div>`;
    briefNowBtn();
    return;
  }
  const today = [b, ...(ai.history || [])].filter((h) => h.nyDate === b.nyDate);
  const done = new Set(today.map((h) => h.slot));
  const timeline = `<div class="slot-line">${SLOT_ORDER.map((s) => `<span class="slot ${done.has(s) ? "on" : ""} ${b.slot === s ? "cur" : ""}">${icon(SLOT_ICON[s])}<span><b>${SLOT_SHORT[s][0]}</b><small>${s === "premarket" ? esc(b.openGr ? `πριν τις ${b.openGr}` : SLOT_SHORT[s][1]) : SLOT_SHORT[s][1]}</small></span></span>`).join("")}</div>`;
  const stale = !briefFresh(b) ? `<div class="callout">Η τελευταία ενημέρωση είναι από ${dt(b.at)}.</div>` : "";
  const main = card(`${slotHead(b, true)}${b.summary ? `<h3 class="brief-h">${esc(b.headline || "")}</h3><p class="ai-text">${esc(b.summary)}</p>` : `<p class="muted">Χωρίς κείμενο AI (δεν έχει οριστεί κλειδί AI ή δεν απάντησε). Οι αριθμοί παρακάτω ισχύουν κανονικά.</p>`}
    ${b.points?.length ? `<ul class="brief-pts">${b.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}`, "brief");
  const watch = b.watch?.length ? `${sec("Τι να προσέξεις")}${card(`<ol class="brief-watch">${b.watch.map((w) => `<li>${esc(w)}</li>`).join("")}</ol>`)}` : "";
  const risk = b.risk ? `<div class="callout"><b>Κίνδυνος.</b> ${esc(b.risk)}</div>` : "";
  const mine = briefMine(b, 12);
  const mineS = mine.length ? `${sec("Για τις μετοχές σου")}${card(mine.map(mineRow).join(""), "flush pad-rows")}` : "";
  // αγορές ανά ομάδα
  const groups = {}; (b.moves || []).forEach((m) => (groups[m.grp] ||= []).push(m));
  const mk = b.moves?.length ? `${sec("Αγορές τώρα", "", hm(b.at))}${card(Object.entries(groups).map(([g, ms]) => `<div class="mk-grp">${esc(g)}</div>${ms.map((m) => `<div class="mk-row"><span>${esc(m.name)}</span><span class="num">${moveVal(m)}</span><b class="num ${moveCls(m)}">${moveChg(m)}</b></div>`).join("")}`).join(""), "pad-rows")}` : "";
  // εκτός ωραρίου / πριν το άνοιγμα
  const mineSet = new Set(myTickers());
  const gapTitle = b.slot === "premarket" ? "Πριν το άνοιγμα" : "Εκτός ωραρίου";
  const gaps = (b.gaps || []).filter((g) => !["SPY", "QQQ"].includes(g.t));
  const gapS = gaps.length ? `${sec(gapTitle, "", "vs χθεσινό κλείσιμο")}${card(gaps.slice(0, 12).map((g) => { const r = Data.row(g.t);
    return `<a class="row" href="#/s/${encodeURIComponent(g.t)}">${logo(g.t)}<div style="min-width:0"><div class="tk">${esc(g.t)} ${mineSet.has(g.t) ? chip("δική σου", "accent") : ""}</div><div class="nm">${esc(r?.n || "")}</div></div><div class="right"><b class="num">${fmt(g.p)}</b>${chgPill(g.gap)}</div></a>`; }).join(""), "flush")}` : "";
  // κλείσιμο ημέρας
  const mv = b.movers || {};
  const closeS = b.slot === "evening" && (mv.up?.length || mv.down?.length) ? `${sec("Η μέρα στη Wall Street", "", mv.breadth ? `${mv.breadth.up} ανέβηκαν · ${mv.breadth.down} έπεσαν` : "")}
    <div class="wide2"><div>${card(`<div class="mk-grp">Μεγαλύτερες άνοδοι</div>${(mv.up || []).slice(0, 6).map((x) => moverRow(x)).join("")}`, "pad-rows")}</div>
    <div>${card(`<div class="mk-grp">Μεγαλύτερες πτώσεις</div>${(mv.down || []).slice(0, 6).map((x) => moverRow(x)).join("")}`, "pad-rows")}</div></div>
    ${mv.sectors?.length ? card(`<div class="mk-grp">Κλάδοι σήμερα (μέση κίνηση)</div>${mv.sectors.map((s) => `<div class="mk-row"><span>${esc(s.sector)}</span><span class="muted small">${s.n}</span><b class="num ${cls(s.avg)}">${pct(s.avg)}</b></div>`).join("")}`, "pad-rows") : ""}` : "";
  const notes = Object.entries(b.stocks || {});
  const notesS = notes.length ? `${sec("Σημειώσεις για μετοχές")}${card(notes.map(([t, txt]) => `<a class="brief-mine" href="#/s/${encodeURIComponent(t)}">${logo(t)}<div><div class="row1"><b>${esc(t)}</b>${mineSet.has(t) ? chip("δική σου", "accent") : ""}</div><div class="txt">${esc(txt)}</div></div></a>`).join(""), "flush pad-rows")}` : "";
  const newsS = b.news?.length ? `${sec("Φρέσκες ειδήσεις", "", "τελευταίες ώρες")}${card(b.news.slice(0, 15).map(newsItem).join(""), "flush")}` : "";
  const hist = (ai.history || []).filter((h) => h.summary);
  const histS = hist.length ? `${sec("Νωρίτερα")}${card(hist.map((h) => `<details class="hist"><summary>${icon(SLOT_ICON[h.slot] || "spark")}<span><b>${esc(h.label || SLOT_NAME[h.slot])}</b> <span class="muted small">${dshort(h.at)} ${hm(h.at)}</span><br><span class="small">${esc(h.headline || "")}</span></span></summary><p class="ai-text">${esc(h.summary)}</p></details>`).join(""), "flush")}` : "";
  const night = ai.market && ai.at && (!b || Date.parse(ai.at) > Date.now() - 36 * 3600e3) ? `${sec("Βραδινή σύνοψη της ανάλυσης")}${card(`<p class="ai-text">${esc(ai.market)}</p><div class="small muted">${dt(ai.at)}</div>`)}` : "";
  $("#view").innerHTML = `<div class="stack"><div><h1 class="page-title">Ενημερώσεις AI</h1><p class="page-sub">Τρεις φορές τη μέρα, ώρα Ελλάδας: πρωί, μεσημέρι πριν ανοίξει η Wall Street (${esc(b.openGr || "16:30")}) και βράδυ μετά το κλείσιμο. Τιμές Yahoo, πιθανή καθυστέρηση.</p></div>
    ${timeline}${stale}${main}${risk}${mineS}${watch}${gapS}${closeS}${mk}${notesS}${newsS}${night}${histS}
    ${Data.server ? `<button class="btn block" id="briefNow">${icon("refresh")}Νέα ενημέρωση τώρα</button>` : ""}
    <div class="small muted" style="text-align:center">${b.ai ? `Γράφτηκε από AI (${esc(b.model || "")}) μόνο με τα δεδομένα που φαίνονται εδώ. Μπορεί να κάνει λάθος.` : ""} Ανάλυση, όχι επενδυτική συμβουλή.</div></div>`;
  briefNowBtn();
};
// υπολογιστής: νέα ενημέρωση τώρα (χρειάζεται ~1-2 λεπτά)
function briefNowBtn() {
  $("#briefNow")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    const j = await fetch("api/brief/run", { method: "POST" }).then((r) => r.json()).catch(() => null);
    if (j?.status !== "started") { btn.disabled = false; return toast("Δεν ξεκίνησε, δοκίμασε ξανά", "high"); }
    toast(`Ετοιμάζεται: ${esc(j.label)} (1-2 λεπτά)`);
    const was = Data.ai?.brief?.at;
    for (let i = 0; i < 24; i++) { await sleep(10000); await Data.loadAI(); if (Data.ai?.brief?.at && Data.ai.brief.at !== was) { toast("Η ενημέρωση είναι έτοιμη"); if (App.route === "brief") router({ soft: true }); return; } }
    btn.disabled = false;
  });
}
function moverRow(x) {
  return `<a class="mk-row" href="#/s/${encodeURIComponent(x.t)}"><span><b>${esc(x.t)}</b> <span class="muted small">${esc((x.name || "").slice(0, 22))}</span></span><span class="num">${fmt(x.p)}</span><b class="num ${cls(x.ch)}">${pct(x.ch)}</b></a>`;
}

// ------------------------------------------------------------------ σελίδα μετοχής: η πιο πρόσφατη σημείωση
function briefStockNote(t) {
  const b = briefOf(); t = String(t || "").toUpperCase();
  if (!b || !briefFresh(b)) return null;
  const g = (b.gaps || []).find((x) => x.t === t), dy = b.day?.[t];
  if (!b.stocks?.[t] && !g && !dy) return null;
  return { label: b.label, at: b.at, text: b.stocks?.[t] || null, gap: g?.gap, gapP: g?.p, day: dy?.[1], slot: b.slot };
}
function briefStockCard(t) {
  const n = briefStockNote(t);
  if (!n) return "";
  const mv = isNum(n.gap) ? `${n.slot === "premarket" ? "Πριν το άνοιγμα" : "Εκτός ωραρίου"}: <b class="num ${cls(n.gap)}">${pct(n.gap)}</b> (${fmt(n.gapP)})` : isNum(n.day) ? `Σήμερα: <b class="num ${cls(n.day)}">${pct(n.day)}</b>` : "";
  return card(`<div class="ai-head">${icon(SLOT_ICON[n.slot] || "spark")}<b>${esc(n.label)}</b><span class="muted small">${hm(n.at)}</span></div>${n.text ? `<p class="ai-text">${esc(n.text)}</p>` : ""}${mv ? `<div class="small">${mv}</div>` : ""}`);
}

// ------------------------------------------------------------------ για τον βοηθό
function briefCtx() {
  const b = briefOf();
  if (!b) return null;
  return { slot: b.label, at: b.at, headline: b.headline, summary: b.summary, points: b.points, watch: b.watch, risk: b.risk,
    global_markets: (b.moves || []).map((m) => ({ name: m.name, value: m.p, change: m.ch, unit: m.unit })),
    outside_hours_moves: (b.gaps || []).slice(0, 12).map((g) => ({ ticker: g.t, price: g.p, gap_pct: g.gap })),
    stock_notes: b.stocks, fresh_news: (b.news || []).slice(0, 10).map((n) => ({ ticker: n.t, title: n.title, source: n.source, at: n.at })) };
}
function briefText() {
  const b = briefOf();
  if (!b) return "Δεν υπάρχει ακόμα ενημέρωση AI για σήμερα. Βγαίνουν τρεις φορές τη μέρα: πρωί, πριν ανοίξει η Wall Street και μετά το κλείσιμο.";
  const mv = (b.moves || []).filter((m) => ["ES=F", "NQ=F", "^VIX", "^TNX", "CL=F", "GC=F", "BTC-USD"].includes(m.sym)).map((m) => `${SHORTN[m.sym]} ${moveChg(m)}`).join(" · ");
  return [`**${b.label}** (${dt(b.at)})`, b.headline ? `**${b.headline}**` : "", b.summary || "", b.points?.length ? b.points.map((p) => `• ${p}`).join("\n") : "",
    mv ? `\nΑγορές τώρα: ${mv}` : "", b.watch?.length ? `\n**Τι να προσέξεις**\n${b.watch.map((w) => `• ${w}`).join("\n")}` : "", b.risk ? `\n**Κίνδυνος:** ${b.risk}` : "",
    "\nΌλη η ενημέρωση: Αρχική → «Όλη η ενημέρωση». Ανάλυση, όχι επενδυτική συμβουλή."].filter(Boolean).join("\n");
}
