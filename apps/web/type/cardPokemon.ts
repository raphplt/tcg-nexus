import { EnergyType } from "./enums/energyType";
import { PokemonCardsType } from "./enums/pokemonCardsType";
import { TrainerType } from "./enums/trainerType";

export type PokemonCardType = {
	id: string;
	tcgDexId?: string;
	localId?: string;
	name?: string;
	image?: string;
	category?: PokemonCardsType;
	illustrator?: string;
	rarity?: string;
	variants?: {
		normal: boolean;
		reverse: boolean;
		holo: boolean;
		firstEdition: boolean;
	};
	set: string; // Assuming set is a string representing the PokemonSet ID
	dexId?: number[];
	hp?: number;
	types?: string[];
	evolveFrom?: string;
	description?: string;
	level?: string;
	stage?: string;
	suffix?: string;
	item?: {
		name: string;
		effect: string;
	};
	attacks?: {
		cost: string[];
		name: string;
		effect: string;
		damage?: number;
	}[];
	weaknesses?: {
		type: string;
		value: string;
	}[];
	retreat?: number;
	regulationMark?: string;
	legal?: {
		standard: boolean;
		expanded: boolean;
	};
	updated?: string;
	effect?: string;
	trainerType?: TrainerType;
	energyType?: EnergyType;
};
