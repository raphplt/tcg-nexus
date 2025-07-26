import type { Metadata } from "next";
import "./globals.css";
import Header from "@components/Layout/Header";
import Footer from "@components/Layout/Footer";
import Script from "next/script";
import { AuthProvider } from "@/contexts/AuthContext";
import { ReactQueryProvider } from "@/contexts/QueryClientContext";
import { Toaster } from 'sonner';
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
      <head>
        <Script
          id="theme-script"
          src="/lib/theme-script.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased">
        <ReactQueryProvider>
          <AuthProvider>
            <Header />
            <div className="mt-16 min-h-screen">{children}</div>
            <Toaster position="top-right"/>
            <Footer />
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
