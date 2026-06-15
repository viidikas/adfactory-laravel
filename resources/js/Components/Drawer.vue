<script setup>
import IconButton from './IconButton.vue';

defineProps({
  open: Boolean,
  title: { type: String, default: '' },
  width: { type: Number, default: 460 },
});
const emit = defineEmits(['close']);
</script>

<template>
  <div :style="{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: open ? 'auto' : 'none' }">
    <div
      @click="emit('close')"
      :style="{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: open ? 1 : 0, transition: 'opacity .25s' }"
    />
    <div :style="{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: width + 'px', maxWidth: '92vw',
      background: 'var(--surface-1)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-pop)',
      transform: open ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform .28s var(--ease, cubic-bezier(0.3,0,0,1))',
      display: 'flex', flexDirection: 'column',
    }">
      <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }">
        <div :style="{ fontSize: '16px', fontWeight: 700 }">{{ title }}</div>
        <IconButton name="x" @click="emit('close')" />
      </div>
      <div :style="{ flex: 1, overflowY: 'auto', padding: '22px' }"><slot /></div>
      <div v-if="$slots.footer" :style="{ padding: '18px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
