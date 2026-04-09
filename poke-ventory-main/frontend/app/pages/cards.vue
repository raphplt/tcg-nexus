<script setup lang="ts">
import type { Card, CardFilters, Series, Set as CardSet } from "~/types/api";

const { getCards, getSeries, getSets } = useCards();
const { addUserCardsBatch } = useUserCards();
const { t } = useI18n();

const searchQuery = ref("");
const isSearching = ref(false);
const searchResults = ref<Card[]>([]);
const totalResults = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

const showFilters = ref(false);

const series = ref<Series[]>([]);
const sets = ref<CardSet[]>([]);

// Filter states (arrays)
const selectedSeriesIds = ref<string[]>([]);
const selectedSetIds = ref<string[]>([]);
const selectedRarities = ref<string[]>([]);
const selectedCategories = ref<string[]>([]);
const selectedTypes = ref<string[]>([]);
const selectedStages = ref<string[]>([]);
const selectedLocalId = ref<string>("");

// UI States
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const selectedCards = ref<Set<string>>(new Set());
const isAdding = ref(false);

onMounted(async () => {
	try {
		const seriesData = await getSeries();
		series.value = seriesData.data.value || [];
		// Initial load
		await performSearch(1);
	} catch (error) {
		console.error("Erreur lors du chargement des séries:", error);
	}
	
	if (hasActiveFilters()) {
		showFilters.value = true;
	}
});

watch(selectedSeriesIds, async (newSeriesIds) => {
	if (newSeriesIds.length > 0) {
		try {
			const setsData = await getSets(newSeriesIds);
			sets.value = setsData.data.value || [];
		} catch (error) {
			console.error("Erreur lors du chargement des sets:", error);
		}
	} else {
		sets.value = [];
		selectedSetIds.value = [];
	}
});

const hasActiveFilters = () => {
	return !!(
		selectedSetIds.value.length > 0 ||
		selectedSeriesIds.value.length > 0 ||
		selectedRarities.value.length > 0 ||
		selectedCategories.value.length > 0 ||
		selectedTypes.value.length > 0 ||
		selectedStages.value.length > 0 ||
		selectedLocalId.value.trim()
	);
};

const performSearch = async (page = 1) => {
	isSearching.value = true;
	errorMessage.value = null;
	successMessage.value = null;
	currentPage.value = page;

	const searchFilters: CardFilters = {
		skip: (page - 1) * pageSize.value,
		limit: pageSize.value,
	};

	if (searchQuery.value.trim()) {
		searchFilters.name = searchQuery.value.trim();
	}
	if (selectedSetIds.value.length > 0) {
		searchFilters.set_id = selectedSetIds.value;
	}
	if (selectedSeriesIds.value.length > 0) {
		searchFilters.series_id = selectedSeriesIds.value;
	}
	if (selectedRarities.value.length > 0) {
		searchFilters.rarity = selectedRarities.value;
	}
	if (selectedCategories.value.length > 0) {
		searchFilters.category = selectedCategories.value;
	}
	if (selectedTypes.value.length > 0) {
		searchFilters.type = selectedTypes.value;
	}
	if (selectedStages.value.length > 0) {
		searchFilters.stage = selectedStages.value;
	}
	if (selectedLocalId.value.trim()) {
		searchFilters.local_id = selectedLocalId.value.trim();
	}

	try {
		const response = await getCards(searchFilters);
		const data = response.data.value;
		if (data) {
			searchResults.value = data.items || [];
			totalResults.value = data.total || 0;
		} else {
			searchResults.value = [];
			totalResults.value = 0;
		}
	} catch (error: unknown) {
		errorMessage.value =
			error instanceof Error
				? error.message
				: "Une erreur est survenue lors de la recherche.";
		searchResults.value = [];
		totalResults.value = 0;
	} finally {
		isSearching.value = false;
	}
};

const resetFilters = () => {
	selectedSeriesIds.value = [];
	selectedSetIds.value = [];
	selectedRarities.value = [];
	selectedCategories.value = [];
	selectedTypes.value = [];
	selectedStages.value = [];
	selectedLocalId.value = "";
};

const resetSearch = () => {
	searchQuery.value = "";
	selectedCards.value.clear();
	errorMessage.value = null;
	successMessage.value = null;
	currentPage.value = 1;
	resetFilters();
	performSearch(1);
};

