<script setup>
import { ref, computed, watch } from 'vue';
import PortalLayout from '../../Layouts/PortalLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Select from '../../Components/Select.vue';
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
const sortBy = ref('theme');

const sortOptions = [
  { value: 'theme', label: 'Theme (set)' },
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'format', label: 'Format' },
];
// Logical aspect order, mirrors the Templater's format order.
const FORMAT_ORDER = ['16:9', '1:1', '9:16', '4:5'];
const fmtRank = (f) => { const i = FORMAT_ORDER.indexOf(f); return i === -1 ? 99 : i; };

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
const copyOf = (c) => c.copy_full || c.copy || '';
// A "set" = one message: brand + lang + copy + actor (all designs & formats).
// Named like the Templater: Creditstar_FI_Suunnittele_Pt_Hae_Kemal.
const copySlug = (c) => (c.copy || '').trim().replace(/\s+/g, '_');
const setName = (c) => [c.brand, c.lang, copySlug(c), c.actor].filter(Boolean).join('_');

const groups = computed(() => {
  const map = new Map();
  for (const c of clips.value) {
    const k = setName(c) || ('clip-' + c.id);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(c);
  }
  const arr = [...map.entries()].map(([name, items]) => ({
    name,
    copy: copyOf(items[0]),
    // Within a message: design first, then logical format order.
    items: items.slice().sort((a, b) =>
      (a.design || '').localeCompare(b.design || '') ||
      fmtRank(a.format) - fmtRank(b.format) ||
      (a.name || '').localeCompare(b.name || '')),
  }));
  arr.sort((a, b) => a.name.localeCompare(b.name));
  return arr;
});

const flat = computed(() => {
  const list = clips.value.slice();
  if (sortBy.value === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  else if (sortBy.value === 'format') list.sort((a, b) => fmtRank(a.format) - fmtRank(b.format) || (a.name || '').localeCompare(b.name || ''));
  else list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)); // newest
  return list;
});

// One flat row stream: header + clip rows (theme), or just clip rows.
const rows = computed(() => {
  if (sortBy.value === 'theme') {
    const out = [];
    for (const g of groups.value) {
      out.push({ type: 'header', group: g, key: 'h:' + g.name });
      for (const c of g.items) out.push({ type: 'clip', clip: c, key: 'c:' + c.id });
    }
    return out;
  }
  return flat.value.map((c) => ({ type: 'clip', clip: c, key: 'c:' + c.id }));
});

function groupTitle(g) { return g.name || 'Set'; }
// Per-row sub-line: within a set the design is the differentiator; in flat sorts
// show the full identity.
function rowMeta(c) {
  if (sortBy.value === 'theme') return [c.design, c.lang].filter(Boolean).join(' · ');
  return [c.slate, c.actor, c.design, c.lang].filter(Boolean).join(' · ');
}

function downloadSet(g) {
  const ids = g.items.map((c) => c.id).join(',');
  const a = document.createElement('a');
  a.href = '/api/delivered-clips/set?ids=' + encodeURIComponent(ids);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const rowStyle = { display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px', borderTop: '1px solid var(--divider)' };
</script>

<template>
  <PortalLayout active="delivered" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }">
        <div>
          <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Delivered clips</h1>
          <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">Final rendered videos for {{ store.market ? store.market.code : 'your market' }}. Preview here, then download to publish.</p>
        </div>
        <div v-if="clips.length" :style="{ display: 'flex', alignItems: 'center', gap: '8px' }">
          <span :style="{ fontSize: '13px', color: 'var(--text-3)' }">Sort</span>
          <div :style="{ width: '170px' }"><Select v-model="sortBy" :options="sortOptions" /></div>
        </div>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>
      <div v-else-if="!store.market" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Select a market above to begin.</div>
      <div v-else-if="loading" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>
      <Card v-else-if="!clips.length"><EmptyState icon="inbox" title="No delivered clips yet" sub="Finished videos for this market will appear here." /></Card>

      <Card v-else :pad="false" :style="{ overflow: 'hidden' }">
        <template v-for="r in rows" :key="r.key">
          <!-- Theme/set header -->
          <div v-if="r.type === 'header'" :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '12px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--divider)' }">
            <div :style="{ minWidth: 0 }">
              <div :style="{ fontSize: '13.5px', fontWeight: 800, letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }" :title="groupTitle(r.group)">{{ groupTitle(r.group) }}</div>
              <div v-if="r.group.copy" :style="{ fontSize: '12.5px', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ r.group.copy }} · {{ r.group.items.length }} clips</div>
            </div>
            <Button size="sm" icon="download" @click="downloadSet(r.group)">Download set ({{ r.group.items.length }})</Button>
          </div>

          <!-- Clip row -->
          <div v-else :style="rowStyle">
            <div @click="playing = r.clip" :style="{ position: 'relative', flex: '0 0 auto', width: '78px', height: '44px', borderRadius: '7px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer' }">
              <img v-if="r.clip.thumbnail_url" :src="r.clip.thumbnail_url" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
              <Icon v-else name="film" :size="16" :style="{ color: 'var(--text-3)' }" />
              <div :style="{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.15)' }"><Icon name="play" :size="16" :style="{ color: '#fff' }" /></div>
            </div>

            <Tag :clickable="false" v-if="r.clip.format" :style="{ flex: '0 0 auto', fontVariantNumeric: 'tabular-nums' }">{{ r.clip.format }}</Tag>

            <div :style="{ flex: '1 1 auto', minWidth: 0 }">
              <div :style="{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="r.clip.name">{{ r.clip.name }}</div>
              <div v-if="rowMeta(r.clip)" :style="{ fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ rowMeta(r.clip) }}</div>
            </div>

            <span :style="{ flex: '0 0 auto', fontSize: '12px', color: 'var(--text-3)', minWidth: '54px', textAlign: 'right' }">{{ fmtSize(r.clip.file_size) }}</span>
            <Button size="sm" variant="ghost" icon="play" @click="playing = r.clip">Preview</Button>
            <a :href="r.clip.download_url" :style="{ textDecoration: 'none', flex: '0 0 auto' }"><Button size="sm" variant="secondary" icon="download">Download</Button></a>
          </div>
        </template>
      </Card>
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
          <template v-if="playing.copy_full || playing.copy">
            <span :style="{ color: 'var(--text-3)' }">Copy</span><span>{{ playing.copy_full || playing.copy }}</span>
          </template>
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
