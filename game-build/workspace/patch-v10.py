#!/usr/bin/env python3 -I
"""Version 10 of the bundle: an approximate difficulty on each operation and tier. The label reads how often a simple scripted
player wins (difficulty/difficulty.json, copied into each content file by difficulty/add_difficulty.py). Tier 7 stays open in free play.
The engine and the record module do not change.
Reads out/game.v9.js, out/record.v9.js, parts/style.v9.css and parts/help.json. Writes out/game.js, out/engine.js, out/record.js,
parts/record.js and parts/style.css. The record module stays as it was."""
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

g = (root / 'out/game.v9.js').read_text()
m = re.findall(r'\n  const HELP = \{.*\};\n', g)
if len(m) != 1: sys.exit('game: the HELP line matched %d times' % len(m))
g = g.replace(m[0], '\n  const HELP = ' + help_js + ';\n')
g = patch(g, [
 # ---------------- demo shim ----------------
 ("""  // First-use hints, one per panel. The save keeps the ones the player has read.""",
  """  // Approximate difficulty. The share of games a scripted player wins at Tier 1 to Tier 7. The content carries the table.
  const DIFF = (C.difficulty && C.difficulty.rates) || {};
  const diffOf = (id) => DIFF[id] || null;
  // First-use hints, one per panel. The save keeps the ones the player has read."""),
 ("""      guide: guideFor(o),""", """      guide: guideFor(o), diff: diffOf(o.id),"""),
 ("""world: o.world, watch: watchOf(o), stars: best[o.id] ?? null }))""", """world: o.world, watch: watchOf(o), stars: best[o.id] ?? null, diff: diffOf(o.id) }))"""),
 ("""tier: arcTier(a, i), dimension: o.dimension, stars: p[i] ?? null,""", """tier: arcTier(a, i), diff: (diffOf(id) || [])[arcTier(a, i) - 1] ?? null, dimension: o.dimension, stars: p[i] ?? null,"""),

 # ---------------- board client ----------------
 ("""  const howOn = () => ({""", """  // ---------- version 10: approximate difficulty ----------
  // A label for the share of games a scripted player wins. The bands and the words live in parts/help.json.
  const DIFFX = HELP.ui.difficulty;
  const diffLabel = (rate) => { const b = rate == null ? null : DIFFX.bands.find((x) => rate >= x.min); return b ? b.label : ''; };
  // The sentence gives the share itself, so it can never disagree with the label beside it.
  const diffSentence = (rate) => (rate == null ? '' : DIFFX.won.replace('{n}', String(rate)));
  const diffNote = () => `<p class="small muted diffnote">${esc(DIFFX.note)}</p>`;
  const diffLine = (rates, t) => (rates && rates[t - 1] != null ? `Tier ${t} · ${esc(diffLabel(rates[t - 1]))}. ${esc(diffSentence(rates[t - 1]))}` : '');
  const howOn = () => ({"""),
 # operations list
 ("""${o.band ? '<span class="chip2 band">Asymmetry band</span>' : ''}<span class="chip2">T${o.tier}</span>""",
  """${o.band ? '<span class="chip2 band">Asymmetry band</span>' : ''}<span class="chip2 diff">T${o.tier}${o.diff ? ' · ' + esc(diffLabel(o.diff[o.tier - 1])) : ''}</span>"""),
 ('''      <p class="small muted">${esc(copy().opsNote)}</p>''', '''      <p class="small muted">${esc(copy().opsNote)} ${esc(DIFFX.note)}</p>'''),
 # briefing, free play
 ("""aria-pressed="${t === o.tier}">T${t}</button>`).join('')}</div><p class="small muted">The record sets Tier""",
  """aria-pressed="${t === o.tier}"${o.diff ? ` aria-label="T${t}, ${esc(diffLabel(o.diff[t - 1]))}"` : ''}>T${t}</button>`).join('')}</div>${o.diff ? `<p class="small" id="tierdiff" aria-live="polite">${diffLine(o.diff, o.tier)}</p>${diffNote()}` : ''}<p class="small muted">The record sets Tier"""),
 # briefing, campaign
 ("""<div class="card"><div class="label">Difficulty</div><p>Tier ${d.arcTier || o.tier}</p>""",
  """<div class="card"><div class="label">Difficulty</div><p>${o.diff ? diffLine(o.diff, d.arcTier || o.tier) : `Tier ${d.arcTier || o.tier}`}</p>${o.diff ? diffNote() : ''}"""),
 ("""    bind('[data-tier]', 'click', (e) => { pick.tier = Number(e.currentTarget.dataset.tier);""",
  """    bind('[data-tier]', 'click', (e) => { const td = $('#tierdiff'); if (td) td.innerHTML = diffLine(o.diff, Number(e.currentTarget.dataset.tier)); });
    bind('[data-tier]', 'click', (e) => { pick.tier = Number(e.currentTarget.dataset.tier);"""),
 # campaign arc: the note sits under the blurb
 ('''      <p>${esc(d.arc.blurb)}</p>
      <div class="arcline">''', '''      <p>${esc(d.arc.blurb)}</p>
      ${d.nodes.some((n) => n.diff != null) ? diffNote() : ''}
      <div class="arcline">'''),
 # campaign arc
 ("""${kindLabel(n.kind)} · Tier ${n.tier} · ${esc(n.dimension)}""", """${kindLabel(n.kind)} · Tier ${n.tier}${n.diff != null ? ' · ' + esc(diffLabel(n.diff)) : ''} · ${esc(n.dimension)}"""),
 # daily
 ("""<div class="kicker">Daily #${d.number} · ${esc(d.day)} · Tier ${d.tier}</div>""",
  """<div class="kicker">Daily #${d.number} · ${esc(d.day)} · Tier ${d.tier}${o.diff ? ' · ' + esc(diffLabel(o.diff[d.tier - 1])) : ''}</div>"""),
 ('''        <p>${md(o.brief)}</p>
        <p class="pill-row"><span class="chip2">${esc(o.opponent)}</span><span class="chip2">${esc(o.label)}</span><span class="chip2 dimchip">${esc(o.dimension)}</span></p>
        <div class="row">${m && m.status''', '''        <p>${md(o.brief)}</p>
        <p class="pill-row"><span class="chip2">${esc(o.opponent)}</span><span class="chip2">${esc(o.label)}</span><span class="chip2 dimchip">${esc(o.dimension)}</span></p>
        ${o.diff ? diffNote() : ''}
        <div class="row">${m && m.status'''),
], 'game')
(root / 'out/game.js').write_text(g)
cut = g.index('/* TDW demo shim.')
engine = g[:cut].rstrip() + '\n'
assert engine == (root / 'out/engine.v8.js').read_text(), 'the engine part changed'
(root / 'out/engine.js').write_text(engine)
r = (root / 'out/record.v9.js').read_text()
(root / 'out/record.js').write_text(r)
(root / 'parts/record.js').write_text(r)
(root / 'parts/style.css').write_text((root / 'parts/style.v9.css').read_text() + '''
/* ---- version 10: difficulty labels ---- */
.chip2.diff { white-space: nowrap; }
.hero .diffnote { margin-top: 0; }
''')
print('patched: game, engine, style. record unchanged. OK')
