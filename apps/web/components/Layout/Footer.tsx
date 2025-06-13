"use client";
import Image from "next/image";
import { Icon } from "@iconify/react";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Image
              src="/images/Logo.png"
              alt="TCG Nexus"
              width={100}
              height={100}
            />

            <h3 className="text-xl font-bold my-4">TCG Nexus</h3>
            <p className="text-sm text-gray-300 w-2/3">
              La révolution du jeu de cartes
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Pages</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-default-100 text-sm"
                >
                  Accueil
                </Link>
              </li>
              <li>
                <Link
                  href="/tournaments"
                  className="text-default-100 text-sm cursor-pointer"
                >
                  Tournois
                </Link>
              </li>
              <li>
                <Link
                  href="/marketplace"
                  className="text-default-100 text-sm cursor-pointer"
                >
                  Marketplace
                </Link>
              </li>
              <li>
                <Link
                  href="/strategy"
                  className="text-default-100 text-sm cursor-pointer"
                >
                  Stratégie
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Légal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-default-100 text-sm"
                >
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-default-100 text-sm"
                >
                  Cookies
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-default-100 text-sm"
                >
                  Mentions légales
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Suivez-nous</h3>
            <ul className="flex space-x-4">
              <li>
                <Link
                  href="https://www.linkedin.com/in/melios-the-app/"
                  target="_blank"
                  className="hover:text-gray-300 text-default-100"
                  aria-label="LinkedIn"
                >
                  <Icon
                    icon="akar-icons:linkedin-fill"
                    className="w-6 h-6"
                  />
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.tiktok.com/@melios_app"
                  target="_blank"
                  className="hover:text-gray-300 text-default-100"
                  aria-label="Tiktok"
                >
                  <Icon
                    icon="akar-icons:tiktok-fill"
                    className="w-6 h-6"
                  />
                </Link>
              </li>
              <li>
                <Link
                  href="https://instagram.com/melios_app"
                  className="hover:text-gray-300 text-default-100"
                  aria-label="Instagram"
                  target="_blank"
                >
                  <Icon
                    icon="akar-icons:instagram-fill"
                    className="w-6 h-6"
                  />
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com/raphplt/melios"
                  className="hover:text-gray-300 text-default-100"
                  aria-label="Github"
                  target="_blank"
                >
                  <Icon
                    icon="akar-icons:github-fill"
                    className="w-6 h-6"
                  />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className=" py-4">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Melios. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
