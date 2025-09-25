import type { Metadata } from "next";
import "./globals.css";
import Header from "@components/Layout/Header";
import Footer from "@components/Layout/Footer";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import ClientProviders from "@/components/ClientProviders";
import { Toaster } from "react-hot-toast";
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
            <Header />
            <div className="mt-16 min-h-screen">{children}</div>
            <Toaster />
            <Footer />
          </ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
