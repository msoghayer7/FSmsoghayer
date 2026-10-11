#!/usr/bin/env python3
"""Bundle index.html and all its local scripts/styles into one self-contained file.

The single file works when opened directly (from a ZIP, an e-mail attachment
or a USB stick) because nothing has to be loaded from neighbouring files.

    python3 tools/build_single.py        ->  NRRC-Topics-Tracker-V<n>.html

The version number <n> comes from the VERSION file; raise it for every
new copy handed over, so file names and the app header show V1, V2, ...
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
VERSION = (ROOT / "VERSION").read_text().strip()
OUT = ROOT / f"NRRC-Topics-Tracker-V{VERSION}.html"


def inline_script(m):
    src = (ROOT / m.group(1)).read_text(encoding="utf-8")
    return "<script>\n" + src.replace("</script", "<\\/script") + "\n</script>"


def inline_style(m):
    css = (ROOT / m.group(1)).read_text(encoding="utf-8")
    return "<style>\n" + css + "\n</style>"


html = (ROOT / "index.html").read_text(encoding="utf-8")
html = re.sub(r'<script src="([^"]+)"></script>', inline_script, html)
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_style, html)
html = html.replace('<span class="ver" id="appVer">نسخة تطويرية</span>', f'<span class="ver" id="appVer">V{VERSION}</span>')
assert f">V{VERSION}</span>" in html
for old in ROOT.glob("NRRC-Topics-Tracker*.html"):   # keep only the current version
    if old != OUT:
        old.unlink()
OUT.write_text(html, encoding="utf-8")
print(f"{OUT.name}: {OUT.stat().st_size / 1e6:.1f} MB")
