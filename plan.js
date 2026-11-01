/* US Alpha — Πλήρες σχέδιο για τον στόχο (ίδιο σε κινητό και υπολογιστή).
   Συνδέει τον στόχο με όλα τα υπόλοιπα: χαρτοφυλάκιο, ευκαιρίες με ζώνη εισόδου/stop/στόχους, προβλέψεις μοντέλων,
   day trade, «οι προβλέψεις μου», διάθεση αγοράς, ενημέρωση AI. Οι αριθμοί υπολογίζονται από τον κώδικα με τα δεδομένα
   της τελευταίας ανάλυσης· τίποτα δεν είναι εγγύηση. Ανάλυση για να αποφασίσεις μόνος σου, όχι επενδυτική συμβουλή. */
"use strict";

const PLAN_RISK = { low: 0.5, mid: 1, high: 1.5 };          // % του κεφαλαίου που ρισκάρεις ανά θέση ως το stop
const PLAN_SLOTS = { low: 4, mid: 6, high: 8 };             // πόσες μετοχές στο κομμάτι «μετοχές»
const PLAN_SATSD = { low: 0.22, mid: 0.25, high: 0.32 };    // διακύμανση του κομματιού «μετοχές» (υπόθεση)
const pH = (n, t, sub = "") => `<div class="plan-h"><span class="plan-n">${n}</span><div><h3>${t}</h3>${sub ? `<div class="small muted">${sub}</div>` : ""}</div></div>`;
const pLi = (x) => `<li><span>${x}</span></li>`;
const pUl = (xs, c = "") => `<ul class="list ${c}">${xs.filter(Boolean).map(pLi).join("")}</ul>`;
const pMoney = (v$) => (fxRate() ? eur(toEur(v$)) : usd(v$));
const pAt = (ts, o = { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) => new Date(ts).toLocaleString("el-GR", { timeZone: "Europe/Athens", hourCycle: "h23", ...o });
const pProb = (p) => (p >= 0.995 ? "πάνω από 99%" : p <= 0.005 ? "κάτω από 1%" : `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`);
const pPer = (m) => (m === 1 ? "1 μήνα" : goalPeriod(m));

// οι επόμενες εργάσιμες της Wall Street (ώρα Ελλάδας)
function planDays(n = 5) {
  const out = []; let T = sessionInfo();
  for (let k = 0; k < n; k++) {
    out.push(T);
    let d = new Date(T.day + "T12:00:00Z");
    do { d = new Date(d.getTime() + 864e5); } while (typeof isTradingDay === "function" && !isTradingDay(d.toISOString().slice(0, 10)));
    const probe = new Date(d.toISOString().slice(0, 10) + "T12:00:00Z");
    const nyH = +new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false }).format(probe), off = 12 - nyH;
    const day = d.toISOString().slice(0, 10), at = (h, m) => Date.parse(day + "T00:00:00Z") + ((h + off) * 60 + m) * 60000;
    T = { day, open: at(9, 30), close: at(16, 0) };
  }
  return out;
}

// σήμα της ανάλυσης για μια μετοχή (αν υπάρχει)
const planSig = (t) => (D()?.signals || []).find((s) => s.ticker === t && s.bias !== "bearish") || null;

function planPredLines(t) {
  const r = Data.row(t) || {}, out = [];
  const a5 = rankOf(r, "rank5"), a21 = rankOf(r, "rank21");
  const okTxt = (a) => (a.ok ? "επικυρωμένο μοντέλο" : "ενδεικτικό· το μοντέλο δεν έχει περάσει ακόμα τον έλεγχο");
  if (a5) out.push(`Μοντέλο 5 ημερών (${a5.ver}): <b>${topPct(a5.v)}</b> της αγοράς — ${okTxt(a5)}.`);
  if (a21) out.push(`Μοντέλο 1 μήνα (${a21.ver}): <b>${topPct(a21.v)}</b> της αγοράς — ${okTxt(a21)}.`);
  if (isNum(r.s)) out.push(`Βαθμολογία συστήματος <b>${r.s.toFixed(0)}/100</b>${r.b ? `, τάση ${r.b === "bullish" ? "ανοδική" : r.b === "bearish" ? "πτωτική" : "ουδέτερη"}` : ""}.`);
  const mm = [isNum(r.m1) ? `1 μήνας ${pct(r.m1, 1)}` : "", isNum(r.m3) ? `3 μήνες ${pct(r.m3, 1)}` : "", isNum(r.rsi) ? `RSI ${r.rsi.toFixed(0)}` : "", isNum(r.atr) ? `κινείται ~${fmt(r.atr, 1)}% τη μέρα` : ""].filter(Boolean);
  if (mm.length) out.push(mm.join(" · ") + ".");
  if (Data.aiFor?.(t)) out.push(`<span class="muted">AI:</span> ${esc(Data.aiFor(t))}`);
  return out;
}

