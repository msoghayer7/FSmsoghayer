"use strict";
/* =====================================================================
   Report engine
   - builds fixed-size A4 pages (cover, contents, dashboard, table,
     Gantt, horizontal and vertical timelines) in the preview overlay
   - paginates content blocks automatically (tables / Gantt rows split
     across pages, headings stay with what follows, "continued" labels)
   - downloads the PDF directly (each page rasterised with html-to-image
     and placed in a jsPDF document) or prints the same pages.
   Relies on the globals defined in index.html (db, STATUS, EVT, ...).
   ===================================================================== */

const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const fmtLong = iso => { if (!iso) return "—"; const [y, m, d] = iso.split("-").map(Number); return `${d} ${AR_MONTHS[m - 1]} ${y}`; };
const clip = (s, n) => { s = String(s ?? ""); return s.length > n ? s.slice(0, n).trim() + "…" : s; };
const DAY_MS = 86400000;

const DEFAULT_SETTINGS = {
  org: "", dept: "", reportTitle: "تقرير متابعة المواضيع", preparedBy: "",
  classification: "داخلي", footer: "", logo: "", primary: "#1f4e79", accent: "#c9a227",
};
const THEMES = [
  ["كحلي وذهبي", "#1f4e79", "#c9a227"],
  ["أخضر", "#0b6b3a", "#c9a227"],
  ["عنابي", "#7a1f3d", "#d4a373"],
  ["فيروزي", "#0f6e74", "#f2a541"],
  ["فحمي", "#2f3542", "#e1b12c"],
  ["بنفسجي", "#4c2a85", "#2bb3a3"],
];
const rs = () => ({ ...DEFAULT_SETTINGS, ...(db.settings || {}) });

const SECTION_DEFS = {
  cover: ["صفحة الغلاف", "الشعار واسم الجهة وعنوان التقرير وأرقام سريعة"],
  toc:   ["المحتويات", "فهرس بأرقام الصفحات"],
  dash:  ["اللوحة التنفيذية", "مؤشرات، توزيع الحالات والتصنيفات، النشاط، المتأخرات وأحدث المستجدات"],
  table: ["جدول ملخص المواضيع", "صف لكل موضوع مع آخر مستجد"],
  gantt: ["المخطط الزمني الشامل (Gantt)", "كل المواضيع على محور زمني واحد مع الأحداث والاستحقاق واليوم"],
  htl:   ["الخط الزمني الأفقي", "لكل موضوع: بطاقات الأحداث على خط زمني أفقي"],
  vtl:   ["الخط الزمني التفصيلي", "لكل موضوع: كل الأحداث بالتفصيل مجمّعة حسب الشهر"],
};
const MULTI_KEYS = ["cover", "toc", "dash", "table", "gantt", "htl", "vtl"];
const SINGLE_KEYS = ["cover", "htl", "vtl"];
const OPTS_KEY = "topicTracker.reportOpts";

