#!/usr/bin/env python3
"""Génère le diagramme de Gantt de la partie 4.2 d'etape2.pdf, en LaTeX.

Un chantier est un regroupement d'items du backlog partageant une épic et une
tranche de versions. Sa position dans le temps est déduite des versions, ce qui
garantit que le diagramme reste cohérent avec roadmap-tcg-nexus.csv.
"""

from pathlib import Path

# Trimestres couverts par chaque version.
SPAN = {
    "V0.1": ("2025T1", "2025T2"),
    "V0.2": ("2025T3", "2025T4"),
    "V0.3": ("2025T4", "2026T1"),
    "V0.4": ("2026T1", "2026T2"),
    "V0.5": ("2026T2", "2026T2"),
    "V0.6": ("2026T3", "2026T3"),
    "V1.0": ("2026T4", "2026T4"),
    "V1.1": ("2027T1", "2027T1"),
    "V2.0": ("2027T2", "2027T3"),
    "V2.5": ("2027T4", "2027T4"),
}

ETAT = {
    "V0.1": "fait", "V0.2": "fait", "V0.3": "fait", "V0.4": "fait", "V0.5": "fait",
    "V0.6": "cours", "V1.0": "prevu", "V1.1": "prevu",
    "V2.0": "envisage", "V2.5": "envisage",
}

COULEUR = {"fait": "vert", "cours": "orange", "prevu": "bleu", "envisage": "gris"}

QUARTERS = [f"{a}T{t}" for a in (2025, 2026, 2027) for t in (1, 2, 3, 4)]

# (épic, [(libellé du chantier, version de début, version de fin)])
CHANTIERS = [
    ("CAT. Catalogue et recherche", [
        ("Socle catalogue, synchronisation TCGdex, recherche par nom", "V0.1", "V0.1"),
        ("Recherche globale et filtres avancés", "V0.2", "V0.3"),
        ("Traductions et produits scellés", "V0.4", "V0.4"),
        ("Master Set, CDN R2, recherche visuelle CLIP", "V0.5", "V0.5"),
        ("Cache et indexation CLIP sous charge", "V0.6", "V0.6"),
        ("Cotation multi-sources et alertes de prix", "V1.1", "V1.1"),
        ("Abstraction multi-TCG, Yu-Gi-Oh!, Magic", "V2.0", "V2.0"),
    ]),
    ("COL. Collection et decks", [
        ("Collection, wishlist, entités Deck", "V0.2", "V0.2"),
        ("Pages decks, favoris, états de cartes", "V0.3", "V0.3"),
        ("Duplication de deck et valorisation", "V0.4", "V0.4"),
        ("Formulaire de deck interactif", "V0.5", "V0.5"),
        ("Export PDF et CSV, comparateur de decks", "V0.6", "V0.6"),
        ("Import de decklist, partage public", "V1.0", "V1.0"),
        ("Complétion par extension", "V1.1", "V1.1"),
    ]),
    ("MKT. Marketplace et paiement", [
        ("Listings, catalogue, espace vendeur", "V0.2", "V0.2"),
        ("Refonte complète, historique de prix, analytics", "V0.3", "V0.3"),
        ("Stripe, panier, commandes, produits scellés", "V0.4", "V0.4"),
        ("Reversement aux vendeurs (Stripe Connect)", "V1.0", "V1.0"),
        ("Avis vendeurs, litiges, vérification d'identité", "V1.1", "V1.1"),
        ("Commission de service", "V2.5", "V2.5"),
    ]),
    ("TRN. Tournois et compétition", [
        ("Création de tournoi, inscription, listing", "V0.2", "V0.2"),
        ("Moteur de brackets, matchs, seeding, ELO", "V0.4", "V0.4"),
        ("Leaderboard, analytics organisateurs, notifications", "V0.5", "V0.5"),
        ("Litiges et arbitrage des scores", "V0.6", "V0.6"),
        ("Tournoi en ligne de bout en bout, actualités", "V1.0", "V1.0"),
        ("Formats étendus (suisse, double élimination)", "V1.1", "V1.1"),
    ]),
    ("GME. Jeu en ligne et mini-jeux", [
        ("Moteur de règles, matchs contre IA et entre joueurs", "V0.4", "V0.4"),
        ("Timers, abandon automatique, mini-jeux", "V0.5", "V0.5"),
        ("Leaderboard des mini-jeux et gains d'expérience", "V0.6", "V0.6"),
        ("Matchmaking par niveau ELO", "V1.1", "V1.1"),
    ]),
    ("IA. Intelligence artificielle et scan", [
        ("Analyse de deck et recommandations", "V0.4", "V0.5"),
        ("Pipeline de vision, OCR, CLIP, capture en rafale", "V0.5", "V0.5"),
        ("Alternatives de cartes à effet équivalent", "V1.1", "V1.1"),
    ]),
    ("COM. Communauté et social", [
        ("Tableau de bord, défis, support, FAQ", "V0.4", "V0.4"),
        ("Badges, notifications, follow, profil public", "V0.5", "V0.5"),
        ("Flux communautaire, boutique de points, préférences", "V0.6", "V0.6"),
        ("Commentaires et réactions", "V1.0", "V1.0"),
        ("Modération et signalement de contenu", "V1.1", "V1.1"),
    ]),
    ("MOB. Application mobile", [
        ("Initialisation Expo, écrans de base, services API", "V0.4", "V0.4"),
        ("Authentification, collection, Pokédex, scan, tournois", "V0.5", "V0.5"),
        ("Profil public, scan en rafale, SSO mobile", "V0.6", "V0.6"),
        ("Notifications push natives", "V1.0", "V1.0"),
        ("Publication sur l'App Store et Google Play", "V1.1", "V1.1"),
    ]),
    ("SEC. Compte et sécurité", [
        ("Authentification JWT, rôles, contrôles d'ownership", "V0.2", "V0.2"),
        ("Rotation des refresh tokens", "V0.3", "V0.3"),
        ("Réinitialisation de mot de passe", "V0.4", "V0.4"),
        ("Préférences de thème et de devise", "V0.5", "V0.5"),
        ("SSO Google et Discord", "V0.6", "V0.6"),
        ("Vérification d'e-mail, rate limiting, RGPD", "V1.0", "V1.0"),
        ("Double authentification", "V1.1", "V1.1"),
    ]),
    ("QUA. Qualité, infrastructure et data", [
        ("Pipeline d'intégration continue", "V0.4", "V0.4"),
        ("Déploiement continu, tests unitaires, documentation, ADR", "V0.5", "V0.5"),
        ("Journalisation et audit des requêtes API", "V0.6", "V0.6"),
        ("Migrations, staging, rollback, monitoring, cache, charge", "V1.0", "V1.0"),
    ]),
]

