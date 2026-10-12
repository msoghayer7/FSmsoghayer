"use strict";
/* =====================================================================
   Report engine (core)
   - three report templates register themselves in TPL (tpl-*.js):
       formal  – رسمي حكومي
       consult – استشاري
       modern  – لوحة حديثة
   - each template builds fixed-size A4 landscape pages from blocks; the
     Pager paginates them (tables / Gantt rows split across pages,
     headings stay with what follows, page shells repeat on every page)
   - output: browser print → "Save as PDF" (vector, selectable text),
     or a one-click image PDF (html-to-image + jsPDF).
   Relies on the globals defined in index.html (db, STATUS, EVT, ...).
   ===================================================================== */

const TPL = {};
const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const DAY_MS = 86400000;
const PG_W = 1123, PG_H = 793;   // A4 landscape at 96dpi

/* ---------------- text helpers ---------------- */
const fmtLong = iso => { if (!iso) return "—"; const [y, m, d] = iso.split("-").map(Number); return `${d} ${AR_MONTHS[m - 1]} ${y}`; };
const fmtShort = iso => { if (!iso) return "—"; const [, m, d] = iso.split("-").map(Number); return `${d} ${AR_MONTHS[m - 1]}`; };
const clip = (s, n) => { s = String(s ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n).trim() + "…" : s; };
const lines = s => String(s ?? "").split(/\n+/).map(x => x.replace(/^[\s\-•*·]+/, "").trim()).filter(Boolean);

// Arabic counted noun for days: يوم واحد، يومان، 3 أيام، 11 يوماً
function dur(n) {
  n = Math.abs(n);
  if (n === 0) return "اليوم نفسه";
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  if (n <= 10) return `${n} أيام`;
  return `${n} يوماً`;
}
// "N مواضيع" with the right noun form
function topicsN(n) {
  if (n === 1) return "موضوع واحد";
  if (n === 2) return "موضوعان";
  if (n <= 10) return `${n} مواضيع`;
  return `${n} موضوعاً`;
}

/* ---------------- data helpers ---------------- */
const lateDays = t => {
  if (!t.dueDate) return 0;
  if (t.status === "closed") return t.closeDate > t.dueDate ? daysBetween(t.dueDate, t.closeDate) : 0;
  return t.dueDate < todayISO() ? daysBetween(t.dueDate, todayISO()) : 0;
};
const sinceLast = t => daysBetween((lastEvent(t) || { date: t.openDate }).date, todayISO());
const realEvents = t => sortedEvents(t).filter(e => e.type !== "create");
const parties = e => [e.by ? `المنفذ: ${esc(e.by)}` : "", e.to ? `المستلم: ${esc(e.to)}` : ""].filter(Boolean).join(" · ");
const evIcon = e => e.tool && ICONS[e.tool] ? e.tool : e.type;   // tool icon when a tool is set

function stats(topics) {
  const s = { total: topics.length, open: 0, progress: 0, hold: 0, closed: 0, events: 0 };
  topics.forEach(t => { s[t.status]++; s.events += t.events.length; });
  s.active = s.total - s.closed;
  s.overdue = topics.filter(isOverdue);
  const closed = topics.filter(t => t.status === "closed");
  s.avgClose = closed.length ? Math.round(closed.reduce((a, t) => a + ageDays(t), 0) / closed.length) : null;
  s.closedOnTime = closed.filter(t => !lateDays(t)).length;
  s.pct = s.total ? Math.round(s.closed / s.total * 100) : 0;
  s.stale = topics.filter(t => t.status !== "closed" && sinceLast(t) > 14);
  s.dueSoon = topics.filter(t => t.status !== "closed" && t.dueDate && !isOverdue(t) && daysBetween(todayISO(), t.dueDate) <= 7);
  s.from = topics.map(t => t.openDate).sort()[0];
  return s;
}