/* ---------- icons (24px stroke icons, drawn white on coloured discs) ---------- */
const ICONS = {
  create:   '<path d="M12 5v14"/><path d="M5 12h14"/>',
  update:   '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/>',
  followup: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  meeting:  '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.2c2.6.3 4.5 2.6 4.5 5.8"/>',
  letter:   '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/>',
  action:   '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  decision: '<path d="M9 3h6v5l2 3H7l2-3z"/><path d="M5 14h14v3.5H5z"/><path d="M7 21h10"/>',
  status:   '<path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="m17 20 4-4-4-4"/><path d="M21 16H7"/>',
  close:    '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  reopen:   '<path d="M4 12a8 8 0 1 0 2.34-5.66"/><path d="M4 4v5h5"/>',
  today:    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  doc:      '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
};
const icon = (k, size = 14, color = "#fff", sw = 2.4) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.update}</svg>`;
const evMeta = type => type === "today" ? { ar: "الوضع الحالي", color: "#64748b" } : EVT[type];

function h(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/* events of a topic + a trailing "current status" marker for topics still open */
function eventsWithToday(t) {
  const evs = sortedEvents(t);
  if (t.status === "closed") return evs;
  let txt = `مفتوح منذ ${ageDays(t)} يوم`;
  if (t.dueDate) {
    const d = daysBetween(todayISO(), t.dueDate);
    txt += d < 0 ? ` – متأخر ${-d} يوم عن الاستحقاق` : ` – متبقٍ ${d} يوم على الاستحقاق`;
  }
  return [...evs, { id: "today", type: "today", date: todayISO(), text: `${txt} (الحالة: ${STATUS[t.status].ar})`, by: "" }];
}

/* =====================================================================
   Pager: fills fixed-height page bodies with blocks
   block attributes:
     data-newpage  start on a fresh page
     data-keep     keep with the following block (headings)
     data-cont     text for a "continued" label when the block opens a page
     data-split    splittable: rows in .split-body move to the next page,
                   .split-head is repeated
   ===================================================================== */
class Pager {
  constructor(stage, ctx) { this.stage = stage; this.ctx = ctx; this.pages = []; this.body = null; }

  page(kind = "std") {
    const { S, orient } = this.ctx;
    const pg = h(`<div class="pg ${orient}" style="--p:${S.primary};--a:${S.accent}"></div>`);
    if (kind === "std") {
      pg.innerHTML = `<div class="pg-stripe"></div>${this.headHTML()}<div class="pg-body"></div>${this.footHTML()}`;
      this.body = pg.querySelector(".pg-body");
    } else {
      this.body = null;
    }
    const wrap = h(`<div class="pg-wrap"><div class="pg-scale"></div></div>`);
    wrap.firstElementChild.appendChild(pg);
    this.stage.appendChild(wrap);
    this.pages.push(pg);
    return pg;
  }

  headHTML() {
    const { S, title } = this.ctx;
    const logo = S.logo ? `<img class="logo" src="${S.logo}" alt="">` : `<div class="logo-ph">${icon("doc", 18)}</div>`;
    return `<div class="pg-head">${logo}
      <div class="org"><b>${esc(S.org || "نظام متابعة المواضيع")}</b><span>${esc(S.dept)}</span></div>
      <div class="rt"><b>${esc(title)}</b><span>${fmtLong(todayISO())}</span></div></div>`;
  }

  footHTML() {
    const { S } = this.ctx;
    const note = S.footer || (S.preparedBy ? "إعداد: " + S.preparedBy : "");
    return `<div class="pg-foot">${S.classification ? `<span class="cls">${esc(S.classification)}</span>` : ""}
      <span>${esc(note)}</span><span class="num"></span></div>`;
  }

  fits() { return this.body.scrollHeight <= this.body.clientHeight + 1; }

  // page holds nothing but labels/headings that would travel with the block anyway
  alone(block) { return [...this.body.children].every(c => c === block || c.classList.contains("cont") || c.dataset.keep); }

  cont(text) { return h(`<div class="cont">تابع: ${esc(text)}</div>`); }

  add(block) {
    if (!this.body || (block.dataset.newpage && this.body.children.length)) this.page();
    this.body.appendChild(block);
    if (this.fits()) return;
    if (block.hasAttribute("data-split") && this.split(block)) return;
    block.remove();
    if (this.alone(block)) { this.body.appendChild(block); return; }   // oversized: keep (clipped)

    // move trailing "keep with next" blocks along to the new page
    const kids = [...this.body.children];
    let k = kids.length;
    while (k > 0 && kids[k - 1].dataset.keep) k--;
    let carry = kids.slice(k);
    if (k === 0 || (k === 1 && kids[0].classList.contains("cont"))) carry = [];
    carry.forEach(c => c.remove());

    this.page();
    const first = carry[0] || block;
    if (first.dataset.cont && !first.dataset.newpage) this.body.appendChild(this.cont(first.dataset.cont));
    carry.forEach(c => this.body.appendChild(c));
    this.body.appendChild(block);
    if (this.fits()) return;
    if (block.hasAttribute("data-split")) this.split(block);
  }

  split(block) {
    const body = block.querySelector(".split-body");
    const rest = [];
    while (!this.fits() && body.children.length > 1) {
      const r = body.lastElementChild; r.remove(); rest.unshift(r);
    }
    if (!this.fits() && !this.alone(block)) {            // not even one row fits here
      body.append(...rest);
      block.remove();
      return false;
    }
    if (!rest.length) return true;
    const next = block.cloneNode(true);
    next.removeAttribute("data-newpage");
    next.querySelector(".split-body").replaceChildren(...rest);
    this.page();
    if (next.dataset.cont) this.body.appendChild(this.cont(next.dataset.cont));
    this.body.appendChild(next);
    if (!this.fits()) this.split(next);
    return true;
  }
}

/* =====================================================================
   Section builders – each returns an array of blocks
   ===================================================================== */
function secHead(ctx, key, title, sub) {
  ctx.secNo += 1;
  ctx.sections.push({ key, title, n: ctx.secNo });
  return h(`<div class="sec-h" data-keep="1" data-newpage="1" data-section="${key}">
    <span class="n">${pad(ctx.secNo)}</span><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div></div>`);
}

const statusPill = t => `<span class="pill" style="background:${STATUS[t.status].color}">${STATUS[t.status].ar}</span>`;
const overduePill = t => isOverdue(t) ? `<span class="pill" style="background:#dc2626">متأخر ${daysBetween(t.dueDate, todayISO())} يوم</span>` : "";

/* ---------- cover ---------- */
function coverPage(P, ctx, topics) {
  const { S, single } = ctx;
  const pg = P.page("cover");
  const evCount = topics.reduce((a, t) => a + t.events.length, 0);
  const from = topics.map(t => t.openDate).sort()[0];
  const closed = topics.filter(t => t.status === "closed").length;
  const t0 = topics[0];
  const logo = S.logo ? `<img src="${S.logo}" alt="">` : icon("doc", 80, S.primary, 1.6);
  const deco = `<svg class="cv-deco" viewBox="0 0 400 600" preserveAspectRatio="xMinYMax slice">
    ${[150, 210, 270, 330].map((r, i) => `<circle cx="0" cy="600" r="${r}" fill="none" stroke="${S.accent}" stroke-opacity="${0.55 - i * 0.12}" stroke-width="${i ? 1.5 : 3}"/>`).join("")}
    <circle cx="400" cy="0" r="120" fill="#fff" fill-opacity=".05"/><circle cx="400" cy="0" r="70" fill="#fff" fill-opacity=".05"/></svg>`;
  const stats = single
    ? [[t0.events.length, "حدث مسجّل"], [ageDays(t0), "يوم من الفتح"], [STATUS[t0.status].ar, "الحالة"]]
    : [[topics.length, "موضوع"], [topics.length - closed, "قيد المتابعة"], [closed, "مقفل"], [evCount, "حدث مسجّل"]];
  pg.innerHTML = `<div class="cover">
    <div class="cv-side">${deco}
      <div class="cv-logo">${logo}</div>
      <div class="cv-org">${esc(S.org || "نظام متابعة المواضيع")}</div>
      ${S.dept ? `<div class="cv-dept">${esc(S.dept)}</div>` : ""}
    </div>
    <div class="cv-main">
      ${S.classification ? `<div class="cv-cls">${esc(S.classification)}</div>` : ""}
      <div class="cv-kicker">${single ? "تقرير متابعة موضوع" : "تقرير دوري"}</div>
      <div class="cv-title">${esc(single ? t0.title : S.reportTitle)}</div>
      <div class="cv-sub">${single ? `${esc(t0.ref)} · ${esc(t0.category || "بدون تصنيف")}` : "النطاق: " + esc(scopeLabel())}</div>
      <div class="cv-rule"></div>
      <div class="cv-meta">
        <div><span>تاريخ الإصدار</span><b>${fmtLong(todayISO())}</b></div>
        <div><span>الفترة المغطاة</span><b>${fmt(from)} – ${fmt(todayISO())}</b></div>
        ${S.preparedBy ? `<div><span>إعداد</span><b>${esc(S.preparedBy)}</b></div>` : ""}
        ${single && t0.owner ? `<div><span>المسؤول عن المتابعة</span><b>${esc(t0.owner)}</b></div>` : ""}
      </div>
      <div class="cv-stats">${stats.map(([v, l]) => `<div><b>${esc(v)}</b><span>${l}</span></div>`).join("")}</div>
      <div class="cv-foot"><span>${esc(S.footer || S.reportTitle)}</span><span>${fmt(todayISO())}</span></div>
    </div></div>`;
}

/* ---------- contents ---------- */
function tocBlocks(ctx) {
  ctx.tocEl = h(`<div class="toc"></div>`);
  return [h(`<div class="sec-h" data-keep="1"><span class="n">${icon("doc", 20)}</span><div><h2>المحتويات</h2></div></div>`), ctx.tocEl];
}

function fillToc(ctx, pages) {
  if (!ctx.tocEl) return;
  const pageOf = el => pages.findIndex(pg => pg.contains(el)) + 1;
  let html = "";
  ctx.sections.forEach(s => {
    const el = document.querySelector(`#rpStage [data-section="${s.key}"]`);
    html += `<div class="toc-row"><span class="n">${pad(s.n)}</span><span class="tt">${esc(s.title)}</span><span class="dots"></span><span class="pn">${el ? pageOf(el) : ""}</span></div>`;
    if (s.key === ctx.topicIndexSection) {
      const cards = [...document.querySelectorAll(`#rpStage [data-topic-of="${s.key}"]`)];
      if (cards.length <= 28) cards.forEach(c => {
        html += `<div class="toc-sub"><span>${esc(c.dataset.topicLabel)}</span><span class="dots"></span><span>${pageOf(c)}</span></div>`;
      });
    }
  });
  ctx.tocEl.innerHTML = html;
}

