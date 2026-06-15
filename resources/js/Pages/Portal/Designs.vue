<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import PortalLayout from '../../Layouts/PortalLayout.vue';
import Card from '../../Components/Card.vue';
import Tag from '../../Components/Tag.vue';
import EmptyState from '../../Components/EmptyState.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';
import { usePortalStore } from '../../lib/portalStore.js';

defineProps({ theme: { type: String, default: null }, density: { type: String, default: null } });

const store = usePortalStore();
const allDesigns = ref([]);
const loading = ref(true);
const error = ref('');
const lightbox = ref(null);
const ASPECTS = ['16x9', '1x1', '9x16', '4x5'];

async function load() {
  const projects = await api.get('/api/projects');
  const active = (projects || []).find((p) => p.is_active);
  allDesigns.value = active?.designs || [];
}
onMounted(async () => { try { await load(); } catch (e) { error.value = e.message || 'Failed to load.'; } finally { loading.value = false; } });

const designs = computed(() => store.market ? allDesigns.value.filter((d) => !d.brand || d.brand === store.market.brand) : allDesigns.value);
const ratio = (a) => (a === '16x9' ? '16/9' : a === '1x1' ? '1' : a === '9x16' ? '9/16' : '4/5');
</script>

<template>
  <PortalLayout active="designs" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div>
        <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Designs</h1>
        <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">The ad templates available for your brand.</p>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>
      <div v-else-if="loading" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>
      <Card v-else-if="!designs.length"><EmptyState icon="sparkles" title="No designs yet" sub="Designs configured in admin will appear here." /></Card>

      <div v-else :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--gap)' }">
        <Card v-for="d in designs" :key="d.key">
          <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }">
            <div :style="{ fontSize: '16px', fontWeight: 700 }">{{ d.label || d.key }}</div>
            <Tag :clickable="false">{{ d.brand || '—' }}</Tag>
          </div>
          <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }">
            <div v-for="a in ASPECTS" :key="a">
              <div :style="{ fontSize: '10.5px', color: 'var(--text-3)', marginBottom: '4px' }">{{ a }}</div>
              <div :style="{ aspectRatio: ratio(a), borderRadius: '9px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: d.images?.[a] ? 'zoom-in' : 'default' }"
                @click="d.images?.[a] && (lightbox = d.images[a])">
                <img v-if="d.images?.[a]" :src="d.images[a]" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
                <Icon v-else name="sparkles" :size="16" :style="{ color: 'var(--text-3)' }" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <div v-if="lightbox" @click="lightbox = null" :style="{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.8)', display: 'grid', placeItems: 'center', padding: '40px', cursor: 'zoom-out' }">
      <img :src="lightbox" alt="" :style="{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px' }" />
    </div>
  </PortalLayout>
</template>