const addSelectedCards = async () => {
	if (selectedCards.value.size === 0) {
		errorMessage.value = "Sélectionne au moins une carte à ajouter.";
		return;
	}

	isAdding.value = true;
	errorMessage.value = null;
	successMessage.value = null;

	try {
		const cardsToAdd = Array.from(selectedCards.value).map((cardId) => ({
			card_id: cardId,
			quantity: 1,
		}));

		const response = await addUserCardsBatch(cardsToAdd);
		
		if (response.created > 0 || response.updated > 0) {
			successMessage.value = `${response.created + response.updated} carte(s) ajoutée(s) à ta collection !`;
			selectedCards.value.clear();
		} else {
			errorMessage.value = "Aucune carte n'a pu être ajoutée.";
		}
	} catch (error: unknown) {
		errorMessage.value =
			error instanceof Error ? error.message : "Une erreur est survenue.";
	} finally {
		isAdding.value = false;
	}
};
</script>

<template>
	<div class="container mx-auto p-4 space-y-6">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 mb-2">
				Toutes les cartes
			</h1>
			<p class="text-gray-600">
				Parcours l'ensemble des cartes Pokémon de la base de données.
			</p>
		</div>

		<!-- Barre de recherche -->
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
			<div class="flex gap-2 mb-3">
				<input
					v-model="searchQuery"
					type="text"
					placeholder="Ex: Pikachu, Dracaufeu, Base Set..."
					class="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					@keyup.enter="performSearch(1)"
				/>
				<button
					class="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md disabled:opacity-50 hover:bg-blue-700 transition-colors shrink-0"
					:disabled="isSearching"
					@click="performSearch(1)"
				>
					{{ isSearching ? "Recherche..." : "Rechercher" }}
				</button>
				<button
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
					@click="showFilters = !showFilters"
				>
					<Icon
						:name="showFilters ? 'mdi:filter-remove' : 'mdi:filter'"
						class="w-4 h-4"
					/>
					{{ showFilters ? t("import.search.hideFilters") : t("import.search.showFilters") }}
				</button>
			</div>

			<UiCollapsible v-model:open="showFilters">
				<template #default="{ isOpen, toggle }">
					<div class="mt-4 pt-4 border-t border-gray-200">
						<button
							type="button"
							class="flex items-center justify-between w-full text-left"
							@click="toggle"
						>
							<span class="text-sm font-medium text-gray-700">
								{{ t("import.search.filters.title") }}
							</span>
							<Icon
								:name="isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'"
								class="w-5 h-5 text-gray-500 transition-transform"
							/>
						</button>

						<div v-show="isOpen" class="mt-4">
							<ImportSearchFilters
								v-model:selectedSeriesIds="selectedSeriesIds"
								v-model:selectedSetIds="selectedSetIds"
								v-model:selectedRarities="selectedRarities"
								v-model:selectedCategories="selectedCategories"
								v-model:selectedTypes="selectedTypes"
								v-model:selectedStages="selectedStages"
								v-model:selectedLocalId="selectedLocalId"
								:series="series"
								:sets="sets"
								@reset="resetFilters"
							/>
						</div>
					</div>
				</template>
			</UiCollapsible>
		</div>

		<!-- Messages d'erreur/succès -->
		<div
			v-if="errorMessage"
			class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
		>
			{{ errorMessage }}
		</div>

		<div
			v-if="successMessage"
			class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
		>
			{{ successMessage }}
		</div>

		<!-- Résultats -->
		<ImportSearchResults
			v-if="searchResults.length > 0"
			v-model:selectedCards="selectedCards"
			:results="searchResults"
			:total-results="totalResults"
			:current-page="currentPage"
			:page-size="pageSize"
			:is-adding="isAdding"
			@update:page="performSearch"
			@add="addSelectedCards"
			@reset="resetSearch"
		/>

		<!-- État vide -->
		<div
			v-else-if="!isSearching && searchQuery.trim() === '' && !hasActiveFilters()"
			class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center"
		>
			<p class="text-gray-600">
				Utilise la barre de recherche ou les filtres pour trouver des cartes.
			</p>
		</div>
        <div
            v-else-if="!isSearching"
            class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center"
        >
            <p class="text-gray-600">
                Aucun résultat trouvé.
            </p>
        </div>
	</div>
</template>
