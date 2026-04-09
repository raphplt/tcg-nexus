/**
 * Composable pour les appels API
 * Gère automatiquement la base URL et les credentials (cookies httpOnly)
 * Intercepte les erreurs 401 pour rafraîchir le token automatiquement
 */
export const useApi = () => {
	const config = useRuntimeConfig();
	const baseURL = config.public.apiBase;
	const accessToken = useCookie<string | null>("auth_token");

	let isRefreshing = false;
	let refreshPromise: Promise<boolean> | null = null;

	/**
	 * Tente de rafraîchir le token
	 */
	const attemptRefresh = async (): Promise<boolean> => {
		if (isRefreshing && refreshPromise) {
			return refreshPromise;
		}

		isRefreshing = true;
		refreshPromise = (async () => {
			try {
				const response = await $fetch<{ access_token: string }>("/auth/refresh", {
					baseURL,
					method: "POST",
					credentials: "include",
				});
				accessToken.value = response.access_token;
				return true;
			} catch {
				accessToken.value = null;
				return false;
			} finally {
				isRefreshing = false;
				refreshPromise = null;
			}
		})();

		return refreshPromise;
	};

	/**
	 * Gestionnaire d'erreur pour intercepter les 401
	 */
	const handleRequest = async <T>(
		requestFn: () => Promise<T>,
		url: string
	): Promise<T> => {
		try {
			return await requestFn();
		} catch (error: any) {
			if (error?.response?.status === 401 && !url.includes("/auth/refresh")) {
				const refreshed = await attemptRefresh();
				if (refreshed) {
					return await requestFn();
				}
			}
			throw error;
		}
	};

	return {
		/**
		 * Wrapper pour les requêtes GET avec useFetch
		 */
		get: <T>(url: string, options?: any) => {
			const headers: Record<string, string> = {
				Authorization: accessToken.value ? `Bearer ${accessToken.value}` : "",
				...options?.headers,
			};

			return useFetch<T>(url, {
				baseURL,
				credentials: "include",
				...options,
				headers,
				onResponseError: async ({ response }) => {
					if (response.status === 401 && !url.includes("/auth/refresh")) {
						await attemptRefresh();
					}
				},
			});
		},

		/**
		 * Wrapper pour les requêtes POST/PUT/DELETE avec $fetch
		 */
		post: async <T>(url: string, body?: any) => {
			return handleRequest(
				() =>
					$fetch<T>(url, {
						baseURL,
						method: "POST",
						credentials: "include",
						headers: {
							"Content-Type": "application/json",
							Authorization: accessToken.value ? `Bearer ${accessToken.value}` : "",
						},
						body,
					}),
				url
			);
		},

		put: async <T>(url: string, body?: any) => {
			return handleRequest(
				() =>
					$fetch<T>(url, {
						baseURL,
						method: "PUT",
						credentials: "include",
						headers: {
							"Content-Type": "application/json",
							Authorization: accessToken.value ? `Bearer ${accessToken.value}` : "",
						},
						body,
					}),
				url
			);
		},
		delete: async <T>(url: string) => {
			return handleRequest(
				() =>
					$fetch<T>(url, {
						baseURL,
						method: "DELETE",
						credentials: "include",
						headers: {
							Authorization: accessToken.value ? `Bearer ${accessToken.value}` : "",
						},
					}),
				url
			);
		},
	};
};
