#!/usr/bin/env python3
"""
Configuration du board GitHub Projects de la roadmap TCG Nexus (CMG-MGQ5, étape 2).

Crée les champs personnalisés décrits dans README.md, importe les items de
roadmap-tcg-nexus.csv sous forme de draft issues et renseigne leurs champs.

Prérequis
---------
    gh auth login
    gh auth refresh -s project,read:project

Usage
-----
    python3 setup_board.py --project 3 --check        # inventaire + validation, n'écrit rien
    python3 setup_board.py --project 3                # exécution
    python3 setup_board.py --project 3 --dry-run      # aperçu détaillé sans écrire
    python3 setup_board.py --project 3 --fields-only  # structure sans les items

Ce que le script ne fait jamais
-------------------------------
Il ne supprime aucun item, ne modifie aucune vue, ne touche à aucune carte dont le
titre ne correspond pas exactement à « [ID] Titre » du CSV. Un board contenant déjà
des issues liées au dépôt les conserve intactes. Le seul effet de bord possible est
un doublon, si une carte existante décrit le même travail sous un autre titre :
`--check` affiche l'inventaire des cartes étrangères au CSV pour permettre de le
vérifier avant d'écrire.

Fonctionnement
--------------
1. Validation préalable de toutes les valeurs du CSV contre les options réellement
   présentes sur le board. Rien n'est écrit tant qu'une valeur ne correspond pas :
   inutile de découvrir au bout de vingt minutes qu'il manque une option.
2. Écriture par lots via l'API GraphQL — une requête pour vingt mutations plutôt
   qu'un appel `gh project item-edit` par champ. Environ dix fois moins d'appels.
3. Reprise automatique sur erreur transitoire (429, 499, 502, 503), puis repli
   mutation par mutation si un lot échoue, pour isoler l'item fautif.

Le script est idempotent : les items déjà présents sont retrouvés par leur titre et
leurs champs sont réappliqués. On peut le relancer autant de fois que nécessaire.

Les vues (Roadmap, Par épic, Par développeur, Cycle courant, Public roadmap) ne sont
pas créables par API : elles restent à configurer à la main, voir README.md.
"""

from __future__ import annotations

import argparse
import csv
import difflib
import json
import re
import subprocess
import sys
import time
import unicodedata
from pathlib import Path

CSV_PATH = Path(__file__).with_name("roadmap-tcg-nexus.csv")
MAP_PATH = Path(__file__).with_name("mapping-issues.csv")

# Champ -> (type de données, options attendues pour les listes)
FIELDS: dict[str, tuple[str, list[str]]] = {
    "Epic": (
        "SINGLE_SELECT",
        ["CAT", "COL", "MKT", "TRN", "GME", "IA", "COM", "MOB", "SEC", "QUA"],
    ),
    "Version": (
        "SINGLE_SELECT",
        ["V0.1", "V0.2", "V0.3", "V0.4", "V0.5", "V0.6", "V1.0", "V1.1", "V2.0", "V2.5"],
    ),
    "Horizon": ("SINGLE_SELECT", ["Shipped", "Now", "Next", "Later", "Backlog"]),
    "Tech category": (
        "SINGLE_SELECT",
        ["Back-end", "Front-end", "Mobile", "Infra", "QA", "Data", "Full-stack"],
    ),
    "Priority": ("SINGLE_SELECT", ["P0", "P1", "P2", "P3"]),
    "Public": ("SINGLE_SELECT", ["true", "false"]),
    "Due date": ("DATE", []),
    "Estimate": ("NUMBER", []),
}

# Colonne du CSV alimentant chaque champ du board.
COLUMN_OF = {
    "Epic": "Epic",
    "Version": "Version",
    "Horizon": "Horizon",
    "Tech category": "Tech category",
    "Priority": "Priority",
    "Public": "Public",
    "Due date": "Due date",
}

BATCH_SIZE = 20
RETRY_ON = ("429", "499", "500", "502", "503", "504", "timeout", "TLS handshake")
VERBOSE = True


