#!/usr/bin/env python3 -I
"""Copies each build's difficulty table from difficulty.json into its content file. Usage: python3 difficulty/add_difficulty.py
It sets only the top-level difficulty key and keeps each file's layout, compact or indented, so no operation changes.
It refuses a table that misses an operation a player can pick, or that names one the content does not have."""
import json, pathlib, sys
HERE = pathlib.Path(__file__).parent
CONTENT = HERE.parent / 'content'
D = json.loads((HERE / 'difficulty.json').read_text(encoding='utf-8'))
for build, rates in D['builds'].items():
    p = CONTENT / f'{build}.json'
    raw = p.read_text(encoding='utf-8')
    C = json.loads(raw)
    pick = {o['id'] for o in C['ops'] if not o.get('hidden')}
    if set(rates) != pick: sys.exit(f'REFUSED: {build} table covers {sorted(set(rates) ^ pick)} wrongly')
    for oid, r in rates.items():
        if len(r) != 7 or not all(isinstance(x, int) and 0 <= x <= 100 for x in r): sys.exit(f'REFUSED: {build} {oid} needs seven shares from 0 to 100')
    compact = not raw.startswith('{\n')
    C['difficulty'] = {'seeds': D['seeds'], 'rates': rates}
    out = json.dumps(C, ensure_ascii=False, separators=(',', ':')) if compact else json.dumps(C, ensure_ascii=False, indent=1) + '\n'
    if out != raw:
        p.write_text(out, encoding='utf-8')
        print(f'{build}.json: difficulty for {len(rates)} operations')
    else:
        print(f'{build}.json: difficulty unchanged')
