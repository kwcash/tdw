#!/usr/bin/env bash
# Pre-deploy guard for totaldomainwar.com.
# Verifies the twelve domains are present and in order, that superseded
# architecture has not reappeared, and that a build stamp exists.
# Exits non-zero on any failure so it can gate a deploy.

set -u
fail=0

files=(index.html prologue.html)

for f in "${files[@]}"; do
  if [ ! -f "$f" ]; then
    echo "FAIL: $f is missing"
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  exit 1
fi

# --- Domain order, checked against index.html ---
expected=(Kinetic Economic Financial Information Psychological Legal Association Cyber Cultural "AI and Cognitive" Biological "Data and Surveillance")

found=$(grep -oE '<li>(Kinetic|Economic|Financial|Information|Psychological|Legal|Association|Cyber|Cultural|AI and Cognitive|Biological|Data and Surveillance)</li>' index.html \
  | sed -E 's/<\/?li>//g')

mapfile -t found_arr <<< "$found"

if [ "${#found_arr[@]}" -ne 12 ]; then
  echo "FAIL: expected 12 domains in index.html, found ${#found_arr[@]}"
  fail=1
else
  for i in "${!expected[@]}"; do
    if [ "${found_arr[$i]}" != "${expected[$i]}" ]; then
      echo "FAIL: domain #$((i+1)) is '${found_arr[$i]}', expected '${expected[$i]}'"
      fail=1
    fi
  done
fi

# --- Superseded architecture must not reappear ---
for f in "${files[@]}"; do
  if grep -q "United Front" "$f"; then
    echo "FAIL: '$f' contains 'United Front'"
    fail=1
  fi
  if grep -q "Total Domain Warfare" "$f"; then
    echo "FAIL: '$f' contains 'Total Domain Warfare'"
    fail=1
  fi
  if grep -q "China Communist Party" "$f"; then
    echo "FAIL: '$f' contains 'China Communist Party'"
    fail=1
  fi
  if grep -qE '<li>Asymmetric</li>' "$f"; then
    echo "FAIL: '$f' lists Asymmetric as a domain"
    fail=1
  fi
done

# --- Build stamp present in both footers ---
for f in "${files[@]}"; do
  if ! grep -qE 'build [0-9]{4}-[0-9]{2}-[0-9]{2}' "$f"; then
    echo "FAIL: '$f' has no build stamp"
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "OK: all checks passed"
fi

exit "$fail"
