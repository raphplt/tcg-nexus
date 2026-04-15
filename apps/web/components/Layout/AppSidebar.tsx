"use client";

import {
  ChevronRight,
  Dices,
  FolderHeart,
  HelpCircle,
  Home,
  Import,
  LayoutDashboard,
  Library,
  LogIn,
  Package,
  PenLine,
  Plus,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Store,
  Swords,
  Trophy,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { NavItem, navItems } from "@/utils/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isGroupActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    return item.subItems?.some((sub) => isActive(sub.href)) ?? false;
  };

  const activeClass =
    "bg-sidebar-primary text-sidebar-primary-foreground shadow-[4px_4px_0px_0px] shadow-border font-semibold";
  const inactiveClass = "hover:translate-x-0.5 transition-transform";

  const renderNavItem = (item: NavItem) => {
    if (item.subItems && item.subItems.length > 0) {
      return (
        <Collapsible
          key={item.href}
          asChild
          defaultOpen={isGroupActive(item)}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip={item.label}
                className={isGroupActive(item) ? activeClass : inactiveClass}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.subItems.map((sub) => (
                  <SidebarMenuSubItem key={sub.href}>
                    <SidebarMenuSubButton asChild isActive={isActive(sub.href)}>
                      <Link href={sub.href}>
                        <sub.icon className="h-4 w-4" />
                        <span>{sub.label}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item.href)}
          tooltip={item.label}
          className={isActive(item.href) ? activeClass : inactiveClass}
        >
          <Link href={item.href}>
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const filterItems = (items: NavItem[]) =>
    items.filter((item) => {
      if (item.requireAuth && !isAuthenticated) return false;
      if (item.requireRole && user?.role !== item.requireRole) return false;
      return true;
    });

  return (
    <Sidebar collapsible="icon" className="border-r-2 border-border">
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
          <SidebarMenu>
            {filterItems(navItems.main).map(renderNavItem)}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Découvrir</SidebarGroupLabel>
          <SidebarMenu>
            {filterItems(navItems.discover).map(renderNavItem)}
          </SidebarMenu>
        </SidebarGroup>

        {isAuthenticated && (
          <SidebarGroup>
            <SidebarGroupLabel>Mon espace</SidebarGroupLabel>
            <SidebarMenu>
              {filterItems(navItems.user).map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Aide</SidebarGroupLabel>
          <SidebarMenu>
            {filterItems(navItems.secondary).map(renderNavItem)}
          </SidebarMenu>
        </SidebarGroup>

        {user?.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>
              {filterItems(navItems.admin).map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t-2 border-border">
        {isAuthenticated && user ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={user.email}>
                <Link href="/profile" className="flex items-center gap-3">
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
              <SidebarMenuButton asChild tooltip="Se connecter">
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
