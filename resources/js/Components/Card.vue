<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  pad: { type: Boolean, default: true },
  hover: Boolean,
  clickable: Boolean,
});
const h = ref(false);
const style = computed(() => ({
  background: 'var(--surface-2)', border: '1px solid',
  borderRadius: 'var(--r-card)', boxShadow: 'var(--shadow-card)',
  padding: props.pad ? 'var(--pad-card)' : '0',
  transition: 'border-color .15s, transform .15s',
  cursor: props.clickable ? 'pointer' : 'default',
  borderColor: props.hover && h.value ? 'var(--border-strong)' : 'var(--border)',
  transform: props.hover && h.value ? 'translateY(-2px)' : 'none',
}));
</script>

<template>
  <div :style="style" @mouseenter="h = true" @mouseleave="h = false">
    <slot />
  </div>
</template>
