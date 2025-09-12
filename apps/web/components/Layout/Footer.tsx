"use client";
import Image from "next/image";
import { Icon } from "@iconify/react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-background border-t-4 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/images/Logo.png"
                alt="TCG Nexus"
                width={48}
                height={48}
                className="rounded-none"
              />
              <h3 className="text-xl font-bold text-foreground">TCG Nexus</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Votre plateforme complète pour le trading de cartes Pokémon, les
              tournois et l'analyse stratégique.
            </p>
            <div className="flex space-x-3">
              <Link
                href="https://github.com/raphplt/tcg-nexus"
                target="_blank"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Icon
                  icon="akar-icons:github-fill"
                  className="w-5 h-5"
                />
              </Link>
              <Link
                href="https://www.linkedin.com/company/tcg-nexus"
                target="_blank"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Icon
                  icon="akar-icons:linkedin-fill"
                  className="w-5 h-5"
                />
              </Link>
              <Link
                href="https://twitter.com/tcgnexus"
                target="_blank"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Icon
                  icon="akar-icons:twitter-fill"
                  className="w-5 h-5"
                />
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">
              Navigation
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Accueil
                </Link>
              </li>
              <li>
                <Link
                  href="/tournaments"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Tournois
                </Link>
              </li>
              <li>
                <Link
                  href="/marketplace"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Marketplace
                </Link>
              </li>
              <li>
                <Link
                  href="/strategy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Stratégie
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">
              Ressources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/pokemon"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cartes Pokémon
                </Link>
              </li>
              <li>
                <Link
                  href="/deck-builder"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Constructeur de deck
                </Link>
              </li>
              <li>
                <Link
                  href="/statistics"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Statistiques
                </Link>
              </li>
              <li>
                <Link
                  href="/ranking"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Classements
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">Légal</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Politique des cookies
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} TCG Nexus. Tous droits réservés.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Fait avec ❤️ pour la communauté Pokémon TCG</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