/* ---------- executive dashboard ---------- */
function dashBlocks(ctx, topics) {
  const today = todayISO();
  const total = topics.length;
  const by = { open: 0, progress: 0, hold: 0, closed: 0 };
  topics.forEach(t => by[t.status]++);
  const active = total - by.closed;
  const overdue = topics.filter(isOverdue);
  const closedDur = topics.filter(t => t.status === "closed").map(ageDays);
  const avg = closedDur.length ? Math.round(closedDur.reduce((a, b) => a + b, 0) / closedDur.length) : null;
  const pct = total ? Math.round(by.closed / total * 100) : 0;
  const evCount = topics.reduce((a, t) => a + t.events.length, 0);
  const stale = topics.filter(t => t.status !== "closed")
    .map(t => ({ t, d: daysBetween(lastEvent(t).date, today) }))
    .filter(x => x.d > 14).sort((a, b) => b.d - a.d);

  const kpi = (v, l, s, c) => `<div class="kpi" style="--kc:${c}"><div class="v" style="color:${c}">${v}</div><div class="l">${l}</div><div class="s">${s}</div></div>`;
  const kpis = h(`<div class="kpis">
    ${kpi(total, "إجمالي المواضيع", `${evCount} حدثاً مسجّلاً`, "var(--p)")}
    ${kpi(active, "قيد المتابعة", `${by.open} مفتوح · ${by.progress} قيد الإجراء · ${by.hold} معلّق`, STATUS.progress.color)}
    ${kpi(by.closed, "مقفلة", `نسبة الإنجاز ${pct}%`, STATUS.closed.color)}
    ${kpi(overdue.length, "متأخرة عن الاستحقاق", overdue.length ? "تتطلب تدخلاً" : "لا يوجد تأخير", "#dc2626")}
    ${kpi(avg === null ? "—" : `${avg} <small>يوم</small>`, "متوسط مدة الإقفال", closedDur.length ? `محسوب من ${closedDur.length} موضوع مقفل` : "لا توجد مواضيع مقفلة", "var(--ink2)")}
    ${kpi(stale.length, "بدون تحديث +14 يوماً", stale.length ? "بحاجة لمتابعة" : "كل المواضيع محدّثة", "#b45309")}
  </div>`);

  /* donut by status */
  const R = 50, SW = 20, C = 2 * Math.PI * R, GAP = 2;
  const parts = Object.keys(STATUS).filter(k => by[k]);
  let off = 0;
  const arcs = parts.map(k => {
    const len = C * by[k] / total;
    const seg = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${STATUS[k].color}" stroke-width="${SW}"
      stroke-dasharray="${Math.max(0.1, len - (parts.length > 1 ? GAP : 0))} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`;
    off += len;
    return seg;
  }).join("");
  const donut = `<div class="card"><h4>توزيع المواضيع حسب الحالة</h4><div class="donut-wrap">
    <svg width="140" height="140" viewBox="0 0 140 140">${arcs}
      <text x="70" y="70" text-anchor="middle" font-family="Plex Arabic" font-size="26" font-weight="700" fill="#1d2433">${total}</text>
      <text x="70" y="90" text-anchor="middle" font-family="Plex Arabic" font-size="11" fill="#667085">موضوع</text></svg>
    <div class="donut-lg">${Object.keys(STATUS).map(k => `<div><i style="background:${STATUS[k].color}"></i>${STATUS[k].ar}<b>${by[k]}</b><em>${total ? Math.round(by[k] / total * 100) : 0}%</em></div>`).join("")}</div>
  </div></div>`;

  /* stacked bars by category */
  const cats = new Map();
  topics.forEach(t => {
    const k = t.category || "بدون تصنيف";
    if (!cats.has(k)) cats.set(k, { open: 0, progress: 0, hold: 0, closed: 0, n: 0 });
    const c = cats.get(k); c[t.status]++; c.n++;
  });
  let catArr = [...cats.entries()].sort((a, b) => b[1].n - a[1].n);
  if (catArr.length > 7) {
    const other = { open: 0, progress: 0, hold: 0, closed: 0, n: 0 };
    catArr.slice(6).forEach(([, c]) => Object.keys(other).forEach(k => other[k] += c[k]));
    catArr = [...catArr.slice(0, 6), ["أخرى", other]];
  }
  const maxN = Math.max(1, ...catArr.map(([, c]) => c.n));
  const bars = `<div class="card"><h4>المواضيع حسب التصنيف<small>مكدّسة حسب الحالة</small></h4><div class="hbars">
    ${catArr.map(([name, c]) => `<div class="hbar"><span class="nm">${esc(name)}</span>
      <div class="tr" style="width:${c.n / maxN * 100}%">${Object.keys(STATUS).filter(k => c[k]).map(k => `<span style="flex:${c[k]};background:${STATUS[k].color}"></span>`).join("")}</div>
      <span class="vv">${c.n}</span></div>`).join("")}
    </div><div class="lg" style="margin-top:8px">${Object.keys(STATUS).map(k => `<span><i style="background:${STATUS[k].color}"></i>${STATUS[k].ar}</span>`).join("")}</div></div>`;

  /* activity over time */
  const dates = topics.flatMap(t => t.events.map(e => e.date)).sort();
  let activity = `<div class="card"><h4>النشاط الزمني</h4><div class="empty-note">لا توجد أحداث.</div></div>`;
  if (dates.length) {
    const span = daysBetween(dates[0], today);
    const monthly = span > 84;
    const key = iso => {
      const t = toUTC(iso), d = new Date(t);
      return monthly ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) : t - ((d.getUTCDay() + 1) % 7) * DAY_MS;
    };
    const step = t => { if (!monthly) return t + 7 * DAY_MS; const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); };
    let buckets = [];
    for (let t = key(dates[0]); t <= key(today); t = step(t)) buckets.push(t);
    if (buckets.length > 18) buckets = buckets.slice(-18);
    const counts = new Map(buckets.map(b => [b, 0]));
    dates.forEach(d => { const k = key(d); if (counts.has(k)) counts.set(k, counts.get(k) + 1); });
    const mx = Math.max(1, ...counts.values());
    const every = buckets.length > 12 ? 2 : 1;
    const lbl = b => { const d = new Date(b); return monthly ? AR_MONTHS[d.getUTCMonth()] : `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`; };
    activity = `<div class="card"><h4>النشاط الزمني<small>عدد الأحداث ${monthly ? "شهرياً" : "أسبوعياً"}</small></h4>
      <div class="cols">${buckets.map(b => { const v = counts.get(b); return `<div class="c">${v ? `<b>${v}</b>` : ""}<i style="height:${v / mx * 100}%;${v ? "" : "min-height:0"}"></i></div>`; }).join("")}</div>
      <div class="cols-x">${buckets.map((b, i) => `<span>${i % every ? "" : lbl(b)}</span>`).join("")}</div></div>`;
  }

  /* lists */
  const late = overdue.map(t => ({ t, d: daysBetween(t.dueDate, today) })).sort((a, b) => b.d - a.d).slice(0, 6);
  const latest = topics.flatMap(t => t.events.filter(e => e.type !== "create").map(e => ({ t, e })))
    .sort((a, b) => b.e.date.localeCompare(a.e.date) || b.e.seq - a.e.seq).slice(0, 6);
  const listCard = (title, items, empty) => `<div class="card"><h4>${title}</h4>${items.length ? items.join("") : `<div class="empty-note">${empty}</div>`}</div>`;
  const lists = h(`<div class="g3">
    ${listCard(`${icon("today", 13, "#dc2626")} المواضيع المتأخرة عن الاستحقاق`, late.map(({ t, d }) =>
      `<div class="li"><span class="ref">${esc(t.ref)}</span><span class="ttl">${esc(clip(t.title, 60))}${t.owner ? ` <span class="d">· ${esc(t.owner)}</span>` : ""}</span><span class="tag" style="color:#dc2626">متأخر ${d} يوم</span></div>`), "لا توجد مواضيع متأخرة.")}
    ${listCard(`${icon("update", 13, "var(--p)")} أحدث المستجدات`, latest.map(({ t, e }) =>
      `<div class="li"><span class="d">${fmt(e.date)}</span><span class="ttl"><span class="ref">${esc(t.ref)}</span> · <b style="color:${EVT[e.type].color}">${EVT[e.type].ar}:</b> ${esc(clip(e.text, 70))}</span></div>`), "لا توجد مستجدات.")}
    ${listCard(`${icon("followup", 13, "#b45309")} بحاجة لمتابعة (بدون تحديث +14 يوماً)`, stale.slice(0, 6).map(({ t, d }) =>
      `<div class="li"><span class="ref">${esc(t.ref)}</span><span class="ttl">${esc(clip(t.title, 60))}</span><span class="tag" style="color:#b45309">منذ ${d} يوم</span></div>`), "كل المواضيع المفتوحة محدّثة.")}
  </div>`);

  return [secHead(ctx, "dash", "اللوحة التنفيذية", `ملخص الوضع كما في ${fmtLong(today)}`),
    kpis, h(`<div class="g3">${donut}${bars}${activity}</div>`), lists];
}

