"""Shared helpers: paths, loading, derivation, and a small JSON Schema checker.

The checker covers only the keywords our schemas use: type, enum, const,
required, properties, additionalProperties, items, minItems, maxItems,
uniqueItems, minLength, maxLength, pattern, minimum, maximum, allOf, if/then/else,
$ref to #/$defs, and boolean subschemas. Standard tools (ajv, check-jsonschema)
read the same schema files.
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCHEMA = ROOT / 'schema'
DATA = ROOT / 'data'
MONTHS = 'January February March April May June July August September October November December'.split()


def load_json(p):
    return json.loads(pathlib.Path(p).read_text(encoding='utf-8'))


def dump_json(p, obj):
    pathlib.Path(p).write_text(json.dumps(obj, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def case_files():
    return sorted(p for p in DATA.glob('[CF][0-9][0-9][0-9].json'))


def moment_label(m):
    return (MONTHS[m['month'] - 1] + ' ' if m.get('month') else '') + str(m['year'])


def default_label(when):
    s, e = moment_label(when['start']), moment_label(when['end'])
    return s if s == e else f'{s} to {e}'


def label_of(c):
    return c.get('label') or default_label(c['when'])


def full_title_of(c):
    if c.get('fullTitle'):
        return c['fullTitle']
    return c['title'] + (f" ({label_of(c)})" if c['kind'] == 'catalog' else '')


LINK = re.compile(r'\[([^\]]+)\]\(([^)\s]*)\)')


def links(c):
    """Every [label](url) in the case text, as (field, label, url)."""
    return [(k, m.group(1), m.group(2)) for k, v in c['text'].items() for m in LINK.finditer(v)]


def _type_ok(v, t):
    return {'object': isinstance(v, dict), 'array': isinstance(v, list), 'string': isinstance(v, str),
            'integer': isinstance(v, int) and not isinstance(v, bool), 'null': v is None,
            'boolean': isinstance(v, bool), 'number': isinstance(v, (int, float)) and not isinstance(v, bool)}[t]


def check(v, s, root, path='$'):
    """Return a list of 'path: message' errors for value v against schema s."""
    if s is True:
        return []
    if s is False:
        return [f'{path}: not allowed here']
    errs = []
    if '$ref' in s:
        node = root
        for part in s['$ref'].lstrip('#/').split('/'):
            node = node[part]
        return check(v, node, root, path)
    if 'type' in s:
        ts = s['type'] if isinstance(s['type'], list) else [s['type']]
        if not any(_type_ok(v, t) for t in ts):
            return [f'{path}: expected {"/".join(ts)}, got {type(v).__name__}']
    if 'const' in s and v != s['const']:
        errs.append(f'{path}: must be {s["const"]!r}')
    if 'enum' in s and v not in s['enum']:
        errs.append(f'{path}: {v!r} not one of {s["enum"]}')
    if isinstance(v, str):
        if 'minLength' in s and len(v) < s['minLength']:
            errs.append(f'{path}: shorter than {s["minLength"]} characters')
        if 'maxLength' in s and len(v) > s['maxLength']:
            errs.append(f'{path}: longer than {s["maxLength"]} characters')
        if 'pattern' in s and not re.search(s['pattern'], v):
            errs.append(f'{path}: {v!r} does not match {s["pattern"]}')
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if 'minimum' in s and v < s['minimum']:
            errs.append(f'{path}: below {s["minimum"]}')
        if 'maximum' in s and v > s['maximum']:
            errs.append(f'{path}: above {s["maximum"]}')
    if isinstance(v, list):
        if 'minItems' in s and len(v) < s['minItems']:
            errs.append(f'{path}: fewer than {s["minItems"]} items')
        if 'maxItems' in s and len(v) > s['maxItems']:
            errs.append(f'{path}: more than {s["maxItems"]} items')
        if s.get('uniqueItems') and len({json.dumps(x, sort_keys=True) for x in v}) != len(v):
            errs.append(f'{path}: items must be unique')
        if 'items' in s:
            for i, x in enumerate(v):
                errs += check(x, s['items'], root, f'{path}[{i}]')
    if isinstance(v, dict):
        for k in s.get('required', []):
            if k not in v:
                errs.append(f'{path}: missing "{k}"')
        props = s.get('properties', {})
        for k, x in v.items():
            if k in props:
                errs += check(x, props[k], root, f'{path}.{k}')
            elif s.get('additionalProperties') is False:
                errs.append(f'{path}: unknown field "{k}"')
    for sub in s.get('allOf', []):
        errs += check(v, sub, root, path)
    if 'if' in s:
        branch = 'then' if not check(v, s['if'], root, path) else 'else'
        if branch in s:
            errs += check(v, s[branch], root, path)
    return errs
