import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Sparkles } from "lucide-react";

export default function MentionsLegalesPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-2">
          <Info className="w-8 h-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          Mentions Légales & Propriété Intellectuelle
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Informations éditoriales, hébergement et clause de non-responsabilité
          de marque.
        </p>
      </div>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">1. Éditeur du Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Projet :</strong> TCG Nexus —
            Monorepo Plateforme & Écosystème TCG
          </p>
          <p>
            <strong className="text-foreground">
              Responsables de publication :
            </strong>{" "}
            Équipe de développement TCG Nexus (ETNA Promo 2026)
          </p>
          <p>
            <strong className="text-foreground">Contact :</strong>{" "}
            contact@tcg-nexus.com
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            2. Hébergement et Infrastructure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Infrastructure :</strong>{" "}
            Déploiement conteneurisé Docker & Orchestration Cloud
          </p>
          <p>
            <strong className="text-foreground">Base de données :</strong>{" "}
            PostgreSQL 15 avec extension vectorielle pgvector
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-xl text-primary">
              3. Clause de Non-Affiliation & Disclaimer Pokémon
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            TCG Nexus est un projet technologique et communautaire indépendant.
          </p>
          <p>
            Pokémon et les noms des personnages Pokémon sont des marques
            déposées et copyrights de <strong>Nintendo</strong>,{" "}
            <strong>Creatures Inc.</strong>, et <strong>GAME FREAK inc.</strong>
          </p>
          <p>
            TCG Nexus n'est en aucun cas affilié, sponsorisé, approuvé ou
            associé officiellement à Nintendo, The Pokémon Company ou Game
            Freak. Toutes les illustrations de cartes, noms de séries et
            symboles sont la propriété exclusive de leurs détenteurs respectifs
            et sont utilisés uniquement à des fins d'identification, de
            référence et de catalogage.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
