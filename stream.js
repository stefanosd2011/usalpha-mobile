"use strict";
/* US Alpha — ζωντανές τιμές κάθε δευτερόλεπτο, χωρίς κωδικό και χωρίς υπολογιστή.
   Το κινητό συνδέεται απευθείας στη δημόσια ροή τιμών του Yahoo (WebSocket) και παίρνει κάθε νέα συναλλαγή
   για τις μετοχές που φαίνονται στην οθόνη και για το χαρτοφυλάκιο. Οι αριθμοί αλλάζουν επί τόπου (με ένα σύντομο
   πράσινο/κόκκινο «άναμμα»), χωρίς να ξαναφορτώνει η σελίδα.
   Μόνο πραγματικές τιμές: ό,τι δεν έρθει από τη ροή μένει όπως ήταν (τιμή cloud κάθε ~2,5′ ή κλείσιμο).
   Premarket/after-hours δεν αλλάζουν την τιμή της ημέρας· φαίνονται χωριστά στη σελίδα της μετοχής. */

// ---------------------------------------------------------------- αποκωδικοποίηση μηνύματος (protobuf PricingData)
// 1 σύμβολο · 2 τιμή · 3 ώρα (ms) · 7 φάση (0 premarket, 1 κανονική, 2 after-hours, 3 εκτεταμένη) · 8 μεταβολή % · 12 μεταβολή $
const _PB_PLAIN = new Set([6, 7, 20]); // enum: χωρίς zigzag
function pbDecode(u) {
  const o = {}, dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let i = 0;
  const vint = () => { let r = 0, m = 1, b; do { if (i >= u.length) throw new Error("pb"); b = u[i++]; r += (b & 127) * m; m *= 128; } while (b & 128); return r; };
  while (i < u.length) {
    const k = vint(), f = Math.floor(k / 8), w = k % 8;
    if (w === 0) { const v = vint(); o[f] = _PB_PLAIN.has(f) ? v : (v % 2 ? -(v + 1) / 2 : v / 2); }
    else if (w === 5) { o[f] = dv.getFloat32(i, true); i += 4; }
    else if (w === 1) { o[f] = dv.getFloat64(i, true); i += 8; }
    else if (w === 2) { const L = vint(); o[f] = new TextDecoder().decode(u.subarray(i, i + L)); i += L; }
    else break;
  }
  return o;
}
const _b64 = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
const _r4 = (v) => Math.round(v * 1e4) / 1e4;

