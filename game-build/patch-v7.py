#!/usr/bin/env python3 -I
"""Version 7 of the bundle: permits and reach moves (Revision 38 of the book, a proposal). Opt-in per operation.
A reach move is an act with a strong effect. Each faction holds a permit for it, free, priced or barred. A barred move shows on the board as closed with its evidence.
Reads out/game.v6.js, out/record.v6.js and parts/style.v6.css. Writes out/game.js, out/engine.js, out/record.js, parts/record.js and parts/style.css."""
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

g = (root / 'out/game.v6.js').read_text()
g = patch(g, [
 # ---------------- engine: state
 ("""    // Holdings, when the operation has them. An operation without them carries no extra state.""",
  """    // Reach moves, when the operation has them. An operation without them carries no extra state.
    if (Array.isArray(op.reach) && op.reach.length) {
      S.reach = op.reach.map((m) => ({ id: m.id, name: m.name || m.id, domain: m.domain, text: m.text || '', log: m.log || '', permit: Object.assign({}, m.permit || {}), limit: clamp(Math.round(m.limit || 1), 1, 3), ap: clamp(Math.round(m.ap || 1), 1, 2), effects: (m.effects || []).map((e) => Object.assign({}, e)), pricedEffects: (m.pricedEffects || []).map((e) => Object.assign({}, e)), evidence: (m.evidence || []).map((x) => Object.assign({}, x)), used: 0 }));
    }
    // Holdings, when the operation has them. An operation without them carries no extra state."""),
 # ---------------- engine: helpers
 ("""  // Holdings (Revision 33). A holding costs its holder every turn and denies the rival part of its gain.""",
  """  // Reach moves (Revision 38). A move is an act with a strong effect, and each faction holds a permit for it.
  // Free acts anyone may take. A priced act works but costs the actor legitimacy and counts as an act against its own position.
  // A barred act is closed to the actor. The board still lists it, with the evidence for why it is closed.
  const reachOf = (S) => S.reach || [];
  const permitOf = (S, m) => m.permit[S.player] || 'free';
  // Holdings (Revision 33). A holding costs its holder every turn and denies the rival part of its gain."""),
 # ---------------- engine: new effect types and the mirror tag
 ("""    const f = e.faction;
    switch (e.type) {
      case 'legitimacy': {""",
  """    const f = e.faction;
    if (e.mirror) ev.push({ k: 'mirror', id: e.mirror, f });
    switch (e.type) {
      case 'ease': if (S.ledger[f] && DOMAINS.includes(e.domain)) ease(S, f, e.domain, e.n, ev); break;
      case 'unslope': if (S.ledger[f] && DOMAINS.includes(e.domain)) { const D = S.domainState[e.domain]; const k = Math.min(e.n, D.slopes[f]); if (k > 0) { D.slopes[f] -= k; ev.push({ k: 'unslope', d: e.domain, n: k, f }); } } break;
      case 'legitimacy': {"""),
 # ---------------- engine: options, action, view
 ("""    if (holdingsOf(S).length) { o.yield = {}; for (const h of liveHoldings(S)) if (S.ap >= 1) o.yield[h.id] = 1; }""",
  """    if (holdingsOf(S).length) { o.yield = {}; for (const h of liveHoldings(S)) if (S.ap >= 1) o.yield[h.id] = 1; }
    if (reachOf(S).length) { o.reach = {}; for (const m of reachOf(S)) { const p = permitOf(S, m); if (p !== 'barred' && m.used < m.limit && S.ap >= m.ap) o.reach[m.id] = p; } }"""),
 ("""      case 'yield': {
        const h = holdingsOf(S).find((x) => x.id === a.holding);""",
  """      case 'reach': {
        const m = reachOf(S).find((x) => x.id === a.move);
        if (!m) throw new Error('No such move.');
        const p = permitOf(S, m);
        if (p === 'barred') throw new Error(`${m.name} is closed to you.`);
        if (m.used >= m.limit) throw new Error(`You already used ${m.name}.`);
        spend(m.ap);
        m.used++;
        for (const e of m.effects) applyEffect(S, e, ev);
        if (p === 'priced') for (const e of m.pricedEffects) applyEffect(S, e, ev);
        ev.push({ k: 'reach', id: m.id, name: m.name, d: m.domain, permit: p });
        S.flags.acts.push('reach');
        log(S, m.log || `You use ${m.name}.${p === 'priced' ? ' It has a price.' : ''}`);
        break;
      }
      case 'yield': {
        const h = holdingsOf(S).find((x) => x.id === a.holding);"""),
 ("""assign: opt.assign, ...(opt.yield ? { yield: opt.yield } : {}) }""",
  """assign: opt.assign, ...(opt.yield ? { yield: opt.yield } : {}), ...(opt.reach ? { reach: opt.reach } : {}) }"""),
 ("""      ...(S.holdings ? { holdings: S.holdings.map(""",
  """      ...(S.reach ? { reach: S.reach.map((m) => ({ id: m.id, name: m.name, domain: m.domain, text: m.text, permit: permitOf(S, m), limit: m.limit, used: m.used, ap: m.ap, canUse: !!(opt.reach && opt.reach[m.id]), price: m.pricedEffects.filter((e) => e.type === 'legitimacy').reduce((x, e) => x - e.n, 0), evidence: m.evidence })) } : {}),
      ...(S.holdings ? { holdings: S.holdings.map("""),
 # ---------------- engine: validate
 ("""      if (!['legitimacy', 'shield', 'dropShields', 'pressure', 'slope', 'coherence', 'leverage', 'tempo', 'pact', 'cadre', 'log'].includes(e.type)) bad.push(`${where}: unknown effect ${e.type}`);""",
  """      if (!['legitimacy', 'shield', 'dropShields', 'pressure', 'slope', 'coherence', 'leverage', 'tempo', 'pact', 'cadre', 'log', 'ease', 'unslope'].includes(e.type)) bad.push(`${where}: unknown effect ${e.type}`);"""),
 ("""    const hids = [];
    for (const h of op.holdings || []) {""",
  """    const rids = [];
    for (const m of op.reach || []) {
      if (!m || typeof m.id !== 'string' || !ID_RE.test(m.id) || FORBIDDEN_ID.has(m.id)) { bad.push(`bad reach id ${m && m.id}`); continue; }
      if (rids.includes(m.id)) bad.push(`duplicate reach id ${m.id}`);
      rids.push(m.id);
      if (!DOMAINS.includes(m.domain)) bad.push(`reach ${m.id} sits in unknown domain ${m.domain}`);
      for (const [f, p] of Object.entries(m.permit || {})) {
        if (!ids.includes(f)) bad.push(`reach ${m.id} gives a permit to ${f}, who is not in this operation`);
        if (!['free', 'priced', 'barred'].includes(p)) bad.push(`reach ${m.id} permit ${p} is not free, priced or barred`);
      }
      if (m.limit != null && !(Number.isInteger(m.limit) && m.limit >= 1 && m.limit <= 3)) bad.push(`reach ${m.id} needs a limit from 1 to 3`);
      if (m.ap != null && !(Number.isInteger(m.ap) && m.ap >= 1 && m.ap <= 2)) bad.push(`reach ${m.id} needs 1 or 2 actions`);
      (m.effects || []).forEach((e) => effectOk(e, `reach ${m.id}`));
      (m.pricedEffects || []).forEach((e) => effectOk(e, `reach ${m.id} price`));
      if (Object.values(m.permit || {}).includes('priced') && !(m.pricedEffects || []).length) bad.push(`reach ${m.id} is priced and names no price`);
      for (const x of m.evidence || []) if (!x || !/^EV-\\d{3}$/.test(x.id || '') || !x.line) bad.push(`reach ${m.id} has evidence without a card id and a line`);
    }
    for (const s of op.script || []) for (const e of s.effects || []) if (e.mirror != null && !rids.includes(e.mirror)) bad.push(`script turn ${s.turn} mirrors an unknown reach move ${e.mirror}`);
    const hids = [];
    for (const h of op.holdings || []) {"""),
 # ---------------- shim: the action and the band
 ("""    if (action.holding != null) clean.holding = String(action.holding);""",
  """    if (action.holding != null) clean.holding = String(action.holding);
    if (action.move != null) clean.move = String(action.move);"""),
 ("""id: o.id, kind: o.kind, title: o.title, label: o.label, tier: o.tier, dimension: o.dimension, rule: E.DIMENSIONS[o.dimension],""",
  """id: o.id, kind: o.kind, title: o.title, label: o.label, tier: o.tier, band: o.band || null, dimension: o.dimension, rule: E.DIMENSIONS[o.dimension],"""),
 ("""id: o.id, kind: o.kind, title: o.title, label: o.label, tier: o.tier, dimension: o.dimension, arc: o.arc, world: o.world, watch: watchOf(o), stars: best[o.id] ?? null""",
  """id: o.id, kind: o.kind, title: o.title, label: o.label, tier: o.tier, band: o.band || null, dimension: o.dimension, arc: o.arc, world: o.world, watch: watchOf(o), stars: best[o.id] ?? null"""),
 # ---------------- client: operations list, operation page
 ("""<span class="chip2">T${o.tier}</span>""", """${o.band ? '<span class="chip2 band">Asymmetry band</span>' : ''}<span class="chip2">T${o.tier}</span>"""),
 ("""${[1, 2, 3, 4, 5, 6].map((t) => `<button type="button" data-tier="${t}" aria-pressed="${t === o.tier}">T${t}</button>`).join('')}</div><p class="small muted">The record sets Tier ${o.tier}.</p>""",
  """${(o.band ? [o.tier] : [1, 2, 3, 4, 5, 6]).map((t) => `<button type="button" data-tier="${t}" aria-pressed="${t === o.tier}">T${t}</button>`).join('')}</div><p class="small muted">${o.band ? 'This operation sits in the asymmetry band and plays at Tier ' + o.tier + ' only.' : 'The record sets Tier ' + o.tier + '.'}</p>"""),
 ("""          <div class="card rulebox"><div class="label">The physics""",
  """          ${o.band ? '<div class="card bandnote"><div class="label">Asymmetry band</div><p>The rival acts on its own population and its own firms with no court, no press and no vote in the way. Your side holds the same kinds of power under law. Some acts are closed to you and some carry a price. The board lists each one with its source.</p><p class="small muted">A scripted player wins this operation rarely. The score is the game\\'s reading and not a count.</p></div>' : ''}
          <div class="card rulebox"><div class="label">The physics"""),
 # ---------------- client: the board
 ("""${factionsHtml(v)}${cadresHtml(v)}${holdingsHtml(v)}""", """${factionsHtml(v)}${cadresHtml(v)}${holdingsHtml(v)}${reachHtml(v)}"""),
 ("""  function holdingsHtml(v) {""",
  """  function reachHtml(v) {
    if (!v.reach || !v.reach.length) return '';
    const STATE = { barred: 'Closed to you', priced: 'Has a price', free: 'Open' };
    const rows = v.reach.map((m) => {
      const st = m.used >= m.limit && m.permit !== 'barred' ? 'Used' : STATE[m.permit];
      const ev = m.evidence && m.evidence.length ? `<details class="rv-ev"><summary>Why</summary><ul>${m.evidence.map((x) => `<li><b>${esc(x.id)}</b> ${esc(x.line)}</li>`).join('')}</ul></details>` : '';
      const price = m.permit === 'priced' ? `<div class="small">Costs ${m.price} legitimacy and counts as an act against your own position.</div>` : '';
      return `<li class="reach ${esc(m.permit)} ${m.used >= m.limit ? 'gone' : ''}"><div><b>${esc(m.name)}</b> <span class="chip2 rstate">${esc(st)}</span></div><div class="small">${icon(m.domain)} ${esc(m.domain)}</div><div class="small muted">${esc(m.text)}</div>${price}${ev}${m.canUse ? `<button type="button" data-reach="${esc(m.id)}">Use · ${m.ap} action${m.ap > 1 ? 's' : ''}</button>` : ''}</li>`;
    }).join('');
    return `<section class="reachbox" aria-label="Reach"><div class="label">Reach</div><ul>${rows}</ul><p class="small muted">An act marked closed is open to the rival and barred to you. Each one lists the evidence behind that.</p></section>`;
  }

  function holdingsHtml(v) {"""),
 ("""    bind('[data-yield]', 'click', (e) => {""",
  """    bind('[data-reach]', 'click', (e) => {
      const id = e.currentTarget.dataset.reach;
      const m = v.reach.find((x) => x.id === id);
      const price = m.permit === 'priced' ? `<p class="small">This act has a price. It costs ${m.price} legitimacy and counts as an act against your own position.</p>` : '';
      openSheet(`<h3>${esc(m.name)}</h3><p class="small">${esc(m.text)}</p>${price}<div class="acts"><button type="button" class="primary" data-yes>Use it · ${m.ap} action${m.ap > 1 ? 's' : ''}</button><button type="button" data-do="close">Not now</button></div>`,
        (sheet) => { bind('[data-yes]', 'click', () => { closeSheet(); act({ type: 'reach', move: id }); }, sheet); bind('[data-do="close"]', 'click', closeSheet, sheet); });
    });
    bind('[data-yield]', 'click', (e) => {"""),
 # ---------------- client: the report
 ("""  function ownHtml(rep) {""",
  """  function reachReportHtml(rep) {
    const r = rep.reach;
    if (!r || !r.length) return '';
    const closed = r.filter((m) => m.permit === 'barred');
    const priced = r.filter((m) => m.permit === 'priced' && m.used);
    const item = (m, lead) => `<li><b>${esc(m.name)}.</b> ${lead} <span class="small muted">${m.evidence.map((x) => esc(x.id)).join(', ')}</span></li>`;
    const rows = closed.map((m) => item(m, `${m.mirror ? `The rival used it ${m.mirror} time${m.mirror > 1 ? 's' : ''} in this run. ` : 'The rival did not use it in this run. '}It was closed to you.`))
      .concat(priced.map((m) => item(m, `You used it and paid for it.`))).join('');
    return `<h3>What your rules closed</h3><ul class="own">${rows || '<li>Nothing closed in this run.</li>'}</ul><p class="small muted">The permits are the game's reading of the evidence cards. They are not a count of anything.</p>`;
  }

  function ownHtml(rep) {"""),
 ("""      ${ownHtml(rep)}
      <h3>What to change</h3>""", """      ${reachReportHtml(rep)}
      ${ownHtml(rep)}
      <h3>What to change</h3>"""),
], 'game')
(root / 'out/game.js').write_text(g)
cut = g.index('/* TDW demo shim.')
(root / 'out/engine.js').write_text(g[:cut].rstrip() + '\n')

