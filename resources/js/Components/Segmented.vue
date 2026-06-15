<script setup>
import Icon from './Icon.vue';
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] }, // { value, label?, icon? } | string
  size: { type: String, default: 'md' },
});
const emit = defineEmits(['update:modelValue']);
const valOf = (o) => (o && typeof o === 'object' ? o.value : o);
const labelOf = (o) => (o && typeof o === 'object' ? o.label : o);
</script>

<template>
  <div :style="{ display: 'inline-flex', padding: '3px', gap: '2px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)' }">
    <button
      v-for="o in options" :key="valOf(o)"
      @click="emit('update:modelValue', valOf(o))"
      :style="{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        height: size === 'sm' ? '28px' : '34px', padding: size === 'sm' ? '0 12px' : '0 16px',
        borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
        fontSize: size === 'sm' ? '12.5px' : '13.5px', fontWeight: 600, fontFamily: 'inherit',
        backgroundColor: valOf(o) === modelValue ? 'var(--surface-3)' : 'transparent',
        color: valOf(o) === modelValue ? 'var(--text-1)' : 'var(--text-2)',
        boxShadow: valOf(o) === modelValue ? 'var(--shadow-card)' : 'none',
        transition: 'background .15s, color .15s',
      }"
    >
      <Icon v-if="o && o.icon" :name="o.icon" :size="15" />
      <template v-if="labelOf(o)">{{ labelOf(o) }}</template>
    </button>
  </div>
</template>
