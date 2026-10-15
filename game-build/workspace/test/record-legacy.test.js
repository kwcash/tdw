'use strict';
// A result code made by the original engine and record.js must verify on the version 2 engine, with the same result.
const assert = require('node:assert');
const OE = require('../orig/engine.js'); const OR = require('../orig/record.js');
const NE = require('../out/engine.js'); const NR = require('../out/record.js');
const C = require('../content/base.json');
const octx = OR.makeCtx(OE, C); const nctx = NR.makeCtx(NE, C);
let n = 0, kinds = {};
const ops = C.ops.filter((o) => !o.hidden);
for (let i = 0; i < ops.length; i += 3) {
  const op = ops[i];
  for (const [seed, mode] of [['a1', 'free'], ['zz9', 'free']]) {
    const lens = i % 2 ? 'Asymmetry' : null;
    let S = OE.newGame(op, { seed, tier: 2 + (i % 4), lens, mode }); const log = []; let g = 0;
    while (!S.over && g++ < 300) {
      const o = OE.options(S); const acts = [];
      for (const [id, x] of Object.entries(o.intents)) { if (x.detect != null) acts.push({ type: 'detect', intent: +id }); if (x.disrupt != null) acts.push({ type: 'disrupt', intent: +id }); }
      for (const [d, x] of Object.entries(o.domains)) { if (x.defend != null) acts.push({ type: 'defend', domain: d }); if (x.disrupt != null) acts.push({ type: 'disrupt', domain: d }); if (x.open != null) acts.push({ type: 'open', domain: d }); }
      if (o.name && S.turn > 3) acts.push({ type: 'name', domain: OE.DOMAINS[(i + g) % 12] });
      const a = g % 5 === 0 || !acts.length ? { type: 'end' } : acts[(i * 7 + g * 3) % acts.length];
      try { OE.act(S, a); log.push(a); } catch { OE.act(S, { type: 'end' }); log.push({ type: 'end' }); }
    }
    if (!S.over) continue;
    const meta = { opId: op.id, tier: 2 + (i % 4), seed, lens, doctrine: null, mode: 'free', maxTurns: null, actions: log };
    const code = OR.makeCode(octx, meta);
    const ov = OR.verify(code, octx); assert.ok(ov.ok, ov.error);
    const nv = NR.verify(code, nctx); assert.ok(nv.ok, `${op.id}: ${nv.error}`);
    assert.deepStrictEqual(nv.summary, ov.summary, op.id);
    assert.strictEqual(NR.makeCode(nctx, { ...meta, actions: log }), code, 'same code text');
    // frames: the board and the hand match at every step
    assert.strictEqual(nv.frames.length, ov.frames.length);
    const strip = (sn) => { const c = JSON.parse(JSON.stringify(sn)); if (c.over) delete c.over.consumedBy; return c; }; // consumedBy is the one field version 2 adds
    nv.frames.forEach((f, k) => { assert.deepStrictEqual(strip(f.snap), ov.frames[k].snap, `${op.id} frame ${k}`); assert.deepStrictEqual(f.hand, ov.frames[k].hand); });
    // the report text
    assert.deepStrictEqual(NR.report(nv, nctx).changes, OR.report(ov, octx).changes);
    n++;
  }
}
console.log(`OK: ${n} codes from the original engine verify identically on version 2 (summary, every frame, report)`);
