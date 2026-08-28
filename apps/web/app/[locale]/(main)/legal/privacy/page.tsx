import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-2">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          Politique de Confidentialité & RGPD
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Protection des données personnelles conformément au Règlement Général
          sur la Protection des Données (RGPD).
        </p>
      </div>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">1. Données collectées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            TCG Nexus collecte uniquement les données strictement nécessaires au
            fonctionnement de ses services :
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              Identité et contact : nom, prénom, adresse email, photo de profil
              ;
            </li>
            <li>
              Identifiants d'authentification : mots de passe hachés (bcrypt),
              identités OAuth (Google ID) ;
            </li>
            <li>
              Données de jeu et de collection : cartes numérisées, decks créés,
              historique de matchs et classements ELO ;
            </li>
            <li>
              Données de navigation techniques : cookies de session sécurisés
              (HttpOnly, SameSite), adresse IP, logs applicatifs (avec
              identifiant de corrélation anonymisé).
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            2. Finalités des traitements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Les informations recueillies font l'objet d'un traitement
            informatique destiné à :
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>La gestion et la sécurisation des sessions utilisateurs ;</li>
            <li>
              L'organisation des tournois et le calcul des classements
              compétitifs ;
            </li>
            <li>
              L'exécution des commandes et livraisons sur la marketplace ;
            </li>
            <li>
              La reconnaissance visuelle et l'OCR des cartes de collection.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            3. Vos droits (Accès, Rectification, Suppression)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Conformément au RGPD et à la loi Informatique et Libertés, vous
            disposez d'un droit d'accès, de rectification, de portabilité et de
            suppression de l'ensemble de vos données personnelles.
          </p>
          <p>
            Vous pouvez exercer ces droits à tout moment depuis les paramètres
            de votre compte ou en contactant notre délégué à la protection des
            données à l'adresse :{" "}
            <span className="text-primary font-medium">
              privacy@tcg-nexus.com
            </span>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
