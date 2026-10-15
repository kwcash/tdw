#!/usr/bin/env python3 -I
"""Version 9 of the bundle: How to play gains Tiers, Holdings, Reach and permits, and Forecast. Each panel shows a first-use hint.
Two guided runs teach holdings and reach on a shipped operation at a fixed tier, seed and clock.
The engine does not change. A guided run makes a result code with the new mode guide, and every earlier code verifies as before.
Reads out/*.v8.js, parts/style.v8.css and parts/help.json. Writes out/game.js, out/engine.js, out/record.js, parts/record.js and parts/style.css."""
import sys, json, pathlib
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
hint_ids = json.dumps(list(HELP['hints'].keys()))

g = (root / 'out/game.v8.js').read_text()
g = patch(g, [
 # ---------------- demo shim ----------------
 ("""  const DAILY_POOL = (C.daily || []).map((id) => opById.get(id)).filter((o) => o && o.kind !== 'watch');""",
  """  const DAILY_POOL = (C.daily || []).map((id) => opById.get(id)).filter((o) => o && o.kind !== 'watch');
  // Guided runs. Each one plays a shipped operation at the guide's tier, seed and clock. The content names them.
  const GUIDES = (C.guides || []).filter((g) => opById.has(g.op));
  const guideById = new Map(GUIDES.map((g) => [g.id, g]));
  const guideFor = (o) => (o.holdings && o.holdings.length && guideById.has('holdings') ? 'holdings' : o.reach && o.reach.length && guideById.has('reach') ? 'reach' : null);
  const guideOut = (g) => ({ id: g.id, title: g.title, blurb: g.blurb, op: g.op, opTitle: opById.get(g.op).title, tier: g.tier, turns: g.turns, steps: g.steps });
  // First-use hints, one per panel. The save keeps the ones the player has read.
  const HINT_IDS = """ + hint_ids + """;"""),
 ("""      best: withBest ? bestOf(o.id) : null,""", """      guide: guideFor(o),
      best: withBest ? bestOf(o.id) : null,"""),
 ("""    counts: { ops: OPS.filter((o) => !o.hidden).length, arcs: ARCS.length, multi: OPS.filter((o) => Array.isArray(o.factions) && o.factions.length > 2).length },""",
  """    counts: { ops: OPS.filter((o) => !o.hidden).length, arcs: ARCS.length, multi: OPS.filter((o) => Array.isArray(o.factions) && o.factions.length > 2).length, holdings: OPS.filter((o) => !o.hidden && Array.isArray(o.holdings) && o.holdings.length).length, reach: OPS.filter((o) => !o.hidden && Array.isArray(o.reach) && o.reach.length).length },
    guides: GUIDES.map(guideOut),"""),
 ("""challenge: challengeOf(run), watch: watchOf(o),""", """challenge: challengeOf(run), guide: run.guide || null, coach: run.mode === 'guide' && Array.isArray(run.coach) ? run.coach.slice() : [], watch: watchOf(o),"""),
 ("""let scored = 1; let maxTurns;""", """let scored = 1; let maxTurns; let guide = null;"""),
 ("""    } else if (mode === 'free') {""", """    } else if (mode === 'guide') {
      const gd = guideById.get(String(body.guide || ''));
      if (!gd) fail(404, 'No such guided run in this build.');
      op = opById.get(gd.op); seed = gd.seed; tier = gd.tier; lens = null; doctrine = null; maxTurns = gd.turns; guide = gd.id;
    } else if (mode === 'free') {"""),
 ("""maxTurns: maxTurns || null, log: [], code: null };""", """maxTurns: maxTurns || null, log: [], code: null, ...(guide ? { guide } : {}) };"""),
 ("""newUnlocks.push(key); } };""", """newUnlocks.push(key); } };
    if (run.mode === 'guide' && run.guide) grant('guide:' + run.guide);"""),
 ("""if (run.mode !== 'tutorial') grant('lens:' + S.dim);""", """if (run.mode !== 'tutorial' && run.mode !== 'guide') grant('lens:' + S.dim);"""),
 ("""tutorialDone: has('tutorial') };""", """tutorialDone: has('tutorial'), guidesDone: GUIDES.filter((g) => has('guide:' + g.id)).map((g) => g.id) };"""),
 ("""  function handle(method, url, body) {""", """  // Coach steps a player dismissed in a guided run. The run keeps them, so they go when the run goes.
  on('POST', /^\\/api\\/runs\\/(\\d+)\\/coach$/, (m, q, body) => {
    need();
    const run = load().runs[Number(m[1])];
    const gd = run && run.mode === 'guide' ? guideById.get(run.guide) : null;
    if (!gd) fail(404, 'No such guided run');
    const step = String((body && body.step) || '');
    if (!gd.steps.some((x) => x.id === step)) fail(400, 'No such step.');
    run.coach = (Array.isArray(run.coach) ? run.coach : []).filter((x) => gd.steps.some((y) => y.id === x));
    if (!run.coach.includes(step)) run.coach.push(step);
    save();
    return { coach: run.coach.slice() };
  });
  on('GET', /^\\/api\\/guides$/, () => ({ guides: GUIDES.map((g) => ({ ...guideOut(g), done: has('guide:' + g.id) })) }));
  const hintsOf = (d) => (Array.isArray(d.hints) ? d.hints.filter((h) => HINT_IDS.includes(h)) : []);
  on('GET', /^\\/api\\/hints$/, () => ({ seen: hintsOf(load()) }));
  on('POST', /^\\/api\\/hints$/, (m, q, body) => {
    const id = String((body && body.id) || '');
    if (!HINT_IDS.includes(id)) fail(400, 'No such hint.');
    const d = load();
    d.hints = hintsOf(d);
    if (!d.hints.includes(id)) d.hints.push(id);
    save();
    return { seen: d.hints.slice() };
  });

  function handle(method, url, body) {"""),
 ("""    const out = { op: brief(o, true), loadout: load().user ? loadout() : null };""", """    const out = { op: brief(o, true), loadout: load().user ? loadout() : null };
    out.guideDone = !!(out.op.guide && has('guide:' + out.op.guide));"""),

 # ---------------- board client ----------------
 ("""  const DEMO = !!window.TDW_DEMO;

  // ---------- icons""", """  const DEMO = !!window.TDW_DEMO;
  // Help text shared by every build. It comes from parts/help.json.
  const HELP = """ + help_js + """;

  // ---------- icons"""),
 ("""tutorial: 'Boot camp', free: 'Operation' };""", """tutorial: 'Boot camp', guide: 'Guided run', free: 'Operation' };"""),
 ("""    if (kind === 'codex') return 'Codex complete';""", """    if (kind === 'codex') return 'Codex complete';
    if (kind === 'guide') return 'Guided run complete';"""),
 ("""  const qs = (h) => Object.fromEntries(new URLSearchParams((h.split('?')[1]) || ''));""", """  const qs = (h) => Object.fromEntries(new URLSearchParams((h.split('?')[1]) || ''));

  // ---------- version 9: first-use hints, guided runs and the new How to play sections ----------
  // A hint shows once per panel. The save keeps the ones the player has read, so they clear with the progress.
  const hintState = { seen: null };
  async function loadHints() {
    if (!hintState.seen) { try { hintState.seen = (await api('/hints')).seen; } catch { hintState.seen = []; } }
    return hintState.seen;
  }
  async function markHint(id) {
    if (!hintState.seen) hintState.seen = [];
    if (!hintState.seen.includes(id)) hintState.seen.push(id);
    try { hintState.seen = (await api('/hints', { id })).seen; } catch { /* kept in memory for this visit */ }
  }
  // The link goes only to a section this build's How to play page shows.
  const howHas = (id) => (id === 'factions' ? counts().multi > 0 : id === 'dimensions' || id === 'groups' || HELP.how.some((s) => s.id === id && howOn()[s.when]));
  function hintHtml(id) {
    const h = HELP.hints[id];
    if (!h || !hintState.seen || hintState.seen.includes(id)) return '';
    return `<aside class="hint" role="note" aria-label="Tip"><p id="hint-${esc(id)}">${esc(h.text)}</p><div class="row"><button type="button" class="hintok" data-hint="${esc(id)}" aria-describedby="hint-${esc(id)}">${esc(HELP.ui.hintOk)}</button>${h.how && howHas(h.how) ? `<a href="#/how?s=${esc(h.how)}" target="_blank" rel="noopener">${esc(HELP.ui.hintMore)}</a>` : ''}</div></aside>`;
  }
  // The board shows one hint at a time, for the first panel in play whose hint is unread. Boot camp and guided runs have their own coach.
  function boardHint(v, mode) {
    if (mode === 'tutorial' || mode === 'guide' || !hintState.seen) return null;
    const on = { factions: !!factionsHtml(v), leaders: !!(v.cadres && v.cadres.length), holdings: !!(v.holdings && v.holdings.length), reach: !!(v.reach && v.reach.length), tier7: v.tier >= 7 };
    return ['factions', 'leaders', 'holdings', 'reach', 'tier7'].find((k) => on[k] && !hintState.seen.includes(k)) || null;
  }
  const guides = () => (meta() && meta().guides) || [];
  const guideOf = (id) => guides().find((x) => x.id === id) || null;
  function guideCards(done) {
    return guides().filter((x) => !(done || []).includes(x.id)).map((x) => `<div class="card feature"><div class="label">${esc(HELP.ui.guideHome)}</div><div class="big">${esc(x.title)}</div><p class="small">${esc(x.blurb)}</p><button type="button" data-guide="${esc(x.id)}">${esc(HELP.ui.guideStart)}</button></div>`).join('');
  }
  function guideOpCard(id, done) {
    const x = done ? null : guideOf(id);
    return x ? `<div class="card guidecard"><div class="label">${esc(HELP.ui.guideOp)}</div><p class="small">${esc(x.blurb)}</p><button type="button" data-guide="${esc(x.id)}">${esc(HELP.ui.guideStart)}</button></div>` : '';
  }
  function wireGuides() {
    bind('[data-guide]', 'click', (e) => {
      const b = e.currentTarget; b.disabled = true;
      startRun({ mode: 'guide', guide: b.dataset.guide }).catch((err) => { toast(err.message); b.disabled = false; });
    });
  }
  // A guide step shows when its condition holds and the player has not dismissed it in this run.
  const GUIDE_WHEN = {
    start: () => true,
    consuming: (v) => (v.holdings || []).some((h) => h.active && h.consuming),
    yielded: (v) => (v.holdings || []).some((h) => !h.active),
    unused: (v) => !!(v.reach && v.reach.length) && v.reach.every((m) => !m.used) && v.reach.some((m) => m.canUse && m.permit === 'free'),
    priced: (v) => (v.reach || []).some((m) => m.permit === 'priced' && m.canUse),
    barred: (v) => (v.reach || []).some((m) => m.permit === 'barred'),
  };
  // A condition is a name above, a turn ({ turn: 2 }), or the state of one holding ({ consuming: id } or { yielded: id }).
  const holdingIn = (v, id) => (v.holdings || []).find((h) => h.id === id);
  function stepOk(w, v) {
    if (!w || typeof w !== 'object') return !!(GUIDE_WHEN[w] && GUIDE_WHEN[w](v));
    if (w.turn != null) return v.turn >= Number(w.turn);
    if (w.consuming) { const h = holdingIn(v, w.consuming); return !!(h && h.active && h.consuming); }
    if (w.yielded) { const h = holdingIn(v, w.yielded); return !!(h && !h.active); }
    return false;
  }
  // The run keeps the steps the player has dismissed, so a reset or a new run starts the coach again.
  const guideSeen = () => (G.data && Array.isArray(G.data.run.coach) ? G.data.run.coach : []);
  async function markGuideStep(id) {
    G.data.run.coach = guideSeen().concat([id]);
    try { G.data.run.coach = (await api(`/runs/${G.id}/coach`, { step: id })).coach; } catch { /* kept in memory for this visit */ }
  }
  function guideCoachHtml(v) {
    const x = guideOf(G.data.run.guide);
    if (!x) return '';
    const seen = guideSeen();
    const step = x.steps.find((s) => !seen.includes(s.id) && stepOk(s.when, v));
    if (!step) return '';
    const n = seen.filter((id) => x.steps.some((s) => s.id === id)).length + 1;
    return `<div class="coach" role="note"><div class="ctext" id="coachtext"><span class="label">${esc(HELP.ui.guideLabel)} · step ${n}</span>${esc(step.text)}</div><button id="coachok" data-c="${esc(step.id)}" aria-describedby="coachtext">${esc(HELP.ui.hintOk)}</button></div>`;
  }
  // After a dismissal the next note takes focus. It scrolls to the middle of the screen, clear of the sticky header and end bar.
  function focusNext(sel) {
    const nx = $(sel);
    if (!nx) return;
    nx.focus({ preventScroll: true });
    (nx.closest('.hint, .coach') || nx).scrollIntoView({ block: 'center' });
  }
  const howOn = () => ({ always: true, holdings: counts().holdings > 0, reach: counts().reach > 0, forecast: !!(meta() && meta().forecast) });
  function howToc() {
    const on = howOn();
    const items = (counts().multi ? [['factions', 'More than two factions']] : []).concat(HELP.how.filter((s) => on[s.when]).map((s) => [s.id, s.title]), [['dimensions', 'The ten dimensions'], ['groups', 'The six stratagem groups']]);
    return `<nav class="howtoc" aria-label="On this page">${items.map(([id, t]) => `<a href="#/how?s=${esc(id)}">${esc(t)}</a>`).join('')}</nav>`;
  }
  function howSections() {
    const on = howOn();
    return HELP.how.filter((s) => on[s.when]).map((s) => {
      const x = s.guide ? guideOf(s.guide) : null;
      return `<h2 id="how-${esc(s.id)}" tabindex="-1">${esc(s.title)}</h2><p class="small muted">${esc(s.intro)}</p><div class="tiles2">${s.items.map((it) => `<div class="card"><div class="label">${esc(it.label)}</div><p class="small">${esc(it.text)}</p></div>`).join('')}</div>${x ? `<p class="row"><button type="button" data-guide="${esc(x.id)}">${esc(HELP.ui.guideStart)}</button><span class="small muted">${esc(x.blurb)}</span></p>` : ''}`;
    }).join('');
  }"""),
 # home
 ("""Start boot camp</button></div>` : ''}""", """Start boot camp</button></div>` : guideCards(prog.guidesDone)}"""),
 ("""    $('#quick').addEventListener('click', () => quickPlay(p.level));""", """    $('#quick').addEventListener('click', () => quickPlay(p.level));
    wireGuides();"""),
 # briefing
 ("""          ${o.band ? '<div class="card bandnote">""", """          ${mode === 'free' && o.guide ? guideOpCard(o.guide, d.guideDone) : ''}
          ${o.band ? '<div class="card bandnote">"""),
 ("""    $('#start').addEventListener('click', async () => {""", """    wireGuides();
    $('#start').addEventListener('click', async () => {"""),
 # board
 ("""    G.lastLog = G.data.view.log.length;""", """    G.lastLog = G.data.view.log.length;
    await loadHints();"""),
 ("""    if (G.data.run.mode !== 'tutorial') return '';""", """    if (G.data.run.mode === 'guide') return guideCoachHtml(v);
    if (G.data.run.mode !== 'tutorial') return '';"""),
 ("""  function factionsHtml(v) {""", """  function factionsHtml(v, hint) {"""),
 ("""<span class="label">Factions</span>${pacts}</div>""", """<span class="label">Factions</span>${pacts}</div>${hint === 'factions' ? hintHtml('factions') : ''}"""),
 ("""  function cadresHtml(v) {""", """  function cadresHtml(v, hint) {"""),
 ("""<div class="label">Leaders</div><ul>""", """<div class="label">Leaders</div>${hint === 'leaders' ? hintHtml('leaders') : ''}<ul>"""),
 ("""  function holdingsHtml(v) {""", """  function holdingsHtml(v, hint) {"""),
 ("""<div class="label">Holdings</div><ul>""", """<div class="label">Holdings</div>${hint === 'holdings' ? hintHtml('holdings') : ''}<ul>"""),
 ("""  function reachHtml(v) {""", """  function reachHtml(v, hint) {"""),
 ("""<div class="label">Reach</div><ul>""", """<div class="label">Reach</div>${hint === 'reach' ? hintHtml('reach') : ''}<ul>"""),
 ("""    const doc = v.doctrine;""", """    const doc = v.doctrine;
    const hint = boardHint(v, d.run.mode);"""),
 ("""      ${factionsHtml(v)}${cadresHtml(v)}${holdingsHtml(v)}${reachHtml(v)}""", """      ${hint === 'tier7' ? hintHtml('tier7') : ''}${factionsHtml(v, hint)}${cadresHtml(v, hint)}${holdingsHtml(v, hint)}${reachHtml(v, hint)}"""),
 ("""    if (ok) ok.addEventListener('click', () => { const seen = store.get('tdw-coach', []); seen.push(ok.dataset.c); store.set('tdw-coach', seen); drawBoard(); });""",
  """    if (ok) ok.addEventListener('click', async () => {
      if (d.run.mode === 'guide') await markGuideStep(ok.dataset.c); else { const seen = store.get('tdw-coach', []); seen.push(ok.dataset.c); store.set('tdw-coach', seen); }
      drawBoard(); focusNext('#coachok');
    });
    bind('.hintok', 'click', async (e) => { await markHint(e.currentTarget.dataset.hint); drawBoard(); focusNext('.hintok'); });"""),
 # result
 ("""          : run.mode === 'tutorial' ?""", """          : run.mode === 'guide' ? `<a class="btn primary" href="#/op/${esc(run.opId)}">${esc(HELP.ui.guideNext)}</a>`
          : run.mode === 'tutorial' ?"""),
 # forecast: the page's own intro explains it, so it gets a link to How to play in place of a hint
 ("""      render(html`${fcIntro(D.cfg)}""", """      render(html`${fcIntro(D.cfg)}<p class="small"><a href="#/how?s=forecast">${esc(HELP.ui.forecastHow)}</a></p>"""),
 # how to play
 ("""or you cut the lever the operation turns on.</p>""", """or you cut the lever the operation turns on.</p>
      ${howToc()}"""),
 ("""${counts().multi ? `<h2>More than two factions</h2>""", """${counts().multi ? `<h2 id="how-factions" tabindex="-1">More than two factions</h2>"""),
 ("""      <h2>The ten dimensions</h2>""", """      ${howSections()}
      <h2 id="how-dimensions" tabindex="-1">The ten dimensions</h2>"""),
 ("""      <h2>The six stratagem groups</h2>""", """      <h2 id="how-groups" tabindex="-1">The six stratagem groups</h2>"""),
 ("""    $('#boot').addEventListener('click', () => startRun({ mode: 'tutorial' }).catch((e) => toast(e.message)));""",
  """    $('#boot').addEventListener('click', () => startRun({ mode: 'tutorial' }).catch((e) => toast(e.message)));
    wireGuides();
    const sec = qs(location.hash).s;
    const tgt = sec && document.getElementById('how-' + sec);
    if (tgt) { tgt.scrollIntoView(); tgt.focus({ preventScroll: true }); }"""),
 ("""      await api('/demo/reset', {});""", """      await api('/demo/reset', {});
      hintState.seen = null;"""),
], 'game')
(root / 'out/game.js').write_text(g)
cut = g.index('/* TDW demo shim.')
engine = g[:cut].rstrip() + '\n'
assert engine == (root / 'out/engine.v8.js').read_text(), 'the engine part changed'
(root / 'out/engine.js').write_text(engine)

