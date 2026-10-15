#!/usr/bin/env python3 -I
"""Version 5 of the bundle: holdings that cost their holder, and acts against one's own position (Revision 33 of the book).
Both are opt-in per operation. Reads out/*.v4.js and parts/style.v4.css, writes out/game.js, out/engine.js, out/record.js, parts/record.js and parts/style.css."""
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

g = (root / 'out/game.v4.js').read_text()
g = patch(g, [
 # ---------------- engine: state
 ("""    S.rng = hashSeed(`${S.seed}|${op.id}|${tier}`);""",
  """    S.rng = hashSeed(`${S.seed}|${op.id}|${tier}`);
    // Holdings, when the operation has them. An operation without them carries no extra state.
    if (Array.isArray(op.holdings) && op.holdings.length) {
      S.holdings = op.holdings.map((h) => ({ id: h.id, name: h.name || h.id, domain: h.domain, cost: clamp(Math.round(h.cost || 0), 0, 3), denial: clamp(Math.round(h.denial || 0), 0, 3), couples: (h.couples || []).slice(), strains: (h.strains || []).slice(), raised: 0, denies: h.denies || null, text: h.text || '', yieldText: h.yieldText || '', onYield: clone(h.onYield || []), active: true }));
    }"""),
 # ---------------- engine: helpers and the denial
 ("""  function leverageFlow(S) {""",
  """  // Holdings (Revision 33). A holding costs its holder every turn and denies the rival part of its gain.
  // It is consuming where its cost is more than its denial. Giving one up can raise what the others cost (couples),
  // and keeping one can raise what the others cost while it stands (strains).
  const holdingsOf = (S) => S.holdings || [];
  const liveHoldings = (S) => holdingsOf(S).filter((h) => h.active);
  const holdingCost = (S, h) => Math.min(3, h.cost + (h.raised || 0) + liveHoldings(S).filter((o) => o !== h && o.strains.includes(h.id)).length);
  const isConsuming = (S, h) => holdingCost(S, h) > h.denial;
  const denialOf = (S, a) => liveHoldings(S).reduce((x, h) => x + (!h.denies || h.denies === a ? h.denial : 0), 0);
  function leverageFlow(S) {"""),
 ("""      if (g) { const a = topAggressor(S, S.player, d); gain[a] = (gain[a] || 0) + g; }
    }
    return gain;""",
  """      if (g) { const a = topAggressor(S, S.player, d); gain[a] = (gain[a] || 0) + g; }
    }
    for (const a of Object.keys(gain)) if (gain[a]) gain[a] = Math.max(0, gain[a] - denialOf(S, a));
    return gain;"""),
 # ---------------- engine: upkeep each turn
 ("""    for (const p of S.pacts) if (p.active) for (const e of p.perTurn || []) if (due(S, e)) applyEffect(S, e, ev);
""",
  """    for (const p of S.pacts) if (p.active) for (const e of p.perTurn || []) if (due(S, e)) applyEffect(S, e, ev);
    // Holdings: each live one costs its holder. Shields go first and then pressure.
    for (const h of liveHoldings(S)) {
      const cost = holdingCost(S, h);
      if (!cost) continue;
      const D = S.domainState[h.domain];
      const take = Math.min(cost, D.shields[S.player]);
      if (take) { D.shields[S.player] -= take; ev.push({ k: 'drain', d: h.domain, n: take, src: 'holding', f: S.player }); }
      if (cost > take) press(S, S.player, h.domain, cost - take, ev, 'holding', { by: null });
      const consuming = isConsuming(S, h);
      ev.push({ k: 'upkeep', id: h.id, name: h.name, d: h.domain, n: cost, denial: h.denial, consuming });
      if (consuming) ev.push({ k: 'self', f: S.player, type: 'overextension', why: h.name, n: cost });
      log(S, consuming ? `Holding ${h.name} costs ${cost} this turn and denies ${h.denial}.` : `Holding ${h.name} costs ${cost} this turn.`);
    }
"""),
 # ---------------- engine: self acts named in the content
 ("""      case 'legitimacy': addLegitimacy(S, f, e.n, ev, e.why || 'event'); break;""",
  """      case 'legitimacy': { const got = addLegitimacy(S, f, e.n, ev, e.why || 'event'); if (e.self && got) ev.push({ k: 'self', f, type: e.self, why: e.selfWhy || e.why || 'event', n: got }); break; }"""),
 ("""      for (const f of S.factions) if (flow[f]) addLegitimacy(S, f, flow[f], ev, 'standing');""",
  """      for (const f of S.factions) if (flow[f]) addLegitimacy(S, f, flow[f], ev, 'standing');
      for (const c of liveCadres(S)) if (c.mods && c.mods.self && c.mods.legitimacy < 0) ev.push({ k: 'self', f: c.faction, type: c.mods.self, why: c.name, n: c.mods.legitimacy });"""),
 # ---------------- engine: the action, the options and the view
 ("""    for (const c of S.cadres) if (c.faction === S.player && c.active !== false && !c.fixed && !(c.lock > 0) && !c.moved && S.ap >= 1) o.assign[c.id] = 1;
    return o;""",
  """    for (const c of S.cadres) if (c.faction === S.player && c.active !== false && !c.fixed && !(c.lock > 0) && !c.moved && S.ap >= 1) o.assign[c.id] = 1;
    if (holdingsOf(S).length) { o.yield = {}; for (const h of liveHoldings(S)) if (S.ap >= 1) o.yield[h.id] = 1; }
    return o;"""),
 ("""      case 'end': return endTurn(S);""",
  """      case 'yield': {
        const h = holdingsOf(S).find((x) => x.id === a.holding);
        if (!h) throw new Error('No such holding.');
        if (!h.active) throw new Error(`You already gave up ${h.name}.`);
        spend(1);
        const was = holdingCost(S, h);
        h.active = false;
        for (const id of h.couples) { const o2 = holdingsOf(S).find((x) => x.id === id && x.active); if (o2) o2.raised = (o2.raised || 0) + 1; }
        for (const e of h.onYield || []) applyEffect(S, e, ev);
        ev.push({ k: 'yield', id: h.id, name: h.name, d: h.domain, cost: was, denial: h.denial });
        S.flags.acts.push('yield');
        log(S, h.yieldText || `You give up ${h.name}. It no longer costs you and no longer denies the rival.`);
        break;
      }
      case 'end': return endTurn(S);"""),
 ("""can: { name: opt.name, doctrine: opt.doctrine, end: opt.end, assign: opt.assign }""",
  """can: { name: opt.name, doctrine: opt.doctrine, end: opt.end, assign: opt.assign, ...(opt.yield ? { yield: opt.yield } : {}) }"""),
 ("""      rules: { legitimacy: S.rules.legitimacy, spikeBelow: S.rules.legit.spikeBelow },
    };""",
  """      rules: { legitimacy: S.rules.legitimacy, spikeBelow: S.rules.legit.spikeBelow },
      ...(S.holdings ? { holdings: S.holdings.map((h) => ({ id: h.id, name: h.name, domain: h.domain, cost: holdingCost(S, h), baseCost: h.cost, denial: h.denial, consuming: isConsuming(S, h), active: h.active, couples: h.couples, strains: h.strains, text: h.text, canYield: !!(opt.yield && opt.yield[h.id]), yieldLegitimacy: h.onYield.filter((e) => e.type === 'legitimacy' && e.faction === S.player).reduce((x, e) => x + e.n, 0) })) } : {}),
    };"""),
 # ---------------- engine: validate
 ("""    const reg = registry || {};
    if (!op || typeof op !== 'object') return ['not an operation'];""",
  """    const reg = registry || {};
    const SELF_TYPES = ['predation on own base', 'overextension', 'purge of own capacity', 'breach of own legitimating rule', 'withdrawal of own commitment'];
    if (!op || typeof op !== 'object') return ['not an operation'];"""),
 ("""      if (!DOMAINS.includes(def.domain)) bad.push(`cadre ${id} sits in unknown domain ${def.domain}`);""",
  """      if (!DOMAINS.includes(def.domain)) bad.push(`cadre ${id} sits in unknown domain ${def.domain}`);
      if (def.mods && def.mods.self != null && !SELF_TYPES.includes(def.mods.self)) bad.push(`cadre ${id} names an unknown self-act type ${def.mods.self}`);"""),
 ("""      if (e.faction != null && op.factions && !ids.includes(e.faction)) bad.push(`${where}: faction ${e.faction} is not in the operation`);
    };""",
  """      if (e.faction != null && op.factions && !ids.includes(e.faction)) bad.push(`${where}: faction ${e.faction} is not in the operation`);
      if (e.self != null && !SELF_TYPES.includes(e.self)) bad.push(`${where}: unknown self-act type ${e.self}`);
    };"""),
 ("""    return bad;
  }

  return { VERSION,""",
  """    const hids = [];
    for (const h of op.holdings || []) {
      if (!h || typeof h.id !== 'string' || !ID_RE.test(h.id) || FORBIDDEN_ID.has(h.id)) { bad.push(`bad holding id ${h && h.id}`); continue; }
      if (hids.includes(h.id)) bad.push(`duplicate holding id ${h.id}`);
      hids.push(h.id);
      if (!DOMAINS.includes(h.domain)) bad.push(`holding ${h.id} sits in unknown domain ${h.domain}`);
      for (const k of ['cost', 'denial']) if (!Number.isInteger(h[k]) || h[k] < 0 || h[k] > 3) bad.push(`holding ${h.id} needs a ${k} from 0 to 3`);
      if (h.denies != null && !ids.includes(h.denies)) bad.push(`holding ${h.id} denies ${h.denies}, who is not in this operation`);
      (h.onYield || []).forEach((e) => effectOk(e, `holding ${h.id} onYield`));
    }
    for (const h of op.holdings || []) for (const k of ['couples', 'strains']) for (const c of h[k] || []) if (!hids.includes(c) || c === h.id) bad.push(`holding ${h.id} ${k} an unknown holding ${c}`);
    return bad;
  }

  return { VERSION,"""),
 # ---------------- shim
 ("""    if (action.cadre != null) clean.cadre = String(action.cadre);""",
  """    if (action.cadre != null) clean.cadre = String(action.cadre);
    if (action.holding != null) clean.holding = String(action.holding);"""),
 # ---------------- board
 ("""      ${factionsHtml(v)}${cadresHtml(v)}""", """      ${factionsHtml(v)}${cadresHtml(v)}${holdingsHtml(v)}"""),
 ("""  function elsewhereHtml(v) {""",
  """  function holdingsHtml(v) {
    if (!v.holdings || !v.holdings.length) return '';
    const rows = v.holdings.map((h) => {
      const state = !h.active ? 'given up' : h.consuming ? 'consuming' : 'sustainable';
      const raised = h.active && h.cost > h.baseCost ? ` · cost up ${h.cost - h.baseCost}` : '';
      return `<li class="holding ${h.active ? '' : 'gone'} ${h.active && h.consuming ? 'consuming' : ''}"><div><b>${esc(h.name)}</b> <span class="chip2 hstate">${state}</span></div><div class="small">${icon(h.domain)} ${esc(h.domain)} · costs ${h.cost} a turn${raised} · denies ${h.denial}</div>${h.text ? `<div class="small muted">${esc(h.text)}</div>` : ''}${h.canYield ? `<button type="button" data-yield="${esc(h.id)}">Give up · 1 action</button>` : ''}</li>`;
    }).join('');
    return `<section class="holdings" aria-label="Holdings"><div class="label">Holdings</div><ul>${rows}</ul><p class="small muted">A holding costs you every turn and keeps some leverage from the rival. A holding is consuming when its cost is more than what it denies.</p></section>`;
  }

  function elsewhereHtml(v) {"""),
 ("""    bind('[data-cadre]', 'click', (e) => {""",
  """    bind('[data-yield]', 'click', (e) => {
      const id = e.currentTarget.dataset.yield;
      const h = v.holdings.find((x) => x.id === id);
      const price = h.yieldLegitimacy < 0 ? ` Giving it up costs ${-h.yieldLegitimacy} legitimacy.` : '';
      const ties = h.couples && h.couples.length ? ` It also raises what ${h.couples.map((c) => (v.holdings.find((x) => x.id === c) || { name: c }).name).join(' and ')} costs.` : '';
      openSheet(`<h3>Give up ${esc(h.name)}</h3><p class="small">It stops costing ${h.cost} a turn and stops denying ${h.denial}.${esc(price)}${esc(ties)} It cannot be taken back.</p><div class="acts"><button type="button" class="primary" data-yes>Give it up · 1 action</button><button type="button" data-do="close">Keep it</button></div>`,
        (sheet) => { bind('[data-yes]', 'click', () => { closeSheet(); act({ type: 'yield', holding: id }); }, sheet); bind('[data-do="close"]', 'click', closeSheet, sheet); });
    });
    bind('[data-cadre]', 'click', (e) => {"""),
 # the report
 ("""  function reportHtml(rep, own) {""",
  """  function ownHtml(rep) {
    const o = rep.own;
    if (!o || !o.sides.some((s) => s.acts.length)) return '';
    const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    const rows = o.sides.map((s) => {
      const by = {}; s.acts.forEach((a) => { (by[a.type] = by[a.type] || []).push(a); });
      const body = s.acts.length ? Object.entries(by).map(([t, l]) => `${esc(cap(t))} (${[...new Set(l.map((a) => a.why))].map(esc).join(', ')}) on turn${l.length > 1 ? 's' : ''} ${l.map((a) => a.turn).join(', ')}`).join('. ') + '.' : 'None recorded.';
      return `<li><b>${esc(s.name)}</b>${s.player ? ' (you)' : ''}. ${body}</li>`;
    }).join('');
    return `<h3>Acts against its own position</h3><ul class="own">${rows}</ul><p class="small muted">Each act is typed by what it was when it happened. The result does not decide it.</p>`;
  }

  function reportHtml(rep, own) {"""),
 ("""      <h3>What to change</h3><ul class="changes">""", """      ${ownHtml(rep)}
      <h3>What to change</h3><ul class="changes">"""),
], 'game')
(root / 'out/game.js').write_text(g)
cut = g.index('/* TDW demo shim.')
(root / 'out/engine.js').write_text(g[:cut].rstrip() + '\n')

