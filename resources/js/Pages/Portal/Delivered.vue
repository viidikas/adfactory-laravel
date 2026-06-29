<script setup>
import { ref, watch } from 'vue';
import PortalLayout from '../../Layouts/PortalLayout.vue';
import DeliveredClipsBrowser from '../../Components/DeliveredClipsBrowser.vue';
import { api } from '../../lib/api.js';
import { usePortalStore } from '../../lib/portalStore.js';

defineProps({ theme: { type: String, default: null }, density: { type: String, default: null } });

const store = usePortalStore();
const clips = ref([]);
const loading = ref(true);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  clips.value = [];
  if (!store.market) { loading.value = false; return; }
  try {
    const data = await api.get('/api/delivered-clips?market_id=' + store.market.id);
    clips.value = Array.isArray(data) ? data : [];
  } catch (e) {
    error.value = e.message || 'Failed to load delivered clips.';
  } finally {
    loading.value = false;
  }
}
// Reload whenever the selected market changes (selector lives in the layout).
watch(() => store.market?.id, load, { immediate: true });
</script>

<template>
  <PortalLayout active="delivered" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div>
        <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Delivered clips</h1>
        <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">Final rendered videos for {{ store.market ? store.market.code : 'your market' }}. Preview here, then download to publish.</p>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>
      <div v-else-if="!store.market" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Select a market above to begin.</div>
      <div v-else-if="loading" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>

      <DeliveredClipsBrowser v-else :clips="clips" />
    </div>
  </PortalLayout>
</template>
