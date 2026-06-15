<script setup>
import { computed } from 'vue';

const STATUS_STYLE = {
  'Draft':         { c: 'var(--text-2)', b: 'var(--surface-3)' },
  'Submitted':     { c: 'var(--info)', b: 'var(--tint-sky)' },
  'In production': { c: 'var(--warning)', b: 'rgba(246,198,66,0.15)' },
  'Rendering':     { c: 'var(--brand-teal)', b: 'rgba(72,218,186,0.15)' },
  'Review':        { c: 'var(--link)', b: 'var(--tint-violet)' },
  'Delivered':     { c: 'var(--success)', b: 'var(--accent-soft)' },
  'approved':      { c: 'var(--success)', b: 'var(--accent-soft)', label: 'Approved' },
  'review':        { c: 'var(--link)', b: 'var(--tint-violet)', label: 'In review' },
  'missing':       { c: 'var(--danger)', b: 'var(--danger-soft)', label: 'Missing' },
};
const props = defineProps({
  status: { type: String, required: true },
  dot: { type: Boolean, default: true },
});
const s = computed(() => STATUS_STYLE[props.status] || { c: 'var(--text-2)', b: 'var(--surface-3)' });
</script>

<template>
  <span :style="{
    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px 4px 8px',
    borderRadius: 'var(--r-pill)', background: s.b, color: s.c,
    fontSize: '12.5px', fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap',
  }">
    <span v-if="dot" :style="{ width: '6px', height: '6px', borderRadius: '999px', background: 'currentColor' }" />
    {{ s.label || status }}
  </span>
</template>
