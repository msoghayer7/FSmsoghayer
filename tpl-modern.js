"use strict";
/* =====================================================================
   Report template (ج): لوحة حديثة
   dark hero header with KPI cards, rounded cards, coloured Gantt with
   overdue hatching, status donut, attention list, icon step timeline,
   true-scale strip
   ===================================================================== */
(() => {
  const SC = { open: "#2a78d6", progress: "#eda100", hold: "#6250d6", closed: "#1baf7a" };
  const EC = { create: "#0f172a", update: "#2a78d6", followup: "#1baf7a", meeting: "#6250d6", letter: "#3f7fbf", inspection: "#0f766e", action: "#eb6834",
    decision: "#d55181", status: "#64748b", close: "#1baf7a", reopen: "#e34948", now: "#e34948" };
  const RED = "#e34948";
  const colors = S => S.customColors ? { p: S.primary, a: S.accent } : { p: "#1b9bd7", a: "#066d39" };

  function logo(S) {
    if (logoSrc(S)) return `<div class="logo img"><img src="${logoSrc(S)}" alt=""></div>`;
    return `<div class="logo">${esc((S.org || "م").trim().charAt(0))}</div>`;
  }

  function kpi(ic, col, v, l) {
    return `<div class="k"><span class="ic" style="background:${col}1f">${icon(ic, 18, col)}</span><div><b>${v}</b><span>${l}</span></div></div>`;
  }

  function shell(ctx, page, first) {
    const S = ctx.S;
    const foot = `<div class="foot"><span>${esc(S.footer || S.reportTitle)}${S.classification ? " · " + esc(S.classification) : ""}</span><span>صفحة <span class="pg-n"></span> من <span class="pg-t"></span></span></div>`;
    if (!first) {
      const ttl = page.kind === "topic" ? `${esc(page.t.ref)} · ${esc(page.t.title)}` : esc(S.reportTitle);
      return `<div class="band">${logo(S)}<b>${esc(S.org || "نظام متابعة المواضيع")}</b><span>${ttl}</span></div><div class="pg-body"></div>${foot}`;
    }
    const top = right => `<div class="top">${logo(S)}<div class="o"><b>${esc(S.org || "نظام متابعة المواضيع")}</b><span>${esc(S.dept)}</span></div><div class="d">${right}</div></div>`;
    if (page.kind === "topic") {
      const t = page.t;
      let ring = "";
      if (t.dueDate && t.status !== "closed") {
        const span = Math.max(1, daysBetween(t.openDate, t.dueDate)), used = Math.round(ageDays(t) / span * 100), R = 26, C = 2 * Math.PI * R;
        const col = used > 100 ? RED : used > 75 ? "#eda100" : "#1baf7a";
        ring = `<div class="ring"><svg width="64" height="64"><circle cx="32" cy="32" r="${R}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="7"/>
          <circle cx="32" cy="32" r="${R}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C * Math.min(1, used / 100)} ${C}" transform="rotate(-90 32 32)"/>
          <text x="32" y="37" text-anchor="middle" font-family="Tajawal" font-weight="800" font-size="14" fill="#fff">${used}%</text></svg>
          <div class="t"><b>من المهلة مستهلك</b><span>${dur(ageDays(t))} من أصل ${dur(span)}</span></div></div>`;
      } else if (t.status === "closed") {
        ring = `<div class="ring"><span class="okc">${icon("close", 26, "#fff", 3)}</span><div class="t"><b>أُقفل ${fmtLong(t.closeDate)}</b><span>بعد ${dur(ageDays(t))} من الفتح</span></div></div>`;
      }
      return `<div class="hero"><div class="glow"></div>${top(`<b>${esc(t.ref)}</b>${esc(t.category || "")}`)}
        <div class="h1 sm">${esc(t.title)}</div>${t.description ? `<div class="sub">${esc(clip(t.description, 120))}</div>` : ""}
        <div class="chips"><span class="chip" style="background:${SC[t.status]};color:${t.status === "progress" ? "#0f172a" : "#fff"}">${STATUS[t.status].ar}</span>
          ${isOverdue(t) ? `<span class="chip" style="background:${RED}">متأخر ${dur(lateDays(t))}</span>` : ""}
          <span class="chip" style="background:rgba(255,255,255,.12)">أولوية ${PRIORITY[t.priority]}</span>
          ${t.owner ? `<span class="chip" style="background:rgba(255,255,255,.12)">${esc(t.owner)}</span>` : ""}</div>${ring}</div>
        <div class="pg-body"></div>${foot}`;
    }
    const s = page.s;
    return `<div class="hero big"><div class="glow"></div>${top(`<b>${fmtLong(todayISO())}</b>${esc(ctx.period)}`)}
      <div class="h1">${esc(S.reportTitle)}</div><div class="sub">${summaryHeadline(ctx.topics).replace(/<\/?em>/g, "")}</div></div>
      <div class="kp">
        ${kpi("list", "#2a78d6", s.total, "إجمالي المواضيع")}
        ${kpi("trend", "#eda100", s.active, "قيد المتابعة")}
        ${kpi("close", "#1baf7a", `${s.pct}<small>%</small>`, "نسبة الإقفال")}
        ${kpi("alert", RED, s.overdue.length, "متأخر عن الاستحقاق")}
        ${kpi("clock", "#6250d6", s.avgClose === null ? "—" : `${s.avgClose}<small> يوماً</small>`, "متوسط مدة الإقفال")}
      </div><div class="pg-body"></div>${foot}`;
  }

  /* ---------- summary ---------- */
  function summary(ctx, topics) {
    const s = stats(topics), today = todayISO();
    const sc = timeScale([today, ...topics.flatMap(t => [t.openDate, endDate(t), t.dueDate])]);
    const grid = sc.ticks.map(k => `<span class="gl" style="right:${sc.x(k.t)}%"></span>`).join("");
    const rows = topics.map((t, i) => {
      const e = endDate(t), lf = isOverdue(t) ? t.dueDate : null;
      const lbl = t.status === "closed" ? `✓ ${fmtShort(t.closeDate)}` : lf ? `متأخر ${dur(lateDays(t))}` : t.dueDate ? `الاستحقاق ${fmtShort(t.dueDate)}` : "";
      return `<div class="g-row"><div class="nm"><span class="dot" style="background:${SC[t.status]}"></span><div><b>${esc(t.title)}</b><span>${esc(t.ref)}${t.owner ? " · " + esc(t.owner) : ""}</span></div></div>
        <div class="tr">${grid}<span class="today ${i === topics.length - 1 ? "last" : ""}" style="right:${sc.x(today)}%"></span>
          <span class="bar" style="right:${sc.x(t.openDate)}%;width:${Math.max(0.6, sc.x(lf || e) - sc.x(t.openDate))}%;background:${SC[t.status]}"></span>
          ${lf ? `<span class="bar late" style="right:${sc.x(lf)}%;width:${Math.max(0.6, sc.x(e) - sc.x(lf))}%"></span>` : ""}
          ${realEvents(t).filter(v => v.type !== "close").map(v => `<span class="gev" style="right:${sc.x(v.date)}%"></span>`).join("")}
          ${lbl ? `<span class="bar-lbl ${lf ? "red" : ""}" style="right:${sc.x(e)}%">${lbl}</span>` : ""}
        </div></div>`;
    }).join("");

    const R = 44, C = 2 * Math.PI * R; let off = 0;
    const ks = ["closed", "progress", "hold", "open"].filter(k => s[k]);
    const arcs = ks.map(k => { const L = C * s[k] / s.total; const a = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${SC[k]}" stroke-width="16" stroke-dasharray="${Math.max(0.1, L - (ks.length > 1 ? 3 : 0))} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`; off += L; return a; }).join("");
    const att = [];
    s.overdue.sort((a, b) => lateDays(b) - lateDays(a)).forEach(t => att.push(["alert", RED, t, `متأخر ${dur(lateDays(t))} · آخر إجراء قبل ${dur(sinceLast(t))}`]));
    topics.filter(t => t.status === "hold").forEach(t => att.push(["pause", SC.hold, t, `معلّق · آخر إجراء قبل ${dur(sinceLast(t))}`]));
    s.dueSoon.filter(t => t.status !== "hold").forEach(t => att.push(["clock", "#eda100", t, `يستحق خلال ${dur(daysBetween(today, t.dueDate))}`]));
    s.stale.filter(t => !isOverdue(t) && t.status !== "hold").forEach(t => att.push(["clock", SC.open, t, `لا تحديث منذ ${dur(sinceLast(t))}`]));

    return [onNewPage(h(`<div class="m-row" data-split data-cont="المخطط الزمني للمواضيع">
      <div class="card m-gantt" style="--rh:${Math.max(44, Math.min(58, Math.floor(360 / topics.length)))}px"><h3>${icon("trend", 18, SC.open)} المخطط الزمني للمواضيع<small>${fmtLong(s.from)} – ${fmtLong(today)}</small></h3>
        <div class="split-head"><div class="g-row g-ax"><div></div><div class="ax">${sc.ticks.map(k => `<span style="right:${sc.x(k.t)}%">${k.label}</span>`).join("")}</div></div></div>
        <div class="split-body">${rows}</div>
        <div class="lgd">${["open", "progress", "hold", "closed"].map(k => `<span><i style="background:${SC[k]}"></i>${STATUS[k].ar}</span>`).join("")}
          <span><i class="hatch"></i>تجاوز الاستحقاق</span><span><i class="evi"></i>إجراء مسجّل</span><span><i style="width:2px;border-radius:0;background:#0f172a"></i>اليوم ${fmtShort(today)}</span></div></div>
      <div class="m-side" data-first-only>
        <div class="card"><h3>توزيع الحالات</h3><div class="donut">
          <svg width="120" height="120">${arcs}<text x="60" y="64" text-anchor="middle" font-family="Tajawal" font-weight="800" font-size="28" fill="#0f172a">${s.total}</text>
          <text x="60" y="82" text-anchor="middle" font-family="Plex Arabic" font-size="10" fill="#94a3b8">موضوع</text></svg>
          <div class="dl">${["open", "progress", "hold", "closed"].map(k => `<div><i style="background:${SC[k]}"></i>${STATUS[k].ar}<b>${s[k]}</b></div>`).join("")}</div></div></div>
        <div class="card grow"><h3>يحتاج انتباهك</h3>
          ${att.slice(0, 5).map(([ic, c, t, txt]) => `<div class="al"><span class="ic" style="background:${c}1f">${icon(ic, 15, c)}</span><div><b>${esc(clip(t.title, 46))}</b><span>${txt}</span></div></div>`).join("")
            || `<div class="al"><span class="ic" style="background:#1baf7a1f">${icon("close", 15, "#1baf7a")}</span><div><b>لا توجد ملاحظات</b><span>لا تأخير ولا مواضيع راكدة</span></div></div>`}
        </div></div></div>`), { kind: "summary", s })];
  }

  /* ---------- per topic ---------- */
  const PER = 6;
  function stepCard(evs, from, t, first) {
    const chunk = evs.slice(from, from + PER);
    return h(`<div class="card" data-cont="${esc(t.ref + " – " + t.title)}">
      ${first ? `<h3>${icon("trend", 18, SC.open)} مسار الإجراءات<small>من الفتح حتى ${t.status === "closed" ? "الإقفال" : "اليوم"} · الأيام بين كل إجراءين</small></h3>` : ""}
      <div class="stp" style="grid-template-columns:repeat(${PER},1fr)">
        <span class="line" style="right:${100 / PER / 2}%;left:${(PER - chunk.length) / PER * 100 + 100 / PER / 2}%"></span>
        ${chunk.map((e, j) => {
          const now = e.type === "now", c = EC[e.type] || SC.open, nx = evs[from + j + 1];
          return `<div class="st" style="--c:${c}"><div class="n ${now ? "now" : ""}">${icon(now ? "clock" : e.type, 18, now ? RED : "#fff")}</div>
            ${nx && j < chunk.length - 1 ? `<span class="gp">${dur(daysBetween(e.date, nx.date))}</span>` : ""}
            <div class="c"><div class="d">${fmtShort(e.date)} <small>${e.date.slice(0, 4)}</small></div><div class="ty">${now ? "الوضع الحالي" : EVT[e.type].ar}</div>
            <p>${esc(clip(e.text, now ? 120 : 170))}</p>${e.by ? `<div class="by">${esc(e.by)}</div>` : ""}</div></div>`;
        }).join("")}</div></div>`);
  }

  function topic(ctx, t) {
    const today = todayISO(), out = [];
    const evs = sortedEvents(t).slice();
    if (t.status !== "closed") evs.push({ date: today, type: "now", text: isOverdue(t) ? `متأخر ${dur(lateDays(t))} عن الاستحقاق` : t.dueDate ? `متبقٍ ${dur(daysBetween(today, t.dueDate))} على الاستحقاق` : `مفتوح منذ ${dur(ageDays(t))}`, by: "" });
    for (let i = 0; i < evs.length; i += PER) {
      const c = stepCard(evs, i, t, i === 0);
      out.push(i === 0 ? onNewPage(c, { kind: "topic", t }) : c);
    }
    // true-scale strip
    const sc = timeScale([t.openDate, endDate(t), t.dueDate, today], 0.015);
    const end = endDate(t), lf = t.dueDate && end > t.dueDate ? t.dueDate : null;
    const real = sortedEvents(t);
    out.push(h(`<div class="card"><h3>${icon("clock", 18, SC.open)} الإجراءات على المقياس الزمني الفعلي<small>${fmtLong(t.openDate)} – ${fmtLong(end)}</small></h3>
      <div class="ps"><div class="base"></div>
        <div class="fill" style="right:${sc.x(t.openDate)}%;width:${sc.x(lf || end) - sc.x(t.openDate)}%"></div>
        ${lf ? `<div class="fill late" style="right:${sc.x(lf)}%;width:${sc.x(end) - sc.x(lf)}%"></div>` : ""}
        ${real.map(e => `<span class="e" style="right:${sc.x(e.date)}%;background:${EC[e.type]}"></span>`).join("")}
        ${sc.ticks.filter(k => [t.dueDate, t.status !== "closed" ? today : null].filter(Boolean).every(m => Math.abs(sc.x(k.t) - sc.x(m)) > 6))
          .map(k => `<span class="s" style="right:${sc.x(k.t)}%">${k.label}</span>`).join("")}
        ${t.dueDate ? `<span class="m" style="right:${sc.x(t.dueDate)}%;--c:${RED}"><b>الاستحقاق ${fmtShort(t.dueDate)}</b></span>` : ""}
        ${t.status !== "closed" ? `<span class="m" style="right:${sc.x(today)}%;--c:#0f172a"><b>اليوم</b></span>` : ""}
      </div></div>`));
    // facts + extras (next steps / risks / decision / closing note) in one row
    const gaps = real.slice(1).map((e, i) => daysBetween(real[i].date, e.date));
    const nx = lines(t.nextSteps), rk = lines(t.risks), dc = (t.decision || "").trim();
    const extras = [];
    if (t.status === "closed" && t.closeNote) extras.push(`<div class="card ok"><h3>${icon("close", 16, "#1baf7a", 3)} نتيجة الإقفال</h3><p>${esc(clip(t.closeNote, 260))}</p></div>`);
    if (nx.length) extras.push(`<div class="card"><h3>${icon("trend", 16, SC.open)} الخطوات التالية</h3><ul>${nx.slice(0, 5).map(x => `<li>${esc(clip(x, 90))}</li>`).join("")}</ul></div>`);
    if (rk.length) extras.push(`<div class="card"><h3>${icon("alert", 16, RED)} المخاطر</h3><ul class="r">${rk.slice(0, 5).map(x => `<li>${esc(clip(x, 90))}</li>`).join("")}</ul></div>`);
    if (dc) extras.push(`<div class="card dark"><h3>القرار المطلوب</h3><p>${esc(clip(dc, 220))}</p></div>`);
    if (!extras.length) {
      const types = {};
      realEvents(t).forEach(e => types[e.type] = (types[e.type] || 0) + 1);
      const mx = Math.max(1, ...Object.values(types));
      extras.push(`<div class="card"><h3>أنواع الإجراءات</h3><div class="bars">
        ${Object.entries(types).map(([k, n]) => `<div><span>${EVT[k].ar}</span><i style="width:${n / mx * 100}%;background:${EC[k]}"></i><b>${n}</b></div>`).join("") || `<p class="mut">لا إجراءات بعد.</p>`}</div></div>`);
    }
    const ex = extras.slice(0, 3), narrow = ex.length > 1;
    out.push(h(`<div class="m-row2 ${ex.length > 1 ? "x" + (ex.length + 1) : ""}">
      <div class="card"><h3>بيانات الموضوع</h3><div class="facts ${narrow ? "narrow" : ""}">
        <div><span>الجهة ذات العلاقة</span><b>${esc(t.party) || "—"}</b></div><div><span>المسؤول</span><b>${esc(t.owner) || "—"}</b></div>
        <div><span>تاريخ الفتح</span><b>${fmt(t.openDate)}</b></div><div><span>تاريخ الاستحقاق</span><b class="${isOverdue(t) ? "red" : ""}">${fmt(t.dueDate)}</b></div>
        <div><span>عدد الإجراءات</span><b>${realEvents(t).length}</b></div><div><span>متوسط الفاصل</span><b>${gaps.length ? dur(Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)) : "—"}</b></div>
        ${narrow ? "" : `<div><span>أطول فاصل</span><b>${gaps.length ? dur(Math.max(...gaps)) : "—"}</b></div>`}
        <div><span>${t.status === "closed" ? "تاريخ الإقفال" : "آخر إجراء"}</span><b>${t.status === "closed" ? fmt(t.closeDate) : "قبل " + dur(sinceLast(t))}</b></div>
      </div></div>${ex.join("")}</div>`));
    return out;
  }

  TPL.modern = {
    key: "modern", name: "لوحة حديثة", desc: "ترويسة داكنة ومؤشرات في بطاقات، مخطط ملوّن، يحتاج انتباهك، مسار إجراءات بأيقونات",
    swatch: `<i style="background:#0f172a"></i><i style="background:#2a78d6"></i><i style="background:#1baf7a"></i>`,
    vars: ctx => { const c = colors(ctx.S); return `--lp:${c.p};--la:${c.a}`; },
    shell, summary, topic,
  };
})();
