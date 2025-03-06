"use client";
import { Button } from "@heroui/react";
import Image from "next/image";
import React from "react";

const Header = () => {
  return (
    <div className="fixed top-0 left-0 w-full h-16 bg-white shadow-md flex items-center justify-between px-10">
      <Image
        src="/images/Logo.png"
        alt="TCG Nexus"
        width={100}
        height={100}
      />
      <nav>
        <ul className="flex space-x-5 font-semibold text-sm items-center">
          <li>
            <a href="#">Accueil</a>
          </li>
          <li>
            <a href="#">Decks</a>
          </li>
          <li>
            <a href="#">Marketplace</a>
          </li>
          <li>
            <a href="#">Communauté</a>
          </li>
          <li>
            <Button
              color="primary"
              className="font-semibold text-white"
              radius="sm"
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
