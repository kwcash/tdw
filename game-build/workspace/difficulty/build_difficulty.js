'use strict';
// Approximate difficulty. Usage: node difficulty/build_difficulty.js [SEEDS]   (default 400, about twelve minutes)
// For every operation a player can pick, in all four builds, a scripted player plays each tier from 1 to 7 on SEEDS fixed seeds.
// The share it wins is the difficulty reading. It is a reading of a simple bot and not a measure of people.
// Writes difficulty/difficulty.json. difficulty/add_difficulty.py copies each build's table into its content file.
const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');
const E = require('../out/engine.js'); const B = require('../test/bots.js');
const ROOT = path.join(__dirname, '..');
const SEEDS = Number(process.argv[2]) || 400;
const BUILDS = ['base', 'era1', 'era2', 'era3'];

// The bot plays as the tuner bot. Where an operation has holdings it gives up a consuming one on turn 1,
// and where it has reach moves it uses the open ones. Those are the plain lines a new player is taught.
const policyFor = (op) => (op.holdings && op.holdings.length ? B.policy('yield1') : op.reach && op.reach.length ? B.policy('reach-free') : B.tunerBot);
function winRate(op, C, tier, seeds = SEEDS) {
  const reg = { factions: C.factions, cadres: C.cadres, pacts: C.pacts, ruleset: C.ruleset };
  const p = policyFor(op); let won = 0;
  for (let i = 0; i < seeds; i++) {
    const S = E.newGame(op, { seed: 'diff-' + i, tier, registry: reg });
    let g = 0;
    while (!S.over && g++ < 400) { const a = p(S); try { E.act(S, a); } catch { E.act(S, { type: 'end' }); } }
    if (S.over && S.over.outcome === 'win') won++;
  }
  return Math.round((100 * won) / seeds);
}
function table(C, seeds = SEEDS) {
  const out = {};
  for (const op of C.ops) if (!op.hidden) out[op.id] = [1, 2, 3, 4, 5, 6, 7].map((t) => winRate(op, C, t, seeds));
  return out;
}
// What the table was built from. A test recomputes these and fails when any of them moved, so a stale table cannot ship.
const sha = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex').slice(0, 16);
function inputs() {
  return { engine: sha(fs.readFileSync(path.join(ROOT, 'out/engine.js'), 'utf8')), bots: sha(fs.readFileSync(path.join(ROOT, 'test/bots.js'), 'utf8')), builder: sha(fs.readFileSync(__filename, 'utf8')) };
}
function fingerprints(C) {
  const out = { registry: sha({ factions: C.factions, cadres: C.cadres, pacts: C.pacts, ruleset: C.ruleset }), ops: {} };
  for (const op of C.ops) if (!op.hidden) out.ops[op.id] = sha(op);
  return out;
}
module.exports = { winRate, table, policyFor, SEEDS, inputs, fingerprints, sha };

if (require.main === module) {
  const t0 = Date.now(); const builds = {}; const prints = {};
  for (const b of BUILDS) {
    const C = JSON.parse(fs.readFileSync(path.join(ROOT, `content/${b}.json`), 'utf8'));
    builds[b] = table(C); prints[b] = fingerprints(C);
    console.log(`${b}: ${Object.keys(builds[b]).length} operations, ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  const doc = {
    schema: 1,
    note: 'The share of games a scripted player wins, in percent, at Tier 1 to Tier 7. A reading of a simple bot and not a measure of people. Built by difficulty/build_difficulty.js.',
    seeds: SEEDS,
    engine: E.VERSION,
    inputs: inputs(),
    fingerprints: prints,
    builds,
  };
  fs.writeFileSync(path.join(__dirname, 'difficulty.json'), JSON.stringify(doc, null, 1) + '\n');
  console.log('wrote difficulty/difficulty.json');
}
