#!/usr/bin/env python3
"""One-time import of the game's content.json into one file per case.

    python3 -I tools/import_content.py PATH/content.json

Writes data/C001.json ... data/F100.json, data/arcs.json and data/meta.json.
Safe to rerun; it overwrites data/. After the import, data/ is the source
of truth and content.json becomes a build product (see build.py).
"""
import hashlib, json, pathlib, sys
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I drops the script dir
from tdwcases import DATA, dump_json, default_label, links

LABEL_FIELDS = ('brief', 'record', 'reading', 'coreEvent', 'gapText', 'fix')


def moment(a):
    return {'year': a[0], 'month': a[1]}


def convert(o):
    c = {'id': o['id'], 'kind': o['kind'], 'title': o['title']}
    c_when = {'start': moment(o['when']['start']), 'end': moment(o['when']['end'])}
    probe = {'title': o['title'], 'kind': o['kind'], 'when': c_when}
    if o['label'] != default_label(c_when):
        c['label'] = o['label']
    label = o['label']
    default_full = o['title'] + (f' ({label})' if o['kind'] == 'catalog' else '')
    if o['fullTitle'] != default_full:
        c['fullTitle'] = o['fullTitle']
    c.update(tier=o['tier'], dimension=o['dimension'], stage=o['stage'], stratagems=o['stratagems'],
             theater=o['theater'], spine=o['spine'], opponent=o['opponent'], when=c_when)
    if o['kind'] == 'futures':
        c.update(world=o['world'], horizon=o['horizon'], arc=o['arc'])
    c['gap'] = o['gap']
    c['text'] = {k: o[k] for k in LABEL_FIELDS if k in o}
    c['status'] = 'sourced' if links(c) else 'unsourced'
    return c


def main():
    src = pathlib.Path(sys.argv[1])
    raw = src.read_bytes()
    d = json.loads(raw)
    DATA.mkdir(exist_ok=True)
    for old in DATA.glob('*.json'):
        old.unlink()
    for o in d['ops']:
        assert int(o['id'][1:]) == o['num']
        dump_json(DATA / f"{o['id']}.json", convert(o))
    dump_json(DATA / 'arcs.json', d['arcs'])
    dump_json(DATA / 'meta.json', {'dailyEpoch': d['dailyEpoch'], 'importedFrom': src.name,
                                   'importedSha256': hashlib.sha256(raw).hexdigest()})
    print(f"{len(d['ops'])} cases, {len(d['arcs'])} arcs written to {DATA}")


if __name__ == '__main__':
    main()
