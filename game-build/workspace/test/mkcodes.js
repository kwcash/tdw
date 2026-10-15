'use strict';
// Plays W002, W005 and W011 to the end on the CURRENT content and prints three verified-record codes.
// Usage: node test/mkcodes.js content.json > codes.json
const path = require('node:path');
const E = require('../out/engine.js'); const R = require('../out/record.js'); const B = require('./bots.js');
const C = require(path.resolve(process.argv[2]));
const ctx = R.makeCtx(E, C);
const REG = { factions: C.factions, cadres: C.cadres, pacts: C.pacts, ruleset: C.ruleset };
const clone = (x) => JSON.parse(JSON.stringify(x));
const out = {};
for (const id of ['W002', 'W005', 'W011']) {
  const op = C.ops.find((o) => o.id === id);
  let S = E.newGame(op, { seed: 'freeze1', tier: op.tier, registry: REG }); const log = []; let g = 0;
  while (!S.over && g++ < 400) {
    let a = B.tunerBot(S);
    if (g === 1) { const ids = Object.keys(E.options(S).assign || {}); if (ids.length) a = { type: 'assign', cadre: ids[0], domain: op.spine === 'Kinetic' ? 'Association' : 'Kinetic' }; }
    S = clone(S);
    try { E.act(S, a); log.push(a); } catch { E.act(S, { type: 'end' }); log.push({ type: 'end' }); }
  }
  const code = R.makeCode(ctx, { opId: id, tier: op.tier, seed: 'freeze1', lens: null, doctrine: null, mode: 'free', maxTurns: null, actions: log });
  const v = R.verify(code, ctx);
  out[id] = { code, ok: v.ok, outcome: v.ok && v.summary.outcome, score: v.ok && v.summary.score, turns: v.ok && v.summary.turns, assigns: log.filter((a) => a.type === 'assign').length };
}
console.log(JSON.stringify(out, null, 1));
