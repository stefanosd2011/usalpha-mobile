/* US Alpha — ανάγνωση screenshot χαρτοφυλακίου ΜΕΣΑ στη συσκευή, χωρίς κωδικό AI.
   Χρησιμοποιεί το Tesseract.js (ανοιχτός κώδικας, αναγνώριση κειμένου στον browser): η εικόνα ΔΕΝ φεύγει από το κινητό.
   Την πρώτη φορά κατεβαίνει το πρόγραμμα ανάγνωσης (~6 MB), μετά μένει στη μνήμη της συσκευής.
   Τα σύμβολα/ονόματα αναγνωρίζονται από τη λίστα μετοχών της ανάλυσης και οι αριθμοί ελέγχονται με την τρέχουσα τιμή
   (π.χ. μετοχές × τιμή ≈ αξία). Ό,τι υπολογίστηκε έμμεσα σημειώνεται, και τίποτα δεν αποθηκεύεται πριν το δεις. */
"use strict";

const OCR = {
  lib: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
  opts: {
    workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1",
    langPath: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int",
  },
  worker: null, onProgress: null,
  async load() {
    if (!window.Tesseract) {
      await new Promise((res, rej) => {
        const s = document.createElement("script"); s.src = this.lib; s.async = true; s.onload = res;
        s.onerror = () => rej(new Error("Δεν κατέβηκε το πρόγραμμα ανάγνωσης. Έλεγξε τη σύνδεση στο internet και ξαναδοκίμασε."));
        document.head.appendChild(s);
      });
    }
    if (!this.worker) {
      this.worker = await Tesseract.createWorker("eng", 1, { ...this.opts, logger: (m) => { try { this.onProgress && this.onProgress(m); } catch { /* */ } } });
      await this.worker.setParameters({ preserve_interword_spaces: "1" });
    }
    return this.worker;
  },
  // σκούρο φόντο → αντιστροφή (το OCR διαβάζει καλύτερα σκούρα γράμματα σε ανοιχτό φόντο), μικρές εικόνες → μεγέθυνση
  async prepare(file) {
    let src;
    try { src = await createImageBitmap(file); }
    catch { src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("Η εικόνα δεν ανοίγει")); im.src = URL.createObjectURL(file); }); }
    const W = src.width, H = src.height, sc = W < 1000 ? Math.min(2.2, 1400 / W) : Math.min(1, 2400 / Math.max(W, H));
    const c = document.createElement("canvas"); c.width = Math.round(W * sc); c.height = Math.round(H * sc);
    const g = c.getContext("2d", { willReadFrequently: true }); g.imageSmoothingQuality = "high"; g.drawImage(src, 0, 0, c.width, c.height);
    const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
    let sum = 0; for (let i = 0; i < d.length; i += 4 * 16) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const dark = sum / (d.length / (4 * 16)) < 115;
    for (let i = 0; i < d.length; i += 4) {
      let y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; if (dark) y = 255 - y;
      y = Math.max(0, Math.min(255, (y - 128) * 1.25 + 128)); d[i] = d[i + 1] = d[i + 2] = y;
    }
    g.putImageData(img, 0, 0);
    return c;
  },
  async read(file) {
    const w = await this.load();
    const canvas = await this.prepare(file);
    const { data } = await w.recognize(canvas);
    return ocrParse(data.lines || [], canvas.width);
  },
};

