"use client";
import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { marketplaceService } from "@/services/marketplace.service";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getCardStateColor } from "../utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Flag, ShoppingCart, Info, TrendingUp } from "lucide-react";
import Image from "next/image";
import { rarityToImage, typeToImage } from "@/utils/images";
import { slugify } from "@/utils/text";

const MOCK_COTE = {
  min: 8.5,
  avg: 10.2,
  max: 13.0,
  currency: "EUR",
  lastSales: [
    { date: "2024-06-01", price: 9.5 },
    { date: "2024-06-10", price: 10.0 },
    { date: "2024-06-15", price: 11.2 },
  ],
};

const Page = () => {
  const { id } = useParams();
  const {
    data: listing,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => marketplaceService.getListingById(id as string),
  });
  const [quantity, setQuantity] = useState(1);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-12">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-16 w-1/2" />
        <Skeleton className="h-10 w-1/3" />
      </div>
    );
  }
  if (error || !listing) {
    return (
      <Alert
        variant="destructive"
        className="max-w-2xl mx-auto mt-12"
      >
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          Impossible de charger la vente. Veuillez réessayer plus tard.
        </AlertDescription>
      </Alert>
    );
  }

  const handleAddToCart = () => {
    // TODO: Intégrer logique panier
    alert(`Ajouté ${quantity} au panier !`);
  };

  const handleReport = () => {
    setReportSent(true);
    setTimeout(() => {
      setReportOpen(false);
      setReportSent(false);
      setReportReason("");
    }, 2000);
  };

  const card = listing.pokemonCard;
  const seller = listing.seller;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row gap-8">
        <Card className="flex-1 flex flex-col items-center justify-center p-6 gap-4 ">
          <div className="w-full flex flex-col items-center gap-2">
            <Image
              src={card?.image + "/high.png"}
              alt={card?.name || "Carte inconnue"}
              width={260}
              height={360}
              className="rounded-lg shadow-lg border bg-white"
              priority
            />
            <div className="flex gap-2 mt-2">
              <Badge
                variant="outline"
                className="text-base px-3 py-1"
              >
                {card?.set?.name}
              </Badge>
              {card?.rarity && (
                <Badge
                  variant="outline"
                  className="text-base px-3 py-1"
                >
                  <Image
                    src={rarityToImage[slugify(card.rarity)] || ""}
                    alt={card.rarity}
                    width={16}
                    height={16}
                  />
                  {card.rarity}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-base px-3 py-1 ${getCardStateColor(listing.cardState)}`}
              >
                {listing.cardState}
              </Badge>
            </div>
          </div>
        </Card>
        <div className="flex-1 flex flex-col gap-6 justify-between">
          <Card className="shadow-lg border-2 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-3xl">
                {card.types?.map((type) => (
                  <Image
                    src={typeToImage[slugify(type.toLowerCase())] || ""}
                    alt={type}
                    width={24}
                    height={24}
                    key={type}
                  />
                ))}

                {card?.name || "Carte inconnue"}
                <span className="text-lg text-muted-foreground font-normal">
                  #{card?.localId}
                </span>
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                {card?.category}{" "}
                {card?.illustrator && <>· Illus. {card.illustrator}</>}
                {card?.stage && <>· {card.stage}</>}
                {card?.evolveFrom && <>· Évolue de {card.evolveFrom}</>}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2 text-base">
                {card?.types?.map((type) => (
                  <Badge
                    key={type}
                    variant="secondary"
                  >
                    {type}
                  </Badge>
                ))}
                {card?.hp && <Badge variant="outline">{card.hp} PV</Badge>}
                {card?.dexId && card.dexId.length > 0 && (
                  <Badge variant="outline">Pokédex #{card.dexId[0]}</Badge>
                )}
              </div>
              {card?.attacks && card.attacks.length > 0 && (
                <div className="mt-2">
                  <div className="font-semibold mb-1">Attaques :</div>
                  <ul className="list-disc list-inside space-y-1">
                    {card.attacks.map((atk, i) => (
                      <li
                        key={i}
                        className="flex gap-2 items-center"
                      >
                        <span className="font-medium">{atk.name}</span>
                        <span className="text-muted-foreground">
                          {atk.damage}
                        </span>
                        <span className="text-xs text-muted-foreground flex gap-1">
                          {atk.cost?.map((c) => (
                            <Image
                              src={typeToImage[slugify(c.toLowerCase())] || ""}
                              alt={c}
                              key={c + Math.random()}
                              width={16}
                              height={16}
                            />
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {card?.weaknesses && card.weaknesses.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  <span className="font-semibold">Faiblesses :</span>
                  {card.weaknesses.map((w, i) => (
                    <Badge
                      key={i}
                      variant="destructive"
                    >
                      <Image
                        src={typeToImage[slugify(w.type.toLowerCase())] || ""}
                        alt={w.type}
                        width={16}
                        height={16}
                      />
                      {w.value}
                    </Badge>
                  ))}
                </div>
              )}
              {card?.retreat && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Coût de retraite : {card.retreat}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="flex items-center gap-4 p-4 border-2 border-secondary/30">
            <Avatar className="size-14">
              <AvatarImage
                src={seller.avatarUrl}
                alt={seller.firstName}
              />
              <AvatarFallback>
                {seller.firstName[0]}
                {seller.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-lg">
                {seller.firstName} {seller.lastName}
              </span>
              <span className="text-muted-foreground text-sm">Vendeur</span>
            </div>
            <div className="ml-auto flex flex-col items-end">
              <span className="text-base font-semibold">
                Mise en vente le{" "}
                {new Date(listing.createdAt).toLocaleDateString()}
              </span>
              {listing.expiresAt && (
                <span className="text-xs text-muted-foreground">
                  Expire le {new Date(listing.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </Card>
        </div>
      </div>
      <Card className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 shadow-lg border-2 border-primary/40">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-3xl font-bold text-primary">
            {listing.price} {listing.currency}
            <Badge
              variant="outline"
              className="ml-2 text-base"
            >
              {listing.quantityAvailable} en stock
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <span className="text-sm text-muted-foreground">
              Cote du marché :
              <span className="ml-2 font-semibold text-foreground">
                {MOCK_COTE.avg} {MOCK_COTE.currency}
              </span>
              <span className="ml-2 text-xs">
                (min {MOCK_COTE.min} - max {MOCK_COTE.max})
              </span>
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2"
                >
                  <Info className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled
                  className="font-semibold"
                >
                  Dernières ventes :
                </DropdownMenuItem>
                {MOCK_COTE.lastSales.map((sale, i) => (
                  <DropdownMenuItem key={i}>
                    {sale.date} : {sale.price} {MOCK_COTE.currency}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <form
          className="flex items-center gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddToCart();
          }}
        >
          <Input
            type="number"
            min={1}
            max={listing.quantityAvailable}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-20 text-center text-lg font-semibold"
            disabled={listing.quantityAvailable === 1}
          />
          <Button
            type="submit"
            size="lg"
            className="flex gap-2 text-lg"
          >
            <ShoppingCart className="w-5 h-5" /> Ajouter au panier
          </Button>
          <DropdownMenu
            open={reportOpen}
            onOpenChange={setReportOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="ml-2"
                aria-label="Signaler"
              >
                <Flag className="w-5 h-5 text-destructive" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64"
            >
              {reportSent ? (
                <div className="p-2 text-green-600 font-semibold">
                  Signalement envoyé !
                </div>
              ) : (
                <div className="flex flex-col gap-2 p-2">
                  <span className="font-semibold mb-1">
                    Signaler cette vente
                  </span>
                  <Input
                    placeholder="Raison du signalement"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="mb-2"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!reportReason}
                    onClick={handleReport}
                  >
                    Envoyer
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </form>
      </Card>
    </div>
  );
};

export default Page;
