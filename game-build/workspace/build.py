#!/usr/bin/env python3 -I
"""Builds the bundle from the maintained sources in src/. Usage: python3 build.py [--check]
src/engine.js, src/shim.js, src/app.js and src/board.js join, in that order, into out/game.js. src/board.js holds the
placeholder __HELP__, which takes src/help.json in compact form. out/engine.js is the engine part alone, for the Node tests.
src/record.js becomes out/record.js and src/style.css becomes parts/style.css, which mkpkg.py reads.
With --check nothing is written. The run fails if any output differs from what the sources make, so a hand edit to out/ shows."""
import json, sys, pathlib
root = pathlib.Path(__file__).resolve().parent
src = root / 'src'

def outputs():
    help_js = json.dumps(json.loads((src / 'help.json').read_text(encoding='utf-8')), ensure_ascii=False, separators=(',', ':'))
    if '\n' in help_js or '</' in help_js: sys.exit('src/help.json must not hold a line break or "</" inside a string')
    board = (src / 'board.js').read_text()
    if board.count('__HELP__') != 1: sys.exit('src/board.js must hold __HELP__ exactly once')
    engine = (src / 'engine.js').read_text()
    game = engine + (src / 'shim.js').read_text() + (src / 'app.js').read_text() + board.replace('__HELP__', help_js)
    return {
        'out/game.js': game,
        'out/engine.js': engine.rstrip() + '\n',
        'out/record.js': (src / 'record.js').read_text(),
        'parts/style.css': (src / 'style.css').read_text(),
    }

if __name__ == '__main__':
    check = '--check' in sys.argv
    stale = []
    for rel, text in outputs().items():
        p = root / rel
        if check:
            if not p.exists() or p.read_text() != text: stale.append(rel)
        else:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text)
    if check:
        print('build: ' + ('out of date, run python3 build.py: ' + ', '.join(stale) if stale else 'outputs match the sources'))
        sys.exit(1 if stale else 0)
    print('build: wrote ' + ', '.join(outputs()))
