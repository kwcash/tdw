#!/usr/bin/env python3 -I
"""Version 12 of the bundle: progress to and from a file, and a feedback link that stays hidden until the owner sets an address.
A new page at #/progress saves this build's save as a file and loads one back. Loading shows what the file holds first and
replaces the progress only after a second tap. The game checks every field of a loaded file and keeps only what this build knows.
The engine and the record module do not change.
Reads out/game.v11.js, out/record.v11.js, parts/style.v11.css and parts/help.json. Writes out/game.js, out/engine.js, out/record.js,
parts/record.js and parts/style.css."""
import re, sys, json, pathlib
root = pathlib.Path(__file__).parent

def patch(src, pairs, label):
    s = src
    for i, (old, new) in enumerate(pairs):
        n = s.count(old)
        if n != 1:
            sys.exit(f"{label}: anchor #{i} matched {n} times (need exactly 1):\n{old[:170]}")
        s = s.replace(old, new)
    return s

HELP = json.loads((root / 'parts/help.json').read_text(encoding='utf-8'))
help_js = json.dumps(HELP, ensure_ascii=False, separators=(',', ':'))
assert '\n' not in help_js and '</' not in help_js
email = HELP['ui']['feedback']['email']
assert email == '' or re.fullmatch(r'[^\s@<>"]+@[^\s@<>"]+\.[A-Za-z]{2,}', email), 'the feedback address must be a plain email address'

