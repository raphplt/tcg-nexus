<script setup lang="ts">
interface Props {
  options: any[];
  modelValue: any[];
  optionLabel?: string;
  optionValue?: string;
  placeholder?: string;
  searchable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  optionLabel: 'name',
  optionValue: 'id',
  placeholder: 'Sélectionner...',
  searchable: false,
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);
const searchQuery = ref('');

const toggle = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    searchQuery.value = '';
  }
};

const close = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', close);
});

onUnmounted(() => {
  document.removeEventListener('click', close);
});

const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value) {
    return props.options;
  }
  const query = searchQuery.value.toLowerCase();
  return props.options.filter(option => {
    const label = getLabel(option);
    return String(label).toLowerCase().includes(query);
  });
});

const getLabel = (option: any) => {
  if (typeof option === 'object' && option !== null) {
    return option[props.optionLabel];
  }
  return option;
};

const getValue = (option: any) => {
  if (typeof option === 'object' && option !== null && props.optionValue) {
    return option[props.optionValue];
  }
  return option;
};

const isSelected = (option: any) => {
  const value = getValue(option);
  return props.modelValue.includes(value);
};

const toggleOption = (option: any) => {
  const value = getValue(option);
  const newModelValue = [...props.modelValue];
  const index = newModelValue.indexOf(value);
  
  if (index === -1) {
    newModelValue.push(value);
  } else {
    newModelValue.splice(index, 1);
  }
  
  emit('update:modelValue', newModelValue);
};

const displayValue = computed(() => {
  if (props.modelValue.length === 0) return props.placeholder;
  if (props.modelValue.length === 1) {
    const option = props.options.find(o => getValue(o) === props.modelValue[0]);
    return option ? getLabel(option) : props.modelValue[0];
  }
  return `${props.modelValue.length} sélectionné(s)`;
});
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <button
      type="button"
      class="w-full flex items-center justify-between px-3 py-2 text-sm text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      @click.stop="toggle"
    >
      <span class="block truncate" :class="{ 'text-gray-500': modelValue.length === 0 }">
        {{ displayValue }}
      </span>
      <span class="flex items-center pointer-events-none">
        <Icon name="mdi:chevron-down" class="w-5 h-5 text-gray-400" />
      </span>
    </button>

    <div
      v-if="isOpen"
      class="absolute z-50 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
    >
      <div v-if="searchable" class="sticky top-0 z-10 bg-white px-2 py-2 border-b border-gray-100">
        <input
          v-model="searchQuery"
          type="text"
          class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Rechercher..."
          @click.stop
        />
      </div>
      
      <div v-if="filteredOptions.length === 0" class="px-4 py-2 text-sm text-gray-500">
        Aucun résultat
      </div>

      <div
        v-for="(option, index) in filteredOptions"
        :key="index"
        class="relative flex items-center px-4 py-2 cursor-pointer hover:bg-gray-100"
        @click.stop="toggleOption(option)"
      >
        <div class="flex items-center h-5">
          <input
            type="checkbox"
            :checked="isSelected(option)"
            class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            readonly
          />
        </div>
        <div class="ml-3 text-sm text-gray-700">
          {{ getLabel(option) }}
        </div>
      </div>
    </div>
  </div>
</template>
