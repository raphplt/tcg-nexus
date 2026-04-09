<script setup lang="ts">
import type { Series, Set } from "~/types/api";

interface Props {
	series: Series[];
	sets: Set[];
}

const props = defineProps<Props>();

const selectedSeriesIds = defineModel<string[]>("selectedSeriesIds", { default: () => [] });
const selectedSetIds = defineModel<string[]>("selectedSetIds", { default: () => [] });
const selectedRarities = defineModel<string[]>("selectedRarities", { default: () => [] });
const selectedCategories = defineModel<string[]>("selectedCategories", { default: () => [] });
const selectedTypes = defineModel<string[]>("selectedTypes", { default: () => [] });
const selectedStages = defineModel<string[]>("selectedStages", { default: () => [] });
const selectedLocalId = defineModel<string>("selectedLocalId", { default: "" });

const { t } = useI18n();

const rarities = [
	"Common",
	"Uncommon",
	"Rare",
	"Ultra Rare",
	"Secret Rare",
	"Rare Holo",
	"Rare Holo EX",
	"Rare Holo GX",
	"Rare Holo V",
	"Rare Holo VMAX",
	"Rare Holo VSTAR",
];

const categories = ["Pokemon", "Trainer", "Energy"];
const stages = ["Basic", "Stage1", "Stage2"];
const pokemonTypes = [
	"Grass",
	"Fire",
	"Water",
	"Lightning",
	"Psychic",
	"Fighting",
	"Darkness",
	"Metal",
	"Fairy",
	"Dragon",
	"Colorless",
];

const emit = defineEmits(["reset"]);
</script>

<template>
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		<!-- Series -->
		<div>
			<label class="block text-xs font-medium text-gray-700 mb-1">
				{{ t("import.search.filters.series") }}
			</label>
			<UiMultiSelect
				v-model="selectedSeriesIds"
				:options="series"
				option-label="name"
				option-value="id"
				searchable
				:placeholder="t('import.search.filters.allSeries')"
			/>
		</div>

		<!-- Sets -->
		<div>
			<label class="block text-xs font-medium text-gray-700 mb-1">
				{{ t("import.search.filters.set") }}
			</label>
			<UiMultiSelect
				v-model="selectedSetIds"
				:options="sets"
				option-label="name"
				option-value="id"
				searchable
				:placeholder="t('import.search.filters.allSets')"
			/>
		</div>

		<!-- Local ID -->
		<div>
			<label class="block text-xs font-medium text-gray-700 mb-1">
				{{ t("import.search.filters.localId") }}
			</label>
			<input
				v-model="selectedLocalId"
				type="text"
				:placeholder="t('import.search.filters.localIdPlaceholder')"
				class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</div>

		<!-- Rarity -->
		<div>
			<label class="block text-xs font-medium text-gray-700 mb-1">
				{{ t("import.search.filters.rarity") }}
			</label>
			<UiMultiSelect
				v-model="selectedRarities"
				:options="rarities"
				searchable
				:placeholder="t('import.search.filters.allRarities')"
			/>
		</div>

		<!-- Category -->
		<div>
			<label class="block text-xs font-medium text-gray-700 mb-1">
				{{ t("import.search.filters.category") }}
			</label>
			<UiMultiSelect
				v-model="selectedCategories"
				:options="categories"
				:placeholder="t('import.search.filters.allCategories')"
			/>
		</div>

		<!-- Type -->
		<div>
			<label class="block text-xs font-medium text-gray-700 mb-1">
				{{ t("import.search.filters.type") }}
			</label>
			<UiMultiSelect
				v-model="selectedTypes"
				:options="pokemonTypes"
				searchable
				:placeholder="t('import.search.filters.allTypes')"
			/>
		</div>

		<!-- Stage -->
		<div>
			<label class="block text-xs font-medium text-gray-700 mb-1">
				{{ t("import.search.filters.stage") }}
			</label>
			<UiMultiSelect
				v-model="selectedStages"
				:options="stages"
				:placeholder="t('import.search.filters.allStages')"
			/>
		</div>
	</div>

	<div class="flex justify-end mt-4">
		<button
			type="button"
			class="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
			@click="emit('reset')"
		>
			{{ t("import.search.filters.resetFilters") }}
		</button>
	</div>
</template>
