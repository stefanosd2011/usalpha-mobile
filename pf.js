"use strict";
// US Alpha — Χαρτοφυλάκιο και Στόχος (ίδια σε κινητό και υπολογιστή).
// Οι θέσεις μένουν ΜΟΝΟ στη συσκευή (localStorage). Τίποτα δεν στέλνεται πουθενά.
// Ό,τι δείχνει εδώ είναι ανάλυση με τα στοιχεία του συστήματος, όχι επενδυτική συμβουλή ή εντολή.

// ================================================================== δεδομένα χαρτοφυλακίου
const PF = {
  get list() { return store.get("pf", []); },
  save(l) { store.set("pf", l.filter((h) => h && h.t && h.sh > 0)); },
  get cash() { return Number(store.get("pfCash", 0)) || 0; },
  set cash(v) { store.set("pfCash", Math.max(0, Number(v) || 0)); },
  get goal() { return store.get("goal", null); },
  set goal(g) { store.set("goal", g); },
};
const fxRate = () => (isNum(D()?.fx?.eurusd) && D().fx.eurusd > 0.5 ? D().fx.eurusd : null); // δολάρια ανά 1 ευρώ
const toEur = (usd) => (isNum(usd) && fxRate() ? usd / fxRate() : null);
const toUsd = (eur) => (isNum(eur) && fxRate() ? eur * fxRate() : null);
const rnd = (v, d) => Math.round(v * 10 ** d) / 10 ** d || 0; // χωρίς «−0»
const eur = (v, d = 0) => (isNum(v) ? `${rnd(v, d) < 0 ? "−" : ""}${Math.abs(rnd(v, d)).toLocaleString("el-GR", { maximumFractionDigits: d, minimumFractionDigits: d })} €` : "—");
const usd = (v, d = 0) => (isNum(v) ? `${rnd(v, d) < 0 ? "−" : ""}$${Math.abs(rnd(v, d)).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d })}` : "—");
const both = (v$) => (fxRate() ? `${eur(toEur(v$))} <span class="muted small">(${usd(v$)})</span>` : usd(v$));
const sigmaDay = (atrPct) => (isNum(atrPct) && atrPct > 0 ? atrPct / 100 / 1.4 : 0.02); // ATR% → ημερήσια τυπική απόκλιση (προσέγγιση)
const RHO = 0.35; // μέση συσχέτιση μετοχών ΗΠΑ (υπόθεση για το εύρος του χαρτοφυλακίου)

function pfCalc() {
  const d = D(), hs = PF.list.map((h) => {
    const r = Data.row(h.t) || {}, price = curPx(h.t, r.p), chg = curCh(h.t, r.ch);
    const value = isNum(price) ? h.sh * price : null, cost = h.sh * h.px;
    return { ...h, r, price, chg, value, cost, pl: isNum(value) ? value - cost : null, plPct: isNum(value) && cost ? (value / cost - 1) * 100 : null,
      day: isNum(value) && isNum(chg) ? value - value / (1 + chg / 100) : null, sec: r.sec || "Άγνωστος κλάδος" };
  });
  const val = hs.reduce((s, h) => s + (h.value || 0), 0), cost = hs.reduce((s, h) => s + h.cost, 0), day = hs.reduce((s, h) => s + (h.day || 0), 0);
  hs.forEach((h) => { h.w = val ? (h.value || 0) / val : 0; });
  // ρίσκο: ημερήσια διακύμανση χαρτοφυλακίου με μέση συσχέτιση RHO
  let v2 = 0;
  hs.forEach((a) => hs.forEach((b) => { v2 += a.w * b.w * sigmaDay(a.r.atr) * sigmaDay(b.r.atr) * (a === b ? 1 : RHO); }));
  const sd = Math.sqrt(v2), sm = sd * Math.sqrt(21);
  // διασπορά: πόσες «πραγματικές» θέσεις και πόσο βαρύς ο μεγαλύτερος κλάδος
  const secW = {}; hs.forEach((h) => { secW[h.sec] = (secW[h.sec] || 0) + h.w; });
  const maxSec = Math.max(0, ...Object.values(secW)), neff = hs.length ? 1 / hs.reduce((s, h) => s + h.w * h.w, 0) : 0;
  const quality = hs.length ? hs.reduce((s, h) => s + h.w * (isNum(h.r.s) ? h.r.s : 50), 0) : null;
  const rk = hs.map((h) => [h.w, rankOf(h.r, "rank21")]).filter(([, x]) => x);
  const model = rk.length ? rk.reduce((s, [w, x]) => s + w * x.v, 0) / rk.reduce((s, [w]) => s + w, 0) * 100 : null;
  const diversity = hs.length ? clamp((Math.min(neff, 10) / 10) * 70 + (1 - maxSec) * 30) : null;
  const risk = hs.length ? clamp(100 - (sd * 100 - 1) * 25) : null;
  const parts = [[quality, 0.35], [model, 0.25], [diversity, 0.2], [risk, 0.2]].filter(([x]) => isNum(x));
  const score = parts.length ? parts.reduce((s, [x, w]) => s + x * w, 0) / parts.reduce((s, [, w]) => s + w, 0) : null;
  return { hs, val, cost, day, pl: val - cost, plPct: cost ? (val / cost - 1) * 100 : null, sd, sm, secW, maxSec, neff, quality, model, diversity, risk, score, asOf: d?.asOf };
}

// τι λέει το σύστημα για μία θέση (ανάλυση, όχι εντολή)
function pfAdvice(h) {
  const r = h.r || {}, rk = rankOf(r, "rank21"), s = r.s, atr = r.atr, px = h.price;
  const sig = (D()?.signals || []).find((x) => x.ticker === h.t), dshort = (D()?.day?.short || []).some((c) => c.ticker === h.t);
  const strong = isNum(s) && s >= 65 && (!rk || rk.v >= 0.6) && r.b !== "bearish";
  const weak = (isNum(s) && s <= 35) || r.b === "bearish" || (rk && rk.v <= 0.25) || (sig && sig.bias === "bearish") || dshort;
  const tone = strong ? "up" : weak ? "down" : "neutral";
  const head = strong ? "Δυνατή εικόνα" : weak ? "Αδύναμη εικόνα" : "Ουδέτερη εικόνα";
  const lines = [];
  if (isNum(s)) lines.push(`Βαθμολογία συστήματος ${s.toFixed(0)}/100${rk ? `, μοντέλο 1 μήνα: ${topPct(rk.v)} της αγοράς${rk.ok ? "" : " (ενδεικτικό)"}` : ""}.`);
  const stop = isNum(px) && isNum(atr) ? px * (1 - 1.5 * atr / 100) : null;
  if (sig && sig.bias !== "bearish") lines.push(`Σήμερα υπάρχει σχέδιο εισόδου (${HZ[sig.horizon] || sig.horizon}): ζώνη ${fmt(sig.entryLow)}–${fmt(sig.entryHigh)}, stop ${fmt(sig.stop)}, στόχος ${fmt(sig.tp2)}.`);
  if (sig && sig.bias === "bearish") lines.push("Το σύστημα βλέπει σήμερα πτωτικό σχέδιο για αυτή τη μετοχή.");
  if (dshort) lines.push("Είναι στις υποψήφιες short day trade για αύριο: πίεση προς τα κάτω.");
  if (isNum(h.plPct) && h.plPct >= 20 && isNum(r.rsi) && r.rsi >= 70) lines.push(`Κέρδος ${pct(h.plPct, 0)} και RSI ${r.rsi.toFixed(0)}: ανέβηκε γρήγορα. Πολλοί κατοχυρώνουν μέρος (π.χ. 1/3) και ανεβάζουν το stop.`);
  if (isNum(h.plPct) && h.plPct <= -15 && weak) lines.push(`Χάνει ${pct(h.plPct, 0)} και η εικόνα είναι αδύναμη: αξίζει να ξανασκεφτείς αν ισχύει ακόμα ο λόγος που την πήρες.`);
  if (stop) lines.push(`Λογικό stop για εβδομάδες: γύρω στα ${fmt(stop)} (1,5 × η μέση ημερήσια κίνηση κάτω από την τιμή). Ποτέ δεν το κατεβάζεις.`);
  return { tone, head, lines };
}

