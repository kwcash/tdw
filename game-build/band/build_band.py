#!/usr/bin/env python3 -I
"""Adds the asymmetry-band operations to a content file. Usage: build_band.py BEFORE.json cards.json TUNING.json OUT.json
It copies each evidence line from the card, so no line in the game is retyped. It refuses a move whose evidence does not fit its permit.
 barred needs a constraint or guardrail card. priced needs a democracy record or guardrail card. free needs a lawful tool or constraint card.
Every move lists at least one card. A barred move also needs a card on the Party's side, so the mirror has a source."""
import copy, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import band_ops

before, cards_p, tune_p, out = (pathlib.Path(x) for x in sys.argv[1:5])
C = json.loads(before.read_text(encoding='utf-8'))
cards = {c['id']: c for c in json.loads(cards_p.read_text(encoding='utf-8'))['cards']}
tune = json.loads(tune_p.read_text(encoding='utf-8'))
NEED = {'barred': {'constraint', 'guardrail'}, 'priced': {'democracy_record', 'guardrail'}, 'free': {'lawful_tool', 'constraint'}}
ids = {o['id'] for o in C['ops']}
for spec in band_ops.OPS:
    if spec['id'] in ids: sys.exit(f'REFUSED: {spec["id"]} is already in the content')
    op = copy.deepcopy(spec)
    for m in op['reach']:
        p = m['permit'][band_ops.US]
        sides = set()
        for cid in m['cards']:
            if cid not in cards: sys.exit(f'REFUSED: {op["id"]} {m["id"]} cites {cid}, which is not a reviewed card')
            sides.add(cards[cid]['side'])
        if not (sides & NEED[p]): sys.exit(f'REFUSED: {op["id"]} {m["id"]} is {p} and cites no {"/".join(sorted(NEED[p]))} card')
        if p == 'barred' and 'party' not in sides: sys.exit(f'REFUSED: {op["id"]} {m["id"]} is barred and cites no card on the Party\'s side')
        m['evidence'] = [{'id': cid, 'line': cards[cid]['claim']} for cid in m.pop('cards')]
    op['rules'] = {'handScale': tune[op['id']]}
    C['ops'].append(op)
n = len(C['ops'])
for k in ('hero', 'opsNote'):
    s = C['copy'][k]
    C['copy'][k] = s.replace('Sixteen operations', 'Nineteen operations').replace("The other four follow Taiwan's budget and vote, the Iranian oil fleet and a seized botnet.", "The other seven follow Taiwan's budget and vote, the Iranian oil fleet, a seized botnet and three operations on the limits that bind a free society.")
out.write_text(json.dumps(C, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print('operations now', n)