/* auto-written headline sentence for one topic; <em> marks the alarming part */
function topicHeadline(t) {
  const le = lastEvent(t), title = esc(t.title);
  const last = le && le.type !== "create" ? esc(clip(le.text, 80)) : "";
  if (t.status === "closed") {
    let s = `أُقفل موضوع «${title}» بعد ${dur(ageDays(t))} من فتحه`;
    if (t.dueDate) {
      const d = daysBetween(t.dueDate, t.closeDate);
      s += d <= 0 ? `، قبل الاستحقاق بـ ${dur(-d)}` : `، <em>متجاوزاً الاستحقاق بـ ${dur(d)}</em>`;
    }
    return s + (t.closeNote ? `؛ ${esc(clip(t.closeNote, 90))}` : "");
  }
  if (!realEvents(t).length) return `«${title}» <em>لم يُسجَّل عليه أي إجراء</em> منذ فتحه قبل ${dur(ageDays(t))}`;
  if (isOverdue(t)) return `«${title}» <em>متأخر ${dur(lateDays(t))} عن الاستحقاق</em>؛ آخر إجراء قبل ${dur(sinceLast(t))}: ${last}`;
  if (t.status === "hold") return `«${title}» <em>معلّق</em>، وآخر إجراء عليه قبل ${dur(sinceLast(t))}: ${last}`;
  const due = t.dueDate ? `، ومتبقٍ ${dur(daysBetween(todayISO(), t.dueDate))} على الاستحقاق` : "";
  return `«${title}» ${STATUS[t.status].ar}${due}؛ آخر إجراء: ${last}`;
}

/* headline for a set of topics */
function summaryHeadline(topics) {
  const s = stats(topics);
  if (!s.active) return `أُقفلت جميع المواضيع (${topicsN(s.total)})${s.avgClose !== null ? ` بمتوسط ${dur(s.avgClose)} للموضوع` : ""}`;
  let h = s.active === s.total ? `جميع المواضيع (${topicsN(s.total)}) لا تزال مفتوحة` : `${topicsN(s.active)} من أصل ${s.total} لا تزال مفتوحة`;
  const parts = [];
  if (s.overdue.length === 1) parts.push(`<em>موضوع واحد تجاوز استحقاقه</em> («${esc(clip(s.overdue[0].title, 40))}» بـ ${dur(lateDays(s.overdue[0]))})`);
  else if (s.overdue.length) parts.push(`<em>${topicsN(s.overdue.length)} تجاوزت استحقاقها</em>`);
  if (s.hold === 1) parts.push("وموضوع واحد معلّق");
  else if (s.hold) parts.push(`و${topicsN(s.hold)} معلّقة`);
  if (!parts.length && s.dueSoon.length) parts.push(`و${topicsN(s.dueSoon.length)} يستحق خلال أسبوع`);
  if (!parts.length) parts.push("ولا يوجد أي تأخير عن الاستحقاق");
  return h + "؛ " + parts.join("، ");
}

/* ranked key points for the period */
function keyPoints(topics, max = 5) {
  const s = stats(topics), out = [];
  const lastTxt = t => { const le = lastEvent(t); return le && le.type !== "create" ? clip(le.text, 70) : "لا إجراءات مسجلة"; };
  s.overdue.sort((a, b) => lateDays(b) - lateDays(a)).forEach(t =>
    out.push({ tone: "bad", title: t.title, text: `متأخر ${dur(lateDays(t))} عن الاستحقاق؛ ${lastTxt(t)}.` }));
  topics.filter(t => t.status === "hold").forEach(t =>
    out.push({ tone: "warn", title: t.title, text: `معلّق؛ آخر إجراء قبل ${dur(sinceLast(t))}${t.dueDate && !isOverdue(t) ? `، والاستحقاق بعد ${dur(daysBetween(todayISO(), t.dueDate))}` : ""}.` }));
  s.dueSoon.filter(t => t.status !== "hold").forEach(t =>
    out.push({ tone: "warn", title: t.title, text: `يستحق خلال ${dur(daysBetween(todayISO(), t.dueDate))}؛ ${lastTxt(t)}.` }));
  s.stale.filter(t => !isOverdue(t) && t.status !== "hold").forEach(t =>
    out.push({ tone: "warn", title: t.title, text: `لا تحديث منذ ${dur(sinceLast(t))}.` }));
  if (s.closed) {
    const ok = s.closedOnTime, n = s.closed;
    const tail = n === 1 ? (ok ? "في موعده" : "بعد موعد استحقاقه") : ok === n ? (n === 2 ? "كلاهما في الموعد" : "جميعها في موعدها") : `${ok} منها في موعدها`;
    out.push({ tone: "good", title: "", text: `أُقفل ${topicsN(n)} بمتوسط ${dur(s.avgClose)}، ${tail}.` });
  }
  return out.slice(0, max);
}

