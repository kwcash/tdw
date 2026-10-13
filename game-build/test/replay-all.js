'use strict';
// Verifies a set of codes made by an earlier build. Usage: node test/replay-all.js codes.all.json [skipOpIds comma list]
const path = require('node:path'); const fs = require('node:fs');
const E = require('../out/engine.js'); const R = require('../out/record.js');
const codes = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const skip = (process.argv[3] || '').split(',').filter(Boolean);
let n = 0, bad = 0;
for (const [f, list] of Object.entries(codes)) {
  const C = require(path.resolve(__dirname, '..', 'content', f + '.json')); const ctx = R.makeCtx(E, C);
  for (const c of list) {
    if (skip.includes(c.id)) continue;
    const v = R.verify(c.code, ctx); n++;
    if (!v.ok || v.summary.outcome !== c.outcome || v.summary.score !== c.score || v.summary.turns !== c.turns || v.summary.stars !== c.stars) { bad++; console.log('MISMATCH', f, c.id, c.bot, c.seed, v.ok ? `${v.summary.outcome} ${v.summary.score} vs ${c.outcome} ${c.score}` : v.error); }
  }
}
console.log(bad ? `${bad} of ${n} codes differ` : `all ${n} codes verify with the same result`);
process.exit(bad ? 1 : 0);
