<script setup>
import { ref, computed } from 'vue';
import BrandLockup from '../Components/BrandLockup.vue';
import WorkspaceSwitch from '../Components/WorkspaceSwitch.vue';
import NavItem from '../Components/NavItem.vue';
import UserChip from '../Components/UserChip.vue';
import Button from '../Components/Button.vue';

const props = defineProps({
  active: { type: String, default: 'clips' },
  workspace: { type: String, default: 'admin' },
  user: { type: Object, default: () => ({ name: 'Mark Viidik', email: 'mark@creditstar.com' }) },
  theme: { type: String, default: 'dark' },     // dark | light
  density: { type: String, default: 'regular' }, // compact | regular | comfy
});

const NAV = {
  admin: [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { key: 'clips', label: 'Clip library', icon: 'film', href: '/design/clips' },
    { key: 'copy', label: 'Copy mapping', icon: 'filetext' },
    { key: 'orders', label: 'Orders', icon: 'clipboard' },
  ],
  portal: [
    { key: 'dashboard', label: 'Overview', icon: 'grid' },
    { key: 'clips', label: 'Browse clips', icon: 'film', href: '/design/clips' },
    { key: 'orders', label: 'My orders', icon: 'clipboard' },
  ],
};

const ws = ref(props.workspace);
const nav = computed(() => NAV[ws.value]);
// Theme + density are applied to THIS subtree only (the design tokens are
// defined on [data-theme]/[data-density]). Scoping them to .af-app — instead
// of <html> — keeps shared var names (--accent, --border, …) from leaking into
// the legacy AD.FACTORY / Growth Portal pages during SPA navigation.
</script>

<template>
  <div class="af-app" :data-theme="theme" :data-density="density" :style="{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '252px 1fr' }">
    <!-- Sidebar -->
    <aside :style="{ background: 'var(--surface-1)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }">
      <div :style="{ padding: '20px 18px 14px' }"><BrandLockup /></div>
      <div :style="{ padding: '0 14px 14px' }"><WorkspaceSwitch :ws="ws" @switch="ws = $event" /></div>
      <nav :style="{ flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }">
        <NavItem v-for="n in nav" :key="n.key" :item="n" :active="active === n.key" />
        <div v-if="ws === 'portal'" :style="{ marginTop: '14px' }">
          <Button full icon="plus">Start an order</Button>
        </div>
      </nav>
      <div :style="{ padding: '14px', borderTop: '1px solid var(--border)' }">
        <UserChip :user="user" />
      </div>
    </aside>

    <!-- Main -->
    <div id="af-main" :style="{ height: '100vh', overflowY: 'auto' }">
      <slot :ws="ws" />
    </div>
  </div>
</template>
