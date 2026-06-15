<script setup>
// optional right-side slot via #right
</script>

<template>
  <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--gap-sm)' }">
    <div :style="{ fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-3)' }"><slot /></div>
    <slot name="right" />
  </div>
</template>
