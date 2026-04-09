/**
 * Middleware pour protéger les routes nécessitant une authentification
 * Redirige vers /auth/login si non connecté
 */
export default defineNuxtRouteMiddleware((to) => {
	const { isAuthenticated } = useAuth();

	if (!isAuthenticated.value) {
		return navigateTo({
			path: "/auth/login",
			query: { redirect: to.fullPath }, // Permet de rediriger après login
		});
	}
});
