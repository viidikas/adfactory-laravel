<script setup>
import Icon from './Icon.vue';
defineProps({
  steps: { type: Array, required: true },
  current: { type: Number, default: 0 },
});
</script>

<template>
  <div :style="{ display: 'flex', alignItems: 'center', gap: 0 }">
    <template v-for="(s, i) in steps" :key="s">
      <div :style="{ display: 'flex', alignItems: 'center', gap: '9px' }">
        <div :style="{
          width: '26px', height: '26px', borderRadius: '999px', display: 'grid', placeItems: 'center', flexShrink: 0,
          fontSize: '12.5px', fontWeight: 700, transition: 'all .2s',
          background: i < current ? 'var(--accent)' : i === current ? 'var(--surface-3)' : 'transparent',
          color: i < current ? 'var(--text-on-accent)' : i === current ? 'var(--text-1)' : 'var(--text-3)',
          border: '1px solid', borderColor: i < current ? 'transparent' : i === current ? 'var(--border-strong)' : 'var(--border)',
        }">
          <Icon v-if="i < current" name="check" :size="14" :stroke="2.5" />
          <template v-else>{{ i + 1 }}</template>
        </div>
        <span :style="{ fontSize: '13.5px', fontWeight: i === current ? 700 : 500, color: i === current ? 'var(--text-1)' : 'var(--text-3)', whiteSpace: 'nowrap' }">{{ s }}</span>
      </div>
      <div v-if="i < steps.length - 1" :style="{ flex: 1, height: '1px', background: 'var(--border)', margin: '0 14px', minWidth: '18px' }" />
    </template>
  </div>
</template>