g = (root / 'out/game.v11.js').read_text()
m = re.findall(r'\n  const HELP = \{.*\};\n', g)
if len(m) != 1: sys.exit('game: the HELP line matched %d times' % len(m))
g = g.replace(m[0], '\n  const HELP = ' + help_js + ';\n')
g = patch(g, [
 # ---------------- demo shim ----------------
 ("""    guides: GUIDES.map(guideOut),""", """    guides: GUIDES.map(guideOut),
    build: KEY,"""),
 ("""  on('POST', /^\\/api\\/demo\\/reset$/""", """  // ---------- version 12: progress to and from a file ----------
  // The file holds this build's save as it stands. Loading one checks every field and keeps only what this build knows,
  // so a file from another build, an edited file or a file from a later version cannot break the game.
  const FILE_FORMAT = 'tdw-progress';
  const BUILD_NAMES = { 'tdw-demo-1': 'the base game', 'tdw-1931-1': 'the 1931 build', 'tdw-2030-1': 'the 2030 build', 'tdw-2026-1': 'the 2026 build' };
  const RUN_MODES = ['free', 'daily', 'arc', 'challenge', 'tutorial', 'guide'];
  const RUN_STATUS = ['live', 'won', 'lost', 'abandoned'];
  const DAY_OK = /^\\d{4}-\\d{2}-\\d{2}$/;
  const SEED_OK = /^[A-Za-z0-9:_-]{1,40}$/;
  const CODE_OK = /^TDW1~[A-Za-z0-9:_~.-]{10,4000}$/;
  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const ownKey = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const nat = (x, max = 1e9) => (Number.isInteger(x) && x >= 0 && x <= max ? x : 0);
  const intIn = (x, lo, hi) => (Number.isInteger(x) && x >= lo && x <= hi ? x : null);
  // A run must fit the rules of its mode, as startRun sets them.
  function fitsMode(r) {
    switch (r.mode) {
      case 'daily': return typeof r.day === 'string' && DAY_OK.test(r.day) && r.seed === `daily:${r.day}` && r.tier === DAILY_TIER && dailyOp(r.day).id === r.op_id;
      case 'tutorial': return r.op_id === (C.tutorial || 'C001') && r.seed === 'tutorial' && r.tier === 1;
      case 'guide': { const gd = typeof r.guide === 'string' ? guideById.get(r.guide) : null; return !!gd && gd.op === r.op_id && gd.seed === r.seed && gd.tier === r.tier; }
      case 'arc': { const arc = typeof r.arc_id === 'string' ? arcById.get(r.arc_id) : null; return !!arc && Number.isInteger(r.arc_node) && arc.nodes[r.arc_node] === r.op_id; }
      case 'challenge': return /^[a-z0-9]{6,16}$/.test(r.seed);
      default: return true;
    }
  }
  // The same shape the act route gives an action before the engine sees it.
  function cleanAction(a) {
    const c = { type: String(a.type || '') };
    if (a.intent != null) c.intent = Number(a.intent);
    if (a.domain != null) c.domain = String(a.domain);
    if (a.cadre != null) c.cadre = String(a.cadre);
    if (a.holding != null) c.holding = String(a.holding);
    if (a.move != null) c.move = String(a.move);
    return c;
  }
  function cleanRun(id, r) {
    if (!isObj(r) || r.id !== id || !RUN_MODES.includes(r.mode) || !RUN_STATUS.includes(r.status) || typeof r.op_id !== 'string' || !opById.has(r.op_id)) return null;
    if (typeof r.seed !== 'string' || !SEED_OK.test(r.seed) || intIn(r.tier, 1, 7) == null || !fitsMode(r)) return null;
    const out = {
      id, mode: r.mode, op_id: r.op_id, seed: r.seed, tier: r.tier,
      lens: typeof r.lens === 'string' && ownKey(E.LENSES, r.lens) ? r.lens : null,
      doctrine: typeof r.doctrine === 'string' && ownKey(E.DOCTRINES, r.doctrine) ? r.doctrine : null,
      day: r.mode === 'daily' ? r.day : null,
      arc_id: r.mode === 'arc' ? r.arc_id : null, arc_node: r.mode === 'arc' ? r.arc_node : null,
      scored: r.scored ? 1 : 0, status: r.status,
      score: intIn(r.score, -100000, 100000), stars: intIn(r.stars, 0, 3), turns: intIn(r.turns, 0, 99), xp: intIn(r.xp, 0, 100000),
      created: intIn(r.created, 0, 1e14), maxTurns: intIn(r.maxTurns, 1, 99),
      code: typeof r.code === 'string' && CODE_OK.test(r.code) ? r.code : null,
    };
    if (r.finished != null) out.finished = intIn(r.finished, 0, 1e14);
    if (r.mode === 'guide') {
      out.guide = r.guide;
      const steps = guideById.get(r.guide).steps.map((x) => x.id);
      if (Array.isArray(r.coach)) out.coach = r.coach.filter((x) => steps.includes(x));
    }
    if (out.status !== 'live') return out;
    // A live run keeps no board from the file. The game builds it again from the seed and replays the moves on record,
    // as the result code does, so a doctored board never reaches the page. A run whose moves do not replay goes.
    if (!Array.isArray(r.log) || r.log.length > 400) return null;
    try {
      let S = E.newGame(opById.get(out.op_id), { seed: out.seed, tier: out.tier, lens: out.lens, doctrine: out.doctrine, mode: out.mode, maxTurns: out.maxTurns || undefined, registry: REG });
      const log = [];
      for (const a of r.log) {
        if (!isObj(a)) return null;
        const c = cleanAction(a);
        S = JSON.parse(JSON.stringify(S));
        E.act(S, c);
        log.push(c);
        if (S.over) return null;
      }
      out.state = JSON.parse(JSON.stringify(S)); out.log = log;
    } catch { return null; }
    return out;
  }
  function cleanSave(s) {
    if (!isObj(s) || s.v !== 1) fail(400, 'This file holds no progress this game can read.');
    const d = blank();
    if (isObj(s.user) && typeof s.user.username === 'string' && /^[A-Za-z0-9_]{3,24}$/.test(s.user.username)) d.user = { id: 1, username: s.user.username };
    // Live runs come first, the newest one of each mode, and then the newest finished runs, up to 5000 in all.
    if (isObj(s.runs)) {
      const ids = Object.keys(s.runs).filter((k) => /^[1-9]\\d{0,6}$/.test(k)).map(Number).sort((x, y) => y - x);
      const live = new Set(); let kept = 0;
      for (const pass of ['live', 'done']) for (const id of ids) {
        if (kept >= 5000) break;
        const r = s.runs[String(id)];
        if (!isObj(r) || (pass === 'live') !== (r.status === 'live')) continue;
        if (pass === 'live' && live.has(r.mode)) continue;
        const c = cleanRun(id, r);
        if (c) { d.runs[id] = c; kept++; if (pass === 'live') live.add(c.mode); }
      }
    }
    d.seq = Math.max(nat(s.seq, 1e7), 0, ...Object.keys(d.runs).map(Number));
    for (const k of ['xp', 'won', 'played', 'days']) d[k] = nat(s[k]);
    d.lastDaily = typeof s.lastDaily === 'string' && DAY_OK.test(s.lastDaily) ? s.lastDaily : null;
    if (isObj(s.codex)) for (const [c, x] of Object.entries(s.codex)) if (E.CODES.includes(c) && isObj(x)) d.codex[c] = { seen: x.seen ? 1 : 0, captured: x.captured ? 1 : 0 };
    if (isObj(s.unlocks)) for (const [k, t] of Object.entries(s.unlocks)) if (/^(?:(?:lens|doctrine|arc|group|codex|guide):[A-Za-z0-9 _-]{1,40}|tutorial)$/.test(k) && Number.isFinite(t)) d.unlocks[k] = t;
    if (isObj(s.arcs)) for (const [a, nodes] of Object.entries(s.arcs)) {
      if (!arcById.has(a) || !isObj(nodes)) continue;
      const n = arcById.get(a).nodes.length; const keep = {};
      for (const [i, st] of Object.entries(nodes)) if (/^(?:0|[1-9]\\d?)$/.test(i) && Number(i) < n && intIn(st, 0, 3) != null) keep[i] = st;
      d.arcs[a] = keep;
    }
    if (isObj(s.forecasts)) {
      d.forecasts = {};
      for (const [id, f] of Object.entries(s.forecasts)) if (/^[A-Za-z0-9-]{1,24}$/.test(id) && isObj(f) && intIn(f.p, 1, 99) != null && intIn(f.at, 0, Date.now() + 86400000) != null) d.forecasts[id] = { p: f.p, at: f.at };
    }
    if (Array.isArray(s.hints)) d.hints = s.hints.filter((h) => HINT_IDS.includes(h));
    return d;
  }
  function summaryOf(d) {
    const L = levelOf(d.xp); const cx = Object.values(d.codex);
    const done = Object.values(d.runs).filter((r) => (r.status === 'won' || r.status === 'lost') && r.code);
    return { level: L, title: titleOf(L), xp: d.xp, played: d.played, won: d.won, captured: cx.filter((x) => x.captured).length, records: done.length, forecasts: Object.keys(d.forecasts || {}).length, arcs: Object.keys(d.arcs).length };
  }
  // Another tab that writes the save sends a storage event. This tab drops its copy and reads the save again before it writes.
  if (typeof self.addEventListener === 'function') self.addEventListener('storage', (e) => { if (!e || e.key === KEY || e.key === null) db = null; });
  on('GET', /^\\/api\\/demo\\/summary$/, () => ({ summary: summaryOf(load()), persist }));
  on('GET', /^\\/api\\/demo\\/export$/, () => ({ file: { format: FILE_FORMAT, version: 1, build: KEY, era: C.era || null, exported: new Date().toISOString(), save: JSON.parse(JSON.stringify(load())) } }));
  on('POST', /^\\/api\\/demo\\/import$/, (m, q, body) => {
    const f = body && body.file;
    if (!isObj(f) || f.format !== FILE_FORMAT || !(Number.isInteger(f.version) && f.version >= 1)) fail(400, 'This is not a TDW progress file.');
    if (f.version > 1) fail(400, 'This file comes from a newer version of the game. Update this build first.');
    if (f.build !== KEY) fail(400, `This file holds progress for another build of the game. It comes from ${typeof f.build === 'string' && ownKey(BUILD_NAMES, f.build) ? BUILD_NAMES[f.build] : 'a build this one does not know'}.`);
    const clean = cleanSave(f.save);
    if (body.apply !== true) return { summary: summaryOf(clean), applied: false, persist };
    // The minutes played today stay with this browser, so the break prompt keeps counting.
    clean.activity = isObj(load().activity) ? load().activity : {};
    db = clean;
    save();
    return { summary: summaryOf(db), applied: true, persist };
  });

  on('POST', /^\\/api\\/demo\\/reset$/"""),

 # ---------------- client: links to the page ----------------
 ("""<a class="btn" href="#/glossary">${esc(HELP.ui.glossLink)}</a></p>""", """<a class="btn" href="#/glossary">${esc(HELP.ui.glossLink)}</a>${DEMO ? ` <a class="btn" href="#/progress">${esc(HELP.ui.progress.title)}</a>` : ''}</p>"""),
 ("""${DEMO ? '<div class="card"><div class="label">Demo progress</div><p class="small">Your level, codex and campaign live in this browser only.</p><button type="button" id="reset">Clear my progress</button></div>' : ''}""",
  """${DEMO ? `<div class="card"><div class="label">Demo progress</div><p class="small">Your level, codex and campaign live in this browser only. <a href="#/progress">${esc(HELP.ui.progress.link)}</a>.</p><button type="button" id="reset">Clear my progress</button></div>${feedbackHtml()}` : ''}"""),
 ("""      <h2>Your results</h2>""", """      <h2>Your results</h2>
      ${DEMO ? `<p class="small"><a href="#/progress">${esc(HELP.ui.progress.link)}</a></p>` : ''}"""),

 # ---------------- client: the page ----------------
 ("""  // ---------- glossary ----------""", """  // ---------- version 12: your progress, to and from a file ----------
  const PX = HELP.ui.progress;
  function sumTable(s) {
    const rows = [['level', `${s.level}, ${s.title}`], ['xp', s.xp], ['played', s.played], ['won', s.won], ['captured', `${s.captured} of 36`], ['records', s.records]]
      .concat(meta() && meta().forecast ? [['forecasts', s.forecasts]] : [], [['arcs', s.arcs]]);
    return `<table class="psum">${rows.map(([k, v]) => `<tr><th scope="row">${esc(PX.rows[k])}</th><td>${esc(String(v))}</td></tr>`).join('')}</table>`;
  }
  // The feedback link shows only when parts/help.json names an address. It opens the player's own mail app and sends nothing itself.
  function feedbackHtml() {
    const f = HELP.ui.feedback;
    if (!f || !f.email) return '';
    const subject = `${f.subject} · ${document.title}`;
    const body = `${f.intro}\\n\\n${document.title} · ${location.href.split('#')[0]}`;
    const href = `mailto:${f.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return `<div class="card feedback"><p><a class="btn" href="${esc(href)}">${esc(f.label)}</a></p><p class="small muted">${esc(f.intro)}</p></div>`;
  }
  function saveFile(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  route(/^\\/progress$/, async () => {
    if (!DEMO) { render(`<h1>${esc(PX.title)}</h1><p class="muted">An account keeps your progress in the full game.</p>`); return; }
    const { summary: now, persist } = await api('/demo/summary');
    render(html`
      <h1>${esc(PX.title)}</h1>
      <p>${esc(PX.intro)}</p>
      ${persist === false ? `<p class="err" role="alert">${esc(PX.noStore)}</p>` : ''}
      <section class="card" aria-labelledby="pnow"><h2 id="pnow">${esc(PX.now)}</h2>${sumTable(now)}
        <p class="row"><button type="button" class="primary" id="psave">${esc(PX.save)}</button></p></section>
      <section class="card" aria-labelledby="pload"><h2 id="pload">${esc(PX.load)}</h2>
        <p class="small" id="pnote">${esc(PX.loadNote)}</p>
        <input type="file" id="pfile" accept=".json,application/json" aria-labelledby="pload" aria-describedby="pnote">
        <div id="pout" role="status"></div></section>
      <section class="card"><p class="row"><button type="button" id="pclear">${esc(PX.clear)}</button></p></section>
      ${feedbackHtml()}
    `);
    const fresh = async (msg) => { hintState.seen = null; state.me = null; try { state.me = (await api('/me')).user; } catch { /* none yet */ } T.nav(); toast(msg); location.hash = '#/'; };
    $('#psave').addEventListener('click', async () => {
      try { const { file } = await api('/demo/export'); saveFile(`tdw-progress-${file.build}-${file.exported.slice(0, 10)}.json`, JSON.stringify(file) + '\\n'); toast(PX.saved); }
      catch (e) { toast(e.message); }
    });
    $('#pfile').addEventListener('change', async (e) => {
      const out = $('#pout'); const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (f.size > 10000000) { out.innerHTML = errorBox(PX.tooBig); return; }
      let file;
      try { file = JSON.parse(await f.text()); } catch { out.innerHTML = errorBox(PX.notFile); return; }
      let r;
      try { r = await api('/demo/import', { file }); } catch (err) { out.innerHTML = errorBox(err); return; }
      out.innerHTML = `<h3>${esc(PX.holds)}</h3>${sumTable(r.summary)}<p class="row"><button type="button" class="primary" id="preplace">${esc(PX.replace)}</button></p>`;
      $('#preplace').addEventListener('click', async (ev) => {
        const b = ev.currentTarget;
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = PX.replaceAgain; return; }
        b.disabled = true;
        try { await api('/demo/import', { file, apply: true }); await fresh(PX.loaded); } catch (err) { out.innerHTML = errorBox(err); }
      });
    });
    $('#pclear').addEventListener('click', async (e) => {
      const b = e.currentTarget;
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = PX.clearAgain; return; }
      await api('/demo/reset', {}); await fresh(PX.cleared);
    });
  }, 10);

  // ---------- glossary ----------"""),
], 'game')
(root / 'out/game.js').write_text(g)
cut = g.index('/* TDW demo shim.')
engine = g[:cut].rstrip() + '\n'
assert engine == (root / 'out/engine.v8.js').read_text(), 'the engine part changed'
(root / 'out/engine.js').write_text(engine)
r = (root / 'out/record.v11.js').read_text()
(root / 'out/record.js').write_text(r)
(root / 'parts/record.js').write_text(r)
(root / 'parts/style.css').write_text((root / 'parts/style.v11.css').read_text() + '''
/* ---- version 12: progress to and from a file ---- */
table.psum { border-collapse: collapse; width: 100%; max-width: 420px; margin: 6px 0; }
table.psum th, table.psum td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); font-size: 15px; }
table.psum th { font-weight: 600; color: var(--muted); }
#pfile { max-width: 100%; min-height: 44px; }
''')
print('patched: game, engine, style. record unchanged. OK')
