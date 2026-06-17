<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import PortalLayout from '../../Layouts/PortalLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Input from '../../Components/Input.vue';
import Select from '../../Components/Select.vue';
import Tag from '../../Components/Tag.vue';
import Thumb from '../../Components/Thumb.vue';
import Drawer from '../../Components/Drawer.vue';
import SectionLabel from '../../Components/SectionLabel.vue';
import EmptyState from '../../Components/EmptyState.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';
import { usePortalStore, addToBasket } from '../../lib/portalStore.js';
import { ALL_LANGS } from '../../lib/templater.js';

defineProps({ theme: { type: String, default: null }, density: { type: String, default: null } });

const store = usePortalStore();
const clips = ref([]);
const copies = ref([]);
const designs = ref([]);
const loading = ref(true);
const error = ref('');
const q = ref('');
const cat = ref('All');

// detail panel state
const sel = ref(null);          // selected clip
const selCopy = ref('');        // copyKey
const selLangs = ref(['EN']);
const selDesigns = ref([]);

const thumbUrl = (c) => '/api/thumb?path=' + encodeURIComponent(c.relativePath || '');
const videoUrl = (c) => '/api/video?path=' + encodeURIComponent(c.relativePath || '');
const withPoster = (c) => ({ ...c, poster: thumbUrl(c), aspect: undefined, duration: null });

async function loadClips() {
  const c = await api.get('/api/clips');
  clips.value = Array.isArray(c) ? c : [];
}
async function loadCopies() {
  if (!store.market) { copies.value = []; return; }
  copies.value = await api.get('/api/copies?market_id=' + store.market.id);
}
async function loadDesigns() {
  try {
    const projects = await api.get('/api/projects');
    const active = (projects || []).find((p) => p.is_active);
    const all = active?.designs || [];
    designs.value = store.market ? all.filter((d) => !d.brand || d.brand === store.market.brand) : all;
  } catch { designs.value = []; }
}

onMounted(async () => {
  try { await Promise.all([loadClips(), loadCopies(), loadDesigns()]); }
  catch (e) { error.value = e.message || 'Failed to load.'; }
  finally { loading.value = false; }
});
watch(() => store.market?.id, async () => {
  // Categories are market-specific now, so reset the tab to avoid landing on a
  // category the new market doesn't have (which would look like an empty grid).
  cat.value = 'All';
  try { await Promise.all([loadCopies(), loadDesigns()]); } catch {}
});

// A copy's Shot column lists the slate codes (clips) it may be used with; a
// copy with no codes applies to its whole category.
const shotCodes = (c) => (c.shot || '').toUpperCase().split(/[\s,;]+/).filter(Boolean);

// What the selected market's enabled copies make available: every slate code a
// copy lists, plus the categories covered by codeless (category-wide) copies.
const marketReach = computed(() => {
  const slates = new Set();
  const wideCategories = new Set();
  for (const c of copies.value) {
    const codes = shotCodes(c);
    if (codes.length) codes.forEach((code) => slates.add(code));
    else if (c.category) wideCategories.add(c.category);
  }
  return { slates, wideCategories };
});

// A clip is available for the market when an enabled copy lists its slate in
// Shot, or a category-wide copy covers its category. Clips no copy can use are
// hidden — browsing by clips only shows what's orderable in this market.
function clipAvailable(clip) {
  const { slates, wideCategories } = marketReach.value;
  return slates.has((clip.slate || '').toUpperCase()) || wideCategories.has(clip.category || '');
}
const availableClips = computed(() => clips.value.filter(clipAvailable));

const categories = computed(() => [...new Set(availableClips.value.map((c) => c.category).filter(Boolean))].sort());
const filtered = computed(() => availableClips.value.filter((c) => {
  if (cat.value !== 'All' && c.category !== cat.value) return false;
  if (q.value) {
    const s = q.value.toLowerCase();
    if (!(c.name || '').toLowerCase().includes(s) && !(c.actor || '').toLowerCase().includes(s) && !(c.slate || '').toLowerCase().includes(s)) return false;
  }
  return true;
}));

// Copies offered for a clip: those whose Shot lists this clip's slate, else the
// category-wide (codeless) copies covering its category.
function copiesForClip(clip) {
  if (!clip) return [];
  const slate = (clip.slate || '').toUpperCase();
  const bySlate = copies.value.filter((c) => shotCodes(c).includes(slate));
  if (bySlate.length) return bySlate;
  return copies.value.filter((c) => shotCodes(c).length === 0 && (c.category || '') === clip.category);
}
// The market-language text of a copy: its non-EN copy_text entry (e.g. the
// approved Spanish for an ES market). Empty for an English-only market (UK).
function localText(o) {
  const ct = o?.copy_text || {};
  const key = Object.keys(ct).find((k) => k !== 'en' && String(ct[k] || '').trim());
  return key ? ct[key] : '';
}

const copyOptions = computed(() => [{ value: '', label: copies.value.length ? 'Choose copy…' : 'No copy enabled for this market' },
  ...copiesForClip(sel.value).map((c) => ({ value: c.key, label: `${c.key} · ${localText(c) || c.en || ''}`.slice(0, 60) }))]);
