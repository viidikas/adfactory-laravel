<script setup>
import { ref, computed } from 'vue';
import Icon from './Icon.vue';

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  placeholder: { type: String, default: null },
  icon: { type: String, default: null },
  type: { type: String, default: 'text' },
  error: { type: Boolean, default: false },
  autofocus: Boolean,
});
const emit = defineEmits(['update:modelValue', 'keydown']);
const focus = ref(false);

const style = computed(() => ({
  width: '100%', height: 'var(--ctrl-h)', padding: props.icon ? '0 14px 0 40px' : '0 14px',
  borderRadius: 'var(--r-input)', background: 'var(--surface-1)', border: '1px solid',
  color: 'var(--text-1)', fontSize: '14.5px', fontFamily: 'inherit', outline: 'none',
  borderColor: props.error ? 'var(--danger)' : focus.value ? 'var(--border-strong)' : 'var(--border)',
  boxShadow: focus.value && !props.error ? '0 0 0 3px var(--accent-ring)' : 'none',
  transition: 'border-color .15s, box-shadow .15s',
}));
</script>

<template>
  <div style="position:relative;display:flex;align-items:center">
    <span v-if="icon" :style="{ position: 'absolute', left: '13px', color: 'var(--text-3)', pointerEvents: 'none' }"><Icon :name="icon" :size="17" /></span>
    <input
      :value="modelValue" :type="type" :placeholder="placeholder" :autofocus="autofocus"
      :style="style"
      @input="emit('update:modelValue', $event.target.value)"
      @keydown="emit('keydown', $event)"
      @focus="focus = true" @blur="focus = false"
    />
  </div>
</template>
