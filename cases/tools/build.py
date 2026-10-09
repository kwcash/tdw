#!/usr/bin/env python3
"""Compile data/ into the content.json the game loads.

    python3 -I tools/build.py [OUT]                 default: build/content.json
    python3 -I tools/build.py --verify ORIGINAL     rebuild and compare to an existing content.json
    python3 -I tools/build.py --sources             also write build/sources.json (url -> case ids)

Cases come out in catalog-then-futures order, numbered by id. The game does not
read status, verifiedBy, verifiedOn or book, so they are left out.
"""
import json, pathlib, sys
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I drops the script dir
from tdwcases import ROOT, DATA, load_json, case_files, label_of, full_title_of, links

ORDER = ['id', 'kind', 'num', 'title', 'fullTitle', 'tier', 'dimension', 'stage', 'stratagems', 'theater', 'spine',
         'opponent', 'world', 'arc', 'horizon', 'when', 'label', 'brief', 'record', 'reading', 'coreEvent',
         'gap', 'gapText', 'fix']


def op(c):
    flat = {'id': c['id'], 'num': int(c['id'][1:]), 'fullTitle': full_title_of(c), 'label': label_of(c),
            'world': c.get('world'), 'arc': c.get('arc')}
    flat.update({k: v for k, v in c.items() if k not in ('text', 'when', 'status', 'verifiedBy', 'verifiedOn', 'book', 'label', 'fullTitle')})
    flat.update(c['text'])
    flat['when'] = {e: [c['when'][e]['year'], c['when'][e]['month']] for e in ('start', 'end')}
    if c['kind'] == 'catalog':
        flat.pop('horizon', None)
    return {k: flat[k] for k in ORDER if k in flat}


def compile_content():
    cases = [load_json(p) for p in case_files()]
    cases.sort(key=lambda c: (c['kind'] != 'catalog', int(c['id'][1:])))
    tax = load_json(ROOT / 'schema' / 'taxonomy.json')
    return cases, {'ops': [op(c) for c in cases], 'arcs': [{k: v for k, v in a.items() if k != 'chapter'} for a in load_json(DATA / 'arcs.json')],
                   'taxonomy': {'domains': tax['domains'], 'stratagems': load_json(ROOT / 'schema' / 'stratagems.json'),
                                'stages': tax['stages'], 'tiers': tax['tiers']},
                   'dailyEpoch': load_json(DATA / 'meta.json')['dailyEpoch']}


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    cases, content = compile_content()
    if '--verify' in sys.argv:
        orig = json.loads(pathlib.Path(args[0]).read_text(encoding='utf-8'))
        ok = orig == content
        print(('PASS' if ok else 'FAIL') + f'  {len(content["ops"])} cases rebuilt; identical to {pathlib.Path(args[0]).name}: {ok}')
        if not ok:
            for k in orig:
                if orig[k] != content.get(k):
                    print('  differs in', k)
        sys.exit(0 if ok else 1)
    out = pathlib.Path(args[0] if args else ROOT / 'build' / 'content.json')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(content, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'wrote {out} ({out.stat().st_size} bytes, {len(content["ops"])} cases)')
    if '--sources' in sys.argv:
        idx = {}
        for c in cases:
            for field, label, url in links(c):
                idx.setdefault(url, {'label': label, 'cases': []})['cases'].append(c['id'])
        (out.parent / 'sources.json').write_text(json.dumps(idx, indent=1, ensure_ascii=False), encoding='utf-8')
        print(f'wrote sources.json ({len(idx)} urls)')
