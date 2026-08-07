import React from "react";
import { PokemonCardsTable } from "@/components/PokemonCardsTable";

const PokemonPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Cartes Pokémon</h1>
      <PokemonCardsTable />
    </div>
  );
};

export default PokemonPage;
