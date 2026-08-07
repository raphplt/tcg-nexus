"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { marketplaceService } from "@/services/marketplace.service";
import { pokemonCardService } from "@/services/pokemonCard.service";

export function MarketplaceBreadcrumb() {
  const t = useTranslations("Breadcrumb");
  const pathname = usePathname();
  const params = useParams();

  // Get card name if on card detail page
  const { data: card } = useQuery({
    queryKey: ["pokemon-card", params.id],
    queryFn: () => pokemonCardService.getById(params.id as string),
    enabled: !!params.id && pathname.includes("/cards/"),
  });

  // Get seller name if on seller detail page
  const { data: sellerStats } = useQuery({
    queryKey: ["seller-stats", params.id ? parseInt(params.id as string) : 0],
    queryFn: () =>
      marketplaceService.getSellerStatistics(parseInt(params.id as string)),
    enabled:
      !!params.id &&
      pathname.includes("/sellers/") &&
      !isNaN(parseInt(params.id as string)),
  });

  const seller = sellerStats?.seller;

  const breadcrumbs = [];

  // Always start with Home
  breadcrumbs.push(
    <BreadcrumbItem key="home">
      <BreadcrumbLink asChild>
        <Link href="/">{t("home")}</Link>
      </BreadcrumbLink>
    </BreadcrumbItem>,
  );

  // Add Marketplace
  if (pathname.startsWith("/marketplace")) {
    breadcrumbs.push(
      <BreadcrumbSeparator key="sep-1" />,
      <BreadcrumbItem key="marketplace">
        {pathname === "/marketplace" ? (
          <BreadcrumbPage>{t("marketplace")}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink asChild>
            <Link href="/marketplace">{t("marketplace")}</Link>
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>,
    );

    // Add Cards if on cards pages
    if (pathname.startsWith("/marketplace/cards")) {
      breadcrumbs.push(
        <BreadcrumbSeparator key="sep-2" />,
        <BreadcrumbItem key="cards">
          {pathname === "/marketplace/cards" ? (
            <BreadcrumbPage>{t("cards")}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/marketplace/cards">{t("cards")}</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>,
      );

      // Add card detail if on specific card page
      if (pathname.match(/^\/marketplace\/cards\/[^/]+$/)) {
        breadcrumbs.push(
          <BreadcrumbSeparator key="sep-3" />,
          <BreadcrumbItem key="card-detail">
            <BreadcrumbPage>{card?.name || t("cardDetail")}</BreadcrumbPage>
          </BreadcrumbItem>,
        );
      }
    }

    // Add Sealed products if on sealed pages
    if (pathname.startsWith("/marketplace/sealed")) {
      breadcrumbs.push(
        <BreadcrumbSeparator key="sep-2" />,
        <BreadcrumbItem key="sealed">
          {pathname === "/marketplace/sealed" ? (
            <BreadcrumbPage>{t("sealed")}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/marketplace/sealed">{t("sealed")}</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>,
      );

      if (pathname.match(/^\/marketplace\/sealed\/[^/]+$/)) {
        breadcrumbs.push(
          <BreadcrumbSeparator key="sep-3" />,
          <BreadcrumbItem key="sealed-detail">
            <BreadcrumbPage>{t("sealedDetail")}</BreadcrumbPage>
          </BreadcrumbItem>,
        );
      }
    }

    // Add Sellers if on sellers pages
    if (pathname.startsWith("/marketplace/sellers")) {
      breadcrumbs.push(
        <BreadcrumbSeparator key="sep-2" />,
        <BreadcrumbItem key="sellers">
          {pathname === "/marketplace/sellers" ? (
            <BreadcrumbPage>{t("sellers")}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/marketplace/sellers">{t("sellers")}</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>,
      );

      // Add seller detail if on specific seller page
      if (pathname.match(/^\/marketplace\/sellers\/\d+$/)) {
        breadcrumbs.push(
          <BreadcrumbSeparator key="sep-3" />,
          <BreadcrumbItem key="seller-detail">
            <BreadcrumbPage>
              {seller
                ? `${seller.firstName} ${seller.lastName}`
                : t("sellerDetail")}
            </BreadcrumbPage>
          </BreadcrumbItem>,
        );
      }
    }

    // Add Create if on create page
    if (pathname === "/marketplace/create") {
      breadcrumbs.push(
        <BreadcrumbSeparator key="sep-2" />,
        <BreadcrumbItem key="create">
          <BreadcrumbPage>{t("create")}</BreadcrumbPage>
        </BreadcrumbItem>,
      );
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>{breadcrumbs}</BreadcrumbList>
    </Breadcrumb>
  );
}
