/* US Alpha — βοηθός. Καταλαβαίνει πολλά είδη ερωτήσεων και απαντά με τα στοιχεία του συστήματος.
   Αν υπάρχει AI (κωδικός Gemini στη συσκευή ή AI του προγράμματος στον υπολογιστή), η απάντηση του
   συστήματος δίνεται στο AI ως βάση για πιο ελεύθερη συζήτηση. */
"use strict";

const bot = { hist: [], ticker: null, busy: false };
try { bot.hist = JSON.parse(sessionStorage.getItem("uam.bot2") || "[]"); } catch { bot.hist = []; }
const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const NOTE = "Ανάλυση, όχι επενδυτική συμβουλή.";

// ================================================================== παράθυρο
function openBot(ticker) {
  if (ticker !== undefined) bot.ticker = ticker || null;
  let sh = $("#botSheet");
  if (!sh) { sh = document.createElement("div"); sh.className = "sheet"; sh.id = "botSheet"; document.body.appendChild(sh); }
  sh.innerHTML = `<div class="sheet-head"><span class="logo" style="background:var(--hero)">${icon("chat")}</span><div style="flex:1;min-width:0"><b>Βοηθός</b><div class="small muted" id="bCtx">${bot.ticker ? esc(bot.ticker) : (AI.enabled() || Data.serverAI ? "AI ενεργό" : "Με τα στοιχεία του συστήματος")}</div></div>
    <button class="round-btn" id="bClr" aria-label="Νέα συζήτηση">${icon("refresh")}</button><button class="round-btn" id="bX" aria-label="Κλείσιμο">${icon("x")}</button></div>
    <div class="bot-msgs" id="bMsgs"></div><div class="bot-chips" id="bChips"></div><form class="bot-form" id="bF"><input class="input" id="bIn" placeholder="Ρώτα ό,τι θέλεις…" autocomplete="off"><button class="btn primary" aria-label="Αποστολή">${icon("send")}</button></form>`;
  $("#bX").addEventListener("click", () => sh.remove());
  $("#bClr").addEventListener("click", () => { bot.hist = []; bot.ticker = null; saveBot(); botRender(); });
  $("#bF").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#bIn").value; $("#bIn").value = ""; botAsk(v); });
  botRender();
}
function saveBot() { try { sessionStorage.setItem("uam.bot2", JSON.stringify(bot.hist.slice(-30))); } catch { /* */ } }
function botRender() {
  const box = $("#bMsgs"); if (!box) return;
  box.innerHTML = (bot.hist.length ? bot.hist.map((m) => `<div class="msg ${m.r === "u" ? "user" : "bot"}">${m.r === "u" ? esc(m.t) : md(m.t)}${m.src ? `<span class="src">${esc(m.src)}</span>` : ""}</div>`).join("")
    : `<div class="msg bot">${md(helpText())}</div>`) + (bot.busy ? `<div class="msg bot thinking">Σκέφτομαι…</div>` : "");
  box.scrollTop = box.scrollHeight;
  const t = bot.ticker, d = D();
  const chips = t ? [`Εξήγησέ μου την ${t}`, `Γιατί κινήθηκε η ${t};`, `Ποια τα ρίσκα της ${t};`, `Πόσες ${t} με 1000€;`, `${t} ή ${(d?.signals?.[0]?.ticker && d.signals[0].ticker !== t) ? d.signals[0].ticker : "SPY"};`]
    : ["Τι κάνει η αγορά σήμερα;", "Day trade για αύριο", "Καλύτερες ευκαιρίες", "Πώς πάει η τεχνολογία;", "Τι είναι το RSI;", "Τι κάνει η λίστα μου;"];
  $("#bChips").innerHTML = chips.map((c) => `<button type="button">${esc(c)}</button>`).join("");
  $$("#bChips button").forEach((b) => b.addEventListener("click", () => botAsk(b.textContent)));
}

// ================================================================== κατανόηση
const NAMES = { "τεσλα": "TSLA", "tesla": "TSLA", "απλ": "AAPL", "απλε": "AAPL", "apple": "AAPL", "νβιντια": "NVDA", "ενβιντια": "NVDA", "nvidia": "NVDA", "μαικροσοφτ": "MSFT", "microsoft": "MSFT",
  "αμαζον": "AMZN", "amazon": "AMZN", "γκουγκλ": "GOOGL", "google": "GOOGL", "alphabet": "GOOGL", "νετφλιξ": "NFLX", "netflix": "NFLX", "παλαντιρ": "PLTR", "palantir": "PLTR", "ιντελ": "INTC", "intel": "INTC",
  "φεισμπουκ": "META", "facebook": "META", "κοκα κολα": "KO", "coca cola": "KO", "boeing": "BA", "μποινγκ": "BA", "disney": "DIS", "ντισνει": "DIS", "uber": "UBER", "γιουμπερ": "UBER", "broadcom": "AVGO",
  "jpmorgan": "JPM", "berkshire": "BRK-B", "walmart": "WMT", "costco": "COST", "visa": "V", "mastercard": "MA", "exxon": "XOM", "chevron": "CVX", "pfizer": "PFE", "aehr": "AEHR", "αερ": "AEHR",
  "s&p": "SPY", "sp500": "SPY", "nasdaq": "QQQ", "νασνταk": "QQQ", "dow": "DIA", "ντάου": "DIA", "russell": "IWM", "vix": "^VIX" };
