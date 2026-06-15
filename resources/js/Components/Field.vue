<script setup>
defineProps({
  label: { type: String, default: null },
  hint: { type: String, default: null },
  error: { type: String, default: null },
});
</script>

<template>
  <label style="display:block">
    <div v-if="label" :style="{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '7px', letterSpacing: '-0.01em' }">{{ label }}</div>
    <slot />
    <div v-if="error" :style="{ fontSize: '12.5px', color: 'var(--danger)', marginTop: '6px' }">{{ error }}</div>
    <div v-else-if="hint" :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }">{{ hint }}</div>
  </label>
</template>
