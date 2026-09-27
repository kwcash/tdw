#!/usr/bin/env python3
"""Add a 'bodymatter' landmark to an EPUB's nav document.

Kindle and other readers use it as the "start reading" location. pandoc
only writes title-page and contents landmarks, so this points the reader
at the file holding the given heading id (the Prologue).
"""
import sys
import zipfile

epub, heading_id, label = sys.argv[1], sys.argv[2], sys.argv[3]
with zipfile.ZipFile(epub) as z:
    items = [(i, z.read(i.filename)) for i in z.infolist()]

target = None
for info, data in items:
    if info.filename.endswith(".xhtml") and f'id="{heading_id}"'.encode() in data:
        target = info.filename.split("EPUB/", 1)[-1]
        break
if not target:
    sys.exit(f"no file holds id {heading_id!r}")

out = []
for info, data in items:
    if info.filename.endswith("nav.xhtml"):
        text = data.decode()
        start = text.index('epub:type="landmarks"')
        end = text.index("</ol>", start)
        text = text[:end] + f'  <li>\n      <a href="{target}#{heading_id}" epub:type="bodymatter">{label}</a>\n    </li>\n  ' + text[end:]
        data = text.encode()
    out.append((info, data))

with zipfile.ZipFile(epub, "w") as z:
    for info, data in out:
        # mimetype must stay first and uncompressed
        ctype = zipfile.ZIP_STORED if info.filename == "mimetype" else zipfile.ZIP_DEFLATED
        z.writestr(info, data, compress_type=ctype)
print(f"bodymatter landmark -> {target}#{heading_id}")
