"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatPrice } from "@/utils/price";
import { Star, ShoppingBag, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SellerCardProps {
  seller: {
    id: number;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    isPro?: boolean;
  };
  totalSales?: number;
  totalRevenue?: number;
  className?: string;
  showStats?: boolean;
}

export function SellerCard({
  seller,
  totalSales,
  totalRevenue,
  className,
  showStats = true,
}: SellerCardProps) {
  const initials = `${seller.firstName[0]}${seller.lastName[0]}`.toUpperCase();

  return (
    <Link href={`/marketplace/sellers/${seller.id}`}>
      <Card
        className={cn(
          "group hover:shadow-lg transition-all duration-200 cursor-pointer",
          className
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={seller.avatarUrl} alt={seller.firstName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                  {seller.firstName} {seller.lastName}
                </h3>
                {seller.isPro && (
                  <Badge variant="secondary" className="text-xs">
                    Pro
                  </Badge>
                )}
              </div>
              {showStats && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {totalSales !== undefined && (
                    <div className="flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3" />
                      <span>{totalSales} ventes</span>
                    </div>
                  )}
                  {totalRevenue !== undefined && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{formatPrice(totalRevenue, "EUR")}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

