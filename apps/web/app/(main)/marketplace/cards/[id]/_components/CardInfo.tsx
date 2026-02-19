import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { typeToImage } from "@/utils/images";
import { slugify } from "@/utils/text";
import Image from "next/image";

interface CardInfoProps {
  card: any; // Replace with proper type
}

export function CardInfo({ card }: CardInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-3xl">
          {card.types?.map((type: string) => (
            <Image
              key={type}
              src={typeToImage[slugify(type.toLowerCase())] || ""}
              alt={type}
              width={28}
              height={28}
            />
          ))}
          {card.name}
          {card.localId && (
            <span className="text-lg text-muted-foreground font-normal">
              #{card.localId}
            </span>
          )}
        </CardTitle>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {card.category && <span>{card.category}</span>}
          {card.illustrator && (
            <>
              <span>·</span>
              <span>Illus. {card.illustrator}</span>
            </>
          )}
          {card.stage && (
            <>
              <span>·</span>
              <span>{card.stage}</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {card.types && card.types.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {card.types.map((type: string) => (
              <Badge key={type} variant="secondary">
                {type}
              </Badge>
            ))}
          </div>
        )}
        {card.hp && <Badge variant="outline">{card.hp} PV</Badge>}
        {card.attacks && card.attacks.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Attaques :</h4>
            <ul className="space-y-2">
              {card.attacks.map((atk: any, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="font-medium">{atk.name}</span>
                  {atk.damage && <Badge variant="outline">{atk.damage}</Badge>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
