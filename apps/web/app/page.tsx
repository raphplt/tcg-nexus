import React from "react";
import { Brain, Spade, Trophy } from "lucide-react";
import CardLink from "@components/Layout/CardLink";
import RandomPokemon from "@components/RandomPokemon";

const page = () => {
  return (
    <div className="min-h-screen bg-gradient-to-l from-[#4b6cb7] to-[#182848] text-white">
      <div className="flex flex-wrap justify-center items-center gap-4 py-20">
        <CardLink
          title="Tournois"
          description="Retrouvez tous les tournois organisés par la communauté."
          icon={<Trophy />}
          link="/tournaments"
        />

        <CardLink
          title="Marketplace"
          description="Achetez et vendez des cartes Pokémon."
          icon={<Spade />}
          link="/marketplace"
        />

        <CardLink
          title="Stratégie"
          description="Découvrez les meilleures stratégies pour gagner vos combats."
          icon={<Brain />}
          link="/strategy"
        />
      </div>

      <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
        <p>Autres liens</p>

        <ul>
          <li>
            <a href="/pokemon">Pokémon</a>
          </li>
        </ul>
      </div>

      <RandomPokemon />
    </div>
  );
};

export default page;