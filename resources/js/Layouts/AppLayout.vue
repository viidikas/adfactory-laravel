<script setup>
import { ref, computed } from 'vue';
import { router } from '@inertiajs/vue3';
import BrandLockup from '../Components/BrandLockup.vue';
import WorkspaceSwitch from '../Components/WorkspaceSwitch.vue';
import NavItem from '../Components/NavItem.vue';
import UserChip from '../Components/UserChip.vue';
import Button from '../Components/Button.vue';

const props = defineProps({
  active: { type: String, default: 'dashboard' },
  workspace: { type: String, default: 'admin' },
  user: { type: Object, default: () => ({ name: 'Mark Viidik', email: 'mark@creditstar.com' }) },
  // First-load overrides (?theme / ?density); otherwise persisted client-side.
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

// Theme + density are a client concern (CSS only). Persist across navigation so
// ?theme=light "sticks". Applied to THIS subtree (.af-app), never <html>, so the
// design tokens can't leak into the legacy AD.FACTORY / Growth Portal pages.
const theme = ref(props.theme || localStorage.getItem('af-theme') || 'dark');
const density = ref(props.density || localStorage.getItem('af-density') || 'regular');
if (props.theme) localStorage.setItem('af-theme', props.theme);
if (props.density) localStorage.setItem('af-density', props.density);

// Workspace is server-rendered (affects labels/nav), so it travels in the URL.
const wsq = computed(() => (props.workspace === 'portal' ? '?ws=portal' : ''));
const NAV = computed(() => ({
  admin: [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid', href: '/design' + wsq.value },
    { key: 'clips', label: 'Clip library', icon: 'film', href: '/design/clips' + wsq.value },
    { key: 'copy', label: 'Copy mapping', icon: 'filetext', href: '/design/copy' + wsq.value },
    { key: 'orders', label: 'Orders', icon: 'clipboard', href: '/design/orders' + wsq.value },
  ],
  portal: [
    { key: 'dashboard', label: 'Overview', icon: 'grid', href: '/design' + wsq.value },
    { key: 'clips', label: 'Browse clips', icon: 'film', href: '/design/clips' + wsq.value },
    { key: 'orders', label: 'My orders', icon: 'clipboard', href: '/design/orders' + wsq.value },
  ],
}));
const nav = computed(() => NAV.value[props.workspace]);

function switchWs(next) {
  router.visit('/design' + (next === 'portal' ? '?ws=portal' : ''));
}
function go(url) {
  router.visit(url);
}
</script>

<template>
  <div class="af-app" :data-theme="theme" :data-density="density" :style="{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '252px 1fr' }">
    <!-- Sidebar -->
    <aside :style="{ background: 'var(--surface-1)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }">
      <div :style="{ padding: '20px 18px 14px' }"><BrandLockup /></div>
      <div :style="{ padding: '0 14px 14px' }"><WorkspaceSwitch :ws="workspace" @switch="switchWs" /></div>
      <nav :style="{ flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }">
        <NavItem v-for="n in nav" :key="n.key" :item="n" :active="active === n.key" />
        <div v-if="workspace === 'portal'" :style="{ marginTop: '14px' }">
          <Button full icon="plus" @click="go('/design/orders/create' + wsq)">Start an order</Button>
        </div>
      </nav>
      <div :style="{ padding: '14px', borderTop: '1px solid var(--border)' }">
        <UserChip :user="user" />
      </div>
    </aside>

    <!-- Main -->
    <div id="af-main" :style="{ height: '100vh', overflowY: 'auto' }">
      <slot />
    </div>
  </div>
</template>
