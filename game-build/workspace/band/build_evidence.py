#!/usr/bin/env python3 -I
"""Validates cards.json and writes evidence.json and EVIDENCE_INDEX.md. Usage: build_evidence.py cards.json OUT_DIR [DOCS_DIR [CANDIDATES_DIR]]
Rules the build enforces. They come from the repo's CLAUDE.md and from the standing rules of this project.
 1. Every card has an id, a side, an act, an actor, a claim, a class (F, I, R or S) and a source line.
 2. The actor is the Party, the Party-state, a named agency or government, or a free society. It is never a people.
 3. No claim names a private individual, and none states a Xinjiang or detention figure.
 4. An F card cites a document, a statute or a record. An I, R or S card says so and says whose argument it is.
 5. When CANDIDATES_DIR is given, a card whose 'from' names a candidate must name one that exists. 'primary-text', 'notes' and the book-note forms are allowed.
 6. When DOCS_DIR is given, a card that names a book sentence ('from' is a candidate id) must find its footnote text in the files."""
import json, pathlib, re, sys

cards_p, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
data = json.loads(cards_p.read_text(encoding='utf-8'))
SIDES = {'party', 'constraint', 'democracy_record', 'guardrail', 'lawful_tool'}
CLASSES = {'F', 'I', 'R', 'S'}
PEOPLE = re.compile(r'\b(the Chinese (people|are|have|will|want|steal|spy)|Chinese (students|scholars|immigrants|nationals|citizens|people) (are|steal|spy|will))\b', re.I)
PRIVATE = re.compile(r'\b(Mr|Mrs|Ms|Dr)\.? [A-Z]|\b(Jimmy Lai|Christopher Wray)\b')
SENS = re.compile(r'(Xinjiang|Uyghur|Uighur|detention|detain|birth ?rate|sterili[sz])', re.I)
bad, ids = [], set()
for c in data['cards']:
    w = c.get('id', '?')
    for k in ('id', 'side', 'act', 'actor', 'claim', 'class', 'source'):
        if not c.get(k): bad.append(f'{w}: missing {k}')
    if c.get('id') in ids: bad.append(f'{w}: duplicate id')
    ids.add(c.get('id'))
    if not re.fullmatch(r'EV-\d{3}', c.get('id', '')): bad.append(f'{w}: id must look like EV-012')
    if c.get('side') not in SIDES: bad.append(f'{w}: unknown side {c.get("side")}')
    if c.get('class') not in CLASSES: bad.append(f'{w}: class must be F, I, R or S')
    txt = c.get('claim', '') + ' ' + c.get('actor', '')
    if PEOPLE.search(txt): bad.append(f'{w}: a people is named as the actor')
    if PRIVATE.search(txt): bad.append(f'{w}: names an individual')
    if SENS.search(txt) and re.search(r'\d', c.get('claim', '')): bad.append(f'{w}: a Xinjiang or detention figure')
    if c.get('class') == 'F' and not re.search(r'(Law|Act|Article|amendment|Register|ruling|Commission|announce|publication|Statement|filing|complaint|list|Quarterly|reporting|suspension|designation|edition|initiative|episode|Constitution|Decision|Exchange|testimony|report|disclosure|advisory|Plan|records|verdict|Order|Report|Initiative|materials|addition)', c.get('source', ''), re.I): bad.append(f'{w}: an F card needs a document, statute or record in its source')
    if c.get('class') in ('I', 'R', 'S') and not re.search(r"(argument|counter|reading|speculation)", c.get('source', ''), re.I): bad.append(f'{w}: an {c.get("class")} card must say whose argument it is')
    if len(c.get('claim', '')) > 330: bad.append(f'{w}: claim over 330 characters')
if len(sys.argv) > 3:
    docs = pathlib.Path(sys.argv[3]); notes = ' '.join(p.read_text(encoding='utf-8') for p in docs.glob('TDW_*.md'))
    for c in data['cards']:
        m = re.fullmatch(r'PartThree-note(\d+)', c.get('from', ''))
        if m and f'[^{m.group(1)}]:' not in notes: bad.append(f'{c["id"]}: footnote {m.group(1)} not found')
if len(sys.argv) > 4:
    have = set()
    for p in pathlib.Path(sys.argv[4]).glob('*.jsonl'):
        have |= {json.loads(l)['id'] for l in p.read_text(encoding='utf-8').splitlines() if l.strip()}
    for c in data['cards']:
        f = c.get('from', '')
        if f.startswith('EV-') and f not in have: bad.append(f'{c["id"]}: from names {f}, which is not a candidate')
if bad:
    print('\n'.join('REFUSED ' + b for b in bad)); sys.exit(1)
out.mkdir(parents=True, exist_ok=True)
(out / 'evidence.json').write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
rows = ['# Evidence index', '', 'One row per reviewed card. A claim marked Check needs checking against its source before anyone relies on it.', '', '| Card | Side | Act | Class | Claim | Check |', '|---|---|---|---|---|---|']
for c in data['cards']: rows.append(f'| {c["id"]} | {c["side"]} | {c["act"]} | {c["class"]} | {c["claim"]} | {"Check" if c.get("check") else "Use"} |')
(out / 'EVIDENCE_INDEX.md').write_text('\n'.join(rows) + '\n', encoding='utf-8')
print(len(data['cards']), 'cards valid')
