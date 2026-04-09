/**
 * Rule-Based Effect Parser
 *
 * Parseur déterministe pour les effets de cartes Pokémon TCG en français.
 * Ne requiert aucune API externe — détection par regex et patterns textuels.
 *
 * Couverture : 35/39 EffectTypes via patterns français.
 * Pour les cas complexes ou ambigus, retourne effects: [] (safe fallback).
 */

import type { CardInput } from "./prompt-builder.js";
import type { CardEffects } from "./schema.js";
import type { ParseResult } from "./parser.js";
import { validateCardEffects } from "./validator.js";

// ─── Types internes (on laisse Zod valider au final) ───────────

type AnyEffect = Record<string, unknown>;
type TargetType =
  | "SELF"
  | "PLAYER_ACTIVE"
  | "OPPONENT_ACTIVE"
  | "PLAYER_BENCH"
  | "OPPONENT_BENCH"
  | "ALL_PLAYER_BENCH"
  | "ALL_OPPONENT_BENCH"
  | "ALL_PLAYER_POKEMON"
  | "ALL_OPPONENT_POKEMON"
  | "ALL_POKEMON"
  | "SELECTED_OWN_POKEMON"
  | "SELECTED_OPPONENT_POKEMON"
  | "ANY";

type Duration =
  | "INSTANT"
  | "UNTIL_END_OF_TURN"
  | "UNTIL_NEXT_OPPONENT_TURN"
  | "UNTIL_YOUR_NEXT_TURN"
  | "WHILE_ACTIVE";

// ─── Utilitaires ───────────────────────────────────────────────

/** Normalise les apostrophes typographiques et espaces */
function norm(text: string): string {
  return text
    .replace(/['']/g, "'")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FR_NUMBERS: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
  "dix-sept": 17,
  "dix-huit": 18,
  "dix-neuf": 19,
  vingt: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
};

function parseNumber(s: string): number {
  const lower = s.toLowerCase().trim();
  if (lower in FR_NUMBERS) return FR_NUMBERS[lower]!;
  const n = parseInt(s, 10);
  return isNaN(n) ? 1 : n;
}

// ─── Détection des cibles ──────────────────────────────────────

