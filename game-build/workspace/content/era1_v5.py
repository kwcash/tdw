#!/usr/bin/env python3 -I
"""Adds the holdings prototype to the 1931 build. Reads era1.before5.json (the build as shipped) and writes era1.json.
E007 and E009 keep every mechanic. E009 and three leaders only gain a tag that names an act against the actor's own position."""
import json, pathlib
HERE = pathlib.Path(__file__).parent
c = json.load(open(HERE / 'era1.before5.json', encoding='utf-8'))
U = 'KMT'

# ---- tags: acts against one's own position (typed by structure, never by outcome)
e9 = next(o for o in c['ops'] if o['id'] == 'E009')
hit = [e for s in e9['script'] for e in s['effects'] if e['type'] == 'legitimacy' and e['faction'] == U and e['n'] == -6]
assert len(hit) == 1
hit[0]['self'] = 'predation on own base'
hit[0]['selfWhy'] = 'the gold yuan exchange order'
c['cadres']['ching_kuo']['mods']['self'] = 'predation on own base'
c['cadres']['kwantung_staff']['mods']['self'] = 'breach of own legitimating rule'

# ---- E011
def P(f, d, n, by): return {'type': 'pressure', 'faction': f, 'domain': d, 'n': n, 'by': by}
op = {
 'id': 'E011', 'kind': 'catalog', 'num': 11, 'title': 'The Manchurian Trap', 'fullTitle': 'The Manchurian Trap (1946)', 'tier': 4,
 'dimension': 'Criticality', 'stage': 'Extract', 'stratagems': ['S15', 'S11', 'S36'], 'theater': ['Kinetic', 'Economic', 'Association', 'Psychological'],
 'spine': 'Psychological', 'opponent': 'The Party', 'world': None, 'arc': None, 'when': {'start': [1946, 5], 'end': [1948, 11]}, 'label': 'May 1946 to November 1948',
 'brief': 'In the summer of 1948 the Nationalists still held the cities of Manchuria. Each garrison lived on a rail line or an air route that the Party\'s army could cut.',
 'record': 'Chiang Kai-shek chose to hold the cities of Manchuria and kept strong forces there from 1946. The garrisons in Changchun, Shenyang and Jinzhou depended on supply by rail and by air. The Party\'s forces besieged Changchun from May 1948 and took it in October. The Liaoshen campaign ran from September to November 1948. By its end the Party held all of Manchuria. The Nationalists lost several hundred thousand troops there, and sources differ on the count.',
 'reading': 'The Party did not need to take the cities. It needed the Nationalists to keep them. This is Stratagem 15, lure the tiger down the mountain. A garrison far from its base draws the armies that the south needs. Stratagem 11 sacrifices the plum tree to preserve the peach. Stratagem 36 retreats when all else fails. The record shows the garrisons and the losses. It does not show what a withdrawal would have saved. The costs and denials in this operation are the game\'s scores and not a count.',
 'gap': 'Governance', 'gapText': 'Governance Architecture. No rule told the government what a position was worth to hold, so each garrison stayed because it had been placed.',
 'fix': 'Score every position for what it costs to hold and what it denies, and review each one before a campaign season. Give up a position that costs more than it denies while the choice is still open.',
 'factions': [{'id': 'KMT', 'start': {'shields': {'Kinetic': 3, 'Economic': 2, 'Financial': 2}}}, 'CCP'], 'player': U, 'cadres': ['chiang', 'lin_biao'], 'pacts': [],
 'holdings': [
   {'id': 'manchuria', 'name': 'Manchuria', 'domain': 'Kinetic', 'cost': 2, 'denial': 1,
    'text': 'The garrisons live on rail and air supply and draw on the best armies.',
    'yieldText': 'You give up Manchuria. The garrisons stop draining the armies, and the Party takes the north.',
    'onYield': [{'type': 'legitimacy', 'faction': U, 'n': -2, 'why': 'giving up Manchuria'}]},
   {'id': 'south', 'name': 'The south', 'domain': 'Economic', 'cost': 1, 'denial': 2,
    'text': 'The cities, the ports and the customs revenue.'},
 ],
 'script': [
   {'turn': 3, 'text': 'The Party\'s forces cut the rail lines to the north.', 'effects': [P(U, 'Economic', 1, 'CCP')]},
   {'turn': 6, 'text': 'The Party\'s forces besiege the garrisons.', 'effects': [P(U, 'Kinetic', 2, 'CCP')]},
 ],
}
tune = HERE / 'e011.tuning.json'
if tune.exists():
    t = json.load(open(tune)); op['rules'] = {'handScale': t['handScale']}
c['ops'].append(op)
c['copy']['opsNote'] = 'Eleven operations from the historical record. Tier sets the difficulty.'
assert 'E011' not in c['daily'] and all(op['id'] not in a['nodes'] for a in c['arcs'])
json.dump(c, open(HERE / 'era1.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('era1.json', len(c['ops']), 'ops')
