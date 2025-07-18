import React from "react";
import { H2 } from "../Shared/Titles";
import { Card } from "../ui/card";
import { myCollection } from "./homeMocks";
import Image from "next/image";

const MyCollection = () => (
  <Card className="bg-card rounded-xl shadow p-6 mt-8">
    <H2 className="mb-4">Ma collection</H2>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {myCollection.map((card, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-background hover:shadow-md transition group"
        >
          <Image
            src={card.image}
            alt={card.name}
            width={64}
            height={90}
            className="object-cover rounded border group-hover:scale-105 transition-transform"
          />
          <div className="font-semibold text-center text-sm truncate">
            {card.name}
          </div>
          <div className="text-xs text-muted-foreground text-center truncate">
            {card.desc}
          </div>
        </div>
      ))}
    </div>
  </Card>
);

export default MyCollection;
