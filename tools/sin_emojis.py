#!/usr/bin/env python3
"""Quita emojis de los textos HTML (no toca <script>/<style>). Uso: sin_emojis.py a.html b.html"""
import re, sys
EMO = re.compile('[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B50\u2B06\u2B05\u2B07\u23E9-\u23FF\u2764\u2139\uFE0F\u200D]\\s?')
KEEP = re.compile(r'(<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->)', re.S)
def clean(s):
    parts = KEEP.split(s)
    for i in range(0, len(parts), 2):
        parts[i] = EMO.sub('', parts[i])
    return ''.join(parts)
for f in sys.argv[1:]:
    t = open(f).read(); n = clean(t)
    if n != t: open(f, 'w').write(n); print('limpio', f)
