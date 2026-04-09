<template>
	<div class="container mx-auto p-8">
		<div class="max-w-4xl mx-auto">
			<h1 class="text-4xl font-bold mb-4">PokeVentory</h1>
			<p class="text-gray-600 mb-8">Gestion de collection de cartes Pokémon</p>

			<!-- Message de bienvenue si connecté -->
			<div
				v-if="isAuthenticated"
				class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8"
			>
				<p class="text-blue-900">
					Bienvenue <span class="font-semibold">{{ user?.username }}</span> !
				</p>
			</div>

			<!-- Navigation principale -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<NuxtLink
					to="/cards"
					class="block p-6 border border-gray-300 rounded-lg hover:shadow-lg transition-shadow bg-white"
				>
					<h2 class="text-xl font-semibold mb-2">📋 Catalogue de cartes</h2>
					<p class="text-gray-600">
						Parcourir toutes les cartes Pokémon disponibles
					</p>
				</NuxtLink>

				<div
					class="block p-6 border border-gray-300 rounded-lg bg-gray-50 opacity-50 cursor-not-allowed"
				>
					<h2 class="text-xl font-semibold mb-2">🎒 Ma collection</h2>
					<p class="text-gray-600">Gérer votre collection personnelle</p>
					<span class="text-xs text-gray-500">(Bientôt disponible)</span>
				</div>
			</div>

			<!-- Statistiques si connecté -->
			<div v-if="isAuthenticated" class="mt-8 p-6 bg-white rounded-lg border border-gray-300">
				<h3 class="text-lg font-semibold mb-4">Statistiques</h3>
				<div class="grid grid-cols-3 gap-4 text-center">
					<div>
						<p class="text-3xl font-bold text-blue-600">0</p>
						<p class="text-sm text-gray-600">Cartes possédées</p>
					</div>
					<div>
						<p class="text-3xl font-bold text-green-600">0</p>
						<p class="text-sm text-gray-600">Sets complétés</p>
					</div>
					<div>
						<p class="text-3xl font-bold text-purple-600">0%</p>
						<p class="text-sm text-gray-600">Collection totale</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const { user, isAuthenticated } = useAuth();
</script>
