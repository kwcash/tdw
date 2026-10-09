#!/usr/bin/env python3
"""Sourcing worksheet: one row per sentence of a case's record.

    python3 -I tools/claims.py export [--kind futures|catalog] [--status unsourced] [IDS...] > review/sheet.csv
    python3 -I tools/claims.py apply review/sheet.csv [--dry-run]

export  lists every sentence of `text.record` with the links it already carries
        and whether it is checkable (a number, date or named act). The reviewer
        fills three columns: `verdict`, `add_label`, `add_url`.
apply   writes the reviewed rows back:
          verdict supported | partial  with add_url  -> appends ([label](url)) to the sentence
          verdict unsupported                          -> appends [NEEDED: source]
          verdict contradicted                         -> leaves the text; the row stays in the sheet for the author
        Status becomes `sourced` when a case has a link. It never sets `verified`.
Rows keep the sentence index, so edit the sheet, not the sentence column.
"""
import csv, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I drops the script dir
from tdwcases import DATA, case_files, load_json, dump_json, LINK

SPLIT = re.compile(r'(?<=[.!?])(\s+)(?=[A-Z"“])')
ABBR = re.compile(r'\b(Mr|Mrs|Dr|St|No|Inc|Corp|Ltd|Co|vs|Jr|Sr)\.$')
CHECKABLE = re.compile(r'\d|\b(January|February|March|April|May|June|July|August|September|October|November|December)\b|\b(said|reported|announced|convicted|sentenced|sanctioned|signed|struck|ruled|added|issued|filed|expelled|closed)\b')
FIELDS = ['id', 'idx', 'checkable', 'has_link', 'sentence', 'verdict', 'add_label', 'add_url', 'notes']
VERDICTS = {'', 'supported', 'partial', 'unsupported', 'contradicted'}


def sentences(text):
    """Return [sentence, sep, sentence, ...] so ''.join(parts) == text."""
    raw = SPLIT.split(text)
    out = [raw[0]]
    for i in range(1, len(raw), 2):
        sep, nxt = raw[i], raw[i + 1]
        if ABBR.search(out[-1]):               # "Warren Delano Jr. and ..." is not a sentence end
            out[-1] += sep + nxt
        else:
            out += [sep, nxt]
    return out


def export(args):
    kind = args[args.index('--kind') + 1] if '--kind' in args else None
    status = args[args.index('--status') + 1] if '--status' in args else None
    ids = [a for a in args if re.fullmatch(r'[CF]\d{3}', a)]
    w = csv.DictWriter(sys.stdout, FIELDS, lineterminator='\n')
    w.writeheader()
    for p in case_files():
        c = load_json(p)
        if (kind and c['kind'] != kind) or (status and c['status'] != status) or (ids and c['id'] not in ids):
            continue
        for i, s in enumerate(sentences(c['text']['record'])[::2]):
            w.writerow({'id': c['id'], 'idx': i, 'checkable': int(bool(CHECKABLE.search(s))),
                        'has_link': int(bool(LINK.search(s))), 'sentence': s})


def apply(args):
    rows = list(csv.DictReader(open(args[0], encoding='utf-8')))
    dry = '--dry-run' in args
    by = {}
    for r in rows:
        if r['verdict'] not in VERDICTS:
            sys.exit(f'{r["id"]}/{r["idx"]}: unknown verdict {r["verdict"]!r}')
        by.setdefault(r['id'], []).append(r)
    changed = 0
    for cid, rs in by.items():
        p = DATA / f'{cid}.json'
        c = load_json(p)
        parts = sentences(c['text']['record'])
        for r in rs:
            i = int(r['idx']) * 2
            if parts[i] != r['sentence']:
                sys.exit(f'{cid}/{r["idx"]}: sentence changed since export; re-export before applying')
            v = r['verdict']
            if v in ('supported', 'partial') and r['add_url']:
                if not r['add_label'] or not r['add_url'].startswith('https://'):
                    sys.exit(f'{cid}/{r["idx"]}: needs add_label and an https add_url')
                tag = f' ([{r["add_label"]}]({r["add_url"]}))'
            elif v == 'unsupported':
                tag = ' [NEEDED: source]'
            else:
                continue
            s = parts[i]
            parts[i] = (s[:-1] + tag + s[-1]) if s.endswith('.') else s + tag
            changed += 1
        c['text']['record'] = ''.join(parts)
        if c['status'] == 'unsourced' and any(m for m in LINK.finditer(c['text']['record'])):
            c['status'] = 'sourced'
        if not dry:
            dump_json(p, c)
    print(f'{changed} sentences changed in {len(by)} cases' + (' (dry run)' if dry else ''))


if __name__ == '__main__':
    cmd, rest = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 2 else ('', [])
    {'export': export, 'apply': apply}.get(cmd, lambda a: sys.exit(__doc__))(rest)