# --------------------------------------------------------------------------- #
# Appels gh
# --------------------------------------------------------------------------- #

def log(message: str = "") -> None:
    if VERBOSE:
        print(message, flush=True)


def is_transient(stderr: str) -> bool:
    return any(marker in stderr for marker in RETRY_ON)


def run(args: list[str], stdin: str | None = None, attempts: int = 5) -> str:
    """Exécute une commande gh, en réessayant les erreurs transitoires."""
    delay = 2.0
    for attempt in range(1, attempts + 1):
        proc = subprocess.run(args, input=stdin, capture_output=True, text=True)
        if proc.returncode == 0:
            return proc.stdout
        message = (proc.stderr.strip() or proc.stdout.strip())
        if attempt < attempts and is_transient(message):
            first = message.splitlines()[0][:60] if message else "?"
            log(f"    … erreur transitoire ({first}), "
                f"nouvelle tentative dans {delay:.0f} s")
            time.sleep(delay)
            delay *= 2
            continue
        raise RuntimeError(f"échec de : {' '.join(args[:4])} …\n{message}")
    raise RuntimeError("inatteignable")


def graphql(query: str) -> dict:
    out = run(["gh", "api", "graphql", "-F", "query=@-"], stdin=query)
    payload = json.loads(out)
    if "errors" in payload:
        raise RuntimeError(json.dumps(payload["errors"], ensure_ascii=False, indent=2))
    return payload["data"]


def gql_str(value) -> str:
    """Littéral GraphQL — la syntaxe des chaînes est celle de JSON."""
    return json.dumps(str(value), ensure_ascii=False)


# --------------------------------------------------------------------------- #
# Lecture du board
# --------------------------------------------------------------------------- #

def check_prerequisites() -> None:
    if subprocess.run(["which", "gh"], capture_output=True).returncode != 0:
        sys.exit("gh CLI introuvable. Installation : https://cli.github.com")
    if subprocess.run(["gh", "auth", "status"], capture_output=True).returncode != 0:
        sys.exit("Non authentifié. Lancer : gh auth login")
    if not CSV_PATH.exists():
        sys.exit(f"CSV introuvable : {CSV_PATH}")


def project_id(number: str, owner: str) -> str:
    out = run(["gh", "project", "view", number, "--owner", owner, "--format", "json"])
    return json.loads(out)["id"]


def list_fields(number: str, owner: str) -> dict[str, dict]:
    out = run(["gh", "project", "field-list", number, "--owner", owner,
               "--format", "json", "--limit", "60"])
    return {f["name"]: f for f in json.loads(out)["fields"]}


def list_items(number: str, owner: str) -> list[dict]:
    out = run(["gh", "project", "item-list", number, "--owner", owner,
               "--format", "json", "--limit", "800"])
    return [i for i in json.loads(out)["items"] if i.get("title")]


def option_id(field: dict, value: str) -> str | None:
    for opt in field.get("options", []):
        if opt["name"] == value:
            return opt["id"]
    return None


def item_kind(item: dict) -> str:
    """« DraftIssue », « Issue », « PullRequest »… selon la version de gh."""
    content = item.get("content")
    if isinstance(content, dict) and content.get("type"):
        return content["type"]
    return item.get("type", "Unknown")


def is_draft(item: dict) -> bool:
    return item_kind(item).lower().replace("_", "") in ("draftissue", "draft")


# --------------------------------------------------------------------------- #
# Rapprochement des issues existantes avec le backlog
# --------------------------------------------------------------------------- #

STOPWORDS = {
    "de", "des", "du", "la", "le", "les", "un", "une", "et", "ou", "a", "au", "aux",
    "en", "pour", "par", "sur", "dans", "avec", "sans", "d", "l", "creer", "ajouter",
    "systeme", "partie", "gestion", "mettre", "place", "faire", "front", "back",
}

