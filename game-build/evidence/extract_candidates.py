#!/usr/bin/env python3 -I
"""Reads the sourced case and part files and writes candidate evidence cards, one JSON line per cited sentence.
Usage: extract_candidates.py DOCS_DIR OUT_DIR
A candidate is a sentence of the body that carries a footnote marker, joined to that footnote's text. Nothing here is a finding.
Every candidate starts as status 'draft'. The class and the act class are suggestions for a reviewer. Flags mark what a reviewer must look at first."""
import json, pathlib, re, sys

docs, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
FILES = sorted(p for p in docs.glob('TDW_*_sourced.md') if re.search(r'Case|Part_(Two|Three|Four|Seven)', p.name))

FN_DEF = re.compile(r'^\[\^([^\]]+)\]:\s*(.+)$')
FN_REF = re.compile(r'\[\^([^\]]+)\]')
HEAD = re.compile(r'^#{1,4}\s+(.*)$')

ACT = [  # suggestion only, first match wins
 ('family_coercion', r'\b(relatives|families back home|family members|their families|hostages?)\b'),
 ('legal_compulsion', r'\b(Article \d+|statute|National Intelligence Law|National Security Law|compel|compelled|conscript|obliged|bound by law|legally (bound|required))\b'),
 ('information_control', r'\b(censor|firewall|propaganda|narrative|disinformation|speech|media|platform)\b'),
 ('data_access', r'\b(surveillance|registry|database|data (law|security)|facial|biometric|dossier)\b'),
 ('financial_control', r'\b(capital control|exchange control|currency|yuan|renminbi|SAFE|bond|index provider|sanction)\b'),
 ('technology_transfer', r'\b(technology transfer|Thousand Talents|talent|joint venture|forced transfer|intellectual property|IP)\b'),
 ('enforcement_leverage', r'\b(fentanyl|precursor|enforcement cooperation|scheduling|chemical)\b'),
 ('institutional_capture', r'\b(lobby|lobbyist|underwriter|university|donor|fee|consultan)\w*'),
]
LEGAL_SRC = re.compile(r'\b(statute|Article \d+|Law of the People|published|Federal Register|court record|designation|indictment|testimony|Entity List|1260H|Congress)\b', re.I)
HEDGE = re.compile(r'\b(would|could|may|might|suggests?|likely|perhaps|probably|appears?|seems?)\b', re.I)
SENS_NUM = re.compile(r'(Xinjiang|Uyghur|Uighur|detain|detention|birth ?rate|sterili[sz])', re.I)
PEOPLE_AS_ACTOR = re.compile(r'\b(the Chinese (people )?(are|have|will|want|seek|steal|spy|hate)|Chinese (students|scholars|immigrants|nationals|citizens) (are|steal|spy))\b', re.I)
NAME_PAIR = re.compile(r'(?<![.!?] )(?<!^)\b([A-Z][a-z]+ (?:[A-Z]\. )?[A-Z][a-z]{2,})\b')
ORG_WORDS = {'National','Security','Intelligence','Law','Communist','Party','United','States','Department','Commerce','Defense','Congress','Senate','House','Entity','List','Hong','Kong','Silk','Road','Belt','Road','Made','China','Five','Year','Plan','Federal','Register','Supreme','Court','New','York','White','House','Great','Leap','Forward','Cultural','Revolution','Peoples','People','Republic','Taiwan','Iran','Russia','Navy','Army','Air','Force','Justice','Treasury','State','Council','Central','Military','Commission','Politburo','Standing','Committee','Thousand','Talents','Plan'}

def clean(s): return re.sub(r'\s+', ' ', FN_REF.sub('', s)).strip()
def sentences(par):
    # split on sentence ends, keep footnote markers that follow a full stop attached to the sentence before
    par = re.sub(r'([.!?])(\[\^[^\]]+\])+', lambda m: m.group(0), par)
    parts = re.split(r'(?<=[.!?])((?:\[\^[^\]]+\])*)\s+(?=[A-Z"“*])', par)
    out, i = [], 0
    while i < len(parts):
        s = parts[i]; marks = parts[i + 1] if i + 1 < len(parts) else ''
        out.append(s + marks); i += 2
    return out

rows = []
for p in FILES:
    lines = p.read_text(encoding='utf-8').splitlines()
    notes, body, head, in_src = {}, [], '', False
    for ln in lines:
        m = FN_DEF.match(ln)
        if m: notes[m.group(1)] = m.group(2).strip(); continue
        h = HEAD.match(ln)
        if h:
            head = clean(h.group(1)); in_src = head.lower().startswith('sourcing status')
            continue
        if ln.strip() and not in_src: body.append((head, ln))
    n = 0
    for head, par in body:
        for s in sentences(par):
            refs = FN_REF.findall(s)
            text = clean(s).strip('*_ ')
            if not refs or len(text) < 40 or len(text) > 420: continue
            src = ' | '.join(f'[{r}] {notes.get(r, "(no definition)")}' for r in refs)
            flags = []
            if any(r not in notes for r in refs): flags.append('missing_footnote')
            if SENS_NUM.search(text) and re.search(r'\d', text): flags.append('sensitive_number')
            if PEOPLE_AS_ACTOR.search(text): flags.append('people_as_actor')
            names = [x for x in NAME_PAIR.findall(text) if not any(w in ORG_WORDS for w in x.split())]
            if names: flags.append('names:' + ','.join(sorted(set(names))[:4]))
            cls = 'F' if LEGAL_SRC.search(src) and not HEDGE.search(text) else ('I' if HEDGE.search(text) else 'F?')
            act = next((a for a, rx in ACT if re.search(rx, text, re.I)), None)
            n += 1
            rows.append({'id': f'EV-{p.stem.replace("TDW_", "").replace("_sourced", "").replace("_", "")[:12]}-{n:03d}', 'file': p.name, 'section': head, 'claim': text,
                         'footnotes': refs, 'source': src, 'class_suggested': cls, 'act_suggested': act, 'flags': flags, 'status': 'draft'})
out.mkdir(parents=True, exist_ok=True)
by = {}
for r in rows: by.setdefault(r['file'], []).append(r)
for f, rs in by.items(): (out / (f.replace('.md', '') + '.jsonl')).write_text('\n'.join(json.dumps(r, ensure_ascii=False) for r in rs) + '\n', encoding='utf-8')
print(len(rows), 'candidates from', len(by), 'files')
from collections import Counter
print('act:', dict(Counter(r['act_suggested'] for r in rows)))
print('class:', dict(Counter(r['class_suggested'] for r in rows)))
print('flags:', dict(Counter(f.split(':')[0] for r in rows for f in r['flags'])))
