#!/usr/bin/env python3 -I
"""Adapt js/record.js to the version 2 engine: factions, leaders, build-defined ids. Every anchor must match exactly once."""
import sys, pathlib
root = pathlib.Path(__file__).parent

def patch(src, pairs, label):
    s = src
    for i, (old, new) in enumerate(pairs):
        n = s.count(old)
        if n != 1:
            sys.exit(f"{label}: anchor #{i} matched {n} times (need exactly 1):\n{old[:140]}")
        s = s.replace(old, new)
    return s

rec = (root / 'orig/record.js').read_text()
rec = patch(rec, [
 # context: registry, tutorial id, daily pool
 ("""  const CHALLENGE_RE = /^([CF]\\d{3})~([1-6])~([a-z0-9]{6,16})$/;""",
  """  const OPID_RE = /^[A-Z]\\d{3}$/;
  const CHALLENGE_RE = /^([A-Z]\\d{3})~([1-6])~([a-z0-9]{6,16})$/;"""),
 ("""    return { E, ops: C.ops, byId: new Map(C.ops.map((o) => [o.id, o])), epoch: C.dailyEpoch || '2026-09-30' };""",
  """    const byId = new Map(C.ops.map((o) => [o.id, o]));
    // Builds with several factions carry them in the content. Without them every operation plays as a two-faction one.
    const reg = { factions: C.factions || {}, cadres: C.cadres || {}, pacts: C.pacts || {}, ruleset: C.ruleset || {} };
    const pool = (C.daily || []).map((id) => byId.get(id)).filter(Boolean);
    return { E, ops: C.ops, byId, reg, pool: pool.length ? pool : C.ops, tutorial: C.tutorial || 'C001', epoch: C.dailyEpoch || '2026-09-30' };"""),
 ("""    const L = ctx.ops.length;
    return ctx.ops[(((n * 37) % L) + L) % L];""",
  """    const L = ctx.pool.length;
    return ctx.pool[(((n * 37) % L) + L) % L];"""),
 # actions: a leader move
 ("""      case 'end': return 'e';
      default: return fail('Unknown action.');""",
  """      case 'assign': if (!/^[A-Za-z0-9_-]{1,30}$/.test(a.cadre || '')) fail('Bad leader.'); return 'g' + domChar(E, a.domain) + a.cadre;
      case 'end': return 'e';
      default: return fail('Unknown action.');"""),
 ("""  function decodeAction(E, tok) {
""",
  """  function decodeAction(E, tok) {
    const g = /^g([0-9ab])([A-Za-z0-9_-]{1,30})$/.exec(tok);
    if (g) return { type: 'assign', cadre: g[2], domain: E.DOMAINS[IDX.indexOf(g[1])] };
"""),
 ("""    if (!/^[CF]\\d{3}$/.test(opId)) fail('The code names no valid operation.');""",
  """    if (!OPID_RE.test(opId)) fail('The code names no valid operation.');"""),
 # replay: the registry
 ("""mode: meta.mode, maxTurns: meta.maxTurns });
    const frames""",
  """mode: meta.mode, maxTurns: meta.maxTurns, registry: ctx.reg });
    const frames"""),
 ("""meta.opId !== 'C001' || meta.tier !== 1""", """meta.opId !== ctx.tutorial || meta.tier !== 1"""),
 ("""    const frames = [{ i: 0, turn: 1, kind: 'open'""", """    ctx.player = S.player;
    const frames = [{ i: 0, turn: 1, kind: 'open'"""),
 # hand and labels: cards aimed at the other factions
 ("""      return { id: it.id, code: it.code, label: c ? `S${c.num}, ${c.name}` : it.code, group: c ? c.group : '', face: it.face,""",
  """      const away = it.victim && it.victim !== S.player;
      return { id: it.id, code: it.code, label: (c ? `S${c.num}, ${c.name}` : it.code) + (away ? ` (aimed at ${fname(ctxNow, it.victim)})` : ''), group: c ? c.group : '', face: it.face,"""),
 ("""  function handOf(E, S) {""", """  let ctxNow = null;
  const fname = (ctx, id) => { const f = ctx && ctx.reg.factions[id]; return (f && (f.short || f.name)) || id; };
  function handOf(E, S) {"""),
 ("""    const E = ctx.E;
    const op = ctx.byId.get(meta.opId);
    if (!op) fail('This operation is not in this version of the game.');""",
  """    const E = ctx.E;
    ctxNow = ctx;
    const op = ctx.byId.get(meta.opId);
    if (!op) fail('This operation is not in this version of the game.');"""),
 ("""      case 'doctrine': return `Play the doctrine card${a.domain ? ` on ${a.domain}` : ''}`;
      default: return `End turn ${S.turn}`;""",
  """      case 'doctrine': return `Play the doctrine card${a.domain ? ` on ${a.domain}` : ''}`;
      case 'assign': return `Move ${(ctxNow && ctxNow.reg.cadres[a.cadre] && ctxNow.reg.cadres[a.cadre].name) || a.cadre} to ${a.domain}`;
      default: return `End turn ${S.turn}`;"""),
 # events in plain sentences: only the player's slice, plus the new kinds
 ("""    const sgn = (n) => (n > 0 ? '+' + n : String(n));
    switch (e.k) {""",
  """    const sgn = (n) => (n > 0 ? '+' + n : String(n));
    const fn = (id) => fname(ctx, id);
    const who = (f) => (f && ctx.player && f !== ctx.player ? `${fn(f)}'s ` : '');
    switch (e.k) {
      case 'legit': return e.n ? `${fn(e.f)} legitimacy ${sgn(e.n)}${e.why ? ', ' + (SRC[e.why] || (E.CARDS[e.why] ? card(e.why) : String(e.why).replace(/_/g, ' '))) : ''}. It stands at ${e.total}.` : null;
      case 'spike': return `${fn(e.f)} falls into an entropy spike at ${e.legitimacy} legitimacy.`;
      case 'seize': return `${fn(e.by)} seizes ${e.d} from ${fn(e.f)}.`;
      case 'pact': return `${e.name} is ${e.active ? 'in force' : 'broken'}.`;
      case 'script': return e.text || null;
      case 'cadre': return e.name ? `${e.name}: ${e.set === 'lock' ? 'locked out' : e.set === 'remove' ? 'removed' : e.set === 'restore' ? 'restored' : 'moved'}.` : null;
      case 'assign': return `${(ctx.reg.cadres[e.cadre] && ctx.reg.cadres[e.cadre].name) || e.cadre} moves from ${e.from} to ${e.to}.`;"""),
 ("""      case 'press': return e.n > 0 || e.absorbed > 0 ? `${e.d} takes""",
  """      case 'press': return e.n > 0 || e.absorbed > 0 ? `${who(e.f)}${e.d} takes"""),
 ("""      case 'capture': return `${e.d} falls.`;""", """      case 'capture': return `${who(e.f)}${e.d} falls.`;"""),
 ("""'one aim': 'Cards pulling one way',""", """'one aim': 'Cards pulling one way', event: 'A scripted event',"""),
 # report: count only what landed on the player
 ("""        } else if (e.k === 'press' && e.n > 0) {""", """        } else if (e.k === 'press' && e.n > 0 && (e.f == null || e.f === S.player)) {"""),
 ("""        } else if (e.k === 'capture') {""", """        } else if (e.k === 'capture' && (e.f == null || e.f === S.player)) {"""),
], 'record')
# describe() needs to know who the player is, to name the other factions
rec = rec.replace("    const E = ctx.E;\n    const card = (c) => cardName(E, c);", "    const E = ctx.E;\n    const card = (c) => cardName(E, c);", 1)
(root / 'parts').mkdir(exist_ok=True)
(root / 'parts/record.js').write_text(rec)
print('patched: record. OK')
