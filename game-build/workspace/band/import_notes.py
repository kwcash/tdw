#!/usr/bin/env python3 -I
"""Turns raw notes into draft cards. Usage: import_notes.py NOTES.md OUT.jsonl
Notes use one block per claim, blocks separated by a line of three dashes.
  claim: one sentence or two
  source: where it comes from, with a date
  class: F, I, R or S
  side: party, constraint, democracy_record, guardrail or lawful_tool
  act: a short label such as legal_compulsion, ancestry, disclosure
  actor: the Party-state, a named agency, a named government or free societies
  from: the candidate id the claim rests on, or primary-text
  check: true if the source still needs checking
Every block becomes a draft. A draft is not a card. A reviewer promotes it with promote_drafts.py, and build_evidence.py then checks it.
A block that breaks a rule is written with its reasons so the reviewer sees why."""
import json, pathlib, re, sys
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
PEOPLE = re.compile(r'\b(the Chinese (people|are|have|will|want|steal|spy)|Chinese (students|scholars|immigrants|nationals|citizens|people) (are|steal|spy|will))\b', re.I)
SENS = re.compile(r'(Xinjiang|Uyghur|Uighur|detention|detain|birth ?rate|sterili[sz])', re.I)
SIDES = {'party', 'constraint', 'democracy_record', 'guardrail', 'lawful_tool'}
rows = []
for i, blk in enumerate(re.split(r'\n-{3,}\n', src.read_text(encoding='utf-8')), 1):
    f = dict(re.findall(r'^(claim|source|class|act|side|actor|from|check):\s*(.+)$', blk, re.M))
    if not f: continue
    why = [f'missing {k}' for k in ('claim', 'source', 'class', 'side', 'act', 'actor') if not f.get(k)]
    if f.get('class') and f['class'] not in ('F', 'I', 'R', 'S'): why.append('class must be F, I, R or S')
    if f.get('side') and f['side'] not in SIDES: why.append('unknown side')
    t = f.get('claim', '') + ' ' + f.get('actor', '')
    if PEOPLE.search(t): why.append('a people is named as the actor')
    if SENS.search(t) and re.search(r'\d', t): why.append('a Xinjiang or detention figure')
    if re.search(r'\b(Mr|Mrs|Ms|Dr)\.? [A-Z]', t): why.append('may name an individual')
    if f.get('check') not in (None, 'true', 'false'): why.append('check must be true or false')
    rows.append({'draft': i, **f, 'status': 'draft', 'problems': why})
out.write_text('\n'.join(json.dumps(r, ensure_ascii=False) for r in rows) + '\n', encoding='utf-8')
print(len(rows), 'drafts,', sum(1 for r in rows if r['problems']), 'with problems')
