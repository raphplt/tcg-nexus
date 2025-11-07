"use client";

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { marketplaceService } from "@/services/marketplace.service";

// Translations
const translations = {
  home: "Accueil",
  marketplace: "Marketplace",
  cards: "Cartes",
  cardDetail: "Détail de la carte",
  sellers: "Vendeurs",
  sellerDetail: "Profil vendeur",
  create: "Créer une vente",
};

export function MarketplaceBreadcrumb() {
  const pathname = usePathname();
  const params = useParams();

  // Get card name if on card detail page
  const { data: card } = useQuery({
    queryKey: ["pokemon-card", params.id],
    queryFn: () => pokemonCardService.getById(params.id as string),
    enabled: !!params.id && pathname.includes("/cards/"),
  });

  // Get seller name if on seller detail page
  const { data: sellerListings } = useQuery({
    queryKey: ["seller-listings", params.id],
    queryFn: () => marketplaceService.getSellerListings(parseInt(params.id as string)),
    enabled: !!params.id && pathname.includes("/sellers/") && !isNaN(parseInt(params.id as string)),
  });

  const seller = sellerListings?.[0]?.seller;

  const breadcrumbs = [];

  // Always start with Home
  breadcrumbs.push(
    <BreadcrumbItem key="home">
      <BreadcrumbLink asChild>
        <Link href="/">{translations.home}</Link>
      </BreadcrumbLink>
    </BreadcrumbItem>
  );

  // Add Marketplace
  if (pathname.startsWith("/marketplace")) {
    breadcrumbs.push(
      <BreadcrumbSeparator key="sep-1" />,
      <BreadcrumbItem key="marketplace">
        {pathname === "/marketplace" ? (
          <BreadcrumbPage>{translations.marketplace}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink asChild>
            <Link href="/marketplace">{translations.marketplace}</Link>
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
    );

    // Add Cards if on cards pages
    if (pathname.startsWith("/marketplace/cards")) {
      breadcrumbs.push(
        <BreadcrumbSeparator key="sep-2" />,
        <BreadcrumbItem key="cards">
          {pathname === "/marketplace/cards" ? (
            <BreadcrumbPage>{translations.cards}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/marketplace/cards">{translations.cards}</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
      );

      // Add card detail if on specific card page
      if (pathname.match(/^\/marketplace\/cards\/\d+$/)) {
        breadcrumbs.push(
          <BreadcrumbSeparator key="sep-3" />,
          <BreadcrumbItem key="card-detail">
            <BreadcrumbPage>
              {card?.name || translations.cardDetail}
            </BreadcrumbPage>
          </BreadcrumbItem>
        );
      }
    }

    // Add Sellers if on sellers pages
    if (pathname.startsWith("/marketplace/sellers")) {
      breadcrumbs.push(
        <BreadcrumbSeparator key="sep-2" />,
        <BreadcrumbItem key="sellers">
          {pathname === "/marketplace/sellers" ? (
            <BreadcrumbPage>{translations.sellers}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/marketplace/sellers">{translations.sellers}</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
      );

      // Add seller detail if on specific seller page
      if (pathname.match(/^\/marketplace\/sellers\/\d+$/)) {
        breadcrumbs.push(
          <BreadcrumbSeparator key="sep-3" />,
          <BreadcrumbItem key="seller-detail">
            <BreadcrumbPage>
              {seller
                ? `${seller.firstName} ${seller.lastName}`
                : translations.sellerDetail}
            </BreadcrumbPage>
          </BreadcrumbItem>
        );
      }
    }

    // Add Create if on create page
    if (pathname === "/marketplace/create") {
      breadcrumbs.push(
        <BreadcrumbSeparator key="sep-2" />,
        <BreadcrumbItem key="create">
          <BreadcrumbPage>{translations.create}</BreadcrumbPage>
        </BreadcrumbItem>
      );
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>{breadcrumbs}</BreadcrumbList>
    </Breadcrumb>
  );
}

