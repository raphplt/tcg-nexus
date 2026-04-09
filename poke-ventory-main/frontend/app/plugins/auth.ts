/**
 * Plugin pour initialiser l'utilisateur au chargement de l'app
 * Vérifie si l'utilisateur est déjà connecté (via cookie)
 */
export default defineNuxtPlugin(async () => {
	const { fetchUser } = useAuth();

	await fetchUser();
});
