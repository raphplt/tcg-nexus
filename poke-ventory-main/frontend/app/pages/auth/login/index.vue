<template>
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
			<div>
				<h2 class="text-center text-3xl font-bold text-gray-900">Connexion</h2>
				<p class="mt-2 text-center text-sm text-gray-600">
					Pas encore de compte ?
					<NuxtLink
						to="/auth/register"
						class="font-medium text-blue-600 hover:text-blue-500"
					>
						Inscrivez-vous
					</NuxtLink>
				</p>
			</div>

			<form class="mt-8 space-y-6" @submit.prevent="handleLogin">
				<!-- Message d'erreur -->
				<div
					v-if="errorMessage"
					class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
				>
					{{ errorMessage }}
				</div>

				<div class="space-y-4">
					<!-- Username -->
					<div>
						<label for="username" class="block text-sm font-medium text-gray-700">
							Nom d'utilisateur
						</label>
						<input
							id="username"
							v-model="form.username"
							type="text"
							required
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							placeholder="username"
						/>
					</div>

					<!-- Password -->
					<div>
						<label for="password" class="block text-sm font-medium text-gray-700">
							Mot de passe
						</label>
						<input
							id="password"
							v-model="form.password"
							type="password"
							required
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							placeholder="********"
						/>
					</div>
				</div>

				<button
					type="submit"
					:disabled="isLoading"
					class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{{ isLoading ? "Connexion..." : "Se connecter" }}
				</button>
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { LoginCredentials } from "~/types/auth";

definePageMeta({
	middleware: "guest", // Redirige si déjà connecté
});

const { login } = useAuth();
const router = useRouter();

const form = ref<LoginCredentials>({
	username: "",
	password: "",
});

const isLoading = ref(false);
const errorMessage = ref("");

const handleLogin = async () => {
	isLoading.value = true;
	errorMessage.value = "";

	const result = await login(form.value);

	isLoading.value = false;

	if (result.success) {
		// Redirection vers la page demandee ou l'accueil
		const redirect = (useRoute().query.redirect as string) || "/";
		await router.push(redirect);
	} else {
		errorMessage.value = result.error || "Erreur de connexion";
	}
};
</script>
