#!/usr/bin/env python3 -I
"""Copies the guided runs in guides.json into the content file of each build. Usage: python3 content/add_guides.py
Run it after any step that rewrites era1.json or era3.json. It changes only the top-level guides key, so no operation changes.
It refuses a guide whose operation is missing, or whose operation lacks the panel the guide teaches."""
import json, pathlib, sys
HERE = pathlib.Path(__file__).parent
G = json.loads((HERE / 'guides.json').read_text(encoding='utf-8'))['guides']
FEATURE = {'holdings': 'holdings', 'reach': 'reach'}
for build in sorted({g['build'] for g in G}):
    p = HERE / f'{build}.json'
    C = json.loads(p.read_text(encoding='utf-8'))
    ops = {o['id']: o for o in C['ops']}
    out = []
    for g in (x for x in G if x['build'] == build):
        op = ops.get(g['op'])
        if not op: sys.exit(f'REFUSED: guide {g["id"]} names {g["op"]}, which is not in {build}.json')
        if not op.get(FEATURE[g['id']]): sys.exit(f'REFUSED: guide {g["id"]} teaches {FEATURE[g["id"]]} and {g["op"]} has none')
        out.append({k: v for k, v in g.items() if k != 'build'})
    before = json.dumps(C.get('guides'), sort_keys=True)
    C['guides'] = out
    if json.dumps(out, sort_keys=True) != before:
        p.write_text(json.dumps(C, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        print(f'{build}.json: guides {", ".join(g["id"] for g in out)}')
    else:
        print(f'{build}.json: guides unchanged')
