"use client";
import Image from "next/image";
import React, { useEffect } from "react";
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
import { usePathname } from "next/navigation";
import { FULLSCREEN_PATHS } from "@/utils/constants";
import { getUserInitials, getUserDisplayName } from "@/utils/text";

const Header = () => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  const currentPath = usePathname();

  const isFullscreenPath = FULLSCREEN_PATHS.includes(currentPath);

  if (isFullscreenPath) {
    return null;
  }

  let linkStyle;
  return (
    <header
      className="fixed inset-x-0 top-0 h-16 bg-background/90 backdrop-blur-md border-b
    border-border shadow-sm flex items-center px-4 sm:px-8 z-50"
    >
      <Link
        href="/"
        className="flex-shrink-0 mr-4"
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

      <div className="flex-1 min-w-0 mx-4">
        <SearchBar />
      </div>

      <nav className="flex-shrink-0">
        <ul className="flex items-center space-x-2 sm:space-x-4 text-sm">
          <li className="hidden sm:block">
            <Link
              href="/"
              className="link-style"
            >
              Accueil
            </Link>
          </li>
          <li className="hidden md:block">
            <Link
              href="/tournaments"
              className="link-style"
            >
              Tournois
            </Link>
          </li>
          <li className="hidden lg:block">
            <Link
              href="/marketplace"
              className="link-style"
            >
              Marketplace
            </Link>
          </li>
          <li className="hidden lg:block">
            <Link
              href="/decks"
              className={linkStyle}
            >
              Decks
            </Link>
          </li>

          <li>
            <Link
              href="/strategy"
              className="link-style"
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
                  href="/collection"
                  className="link-style"
                >
                  Collection
                </Link>
              </li>

              {/* <li>
                <Link
                  href="/dashboard"
                  className="link-style"
                >
                  Tableau de bord
                </Link>
              </li> */}
              <li>
                <ThemeToggle />
              </li>
              <li>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 rounded-full p-0"
                    >
                      <Avatar className="h-8 w-8">
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
