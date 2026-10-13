#!/usr/bin/env python3 -I
"""Settles a watch operation. Usage:
  settle_watch.py --content content/era3.json --op W013 --on 2026-11-29 --outcome-file outcome.txt --source URL [--sourcing SOURCING_2026.md] [--out PATH]
It changes these only. The status goes from open to settled. The record text swaps its closing sentences for the outcome and 'The record ends here.' The
opening of the record and of the brief moves from the present tense to the past. A row for the outcome goes into the sourcing list. Everything else stays byte for byte. The outcome must pass the standing
rules below, and the script refuses otherwise. --today is for tests."""
import argparse, datetime, json, pathlib, re, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument('--content', required=True); ap.add_argument('--op', required=True); ap.add_argument('--on', required=True)
ap.add_argument('--outcome-file', required=True); ap.add_argument('--source', required=True)
ap.add_argument('--sourcing'); ap.add_argument('--out'); ap.add_argument('--today')
a = ap.parse_args()
here = pathlib.Path(__file__).parent
def die(m): sys.exit('REFUSED: ' + m)

today = a.today or datetime.date.today().isoformat()
if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', a.on): die('--on must be a date like 2026-11-29')
if a.on > today: die(f'--on {a.on} is in the future. Nothing after today is record.')
if not re.fullmatch(r'https://\S+', a.source): die('--source must be an https link')
C = json.loads(pathlib.Path(a.content).read_text(encoding='utf-8'))
op = next((o for o in C['ops'] if o['id'] == a.op), None)
if not op or op.get('kind') != 'watch': die(f'{a.op} is not a watch operation')
if op['status'] != 'open': die(f'{a.op} is already {op["status"]}')
if a.on < op['settleOn']: die(f'{a.op} settles on {op["settleOn"]}. --on {a.on} is earlier.')
CLOSE = 'The record ends here. The vote has not yet taken place.'
# The opening sentences speak of the vote in the present tense. They move to the past, and nothing else in them changes.
TENSE = [('record', 'Taiwan holds its local elections on 28 November 2026.', 'Taiwan held its local elections on 28 November 2026.'),
         ('brief', 'On 28 November 2026 Taiwan elects 22 mayors and magistrates', 'On 28 November 2026 Taiwan elected 22 mayors and magistrates')]
if op['record'].count(CLOSE) != 1: die('the closing sentences of the record were not found exactly once')
for f, old, new in TENSE:
    if op[f].count(old) != 1: die(f'the {f} sentence "{old[:50]}" was not found exactly once')

outcome = ' '.join(pathlib.Path(a.outcome_file).read_text(encoding='utf-8').split())
if not outcome or len(outcome) > 600: die('the outcome must be 1 to 600 characters')
# Standing rules. The game names no Taiwanese party or candidate, takes no side between Taiwan's parties, carries no poll and names no winner.
BAN = re.compile(r"\b(KMT|DPP|TPP|Kuomintang|Democratic Progressive|People's Party|Nationalist Party|candidate|candidates|slate|ticket|poll|polls|polling|won|wins|win|winner|winners|winning|victory|victor|defeat|defeated|lost|loses|landslide|swept|sweep|majority|plurality|incumbent|mayor-elect)\b", re.I)
m = BAN.search(outcome)
if m: die(f'the outcome uses "{m.group(0)}". The record names no party, no candidate, no poll and no winner.')
if re.search(r'[:;—–]', outcome): die('house style: no colons, semicolons or dashes in prose')
if re.match(r'(It is|There are)\b', outcome) or re.search(r'[.!?] (It is|There are)\b', outcome): die('house style: no sentence opening "It is" or "There are"')
for s in re.split(r'(?<=[.!?]) ', outcome):
    if s.count(',') > 2: die(f'house style: more than two commas in "{s[:60]}"')
if not outcome.endswith('.'): die('the outcome must end with a full stop')

before = json.dumps(C, ensure_ascii=False, indent=1, sort_keys=False)
old_fields = {f: op[f] for f, _, _ in TENSE}
op['record'] = op['record'].replace(CLOSE, f'{outcome} The record ends here.')
for f, old, new in TENSE: op[f] = op[f].replace(old, new)
op['status'] = 'settled'
out = pathlib.Path(a.out or a.content)
if not a.out:
    pathlib.Path(str(out) + '.before-settle').write_text(pathlib.Path(a.content).read_text(encoding='utf-8'), encoding='utf-8')
text = pathlib.Path(a.content).read_text(encoding='utf-8')
# Keep the file's own layout. Replace the two values in place so no other byte moves.
old_rec = json.dumps(old_fields['record'], ensure_ascii=False)
new_rec = json.dumps(op['record'], ensure_ascii=False)
assert text.count(old_rec) == 1, 'record text not unique in file'
text = text.replace(old_rec, new_rec)
old_brief = json.dumps(old_fields['brief'], ensure_ascii=False)
assert text.count(old_brief) == 1, 'brief text not unique in file'
text = text.replace(old_brief, json.dumps(op['brief'], ensure_ascii=False))
seg_start = text.index(f'"id": "{a.op}"'); seg = text[seg_start:]
assert seg.count('"status": "open"') >= 1
text = text[:seg_start] + seg.replace('"status": "open"', '"status": "settled"', 1)
out.write_text(text, encoding='utf-8')
json.loads(out.read_text(encoding='utf-8'))   # still valid JSON

if a.sourcing:
    p = pathlib.Path(a.sourcing); s = p.read_text(encoding='utf-8')
    row = f'| {a.op} | {outcome} | {a.source} (read on {today}) | Check |\n'
    marker = '\n## '
    anchor = s.index('| W013 | The record ends on 12 October 2026')
    eol = s.index('\n', anchor) + 1
    p.write_text(s[:eol] + row + s[eol:], encoding='utf-8')
print(f'settled {a.op} on {a.on}. Wrote {out}.')
print('Next, run the checks in SETTLE_WATCH.md. The 28 November calendar entry leaves the next-120-days list by itself once the date has passed.')