const SKIP = new Set(["AI", "ETF", "RSI", "OK", "ATR", "EMA", "SMA", "USA", "CEO", "A", "I", "IS", "IT", "ON", "SO", "BE", "ALL", "ML", "IC", "PE", "R", "VS", "OR", "AND", "THE", "FOR", "TOP", "DAY", "STOP", "MACD", "ADX", "VWAP", "TP", "US", "EU", "FED", "GDP", "CPI", "IPO", "AM", "PM", "EPS", "ROE", "RR", "SEC", "NEW", "BUY", "SELL", "GO", "NOW", "UP", "AT", "AN", "TO", "BY", "MY", "ME"]);
let _nameIdx = null;
function nameIndex() {
  if (_nameIdx) return _nameIdx;
  _nameIdx = new Map();
  for (const r of [...(D()?.rows || [])].sort((a, b) => (b.dv || 0) - (a.dv || 0)).slice(0, 2500)) {
    const w = plain((r.n || "").split(/[\s,.]+/)[0] || "");
    if (w.length >= 4 && !_nameIdx.has(w)) _nameIdx.set(w, r.t);
  }
  return _nameIdx;
}
function findTickers(text) {
  const out = [], add = (t) => { if (t && !out.includes(t)) out.push(t); };
  const has = (u) => !!Data.row(u) || ["SPY", "QQQ", "DIA", "IWM", "^VIX"].includes(u);
  for (const m of text.matchAll(/\$([A-Za-z][A-Za-z.\-]{0,6})/g)) add(m[1].toUpperCase());
  for (const w of text.match(/[A-Za-z][A-Za-z0-9.\-]{0,7}/g) || []) { const u = w.toUpperCase().replace(/[.\-]+$/, ""); if (w === w.toUpperCase() && has(u) && !SKIP.has(u)) add(u); }
  const p = plain(text);
  for (const [k, t] of Object.entries(NAMES)) if (new RegExp(`(^|[^a-zα-ω])${k}`).test(p)) add(t);
  for (const w of p.split(/[^a-zα-ω0-9]+/)) { const t = nameIndex().get(w); if (t) add(t); }
  for (const w of text.match(/[A-Za-z][A-Za-z.\-]{1,6}/g) || []) { const u = w.toUpperCase(); if (u.length >= 3 && has(u) && !SKIP.has(u)) add(u); }
  return out;
}
const SECTORS = [[/τεχνολογ|tech|ημιαγωγ|τσιπ|chip|λογισμικ|software/, "Technology"], [/ενεργει|πετρελα|φυσικο αεριο|energy|oil/, "Energy"], [/υγει|φαρμακ|βιοτεχν|health|pharma|biotech/, "Healthcare"],
  [/τραπεζ|χρηματοοικ|ασφαλισ|bank|financ/, "Financial Services"], [/βιομηχ|αμυν|αεροπορ|industr/, "Industrials"], [/ακινητ|real estate|reit/, "Real Estate"], [/κοινη ωφελ|ρευμα|utilit/, "Utilities"],
  [/πρωτ.*υλ|μεταλλ|χημ|χρυσ|materials|mining/, "Basic Materials"], [/επικοινων|τηλεπικ|media|μεσα ενημερ/, "Communication Services"], [/λιανικ|καταναλωτ.*(διαρκ|πολυτελ)|αυτοκινητ|discretionary|retail/, "Consumer Cyclical"],
  [/βασικ.*αγαθ|τροφ|ποτ|σουπερ μαρκετ|staples/, "Consumer Defensive"]];
const GLOSS = [
  [/\brsi\b/, "**RSI** (0–100) δείχνει πόσο «ζεστή» είναι μια μετοχή. Πάνω από 70: ανέβηκε πολύ γρήγορα και συχνά ακολουθεί ανάσα. Κάτω από 30: έπεσε πολύ και μπορεί να αναπηδήσει. 50–65 είναι υγιές ανοδικό momentum."],
  [/\bmacd\b/, "**MACD** συγκρίνει δύο μέσους όρους τιμής. Όταν είναι πάνω από τη γραμμή σήματος και ανεβαίνει, η άνοδος δυναμώνει. Όταν πέφτει κάτω από αυτήν, η δύναμη χάνεται."],
  [/\batr\b|μεταβλητοτ|νευρικ/, "**ATR** είναι πόσο κινείται κατά μέσο όρο μια μετοχή μέσα στη μέρα. ATR 3% σημαίνει ότι μια συνηθισμένη μέρα πάει ±3%. Με αυτό ορίζουμε το stop ώστε να μη σε βγάζει ο απλός «θόρυβος»."],
  [/stop ?loss|\bstop\b|στοπ/, "**Stop** είναι η τιμή όπου βγαίνεις με μικρή ζημιά αν δεν πάει όπως περίμενες. Ορίζεται πριν μπεις και δεν το μετακινείς προς τα κάτω. Έτσι μια λάθος επιλογή δεν γίνεται μεγάλη απώλεια."],
  [/r\/r|risk ?reward|κερδος ?\/ ?ρισκο|\brr\b/, "**Κέρδος/ρίσκο (R/R)**: πόσα μπορείς να κερδίσεις για κάθε 1 που ρισκάρεις. R/R 2,5 σημαίνει στόχος 2,5 φορές πιο μακριά από το stop. Με R/R πάνω από 2 βγαίνεις κερδισμένος ακόμα κι αν πετύχεις 4 στις 10."],
  [/\bema\b|\bsma\b|κινητ.*μεσ|μεσο ορο/, "**Κινητός μέσος όρος** (EMA/ΚΜΟ) είναι η μέση τιμή των τελευταίων ημερών. Τιμή πάνω από τον 20, 50 και 200: ανοδική τάση. Κάτω από όλους: πτωτική."],
  [/ογκο|volume|rvol/, "**Όγκος** είναι πόσες μετοχές άλλαξαν χέρια. Όγκος 2× σημαίνει διπλάσιες συναλλαγές από το συνηθισμένο: η κίνηση έχει «πίσω της» πολλούς αγοραστές ή πωλητές και είναι πιο αξιόπιστη."],
  [/\bvix\b|δεικτ.*φοβ/, "**VIX** είναι ο «δείκτης φόβου». Κάτω από 16: ήρεμη αγορά. 16–25: αυξημένη νευρικότητα. Πάνω από 25: φόβος, μεγάλες κινήσεις και πιο συχνές αποτυχίες στις αγορές."],
  [/p\/e|\bpe\b|πολλαπλασιαστ|τιμη ?\/ ?κερδ/, "**P/E** είναι πόσα χρόνια κερδών πληρώνεις με την τιμή της μετοχής. P/E 20 σημαίνει ότι η αγορά πληρώνει 20 φορές τα ετήσια κέρδη. Ψηλό P/E: η αγορά περιμένει ανάπτυξη. Χαμηλό: φθηνή ή με προβλήματα."],
  [/κεφαλαιοποιησ|market cap/, "**Κεφαλαιοποίηση** είναι η συνολική αξία της εταιρείας στο χρηματιστήριο (τιμή × μετοχές). Πάνω από 10 δισ. $: μεγάλη. 2–10 δισ.: μεσαία. Κάτω από 2 δισ.: μικρή (πιο νευρική)."],
  [/breakout|σπασ/, "**Breakout** είναι όταν η τιμή σπάει πάνω από ένα επίπεδο που δεν περνούσε (π.χ. το υψηλό 20 ημερών), ιδανικά με αυξημένο όγκο. Συχνά ξεκινά νέα κίνηση. Χωρίς όγκο αποτυγχάνει πιο εύκολα."],
  [/στηριξ|αντιστασ|support|resistance/, "**Στήριξη** είναι επίπεδο όπου η τιμή σταμάτησε να πέφτει αρκετές φορές (εμφανίζονται αγοραστές). **Αντίσταση** είναι επίπεδο όπου σταμάτησε να ανεβαίνει. Τα stop μπαίνουν λίγο κάτω από τη στήριξη."],
  [/\bshort\b|σορτ/, "**Short** σημαίνει ότι κερδίζεις αν η μετοχή πέσει: πουλάς δανεικές μετοχές και τις ξαναγοράζεις φθηνότερα. Έχει θεωρητικά απεριόριστο ρίσκο αν ανέβει, γι' αυτό το stop είναι υποχρεωτικό."],
  [/day ?trade|ημερησι/, "**Day trade** σημαίνει ότι μπαίνεις και βγαίνεις μέσα στην ίδια μέρα. Κερδίζεις από μικρές κινήσεις, αλλά θέλει πειθαρχία: είσοδο μόνο στη ζώνη, stop πάντα, και κλείσιμο πριν το τέλος της συνεδρίασης."],
  [/swing/, "**Swing** είναι συναλλαγή που κρατάς από μερικές μέρες έως μερικές εβδομάδες, για να πιάσεις ένα «κύμα» της τάσης."],
  [/\betf\b/, "**ETF** είναι ένα «καλάθι» μετοχών που αγοράζεις σαν μία μετοχή. Π.χ. το SPY περιέχει τις 500 μεγαλύτερες εταιρείες των ΗΠΑ, το XLK τις εταιρείες τεχνολογίας."],
  [/bollinger/, "**Bollinger** είναι δύο γραμμές γύρω από τον μέσο όρο που δείχνουν το «κανονικό» εύρος της τιμής. Όταν στενεύουν πολύ (squeeze) συχνά ακολουθεί μεγάλη κίνηση."],
  [/\bgap\b|κενο τιμ/, "**Gap** είναι όταν η μετοχή ανοίγει πολύ ψηλότερα ή χαμηλότερα από το χθεσινό κλείσιμο, συνήθως μετά από είδηση ή αποτελέσματα."],
  [/momentum|ορμη/, "**Momentum** είναι η «ορμή» της κίνησης: μετοχές που ανεβαίνουν δυνατά με όγκο τείνουν να συνεχίζουν για λίγο, μέχρι να κουραστούν."],
  [/μερισμ|dividend/, "**Μέρισμα** είναι μέρος των κερδών που μοιράζει η εταιρεία στους μετόχους, συνήθως κάθε τρίμηνο."],
  [/\bic\b|συσχετισ/, "**IC** (συσχέτιση) δείχνει πόσο σωστά κατατάσσει το μοντέλο τις μετοχές. 0 = τυχαία. 0,02–0,05 θεωρείται ήδη χρήσιμο, αν είναι σταθερό και πάνω από τα κόστη."],
  [/τασ[ηη]|trend/, "**Τάση** είναι η γενική κατεύθυνση: ανοδική όταν κάνει ψηλότερα υψηλά και ψηλότερα χαμηλά, πτωτική όταν κάνει το αντίθετο. Πιο ασφαλές είναι να συναλλάσσεσαι προς την κατεύθυνση της τάσης."],
];
function money2(text) {
  const m = text.replace(/\./g, "").match(/(\d+(?:,\d+)?)\s*(k|χιλ)?\s*(€|ευρω|ευρώ|eur|\$|δολ|usd)/i) || text.replace(/\./g, "").match(/(?:κεφαλαιο|κεφάλαιο|με)\s+(\d+(?:,\d+)?)\s*(k|χιλ)?/i);
  if (!m) return null;
  let v = parseFloat(m[1].replace(",", ".")); if (m[2]) v *= 1000;
  return isNum(v) && v > 0 ? v : null;
}
function riskPct(text) { const m = text.match(/(\d+(?:[.,]\d+)?)\s*%/); const v = m ? parseFloat(m[1].replace(",", ".")) : null; return v && v > 0 && v <= 10 ? v : 1; }

