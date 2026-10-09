#!/usr/bin/env python3
"""Manuscript checks. Exit 1 on a failure; warnings never fail the run.

    python3 -I tools/check.py [--placeholders]

FAIL  superseded or wrong phrases (the book's hard constraints)
FAIL  the round trip: src/ must rebuild the recorded source hash
WARN  unfilled [PLACEHOLDER] fields, with --placeholders list them
INFO  words and Documented/Argued label counts per section
"""
import json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BANNED = ['Total Domain Warfare', 'China Communist Party', '[Author]']
PLACEHOLDER = re.compile(r'\[(?:AUTHOR NAME|PUBLISHER|YEAR|PAPERBACK|HARDCOVER|EBOOK|DESIGNER|PUBLISHER WEBSITE)[^\]]*\]')

man = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
fail, warn, rows = 0, 0, []
for s in man['sections']:
    t = (ROOT / 'src' / s['path']).read_text(encoding='utf-8')
    for b in BANNED:
        if b in t:
            print(f'FAIL  {s["path"]}: contains {b!r}'); fail += 1
    ph = PLACEHOLDER.findall(t)
    if ph:
        warn += len(ph)
        if '--placeholders' in sys.argv:
            print(f'WARN  {s["path"]}: {sorted(set(ph))}')
    rows.append((s['path'], len(t.split()), len(re.findall(r'\bDocumented\b', t)), len(re.findall(r'\bArgued\b', t))))
rc = subprocess.run([sys.executable, '-I', str(ROOT / 'tools' / 'build.py'), '--verify']).returncode
fail += rc != 0
print(f'\n{"section":58} {"words":>7} {"Docd":>5} {"Argd":>5}')
for r in rows:
    print(f'{r[0]:58} {r[1]:7} {r[2]:5} {r[3]:5}')
print(f'\nTotal words: {sum(r[1] for r in rows)}   placeholders: {warn}')
print('FAIL' if fail else 'PASS')
sys.exit(1 if fail else 0)
