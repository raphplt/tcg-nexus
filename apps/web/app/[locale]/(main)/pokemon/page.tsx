import React from "react";
import { PokemonCardsTable } from "@/components/PokemonCardsTable";

const PokemonPage = () => {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <PokemonCardsTable />
    </div>
  );
};

export default PokemonPage;