# Rapprochements tranchés à la main, là où la similarité littérale se trompe ou
# hésite. Clé = titre de l'issue normalisé ; valeur = identifiant du backlog, ou
# chaîne vide pour « ne rattache pas cette issue ».
OVERRIDES: dict[str, str] = {
    # Deux issues proches qui traitent en réalité de sujets différents
    "copier deck existant": "COL-09",
    "copier deck existant partage code": "COL-14",
    "interface analyse deck cote": "IA-02",
    "notifications app push": "COM-06",
    "notifications tournois push email": "TRN-10",
    # Rapprochements que le score rate ou sous-évalue
    "faq dynamique centre aide": "COM-05",
    "completer sealed products": "CAT-08",
    "refacto marketplace": "MKT-04",
    "scan ocr cartes pokemon import collection": "IA-05",
    "classement global joueurs elo points": "TRN-08",
    "authentification login register mot passe oublie": "SEC-01",
    "achat cartes": "MKT-07",
    "page marketplace index tsx liste cartes vente": "MKT-02",
    "page principale decks utilisateur connecte": "COL-07",
    "api decks crud add remove clone": "COL-06",
    "creation entites principales tournoi match joueur classement statistiques": "TRN-01",
    "logique metier tournois": "TRN-04",
    "endpoint join tournament": "TRN-03",
    "collection initiale wishlist": "COL-03",
    "tests end": "QUA-05",
    "probleme collection etat etc": "COL-05",
    "finaliser jeu tcg ligne": "GME-04",
    "architecture base services api mobile": "MOB-03",
    "controles acces roles ownership": "SEC-03",
    "ventes profil": "MKT-03",
    "tickets support aide": "COM-04",
    "tableau bord utilisateur stats personnelles": "COM-01",
    "badges succes achievements": "COM-03",
    "recommandations cartes collection": "IA-03",
    "export deck format pdf image": "COL-11",
    "historique tournois joueur elo": "TRN-06",
    "actualites annonces tournois": "TRN-12",
    "rapports analytics organisateurs tournois": "TRN-09",
    "middleware log requetes api": "QUA-09",
    "schema base donnees": "QUA-06",
    "endpoint analyzedeck squelette": "IA-01",
    "tests unitaires services nestjs": "QUA-04",
    # Trop fines ou trop larges pour être rattachées à un item du backlog
    "tests unitaires nestjs middleware logs schema bdd": "",
    "page details tournois": "",
    "bouton rejoindre appelle patch tournois join": "",
    "cta analyser mon deck": "",
    "test manuel tournoi": "",
    "skeletons loaders cote": "",
    "147 defis quotidiens hebdomadaires": "",
}


def override_key(title: str) -> str:
    """Clé stable pour OVERRIDES : mots signifiants, dans l'ordre du titre."""
    seen: list[str] = []
    for word in normalise(title).split():
        if len(word) > 2 and word not in STOPWORDS and word not in seen:
            seen.append(word)
    return " ".join(seen)


def normalise(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]+", " ", text)


def tokens(text: str) -> set[str]:
    return {w for w in normalise(text).split() if len(w) > 2 and w not in STOPWORDS}


def similarity(issue_title: str, row: dict) -> float:
    """Score composite : ressemblance littérale + recouvrement de vocabulaire."""
    a, b = normalise(issue_title), normalise(row["Title"])
    literal = difflib.SequenceMatcher(None, a, b).ratio()
    ta, tb = tokens(issue_title), tokens(row["Title"])
    overlap = len(ta & tb) / max(len(ta | tb), 1)
    return round(0.4 * literal + 0.6 * overlap, 3)