/* ---------- summary table ---------- */
function tableBlocks(ctx, topics) {
  const rows = topics.map(t => {
    const le = lastEvent(t);
    return `<tr><td class="ref">${esc(t.ref)}</td>
      <td><b>${esc(t.title)}</b><span class="sub">${esc(t.category || "")}${t.party ? " · " + esc(t.party) : ""}</span></td>
      <td>${esc(t.owner) || "—"}</td>
      <td>${statusPill(t)}</td>
      <td class="num-t">${fmt(t.openDate)}</td>
      <td class="num-t ${isOverdue(t) ? "late" : ""}">${fmt(t.dueDate)}${isOverdue(t) ? `<span class="sub late">متأخر ${daysBetween(t.dueDate, todayISO())} يوم</span>` : ""}</td>
      <td class="num-t">${fmt(t.closeDate)}</td>
      <td class="num-t">${ageDays(t)}</td>
      <td class="num-t">${t.events.length}</td>
      <td>${le ? `<span class="sub">${fmt(le.date)} · ${EVT[le.type].ar}</span>${esc(clip(le.text, 110))}` : ""}</td></tr>`;
  }).join("");
  return [secHead(ctx, "table", "جدول ملخص المواضيع", `${topics.length} موضوع`),
    h(`<table class="tbl" data-split data-cont="جدول ملخص المواضيع"><thead class="split-head"><tr>
      <th>المرجع</th><th style="width:26%">الموضوع</th><th>المسؤول</th><th>الحالة</th><th>الفتح</th><th>الاستحقاق</th><th>الإقفال</th><th>المدة</th><th>الأحداث</th><th style="width:26%">آخر مستجد</th>
    </tr></thead><tbody class="split-body">${rows}</tbody></table>`)];
}