r = (root / 'out/record.v4.js').read_text()
r = patch(r, [
 ("""      case 'assign': if (!/^[A-Za-z0-9_-]{1,30}$/.test(a.cadre || '')) fail('Bad leader.'); return 'g' + domChar(E, a.domain) + a.cadre;""",
  """      case 'assign': if (!/^[A-Za-z0-9_-]{1,30}$/.test(a.cadre || '')) fail('Bad leader.'); return 'g' + domChar(E, a.domain) + a.cadre;
      case 'yield': if (!/^[A-Za-z0-9_-]{1,30}$/.test(a.holding || '')) fail('Bad holding.'); return 'y' + a.holding;"""),
 ("""    if (g) return { type: 'assign', cadre: g[2], domain: E.DOMAINS[IDX.indexOf(g[1])] };""",
  """    if (g) return { type: 'assign', cadre: g[2], domain: E.DOMAINS[IDX.indexOf(g[1])] };
    const y = /^y([A-Za-z0-9_-]{1,30})$/.exec(tok);
    if (y) return { type: 'yield', holding: y[1] };"""),
 ("""      case 'assign': return `Move ${(ctxNow""",
  """      case 'yield': return `Give up ${((S.holdings || []).find((h) => h.id === a.holding) || {}).name || a.holding}`;
      case 'assign': return `Move ${(ctxNow"""),
 ("""      case 'legit': return e.n ?""",
  """      case 'upkeep': return `Holding ${e.name} costs ${e.n}${e.consuming ? ` and denies only ${e.denial}` : ''}.`;
      case 'yield': return `${e.name} is given up.`;
      case 'self': return `${fn(e.f)}: an act against its own position (${e.type}), ${e.why}.`;
      case 'legit': return e.n ?"""),
 ("""const SRC = { slope: 'Slopes', noise: 'Entropy noise', spill: 'Spill from a full domain', trap: 'The door that shut' };""",
  """const SRC = { slope: 'Slopes', noise: 'Entropy noise', spill: 'Spill from a full domain', trap: 'The door that shut', holding: 'The cost of holding' };"""),
 ("""    // Up to two changes, each tied to a number in this run.
    const changes = [];
    const lost = summary.outcome !== 'win';""",
  """    // Acts against one's own position (Revision 33). Typed by structure when they happen. Both sides are reported.
    const sideName = (f) => { const x = ctx.reg.factions[f]; return (x && (x.short || x.name)) || f; };
    const sides = S.factions.filter((f) => f === S.player || S.ledger[f].control === 'ai').map((f) => ({ id: f, name: sideName(f), player: f === S.player, acts: [] }));
    const paid = {}; const gave = {};
    for (const fr of frames) for (const e of fr.ev) {
      if (e.k === 'self') { const side = sides.find((x) => x.id === e.f); if (side) side.acts.push({ turn: fr.turn, type: e.type, why: e.why, n: e.n }); }
      if (e.k === 'upkeep') paid[e.id] = (paid[e.id] || 0) + e.n;
      if (e.k === 'yield') gave[e.id] = fr.turn;
    }
    const holdings = (S.holdings || []).map((h) => ({ id: h.id, name: h.name, cost: h.cost, denial: h.denial, consuming: h.cost > h.denial, paid: paid[h.id] || 0, gaveUpOn: gave[h.id] || null }));

    // Up to two changes, each tied to a number in this run.
    const changes = [];
    const lost = summary.outcome !== 'win';
    for (const h of holdings) {
      if (!h.consuming) continue;
      if (h.gaveUpOn) changes.push(`${You} gave up ${h.name} on turn ${h.gaveUpOn}. By this operation's scores it cost ${h.cost} a turn and denied ${h.denial}. ${h.paid ? `Holding it had cost ${h.paid} by then.` : 'Holding it had cost nothing by then.'}`);
      else if (h.paid) changes.push(`${You} kept ${h.name} to the end. By this operation's scores it cost ${h.cost} a turn and denied ${h.denial}, and it cost ${h.paid} in all. Giving it up stops the cost.`);
    }"""),
 ("""      stats: { detects: S.stats.detects, disrupts: S.stats.disrupts, defends: S.stats.defends }, changes: changes.slice(0, 2),""",
  """      stats: { detects: S.stats.detects, disrupts: S.stats.disrupts, defends: S.stats.defends }, changes: changes.slice(0, 2),
      own: { sides }, holdings,"""),
], 'record')
(root / 'out/record.js').write_text(r)
(root / 'parts/record.js').write_text(r)

css = (root / 'parts/style.v4.css').read_text() + """
/* ---- version 5: holdings and acts against one's own position ---- */
.holdings, .cadres { margin: 12px 0; }
.holdings ul { list-style: none; margin: 6px 0; padding: 0; display: grid; gap: 8px; }
.holding { padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); display: grid; gap: 4px; }
.holding.consuming { border-color: var(--warn); }
.holding.gone { opacity: .6; }
.holding .hstate { font-weight: 700; }
.holding.consuming .hstate { border-color: var(--warn); color: var(--warn); }
.holding button { justify-self: start; margin-top: 4px; }
ul.own { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
"""
(root / 'parts/style.css').write_text(css)
print('patched: game, engine, record, style. OK')
