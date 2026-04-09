<script setup lang="ts">
import type { CardCandidate, CardDraft, SubjectType } from "~/types/api";

interface Props {
	importType: "cards" | "products";
}

interface FileItem {
	file: File;
}

const props = defineProps<Props>();

const files = ref<File[]>([]);
const currentBatch = ref<CardDraft[] | null>(null);
const batchId = ref<string | null>(null);
const isAnalyzing = ref(false);
const selectionLoading = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const expanded = ref<Record<string, boolean>>({});
const subjectType = ref<SubjectType>("cards");
const lastReportPath = ref<string | null>(null);

const { uploadBatch, selectDraft } = useImports();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const getErrorDetail = (error: unknown) => {
	if (typeof error === "object" && error && "data" in error) {
		const data = (error as { data?: { detail?: string } }).data;
		if (data?.detail) {
			return data.detail;
		}
	}
	if (error instanceof Error) {
		return error.message;
	}
	return "Une erreur est survenue.";
};

const handleUpdate = (fileItems: FileItem[]) => {
	files.value = fileItems.map((item) => item.file);
};

const analyzeImages = async () => {
	if (!files.value.length) {
		errorMessage.value = "Ajoute au moins une image avant de lancer l'analyse.";
		return;
	}

	isAnalyzing.value = true;
	errorMessage.value = null;
	successMessage.value = null;
	try {
		const response = await uploadBatch(files.value, subjectType.value);
		currentBatch.value = response.drafts;
		batchId.value = response.batch_id;
		lastReportPath.value = response.report_path ?? null;
		expanded.value = {};
		if (response.drafts.length) {
			const reportInfo = lastReportPath.value
				? ` (rapport: ${lastReportPath.value})`
				: "";
			successMessage.value = `Analyse terminée (${response.drafts.length} détection(s))${reportInfo}`;
		} else {
			successMessage.value = "Analyse terminée, aucune carte détectée.";
		}
	} catch (error: unknown) {
		errorMessage.value = getErrorDetail(error);
	} finally {
		isAnalyzing.value = false;
	}
};

const toggleExpanded = (draftId: string) => {
	expanded.value[draftId] = !expanded.value[draftId];
};

const updateDraft = (updated: CardDraft) => {
	if (!currentBatch.value) return;
	currentBatch.value = currentBatch.value.map((draft) =>
		draft.id === updated.id ? updated : draft
	);
};

const handleValidation = async (draft: CardDraft, candidate: CardCandidate) => {
	if (draft.subject_type !== "cards") {
		errorMessage.value =
			"La validation d'items scellés n'est pas encore disponible.";
		return;
	}
	selectionLoading.value = draft.id;
	errorMessage.value = null;
	successMessage.value = null;

	try {
		const response = await selectDraft(draft.id, {
			card_id: candidate.card_id,
			quantity: 1,
		});
		updateDraft(response.draft);
		successMessage.value = `Carte ${candidate.name} ajoutée à ta collection !`;
	} catch (error: unknown) {
		errorMessage.value = getErrorDetail(error);
	} finally {
		selectionLoading.value = null;
	}
};

const resetAnalysis = () => {
	files.value = [];
	currentBatch.value = null;
	batchId.value = null;
	lastReportPath.value = null;
	expanded.value = {};
};

const candidateScore = (candidate?: CardCandidate) =>
	candidate ? Math.round(candidate.score * 100) : 0;

// Synchroniser subjectType avec importType
watchEffect(() => {
	subjectType.value = props.importType === "cards" ? "cards" : "sealed";
});
</script>

