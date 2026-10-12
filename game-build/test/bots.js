'use strict';
const E = require('../out/engine.js');
function listActions(S) {
  const o = E.options(S); const acts = [];
  for (const [id, x] of Object.entries(o.intents)) { if (x.accept) acts.push({ type: 'accept', intent: Number(id) }); if (x.detect != null) acts.push({ type: 'detect', intent: Number(id) }); if (x.disrupt != null) acts.push({ type: 'disrupt', intent: Number(id) }); }
  for (const [d, x] of Object.entries(o.domains)) { if (x.open != null) acts.push({ type: 'open', domain: d }); if (x.defend != null) acts.push({ type: 'defend', domain: d }); if (x.disrupt != null) acts.push({ type: 'disrupt', domain: d }); }
  return acts;
}
function randomBot(S, r) {
  const acts = listActions(S).filter((a) => a.type !== 'accept' || r() < 0.3);
  if (!acts.length || r() < 0.15) return { type: 'end' };
  return acts[Math.floor(r() * acts.length)];
}
// Detects, then disrupts visible cards, then defends the hottest domain. Enough to reach varied endings.
function greedyBot(S) {
  const acts = listActions(S); const B = S.board;
  const det = acts.find((a) => a.type === 'detect'); if (det && S.ap >= 2) return det;
  const dis = acts.find((a) => a.type === 'disrupt' && a.intent != null); if (dis) return dis;
  const def = acts.filter((a) => a.type === 'defend').sort((x, y) => B[y.domain].p - B[x.domain].p)[0];
  if (def && S.ap >= 1) return def;
  return { type: 'end' };
}
module.exports = { listActions, randomBot, greedyBot };

// The balance bot used when the era builds were tuned. It reads the threat map, disrupts the most dangerous visible card,
// defends the domain under the most threat, clears slopes, and takes offers late.
const mine = (S, it) => (it.victim || S.player) === S.player;
function threatMap(S) {
  const m = {};
  for (const it of S.intents) {
    if (it.cancelled || it.done || it.offer || !it.target || !mine(S, it)) continue;
    const known = it.face === 'up' || it.revealed;
    const t = known ? (it.revealed ? it.target : it.shown) : null;
    if (!t) continue;
    m[t] = (m[t] || 0) + ((it.revealed ? it.amount : it.shownAmount) || 0);
  }
  return m;
}
function tunerBot(S) {
  const acts = listActions(S); const Bd = S.board;
  const has = (pred) => acts.find(pred);
  const offer = has((a) => a.type === 'accept' && S.turn >= S.maxTurns - 1 && ['S10', 'S31'].includes(S.intents.find((i) => i.id === a.intent).code));
  if (offer) return offer;
  const det = acts.filter((a) => a.type === 'detect');
  if (det.length && S.ap >= 2) return det[0];
  const legitCost = (S.rules.legit && S.rules.legit.cost) || {};
  const dis = acts.filter((a) => a.type === 'disrupt' && a.intent != null).map((a) => { const it = S.intents.find((i) => i.id === a.intent); const t = it.target; return { a, danger: (it.amount || 0) * 2 + (t ? Bd[t].p : 0) + (['S19', 'S30', 'S25', 'S33', 'S18'].includes(it.code) ? 3 : 0) + (E.CARDS[it.code].proxy || legitCost[it.code] ? 1 : 0) - (t ? Bd[t].s * 2 : 0) }; }).sort((x, y) => y.danger - x.danger);
  if (dis.length && dis[0].danger >= 5) return dis[0].a;
  const tm = threatMap(S);
  const def = acts.filter((a) => a.type === 'defend').map((a) => ({ a, v: (tm[a.domain] || 0) * 2 + Bd[a.domain].p - Bd[a.domain].s * 3 + (Bd[a.domain].theater ? 1 : 0) })).sort((x, y) => y.v - x.v);
  if (def.length && def[0].v >= 3) return def[0].a;
  const clr = acts.filter((a) => a.type === 'disrupt' && a.domain).map((a) => ({ a, v: Bd[a.domain].p + Bd[a.domain].slope * 2 })).sort((x, y) => y.v - x.v);
  if (clr.length && clr[0].v >= 3) return clr[0].a;
  const open = has((a) => a.type === 'open' && (tm[a.domain] || Bd[a.domain].p >= 2));
  if (open) return open;
  if (dis.length && dis[0].danger >= 2) return dis[0].a;
  if (def.length && def[0].v >= 1) return def[0].a;
  if (def.length && S.ap >= 1) return def[0].a;
  return { type: 'end' };
}
module.exports.tunerBot = tunerBot;
