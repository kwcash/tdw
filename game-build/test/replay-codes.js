'use strict';
// Replays codes made by an earlier build against the current engine, record module and content.
// Usage: node test/replay-codes.js codes.json content.json
const path = require('node:path'); const fs = require('node:fs');
const E = require('../out/engine.js'); const R = require('../out/record.js');
const codes = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const C = require(path.resolve(process.argv[3]));
const ctx = R.makeCtx(E, C); let bad = 0;
for (const [id, c] of Object.entries(codes)) {
  const v = R.verify(c.code, ctx);
  const same = v.ok && v.summary.score === c.score && v.summary.outcome === c.outcome && v.summary.turns === c.turns;
  console.log(id, v.ok ? 'verifies' : 'FAILS: ' + v.error, '| outcome', v.ok && v.summary.outcome, 'score', v.ok && v.summary.score, 'turns', v.ok && v.summary.turns, '| same result as before:', same);
  if (!same) bad++;
}
console.log(bad ? `${bad} REPLAY FAILURES` : 'all codes verify with the same result');
process.exit(bad ? 1 : 0);