r = (root / 'out/record.v6.js').read_text()
r = patch(r, [
 ("""      case 'yield': if (!/^[A-Za-z0-9_-]{1,30}$/.test(a.holding || '')) fail('Bad holding.'); return 'y' + a.holding;""",
  """      case 'yield': if (!/^[A-Za-z0-9_-]{1,30}$/.test(a.holding || '')) fail('Bad holding.'); return 'y' + a.holding;
      case 'reach': if (!/^[A-Za-z0-9_-]{1,30}$/.test(a.move || '')) fail('Bad move.'); return 'r' + a.move;"""),
 ("""    if (y) return { type: 'yield', holding: y[1] };""",
  """    if (y) return { type: 'yield', holding: y[1] };
    const rr = /^r([A-Za-z0-9_-]{1,30})$/.exec(tok);
    if (rr) return { type: 'reach', move: rr[1] };"""),
 ("""      case 'yield': return `Give up ${((S.holdings || []).find((h) => h.id === a.holding) || {}).name || a.holding}`;""",
  """      case 'yield': return `Give up ${((S.holdings || []).find((h) => h.id === a.holding) || {}).name || a.holding}`;
      case 'reach': return `Use ${((S.reach || []).find((m) => m.id === a.move) || {}).name || a.move}`;"""),
 ("""      case 'yield': return `${e.name} is given up.`;""",
  """      case 'yield': return `${e.name} is given up.`;
      case 'reach': return `${e.name} is used${e.permit === 'priced' ? ', at a price' : ''}.`;
      case 'mirror': return null;
      case 'unslope': return `${fn(e.f)}: ${e.n} slope removed from ${e.d}.`;"""),
 ("""    const holdings = (S.holdings || []).map(""",
  """    const mirrors = {}; const usedMoves = {};
    for (const fr of frames) for (const e of fr.ev) { if (e.k === 'mirror') mirrors[e.id] = (mirrors[e.id] || 0) + 1; if (e.k === 'reach') usedMoves[e.id] = (usedMoves[e.id] || 0) + 1; }
    const reach = (S.reach || []).map((m) => ({ id: m.id, name: m.name, text: m.text, permit: m.permit[S.player] || 'free', used: usedMoves[m.id] || 0, mirror: mirrors[m.id] || 0, evidence: m.evidence }));
    const holdings = (S.holdings || []).map("""),
 ("""    for (const h of holdings) {
      if (!h.consuming) continue;""",
  """    for (const m of reach) if (m.permit === 'barred' && m.mirror) changes.push(`The rival used ${m.name} ${m.mirror} time${m.mirror > 1 ? 's' : ''}. That act was closed to ${You === 'You' ? 'you' : 'the player'}.`);
    for (const h of holdings) {
      if (!h.consuming) continue;"""),
 ("""      own: { sides }, holdings,""", """      own: { sides }, holdings, reach,"""),
], 'record')
(root / 'out/record.js').write_text(r)
(root / 'parts/record.js').write_text(r)

css = (root / 'parts/style.v6.css').read_text() + r"""
/* ---- version 7: permits and reach ---- */
.reachbox { margin: 12px 0; }
.reachbox ul { list-style: none; margin: 6px 0; padding: 0; display: grid; gap: 8px; }
.reach { padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); display: grid; gap: 4px; }
.reach.barred { border-style: dashed; border-color: var(--bad); }
.reach.priced { border-color: var(--warn); }
.reach.gone { opacity: .6; }
.reach .rstate { font-weight: 700; }
.reach.barred .rstate { border-color: var(--bad); color: var(--bad); }
.reach.priced .rstate { border-color: var(--warn); color: var(--warn); }
.reach button { justify-self: start; margin-top: 4px; }
.rv-ev summary { cursor: pointer; font-size: 14px; }
.rv-ev ul { margin: 4px 0 0; padding-left: 18px; display: grid; gap: 4px; font-size: 14px; }
.chip2.band { font-weight: 700; border-color: var(--bad); color: var(--bad); }
.bandnote { border-left: 4px solid var(--bad); }
"""
(root / 'parts/style.css').write_text(css)
print('patched: game, engine, record, style. OK')