PREAMBLE = r"""
\definecolor{vert}{HTML}{A8D5A2}
\definecolor{orange}{HTML}{F5C86B}
\definecolor{bleu}{HTML}{9DBEDC}
\definecolor{gris}{HTML}{CFCFCF}
\definecolor{entete}{HTML}{1F3864}
\definecolor{bandeau}{HTML}{E8EDF5}
"""


def escape(text: str) -> str:
    return text.replace("&", r"\&").replace("%", r"\%").replace("_", r"\_")


def build() -> str:
    n = len(QUARTERS)
    lines = [r"\begingroup",
             r"\setlength{\tabcolsep}{1pt}",
             r"\renewcommand{\arraystretch}{0.9}",
             r"\scriptsize",
             r"\begin{tabular}{p{83mm}" + "p{5.4mm}" * n + "}"]

    # Bandeau des années
    annees = [r"", r"\multicolumn{4}{c}{\textbf{2025}}",
              r"\multicolumn{4}{c}{\textbf{2026}}",
              r"\multicolumn{4}{c}{\textbf{2027}}"]
    lines.append(" & ".join(annees) + r" \\")
    entetes = [r"\textbf{Chantier}"] + [
        r"\scriptsize T" + q[-1] for q in QUARTERS]
    lines.append(" & ".join(entetes) + r" \\[1pt] \hline \\[-6pt]")

    for epic, chantiers in CHANTIERS:
        lines.append(r"\rowcolor{bandeau}\multicolumn{%d}{l}{\textbf{%s}} \\[1pt]"
                     % (n + 1, escape(epic)))
        for libelle, debut, fin in chantiers:
            i, j = QUARTERS.index(SPAN[debut][0]), QUARTERS.index(SPAN[fin][1])
            couleur = COULEUR[ETAT[debut]]
            cells = [r"\cellcolor{%s}" % couleur if i <= k <= j else ""
                     for k in range(n)]
            lines.append(escape(libelle) + " & " + " & ".join(cells) + r" \\")

    lines.append(LEGENDE_ROW % (n + 1))
    lines += [r"\end{tabular}", r"\endgroup"]
    return "\n".join(lines)


LEGENDE_ROW = (
    r"\\[2pt] \hline \\[-4pt]"
    r"\multicolumn{%d}{l}{\scriptsize "
    r"\cellcolor{vert}\hspace{4mm}~réalisé \quad "
    r"\cellcolor{orange}\hspace{4mm}~en cours \quad "
    r"\cellcolor{bleu}\hspace{4mm}~planifié et daté \quad "
    r"\cellcolor{gris}\hspace{4mm}~envisagé, hors engagement} \\"
)


if __name__ == "__main__":
    total = sum(len(c) for _, c in CHANTIERS)
    out = Path(__file__).with_name("gantt.tex")
    out.write_text(PREAMBLE + "\n" + build(), encoding="utf-8")
    print(f"écrit : {out.name} ({total} chantiers sur {len(CHANTIERS)} épics)")
