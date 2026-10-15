#!/usr/bin/env python3 -I
"""Style lint that fails the build. Usage: lint-strict.py FILE [FILE ...]
Checks every player-facing string in a content.json (all string values except ids, codes and links), the visible text of
an index.html (script and style removed, and the loader's own messages ignored), and a Markdown file.
Fails on an em dash, ' -- ', a sentence that opens with 'It is' or 'There are', and a sentence with more than two commas."""
import json, re, sys, html as H
SKIP_KEYS = {'id', 'ref', 'source', 'storageKey', 'era', 'schema', 'kind', 'status', 'settleOn', 'date', 'end', 'type', 'faction', 'domain', 'by', 'against', 'player', 'spine', 'stage', 'dimension', 'arc', 'tutorial', 'dailyEpoch', 'gap', 'code', 'group', 'short', 'control', 'name_', 'role_'}
issues = []

def sentences(t):
    t = re.sub(r'(\d)\.(\d)', r'\1․\2', t)           # decimals are not sentence ends
    t = re.sub(r'\b(Mr|Mrs|Dr|St|U\.S|No)\.', lambda m: m.group(0).replace('.', '․'), t)
    return [s.replace('․', '.') for s in re.split(r'(?<=[.!?])\s+', t.strip()) if s]

def check(where, t):
    if not isinstance(t, str) or not t.strip(): return
    if '—' in t: issues.append(f'{where}: em dash')
    if ' -- ' in t: issues.append(f'{where}: " -- "')
    for s in sentences(t):
        if re.match(r'^(It is|There are)\b', s) or re.search(r'\bIt is ', s) and re.match(r'^It is\b', s): issues.append(f'{where}: sentence opens with "{s.split()[0]} {s.split()[1]}": {s[:70]}')
        n = s.count(',')
        if n > 2: issues.append(f'{where}: {n} commas: {s[:80]}')

def walk(where, v, key=None):
    if isinstance(v, dict):
        for k, x in v.items(): walk(f'{where}.{k}', x, k)
    elif isinstance(v, list):
        for i, x in enumerate(v): walk(f'{where}[{i}]', x, key)
    elif isinstance(v, str):
        if key in SKIP_KEYS or v.startswith('http'): return
        check(where, v)

for path in sys.argv[1:]:
    if path.endswith('.json'):
        walk(path, json.load(open(path, encoding='utf-8')))
    elif path.endswith('.html'):
        s = open(path, encoding='utf-8').read()
        for m in re.finditer(r'<meta[^>]*(?:name|property)="(?:description|og:description)"[^>]*content="([^"]*)"', s): check(f'{path} meta', H.unescape(m.group(1)))
        for m in re.finditer(r'<title>([^<]*)</title>', s): check(f'{path} title', H.unescape(m.group(1)))
        s = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', s, flags=re.S)
        s = re.sub(r'<[^>]+>', '\n', s)
        for i, para in enumerate(p for p in H.unescape(s).split('\n') if p.strip()): check(f'{path} text {i}', para)
    else:
        for i, line in enumerate(open(path, encoding='utf-8').read().split('\n')):
            line = re.sub(r'`[^`]*`', '', line); line = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', line)
            if line.lstrip().startswith(('|', '```', '---')): 
                # table rows hold facts and ids. Still check dashes.
                if '—' in line: issues.append(f'{path}:{i+1}: em dash')
                continue
            check(f'{path}:{i+1}', re.sub(r'^[#>\-\*\d\.\s]+', '', line))
for i in issues: print('FAIL', i)
print(f'{len(issues)} style failures')
sys.exit(1 if issues else 0)