// ================================================================== απαντήσεις
function helpText() {
  return `Γεια! Ρώτα με ό,τι θέλεις για την αμερικανική αγορά. Για παράδειγμα:
• **Μια μετοχή:** «Εξήγησέ μου την AEHR», «Γιατί έπεσε η Tesla;», «Ποια τα ρίσκα της NVDA;»
• **Σύγκριση:** «AAPL ή MSFT;»
• **Day trade:** «Τι day trade υπάρχει για αύριο;»
• **Θέση:** «Πόσες NVDA να πάρω με 2000€;»
• **Αγορά και κλάδοι:** «Τι κάνει η αγορά;», «Πώς πάει η ενέργεια;»
• **Οι προβλέψεις μου:** «Τι λένε οι προβλέψεις μου;»
• **Χαρτοφυλάκιο και στόχος:** «Πώς πάει το χαρτοφυλάκιό μου;», «Ο στόχος μου είναι ρεαλιστικός;»
• **Όροι:** «Τι είναι το RSI;», «Τι είναι stop;»${AI.enabled() || Data.serverAI ? "\n\nΤο AI είναι ενεργό, οπότε μπορούμε να συζητάμε και ελεύθερα." : ""}`;
}
function marketText() {
  const d = D(); if (!d) return "Δεν έχουν φορτωθεί ακόμα τα αποτελέσματα της ανάλυσης.";
  const m = d.market || {}, R = REGIME[m.regime] || {}, ix = d.idx || {};
  const line = (t, n) => ix[t] ? `${n} ${fmt(curPx(t, ix[t].p))} (${pct(curCh(t, ix[t].ch))})` : null;
  const secs = (d.sectors || []).filter((s) => isNum(s.rel21));
  return [`**${R.long || "Αγορά"}** (διάθεση ${fmt(m.score, 0)}/100, κλείσιμο ${dday(d.asOf)})`, [line("SPY", "S&P 500"), line("QQQ", "Nasdaq 100"), line("^VIX", "VIX")].filter(Boolean).join(" · "),
    ...(m.simple || []).map((x) => "• " + x),
    secs.length ? `\n**Κλάδοι (1 μήνας vs S&P 500)**\n• Δυνατοί: ${secs.slice(0, 3).map((s) => `${s.sector} ${pct(s.rel21, 1)}`).join(", ")}\n• Αδύναμοι: ${secs.slice(-3).reverse().map((s) => `${s.sector} ${pct(s.rel21, 1)}`).join(", ")}` : "",
    `\n${(d.signals || []).length} ενεργές ευκαιρίες και ${(d.day?.long || []).length + (d.day?.short || []).length} υποψήφιες για day trade.`].filter(Boolean).join("\n");
}
function oppText() {
  const d = D(), s = (d?.signals || []).slice(0, 6), dl = (d?.day?.long || []).slice(0, 3);
  if (!s.length && !dl.length) return "Σήμερα καμία μετοχή δεν περνά όλους τους ελέγχους. Η αναμονή είναι κι αυτή θέση.";
  return [s.length ? `**Οι καλύτερες ευκαιρίες τώρα** (${dday(d.asOf)})` : "", ...s.map((x) => `• **${x.ticker}** (${HZ[x.horizon] || x.horizon}${x.bias === "bearish" ? ", short" : ""}): είσοδος ${fmt(x.entryLow)}–${fmt(x.entryHigh)}, stop ${fmt(x.stop)}, στόχος ${fmt(x.tp2)}. ${x.setup || ""}`),
    dl.length ? `\n**Day trade για αύριο**\n${dl.map((x) => `• **${x.ticker}**: ζώνη ${fmt(x.entryLow)}–${fmt(x.entryHigh)}, stop ${fmt(x.stop)}, στόχος ${fmt(x.tp1)}–${fmt(x.tp2)}`).join("\n")}` : "",
    `\nΠάτα σε όποια θέλεις για το πλήρες σχέδιο. ${NOTE}`].filter(Boolean).join("\n");
}
function dayText(tk) {
  const d = D(), x = d?.day || {};
  if (tk) { const c = dayFor(tk); if (!c) return `Η ${tk} δεν είναι στις υποψήφιες day trade για αύριο. ${dayText(null).split("\n")[0]}`;
    return [`**${tk}: day trade ${c.bias === "bearish" ? "short" : "αγορά"}**`, ...(c.reasons || []).map((r) => "• " + r), `\n**Σχέδιο για αύριο**`, `• Είσοδος μόνο αν η τιμή είναι στα ${fmt(c.entryLow)}–${fmt(c.entryHigh)}.`,
      `• Stop ${fmt(c.stop)} (ρίσκο ${fmt(c.stop_pct, 1)}%).`, `• Στόχοι ${fmt(c.tp1)}, ${fmt(c.tp2)}. Στον πρώτο το stop πάει στην είσοδο.`, "• Αν δεν πιαστεί τίποτα, κλείνεις πριν το τέλος της συνεδρίασης.", `\n${x.note || ""}`].join("\n"); }
  const L = x.long || [], S = x.short || [];
  if (!L.length && !S.length) return "Για αύριο καμία μετοχή δεν περνά όλα τα κριτήρια day trade. Καλύτερα να μη βιαστείς.";
  return [`**Day trade για αύριο** (με τιμές ${dday(d.asOf)})`, ...L.slice(0, 5).map((c) => `• **${c.ticker}** ${c.name ? `(${c.name})` : ""}: ζώνη ${fmt(c.entryLow)}–${fmt(c.entryHigh)}, stop ${fmt(c.stop)}, στόχος ${fmt(c.tp1)}–${fmt(c.tp2)}. ${(c.reasons || [])[0] || ""}`),
    S.length ? `\n**Για short**\n${S.slice(0, 3).map((c) => `• **${c.ticker}**: ζώνη ${fmt(c.entryLow)}–${fmt(c.entryHigh)}, stop ${fmt(c.stop)}, στόχος ${fmt(c.tp2)}`).join("\n")}` : "",
    `\n${x.note || ""}`].filter(Boolean).join("\n");
}
function explainText(a) {
  const s = simpleStock(a), dtr = dayFor(a.ticker), best = a.acc[0], m = a.tech?.m || {};
  return [`**${a.ticker}${a.name ? ` (${a.name})` : ""}: ${s.verdict}**`, s.headline, ...s.pts.map((x) => "• " + x), ...s.model.map((x) => "• " + x),
    `• Βαθμολογία ${fmt(a.sc.score, 0)}/100, RSI ${fmt(m.rsi, 0)}, κινείται ±${fmt(m.atr_pct, 1)}% τη μέρα.`,
    s.plan ? `\n**${s.plan.title}**\n` + (s.plan.lines || []).map((x) => "• " + x).join("\n") : best ? `\n**Σχέδιο (${HZ[best.horizon] || best.horizon})**\n• Είσοδος ${fmt(best.entry_low)}–${fmt(best.entry_high)}, stop ${fmt(best.stop)}, στόχοι ${fmt(best.tp1)} / ${fmt(best.tp2)}` : "",
    dtr ? `\n**Day trade για αύριο:** ζώνη ${fmt(dtr.entryLow)}–${fmt(dtr.entryHigh)}, stop ${fmt(dtr.stop)}, στόχος ${fmt(dtr.tp1)}–${fmt(dtr.tp2)}.` : "",
    s.risks.length ? "\n**Προσοχή**\n" + s.risks.map((x) => "• " + x).join("\n") : "", predSummary(a),
    Data.aiFor(a.ticker) ? `\n**Τι λέει το AI (βραδινή ανάλυση)**\n${Data.aiFor(a.ticker)}` : "", `\nΣτοιχεία κλεισίματος ${dday(a.asOf)}. ${NOTE}`].filter(Boolean).join("\n");
}
// τι προβλέπουν τα μοντέλα (v4 όπου είναι ενεργό ή καλύτερο, αλλιώς v3), σε απλά λόγια
function predSummary(a) {
  const picks = HZ_ORDER.map((h) => predPick(a, h)).filter(Boolean);
  if (!picks.length) return "";
  const any = picks.some((x) => x.p.validated);
  return `\n**Τι προβλέπουν τα μοντέλα**\n${picks.map(({ p, ver }) => `• ${p.label}: ${predVal(p)}${p.kind === "rank" ? " της αγοράς" : " πιθανότητα στόχου"}${ver === "v4" ? " (νέο v4)" : ""}${p.validated ? " ✓ επικυρωμένο" : ""}`).join("\n")}${any ? "" : "\nΚανένα δεν έχει ακόμα επικυρωθεί, οπότε είναι μόνο ένδειξη."}`;
}
function myText() {
  const l = myList();
  if (!l.length) return "Δεν έχεις διαλέξει ακόμα εταιρείες για προβλέψεις. Πήγαινε Περισσότερα → «Οι προβλέψεις μου» ή πάτα «Πρόσθεσε στις προβλέψεις μου» σε μια μετοχή.";
  return ["**Οι προβλέψεις σου**", ...l.slice(0, 15).map((t) => { const r = Data.row(t); if (!r) return `• ${t}: εκτός σημερινής ανάλυσης`;
    const a5 = rankOf(r, "rank5"), a21 = rankOf(r, "rank21");
    return `• **${t}** ${fmt(curPx(t, r.p))} (${pct(curCh(t, r.ch))}) · 5 ημέρες ${a5 ? topPct(a5.v) : "—"} · 1 μήνας ${a21 ? topPct(a21.v) : "—"}${dayFor(t) ? " · day trade αύριο" : ""}`; }),
    "\nTop 10% = από τις καλύτερες 10% της αγοράς στην κατάταξη του μοντέλου. Δεν είναι πιθανότητα κέρδους."].join("\n");
}
function whyText(a) {
  const d = D(), ch = curCh(a.ticker, a.chg), m = a.tech?.m || {}, spy = d?.idx?.SPY, secRow = (d?.sectors || []).find((s) => s.sector === a.sector), up = ch >= 0;
  const out = [`**${a.ticker} ${up ? "ανέβηκε" : "έπεσε"} ${pct(ch)}** (κλείσιμο ${dday(a.asOf)}). Πιθανοί λόγοι από τα στοιχεία:`];
  if (spy && isNum(spy.ch)) out.push(`• Η γενική αγορά: S&P 500 ${pct(spy.ch)}.${Math.sign(spy.ch) === Math.sign(ch) && Math.abs(spy.ch) > 0.7 ? " Μέρος της κίνησης είναι απλώς η αγορά." : ""}`);
  if (secRow && isNum(secRow.ret1)) out.push(`• Ο κλάδος ${a.sector}: ${pct(secRow.ret1)} την ίδια μέρα.`);
  if (isNum(m.rvol)) out.push(m.rvol >= 1.8 ? `• Όγκος ${fmt(m.rvol, 1)}× του κανονικού: πολλοί ${up ? "αγοραστές" : "πωλητές"}, συνήθως υπάρχει είδηση ή γεγονός.` : `• Όγκος ${fmt(m.rvol, 1)}× του κανονικού: χωρίς ιδιαίτερη πίεση.`);
  if (isNum(m.atr_pct) && Math.abs(ch) < m.atr_pct * 0.8) out.push(`• Η κίνηση είναι μέσα στα κανονικά της (κινείται ±${fmt(m.atr_pct, 1)}% τη μέρα).`);
  const fm = a.fund?.m || {}; if (isNum(fm.days_to_earnings) && fm.days_to_earnings >= 0 && fm.days_to_earnings <= 10) out.push(`• Αποτελέσματα σε ${fm.days_to_earnings} μέρες: συχνά φέρνουν νευρικότητα πριν.`);
  const fl = a.tech?.flags || []; if (fl.includes("breakout_20")) out.push("• Έσπασε το υψηλό 20 ημερών (τεχνικό σήμα που φέρνει αγοραστές)."); if (fl.includes("trend_change_down") || fl.includes("death_cross")) out.push("• Χάλασε η τεχνική εικόνα (σπάσιμο μέσων όρων).");
  const n = (a.news?.items || []).slice(0, 3); if (n.length) out.push(`\n**Πρόσφατες ειδήσεις**\n${n.map((x) => `• ${x.title} (${x.source || ""}, ${dt(x.at)})`).join("\n")}`);
  out.push("\nΤο σύστημα δεν ξέρει με βεβαιότητα την αιτία· αυτά είναι τα στοιχεία που φαίνονται.");
  return out.join("\n");
}
function riskText(a) {
  const s = simpleStock(a), m = a.tech?.m || {}, fm = a.fund?.m || {}, out = [`**Ρίσκα της ${a.ticker}**`];
  if (isNum(m.atr_pct)) out.push(`• Κινείται κατά μέσο όρο ±${fmt(m.atr_pct, 1)}% τη μέρα${m.atr_pct > 5 ? ": πολύ νευρική, θέλει μικρή θέση" : ""}.`);
  if (isNum(fm.beta)) out.push(`• Beta ${fmt(fm.beta, 2)}: ${fm.beta > 1.3 ? "κινείται πιο έντονα από την αγορά" : fm.beta < 0.8 ? "πιο ήρεμη από την αγορά" : "περίπου όσο η αγορά"}.`);
  if (isNum(fm.short_pct_float) && fm.short_pct_float > 0.1) out.push(`• Short ${pct(fm.short_pct_float * 100, 0)} των μετοχών: μεγάλες απότομες κινήσεις.`);
  if (isNum(m.dollar_vol20) && m.dollar_vol20 < 5e6) out.push("• Χαμηλή ρευστότητα: δύσκολη είσοδος/έξοδος σε καλή τιμή.");
  out.push(...s.risks.map((x) => "• " + x));
  const st = a.acc[0] || dayFor(a.ticker); if (st) out.push(`\nΑν ακολουθήσεις το σχέδιο, η μέγιστη ζημιά είναι περίπου ${fmt(SP(st).stopPct, 1)}% (stop ${fmt(st.stop)}).`);
  out.push(`\n${NOTE}`);
  return out.join("\n");
}
function stopText(a) {
  const best = a.acc[0] || dayFor(a.ticker), m = a.tech?.m || {}, px = curPx(a.ticker, a.price);
  if (best) { const b = SP(best); return [`**Stop για την ${a.ticker}: ${fmt(b.stop)}** (${fmt(b.stopPct, 1)}% κάτω από την είσοδο ${fmt(b.entry)})`, `• Στόχοι ${fmt(b.tp1)} → ${fmt(b.tp2)} → ${fmt(b.tp3)}.`, "• Στον πρώτο στόχο ανεβάζεις το stop στην τιμή εισόδου: από εκεί και πέρα δεν μπορείς να χάσεις.", "• Δεν κατεβάζεις ποτέ το stop πιο χαμηλά.", `\n${NOTE}`].join("\n"); }
  const atr = m.atr, sup = (a.tech?.levels || []).filter((l) => l.type === "support" && l.price < px).map((l) => l.price).sort((x, y) => y - x)[0];
  if (!isNum(atr) || !isNum(px)) return `Δεν έχω αρκετά στοιχεία για stop στην ${a.ticker}.`;
  const s1 = px - 1.2 * atr, s2 = isNum(sup) && sup > px - 3 * atr ? sup - 0.25 * atr : null;
  return [`Για την ${a.ticker} δεν υπάρχει ενεργό σχέδιο σήμερα. Αν έχεις ήδη θέση, ένα λογικό stop:`, `• **${fmt(s2 ?? s1)}**${s2 ? ` (λίγο κάτω από τη στήριξη ${fmt(sup)})` : ` (1,2 × τη μέση ημερήσια κίνηση κάτω από την τιμή ${fmt(px)})`}.`,
    `• Πιο χαλαρό, για εβδομάδες: ${fmt(px - 2 * atr)}.`, "• Το stop δεν μετακινείται ποτέ προς τα κάτω.", `\n${NOTE}`].join("\n");
}
function sizeText(a, capital, rp) {
  const best = a ? (a.acc[0] || dayFor(a.ticker)) : null, cap = capital || 10000, px = a ? curPx(a.ticker, a.price) : null;
  let entry, stop;
  if (best) { const b = SP(best); entry = b.entry; stop = b.stop; } else if (a && isNum(a.tech?.m?.atr) && isNum(px)) { entry = px; stop = px - 1.2 * a.tech.m.atr; }
  if (!isNum(entry) || !isNum(stop) || entry === stop) return `Γράψε μου ποια μετοχή και πόσα χρήματα, π.χ. «Πόσες NVDA με 2000€;». Ο κανόνας: ρισκάρεις περίπου ${rp}% του κεφαλαίου σε κάθε συναλλαγή.`;
  const riskAmt = cap * rp / 100, perShare = Math.abs(entry - stop);
  let sh = Math.floor(riskAmt / perShare); const maxSh = Math.floor(cap / entry); const capped = sh > maxSh; sh = Math.min(sh, maxSh);
  return [`**${a.ticker}: περίπου ${sh} μετοχές** (${money(sh * entry, 0)})`, `• Κεφάλαιο ${money(cap, 0)}, ρίσκο ${rp}% = ${money(riskAmt, 0)}.`, `• Είσοδος ~${fmt(entry)}, stop ${fmt(stop)}: ρισκάρεις ${fmt(perShare)} ανά μετοχή.`,
    capped ? "• Περιορίστηκε από το κεφάλαιο: δεν μπορείς να αγοράσεις περισσότερες." : `• Αν πιαστεί το stop χάνεις περίπου ${money(sh * perShare, 0)}, όχι περισσότερο.`, best ? "" : "• (Χωρίς ενεργό σχέδιο: το stop είναι εκτίμηση 1,2 ATR.)", `\n${NOTE}`].filter(Boolean).join("\n");
}
function newsText(a) {
  const n = (a?.news?.items || []).slice(0, 6);
  if (a && !n.length) return `Δεν βρήκα πρόσφατες ειδήσεις για την ${a.ticker} στην ανάλυση.`;
  const list = a ? n : (D()?.news || []).slice(0, 6);
  return [`**${a ? `Ειδήσεις ${a.ticker}` : "Τελευταίες ειδήσεις"}**`, ...list.map((x) => `• ${x.title} (${x.source || ""}, ${dt(x.at)})${isNum(x.sent) ? (x.sent > 0.15 ? " · θετική" : x.sent < -0.15 ? " · αρνητική" : "") : ""}`), "\nΗ εκτίμηση θετική/αρνητική βγαίνει από λέξεις-κλειδιά και μπορεί να κάνει λάθος."].join("\n");
}
function earnText(a) {
  const fm = a.fund?.m || {};
  if (!isNum(fm.days_to_earnings) && !fm.earnings_date) return `Δεν έχω ημερομηνία αποτελεσμάτων για την ${a.ticker}.`;
  return `**${a.ticker}: αποτελέσματα ${fm.earnings_date ? dday(fm.earnings_date) : ""}${isNum(fm.days_to_earnings) ? ` (σε ${fm.days_to_earnings} μέρες)` : ""}.**\nΓύρω από τα αποτελέσματα η τιμή μπορεί να κάνει άλμα ±${fmt((a.tech?.m?.atr_pct || 3) * 2.5, 0)}% ή και παραπάνω. Αν δεν θέλεις αυτό το ρίσκο, μένεις εκτός ή μικραίνεις τη θέση πριν.`;
}
function buyText(a) {
  const best = a.acc[0], dtr = dayFor(a.ticker), s = simpleStock(a);
  const head = best ? `Το σύστημα βλέπει **σχέδιο εισόδου** για την ${a.ticker} (${HZ[best.horizon] || best.horizon}).` : dtr ? `Η ${a.ticker} είναι υποψήφια **day trade** για αύριο.` : `Για την ${a.ticker} **δεν υπάρχει σήμερα σήμα εισόδου** (${s.verdict.toLowerCase()}).`;
  return [head, "Δεν μπορώ να σου πω να αγοράσεις· μπορώ να σου δείξω τι λένε τα στοιχεία:", "", explainText(a)].join("\n");
}
async function compareText(tks) {
  const as = (await Promise.all(tks.slice(0, 3).map((t) => Data.stock(t).catch(() => null)))).filter((a) => a && !a.index && a.sc);
  if (as.length < 2) return `Δεν βρήκα και τις δύο μετοχές στην ανάλυση (${tks.join(", ")}).`;
  const line = (a) => { const m = a.tech.m || {}, s = simpleStock(a), rk = Object.values(a.pred || {}).find((p) => p.validated && p.kind === "rank");
    return `**${a.ticker}** ${a.name ? `(${a.name})` : ""}: ${fmt(a.sc.score, 0)}/100, ${s.verdict.toLowerCase()}\n  1 μήνας ${pct(m.ret21, 1)}, 3 μήνες ${pct(m.ret63, 1)}, vs S&P ${pct(a.tech.rs?.excess, 0)} · ±${fmt(m.atr_pct, 1)}%/μέρα · RSI ${fmt(m.rsi, 0)}${isNum(a.fund?.score) ? ` · θεμελιώδη ${fmt(a.fund.score, 0)}` : ""}${rk ? ` · μοντέλο ${topPct(rk.rank)}` : ""}${a.acc[0] ? " · έχει σχέδιο εισόδου" : ""}${dayFor(a.ticker) ? " · day trade" : ""}`; };
  const best = [...as].sort((x, y) => y.sc.score - x.sc.score)[0], calm = [...as].sort((x, y) => (x.tech.m.atr_pct || 9) - (y.tech.m.atr_pct || 9))[0];
  return [`**Σύγκριση** (κλείσιμο ${dday(as[0].asOf)})`, ...as.map(line), "", `• Πιο δυνατή εικόνα σήμερα: **${best.ticker}** (μεγαλύτερη βαθμολογία).`, calm.ticker !== best.ticker ? `• Πιο ήρεμη (μικρότερο ρίσκο ανά μέρα): **${calm.ticker}**.` : `• Είναι και η πιο ήρεμη από τις δύο.`,
    `\n${NOTE}`].join("\n");
}
function sectorText(name) {
  const d = D(), s = (d?.sectors || []).find((x) => x.sector === name), rows = (d?.rows || []).filter((r) => r.sec === name && (r.dv || 0) >= 5e6).sort((a, b) => (b.s || 0) - (a.s || 0));
  const dl = [...(d?.day?.long || []), ...(d?.day?.short || [])].filter((c) => c.sector === name);
  return [`**Κλάδος ${name}**${s ? `: 1 μήνας ${pct(s.ret21, 1)} (vs S&P 500 ${pct(s.rel21, 1)}), σήμερα ${pct(s.ret1, 1)}` : ""}`,
    rows.length ? `\n**Οι πιο δυνατές του κλάδου**\n${rows.slice(0, 6).map((r) => `• **${r.t}** ${r.n ? `(${r.n})` : ""}: ${fmt(r.s, 0)}/100, ${pct(r.ch)} σήμερα, 1 μήνας ${pct(r.m1, 1)}`).join("\n")}` : "Δεν βρήκα μετοχές του κλάδου στην ανάλυση.",
    rows.length > 6 ? `\n**Οι πιο αδύναμες**\n${rows.slice(-3).reverse().map((r) => `• ${r.t}: ${fmt(r.s, 0)}/100`).join("\n")}` : "", dl.length ? `\nDay trade από τον κλάδο: ${dl.map((c) => c.ticker).join(", ")}.` : ""].filter(Boolean).join("\n");
}
function moversText(kind) {
  const rows = (D()?.rows || []).filter((r) => (r.dv || 0) >= 5e6);
  const L = kind === "down" ? rows.filter((r) => isNum(r.ch)).sort((a, b) => a.ch - b.ch) : kind === "vol" ? rows.filter((r) => isNum(r.rv)).sort((a, b) => b.rv - a.rv) : rows.filter((r) => isNum(r.ch)).sort((a, b) => b.ch - a.ch);
  const t = kind === "down" ? "Οι μεγαλύτερες πτώσεις" : kind === "vol" ? "Ασυνήθιστος όγκος" : "Οι μεγαλύτερες άνοδοι";
  return [`**${t}** (${dday(D()?.asOf)}, μετοχές με τζίρο > 5 εκ. $)`, ...L.slice(0, 8).map((r) => `• **${r.t}** ${r.n ? `(${r.n})` : ""}: ${pct(r.ch)}${kind === "vol" ? `, όγκος ${fmt(r.rv, 1)}×` : ""}`), "\nΓράψε «γιατί κινήθηκε η …» για εξήγηση."].join("\n");
}
function watchText() {
  const out = ["**Η λίστα σου**"];
  for (const t of App.watch) { const r = Data.row(t); if (!r) { out.push(`• ${t}: εκτός ανάλυσης`); continue; }
    out.push(`• **${t}** ${fmt(curPx(t, r.p))} (${pct(curCh(t, r.ch))}) · ${fmt(r.s, 0)}/100 ${r.b === "bullish" ? "ανοδική" : r.b === "bearish" ? "πτωτική" : "ουδέτερη"}${(D()?.signals || []).some((s) => s.ticker === t) ? " · **έχει ευκαιρία**" : ""}${dayFor(t) ? " · **day trade αύριο**" : ""}`); }
  return out.join("\n");
}
function modelText() {
  const M = D()?.model || {}, v = validated();
  return [v.length ? `**Επικυρωμένα μοντέλα:** ${v.map((h) => M[h].label).join(", ")}. Χρησιμοποιούνται στις βαθμολογίες και στις ευκαιρίες.` : "**Κανένα μοντέλο δεν πέρασε τον έλεγχο αυτή την εβδομάδα**, οπότε δεν επηρεάζει τίποτα. Αυτό είναι προστασία: δεν σου δείχνουμε προβλέψεις που δεν απέδειξαν ότι δουλεύουν.",
    ...Object.values(M).slice(0, 5).map((m) => `• ${m.label}: ${m.validated ? "✓" : "✗"} ${(m.gate || []).filter((g) => g.startsWith("✗")).map((g) => g.replace(/^✗\s*/, "")).slice(0, 1).join("")}`),
    m4Text(), "\nΛεπτομέρειες: Περισσότερα → Μοντέλο πρόβλεψης."].filter(Boolean).join("\n");
}
function m4Text() {
  const m4 = D()?.model4, M = m4?.models || {}, ks = Object.keys(M);
  if (!ks.length) return "\n**Νέο μοντέλο v4:** εκπαιδεύεται στην επόμενη βραδινή ανάλυση, με περισσότερα στοιχεία ανά μετοχή. Θα μετρηθεί δίπλα στο σημερινό και θα μπει μόνο αν βγει καλύτερο.";
  return `\n**Νέο μοντέλο v4** (${m4.features} στοιχεία ανά μετοχή, ${m4.newFeatures} νέα)\n` + ks.map((k) => { const m = M[k];
    return `• ${m.label}: ${m.active ? "ενεργό, καλύτερο και επικυρωμένο ✓" : m.better ? "καλύτερο από το v3, όχι ακόμα επικυρωμένο" : "δεν ξεπέρασε το v3"}${(m.notes || []).length ? ` (${m.notes.join(", ")})` : ""}`; }).join("\n");
}
function catText(cat) {
  const d = D(), rows = (d?.rows || []).filter((r) => r.cats.includes(cat) && (r.dv || 0) >= 3e6).sort((a, b) => (b.s || 0) - (a.s || 0));
  return rows.length ? [`**${d.cats[cat]}** (${rows.length})`, ...rows.slice(0, 8).map((r) => `• **${r.t}** ${r.n ? `(${r.n})` : ""}: ${fmt(r.s, 0)}/100, ${pct(r.ch)} σήμερα`), "\nΌλες στο Scanner."].join("\n") : `Δεν βρήκα μετοχές στην κατηγορία «${d?.cats?.[cat] || cat}» σήμερα.`;
}
const CATRX = [[/φθην|υποτιμημ|undervalued/, "undervalued"], [/αναπτυξ|growth/, "high_growth"], [/breakout|σπασ/, "breakout"], [/squeeze|σκουιζ/, "short_squeeze"], [/αντιστροφ|reversal|αναπηδ/, "reversal"], [/small ?cap|μικρ.*εταιρ/, "small_cap"], [/catalyst|καταλυτ/, "catalyst"], [/μεταβλητ|νευρικ.*μετοχ/, "high_volatility"]];