/* ---------- Gantt ---------- */
function ganttBlocks(ctx, topics) {
  const today = todayISO();
  const all = topics.flatMap(t => [t.openDate, endDate(t), t.dueDate, ...t.events.map(e => e.date)]).filter(Boolean).concat(today).sort();
  const min = all[0], max = all[all.length - 1];
  const span = Math.max(1, daysBetween(min, max));
  const padD = Math.max(2, Math.round(span * 0.03));
  const total = span + 2 * padD;
  const pos = iso => (daysBetween(min, iso) + padD) / total * 100;
  const posT = t => (Math.round((t - toUTC(min)) / DAY_MS) + padD) / total * 100;
  const lo = toUTC(min) - padD * DAY_MS, hi = toUTC(max) + padD * DAY_MS;

  // ticks: months for longer ranges, weeks (from Saturday) otherwise
  const monthly = span > 70;
  const ticks = [], labels = [];
  if (monthly) {
    const d0 = new Date(lo);
    for (let t = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1); t <= hi; ) {
      const d = new Date(t), nxt = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
      if (t >= lo) ticks.push(t);
      const a = Math.max(t, lo), b = Math.min(nxt, hi);
      if ((b - a) / DAY_MS >= 8) {
        const first = !labels.length || d.getUTCMonth() === 0;
        labels.push({ x: (posT(a) + posT(b)) / 2, txt: AR_MONTHS[d.getUTCMonth()] + (first ? ` ${d.getUTCFullYear()}` : ""), yr: first });
      }
      t = nxt;
    }
  } else {
    const d0 = new Date(lo);
    const every = span > 35 ? 2 : 1;
    let i = 0;
    for (let t = lo - ((d0.getUTCDay() + 1) % 7) * DAY_MS; t <= hi; t += 7 * DAY_MS, i++) {
      if (t < lo) continue;
      ticks.push(t);
      const d = new Date(t);
      if (i % every === 0) labels.push({ x: posT(t), txt: `${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]}` });
    }
  }
  const grid = ticks.map(t => `<span class="gt-grid" style="right:${posT(t)}%"></span>`).join("");
  const todayLine = `<span class="gt-today" style="right:${pos(today)}%"></span>`;

  const head = `<div class="gt-row gt-head"><div class="gt-lbl">الموضوع</div><div class="gt-st">الحالة</div>
    <div class="gt-track">${grid}${labels.map(l => `<span class="gt-ax ${l.yr ? "yr" : ""}" style="right:${l.x}%">${l.txt}</span>`).join("")}
    <span class="gt-tlbl" style="right:${pos(today)}%">اليوم</span></div></div>`;

  const rows = topics.map(t => {
    const s = pos(t.openDate), e = pos(endDate(t));
    const col = STATUS[t.status].color;
    let over = "";
    if (t.dueDate && endDate(t) > t.dueDate) {
      const a = pos(t.dueDate);
      over = `<span class="gt-over" style="right:${a}%;width:${Math.max(0.4, e - a)}%"></span>`;
    }
    const dots = sortedEvents(t).filter(ev => ev.type !== "close").map(ev =>
      `<span class="gt-dot" style="right:${pos(ev.date)}%;background:${EVT[ev.type].color}"></span>`).join("");
    const due = t.dueDate ? `<span class="gt-due" style="right:${pos(t.dueDate)}%"></span>` : "";
    const end = t.status === "closed" ? `<span class="gt-end" style="right:${e}%">${icon("close", 9, "#fff", 3.5)}</span>` : "";
    return `<div class="gt-row"><div class="gt-lbl"><b>${esc(t.ref)} · ${esc(t.title)}</b><span>${esc(t.owner || "—")} · ${ageDays(t)} يوم</span></div>
      <div class="gt-st">${statusPill(t)}</div>
      <div class="gt-track">${grid}${todayLine}
        <span class="gt-bar" style="right:${s}%;width:${Math.max(0.4, e - s)}%;background:${col};opacity:.85"></span>${over}${due}${dots}${end}</div></div>`;
  }).join("");

  const legend = h(`<div class="lg">
    ${Object.keys(STATUS).map(k => `<span><i style="background:${STATUS[k].color}"></i>${STATUS[k].ar}</span>`).join("")}
    <span><i style="background:repeating-linear-gradient(135deg,#dc2626 0 3px,#fecaca 3px 6px)"></i>فترة تجاوز الاستحقاق</span>
    <span><i style="width:0;height:0;border-radius:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #1d2433"></i>تاريخ الاستحقاق</span>
    <span><i style="border-radius:50%;background:#2563eb"></i>حدث مسجّل</span>
    <span><i style="background:#15803d;border-radius:50%"></i>إقفال</span>
    <span><i style="width:2px;background:#dc2626;border-radius:0"></i>اليوم</span>
  </div>`);

  return [secHead(ctx, "gantt", "المخطط الزمني الشامل", `من ${fmtLong(min)} إلى ${fmtLong(max)} · عرض ${monthly ? "شهري" : "أسبوعي"}`),
    h(`<div class="gt" data-split data-cont="المخطط الزمني الشامل"><div class="split-head">${head}</div><div class="split-body">${rows}</div></div>`),
    legend];
}

