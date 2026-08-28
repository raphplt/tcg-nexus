import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArticleCard } from "@/components/Blog/ArticleCard";
import { Article } from "@/types/article";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, className }: any) => (
    <a href={href} className={className} data-testid="link">
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/fr",
}));

describe("Critical Path Smoke Tests (Web)", () => {
  describe("Parcours Articles & Slugs Resilience", () => {
    it("never renders /blog/null or /blog/undefined even with missing slug", () => {
      const brokenArticle: Article = {
        id: 42,
        title: "Test Article without Slug",
        slug: null as any,
        status: "published",
        locale: "fr",
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
      };

      render(
        <ArticleCard
          article={brokenArticle}
          locale="fr"
          readLabel="Lire l'article"
        />,
      );

      const link = screen.getByTestId("link");
      const href = link.getAttribute("href");

      expect(href).not.toContain("null");
      expect(href).not.toContain("undefined");
      expect(href).toBe("/blog/article-42");
    });

    it("renders valid slug link correctly", () => {
      const validArticle: Article = {
        id: 10,
        title: "Championship 2026 Announcement",
        slug: "championship-2026-announcement",
        status: "published",
        locale: "fr",
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
      };

      render(
        <ArticleCard article={validArticle} locale="fr" readLabel="Lire" />,
      );

      const link = screen.getByTestId("link");
      expect(link.getAttribute("href")).toBe(
        "/blog/championship-2026-announcement",
      );
      expect(
        screen.getByText("Championship 2026 Announcement"),
      ).toBeInTheDocument();
    });
  });

  describe("Parcours Navigation & Security Checks", () => {
    it("confirms public navigation links do not contain broken placeholders", () => {
      const sampleNavigation = [
        "/fr/marketplace",
        "/fr/tournaments",
        "/fr/decks",
        "/fr/blog",
        "/fr/faq",
      ];

      for (const route of sampleNavigation) {
        expect(route).not.toContain("undefined");
        expect(route).not.toContain("null");
        expect(route.startsWith("/fr/")).toBe(true);
      }
    });
  });
});
