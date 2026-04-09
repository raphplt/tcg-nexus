import { defineNuxtPlugin } from "#app";
import vueFilePond from "vue-filepond";
import * as FilePond from "filepond";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import type { Component } from "vue";

FilePond.registerPlugin(FilePondPluginImagePreview);

export default defineNuxtPlugin((nuxtApp) => {
	const FilePondComponent = vueFilePond(FilePondPluginImagePreview);
	nuxtApp.vueApp.component("FilePond", FilePondComponent as Component);
});