async function answer(text) {
  const p = plain(text), tks = findTickers(text);
  let tk = tks[0] || null;
  if (!tk && bot.ticker && /(^|\s)(αυτη|αυτην|αυτο|την|της|stop|στοπ|ρισκ|μετοχ|γιατι|ποσες|ειδησ|αποτελεσμ)/.test(p) && !/αγορα|λιστα|κλαδ|day|ημερησ/.test(p)) tk = bot.ticker;
  if (tk) bot.ticker = tk;
  const gl = GLOSS.find(([rx]) => rx.test(p));
  if (/^(γεια|καλησπερα|καλημερα|hi|hello|βοηθεια|help)(\s|$|[!.,;])|τι μπορεις|τι κανεις;?$/.test(p) && !tk) return helpText();
  if (gl && (/τι (ειναι|σημαινει|εννοεις)|εξηγησε .*(ορο|δεικτη)|πως (δουλευει|λειτουργει)/.test(p) || (!tk && p.split(" ").length <= 3))) return gl[1];
  if (tks.length >= 2 && /συγκρ|vs|(^|\s)η(\s|$)|καλυτερ|προτιμ|ποια απο|διαφορ/.test(p)) return compareText(tks);
  if (/day ?trade|ντει ?τρειντ|ημερησι|intraday|για αυριο/.test(p)) return dayText(tk && dayFor(tk) ? tk : null);
  const cap = money2(text);
  if (/ποσες|ποσα (να )?(βαλω|επενδυ)|μεγεθος θεσ|κεφαλαι/.test(p) || (cap && tk)) { const a = tk ? await Data.stock(tk).catch(() => null) : null; return sizeText(a && !a.index ? a : null, cap, riskPct(text)); }
  if (tk) {
    const a = await Data.stock(tk).catch(() => null);
    if (!a) return `Η ${tk} δεν είναι στην ανάλυση (μόνο μετοχές NASDAQ/NYSE/AMEX με αρκετό τζίρο).`;
    if (a.index) { const x = D()?.idx?.[tk] || {}; return `**${tk}**: ${fmt(curPx(tk, a.price))} (${pct(curCh(tk, a.chg))}), κλείσιμο ${dday(a.asOf)}.\n\n${marketText()}`; }
    if (/γιατι|για ποιο λογο/.test(p) && /επεσ|πεφτ|ανεβ|πτωσ|ανοδ|κινηθ|κινειτ|βουτ|εκτοξ/.test(p)) return whyText(a);
    if (/ρισκ|κινδυν|φοβ|επικινδυν/.test(p)) return riskText(a);
    if (/stop|στοπ|βγω|εξοδ|πουλησ.*ζημ/.test(p)) return stopText(a);
    if (/ειδησ|(^|\s)νεα(\s|$|;)|news|τι ακουγεται/.test(p)) return newsText(a);
    if (/αποτελεσμ|earnings|κερδη .*ανακοιν/.test(p)) return earnText(a);
    if (/(να )?(αγορασω|παρω|μπω|επενδυσω)|αξιζει|καλη (αγορα|επενδυση)|τωρα;/.test(p)) return buyText(a);
    if (gl && /τι (ειναι|σημαινει)/.test(p)) return gl[1];
    return explainText(a);
  }
  const sx = SECTORS.find(([rx]) => rx.test(p)); if (sx) return sectorText(sx[1]);
  if (/ανεβηκ|κερδισμεν|πιο πολυ ανεβ|gainers|μεγαλυτερ.*ανοδ/.test(p)) return moversText("up");
  if (/επεσαν|χαμεν|losers|μεγαλυτερ.*πτωσ|πτωσεις/.test(p)) return moversText("down");
  if (/ογκο|volume/.test(p)) return moversText("vol");
  if (/προβλεψεις μου|τις εταιρειες μου|my predictions/.test(p)) return myText();
  if (/χαρτοφυλακ|portfolio|τις θεσεις μου|πως παει το πορτοφολ/.test(p)) return pfText();
  if (/στοχο|στοχος|διπλασιασ|να τα κανω|να φτασω/.test(p)) return goalText();
  if (/λιστα μου|watchlist|τις μετοχες μου/.test(p)) return watchText();
  if (/μοντελ|προβλεψ|\bml\b|αλγοριθμ/.test(p)) return modelText();
  const cx = CATRX.find(([rx]) => rx.test(p)); if (cx) return catText(cx[1]);
  if (/ευκαιρ|τι να (αγορασω|παρω)|προτασ|καλυτερ|συστην|σημα|signal/.test(p)) return oppText();
  if (/ειδησ|(^|\s)νεα(\s|$|;)|news/.test(p)) return newsText(null);
  if (gl) return gl[1];
  if (/αγορα|σημερα|s&p|nasdaq|dow|vix|πως παει|κλιμα|διαθεση/.test(p)) return marketText();
  return `Δεν είμαι σίγουρος τι ρωτάς. ${helpText().split("\n").slice(1).join("\n")}`;
}

