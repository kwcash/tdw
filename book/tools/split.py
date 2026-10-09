#!/usr/bin/env python3
"""Split a monolithic Pandoc-style manuscript into one file per section.

    python3 -I tools/split.py KDP_MASTER.md [--out src]

Boundaries are the lines that start with "# " or "## ", plus "### " inside the
Notes appendix (Appendix H), where each "###" is one chapter's notes. A
<!-- ... MATTER --> marker travels with the section that follows it. The
manifest records the order, so `build.py` can reassemble the book exactly.
"""
import hashlib, json, re, sys, pathlib, shutil

MARKER = re.compile(r'^<!-- (FRONT|MAIN|BACK) MATTER -->\s*$')

def slug(title):
    t = re.sub(r'\{[^}]*\}', '', title).lower().replace("'", '')
    t = re.sub(r'[^a-z0-9]+', '-', t).strip('-')
    return t[:60].rstrip('-') or 'section'

def boundaries(lines):
    """Yield (line_index, level, title) for each section start."""
    out, in_notes, pending = [], False, None
    for i, ln in enumerate(lines):
        if MARKER.match(ln):
            pending = i
            continue
        m = re.match(r'^(#{1,3}) (.+?)\s*$', ln)
        if not m:
            if ln.strip():
                pending = None
            continue
        lvl, title = len(m.group(1)), m.group(2)
        if lvl == 3 and not in_notes:
            pending = None
            continue
        if lvl == 2:
            in_notes = title.startswith('Appendix H')
        start = pending if pending is not None else i
        out.append((start, lvl, title))
        pending = None
    return out

def main():
    src = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else 'src')
    raw = src.read_bytes()
    text = raw.decode('utf-8')
    lines = text.splitlines(keepends=True)
    bs = boundaries(lines)
    if out.exists():
        shutil.rmtree(out)
    cuts = [0] + [b[0] for b in bs] + [len(lines)]
    chunks = [("metadata", 0, "Metadata", ''.join(lines[cuts[0]:cuts[1]]))]
    for k, (start, lvl, title) in enumerate(bs):
        chunks.append((None, lvl, title, ''.join(lines[start:cuts[k + 2]])))

    manifest, part, n, in_app, in_notes = [], None, 0, False, False
    for kind, lvl, title, body in chunks:
        n += 1
        if kind == 'metadata':
            d, name = 'front', '00-metadata.md'
        elif lvl == 1:
            in_notes = False
            if title.startswith('Part '):
                part = 'part-' + {'I':'1','II':'2','III':'3','IV':'4','V':'5'}[title.split()[1].rstrip('.')]
                in_app = False
                d, name = part, '00-part.md'
            else:
                part, in_app = 'appendices', True
                d, name = part, '00-appendices.md'
        elif lvl == 2:
            in_notes = title.startswith('Appendix H')
            if in_notes:
                d, name = 'appendix-h', '00-notes-intro.md'
            elif title.startswith(('Acknowledgments', 'About the Author', 'A Note on What')):
                d, name = 'back', slug(title) + '.md'
            elif in_app:
                d, name = 'appendices', slug(title.split('.')[0] + ' ' + title.split('.', 1)[-1]) + '.md'
            elif part is None:
                d, name = 'front', slug(title) + '.md'
            else:
                d, name = part, slug(title) + '.md'
        else:  # level 3, only inside notes
            d, name = 'appendix-h', slug(title) + '.md'
        p = out / d / name
        existing = [m for m in manifest if m['dir'] == d]
        name = f"{len(existing):02d}-{name}" if not name[:2].isdigit() else name
        p = out / d / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(body, encoding='utf-8', newline='')
        manifest.append({'path': f'{d}/{name}', 'dir': d, 'level': lvl, 'title': title,
                         'words': len(body.split())})
    (out.parent / 'manifest.json').write_text(json.dumps({
        'source': src.name, 'source_sha256': hashlib.sha256(raw).hexdigest(),
        'source_bytes': len(raw), 'sections': manifest}, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'{len(manifest)} sections -> {out}/ ; manifest.json written')

if __name__ == '__main__':
    main()
