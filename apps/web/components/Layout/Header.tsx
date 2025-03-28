"use client";
import { Button, Link } from "@heroui/react";
import Image from "next/image";
import React from "react";
import SearchBar from "./SearchBar";

const Header = () => {
  const linkStyle =
    "text-gray-950 hover:text-gray-800 transition-all duration-300 hover:underline hover:underline-offset-4";

  return (
    <div className="fixed top-0 left-0 w-full h-16 bg-white bg-opacity-30 backdrop-blur-md shadow-md flex items-center justify-between px-10 z-[9999]">
      <Link href="/">
        <Image
          src="/images/Logo.png"
          alt="TCG Nexus"
          width={100}
          height={100}
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
            <Button
              color="primary"
              className="font-semibold text-white"
            >
              Se connecter
            </Button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Header;
