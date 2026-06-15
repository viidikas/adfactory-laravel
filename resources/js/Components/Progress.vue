<script setup>
defineProps({
  value: { type: Number, default: 0 },
  color: { type: String, default: null },
});
</script>

<template>
  <div :style="{ height: '6px', borderRadius: '999px', background: 'var(--surface-3)', overflow: 'hidden' }">
    <div :style="{ width: value + '%', height: '100%', borderRadius: '999px', background: color || 'var(--accent)', transition: 'width .5s var(--ease, ease)' }" />
  </div>
</template>
