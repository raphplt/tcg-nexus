#!/usr/bin/env bash
# Régénère etape2.pdf depuis etape2-source.md. À relancer après chaque revue.
set -e
cd "$(dirname "$0")"
python3 gantt.py
pandoc etape2-source.md -o etape2.pdf \
  --pdf-engine=xelatex \
  -V geometry:a4paper,top=2cm,bottom=2cm,left=1.9cm,right=1.9cm \
  -V mainfont="DejaVu Serif" -V sansfont="DejaVu Sans" -V monofont="DejaVu Sans Mono" \
  -V fontsize=10pt -V colorlinks=true -V linkcolor=navy -V urlcolor=navy \
  --include-in-header=header-e2.tex
echo "etape2.pdf régénéré"
