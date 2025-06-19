"use client";
import Image from "next/image";
import React from "react";
import SearchBar from "./SearchBar";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const Header = () => {
  const linkStyle =
    "text-foreground hover:text-foreground/80 transition-all duration-300 hover:underline hover:underline-offset-4";

  return (
    <div className="fixed top-0 left-0 w-full h-16 bg-background/80 backdrop-blur-md shadow-md border-b border-border flex items-center justify-between px-10 z-[9999]">
      <Link href="/">
        <Image
          src="/images/Logo_Large.png"
          alt="TCG Nexus"
          width={100}
          height={100}
          className="h-10 w-auto"
        />
      </Link>
      <SearchBar />

      <nav>
        <ul className="flex space-x-6 font-semibold items-center">
          <li>
            <Link
              href="/"
              className={linkStyle}
            >
              Accueil
            </Link>
          </li>
          <li>
            <Link
              href="/tournaments"
              className={linkStyle}
            >
              Tournois
            </Link>
          </li>
          <li>
            <Link
              href="/marketplace"
              className={linkStyle}
            >
              Marketplace
            </Link>
          </li>
          <li>
            <Link
              href="/strategy"
              className={linkStyle}
            >
              Stratégie
            </Link>
          </li>
          <li>
            <ThemeToggle />
          </li>
          <li>
            <button className="font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-md transition-colors">
              Se connecter
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Header;
