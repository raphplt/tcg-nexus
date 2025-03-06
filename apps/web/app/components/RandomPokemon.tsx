"use client";
import React, { useEffect, useState } from "react";
import { PokemonCardType } from "../../type/cardPokemon";

const url = process.env.NEXT_PUBLIC_API_URL;
const RandomPokemon = () => {
	const [pokemon, setPokemon] = useState<PokemonCardType | null>(null);
	useEffect(() => {
		fetch(url + "/pokemon-card/search/random")
			.then((response) => response.json())
			.then((data) => setPokemon(data));
	}, [url]);

	return (
		<div className="flex justify-center items-center bg-gray-100 min-h-screen">
			{pokemon ? (
				<div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl">
					<h2 className="text-2xl font-bold mb-4 text-center">{pokemon.name}</h2>
					{pokemon.image && (
						<img
							className="mx-auto mb-4 object-cover rounded-lg"
							src={pokemon.image + "/high.png"}
							alt={pokemon.name}
							width={250}
							height={500}
						/>
					)}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<p className="text-lg mb-2">
								<strong>Type:</strong> {pokemon.type}
							</p>
							<p className="text-lg mb-2">
								<strong>HP:</strong> {pokemon.hp}
							</p>
							<p className="text-lg mb-2">
								<strong>Category:</strong> {pokemon.category}
							</p>
							<p className="text-lg mb-2">
								<strong>Illustrator:</strong> {pokemon.illustrator}
							</p>
							<p className="text-lg mb-2">
								<strong>Rarity:</strong> {pokemon.rarity}
							</p>
							<p className="text-lg mb-2">
								<strong>Evolve From:</strong> {pokemon.evolveFrom}
							</p>
							<p className="text-lg mb-2">
								<strong>Description:</strong> {pokemon.description}
							</p>
							<p className="text-lg mb-2">
								<strong>Level:</strong> {pokemon.level}
							</p>
							<p className="text-lg mb-2">
								<strong>Stage:</strong> {pokemon.stage}
							</p>
							<p className="text-lg mb-2">
								<strong>Suffix:</strong> {pokemon.suffix}
							</p>
							<p className="text-lg mb-2">
								<strong>Retreat:</strong> {pokemon.retreat}
							</p>
							<p className="text-lg mb-2">
								<strong>Regulation Mark:</strong> {pokemon.regulationMark}
							</p>
							<p className="text-lg mb-2">
								<strong>Updated:</strong> {pokemon.updated}
							</p>
						</div>
						<div>
							<div className="text-lg mb-2">
								<strong>Variants:</strong>{" "}
								{pokemon.variants ? (
									<div>
										<p>Normal: {pokemon.variants.normal ? "Yes" : "No"}</p>
										<p>Reverse: {pokemon.variants.reverse ? "Yes" : "No"}</p>
										<p>Holo: {pokemon.variants.holo ? "Yes" : "No"}</p>
										<p>First Edition: {pokemon.variants.firstEdition ? "Yes" : "No"}</p>
									</div>
								) : (
									"None"
								)}
							</div>
							<div className="text-lg mb-2">
								<strong>Dex IDs:</strong> {pokemon.dexId?.join(", ") || "None"}
							</div>
							<div className="text-lg mb-2">
								<strong>Types:</strong> {pokemon.types?.join(", ") || "None"}
							</div>
							<div className="text-lg mb-2">
								<strong>Item:</strong>{" "}
								{pokemon.item ? (
									<div>
										<p>Name: {pokemon.item.name}</p>
										<p>Effect: {pokemon.item.effect}</p>
									</div>
								) : (
									"None"
								)}
							</div>
							<div className="text-lg mb-2">
								<strong>Attacks:</strong>{" "}
								{pokemon.attacks?.map((attack) => (
									<div key={attack.name} className="mb-2">
										<p className="font-semibold">{attack.name}</p>
										<p>Cost: {attack.cost.join(", ")}</p>
										<p>Effect: {attack.effect}</p>
										<p>Damage: {attack.damage}</p>
									</div>
								)) || "None"}
							</div>
						</div>
						<div>
							<div className="text-lg mb-2">
								<strong>Weaknesses:</strong>{" "}
								{pokemon.weaknesses?.map((weakness) => (
									<div key={weakness.type} className="mb-2">
										<p>Type: {weakness.type}</p>
										<p>Value: {weakness.value}</p>
									</div>
								)) || "None"}
							</div>
							<div className="text-lg mb-2">
								<strong>Legal:</strong>{" "}
								{pokemon.legal ? (
									<div>
										<p>Standard: {pokemon.legal.standard ? "Yes" : "No"}</p>
										<p>Expanded: {pokemon.legal.expanded ? "Yes" : "No"}</p>
									</div>
								) : (
									"None"
								)}
							</div>
							<p className="text-lg mb-2">
								<strong>Effect:</strong> {pokemon.effect}
							</p>
							<p className="text-lg mb-2">
								<strong>Trainer Type:</strong> {pokemon.trainerType}
							</p>
							<p className="text-lg mb-2">
								<strong>Energy Type:</strong> {pokemon.energyType}
							</p>
						</div>
					</div>
				</div>
			) : (
				<p className="text-xl">Loading...</p>
			)}
		</div>
	);
};

export default RandomPokemon;