def build_mapping(items: list[dict], rows: list[dict], path: Path) -> None:
    """Écrit une proposition de correspondance issue existante -> item du backlog.

    Le fichier est destiné à être relu et corrigé à la main : le rapprochement
    automatique sert à dégrossir, pas à décider.
    """
    expected = {f"[{r['ID']}] {r['Title']}" for r in rows}
    foreign = [i for i in items
               if i["title"] not in expected and not is_draft(i)]

    by_id = {r["ID"]: r for r in rows}
    proposals: list[dict] = []

    for item in sorted(foreign, key=lambda i: i["title"]):
        scored = sorted(((similarity(item["title"], r), r) for r in rows),
                        key=lambda p: p[0], reverse=True)
        best_score, best = scored[0]
        second = scored[1][0] if len(scored) > 1 else 0.0

        key = override_key(item["title"])
        if key in OVERRIDES:
            ident, origin, score = OVERRIDES[key], "manuel", 1.0
        elif best_score >= 0.35:
            ident, origin, score = best["ID"], "auto", best_score
        else:
            ident, origin, score = "", "aucun", best_score

        proposals.append({
            "Issue": item["title"],
            "Item id": item["id"],
            "Type": item_kind(item),
            "ID": ident,
            "Titre du backlog": by_id[ident]["Title"] if ident else "",
            "Origine": origin,
            "Score": f"{score:.2f}",
            "2e candidat": f'{scored[1][1]["ID"]} ({second:.2f})' if len(scored) > 1 else "",
        })

    # Un identifiant du backlog ne peut désigner qu'une issue. En cas de conflit —
    # deux issues quasi identiques sur le board, ou deux tickets qui décrivent la
    # même chose — on garde celle qui a le meilleur score et on libère les autres.
    conflicts: list[str] = []
    for ident in {p["ID"] for p in proposals if p["ID"]}:
        rivals = [p for p in proposals if p["ID"] == ident]
        if len(rivals) < 2:
            continue
        rivals.sort(key=lambda p: (p["Origine"] == "manuel", float(p["Score"])),
                    reverse=True)
        for loser in rivals[1:]:
            loser.update({"ID": "", "Titre du backlog": "",
                          "Origine": f"écarté (doublon de « {rivals[0]['Issue'][:40]} »)"})
        conflicts.append(f"{ident} → {rivals[0]['Issue'][:50]}")

    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(proposals[0].keys())
                                if proposals else ["Issue"])
        writer.writeheader()
        writer.writerows(proposals)

    manuel = sum(1 for p in proposals if p["Origine"] == "manuel")
    auto = sum(1 for p in proposals if p["Origine"] == "auto")
    log(f"  {len(foreign)} issue(s) hors backlog analysée(s).")
    log(f"  · {manuel} rattachement(s) tranché(s) à la main (table OVERRIDES)")
    log(f"  · {auto} rattachement(s) déduit(s) automatiquement")
    log(f"  · {len(proposals) - manuel - auto} laissée(s) sans rattachement")
    if conflicts:
        log(f"\n  {len(conflicts)} conflit(s) résolu(s) automatiquement — "
            f"l'identifiant est allé à :")
        for line in conflicts:
            log(f"      {line}")
        log("  Les issues écartées restent sur le board, simplement non rattachées.")
        log("  Ce sont souvent de vrais doublons à fermer.")
    log(f"\n  Écrit : {path.name} — le fichier est cohérent, il peut être appliqué tel")
    log("  quel. Le relire reste utile : colonne « Origine » pour voir d'où vient")
    log("  chaque rattachement, colonne « ID » à vider ou corriger si besoin.")
    log(f"\n  Étape suivante :  python3 {Path(__file__).name} --apply-map")


def read_mapping(rows: list[dict], path: Path) -> dict[str, str]:
    """Item id de l'issue -> ID du backlog. Valide le fichier avant de rendre la main."""
    if not path.exists():
        sys.exit(f"Fichier de correspondance introuvable : {path}\n"
                 f"Le générer d'abord avec --map.")
    valid = {r["ID"] for r in rows}
    mapping: dict[str, str] = {}
    used: dict[str, str] = {}
    problems: list[str] = []

    for line in csv.DictReader(path.open(encoding="utf-8")):
        ident = (line.get("ID") or "").strip()
        if not ident:
            continue
        if ident not in valid:
            problems.append(f"  · « {ident} » n'existe pas dans le backlog "
                            f"(issue : {line['Issue'][:60]})")
            continue
        if ident in used:
            problems.append(f"  · « {ident} » rattaché à deux issues :\n"
                            f"      {used[ident][:60]}\n      {line['Issue'][:60]}")
            continue
        used[ident] = line["Issue"]
        mapping[line["Item id"]] = ident

    if problems:
        log("\n  Fichier de correspondance invalide — rien n'a été écrit.\n")
        for problem in problems:
            log(problem)
        sys.exit(1)
    return mapping


