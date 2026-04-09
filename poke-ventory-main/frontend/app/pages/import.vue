<template>
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900">Importer ma collection</h1>
			<p class="text-gray-600 mt-2 text-sm">
				Choisis la méthode d'import qui te convient le mieux
			</p>
		</div>
		
		<ImportTabs />
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	middleware: "auth",
});
</script>