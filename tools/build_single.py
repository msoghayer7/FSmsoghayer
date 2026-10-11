#!/usr/bin/env python3
"""Bundle index.html and all its local scripts/styles into one self-contained file.

The single file works when opened directly (from a ZIP, an e-mail attachment
or a USB stick) because nothing has to be loaded from neighbouring files.

    python3 tools/build_single.py        ->  NRRC-Topics-Tracker.html
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "NRRC-Topics-Tracker.html"


def inline_script(m):
    src = (ROOT / m.group(1)).read_text(encoding="utf-8")
    return "<script>\n" + src.replace("</script", "<\\/script") + "\n</script>"


def inline_style(m):
    css = (ROOT / m.group(1)).read_text(encoding="utf-8")
    return "<style>\n" + css + "\n</style>"


html = (ROOT / "index.html").read_text(encoding="utf-8")
html = re.sub(r'<script src="([^"]+)"></script>', inline_script, html)
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_style, html)
OUT.write_text(html, encoding="utf-8")
print(f"{OUT.name}: {OUT.stat().st_size / 1e6:.1f} MB")