// μία μετοχή του σχεδίου: πότε, πόσο, stop, στόχοι, πώς βγαίνεις, όλες οι προβλέψεις
function planStock(c, i, days) {
  const s = planSig(c.t), r = Data.row(c.t) || {}, fx = fxRate();
  const riskUsd = c.sh * (c.entry - c.stop), lo = s?.entryLow ?? c.entry * 0.995, hi = s?.entryHigh ?? c.entry * 1.005;
  const tp1 = s?.tp1 ?? c.entry + 1.5 * (c.entry - c.stop), tp2 = s?.tp2 ?? c.entry + 3 * (c.entry - c.stop);
  const first = days[0], when = s?.horizon === "day"
    ? `Μόνο ${pAt(first.open, { weekday: "long" })}, μετά τις ${pAt(first.open + 15 * 60000, { hour: "2-digit", minute: "2-digit" })} (αφού περάσει το πρώτο τέταρτο), και μόνο αν η τιμή είναι μέσα στη ζώνη. Κλείνεις την ίδια μέρα, πριν τις ${pAt(first.close - 15 * 60000, { hour: "2-digit", minute: "2-digit" })}.`
    : s ? `Τις επόμενες 1-3 συνεδριάσεις (από ${pAt(first.open, { weekday: "long", day: "numeric", month: "short" })}), με εντολή ορίου (limit) μέσα στη ζώνη. Αν η τιμή φύγει πάνω από ${fmt(hi * 1.02)} χωρίς να σε πιάσει, την αφήνεις: δεν κυνηγάς.`
      : `Σταδιακά: μισή θέση ${pAt(first.open, { weekday: "long", day: "numeric", month: "short" })} κοντά στα ${fmt(c.entry)}, την άλλη μισή σε 1-2 εβδομάδες μόνο αν το μοντέλο 1 μήνα τη δείχνει ακόμα στο top 20%.`;
  const exit = s?.horizon === "day"
    ? ["Stop: αν πιάσει, βγαίνεις αμέσως.", `Στο ${fmt(tp1)} πουλάς τη μισή και μεταφέρεις το stop στην τιμή εισόδου.`, `Στο ${fmt(tp2)} ή στο κλείσιμο βγαίνεις με όλη.`]
    : [`Stop ${fmt(c.stop)} από την πρώτη μέρα (ρισκάρεις περίπου ${pMoney(riskUsd)}). Δεν το κατεβάζεις ποτέ.`,
      `Στον πρώτο στόχο ${fmt(tp1)}: πουλάς το 1/3 και ανεβάζεις το stop στην τιμή εισόδου (από εκεί και πέρα δεν μπορεί να γίνει ζημιά).`,
      `Στον δεύτερο στόχο ${fmt(tp2)}: πουλάς άλλο 1/3· το υπόλοιπο το αφήνεις να τρέξει με stop κάτω από το χαμηλό της προηγούμενης εβδομάδας.`,
      s ? `Αν σε ${s.horizon === "short" ? "5" : "25"} συνεδριάσεις δεν έχει πάει πουθενά, βγαίνεις: τα χρήματα κάνουν καλύτερη δουλειά αλλού.` : "Κάθε μήνα: αν το μοντέλο 1 μήνα την κατεβάσει κάτω από τη μέση της αγοράς ή η βαθμολογία πέσει κάτω από 50, βγαίνεις."];
  const why = [s ? `Σχέδιο της ανάλυσης: <b>${esc(s.setup || HZ[s.horizon] || s.horizon)}</b> (${HZ[s.horizon] || s.horizon}${s.holding ? `, κράτημα ${esc(s.holding)}` : ""}${s.confidence ? `, βεβαιότητα ${esc(s.confidence).toLowerCase()}` : ""}${isNum(s.rr) ? `, κέρδος/ρίσκο ${fmt(s.rr, 1)}` : ""}).` : `Από τις ψηλότερες του μοντέλου 1 μήνα σε μεγάλη, ρευστή μετοχή.`,
    ...planPredLines(c.t), ...((s?.conflicts || []).slice(0, 1).map((x) => `<span class="warn">Προσοχή:</span> ${esc(x)}`)), ...((s?.risks || []).slice(0, 2).map((x) => `<span class="warn">Κίνδυνος:</span> ${esc(x)}`))];
  return `<details class="plan-stock" ${i < 2 ? "open" : ""}><summary>${logo(c.t)}<div style="min-width:0"><div class="tk">${esc(c.t)} ${c.newSec ? chip("νέος κλάδος", "accent") : ""}</div><div class="nm">${esc(r.n || "")}${r.sec ? ` · ${esc(r.sec)}` : ""}</div></div>
      <div class="right"><b class="num">${fmt(c.sh, c.sh < 10 ? 2 : 0)} μτχ</b><span class="small muted">${pMoney(c.amt)}</span></div></summary>
    <div class="plan-body">
      ${kv([s ? ["Ζώνη εισόδου", `${fmt(lo)} – ${fmt(hi)}`] : ["Τιμή αναφοράς", fmt(c.entry)], ["Stop", fmt(c.stop), "down"], ["Στόχος 1", fmt(tp1), "up"], ["Στόχος 2", fmt(tp2), "up"], ["Ποσό", pMoney(c.amt)], ["Ρίσκο ως το stop", pMoney(riskUsd), "down"]])}
      ${s ? "" : `<div class="small muted" style="margin-top:6px">Stop 1,5 × η μέση ημερήσια κίνηση κάτω από την τιμή· στόχοι 1,5× και 3× το ρίσκο.</div>`}
      <div class="plan-sub">Πότε μπαίνεις</div><p class="small" style="margin:0">${when}</p>
      <div class="plan-sub">Πώς βγαίνεις</div>${pUl(exit, "small")}
      <div class="plan-sub">Γιατί και τι προβλέπουν τα μοντέλα</div>${pUl(why, "small")}
      <a class="btn sm" href="#/s/${encodeURIComponent(c.t)}" style="margin-top:10px">Η σελίδα της ${esc(c.t)}</a></div></details>`;
}

