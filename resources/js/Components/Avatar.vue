<script setup>
import { computed } from 'vue';
const props = defineProps({
  name: { type: String, default: '' },
  size: { type: Number, default: 30 },
});
const init = computed(() => props.name.split(' ').map((s) => s[0]).slice(0, 2).join(''));
const hue = computed(() => {
  const hues = ['#2e6b57', '#365b7a', '#7a5a36', '#6b3550', '#4b3a6b'];
  return hues[props.name.length % hues.length];
});
</script>

<template>
  <div :style="{
    width: size + 'px', height: size + 'px', borderRadius: '999px', flexShrink: 0,
    background: hue, color: '#fff', display: 'grid', placeItems: 'center',
    fontSize: (size * 0.38) + 'px', fontWeight: 700, letterSpacing: '0.01em',
  }">{{ init }}</div>
</template>
