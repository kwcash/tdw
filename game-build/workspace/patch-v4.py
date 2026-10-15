#!/usr/bin/env python3 -I
"""Version 4 of the game bundle: watch operations, the 120-day calendar. Every anchor must match exactly once.
Reads out/game.before.js and out/record.before.js, writes out/game.js, out/record.js, out/engine.js and parts/style.css."""
import sys, pathlib, re
root = pathlib.Path(__file__).parent

def patch(src, pairs, label):
    s = src
    for i, (old, new) in enumerate(pairs):
        n = s.count(old)
        if n != 1:
            sys.exit(f"{label}: anchor #{i} matched {n} times (need exactly 1):\n{old[:160]}")
        s = s.replace(old, new)
    return s

g = (root / 'out/game.before.js').read_text()
g = patch(g, [
 # ---- engine: validate() accepts watch operations
 ("""    if (!DIMENSIONS[op.dimension]) bad.push(`unknown dimension ${op.dimension}`);
""",
  """    if (!DIMENSIONS[op.dimension]) bad.push(`unknown dimension ${op.dimension}`);
    if (op.kind != null && !['catalog', 'futures', 'watch'].includes(op.kind)) bad.push(`unknown kind ${op.kind}`);
    if (op.kind === 'watch') {
      if (!['open', 'settled'].includes(op.status)) bad.push('a watch operation needs status open or settled');
      if (typeof op.settleOn !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(op.settleOn) || Number.isNaN(Date.parse(op.settleOn))) bad.push('a watch operation needs a settleOn date');
    }
"""),
 # ---- shim: the daily never draws a watch operation, and the content can describe the next 120 days
 ("""  const DAILY_POOL = (C.daily || []).map((id) => opById.get(id)).filter(Boolean);""",
  """  const DAILY_POOL = (C.daily || []).map((id) => opById.get(id)).filter((o) => o && o.kind !== 'watch');"""),
 ("""  function brief(o, withBest) {
    return {
      factions: factionsOf(o),""",
  """  // A watch operation plays the record up to its last source and marks its subject as not yet settled.
  function watchOf(o) { return o && o.kind === 'watch' ? { status: o.status === 'settled' ? 'settled' : 'open', settleOn: o.settleOn || null } : null; }
  function brief(o, withBest) {
    return {
      watch: watchOf(o),
      factions: factionsOf(o),"""),
 ("""arc: o.arc, world: o.world, stars: best[o.id] ?? null })) };""",
  """arc: o.arc, world: o.world, watch: watchOf(o), stars: best[o.id] ?? null })) };"""),
 ("""challenge: challengeOf(run), status: run.status, scored: !!run.scored,""",
  """challenge: challengeOf(run), watch: watchOf(o), status: run.status, scored: !!run.scored,"""),
 ("""score: r.score, stars: r.stars, seed: r.seed, code: r.code, challenge: challengeOf(r) })),
    };
  });
""",
  """score: r.score, stars: r.stars, seed: r.seed, code: r.code, challenge: challengeOf(r), watch: watchOf(opById.get(r.op_id)) })),
    };
  });

  on('GET', /^\\/api\\/calendar$/, () => ({ calendar: C.calendar || [], note: C.calendarNote || '' }));
"""),
 # ---- board
 ("""  const kindLabel = (k) => (k === 'catalog' ? 'History' : 'Futures');""",
  """  const kindLabel = (k) => (k === 'catalog' ? 'History' : k === 'watch' ? 'Watch' : 'Futures');
  const fmtDay = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const watchChip = (w) => (w ? `<span class="chip2 watch ${w.status === 'settled' ? 'settled' : 'open'}">${w.status === 'settled' ? 'Settled' + (w.settleOn ? ' ' + esc(fmtDay(w.settleOn)) : '') : 'Watch: not yet settled'}</span>` : '');
  const watchNote = (w) => (w ? `<p class="small muted watchnote">${w.status === 'settled' ? 'This watch has settled.' : 'A watch plays the record up to its last source. The subject is not yet settled.'}${w.settleOn ? ` ${w.status === 'settled' ? 'It settled' : 'It settles'} on ${esc(fmtDay(w.settleOn))}.` : ''}</p>` : '');

  // ---------- the next 120 days ----------
  // Shows the entries that end on or after the viewer's local date and start within 120 days. A month-only date shows through that month.
  function calendarHtml(c) {
    const items = (c && c.calendar) || [];
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 120);
    const first = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
    const last = (s) => { const [y, m, d] = s.split('-').map(Number); return d ? new Date(y, m - 1, d) : new Date(y, m, 0); };
    const rows = items.filter((e) => last(e.end || e.date) >= today && first(e.date) <= horizon).sort((a, b) => first(a.date) - first(b.date));
    if (!rows.length) return '';
    const dm = (dt) => dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const when = (e) => (e.date.length === 7 ? first(e.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : e.end ? `${dm(first(e.date))} to ${dm(first(e.end))}` : dm(first(e.date)));
    const KIND = { window: 'Window', scheduled: 'Scheduled', record: 'Record' };
    return `<section class="cal card" aria-labelledby="calh"><h2 id="calh">Next 120 days</h2>
      <ol class="cal-list">${rows.map((e) => `<li class="cal-item ${esc(e.kind)}"><time class="cal-when" datetime="${esc(e.date)}">${esc(when(e))}</time><span class="cal-label">${esc(e.label)}</span><span class="cal-meta"><span class="chip2">${esc(KIND[e.kind] || e.kind)}</span><a class="cal-src" href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">Source<span class="sr"> for ${esc(e.label)}</span></a></span></li>`).join('')}</ol>
      <p class="small muted">${esc((c && c.note) || 'Dates are scheduled or expected. Nothing here is a prediction.')}</p></section>`;
  }"""),
 # the operations list: a Watch filter, the watch chip, and the calendar above the list
 ("""    const all = (await api('/ops')).ops;
    const dims = Object.keys(meta().dimensions);""",
  """    const all = (await api('/ops')).ops;
    const calData = await api('/calendar');
    const dims = Object.keys(meta().dimensions);"""),
 ("""      <p class="small muted">${esc(copy().opsNote)}</p>
      <div class="filters">""",
  """      <p class="small muted">${esc(copy().opsNote)}</p>
      ${calendarHtml(calData)}
      <div class="filters">"""),
 ("""<option value="futures" ${f.kind === 'futures' ? 'selected' : ''}>Futures</option></select>""",
  """<option value="futures" ${f.kind === 'futures' ? 'selected' : ''}>Futures</option><option value="watch" ${f.kind === 'watch' ? 'selected' : ''}>Watch</option></select>"""),
 ("""${o.world ? ' · ' + esc(o.world) : ''}</span></span><span>${o.stars != null ? stars(o.stars, 'small') : ''}""",
  """${o.world ? ' · ' + esc(o.world) : ''}${o.watch ? ' · ' + watchChip(o.watch) : ''}</span></span><span>${o.stars != null ? stars(o.stars, 'small') : ''}"""),
 # the operation page
 ("""      <h1>${esc(o.title)}</h1>
      <div class="brief-grid">""",
  """      <h1>${esc(o.title)}</h1>
      ${o.watch ? `<p>${watchChip(o.watch)}</p>${watchNote(o.watch)}` : ''}
      <div class="brief-grid">"""),
 # the board header and the result
 ("""<h1>${esc(v.op.title)}</h1>
            <div class="hud-sub">""",
  """<h1>${esc(v.op.title)}</h1>
            ${d.run.watch ? `<div>${watchChip(d.run.watch)}</div>` : ''}
            <div class="hud-sub">"""),
 ("""${run.dayNumber ? ' #' + run.dayNumber : ''} · ${esc(v.op.title)}</div>
        <h1>${head}</h1>""",
  """${run.dayNumber ? ' #' + run.dayNumber : ''} · ${esc(v.op.title)}</div>
        ${run.watch ? `<div>${watchChip(run.watch)}</div>${watchNote(run.watch)}` : ''}
        <h1>${head}</h1>"""),
 # records
 ("""<td>${esc(r.title)}<div class="small muted">""", """<td>${esc(r.title)}${r.watch ? ' ' + watchChip(r.watch) : ''}<div class="small muted">"""),
 ("""      <h3>${esc(s.title)}</h3>""", """      <h3>${esc(s.title)}${s.watch ? ' ' + watchChip(s.watch) : ''}</h3>"""),
 ("""        <h1>${esc(s.title)}</h1>
        <p>${esc(s.opponent)}""", """        <h1>${esc(s.title)}</h1>
        ${s.watch ? `<p>${watchChip(s.watch)}</p>` : ''}
        <p>${esc(s.opponent)}"""),
 # home: the panel under the daily, and on the welcome screen
 ("""    const [prog, daily, live, arcs] = await Promise.all([api('/progress'), api('/daily'), api('/runs/live'), api('/arcs')]);""",
  """    const [prog, daily, live, arcs, calData] = await Promise.all([api('/progress'), api('/daily'), api('/runs/live'), api('/arcs'), api('/calendar')]);"""),
 ("""      ${!prog.tutorialDone ? `<div class="card feature"><div class="label">New here</div>""",
  """      ${calendarHtml(calData)}
      ${!prog.tutorialDone ? `<div class="card feature"><div class="label">New here</div>"""),
 ("""  function renderWelcome() {
    render(html`""", """  async function renderWelcome() {
    const calData = await api('/calendar');
    render(html`"""),
 ("""        <p class="small">No account needed to start. Five to eight minutes a game.</p>
      </div>""",
  """        <p class="small">No account needed to start. Five to eight minutes a game.</p>
      </div>
      ${calendarHtml(calData)}"""),
], 'game')
(root / 'out/game.js').write_text(g)

