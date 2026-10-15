#!/usr/bin/env bash
# Runs every check. Usage: bash run_checks.sh   (from anywhere). Needs node and python3. Takes about a minute.
set -u
cd "$(dirname "$0")"
fail=0
for t in record.test record-legacy.test holdings.test forecast.test reach.test tier7.test guide.test difficulty.test; do
  r=$(node test/$t.js 2>&1 | tail -1); echo "$t: $r"; case "$r" in OK*) ;; *) fail=1;; esac
done
r=$(node test/replay-all.js baselines/codes.all.before.json | tail -1); echo "replay-all: $r"; case "$r" in all\ 320*) ;; *) fail=1;; esac
r=$(node test/freeze.js content/era3.before7.json content/era3.json | tail -1); echo "freeze: $r"; case "$r" in freeze\ ok*) ;; *) fail=1;; esac
node -e "
const E=require('./out/engine.js');let bad=0;
for(const f of ['base','era1','era2','era3']){const C=require('./content/'+f+'.json');const reg={factions:C.factions,cadres:C.cadres,pacts:C.pacts,ruleset:C.ruleset};
for(const o of C.ops){const r=E.validate(o,reg);const e=(r&&r.errors)||(Array.isArray(r)?r:[]);if(e.length){bad++;console.log(f,o.id,e)}}}
console.log('validate:',bad?bad+' problems':'all four content files valid');process.exit(bad?1:0)" || fail=1
for f in content/era1.json content/era3.json band/cards.json parts/help.json content/guides.json; do r=$(python3 test/lint-strict.py $f | tail -1); echo "lint $f: $r"; case "$r" in 0\ style*) ;; *) fail=1;; esac; done
[ $fail = 0 ] && echo "ALL CHECKS PASS" || echo "SOME CHECKS FAILED"
exit $fail
