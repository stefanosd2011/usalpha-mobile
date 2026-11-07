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
const fxRate = () => { const lq = App.quotes?.["EURUSD=X"]?.price; if (isNum(lq) && lq > 0.5 && lq < 2) return lq; return isNum(D()?.fx?.eurusd) && D().fx.eurusd > 0.5 ? D().fx.eurusd : null; }; // δολάρια ανά 1 ευρώ (ζωντανά αν υπάρχουν)
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

// η προηγούμενη (κλασική) προβολή μένει διαθέσιμη: #/pfc
routes.pfc = async () => {
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
      <button class="btn primary block">Δείξε μου το πλήρες σχέδιο</button></form>`)}
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
      ${typeof goalPlan === "function" ? goalPlan(G) : ""}
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
      <p class="soft" style="margin:0">Βγάλε screenshot τις θέσεις σου από την εφαρμογή του broker (μπορείς και πολλά μαζί) και διάλεξέ τα εδώ. Θα τα διαβάσω, θα κάνω τους υπολογισμούς και θα σου δείξω τι βρήκα πριν αποθηκευτεί οτιδήποτε.</p>
      <label class="btn primary block" style="cursor:pointer">${icon("plus")}Διάλεξε screenshot<input type="file" id="iF" accept="image/*" multiple hidden></label>
      <div class="small muted">${AI.canVision() ? (Data.server && !Keys.claude && !Keys.gemini ? "Διαβάζεται με το AI του προγράμματος του υπολογιστή (χωρίς κωδικό από σένα). Αν δεν απαντήσει, διαβάζεται μέσα στη συσκευή." : "Διαβάζεται με το AI που έχεις συνδέσει. Αν δεν απαντήσει, διαβάζεται μέσα στη συσκευή.")
        : "Διαβάζεται μέσα στη συσκευή σου, χωρίς κωδικό. Η φωτογραφία δεν ανεβαίνει πουθενά. Την πρώτη φορά κατεβαίνει το πρόγραμμα ανάγνωσης (~6 MB)."}</div>
      ${Keys.claude || Keys.gemini || Data.server ? "" : `<details><summary>Προαιρετικά: πιο ακριβές διάβασμα με AI</summary>${keyBox(render)}</details>`}
      <div id="iOut" class="stack"></div></div></div>`;
    $("#iX", sh).addEventListener("click", () => sh.remove());
    $("#iF", sh)?.addEventListener("change", (e) => readShots([...e.target.files]));
  };
  const readShots = async (files) => {
    if (!files.length) return;
    const out = $("#iOut", sh); const found = []; let cash = null, cashCur = null;
    for (let i = 0; i < files.length; i++) {
      const which = files.length > 1 ? `τη φωτογραφία ${i + 1} από ${files.length}` : "τη φωτογραφία";
      const show = (msg) => { out.innerHTML = `<div class="loading" style="padding:30px 0"><span class="spinner"></span>${msg}</div>`; };
      show(`Διαβάζω ${which}…`);
      try {
        let j = null;
        if (AI.canVision()) { // πρώτα το AI (αν υπάρχει), αλλιώς/αν αποτύχει: ανάγνωση μέσα στη συσκευή
          try { const img = await imgToB64(files[i]); const txt = await AI.vision(VISION_SYS, VISION_PROMPT, img);
            const m = String(txt).match(/\{[\s\S]*\}/); j = JSON.parse(m ? m[0] : txt); } catch { j = null; }
        }
        if (!j || !(j.items || []).length) {
          OCR.onProgress = (m) => { const st = String(m?.status || ""), pr = Math.round((m?.progress || 0) * 100);
            if (/recogniz/.test(st)) show(`Διαβάζω ${which}… ${pr}%`); else if (/load|initializ/.test(st)) show("Ετοιμάζω την ανάγνωση στη συσκευή (μόνο την πρώτη φορά)…"); };
          j = await OCR.read(files[i]);
        }
        for (const it of j.items || []) found.push(it);
        if (numOf(j.cash) != null) { cash = numOf(j.cash); cashCur = j.cash_currency; }
      } catch (er) { out.innerHTML = `<div class="callout"><b>Δεν διαβάστηκε.</b> ${esc(er.message)}</div>`; return; }
    }
    // ίδια μετοχή σε δύο screenshots: κρατάμε μία φορά (αυτή με τα περισσότερα στοιχεία)
    const score = (x) => ["shares", "avg_price", "value"].filter((k) => numOf(x[k]) != null).length;
    const uniq = [];
    for (const it of found) { const t = matchTicker(it), k = t || plain(it.name || ""); const o = uniq.find((u) => u.k === k);
      if (!o) uniq.push({ k, it }); else if (score(it) > score(o.it)) o.it = it; }
    review(uniq.map((u) => u.it), cash, cashCur);
  };
  const review = (items, cash, cashCur) => {
    const fx = fxRate(), rows = items.map((it) => {
      const t = matchTicker(it), shN = numOf(it.shares), cur = String(it.currency || "USD").toUpperCase();
      let px = numOf(it.avg_price);
      if (px == null && numOf(it.cost_total) != null && shN) px = numOf(it.cost_total) / shN;
      if (px == null && numOf(it.value) != null && numOf(it.pl) != null && shN) px = (numOf(it.value) - numOf(it.pl)) / shN;
      if (px != null && cur === "EUR" && fx) px *= fx;
      return { t, name: it.name, sh: shN, px: px != null ? Math.round(px * 100) / 100 : null, ok: !!(t && Data.row(t)), cur, noFx: cur === "EUR" && !fx, note: it.note || "" };
    }).filter((r) => r.t || r.name);
    const out = $("#iOut", sh);
    if (!rows.length) { out.innerHTML = `<div class="callout"><b>Δεν βρήκα θέσεις στη φωτογραφία.</b> Δοκίμασε screenshot όπου φαίνονται τα σύμβολα και ο αριθμός μετοχών.</div>`; return; }
    const cashEur = cash != null ? (String(cashCur || "EUR").toUpperCase() === "USD" && fx ? cash / fx : cash) : null;
    out.innerHTML = `${card(`<h3>Βρήκα ${rows.length} θέσεις</h3><p class="small soft" style="margin-top:0">Έλεγξε και διόρθωσε ό,τι χρειάζεται. Τιμή αγοράς ανά μετοχή σε $${rows.some((r) => r.cur === "EUR") && fx ? " (όσες ήταν σε € μετατράπηκαν με 1 € = " + fmt(fx, 4) + " $)" : ""}.</p>
      <div class="imp">${rows.map((r, i) => `<div class="imp-row" data-i="${i}"><input type="checkbox" checked aria-label="Να μπει">
        <input class="input" data-k="t" value="${esc(r.t || "")}" placeholder="Σύμβολο" autocapitalize="characters"><input class="input" data-k="sh" inputmode="decimal" value="${r.sh ?? ""}" placeholder="Μετοχές"><input class="input" data-k="px" inputmode="decimal" value="${r.px ?? ""}" placeholder="Τιμή $">
        <div class="small ${r.ok ? "muted" : "warn"}" style="grid-column:2/-1">${esc(r.name || "")}${r.ok ? "" : " · δεν βρέθηκε στην ανάλυση, έλεγξε το σύμβολο"}${r.px == null ? " · λείπει η τιμή αγοράς" + (Data.row(r.t)?.p ? ` (σήμερα $${fmt(Data.row(r.t).p)})` : "") : ""}${r.noFx ? " · η τιμή είναι σε €, γράψ' την σε $" : ""}${r.note ? ` · ${esc(r.note)}, έλεγξέ το` : ""}</div></div>`).join("")}</div>
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

// ================================================================== Χαρτοφυλάκιο σε στυλ Revolut
// Μεγάλο σύνολο με την πορεία του, κουμπιά-ενέργειες, οι μετοχές μία-μία (αξία, κέρδος/ζημιά, πόσες έχεις),
// λεπτομέρειες με ένα πάτημα, αφαίρεση με σύρσιμο αριστερά / «Επεξεργασία» / από τις λεπτομέρειες (με αναίρεση).
// Μόνο πραγματικές τιμές της ανάλυσης και οι ζωντανές τιμές· τίποτα δεν αποθηκεύεται εκτός συσκευής.
const RV = { range: store.get("pfRange", 63), edit: false, mov: store.get("pfMov", "up"), hist: null, histKey: "" };
const RANGES = [[5, "1Ε"], [21, "1Μ"], [63, "3Μ"], [126, "6Μ"], [252, "1Χ"]];
const mEur = (usdV, d = 2) => (fxRate() ? eur(toEur(usdV), d) : usd(usdV, d)); // ποσό σε € (ή $ αν λείπει η ισοτιμία)
function bigMoney(usdV) {
  const v = fxRate() ? toEur(usdV) : usdV;
  if (!isNum(v)) return "—";
  const s = Math.abs(v).toLocaleString(fxRate() ? "el-GR" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sep = fxRate() ? "," : ".", i = s.lastIndexOf(sep);
  return `${v < 0 ? "−" : ""}${fxRate() ? "" : "$"}${s.slice(0, i)}<small>${s.slice(i)}${fxRate() ? " €" : ""}</small>`;
}
const arrowPct = (v, d = 2) => (isNum(v) ? `<span class="num ${cls(v)}">${v > 0 ? "▲" : v < 0 ? "▼" : ""} ${Math.abs(v).toFixed(d).replace(".", ",")}%</span>` : "");
const signedMoney = (usdV, d = 2) => (isNum(usdV) ? `${usdV > 0 ? "+" : ""}${mEur(usdV, d)}` : "—");
const qtyTxt = (x) => (isNum(x) ? x.toLocaleString("el-GR", { maximumFractionDigits: x < 1 ? 4 : x < 100 ? 3 : 0 }) : "—");

// πορεία της αξίας με τις σημερινές ποσότητες (ημερήσια κλεισίματα της ανάλυσης + η ζωντανή τιμή τώρα)
async function pfHistory(p) {
  const key = p.hs.map((h) => `${h.t}:${h.sh}`).join("|") + "|" + (D()?.asOf || "");
  if (RV.hist && RV.histKey === key) return RV.hist;
  const shards = await Promise.all(p.hs.map((h) => Data.stock(h.t).catch(() => null)));
  const inc = [];
  p.hs.forEach((h, i) => { const b = shards[i]?.bars; if (b?.d?.length && b?.c?.length) inc.push({ h, m: new Map(b.d.map((d, k) => [String(d), b.c[k]])) }); });
  let pts = [];
  if (inc.length) {
    const dates = [...new Set(inc.flatMap((x) => [...x.m.keys()]))].sort();
    for (const d of dates) { let v = 0, ok = true; for (const x of inc) { const c = x.m.get(d); if (!isNum(c)) { ok = false; break; } v += x.h.sh * c; } if (ok) pts.push([d, v]); }
  }
  RV.hist = { pts, inc: inc.map((x) => x.h.t), all: p.hs.length };
  RV.histKey = key;
  return RV.hist;
}
function pfLivePoint(p, hist) {
  if (!hist?.pts?.length || !Data.quotesAt) return null;
  const q = Object.values(App.quotes).find((x) => x?.src === "cloud");
  const day = Data.quotesDay || (q ? new Date(q.ts).toISOString().slice(0, 10) : null);
  const last = hist.pts[hist.pts.length - 1][0];
  if (!day || day <= last) return null;
  const v = p.hs.filter((h) => hist.inc.includes(h.t)).reduce((s, h) => s + (isNum(h.value) ? h.value : 0), 0);
  return v > 0 ? [day, v] : null;
}
function rvChart(pts) {
  const W = 360, H = 150, a = pts.map((x) => x[1]);
  if (a.length < 2) return `<div class="rv-chart empty small muted">Δεν υπάρχει ακόμα αρκετό ιστορικό για γράφημα</div>`;
  const mn = Math.min(...a), mx = Math.max(...a), rg = mx - mn || 1;
  const xy = a.map((v, i) => [(i / (a.length - 1)) * W, H - 10 - ((v - mn) / rg) * (H - 24)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const up = a[a.length - 1] >= a[0];
  return `<div class="rv-chart" data-up="${up ? 1 : 0}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="rvg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".28"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
    <path d="${d}L${W} ${H}L0 ${H}Z" fill="url(#rvg)"/><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>
    <i class="rv-cur" hidden></i><i class="rv-dot" hidden></i></div>`;
}

function rvRow(h) {
  const nm = h.r?.n || h.t;
  return `<div class="rv-item" data-id="${esc(h.id)}"><button class="rv-del" data-del="${esc(h.id)}" aria-label="Αφαίρεση ${esc(h.t)}">${icon("trash")}<span>Αφαίρεση</span></button>
    <div class="rv-row" data-open="${esc(h.id)}" role="button" tabindex="0">
      <button class="rv-minus" data-minus="${esc(h.id)}" aria-label="Αφαίρεση ${esc(h.t)}">−</button>${logo(h.t, true)}
      <div class="rv-mid"><b>${esc(nm)}</b><span>${qtyTxt(h.sh)} ${esc(h.t)} · ${isNum(h.price) ? "$" + fmt(h.price) : "—"}</span></div>
      <div class="rv-right"><b class="num">${mEur(h.value)}</b>${arrowPct(h.plPct)}</div></div></div>`;
}

function rvMovers() {
  const d = D(); if (!d?.rows?.length) return "";
  const live = !!Data.quotesAt;
  const list = d.rows.filter((r) => (r.dv || 0) >= 20e6 && isNum(curPx(r.t, r.p)) && curPx(r.t, r.p) >= 2)
    .map((r) => ({ t: r.t, n: r.n, c: curCh(r.t, r.ch) })).filter((x) => isNum(x.c));
  const pick = RV.mov === "up" ? [...list].sort((a, b) => b.c - a.c).slice(0, 8) : [...list].sort((a, b) => a.c - b.c).slice(0, 8);
  return card(`<div class="rv-sec"><b>${live ? "Οι μεγαλύτερες κινήσεις σήμερα" : "Οι μεγαλύτερες κινήσεις (τελευταία συνεδρίαση)"}</b></div>
    ${seg([["up", "Άνοδος"], ["down", "Πτώση"]], RV.mov, "mov")}
    <div class="rv-movers">${pick.map((x) => `<a href="#/s/${encodeURIComponent(x.t)}" title="${esc(x.n || x.t)}">${logo(x.t, true)}<b>${esc(x.t)}</b>${arrowPct(x.c)}</a>`).join("")}</div>
    <div class="small muted rv-mfoot">Μετοχές με τζίρο πάνω από $20 εκ. τη μέρα. Πάτα για ανάλυση.</div>`);
}

// κάτω φύλλο (bottom sheet)
function bottomSheet(html) {
  const bs = document.createElement("div"); bs.className = "rv-bs"; bs.setAttribute("role", "dialog");
  bs.innerHTML = `<div class="rv-bs-bg"></div><div class="rv-bs-panel"><i class="rv-grab"></i>${html}</div>`;
  document.body.appendChild(bs);
  const close = () => { bs.classList.add("out"); setTimeout(() => bs.remove(), 180); };
  $(".rv-bs-bg", bs).addEventListener("click", close);
  bs.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  return { el: bs, close };
}
function undoBar(text, onUndo) {
  $$(".rv-undo").forEach((x) => x.remove());
  const el = document.createElement("div"); el.className = "rv-undo";
  el.innerHTML = `<span>${text}</span><button>Αναίρεση</button>`;
  document.body.appendChild(el);
  const t = setTimeout(() => el.remove(), 6000);
  $("button", el).addEventListener("click", () => { clearTimeout(t); el.remove(); onUndo(); });
}
function pfRemove(id) {
  const l = PF.list, i = l.findIndex((h) => h.id === id); if (i < 0) return;
  const gone = l[i]; PF.save(l.filter((h) => h.id !== id)); RV.hist = null;
  undoBar(`Η ${esc(gone.t)} αφαιρέθηκε`, () => { const now = PF.list; now.splice(Math.min(i, now.length), 0, gone); PF.save(now); RV.hist = null; router({ soft: true }); });
  router({ soft: true });
}
function pfAskRemove(h) {
  const s = bottomSheet(`<div class="rv-confirm">${logo(h.t, true)}<b>Αφαίρεση της ${esc(h.t)};</b><p class="small muted">Βγαίνει από το χαρτοφυλάκιο σε αυτή τη συσκευή (${qtyTxt(h.sh)} μετοχές). Μπορείς να την αναιρέσεις αμέσως μετά.</p>
    <button class="btn danger block" data-yes>${icon("trash")}Αφαίρεση</button><button class="btn block" data-no>Άκυρο</button></div>`);
  $("[data-yes]", s.el).addEventListener("click", () => { s.close(); pfRemove(h.id); });
  $("[data-no]", s.el).addEventListener("click", s.close);
}
function pfDetail(id) {
  const p = pfCalc(), h = p.hs.find((x) => x.id === id); if (!h) return;
  const a = pfAdvice(h);
  const s = bottomSheet(`<div class="rv-detail">
    <div class="rv-dh">${logo(h.t, true)}<div><b>${esc(h.r?.n || h.t)}</b><span class="small muted">${esc(h.t)}${h.r?.sec ? " · " + esc(h.r.sec) : ""}</span></div><button class="round-btn" data-x aria-label="Κλείσιμο">${icon("x")}</button></div>
    <div class="rv-dval num">${bigMoney(h.value)}</div>
    <div class="rv-dchg">${signedMoney(h.pl)} ${arrowPct(h.plPct)} <span class="muted small">συνολικά</span></div>
    <div class="rv-dchg">${signedMoney(h.day)} ${arrowPct(h.chg)} <span class="muted small">σήμερα</span></div>
    ${kv([["Μετοχές", qtyTxt(h.sh)], ["Μέση τιμή αγοράς", "$" + fmt(h.px)], ["Τιμή τώρα", isNum(h.price) ? "$" + fmt(h.price) : "—"], ["Κόστος", mEur(h.cost)],
      ["Κέρδος / ζημιά", `${signedMoney(h.pl)}`, cls(h.pl)], ["Βάρος στο χαρτοφυλάκιο", pct(h.w * 100, 1).replace("+", "")], h.d ? ["Ημερομηνία αγοράς", dday(h.d)] : null])}
    <div class="rv-advice ${a.tone}"><b>${esc(a.head)}</b><ul>${a.lines.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
    <a class="btn primary block" href="#/s/${encodeURIComponent(h.t)}" data-go>${icon("spark")}Ανάλυση της μετοχής</a>
    <div class="grid2"><button class="btn" data-edit>Αλλαγή</button><button class="btn danger" data-rm>${icon("trash")}Αφαίρεση</button></div>
    <div class="small muted">Ανάλυση με τα στοιχεία του συστήματος, όχι εντολή.</div></div>`);
  $("[data-x]", s.el).addEventListener("click", s.close);
  $("[data-go]", s.el).addEventListener("click", s.close);
  $("[data-edit]", s.el).addEventListener("click", () => { s.close(); pfForm(PF.list.find((x) => x.id === id)); });
  $("[data-rm]", s.el).addEventListener("click", () => { s.close(); pfAskRemove(h); });
}
function pfMore() {
  const s = bottomSheet(`<div class="rv-more"><b class="rv-mt">Περισσότερα</b>
    <form id="rvCash" class="rv-cash"><label class="field"><b>Μετρητά στον λογαριασμό (€)</b><input class="input" name="c" inputmode="decimal" placeholder="π.χ. 9,43" value="${PF.cash || ""}"></label><button class="btn">Αποθήκευση</button></form>
    <button class="btn block" data-exp>${icon("share")}Μεταφορά σε άλλη συσκευή</button><button class="btn block" data-imp>Εισαγωγή από άλλη συσκευή</button>
    <a class="btn block" href="#/goal" data-go>${icon("target")}${PF.goal ? "Ο στόχος μου" : "Βάλε στόχο"}</a><a class="btn block" href="#/pfc" data-go>Κλασική προβολή χαρτοφυλακίου</a></div>`);
  $$("[data-go]", s.el).forEach((x) => x.addEventListener("click", s.close));
  $("#rvCash", s.el).addEventListener("submit", (e) => { e.preventDefault(); PF.cash = String(new FormData(e.target).get("c")).replace(",", "."); toast("Αποθηκεύτηκε"); s.close(); router({ soft: true }); });
  $("[data-exp]", s.el).addEventListener("click", async () => { const code = btoa(unescape(encodeURIComponent(JSON.stringify({ pf: PF.list, cash: PF.cash, goal: PF.goal, my: myList() }))));
    try { await navigator.clipboard.writeText(code); toast("Αντιγράφηκε. Στην άλλη συσκευή: Χαρτοφυλάκιο → Περισσότερα → Εισαγωγή → επικόλληση."); } catch { prompt("Αντίγραψε αυτόν τον κωδικό", code); } });
  $("[data-imp]", s.el).addEventListener("click", () => { const code = prompt("Επικόλλησε τον κωδικό μεταφοράς"); if (!code) return;
    try { const j = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (Array.isArray(j.pf)) PF.save(j.pf.map((h) => ({ ...h, id: h.id || Math.random().toString(36).slice(2, 9) })));
      if (isNum(j.cash)) PF.cash = j.cash; if (j.goal) PF.goal = j.goal; if (Array.isArray(j.my)) setMy(j.my); toast("Έγινε εισαγωγή"); s.close(); router({ soft: true }); }
    catch { toast("Ο κωδικός δεν είναι σωστός", "high"); } });
}

routes.pf = async () => {
  const d = D();
  if (!d) { $("#view").innerHTML = `<div class="stack">${freshness()}</div>`; return; }
  // παλιές θέσεις χωρίς αναγνωριστικό (π.χ. από μεταφορά): παίρνουν ένα, για να μπορούν να αλλάξουν/αφαιρεθούν
  if (PF.list.some((h) => !h.id)) PF.save(PF.list.map((h) => ({ ...h, id: h.id || Math.random().toString(36).slice(2, 9) })));
  const p = pfCalc(), hs = [...p.hs].sort((a, b) => (b.value || 0) - (a.value || 0));
  const cashUsd = toUsd(PF.cash) || 0, total = p.val + cashUsd;
  const dayPct = p.val - p.day > 0 ? (p.day / (p.val - p.day)) * 100 : null;
  const asOfTxt = Data.quotesAt ? `Τιμές ${dt(new Date(Data.quotesAt).toISOString())}` : `Κλείσιμο ${dday(d.asOf)}`;
  const acts = `<div class="actions rv-acts"><button class="act" id="pfAdd"><span class="c pri">${icon("plus")}</span>Προσθήκη</button>
    <button class="act" id="pfShot"><span class="c">${icon("camera")}</span>Από φωτογραφία</button>
    <button class="act" data-go="#/goal"><span class="c">${icon("target")}</span>Στόχος</button>
    <button class="act" id="pfMore"><span class="c"><b style="font-size:20px;line-height:1">···</b></span>Περισσότερα</button></div>`;
  const hero = `<div class="rv-hero"><div class="rv-lbl">Αξία χαρτοφυλακίου</div><div class="rv-val num" id="rvVal">${bigMoney(total)}</div>
    <div class="rv-chg" id="rvChg">${hs.length ? `${signedMoney(p.day)} ${arrowPct(dayPct)} <span class="muted">σήμερα</span>` : `<span class="muted">${asOfTxt}</span>`}</div>
    ${hs.length ? `<div class="rv-sub" id="rvSub">Σήμερα ${signedMoney(p.day)} (${pct(dayPct, 2).replace(".", ",")})</div>` : ""}
    <div id="rvChartBox"></div>
    <div class="rv-ranges" id="rvRanges" ${hs.length ? "" : "hidden"}>${RANGES.map(([n, l]) => `<button type="button" class="${RV.range === n ? "on" : ""}" data-rg="${n}">${l}</button>`).join("")}</div></div>`;
  const hold = hs.length ? `<section class="card flush rv-list ${RV.edit ? "edit" : ""}" id="rvList">
      <div class="rv-sec"><b>Μετοχές <span class="muted">${hs.length}</span></b><button class="linkbtn" id="rvEdit">${RV.edit ? "Τέλος" : "Επεξεργασία"}</button></div>
      ${hs.map(rvRow).join("")}
      <div class="rv-row rv-cashrow" id="rvCashRow" role="button" tabindex="0"><span class="logo lg rv-cashlogo">${icon("wallet")}</span><div class="rv-mid"><b>Μετρητά</b><span>${PF.cash ? "στον λογαριασμό" : "πάτα για να τα βάλεις"}</span></div><div class="rv-right"><b class="num">${eur(PF.cash || 0, 2)}</b></div></div>
      <div class="rv-foot"><span>Συνολικό κέρδος/ζημιά</span><b class="num ${cls(p.pl)}">${signedMoney(p.pl)} (${pct(p.plPct, 1)})</b></div>
      <div class="rv-hint small muted">Πάτα μια μετοχή για λεπτομέρειες · σύρε αριστερά για αφαίρεση</div></section>`
    : card(emptyBox("Δεν έχεις βάλει ακόμα μετοχές", "Πάτα «Προσθήκη» για μία-μία ή «Από φωτογραφία» και διάλεξε screenshot από τον broker σου (π.χ. Revolut)."));
  // ό,τι υπήρχε και πριν: βαθμολογία, πορεία μήνα, υποψήφιες
  const bars = [["Ποιότητα μετοχών", p.quality, "Μέση βαθμολογία συστήματος, ζυγισμένη με το βάρος κάθε θέσης."], ["Τι λένε τα μοντέλα (1 μήνας)", p.model, "Πού βρίσκονται οι μετοχές σου στην κατάταξη της αγοράς."],
    ["Διασπορά", p.diversity, `${fmt(p.neff, 1)} «πραγματικές» θέσεις, μεγαλύτερος κλάδος ${pct(p.maxSec * 100, 0).replace("+", "")}.`], ["Ήρεμο (χαμηλό ρίσκο)", p.risk, `Κινείται περίπου ±${fmt(p.sd * 100, 1)}% τη μέρα.`]];
  const scoreC = hs.length ? card(`<div class="rv-sec" style="padding:0 0 8px"><b>Βαθμολογία χαρτοφυλακίου</b>${ring(p.score)}</div>${bars.map(([n, v, x]) => `<div class="meter"><span>${n}</span><div class="bar"><i style="width:${clamp(v ?? 0)}%;background:${(v ?? 0) >= 60 ? "var(--up)" : (v ?? 0) <= 40 ? "var(--down)" : "var(--warn)"}"></i></div><b class="num">${isNum(v) ? v.toFixed(0) : "—"}</b></div><div class="small muted" style="margin:-2px 0 8px">${x}</div>`).join("")}`) : "";
  const vm = p.val, lo1 = vm * (Math.exp(-p.sm) - 1), hi1 = vm * (Math.exp(p.sm) - 1), bad = vm * (Math.exp(-2 * p.sm) - 1);
  const outlook = hs.length ? card(`<h3>Πώς μπορεί να πάει τον επόμενο μήνα</h3>${kv([["Συνήθες εύρος (2 στους 3 μήνες)", `${mEur(lo1, 0)} έως +${mEur(hi1, 0).replace("−", "")}`], ["Κακός μήνας (1 στους 20)", mEur(bad, 0), "down"]])}
    <div class="small muted" style="margin-top:8px">Από το πόσο κινούνται οι μετοχές σου (μεταβλητότητα), όχι πρόβλεψη κατεύθυνσης.</div>`) : "";
  const capUsd = Math.max(p.val + cashUsd, toUsd(1000) || 1000);
  const cands = pfCandidates(capUsd, store.get("goal")?.risk || "mid");
  $("#view").innerHTML = `<div class="stack rv">${hero}${acts}${PF.goal ? `<a class="card pf-card" href="#/goal">${goalBar(PF.goal, fxRate() ? toEur(total) : total)}</a>` : ""}
    ${hold}${rvMovers()}<div class="wide2"><div class="stack">${scoreC}</div><div class="stack">${outlook}</div></div>
    ${sec("Τι θα μπορούσες να εξετάσεις", "", "από τη σημερινή ανάλυση")}${card(cands.length ? cands.map(candRow).join("") : emptyBox("Καμία κατάλληλη υποψήφια σήμερα", "Η αναμονή είναι κι αυτή θέση."), "flush")}
    <div class="note">${asOfTxt}${fxRate() ? `, 1 € = ${fmt(fxRate(), 4)} $` : ""}. Οι θέσεις σου μένουν μόνο σε αυτή τη συσκευή. Ανάλυση, όχι επενδυτική συμβουλή· καμία εντολή δεν εκτελείται από την εφαρμογή.</div></div>`;
  // ενέργειες
  $("#pfAdd").addEventListener("click", () => pfForm());
  $("#pfShot").addEventListener("click", () => pfImport());
  $("#pfMore").addEventListener("click", pfMore);
  $$(".rv-acts [data-go]").forEach((b) => b.addEventListener("click", () => { location.hash = b.dataset.go; }));
  $$("[data-mov]").forEach((b) => b.addEventListener("click", () => { RV.mov = b.dataset.mov; store.set("pfMov", RV.mov); router({ soft: true }); }));
  if (!hs.length) return;
  $("#rvEdit").addEventListener("click", () => { RV.edit = !RV.edit; router({ soft: true }); });
  $("#rvCashRow").addEventListener("click", pfMore);
  $$("[data-minus]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); const h = PF.list.find((x) => x.id === b.dataset.minus); if (h) pfAskRemove(h); }));
  $$("[data-del]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); pfRemove(b.dataset.del); }));
  $$("[data-open]").forEach((row) => {
    const item = row.closest(".rv-item"), id = row.dataset.open;
    row.addEventListener("click", () => {
      if (item.classList.contains("sw")) { item.classList.remove("sw"); return; }
      if (RV.edit) pfForm(PF.list.find((x) => x.id === id)); else pfDetail(id);
    });
    row.addEventListener("keydown", (e) => { if (e.key === "Enter") pfDetail(id); });
    // σύρσιμο αριστερά → εμφανίζεται το «Αφαίρεση»
    let x0 = null, y0 = 0, dx = 0;
    row.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; row.style.transition = "none"; }, { passive: true });
    row.addEventListener("touchmove", (e) => { if (x0 === null) return; dx = e.touches[0].clientX - x0; const dy = e.touches[0].clientY - y0;
      if (Math.abs(dy) > Math.abs(dx)) { x0 = null; row.style.transform = ""; return; }
      const base = item.classList.contains("sw") ? -96 : 0; item.classList.toggle("drag", base + dx < -4); row.style.transform = `translateX(${Math.min(0, Math.max(-120, base + dx))}px)`; }, { passive: true });
    row.addEventListener("touchend", () => { row.style.transition = ""; row.style.transform = ""; item.classList.remove("drag"); if (x0 === null) return; x0 = null;
      if (dx < -40) { $$(".rv-item.sw").forEach((o) => o !== item && o.classList.remove("sw")); item.classList.add("sw"); } else if (dx > 30) item.classList.remove("sw"); });
  });
  // γράφημα πορείας (με τις σημερινές ποσότητες)
  const box = $("#rvChartBox"), heroVal = $("#rvVal").innerHTML;
  const draw = async () => {
    let hist; try { hist = await pfHistory(p); } catch { hist = null; }
    if (!$("#rvChartBox")) return;
    const live = pfLivePoint(p, hist);
    let pts = (hist?.pts || []).slice(-RV.range - 1);
    if (live) pts = [...pts, live];
    box.innerHTML = rvChart(pts) + (hist && hist.inc.length < hist.all ? `<div class="small muted rv-cnote">Το γράφημα περιέχει ${hist.inc.length} από ${hist.all} μετοχές (για τις άλλες δεν υπάρχει ιστορικό)</div>` : "");
    const ch = $(".rv-chart", box); if (!ch || pts.length < 2) { $("#rvSub")?.setAttribute("hidden", ""); return; }
    $("#rvSub")?.removeAttribute("hidden");
    const first = pts[0][1], last = pts[pts.length - 1][1];
    const rngTxt = { 5: "1 εβδομάδα", 21: "1 μήνας", 63: "3 μήνες", 126: "6 μήνες", 252: "1 χρόνος" }[RV.range] || "";
    const setRange = () => { $("#rvChg").innerHTML = `${signedMoney(last - first)} ${arrowPct(first ? (last / first - 1) * 100 : null)} <span class="muted">· ${rngTxt}</span>`; };
    setRange();
    const cur = $(".rv-cur", ch), dot = $(".rv-dot", ch), a = pts.map((x) => x[1]), mn = Math.min(...a), mx = Math.max(...a), rg = mx - mn || 1;
    const at = (clientX) => { const r = ch.getBoundingClientRect(), f = clamp((clientX - r.left) / r.width, 0, 1), i = Math.round(f * (pts.length - 1));
      const [dd, v] = pts[i], x = (i / (pts.length - 1)) * r.width, y = r.height * (1 - (10 + ((v - mn) / rg) * (150 - 24)) / 150);
      cur.hidden = dot.hidden = false; cur.style.left = `${x}px`; dot.style.left = `${x}px`; dot.style.top = `${y}px`;
      $("#rvVal").innerHTML = bigMoney(v + cashUsd);
      $("#rvChg").innerHTML = `${signedMoney(v - first)} ${arrowPct(first ? (v / first - 1) * 100 : null)} <span class="muted">${dday(String(dd))}</span>`; };
    const off = () => { cur.hidden = dot.hidden = true; $("#rvVal").innerHTML = heroVal; setRange(); };
    ch.addEventListener("pointermove", (e) => at(e.clientX));
    ch.addEventListener("pointerdown", (e) => at(e.clientX));
    ch.addEventListener("pointerleave", off); ch.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") off(); });
    ch.addEventListener("touchmove", (e) => { at(e.touches[0].clientX); }, { passive: true });
  };
  $$("[data-rg]").forEach((b) => b.addEventListener("click", () => { RV.range = +b.dataset.rg; store.set("pfRange", RV.range); $$("[data-rg]").forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  draw();
};
