'use strict';
// Freeze check. Usage: node test/freeze.js before.json after.json
// C001 and W001 to W012 may change only brief, record, reading, gapText, fix, label and when.end.
const path = require('node:path');
const A = require(path.resolve(process.argv[2])); const B = require(path.resolve(process.argv[3]));
const ALLOWED = new Set(['brief', 'record', 'reading', 'gapText', 'fix', 'label', 'when.end']);
const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y);
let bad = 0; const changed = {};
for (const a of A.ops) {
  const b = B.ops.find((o) => o.id === a.id);
  if (!b) { console.log('FAIL missing op', a.id); bad++; continue; }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (k === 'when') {
      if (!eq(a.when.start, b.when.start)) { console.log('FAIL', a.id, 'when.start changed'); bad++; }
      if (!eq(a.when.end, b.when.end)) { (changed[a.id] = changed[a.id] || []).push('when.end'); if (!ALLOWED.has('when.end')) bad++; }
      continue;
    }
    if (eq(a[k], b[k])) continue;
    (changed[a.id] = changed[a.id] || []).push(k);
    if (a.id === 'C001' || !ALLOWED.has(k)) { console.log('FAIL', a.id, 'changed frozen field', k); bad++; }
  }
}
for (const k of ['factions', 'cadres', 'pacts', 'ruleset', 'taxonomy', 'daily', 'dailyEpoch', 'storageKey', 'era', 'tutorial', 'schema']) if (!eq(A[k], B[k])) { console.log('FAIL', k, 'changed'); bad++; }
const added = B.ops.filter((o) => !A.ops.some((x) => x.id === o.id)).map((o) => o.id);
console.log('changed fields by op', JSON.stringify(changed));
console.log('added ops', added.join(', '), '| arcs before', A.arcs.map((a) => a.nodes.length).join(','), 'after', B.arcs.map((a) => a.nodes.length).join(','));
const arcOld = A.arcs.every((a) => { const n = B.arcs.find((x) => x.id === a.id).nodes; return a.nodes.every((id, i) => n[i] === id); });
console.log('every old arc node keeps its index:', arcOld);
console.log(bad ? `${bad} FREEZE FAILURES` : 'freeze ok');
process.exit(bad || !arcOld ? 1 : 0);