r = (root / 'out/record.v8.js').read_text()
r = patch(r, [
 ("""  const MODES = ['free', 'daily', 'arc', 'challenge', 'tutorial'];""", """  const MODES = ['free', 'daily', 'arc', 'challenge', 'tutorial', 'guide'];"""),
 ("""tutorial: C.tutorial || 'C001', epoch: C.dailyEpoch || '2026-09-30' };""", """tutorial: C.tutorial || 'C001', epoch: C.dailyEpoch || '2026-09-30', guides: C.guides || [] };"""),
 ("""    if (meta.mode === 'tutorial' && (meta.lens || meta.doctrine || meta.opId !== ctx.tutorial || meta.tier !== 1 || meta.seed !== 'tutorial')) fail('This is not the boot camp operation.');""",
  """    if (meta.mode === 'tutorial' && (meta.lens || meta.doctrine || meta.opId !== ctx.tutorial || meta.tier !== 1 || meta.seed !== 'tutorial')) fail('This is not the boot camp operation.');
    if (meta.mode === 'guide') {
      // A guided run plays one shipped operation at the guide's tier, seed and clock, with no lens and no doctrine card.
      const g = (ctx.guides || []).find((x) => x.op === meta.opId);
      if (!g || meta.lens || meta.doctrine || meta.tier !== g.tier || meta.seed !== g.seed || meta.maxTurns !== g.turns) fail('This is not a guided run of this game.');
    }"""),
], 'record')
(root / 'out/record.js').write_text(r)
(root / 'parts/record.js').write_text(r)

css = (root / 'parts/style.v8.css').read_text()
css += """
/* ---- version 9: first-use hints, guided runs, How to play sections ---- */
.hint { background: var(--banner-bg); color: var(--banner-ink); border: 1px solid var(--banner-line); border-radius: var(--radius); padding: 10px 12px; margin: 8px 0; }
.hint p { margin: 0 0 8px; font-size: 15px; }
.hint .row { gap: 12px; }
.hint button { min-height: 44px; }
.hint a { color: var(--banner-ink); text-decoration: underline; }
.coach .label { display: block; color: #c9d1db; margin-bottom: 4px; }
.howtoc { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 4px 0 16px; }
.howtoc a { font-size: 15px; padding: 6px 0; }
h2[tabindex="-1"]:focus { outline: none; }
h2[id^="how-"] { scroll-margin-top: 112px; }
@media (max-width: 560px) { h2[id^="how-"] { scroll-margin-top: 12px; } }
.guidecard { border-left: 4px solid var(--detect); }
"""
(root / 'parts/style.css').write_text(css)
print('patched: game, engine, record, style. OK')