/* ---------- topic card ---------- */
function topicCard(ctx, t, sectionKey, full) {
  const today = todayISO();
  let msg, pct = 0, col = "var(--p)";
  if (t.dueDate) {
    const totalD = Math.max(1, daysBetween(t.openDate, t.dueDate));
    pct = Math.min(100, Math.max(2, daysBetween(t.openDate, endDate(t)) / totalD * 100));
    if (t.status === "closed") {
      const d = daysBetween(t.dueDate, t.closeDate);
      msg = d <= 0 ? `أُقفل قبل الاستحقاق بـ ${-d} يوم` : `أُقفل بعد الاستحقاق بـ ${d} يوم`;
      col = d <= 0 ? STATUS.closed.color : "#dc2626";
    } else {
      const d = daysBetween(today, t.dueDate);
      msg = d < 0 ? `متأخر ${-d} يوم عن الاستحقاق` : `متبقٍ ${d} يوم على الاستحقاق`;
      col = d < 0 ? "#dc2626" : pct > 75 ? STATUS.progress.color : "var(--p)";
    }
  } else {
    msg = t.status === "closed" ? `أُقفل بعد ${ageDays(t)} يوم من الفتح` : `مفتوح منذ ${ageDays(t)} يوم (بدون تاريخ استحقاق)`;
    pct = 100; col = t.status === "closed" ? STATUS.closed.color : "#94a3b8";
  }
  const descLen = full ? 1500 : 320;
  const label = `${t.ref} – ${t.title}`;
  return h(`<div class="tc" data-keep="1" ${sectionKey ? `data-topic-of="${sectionKey}"` : ""} data-topic-label="${esc(label)}">
    <div class="tc-h"><span class="rf">${esc(t.ref)}</span><h3>${esc(t.title)}</h3>${statusPill(t)}${overduePill(t)}
      <span class="pill ghost">أولوية ${PRIORITY[t.priority]}</span></div>
    <div class="tc-b">
      <div class="facts">
        <div><span>التصنيف</span><b>${esc(t.category) || "—"}</b></div>
        <div><span>الجهة ذات العلاقة</span><b>${esc(t.party) || "—"}</b></div>
        <div><span>المسؤول</span><b>${esc(t.owner) || "—"}</b></div>
        <div><span>عدد الأحداث</span><b>${t.events.length}</b></div>
        <div><span>تاريخ الفتح</span><b>${fmt(t.openDate)}</b></div>
        <div><span>تاريخ الاستحقاق</span><b>${fmt(t.dueDate)}</b></div>
        <div><span>تاريخ الإقفال</span><b>${fmt(t.closeDate)}</b></div>
        <div><span>المدة</span><b>${ageDays(t)} يوم</b></div>
      </div>
      <div><div class="tbar-msg" style="color:${col}">${msg}</div>
        <div class="tbar-track"><div class="tbar-fill" style="width:${pct}%;background:${col}"></div></div>
        <div class="tbar-lbls"><span>الفتح ${fmt(t.openDate)}</span><span>${t.dueDate ? "الاستحقاق " + fmt(t.dueDate) : "اليوم " + fmt(endDate(t))}</span></div></div>
    </div>
    ${t.description ? `<div class="tc-desc"><b>الخلفية: </b>${esc(clip(t.description, descLen))}</div>` : ""}
    ${t.status === "closed" && t.closeNote ? `<div class="tc-desc ok"><b>نتيجة الإقفال: </b>${esc(clip(t.closeNote, descLen))}</div>` : ""}
  </div>`);
}

/* ---------- horizontal timeline ---------- */
function htlBlocks(ctx, topics) {
  const N = ctx.orient === "landscape" ? 6 : 4;
  const blocks = [secHead(ctx, "htl", "الخط الزمني الأفقي", "تسلسل الأحداث من الفتح (يمين) حتى الإقفال أو الوضع الحالي (يسار)")];
  topics.forEach((t, ti) => {
    if (!ctx.single) {
      const card = topicCard(ctx, t, "htl");
      if (ti && ctx.orient === "landscape") card.dataset.newpage = "1";
      blocks.push(card);
    }
    const evs = eventsWithToday(t);
    for (let r = 0; r < evs.length; r += N) {
      const chunk = evs.slice(r, r + N);
      const cols = 2 * N + 2;
      let html = `<div class="ht" style="grid-template-columns:repeat(${cols},1fr)" data-cont="${esc(t.ref + " – " + t.title)}">
        <div class="ht-line">${r === 0 ? `<span class="st"></span>` : ""}<span class="ar"></span></div>`;
      chunk.forEach((e, j) => {
        const m = evMeta(e.type), cs = 2 * j + 1, top = j % 2 === 0, isT = e.type === "today";
        html += `<div class="ht-card ${top ? "top" : "bot"} ${isT ? "today" : ""}" style="--c:${m.color};grid-column:${cs}/${cs + 4}">
            <span class="ht-stem"></span>
            <div class="hd"><span class="t">${m.ar}</span><span class="d">${fmt(e.date)}</span></div>
            <div class="x">${esc(clip(e.text, isT ? 200 : 140))}</div>${e.by ? `<div class="by">${esc(e.by)}</div>` : ""}</div>
          <div class="ht-node ${isT ? "today" : ""}" style="--c:${m.color};grid-column:${cs + 1}/${cs + 3}">${icon(e.type, 14, isT ? m.color : "#fff")}</div>`;
        const nx = chunk[j + 1];
        if (nx) html += `<div class="ht-gap" style="grid-column:${cs + 2}/${cs + 4}">${daysBetween(e.date, nx.date)} يوم</div>`;
      });
      blocks.push(h(html + `</div>`));
    }
  });
  return blocks;
}

/* ---------- vertical detailed timeline ---------- */
function vtlBlocks(ctx, topics) {
  const blocks = [secHead(ctx, "vtl", "الخط الزمني التفصيلي", "كل الأحداث بنصها الكامل مجمّعة حسب الشهر")];
  topics.forEach(t => {
    if (!ctx.single) blocks.push(topicCard(ctx, t, "vtl"));
    const evs = eventsWithToday(t);
    const contTxt = t.ref + " – " + t.title;
    let month = "";
    evs.forEach((e, i) => {
      const [y, m, d] = e.date.split("-").map(Number);
      if (e.date.slice(0, 7) !== month) {
        month = e.date.slice(0, 7);
        blocks.push(h(`<div class="vt-month" data-keep="1" data-cont="${esc(contTxt)}"><span>${AR_MONTHS[m - 1]} ${y}</span><i></i></div>`));
      }
      const meta = evMeta(e.type), isT = e.type === "today";
      const info = i === 0 ? "بداية الموضوع"
        : `${daysBetween(evs[i - 1].date, e.date)} يوم منذ الحدث السابق · اليوم ${daysBetween(t.openDate, e.date)} من عمر الموضوع`;
      blocks.push(h(`<div class="vt-ev" data-cont="${esc(contTxt)}">
        <div class="vt-date"><b>${d}</b><span>${AR_MONTHS[m - 1]} ${y}</span></div>
        <div class="vt-rail"><span class="vt-line"></span><div class="vt-node ${isT ? "today" : ""}" style="--c:${meta.color}">${icon(e.type, 13, isT ? meta.color : "#fff")}</div></div>
        <div class="vt-card ${isT ? "today" : ""}" style="--c:${meta.color}"><div class="h"><span class="t">${meta.ar}</span>${e.by ? `<span class="by">· ${esc(e.by)}</span>` : ""}<span class="meta">${info}</span></div>
          <div class="x">${esc(e.text)}</div></div></div>`));
    });
  });
  return blocks;
}

