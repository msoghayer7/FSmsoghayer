"use strict";
/* =====================================================================
   Shared data folder (V3)
   Several people / devices work on the same data through one shared
   folder (OneDrive, SharePoint, Teams or a network drive):
   - every device writes ONLY its own file  data-<name>-<device>.json
     (so synced folders never produce "conflicted copy" files)
   - every device reads all data-*.json files and merges them:
       topics  : field by field, newest change wins
       events  : union by id, newest change wins
       deletes : tombstones, deletion wins
   - changes are written immediately; other people's changes are picked
     up every 15 seconds and when the window regains focus.
   Uses the File System Access API (Chrome / Edge on desktop).
   ===================================================================== */
(() => {
  const USER_KEY = "topicTracker.user", DEV_KEY = "topicTracker.device";
  const IDB_NAME = "topicTracker", IDB_STORE = "handles";
  const POLL_MS = 15000;
  const FORMAT = "nrrc-topics-data";
  const supported = typeof window.showDirectoryPicker === "function";

  const state = { dir: null, pending: null, lastSync: 0, mtimes: {}, snap: null, error: "", peers: [], timer: null, chain: Promise.resolve() };

  /* ---------- identity ---------- */
  const getUser = () => { try { return localStorage.getItem(USER_KEY) || ""; } catch (e) { return ""; } };
  const setUser = u => { try { localStorage.setItem(USER_KEY, u); } catch (e) { /* ignore */ } };
  function device() {
    let d = "";
    try { d = localStorage.getItem(DEV_KEY) || ""; } catch (e) { /* ignore */ }
    if (!d) { d = Math.random().toString(36).slice(2, 8); try { localStorage.setItem(DEV_KEY, d); } catch (e) { /* ignore */ } }
    return d;
  }
  const safe = s => (s || "user").trim().replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40) || "user";
  const myFileName = () => `data-${safe(getUser())}-${device()}.json`;

  /* ---------- change stamping (called from save()) ---------- */
  const TOPIC_SKIP = new Set(["events", "uAt", "uBy", "fAt", "cAt"]);
  const topicFields = t => Object.keys(t).filter(k => !TOPIC_SKIP.has(k));
  const evKey = e => { const { uAt, uBy, ...r } = e; return JSON.stringify(r); };
  const setKey = s => { const { uAt, uBy, ...r } = s || {}; return JSON.stringify(r); };

  function snapshot(d) {
    const s = { t: new Map(), e: new Map(), set: setKey(d.settings) };
    (d.topics || []).forEach(t => {
      const f = {};
      topicFields(t).forEach(k => f[k] = JSON.stringify(t[k]));
      s.t.set(t.id, f);
      (t.events || []).forEach(e => s.e.set(e.id, evKey(e)));
    });
    return s;
  }

  function beforeSave(d) {
    const s = state.snap || snapshot({ topics: [], settings: {} });
    const ts = Date.now(), u = getUser();
    d.tomb = d.tomb || { t: {}, e: {} };
    const seenT = new Set(), seenE = new Set();
    d.topics.forEach(t => {
      seenT.add(t.id);
      const old = s.t.get(t.id);
      if (!t.cAt) t.cAt = ts;
      if (!old && !t.cBy) t.cBy = u;
      t.fAt = t.fAt || {};
      let changed = false;
      topicFields(t).forEach(k => {
        if (!old || old[k] !== JSON.stringify(t[k])) { t.fAt[k] = ts; changed = true; }
      });
      if (changed) { t.uAt = ts; t.uBy = u; }
      (t.events || []).forEach(e => {
        seenE.add(e.id);
        if (!s.e.has(e.id) && !e.cBy) { e.cBy = u; e.cAt = ts; }
        if (s.e.get(e.id) !== evKey(e)) { e.uAt = ts; e.uBy = u; }
      });
    });
    s.t.forEach((_, id) => { if (!seenT.has(id)) d.tomb.t[id] = ts; });
    s.e.forEach((_, id) => { if (!seenE.has(id)) d.tomb.e[id] = ts; });
    d.settings = d.settings || {};
    if (setKey(d.settings) !== s.set) { d.settings.uAt = ts; d.settings.uBy = u; }
    state.snap = snapshot(d);
  }

  /* ---------- merge ---------- */
  const refNum = r => +(String(r || "").match(/(\d+)$/) || [0, 0])[1];

  function merge(a, b) {
    const tomb = { t: { ...(a.tomb?.t || {}) }, e: { ...(a.tomb?.e || {}) } };
    ["t", "e"].forEach(k => Object.entries(b.tomb?.[k] || {}).forEach(([id, at]) => tomb[k][id] = Math.max(tomb[k][id] || 0, at)));

    const T = new Map();
    for (const src of [a, b]) for (const t of src.topics || []) {
      if (tomb.t[t.id]) continue;
      const cur = T.get(t.id);
      if (!cur) { T.set(t.id, { ...t, fAt: { ...(t.fAt || {}) }, events: [...(t.events || [])] }); continue; }
      const out = { ...cur, fAt: { ...cur.fAt } };
      const keys = new Set([...Object.keys(cur), ...Object.keys(t)].filter(k => !TOPIC_SKIP.has(k)));
      keys.forEach(k => {
        const ta = (t.fAt || {})[k] ?? t.uAt ?? 0, ca = cur.fAt[k] ?? cur.uAt ?? 0;
        if (ta > ca) { out[k] = t[k]; out.fAt[k] = ta; }
      });
      if ((t.uAt || 0) > (cur.uAt || 0)) { out.uAt = t.uAt; out.uBy = t.uBy; }
      out.cAt = Math.min(cur.cAt || Infinity, t.cAt || Infinity);
      if (!isFinite(out.cAt)) delete out.cAt;
      const evs = new Map();
      [...cur.events, ...(t.events || [])].forEach(e => { const c = evs.get(e.id); if (!c || (e.uAt || 0) > (c.uAt || 0)) evs.set(e.id, e); });
      out.events = [...evs.values()];
      T.set(t.id, out);
    }
    const topics = [...T.values()];
    topics.forEach(t => {
      t.events = t.events.filter(e => !tomb.e[e.id]);
      t.evSeq = Math.max(t.evSeq || 0, ...t.events.map(e => e.seq || 0));
    });

    // two devices may have created topics with the same reference number at the same time:
    // keep the oldest, renumber the others (deterministic, so every device gets the same result)
    let seq = Math.max(a.seq || 0, b.seq || 0, ...topics.map(t => refNum(t.ref)));
    const byRef = new Map();
    [...topics].sort((x, y) => (x.cAt || 0) - (y.cAt || 0) || String(x.id).localeCompare(String(y.id))).forEach(t => {
      if (byRef.has(t.ref)) {
        seq += 1;
        t.ref = "M-" + String(seq).padStart(3, "0");
        t.fAt = { ...(t.fAt || {}), ref: (t.cAt || 0) + 1 };
      }
      byRef.set(t.ref, t);
    });

    const sa = a.settings || {}, sb = b.settings || {};
    const settings = (sb.uAt || 0) > (sa.uAt || 0) ? sb : sa;
    return { seq, topics, settings, tomb };
  }

  /* ---------- folder I/O ---------- */
  async function readAll() {
    const out = [];
    for await (const [name, h] of state.dir.entries()) {
      if (h.kind !== "file" || !/^data-.*\.json$/i.test(name)) continue;
      const f = await h.getFile();
      state.mtimes[name] = f.lastModified;
      try {
        const d = JSON.parse(await f.text());
        if (d && Array.isArray(d.topics)) out.push({ name, d });
      } catch (e) { console.warn("skipping unreadable file", name, e); }
    }
    return out;
  }

  async function writeMine() {
    const fh = await state.dir.getFileHandle(myFileName(), { create: true });
    const w = await fh.createWritable();
    await w.write(JSON.stringify({ format: FORMAT, app: (document.getElementById("appVer") || {}).textContent || "",
      savedBy: getUser(), savedAt: Date.now(), device: device(), ...db }, null, 1));
    await w.close();
    state.mtimes[myFileName()] = (await fh.getFile()).lastModified;
  }

  // run sync steps one after another
  const queue = fn => (state.chain = state.chain.then(fn).catch(err => { state.error = err.message || String(err); console.error(err); renderStatus(); }));

  async function syncNow(write) {
    if (!state.dir) return;
    const files = await readAll();
    const before = JSON.stringify(db.topics) + JSON.stringify(db.settings);
    let m = { seq: db.seq, topics: db.topics, settings: db.settings, tomb: db.tomb || { t: {}, e: {} } };
    files.forEach(({ d }) => { m = merge(m, d); });
    migrateTopics(m.topics);
    db = m;
    state.snap = snapshot(db);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* ignore */ }
    state.peers = files.filter(f => f.name !== myFileName()).map(f => ({ by: f.d.savedBy || "؟", at: f.d.savedAt || 0 }));
    if (write || !files.some(f => f.name === myFileName())) await writeMine();
    state.lastSync = Date.now();
    state.error = "";
    if (JSON.stringify(db.topics) + JSON.stringify(db.settings) !== before) refreshUI();
    renderStatus();
  }

  async function changedOnDisk() {
    for await (const [name, h] of state.dir.entries()) {
      if (h.kind !== "file" || !/^data-.*\.json$/i.test(name)) continue;
      if ((await h.getFile()).lastModified !== state.mtimes[name]) return true;
    }
    return false;
  }

  function refreshUI() {
    if (typeof renderHeader === "function") renderHeader();
    if (ui.view === "detail") { if (getTopic(ui.current)) renderDetail(); else showList(); }
    else renderList();
  }

  /* ---------- remembered folder (IndexedDB) ---------- */
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function storeHandle(h) {
    const d = await idb();
    await new Promise((res, rej) => {
      const tx = d.transaction(IDB_STORE, "readwrite");
      if (h) tx.objectStore(IDB_STORE).put(h, "dir"); else tx.objectStore(IDB_STORE).delete("dir");
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  }
  async function loadHandle() {
    const d = await idb();
    return new Promise(res => {
      const r = d.transaction(IDB_STORE).objectStore(IDB_STORE).get("dir");
      r.onsuccess = () => res(r.result || null); r.onerror = () => res(null);
    });
  }

  /* ---------- connect / disconnect ---------- */
  async function permitted(h, ask) {
    if (!h.queryPermission) return true;
    if ((await h.queryPermission({ mode: "readwrite" })) === "granted") return true;
    return ask && (await h.requestPermission({ mode: "readwrite" })) === "granted";
  }

  async function connect(h) {
    if (!(await permitted(h, true))) throw new Error("لم يُمنح إذن الوصول إلى المجلد.");
    state.dir = h; state.pending = null;
    try { await storeHandle(h); } catch (e) { /* handle can't be remembered (e.g. test double) */ }
    await queue(() => syncNow(true));
    clearInterval(state.timer);
    state.timer = setInterval(poll, POLL_MS);
    renderStatus();
  }

  function poll() {
    if (!state.dir || document.visibilityState !== "visible") return;
    queue(async () => { if (await changedOnDisk()) await syncNow(false); });
  }

  async function disconnect() {
    clearInterval(state.timer);
    state.dir = null; state.pending = null; state.peers = [];
    try { await storeHandle(null); } catch (e) { /* ignore */ }
    renderStatus();
  }

  /* ---------- UI ---------- */
  const hm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const ymd = t => { const d = new Date(t); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`; };

  function renderStatus() {
    const el = document.getElementById("syncPill");
    if (!el) return;
    let cls = "local", txt = "💻 على هذا الجهاز فقط";
    if (state.dir) { cls = state.error ? "err" : "on"; txt = state.error ? "⚠ تعذّرت المزامنة" : `🔗 مشترك · ${state.lastSync ? "آخر مزامنة " + hm(state.lastSync) : "جارٍ…"}`; }
    else if (state.pending) { cls = "err"; txt = "🔗 اضغط لإعادة الاتصال بالمجلد المشترك"; }
    el.className = "sync-pill " + cls;
    el.textContent = txt;
    const st = document.getElementById("shareStatus");
    if (st) {
      st.innerHTML = state.dir
        ? `<b>متصل بالمجلد:</b> ${esc(state.dir.name || "")}<br><b>ملفك:</b> ${esc(myFileName())}<br>
           <b>آخر مزامنة:</b> ${state.lastSync ? hm(state.lastSync) : "—"}${state.error ? `<br><span style="color:var(--danger)">${esc(state.error)}</span>` : ""}
           ${state.peers.length ? `<br><b>مستخدمون آخرون في المجلد:</b> ${state.peers.map(p => `${esc(p.by)} (آخر حفظ ${p.at ? ymd(p.at) + " " + hm(p.at) : "—"})`).join("، ")}` : ""}`
        : state.pending ? "المجلد المشترك محفوظ لكن يحتاج إذن الوصول من جديد – اضغط «اختيار المجلد المشترك» أو شارة المزامنة في الأعلى."
        : "البيانات محفوظة في هذا المتصفح فقط.";
    }
    const dc = document.getElementById("btnShareOff"); if (dc) dc.classList.toggle("hidden", !state.dir);
    const sn = document.getElementById("btnShareNow"); if (sn) sn.classList.toggle("hidden", !state.dir);
  }

  function openDialog() {
    const f = document.getElementById("shareForm");
    f.user.value = getUser();
    document.getElementById("shareUnsupported").classList.toggle("hidden", supported);
    document.getElementById("btnShareDir").disabled = !supported;
    renderStatus();
    document.getElementById("dlgShare").showModal();
  }

  function requireUser() {
    const u = document.getElementById("shareForm").user.value.trim();
    if (!u) { alert("اكتب اسمك أولاً – يظهر للآخرين بجانب التعديلات."); return false; }
    setUser(u);
    return true;
  }

  async function pickFolder() {
    if (!requireUser()) return;
    try {
      const h = state.pending && confirm("إعادة الاتصال بالمجلد المشترك المحفوظ؟ (إلغاء = اختيار مجلد آخر)")
        ? state.pending
        : await window.showDirectoryPicker({ id: "nrrc-topics", mode: "readwrite" });
      await connect(h);
      toast("تم الاتصال بالمجلد المشترك");
    } catch (e) {
      if (e.name !== "AbortError") alert("تعذّر الاتصال بالمجلد: " + e.message);
    }
  }

  async function reconnect() {
    if (!state.pending) { openDialog(); return; }
    if (!getUser()) { openDialog(); return; }
    try { await connect(state.pending); toast("تمت إعادة الاتصال بالمجلد المشترك"); }
    catch (e) { alert(e.message); }
  }

  async function init() {
    state.snap = snapshot(db);
    renderStatus();
    if (!supported || !window.indexedDB) return;
    let h = null;
    try { h = await loadHandle(); } catch (e) { /* ignore */ }
    if (!h) return;
    if (getUser() && await permitted(h, false).catch(() => false)) await connect(h).catch(e => { state.error = e.message; renderStatus(); });
    else { state.pending = h; renderStatus(); }
  }

  document.getElementById("btnShare").onclick = openDialog;
  document.getElementById("syncPill").onclick = () => (state.pending && !state.dir ? reconnect() : openDialog());
  document.getElementById("btnShareDir").onclick = pickFolder;
  document.getElementById("btnShareNow").onclick = () => queue(() => syncNow(true)).then(() => toast("تمت المزامنة"));
  document.getElementById("btnShareOff").onclick = async () => {
    if (!confirm("قطع الاتصال بالمجلد المشترك؟ ستبقى نسخة من البيانات على هذا الجهاز.")) return;
    await disconnect(); toast("تم قطع الاتصال – العمل الآن على هذا الجهاز فقط");
  };
  document.getElementById("shareForm").addEventListener("submit", ev => {
    if (ev.submitter?.value !== "ok") return;
    const u = ev.target.user.value.trim();
    if (u) setUser(u);
  });
  window.addEventListener("focus", poll);

  window.Sync = {
    beforeSave,
    afterSave() { if (state.dir) queue(() => syncNow(true)); },
    user: getUser,
    connectHandle: connect,       // used by automated tests
    syncNow: () => queue(() => syncNow(false)),
    merge,
    get connected() { return !!state.dir; },
  };
  init();
})();
