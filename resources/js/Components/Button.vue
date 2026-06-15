<script setup>
import { ref, computed } from 'vue';
import Icon from './Icon.vue';

const props = defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | ghost | danger | soft
  size: { type: String, default: 'md' },          // sm | md | lg
  icon: { type: String, default: null },
  iconRight: { type: String, default: null },
  full: Boolean,
  disabled: Boolean,
  title: { type: String, default: null },
  type: { type: String, default: 'button' },
});

const hover = ref(false);
const press = ref(false);

const height = computed(() => (props.size === 'sm' ? '36px' : 'var(--ctrl-h)'));

const style = computed(() => {
  const v = props.variant;
  let bg, color, borderColor = 'transparent';
  if (v === 'primary') { bg = 'var(--btn-primary-bg)'; color = 'var(--btn-primary-ink)'; if (hover.value && !props.disabled) bg = 'var(--btn-primary-hover)'; }
  else if (v === 'secondary') { bg = hover.value && !props.disabled ? 'var(--surface-3)' : 'var(--btn-secondary-bg)'; color = 'var(--btn-secondary-ink)'; borderColor = 'var(--btn-secondary-bd)'; }
  else if (v === 'ghost') { bg = hover.value ? 'var(--surface-3)' : 'transparent'; color = 'var(--text-1)'; }
  else if (v === 'danger') { bg = 'var(--danger-soft)'; color = 'var(--danger)'; }
  else if (v === 'soft') { bg = hover.value ? 'var(--surface-3)' : 'var(--surface-2b)'; color = 'var(--text-1)'; borderColor = 'var(--border)'; }
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    height: height.value, padding: props.size === 'sm' ? '0 14px' : '0 20px',
    borderRadius: 'var(--r-pill)', fontWeight: 600,
    fontSize: props.size === 'sm' ? '13px' : '14.5px', letterSpacing: '-0.01em',
    cursor: props.disabled ? 'not-allowed' : 'pointer', border: '1px solid transparent',
    width: props.full ? '100%' : 'auto', whiteSpace: 'nowrap',
    transition: 'background .16s, opacity .16s, transform .12s, border-color .16s',
    transform: press.value ? 'scale(0.98)' : 'scale(1)',
    opacity: props.disabled ? 0.5 : 1,
    backgroundColor: bg, color, borderColor,
  };
});
</script>

<template>
  <button
    :type="type" :title="title" :disabled="disabled"
    :style="style"
    @mouseenter="hover = true" @mouseleave="hover = false; press = false"
    @mousedown="press = true" @mouseup="press = false"
  >
    <Icon v-if="icon" :name="icon" :size="size === 'sm' ? 15 : 17" />
    <slot />
    <Icon v-if="iconRight" :name="iconRight" :size="size === 'sm' ? 15 : 17" />
  </button>
</template>
