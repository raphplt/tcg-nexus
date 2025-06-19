import type { Metadata } from "next";
import "./globals.css";
import Header from "@components/Layout/Header";
import Footer from "@components/Layout/Footer";
import Script from "next/script";

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
          strategy="beforeInteractive"
        >
          {`
            (function() {
              function getThemePreference() {
                if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
                  return localStorage.getItem('theme');
                }
                return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              }
              
              function setTheme(theme) {
                if (theme === 'light' || theme === 'dark') {
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(theme);
                  document.documentElement.setAttribute('data-theme', theme);
                } else {
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(systemTheme);
                  document.documentElement.setAttribute('data-theme', systemTheme);
                }
              }

              const theme = getThemePreference();
              setTheme(theme);
            })();
          `}
        </Script>
      </head>
      <body className="antialiased">
        <Header />
        <div className="mt-16 min-h-screen">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
