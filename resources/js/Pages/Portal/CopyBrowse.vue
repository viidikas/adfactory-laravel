<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import PortalLayout from '../../Layouts/PortalLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Tag from '../../Components/Tag.vue';
import Thumb from '../../Components/Thumb.vue';
import Drawer from '../../Components/Drawer.vue';
import SectionLabel from '../../Components/SectionLabel.vue';
import EmptyState from '../../Components/EmptyState.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';
import { usePortalStore, addToBasket } from '../../lib/portalStore.js';

defineProps({ theme: { type: String, default: null }, density: { type: String, default: null } });

const store = usePortalStore();
const clips = ref([]);
const copies = ref([]);
const designs = ref([]);
const loading = ref(true);
const error = ref('');

const step = ref(1);
const cat = ref('All');
const chosen = ref(null);        // chosen copy object
const preview = ref(null);       // clip shown in the preview/configure modal
const selDesigns = ref([]);      // per-clip designs (set in the modal)

const thumb = (c) => ({ ...c, poster: '/api/thumb?path=' + encodeURIComponent(c.relativePath || ''), aspect: undefined, duration: null });
const thumbUrl = (c) => '/api/thumb?path=' + encodeURIComponent(c?.relativePath || '');
const videoUrl = (c) => '/api/video?path=' + encodeURIComponent(c?.relativePath || '');

async function loadClips() { const c = await api.get('/api/clips'); clips.value = Array.isArray(c) ? c : []; }
async function loadCopies() { copies.value = store.market ? await api.get('/api/copies?market_id=' + store.market.id) : []; }
async function loadDesigns() {
  try { const p = await api.get('/api/projects'); const a = (p || []).find((x) => x.is_active); const all = a?.designs || [];
    designs.value = store.market ? all.filter((d) => !d.brand || d.brand === store.market.brand) : all; } catch { designs.value = []; }
}
onMounted(async () => {
  try { await Promise.all([loadClips(), loadCopies(), loadDesigns()]); } catch (e) { error.value = e.message || 'Failed to load.'; } finally { loading.value = false; }
});
watch(() => store.market?.id, async () => { reset(); try { await Promise.all([loadCopies(), loadDesigns()]); } catch {} });
// The preview modal only belongs to step 2; close it on any step change.
watch(step, () => { preview.value = null; });

const copyCats = computed(() => [...new Set(copies.value.map((c) => c.category).filter(Boolean))].sort());
const visibleCopies = computed(() => copies.value.filter((c) => cat.value === 'All' || c.category === cat.value));

function clipsForCopy(copy) {
  if (!copy) return [];
  const codes = (copy.shot || '').toUpperCase().split(/[\s,;]+/).filter(Boolean);
  let list = codes.length ? clips.value.filter((c) => codes.includes((c.slate || '').toUpperCase())) : [];
  if (!list.length) list = clips.value.filter((c) => c.category === copy.category);
  return list;
}
const stepClips = computed(() => clipsForCopy(chosen.value));
// The order is produced in the MARKET's language — the copy's non-EN language
// key (e.g. FI), or EN for an English-only market. The EN line in the modal is a
// reference translation, not a separately ordered language.
function marketLangCodes(o) {
  const ct = o?.copy_text || {};
  const local = Object.keys(ct).find((k) => k !== 'en' && String(ct[k] || '').trim());
  return local ? [local.toUpperCase()] : ['EN'];
}
// Market-language text of the chosen copy, shown for context in the modal.
const chosenLocalText = computed(() => {
  const ct = chosen.value?.copy_text || {};
  const k = Object.keys(ct).find((x) => x !== 'en' && String(ct[x] || '').trim());
  return k ? ct[k] : '';
});

function chooseCopy(c) { chosen.value = c; step.value = 2; }
function openPreview(c) {
  preview.value = c;
  // Reset per-clip designs each time a clip is opened.
  selDesigns.value = designs.value.length === 1 ? [designs.value[0].key] : [];
}
function toggleDesign(k) { const i = selDesigns.value.indexOf(k); if (i === -1) selDesigns.value.push(k); else selDesigns.value.splice(i, 1); }
function reset() { step.value = 1; chosen.value = null; preview.value = null; selDesigns.value = []; cat.value = 'All'; }

// Whether this clip is already in the basket for the chosen copy (grid hint).
function inBasket(clip) {
  return store.basket.some((b) => b.clipId === clip.id && b.copyKey === chosen.value?.key);
}

const canAdd = computed(() => !!preview.value && (!designs.value.length || selDesigns.value.length));
function addOne() {
  const o = chosen.value, clip = preview.value;
  if (!o || !clip) return;
  const copyText = o.copy_text || { en: o.en || '', et: o.et || '', fr: o.fr || '', de: o.de || '', es: o.es || '' };
  addToBasket({
    clipId: clip.id,
    clip: { nameNoExt: clip.nameNoExt, name: clip.name, slate: clip.slate, category: clip.category, actor: clip.actor, relativePath: clip.relativePath },
    copyKey: o.key, copyText, langs: marketLangCodes(o), designs: [...selDesigns.value], requiresDisclaimer: !!o.requires_disclaimer,
  });
  preview.value = null;
}
</script>