// υποψήφιες από τη σημερινή ανάλυση (όχι όσες έχεις ήδη), προτίμηση σε κλάδους που λείπουν
function pfCandidates(capUsd, profile = "mid", n = 6) {
  const d = D(); if (!d) return [];
  const own = new Set(PF.list.map((h) => h.t)), secW = pfCalc().secW, riskPct = { low: 0.5, mid: 1, high: 1.5 }[profile] || 1;
  const maxAtr = { low: 2.5, mid: 4.5, high: 99 }[profile] || 4.5, maxPos = { low: 0.12, mid: 0.18, high: 0.25 }[profile] || 0.18;
  const out = [], seen = new Set();
  const add = (t, why, entry, stop, kind) => {
    const r = Data.row(t); if (!r || own.has(t) || seen.has(t) || !isNum(entry) || !isNum(stop) || entry <= stop) return;
    if (isNum(r.atr) && r.atr > maxAtr) return;
    seen.add(t);
    const riskUsd = capUsd * riskPct / 100, sh = Math.min(riskUsd / (entry - stop), (capUsd * maxPos) / entry);
    out.push({ t, n: r.n, sec: r.sec, why, entry, stop, kind, sh, amt: sh * entry, newSec: !secW[r.sec || ""], s: r.s, atr: r.atr, rk: rankOf(r, "rank21") });
  };
  for (const s of d.signals || []) if (s.bias !== "bearish") add(s.ticker, `${HZ[s.horizon] || s.horizon}: ${s.setup || "σχέδιο εισόδου"}`, s.entry ?? (s.entryLow + s.entryHigh) / 2, s.stop, "sig");
  const top = (d.rows || []).filter((r) => (r.dv || 0) >= 20e6 && isNum(r.s) && r.s >= 60 && r.b !== "bearish" && rankOf(r, "rank21")?.v >= 0.8)
    .sort((a, b) => rankOf(b, "rank21").v - rankOf(a, "rank21").v);
  for (const r of top) add(r.t, `Μοντέλο 1 μήνα: ${topPct(rankOf(r, "rank21").v)}, βαθμολογία ${r.s.toFixed(0)}`, r.p, r.p * (1 - 1.5 * (r.atr || 3) / 100), "model");
  out.sort((a, b) => (b.newSec - a.newSec) || ((b.kind === "sig") - (a.kind === "sig")) || ((b.s || 0) - (a.s || 0)));
  return out.slice(0, n);
}
const candRow = (c) => `<a class="row" href="#/s/${encodeURIComponent(c.t)}">${logo(c.t)}<div style="min-width:0"><div class="tk">${esc(c.t)} ${c.newSec ? chip("νέος κλάδος", "accent") : ""}</div><div class="nm">${esc(c.why)}</div></div>
  <div class="right"><b class="num">${fmt(c.sh, c.sh < 10 ? 2 : 0)} μτχ</b><span class="small muted">${fxRate() ? eur(toEur(c.amt)) : usd(c.amt)} · stop ${fmt(c.stop)}</span></div></a>`;

// ================================================================== σελίδα χαρτοφυλακίου
function pfSummaryCard(p, compact = false) {
  const g = PF.goal, cashEur = PF.cash, totalEur = (toEur(p.val) || 0) + cashEur;
  const head = `<div class="pf-top"><div><div class="muted small">Αξία χαρτοφυλακίου</div><div class="pf-val num">${fxRate() ? eur(totalEur) : usd(p.val)}</div>
    <div class="small"><span class="${cls(p.day)}">${fxRate() ? eur(toEur(p.day)) : usd(p.day)} σήμερα</span> · <span class="${cls(p.pl)}">${fxRate() ? eur(toEur(p.pl)) : usd(p.pl)} (${pct(p.plPct, 1)}) συνολικά</span></div></div>${ring(p.score, "lg")}</div>`;
  const goal = g ? goalBar(g, totalEur) : "";
  if (compact) return `<a class="card pf-card" href="#/pf">${head}${goal}</a>`;
  return card(head + goal);
}
function goalBar(g, nowEur) {
  const prog = clamp(((nowEur - g.start) / Math.max(1, g.target - g.start)) * 100, 0, 100);
  const months = (Date.now() - Date.parse(g.created)) / (30.44 * 864e5), timeP = clamp((months / g.months) * 100, 0, 100);
  const ahead = prog >= timeP - 3;
  return `<div class="goal-bar"><div class="small" style="display:flex;justify-content:space-between"><span>Στόχος ${eur(g.target)} σε ${goalPeriod(g.months)}</span><b class="${ahead ? "up" : "warn"}">${prog.toFixed(0)}%</b></div>
    <div class="pbar"><i style="width:${Math.max(2, prog)}%"></i><s style="left:${timeP}%"></s></div><div class="small muted">${ahead ? "Μέσα στην πορεία" : "Πίσω από την πορεία"} · έχει περάσει το ${timeP.toFixed(0)}% του χρόνου</div></div>`;
}
const goalPeriod = (m) => (m < 12 ? `${m} μήνες` : m === 12 ? "1 χρόνο" : `${(m / 12).toLocaleString("el-GR", { maximumFractionDigits: 1 })} χρόνια`);

