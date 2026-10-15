#!/usr/bin/env python3 -I
"""Version 8 of the bundle: a real Tier 7. Tiers 1 to 6 are untouched. Tier 7 is harder than 6 in four ways. The clock is a point shorter,
the opponent's hand is larger from turn 3 and grows at two stages, and every domain in play opens at 2 pressure.
Reads out/*.v7.js and parts/style.v7.css. Writes out/game.js, out/engine.js, out/record.js, parts/record.js and parts/style.css."""
import sys, pathlib
root = pathlib.Path(__file__).parent

def patch(src, pairs, label):
    s = src
    for i, (old, new) in enumerate(pairs):
        n = s.count(old)
        if n != 1:
            sys.exit(f"{label}: anchor #{i} matched {n} times (need exactly 1):\n{old[:170]}")
        s = s.replace(old, new)
    return s

g = (root / 'out/game.v7.js').read_text()
g = patch(g, [
 ("""    consume: [24, 22, 20, 20, 19, 18],""", """    consume: [24, 22, 20, 20, 19, 18, 17],"""),
 ("""      { base: 3, fromTurn: 7, at: [2] }, { base: 3, fromTurn: 6, at: [2] }, { base: 3, fromTurn: 4, at: [2] },
    ],""", """      { base: 3, fromTurn: 7, at: [2] }, { base: 3, fromTurn: 6, at: [2] }, { base: 3, fromTurn: 4, at: [2] },
      { base: 3, fromTurn: 3, at: [1, 2] },
    ],"""),
 ("""    const tier = Math.max(1, Math.min(6, Number(cfg.tier || op.tier || 3)));""", """    const tier = Math.max(1, Math.min(7, Number(cfg.tier || op.tier || 3)));"""),
 ("""    if (tier >= 5) S.board[op.spine].p = 2;""", """    if (tier >= 5) S.board[op.spine].p = 2;
    if (tier >= 7) theater.forEach((d) => { S.board[d].p = Math.max(S.board[d].p, 2); });"""),
 # shim and client
 ("""      tier = Math.max(1, Math.min(6, Number(body.tier) || op.tier));""", """      tier = Math.max(1, Math.min(7, Number(body.tier) || op.tier));"""),
 ("""!(ctier >= 1 && ctier <= 6)""", """!(ctier >= 1 && ctier <= 7)"""),
 ("""${[1, 2, 3, 4, 5, 6].map((t) => `<option ${String(t) === f.tier ? 'selected' : ''}>${t}</option>`).join('')}""", """${[1, 2, 3, 4, 5, 6, 7].map((t) => `<option ${String(t) === f.tier ? 'selected' : ''}>${t}</option>`).join('')}"""),
 ("""${(o.band ? [o.tier] : [1, 2, 3, 4, 5, 6]).map((t) => `<button type="button" data-tier="${t}" aria-pressed="${t === o.tier}">T${t}</button>`).join('')}</div><p class="small muted">${o.band ? 'This operation sits in the asymmetry band and plays at Tier ' + o.tier + ' only.' : 'The record sets Tier ' + o.tier + '.'}</p>""",
  """${[1, 2, 3, 4, 5, 6, 7].map((t) => `<button type="button" data-tier="${t}" aria-pressed="${t === o.tier}">T${t}</button>`).join('')}</div><p class="small muted">The record sets Tier ${o.tier}.${o.tier < 7 ? ' Tier 7 is harder than any tier on the record.' : ''}</p>"""),
 ("""<p class="small muted">A scripted player wins this operation rarely. The score is the game\\'s reading and not a count.</p>""", """<p class="small muted">A scripted player wins this operation rarely at Tier 7. The score is the game\\'s reading and not a count.</p>"""),
], 'game')
(root / 'out/game.js').write_text(g)
cut = g.index('/* TDW demo shim.')
(root / 'out/engine.js').write_text(g[:cut].rstrip() + '\n')

r = (root / 'out/record.v7.js').read_text()
r = patch(r, [
 ("""const CHALLENGE_RE = /^([A-Z]\\d{3})~([1-6])~([a-z0-9]{6,16})$/;""", """const CHALLENGE_RE = /^([A-Z]\\d{3})~([1-7])~([a-z0-9]{6,16})$/;"""),
 ("""    if (!/^[1-6]$/.test(tier)) fail('The code names no valid tier.');""", """    if (!/^[1-7]$/.test(tier)) fail('The code names no valid tier.');"""),
 ("""'This line held cleanly. Raise the tier.'""", """(S.tier >= 7 ? 'This line held cleanly at the top tier.' : 'This line held cleanly. Raise the tier.')"""),
], 'record')
(root / 'out/record.js').write_text(r)
(root / 'parts/record.js').write_text(r)
(root / 'parts/style.css').write_text((root / 'parts/style.v7.css').read_text())
print('patched: game, engine, record. OK')