/* ---------- single-topic overview ---------- */
function overviewBlocks(ctx, t) {
  const evs = sortedEvents(t);
  const gaps = evs.slice(1).map((e, i) => daysBetween(evs[i].date, e.date));
  if (t.status !== "closed" && evs.length) gaps.push(daysBetween(evs[evs.length - 1].date, todayISO()));
  const avgGap = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;
  const maxGap = gaps.length ? Math.max(...gaps) : 0;
  const since = daysBetween(lastEvent(t).date, todayISO());
  const kpi = (v, l, c = "var(--p)") => `<div class="kpi" style="--kc:${c}"><div class="v" style="color:${c}">${v}</div><div class="l">${l}</div></div>`;
  const types = {};
  evs.forEach(e => types[e.type] = (types[e.type] || 0) + 1);
  return [
    secHead(ctx, "overview", "بطاقة الموضوع", "البيانات الأساسية ومؤشرات المتابعة"),
    topicCard(ctx, t, null, true),
    h(`<div class="mini">
      ${kpi(evs.length, "عدد الأحداث")}
      ${kpi(`${ageDays(t)} <small>يوم</small>`, t.status === "closed" ? "مدة المعالجة" : "العمر حتى اليوم")}
      ${kpi(`${avgGap} <small>يوم</small>`, "متوسط الفاصل بين الأحداث")}
      ${kpi(`${maxGap} <small>يوم</small>`, "أطول فترة بدون تحديث", maxGap > 14 ? "#b45309" : "var(--p)")}
      ${kpi(t.status === "closed" ? "—" : `${since} <small>يوم</small>`, "منذ آخر تحديث", since > 14 && t.status !== "closed" ? "#b45309" : "var(--p)")}
    </div>`),
    h(`<div class="card"><h4>أنواع الأحداث المسجلة</h4><div class="chips">${Object.entries(types).map(([k, n]) =>
      `<span class="chip"><i style="background:${EVT[k].color}">${icon(k, 10)}</i>${EVT[k].ar} <b>${n}</b></span>`).join("")}</div></div>`),
  ];
}

/* =====================================================================
   Build / preview / export
   ===================================================================== */
const RP = { topics: null, single: false, opts: null, ctx: null, pages: [] };

function loadOpts() {
  let o = {};
  try { o = JSON.parse(localStorage.getItem(OPTS_KEY) || "{}"); } catch (e) { /* ignore */ }
  return { orient: o.orient || "landscape", sections: o.sections || Object.fromEntries(MULTI_KEYS.map(k => [k, true])) };
}

function openReportDialog(topics) {
  RP.single = !!topics;
  RP.topics = topics || filteredTopics();
  if (!RP.topics.length) { alert("لا توجد مواضيع ضمن التصفية الحالية."); return; }
  const o = loadOpts();
  const keys = RP.single ? SINGLE_KEYS : MULTI_KEYS;
  $("#reportFormTitle").textContent = RP.single ? `تقرير PDF للموضوع ${RP.topics[0].ref}` : "إعداد تقرير PDF";
  $("#reportScope").textContent = RP.single ? RP.topics[0].title : `النطاق: ${scopeLabel()} (${RP.topics.length} موضوع)`;
  $("#reportSections").innerHTML = (RP.single ? `<label><input type="checkbox" checked disabled><span>بطاقة الموضوع<small>البيانات الأساسية ومؤشرات المتابعة</small></span></label>` : "") +
    keys.map(k => `<label><input type="checkbox" name="sec" value="${k}" ${o.sections[k] !== false ? "checked" : ""}>
      <span>${SECTION_DEFS[k][0]}<small>${SECTION_DEFS[k][1]}</small></span></label>`).join("");
  $("#reportForm").orient.value = o.orient;
  $("#dlgReport").showModal();
}

$("#reportForm").addEventListener("submit", ev => {
  if (ev.submitter?.value !== "ok") return;
  const f = ev.target;
  const o = loadOpts();
  f.querySelectorAll('input[name="sec"]').forEach(c => o.sections[c.value] = c.checked);
  o.orient = f.orient.value;
  try { localStorage.setItem(OPTS_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ }
  RP.opts = o;
  showPreview();
});

async function showPreview() {
  const ov = $("#rpOverlay");
  ov.classList.add("show");
  document.body.style.overflow = "hidden";
  setBusy(true, "جاري تجهيز الصفحات…");
  await document.fonts.load("400 12px 'Plex Arabic'");
  await document.fonts.load("700 12px 'Plex Arabic'");
  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(r));
  try {
    buildReport();
    setBusy(false, `${RP.pages.length} صفحة`);
  } catch (e) {
    console.error(e);
    setBusy(false, "تعذر إنشاء التقرير: " + e.message);
  }
}