routes.pf = async () => {
  const d = D();
  if (!d) { $("#view").innerHTML = `<div class="stack">${freshness()}</div>`; return; }
  const p = pfCalc(), hs = p.hs;
  const bars = [["Ποιότητα μετοχών", p.quality, "Μέση βαθμολογία συστήματος, ζυγισμένη με το βάρος κάθε θέσης."], ["Τι λένε τα μοντέλα (1 μήνας)", p.model, "Πού βρίσκονται οι μετοχές σου στην κατάταξη της αγοράς."],
    ["Διασπορά", p.diversity, `${fmt(p.neff, 1)} «πραγματικές» θέσεις, μεγαλύτερος κλάδος ${pct(p.maxSec * 100, 0).replace("+", "")}.`], ["Ήρεμο (χαμηλό ρίσκο)", p.risk, `Κινείται περίπου ±${fmt(p.sd * 100, 1)}% τη μέρα.`]];
  const scoreC = hs.length ? card(`<h3>Βαθμολογία χαρτοφυλακίου</h3>${bars.map(([n, v, x]) => `<div class="meter"><span>${n}</span><div class="bar"><i style="width:${clamp(v ?? 0)}%;background:${(v ?? 0) >= 60 ? "var(--up)" : (v ?? 0) <= 40 ? "var(--down)" : "var(--warn)"}"></i></div><b class="num">${isNum(v) ? v.toFixed(0) : "—"}</b></div><div class="small muted" style="margin:-2px 0 8px">${x}</div>`).join("")}`) : "";
  const vm = p.val, lo1 = vm * (Math.exp(-p.sm) - 1), hi1 = vm * (Math.exp(p.sm) - 1), bad = vm * (Math.exp(-2 * p.sm) - 1);
  const mtxt = !isNum(p.model) ? "Δεν υπάρχει ακόμα πρόβλεψη κατάταξης για τις μετοχές σου." : p.model >= 60 ? "Τα μοντέλα βλέπουν τις μετοχές σου, κατά μέσο όρο, πάνω από τη μέση της αγοράς για τον επόμενο μήνα." : p.model <= 40 ? "Τα μοντέλα βλέπουν τις μετοχές σου, κατά μέσο όρο, κάτω από τη μέση της αγοράς για τον επόμενο μήνα." : "Τα μοντέλα βλέπουν τις μετοχές σου κοντά στη μέση της αγοράς.";
  const anyOk = Object.values(d.model || {}).some((m) => m.validated) || Object.values(d.model4?.models || {}).some((m) => m.active);
  const outlook = hs.length ? card(`<h3>Πώς μπορεί να πάει τον επόμενο μήνα</h3><p class="soft" style="margin-top:0">${esc(mtxt)}${anyOk ? "" : " Τα μοντέλα δεν έχουν ακόμα επικυρωθεί, οπότε είναι μόνο ένδειξη."}</p>
    ${kv([["Συνήθες εύρος (2 στους 3 μήνες)", `${fxRate() ? eur(toEur(lo1)) : usd(lo1)} έως +${fxRate() ? eur(toEur(hi1)).replace("−", "") : usd(hi1)}`], ["Κακός μήνας (1 στους 20)", fxRate() ? eur(toEur(bad)) : usd(bad), "down"]])}
    <div class="small muted" style="margin-top:8px">Υπολογίζεται από το πόσο κινούνται οι μετοχές σου (μεταβλητότητα), όχι από πρόβλεψη κατεύθυνσης. Το πραγματικό αποτέλεσμα μπορεί να βγει και έξω από το εύρος.</div>`) : "";
  const rows = hs.map((h) => { const a = pfAdvice(h);
    return `<div class="pf-h"><a class="row" href="#/s/${encodeURIComponent(h.t)}">${logo(h.t)}<div style="min-width:0"><div class="tk">${esc(h.t)} <span class="muted small">${fmt(h.sh, h.sh % 1 ? 3 : 0)} × ${fmt(h.px)}</span></div><div class="nm">${esc(h.r.n || "")}</div></div>
      <div class="right"><b class="num">${fxRate() ? eur(toEur(h.value)) : usd(h.value)}</b><span class="small num ${cls(h.plPct)}">${pct(h.plPct, 1)}</span></div></a>
      <details><summary>${chip(a.head, a.tone === "up" ? "up" : a.tone === "down" ? "down" : "")} <span class="small muted">${pct(h.w * 100, 0).replace("+", "")} του χαρτοφυλακίου</span></summary><ul class="list">${a.lines.map((x) => `<li><span>${esc(x)}</span></li>`).join("")}</ul>
        <div class="grid2" style="margin-top:10px"><button class="btn sm" data-pfedit="${esc(h.id)}">Αλλαγή</button><button class="btn sm" data-pfdel="${esc(h.id)}">${icon("trash")}Αφαίρεση</button></div></details></div>`; }).join("");
  const capUsd = Math.max(p.val + (toUsd(PF.cash) || 0), toUsd(1000) || 1000);
  const cands = pfCandidates(capUsd, store.get("goal")?.risk || "mid");
  $("#view").innerHTML = `<div class="stack"><div><h1 class="page-title">Χαρτοφυλάκιο</h1><p class="page-sub">Οι θέσεις σου μένουν μόνο σε αυτή τη συσκευή. Τιμές ${Data.quotesAt ? dt(new Date(Data.quotesAt).toISOString()) : `κλεισίματος ${dday(d.asOf)}`}${fxRate() ? `, 1 € = ${fmt(fxRate(), 4)} $` : ""}.</p></div>
    ${hs.length ? pfSummaryCard(p) : ""}
    <div class="grid2"><button class="btn primary" id="pfAdd">${icon("plus")}Πρόσθεσε μετοχή</button><button class="btn primary" id="pfShot">${icon("camera")}Από φωτογραφία</button></div>
    <a class="btn block" href="#/goal">${icon("target")}${PF.goal ? "Ο στόχος μου" : "Βάλε στόχο (π.χ. 1000 € → 2000 €)"}</a>
    ${hs.length ? `<div class="wide2"><div class="stack">${card(rows, "flush")}${outlook}</div><div class="stack">${scoreC}</div></div>`
      : card(emptyBox("Δεν έχεις βάλει ακόμα μετοχές", "Πάτα «Από φωτογραφία» και διάλεξε screenshot από τον broker σου, ή «Πρόσθεσε μετοχή» για μία-μία."))}
    ${sec("Τι θα μπορούσες να εξετάσεις", "", "από τη σημερινή ανάλυση")}${card(cands.length ? cands.map(candRow).join("") + `<div class="small muted" style="padding:10px 16px">Ποσότητα για ρίσκο περίπου ${{ low: "0,5", mid: "1", high: "1,5" }[store.get("goal")?.risk || "mid"]}% του κεφαλαίου ως το stop. Κλάσματα μετοχών μόνο αν τα επιτρέπει ο broker σου.</div>` : emptyBox("Καμία κατάλληλη υποψήφια σήμερα", "Η αναμονή είναι κι αυτή θέση."), "flush")}
    ${card(`<h3>Μετρητά</h3><form id="cashF" style="display:flex;gap:8px"><input class="input" name="c" inputmode="decimal" placeholder="Μετρητά σε €" value="${PF.cash || ""}"><button class="btn">Αποθήκευση</button></form>
      <div class="grid2" style="margin-top:12px"><button class="btn sm" id="pfExp">Μεταφορά σε άλλη συσκευή</button><button class="btn sm" id="pfImp">Εισαγωγή από άλλη συσκευή</button></div>`)}
    <div class="note">Ανάλυση με τα στοιχεία του συστήματος, όχι επενδυτική συμβουλή. Καμία εντολή δεν εκτελείται από την εφαρμογή.</div></div>`;
  $("#pfAdd").addEventListener("click", () => pfForm());
  $("#pfShot").addEventListener("click", () => pfImport());
  $$("[data-pfedit]").forEach((b) => b.addEventListener("click", () => pfForm(PF.list.find((h) => h.id === b.dataset.pfedit))));
  $$("[data-pfdel]").forEach((b) => b.addEventListener("click", () => { PF.save(PF.list.filter((h) => h.id !== b.dataset.pfdel)); router({ soft: true }); }));
  $("#cashF").addEventListener("submit", (e) => { e.preventDefault(); PF.cash = String(new FormData(e.target).get("c")).replace(",", "."); toast("Αποθηκεύτηκε"); router({ soft: true }); });
  $("#pfExp").addEventListener("click", async () => { const code = btoa(unescape(encodeURIComponent(JSON.stringify({ pf: PF.list, cash: PF.cash, goal: PF.goal, my: myList() }))));
    try { await navigator.clipboard.writeText(code); toast("Αντιγράφηκε. Στην άλλη συσκευή: Χαρτοφυλάκιο → Εισαγωγή → επικόλληση."); } catch { prompt("Αντίγραψε αυτόν τον κωδικό", code); } });
  $("#pfImp").addEventListener("click", () => { const code = prompt("Επικόλλησε τον κωδικό μεταφοράς"); if (!code) return;
    try { const j = JSON.parse(decodeURIComponent(escape(atob(code.trim())))); if (Array.isArray(j.pf)) PF.save(j.pf); if (isNum(j.cash)) PF.cash = j.cash; if (j.goal) PF.goal = j.goal; if (Array.isArray(j.my)) setMy(j.my); toast("Έγινε εισαγωγή"); router({ soft: true }); }
    catch { toast("Ο κωδικός δεν είναι σωστός", "high"); } });
};

