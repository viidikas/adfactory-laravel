<script setup>
import Icon from './Icon.vue';
defineProps({
  modelValue: { type: [String, Number], default: '' },
  // options: array of strings, or { value, label }
  options: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);
const valOf = (o) => (o && typeof o === 'object' ? o.value : o);
const labelOf = (o) => (o && typeof o === 'object' ? o.label : o);
</script>

<template>
  <div style="position:relative">
    <select
      :value="modelValue"
      @change="emit('update:modelValue', $event.target.value)"
      :style="{
        width: '100%', height: 'var(--ctrl-h)', padding: '0 36px 0 14px', appearance: 'none',
        borderRadius: 'var(--r-input)', background: 'var(--surface-1)', border: '1px solid var(--border)',
        color: 'var(--text-1)', fontSize: '14.5px', fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
      }"
    >
      <option v-for="o in options" :key="valOf(o)" :value="valOf(o)">{{ labelOf(o) }}</option>
    </select>
    <span :style="{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }">
      <Icon name="chevdown" :size="16" />
    </span>
  </div>
</template>
