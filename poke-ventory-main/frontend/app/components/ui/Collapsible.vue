<script setup lang="ts">
interface Props {
	open?: boolean;
	defaultOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	defaultOpen: false,
});

const emit = defineEmits<{
	"update:open": [value: boolean];
}>();

const internalOpen = ref(props.defaultOpen || props.open || false);

// Synchroniser avec la prop open si elle est fournie
watch(
	() => props.open,
	(newValue) => {
		if (newValue !== undefined) {
			internalOpen.value = newValue;
		}
	},
	{ immediate: true }
);

const isOpen = computed({
	get: () => props.open !== undefined ? props.open : internalOpen.value,
	set: (value) => {
		internalOpen.value = value;
		emit("update:open", value);
	},
});

const toggle = () => {
	isOpen.value = !isOpen.value;
};
</script>

<template>
	<div class="w-full">
		<slot :isOpen="isOpen" :toggle="toggle" />
	</div>
</template>