<template>
  <PortalLayout active="copy-browse" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }">
        <div>
          <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Browse by copy</h1>
          <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">Pick a message, then open each clip to localize and add it to your order.</p>
        </div>
        <div :style="{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '13px', color: 'var(--text-3)' }">
          <span :style="{ color: step >= 1 ? 'var(--accent)' : 'inherit', fontWeight: step === 1 ? 700 : 400 }">1 Copy</span><Icon name="chevright" :size="14" />
          <span :style="{ color: step >= 2 ? 'var(--accent)' : 'inherit', fontWeight: step === 2 ? 700 : 400 }">2 Clips</span>
        </div>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>
      <div v-else-if="!store.market" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Select a market above to begin.</div>
      <div v-else-if="loading" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>

      <!-- Step 1: copies -->
      <template v-else-if="step === 1">
        <div v-if="copyCats.length" :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap' }">
          <Tag v-for="c in ['All', ...copyCats]" :key="c" :active="cat === c" @click="cat = c">{{ c }}</Tag>
        </div>
        <Card v-if="!visibleCopies.length"><EmptyState icon="filetext" title="No copy available" sub="No enabled copy for this market yet." /></Card>
        <div v-else :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--gap)' }">
          <Card v-for="c in visibleCopies" :key="c.key" hover clickable @click="chooseCopy(c)">
            <div :style="{ fontSize: '15px', fontWeight: 700, lineHeight: 1.35 }">{{ c.en }}</div>
            <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }">
              <Tag :clickable="false">{{ c.key }}</Tag>
              <Tag v-if="c.shot" :clickable="false">{{ c.shot }}</Tag>
            </div>
          </Card>
        </div>
      </template>

      <!-- Step 2: clips -->
      <template v-else>
        <button @click="step = 1" :style="{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '13.5px', fontFamily: 'inherit' }"><Icon name="arrowleft" :size="16" /> Copy</button>
        <Card :style="{ background: 'var(--surface-2)' }">
          <div :style="{ fontSize: '15px', fontWeight: 700 }">{{ chosen.en }}</div>
          <div :style="{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '4px' }">Open a clip to preview it, pick designs, and add it to your order.</div>
        </Card>
        <Card v-if="!stepClips.length"><EmptyState icon="film" title="No clips for this copy" sub="No footage matches this copy's slates." /></Card>
        <div v-else :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))', gap: 'var(--gap)' }">
          <div v-for="c in stepClips" :key="c.id">
            <Thumb :clip="thumb(c)" :selected="inBasket(c)" @click="openPreview(c)" />
            <div :style="{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ c.slate }} · {{ c.actor || '—' }}</div>
          </div>
        </div>
      </template>
    </div>

    <!-- Clip preview + configure modal (same drawer style as Browse clips) -->
    <Drawer :open="!!preview" :title="preview ? (preview.slate || 'Clip') : ''" :width="480" @close="preview = null">
      <div v-if="preview">
        <video :src="videoUrl(preview)" controls preload="metadata" :poster="thumbUrl(preview)" :style="{ width: '100%', borderRadius: '12px', background: '#000', maxHeight: '320px' }" />
        <h2 :style="{ fontSize: '18px', fontWeight: 800, margin: '14px 0 6px' }">{{ preview.nameNoExt || preview.name }}</h2>
        <div :style="{ fontSize: '12.5px', color: 'var(--text-3)' }">{{ preview.slate || '—' }} · {{ preview.category || '—' }} · {{ preview.actor || '—' }}</div>

        <SectionLabel :style="{ marginTop: '18px' }">Copy</SectionLabel>
        <div :style="{ fontSize: '13px', color: 'var(--text-2)', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '10px' }">
          <template v-if="chosenLocalText">
            <div :style="{ color: 'var(--text-1)', fontWeight: 600 }">{{ chosenLocalText }}</div>
            <div :style="{ marginTop: '5px', fontSize: '12px', color: 'var(--text-3)' }">EN · {{ chosen.en }}</div>
          </template>
          <template v-else>{{ chosen.en }}</template>
        </div>

        <template v-if="designs.length">
          <SectionLabel :style="{ marginTop: '18px' }">Designs</SectionLabel>
          <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap' }">
            <Tag v-for="d in designs" :key="d.key" :active="selDesigns.includes(d.key)" @click="toggleDesign(d.key)">{{ d.label || d.key }}</Tag>
          </div>
        </template>
      </div>
      <template #footer>
        <Button full icon="plus" :disabled="!canAdd" @click="addOne">{{ preview && inBasket(preview) ? 'Add another variant' : 'Add to order' }}</Button>
      </template>
    </Drawer>
  </PortalLayout>
</template>
