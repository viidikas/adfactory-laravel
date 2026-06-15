<script setup>
import Icon from './Icon.vue';
defineProps({
  icon: { type: String, default: 'film' },
  title: { type: String, default: '' },
  sub: { type: String, default: '' },
});
</script>

<template>
  <div :style="{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-2)' }">
    <div :style="{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--surface-3)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--text-3)' }">
      <Icon :name="icon" :size="26" />
    </div>
    <div :style="{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }">{{ title }}</div>
    <div :style="{ fontSize: '13.5px', maxWidth: '320px', margin: '0 auto 18px' }">{{ sub }}</div>
    <slot name="action" />
  </div>
</template>
