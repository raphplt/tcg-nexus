"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ShoppingCart,
  Star,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface MarketplaceListing {
  id: string;
  seller: {
    name: string;
    avatar?: string;
    rating: number;
    location: string;
  };
  price: number;
  currency: string;
  condition: string;
  quantity: number;
  shipping: {
    cost: number;
    time: string;
  };
  trend: "up" | "down" | "stable";
  trendValue: number;
  postedAt: string;
}

const MarketplaceSection: React.FC = () => {
  // Mock data for marketplace listings
  const mockListings: MarketplaceListing[] = [
    {
      id: "1",
      seller: {
        name: "PokemonMaster42",
        avatar:
          "https://api.dicebear.com/7.x/avataaars/svg?seed=PokemonMaster42",
        rating: 4.8,
        location: "Paris, France",
      },
      price: 15.99,
      currency: "EUR",
      condition: "Near Mint",
      quantity: 2,
      shipping: {
        cost: 2.99,
        time: "2-3 jours",
      },
      trend: "down",
      trendValue: -5.2,
      postedAt: "2024-01-15T10:30:00Z",
    },
    {
      id: "2",
      seller: {
        name: "CardCollectorPro",
        avatar:
          "https://api.dicebear.com/7.x/avataaars/svg?seed=CardCollectorPro",
        rating: 4.9,
        location: "Lyon, France",
      },
      price: 18.5,
      currency: "EUR",
      condition: "Mint",
      quantity: 1,
      shipping: {
        cost: 3.5,
        time: "1-2 jours",
      },
      trend: "up",
      trendValue: 12.3,
      postedAt: "2024-01-14T15:45:00Z",
    },
    {
      id: "3",
      seller: {
        name: "TCGTrader",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=TCGTrader",
        rating: 4.7,
        location: "Marseille, France",
      },
      price: 12.75,
      currency: "EUR",
      condition: "Lightly Played",
      quantity: 3,
      shipping: {
        cost: 2.5,
        time: "3-5 jours",
      },
      trend: "stable",
      trendValue: 0,
      postedAt: "2024-01-13T09:20:00Z",
    },
    {
      id: "4",
      seller: {
        name: "PokemonShop",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=PokemonShop",
        rating: 4.6,
        location: "Toulouse, France",
      },
      price: 22.0,
      currency: "EUR",
      condition: "Mint",
      quantity: 1,
      shipping: {
        cost: 4.0,
        time: "1 jour",
      },
      trend: "up",
      trendValue: 8.7,
      postedAt: "2024-01-12T14:15:00Z",
    },
  ];

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      Mint: "bg-green-500",
      "Near Mint": "bg-blue-500",
      "Lightly Played": "bg-yellow-500",
      "Moderately Played": "bg-orange-500",
      "Heavily Played": "bg-red-500",
    };
    return colors[condition] || "bg-gray-500";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 24) {
      return `Il y a ${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Il y a ${diffInDays} jour${diffInDays > 1 ? "s" : ""}`;
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-6 h-6" />
          Cartes en Vente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockListings.map((listing) => (
            <Card
              key={listing.id}
              className="marketplace-card"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Seller Info */}
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={listing.seller.avatar} />
                      <AvatarFallback>
                        {listing.seller.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{listing.seller.name}</h4>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current rating-star" />
                          <span className="text-sm text-muted-foreground">
                            {listing.seller.rating}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{listing.seller.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(listing.postedAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getConditionColor(listing.condition)}>
                          {listing.condition}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {listing.quantity} disponible
                          {listing.quantity > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          Livraison: {listing.shipping.cost}€ (
                          {listing.shipping.time})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price and Actions */}
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl font-bold">
                        {listing.price}€
                      </span>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(listing.trend)}
                        <span
                          className={`text-sm font-medium ${
                            listing.trend === "up"
                              ? "trend-up"
                              : listing.trend === "down"
                                ? "trend-down"
                                : "trend-stable"
                          }`}
                        >
                          {listing.trendValue > 0 ? "+" : ""}
                          {listing.trendValue}%
                        </span>
                      </div>
                    </div>

                    <Button className="w-full">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Acheter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="outline"
            className="w-full"
          >
            Voir toutes les ventes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketplaceSection;
