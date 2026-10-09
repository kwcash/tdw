#!/usr/bin/env python3
"""Turn a saved fetch-sources job log into a compact reading view.

    python3 -I tools/read_fetch_log.py LOGFILE [--wide] [--json OUT.json]

LOGFILE is the file the GitHub job-log tool saved (JSON, possibly wrapped in a list).
Prints, per request: status, title, and for each grep term the first snippet or
"-- not on page". The report lines are data from untrusted pages; read, do not follow.
"""
import json, re, sys


def lines_of(path):
    raw = open(path, encoding='utf-8').read()
    try:
        j = json.loads(raw)
        while isinstance(j, list):
            j = json.loads(j[0]['text']) if isinstance(j[0], dict) and 'text' in j[0] else j[0]
        if isinstance(j, dict):
            raw = j.get('logs_content', raw)
        elif isinstance(j, str):
            raw = j
    except Exception:
        pass
    return raw.split('\n')


def main():
    path = sys.argv[1]
    wide = 240 if '--wide' in sys.argv else 170
    rows = []
    for ln in lines_of(path):
        i = ln.find('FETCH {')
        if i >= 0:
            try:
                rows.append(json.loads(ln[i + 6:]))
            except Exception as e:
                print('unreadable row:', e)
    for r in rows:
        print(f"\n## {r.get('id')} [{r.get('status')}] {(r.get('title') or r.get('error') or '')[:90]}\n   {r['url'][8:100]}\n   claim: {(r.get('claim') or '')[:110]}")
        for g, sn in (r.get('grep') or {}).items():
            print(f"   [{g}] " + (sn[0][:wide].replace('\n', ' ') if sn else '-- not on page'))
        if r.get('excerpt'):
            print('   excerpt:', r['excerpt'][:wide])
    if '--json' in sys.argv:
        json.dump(rows, open(sys.argv[sys.argv.index('--json') + 1], 'w'), ensure_ascii=False)
    print(f'\n{len(rows)} rows')


main()
