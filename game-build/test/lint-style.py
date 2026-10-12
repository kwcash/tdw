#!/usr/bin/env python3 -I
"""House style lint for content text. Usage: lint-style.py content.json"""
import json, re, sys
c = json.load(open(sys.argv[1], encoding='utf-8'))
issues = []; review = []
def sentences(t): return [s for s in re.split(r'(?<=[.!?])\s+', t.strip()) if s]
def check(where, t):
    if not isinstance(t, str): return
    if '\u2014' in t or '\u2013' in t or ' -- ' in t: issues.append(f'{where}: dash')
    tt = re.sub(r'\d:\d\d', '', t)
    if ':' in tt or ';' in tt: issues.append(f'{where}: colon or semicolon: {t[:60]}')
    for s in sentences(t):
        if s.count(',') > 2: issues.append(f'{where}: {s.count(",")} commas: {s[:70]}')
    if re.search(r'\b(China|Chinese)\b', t) and not re.search(r'China Coast Guard|Chinese citizens|Chinese public|Chinese people|representatives of China|Chinese Communist Party|Chinese state|Chinese Ministry|Chinese Academy|Chinese refiner|Chinese vessel|Chinese-crewed', t):
        review.append(f'{where}: uses China or Chinese: {t[:90]}')
    if re.search(r'\b(was|were|is|are|been) (\w+ed|\w+en)\b by\b', t): review.append(f'{where}: possible passive: {t[:90]}')
for o in c['ops']:
    if o.get('hidden'): continue
    for k in ('title', 'brief', 'record', 'reading', 'gapText', 'fix', 'coreEvent', 'label', 'opponent'): check(f"{o['id']}.{k}", o.get(k))
    for s in o.get('script', []): check(f"{o['id']}.script{s['turn']}", s['text'])
for k, v in c['factions'].items(): check(f'faction {k}', v.get('blurb'))
for k, v in c['cadres'].items(): check(f'cadre {k}', v.get('blurb')); check(f'cadre {k} name', v.get('name'))
for k, v in c['copy'].items(): check(f'copy.{k}', v)
for a in c['arcs']: check(f"arc {a['id']}", a['blurb'])
for i in issues: print('ISSUE', i)
for r in review: print('REVIEW', r)
print(f'{len(issues)} style issues, {len(review)} items for human review')