function detectTarget(text: string): TargetType {
  const t = text.toLowerCase();

  // ── Tous les Pokémon (général) ──────────────────────────────
  if (/tous les pok[eé]mon en jeu/.test(t)) return "ALL_POKEMON";

  // ── Banc (plus spécifique → vérifié AVANT "tous les pokemon") ──
  if (
    /chacun des pok[eé]mon de banc advers|tous les pok[eé]mon de banc advers/.test(
      t,
    )
  )
    return "ALL_OPPONENT_BENCH";
  if (/chacun de vos pok[eé]mon de banc|tous vos pok[eé]mon de banc/.test(t))
    return "ALL_PLAYER_BENCH";
  if (/l'un des pok[eé]mon de banc advers|un pok[eé]mon de banc advers/.test(t))
    return "OPPONENT_BENCH";
  if (/l'un de vos pok[eé]mon de banc|un de vos pok[eé]mon de banc/.test(t))
    return "PLAYER_BENCH";

  // ── Tous Pokémon d'un côté (après les cas "de Banc") ────────
  if (/chacun des pok[eé]mon advers|tous les pok[eé]mon advers/.test(t))
    return "ALL_OPPONENT_POKEMON";
  if (/chacun de vos pok[eé]mon|tous vos pok[eé]mon/.test(t))
    return "ALL_PLAYER_POKEMON";

  // ── Sélectionnés ─────────────────────────────────────────────
  if (
    /l'un de vos pok[eé]mon|d'un de vos pok[eé]mon|un de vos pok[eé]mon/.test(t)
  )
    return "SELECTED_OWN_POKEMON";
  if (/l'un des pok[eé]mon advers|un des pok[eé]mon advers/.test(t))
    return "SELECTED_OPPONENT_POKEMON";

  // ── Actifs ───────────────────────────────────────────────────
  if (/pok[eé]mon actif advers|pok[eé]mon d[eé]fenseur/.test(t))
    return "OPPONENT_ACTIVE";
  if (/votre pok[eé]mon actif/.test(t)) return "PLAYER_ACTIVE";
  if (/ce pok[eé]mon|pok[eé]mon qui attaque|pok[eé]mon utilisant/.test(t))
    return "SELF";

  return "OPPONENT_ACTIVE";
}

/** Cible pour HEAL — default trainer = SELECTED_OWN_POKEMON */
function detectHealTarget(text: string): TargetType {
  const t = text.toLowerCase();
  if (/de ce pok[eé]mon|sur ce pok[eé]mon|lui-m[eê]me/.test(t)) return "SELF";
  if (/de votre pok[eé]mon actif/.test(t)) return "PLAYER_ACTIVE";
  if (/de l'un de vos pok[eé]mon|d'un de vos pok[eé]mon/.test(t))
    return "SELECTED_OWN_POKEMON";
  return "SELECTED_OWN_POKEMON";
}

/** Durée d'un effet de protection/restriction */
function detectDuration(text: string): Duration {
  const t = text.toLowerCase();
  if (
    /pendant le prochain tour de votre adversaire|jusqu'au prochain tour advers/.test(
      t,
    )
  )
    return "UNTIL_NEXT_OPPONENT_TURN";
  if (/pendant votre prochain tour/.test(t)) return "UNTIL_YOUR_NEXT_TURN";
  if (/jusqu'[aà] la fin de (ce|votre) tour/.test(t))
    return "UNTIL_END_OF_TURN";
  if (/tant que (ce pok[eé]mon est|il est) actif/.test(t))
    return "WHILE_ACTIVE";
  return "UNTIL_NEXT_OPPONENT_TURN";
}

/** Extrait un type d'énergie depuis le texte (français + anglais + symboles {X}) */
function detectEnergyType(text: string): string | undefined {
  // Symboles d'énergie entre accolades (ex: {M}, {D}, {W}...)
  const symbolMap: Record<string, string> = {
    R: "Feu",
    W: "Eau",
    G: "Plante",
    L: "Électrique",
    P: "Psy",
    F: "Combat",
    D: "Obscurité",
    M: "Métal",
    N: "Dragon",
    Y: "Fée",
    C: "Incolore",
  };
  const symMatch = /\{([A-Z])\}/i.exec(text);
  if (symMatch) {
    const normalized = (symMatch[1] ?? "").toUpperCase();
    if (symbolMap[normalized]) return symbolMap[normalized];
  }

  const textLower = text.toLowerCase();

  // Noms anglais (présents dans les fichiers de données normalisés)
  // — utilisation de word-boundary \b pour éviter les faux positifs
  //   (ex: "niveau" contient "eau", "combat" en contexte, etc.)
  const enTypes: Array<[RegExp, string]> = [
    [/\bfire\b/i, "Feu"],
    [/\bwater\b/i, "Eau"],
    [/\bgrass\b/i, "Plante"],
    [/\blightning\b/i, "Électrique"],
    [/\bpsychic\b/i, "Psy"],
    [/\bfighting\b/i, "Combat"],
    [/\bdarkness\b/i, "Obscurité"],
    [/\bmetal\b/i, "Métal"],
    [/\bfairy\b/i, "Fée"],
    [/\bcolorless\b/i, "Incolore"],
    [/\bdragon\b/i, "Dragon"],
  ];
  for (const [re, fr] of enTypes) {
    if (re.test(text)) return fr;
  }

  // Noms français — word-boundary idem
  const frTypes: Array<[RegExp, string]> = [
    [/\bfeu\b/i, "Feu"],
    [/\beau\b/i, "Eau"],
    [/\bplante\b/i, "Plante"],
    [/[eé]lectrique/i, "Électrique"],
    [/\bpsy\b/i, "Psy"],
    [/\bcombat\b/i, "Combat"],
    [/obscurit[eé]/i, "Obscurité"],
    [/m[eé]tal/i, "Métal"],
    [/f[eé]e/i, "Fée"],
    [/\bincolore\b/i, "Incolore"],
    [/\bdragon\b/i, "Dragon"],
  ];
  for (const [re, canonical] of frTypes) {
    if (re.test(text)) return canonical;
  }

  return undefined;
}

/** Extrait le filtre de recherche depuis le texte */
function extractSearchFilter(text: string): Record<string, string> | undefined {
  const t = text.toLowerCase();
  const filter: Record<string, string> = {};

  if (/[eé]nergie/.test(t)) {
    filter.cardCategory = "Énergie";
    const energyType = detectEnergyType(text);
    if (energyType) filter.energyType = energyType;
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  if (/dresseur|supporter|objet|stade|outil/.test(t)) {
    filter.cardCategory = "Dresseur";
    if (/\bsupporter\b/.test(t)) filter.trainerType = "Supporter";
    else if (/\bobjet\b/.test(t)) filter.trainerType = "Objet";
    else if (/\bstade\b/.test(t)) filter.trainerType = "Stade";
    return filter;
  }

  if (/pok[eé]mon/.test(t)) {
    filter.cardCategory = "Pokémon";
    if (/de base/.test(t)) filter.pokemonStage = "De base";
    else if (/niveau 1/.test(t)) filter.pokemonStage = "Niveau 1";
    else if (/niveau 2/.test(t)) filter.pokemonStage = "Niveau 2";
    const energyType = detectEnergyType(text);
    if (energyType) filter.pokemonType = energyType;
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  return undefined;
}

// ─── Parseurs individuels d'effets ────────────────────────────

/** APPLY_SPECIAL_CONDITION */
function trySpecialCondition(text: string): AnyEffect[] {
  const effects: AnyEffect[] = [];
  const t = norm(text);

  const conditionMap: Array<[RegExp, string]> = [
    [/est maintenant paralys[eé]/i, "Paralyzed"],
    [/est maintenant empoisonn[eé]/i, "Poisoned"],
    [/est maintenant endorm[i]/i, "Asleep"],
    [/est maintenant br[uûu]l[eé]/i, "Burned"],
    [/est maintenant confus/i, "Confused"],
    // Variants
    [/se trouve[_ ]paralys/i, "Paralyzed"],
    [/devient paralys/i, "Paralyzed"],
    [/devient empoisonn/i, "Poisoned"],
    [/devient endorm/i, "Asleep"],
    [/devient confus/i, "Confused"],
  ];

  for (const [pattern, condition] of conditionMap) {
    if (pattern.test(t)) {
      // Determine target from context
      const before = t.slice(0, t.search(pattern)).toLowerCase();
      let target: TargetType = "OPPONENT_ACTIVE";
      if (/ce pok[eé]mon|pokémon qui attaque/.test(before)) target = "SELF";

      // poisonDamage variant
      const extra: Record<string, unknown> = {};
      if (condition === "Poisoned") {
        const poisonM =
          /empoisonn[eé] et subit (\d+) d[eé]g[aâ]ts? suppl[eé]mentaires?/i.exec(
            t,
          );
        if (poisonM) extra.poisonDamage = parseInt(poisonM[1]!);
      }

      effects.push({
        type: "APPLY_SPECIAL_CONDITION",
        condition,
        target,
        ...extra,
      });
    }
  }

  return effects;
}

/** REMOVE_SPECIAL_CONDITION */
function tryRemoveSpecialCondition(text: string): AnyEffect[] {
  const t = norm(text).toLowerCase();
  if (
    /retirez? toutes? les? conditions? sp[eé]ciales?|gu[eé]rit toutes? les? alt[eé]rations? de statut|n'est plus soumis/i.test(
      t,
    )
  ) {
    const target = detectTarget(text);
    return [{ type: "REMOVE_SPECIAL_CONDITION", target }];
  }
  return [];
}

/** HEAL */
function tryHeal(text: string): AnyEffect[] {
  const t = norm(text);
  // "Soignez X dégâts de/sur..." or "Retirez X marqueurs de dégâts de..."
  const healPatterns = [
    /soignez? (\d+) d[eé]g[aâ]ts?/i,
    /retirez? (\d+) marqueurs? de d[eé]g[aâ]ts?/i,
    /gu[eé]rit (\d+) d[eé]g[aâ]ts?/i,
  ];

  for (const pattern of healPatterns) {
    const m = pattern.exec(t);
    if (m) {
      const target = detectHealTarget(t);
      const removeM =
        /retire (toutes? les? altérations? de statut|les? [eé]tats? sp[eé]ciaux?)/i.exec(
          t,
        );
      const extra: Record<string, unknown> = {};
      if (removeM) extra.removeSpecialConditions = true;
      return [{ type: "HEAL", amount: parseInt(m[1]!), target, ...extra }];
    }
  }

  // "Soignez tous les dégâts" (ALL)
  if (
    /soignez? tous les d[eé]g[aâ]ts?|retirez? tous les? marqueurs? de d[eé]g[aâ]ts?/i.test(
      t,
    )
  ) {
    const target = detectHealTarget(t);
    return [{ type: "HEAL", amount: "ALL", target }];
  }

  return [];
}

/** DAMAGE (effets secondaires — bench, self, spread) */
function tryDamage(text: string): AnyEffect[] {
  const t = norm(text);
  const effects: AnyEffect[] = [];

  // Exclure les patterns DYNAMIC_DAMAGE
  const isDynamic =
    /d[eé]g[aâ]ts? suppl[eé]mentaires? pour chaque|d[eé]g[aâ]ts? de moins pour chaque|multipli[eé]s? par/i.test(
      t,
    );
  if (isDynamic) return [];

  // Self-damage: "ce Pokémon s'inflige X dégâts"
  const selfDmgM = /ce pok[eé]mon s'inflige (\d+) d[eé]g[aâ]ts?/i.exec(t);
  if (selfDmgM) {
    effects.push({
      type: "DAMAGE",
      amount: parseInt(selfDmgM[1]!),
      target: "SELF",
    });
  }

  // Bench/spread damage: "inflige X dégâts à chacun de vos Pokémon de Banc"
  // Exclure si c'est juste "inflige X dégâts" tout seul (= dégâts de base)
  const dmgM =
    /(?:cette attaque )?inflige (\d+) d[eé]g[aâ]ts? ([aà] |sur |aux |[aà] chacun|[aà] tous)/i.exec(
      t,
    );
  if (dmgM) {
    const target = detectTarget(t);
    // On ne génère DAMAGE que si la cible est non-standard
    if (
      target !== "OPPONENT_ACTIVE" ||
      /[aà] chacun|[aà] tous|[aà] l'un|[aà] votre pok[eé]mon de banc/i.test(t)
    ) {
      effects.push({
        type: "DAMAGE",
        amount: parseInt(dmgM[1]!),
        target,
      });
    }
  }

  return effects;
}

/** PLACE_DAMAGE_COUNTERS */
function tryPlaceDamageCounters(text: string): AnyEffect[] {
  const t = norm(text);
  const m = /placez? (\d+|\w+) marqueurs? de d[eé]g[aâ]ts? sur/i.exec(t);
  if (!m) return [];

  const amount = parseNumber(m[1]!);
  const target = detectTarget(t);
  return [{ type: "PLACE_DAMAGE_COUNTERS", amount, target }];
}

/** DYNAMIC_DAMAGE */
function tryDynamicDamage(text: string): AnyEffect[] {
  const t = norm(text);
  const effects: AnyEffect[] = [];

  // Chercher tous les patterns DYNAMIC_DAMAGE dans le texte
  // Pattern +: "X dégâts supplémentaires pour chaque ..."
  const addM =
    /(\d+) d[eé]g[aâ]ts? suppl[eé]mentaires? pour chaque ([^.;]+)/i.exec(t);
  if (addM) {
    const amountPerUnit = parseInt(addM[1]!);
    const sourceText = addM[2]!.toLowerCase();
    const countSource = detectCountSource(sourceText, text);
    if (countSource) {
      const extra: Record<string, unknown> = {};
      const energyType = detectEnergyType(text);
      if (
        energyType &&
        (countSource === "ENERGY_ON_SELF_SPECIFIC" ||
          countSource === "ENERGY_ON_TARGET_SPECIFIC" ||
          countSource === "EXTRA_ENERGY_ON_SELF")
      ) {
        extra.energyType = energyType;
      }
      // Parse maxCount: "(maximum N dégâts supplémentaires)"
      const maxM = /\(maximum (\d+) d[eé]g[aâ]ts? suppl[eé]mentaires?\)/i.exec(
        t,
      );
      if (maxM) {
        extra.maxCount = Math.floor(parseInt(maxM[1]!) / amountPerUnit);
      }
      effects.push({
        type: "DYNAMIC_DAMAGE",
        amountPerUnit,
        countSource,
        target: "OPPONENT_ACTIVE",
        operator: "+",
        ...extra,
      });
    }
  }

  // Pattern -: "X dégâts de moins pour chaque ..."
  const subM = /(\d+) d[eé]g[aâ]ts? de moins pour chaque ([^.;]+)/i.exec(t);
  if (subM) {
    const amountPerUnit = parseInt(subM[1]!);
    const sourceText = subM[2]!.toLowerCase();
    const countSource = detectCountSource(sourceText, text);
    if (countSource) {
      effects.push({
        type: "DYNAMIC_DAMAGE",
        amountPerUnit,
        countSource,
        target: "OPPONENT_ACTIVE",
        operator: "-",
      });
    }
  }

  // Pattern ×: "multipliés par le nombre de / autant de fois que"
  const mulM =
    /(\d+) d[eé]g[aâ]ts? multipli[eé]s? par (le nombre de|autant de fois) ([^.;]+)/i.exec(
      t,
    );
  if (mulM) {
    const amountPerUnit = parseInt(mulM[1]!);
    const sourceText = mulM[3]!.toLowerCase();
    const countSource = detectCountSource(sourceText, text);
    if (countSource) {
      effects.push({
        type: "DYNAMIC_DAMAGE",
        amountPerUnit,
        countSource,
        target: "OPPONENT_ACTIVE",
        operator: "×",
      });
    }
  }

  return effects;
}

/** Détecte la CountSource depuis un fragment de texte */
function detectCountSource(
  sourceText: string,
  fullText: string,
): string | null {
  const t = sourceText.toLowerCase();
  const full = fullText.toLowerCase();

  // Énergie en surplus
  if (
    /en plus du co[uû]t/.test(full) ||
    /[eé]nergie.{0,40}en plus/.test(full)
  ) {
    return "EXTRA_ENERGY_ON_SELF";
  }

  // Marqueurs de dégâts
  if (/marqueur.{0,20}d[eé]g[aâ]t.{0,20}(d[eé]fenseur|cible|advers)/.test(t))
    return "DAMAGE_COUNTERS_ON_TARGET";
  if (/marqueur.{0,20}d[eé]g[aâ]t/.test(t)) return "DAMAGE_COUNTERS_ON_SELF";

  // Énergie avec type spécifique
  if (
    /[eé]nergie.{0,20}(feu|eau|plante|[eé]lectrique|psy|combat|obscurit[eé]|m[eé]tal|f[eé]e|dragon)/.test(
      t,
    )
  ) {
    if (/(d[eé]fenseur|cible|advers|sur lui)/.test(t))
      return "ENERGY_ON_TARGET_SPECIFIC";
    return "ENERGY_ON_SELF_SPECIFIC";
  }

  // Énergie générique
  if (/[eé]nergie/.test(t)) {
    if (/(d[eé]fenseur|cible|advers|sur lui)/.test(t))
      return "ENERGY_ON_TARGET";
    return "ENERGY_ON_SELF";
  }

  // Pokémon de Banc
  if (/pok[eé]mon.{0,30}banc.{0,30}(advers|votre adversaire)/.test(t))
    return "BENCH_POKEMON_OPPONENT";
  if (/pok[eé]mon.{0,30}banc.{0,30}(deux c[oô]t[eé]s?|les deux|les 2)/.test(t))
    return "BENCH_POKEMON_BOTH";
  if (/pok[eé]mon.{0,30}banc/.test(t)) return "BENCH_POKEMON_SELF";

  // Cartes en main
  if (/carte.{0,20}main.{0,20}(advers|votre adversaire)/.test(t))
    return "CARDS_IN_HAND_OPPONENT";
  if (/carte.{0,20}main/.test(t)) return "CARDS_IN_HAND_SELF";

  // Cartes défausse
  if (/carte.{0,20}d[eé]fausse.{0,20}(advers|votre adversaire)/.test(t))
    return "CARDS_IN_DISCARD_OPPONENT";
  if (/carte.{0,20}d[eé]fausse/.test(t)) return "CARDS_IN_DISCARD_SELF";

  // Récompenses
  if (
    /(r[eé]compense.{0,30}r[eé]cup[eé]r[eé]e.{0,30}advers|advers.{0,30}r[eé]cup[eé]r[eé]).{0,30}r[eé]compense/.test(
      full,
    )
  )
    return "PRIZES_TAKEN_OPPONENT";
  if (/r[eé]compense.{0,30}r[eé]cup[eé]r[eé]/.test(t))
    return "PRIZES_TAKEN_SELF";
  if (/r[eé]compense.{0,30}restante.{0,20}(advers|votre adversaire)/.test(t))
    return "PRIZES_REMAINING_OPPONENT";
  if (/r[eé]compense.{0,30}restante/.test(t)) return "PRIZES_REMAINING_SELF";

  // Pokémon dans la défausse
  if (/pok[eé]mon.{0,30}d[eé]fausse/.test(t)) return "POKEMON_IN_DISCARD_SELF";

  // Zone Perdue
  if (/zone perdue/.test(t)) return "CARDS_IN_LOST_ZONE_SELF";

  return null;
}

/** DRAW_CARD */
function tryDrawCard(text: string): AnyEffect[] {
  const t = norm(text);
  // "Piochez X cartes"
  const m = /piochez? (\d+|\w+) cartes?/i.exec(t);
  if (m) {
    return [{ type: "DRAW_CARD", amount: parseNumber(m[1]!) }];
  }
  return [];
}

/** DRAW_UNTIL_HAND_SIZE */
function tryDrawUntilHandSize(text: string): AnyEffect[] {
  const t = norm(text);
  const m = /piochez? jusqu'[aà] avoir (\d+|\w+) cartes? en main/i.exec(t);
  if (m) {
    return [{ type: "DRAW_UNTIL_HAND_SIZE", handSize: parseNumber(m[1]!) }];
  }
  return [];
}

/** SEARCH_DECK */
function trySearchDeck(text: string): AnyEffect[] {
  const t = norm(text);
  if (!/cherchez? dans votre deck/i.test(t)) return [];

  const effects: AnyEffect[] = [];

  // Cherche "jusqu'à X" ou "une/un/X"
  const amountM =
    /cherchez? dans votre deck jusqu'[aà] (\d+|\w+)/i.exec(t) ??
    /cherchez? dans votre deck (\d+|\w+)/i.exec(t);
  const amount = amountM ? parseNumber(amountM[1]!) : 1;

  // Destination
  let destination: "HAND" | "BENCH" | "ATTACHED" = "HAND";
  if (
    /placez?[- ]les? sur votre banc|mettez?[- ]les? sur votre banc/.test(
      t.toLowerCase(),
    )
  )
    destination = "BENCH";
  else if (
    /attachez?[- ]les?[- ][aà] ce pok[eé]mon|attache[- ][aà] ce pok[eé]mon/.test(
      t.toLowerCase(),
    )
  )
    destination = "ATTACHED";

  const filter = extractSearchFilter(t);
  const shuffleM =
    /m[eé]langez? ensuite votre deck|m[eé]langez? votre deck/i.test(t);

  const effect: AnyEffect = { type: "SEARCH_DECK", amount, destination };
  if (filter) effect.filter = filter;
  if (shuffleM) effect.shuffleAfter = true;

  effects.push(effect);
  return effects;
}

/** LOOK_AT_TOP_DECK */
function tryLookAtTopDeck(text: string): AnyEffect[] {
  const t = norm(text);
  const m =
    /regardez? les? (\d+|\w+) premi[eè]res? cartes? de votre deck/i.exec(t);
  if (m) {
    return [{ type: "LOOK_AT_TOP_DECK", amount: parseNumber(m[1]!) }];
  }
  return [];
}

/** SEARCH_DISCARD */
function trySearchDiscard(text: string): AnyEffect[] {
  const t = norm(text);
  if (!/cherchez? dans votre (pile de )?d[eé]fausse/i.test(t)) return [];

  const amountM =
    /cherchez? dans votre (?:pile de )?d[eé]fausse (\d+|\w+)/i.exec(t);
  const amount = amountM ? parseNumber(amountM[1]!) : 1;

  let destination: "HAND" | "BENCH" | "ATTACHED" | "TOP_DECK" = "HAND";
  if (/placez?[- ]les? sur votre banc/.test(t.toLowerCase()))
    destination = "BENCH";
  else if (/attachez?[- ][aà] ce pok[eé]mon/.test(t.toLowerCase()))
    destination = "ATTACHED";
  else if (/placez?[- ]les? sur votre deck/.test(t.toLowerCase()))
    destination = "TOP_DECK";

  const filter = extractSearchFilter(t);
  const effect: AnyEffect = { type: "SEARCH_DISCARD", amount, destination };
  if (filter) effect.filter = filter;
  return [effect];
}

/** DISCARD_ENERGY */
function tryDiscardEnergy(text: string): AnyEffect[] {
  const t = norm(text);
  if (!/d[eé]faussez?.{0,30}[eé]nergie|d[eé]faussez?.{0,30}[eé]nergi/i.test(t))
    return [];

  // Pas une énergie depuis le deck/défausse (c'est ATTACH)
  if (/de votre deck|de votre d[eé]fausse/i.test(t)) return [];

  const energyType = detectEnergyType(text);
  let amount: number | "ALL" = 1;

  if (/toutes? les? [eé]nergies?/i.test(t)) {
    amount = "ALL";
  } else {
    const amountM = /d[eé]faussez? (\d+|\w+) [eé]nergies?/i.exec(t);
    if (amountM) amount = parseNumber(amountM[1]!);
  }

  const target = /pok[eé]mon d[eé]fenseur|pok[eé]mon actif advers/i.test(t)
    ? "OPPONENT_ACTIVE"
    : "SELF";

  const effect: AnyEffect = { type: "DISCARD_ENERGY", amount, target };
  if (energyType) effect.energyType = energyType;
  return [effect];
}

/** ATTACH_ENERGY_FROM_DISCARD */
function tryAttachEnergyFromDiscard(text: string): AnyEffect[] {
  const t = norm(text);
  if (
    !/attachez?.{0,60}de votre (?:pile de )?d[eé]fausse|de votre (?:pile de )?d[eé]fausse.{0,60}attachez?/i.test(
      t,
    )
  )
    return [];
  if (/deck/i.test(t)) return []; // c'est ATTACH_FROM_DECK

  const amountM = /attachez? (\d+|\w+) [eé]nergies?/i.exec(t);
  const amount = amountM ? parseNumber(amountM[1]!) : 1;
  const energyType = detectEnergyType(text);
  const target = detectTarget(t);
  const targetFinal = target === "OPPONENT_ACTIVE" ? "SELF" : target; // default = SELF pour les attaches

  const effect: AnyEffect = {
    type: "ATTACH_ENERGY_FROM_DISCARD",
    amount,
    target: targetFinal,
  };
  if (energyType) effect.energyType = energyType;
  return [effect];
}

/** ATTACH_ENERGY_FROM_DECK */
function tryAttachEnergyFromDeck(text: string): AnyEffect[] {
  const t = norm(text);
  if (
    !/attachez?.{0,60}de votre deck|de votre deck.{0,60}attachez?|cherchez?.{0,30}[eé]nergie.{0,30}attachez?/i.test(
      t,
    )
  )
    return [];
  if (/d[eé]fausse/i.test(t)) return []; // c'est ATTACH_FROM_DISCARD

  const amountM = /attachez? (\d+|\w+) [eé]nergies?/i.exec(t);
  const amount = amountM ? parseNumber(amountM[1]!) : 1;
  const energyType = detectEnergyType(text);
  const shuffleM = /m[eé]langez? ensuite votre deck/i.test(t);

  const target = detectTarget(t);
  const targetFinal = target === "OPPONENT_ACTIVE" ? "SELF" : target;

  const effect: AnyEffect = {
    type: "ATTACH_ENERGY_FROM_DECK",
    amount,
    target: targetFinal,
  };
  if (energyType) effect.energyType = energyType;
  if (shuffleM) effect.shuffleAfter = true;
  return [effect];
}

/** MOVE_ENERGY */
function tryMoveEnergy(text: string): AnyEffect[] {
  const t = norm(text).toLowerCase();
  if (!/d[eé]placez?.{0,30}[eé]nergie/i.test(t)) return [];

  const energyType = detectEnergyType(text);

  // Detect from
  let from = "SELF";
  if (/de votre banc|depuis votre banc/.test(t)) {
    from = "PLAYER_BENCH";
  } else if (/du pok[eé]mon actif advers|de l'actif advers/.test(t)) {
    from = "OPPONENT_ACTIVE";
  } else if (/entre vos pok[eé]mon|comme vous le souhaitez/.test(t)) {
    from = "ANY";
  }

  // Detect to
  let to = "PLAYER_BENCH";
  if (/[àa] votre (pok[eé]mon )?actif|vers votre actif/.test(t)) {
    to = "PLAYER_ACTIVE";
  } else if (from === "OPPONENT_ACTIVE") {
    to = "SELF";
  } else if (from === "ANY") {
    to = "ANY";
  }

  // Detect amount
  let amount = 1;
  const amountM = /d[eé]placez? (\d+|\w+)/i.exec(t);
  if (amountM) {
    const parsed = parseNumber(amountM[1]!);
    if (parsed > 0) amount = parsed;
  }

  const effect: AnyEffect = {
    type: "MOVE_ENERGY",
    amount,
    from,
    to,
  };
  if (energyType) effect.energyType = energyType;
  return [effect];
}

/** DISCARD_FROM_HAND */
function tryDiscardFromHand(text: string): AnyEffect[] {
  const t = norm(text);

  // "Votre adversaire défausse X cartes de sa main"
  const oppM =
    /votre adversaire d[eé]fausse (\d+|\w+) cartes? de sa main/i.exec(t);
  if (oppM) {
    return [
      {
        type: "DISCARD_FROM_HAND",
        amount: parseNumber(oppM[1]!),
        target: "OPPONENT",
      },
    ];
  }

  // "Défaussez X cartes de votre main"
  const selfM = /d[eé]faussez? (\d+|\w+) cartes? de votre main/i.exec(t);
  if (selfM) {
    return [
      {
        type: "DISCARD_FROM_HAND",
        amount: parseNumber(selfM[1]!),
        target: "SELF",
      },
    ];
  }

  // "Défaussez toutes les cartes de votre main"
  if (/d[eé]faussez? toutes? les? cartes? de votre main/i.test(t)) {
    return [{ type: "DISCARD_FROM_HAND", amount: "ALL", target: "SELF" }];
  }

  return [];
}

/** SHUFFLE_HAND_DRAW */
function tryShuffleHandDraw(text: string): AnyEffect[] {
  const t = norm(text);

  // "Chaque joueur mélange sa main... pioche..."
  if (/chaque joueur m[eé]lange sa main/i.test(t)) {
    const drawM = /pioche (\d+|\w+) cartes?/i.exec(t);
    const drawAmount = drawM ? parseNumber(drawM[1]!) : -1;
    return [{ type: "SHUFFLE_HAND_DRAW", target: "BOTH", drawAmount }];
  }

  // "Votre adversaire mélange sa main..."
  if (/votre adversaire m[eé]lange sa main/i.test(t)) {
    const drawM = /pioche (\d+|\w+) cartes?/i.exec(t);
    const drawAmount = drawM ? parseNumber(drawM[1]!) : -1;
    return [{ type: "SHUFFLE_HAND_DRAW", target: "OPPONENT", drawAmount }];
  }

  // "Mélangez votre main dans votre deck et piochez..."
  if (
    /m[eé]langez? votre main dans votre deck/i.test(t) ||
    /remettez? votre main dans votre deck/i.test(t)
  ) {
    const drawM = /piochez? (\d+|\w+) cartes?/i.exec(t);
    const drawAmount = drawM ? parseNumber(drawM[1]!) : -1;
    return [{ type: "SHUFFLE_HAND_DRAW", target: "SELF", drawAmount }];
  }

  return [];
}

/** MILL */
function tryMill(text: string): AnyEffect[] {
  const t = norm(text);
  const m =
    /votre adversaire d[eé]fausse les? (\d+|\w+) premi[eè]res? cartes? de son deck/i.exec(
      t,
    );
  if (m) {
    return [{ type: "MILL", amount: parseNumber(m[1]!), target: "OPPONENT" }];
  }
  return [];
}

/** SWITCH_OPPONENT_ACTIVE */
function trySwitchOpponent(text: string): AnyEffect[] {
  const t = norm(text).toLowerCase();
  if (
    /votre adversaire [eé]change son pok[eé]mon actif|envoyez? le pok[eé]mon d[eé]fenseur [aà] son banc|votre adversaire doit [eé]changer|envoie l'un de ses pok[eé]mon de banc/.test(
      t,
    )
  ) {
    return [{ type: "SWITCH_OPPONENT_ACTIVE" }];
  }
  return [];
}

/** SWITCH_OWN_ACTIVE */
function trySwitchOwn(text: string): AnyEffect[] {
  const t = norm(text).toLowerCase();
  if (
    /[eé]changez? votre pok[eé]mon actif|vous pouvez [eé]changer votre pok[eé]mon actif|apr[eè]s cette attaque.{0,30}banc/.test(
      t,
    )
  ) {
    return [{ type: "SWITCH_OWN_ACTIVE" }];
  }
  return [];
}

/** PREVENT_DAMAGE */
function tryPreventDamage(text: string): AnyEffect[] {
  const t = norm(text);
  if (/ne subit aucun d[eé]g[aâ]t|ne re[cç]oit aucun d[eé]g[aâ]t/i.test(t)) {
    const target = detectTarget(t);
    const finalTarget = target === "OPPONENT_ACTIVE" ? "SELF" : target;
    const duration = detectDuration(t);
    return [{ type: "PREVENT_DAMAGE", target: finalTarget, duration }];
  }
  return [];
}

/** REDUCE_DAMAGE */
function tryReduceDamage(text: string): AnyEffect[] {
  const t = norm(text);
  const m =
    /subit (\d+) d[eé]g[aâ]ts? de moins (de la part des attaques|des attaques)/i.exec(
      t,
    );
  if (m) {
    const target = detectTarget(t);
    const finalTarget = target === "OPPONENT_ACTIVE" ? "SELF" : target;
    const duration = detectDuration(t);
    return [
      {
        type: "REDUCE_DAMAGE",
        amount: parseInt(m[1]!),
        target: finalTarget,
        duration,
      },
    ];
  }
  return [];
}

/** CANT_ATTACK_NEXT_TURN */
function tryCantAttack(text: string): AnyEffect[] {
  const t = norm(text);
  if (/ne peut pas attaquer pendant votre prochain tour/i.test(t)) {
    return [{ type: "CANT_ATTACK_NEXT_TURN", target: "SELF" }];
  }
  if (
    /pok[eé]mon d[eé]fenseur ne peut pas attaquer|ne peut pas attaquer pendant le prochain tour de votre adversaire/i.test(
      t,
    )
  ) {
    return [{ type: "CANT_ATTACK_NEXT_TURN", target: "OPPONENT_ACTIVE" }];
  }
  return [];
}

/** CANT_USE_SAME_ATTACK */
function tryCantUseSameAttack(text: string): AnyEffect[] {
  const t = norm(text).toLowerCase();
  if (
    /ne peut pas utiliser la m[eê]me attaque|ne peut pas r[eé]utiliser cette attaque/i.test(
      t,
    )
  ) {
    return [{ type: "CANT_USE_SAME_ATTACK" }];
  }
  return [];
}

/** OPPONENT_CANT_RETREAT */
function tryOpponentCantRetreat(text: string): AnyEffect[] {
  const t = norm(text).toLowerCase();
  if (/ne peut pas battre en retraite/i.test(t)) {
    return [{ type: "OPPONENT_CANT_RETREAT" }];
  }
  return [];
}

/** TRAINER_LOCK */
function tryTrainerLock(text: string): AnyEffect[] {
  const t = norm(text).toLowerCase();
  if (/ne peut pas jouer de cartes? dresseur/i.test(t)) {
    const duration = detectDuration(text);
    return [{ type: "TRAINER_LOCK", lockType: "ALL", duration }];
  }
  if (/ne peut pas jouer de cartes? objet/i.test(t)) {
    const duration = detectDuration(text);
    return [{ type: "TRAINER_LOCK", lockType: "ITEM", duration }];
  }
  if (/ne peut pas jouer de cartes? supporter/i.test(t)) {
    const duration = detectDuration(text);
    return [{ type: "TRAINER_LOCK", lockType: "SUPPORTER", duration }];
  }
  if (/ne peut pas jouer de cartes? stade/i.test(t)) {
    const duration = detectDuration(text);
    return [{ type: "TRAINER_LOCK", lockType: "STADIUM", duration }];
  }
  return [];
}

/** ABILITY_LOCK */
function tryAbilityLock(text: string): AnyEffect[] {
  const t = norm(text).toLowerCase();
  if (
    /aucun talent.{0,30}ne peut [eê]tre utilis[eé]|les talents pok[eé]mon.{0,30}ne peuvent pas/i.test(
      t,
    )
  ) {
    const duration = detectDuration(text);
    return [{ type: "ABILITY_LOCK", duration }];
  }
  return [];
}

/** BOOST_NEXT_TURN_DAMAGE */
function tryBoostNextTurnDamage(text: string): AnyEffect[] {
  const t = norm(text);
  const m =
    /(\d+) d[eé]g[aâ]ts? suppl[eé]mentaires? pendant votre prochain tour/i.exec(
      t,
    );
  if (m) {
    return [{ type: "BOOST_NEXT_TURN_DAMAGE", amount: parseInt(m[1]!) }];
  }
  return [];
}

/** COPY_ATTACK */
function tryCopyAttack(text: string): AnyEffect[] {
  const t = norm(text).toLowerCase();
  if (
    /choisissez? l'une des attaques.{0,30}pok[eé]mon actif advers|copiez? l'une des attaques/i.test(
      t,
    )
  ) {
    return [{ type: "COPY_ATTACK", source: "OPPONENT_ACTIVE" }];
  }
  return [];
}

/** SEND_TO_LOST_ZONE */
function trySendToLostZone(text: string): AnyEffect[] {
  const t = norm(text);
  if (/zone perdue/i.test(t)) {
    const target = detectTarget(t);
    return [{ type: "SEND_TO_LOST_ZONE", target }];
  }
  return [];
}

/** EXTRA_PRIZE */
function tryExtraPrize(text: string): AnyEffect[] {
  const t = norm(text);
  const m = /prenez? (\d+|\w+) cartes? r[eé]compense suppl[eé]mentaires?/i.exec(
    t,
  );
  if (m) {
    return [{ type: "EXTRA_PRIZE", amount: parseNumber(m[1]!) }];
  }
  return [];
}

/** RETURN_TO_HAND */
function tryReturnToHand(text: string): AnyEffect[] {
  const t = norm(text);
  if (
    /renvoyez?.{0,30}dans la main|retournez?.{0,30}dans (sa|votre) main/i.test(
      t,
    )
  ) {
    const target = detectTarget(t);
    return [{ type: "RETURN_TO_HAND", target }];
  }
  return [];
}

/** SHUFFLE_INTO_DECK */
function tryShuffleIntoDeck(text: string): AnyEffect[] {
  const t = norm(text);
  if (
    /m[eé]langez?.{0,30}dans (son|votre) deck|renvoyez?.{0,30}dans (son|votre) deck/i.test(
      t,
    )
  ) {
    // Exclure "mélangez ensuite votre deck" (= just shuffle, no target)
    if (/m[eé]langez? ensuite votre deck|m[eé]langez? votre deck$/i.test(t))
      return [];
    const target = detectTarget(t);
    return [{ type: "SHUFFLE_INTO_DECK", target }];
  }
  return [];
}

/** SHUFFLE_DECK */
function tryShuffleDeck(text: string): AnyEffect[] {
  const t = norm(text).toLowerCase();
  if (/m[eé]langez? ensuite votre deck|m[eé]langez? votre deck/i.test(t)) {
    return [{ type: "SHUFFLE_DECK" }];
  }
  return [];
}

/** REVIVE */
function tryRevive(text: string): AnyEffect[] {
  const t = norm(text).toLowerCase();
  if (
    /r[eé]animez?|mettez? un pok[eé]mon de base de votre d[eé]fausse/i.test(t)
  ) {
    const effect: AnyEffect = { type: "REVIVE" };
    const filter = extractSearchFilter(t);
    if (filter) effect.filter = filter;
    return [effect];
  }
  return [];
}

/** DEVOLVE */
function tryDevolve(text: string): AnyEffect[] {
  const t = norm(text).toLowerCase();
  if (/r[eé]gr[eé]dez?|r[eé]trograder|d[eé][eé]volue/i.test(t)) {
    const target = detectTarget(t);
    return [{ type: "DEVOLVE", target }];
  }
  return [];
}

// ─── Parseurs d'effets passifs de Stade ───────────────────────

/**
 * STADIUM_PASSIVE_DAMAGE_BOOST
 * Textes réels (données non-accentuées, noms anglais) :
 *   "infligent 10 degats supplementaires au Pokemon Actif de ladversaire"
 *   "infligent 30 degats supplementaires au Pokemon Actif de l'adversaire"
 * Anciens jeux (français accentué) :
 *   "infligent N dégâts de plus"
 */
function tryStadiumPassiveDamageBoost(text: string): AnyEffect[] {
  const t = norm(text);

  // Pattern principal : "infligent N dégâts supplémentaires"
  const suppM = /infligent? (\d+) d[eé]g[aâ]ts? suppl[eé]mentaires?/i.exec(t);
  if (suppM) {
    const amount = parseInt(suppM[1]!);
    if (!isNaN(amount) && amount > 0) {
      // Extraire le type depuis le contexte précédant le match
      const context = t.slice(0, suppM.index + suppM[0].length);
      const energyType = detectEnergyType(context);
      const effect: AnyEffect = {
        type: "STADIUM_PASSIVE_DAMAGE_BOOST",
        amount,
      };
      if (energyType) effect.pokemonType = energyType;
      return [effect];
    }
  }

  // Ancienne formulation : "N dégâts de plus"
  const plusPatterns = [
    /infligent? (\d+) d[eé]g[aâ]ts? de plus/i,
    /(\d+) d[eé]g[aâ]ts? de plus/i,
  ];
  for (const p of plusPatterns) {
    const m = p.exec(t);
    if (m) {
      const amount = parseInt(m[1]!);
      if (isNaN(amount) || amount <= 0) continue;
      const context = t.slice(0, m.index + m[0].length);
      const energyType = detectEnergyType(context);
      const effect: AnyEffect = {
        type: "STADIUM_PASSIVE_DAMAGE_BOOST",
        amount,
      };
      if (energyType) effect.pokemonType = energyType;
      return [effect];
    }
  }

  return [];
}

/**
 * STADIUM_PASSIVE_DAMAGE_REDUCE
 * Textes réels (données non-accentuées, noms anglais) :
 *   "subissent 30 degats de moins provenant des attaques..."
 *   "recoivent 30 degats de moins des attaques de ladversaire"
 *   "sont reduits de 10 (apres application...)"
 * Anciens jeux (français accentué) :
 *   "sont réduits de N"
 */
function tryStadiumPassiveDamageReduce(text: string): AnyEffect[] {
  const t = norm(text);

  // Patterns dans l'ordre de priorité — on cherche le premier match
  const patterns: RegExp[] = [
    // "subissent N dégâts de moins" — sujet quelconque (Pokemon, Onix-GX, etc.)
    /subissent? (\d+) d[eé]g[aâ]ts? de moins/i,
    // "recoivent N dégâts de moins"
    /recoivent? (\d+) d[eé]g[aâ]ts? de moins/i,
    // "sont réduits de N"
    /sont r[eé]duits? de (\d+)/i,
    // "réduits de N dégâts"
    /r[eé]duits? de (\d+) d[eé]g[aâ]ts?/i,
    // Ancienne formulation explicite
    /(\d+) d[eé]g[aâ]ts? de moins (sur|pour|aux)/i,
  ];

  for (const p of patterns) {
    const m = p.exec(t);
    if (!m) continue;

    // Toujours le 1er groupe de capture numérique
    let amount = 0;
    for (let i = 1; i < m.length; i++) {
      const n = parseInt(m[i] ?? "");
      if (!isNaN(n) && n > 0) {
        amount = n;
        break;
      }
    }
    if (amount <= 0) continue;

    // Extraire le type depuis le contexte précédant le match
    const context = t.slice(0, m.index + m[0].length);
    const energyType = detectEnergyType(context);
    const effect: AnyEffect = { type: "STADIUM_PASSIVE_DAMAGE_REDUCE", amount };
    if (energyType) effect.pokemonType = energyType;
    return [effect];
  }

  return [];
}

// ─── Parseur de texte d'effet ─────────────────────────────────

/** Tous les parseurs d'effets simples, dans l'ordre de priorité */
const SIMPLE_PARSERS: Array<(text: string) => AnyEffect[]> = [
  tryDynamicDamage, // avant tryDamage (pour éviter double-match)
  tryPlaceDamageCounters, // avant tryDamage
  tryDamage,
  tryHeal,
  trySpecialCondition,
  tryRemoveSpecialCondition,
  tryDrawUntilHandSize, // avant tryDrawCard
  tryDrawCard,
  trySearchDeck,
  tryLookAtTopDeck,
  trySearchDiscard,
  tryDiscardEnergy,
  tryAttachEnergyFromDiscard,
  tryAttachEnergyFromDeck,
  tryMoveEnergy,
  tryDiscardFromHand,
  tryShuffleHandDraw,
  tryMill,
  trySwitchOpponent,
  trySwitchOwn,
  tryPreventDamage,
  tryReduceDamage,
  tryCantAttack,
  tryCantUseSameAttack,
  tryOpponentCantRetreat,
  tryTrainerLock,
  tryAbilityLock,
  tryBoostNextTurnDamage,
  tryCopyAttack,
  trySendToLostZone,
  tryExtraPrize,
  tryReturnToHand,
  tryShuffleIntoDeck,
  tryRevive,
  tryDevolve,
  tryShuffleDeck,
];

/** Parse les effets COIN_FLIP / MULTI_COIN_FLIP / FLIP_UNTIL_TAILS */
function parseCoinFlip(text: string): AnyEffect {
  const t = norm(text);
  // Retirer le préfixe "Lancez une pièce."
  const withoutFlip = t.replace(/lancez? une pièce\.?\s*/i, "");

  let headsText = "";
  let tailsText = "";

  // Pattern: "Si c'est face, [headsText] ; si c'est pile, [tailsText]."
  const bothM =
    /si c'est face[,\s]+(.+?)(?:\s*[;,]\s*si c'est pile[,\s]+(.+?))?\.?\s*$/i.exec(
      withoutFlip,
    );

  if (bothM) {
    headsText = bothM[1]?.trim() ?? "";
    tailsText = bothM[2]?.trim() ?? "";
  } else {
    const headsM = /si c'est face[,\s]+(.+)$/i.exec(withoutFlip);
    if (headsM) headsText = headsM[1]?.trim() ?? "";
  }

  const result: AnyEffect = { type: "COIN_FLIP" };

  if (headsText) {
    const onHeads = parseEffectsFromText(headsText);
    if (onHeads.length > 0) result.onHeads = onHeads;
  }
  if (tailsText) {
    const onTails = parseEffectsFromText(tailsText);
    if (onTails.length > 0) result.onTails = onTails;
  }

  return result;
}

/** Point d'entrée principal : transforme un texte en tableau d'effets */
export function parseEffectsFromText(text: string): AnyEffect[] {
  if (!text?.trim()) return [];
  const t = norm(text);

  // 1. FLIP_UNTIL_TAILS (priorité absolue)
  if (/jusqu'à ce que vous obteniez pile/i.test(t)) {
    const dmgM = /(\d+) d[eé]g[aâ]ts? pour chaque face/i.exec(t);
    const perHeads: AnyEffect[] = dmgM
      ? [
          {
            type: "DAMAGE",
            amount: parseInt(dmgM[1]!),
            target: "OPPONENT_ACTIVE",
          },
        ]
      : [];
    const effect: AnyEffect = { type: "FLIP_UNTIL_TAILS" };
    if (perHeads.length > 0) effect.perHeads = perHeads;
    return [effect];
  }

  // 2. MULTI_COIN_FLIP — exclure "une pièce" (= single flip, traité en étape 3)
  const multiM =
    /lancez? (\d+|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze) pièces?/i.exec(
      t,
    );
  if (multiM) {
    const count = parseNumber(multiM[1]!);
    const dmgM = /(\d+) d[eé]g[aâ]ts? pour chaque face/i.exec(t);
    const perHeads: AnyEffect[] = dmgM
      ? [
          {
            type: "DAMAGE",
            amount: parseInt(dmgM[1]!),
            target: "OPPONENT_ACTIVE",
          },
        ]
      : [];
    const effect: AnyEffect = { type: "MULTI_COIN_FLIP", count };
    if (perHeads.length > 0) effect.perHeads = perHeads;
    return [effect];
  }

  // 3. COIN_FLIP (single)
  if (/lancez? une pièce/i.test(t)) {
    const flipEffect = parseCoinFlip(t);

    // Effets AVANT le lancer de pièce (ex: "Défaussez une énergie. Lancez une pièce.")
    const beforeFlip = t
      .replace(/lancez? une pièce.*/i, "")
      .trim()
      .replace(/\.\s*$/, "");
    const beforeEffects =
      beforeFlip.length > 5 ? parseSimpleEffects(beforeFlip) : [];

    return [...beforeEffects, flipEffect];
  }

  // 4. Effets simples
  return parseSimpleEffects(t);
}

/** Applique tous les parseurs simples sur un texte sans coin flip.
 *  Les effets sont triés par position d'apparition dans le texte. */
function parseSimpleEffects(
  text: string,
  parsers: Array<(text: string) => AnyEffect[]> = SIMPLE_PARSERS,
): AnyEffect[] {
  const t = norm(text);
  const tLower = t.toLowerCase();
  const tagged: Array<{ effect: AnyEffect; pos: number }> = [];

  for (const parser of parsers) {
    const found = parser(t);
    for (const effect of found) {
      // Estimate position by finding the effect type keyword in text
      const typeStr = String(effect.type ?? "").toLowerCase();
      const pos = findEffectPosition(tLower, typeStr, effect);
      tagged.push({ effect, pos });
    }
  }

  // Sort by position in text (stable sort preserves parser order for ties)
  tagged.sort((a, b) => a.pos - b.pos);
  return tagged.map((t) => t.effect);
}

/** Find approximate position of an effect in the source text */
function findEffectPosition(
  text: string,
  _type: string,
  effect: AnyEffect,
): number {
  // Use the amount or condition as anchor for position detection
  if (effect.amount != null) {
    const amtStr = String(effect.amount);
    const idx = text.indexOf(amtStr);
    if (idx >= 0) return idx;
  }
  if (effect.condition) {
    const condMap: Record<string, string> = {
      Poisoned: "empoisonn",
      Burned: "br\u00fbl",
      Paralyzed: "paralys",
      Asleep: "endorm",
      Confused: "confus",
    };
    const keyword = condMap[effect.condition as string];
    if (keyword) {
      const idx = text.indexOf(keyword);
      if (idx >= 0) return idx;
    }
  }
  // Fallback: keep original parser order
  return text.length;
}

/** Parseurs adaptés aux Talents (effets passifs uniquement) */
const ABILITY_PARSERS: Array<(text: string) => AnyEffect[]> = [
  tryPreventDamage,
  tryReduceDamage,
  tryHeal,
  tryDrawCard,
  tryDrawUntilHandSize,
  tryAbilityLock,
  tryTrainerLock,
  trySearchDeck,
  trySearchDiscard,
  tryAttachEnergyFromDiscard,
  tryAttachEnergyFromDeck,
  tryMoveEnergy,
  tryReturnToHand,
  tryShuffleDeck,
];

/** Parse les effets d'un texte de Talent */
export function parseAbilityEffectsFromText(text: string): AnyEffect[] {
  if (!text?.trim()) return [];
  const t = norm(text);
  return parseSimpleEffects(t, ABILITY_PARSERS);
}

// ─── Parseur de carte ─────────────────────────────────────────

function parseCardEffectsInternal(card: CardInput): AnyEffect {
  if (card.category === "Pokémon") {
    const attacks: Record<string, { effects: AnyEffect[] }> = {};

    for (const atk of card.attacks ?? []) {
      attacks[atk.name] = {
        effects: parseEffectsFromText(atk.effect ?? ""),
      };
    }

    const result: AnyEffect = { kind: "pokemon", attacks };

    if (card.ability) {
      result.ability = {
        name: card.ability.name,
        effects: parseAbilityEffectsFromText(card.ability.effect),
      };
    }

    return result;
  }

  if (card.category === "Dresseur") {
    const effectText = card.effect ?? "";

    // Stades : les effets continus sont séparés des effets ponctuels
    if (card.trainerType === "Stade" || card.trainerType === "Stadium") {
      const passiveEffects = parseSimpleEffects(effectText, [
        tryStadiumPassiveDamageBoost,
        tryStadiumPassiveDamageReduce,
      ]);
      // Effets ponctuels éventuels (ex: soigner au jeu du stade)
      const playEffects = parseSimpleEffects(effectText, [
        tryHeal,
        tryDrawCard,
        trySearchDeck,
      ]);
      const result: AnyEffect = { kind: "trainer", playEffects };
      if (passiveEffects.length > 0) result.passiveEffects = passiveEffects;
      return result;
    }

    const playEffects = parseEffectsFromText(effectText);
    const result: AnyEffect = { kind: "trainer", playEffects };

    // targetStrategy
    if (
      /l'un de vos pok[eé]mon|d'un de vos pok[eé]mon|choisissez? l'un de vos pok[eé]mon/i.test(
        effectText,
      )
    ) {
      result.targetStrategy = "OWN_POKEMON";
    }

    return result;
  }

  // Énergie ou inconnu — on ignore
  return { kind: "trainer", playEffects: [] };
}

// ─── Classe principale ────────────────────────────────────────

export class RuleBasedParser {
  readonly name = "rule-based";

  parseCard(card: CardInput): ParseResult {
    try {
      const raw = parseCardEffectsInternal(card);
      const validation = validateCardEffects(raw);

      if (!validation.success) {
        return {
          cardId: card.id,
          success: false,
          rawJSON: JSON.stringify(raw),
          error: validation.error ?? "Validation échouée",
        };
      }

      return {
        cardId: card.id,
        success: true,
        effects: validation.data as CardEffects,
        rawJSON: JSON.stringify(raw),
      };
    } catch (err: any) {
      return {
        cardId: card.id,
        success: false,
        error: `Parse error: ${err?.message ?? String(err)}`,
      };
    }
  }

  async parseBatch(cards: CardInput[]): Promise<ParseResult[]> {
    return cards.map((card) => this.parseCard(card));
  }
}