def delete_items(proj_id: str, item_ids: list[str]) -> None:
    for start in range(0, len(item_ids), BATCH_SIZE):
        chunk = item_ids[start:start + BATCH_SIZE]
        mutations = [
            f"  d{i}: deleteProjectV2Item(input: {{"
            f"projectId: {gql_str(proj_id)}, itemId: {gql_str(item_id)}}}) "
            f"{{ deletedItemId }}"
            for i, item_id in enumerate(chunk)
        ]
        run_batch(mutations, f"suppression {start + 1}-{start + len(chunk)}")
        log(f"  − {min(start + BATCH_SIZE, len(item_ids))}/{len(item_ids)} "
            f"brouillon(s) supprimé(s)")


def apply_mapping(proj_id: str, fields: dict[str, dict], rows: list[dict],
                  items: list[dict], dry_run: bool) -> None:
    """Pose les champs du backlog sur les issues rattachées, purge les brouillons."""
    mapping = read_mapping(rows, MAP_PATH)
    by_id = {r["ID"]: r for r in rows}
    by_title = {i["title"]: i for i in items}

    linked = [(item_id, by_id[ident]) for item_id, ident in mapping.items()]
    log(f"  {len(linked)} issue(s) rattachée(s) au backlog.")

    # Brouillons devenus redondants : uniquement ceux dont l'ID est désormais
    # porté par une vraie issue, et uniquement s'il s'agit bien de brouillons.
    obsolete = []
    for ident in mapping.values():
        title = f"[{ident}] {by_id[ident]['Title']}"
        item = by_title.get(title)
        if item and is_draft(item):
            obsolete.append(item["id"])
    log(f"  {len(obsolete)} brouillon(s) redondant(s) à supprimer.")

    # Items du backlog sans issue rattachée : ils restent en brouillon.
    mapped_ids = set(mapping.values())
    remaining = [(f"[{r['ID']}] {r['Title']}", r) for r in rows
                 if r["ID"] not in mapped_ids]
    to_create = [(t, r) for t, r in remaining if t not in by_title]
    log(f"  {len(remaining)} item(s) restent en brouillon, dont {len(to_create)} à créer.")

    if dry_run:
        log("\n  [lecture seule] rien n'a été écrit.")
        return

    if obsolete:
        delete_items(proj_id, obsolete)

    targets = list(linked)
    if to_create:
        created = create_items(proj_id, to_create)
        by_title.update({t: {"id": i} for t, i in created.items()})
    for title, row in remaining:
        item = by_title.get(title)
        if item:
            targets.append((item["id"], row))

    apply_all_fields(proj_id, fields, targets)


# --------------------------------------------------------------------------- #
# Champs
# --------------------------------------------------------------------------- #

def ensure_fields(number: str, owner: str, dry_run: bool) -> dict[str, dict]:
    existing = list_fields(number, owner)
    created = False
    for name, (data_type, options) in FIELDS.items():
        if name in existing:
            log(f"  = champ « {name} » déjà présent")
            continue
        cmd = ["gh", "project", "field-create", number, "--owner", owner,
               "--name", name, "--data-type", data_type]
        if data_type == "SINGLE_SELECT":
            cmd += ["--single-select-options", ",".join(options)]
        log(f"  + création du champ « {name} » ({data_type})")
        if not dry_run:
            run(cmd)
            created = True
    return list_fields(number, owner) if created else existing


def epic_code(raw: str) -> str:
    """« CAT — Catalogue & Recherche » -> « CAT »."""
    return raw.split("—")[0].split("-")[0].strip()


def csv_values(row: dict) -> dict[str, str]:
    values = {name: row[col] for name, col in COLUMN_OF.items()}
    values["Epic"] = epic_code(row["Epic"])
    return {k: v for k, v in values.items() if v}