const decisionsOf = topics => topics.filter(t => t.status !== "closed" && (t.decision || "").trim()).map(t => ({ t, text: t.decision.trim() }));

/* time scale for Gantt-like views; x() returns % from the right (RTL) */
function timeScale(dates, padRatio = 0.02) {
  dates = dates.filter(Boolean).sort();
  let lo = toUTC(dates[0]), hi = toUTC(dates[dates.length - 1]);
  const span = Math.max(7, (hi - lo) / DAY_MS);
  const pad = Math.max(1, Math.round(span * padRatio)) * DAY_MS;
  lo -= pad; hi += pad + DAY_MS;
  const W = hi - lo;
  const x = d => ((typeof d === "number" ? d : toUTC(d)) - lo) / W * 100;
  // pick tick unit
  const days = W / DAY_MS;
  const ticks = [];
  const d0 = new Date(lo);
  if (days <= 70) {
    for (let t = lo - ((d0.getUTCDay() + 1) % 7) * DAY_MS; t <= hi; t += 7 * DAY_MS) {
      if (t < lo) continue;
      const d = new Date(t);
      ticks.push({ t, label: `${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]}` });
    }
  } else {
    const step = days <= 400 ? 1 : days <= 1100 ? 3 : 12;
    let y = d0.getUTCFullYear(), m = d0.getUTCMonth() + 1;
    m = Math.ceil(m / step) * step;
    for (let t = Date.UTC(y, m, 1); t <= hi; ) {
      const d = new Date(t);
      ticks.push({ t, label: step === 12 ? String(d.getUTCFullYear()) : AR_MONTHS[d.getUTCMonth()] + (d.getUTCMonth() === 0 || !ticks.length ? ` ${d.getUTCFullYear()}` : "") });
      t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + step, 1);
    }
  }
  return { lo, hi, x, ticks, days };
}

/* calendar buckets (months / quarters / years) between two ISO dates */
function monthBuckets(fromISO, toISO, maxCols = 8) {
  const a = new Date(toUTC(fromISO)), b = new Date(toUTC(toISO));
  const months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth() + 1;
  const step = months <= maxCols ? 1 : months <= maxCols * 3 ? 3 : 12;
  const out = [];
  let y = a.getUTCFullYear(), m = Math.floor(a.getUTCMonth() / step) * step;
  while (Date.UTC(y, m, 1) <= b.getTime()) {
    const s = Date.UTC(y, m, 1), e = Date.UTC(y, m + step, 1);
    const d = new Date(s);
    const label = step === 1 ? AR_MONTHS[d.getUTCMonth()] : step === 3 ? `الربع ${Math.floor(d.getUTCMonth() / 3) + 1}<br>${d.getUTCFullYear()}` : String(d.getUTCFullYear());
    out.push({ s, e, label, year: d.getUTCFullYear() });
    m += step; if (m >= 12) { y += Math.floor(m / 12); m %= 12; }
  }
  return out;
}

