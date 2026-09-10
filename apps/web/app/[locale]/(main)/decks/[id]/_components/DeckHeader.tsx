import { Deck } from "@/types/Decks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { H1 } from "@/components/Shared/Titles";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Copy,
  Download,
  Edit3,
  Layers,
  Loader2,
  Share2,
  User as UserIcon,
} from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { Link, useRouter } from "@/i18n/navigation";
import { getCardImage } from "@/utils/images";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedDeckIds, useToggleSavedDeck } from "@/hooks/useSavedDecks";
import toast from "react-hot-toast";

/**
 * Props for the DeckHeader component.
 */
export interface DeckHeaderProps {
  deck: Deck;
  isOwner: boolean;
  onShare: () => void;
  onExport: () => void;
  onClone: () => void;
  isSharePending: boolean;
  isExportPending: boolean;
  isClonePending: boolean;
}

/**
 * Renders the top header banner and actionable controls for a deck detail view.
 *
 * @param props - Deck details, ownership state, and action callbacks.
 * @returns Header hero section with cover image, metadata badges, and action buttons.
 */
export function DeckHeader({
  deck,
  isOwner,
  onShare,
  onExport,
  onClone,
  isSharePending,
  isExportPending,
  isClonePending,
}: DeckHeaderProps) {
  const t = useTranslations("DeckDetail");
  const router = useRouter();
  const { user } = useAuth();
  const { data: savedIds } = useSavedDeckIds();
  const { save, remove, isPending: isSavePending } = useToggleSavedDeck();

  const isSaved = !!savedIds?.includes(deck.id);
  const canSave = !isOwner && deck.isPublic;

  const handleToggleSave = () => {
    if (!user) {
      toast.error(t("loginRequired"));
      router.push("/auth/login");
      return;
    }
    if (isSavePending) return;
    if (isSaved) {
      remove(deck.id);
    } else {
      save(deck.id);
    }
  };

  const handleClone = () => {
    if (!user) {
      toast.error(t("loginRequired"));
      router.push("/auth/login");
      return;
    }
    onClone();
  };

  const coverCard =
    deck?.cards?.find((c) => c.card?.image)?.card ||
    deck?.cards?.[0]?.card ||
    undefined;

  return (
    <>
      <div className="relative">
        <div className="w-full bg-linear-to-r from-primary/20 via-background to-secondary/20" />
        <SmartImage
          src={getCardImage(coverCard, "low")}
          fallbackSrc="/images/carte-pokemon-dos.jpg"
          alt={coverCard?.name || "Cover"}
          className="object-cover opacity-20 blur-sm"
          noSkeleton
        />
        <div className="absolute inset-0 bg-linear-to-r from-background/90 via-background/85 to-background/90" />
        <div className="relative px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative w-24 h-32 rounded-lg overflow-hidden border border-border bg-card shadow-lg">
              <SmartImage
                src={getCardImage(coverCard)}
                fallbackSrc="/images/carte-pokemon-dos.jpg"
                alt={coverCard?.name || "Carte"}
                className="object-cover"
              />
            </div>
            <div className="space-y-2">
              <H1 className="leading-tight">{deck.name}</H1>
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  {deck.format?.type}
                </Badge>
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  {deck.user?.id ? (
                    <Link
                      href={`/users/${deck.user.id}`}
                      className="hover:text-primary hover:underline transition-colors"
                    >
                      {deck.user?.firstName} {deck.user?.lastName}
                    </Link>
                  ) : (
                    <span>
                      {deck.user?.firstName} {deck.user?.lastName}
                    </span>
                  )}
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
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("back")}
            </Button>
            <Button
              variant="outline"
              onClick={onExport}
              disabled={isExportPending}
            >
              <Download className="w-4 h-4 mr-2" />
              {t("exportJson")}
            </Button>

            {canSave && (
              <Button
                variant={isSaved ? "secondary" : "outline"}
                onClick={handleToggleSave}
                disabled={isSavePending}
                title={
                  isSaved
                    ? t("removeFromFavoritesHint")
                    : t("addToFavoritesHint")
                }
              >
                {isSaved ? (
                  <BookmarkCheck className="w-4 h-4 mr-2 text-primary" />
                ) : (
                  <Bookmark className="w-4 h-4 mr-2" />
                )}
                <span>{isSaved ? t("inFavorites") : t("addToFavorites")}</span>
              </Button>
            )}

            {(deck.isPublic || isOwner) && (
              <Button
                variant="outline"
                onClick={handleClone}
                disabled={isClonePending}
                title={isOwner ? t("duplicateHint") : t("copyToMyDecksHint")}
              >
                {isClonePending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                <span>
                  {isClonePending
                    ? t("copying")
                    : isOwner
                      ? t("duplicate")
                      : t("copyToMyDecks")}
                </span>
              </Button>
            )}

            {isOwner && (
              <>
                <Button
                  variant="outline"
                  onClick={onShare}
                  disabled={isSharePending}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {t("share")}
                </Button>
                <Button onClick={() => router.push(`/decks/${deck.id}/update`)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  {t("edit")}
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
