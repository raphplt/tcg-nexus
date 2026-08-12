import { useTranslations } from "next-intl";
import React from "react";
import { PokemonCardsTable } from "@/components/PokemonCardsTable";

const PokemonPage = () => {
  const t = useTranslations("Pokedex");
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("pokemonCards")}</h1>
      <PokemonCardsTable />
    </div>
  );
};

export default PokemonPage;