function buildReport() {
  const S = rs(), topics = RP.topics, single = RP.single, sec = RP.opts.sections;
  const on = k => sec[k] !== false;
  const ctx = {
    S, single, orient: RP.opts.orient, secNo: 0, sections: [], tocEl: null,
    title: single ? `${S.reportTitle} – ${topics[0].ref}` : S.reportTitle,
  };
  RP.ctx = ctx;
  const stage = $("#rpStage");
  stage.replaceChildren();
  $("#rpTitle").textContent = single ? `معاينة تقرير ${topics[0].ref}` : "معاينة التقرير";
  const P = new Pager(stage, ctx);

  if (on("cover")) coverPage(P, ctx, topics);
  if (!single && on("toc")) tocBlocks(ctx).forEach(b => P.add(b));

  const blocks = [];
  if (single) {
    blocks.push(...overviewBlocks(ctx, topics[0]));
  } else {
    if (on("dash")) blocks.push(...dashBlocks(ctx, topics));
    if (on("table")) blocks.push(...tableBlocks(ctx, topics));
    if (on("gantt")) blocks.push(...ganttBlocks(ctx, topics));
  }
  if (on("htl")) blocks.push(...htlBlocks(ctx, topics));
  if (on("vtl")) blocks.push(...vtlBlocks(ctx, topics));
  if (!single) ctx.topicIndexSection = on("htl") ? "htl" : on("vtl") ? "vtl" : null;
  blocks.forEach(b => P.add(b));
  if (!P.pages.length) P.page();

  RP.pages = P.pages;
  fillToc(ctx, P.pages);
  P.pages.forEach((pg, i) => { const n = pg.querySelector(".num"); if (n) n.textContent = `صفحة ${i + 1} من ${P.pages.length}`; });
  fitPreview();
}

function fitPreview() {
  const stage = $("#rpStage");
  if (!RP.pages.length) return;
  const land = RP.opts.orient === "landscape";
  const W = land ? 1123 : 794, H = land ? 794 : 1123;
  const s = Math.min(1, (stage.clientWidth - 24) / W);
  stage.querySelectorAll(".pg-wrap").forEach(w => {
    w.style.width = W * s + "px"; w.style.height = H * s + "px";
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
  return RP.single ? `تقرير-${RP.topics[0].ref}-${todayISO()}.pdf` : `تقرير-متابعة-المواضيع-${todayISO()}.pdf`;
}

async function downloadPdf() {
  if (typeof htmlToImage === "undefined" || !window.jspdf) { alert("مكتبات PDF غير محمّلة (مجلد lib)."); return; }
  const land = RP.opts.orient === "landscape";
  const W = land ? 297 : 210, H = land ? 210 : 297;
  const S = RP.ctx.S;
  const pdf = new window.jspdf.jsPDF({ orientation: land ? "landscape" : "portrait", unit: "mm", format: "a4", compress: true });
  setBusy(true);
  try {
    for (let i = 0; i < RP.pages.length; i++) {
      $("#rpProg").textContent = `جاري إنشاء ملف PDF… صفحة ${i + 1} من ${RP.pages.length}`;
      const url = await htmlToImage.toJpeg(RP.pages[i], {
        pixelRatio: 2.2, quality: 0.92, backgroundColor: "#ffffff",
        fontEmbedCSS: window.EMBEDDED_FONT_CSS || "",
      });
      if (i) pdf.addPage("a4", land ? "landscape" : "portrait");
      pdf.addImage(url, "JPEG", 0, 0, W, H, undefined, "FAST");
    }
    pdf.setProperties({ title: RP.ctx.title, subject: RP.ctx.title, author: S.preparedBy || S.org || "", creator: "نظام متابعة المواضيع" });
    download(pdf.output("blob"), reportFileName());
    setBusy(false, "تم تنزيل ملف PDF ✓");
  } catch (e) {
    console.error(e);
    setBusy(false, "تعذر إنشاء PDF – استخدم زر الطباعة ثم «حفظ كـ PDF».");
  }
}

function printPages() {
  let st = $("#rpPageSize");
  if (!st) { st = document.createElement("style"); st.id = "rpPageSize"; document.head.appendChild(st); }
  st.textContent = `@page { size: A4 ${RP.opts.orient}; margin: 0; }`;
  const old = document.title;
  document.title = reportFileName().replace(/\.pdf$/, "");
  window.addEventListener("afterprint", () => { document.title = old; }, { once: true });
  window.print();
}

$("#btnPdf").onclick = () => openReportDialog();
$("#rpClose").onclick = closePreview;
$("#rpDownload").onclick = downloadPdf;
$("#rpPrint").onclick = printPages;
$("#rpEdit").onclick = () => { closePreview(); openReportDialog(RP.single ? RP.topics : null); };
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#rpOverlay").classList.contains("show") && !document.querySelector("dialog[open]")) closePreview(); });

/* =====================================================================
   Branding settings
   ===================================================================== */
let pendingLogo = "";

function openSettingsDialog() {
  const S = rs(), f = $("#settingsForm");
  ["org", "dept", "reportTitle", "preparedBy", "classification", "footer", "primary", "accent"].forEach(k => f[k].value = S[k]);
  pendingLogo = S.logo;
  renderLogoPrev();
  $("#themeList").innerHTML = THEMES.map(([n, p, a]) =>
    `<button type="button" data-p="${p}" data-a="${a}"><i style="background:${p}"></i><i style="background:${a}"></i>${n}</button>`).join("");
  $("#dlgSettings").showModal();
}

function renderLogoPrev() {
  $("#logoPrev").innerHTML = pendingLogo ? `<img src="${pendingLogo}" alt="">` : "لا يوجد";
}

$("#themeList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const f = $("#settingsForm"); f.primary.value = b.dataset.p; f.accent.value = b.dataset.a;
});
$("#btnLogo").onclick = () => $("#fileLogo").click();
$("#btnLogoDel").onclick = () => { pendingLogo = ""; renderLogoPrev(); };
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
    };
    img.onerror = () => alert("تعذر قراءة الصورة.");
    img.src = rd.result;
  };
  rd.readAsDataURL(file);
};

$("#settingsForm").addEventListener("submit", ev => {
  if (ev.submitter?.value !== "ok") return;
  const f = ev.target;
  db.settings = Object.fromEntries(["org", "dept", "reportTitle", "preparedBy", "classification", "footer", "primary", "accent"].map(k => [k, f[k].value.trim()]));
  if (!db.settings.reportTitle) db.settings.reportTitle = DEFAULT_SETTINGS.reportTitle;
  db.settings.logo = pendingLogo;
  save();
  toast("تم حفظ هوية التقرير");
  if ($("#rpOverlay").classList.contains("show")) showPreview();
});

$("#btnSettings").onclick = openSettingsDialog;
$("#btnReportSettings").onclick = openSettingsDialog;