// ------------------------------------------------------------------ αριθμοί από κείμενο
// «μετοχές» συχνά διαβάζεται ως «petoxeq», «HETOXEQ» κ.λπ. (ελληνικά γράμματα με λατινικό OCR)
const QTY_AFTER = /^\s*(μετοχ|\S{0,2}etox|\S{0,2}ετοχ|shares?|sh\b|units?|μερίδ|μεριδ|τεμ|τμχ|pcs|x\b)/i;
const QTY_BEFORE = /(ποσότητα|ποσοτητα|qty|quantity|μετοχές|μετοχες|shares|units|θέση|position)\s*[:=]?\s*$/i;
const AVG_BEFORE = /(μέση|μεση|avg\.?|average|τιμή αγοράς|τιμη αγορας|αγορά|open|cost\/share|buy price|price paid|μ\.\s?τ\.?)\s*(τιμή|τιμη|price)?\s*[:=@]?\s*$/i;
const VAL_BEFORE = /(αξία|αξια|value|σύνολο θέσης|market value|mkt val)\s*[:=]?\s*$/i;
const CASH_RX = /(cash|μετρητά|μετρητα|\b\S?etp\S{1,2}ta\b|διαθέσιμα|διαθεσιμα|available|buying power)/i;
// «1.234,56» (ελληνικά/ευρωπαϊκά) ή «1,234.56» (αμερικάνικα)· eu = η εικόνα γράφει δεκαδικά με κόμμα
function ocrNum(raw, eu, cur) {
  raw = raw.replace(/'/g, "");
  const hasC = raw.includes(","), hasD = raw.includes(".");
  if (hasC && hasD) return parseFloat(raw.lastIndexOf(",") > raw.lastIndexOf(".") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, ""));
  if (hasC) return parseFloat(/^\d{1,3}(,\d{3})+$/.test(raw) && !eu ? raw.replace(/,/g, "") : raw.replace(/,(?=.*,)/g, "").replace(",", "."));
  if (hasD && /^\d{1,3}(\.\d{3})+$/.test(raw) && (eu || cur === "€")) return parseFloat(raw.replace(/\./g, ""));
  return parseFloat(raw.replace(/\.(?=.*\.)/g, ""));
}
function ocrNums(text, eu) {
  const out = [], re = /(US\$|\$|€)?\s?([+\-−–]?)\s?(US\$|\$|€)?\s?(\d[\d.,']*\d|\d)(\s?%|\s?€|\s?\$|\s?USD|\s?EUR)?/g;
  let m;
  while ((m = re.exec(text))) {
    const before = text.slice(Math.max(0, m.index - 22), m.index), after = text.slice(re.lastIndex, re.lastIndex + 16);
    const tail = (m[5] || "").trim(), cur0 = m[1] || m[3] || tail || (/[$€]\s*$/.test(before) ? before.trim().slice(-1) : "") || (/^\s*(€|\$|usd|eur)/i.exec(after) || [])[1] || "";
    const cur = /€|eur/i.test(cur0) ? "€" : /\$|usd/i.test(cur0) ? "$" : "";
    const v = ocrNum(m[4], eu, cur);
    if (!isFinite(v)) continue;
    const sign = /[\-−–]/.test(m[2]) ? -1 : 1, signed = !!m[2];
    out.push({ v: v * sign, abs: v, cur, pct: tail === "%" || /^\s*%/.test(after), signed, dec2: /[.,]\d{2}$/.test(m[4]),
      qty: QTY_AFTER.test(after) || QTY_BEFORE.test(before), avg: AVG_BEFORE.test(before), val: VAL_BEFORE.test(before), raw: m[4],
      inName: /[A-Za-z&]\s?$/.test(before) && /^\s?[A-Za-z]/.test(after) });
  }
  return out;
}

// ------------------------------------------------------------------ από γραμμές κειμένου σε θέσεις
const OCR_STOP_T = new Set(["USD", "EUR", "GBP", "US", "ETF", "ETFS", "AI", "PL", "CEO", "IPO", "TOTAL", "CASH", "LLC", "INC", "PLC", "NV", "SA", "AG",
  "SE", "OK", "AM", "PM", "GMT", "YTD", "ALL", "NEW", "BUY", "SELL", "ISA", "EPS", "PE", "IRA", "FX", "ID", "QR", "PIN", "APP", "MAX", "MIN", "NOW", "ON", "IT", "TV", "UK", "EU"]);
const OCR_STOP_W = /^(total|value|cash|portfolio|stocks?|shares?|invest(ing|ments?)?|returns?|today|market|balance|account|available|buying power|history|orders?|watchlist|positions?|holdings?|equity|profit|loss|overview|home|search|trade|sell|buy|more|see all|details|daily|performance|news|settings|crypto|commodities|savings|wealth|pies|dividends?)$/;
function ocrAnchor(text) {
  // 1) σύμβολο που υπάρχει στην ανάλυση (π.χ. AAPL, BRK.B)
  const toks = text.match(/\b[A-Z]{1,5}\d{0,2}(?:[.\-][A-Z])?\b/g) || [];
  for (const tk of toks) {
    const t = tk.replace("-", ".");
    if (OCR_STOP_T.has(t) || !Data.row(t)) continue;
    if (t.length === 1 && text.trim() !== tk) continue;
    return { t, how: "symbol" };
  }
  // 2) όνομα εταιρείας (λατινικά γράμματα)· το γράμμα του λογότυπου στην αρχή (π.χ. «A Apple») αγνοείται
  for (const run of text.match(/[A-Za-z][A-Za-z&'.,\- ]{3,}/g) || []) {
    const words = run.trim().split(" ");
    for (let k = 0; k < Math.min(3, words.length); k++) {
      if (k && words[k - 1].length > 2) break;
      const nm = words.slice(k).join(" ").replace(/[,.\- ]+$/, "");
      if (nm.length < 4 || !/[A-Za-z]{3,}/.test(nm) || OCR_STOP_W.test(nm.toLowerCase())) continue;
      const t = matchTicker({ name: nm });
      if (t && Data.row(t)) return { t, how: "name", name: nm };
    }
  }
  return null;
}
function ocrHeader(lines) {
  // πίνακας με επικεφαλίδες (π.χ. IBKR: Symbol | Position | Avg Price | Last | Market Value | P&L)
  const R = [[/^(position|qty|quantity|shares|units|ποσότητα|ποσοτητα|μετοχές|μετοχες|τεμάχια)$/i, "qty"], [/^(avg|average|μέση|μεση|open|cost\/sh)/i, "avg"],
    [/^(last|price|current|τρέχουσα|τρεχουσα|τιμή|τιμη)$/i, "last"], [/^(value|market|αξία|αξια|mkt)/i, "value"], [/^(p&l|pnl|unrealized|gain|κέρδος|κερδος|απόδοση|αποδοση|return)/i, "pl"]];
  for (const ln of lines) {
    const ws = (ln.words || []).filter((w) => (w.text || "").trim());
    const cols = [];
    for (let i = 0; i < ws.length; i++) {
      const tx = ws[i].text.trim(), prev = i ? ws[i - 1].text.trim() : "";
      if (/^(price|τιμή|τιμη)$/i.test(tx) && /^(avg|average|μέση|μεση|open)/i.test(prev)) continue; // «Avg Price» = μία στήλη
      if (/^(value|αξία|αξια)$/i.test(tx) && /^(market|mkt)/i.test(prev)) continue;
      const hit = R.find(([rx]) => rx.test(tx));
      if (hit && !cols.some((c) => c.role === hit[1])) cols.push({ role: hit[1], x: (ws[i].bbox.x0 + ws[i].bbox.x1) / 2 });
    }
    if (cols.length >= 2) return { y: ln.bbox.y1, cols };
  }
  return null;
}
function ocrParse(rawLines, W) {
  const lines = rawLines.map((l) => ({ text: String(l.text || "").replace(/\s+/g, " ").trim(), words: l.words || [], bbox: l.bbox,
    yc: (l.bbox.y0 + l.bbox.y1) / 2, h: Math.max(4, l.bbox.y1 - l.bbox.y0) })).filter((l) => l.text);
  const all = lines.map((l) => l.text).join("\n");
  const eu = (all.match(/\d,\d{2}(?!\d)/g) || []).length > (all.match(/\d\.\d{2}(?!\d)/g) || []).length;
  const hMed = lines.map((l) => l.h).sort((a, b) => a - b)[Math.floor(lines.length / 2)] || 20;
  const head = ocrHeader(lines);
  // σημεία αναφοράς: μία ανά θέση (σύμβολο ή όνομα), συγχώνευση όσων είναι στην ίδια σειρά
  let anchors = [];
  for (const l of lines) { const a = ocrAnchor(l.text); if (a) anchors.push({ ...a, yc: l.yc, line: l }); }
  anchors.sort((a, b) => a.yc - b.yc);
  const merged = [];
  for (const a of anchors) {
    const p = merged[merged.length - 1];
    if (p && p.t === a.t && a.yc - p.yc < 3 * hMed) { p.name = p.name || a.name; continue; }
    if (p && a.yc - p.yc < 0.7 * hMed) continue; // δύο σύμβολα στην ίδια γραμμή: κρατάμε το πρώτο
    merged.push({ ...a });
  }
  anchors = merged;
  const gaps = anchors.slice(1).map((a, i) => a.yc - anchors[i].yc).sort((a, b) => a - b), gMed = gaps[Math.floor(gaps.length / 2)] || 4 * hMed;
  const fx = typeof fxRate === "function" ? fxRate() : null;
  const usd = (n) => (n.cur === "€" && fx ? n.abs * fx : n.abs);
  const items = [];
  anchors.forEach((a, i) => {
    const top = i ? (anchors[i - 1].yc + a.yc) / 2 : a.yc - Math.min(gMed / 2, 2 * hMed);
    const bot = i < anchors.length - 1 ? (a.yc + anchors[i + 1].yc) / 2 : a.yc + Math.max(gMed / 2, 2.5 * hMed);
    const block = lines.filter((l) => l.yc >= top && l.yc < bot && (!head || l.yc > head.y));
    const nums = [];
    for (const l of block) for (const n of ocrNums(l.text, eu)) {
      if (head) { // ρόλος από τη στήλη του πίνακα
        const w = (l.words || []).find((w) => (w.text || "").includes(n.raw));
        if (w) { const x = (w.bbox.x0 + w.bbox.x1) / 2, c = head.cols.reduce((b, c) => (Math.abs(c.x - x) < Math.abs(b.x - x) ? c : b)); if (Math.abs(c.x - x) < W * 0.12) n.role = c.role; }
      }
      // αριθμός μέσα στο όνομα (π.χ. «S&P 500 ETF») δεν είναι ποσότητα ή τιμή
      if (n.inName && !n.cur && !n.pct && !n.qty && !n.role) continue;
      nums.push(n);
    }
    const r = Data.row(a.t) || {}, q = App.quotes?.[a.t], p = q?.price ?? r.p;
    const note = [];
    const money = nums.filter((n) => !n.pct && (n.cur || n.dec2) && !n.qty);
    let qty = (nums.find((n) => n.role === "qty") || nums.find((n) => n.qty && !n.pct))?.abs ?? null;
    let value = (nums.find((n) => n.role === "value") || nums.find((n) => n.val))?.abs != null ? usd(nums.find((n) => n.role === "value") || nums.find((n) => n.val)) : null;
    if (qty == null && p) { // μετοχές × τρέχουσα τιμή ≈ αξία
      outer: for (const n of nums.filter((n) => !n.pct && !n.cur && n.abs > 0 && n.abs < 1e7)) {
        for (const m of money) { if (m === n) continue; const mv = usd(m); if (mv > 0 && Math.abs(n.abs * p - mv) / mv < 0.1) { qty = n.abs; value = value ?? mv; break outer; } }
      }
    }
    if (value == null) { const un = money.filter((n) => !n.signed && n.role !== "avg" && n.role !== "last" && !n.avg).sort((x, y) => usd(y) - usd(x))[0]; if (un) value = usd(un); }
    if (qty == null && value != null && p) { qty = Math.round((value / p) * 1000) / 1000; note.push("μετοχές υπολογισμένες από την αξία"); }
    else if (qty != null && value != null && p && Math.abs(qty * p - value) / value > 0.2) { // π.χ. «12.5» διαβάστηκε «125»
      const q2 = Math.round((value / p) * 1000) / 1000;
      if (String(qty).replace(/\D/g, "").startsWith(String(Math.round(q2 * 100)).replace(/0+$/, "").slice(0, 2))) { note.push(`μετοχές ${fmt(q2, 3)} από την αξία (διαβάστηκε ${qty})`); qty = q2; }
    }
    let avg = (nums.find((n) => n.role === "avg") || nums.find((n) => n.avg && !n.pct));
    avg = avg ? usd(avg) : null;
    const plN = nums.find((n) => n.role === "pl" && !n.pct) || money.filter((n) => n.signed).sort((x, y) => y.abs - x.abs)[0];
    const pct = nums.find((n) => n.pct && n.signed) || nums.find((n) => n.pct);
    if (avg == null && qty) {
      if (plN && value != null) { avg = (value - Math.sign(plN.v) * usd(plN)) / qty; note.push("τιμή αγοράς από το κέρδος/ζημιά"); }
      else if (pct && value != null && pct.v > -99) { avg = value / (1 + pct.v / 100) / qty; note.push("τιμή αγοράς από το % απόδοσης"); }
      else if (p) { const c = money.find((n) => n.role !== "last" && Math.abs(usd(n) - p) / p > 0.015 && usd(n) > 0.2 * p && usd(n) < 5 * p); if (c) avg = usd(c); }
    }
    if (qty || value != null) items.push({ ticker: a.t, name: a.name || r.n || null, shares: qty, avg_price: avg != null && isFinite(avg) && avg > 0 ? Math.round(avg * 100) / 100 : null,
      value: value != null ? Math.round(value * 100) / 100 : null, currency: "USD", note: note.join(" · ") });
  });
  // μετρητά
  let cash = null, cashCur = null;
  for (const l of lines) if (CASH_RX.test(l.text)) { const n = ocrNums(l.text, eu).find((n) => !n.pct && (n.cur || n.dec2)); if (n) { cash = n.abs; cashCur = n.cur === "$" ? "USD" : "EUR"; break; } }
  return { items, cash, cash_currency: cashCur };
}
