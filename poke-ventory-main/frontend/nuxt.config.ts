import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: true },
	css: [
		"./app/assets/css/main.css",
		"filepond/dist/filepond.min.css",
		"filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css",
	],
	vite: {
		plugins: [tailwindcss()],
	},
	modules: ["@nuxt/eslint", "@nuxt/image", "@nuxt/ui"],

	runtimeConfig: {
		public: {
			apiBase: "http://localhost:8000",
		},
	},
});
