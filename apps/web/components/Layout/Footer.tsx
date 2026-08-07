import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

const linkClass =
  "text-sm text-muted-foreground hover:text-foreground transition-colors";

export default function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/images/Logo.png"
                alt="TCG Nexus"
                width={48}
                height={48}
                className="rounded-none"
              />
              <h3 className="text-xl font-bold text-foreground">TCG Nexus</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t("tagline")}</p>
            <div className="flex space-x-3">
              <a
                href="https://github.com/raphplt/tcg-nexus"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Icon icon="akar-icons:github-fill" className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/company/tcg-nexus"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Icon icon="akar-icons:linkedin-fill" className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/tcgnexus"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Icon icon="akar-icons:twitter-fill" className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">
              {t("navigation")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className={linkClass}>
                  {t("home")}
                </Link>
              </li>
              <li>
                <Link href="/tournaments" className={linkClass}>
                  {t("tournaments")}
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className={linkClass}>
                  {t("marketplace")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className={linkClass}>
                  {t("faq")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">
              {t("resources")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/pokemon" className={linkClass}>
                  {t("pokemonCards")}
                </Link>
              </li>
              <li>
                <Link href="/decks" className={linkClass}>
                  {t("deckBuilder")}
                </Link>
              </li>
              <li>
                <Link href="/collection" className={linkClass}>
                  {t("myCollection")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">
              {t("legal")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("legalNotice")}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {t("copyright", { year: new Date().getFullYear() })}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{t("madeWithLove")}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
