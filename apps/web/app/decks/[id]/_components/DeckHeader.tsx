import { Deck } from "@/types/Decks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { H1 } from "@/components/Shared/Titles";
import {
  ArrowLeft,
  Calendar,
  Edit3,
  Layers,
  Share2,
  User as UserIcon,
} from "lucide-react";
import Image from "next/image";
import { getCardImage } from "@/utils/images";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";

interface DeckHeaderProps {
  deck: Deck;
  isOwner: boolean;
  onShare: () => void;
  isSharePending: boolean;
}

export function DeckHeader({
  deck,
  isOwner,
  onShare,
  isSharePending,
}: DeckHeaderProps) {
  const router = useRouter();
  const coverCard =
    deck?.cards?.find((c) => c.card?.image)?.card ||
    deck?.cards?.[0]?.card ||
    undefined;

  return (
    <>
      <div className="relative">
        <div className=" w-full bg-linear-to-r from-primary/20 via-background to-secondary/20" />
        <Image
          src={getCardImage(coverCard, "low")}
          alt={coverCard?.name || "Cover"}
          fill
          className="object-cover opacity-20 blur-sm"
        />
        <div className="absolute inset-0 bg-linear-to-r from-background/90 via-background/85 to-background/90" />
        <div className="relative px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative w-24 h-32 rounded-lg overflow-hidden border border-border bg-card shadow-lg">
              <Image
                src={getCardImage(coverCard)}
                alt={coverCard?.name || "Carte"}
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-2">
              <H1 className="leading-tight">{deck.name}</H1>
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <Layers className="w-3.5 h-3.5" />
                  {deck.format?.type}
                </Badge>
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>
                    {deck.user?.firstName} {deck.user?.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {deck.createdAt
                      ? new Date(deck.createdAt).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
                <Badge variant={deck.isPublic ? "default" : "outline"}>
                  {deck.isPublic ? "Public" : "Privé"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            {isOwner && (
              <>
                <Button
                  variant="outline"
                  onClick={onShare}
                  disabled={isSharePending}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager
                </Button>
                <Button onClick={() => router.push(`/decks/${deck.id}/update`)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Éditer le deck
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      <Separator />
    </>
  );
}
