<script setup lang="ts">
interface Props {
	importType: "cards" | "products";
}

interface ImportResult {
	count: number;
	message: string;
}

const props = defineProps<Props>();

const selectedFile = ref<File | null>(null);
const isProcessing = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const importResults = ref<ImportResult | null>(null);

const handleFileChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	if (target.files && target.files.length > 0) {
		const file = target.files[0];
		if (file) {
			selectedFile.value = file;
			errorMessage.value = null;
		}
	}
};

const processFile = async () => {
	if (!selectedFile.value) {
		errorMessage.value = "Sélectionne d'abord un fichier CSV ou Excel.";
		return;
	}

	isProcessing.value = true;
	errorMessage.value = null;
	successMessage.value = null;

	try {
		// TODO: Implémenter l'appel API pour traiter le fichier
		// const formData = new FormData();
		// formData.append('file', selectedFile.value);
		// const response = await $fetch('/api/imports/file', {
		//   method: 'POST',
		//   body: formData
		// });

		// Simulation pour l'instant
		await new Promise((resolve) => setTimeout(resolve, 1500));
		successMessage.value =
			"Fichier traité avec succès ! (fonctionnalité en développement)";
		importResults.value = { count: 0, message: "Import bientôt disponible" };
	} catch (error: unknown) {
		errorMessage.value =
			error instanceof Error
				? error.message
				: "Une erreur est survenue lors du traitement du fichier.";
	} finally {
		isProcessing.value = false;
	}
};

const resetFile = () => {
	selectedFile.value = null;
	importResults.value = null;
	errorMessage.value = null;
	successMessage.value = null;
};
</script>

<template>
	<div class="space-y-6">
		<div>
			<h2 class="text-xl font-semibold text-gray-900 mb-1">Import par fichier</h2>
			<p class="text-sm text-gray-600">
				{{
					props.importType === "cards"
						? "Importe tes cartes depuis un fichier CSV ou Excel."
						: "Importe tes produits scellés depuis un fichier CSV ou Excel."
				}}
			</p>
		</div>

		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
			<h3 class="text-sm font-semibold text-gray-900 mb-3">Format du fichier</h3>
			<div class="text-xs text-gray-600 space-y-1.5">
				<p>Ton fichier doit contenir les colonnes suivantes :</p>
				<ul v-if="props.importType === 'cards'" class="list-disc list-inside ml-3">
					<li><strong>nom</strong> : Nom de la carte</li>
					<li><strong>set</strong> : Nom ou code du set</li>
					<li><strong>numero</strong> : Numéro de la carte dans le set</li>
					<li>
						<strong>quantite</strong> : Quantité possédée (optionnel, défaut: 1)
					</li>
				</ul>
				<ul v-else class="list-disc list-inside ml-3">
					<li>
						<strong>nom</strong> : Nom du produit (ex: Booster Écarlate et Violet)
					</li>
					<li>
						<strong>type</strong> : Type de produit (booster, display, ETB, coffret,
						etc.)
					</li>
					<li><strong>set</strong> : Nom du set Pokémon</li>
					<li>
						<strong>quantite</strong> : Quantité possédée (optionnel, défaut: 1)
					</li>
				</ul>
				<p class="mt-3 text-xs text-gray-500">
					Formats acceptés : .csv, .xlsx, .xls
				</p>
			</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
			<label class="block">
				<span class="text-sm font-medium text-gray-700 mb-2 block"
					>Sélectionner un fichier</span
				>
				<input
					type="file"
					accept=".csv,.xlsx,.xls"
					class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
					@change="handleFileChange"
				/>
			</label>

			<div v-if="selectedFile" class="mt-3 p-3 bg-white rounded-md text-xs border border-gray-200">
				<p class="font-medium text-gray-900">Fichier sélectionné :</p>
				<p class="text-gray-600 mt-0.5">
					{{ selectedFile.name }} ({{ (selectedFile.size / 1024).toFixed(1) }} KB)
				</p>
			</div>
		</div>

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

		<div class="flex gap-3">
			<button
				class="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md disabled:opacity-50 hover:bg-blue-700 transition-colors"
				:disabled="isProcessing || !selectedFile"
				@click="processFile"
			>
				{{ isProcessing ? "Traitement en cours..." : "Traiter le fichier" }}
			</button>
			<button
				v-if="selectedFile"
				class="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
				@click="resetFile"
			>
				Annuler
			</button>
		</div>

		<div v-if="importResults" class="rounded-lg border border-gray-200 bg-white p-4">
			<h3 class="text-sm font-semibold text-gray-900 mb-2">Résultats de l'import</h3>
			<p class="text-xs text-gray-600">{{ importResults.message }}</p>
		</div>

		<div
			class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700"
		>
			<p class="font-medium mb-0.5">⚠️ Fonctionnalité en développement</p>
			<p>
				L'import par fichier sera bientôt disponible. Cette interface est en
				préparation.
			</p>
		</div>
	</div>
</template>
