<script setup lang="ts">
import type { Card } from "~/types/api";

interface Props {
	results: Card[];
	totalResults: number;
	currentPage: number;
	pageSize: number;
	isAdding: boolean;
}

const props = defineProps<Props>();
const selectedCards = defineModel<Set<string>>("selectedCards", { default: () => new Set() });

const emit = defineEmits(["update:page", "add", "reset"]);

const totalPages = computed(() => {
	return Math.ceil(props.totalResults / props.pageSize);
});

const toggleCardSelection = (cardId: string) => {
	const newSelection = new Set(selectedCards.value);
	if (newSelection.has(cardId)) {
		newSelection.delete(cardId);
	} else {
		newSelection.add(cardId);
	}
	selectedCards.value = newSelection;
};

const goToPage = (page: number) => {
	if (page >= 1 && page <= totalPages.value) {
		emit("update:page", page);
	}
};
</script>

<template>
	<div v-if="results.length > 0" class="space-y-4">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-lg font-semibold text-gray-900">
					Résultats ({{ totalResults }})
				</h3>
				<p v-if="selectedCards.size > 0" class="text-sm text-gray-600 mt-1">
					{{ selectedCards.size }} carte(s) sélectionnée(s)
				</p>
			</div>
			<button
				v-if="selectedCards.size > 0"
				class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
				:disabled="isAdding"
				@click="emit('add')"
			>
				{{ isAdding ? "Ajout..." : `Ajouter ${selectedCards.size} carte(s)` }}
			</button>
		</div>

		<!-- Grille de cartes -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			<div
				v-for="card in results"
				:key="card.id"
				class="rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md"
				:class="
					selectedCards.has(card.id)
						? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
						: 'border-gray-200 bg-white hover:border-gray-300'
				"
				@click="toggleCardSelection(card.id)"
			>
				<div class="flex items-start gap-3">
					<input
						type="checkbox"
						:checked="selectedCards.has(card.id)"
						class="mt-1 text-blue-600 focus:ring-blue-500"
						@click.stop="toggleCardSelection(card.id)"
					/>
					<div class="flex-1 min-w-0">
						<div v-if="card.image" class="mb-2">
							<img
								:src="card.image + '/high.png'"
								:alt="card.name"
								class="w-full h-32 object-contain rounded"
							/>
						</div>
						<p class="font-semibold text-sm text-gray-900 truncate">
							{{ card.name }}
						</p>
						<p class="text-xs text-gray-500 mt-1">
							#{{ card.local_id }}
						</p>
						<div v-if="card.rarity" class="mt-1">
							<span
								class="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700"
							>
								{{ card.rarity }}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Pagination -->
		<div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-4">
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

		<div class="pt-4 border-t border-gray-200">
			<button
				class="text-sm text-gray-500 underline hover:text-gray-700"
				@click="emit('reset')"
			>
				Nouvelle recherche
			</button>
		</div>
	</div>
</template>
