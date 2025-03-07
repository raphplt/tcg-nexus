"use client";
import { Button, Input, Link } from "@heroui/react";
import { Search } from "lucide-react";
import Image from "next/image";
import React from "react";
import SearchBar from "./SearchBar";

const Header = () => {
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
      <nav>
        <ul className="flex space-x-6 font-semibold items-center">
          <li>
            <SearchBar />
          </li>
          <li>
            <Link href="/">Accueil</Link>
          </li>
          <li>
            <Link href="/tournaments">Tournois</Link>
          </li>
          <li>
            <Link href="/marketplace">Marketplace</Link>
          </li>
          <li>
            <Link href="/strategy">Stratégie</Link>
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
