"use client";
import Image from "next/image";
import React from "react";
import SearchBar from "./SearchBar";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "../ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut } from "lucide-react";

const Header = () => {
  const linkStyle =
    "text-foreground hover:text-foreground/80 transition-all duration-300 hover:underline hover:underline-offset-4";
  const { isAuthenticated, user, logout } = useAuth();

  const getUserInitials = (firstName: string, lastName: string) => {
    return (
      `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() ||
      "U"
    );
  };

  const getUserDisplayName = (firstName: string, lastName: string) => {
    return `${firstName} ${lastName}`.trim() || "Utilisateur";
  };

  return (
    <div className="fixed top-0 left-0 w-full h-16 bg-background/80 backdrop-blur-md shadow-md border-b border-border flex items-center justify-between px-8 z-[9999]">
      <Link href="/">
        <Image
          src="/images/Logo_Large.png"
          alt="TCG Nexus"
          width={80}
          height={80}
          className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain"
          priority
        />
      </Link>

      <SearchBar />
      <nav>
        <ul className="flex space-x-6 items-center">
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
          {!isAuthenticated && (
            <li>
              <ThemeToggle />
            </li>
          )}
          {isAuthenticated && user ? (
            <>
              <li>
                <Link
                  href="/dashboard"
                  className={linkStyle}
                >
                  Tableau de bord
                </Link>
              </li>
              <li>
                <ThemeToggle />
              </li>
              <li>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src=""
                          alt={`${user.firstName} ${user.lastName}`}
                        />
                        <AvatarFallback>
                          {getUserInitials(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 z-[10000]"
                    align="end"
                    forceMount
                  >
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {getUserDisplayName(user.firstName, user.lastName)}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile"
                        className="cursor-pointer"
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span>Profil</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={logout}
                      className="cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Se déconnecter</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            </>
          ) : (
            <>
              <li>
                <Button asChild>
                  <Link href="/auth/login">Se connecter</Link>
                </Button>
              </li>
              <li>
                <Button
                  asChild
                  variant="secondary"
                >
                  <Link href="/auth/register">S&apos;inscrire</Link>
                </Button>
              </li>
            </>
          )}
        </ul>
      </nav>
    </div>
  );
};

export default Header;
