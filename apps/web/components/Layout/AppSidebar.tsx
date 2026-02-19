"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Home,
  ShoppingBag,
  Trophy,
  Library,
  FolderHeart,
  LayoutDashboard,
  ShoppingCart,
  HelpCircle,
  Shield,
  User,
  LogIn,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requireAuth?: boolean;
  requireRole?: "admin";
}

const mainNavItems: NavItem[] = [
  { label: "Accueil", href: "/", icon: Home },
  { label: "Marketplace", href: "/marketplace", icon: ShoppingBag },
  { label: "Tournois", href: "/tournaments", icon: Trophy },
  { label: "Decks", href: "/decks", icon: Library },
];

const userNavItems: NavItem[] = [
  { label: "Collection", href: "/collection", icon: FolderHeart, requireAuth: true },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requireAuth: true },
  { label: "Panier", href: "/cart", icon: ShoppingCart, requireAuth: true },
];

const secondaryNavItems: NavItem[] = [
  { label: "FAQ", href: "/faq", icon: HelpCircle },
];

const adminNavItems: NavItem[] = [
  { label: "Admin", href: "/admin", icon: Shield, requireRole: "admin" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const renderNavItems = (items: NavItem[]) => {
    return items
      .filter((item) => {
        if (item.requireAuth && !isAuthenticated) return false;
        if (item.requireRole && user?.role !== item.requireRole) return false;
        return true;
      })
      .map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item.href)}
            tooltip={item.label}
            className={
              isActive(item.href)
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[4px_4px_0px_0px] shadow-border font-semibold"
                : "hover:translate-x-0.5 transition-transform"
            }
          >
            <Link href={item.href}>
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ));
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-2 border-border"
    >
      <SidebarHeader className="border-b-2 border-border p-4 group-data-[collapsible=icon]:p-2">
        <Link
          href="/"
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
        >
          <div className="relative w-8 h-8 shrink-0">
            <Image
              src="/images/Logo.png"
              alt="TCG Nexus"
              fill
              sizes="32px"
              className="object-contain"
            />
          </div>
          <span className="font-heading font-bold text-lg group-data-[collapsible=icon]:hidden">
            TCG Nexus
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>{renderNavItems(mainNavItems)}</SidebarMenu>
        </SidebarGroup>

        {isAuthenticated && (
          <SidebarGroup>
            <SidebarGroupLabel>Mon espace</SidebarGroupLabel>
            <SidebarMenu>{renderNavItems(userNavItems)}</SidebarMenu>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Aide</SidebarGroupLabel>
          <SidebarMenu>{renderNavItems(secondaryNavItems)}</SidebarMenu>
        </SidebarGroup>

        {user?.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>{renderNavItems(adminNavItems)}</SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t-2 border-border">
        {isAuthenticated && user ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={user.email}
              >
                <Link
                  href="/profile"
                  className="flex items-center gap-3"
                >
                  <User className="h-5 w-5" />
                  <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-medium truncate">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Se connecter"
              >
                <Link href="/auth/login">
                  <LogIn className="h-5 w-5" />
                  <span>Se connecter</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
