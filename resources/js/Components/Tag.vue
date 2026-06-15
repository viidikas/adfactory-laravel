<script setup>
import { computed } from 'vue';
const props = defineProps({ active: Boolean, clickable: { type: Boolean, default: undefined } });
const emit = defineEmits(['click']);
const interactive = computed(() => props.clickable ?? true);
</script>

<template>
  <span
    @click="emit('click')"
    :style="{
      display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px',
      borderRadius: 'var(--r-chip)', fontSize: '12px', fontWeight: 500,
      background: active ? 'var(--accent-soft)' : 'var(--surface-3)',
      color: active ? 'var(--accent)' : 'var(--text-2)',
      border: '1px solid', borderColor: active ? 'var(--accent-ring)' : 'transparent',
      cursor: interactive ? 'pointer' : 'default',
    }"
  ><slot /></span>
</template>