<template>
	<div class="space-y-6">
		<div class="flex items-start justify-between gap-4">
			<div class="flex-1">
				<h2 class="text-xl font-semibold text-gray-900 mb-1">Import par photo</h2>
				<p class="text-sm text-gray-600">
					{{
						props.importType === "cards"
							? "Sélectionne tes images de cartes puis lance l'analyse automatique."
							: "Sélectionne tes images de produits scellés puis lance l'analyse automatique."
					}}
				</p>
			</div>
			<button
				class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md disabled:opacity-50 hover:bg-blue-700 transition-colors shrink-0"
				:disabled="isAnalyzing || !files.length"
				@click="analyzeImages"
			>
				{{ isAnalyzing ? "Analyse en cours..." : "Analyser les images" }}
			</button>
		</div>

		<ClientOnly>
			<!-- cspell:ignore updatefiles -->
			<FilePond
				name="images"
				class="mt-2"
				:allow-multiple="true"
				:allow-process="false"
				accepted-file-types="image/*"
				label-idle="Dépose une image ou <span class='filepond--label-action'>Parcourir</span>"
				@updatefiles="handleUpdate"
			/>
		</ClientOnly>

		<div v-if="files.length" class="rounded-lg border border-gray-200 p-4 bg-gray-50">
			<h3 class="text-sm font-semibold text-gray-900 mb-2">Images sélectionnées</h3>
			<ul class="mt-2 list-inside list-disc text-xs text-gray-600 space-y-0.5">
				<li v-for="file in files" :key="file.name">
					{{ file.name }} ({{ (file.size / 1024).toFixed(1) }} KB)
				</li>
			</ul>
			<button
				class="mt-3 text-xs text-red-600 underline hover:text-red-700"
				@click="resetAnalysis"
			>
				Vider la sélection
			</button>
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

		<div v-if="currentBatch && currentBatch.length" class="space-y-4">
			<h3 class="text-lg font-semibold text-gray-900">Résultats de l'analyse</h3>
			<div
				v-for="draft in currentBatch"
				:key="draft.id"
				class="grid gap-4 rounded border border-gray-200 bg-white p-4 md:grid-cols-3"
			>
				<div class="flex flex-col items-center space-y-2">
					<img
						:src="`${apiBase}${draft.image_url}`"
						alt="Carte détectée"
						class="max-h-64 rounded object-contain"
						loading="lazy"
					>
					<span
						class="text-xs font-semibold uppercase"
						:class="[
							draft.subject_type === 'cards' ? 'text-blue-600' : 'text-amber-600',
							draft.status === 'validated' ? 'text-emerald-600' : '',
						]"
					>
						{{ draft.subject_type === "cards" ? "Carte détectée" : "Item scellé" }}
					</span>
				</div>

				<div class="space-y-2 md:col-span-2">
					<div
						v-if="draft.subject_type === 'cards' && draft.candidates.length"
						class="flex items-center justify-between rounded border p-3"
					>
						<div>
							<p class="text-lg font-semibold">{{ draft.candidates[0]?.name }}</p>
							<p class="text-sm text-gray-500">
								{{ draft.candidates[0]?.set_name }} · #{{
									draft.candidates[0]?.local_id
								}}
							</p>
							<p class="text-xs text-gray-400">
								Confiance : {{ candidateScore(draft.candidates[0]) }}%
							</p>
						</div>
						<button
							class="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50 hover:bg-emerald-700 transition-colors"
							:disabled="draft.status === 'validated' || selectionLoading === draft.id"
							@click="handleValidation(draft, draft.candidates[0]!)"
						>
							{{ draft.status === "validated" ? "Validée" : "Valider" }}
						</button>
					</div>

					<div
						v-else-if="draft.subject_type !== 'cards'"
						class="rounded border border-dashed p-4 text-sm text-amber-600"
					>
						Analyse des items scellés en préparation. Cette image est enregistrée et
						pourra être traitée plus tard.
					</div>

					<div v-else class="rounded border border-dashed p-4 text-sm text-gray-500">
						Pas encore de suggestion, tu peux relancer une analyse ou sélectionner
						manuellement une carte.
					</div>

					<div class="text-right">
						<button
							class="text-sm text-blue-600 underline hover:text-blue-800"
							@click="toggleExpanded(draft.id)"
						>
							{{ expanded[draft.id] ? "Masquer" : "Plus d'options" }}
						</button>
					</div>

					<div v-if="expanded[draft.id]" class="space-y-2">
						<div v-if="draft.subject_type === 'cards'">
							<div
								v-for="candidate in draft.candidates.slice(1)"
								:key="candidate.card_id"
								class="flex items-center justify-between rounded border p-3"
							>
								<div>
									<p class="font-medium">{{ candidate.name }}</p>
									<p class="text-sm text-gray-500">
										{{ candidate.set_name }} · #{{ candidate.local_id }}
									</p>
									<p class="text-xs text-gray-400">
										Confiance : {{ candidateScore(candidate) }}%
									</p>
								</div>
								<button
									class="rounded border border-blue-500 px-4 py-2 text-blue-500 disabled:opacity-50 hover:bg-blue-50 transition-colors"
									:disabled="
										draft.status === 'validated' || selectionLoading === draft.id
									"
									@click="handleValidation(draft, candidate)"
								>
									Sélectionner
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div
			v-else-if="batchId"
			class="rounded border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700"
		>
			Aucune carte n'a été détectée dans ce lot. Essaie d'ajuster tes photos ou
			d'importer une nouvelle image.
		</div>
		<div v-if="lastReportPath" class="text-xs text-gray-400">
			Rapport stocké dans : {{ lastReportPath }}
		</div>
	</div>
</template>
