<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
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

// Lightbox holds the design's available images + the current index, so arrow
// keys / buttons step through that one design's formats without reopening.
function designImages(d) {
  return ASPECTS.filter((a) => d.images?.[a]).map((a) => ({ aspect: a, url: d.images[a] }));
}
function openLightbox(d, aspect) {
  const images = designImages(d);
  if (!images.length) return;
  const index = Math.max(0, images.findIndex((x) => x.aspect === aspect));
  lightbox.value = { label: d.label || d.key, images, index };
}
const current = computed(() => (lightbox.value ? lightbox.value.images[lightbox.value.index] : null));
function step(dir) {
  if (!lightbox.value) return;
  const n = lightbox.value.images.length;
  lightbox.value.index = (lightbox.value.index + dir + n) % n;
}
function closeLightbox() { lightbox.value = null; }
function onKey(e) {
  if (!lightbox.value) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  else if (e.key === 'Escape') { closeLightbox(); }
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

const navBtnStyle = (side) => ({
  position: 'absolute', [side]: '20px', top: '50%', transform: 'translateY(-50%)',
  width: '46px', height: '46px', borderRadius: '50%', border: 'none', color: '#fff',
  background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', cursor: 'pointer',
});
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
                @click="d.images?.[a] && openLightbox(d, a)">
                <img v-if="d.images?.[a]" :src="d.images[a]" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
                <Icon v-else name="sparkles" :size="16" :style="{ color: 'var(--text-3)' }" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <div v-if="current" @click="closeLightbox" :style="{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.85)', display: 'grid', placeItems: 'center', padding: '40px', cursor: 'zoom-out' }">
      <div @click.stop :style="{ position: 'absolute', top: '18px', left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: '13.5px', fontWeight: 600 }">
        {{ lightbox.label }} · {{ current.aspect }}<span v-if="lightbox.images.length > 1" :style="{ opacity: 0.6 }"> · {{ lightbox.index + 1 }}/{{ lightbox.images.length }}</span>
      </div>

      <button v-if="lightbox.images.length > 1" @click.stop="step(-1)" title="Previous (←)" :style="navBtnStyle('left')"><Icon name="arrowleft" :size="24" /></button>
      <img :src="current.url" alt="" @click.stop :style="{ maxWidth: '88vw', maxHeight: '86vh', borderRadius: '12px', cursor: 'default' }" />
      <button v-if="lightbox.images.length > 1" @click.stop="step(1)" title="Next (→)" :style="navBtnStyle('right')"><Icon name="arrowright" :size="24" /></button>

      <button @click.stop="closeLightbox" title="Close (Esc)" :style="{ position: 'absolute', top: '16px', right: '20px', width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }"><Icon name="x" :size="20" /></button>
    </div>
  </PortalLayout>
</template>
