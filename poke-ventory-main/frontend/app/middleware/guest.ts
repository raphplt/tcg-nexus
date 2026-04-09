/**
 * Middleware pour les pages guest (login, register)
 * Redirige vers l'accueil si déjà connecté
 */
export default defineNuxtRouteMiddleware(() => {
	const { isAuthenticated } = useAuth();

	if (isAuthenticated.value) {
		return navigateTo("/");
	}
});