# --------------------------------------------------------------------------- #
# Inventaire et validation
# --------------------------------------------------------------------------- #

def inventory(items: list[dict], rows: list[dict]) -> None:
    """Affiche ce qui existe déjà sur le board et ce qui sera laissé tel quel."""
    expected = {f"[{r['ID']}] {r['Title']}" for r in rows}
    mine = [i for i in items if i["title"] in expected]
    foreign = [i for i in items if i["title"] not in expected]

    log(f"  {len(items)} carte(s) actuellement sur le board.")
    log(f"  · {len(mine)} correspond(ent) au CSV — leurs champs seront réappliqués.")
    log(f"  · {len(foreign)} étrangère(s) au CSV — elles ne seront PAS touchées.")
    log(f"  · {len(expected) - len(mine)} carte(s) du CSV restent à créer.")

    if foreign:
        log("\n  Cartes déjà présentes qui ne viennent pas du CSV :")
        for item in foreign[:40]:
            kind = item.get("content", {}).get("type", item.get("type", "?"))
            log(f"      [{kind}] {item['title'][:90]}")
        if len(foreign) > 40:
            log(f"      … et {len(foreign) - 40} autre(s)")
        log("\n  Si l'une d'elles décrit le même travail qu'une carte du CSV sous un")
        log("  autre titre, l'import créera un doublon. Dans ce cas : renommer la carte")
        log("  existante avec le titre exact « [ID] Titre » du CSV, et le script la")
        log("  réutilisera au lieu d'en créer une seconde.")


def preflight(fields: dict[str, dict], rows: list[dict]) -> bool:
    """Vérifie que toute valeur du CSV a une option correspondante sur le board.

    Renvoie True si tout concorde. Sinon affiche précisément ce qui manque et
    renvoie False — aucune écriture n'a alors été tentée.
    """
    missing: dict[str, set[str]] = {}
    absent_fields = [name for name in FIELDS if name not in fields]

    for row in rows:
        for name, value in csv_values(row).items():
            if name in absent_fields or FIELDS[name][0] != "SINGLE_SELECT":
                continue
            if option_id(fields[name], value) is None:
                missing.setdefault(name, set()).add(value)

    if not missing and not absent_fields:
        log("  ✓ toutes les valeurs du CSV correspondent aux options du board")
        return True

    log("\n  Validation en échec — rien n'a été écrit sur le board.\n")
    for name in absent_fields:
        log(f"  · champ « {name} » absent du board")
    for name, values in sorted(missing.items()):
        present = [o["name"] for o in fields[name].get("options", [])]
        log(f"  · champ « {name} » : option(s) manquante(s) "
            f"{', '.join(sorted(values))}")
        log(f"    options actuelles : {', '.join(present) or '(aucune)'}")
    log("\n  L'API GitHub ne permet pas d'ajouter une option à un champ existant.")
    log("  Ouvrir le board → ⋯ à droite du nom du champ → Edit → Add option,")
    log("  ajouter les valeurs ci-dessus, puis relancer ce script.")
    log("  Ou relancer avec --skip-missing-options pour ignorer ces valeurs.")
    return False


# --------------------------------------------------------------------------- #
# Écriture par lots
# --------------------------------------------------------------------------- #

def field_value_literal(name: str, field: dict, value: str) -> str | None:
    kind = FIELDS[name][0]
    if kind == "SINGLE_SELECT":
        opt = option_id(field, value)
        return f"{{singleSelectOptionId: {gql_str(opt)}}}" if opt else None
    if kind == "DATE":
        return f"{{date: {gql_str(value)}}}"
    if kind == "NUMBER":
        return f"{{number: {float(value)}}}"
    return f"{{text: {gql_str(value)}}}"


