<script setup>
import { ref, computed } from 'vue';
import { router, usePage } from '@inertiajs/vue3';
import BrandLockup from '../Components/BrandLockup.vue';
import WorkspaceSwitch from '../Components/WorkspaceSwitch.vue';
import NavItem from '../Components/NavItem.vue';
import UserChip from '../Components/UserChip.vue';
import Icon from '../Components/Icon.vue';

const props = defineProps({
  active: { type: String, default: 'dashboard' },
  workspace: { type: String, default: 'admin' },
  // First-load overrides (?theme / ?density); otherwise persisted client-side.
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

// Real authenticated user (shared by HandleInertiaRequests on every page).
const page = usePage();
const user = computed(() => page.props.auth?.user || { name: 'Guest', email: '' });
const canAdmin = computed(() => !!page.props.auth?.user?.is_super_admin);

// Theme + density are a client concern (CSS only). Persist across navigation so
// ?theme=light "sticks". Applied to THIS subtree (.af-app), never <html>, so the
// design tokens can't leak into the legacy AD.FACTORY / Growth Portal pages.
const theme = ref(props.theme || localStorage.getItem('af-theme') || 'dark');
const density = ref(props.density || localStorage.getItem('af-density') || 'regular');
if (props.theme) localStorage.setItem('af-theme', props.theme);
if (props.density) localStorage.setItem('af-density', props.density);

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  localStorage.setItem('af-theme', theme.value);
}

const NAV = {
  admin: [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid', href: '/' },
    { key: 'orders', label: 'Orders', icon: 'clipboard', href: '/orders' },
    { key: 'markets', label: 'Markets', icon: 'globe', href: '/markets' },
    { key: 'projects', label: 'Projects', icon: 'folder', href: '/projects' },
    { key: 'clips', label: 'Clip library', icon: 'film', href: '/clips' },
    { key: 'generate', label: 'Generate', icon: 'download', href: '/generate' },
    { key: 'preview', label: 'Preview & export', icon: 'eye', href: '/preview' },
    { key: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
  ],
  portal: [
    { key: 'copy-browse', label: 'Browse by copy', icon: 'filetext', href: '/portal' },
    { key: 'clips', label: 'Browse clips', icon: 'film', href: '/portal/clips' },
    { key: 'designs', label: 'Designs', icon: 'sparkles', href: '/portal/designs' },
    { key: 'orders', label: 'My orders', icon: 'clipboard', href: '/portal/orders' },
  ],
};
const nav = computed(() => NAV[props.workspace] || NAV.admin);
const legacyHref = computed(() => (props.workspace === 'portal' ? '/portal/legacy' : '/legacy'));

function switchWs(next) {
  router.visit(next === 'portal' ? '/portal' : '/');
}
function logout() {
  router.post('/logout');
}
</script>

<template>
  <div class="af-app" :data-theme="theme" :data-density="density" :style="{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '252px 1fr' }">
    <!-- Sidebar -->
    <aside :style="{ background: 'var(--surface-1)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }">
      <div :style="{ padding: '20px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }">
        <BrandLockup />
        <button
          @click="toggleTheme" :title="theme === 'dark' ? 'Switch to light' : 'Switch to dark'"
          :style="{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', width: '30px', height: '30px', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--text-2)' }">
          <Icon :name="theme === 'dark' ? 'sun' : 'moon'" :size="15" />
        </button>
      </div>

      <div v-if="canAdmin" :style="{ padding: '0 14px 14px' }">
        <WorkspaceSwitch :ws="workspace" @switch="switchWs" />
      </div>

      <nav :style="{ flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto' }">
        <NavItem v-for="n in nav" :key="n.key" :item="n" :active="active === n.key" />
      </nav>

      <div :style="{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }">
        <a :href="legacyHref"
          :style="{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none' }">
          <Icon name="external" :size="14" /> Open classic UI
        </a>
        <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }">
          <UserChip :user="user" @logout="logout" :style="{ flex: 1, minWidth: 0 }" />
          <button @click="logout" title="Sign out"
            :style="{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', width: '32px', height: '32px', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0 }">
            <Icon name="logout" :size="15" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div id="af-main" :style="{ height: '100vh', overflowY: 'auto' }">
      <slot />
    </div>
  </div>
</template>
