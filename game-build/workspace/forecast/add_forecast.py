#!/usr/bin/env python3 -I
"""Copies the claim count from forecast/out/forecasts.json into the forecast block of content/era3.json, and sets the
cache key of the data file. Usage: python3 forecast/add_forecast.py VERSION
Raise VERSION whenever forecasts.json changes, so browsers load the new file. It changes no other key."""
import json, pathlib, sys
ws = pathlib.Path(__file__).resolve().parent.parent
if len(sys.argv) != 2 or not sys.argv[1].isdigit(): sys.exit(__doc__)
D = json.loads((ws / 'forecast/out/forecasts.json').read_text(encoding='utf-8'))
p = ws / 'content/era3.json'
C = json.loads(p.read_text(encoding='utf-8'))
C['forecast']['count'] = len(D['items'])
C['forecast']['data'] = f'assets/forecasts.json?v={sys.argv[1]}'
p.write_text(json.dumps(C, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(f'era3.json: {len(D["items"])} claims, data key v{sys.argv[1]}')
