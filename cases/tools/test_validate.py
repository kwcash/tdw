#!/usr/bin/env python3
"""Negative tests: break a copy of the data and check the validator notices.

    python3 -I tools/test_validate.py
"""
import json, os, pathlib, shutil, subprocess, sys, tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent

BREAKS = {
    'bad dimension':        ('C001', lambda c: c.update(dimension='Asymmetric')),
    'unknown stratagem':    ('C001', lambda c: c.update(stratagems=['S37'])),
    'spine not in theater': ('C001', lambda c: c.update(spine='Cyber')),
    'catalog with horizon': ('C001', lambda c: c.update(horizon=1)),
    'future without arc':   ('F001', lambda c: c.pop('arc')),
    'future before 2026':   ('F001', lambda c: c['when']['start'].update(year=2020)),
    'end before start':     ('C009', lambda c: c['when']['end'].update(year=1800)),
    'verified w/o checker': ('F001', lambda c: c.update(status='verified')),
    'sourced w/o link':     ('C001', lambda c: c.update(status='sourced')),
    'banned phrase':        ('C001', lambda c: c['text'].update(fix=c['text']['fix'] + ' Total Domain Warfare')),
    'unknown field':        ('C001', lambda c: c.update(colour='red')),
}

def run(root):
    return subprocess.run([sys.executable, '-I', str(root / 'tools' / 'validate.py')], capture_output=True, text=True)

def main():
    bad = 0
    base = run(ROOT)
    print(('ok   ' if base.returncode == 0 else 'FAIL ') + 'untouched data validates')
    bad += base.returncode != 0
    for name, (cid, fn) in BREAKS.items():
        with tempfile.TemporaryDirectory() as t:
            tmp = pathlib.Path(t) / 'cases'
            shutil.copytree(ROOT, tmp, ignore=shutil.ignore_patterns('build', '__pycache__'))
            p = tmp / 'data' / f'{cid}.json'
            c = json.loads(p.read_text(encoding='utf-8'))
            fn(c)
            p.write_text(json.dumps(c, ensure_ascii=False), encoding='utf-8')
            r = run(tmp)
            ok = r.returncode == 1
            print(('ok   ' if ok else 'FAIL ') + f'{name}: {"caught" if ok else "NOT caught"}')
            bad += not ok
    sys.exit(1 if bad else 0)

main()
