import {
  ClipboardList,
  Dices,
  FolderHeart,
  HelpCircle,
  Home,
  Import,
  LayoutDashboard,
  Library,
  Medal,
  Package,
  PackageCheck,
  PenLine,
  Newspaper,
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
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requireAuth?: boolean;
  requireRole?: "admin";
  requireRoles?: Array<"admin" | "moderator">;
  subItems?: SubItem[];
}

const mainNavItems: NavItem[] = [
  { labelKey: "home", href: "/", icon: Home },
  {
    labelKey: "marketplace",
    href: "/marketplace",
    icon: ShoppingBag,
    subItems: [
      { labelKey: "browse", href: "/marketplace", icon: Search },
      { labelKey: "cards", href: "/marketplace/cards", icon: ShoppingBag },
      {
        labelKey: "sealedProducts",
        href: "/marketplace/sealed",
        icon: Package,
      },
      {
        labelKey: "createListing",
        href: "/marketplace/create",
        icon: PenLine,
      },
      {
        labelKey: "cart",
        href: "/cart",
        icon: ShoppingCart,
      },
    ],
  },
  { labelKey: "play", href: "/play", icon: Swords },
  { labelKey: "leaderboard", href: "/ranking", icon: Medal },
  {
    labelKey: "tournaments",
    href: "/tournaments",
    icon: Trophy,
    subItems: [
      { labelKey: "browse", href: "/tournaments", icon: Search },
      {
        labelKey: "createTournament",
        href: "/tournaments/create",
        icon: Plus,
      },
    ],
  },
  {
    labelKey: "decks",
    href: "/decks",
    icon: Library,
    subItems: [
      { labelKey: "browse", href: "/decks", icon: Search },
      { labelKey: "createDeck", href: "/decks/create", icon: Plus },
      { labelKey: "importDeck", href: "/decks/import", icon: Import },
    ],
  },
];

const discoverNavItems: NavItem[] = [
  { labelKey: "blog", href: "/blog", icon: Newspaper },
  { labelKey: "pokedex", href: "/pokemon", icon: Store },
  {
    labelKey: "miniGames",
    href: "/pokemon/mini-games",
    icon: Dices,
  },
];

const userNavItems: NavItem[] = [
  {
    labelKey: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    requireAuth: true,
    subItems: [
      { labelKey: "overview", href: "/dashboard", icon: LayoutDashboard },
      {
        labelKey: "myTournaments",
        href: "/dashboard/my-tournaments",
        icon: Trophy,
      },
    ],
  },
  {
    labelKey: "collection",
    href: "/collection",
    icon: FolderHeart,
    requireAuth: true,
  },
  {
    labelKey: "myDecks",
    href: "/decks/me",
    icon: Library,
    requireAuth: true,
  },
  {
    labelKey: "cart",
    href: "/cart",
    icon: ShoppingCart,
    requireAuth: true,
  },
  {
    labelKey: "myOrders",
    href: "/orders",
    icon: ClipboardList,
    requireAuth: true,
  },
  {
    labelKey: "mySales",
    href: "/marketplace/sales",
    icon: PackageCheck,
    requireAuth: true,
  },
  {
    labelKey: "settings",
    href: "/settings",
    icon: Settings,
    requireAuth: true,
  },
];

const secondaryNavItems: NavItem[] = [
  { labelKey: "faq", href: "/faq", icon: HelpCircle },
];

const adminNavItems: NavItem[] = [
  { labelKey: "admin", href: "/admin", icon: Shield, requireRole: "admin" },
  {
    labelKey: "manageBlog",
    href: "/blog/manage",
    icon: PenLine,
    requireRoles: ["admin", "moderator"],
  },
];

export const navItems = {
  main: mainNavItems,
  discover: discoverNavItems,
  user: userNavItems,
  secondary: secondaryNavItems,
  admin: adminNavItems,
};
