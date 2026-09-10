import React from "react";
import { H2 } from "../Shared/Titles";
import { Card } from "../ui/card";
import { myCollection } from "./homeMocks";
import { SmartImage } from "../ui/SmartImage";
import { useTranslations } from "next-intl";

const MyCollection = () => {
  const t = useTranslations("Home");

  return (
    <Card className="p-6 mt-8">
      <H2 className="mb-4">{t("collection.title")}</H2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {myCollection.map((card, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-background hover:shadow-md transition group"
          >
            <div className="relative h-[90px] w-16">
              <SmartImage
                src={card.image}
                alt={card.name}
                fallbackSrc="/images/carte-pokemon-dos.jpg"
                className="object-cover rounded border group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="font-semibold text-center text-sm truncate">
              {card.name}
            </div>
            <div className="text-xs text-muted-foreground text-center truncate">
              {t("collection.cardDescription")}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default MyCollection;
