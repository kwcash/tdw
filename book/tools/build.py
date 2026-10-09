#!/usr/bin/env python3
"""Reassemble the manuscript from src/ in manifest order.

    python3 -I tools/build.py [OUT.md]          write the book
    python3 -I tools/build.py --verify          rebuild and compare to the recorded hash
    python3 -I tools/build.py --rehash          accept the current src/ as the new baseline
"""
import hashlib, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

def assemble():
    man = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
    return man, ''.join((ROOT / 'src' / s['path']).read_text(encoding='utf-8') for s in man['sections'])

if __name__ == '__main__':
    man, text = assemble()
    if '--rehash' in sys.argv:
        for sec in man['sections']:
            sec['words'] = len((ROOT / 'src' / sec['path']).read_text(encoding='utf-8').split())
        man['source'] = 'src/ (rebuilt)'
        man['source_sha256'] = hashlib.sha256(text.encode('utf-8')).hexdigest()
        man['source_bytes'] = len(text.encode('utf-8'))
        (ROOT / 'manifest.json').write_text(json.dumps(man, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
        print('manifest.json updated; new baseline', man['source_sha256'][:16])
        sys.exit(0)
    if '--verify' in sys.argv:
        h = hashlib.sha256(text.encode('utf-8')).hexdigest()
        ok = h == man['source_sha256']
        print(('PASS' if ok else 'FAIL') + f'  rebuilt {len(text.encode())} bytes, sha256 {h[:16]} (recorded {man["source_sha256"][:16]})')
        sys.exit(0 if ok else 1)
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'build' / 'book.md')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding='utf-8', newline='')
    print(f'wrote {out}')
