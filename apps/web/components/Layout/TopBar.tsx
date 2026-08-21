"use client";

import {
  ClipboardList,
  LogOut,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  User,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import CartDropdown from "@/components/Marketplace/CartDropdown";
import { CurrencySelector } from "@/components/Shared/CurrencySelector";
import { LocaleSelector } from "@/components/Shared/LocaleSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@/i18n/navigation";
import { getUserDisplayName, getUserInitials } from "@/utils/text";
import { NotificationBell } from "./NotificationBell";
import SearchBar from "./SearchBar";

export function TopBar() {
  const t = useTranslations("Navigation");
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthLoading = !mounted || isLoading;
  const showAuthButtons = !isAuthLoading && !isAuthenticated;
  const showUserMenu = !isAuthLoading && isAuthenticated && user;

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center gap-2 overflow-hidden border-b border-border bg-background px-2 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 hidden h-4 sm:block" />

      <Link href="/" className="mr-2 hidden shrink-0 sm:block md:hidden">
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

      <div className="min-w-0 flex-1">
        <SearchBar />
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div className="hidden md:block">
          <LocaleSelector />
        </div>
        <div className="hidden sm:block">
          <CurrencySelector />
        </div>
        <ThemeToggle />
        {isAuthenticated && <CartDropdown />}
        {isAuthenticated && <NotificationBell />}

        {isAuthLoading ? (
          <Skeleton className="h-8 w-8 rounded-full" />
        ) : showAuthButtons ? (
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link href="/auth/login" aria-label={t("login")}>
                <User className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">{t("login")}</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link href="/auth/register">{t("register")}</Link>
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
                <Link
                  href="/profile"
                  prefetch={false}
                  className="flex items-center"
                >
                  <User className="mr-2 h-4 w-4" /> {t("profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/settings"
                  prefetch={false}
                  className="flex items-center"
                >
                  <Settings className="mr-2 h-4 w-4" /> {t("settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/cart"
                  prefetch={false}
                  className="flex items-center"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" /> {t("cart")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/orders"
                  prefetch={false}
                  className="flex items-center"
                >
                  <ClipboardList className="mr-2 h-4 w-4" /> {t("orders")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/marketplace/sales"
                  prefetch={false}
                  className="flex items-center"
                >
                  <Package className="mr-2 h-4 w-4" /> {t("sales")}
                </Link>
              </DropdownMenuItem>
              {user.role === "admin" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/admin"
                      prefetch={false}
                      className="flex items-center"
                    >
                      <Shield className="mr-2 h-4 w-4" /> {t("admin")}
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="flex items-center cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" /> {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