const selCopyObj = computed(() => copies.value.find((c) => c.key === selCopy.value) || null);
// Market-language text of the selected copy, shown above the EN reference.
const selLocalText = computed(() => localText(selCopyObj.value));
const copyLangs = computed(() => {
  const o = selCopyObj.value;
  if (!o) return ['EN'];
  const present = ALL_LANGS.filter((l) => (o.copy_text?.[l.toLowerCase()] || o[l.toLowerCase()] || '').trim());
  return present.includes('EN') ? present : ['EN', ...present];
});

function openClip(c) {
  sel.value = c;
  // Pre-select the first copy available for this clip so the drawer opens ready.
  const opts = copiesForClip(c);
  selCopy.value = opts.length ? opts[0].key : '';
  selLangs.value = ['EN'];
  selDesigns.value = designs.value.length === 1 ? [designs.value[0].key] : [];
}
function toggleLang(l) {
  const i = selLangs.value.indexOf(l);
  if (i === -1) selLangs.value.push(l);
  else if (selLangs.value.length > 1) selLangs.value.splice(i, 1);
}
function toggleDesign(k) {
  const i = selDesigns.value.indexOf(k);
  if (i === -1) selDesigns.value.push(k); else selDesigns.value.splice(i, 1);
}

const canAdd = computed(() => selCopy.value && selLangs.value.length && (!designs.value.length || selDesigns.value.length));
function add() {
  const o = selCopyObj.value;
  const copyText = o?.copy_text || { en: o?.en || '', et: o?.et || '', fr: o?.fr || '', de: o?.de || '', es: o?.es || '' };
  const ok = addToBasket({
    clipId: sel.value.id,
    clip: { nameNoExt: sel.value.nameNoExt, name: sel.value.name, slate: sel.value.slate, category: sel.value.category, actor: sel.value.actor, relativePath: sel.value.relativePath },
    copyKey: selCopy.value,
    copyText,
    langs: [...selLangs.value],
    designs: [...selDesigns.value],
    requiresDisclaimer: !!o?.requires_disclaimer,
  });
  sel.value = null;
}
</script>

<template>
  <PortalLayout active="clips" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div>
        <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Browse clips</h1>
        <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">{{ filtered.length }} clips · pick footage, map copy, add to your order.</p>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>
      <div v-else-if="!store.market" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Select a market above to begin.</div>

      <template v-else>
        <div :style="{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }">
          <div :style="{ flex: '1 1 280px', minWidth: '220px' }"><Input v-model="q" placeholder="Search clips…" icon="search" /></div>
        </div>
        <div v-if="categories.length" :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap' }">
          <Tag v-for="c in ['All', ...categories]" :key="c" :active="cat === c" @click="cat = c">{{ c }}</Tag>
        </div>

        <div v-if="loading" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>
        <Card v-else-if="!filtered.length"><EmptyState icon="film" title="No clips" :sub="availableClips.length ? 'Nothing matches your search.' : 'No clips are available for this market yet.'" /></Card>
        <div v-else :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))', gap: 'var(--gap)' }">
          <div v-for="c in filtered" :key="c.id">
            <Thumb :clip="withPoster(c)" @click="openClip(c)" />
            <div :style="{ padding: '10px 2px 0' }">
              <div :style="{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ c.nameNoExt || c.name }}</div>
              <div :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }">{{ c.slate || '—' }} · {{ c.category || '—' }}</div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- detail drawer: configure & add -->
    <Drawer :open="!!sel" :title="sel ? (sel.slate || 'Clip') : ''" :width="480" @close="sel = null">
      <div v-if="sel">
        <video :src="videoUrl(sel)" controls preload="metadata" :poster="thumbUrl(sel)" :style="{ width: '100%', borderRadius: '12px', background: '#000', maxHeight: '320px' }" />
        <h2 :style="{ fontSize: '18px', fontWeight: 800, margin: '14px 0 10px' }">{{ sel.nameNoExt || sel.name }}</h2>

        <SectionLabel>Copy</SectionLabel>
        <Select v-model="selCopy" :options="copyOptions" />
        <div v-if="selCopyObj" :style="{ fontSize: '13px', color: 'var(--text-2)', margin: '8px 0 0', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '10px' }">
          <template v-if="selLocalText">
            <div :style="{ color: 'var(--text-1)', fontWeight: 600 }">{{ selLocalText }}</div>
            <div :style="{ marginTop: '5px', fontSize: '12px', color: 'var(--text-3)' }">EN · {{ selCopyObj.en }}</div>
          </template>
          <template v-else>{{ selCopyObj.en }}</template>
        </div>

        <SectionLabel :style="{ marginTop: '18px' }">Languages</SectionLabel>
        <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap' }">
          <Tag v-for="l in copyLangs" :key="l" :active="selLangs.includes(l)" @click="toggleLang(l)">{{ l }}</Tag>
        </div>

        <template v-if="designs.length">
          <SectionLabel :style="{ marginTop: '18px' }">Designs</SectionLabel>
          <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap' }">
            <Tag v-for="d in designs" :key="d.key" :active="selDesigns.includes(d.key)" @click="toggleDesign(d.key)">{{ d.label || d.key }}</Tag>
          </div>
        </template>
      </div>
      <template #footer>
        <Button full icon="plus" :disabled="!canAdd" @click="add">Add to order</Button>
      </template>
    </Drawer>
  </PortalLayout>
</template>
