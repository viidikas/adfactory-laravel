<script setup>
import { computed } from 'vue';
const props = defineProps({
  data: { type: Array, default: () => [] },
  color: { type: String, default: null },
  w: { type: Number, default: 92 },
  h: { type: Number, default: 30 },
});

const paths = computed(() => {
  const data = props.data.length ? props.data : [0, 0];
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * props.w;
    const y = props.h - ((d - min) / (max - min || 1)) * (props.h - 4) - 2;
    return [x, y];
  });
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return { path, area: path + ` L${props.w} ${props.h} L0 ${props.h} Z` };
});
</script>

<template>
  <svg :width="w" :height="h" style="display:block">
    <path :d="paths.area" :fill="color || 'var(--accent)'" opacity="0.13" />
    <path :d="paths.path" fill="none" :stroke="color || 'var(--accent)'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