// φόρμα θέσης: σύμβολο (με αναζήτηση), μετοχές, τιμή αγοράς σε $
function pfForm(h = null, t0 = null) {
  const sh = document.createElement("div"); sh.className = "sheet"; sh.setAttribute("role", "dialog");
  const t = h?.t || t0 || "", r = Data.row(t);
  sh.innerHTML = `<div class="sheet-head"><b style="flex:1">${h ? "Αλλαγή θέσης" : "Νέα θέση"}</b><button class="round-btn" id="pX" aria-label="Κλείσιμο">${icon("x")}</button></div>
    <form id="pF" class="form" style="padding:0 16px 24px;display:grid;gap:14px">
      <label class="field"><b>Μετοχή</b><button type="button" class="input" id="pT" style="text-align:left">${t ? `${esc(t)} ${r?.n ? `· ${esc(r.n)}` : ""}` : "Διάλεξε μετοχή"}</button></label>
      <label class="field"><b>Πόσες μετοχές έχεις</b><input class="input" name="sh" inputmode="decimal" required value="${h?.sh ?? ""}" placeholder="π.χ. 10 ή 0,5"></label>
      <label class="field"><b>Μέση τιμή αγοράς σε $</b><input class="input" name="px" inputmode="decimal" required value="${h?.px ?? (r?.p ?? "")}" placeholder="π.χ. 182,40"></label>
      <label class="field"><b>Ημερομηνία αγοράς (προαιρετικό)</b><input class="input" type="date" name="d" value="${h?.d || ""}"></label>
      <button class="btn primary block">${h ? "Αποθήκευση" : "Προσθήκη"}</button></form>`;
  document.body.appendChild(sh);
  let tk = t;
  $("#pX", sh).addEventListener("click", () => sh.remove());
  $("#pT", sh).addEventListener("click", () => openSearch((x) => { tk = x; const rr = Data.row(x); $("#pT", sh).textContent = `${x}${rr?.n ? " · " + rr.n : ""}`; if (!$("[name=px]", sh).value && rr?.p) $("[name=px]", sh).value = rr.p; }));
  $("#pF", sh).addEventListener("submit", (e) => {
    e.preventDefault(); const f = new FormData(e.target), num = (k) => parseFloat(String(f.get(k)).replace(/\s/g, "").replace(",", "."));
    const shN = num("sh"), pxN = num("px");
    if (!tk) { toast("Διάλεξε μετοχή", "high"); return; }
    if (!(shN > 0) || !(pxN > 0)) { toast("Γράψε αριθμό μετοχών και τιμή μεγαλύτερα από 0", "high"); return; }
    const l = PF.list, item = { id: h?.id || Math.random().toString(36).slice(2, 9), t: tk.toUpperCase(), sh: shN, px: pxN, d: f.get("d") || "" };
    PF.save(h ? l.map((x) => (x.id === h.id ? item : x)) : [...l, item]); sh.remove(); toast(h ? "Αποθηκεύτηκε" : `Η ${item.t} μπήκε στο χαρτοφυλάκιο`); router({ soft: true });
  });
}

