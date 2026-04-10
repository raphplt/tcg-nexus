import {
  Dices,
  FolderHeart,
  HelpCircle,
  Home,
  Import,
  LayoutDashboard,
  Library,
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
} from "lucide-react";

export interface SubItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requireAuth?: boolean;
  requireRole?: "admin";
  subItems?: SubItem[];
}

const mainNavItems: NavItem[] = [
  { label: "Accueil", href: "/", icon: Home },
  {
    label: "Marketplace",
    href: "/marketplace",
    icon: ShoppingBag,
    subItems: [
      { label: "Cartes", href: "/marketplace/cards", icon: Search },
      {
        label: "Produits scellés",
        href: "/marketplace/sealed",
        icon: Package,
      },
      {
        label: "Créer une annonce",
        href: "/marketplace/create",
        icon: PenLine,
      },
    ],
  },
  { label: "Jouer", href: "/play", icon: Swords },
  {
    label: "Tournois",
    href: "/tournaments",
    icon: Trophy,
    subItems: [
      { label: "Explorer", href: "/tournaments", icon: Search },
      {
        label: "Créer un tournoi",
        href: "/tournaments/create",
        icon: Plus,
      },
    ],
  },
  {
    label: "Decks",
    href: "/decks",
    icon: Library,
    subItems: [
      { label: "Explorer", href: "/decks", icon: Search },
      { label: "Créer un deck", href: "/decks/create", icon: Plus },
      { label: "Importer", href: "/decks/import", icon: Import },
    ],
  },
];

const discoverNavItems: NavItem[] = [
  { label: "Pokedex", href: "/pokemon", icon: Store },
  {
    label: "Smash or Pass",
    href: "/pokemon/smash-or-pass",
    icon: Dices,
  },
];

const userNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    requireAuth: true,
    subItems: [
      { label: "Vue d'ensemble", href: "/dashboard", icon: LayoutDashboard },
      {
        label: "Mes tournois",
        href: "/dashboard/my-tournaments",
        icon: Trophy,
      },
    ],
  },
  {
    label: "Collection",
    href: "/collection",
    icon: FolderHeart,
    requireAuth: true,
  },
  {
    label: "Mes decks",
    href: "/decks/me",
    icon: Library,
    requireAuth: true,
  },
  {
    label: "Mes commandes",
    href: "/orders",
    icon: ShoppingCart,
    requireAuth: true,
  },
  {
    label: "Paramètres",
    href: "/settings",
    icon: Settings,
    requireAuth: true,
  },
];

const secondaryNavItems: NavItem[] = [
  { label: "FAQ", href: "/faq", icon: HelpCircle },
];

const adminNavItems: NavItem[] = [
  { label: "Admin", href: "/admin", icon: Shield, requireRole: "admin" },
];

export const navItems = {
  main: mainNavItems,
  discover: discoverNavItems,
  user: userNavItems,
  secondary: secondaryNavItems,
  admin: adminNavItems,
};