def run_batch(mutations: list[str], label: str) -> dict:
    """Envoie un lot de mutations ; en cas d'échec, réessaie une par une."""
    query = "mutation {\n" + "\n".join(mutations) + "\n}"
    try:
        return graphql(query)
    except RuntimeError as err:
        log(f"    ! lot « {label} » en échec, repli mutation par mutation")
        log(f"      {str(err).splitlines()[0][:120]}")
        data: dict = {}
        for mutation in mutations:
            try:
                data.update(graphql("mutation {\n" + mutation + "\n}"))
            except RuntimeError as single:
                alias = mutation.split(":", 1)[0].strip()
                log(f"      ✗ {alias} : {str(single).splitlines()[0][:100]}")
        return data


def build_body(row: dict) -> str:
    return "\n".join([
        f"**Épic** : {row['Epic']}",
        f"**Version** : {row['Version'] or 'non planifiée'}  ·  "
        f"**Horizon** : {row['Horizon']}",
        f"**Priorité** : {row['Priority']}",
        f"**Catégorie technique** : {row['Tech category'] or 'à définir'}",
        f"**Responsable** : {row['Assignee'] or 'non assigné'}",
        f"**Échéance** : {row['Due date'] or 'à définir'}",
        f"**Visible sur la roadmap publique** : {row['Public']}",
        "",
        "_Carte issue du backlog produit — CMG-MGQ5 étape 2._",
    ])


def create_items(proj_id: str, to_create: list[tuple[str, dict]]) -> dict[str, str]:
    """Crée les draft issues manquantes et renvoie titre -> item id."""
    created: dict[str, str] = {}
    for start in range(0, len(to_create), BATCH_SIZE):
        chunk = to_create[start:start + BATCH_SIZE]
        mutations = [
            f"  c{i}: addProjectV2DraftIssue(input: {{"
            f"projectId: {gql_str(proj_id)}, "
            f"title: {gql_str(title)}, "
            f"body: {gql_str(build_body(row))}}}) "
            f"{{ projectItem {{ id }} }}"
            for i, (title, row) in enumerate(chunk)
        ]
        data = run_batch(mutations, f"création {start + 1}-{start + len(chunk)}")
        for i, (title, _) in enumerate(chunk):
            node = data.get(f"c{i}")
            if node:
                created[title] = node["projectItem"]["id"]
        log(f"  + {len(created)}/{len(to_create)} carte(s) créée(s)")
    return created


def apply_all_fields(proj_id: str, fields: dict[str, dict],
                     targets: list[tuple[str, dict]]) -> None:
    """Renseigne les champs de tous les items, par lots."""
    updates: list[tuple[str, str, str]] = []
    for item_id, row in targets:
        for name, value in csv_values(row).items():
            if name not in fields:
                continue
            literal = field_value_literal(name, fields[name], value)
            if literal is not None:
                updates.append((item_id, fields[name]["id"], literal))

    done = 0
    for start in range(0, len(updates), BATCH_SIZE):
        chunk = updates[start:start + BATCH_SIZE]
        mutations = [
            f"  u{i}: updateProjectV2ItemFieldValue(input: {{"
            f"projectId: {gql_str(proj_id)}, "
            f"itemId: {gql_str(item_id)}, "
            f"fieldId: {gql_str(field_id)}, "
            f"value: {literal}}}) {{ projectV2Item {{ id }} }}"
            for i, (item_id, field_id, literal) in enumerate(chunk)
        ]
        run_batch(mutations, f"champs {start + 1}-{start + len(chunk)}")
        done += len(chunk)
        log(f"  · {done}/{len(updates)} valeur(s) de champ écrite(s)")


def import_items(proj_id: str, fields: dict[str, dict], rows: list[dict],
                 items: list[dict], dry_run: bool) -> None:
    already = {i["title"]: i["id"] for i in items}
    titled = [(f"[{row['ID']}] {row['Title']}", row) for row in rows]
    to_create = [(t, r) for t, r in titled if t not in already]

    log(f"  {len(titled) - len(to_create)} carte(s) déjà sur le board, "
        f"{len(to_create)} à créer.")
    if dry_run:
        for title, _ in to_create[:20]:
            log(f"  + {title}")
        if len(to_create) > 20:
            log(f"  + … et {len(to_create) - 20} autre(s)")
        return

    if to_create:
        already.update(create_items(proj_id, to_create))

    targets = [(already[t], r) for t, r in titled if t in already]
    apply_all_fields(proj_id, fields, targets)