/* ---------------- icons ---------------- */
const ICONS = {
  create:   '<path d="M12 5v14M5 12h14"/>',
  update:   '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/>',
  followup: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  meeting:  '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.2c2.6.3 4.5 2.6 4.5 5.8"/>',
  visit:    '<path d="M9 4h6v3H9z"/><path d="M9 5H6v16h12V5h-3"/><path d="m9 14 2 2 4-4"/>',
  letter:   '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
  email:    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/>',
  phone:    '<path d="M21 16.4v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 3.1 3.7 2 2 0 0 1 5.1 1.5h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L9 9.3a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  other:    '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  action:   '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  decision: '<path d="M9 3h6v5l2 3H7l2-3z"/><path d="M5 14h14v3.5H5z"/><path d="M7 21h10"/>',
  status:   '<path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="m17 20 4-4-4-4"/><path d="M21 16H7"/>',
  close:    '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  reopen:   '<path d="M4 12a8 8 0 1 0 2.34-5.66"/><path d="M4 4v5h5"/>',
  clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert:    '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  pause:    '<path d="M9 5v14M15 5v14"/>',
  list:     '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  trend:    '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  doc:      '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
};
const icon = (k, size = 14, color = "#fff", sw = 2.2) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.update}</svg>`;

function h(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
/* a block that opens a new page using a given page shell */
function onNewPage(el, page) { el.dataset.newpage = "1"; el._page = page; return el; }

/* =====================================================================
   Pager: fills fixed-height page bodies with blocks
   block attributes:
     data-newpage   start on a fresh page (el._page = shell options)
     data-keep      keep with the following block (headings)
     data-cont      text for a "continued" label when the block opens a page
     data-split     splittable: rows in .split-body move to the next page,
                    .split-head is repeated, [data-first-only] is dropped
   ===================================================================== */
class Pager {
  constructor(stage, ctx, tpl) { Object.assign(this, { stage, ctx, tpl, pages: [], body: null, cur: { kind: "std" } }); }

  page(first = true) {
    const pg = h(`<div class="pg t-${this.tpl.key}"></div>`);
    pg.style.cssText = this.tpl.vars(this.ctx);
    pg.innerHTML = this.tpl.shell(this.ctx, this.cur, first);
    this.body = pg.querySelector(".pg-body");
    const wrap = h(`<div class="pg-wrap"><div class="pg-scale"></div></div>`);
    wrap.firstElementChild.appendChild(pg);
    this.stage.appendChild(wrap);
    this.pages.push(pg);
    return pg;
  }

  fits() { return this.body.scrollHeight <= this.body.clientHeight + 1; }
  alone(block) { return [...this.body.children].every(c => c === block || c.classList.contains("cont") || c.dataset.keep); }
  cont(text) { return h(`<div class="cont">تابع: ${esc(text)}</div>`); }

  add(block) {
    if (!this.body || block.dataset.newpage) {
      if (block._page) this.cur = block._page;
      this.page(true);
    }
    this.body.appendChild(block);
    if (this.fits()) return;
    if (block.hasAttribute("data-split") && this.split(block)) return;
    block.remove();
    if (this.alone(block)) { this.body.appendChild(block); return; }   // oversized: keep (clipped)

    const kids = [...this.body.children];
    let k = kids.length;
    while (k > 0 && kids[k - 1].dataset.keep) k--;
    let carry = kids.slice(k);
    if (k === 0 || (k === 1 && kids[0].classList.contains("cont"))) carry = [];
    carry.forEach(c => c.remove());

    this.page(false);
    const first = carry[0] || block;
    if (first.dataset.cont) this.body.appendChild(this.cont(first.dataset.cont));
    carry.forEach(c => this.body.appendChild(c));
    this.body.appendChild(block);
    if (this.fits()) return;
    if (block.hasAttribute("data-split")) this.split(block);
  }

  split(block) {
    const body = block.querySelector(".split-body");
    const MIN = 2;                                       // never leave fewer rows than this on either page
    if (body.children.length < 2 * MIN && !this.alone(block)) return false;   // short table: move it whole
    const rest = [];
    while (!this.fits() && body.children.length > 1) {
      const r = body.lastElementChild; r.remove(); rest.unshift(r);
    }
    while (rest.length && rest.length < MIN && body.children.length > MIN) {    // avoid an orphan row
      const r = body.lastElementChild; r.remove(); rest.unshift(r);
    }
    if ((!this.fits() || body.children.length < MIN) && !this.alone(block)) {
      body.append(...rest);
      block.remove();
      return false;
    }
    if (!rest.length) return true;
    const next = block.cloneNode(true);
    next.removeAttribute("data-newpage");
    next.querySelectorAll("[data-first-only]").forEach(e => e.remove());
    next.classList.add("is-cont");
    next.querySelector(".split-body").replaceChildren(...rest);
    this.page(false);
    if (next.dataset.cont) this.body.appendChild(this.cont(next.dataset.cont));
    this.body.appendChild(next);
    if (!this.fits()) this.split(next);
    return true;
  }
}

/* =====================================================================
   Settings
   ===================================================================== */
const DEFAULT_SETTINGS = {
  org: "هيئة الرقابة النووية والإشعاعية", dept: "", headTitle: "تقرير متابعة", reportTitle: "تقرير متابعة المواضيع", preparedBy: "", period: "",
  classification: "داخلي", footer: "", logo: "", docNo: "",
  sigPrep: "", sigReview: "", sigApprove: "",
  customColors: false, primary: "#066d39", accent: "#cda053",
};
const THEMES = [
  ["ألوان الهيئة", "#066d39", "#cda053"],
  ["الهيئة (أخضر وأزرق)", "#066d39", "#1b9bd7"],
  ["أخضر وذهبي", "#0e4d3a", "#a8853a"],
  ["كحلي وأزرق", "#0b1f3a", "#2251ff"],
  ["كحلي وذهبي", "#1f3a5f", "#b8913a"],
  ["عنابي", "#6d1f37", "#c19a5b"],
  ["فيروزي", "#0f5e63", "#e09a3b"],
  ["فحمي", "#2b2f36", "#c9a227"],
];
const rs = () => ({ ...DEFAULT_SETTINGS, ...(db.settings || {}) });

/* =====================================================================
   Report dialog / build / preview / export
   ===================================================================== */
const RP = { topics: null, single: false, opts: null, ctx: null, pages: [] };
const OPTS_KEY = "topicTracker.reportOpts.v2";

function loadOpts() {
  let o = {};
  try { o = JSON.parse(localStorage.getItem(OPTS_KEY) || "{}"); } catch (e) { /* ignore */ }
  return { tpl: TPL[o.tpl] ? o.tpl : "formal", summary: o.summary !== false, details: o.details !== false, signatures: o.signatures !== false };
}

function openReportDialog(topics) {
  RP.single = !!topics;
  RP.topics = topics || filteredTopics();
  if (!RP.topics.length) { alert("لا توجد مواضيع ضمن التصفية الحالية."); return; }
  const o = loadOpts(), f = $("#reportForm");
  $("#reportFormTitle").textContent = RP.single ? `تقرير PDF للموضوع ${RP.topics[0].ref}` : "إعداد تقرير PDF";
  $("#reportScope").textContent = RP.single ? RP.topics[0].title : `النطاق: ${scopeLabel()} (${topicsN(RP.topics.length)})`;
  $("#tplList").innerHTML = Object.values(TPL).map(t => `<label class="tpl-card">
      <input type="radio" name="tpl" value="${t.key}" ${t.key === o.tpl ? "checked" : ""}>
      <span class="tpl-sw">${t.swatch}</span><span class="tpl-tx"><b>${t.name}</b><small>${t.desc}</small></span></label>`).join("");
  f.summary.checked = o.summary; f.details.checked = o.details; f.signatures.checked = o.signatures;
  $("#optSummary").classList.toggle("hidden", RP.single);
  $("#dlgReport").showModal();
}

$("#reportForm").addEventListener("submit", ev => {
  if (ev.submitter?.value !== "ok") return;
  const f = ev.target;
  const o = { tpl: f.tpl.value, summary: f.summary.checked, details: f.details.checked, signatures: f.signatures.checked };
  if (!RP.single && !o.summary && !o.details) { ev.preventDefault(); alert("اختر محتوى واحداً على الأقل."); return; }
  try { localStorage.setItem(OPTS_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ }
  RP.opts = o;
  showPreview();
});

async function showPreview() {
  $("#rpOverlay").classList.add("show");
  document.body.style.overflow = "hidden";
  setBusy(true, "جاري تجهيز الصفحات…");
  await Promise.all(["400 12px 'Plex Arabic'", "700 12px 'Plex Arabic'", "700 12px Naskh", "400 12px Naskh", "800 12px Tajawal", "700 12px Tajawal"].map(f => document.fonts.load(f)));
  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(r));
  try {
    buildReport();
    setBusy(false, `${RP.pages.length} صفحة · ${TPL[RP.opts.tpl].name}`);
  } catch (e) {
    console.error(e);
    setBusy(false, "تعذر إنشاء التقرير: " + e.message);
  }
}

function buildReport() {
  const S = rs(), tpl = TPL[RP.opts.tpl], topics = RP.topics, single = RP.single;
  const ctx = {
    S, single, opts: RP.opts, topics,
    logo: logoSrc(S),
    logoWide: !S.logo && window.BRAND ? BRAND.wide : "",
    title: single ? `بيان متابعة موضوع ${topics[0].ref}` : S.reportTitle,
    period: S.period || `حتى ${fmtLong(todayISO())}`,
  };
  RP.ctx = ctx;
  const stage = $("#rpStage");
  stage.replaceChildren();
  $("#rpTitle").textContent = single ? `معاينة تقرير ${topics[0].ref}` : "معاينة التقرير";
  const P = new Pager(stage, ctx, tpl);

  const blocks = [];
  if (!single && RP.opts.summary) blocks.push(...tpl.summary(ctx, topics));
  if (single || RP.opts.details) topics.forEach((t, i) => blocks.push(...tpl.topic(ctx, t, i)));
  if (tpl.closing) blocks.push(...tpl.closing(ctx));
  blocks.forEach(b => P.add(b));
  if (!P.pages.length) P.page();

  RP.pages = P.pages;
  P.pages.forEach((pg, i) => {
    pg.querySelectorAll(".pg-n").forEach(n => n.textContent = i + 1);
    pg.querySelectorAll(".pg-t").forEach(n => n.textContent = P.pages.length);
  });
  fitPreview();
}

function fitPreview() {
  const stage = $("#rpStage");
  if (!RP.pages.length) return;
  const s = Math.min(1, (stage.clientWidth - 24) / PG_W);
  stage.querySelectorAll(".pg-wrap").forEach(w => {
    w.style.width = PG_W * s + "px"; w.style.height = PG_H * s + "px";
    w.firstElementChild.style.transform = `scale(${s})`;
  });
}
window.addEventListener("resize", () => { if ($("#rpOverlay").classList.contains("show")) fitPreview(); });

function setBusy(busy, msg) {
  $("#rpProg").textContent = msg || "";
  ["#rpDownload", "#rpPrint", "#rpEdit"].forEach(s => $(s).disabled = busy);
}

function closePreview() {
  $("#rpOverlay").classList.remove("show");
  $("#rpStage").replaceChildren();
  document.body.style.overflow = "";
}

function reportFileName() {
  // Latin file names: some browsers drop non-Latin download names (file saved as "download" without extension)
  return RP.single ? `Topic-${RP.topics[0].ref}-Report-${todayISO()}` : `Topics-Report-${todayISO()}`;
}

/* vector PDF through the browser's print dialog ("Save as PDF") */
function printPages() {
  const old = document.title;
  document.title = reportFileName();
  window.addEventListener("afterprint", () => { document.title = old; }, { once: true });
  window.print();
}

/* one-click image PDF */
async function downloadImagePdf() {
  if (typeof htmlToImage === "undefined" || !window.jspdf) { alert("مكتبات PDF غير محمّلة (مجلد lib)."); return; }
  const S = RP.ctx.S;
  const pdf = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  setBusy(true);
  try {
    for (let i = 0; i < RP.pages.length; i++) {
      $("#rpProg").textContent = `جاري إنشاء ملف PDF… صفحة ${i + 1} من ${RP.pages.length}`;
      const url = await htmlToImage.toJpeg(RP.pages[i], { pixelRatio: 2.2, quality: 0.92, backgroundColor: "#ffffff", fontEmbedCSS: window.EMBEDDED_FONT_CSS || "" });
      if (i) pdf.addPage("a4", "landscape");
      pdf.addImage(url, "JPEG", 0, 0, 297, 210, undefined, "FAST");
    }
    pdf.setProperties({ title: RP.ctx.title, subject: RP.ctx.title, author: S.preparedBy || S.org || "", creator: "نظام متابعة المواضيع" });
    download(pdf.output("blob"), reportFileName() + ".pdf");
    setBusy(false, "تم تنزيل ملف PDF ✓");
  } catch (e) {
    console.error(e);
    setBusy(false, "تعذر إنشاء الملف – استخدم «حفظ PDF».");
  }
}

$("#btnPdf").onclick = () => openReportDialog();
$("#rpClose").onclick = closePreview;
$("#rpPrint").onclick = printPages;
$("#rpDownload").onclick = downloadImagePdf;
$("#rpEdit").onclick = () => { closePreview(); openReportDialog(RP.single ? RP.topics : null); };
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#rpOverlay").classList.contains("show") && !document.querySelector("dialog[open]")) closePreview(); });

/* =====================================================================
   Branding settings dialog
   ===================================================================== */
const SETTING_KEYS = ["org", "dept", "headTitle", "reportTitle", "period", "preparedBy", "classification", "footer", "docNo", "sigPrep", "sigReview", "sigApprove", "primary", "accent"];
let pendingLogo = "";

function openSettingsDialog() {
  const S = rs(), f = $("#settingsForm");
  SETTING_KEYS.forEach(k => f[k].value = S[k]);
  f.customColors.checked = !!S.customColors;
  pendingLogo = S.logo;
  renderLogoPrev();
  $("#themeList").innerHTML = THEMES.map(([n, p, a]) =>
    `<button type="button" data-p="${p}" data-a="${a}"><i style="background:${p}"></i><i style="background:${a}"></i>${n}</button>`).join("");
  syncColorFields();
  $("#dlgSettings").showModal();
}
function syncColorFields() { $("#colorFields").classList.toggle("dim", !$("#settingsForm").customColors.checked); }
function renderLogoPrev() {
  const src = logoSrc({ logo: pendingLogo });
  $("#logoPrev").innerHTML = src ? `<img src="${src}" alt="">` : "لا يوجد";
  $("#logoNote").textContent = !pendingLogo ? "الشعار الرسمي للهيئة" : pendingLogo === "none" ? "بدون شعار" : "شعار مخصص";
}

$("#settingsForm").customColors.addEventListener("change", syncColorFields);
$("#themeList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const f = $("#settingsForm"); f.primary.value = b.dataset.p; f.accent.value = b.dataset.a; f.customColors.checked = true; syncColorFields();
});
$("#btnLogo").onclick = () => $("#fileLogo").click();
$("#btnLogoDel").onclick = () => { pendingLogo = "none"; renderLogoPrev(); };
$("#btnLogoDef").onclick = () => { pendingLogo = ""; renderLogoPrev(); };
$("#fileLogo").onchange = e => {
  const file = e.target.files[0]; e.target.value = "";
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    const img = new Image();
    img.onload = () => {
      // downscale to keep browser storage small; PNG keeps transparency
      const k = Math.min(1, 480 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      pendingLogo = c.toDataURL("image/png");
      renderLogoPrev();
      suggestColorsFromLogo(c);
    };
    img.onerror = () => alert("تعذر قراءة الصورة.");
    img.src = rd.result;
  };
  rd.readAsDataURL(file);
};

/* pick the two most common saturated colours of the logo as report colours */
function suggestColorsFromLogo(canvas) {
  const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
  const bins = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128) continue;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn < 40 || mx < 40 || mn > 225) continue;          // skip grey, black, white
    const k = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4);
    const e = bins.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b; bins.set(k, e);
  }
  const cols = [...bins.values()].sort((a, b) => b.n - a.n).map(e => [e.r / e.n, e.g / e.n, e.b / e.n]);
  if (!cols.length) return;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const lum = c => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
  const hex = c => "#" + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  // primary carries white text: darken it until it is dark enough
  const darken = c => { let d = c.slice(); while (lum(d) > 0.42) d = d.map(v => v * 0.88); return d; };
  const a = cols[0], b = cols.find(c => dist(c, a) > 60) || cols[0].map(v => v * 0.6 + 100);
  const [p, s] = lum(a) <= lum(b) ? [a, b] : [b, a];
  const f = $("#settingsForm");
  f.primary.value = hex(darken(p)); f.accent.value = hex(s);
  f.customColors.checked = true; syncColorFields();
  toast("تم اقتراح ألوان التقرير من الشعار – يمكنك تعديلها");
}

$("#settingsForm").addEventListener("submit", ev => {
  if (ev.submitter?.value !== "ok") return;
  const f = ev.target;
  db.settings = Object.fromEntries(SETTING_KEYS.map(k => [k, f[k].value.trim()]));
  if (!db.settings.reportTitle) db.settings.reportTitle = DEFAULT_SETTINGS.reportTitle;
  db.settings.customColors = f.customColors.checked;
  db.settings.logo = pendingLogo;
  save();
  renderHeader();
  toast("تم حفظ هوية التقرير");
  if ($("#rpOverlay").classList.contains("show")) showPreview();
});

$("#btnSettings").onclick = openSettingsDialog;
$("#btnReportSettings").onclick = openSettingsDialog;
