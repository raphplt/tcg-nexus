#!/usr/bin/env bash
# Synchronise tcg-nexus (branche main) dans 168h/volet-168h du monorepo GitLab Etna.
# A lancer DEPUIS LA RACINE du depot group-1076867.
#
# Usage :
#   bash sync-volet-168h.sh [<url-ou-chemin-tcg-nexus>] [<branche>]
# Defaut : https://github.com/raphplt/tcg-nexus.git  main
#
# Le script fait `git subtree add` au 1er passage, puis `git subtree pull`.
# Import SANS --squash => auteur de chaque commit conserve.
# Le push n'est PAS automatique : verifie puis `git push origin main`.
set -euo pipefail

PREFIX="168h/volet-168h"
TCG_SRC="${1:-https://github.com/raphplt/tcg-nexus.git}"
BRANCH="${2:-main}"

# Verifications
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "Erreur : lance ce script a la racine du depot group-1076867." >&2; exit 1; }
if [ -n "$(git status --porcelain)" ]; then
  echo "Erreur : arbre de travail non propre. Commit ou stash d'abord." >&2; exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Info : tu n'es pas sur main (branche actuelle : $CURRENT_BRANCH)." >&2
fi

if git log --grep="git-subtree-dir: ${PREFIX}$" --oneline | grep -q .; then
  echo ">> Subtree deja present : git subtree pull"
  git subtree pull --prefix="$PREFIX" "$TCG_SRC" "$BRANCH" \
    -m "sync(168h): mise a jour de volet-168h depuis tcg-nexus@${BRANCH}"
else
  echo ">> Premier import : git subtree add"
  if [ -e "$PREFIX" ]; then
    git rm -r --quiet "$PREFIX"
    git commit -m "chore(168h): retrait du placeholder avant import subtree"
  fi
  git subtree add --prefix="$PREFIX" "$TCG_SRC" "$BRANCH" \
    -m "feat(168h): import de tcg-nexus dans volet-168h (subtree)"
fi

echo
echo "OK. Verifie le resultat puis pousse :  git push origin main"