// ================================================================== AI (όπου υπάρχει)
function aiContext(tk) {
  const d = D(), a = tk && App.last?.ticker === tk ? App.last : null;
  return { as_of: d?.asOf, market: d?.market ? { regime: d.market.regime, score: d.market.score, summary: d.market.simple } : null,
    indices: Object.fromEntries(Object.entries(d?.idx || {}).map(([k, v]) => [k, { price: v.p, change_pct: v.ch }])),
    sectors: (d?.sectors || []).slice(0, 11).map((s) => ({ sector: s.sector, vs_sp500_1m: s.rel21, today: s.ret1 })),
    opportunities: (d?.signals || []).slice(0, 8).map((s) => ({ ticker: s.ticker, horizon: s.horizon, setup: s.setup, entry: [s.entryLow, s.entryHigh], stop: s.stop, targets: [s.tp1, s.tp2] })),
    day_trades: (d?.day?.long || []).slice(0, 6).map((c) => ({ ticker: c.ticker, entry: [c.entryLow, c.entryHigh], stop: c.stop, targets: [c.tp1, c.tp2], why: c.reasons })),
    models_validated: Object.fromEntries(Object.entries(d?.model || {}).map(([k, m]) => [k, !!m.validated])),
    model_v4: Object.fromEntries(Object.entries(d?.model4?.models || {}).map(([k, m]) => [k, { active: !!m.active, better_than_v3: !!m.better }])),
    ai_market_note: Data.ai?.market || null, my_companies: myList().slice(0, 15),
    portfolio: PF.list.length ? (() => { const q = pfCalc(); return { value_usd: Math.round(q.val), pl_pct: q.plPct, score: q.score, daily_move_pct: q.sd * 100,
      holdings: q.hs.map((h) => ({ ticker: h.t, shares: h.sh, buy_price: h.px, pl_pct: h.plPct, weight: h.w, system_view: pfAdvice(h).head })) }; })() : null,
    goal: PF.goal ? { ...PF.goal, required_annual_return: needAnnual(PF.goal.start, PF.goal.target, PF.goal.months, PF.goal.monthly || 0) } : null,
    stock: a ? { ticker: a.ticker, name: a.name, sector: a.sector, price: a.q?.price ?? a.price, change_pct: a.chg, score: a.sc.score, bias: a.sc.bias, metrics: a.tech.m, flags: a.tech.flags,
      plain_summary: a.simple, risks: a.risk?.warnings, setups: a.acc.map((s) => ({ horizon: s.horizon, setup: s.setup, entry: [s.entry_low, s.entry_high], stop: s.stop, targets: [s.tp1, s.tp2, s.tp3] })),
      fundamentals: a.fund?.m, news: (a.news?.items || []).slice(0, 6).map((n) => ({ date: (n.at || "").slice(0, 10), title: n.title, source: n.source })),
      predictions: HZ_ORDER.map((h) => predPick(a, h)).filter(Boolean).map(({ p, ver }) => ({ horizon: p.label, value: predVal(p), model: ver, validated: !!p.validated })),
      ai_note: Data.aiFor(a.ticker) } : null };
}
const SYS = "Είσαι ο βοηθός της εφαρμογής US Alpha για αμερικανικές μετοχές. Απαντάς στα ελληνικά, απλά και φιλικά, σαν να εξηγείς σε φίλο που δεν είναι ειδικός, χωρίς ορολογία χωρίς εξήγηση. Στηρίζεσαι στην «Ανάλυση του συστήματος» και στα δεδομένα JSON· δεν επινοείς τιμές ή γεγονότα. Αν κάτι λείπει, το λες. Δεν υπόσχεσαι κέρδη, δεν δίνεις εντολές αγοράς/πώλησης, αναφέρεις τα βασικά ρίσκα και τις ημερομηνίες. Αν ένα μοντέλο δεν είναι επικυρωμένο, λες ότι δεν λαμβάνεται υπόψη. Κλείνεις με «Ανάλυση, όχι επενδυτική συμβουλή.»";

