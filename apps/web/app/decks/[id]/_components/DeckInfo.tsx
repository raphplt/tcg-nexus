import { Deck } from "@/types/Decks";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit3 } from "lucide-react";
import Link from "next/link";

interface DeckInfoProps {
  deck: Deck;
  isOwner: boolean;
}

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex justify-between items-center border-b pb-2">
    <span className="text-muted-foreground">{label}</span>
    <div className="font-medium text-right">{value}</div>
  </div>
);

export function DeckInfo({ deck, isOwner }: DeckInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoRow
          label="Format"
          value={deck.format?.type}
        />
        <InfoRow
          label="Créateur"
          value={
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback>
                  {deck.user?.firstName?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{deck.user?.firstName}</span>
            </div>
          }
        />
        <InfoRow
          label="Visibilité"
          value={
            <Badge variant={deck.isPublic ? "default" : "outline"}>
              {deck.isPublic ? "Public" : "Privé"}
            </Badge>
          }
        />
        <InfoRow
          label="Dernière maj"
          value={
            deck.updatedAt ? new Date(deck.updatedAt).toLocaleDateString() : "—"
          }
        />
        {isOwner && (
          <div className="pt-2">
            <Button
              asChild
              className="w-full"
              variant="secondary"
            >
              <Link href={`/decks/${deck.id}/update`}>
                <Edit3 className="w-4 h-4 mr-2" />
                Modifier mon deck
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
