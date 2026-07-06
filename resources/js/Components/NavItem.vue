<script setup>
import { ref, computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import Icon from './Icon.vue';

const props = defineProps({
  item: { type: Object, required: true }, // { label, icon, href? }
  active: Boolean,
});
const h = ref(false);
const style = computed(() => ({
  display: 'flex', alignItems: 'center', gap: '11px', height: '42px', padding: '0 12px',
  borderRadius: '11px', border: 'none', cursor: props.item.href ? 'pointer' : 'default',
  fontFamily: 'inherit', fontSize: '14.5px', fontWeight: props.active ? 700 : 500,
  background: props.active ? 'var(--surface-3)' : h.value ? 'var(--surface-2b)' : 'transparent',
  color: props.active ? 'var(--text-1)' : 'var(--text-2)',
  textAlign: 'left', width: '100%', textDecoration: 'none', transition: 'background .14s',
}));
</script>

<template>
  <component
    :is="item.href ? Link : 'button'"
    :href="item.href || undefined"
    :style="style"
    @mouseenter="h = true" @mouseleave="h = false"
  >
    <span :style="{ color: active ? 'var(--accent)' : 'inherit', display: 'flex' }"><Icon :name="item.icon" :size="19" /></span>
    <span :style="{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">{{ item.label }}</span>
    <span v-if="item.badge" :style="{ flexShrink: 0, minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '999px', background: 'var(--danger)', color: '#fff', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }">{{ item.badge }}</span>
  </component>
</template>