// ================================================================== στόχος (π.χ. 1000 € → 2000 €)
// απαιτούμενη ετήσια απόδοση με αρχικό κεφάλαιο και μηνιαία κατάθεση
function needAnnual(P, T, months, C) {
  const fv = (i) => P * (1 + i) ** months + (i ? C * (((1 + i) ** months - 1) / i) : C * months);
  if (fv(0) >= T) return 0;
  let lo = 0, hi = 1;
  while (fv(hi) < T && hi < 50) hi *= 2;
  for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (fv(m) < T) lo = m; else hi = m; }
  return (1 + hi) ** 12 - 1;
}
function monthsTo(P, T, C, annual) { const i = (1 + annual) ** (1 / 12) - 1; let v = P, m = 0; while (v < T && m < 720) { v = v * (1 + i) + C; m++; } return m < 720 ? m : null; }
function monthlyNeeded(P, T, months, annual) { const i = (1 + annual) ** (1 / 12) - 1, g = (1 + i) ** months; return Math.max(0, (T - P * g) * i / (g - 1)); }
// προσομοίωση (υποθέσεις από την ιστορική συμπεριφορά της αγοράς, ΟΧΙ πρόβλεψη)
const STRATS = [
  { k: "idx", n: "Δείκτης (π.χ. S&P 500)", mu: 0.08, sd: 0.17, x: "Πολλές μετοχές μαζί, χαμηλό κόστος." },
  { k: "stocks", n: "10-15 μετοχές", mu: 0.08, sd: 0.25, x: "Ίδια μέση απόδοση με την αγορά, περισσότερες διακυμάνσεις." },
  { k: "aggr", n: "Λίγες νευρικές μετοχές / trading", mu: 0.05, sd: 0.45, x: "Μεγάλες διακυμάνσεις· τα κόστη και τα λάθη μειώνουν τη μέση απόδοση." },
];
function simulate(P, T, months, C, mu, sd, n = 3000) {
  const m = Math.log(1 + mu) / 12 - (sd * sd) / 24, s = sd / Math.sqrt(12);
  let hit = 0, lose30 = 0; const ends = [];
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return (seed + 0.5) / 2147483648; };
  for (let k = 0; k < n; k++) {
    let v = P, inv = P;
    for (let t = 0; t < months; t++) { const z = Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd()); v = v * Math.exp(m + s * z) + C; inv += C; }
    if (v >= T) hit++; if (v <= inv * 0.7) lose30++; ends.push(v);
  }
  ends.sort((a, b) => a - b);
  return { p: hit / n, lose: lose30 / n, med: ends[Math.floor(n / 2)], lo: ends[Math.floor(n * 0.1)], hi: ends[Math.floor(n * 0.9)] };
}
const PERIODS = [[6, "6 μήνες"], [12, "1 χρόνο"], [24, "2 χρόνια"], [36, "3 χρόνια"], [60, "5 χρόνια"], [84, "7 χρόνια"], [120, "10 χρόνια"]];
const RISKS = [["low", "Χαμηλό", "Αντέχω πτώση έως ~10%"], ["mid", "Μέτριο", "Αντέχω πτώση ~20%"], ["high", "Υψηλό", "Αντέχω πτώση πάνω από 30%"]];
function realism(a) {
  if (a <= 0.08) return ["up", "Ρεαλιστικό", "Αυτό το έχει δώσει ιστορικά η αγορά των ΗΠΑ, κατά μέσο όρο, με έναν απλό δείκτη."];
  if (a <= 0.15) return ["warn", "Φιλόδοξο", "Πάνω από τον μέσο όρο της αγοράς: θέλει καλές επιλογές, υπομονή και ανοχή σε πτώσεις."];
  if (a <= 0.3) return ["down", "Πολύ επιθετικό", "Για πολλά χρόνια στη σειρά το πετυχαίνουν ελάχιστοι επαγγελματίες. Μεγάλη πιθανότητα για σημαντικές απώλειες."];
  return ["down", "Μη ρεαλιστικό", "Αυτή η απόδοση μοιάζει περισσότερο με στοίχημα παρά με επένδυση. Η πιθανότητα να χάσεις μεγάλο μέρος είναι πολύ μεγαλύτερη από την πιθανότητα να πετύχεις τον στόχο."];
}
const ALLOC = {
  low: { core: 80, sat: 20, pos: 8, risk: "0,5", txt: "Το 80% σε έναν δείκτη (π.χ. SPY), το 20% σε 3-5 δυνατές, ήρεμες μετοχές." },
  mid: { core: 60, sat: 40, pos: 12, risk: "1", txt: "Το 60% σε δείκτη, το 40% σε 5-8 μετοχές από τις ευκαιρίες του συστήματος, σε διαφορετικούς κλάδους." },
  high: { core: 40, sat: 60, pos: 15, risk: "1,5", txt: "Το 40% σε δείκτη, το 60% σε 6-10 μετοχές με σχέδιο εισόδου και stop. Το πολύ 10% σε day trade." },
};

