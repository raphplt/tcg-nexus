import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ShieldCheck } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-2">
          <FileText className="w-8 h-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          Conditions Générales d'Utilisation
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Dernière mise à jour : 28 août 2026 — Plateforme TCG Nexus
        </p>
      </div>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            1. Objet et champ d'application
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Les présentes Conditions Générales d'Utilisation (ci-après "CGU")
            régissent l'accès et l'utilisation des services proposés par la
            plateforme TCG Nexus (ci-après "le Service"), incluant l'application
            web, les applications mobiles et les API associées.
          </p>
          <p>
            En accédant au Service ou en créant un compte utilisateur, vous
            acceptez sans réserve l'intégralité des présentes dispositions.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            2. Inscription et Sécurité des Comptes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            L'accès à certaines fonctionnalités (gestion de collection,
            participation aux tournois, création d'annonces marketplace)
            nécessite la création d'un compte personnel ou la connexion via un
            fournisseur d'identité tiers (Google OAuth).
          </p>
          <p>
            L'utilisateur s'engage à fournir des informations exactes et à
            préserver la confidentialité de ses identifiants. Toute activité
            réalisée depuis un compte authentifié est réputée effectuée par son
            titulaire.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            3. Règles de conduite et Tournois
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Les participants aux tournois et compétitions organisés sur TCG
            Nexus s'engagent au strict respect des règles du jeu officiel, au
            fair-play et à l'exactitude des scores renseignés.
          </p>
          <p>
            Tout comportement frauduleux, exploitation de faille technique,
            usurpation d'identité ou harcèlement entraînera la suspension
            immédiate du compte et l'exclusion des compétitions.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            4. Marketplace et Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            La marketplace TCG Nexus met en relation acheteurs et vendeurs de
            cartes et produits scellés de collection. Les vendeurs garantissent
            l'authenticité et l'état conforme des articles mis en vente.
          </p>
          <p>
            Les paiements sont sécurisés par notre prestataire agréé Stripe. TCG
            Nexus applique les mesures nécessaires de lutte contre la
            contrefaçon et le blanchiment d'argent.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
