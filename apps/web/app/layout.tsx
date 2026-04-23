import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import { ThemeProvider } from "@/contexts/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://tcg-nexus.org";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TCG Nexus — La plateforme ultime du jeu de cartes",
    template: "%s · TCG Nexus",
  },
  description:
    "TCG Nexus : catalogue Pokémon, marketplace, decks, tournois et collections. La nouvelle référence pour les joueurs et collectionneurs de cartes.",
  keywords: [
    "TCG",
    "Pokémon",
    "cartes à collectionner",
    "marketplace",
    "deck builder",
    "tournois",
    "collection",
    "Trading Card Game",
  ],
  authors: [{ name: "TCG Nexus" }],
  creator: "TCG Nexus",
  applicationName: "TCG Nexus",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "TCG Nexus",
    title: "TCG Nexus — La plateforme ultime du jeu de cartes",
    description:
      "Catalogue Pokémon, marketplace, decks, tournois et collections — tout ce qu'il faut pour jouer et collectionner.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TCG Nexus",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TCG Nexus",
    description:
      "Catalogue, marketplace, decks et tournois pour les joueurs de TCG.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ThemeProvider>
          <ClientProviders>{children}</ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
