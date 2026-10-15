'use strict';
// Sets each operation's handScale so the balance bot wins at the base curve's rate for its tier.
// Usage: node test/tune.js content/eraN.json content/eraN.tuning.json [games]
const fs = require('node:fs'); const path = require('node:path');
process.argv[2] = path.resolve(process.argv[2]);
const out = process.argv[3]; const N = Number(process.argv[4] || 300);
const { rate } = require('./rate.js');
const C = require(process.argv[2]);
const TARGET = { 1: 0.97, 2: 0.88, 3: 0.70, 4: 0.42, 5: 0.28, 6: 0.18 };
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const res = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};   // keep the settings already there
for (const o of C.ops.filter((x) => !x.hidden && (!only || only.includes(x.id)))) {
  let lo = 0.3; let hi = 2.2; let best = { hs: 1, err: 9 };
  for (let i = 0; i < 9; i++) {
    const mid = (lo + hi) / 2;
    const trial = JSON.parse(JSON.stringify(o)); trial.rules = { handScale: Math.round(mid * 100) / 100 }; delete trial.consumeAdj;
    const r = rate(trial, N);
    const err = Math.abs(r - TARGET[o.tier]);
    if (err < best.err) best = { hs: trial.rules.handScale, err, r };
    if (r > TARGET[o.tier]) lo = mid; else hi = mid;
  }
  res[o.id] = { handScale: best.hs, consumeAdj: 0 };
  console.log(o.id, 'T' + o.tier, 'target', TARGET[o.tier], 'got', best.r.toFixed(2), 'handScale', best.hs);
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
