<script setup>
import { ref } from 'vue';
import Avatar from './Avatar.vue';
import Icon from './Icon.vue';

const props = defineProps({
  user: { type: Object, required: true }, // { name, email }
  compact: Boolean,
});
const emit = defineEmits(['logout']);
const open = ref(false);
const menuItem = {
  display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 10px',
  borderRadius: '9px', border: 'none', background: 'transparent', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: '13.5px', fontWeight: 500, color: 'var(--text-1)', textAlign: 'left',
};
</script>

<template>
  <div style="position:relative">
    <button
      @click="open = !open"
      :style="{ display: 'flex', alignItems: 'center', gap: '10px', width: compact ? 'auto' : '100%', padding: compact ? '4px' : '7px 8px', borderRadius: '11px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }"
    >
      <Avatar :name="user.name" :size="32" />
      <div v-if="!compact" :style="{ flex: 1, textAlign: 'left', minWidth: 0 }">
        <div :style="{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ user.name }}</div>
        <div :style="{ fontSize: '11.5px', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ user.email }}</div>
      </div>
      <Icon v-if="!compact" name="chevdown" :size="15" :style="{ color: 'var(--text-3)' }" />
    </button>
    <template v-if="open">
      <div @click="open = false" :style="{ position: 'fixed', inset: 0, zIndex: 40 }" />
      <div :style="{ position: 'absolute', bottom: compact ? 'auto' : '110%', top: compact ? '120%' : 'auto', right: 0, left: compact ? 'auto' : 0, zIndex: 41, background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: '12px', boxShadow: 'var(--shadow-pop)', padding: '6px', minWidth: '180px' }">
        <button :style="menuItem"><Icon name="user" :size="16" />Account</button>
        <button :style="menuItem"><Icon name="settings" :size="16" />Settings</button>
        <div :style="{ height: '1px', background: 'var(--divider)', margin: '4px 0' }" />
        <button @click="emit('logout')" :style="{ ...menuItem, color: 'var(--danger)' }"><Icon name="logout" :size="16" />Sign out</button>
      </div>
    </template>
  </div>
</template>
