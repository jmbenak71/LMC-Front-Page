"""Rebuild index.html from install-template.html and lmc-front-page-builder.js.

Run after editing the bookmarklet source:  python build_install.py
"""
import re
from pathlib import Path

here = Path(__file__).parent
source = (here / "lmc-front-page-builder.js").read_text(encoding="utf-8")
if "</script" in source.lower():
    raise SystemExit("Source must not contain '</script' (it would end the embedding tag).")
template = (here / "install-template.html").read_text(encoding="utf-8")
version = re.search(r"const VERSION = '([^']+)'", source).group(1)
html = template.replace("/*@@SOURCE@@*/", source).replace("@@VERSION@@", version)
(here / "index.html").write_text(html, encoding="utf-8")
print("Wrote index.html for version " + version)
