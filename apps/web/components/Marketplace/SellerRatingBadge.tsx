import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface SellerRatingBadgeProps {
  avgRating: number;
  totalReviews: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SellerRatingBadge({
  avgRating,
  totalReviews,
  className,
  size = "md",
}: SellerRatingBadgeProps) {
  if (totalReviews === 0) {
    return (
      <div className={cn("text-muted-foreground", className, {
        "text-xs": size === "sm",
        "text-sm": size === "md",
        "text-base": size === "lg",
      })}>
        Nouveau vendeur
      </div>
    );
  }

  const iconSize = size === "sm" ? 12 : size === "md" ? 14 : 16;
  const textSize = size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => {
          const isFilled = i < Math.round(avgRating);
          return (
            <Star
              key={i}
              size={iconSize}
              className={cn(
                isFilled ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted-foreground/30"
              )}
            />
          );
        })}
      </div>
      <span className={cn("font-medium", textSize)}>
        {avgRating.toFixed(1)}
      </span>
      <span className={cn("text-muted-foreground", textSize)}>
        · {totalReviews} avis
      </span>
    </div>
  );
}
