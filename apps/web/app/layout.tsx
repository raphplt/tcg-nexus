import type { Metadata } from "next";
import "./globals.css";
import Header from "@components/Layout/Header";
import Footer from "@components/Layout/Footer";

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
    <html lang="fr">
      <body className={`antialiased `}>
        <Header />
        <div className="mt-16 min-h-screen">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
