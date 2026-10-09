#!/usr/bin/env python3
"""Validate every case and the arcs. Exit 1 on any ERROR; warnings never fail.

    python3 -I tools/validate.py [--report] [--strict]

ERROR  schema violations, bad ids, unknown stratagems or domains, spine outside
       the theater, a broken arc reference, a status the evidence does not support
WARN   no source link, a [NEEDED] tag, "China" used as the actor, an unreachable
       URL form. --strict turns warnings into failures.
--report prints coverage: dimensions, stratagems, domains, status, arcs.
"""
import collections, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I drops the script dir
from tdwcases import SCHEMA, DATA, load_json, case_files, check, links, label_of

ACTOR = re.compile(r"\bChina (is|has|will|seeks|wants|plans|launched|built|stole|steals|uses|used|controls|intends|aims|exports)\b")
NEEDED = re.compile(r'\[NEEDED[^\]]*\]')
BANNED = ['Total Domain Warfare', 'China Communist Party']


def main():
    schema = load_json(SCHEMA / 'case.schema.json')
    tax = load_json(SCHEMA / 'taxonomy.json')
    strat = {s['code'] for s in load_json(SCHEMA / 'stratagems.json')}
    errors, warns, nolink = [], [], []
    E = lambda cid, m: errors.append(f'{cid}: {m}')
    W = lambda cid, m: warns.append(f'{cid}: {m}')

    # the schema's enums must agree with the taxonomy file
    props = schema['properties']
    for key, tkey in (('dimension', 'dimensions'), ('stage', 'stages'), ('gap', 'gaps'), ('spine', 'domains'), ('status', 'statuses')):
        if props[key]['enum'] != tax[tkey]:
            errors.append(f'schema: {key} enum differs from taxonomy.{tkey}')
    if props['theater']['items']['enum'] != tax['domains']:
        errors.append('schema: theater enum differs from taxonomy.domains')
    if props['world']['enum'] != [None] + tax['worlds']:
        errors.append('schema: world enum differs from taxonomy.worlds')

    cases, seen = [], set()
    for p in case_files():
        c = load_json(p)
        cid = c.get('id', p.stem)
        for m in check(c, schema, schema):
            E(cid, m)
        if cid != p.stem:
            E(cid, f'id does not match file name {p.name}')
        if cid in seen:
            E(cid, 'duplicate id')
        seen.add(cid)
        if errors and any(e.startswith(cid + ':') for e in errors):
            continue
        cases.append(c)
        if c['spine'] not in c['theater']:
            E(cid, f'spine {c["spine"]!r} is not in the theater')
        if not set(c['stratagems']) <= strat:
            E(cid, 'unknown stratagem')
        s, e = c['when']['start'], c['when']['end']
        if (e['year'], e['month'] or 0) < (s['year'], s['month'] or 0):
            E(cid, 'when.end is before when.start')
        if c['kind'] == 'futures' and s['year'] < 2026:
            E(cid, 'a future scenario cannot start before 2026')
        if c['kind'] == 'catalog' and s['year'] > 2026:
            E(cid, 'a catalog case cannot start after 2026')
        ls = links(c)
        urls = [u for _, _, u in ls]
        for f, lab, u in ls:
            if not re.match(r'^https://[^\s/]+\.[^\s/]+', u):
                E(cid, f'{f}: link is not an https URL: {u!r}')
        if c['status'] == 'unsourced' and ls:
            E(cid, 'status is unsourced but the text has source links; set it to sourced')
        if c['status'] in ('sourced', 'verified') and not ls:
            E(cid, f'status {c["status"]} needs at least one source link')
        if not any(u for f, _, u in ls if f == 'record') and c['status'] == 'unsourced':
            nolink.append(cid)
        for f, v in c['text'].items():
            for b in BANNED:
                if b in v:
                    E(cid, f'{f}: contains {b!r}')
            if NEEDED.search(v):
                W(cid, f'{f}: has a [NEEDED] tag')
            if ACTOR.search(v):
                W(cid, f'{f}: "China" used as the actor; the actor is the Party')
        if c['kind'] == 'catalog' and not c['text']['reading']:
            E(cid, 'empty reading')

    nums = {k: sorted(int(c['id'][1:]) for c in cases if c['kind'] == k) for k in ('catalog', 'futures')}
    for k, n in nums.items():
        if n and n != list(range(1, len(n) + 1)):
            E(k, f'ids are not contiguous from 1: gaps near {[i for i in range(1, n[-1] + 1) if i not in n][:5]}')

    arcs = load_json(DATA / 'arcs.json')
    for e in check(arcs, load_json(SCHEMA / 'arcs.schema.json'), None):
        E('arcs', e)
    by_id = {c['id']: c for c in cases}
    names = {a['name'] for a in arcs}
    member = collections.defaultdict(list)
    for a in arcs:
        for n in a['nodes']:
            if n not in by_id:
                E('arcs', f'{a["id"]} lists {n}, which does not exist')
            member[n].append(a['name'])
    for c in cases:
        if c['kind'] == 'futures':
            if c['arc'] not in names:
                E(c['id'], f'arc {c["arc"]!r} is not an arc')
            elif c['arc'] not in member[c['id']]:
                E(c['id'], f'arc {c["arc"]!r} does not list this case among its nodes')

    for m in errors:
        print('ERROR', m)
    if nolink:
        print(f'WARN  {len(nolink)} cases have no source link in the record (status unsourced): {", ".join(nolink[:6])} ...')
    for m in warns[:60]:
        print('WARN ', m)
    if len(warns) > 60:
        print(f'WARN  ... and {len(warns) - 60} more')

    if '--report' in sys.argv:
        print('\nstatus      ', dict(collections.Counter(c['status'] for c in cases)))
        for k in ('catalog', 'futures'):
            sub = [c for c in cases if c['kind'] == k]
            print(f'\n{k}: {len(sub)} cases')
            print('  dimension ', dict(collections.Counter(c['dimension'] for c in sub).most_common()))
            print('  stage     ', dict(collections.Counter(c['stage'] for c in sub).most_common()))
            print('  spine     ', dict(collections.Counter(c['spine'] for c in sub).most_common()))
        use = collections.Counter(s for c in cases for s in c['stratagems'])
        print('\nstratagems never used:', sorted(strat - set(use), key=lambda x: int(x[1:])))
        print('most used:', use.most_common(6))
        print('domains never a spine:', sorted(set(tax['domains']) - {c['spine'] for c in cases}))
        print('cases in no arc:', sum(1 for c in cases if not member[c['id']]), 'of', len(cases))

    n = len(cases)
    total_warns = len(warns) + (1 if nolink else 0)
    print(f'\n{n} cases checked: {len(errors)} errors, {len(warns)} warnings, {len(nolink)} unsourced')
    sys.exit(1 if errors or ('--strict' in sys.argv and (warns or nolink)) else 0)


main()
