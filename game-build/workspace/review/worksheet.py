#!/usr/bin/env python3 -I
"""The independent source review. Usage, from workspace/:
  python3 review/worksheet.py build          writes review/worksheet.csv from SOURCING_2026.md and band/cards.json
  python3 review/worksheet.py check FILE     checks a worksheet the reviewer filled in and prints a summary
The reviewer fills in the last four columns only. ../REVIEW_SOURCES.md is the reviewer's brief."""
import csv, datetime, io, json, pathlib, re, sys

COLUMNS = ['item', 'where', 'claim', 'now_rests_on', 'status', 'verdict', 'reviewer_source', 'reviewer_note', 'checked_on']
VERDICTS = ['Confirmed', 'Confirmed with change', 'Not supported', 'Cannot check']
# A row waits for the review when SOURCING_2026.md marks it Check, secondary only or cut if unsupported.
def waits(status): return status.startswith('Check') or 'secondary only' in status or status.startswith('Cut if unsupported')

def build(sourcing, cards):
    out, seen = [], {}
    section = 'Operations'
    for line in pathlib.Path(sourcing).read_text(encoding='utf-8').split('\n'):
        if line.startswith('## '): section = line[3:].strip()
        if not line.startswith('| ') or line.startswith('|---'): continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) != 4 or cells[0] in ('Op', 'Date', 'Where') or not waits(cells[3]): continue
        key = cells[0] if re.match(r'^[A-Z]\d{3}$', cells[0]) else ('CAL' if section == 'Calendar' else 'HELP')
        seen[key] = seen.get(key, 0) + 1
        where = f'2026 operation {cells[0]}' if key == cells[0] else (f'2026 calendar, {cells[0]}' if key == 'CAL' else f'Help text, {cells[0]}')
        out.append({'item': f'S-{key}-{seen[key]}', 'where': where, 'claim': cells[1], 'now_rests_on': cells[2], 'status': cells[3]})
    for c in json.loads(pathlib.Path(cards).read_text(encoding='utf-8'))['cards']:
        if c.get('check'):
            out.append({'item': c['id'], 'where': 'Evidence card for the asymmetry band', 'claim': c['claim'], 'now_rests_on': c['source'], 'status': 'Check' if c['class'] == 'F' else 'Check, inference'})
    buf = io.StringIO()
    w = csv.DictWriter(buf, COLUMNS, lineterminator='\n')
    w.writeheader()
    for r in out: w.writerow({**{k: '' for k in COLUMNS}, **r})
    return buf.getvalue()

def check(rows, blank, today=None):
    today = today or datetime.date.today().isoformat()
    ref = {r['item']: r for r in blank}
    errors, seen = [], set()
    for r in rows:
        i = r.get('item', '')
        if i not in ref: errors.append(f'{i}: no such item in the worksheet'); continue
        if i in seen: errors.append(f'{i}: listed twice'); continue
        seen.add(i)
        if r.get('claim', '') != ref[i]['claim']: errors.append(f'{i}: the claim text was changed. Put any correction in the note.')
        v, src, note, on = (r.get(k, '').strip() for k in ('verdict', 'reviewer_source', 'reviewer_note', 'checked_on'))
        if not v:
            continue
        if v not in VERDICTS: errors.append(f'{i}: verdict must be one of {", ".join(VERDICTS)}'); continue
        if v.startswith('Confirmed') and not src: errors.append(f'{i}: a confirmed claim needs the source that confirms it')
        if src and not re.match(r'^https://\S+$', src): errors.append(f'{i}: the source must be one https link')
        if v != 'Confirmed' and not note: errors.append(f'{i}: the verdict {v} needs a note that says why')
        try:
            d = datetime.date.fromisoformat(on)
            if d.isoformat() > today: errors.append(f'{i}: the check date {on} is in the future')
        except ValueError: errors.append(f'{i}: the check date must read like 2026-11-02')
    return errors

def summary(rows):
    count = {v: 0 for v in VERDICTS}; todo = 0; act = []
    for r in rows:
        v = r.get('verdict', '').strip()
        if v in count: count[v] += 1
        else: todo += 1
        if v in ('Confirmed with change', 'Not supported'): act.append(f'  {r["item"]} ({v}) {r["where"]}: {r.get("reviewer_note", "").strip()}')
    head = ', '.join(f'{k} {n}' for k, n in count.items()) + f', not yet checked {todo}'
    return head + ('\nThese need a change in the game or in SOURCING_2026.md:\n' + '\n'.join(act) if act else '\nNothing needs a change yet.')

if __name__ == '__main__':
    ws = pathlib.Path(__file__).resolve().parent.parent
    if sys.argv[1:2] == ['build']:
        (ws / 'review/worksheet.csv').write_text(build(ws.parent / 'SOURCING_2026.md', ws / 'band/cards.json'), encoding='utf-8')
        print('wrote review/worksheet.csv')
    elif sys.argv[1:2] == ['check'] and len(sys.argv) == 3:
        blank = list(csv.DictReader(open(ws / 'review/worksheet.csv', encoding='utf-8')))
        rows = list(csv.DictReader(open(sys.argv[2], encoding='utf-8-sig')))
        errs = check(rows, blank)
        print('\n'.join(errs) if errs else 'The worksheet is well formed.')
        print(summary(rows))
        sys.exit(1 if errs else 0)
    else: sys.exit(__doc__)
