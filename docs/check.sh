#!/usr/bin/env bash
# Pre-deploy guard. Fails loudly if superseded architecture reappears.
set -u
fail=0
for f in index.html prologue.html; do
  [ -f "$f" ] || { echo "MISSING: $f"; fail=1; continue; }
  for bad in "United Front" "Total Domain Warfare" "China Communist Party" "Asymmetric &" "[Author]"; do
    n=$(grep -cF "$bad" "$f" 2>/dev/null || true)
    [ "$n" -gt 0 ] && { echo "FAIL  $f: found '$bad' ($n)"; fail=1; }
  done
done
# domain order in index.html
exp="Kinetic Economic Financial Information Psychological Legal Association Cyber Cultural AI Biological Data"
got=$(grep -o 'class="nm">[^<]*' index.html | sed 's/class="nm">//' | awk '{print $1}' | tr '\n' ' ')
[ "$(echo $got)" = "$(echo $exp)" ] || { echo "FAIL  domain order:"; echo "  want: $exp"; echo "  got : $got"; fail=1; }
# build stamp present
grep -q "build [0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}" index.html || { echo "FAIL  index.html: no build stamp"; fail=1; }
[ $fail -eq 0 ] && echo "PASS  all checks" || echo "--- fix the above before deploying ---"
exit $fail
