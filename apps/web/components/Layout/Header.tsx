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
import { Skeleton } from "../ui/skeleton";

const Header = () => {
  const linkStyle =
    "text-foreground hover:text-foreground/80 transition-all duration-300 hover:underline hover:underline-offset-4";
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  const getUserInitials = (firstName: string, lastName: string) =>
    `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() ||
    "U";

  const getUserDisplayName = (firstName: string, lastName: string) =>
    `${firstName} ${lastName}`.trim() || "Utilisateur";

  return (
    <header className="fixed inset-x-0 top-0 h-16 bg-background/90 backdrop-blur-md border-b border-border shadow-sm flex items-center justify-between px-4 sm:px-8 z-50">
      {/* Logo avec taille minimale */}
      <Link
        href="/"
        className="flex-shrink-0"
      >
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20">
          <Image
            src="/images/Logo_Large.png"
            alt="TCG Nexus"
            fill
            sizes="(max-width: 640px) 56px, (max-width: 768px) 64px, 80px"
            className="object-contain"
            priority
          />
        </div>
      </Link>

      <div className="flex-1 px-4">
        <SearchBar />
      </div>

      <nav>
        <ul className="flex items-center space-x-4 text-sm">
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

          {isLoading ? (
            <li>
              <Skeleton className="h-8 w-8 rounded-full" />
            </li>
          ) : isAuthenticated && user ? (
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
                    <Button className="h-8 w-8 rounded-full p-0">
                      <Avatar
                        className="h-8 w-8"
                        color="blue"
                      >
                        <AvatarImage
                          src={user.avatarUrl || ""}
                          alt={`${user.firstName} ${user.lastName}`}
                        />
                        <AvatarFallback>
                          {getUserInitials(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    className="w-56"
                    align="end"
                    forceMount
                  >
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">
                          {getUserDisplayName(user.firstName, user.lastName)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile"
                        className="flex items-center"
                      >
                        <User className="mr-2 h-4 w-4" /> Profil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={logout}
                      className="flex items-center cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
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
                  <Link href="/auth/register">S’inscrire</Link>
                </Button>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
