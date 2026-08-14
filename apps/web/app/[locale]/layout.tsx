import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import ClientProviders from "@/components/ClientProviders";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import {
  LOCALE_TAGS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/i18n/config";
import { routing } from "@/i18n/routing";

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tcg-nexus.org";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  const alternateLanguages = Object.fromEntries(
    SUPPORTED_LOCALES.map((l) => [l, `/${l}`]),
  );

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    keywords: t("keywords").split(", "),
    authors: [{ name: "TCG Nexus" }],
    creator: "TCG Nexus",
    applicationName: "TCG Nexus",
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...alternateLanguages,
        "x-default": `/${routing.defaultLocale}`,
      },
    },
    openGraph: {
      type: "website",
      locale: LOCALE_TAGS[locale],
      alternateLocale: SUPPORTED_LOCALES.filter((l) => l !== locale).map(
        (l) => LOCALE_TAGS[l],
      ),
      url: `${SITE_URL}/${locale}`,
      siteName: "TCG Nexus",
      title: t("ogTitle"),
      description: t("ogDescription"),
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
      description: t("twitterDescription"),
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
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // NOTE: This marks localized pages as statically renderable.
  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <NextIntlClientProvider>
          <ThemeProvider>
            <ClientProviders>{children}</ClientProviders>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