# the engine file for the Node tests is the first part of the bundle
cut = g.index('/* TDW demo shim.')
(root / 'out/engine.js').write_text(g[:cut].rstrip() + '\n')

r = (root / 'out/record.before.js').read_text()
r = patch(r, [
 ("""    const pool = (C.daily || []).map((id) => byId.get(id)).filter(Boolean);""",
  """    const pool = (C.daily || []).map((id) => byId.get(id)).filter((o) => o && o.kind !== 'watch');"""),
 ("""      actions: meta.actions.length,
    };""",
  """      actions: meta.actions.length,
      ...(op.kind === 'watch' ? { watch: { status: op.status === 'settled' ? 'settled' : 'open', settleOn: op.settleOn || null } } : {}),
    };"""),
], 'record')
(root / 'out/record.js').write_text(r)
(root / 'parts/record.js').write_text(r)

css = (root / 'parts/style.before.css').read_text()
css += """
/* ---- version 4: watch operations and the 120-day calendar ---- */
.chip2.watch { font-weight: 700; border-color: var(--warn); color: var(--warn); background: color-mix(in srgb, var(--warn) 12%, var(--panel)); }
.chip2.watch.settled { border-color: var(--good); color: var(--good); background: color-mix(in srgb, var(--good) 12%, var(--panel)); }
.watchnote { margin: 4px 0 12px; }
.cal { margin: 16px 0; }
.cal h2 { margin: 0 0 8px; font-size: 18px; }
.cal-list { list-style: none; margin: 0 0 8px; padding: 0; display: grid; gap: 0; }
.cal-item { display: grid; grid-template-columns: 9.5em 1fr auto; gap: 4px 12px; align-items: baseline; padding: 8px 0; border-top: 1px solid var(--line); }
.cal-item:first-child { border-top: 0; }
.cal-when { font-weight: 700; font-variant-numeric: tabular-nums; }
.cal-meta { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
.cal-src { font-size: 13px; }
.cal-src:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
@media (max-width: 560px) {
  .cal-item { grid-template-columns: 1fr; gap: 2px; }
  .cal-meta { justify-content: flex-start; }
}
"""
(root / 'parts/style.css').write_text(css)
print('patched: game, record, engine, style. OK')