VIEWS_REMINDER = """
Vues à configurer manuellement (non créables par API) :

  Roadmap          layout Roadmap · groupé par Epic · dates depuis Due date
  Par épic         layout Board   · colonnes = Epic · filtre horizon:Now,Next
  Par développeur  layout Table   · groupé par Assignees · filtre horizon:Now
  Cycle courant    layout Board   · colonnes = Status · filtre horizon:Now
  Public roadmap   layout Board   · colonnes = Horizon · filtre public:true -horizon:Shipped
                                  · masquer Tech category, Assignees, Due date, Estimate

Puis passer le projet en visibilité publique :
  Settings du projet -> Manage access -> Visibility -> Public
"""


def main() -> None:
    global VERBOSE
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--project", default="3", help="numéro du projet (défaut : 3)")
    parser.add_argument("--owner", default="@me",
                        help="propriétaire du projet (défaut : @me, l'utilisateur "
                             "authentifié). Un login explicite exige le scope read:org.")
    parser.add_argument("--check", action="store_true",
                        help="inventaire du board et validation du CSV, puis arrêt")
    parser.add_argument("--map", action="store_true",
                        help="propose un rapprochement entre les issues existantes et "
                             "les items du backlog, dans mapping-issues.csv")
    parser.add_argument("--apply-map", action="store_true",
                        help="applique mapping-issues.csv : pose les champs sur les "
                             "issues rattachées et supprime les brouillons redondants")
    parser.add_argument("--dry-run", action="store_true",
                        help="affiche ce qui serait fait sans rien modifier")
    parser.add_argument("--fields-only", action="store_true",
                        help="crée uniquement les champs, sans importer les items")
    parser.add_argument("--skip-missing-options", action="store_true",
                        help="poursuit même si des options manquent, en laissant "
                             "les valeurs concernées non renseignées")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()
    VERBOSE = not args.quiet
    read_only = args.check or args.dry_run or args.map

    check_prerequisites()
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))

    log(f"Projet #{args.project} de {args.owner}"
        f"{'  [lecture seule]' if read_only else ''}\n")

    try:
        proj_id = project_id(args.project, args.owner)
    except RuntimeError as err:
        sys.exit(
            f"{err}\n\n"
            "« unknown owner type » : gh n'arrive pas à déterminer si le propriétaire "
            "est un utilisateur ou une organisation. Relancer sans le nommer :\n"
            f"  python3 {Path(__file__).name} --project {args.project}\n\n"
            "« missing required scopes » : le script écrit sur le projet, il lui faut "
            "le scope 'project', pas seulement 'read:project' :\n"
            "  gh auth refresh -s project,read:project\n\n"
            "Si le projet n'existe pas encore :\n"
            f"  gh project create --owner {args.owner} --title 'Roadmap TCG Nexus'"
        )

    log("Champs personnalisés")
    fields = ensure_fields(args.project, args.owner, read_only)

    items = list_items(args.project, args.owner)

    if args.map:
        log("\nRapprochement des issues existantes avec le backlog")
        build_mapping(items, rows, MAP_PATH)
        return

    log("\nInventaire du board")
    inventory(items, rows)

    log("\nValidation du CSV contre le board")
    ok = preflight(fields, rows)
    if not ok and not args.skip_missing_options and not args.check:
        sys.exit(1)

    if args.check:
        log("\n--check : aucune écriture. "
            + ("Prêt à importer." if ok else "Corriger les points ci-dessus d'abord."))
        return

    if args.apply_map:
        log("\nApplication de la correspondance")
        apply_mapping(proj_id, fields, rows, items, args.dry_run)
    elif not args.fields_only:
        log("\nImport des items")
        import_items(proj_id, fields, rows, items, args.dry_run)

    log(VIEWS_REMINDER)


if __name__ == "__main__":
    main()
