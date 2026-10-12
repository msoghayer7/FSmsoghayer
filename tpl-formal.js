"use strict";
/* =====================================================================
   Report template (أ): رسمي حكومي
   letterhead, numbered sections, ruled tables, table-based Gantt,
   numbered milestone strip, action log, signature block
   ===================================================================== */
(() => {
  const ORD = ["أولاً", "ثانياً", "ثالثاً", "رابعاً", "خامساً", "سادساً"];
  const STC = { open: "#1f4e79", progress: "#a8853a", hold: "#7a7a7a", closed: "#0e4d3a" };
  const RED = "#9b1c1c";

  const emblem = c => `<svg class="emb" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="none" stroke="${c.a}" stroke-width="1.2"/><circle cx="32" cy="32" r="26" fill="${c.p}"/>
    <path d="M32 14l4.5 9.5 10.5 1.4-7.7 7.2 2 10.4L32 37.6l-9.3 4.9 2-10.4-7.7-7.2 10.5-1.4z" fill="none" stroke="#e2c27a" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M20 46c4 3 8 4.5 12 4.5S40 49 44 46" fill="none" stroke="#e2c27a" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  const colors = S => S.customColors ? { p: S.primary, a: S.accent } : { p: "#066d39", a: "#cda053" };

  function shell(ctx, page, first) {
    const S = ctx.S, c = colors(S);
    const logo = ctx.logo ? `<img class="emb" src="${ctx.logo}" alt="">` : emblem(c);
    const org = esc(S.org || "نظام متابعة المواضيع");
    const head = first
      ? `<div class="lh">${ctx.logoWide ? `<div class="r wide"><img src="${ctx.logoWide}" alt="${org}">${S.dept ? `<span>${esc(S.dept)}</span>` : ""}</div><div></div>` : `<div class="r"><b>${org}</b><span>${esc(S.dept)}</span></div>${logo}`}
          <div class="l"><span>الرقم:</span><b><bdi>${esc(S.docNo || "—")}</bdi></b><span>التاريخ:</span><b><bdi>${fmt(todayISO())}</bdi></b>
          <span>المرفقات:</span><b>${page.kind === "topic" ? "—" : "بيان تفصيلي"}</b></div></div><div class="dbl"></div>`
      : `<div class="lh-mini">${ctx.logo ? `<img src="${ctx.logo}" alt="">` : ""}<b>${org}</b><span>${esc(ctx.title)}</span><span><bdi>${fmt(todayISO())}</bdi></span></div><div class="dbl thin"></div>`;
    return `<div class="frame"></div>${head}<div class="pg-body"></div>
      <div class="foot"><span>${esc(S.footer || ctx.title)}</span>${S.classification ? `<span class="cls">التصنيف: ${esc(S.classification)}</span>` : "<span></span>"}
      <span>صفحة <span class="pg-n"></span> من <span class="pg-t"></span></span></div>`;
  }

  const sec = (i, text, legend) => h(`<h2 class="f-h2" data-keep="1">${ORD[i]}: ${text}${legend ? `<small>${legend}</small>` : ""}</h2>`);
  const stIcon = t => `<span class="st"><i style="background:${STC[t.status]}"></i>${STATUS[t.status].ar}</span>`;

  /* ---------- summary ---------- */
  function summary(ctx, topics) {
    const s = stats(topics), today = todayISO();
    let n = 0;
    const out = [];
    out.push(onNewPage(h(`<div class="f-ttl"><h1>${esc(ctx.S.reportTitle)}</h1><p>${esc(ctx.period)} · ${topicsN(s.total)} · النطاق: ${esc(scopeLabel())}</p></div>`), { kind: "summary" }));

    // narrative
    let p = `بلغ عدد المواضيع المشمولة بهذا التقرير <b>${topicsN(s.total)}</b>`;
    p += s.closed ? `، أُقفل منها <b>${s.closed}</b>` : "، لم يُقفل أي منها بعد";
    if (s.active) p += ` ولا يزال <b>${s.active}</b> قيد المتابعة${s.hold ? `، منها <b>${s.hold}</b> معلّق` : ""}`;
    p += ".";
    if (s.overdue.length === 1) p += ` وتجاوز موضوع <b>«${esc(s.overdue[0].title)}»</b> تاريخ استحقاقه بـ <b class="red">${dur(lateDays(s.overdue[0]))}</b>.`;
    else if (s.overdue.length) p += ` وتجاوزت <b class="red">${topicsN(s.overdue.length)}</b> تواريخ استحقاقها، أكثرها تأخراً «${esc(s.overdue.sort((a, b) => lateDays(b) - lateDays(a))[0].title)}» بـ ${dur(lateDays(s.overdue[0]))}.`;
    else if (s.active) p += " ولا يوجد أي موضوع متأخر عن تاريخ استحقاقه.";
    if (s.avgClose !== null) p += ` وبلغ متوسط مدة إقفال المواضيع المنجزة <b>${dur(s.avgClose)}</b>.`;
    if (s.stale.length) p += ` ويُلاحظ عدم تسجيل أي إجراء على ${topicsN(s.stale.length)} منذ أكثر من أسبوعين.`;
    out.push(sec(n++, "الملخص التنفيذي"));
    out.push(h(`<p class="f-para">${p}</p>`));
    out.push(h(`<div class="f-stats">
      <div><b>${s.total}</b><span>إجمالي المواضيع</span></div><div><b>${s.open}</b><span>مفتوح</span></div><div><b>${s.progress}</b><span>قيد الإجراء</span></div>
      <div><b>${s.hold}</b><span>معلّق</span></div><div><b class="red">${s.overdue.length}</b><span>متأخر عن الاستحقاق</span></div><div><b>${s.closed}</b><span>مقفل</span></div></div>`));

    // table + month Gantt
    const maxD = [today, ...topics.map(t => endDate(t)), ...topics.map(t => t.dueDate)].filter(Boolean).sort().pop();
    const B = monthBuckets(s.from, maxD, 7);
    const T = toUTC(today);
    const cells = t => B.map(b => {
      const w = b.e - b.s, at = u => (u - b.s) / w * 100;
      let x = "";
      const a = Math.max(toUTC(t.openDate), b.s), e = Math.min(toUTC(endDate(t)) + DAY_MS, b.e);
      if (e > a) x += `<span class="bar" style="right:${at(a)}%;width:${(e - a) / w * 100}%;background:${STC[t.status]}"></span>`;
      realEvents(t).forEach(v => { const u = toUTC(v.date); if (u >= b.s && u < b.e) x += `<span class="ms" style="right:${at(u)}%"></span>`; });
      if (t.dueDate && t.status !== "closed") { const u = toUTC(t.dueDate); if (u >= b.s && u < b.e) x += `<span class="due" style="right:${at(u)}%"></span>`; }
      if (T >= b.s && T < b.e) x += `<span class="today" style="right:${at(T)}%"></span>`;
      return `<td class="c">${x}</td>`;
    }).join("");
    out.push(sec(n++, "بيان المواضيع وجدولها الزمني", "◆ إجراء مسجّل &nbsp; ┆ تاريخ الاستحقاق &nbsp; │ تاريخ التقرير"));
    out.push(h(`<table class="f-tbl gm" data-split data-cont="بيان المواضيع وجدولها الزمني"><thead class="split-head"><tr>
      <th style="width:26px">م</th><th style="width:54px">المرجع</th><th>الموضوع</th><th style="width:100px">المسؤول</th><th style="width:86px">الحالة</th><th style="width:72px">الاستحقاق</th>
      ${B.map(b => `<th class="m">${b.label}</th>`).join("")}</tr></thead><tbody class="split-body">
      ${topics.map((t, i) => `<tr><td class="num">${i + 1}</td><td class="num">${esc(t.ref)}</td><td>${esc(t.title)}</td><td>${esc(t.owner) || "—"}</td>
        <td>${stIcon(t)}</td><td class="num ${isOverdue(t) ? "red" : ""}">${fmt(t.dueDate)}</td>${cells(t)}</tr>`).join("")}
      </tbody></table>`));

    // latest updates
    const dec = decisionsOf(topics);
    const latest = topics.flatMap(t => realEvents(t).map(e => ({ t, e }))).sort((a, b) => b.e.date.localeCompare(a.e.date) || b.e.seq - a.e.seq).slice(0, dec.length ? 4 : 6);
    if (latest.length) {
      out.push(sec(n++, "أبرز المستجدات"));
      out.push(h(`<table class="f-tbl" data-split data-cont="أبرز المستجدات"><thead class="split-head"><tr><th style="width:26px">م</th><th style="width:82px">التاريخ</th><th style="width:54px">المرجع</th><th style="width:120px">النوع / الأداة</th><th>التفاصيل</th></tr></thead>
        <tbody class="split-body">${latest.map(({ t, e }, i) => `<tr><td class="num">${i + 1}</td><td class="num">${fmt(e.date)}</td><td class="num">${esc(t.ref)}</td><td>${evLabel(e)}</td>
        <td>${esc(clip(e.text, 140))} <span class="mut">– ${esc(t.title)}</span></td></tr>`).join("")}</tbody></table>`));
    }

    // decisions
    if (dec.length) {
      out.push(sec(n++, "القرارات والتوجيهات المطلوبة"));
      out.push(h(`<table class="f-tbl" data-split data-cont="القرارات المطلوبة"><thead class="split-head"><tr><th style="width:26px">م</th><th style="width:54px">المرجع</th><th style="width:30%">الموضوع</th><th>القرار / التوجيه المطلوب</th></tr></thead>
        <tbody class="split-body">${dec.map(({ t, text }, i) => `<tr><td class="num">${i + 1}</td><td class="num">${esc(t.ref)}</td><td>${esc(t.title)}</td><td>${esc(text)}</td></tr>`).join("")}</tbody></table>`));
    }
    return out;
  }

  /* ---------- numbered milestone strip with collision-free labels ---------- */
  function strip(t) {
    const evs = sortedEvents(t), today = todayISO();
    const items = evs.map((e, i) => ({ d: e.date, n: i + 1, l1: fmt(e.date), l2: e.tool && TOOLS[e.tool] ? TOOLS[e.tool].ar : evTypeAr(e), kind: e.type === "close" ? "end" : "ev" }));
    if (t.dueDate) items.push({ d: t.dueDate, l1: fmt(t.dueDate), l2: "الاستحقاق", kind: "due" });
    if (t.status !== "closed") items.push({ d: today, l1: fmt(today), l2: "تاريخ التقرير", kind: "now" });
    const sc = timeScale(items.map(i => i.d), 0.01);
    const W = 880, LW = 104, GAPPX = 24;
    // keep event markers at least GAPPX apart (dates may be close together)
    const evIt = items.filter(i => i.n).sort((a, b) => a.d.localeCompare(b.d) || a.n - b.n);
    let prev = -1e9;
    evIt.forEach(i => { const px = Math.max(sc.x(i.d) / 100 * W, prev + GAPPX); i.px = px; prev = px; });
    if (prev > W) evIt.forEach(i => i.px = i.px * W / prev);
    const levels = ["u1", "d1", "u2", "d2"], last = { u1: -1e9, d1: -1e9, u2: -1e9, d2: -1e9 };
    items.sort((a, b) => a.d.localeCompare(b.d) || (a.n || 99) - (b.n || 99)).forEach(it => {
      const px = it.px ?? sc.x(it.d) / 100 * W;
      it.x = px / W * 100;
      let lv = levels.find(l => px - LW / 2 >= last[l] + 4);
      if (!lv) lv = levels.reduce((a, b) => last[a] < last[b] ? a : b);
      it.lv = lv; last[lv] = px + LW / 2;
    });
    const used2 = items.some(i => i.lv === "u2" || i.lv === "d2");
    const brief = evs.length > 14;
    return h(`<div class="f-strip ${used2 ? "tall" : ""}"><div class="ln"></div>
      ${items.map(it => {
        const red = it.kind === "due" || it.kind === "now";
        const mark = it.kind === "due" ? `<span class="due" style="right:${it.x}%"></span>`
          : it.kind === "now" ? `<span class="now" style="right:${it.x}%"></span>`
          : `<span class="pt ${it.kind === "end" ? "end" : ""}" style="right:${it.x}%">${it.n}</span>`;
        return `${mark}<div class="lb ${it.lv} ${red ? "red" : ""}" style="right:${it.x}%"><b>${it.l1}</b>${brief && !red ? "" : it.l2}</div>`;
      }).join("")}</div>`);
  }

  /* ---------- per topic ---------- */
  function topic(ctx, t) {
    let n = 0;
    const out = [], evs = sortedEvents(t);
    out.push(onNewPage(h(`<div class="f-ttl"><h1>${esc(t.title)}</h1><p>المرجع ${esc(t.ref)}${t.category ? " · " + esc(t.category) : ""}</p></div>`), { kind: "topic", t }));
    out.push(sec(n++, "البيانات"));
    const late = lateDays(t);
    out.push(h(`<div class="f-info">
      <div><span>الجهة ذات العلاقة:</span>${esc(t.party) || "—"}</div><div><span>المسؤول:</span>${esc(t.owner) || "—"}</div><div><span>الأولوية:</span>${PRIORITY[t.priority]}</div><div><span>الحالة:</span>${STATUS[t.status].ar}</div>
      <div><span>تاريخ الفتح:</span>${fmt(t.openDate)}</div><div><span>تاريخ الاستحقاق:</span>${fmt(t.dueDate)}</div>
      <div><span>${t.status === "closed" ? "تاريخ الإقفال:" : "مدة المتابعة:"}</span>${t.status === "closed" ? fmt(t.closeDate) : dur(ageDays(t))}</div>
      <div><span>${t.status === "closed" ? "مدة المعالجة:" : "التأخير:"}</span>${t.status === "closed" ? dur(ageDays(t)) : late ? `<b class="red">${dur(late)}</b>` : "لا يوجد"}</div>
      ${t.description ? `<div class="wide"><span>الخلفية:</span>${esc(t.description)}</div>` : ""}</div>`));
    out.push(sec(n++, "المسار الزمني"));
    out.push(strip(t));
    out.push(sec(n++, "سجل الإجراءات"));
    out.push(h(`<table class="f-tbl log" data-split data-cont="سجل الإجراءات – ${esc(t.ref)}"><thead class="split-head"><tr><th style="width:30px">م</th><th style="width:82px">التاريخ</th><th style="width:64px">النوع</th><th style="width:96px">الأداة</th><th>التفاصيل</th><th style="width:118px">المنفذ</th><th style="width:118px">المستلم</th><th style="width:64px">الفاصل</th></tr></thead>
      <tbody class="split-body">${evs.map((e, i) => `<tr><td class="num">${i + 1}</td><td class="num">${fmt(e.date)}</td><td>${evTypeAr(e)}</td><td>${e.tool && TOOLS[e.tool] ? TOOLS[e.tool].ar : "—"}</td><td class="pre">${esc(e.text)}</td><td>${esc(e.by) || "—"}</td><td>${esc(e.to) || "—"}</td>
        <td class="num">${i ? dur(daysBetween(evs[i - 1].date, e.date)) : "—"}</td></tr>`).join("")}</tbody></table>`));
    out.push(h(`<div class="f-note"><b>${t.status === "closed" ? "نتيجة الإقفال" : "الوضع الحالي"}: </b>${topicHeadline(t)}.</div>`));
    const nx = lines(t.nextSteps), rk = lines(t.risks);
    if (nx.length || rk.length || (t.decision || "").trim()) {
      out.push(sec(n++, "الخطوات التالية والملاحظات"));
      out.push(h(`<div class="f-two">
        ${nx.length ? `<div><h4>الخطوات التالية</h4><ol>${nx.map(x => `<li>${esc(x)}</li>`).join("")}</ol></div>` : ""}
        ${rk.length ? `<div><h4>المخاطر</h4><ol>${rk.map(x => `<li>${esc(x)}</li>`).join("")}</ol></div>` : ""}
        ${(t.decision || "").trim() ? `<div><h4>القرار المطلوب</h4><p>${esc(t.decision)}</p></div>` : ""}</div>`));
    }
    return out;
  }

  function closing(ctx) {
    if (!ctx.opts.signatures) return [];
    const S = ctx.S;
    return [h(`<div class="f-sig"><div><b>إعداد</b>${esc(S.sigPrep || S.preparedBy) || "&nbsp;"}</div><div><b>مراجعة</b>${esc(S.sigReview) || "&nbsp;"}</div><div><b>اعتماد</b>${esc(S.sigApprove) || "&nbsp;"}</div></div>`)];
  }

  TPL.formal = {
    key: "formal", name: "رسمي حكومي", desc: "ترويسة رسمية، فقرة ملخص، جداول مسطّرة، سجل إجراءات مرقّم وخانات توقيع",
    swatch: `<i style="background:#066d39"></i><i style="background:#cda053"></i>`,
    vars: ctx => { const c = colors(ctx.S); return `--g:${c.p};--gold:${c.a}`; },
    shell, summary, topic, closing,
  };
})();
