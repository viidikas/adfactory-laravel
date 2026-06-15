<script setup>
import { ref, computed } from 'vue';
import Icon from './Icon.vue';

const props = defineProps({
  name: { type: String, required: true },
  title: { type: String, default: null },
  size: { type: Number, default: 36 },
  active: Boolean,
  badge: Boolean,
});
const hover = ref(false);
const style = computed(() => ({
  position: 'relative', width: props.size + 'px', height: props.size + 'px',
  display: 'grid', placeItems: 'center', borderRadius: '10px', border: '1px solid',
  cursor: 'pointer',
  borderColor: props.active ? 'var(--border-strong)' : 'transparent',
  backgroundColor: props.active || hover.value ? 'var(--surface-3)' : 'transparent',
  color: props.active ? 'var(--text-1)' : 'var(--text-2)',
  transition: 'background .15s, color .15s',
}));
</script>

<template>
  <button :title="title" :style="style" @mouseenter="hover = true" @mouseleave="hover = false">
    <Icon :name="name" :size="18" />
    <span v-if="badge" :style="{ position: 'absolute', top: '6px', right: '6px', width: '7px', height: '7px', borderRadius: '999px', background: 'var(--accent)' }" />
  </button>
</template>
