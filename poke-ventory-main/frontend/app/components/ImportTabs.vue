<script setup lang="ts">
type ImportTab = "photo" | "file" | "search";
type ImportType = "cards" | "products";

const activeTab = ref<ImportTab>("search");
const importType = ref<ImportType>("cards");

const tabs = [
	{
		id: "search" as ImportTab,
		label: "Par recherche",
		icon: "🔍",
		description: "Recherche dans la base",
	},
	{
		id: "photo" as ImportTab,
		label: "Par photo",
		icon: "📷",
		description: "Analyse automatique d'images",
	},
	{
		id: "file" as ImportTab,
		label: "Par fichier",
		icon: "📄",
		description: "Import CSV/Excel",
	},
];

const setActiveTab = (tabId: ImportTab) => {
	activeTab.value = tabId;
};

const setImportType = (type: ImportType) => {
	importType.value = type;
};
</script>

<template>
	<div class="space-y-4">
		<div class="flex items-center justify-between border-b border-gray-200 pb-2">
			<div class="flex items-center gap-1">
				<button
					class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
					:class="
						importType === 'cards'
							? 'bg-blue-50 text-blue-700'
							: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
					"
					@click="setImportType('cards')"
				>
					<span class="mr-1.5">🎴</span>
					Cartes
				</button>
				<button
					class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
					:class="
						importType === 'products'
							? 'bg-purple-50 text-purple-700'
							: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
					"
					@click="setImportType('products')"
				>
					<span class="mr-1.5">📦</span>
					Produits scellés
				</button>
			</div>
		</div>

		<!-- Méthodes d'import -->
		<div class="border-b border-gray-200">
			<nav class="flex gap-1 -mb-px" aria-label="Méthodes d'import">
				<button
					v-for="tab in tabs"
					:key="tab.id"
					class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
					:class="
						activeTab === tab.id
							? 'border-blue-500 text-blue-600'
							: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
					"
					@click="setActiveTab(tab.id)"
				>
					<span class="mr-2">{{ tab.icon }}</span>
					{{ tab.label }}
				</button>
			</nav>
		</div>

		<main>
			<div class="bg-white rounded-lg border border-gray-200 p-6">
				<ImportPhotoTab v-if="activeTab === 'photo'" :import-type="importType" />
				<ImportFileTab v-if="activeTab === 'file'" :import-type="importType" />
				<ImportSearchTab v-if="activeTab === 'search'" :import-type="importType" />
			</div>
		</main>
	</div>
</template>
