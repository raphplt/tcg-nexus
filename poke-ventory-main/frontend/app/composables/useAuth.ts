import type {
	User,
	LoginCredentials,
	RegisterData,
	AuthResponse,
} from "~/types/auth";

interface FetchError {
	data?: {
		detail?: string;
	};
}

/**
 * Composable pour gérer l'authentification
 * Utilise useCookie pour persister le token entre les rechargements
 */
export const useAuth = () => {
	const api = useApi();

	const user = useState<User | null>("auth:user", () => null);

	// Stocker le token dans un cookie
	const accessToken = useCookie<string | null>("auth_token", {
		maxAge: 60 * 30,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	});

	const isAuthenticated = computed(() => !!user.value && !!accessToken.value);

	/**
	 * Login
	 */
	const login = async (credentials: LoginCredentials) => {
		try {
			const response = await api.post<AuthResponse>("/auth/login", credentials);
			accessToken.value = response.access_token;

			const me = await api.get<User>("/auth/me", {
				headers: {
					Authorization: `Bearer ${accessToken.value}`,
				},
			});
			user.value = me.data.value || null;

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: (error as FetchError).data?.detail || "Erreur de connexion",
			};
		}
	};

	/**
	 * Register
	 */
	const register = async (data: RegisterData) => {
		try {
			await api.post("/users/", data);
			return await login({
				username: data.username,
				password: data.password,
			});
		} catch (error) {
			return {
				success: false,
				error: (error as FetchError).data?.detail || "Erreur d'inscription",
			};
		}
	};

	/**
	 * Logout
	 */
	const logout = async () => {
		try {
			await api.post("/auth/logout");
			user.value = null;
			accessToken.value = null;
		} catch {
			user.value = null;
			accessToken.value = null;
		}
	};

	/**
	 * Récupérer l'utilisateur courant
	 */
	const fetchUser = async () => {
		if (!accessToken.value) {
			user.value = null;
			return;
		}

		try {
			const me = await api.get<User>("/auth/me", {
				headers: {
					Authorization: `Bearer ${accessToken.value}`,
				},
			});
			user.value = me.data.value || null;
		} catch {
			user.value = null;
			accessToken.value = null;
		}
	};

	/**
	 * Refresh token
	 */
	const refreshToken = async () => {
		try {
			const response = await api.post<AuthResponse>("/auth/refresh");
			accessToken.value = response.access_token;
			// Récupérer les infos utilisateur après le refresh
			await fetchUser();
			return true;
		} catch {
			user.value = null;
			accessToken.value = null;
			return false;
		}
	};

	return {
		user: readonly(user),
		isAuthenticated,

		login,
		register,
		logout,
		fetchUser,
		refreshToken,
	};
};
