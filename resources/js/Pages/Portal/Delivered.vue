<script setup>
import { ref, watch } from 'vue';
import PortalLayout from '../../Layouts/PortalLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Tag from '../../Components/Tag.vue';
import Drawer from '../../Components/Drawer.vue';
import SectionLabel from '../../Components/SectionLabel.vue';
import EmptyState from '../../Components/EmptyState.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';
import { usePortalStore } from '../../lib/portalStore.js';

defineProps({ theme: { type: String, default: null }, density: { type: String, default: null } });

const store = usePortalStore();
const clips = ref([]);
const loading = ref(true);
const error = ref('');
const playing = ref(null);

async function load() {
  loading.value = true;
  error.value = '';
  clips.value = [];
  playing.value = null;
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

const fmtSize = (b) => {
  if (!b) return '';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
};
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');
const metaLine = (c) => [c.slate, c.actor, c.design, c.lang].filter(Boolean).join(' · ');
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
      <Card v-else-if="!clips.length"><EmptyState icon="inbox" title="No delivered clips yet" sub="Finished videos for this market will appear here." /></Card>

      <div v-else :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--gap)' }">
        <Card v-for="c in clips" :key="c.id">
          <div @click="playing = c" :style="{ position: 'relative', aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', marginBottom: '12px', cursor: 'pointer' }">
            <img v-if="c.thumbnail_url" :src="c.thumbnail_url" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
            <Icon v-else name="film" :size="22" :style="{ color: 'var(--text-3)' }" />
            <div :style="{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.18)' }">
              <div :style="{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center' }"><Icon name="play" :size="20" :style="{ color: '#fff' }" /></div>
            </div>
          </div>
          <div :style="{ fontSize: '14.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="c.name">{{ c.name }}</div>
          <div v-if="metaLine(c)" :style="{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ metaLine(c) }}</div>
          <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', margin: '8px 0 12px' }">
            <Tag v-if="c.format" :clickable="false">{{ c.format }}</Tag>
            <Tag v-if="fmtSize(c.file_size)" :clickable="false">{{ fmtSize(c.file_size) }}</Tag>
          </div>
          <div :style="{ display: 'flex', gap: '8px' }">
            <Button size="sm" variant="secondary" icon="play" @click="playing = c">Preview</Button>
            <a :href="c.download_url" :style="{ textDecoration: 'none', flex: 1 }"><Button full size="sm" icon="download">Download</Button></a>
          </div>
        </Card>
      </div>
    </div>

    <!-- Player drawer -->
    <Drawer :open="!!playing" :title="playing ? (playing.name || 'Clip') : ''" :width="520" @close="playing = null">
      <div v-if="playing">
        <video :src="playing.stream_url" controls autoplay preload="metadata" :poster="playing.thumbnail_url || undefined"
          :style="{ width: '100%', borderRadius: '12px', background: '#000', maxHeight: '60vh' }" />

        <SectionLabel :style="{ marginTop: '18px' }">Details</SectionLabel>
        <div :style="{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: '13px' }">
          <span :style="{ color: 'var(--text-3)' }">Format</span><span>{{ playing.format || '—' }}</span>
          <span :style="{ color: 'var(--text-3)' }">Slate</span><span>{{ playing.slate || '—' }}</span>
          <span :style="{ color: 'var(--text-3)' }">Actor</span><span>{{ playing.actor || '—' }}</span>
          <span :style="{ color: 'var(--text-3)' }">Design</span><span>{{ playing.design || '—' }}</span>
          <span :style="{ color: 'var(--text-3)' }">Language</span><span>{{ playing.lang || '—' }}</span>
          <span v-if="playing.copy_full || playing.copy" :style="{ color: 'var(--text-3)' }">Copy</span><span v-if="playing.copy_full || playing.copy">{{ playing.copy_full || playing.copy }}</span>
          <span :style="{ color: 'var(--text-3)' }">Size</span><span>{{ fmtSize(playing.file_size) || '—' }}</span>
          <span :style="{ color: 'var(--text-3)' }">Delivered</span><span>{{ fmtDate(playing.created_at) }}</span>
        </div>
      </div>
      <template #footer>
        <a v-if="playing" :href="playing.download_url" :style="{ textDecoration: 'none' }"><Button full icon="download">Download</Button></a>
      </template>
    </Drawer>
  </PortalLayout>
</template>
