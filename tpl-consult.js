"use strict";
/* =====================================================================
   Report template (ب): استشاري
   action titles (one-sentence takeaway per page), quiet single-hue
   Gantt, key points + decisions column, fact sheet, step timeline,
   next steps / risks
   ===================================================================== */
(() => {
  const colors = S => S.customColors ? { p: S.primary, a: S.accent } : { p: "#0b3b26", a: "#1b9bd7" };
  // status shades of the primary colour (closed = full, open = light)
  const SH = { closed: 1, progress: 0.78, open: 0.45, hold: 0.22 };
  const shade = k => `color-mix(in srgb, var(--navy) ${SH[k] * 100}%, #fff)`;
  const stc = k => k === "progress" ? "var(--blue)" : shade(k);

  function shell(ctx, page, first) {
    const S = ctx.S;
    const label = page.kind === "topic" ? `متابعة موضوع · ${esc(page.t.ref)}` : "ملخص تنفيذي";
    const right = page.kind === "topic" ? esc(page.t.title) : `${esc(S.reportTitle)} · ${esc(ctx.period)}`;
    return `<div class="trk"><b>${label}${first ? "" : " (تابع)"}</b><span>${right}</span></div>
      <div class="pg-body"></div>
      <div class="foot">${ctx.logo ? `<img src="${ctx.logo}" alt="">` : ""}<span class="lg">${esc(S.org || "نظام متابعة المواضيع")}</span>
        <span>المصدر: نظام متابعة المواضيع، بيانات حتى ${fmtLong(todayISO())}${S.classification ? " · " + esc(S.classification) : ""}</span><span class="pn"><span class="pg-n"></span></span></div>`;
  }

  const actionTitle = (html, page) => {
    const el = h(`<div class="c-at" data-keep="1"><h1>${html}</h1></div>`);
    return page ? onNewPage(el, page) : el;
  };
  const h3 = (t, small) => `<div class="c-h3">${t}${small ? `<small>${small}</small>` : ""}</div>`;

  /* ---------- Gantt ---------- */
  function gantt(topics) {
    const today = todayISO();
    const sc = timeScale([today, ...topics.flatMap(t => [t.openDate, endDate(t), t.dueDate])]);
    const grid = sc.ticks.map(k => `<span class="gl" style="right:${sc.x(k.t)}%"></span>`).join("");
    const rows = topics.map((t, i) => `<div class="g-row">
      <div class="nm"><b>${esc(t.title)}</b><span>${esc(t.ref)}${t.owner ? " · " + esc(t.owner) : ""}</span></div>
      <div class="tr">${grid}<span class="tl ${i === topics.length - 1 ? "last" : ""}" style="right:${sc.x(today)}%"></span>
        <span class="br" style="right:${sc.x(t.openDate)}%;width:${Math.max(0.4, sc.x(endDate(t)) - sc.x(t.openDate))}%;background:${stc(t.status)}"></span>
        ${realEvents(t).filter(e => e.type !== "close").map(e => `<span class="ms" style="right:${sc.x(e.date)}%"></span>`).join("")}
        ${t.status === "closed" ? `<span class="ok" style="right:${sc.x(t.closeDate)}%">✓</span>` : t.dueDate ? `<span class="dd" style="right:${sc.x(t.dueDate)}%"></span>` : ""}
      </div></div>`).join("");
    return { head: `<div class="g-row g-ax"><div></div><div class="ax">${sc.ticks.map(k => `<span style="right:${sc.x(k.t)}%">${k.label}</span>`).join("")}</div></div>`, rows,
      legend: `<div class="lgd">${["closed", "progress", "open", "hold"].map(k => `<span><i style="width:16px;height:6px;background:${stc(k)}"></i>${STATUS[k].ar}</span>`).join("")}
        <span><i class="msi"></i>إجراء</span><span><i style="width:2px;height:12px;background:var(--red)"></i>الاستحقاق</span>
        <span><i style="width:1px;height:12px;background:var(--navy)"></i>اليوم ${fmtShort(today)}</span></div>` };
  }

  /* ---------- summary ---------- */
  function summary(ctx, topics) {
    const s = stats(topics);
    const out = [actionTitle(summaryHeadline(topics), { kind: "summary" })];
    out.push(h(`<div class="c-kp">
      <div><b>${s.total}</b><span>مواضيع مسجّلة</span></div>
      <div><b>${s.active}</b><span>قيد المتابعة</span></div>
      <div><b>${s.pct}<small>%</small></b><span>نسبة الإقفال</span></div>
      <div><b class="${s.overdue.length ? "red" : ""}">${s.overdue.length}</b><span>متأخر عن الاستحقاق</span></div>
      <div><b>${s.avgClose === null ? "—" : s.avgClose}<small>${s.avgClose === null ? "" : " يوماً"}</small></b><span>متوسط مدة الإقفال</span></div></div>`));
    const g = gantt(topics);
    const kp = keyPoints(topics), dec = decisionsOf(topics);
    out.push(h(`<div class="c-main" data-split data-cont="الجدول الزمني للمواضيع">
      <div class="c-gantt" style="--rh:${Math.max(46, Math.min(62, Math.floor(380 / topics.length)))}px">${h3("الجدول الزمني للمواضيع", `${fmtLong(s.from)} – ${fmtLong(todayISO())}`)}
        <div class="split-head">${g.head}</div><div class="split-body">${g.rows}</div>${g.legend}</div>
      <div class="c-side" data-first-only>${h3("أبرز النقاط")}
        <ol>${kp.map(p => `<li class="${p.tone}"><span>${p.title ? `<b>${esc(p.title)}</b>: ` : ""}${esc(p.text)}</span></li>`).join("") || "<li><span>لا توجد ملاحظات.</span></li>"}</ol>
        ${dec.length ? `<div class="ask"><h4>القرارات المطلوبة</h4>${dec.slice(0, 4).map(({ t, text }, i) => `<p>${i + 1}. ${esc(clip(text, 120))} <span>(<bdi>${esc(t.ref)}</bdi>)</span></p>`).join("")}</div>` : ""}
      </div></div>`));
    return out;
  }

  /* ---------- per topic ---------- */
  const PER = 6;
  function steps(evs, from, t) {
    const chunk = evs.slice(from, from + PER);
    const all = evs;
    return h(`<div class="c-steps ${from ? "more" : ""}" style="grid-template-columns:repeat(${PER},1fr)" data-cont="${esc(t.ref + " – " + t.title)}">
      <span class="axis" style="right:${100 / PER / 2}%;left:${(PER - chunk.length) / PER * 100 + 100 / PER / 2}%"></span>
      ${chunk.map((e, j) => {
        const i = from + j, now = e.type === "now", nx = all[i + 1];
        return `<div class="st ${now ? "now" : ""}"><div class="d">${fmtShort(e.date)}<small>${e.date.slice(0, 4)}</small></div>
          <span class="dot"></span>${nx && j < chunk.length - 1 ? `<span class="gap">${dur(daysBetween(e.date, nx.date))}</span>` : ""}
          <div class="k">${now ? "الوضع الحالي" : EVT[e.type].ar}</div><p>${esc(clip(e.text, now ? 140 : 190))}</p>${e.by ? `<div class="by">${esc(e.by)}</div>` : ""}</div>`;
      }).join("")}</div>`);
  }

  function topic(ctx, t) {
    const out = [actionTitle(topicHeadline(t), { kind: "topic", t })];
    const evs = sortedEvents(t).slice();
    if (t.status !== "closed") evs.push({ date: todayISO(), type: "now", text: isOverdue(t) ? `متأخر ${dur(lateDays(t))} عن الاستحقاق` : t.dueDate ? `متبقٍ ${dur(daysBetween(todayISO(), t.dueDate))} على الاستحقاق` : `مفتوح منذ ${dur(ageDays(t))}` });
    const span = t.dueDate ? Math.max(1, daysBetween(t.openDate, t.dueDate)) : 0;
    const used = span ? Math.round(ageDays(t) / span * 100) : 0;
    const fillW = span ? Math.min(100, 100 / Math.max(1, used / 100)) : 100;
    const meter = span ? `<div class="meter"><div class="m"><span>الوقت المستهلك من المهلة</span><b class="${used > 100 ? "red" : ""}">${used}%</b></div>
      <div class="t"><span class="f" style="width:${used > 100 ? fillW : used}%"></span>${used > 100 ? `<span class="o" style="right:${fillW}%;left:0"></span>` : ""}</div>
      <div class="lb"><span>${fmt(t.openDate)}</span><span>الاستحقاق ${fmt(t.dueDate)}</span></div></div>` : "";
    out.push(h(`<div class="c-tp">
      <div class="c-fact">${h3("بطاقة الموضوع")}<dl>
        <dt>المرجع</dt><dd>${esc(t.ref)}</dd><dt>التصنيف</dt><dd>${esc(t.category) || "—"}</dd><dt>الجهة</dt><dd>${esc(t.party) || "—"}</dd>
        <dt>المسؤول</dt><dd>${esc(t.owner) || "—"}</dd><dt>الأولوية</dt><dd>${PRIORITY[t.priority]}</dd><dt>الحالة</dt><dd>${STATUS[t.status].ar}</dd>
        <dt>تاريخ الفتح</dt><dd>${fmt(t.openDate)}</dd><dt>الاستحقاق</dt><dd class="${isOverdue(t) ? "red" : ""}">${fmt(t.dueDate)}</dd>
        ${t.status === "closed" ? `<dt>الإقفال</dt><dd>${fmt(t.closeDate)}</dd>` : `<dt>آخر إجراء</dt><dd>قبل ${dur(sinceLast(t))}</dd>`}
        <dt>عدد الإجراءات</dt><dd>${realEvents(t).length}</dd></dl>${meter}</div>
      <div class="c-right">${h3("المسار الزمني للإجراءات", "الأيام بين كل إجراءين على المحور")}
        ${t.description ? `<p class="c-desc">${esc(clip(t.description, 300))}</p>` : ""}
        <div class="c-slot"></div></div></div>`));
    // first row of steps sits inside the right column, further rows follow full width
    const first = out[1].querySelector(".c-slot");
    first.replaceWith(steps(evs, 0, t));
    for (let i = PER; i < evs.length; i += PER) out.push(steps(evs, i, t));
    const nx = lines(t.nextSteps), rk = lines(t.risks), dc = (t.decision || "").trim();
    if (nx.length || rk.length || dc) out.push(h(`<div class="c-nx">
      ${nx.length ? `<div>${h3("الخطوات التالية")}<ul>${nx.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${rk.length ? `<div class="r">${h3("المخاطر")}<ul>${rk.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${dc ? `<div class="ask"><h4>القرار المطلوب</h4><p>${esc(dc)}</p></div>` : ""}</div>`));
    else if (t.status === "closed" && t.closeNote) out.push(h(`<div class="c-nx"><div>${h3("نتيجة الإقفال")}<p>${esc(t.closeNote)}</p></div></div>`));
    return out;
  }

  TPL.consult = {
    key: "consult", name: "استشاري", desc: "عنوان-خلاصة لكل صفحة، أبرز النقاط والقرارات المطلوبة، مخطط هادئ، الخطوات التالية والمخاطر",
    swatch: `<i style="background:#0b3b26"></i><i style="background:#1b9bd7"></i>`,
    vars: ctx => { const c = colors(ctx.S); return `--navy:${c.p};--blue:${c.a}`; },
    shell, summary, topic,
  };
})();