function goalPlan(G) {
  const d = D(); if (!d) return "";
  const fx = fxRate(), need = needAnnual(G.start, G.target, G.months, G.monthly || 0), [tone, lbl, why] = realism(need);
  const al = ALLOC[G.risk] || ALLOC.mid, rp = PLAN_RISK[G.risk] || 1, slots = PLAN_SLOTS[G.risk] || 6;
  const capUsd = toUsd(G.start) || G.start * 1.08, coreE = G.start * al.core / 100, satE = G.start * al.sat / 100;
  const days = planDays(6), first = days[0];
  const m = d.market || {}, R = REGIME[m.regime] || { head: "—", tone: "neutral" }, vix = d.idx?.["^VIX"]?.p, spy = d.idx?.SPY || {};
  const fear = m.regime === "Risk-off" || (isNum(vix) && vix >= 25);
  const val = validated(), act4 = Object.entries(d.model4?.models || {}).filter(([, x]) => x.active).map(([k]) => k);
  const HN = { rank21: "κατάταξη 1 μήνα", rank5: "κατάταξη 5 ημερών", day: "day trade", short: "5 ημέρες", swing: "swing" };
  const p = PF.list.length ? pfCalc() : null, nowEur = p ? (toEur(p.val) || 0) + PF.cash : null;
  const sat$ = toUsd(satE) || satE * 1.08, cands = pfCandidates(capUsd, G.risk, slots), perPos$ = Math.min(capUsd * al.pos / 100, sat$ / Math.max(3, cands.length));
  for (const c of cands) { const sh = Math.min(c.sh, perPos$ / c.entry); c.sh = sh >= 1 ? Math.floor(sh * 100) / 100 : Math.floor(sh * 1000) / 1000; c.amt = c.sh * c.entry; }
  const sigCands = cands.filter((c) => c.kind === "sig"), modCands = cands.filter((c) => c.kind !== "sig");
  const satUsed$ = cands.reduce((s, c) => s + c.amt, 0), satLeft$ = Math.max(0, sat$ - satUsed$);
  // σενάρια: δείκτης + μετοχές με βάση το προφίλ ρίσκου (υποθέσεις από την ιστορία, όχι πρόβλεψη)
  const c = al.core / 100, s = al.sat / 100, sdS = PLAN_SATSD[G.risk] || 0.25, sd = Math.sqrt((c * 0.17) ** 2 + (s * sdS) ** 2 + 2 * c * s * 0.17 * sdS * 0.8);
  const sim = simulate(G.start, G.target, G.months, G.monthly || 0, 0.08, sd);
  const pathAt = (mm, ann) => { const i = (1 + ann) ** (1 / 12) - 1; return G.start * (1 + i) ** mm + (i ? (G.monthly || 0) * (((1 + i) ** mm - 1) / i) : (G.monthly || 0) * mm); };
  const checkpoints = [1, 3, 6, 12, 24, 36, 60, 84, 120].filter((x) => x <= G.months);
  if (!checkpoints.includes(G.months)) checkpoints.push(G.months);
  const tranches = fear ? 3 : 2, tr = coreE / tranches;
  const secs = (d.sectors || []).filter((x) => isNum(x.rel21)).sort((a, b) => b.rel21 - a.rel21);
  const brief = typeof briefOf === "function" ? briefOf() : null;
  const dayL = (d.day?.long || []).slice(0, 3);
  const mine = (typeof myList === "function" ? myList() : []).filter((t) => Data.row(t)).slice(0, 8);
  const aggressive = need > 0.15;

  // ---------------------------------------------------------------- 0. ειλικρινά, πριν από το σχέδιο
  const honest = card(`<div class="verdict t-${tone === "up" ? "up" : tone === "warn" ? "neutral" : "down"}"><span class="tag">Ειλικρινά, πριν από το σχέδιο</span>
    ${pUl([need <= 0.001 ? `Με τις μηνιαίες καταθέσεις φτάνεις τα ${eur(G.target)} ακόμα και χωρίς καμία απόδοση. Ό,τι κερδίσεις είναι επιπλέον· το σχέδιο εδώ προστατεύει κυρίως από μεγάλες πτώσεις.` : `Ο στόχος θέλει <b>~${pct(need * 100, 0).replace("+", "")} το χρόνο</b>: <b>${lbl.toLowerCase()}</b>. ${why}`,
      `Με το μείγμα αυτού του σχεδίου, η πιθανότητα να φτάσεις τα ${eur(G.target)} σε ${goalPeriod(G.months)} βγαίνει περίπου <b>${pProb(sim.p)}</b> (χοντρική εκτίμηση από 3.000 σενάρια).`,
      val.length || act4.length ? `Μοντέλα που έχουν περάσει τον αυστηρό έλεγχο: <b>${[...new Set([...val.map((k) => HN[k] || k), ...act4.map((k) => (HN[k] || k) + " (v4)")])].join(", ")}</b>. Όλες οι άλλες προβλέψεις είναι ενδεικτικές.` : "Κανένα μοντέλο δεν έχει περάσει ακόμα τον αυστηρό έλεγχο: όλες οι προβλέψεις είναι ενδεικτικές.",
      "Καμία πρόβλεψη δεν είναι σίγουρη. Το σχέδιο κερδίζει με κανόνες (μικρό ρίσκο ανά θέση, stop, υπομονή), όχι επειδή «ξέρει» το μέλλον."])}</div>`);

  // ---------------------------------------------------------------- 1. ο πραγματικός στόχος
  const s1 = card(`${pH(1, "Ο πραγματικός στόχος", "τι σημαίνει «πάω καλά» σε κάθε σημείο της διαδρομής")}
    ${pUl([`Τελικός στόχος: <b>${eur(G.start)} → ${eur(G.target)}</b> σε ${goalPeriod(G.months)}${G.monthly ? `, με ${eur(G.monthly)} κάθε μήνα` : ""}.`,
      `Στόχος 3-6 μηνών: να είσαι <b>μέσα στην πορεία</b> (πίνακας παρακάτω) <b>και</b> καμία θέση να μην έχει χάσει περισσότερο από όσο όρισες στο stop. Το δεύτερο μετράει περισσότερο από το πρώτο.`,
      aggressive ? `Επειδή ο ρυθμός που χρειάζεται είναι πάνω από 15% το χρόνο, ο λογικός «ενδιάμεσος» στόχος είναι πρώτα να πας καλύτερα από τον δείκτη S&P 500, χωρίς μεγάλες πτώσεις. Αν το πετυχαίνεις σταθερά, ο μεγάλος στόχος πλησιάζει.` : "Ο ρυθμός είναι κοντά σε αυτό που δίνει ιστορικά η αγορά: η πειθαρχία μετράει περισσότερο από τις «έξυπνες» επιλογές."])}
    <table class="cmp"><thead><tr><th>Σημείο ελέγχου</th><th>Με τον ρυθμό του στόχου</th><th>Με ~8% (αγορά)</th></tr></thead><tbody>
    ${checkpoints.map((mm) => `<tr><td>${pPer(mm)}</td><td class="num">${eur(pathAt(mm, need))}</td><td class="num">${eur(pathAt(mm, 0.08))}</td></tr>`).join("")}</tbody></table>
    ${isNum(nowEur) && fx && nowEur > 0 ? `<div class="small muted">Σήμερα το χαρτοφυλάκιό σου είναι ${eur(nowEur)}.</div>` : ""}`);

  // ---------------------------------------------------------------- 2. χάρτης αγοράς
  const s2 = card(`${pH(2, "Ο χάρτης της αγοράς σήμερα", `ανάλυση ${dday(d.asOf)}`)}
    ${pUl([`Διάθεση αγοράς: <b>${R.head}</b>${isNum(m.score) ? ` (${m.score.toFixed(0)}/100)` : ""}. ${(m.simple || [])[0] ? esc(m.simple[0]) : ""}`,
      isNum(spy.ch) || isNum(spy.p) ? `S&P 500 (SPY): ${fmt(spy.p)} (${pct(spy.ch)} την τελευταία μέρα)${isNum(m.spy?.ret21) ? `, ${pct(m.spy.ret21, 1)} τον τελευταίο μήνα` : ""}${m.spy && m.spy.above200 === false ? ", <span class=\"warn\">κάτω από τον μέσο όρο 200 ημερών</span>" : ""}.` : "",
      isNum(vix) ? `VIX (φόβος): ${fmt(vix, 1)} — ${vix >= 25 ? "υψηλός: μικρότερες θέσεις, είσοδος σε δόσεις" : vix >= 18 ? "μέτριος" : "χαμηλός: ήρεμη αγορά"}.` : "",
      secs.length ? `Δυνατοί κλάδοι (1 μήνας vs S&P): ${secs.slice(0, 3).map((x) => `${esc(x.sector)} ${pct(x.rel21, 1)}`).join(", ")}.` : "",
      secs.length > 3 ? `Αδύναμοι κλάδοι: ${secs.slice(-3).reverse().map((x) => `${esc(x.sector)} ${pct(x.rel21, 1)}`).join(", ")}.` : "",
      brief?.headline ? `Τελευταία ενημέρωση AI (${esc(brief.label || "")}): «${esc(brief.headline)}» <a href="#/brief">όλη η ενημέρωση</a>` : "",
      fear ? "<b>Τι σημαίνει για το σχέδιο:</b> η αγορά είναι επιφυλακτική, άρα μπαίνεις σε δόσεις και με μικρότερο ρίσκο ανά θέση στην αρχή." : "<b>Τι σημαίνει για το σχέδιο:</b> κανονικές συνθήκες· ακολουθείς το σχέδιο όπως είναι."])}`);

  // ---------------------------------------------------------------- 3. ψυχολογία
  const s3 = card(`${pH(3, "Η δική σου ψυχολογία", "οι παγίδες που χαλάνε τα περισσότερα σχέδια")}
    ${pUl([`<b>Φόβος ότι θα χάσεις την ευκαιρία (FOMO):</b> μια μετοχή ανέβηκε 15% και θες να μπεις. Κανόνας: αν η τιμή είναι πάνω από τη ζώνη εισόδου, δεν μπαίνεις. Θα έρθει άλλη ευκαιρία.`,
      `<b>Δεν δέχεσαι τη ζημιά:</b> το stop πιάνει και «περιμένεις να γυρίσει». Κανόνας: το stop δεν το κατεβάζεις ποτέ. Μικρή ζημιά = κανονικό κόστος της δουλειάς.`,
      `<b>Υπερβολική σιγουριά μετά από κέρδη:</b> 3 καλές συναλλαγές και διπλασιάζεις το ποσό. Κανόνας: το ρίσκο ανά θέση μένει ${String(rp).replace(".", ",")}% του κεφαλαίου, όσο καλά κι αν πας.`,
      `<b>«Να τα πάρω πίσω»:</b> μετά από ζημιά, βιαστική νέα συναλλαγή. Κανόνας: μετά από 3 stop στη σειρά, 2 εβδομάδες μόνο παρακολούθηση.`,
      `<b>Η τιμή αγοράς σε «δένει»:</b> κρατάς μια αδύναμη μετοχή μέχρι να «βγει μηδέν». Η αγορά δεν ξέρει σε τι τιμή αγόρασες· κρίνεις τη θέση με τη σημερινή εικόνα.`,
      aggressive ? `<b>Ο στόχος σε πιέζει:</b> ένας φιλόδοξος στόχος σπρώχνει σε μεγάλα ρίσκα. Αν μείνεις πίσω, μεγαλώνεις τον χρόνο ή τη μηνιαία κατάθεση, όχι το ρίσκο.` : ""])}`);

  // ---------------------------------------------------------------- 4. κανόνες
  const s4 = card(`${pH(4, "Οι κανόνες του σχεδίου", `προφίλ ρίσκου «${RISKS.find((x) => x[0] === G.risk)?.[1].toLowerCase()}»`)}
    ${kv([["Σε δείκτη S&P 500", `${al.core}% · ${eur(coreE)}`], ["Σε μετοχές", `${al.sat}% · ${eur(satE)}`], ["Μετοχές ταυτόχρονα", `έως ${slots}`], ["Το πολύ ανά μετοχή", `${al.pos}% · ${eur(G.start * al.pos / 100)}`],
      ["Ρίσκο ανά θέση ως το stop", `${String(rp).replace(".", ",")}% · ${eur(G.start * rp / 100)}`], ["Το πολύ ανά κλάδο", "30%"]])}
    ${pUl([`Κάθε μήνα${G.monthly ? ` τα ${eur(G.monthly)} μοιράζονται ${al.core}% στον δείκτη και ${al.sat}% σε νέες ευκαιρίες` : " κάνεις τον έλεγχο του χαρτοφυλακίου"}.`,
      "Κάθε 3 μήνες επαναφέρεις τα ποσοστά δείκτη/μετοχών στα παραπάνω.",
      "Κρατάς πάντα ένα μικρό απόθεμα μετρητών (5-10%) για ευκαιρίες και για να μη χρειαστεί να πουλήσεις σε κακή στιγμή.",
      G.risk === "high" ? "Day trade: το πολύ 10% του κεφαλαίου, μία θέση τη φορά, πάντα κλείνει την ίδια μέρα." : "Day trade: όχι σε αυτό το προφίλ ρίσκου."], "small")}`);

  // ---------------------------------------------------------------- 5. παγίδες
  const s5 = card(`${pH(5, "Παγίδες που θα σου στήσουν (και πώς τις καταλαβαίνεις)")}
    ${pUl(["<b>«Σίγουρο κέρδος» από social media / Telegram:</b> κανείς δεν ξέρει σίγουρα. Αν κάποιος το λέει, συνήθως πουλάει (τη μετοχή ή τη συνδρομή του).",
      "<b>Pump & dump:</b> μικρή άγνωστη μετοχή +80% σε μια μέρα με «νέα» χωρίς επίσημη ανακοίνωση. Το σύστημα κόβει τις πολύ μικρές και αραιές μετοχές· κι εσύ το ίδιο.",
      "<b>Μόχλευση (CFDs, margin):</b> μεγαλώνει και τις ζημιές· με μόχλευση ένα κακό απόγευμα μπορεί να σβήσει μήνες προόδου. Δεν μπαίνει στο σχέδιο.",
      "<b>Μέσος όρος προς τα κάτω χωρίς σχέδιο:</b> αγοράζεις κι άλλη επειδή έπεσε. Προσθέτεις μόνο σε θέση που κερδίζει και έχει νέο σήμα.",
      "<b>Το ίδιο το σύστημα:</b> τα ενδεικτικά μοντέλα μπορεί να κάνουν λάθος για εβδομάδες. Γι' αυτό το μεγαλύτερο κομμάτι πάει στον δείκτη και κάθε θέση έχει stop.",
      aggressive ? `⚠️ <b>Στο δικό σου σχέδιο:</b> ο στόχος θέλει ${pct(need * 100, 0).replace("+", "")} το χρόνο. Αν για να τον «πιάσεις» αρχίσεις να βάζεις πολλά σε λίγες νευρικές μετοχές, το πιθανότερο είναι να απομακρυνθείς. Η έντιμη εκδοχή: ίδιο σχέδιο, περισσότερος χρόνος ή μεγαλύτερη μηνιαία κατάθεση.` : ""])}`);

  // ---------------------------------------------------------------- 6. πιθανότητες
  const s6 = card(`${pH(6, "Πιθανότητες: τρία σενάρια", "χοντρικές εκτιμήσεις από 3.000 προσομοιώσεις, όχι πρόβλεψη")}
    <table class="cmp"><thead><tr><th>Σενάριο</th><th>Τελική αξία</th><th>Τι το προκαλεί</th></tr></thead><tbody>
      <tr><td><b class="up">Καλό</b><div class="small muted">1 στις 10 φορές ή καλύτερα</div></td><td class="num">${eur(sim.hi)}</td><td class="small">Ανοδική αγορά, οι μετοχές του σχεδίου πιάνουν στόχους, λίγα stop.</td></tr>
      <tr><td><b>Πιθανό</b><div class="small muted">το μεσαίο σενάριο</div></td><td class="num">${eur(sim.med)}</td><td class="small">Κανονική χρονιά με σκαμπανεβάσματα· τα κέρδη έρχονται κυρίως από τον δείκτη.</td></tr>
      <tr><td><b class="down">Κακό</b><div class="small muted">1 στις 10 φορές ή χειρότερα</div></td><td class="num">${eur(sim.lo)}</td><td class="small">Πτώση της αγοράς ή ύφεση· πολλά stop. Εδώ σε σώζουν οι κανόνες.</td></tr></tbody></table>
    ${pUl([`Πιθανότητα να φτάσεις τον στόχο: <b>~${pProb(sim.p)}</b>. Πιθανότητα κάποια στιγμή να βρεθείς 30% κάτω από όσα έβαλες: <b>~${(sim.lose * 100).toFixed(0)}%</b>.`,
      `Γιατί: υπόθεση ~8% μέση απόδοση το χρόνο και διακύμανση ${fmt(sd * 100, 0)}% για αυτό το μείγμα (${al.core}% δείκτης, ${al.sat}% μετοχές). Ένα πραγματικό πλεονέκτημα από τα μοντέλα θα ανέβαζε τις πιθανότητες, αλλά δεν το υπολογίζουμε πριν αποδειχθεί.`], "small")}`);

  // ---------------------------------------------------------------- 7. οι επόμενες κινήσεις: πότε, πού, πόσο
  const idx = card(`<div class="plan-sub" style="margin-top:0">Α. Το κομμάτι του δείκτη (${eur(coreE)})</div>
    ${pUl([`Αγοράζεις ETF που ακολουθεί τον S&P 500 σε <b>${tranches} δόσεις των ${eur(tr)}</b>: ${days[0] ? `1η ${pAt(days[0].open + 30 * 60000, { weekday: "long", day: "numeric", month: "short" })} μετά τις ${pAt(days[0].open + 30 * 60000, { hour: "2-digit", minute: "2-digit" })}` : "την πρώτη εργάσιμη"}, ${tranches === 3 ? "2η σε 1 μήνα, 3η σε 2 μήνες" : "2η σε 1 μήνα"}.`,
      fear ? "Γιατί σε 3 δόσεις: η αγορά είναι φοβισμένη. Αν πέσει κι άλλο, οι επόμενες δόσεις αγοράζουν φθηνότερα." : "Γιατί σε 2 δόσεις: ιστορικά η εφάπαξ αγορά κερδίζει συχνότερα, αλλά οι δόσεις μειώνουν τη στενοχώρια αν πέσει αμέσως μετά.",
      "Αν ο broker σου (ΕΕ) δεν δίνει το αμερικανικό SPY, παίρνεις το αντίστοιχο ευρωπαϊκό ETF για τον S&P 500 (τύπου UCITS) — ίδια ουσία.",
      "Αυτό το κομμάτι δεν έχει stop: είναι η βάση που μένει. Το κοιτάς μία φορά στους 3 μήνες."], "small")}`);
  const stocks = cands.length ? `${card(`<div class="plan-sub" style="margin-top:0">Β. Το κομμάτι των μετοχών (${eur(satE)}) — ${cands.length} υποψήφιες σήμερα</div>
      <p class="small soft" style="margin:0 0 6px">Το πολύ ${pMoney(perPos$)} ανά μετοχή, ώστε όλες μαζί να χωράνε στο κομμάτι των μετοχών· καμία δεν ρισκάρει πάνω από ${String(rp).replace(".", ",")}% του κεφαλαίου ως το stop. Μπορείς να αγοράζεις και κλάσματα μετοχής, αν το δίνει ο broker σου. ${sigCands.length ? `${sigCands.length} με έτοιμο σχέδιο εισόδου από την ανάλυση` : ""}${sigCands.length && modCands.length ? ", " : ""}${modCands.length ? `${modCands.length} από τις κορυφαίες του μοντέλου 1 μήνα` : ""}.${satLeft$ > 50 ? ` Μένουν αδιάθετα ~${pMoney(satLeft$)}: περιμένουν τις επόμενες ευκαιρίες, δεν τα «σπρώχνεις».` : ""}</p>`, "")}
      <div class="stack" style="gap:10px">${cands.map((x, i) => planStock(x, i, days)).join("")}</div>`
    : card(`<div class="plan-sub" style="margin-top:0">Β. Το κομμάτι των μετοχών (${eur(satE)})</div><p class="small soft" style="margin:0">Σήμερα δεν υπάρχει μετοχή που να περνά όλα τα κριτήρια για αυτό το προφίλ ρίσκου. Τα χρήματα περιμένουν σε μετρητά· ξανακοιτάς μετά τη βραδινή ανάλυση. Η αναμονή είναι κι αυτή κίνηση.</p>`);
  const dt = G.risk === "high" && dayL.length ? card(`<div class="plan-sub" style="margin-top:0">Γ. Day trade για ${pAt(first.open, { weekday: "long" })} (το πολύ ${eur(G.start * 0.1)})</div>
      ${pUl(dayL.map((x) => `<b>${esc(x.ticker)}</b>: ζώνη ${fmt(x.entryLow)}–${fmt(x.entryHigh)}, stop ${fmt(x.stop)}, στόχοι ${fmt(x.tp1)} / ${fmt(x.tp2)}. Μόνο μέσα στη ζώνη, κλείνει την ίδια μέρα. ${Data.aiFor?.(x.ticker) ? `<span class="muted">AI: ${esc(Data.aiFor(x.ticker))}</span>` : ""}`), "small")}
      <div class="small muted">Μία θέση τη φορά. Αν χάσεις 2 day trade την ίδια εβδομάδα, σταματάς ως τη Δευτέρα.</div>`) : "";
  const hold = p && p.hs.length ? card(`<div class="plan-sub" style="margin-top:0">${G.risk === "high" && dayL.length ? "Δ" : "Γ"}. Τι κάνεις με όσα ήδη έχεις</div>
      ${pUl(p.hs.map((h) => { const a = pfAdvice(h), act = a.tone === "up" ? "κρατάς και ανεβάζεις το stop όσο ανεβαίνει" : a.tone === "down" ? "ξανασκέψου αν ισχύει ο λόγος που την πήρες· αν όχι, έξω ή μείωση" : "κρατάς με stop";
        return `<b>${esc(h.t)}</b> (${pct(h.plPct, 1)}, ${pct(h.w * 100, 0).replace("+", "")} του χαρτοφυλακίου): <span class="${a.tone === "up" ? "up" : a.tone === "down" ? "down" : ""}">${a.head.toLowerCase()}</span> — ${act}. ${a.lines.slice(0, 2).join(" ")}`; }), "small")}
      ${p.maxSec > 0.3 ? `<div class="small warn">Ο μεγαλύτερος κλάδος είναι το ${pct(p.maxSec * 100, 0).replace("+", "")} του χαρτοφυλακίου (πάνω από 30%): οι νέες αγορές πάνε σε άλλους κλάδους.</div>` : ""}`) : "";
  const mineC = mine.length ? card(`<div class="plan-sub" style="margin-top:0">Οι μετοχές που παρακολουθείς («Οι προβλέψεις μου»)</div>
      ${pUl(mine.map((t) => { const r = Data.row(t), a5 = rankOf(r, "rank5"), a21 = rankOf(r, "rank21"), sg = planSig(t);
        return `<b>${esc(t)}</b>: 5 ημέρες ${a5 ? topPct(a5.v) : "—"}${a5 && !a5.ok ? " (ενδεικτικό)" : ""}, 1 μήνας ${a21 ? topPct(a21.v) : "—"}${a21 && !a21.ok ? " (ενδεικτικό)" : ""}${sg ? ` · <span class="up">έχει σχέδιο εισόδου ${fmt(sg.entryLow)}–${fmt(sg.entryHigh)}, stop ${fmt(sg.stop)}</span>` : " · χωρίς σχέδιο εισόδου σήμερα: περιμένεις"}.`; }), "small")}`) : "";
  const s7 = `${sec("7. Οι επόμενες κινήσεις", "", "πότε, πού, πόσο")}${idx}${stocks}${dt}${hold}${mineC}`;

  // ---------------------------------------------------------------- 8. οδικός χάρτης
  const s8 = card(`${pH(8, "Όλα μαζί: ο οδικός χάρτης", "πώς το ένα τροφοδοτεί το άλλο")}
    <p class="small soft" style="margin:0 0 8px">Ο δείκτης δίνει τη βάση και τη σταθερότητα· οι μετοχές του συστήματος προσπαθούν να προσθέσουν κάτι παραπάνω με μικρό, ελεγχόμενο ρίσκο· τα μοντέλα επιλέγουν και ταξινομούν· η ενημέρωση AI τρεις φορές τη μέρα σε κρατά ενήμερο· το χαρτοφυλάκιο και ο στόχος δείχνουν αν είσαι στην πορεία.</p>
    <div class="plan-phase"><b>Φάση 1 — Στήσιμο (εβδομάδες 1-2)</b>${pUl([`1η δόση του δείκτη (${eur(tr)}).`, `Οι πρώτες ${Math.min(3, cands.length || 3)} μετοχές, μόνο όσες μπουν στη ζώνη τους.`, "Stop σε κάθε θέση από την πρώτη μέρα."], "small")}
      <div class="small"><span class="up">Δουλεύει όταν:</span> οι θέσεις μπήκαν μέσα στις ζώνες και κανένα stop δεν μετακινήθηκε. <span class="warn">Αλλάζεις όταν:</span> 2 stop την πρώτη εβδομάδα → μισό ρίσκο ανά θέση για έναν μήνα.</div></div>
    <div class="plan-phase"><b>Φάση 2 — Χτίσιμο (μήνες 1-3)</b>${pUl([`Οι υπόλοιπες δόσεις του δείκτη.`, `Συμπληρώνεις έως ${slots} μετοχές από τις νέες ευκαιρίες κάθε βράδυ, σε διαφορετικούς κλάδους.`, "Στους πρώτους στόχους κατοχυρώνεις και ανεβάζεις stop.", G.monthly ? `Η μηνιαία κατάθεση (${eur(G.monthly)}) μπαίνει με τον ίδιο κανόνα.` : ""], "small")}
      <div class="small"><span class="up">Δουλεύει όταν:</span> είσαι κοντά ή πάνω από την πορεία του πίνακα και οι κερδισμένες θέσεις είναι μεγαλύτερες από τις χαμένες. <span class="warn">Αλλάζεις όταν:</span> το χαρτοφυλάκιο πέσει πάνω από ${G.risk === "low" ? "8" : G.risk === "mid" ? "15" : "25"}% από την κορυφή του → μόνο δείκτης ώσπου να ηρεμήσει η αγορά.</div></div>
    <div class="plan-phase"><b>Φάση 3 — Διατήρηση (μήνας 3 έως το τέλος)</b>${pUl(["Μηνιαίος έλεγχος εδώ: αδύναμες θέσεις έξω, δυνατές μένουν με ανεβασμένο stop.", "Κάθε 3 μήνες επαναφορά ποσοστών δείκτη/μετοχών.", `Τους τελευταίους ${G.months >= 24 ? "6" : "2"} μήνες μειώνεις σταδιακά το κομμάτι των μετοχών: όταν πλησιάζεις τον στόχο, προστατεύεις όσα έφτιαξες.`], "small")}
      <div class="small"><span class="up">Δουλεύει όταν:</span> ο στόχος στο Χαρτοφυλάκιο δείχνει «μέσα στην πορεία». <span class="warn">Σταματάς/αναθεωρείς όταν:</span> 2 τρίμηνα στη σειρά είσαι πίσω από τον δείκτη → λιγότερες μετοχές, περισσότερος δείκτης.</div></div>`);

  // ---------------------------------------------------------------- 9. τι να μην κάνεις
  const s9 = card(`${pH(9, "Κίνδυνοι / τι να ΜΗΝ κάνεις")}
    ${pUl(["Μην μπαίνεις έξω από τη ζώνη εισόδου «επειδή φεύγει».", "Μην κατεβάζεις ποτέ stop.", "Μη βάζεις χρήματα που θα χρειαστείς τα επόμενα χρόνια.",
      "Μη βάζεις πάνω από " + al.pos + "% σε μία μετοχή ή πάνω από 30% σε έναν κλάδο.", "Μη χρησιμοποιείς μόχλευση.", "Μην αλλάζεις σχέδιο μετά από μία κακή εβδομάδα — μόνο με τους κανόνες της φάσης.",
      "Μην αγνοείς τις ημερομηνίες αποτελεσμάτων: λίγες μέρες πριν, η τιμή μπορεί να πηδήξει πάνω ή κάτω από το stop."], "small")}`);

  // ---------------------------------------------------------------- 10. η πρώτη κίνηση
  const D0 = days[0], step = (ts, txt) => `<li><b>${pAt(ts, { weekday: "long", day: "numeric", month: "short" })}</b><span>${txt}</span></li>`;
  const s10 = card(`${pH(10, "Η πρώτη κίνηση: οι επόμενες 7 μέρες")}
    <ol class="plan-steps">
      <li><b>Σήμερα</b><span>Έλεγξε στον broker σου ότι υπάρχει ETF για τον S&P 500 και ότι μπορείς να βάζεις εντολή ορίου (limit) και stop. Βάλε τις μετοχές του σχεδίου στις «Οι προβλέψεις μου» για να τις βλέπεις κάθε μέρα.</span></li>
      ${step(D0.open - 7 * 3600e3, `Διάβασε την πρωινή ενημέρωση AI (~09:15). Ετοίμασε τις εντολές: 1η δόση δείκτη ${eur(tr)}${cands[0] ? `, ${esc(cands[0].t)} ${fmt(cands[0].sh, cands[0].sh < 10 ? 2 : 0)} μτχ με όριο μέσα στη ζώνη και stop ${fmt(cands[0].stop)}` : ""}${cands[1] ? `, ${esc(cands[1].t)} με τον ίδιο τρόπο` : ""}.`)}
      ${step(D0.open, `Η Wall Street ανοίγει ${pAt(D0.open, { hour: "2-digit", minute: "2-digit" })}. Περιμένεις 15-30 λεπτά, βάζεις τις εντολές. Ό,τι δεν μπει στη ζώνη, το αφήνεις.`)}
      ${days[1] ? step(days[1].open, "Έλεγχος: μπήκαν οι εντολές; Τα stop είναι στη θέση τους; Νέες ευκαιρίες από τη βραδινή ανάλυση → μόνο αν περνούν τους κανόνες.") : ""}
      ${days[2] ? step(days[2].open, `${cands[2] ? (planSig(cands[2].t) ? `Αν η ${esc(cands[2].t)} μπει στη ζώνη ${fmt(planSig(cands[2].t).entryLow)}–${fmt(planSig(cands[2].t).entryHigh)}, η 3η θέση. ` : `3η θέση: η ${esc(cands[2].t)} κοντά στα ${fmt(cands[2].entry)} (μισή θέση), αν το μοντέλο 1 μήνα τη δείχνει ακόμα ψηλά. `) : ""}Καμία αλλαγή σε stop προς τα κάτω.`) : ""}
      ${days[4] ? step(days[4].close, "Εβδομαδιαίος έλεγχος στο Χαρτοφυλάκιο: βαθμολογία, κλάδοι, πόσο ρισκάρεις συνολικά. Σημείωσε τι έκανες και γιατί.") : ""}
      <li><b>Σε 7 μέρες</b><span>Ξανάνοιξε αυτό το σχέδιο: ενημερώνεται μόνο του με τη νέα ανάλυση κάθε βράδυ. Σύγκρινε με την πορεία του πίνακα στο «1».</span></li></ol>
    <div class="small muted" style="margin-top:8px">Ώρες σε ώρα Ελλάδας. Τα ποσά στις μετοχές είναι σε $ στον broker· εδώ φαίνονται ${fx ? "σε € με 1 € = " + fmt(fx, 4) + " $" : "σε $"}.</div>`);

  return `${sec("Το πλήρες σχέδιο", `<button class="btn sm" id="planPrint" type="button">Εκτύπωση / PDF</button>`, `ενημερώνεται με κάθε νέα ανάλυση · ${dday(d.asOf)}`)}
    <div class="stack goal-plan">${honest}${s1}${s2}${s3}${s4}${s5}${s6}${s7}${s8}${s9}${s10}</div>`;
}
document.addEventListener("click", (e) => { if (e.target.closest("#planPrint")) { e.preventDefault(); $$("details.plan-stock").forEach((x) => { x.open = true; }); window.print(); } });
