import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import ClientProviders from "@/components/ClientProviders";
import LayoutContent from "@/components/Layout/LayoutContent";

const lato = Lato({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-lato",
  display: "swap",
});

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
      <body className={`${lato.variable} antialiased`}>
        <ThemeProvider>
          <ClientProviders>
            <LayoutContent>{children}</LayoutContent>
          </ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
