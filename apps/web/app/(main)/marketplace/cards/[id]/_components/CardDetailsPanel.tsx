"use client";

import { ExternalLink } from "lucide-react";
import Image from "next/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PokemonCardType } from "@/types/cardPokemon";
import { typeToImage } from "@/utils/images";
import { slugify } from "@/utils/text";

interface CardDetailsPanelProps {
  card: PokemonCardType;
}

function EnergyIcon({ type, size = 18 }: { type: string; size?: number }) {
  const src = typeToImage[slugify(type.toLowerCase())];
  if (!src) return <span className="text-xs">{type}</span>;
  return <Image src={src} alt={type} width={size} height={size} />;
}

const variantLabels: Record<string, string> = {
  normal: "Normale",
  reverse: "Reverse",
  holo: "Holographique",
  firstEdition: "Première édition",
  wPromo: "Promo",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function CardDetailsPanel({ card }: CardDetailsPanelProps) {
  const hasCombat =
    (card.attacks?.length ?? 0) > 0 || (card.abilities?.length ?? 0) > 0;
  const hasResistances =
    (card.weaknesses?.length ?? 0) > 0 ||
    (card.resistances?.length ?? 0) > 0 ||
    card.retreat != null;
  const variantEntries = Object.entries(card.variants ?? {});

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-lg font-semibold">Fiche de la carte</h2>
        <p className="text-sm text-muted-foreground">
          Caractéristiques de jeu, informations d&apos;édition et légalité.
        </p>
      </div>

      <Accordion type="multiple" className="px-6 pb-2">
        {hasCombat && (
          <AccordionItem value="combat">
            <AccordionTrigger className="hover:no-underline">
              Attaques et talents
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {card.abilities?.map((ability, i) => (
                <div key={`ability-${i}`} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {ability.type || "Talent"}
                    </Badge>
                    <span className="font-semibold">{ability.name}</span>
                  </div>
                  {ability.effect && (
                    <p className="text-muted-foreground">{ability.effect}</p>
                  )}
                </div>
              ))}
              {card.attacks?.map((attack, i) => (
                <div key={`attack-${i}`} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex gap-0.5">
                      {attack.cost?.map((energy, j) => (
                        <EnergyIcon key={j} type={energy} />
                      ))}
                    </span>
                    <span className="font-semibold">{attack.name}</span>
                    {attack.damage && (
                      <span className="ml-auto font-bold tabular-nums">
                        {attack.damage}
                      </span>
                    )}
                  </div>
                  {attack.effect && (
                    <p className="text-muted-foreground">{attack.effect}</p>
                  )}
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {hasResistances && (
          <AccordionItem value="resistances">
            <AccordionTrigger className="hover:no-underline">
              Faiblesses et résistances
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {(card.weaknesses?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-28">Faiblesses</span>
                  {card.weaknesses?.map((w, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      <EnergyIcon type={w.type} size={14} />
                      {w.value}
                    </Badge>
                  ))}
                </div>
              )}
              {(card.resistances?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-28">
                    Résistances
                  </span>
                  {card.resistances?.map((r, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      <EnergyIcon type={r.type} size={14} />
                      {r.value}
                    </Badge>
                  ))}
                </div>
              )}
              {card.retreat != null && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-28">Retraite</span>
                  <span className="font-medium">
                    {card.retreat} énergie{card.retreat > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="edition">
          <AccordionTrigger className="hover:no-underline">
            Édition et légalité
          </AccordionTrigger>
          <AccordionContent>
            <InfoRow label="Set" value={card.set?.name ?? "—"} />
            {card.set?.serie?.name && (
              <InfoRow label="Série" value={card.set.serie.name} />
            )}
            {card.set?.releaseDate && (
              <InfoRow
                label="Date de sortie"
                value={new Date(card.set.releaseDate).toLocaleDateString(
                  "fr-FR",
                )}
              />
            )}
            {card.set?.cardCount?.official && (
              <InfoRow
                label="Cartes du set"
                value={`${card.set.cardCount.official} officielles`}
              />
            )}
            {card.regulationMark && (
              <InfoRow label="Bloc de régulation" value={card.regulationMark} />
            )}
            {card.legal && (
              <InfoRow
                label="Formats autorisés"
                value={
                  <span className="flex gap-1.5">
                    <Badge
                      variant={card.legal.standard ? "secondary" : "outline"}
                      className={
                        card.legal.standard ? "" : "text-muted-foreground"
                      }
                    >
                      Standard
                    </Badge>
                    <Badge
                      variant={card.legal.expanded ? "secondary" : "outline"}
                      className={
                        card.legal.expanded ? "" : "text-muted-foreground"
                      }
                    >
                      Étendu
                    </Badge>
                  </span>
                }
              />
            )}
          </AccordionContent>
        </AccordionItem>

        {variantEntries.length > 0 && (
          <AccordionItem value="variants">
            <AccordionTrigger className="hover:no-underline">
              Variantes existantes
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                {variantEntries.map(([variant, available]) => (
                  <Badge
                    key={variant}
                    variant={available ? "secondary" : "outline"}
                    className={available ? "" : "text-muted-foreground/60"}
                  >
                    {variantLabels[variant] ?? variant}
                    {available ? "" : " — non éditée"}
                  </Badge>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {card.tcgDexId && (
        <div className="border-t px-6 py-3">
          <Button variant="ghost" size="sm" asChild className="h-8 px-2">
            <a
              href={`https://tcgdex.net/fr/cards/${card.tcgDexId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Consulter la fiche TCGdex
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
        </div>
      )}
    </section>
  );
}
