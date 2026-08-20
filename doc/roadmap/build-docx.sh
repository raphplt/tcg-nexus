#!/usr/bin/env bash
# Produit etape2.docx, destiné à être importé dans Google Docs.
# Le diagramme de Gantt est un tableau LaTeX : il est remplacé par son image,
# extraite du PDF, car il ne survivrait pas à la conversion.
set -e
cd "$(dirname "$0")"

# Le Gantt est compilé seul puis exporté en image, pour être inséré
# tel quel dans le document Word.
python3 gantt.py
xelatex -interaction=batchmode gantt-standalone.tex >/dev/null 2>&1
pdftoppm -r 200 -png -singlefile gantt-standalone.pdf gantt
python3 - <<'PY'
import re
from pathlib import Path
src = Path("etape2-source.md").read_text(encoding="utf-8")
src = src.replace("\\input{gantt.tex}", "![](gantt.png)")
src = re.sub(r"^\\newpage\s*$", "", src, flags=re.M)          # sauts de page LaTeX
src = re.sub(r"^\\(begin|end)\{[a-z]+\}\s*$", "", src, flags=re.M)
Path("/tmp/etape2-docx.md").write_text(src, encoding="utf-8")
PY
pandoc /tmp/etape2-docx.md -o etape2.docx \
  --resource-path=. --toc --toc-depth=2 --highlight-style=tango
echo "etape2.docx généré"
