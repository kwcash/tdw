'use strict';
// Win rate of the lite greedy bot per operation. Usage: node test/rate.js content/era.json [games]
const path = require('node:path');
const E = require('../out/engine.js');
const B = require('./bots.js');
const C = require(path.resolve(process.argv[2]));
const N = Number(process.argv[3] || 100);
const REG = { factions: C.factions, cadres: C.cadres, pacts: C.pacts, ruleset: C.ruleset };
function play(op, seed, tier) {
  const S = E.newGame(op, { seed, tier, registry: REG }); let g = 0;
  while (!S.over && g++ < 400) { const a = (process.env.LITE ? B.greedyBot : B.tunerBot)(S); try { E.act(S, a); } catch { E.act(S, { type: 'end' }); } }
  return S.over && S.over.outcome === 'win';
}
function rate(op, n = N) { let w = 0; for (let i = 0; i < n; i++) if (play(op, 's' + i, op.tier)) w++; return w / n; }
module.exports = { rate, play, REG };
if (require.main === module) {
  const rows = {};
  for (const o of C.ops.filter((x) => !x.hidden)) rows[`${o.id} T${o.tier} ${o.title.slice(0, 22)}`] = { win: Math.round(100 * rate(o)) + '%', hs: o.rules && o.rules.handScale, adj: o.consumeAdj };
  console.table(rows);
}
