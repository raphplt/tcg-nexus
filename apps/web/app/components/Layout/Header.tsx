"use client";
import { Button, Input, Link } from "@heroui/react";
import { Icon } from "@iconify/react/dist/iconify.js";
import Image from "next/image";
import React from "react";

const Header = () => {
  return (
    <div className="fixed top-0 left-0 w-full h-16 bg-white bg-opacity-30 backdrop-blur-md shadow-md flex items-center justify-between px-10 z-[9999]">
      <Image
        src="/images/Logo.png"
        alt="TCG Nexus"
        width={100}
        height={100}
      />
      <nav>
        <ul className="flex space-x-6 font-semibold items-center">
          <li>
            <Input
              placeholder="Rechercher"
              startContent={<Icon icon="mdi:search" />}
            />
          </li>
          <li>
            <Link href="#">Accueil</Link>
          </li>
          <li>
            <Link href="#">Tournois</Link>
          </li>
          <li>
            <Link href="#">Marketplace</Link>
          </li>
          <li>
            <Link href="#">Stratégie</Link>
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