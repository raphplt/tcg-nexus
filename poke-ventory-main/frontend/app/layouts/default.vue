<template>
	<div class="min-h-screen bg-gray-50">
		<nav class="bg-white shadow-sm">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex justify-between h-16">
					<div class="flex items-center">
						<NuxtLink to="/" class="flex items-center gap-2 text-xl font-bold text-gray-900">
							<img :src="logoImage" alt="PokeVentory" class="w-10 h-10" />
							PokeVentory
						</NuxtLink>
					</div>

					<div class="flex items-center space-x-4">
						<NuxtLink
							to="/cards"
							class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
						>
							Cartes
						</NuxtLink>

						<template v-if="isAuthenticated">

                        <NuxtLink
							to="/import"
							class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
						>
							Importer
						</NuxtLink>
                        <NuxtLink
							to="/collection"
							class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
						>
							Collection
						</NuxtLink>
                            
							<span class="text-sm text-gray-600">
								{{ user?.username }}
							</span>
							<button
								class="flex items-center px-3 py-1 rounded-md text-sm font-medium border-red-600 
                                border text-red-600 hover:bg-red-50 cursor-pointer hover:scale-105"
								@click="handleLogout"
							>
                                <Icon name="mdi:logout" class="inline-block w-4 h-4 mr-1" />
								Déconnexion
							</button>
						</template>

						<template v-else>
							<NuxtLink
								to="/auth/login"
								class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
							>
								Connexion
							</NuxtLink>
							<NuxtLink
								to="/auth/register"
								class="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
							>
								Inscription
							</NuxtLink>
						</template>
					</div>
				</div>
			</div>
		</nav>

		<main>
			<slot />
		</main>
	</div>
</template>

<script setup lang="ts">
import logoImage from "~/assets/images/Logo.png";

const { user, isAuthenticated, logout } = useAuth();
const router = useRouter();

const handleLogout = async () => {
	await logout();
	await router.push("/auth/login");
};
</script>
