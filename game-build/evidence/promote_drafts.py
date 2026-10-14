#!/usr/bin/env python3 -I
"""Promotes reviewed drafts into cards. Usage: promote_drafts.py DRAFTS.jsonl cards.json [--accept 1,2,3]
Only a draft with no problems is promoted. Without --accept every clean draft is promoted. New cards take the next free id, EV-nnn.
Existing cards never change. Run build_evidence.py afterwards. It checks every rule again on the whole file."""
import json, pathlib, sys
drafts_p, cards_p = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
accept = None
if '--accept' in sys.argv: accept = {int(x) for x in sys.argv[sys.argv.index('--accept') + 1].split(',')}
data = json.loads(cards_p.read_text(encoding='utf-8'))
have = {c['id'] for c in data['cards']}
nxt = max(int(i[3:]) for i in have) + 1
done, refused = [], []
for line in drafts_p.read_text(encoding='utf-8').splitlines():
    d = json.loads(line)
    if accept is not None and d['draft'] not in accept: continue
    if d['problems']: refused.append((d['draft'], d['problems'])); continue
    cid = f'EV-{nxt:03d}'; nxt += 1
    data['cards'].append({'id': cid, 'side': d['side'], 'act': d['act'], 'actor': d['actor'], 'claim': d['claim'], 'class': d['class'], 'source': d['source'], 'from': d.get('from', 'notes'), 'check': d.get('check', 'true') == 'true'})
    done.append(cid)
cards_p.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print('promoted', ', '.join(done) or 'none')
for n, w in refused: print('REFUSED draft', n, '-', '; '.join(w))