async function botAsk(text) {
  text = (text || "").trim(); if (!text || bot.busy) return;
  bot.hist.push({ r: "u", t: text }); bot.busy = true; botRender();
  let reply, src = "";
  try {
    const local = await answer(text);
    if ($("#bCtx") && bot.ticker) $("#bCtx").textContent = bot.ticker;
    if (bot.ticker && App.last?.ticker !== bot.ticker) { const a = await Data.stock(bot.ticker).catch(() => null); if (a && !a.index) App.last = a; }
    const hist = bot.hist.slice(-8, -1).map((m) => ({ role: m.r === "u" ? "user" : "assistant", content: m.t }));
    if (Data.server && Data.serverAI) {
      try { const r = await AI.server(`${text}\n\n[Ανάλυση του συστήματος για βάση]\n${local}`, bot.ticker, hist); if (r.used_ai && r.reply) { reply = r.reply; src = "AI προγράμματος"; } } catch { /* τοπική απάντηση */ }
    } else if (AI.enabled()) {
      try {
        reply = await AI.ask(SYS, `Δεδομένα (JSON):\n${JSON.stringify(aiContext(bot.ticker))}\n\nΑνάλυση του συστήματος:\n${local}\n\nΠροηγούμενη συζήτηση:\n${hist.map((h) => `${h.role === "user" ? "Χρήστης" : "Βοηθός"}: ${h.content}`).join("\n")}\n\nΕρώτηση: ${text}`);
        src = "Gemini";
      } catch (e) { src = `AI μη διαθέσιμο (${e.message}), απάντηση συστήματος`; }
    }
    reply = reply || local;
  } catch (e) { reply = "Δεν ολοκληρώθηκε: " + e.message; }
  bot.hist.push({ r: "b", t: reply || "—", src }); bot.busy = false; saveBot(); botRender();
}

boot();