routes.goal = async () => {
  const g = PF.goal, p = D() ? pfCalc() : null, nowEur = p ? (toEur(p.val) || 0) + PF.cash : 0;
  const f = { start: g?.start ?? Math.round(nowEur || 1000), target: g?.target ?? Math.round((nowEur || 1000) * 2), months: g?.months ?? 12, monthly: g?.monthly ?? 0, risk: g?.risk ?? "mid" };
  $("#view").innerHTML = `<div class="stack"><div><h1 class="page-title">Ο στόχος μου</h1><p class="page-sub">Πες μου πόσα έχεις, πού θέλεις να φτάσεις και σε πόσο καιρό. Θα σου δείξω πόσο ρεαλιστικό είναι και ένα σχέδιο.</p></div>
    ${card(`<form id="gF" class="form" style="display:grid;gap:14px">
      <div class="grid2"><label class="field"><b>Πόσα έχεις τώρα (€)</b><input class="input" name="start" inputmode="decimal" value="${f.start}"></label>
        <label class="field"><b>Πού θέλεις να φτάσεις (€)</b><input class="input" name="target" inputmode="decimal" value="${f.target}"></label></div>
      <div class="grid2"><label class="field"><b>Σε πόσο καιρό;</b><select class="input" name="months">${PERIODS.map(([m, l]) => `<option value="${m}" ${m === f.months ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label class="field"><b>Θα βάζεις κάθε μήνα (€)</b><input class="input" name="monthly" inputmode="decimal" value="${f.monthly}"></label></div>
      <div class="field"><b>Πόσο ρίσκο αντέχεις;</b>${seg(RISKS.map(([k, l]) => [k, l]), f.risk, "gr")}<div class="small muted" id="grx">${RISKS.find((x) => x[0] === f.risk)[2]}</div></div>
      <button class="btn primary block">Δείξε μου το σχέδιο</button></form>`)}
    <div id="gOut" class="stack"></div></div>`;
  let risk = f.risk;
  $$("[data-gr]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); risk = b.dataset.gr; $$("[data-gr]").forEach((x) => x.classList.toggle("on", x === b)); $("#grx").textContent = RISKS.find((x) => x[0] === risk)[2]; }));
  const show = (G, save) => {
    const yrs = G.months / 12, need = needAnnual(G.start, G.target, G.months, G.monthly), [tone, lbl, why] = realism(need);
    const sims = STRATS.map((s) => ({ ...s, r: simulate(G.start, G.target, G.months, G.monthly, s.mu, s.sd) }));
    const m8 = monthsTo(G.start, G.target, G.monthly, 0.08), c8 = monthlyNeeded(G.start, G.target, G.months, 0.08), al = ALLOC[G.risk];
    const capUsd = toUsd(G.start) || G.start * 1.08, cands = pfCandidates(capUsd, G.risk, 6);
    if (save) PF.goal = { ...G, created: PF.goal?.created && PF.goal.start === G.start ? PF.goal.created : new Date().toISOString() };
    $("#gOut").innerHTML = `${card(`<div class="verdict t-${tone === "up" ? "up" : tone === "warn" ? "neutral" : "down"}"><span class="tag">${lbl}</span>
        <p class="vh">Για ${eur(G.start)} → ${eur(G.target)} σε ${goalPeriod(G.months)}${G.monthly ? ` (με ${eur(G.monthly)} τον μήνα)` : ""} χρειάζεσαι περίπου <b>${pct(need * 100, 0).replace("+", "")} το χρόνο</b>.</p><p class="soft" style="margin:0">${why}</p></div>`)}
      ${card(`<h3>Τι δείχνει η προσομοίωση</h3><p class="small muted" style="margin-top:0">3.000 πιθανά σενάρια για ${goalPeriod(G.months)}, με υποθέσεις από την ιστορική συμπεριφορά της αγοράς. Δεν είναι πρόβλεψη.</p>
        <table class="cmp"><thead><tr><th>Τρόπος</th><th>Φτάνεις τον στόχο</th><th>Χάνεις 30%+</th><th>Μέσο σενάριο</th></tr></thead><tbody>
        ${sims.map((s) => `<tr><td>${s.n}<div class="small muted">${s.x}</div></td><td class="num">${(s.r.p * 100).toFixed(s.r.p < 0.1 ? 1 : 0)}%</td><td class="num ${s.r.lose > 0.1 ? "down" : ""}">${(s.r.lose * 100).toFixed(0)}%</td><td class="num">${eur(s.r.med)}</td></tr>`).join("")}</tbody></table>`)}
      ${card(`<h3>Πιο ρεαλιστικοί δρόμοι για τον ίδιο στόχο</h3><ul class="list">
        <li><span>Με ~8% το χρόνο${G.monthly ? ` και ${eur(G.monthly)} τον μήνα` : ""}, φτάνεις τα ${eur(G.target)} σε <b>${m8 ? goalPeriod(m8 < 12 ? m8 : Math.round(m8 / 6) * 6) : "πάνω από 60 χρόνια"}</b>.</span></li>
        <li><span>Για να τα φτάσεις σε ${goalPeriod(G.months)} με ~8% το χρόνο, θα χρειαζόταν να βάζεις περίπου <b>${eur(c8)} τον μήνα</b>.</span></li>
        <li><span>Όσο μεγαλύτερος ο χρόνος, τόσο μικρότερο το ρίσκο που χρειάζεται για τον ίδιο στόχο.</span></li></ul>`)}
      ${card(`<h3>Σχέδιο για ρίσκο «${RISKS.find((x) => x[0] === G.risk)[1].toLowerCase()}»</h3><p class="soft" style="margin-top:0">${al.txt}</p>
        ${kv([["Σε δείκτη", `${al.core}% (${eur(G.start * al.core / 100)})`], ["Σε μετοχές", `${al.sat}% (${eur(G.start * al.sat / 100)})`], ["Το πολύ ανά μετοχή", `${al.pos}% (${eur(G.start * al.pos / 100)})`], ["Ρίσκο ανά θέση ως το stop", `${al.risk}%`]])}
        <ul class="list" style="margin-top:10px"><li><span>Κάθε θέση με stop από την πρώτη μέρα· δεν το κατεβάζεις ποτέ.</span></li><li><span>Δεν βάζεις χρήματα που θα χρειαστείς τα επόμενα χρόνια.</span></li><li><span>Μία φορά τον μήνα κοιτάς το χαρτοφυλάκιο εδώ: αδύναμες θέσεις έξω, δυνατές μένουν.</span></li></ul>`)}
      ${sec("Υποψήφιες από τη σημερινή ανάλυση", "", "για το κομμάτι σε μετοχές")}${card(cands.length ? cands.map(candRow).join("") : emptyBox("Καμία κατάλληλη για αυτό το ρίσκο σήμερα", "Ξαναδές αύριο, μετά τη βραδινή ανάλυση."), "flush")}
      <div class="note">Υπολογισμοί και ανάλυση για να αποφασίσεις μόνος σου, όχι επενδυτική συμβουλή. Οι αποδόσεις του παρελθόντος δεν εγγυώνται τις μελλοντικές.</div>
      ${PF.goal ? `<button class="btn block" id="gDel">${icon("trash")}Διαγραφή στόχου</button>` : ""}`;
    $("#gDel")?.addEventListener("click", () => { store.set("goal", null); toast("Ο στόχος διαγράφηκε"); router({ soft: true }); });
  };
  $("#gF").addEventListener("submit", (e) => { e.preventDefault(); const fd = new FormData(e.target), n = (k) => parseFloat(String(fd.get(k) || 0).replace(/\s/g, "").replace(",", ".")) || 0;
    const G = { start: n("start"), target: n("target"), months: parseInt(fd.get("months"), 10), monthly: n("monthly"), risk };
    if (!(G.start > 0) || !(G.target > G.start)) { toast("Ο στόχος πρέπει να είναι μεγαλύτερος από τα χρήματα που έχεις", "high"); return; }
    show(G, true); toast("Ο στόχος αποθηκεύτηκε"); $("#gOut").scrollIntoView({ behavior: "smooth", block: "start" }); });
  if (g) show({ start: g.start, target: g.target, months: g.months, monthly: g.monthly || 0, risk: g.risk || "mid" }, false);
};

// κάρτα για την Αρχική
function pfHomeCard() {
  if (!D()) return "";
  if (!PF.list.length && !PF.goal) return card(`<div class="cta-row"><span class="c">${icon("wallet")}</span><div><b>Το χαρτοφυλάκιό μου</b><div class="nm">Βάλε τις μετοχές σου: αξία, κέρδος, βαθμολογία, τι λέει το σύστημα για καθεμία.</div></div><a class="btn sm" href="#/pf">Ξεκίνα</a></div>`);
  return `${sec("Το χαρτοφυλάκιό μου", `<a class="more" href="#/pf">Άνοιγμα</a>`)}${pfSummaryCard(pfCalc(), true)}`;
}

// για τον βοηθό
function pfText() {
  const l = PF.list; if (!l.length) return "Δεν έχεις βάλει ακόμα μετοχές στο χαρτοφυλάκιο. Πήγαινε στην καρτέλα «Χαρτοφυλάκιο» → «Πρόσθεσε μετοχή».";
  const p = pfCalc();
  return [`**Το χαρτοφυλάκιό σου:** ${fxRate() ? eur(toEur(p.val)) : usd(p.val)} · σήμερα ${fxRate() ? eur(toEur(p.day)) : usd(p.day)} · συνολικά ${pct(p.plPct, 1)} · βαθμολογία ${fmt(p.score, 0)}/100`,
    ...p.hs.map((h) => { const a = pfAdvice(h); return `• **${h.t}** ${pct(h.plPct, 1)} (${pct(h.w * 100, 0).replace("+", "")} του χαρτοφυλακίου): ${a.head.toLowerCase()}`; }),
    `\nΚινείται περίπου ±${fmt(p.sd * 100, 1)}% τη μέρα. Μεγαλύτερος κλάδος ${pct(p.maxSec * 100, 0).replace("+", "")}.`, "Λεπτομέρειες και τι λέει το σύστημα για κάθε θέση: καρτέλα «Χαρτοφυλάκιο». Ανάλυση, όχι επενδυτική συμβουλή."].join("\n");
}
function goalText() {
  const g = PF.goal; if (!g) return "Δεν έχεις βάλει στόχο. Στην καρτέλα «Χαρτοφυλάκιο» → «Βάλε στόχο»: πόσα έχεις, πού θέλεις να φτάσεις και σε πόσο καιρό.";
  const need = needAnnual(g.start, g.target, g.months, g.monthly || 0), [, lbl, why] = realism(need), s = simulate(g.start, g.target, g.months, g.monthly || 0, 0.08, 0.17);
  return `**Στόχος:** ${eur(g.start)} → ${eur(g.target)} σε ${goalPeriod(g.months)}. Χρειάζεται ~${pct(need * 100, 0).replace("+", "")} το χρόνο: **${lbl}**.\n${why}\nΜε έναν δείκτη (υπόθεση 8% το χρόνο κατά μέσο όρο) η πιθανότητα να τον πετύχεις είναι περίπου ${(s.p * 100).toFixed(s.p < 0.1 ? 1 : 0)}%.\nΤο πλήρες σχέδιο: Χαρτοφυλάκιο → Ο στόχος μου.`;
}

// ================================================================== χαρτοφυλάκιο από φωτογραφία (screenshot broker)
// Η εικόνα πηγαίνει ΜΟΝΟ στο AI που έχεις συνδέσει (για να διαβαστεί) και δεν αποθηκεύεται πουθενά.
const VISION_SYS = "Διαβάζεις screenshots χαρτοφυλακίου από εφαρμογές brokers (Revolut, Trading 212, eToro, IBKR, Freedom24, τράπεζες κ.λπ.). "
  + "Γράφεις ΜΟΝΟ ό,τι φαίνεται στην εικόνα· δεν μαντεύεις αριθμούς. Απαντάς ΜΟΝΟ με έγκυρο JSON.";
const VISION_PROMPT = `Βγάλε κάθε θέση σε μετοχή ή ETF που φαίνεται στην εικόνα.
Για κάθε θέση: ticker (σύμβολο αγοράς ΗΠΑ, π.χ. AAPL· αν φαίνεται μόνο όνομα εταιρείας, βάλε null), name (όπως φαίνεται), shares (αριθμός μετοχών, μπορεί δεκαδικός),
avg_price (μέση τιμή αγοράς ανά μετοχή, αν φαίνεται), cost_total (συνολικό κόστος αγοράς, αν φαίνεται), value (τρέχουσα αξία θέσης, αν φαίνεται),
pl (κέρδος/ζημιά σε χρήματα, αν φαίνεται), currency ("USD" ή "EUR" ή άλλο, όπως φαίνεται).
Αν φαίνονται διαθέσιμα μετρητά, βάλε cash και cash_currency.
Μορφή: {"items":[{"ticker":null,"name":null,"shares":null,"avg_price":null,"cost_total":null,"value":null,"pl":null,"currency":null}],"cash":null,"cash_currency":null}
Αριθμοί ως αριθμοί JSON (με τελεία για δεκαδικά). Ό,τι δεν φαίνεται = null.`;

async function imgToB64(file) {
  const load = () => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("Η εικόνα δεν ανοίγει")); im.src = URL.createObjectURL(file); });
  let src; try { src = await createImageBitmap(file); } catch { src = await load(); }
  const W = src.width, H = src.height, sc = Math.min(1, 1800 / Math.max(W, H));
  const c = document.createElement("canvas"); c.width = Math.round(W * sc); c.height = Math.round(H * sc);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  return { b64: c.toDataURL("image/jpeg", 0.88).split(",")[1], mime: "image/jpeg" };
}
const numOf = (v) => { if (isNum(v)) return v; if (v == null) return null; const s = String(v).replace(/[^\d.,\-]/g, ""); if (!s) return null;
  const n = s.includes(",") && s.includes(".") ? (s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "")) : s.replace(",", "."); const x = parseFloat(n); return isFinite(x) ? x : null; };
function matchTicker(it) {
  const clean = (t) => String(t || "").toUpperCase().replace(/^[A-Z]+:/, "").replace(/\.(US|O|N|K|OQ|NQ)$/, "").replace(/[^A-Z0-9.\-]/g, "");
  const t = clean(it.ticker);
  if (t && Data.row(t)) return t;
  const nm = plain(it.name || ""); if (nm.length < 3) return t || null;
  const norm = (x) => plain(x).replace(/\b(inc|corp|corporation|plc|ltd|co|class [ab]|the|holdings?|group|n\.?v\.?|s\.?a\.?)\b/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const rows = D()?.rows || [], key = norm(nm), byDv = (a, b) => (b.dv || 0) - (a.dv || 0);
  const exact = rows.filter((r) => norm(r.n) === key).sort(byDv)[0];
  if (exact) return exact.t;
  const starts = rows.filter((r) => norm(r.n).startsWith(key) || key.startsWith(norm(r.n) || "~")).sort(byDv);
  if (starts.length === 1 || (starts.length && key.split(" ").length >= 2)) return starts[0].t;
  const two = key.split(" ").slice(0, 2).join(" "), loose = rows.filter((r) => norm(r.n).includes(two));
  return loose.length === 1 ? loose[0].t : (t || null);
}
function keyBox(onDone, def = Keys.claude ? "gemini" : "claude") {
  const id = "kb" + Math.random().toString(36).slice(2, 6);
  setTimeout(() => {
    let prov = def; const root = document.getElementById(id); if (!root) return;
    $$("[data-kp]", root).forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); prov = b.dataset.kp; $$("[data-kp]", root).forEach((x) => x.classList.toggle("on", x === b));
      $(".kh", root).innerHTML = prov === "claude" ? "console.anthropic.com → API Keys → Create Key. Η χρήση χρεώνεται από την Anthropic (πολύ μικρό ποσό ανά φωτογραφία)." : "aistudio.google.com/apikey → Create API key (έχει δωρεάν όριο χρήσης)."; }));
    $("form", root).addEventListener("submit", async (e) => {
      e.preventDefault(); const v = String(new FormData(e.target).get("k") || "").trim(); if (!v) return;
      const b = $("button[type=submit]", root); b.disabled = true; b.textContent = "Έλεγχος…";
      Keys.set(prov, v); if (prov === "gemini") store.set("ai.geminiModel", ""); if (prov === "claude") store.set("ai.claudeModel", "");
      try { await (prov === "claude" ? AI.claude("Απάντα σύντομα.", "Γράψε μόνο: ΟΚ") : AI.gemini("Απάντα σύντομα.", "Γράψε μόνο: ΟΚ")); toast("Το κλειδί δουλεύει και αποθηκεύτηκε μόνο σε αυτή τη συσκευή"); onDone && onDone(); }
      catch (er) { Keys.set(prov, ""); toast(esc(er.message), "high"); b.disabled = false; b.textContent = "Αποθήκευση"; }
    });
  }, 0);
  return `<div class="card keybox" id="${id}"><b>Κλειδί AI</b><p class="small soft" style="margin:4px 0 10px">Χρειάζεται για να διαβάζει φωτογραφίες και για ελεύθερη συζήτηση με τον βοηθό. Μένει μόνο σε αυτή τη συσκευή, δεν εμφανίζεται ξανά και δεν ανεβαίνει πουθενά.</p>
    ${seg([["claude", "Claude"], ["gemini", "Gemini"]], def, "kp")}
    <form style="display:flex;gap:8px;margin-top:10px"><input class="input" type="password" name="k" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Επικόλλησε εδώ το κλειδί"><button class="btn primary" type="submit">Αποθήκευση</button></form>
    <div class="small muted kh" style="margin-top:8px">${def === "claude" ? "console.anthropic.com → API Keys → Create Key. Η χρήση χρεώνεται από την Anthropic (πολύ μικρό ποσό ανά φωτογραφία)." : "aistudio.google.com/apikey → Create API key (έχει δωρεάν όριο χρήσης)."}</div></div>`;
}
function pfImport() {
  const sh = document.createElement("div"); sh.className = "sheet"; sh.setAttribute("role", "dialog");
  const render = () => {
    sh.innerHTML = `<div class="sheet-head"><b style="flex:1">Χαρτοφυλάκιο από φωτογραφία</b><button class="round-btn" id="iX" aria-label="Κλείσιμο">${icon("x")}</button></div>
      <div class="results" style="padding:0 16px 24px"><div class="stack">
      ${Keys.claude || Keys.gemini ? "" : keyBox(render)}${!Keys.claude && !Keys.gemini && Data.server ? `<div class="small muted">Ή συνέχισε χωρίς κλειδί εδώ: θα χρησιμοποιηθεί το AI του προγράμματος του υπολογιστή, αν έχει.</div>` : ""}
      <p class="soft" style="margin:0">Βγάλε screenshot τις θέσεις σου από την εφαρμογή του broker (μπορείς και πολλά μαζί) και διάλεξέ τα εδώ. Θα τα διαβάσω, θα κάνω τους υπολογισμούς και θα σου δείξω τι βρήκα πριν αποθηκευτεί οτιδήποτε.</p>
      <label class="btn primary block ${AI.canVision() ? "" : "disabled"}" style="cursor:pointer">${icon("plus")}Διάλεξε screenshot<input type="file" id="iF" accept="image/*" multiple hidden ${AI.canVision() ? "" : "disabled"}></label>
      <div class="small muted">Η φωτογραφία πηγαίνει μόνο στο AI που έχεις συνδέσει, για να διαβαστεί. Δεν αποθηκεύεται πουθενά.</div>
      <div id="iOut" class="stack"></div></div></div>`;
    $("#iX", sh).addEventListener("click", () => sh.remove());
    $("#iF", sh)?.addEventListener("change", (e) => readShots([...e.target.files]));
  };
  const readShots = async (files) => {
    if (!files.length) return;
    const out = $("#iOut", sh); const found = []; let cash = null, cashCur = null;
    for (let i = 0; i < files.length; i++) {
      out.innerHTML = `<div class="loading" style="padding:30px 0"><span class="spinner"></span>Διαβάζω ${files.length > 1 ? `τη φωτογραφία ${i + 1} από ${files.length}` : "τη φωτογραφία"}…</div>`;
      try {
        const img = await imgToB64(files[i]);
        const txt = await AI.vision(VISION_SYS, VISION_PROMPT, img);
        const m = String(txt).match(/\{[\s\S]*\}/); const j = JSON.parse(m ? m[0] : txt);
        for (const it of j.items || []) found.push(it);
        if (numOf(j.cash) != null) { cash = numOf(j.cash); cashCur = j.cash_currency; }
      } catch (er) { out.innerHTML = `<div class="callout"><b>Δεν διαβάστηκε.</b> ${esc(er.message)}</div>`; return; }
    }
    review(found, cash, cashCur);
  };
  const review = (items, cash, cashCur) => {
    const fx = fxRate(), rows = items.map((it) => {
      const t = matchTicker(it), shN = numOf(it.shares), cur = String(it.currency || "USD").toUpperCase();
      let px = numOf(it.avg_price);
      if (px == null && numOf(it.cost_total) != null && shN) px = numOf(it.cost_total) / shN;
      if (px == null && numOf(it.value) != null && numOf(it.pl) != null && shN) px = (numOf(it.value) - numOf(it.pl)) / shN;
      if (px != null && cur === "EUR" && fx) px *= fx;
      return { t, name: it.name, sh: shN, px: px != null ? Math.round(px * 100) / 100 : null, ok: !!(t && Data.row(t)), cur, noFx: cur === "EUR" && !fx };
    }).filter((r) => r.t || r.name);
    const out = $("#iOut", sh);
    if (!rows.length) { out.innerHTML = `<div class="callout"><b>Δεν βρήκα θέσεις στη φωτογραφία.</b> Δοκίμασε screenshot όπου φαίνονται τα σύμβολα και ο αριθμός μετοχών.</div>`; return; }
    const cashEur = cash != null ? (String(cashCur || "EUR").toUpperCase() === "USD" && fx ? cash / fx : cash) : null;
    out.innerHTML = `${card(`<h3>Βρήκα ${rows.length} θέσεις</h3><p class="small soft" style="margin-top:0">Έλεγξε και διόρθωσε ό,τι χρειάζεται. Τιμή αγοράς ανά μετοχή σε $${rows.some((r) => r.cur === "EUR") && fx ? " (όσες ήταν σε € μετατράπηκαν με 1 € = " + fmt(fx, 4) + " $)" : ""}.</p>
      <div class="imp">${rows.map((r, i) => `<div class="imp-row" data-i="${i}"><input type="checkbox" checked aria-label="Να μπει">
        <input class="input" data-k="t" value="${esc(r.t || "")}" placeholder="Σύμβολο" autocapitalize="characters"><input class="input" data-k="sh" inputmode="decimal" value="${r.sh ?? ""}" placeholder="Μετοχές"><input class="input" data-k="px" inputmode="decimal" value="${r.px ?? ""}" placeholder="Τιμή $">
        <div class="small ${r.ok ? "muted" : "warn"}" style="grid-column:2/-1">${esc(r.name || "")}${r.ok ? "" : " · δεν βρέθηκε στην ανάλυση, έλεγξε το σύμβολο"}${r.px == null ? " · λείπει η τιμή αγοράς" : ""}${r.noFx ? " · η τιμή είναι σε €, γράψ' την σε $" : ""}</div></div>`).join("")}</div>
      ${cashEur != null ? `<label class="small" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="iCash" checked>Μετρητά: ${eur(cashEur, 2)}</label>` : ""}
      <div class="field" style="margin-top:12px"><b>Πώς να μπουν</b>${seg([["merge", "Ενημέρωση θέσεων"], ["replace", "Αντικατάσταση όλων"]], "merge", "im")}</div>
      <button class="btn primary block" id="iSave" style="margin-top:12px">Αποθήκευση στο χαρτοφυλάκιο</button>`)}`;
    let mode = "merge";
    $$("[data-im]", out).forEach((b) => b.addEventListener("click", () => { mode = b.dataset.im; $$("[data-im]", out).forEach((x) => x.classList.toggle("on", x === b)); }));
    $("#iSave", out).addEventListener("click", () => {
      const add = [];
      $$(".imp-row", out).forEach((el) => { if (!$("input[type=checkbox]", el).checked) return;
        const t = $("[data-k=t]", el).value.trim().toUpperCase(), shN = numOf($("[data-k=sh]", el).value), pxN = numOf($("[data-k=px]", el).value);
        if (t && shN > 0 && pxN > 0) add.push({ id: Math.random().toString(36).slice(2, 9), t, sh: shN, px: pxN, d: "" }); });
      if (!add.length) { toast("Δεν υπάρχει θέση με σύμβολο, μετοχές και τιμή", "high"); return; }
      const keep = mode === "replace" ? [] : PF.list.filter((h) => !add.some((a) => a.t === h.t));
      PF.save([...keep, ...add]);
      if (cashEur != null && $("#iCash", out)?.checked) PF.cash = Math.round(cashEur * 100) / 100;
      sh.remove(); toast(`Μπήκαν ${add.length} θέσεις στο χαρτοφυλάκιο`); location.hash = "#/pf"; router({ soft: true });
    });
  };
  document.body.appendChild(sh); render();
}