const Stream = {
  URL: "wss://streamer.finance.yahoo.com/?version=2",
  MAX: 300,
  ws: null, state: "off", subs: new Set(), dirty: new Set(), ext: {}, retry: 0, timer: null, syncT: null,
  lastMsg: 0, lastEq: 0, n: 0, wasLive: false,

  // υπάρχουν ζωντανές τιμές μετοχών αυτή τη στιγμή;
  live() { return this.state === "on" && Date.now() - this.lastEq < 20000; },

  // ---------------------------------------------------------------- σύνδεση
  connect() {
    if (this.ws || document.visibilityState !== "visible" || !("WebSocket" in window)) return;
    clearTimeout(this.timer);
    let ws;
    try { ws = new WebSocket(this.URL); } catch { this.later(); return; }
    this.ws = ws; this.subs = new Set(); this.state = "connecting";
    ws.onopen = () => { if (this.ws !== ws) return; this.state = "on"; this.lastMsg = Date.now(); this.sync(); };
    ws.onmessage = (e) => { if (this.ws === ws) this.onMsg(e.data); };
    ws.onclose = () => { if (this.ws !== ws) return; this.ws = null; this.subs = new Set(); this.state = "off"; this.status(); this.later(); };
    ws.onerror = () => { try { ws.close(); } catch { /* */ } };
  },
  later() {
    clearTimeout(this.timer);
    if (document.visibilityState !== "visible") return;
    const s = [1, 2, 5, 10, 20, 30][Math.min(this.retry++, 5)];
    this.timer = setTimeout(() => this.connect(), s * 1000);
  },
  stop() {
    clearTimeout(this.timer);
    const ws = this.ws; this.ws = null; this.subs = new Set(); this.state = "off";
    try { ws?.close(); } catch { /* */ }
    this.status();
  },

  // ---------------------------------------------------------------- ποιες μετοχές χρειάζονται τώρα
  wanted() {
    const s = new Set(["SPY"]);
    $$("[data-lp],[data-lc],[data-lt]").forEach((el) => { const t = el.dataset.lp || el.dataset.lc || el.dataset.lt; if (t) s.add(t); });
    if (App.route === "s" && App.last?.ticker) s.add(App.last.ticker);
    if (typeof PF === "object" && ["pf", "pfc", "home", "goal"].includes(App.route)) {
      const l = PF.list; l.forEach((h) => h.t && s.add(h.t));
      if (l.length || PF.cash) s.add("EURUSD=X");
    }
    return [...s].slice(0, this.MAX);
  },
  sync() {
    const ws = this.ws; // η σύνδεση/επανασύνδεση γίνεται από start/later/visibility· εδώ μόνο οι συνδρομές
    if (!ws || this.state !== "on" || ws.readyState !== 1) return;
    const want = new Set(this.wanted());
    const add = [...want].filter((t) => !this.subs.has(t)), rm = [...this.subs].filter((t) => !want.has(t));
    try {
      if (rm.length) ws.send(JSON.stringify({ unsubscribe: rm }));
      if (add.length) ws.send(JSON.stringify({ subscribe: add }));
      this.subs = want;
    } catch { /* κλείνει: θα ξανασυνδεθεί */ }
  },

  // ---------------------------------------------------------------- νέα τιμή
  onMsg(raw) {
    this.lastMsg = Date.now();
    let m = raw;
    try { const j = JSON.parse(raw); m = j.message; } catch { /* παλιά μορφή: σκέτο base64 */ }
    if (typeof m !== "string") return;
    let d; try { d = pbDecode(_b64(m)); } catch { return; }
    const t = d[1], p = d[2];
    if (!t || typeof t !== "string" || !isNum(p) || p <= 0) return;
    const ts = isNum(d[3]) && d[3] > 1e12 ? d[3] : Date.now(), mh = isNum(d[7]) ? d[7] : 1;
    const chg = isNum(d[8]) ? d[8] : null;
    this.retry = 0; this.n++;
    const fxIdx = t.endsWith("=X") || t.startsWith("^");
    if (mh === 1 || fxIdx) {
      const o = App.quotes[t];
      if (o && o.src === "stream" && o.ts > ts) return; // καθυστερημένο μήνυμα
      App.quotes[t] = { price: _r4(p), chg: isNum(chg) ? Math.round(chg * 100) / 100 : o?.chg ?? null, ts, src: "stream", prev: o?.price };
      delete this.ext[t];
      if (!t.endsWith("=X")) this.lastEq = Date.now();
    } else {
      this.ext[t] = { price: _r4(p), ts, mh };
    }
    this.dirty.add(t);
  },

  // ---------------------------------------------------------------- ζωγραφική (έως 2 φορές το δευτερόλεπτο)
  flash(el, dir) {
    if (!el || !dir) return;
    el.classList.remove("tk-up", "tk-down"); void el.offsetWidth; el.classList.add(dir === "up" ? "tk-up" : "tk-down");
  },
  paint(t) {
    const q = App.quotes[t]; if (!q || q.src !== "stream") return;
    const sel = CSS.escape(t), dir = isNum(q.prev) && q.prev !== q.price ? (q.price > q.prev ? "up" : "down") : "";
    $$(`[data-lp="${sel}"]`).forEach((el) => {
      const h = el.dataset.lf === "m" ? money(q.price) : fmt(q.price);
      if (el.innerHTML !== h) { el.innerHTML = h; this.flash(el, dir); }
    });
    $$(`[data-lc="${sel}"]`).forEach((el) => {
      const f = el.dataset.lf;
      if (f === "pill") { const h = livePill(t, q.chg); if (el.outerHTML !== h) el.outerHTML = h; return; }
      const txt = pct(q.chg); if (el.textContent !== txt) el.textContent = txt;
      if (f === "pct") { el.classList.toggle("up", q.chg > 0); el.classList.toggle("down", q.chg < 0); }
    });
    $$(`[data-lt="${sel}"]`).forEach((el) => { el.textContent = `ζωντανά ${qClock(q)}`; });
  },
  paintStock(ds) {
    if (App.route !== "s") return;
    const t = App.last?.ticker; if (!t || !ds.includes(t)) return;
    const px = $("#sPx"), before = px?.innerHTML, q = App.quotes[t];
    if (q?.src === "stream") {
      livePx();
      if (px && px.innerHTML !== before) this.flash(px, isNum(q.prev) && q.prev !== q.price ? (q.price > q.prev ? "up" : "down") : "");
    }
    // premarket / after-hours: χωριστή γραμμή κάτω από την τιμή
    const x = this.ext[t]; let el = $("#sExt");
    if (!x) { el?.remove(); return; }
    const ref = curPx(t, Data.row(t)?.p ?? App.last?.price), c = isNum(ref) && ref ? (x.price / ref - 1) * 100 : null;
    const lbl = x.mh === 0 ? "Premarket" : x.mh === 2 ? "After-hours" : "Εκτός ωραρίου";
    const h = `${lbl} <b class="num">${money(x.price)}</b> <span class="num ${cls(c)}">${pct(c)}</span> <span class="muted">${qClock(x)}</span>`;
    if (!el && px?.nextElementSibling) { px.nextElementSibling.insertAdjacentHTML("afterend", `<div class="small s-ext" id="sExt"></div>`); el = $("#sExt"); }
    if (el && el.innerHTML !== h) el.innerHTML = h;
  },
  paintPf(ds) {
    if (typeof pfCalc !== "function" || typeof PF !== "object" || !PF.list.length) return;
    const mine = new Set(PF.list.map((h) => h.t));
    if (!ds.some((t) => mine.has(t) || t === "EURUSD=X")) return;
    const p = pfCalc(), cashUsd = toUsd(PF.cash) || 0;
    const dayPct = p.val - p.day > 0 ? (p.day / (p.val - p.day)) * 100 : null;
    // αρχική: κάρτα χαρτοφυλακίου
    $$(".pf-top").forEach((top) => {
      const v = $(".pf-val", top), s = v?.nextElementSibling;
      const hv = fxRate() ? eur((toEur(p.val) || 0) + PF.cash) : usd(p.val);
      if (v && v.innerHTML !== hv) { const up = (this._pfHome ?? p.val) <= p.val; v.innerHTML = hv; this.flash(v, up ? "up" : "down"); }
      this._pfHome = p.val;
      if (s) s.innerHTML = `<span class="${cls(p.day)}">${fxRate() ? eur(toEur(p.day)) : usd(p.day)} σήμερα</span> · <span class="${cls(p.pl)}">${fxRate() ? eur(toEur(p.pl)) : usd(p.pl)} (${pct(p.plPct, 1)}) συνολικά</span>`;
    });
    // καρτέλα χαρτοφυλακίου
    if (App.route !== "pf" || !$("#rvList")) return;
    const total = p.val + cashUsd, hero = bigMoney(total), cur = $(".rv-cur"), scrub = cur && !cur.hidden;
    RV.heroLive = hero;
    if (!scrub) {
      const v = $("#rvVal");
      if (v && v.innerHTML !== hero) { v.innerHTML = hero; this.flash(v, (this._pfTot ?? total) <= total ? "up" : "down"); }
      const c = $("#rvChg");
      if (c) {
        if (isNum(RV.first) && RV.hist) {
          const inc = p.hs.filter((h) => RV.hist.inc.includes(h.t)).reduce((s, h) => s + (isNum(h.value) ? h.value : 0), 0);
          if (inc > 0) c.innerHTML = `${signedMoney(inc - RV.first)} ${arrowPct(RV.first ? (inc / RV.first - 1) * 100 : null)} <span class="muted">· ${RV.rngTxt || ""}</span>`;
        } else c.innerHTML = `${signedMoney(p.day)} ${arrowPct(dayPct)} <span class="muted">σήμερα</span>`;
      }
    }
    this._pfTot = total;
    const sub = $("#rvSub"); if (sub) sub.innerHTML = `Σήμερα ${signedMoney(p.day)} (${pct(dayPct, 2).replace(".", ",")})`;
    for (const h of p.hs) {
      const it = $(`.rv-item[data-id="${CSS.escape(String(h.id))}"]`); if (!it) continue;
      const mid = $(".rv-mid span", it), right = $(".rv-right", it);
      const m = `${qtyTxt(h.sh)} ${esc(h.t)} · ${isNum(h.price) ? "$" + fmt(h.price) : "—"}`;
      if (mid && mid.innerHTML !== m) mid.innerHTML = m;
      const r = `<b class="num">${mEur(h.value)}</b>${arrowPct(h.plPct)}`;
      if (right && right.innerHTML !== r && ds.includes(h.t)) { right.innerHTML = r; const q = App.quotes[h.t]; this.flash($("b", right), isNum(q?.prev) && q.prev !== q.price ? (q.price > q.prev ? "up" : "down") : ""); }
      else if (right && right.innerHTML !== r) right.innerHTML = r;
    }
    const foot = $(".rv-foot b"); if (foot) { foot.className = `num ${cls(p.pl)}`; foot.innerHTML = `${signedMoney(p.pl)} (${pct(p.plPct, 1)})`; }
  },
  flush() {
    if (!this.dirty.size) return;
    const ds = [...this.dirty]; this.dirty.clear();
    try {
      for (const t of ds) this.paint(t);
      this.paintStock(ds);
      this.paintPf(ds);
      if (ds.includes("SPY")) setMood();
    } catch { /* η σελίδα άλλαξε στο μεταξύ */ }
    this.status();
  },
  status() {
    const l = this.live();
    if (l !== this.wasLive) { this.wasLive = l; try { renderSession(); } catch { /* */ } }
  },

  // ---------------------------------------------------------------- εκκίνηση
  start() {
    if (!("WebSocket" in window)) return;
    // κάθε αλλαγή οθόνης → ενημέρωση των συνδρομών (με μικρή καθυστέρηση)
    new MutationObserver(() => { clearTimeout(this.syncT); this.syncT = setTimeout(() => this.sync(), 300); })
      .observe(document.body, { childList: true, subtree: true });
    setInterval(() => this.flush(), 500);
    // φύλακας: ανοιχτή σύνδεση χωρίς κανένα μήνυμα για 60″ ενώ είναι ανοιχτή η αγορά → νέα σύνδεση
    setInterval(() => {
      this.status();
      if (this.state !== "on" || document.visibilityState !== "visible") return;
      const T = sessionInfo(), now = Date.now();
      if (now >= T.open && now < T.close && now - this.lastMsg > 60000) { this.stop(); this.connect(); }
    }, 15000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { this.retry = 0; this.connect(); } else this.stop(); });
    addEventListener("pagehide", () => this.stop());
    addEventListener("online", () => { this.retry = 0; this.connect(); });
    this.connect();
  },
};
Stream.start();
