import React from "react";
import RandomPokemon from "./components/RandomPokemon";

const page = () => {
	return (
		<div>
			<h1 className="text-2xl mt-12 text-center font-bold">
				Voici une carte random :
			</h1>
			<RandomPokemon />
		</div>
	);
};

export default page;
