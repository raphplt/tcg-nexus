import type {
	CardSelectionPayload,
	CardSelectionResponse,
	ImportBatchResponse,
	SubjectType,
} from "~/types/api";

export const useImports = () => {
	const config = useRuntimeConfig();
	const baseURL = config.public.apiBase;
	const accessToken = useCookie<string | null>("auth_token");

	const authHeaders = (): Record<string, string> => {
		return accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {};
	};

	const uploadBatch = async (
		files: File[],
		subjectType: SubjectType
	): Promise<ImportBatchResponse> => {
		const formData = new FormData();
		files.forEach((file) => formData.append("files", file));
		formData.append("subject_type", subjectType);

		return await $fetch<ImportBatchResponse>("/imports/batches", {
			baseURL,
			method: "POST",
			body: formData,
			credentials: "include",
			headers: authHeaders(),
		});
	};

	const fetchBatch = async (batchId: string): Promise<ImportBatchResponse> => {
		return await $fetch<ImportBatchResponse>(`/imports/batches/${batchId}`, {
			baseURL,
			method: "GET",
			credentials: "include",
			headers: authHeaders(),
		});
	};

	const selectDraft = async (
		draftId: string,
		payload: CardSelectionPayload
	): Promise<CardSelectionResponse> => {
		return await $fetch<CardSelectionResponse>(`/imports/drafts/${draftId}/select`, {
			baseURL,
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
				...authHeaders(),
			},
			body: payload,
		});
	};

	return {
		uploadBatch,
		fetchBatch,
		selectDraft,
	};
};
