import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import ClientProviders from "@/components/ClientProviders";
import LayoutContent from "@/components/Layout/LayoutContent";

export const metadata: Metadata = {
  title: "TCG Nexus",
  description: "La révolution du jeu de cartes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider>
          <ClientProviders>
            <LayoutContent>{children}</LayoutContent>
          </ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
