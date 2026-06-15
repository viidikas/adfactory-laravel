<script setup>
import Icon from './Icon.vue';
const props = defineProps({
  ws: { type: String, default: 'admin' }, // admin | portal
  compact: Boolean,
});
const emit = defineEmits(['switch']);
const items = [
  { k: 'admin', label: 'AD.FACTORY', short: 'Admin', icon: 'sliders' },
  { k: 'portal', label: 'Growth Portal', short: 'Portal', icon: 'zap' },
];
</script>

<template>
  <div :style="{ display: 'flex', padding: '3px', gap: '2px', background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: '12px' }">
    <button
      v-for="it in items" :key="it.k"
      :title="it.label" @click="emit('switch', it.k)"
      :style="{
        display: 'inline-flex', alignItems: 'center', gap: '7px', height: '32px',
        padding: compact ? '0 12px' : '0 10px', flex: compact ? 'none' : 1, justifyContent: 'center',
        borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: '12.5px', fontWeight: 700, whiteSpace: 'nowrap',
        background: ws === it.k ? 'var(--surface-2)' : 'transparent',
        color: ws === it.k ? 'var(--text-1)' : 'var(--text-3)',
        boxShadow: ws === it.k ? 'var(--shadow-card)' : 'none',
      }"
    >
      <Icon :name="it.icon" :size="14" />{{ compact ? it.label : it.short }}
    </button>
  </div>
</template>
