<script setup lang="ts">
import type { UserCard } from "~/types/api";

const { getUserCards } = useUserCards();

// État de la collection
const userCards = ref<UserCard[]>([]);
const totalCards = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

// Filtres
const selectedSetId = ref<string | null>(null);

// Charger la collection
const loadCollection = async (page = 1) => {
	isLoading.value = true;
	errorMessage.value = null;
	currentPage.value = page;

	try {
		const skip = (page - 1) * pageSize.value;
		const response = await getUserCards(
			skip,
			pageSize.value,
			undefined,
			selectedSetId.value || undefined
		);
		const data = response.data.value;
		if (data) {
			userCards.value = data.items || [];
			totalCards.value = data.total || 0;
		} else {
			userCards.value = [];
			totalCards.value = 0;
		}
	} catch (error: unknown) {
		errorMessage.value =
			error instanceof Error
				? error.message
				: "Une erreur est survenue lors du chargement de ta collection.";
		userCards.value = [];
		totalCards.value = 0;
	} finally {
		isLoading.value = false;
	}
};

const totalPages = computed(() => {
	return Math.ceil(totalCards.value / pageSize.value);
});

const goToPage = (page: number) => {
	if (page >= 1 && page <= totalPages.value) {
		loadCollection(page);
	}
};

const uniqueCardsCount = computed(() => {
	return userCards.value.length;
});

const totalQuantity = computed(() => {
	return userCards.value.reduce((sum, uc) => sum + uc.quantity, 0);
});

onMounted(() => {
	loadCollection(1);
});

watch(selectedSetId, () => {
	loadCollection(1);
});
</script>

<template>
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900">Ma collection</h1>
			<p class="text-gray-600 mt-2 text-sm">
				Gère et consulte ta collection de cartes Pokémon
			</p>
		</div>

		<!-- Statistiques -->
		<div
			v-if="!isLoading && userCards.length > 0"
			class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
		>
			<div class="bg-white rounded-lg border border-gray-200 p-4">
				<p class="text-sm text-gray-600">Cartes uniques</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">
					{{ totalCards }}
				</p>
			</div>
			<div class="bg-white rounded-lg border border-gray-200 p-4">
				<p class="text-sm text-gray-600">Quantité totale</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">
					{{ totalQuantity }}
				</p>
			</div>
			<div class="bg-white rounded-lg border border-gray-200 p-4">
				<p class="text-sm text-gray-600">Valeur estimée</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">-</p>
			</div>
		</div>

		<!-- Message d'erreur -->
		<div
			v-if="errorMessage"
			class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6"
		>
			{{ errorMessage }}
		</div>

		<!-- Contenu principal -->
		<div class="bg-white rounded-lg border border-gray-200 p-6">
			<!-- En-tête avec filtres -->
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-xl font-semibold text-gray-900">Mes cartes</h2>
				<div class="flex items-center gap-2">
					<NuxtLink
						to="/import"
						class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
					>
						Ajouter des cartes
					</NuxtLink>
				</div>
			</div>

			<!-- État de chargement -->
			<div v-if="isLoading" class="text-center py-12">
				<p class="text-gray-600">Chargement de ta collection...</p>
			</div>

			<!-- Collection vide -->
			<div
				v-else-if="!isLoading && userCards.length === 0"
				class="text-center py-12"
			>
				<p class="text-gray-600 mb-4">Tu n'as pas encore de cartes dans ta collection.</p>
				<NuxtLink
					to="/import"
					class="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
				>
					Ajouter des cartes
				</NuxtLink>
			</div>

			<!-- Liste des cartes -->
			<div v-else class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					<div
						v-for="userCard in userCards"
						:key="userCard.id"
						class="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
					>
						<div v-if="userCard.card?.image" class="mb-3">
							<img
								:src="userCard.card.image + '/high.png'"
								:alt="userCard.card.name"
								class="w-full h-48 object-contain rounded"
							/>
						</div>
						<div v-else class="mb-3 h-48 bg-gray-100 rounded flex items-center justify-center">
							<p class="text-gray-400 text-sm">Pas d'image</p>
						</div>
						<div>
							<h3 class="font-semibold text-gray-900 text-sm mb-1">
								{{ userCard.card?.name || "Carte inconnue" }}
							</h3>
							<div class="flex items-center justify-between text-xs text-gray-500 mb-2">
								<span>#{{ userCard.card?.local_id || "-" }}</span>
								<span v-if="userCard.quantity > 1" class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
									x{{ userCard.quantity }}
								</span>
							</div>
							<div class="flex items-center gap-2 flex-wrap">
								<span
									v-if="userCard.card?.rarity"
									class="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700"
								>
									{{ userCard.card.rarity }}
								</span>
								<span
									class="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 capitalize"
								>
									{{ userCard.condition }}
								</span>
							</div>
							<div v-if="userCard.price_paid" class="mt-2 text-xs text-gray-600">
								Prix payé: {{ userCard.price_paid }}€
							</div>
						</div>
					</div>
				</div>

				<!-- Pagination -->
				<div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-6 border-t border-gray-200">
					<button
						class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						:disabled="currentPage === 1"
						@click="goToPage(currentPage - 1)"
					>
						Précédent
					</button>
					<span class="px-4 py-2 text-sm text-gray-700">
						Page {{ currentPage }} sur {{ totalPages }}
					</span>
					<button
						class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						:disabled="currentPage === totalPages"
						@click="goToPage(currentPage + 1)"
					>
						Suivant
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
