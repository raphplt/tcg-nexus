import {
  ArrowRight,
  Hash,
  Search,
  ShoppingCart,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import type { ReactElement } from "react";

export type SearchItemType =
  | "card"
  | "tournament"
  | "player"
  | "marketplace";

type SearchItemButtonProps = {
  type: SearchItemType;
  title: string;
  subtitle?: string;
  image?: string;
  imageAlt?: string;
  selected?: boolean;
  showArrow?: boolean;
  onClick: () => void;
};

const ICON_BY_TYPE: Record<SearchItemType, ReactElement> = {
  card: <Hash className="w-4 h-4" />,
  tournament: <Trophy className="w-4 h-4" />,
  player: <Users className="w-4 h-4" />,
  marketplace: <ShoppingCart className="w-4 h-4" />,
};

export function getSearchItemIcon(type: SearchItemType): ReactElement {
  return ICON_BY_TYPE[type] ?? <Search className="w-4 h-4" />;
}

export function SearchItemButton({
  type,
  title,
  subtitle,
  image,
  imageAlt,
  selected = false,
  showArrow = false,
  onClick,
}: SearchItemButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={selected}
      className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
        selected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50"
      }`}
    >
      <div className="text-muted-foreground" aria-hidden="true">
        {getSearchItemIcon(type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{title}</div>
        {subtitle && (
          <div className="text-sm text-muted-foreground truncate">
            {subtitle}
          </div>
        )}
      </div>
      {image && (
        <Image
          src={image}
          alt={imageAlt ?? title}
          width={32}
          height={32}
          className="w-8 h-8 rounded object-cover"
          unoptimized
        />
      )}
      {showArrow && (
        <ArrowRight
          className="w-4 h-4 text-muted-foreground"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
