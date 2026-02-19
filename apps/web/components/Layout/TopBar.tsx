"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SearchBar from "./SearchBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { User, LogOut, ShoppingCart, Shield } from "lucide-react";
import { getUserInitials, getUserDisplayName } from "@/utils/text";

export function TopBar() {
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthLoading = !mounted || isLoading;
  const showAuthButtons = !isAuthLoading && !isAuthenticated;
  const showUserMenu = !isAuthLoading && isAuthenticated && user;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b-2 border-border bg-background/95 backdrop-blur-md px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <Link href="/" className="shrink-0 mr-2 md:hidden">
        <div className="relative w-8 h-8">
          <Image
            src="/images/Logo_Large.png"
            alt="TCG Nexus"
            fill
            sizes="32px"
            className="object-contain"
            priority
          />
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <SearchBar />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        {isAuthLoading ? (
          <Skeleton className="h-8 w-8 rounded-full" />
        ) : showAuthButtons ? (
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link href="/auth/login">Se connecter</Link>
            </Button>
            <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
              <Link href="/auth/register">S&apos;inscrire</Link>
            </Button>
          </div>
        ) : showUserMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
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
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {getUserDisplayName(user.firstName, user.lastName)}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" /> Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/orders" className="flex items-center">
                  <ShoppingCart className="mr-2 h-4 w-4" /> Mes Commandes
                </Link>
              </DropdownMenuItem>
              {user.role === "admin" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center">
                      <Shield className="mr-2 h-4 w-4" /> Admin
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="flex items-center cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" /> Se deconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
