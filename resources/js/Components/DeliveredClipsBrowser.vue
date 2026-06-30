<script setup>
import { ref, computed, watch } from 'vue';
import Card from './Card.vue';
import Button from './Button.vue';
import Select from './Select.vue';
import Tag from './Tag.vue';
import Drawer from './Drawer.vue';
import SectionLabel from './SectionLabel.vue';
import EmptyState from './EmptyState.vue';
import Icon from './Icon.vue';

const props = defineProps({
  clips: { type: Array, default: () => [] },
  // When true, the player drawer exposes rename / replace-thumbnail / replace-
  // file / delete (admin), emitted to the parent which owns the API calls + list
  // state. Admin (manage) can preview any clip; leads can only preview approved.
  manage: { type: Boolean, default: false },
});
const emit = defineEmits(['rename', 'replace-thumb', 'replace-file', 'delete']);

const viewMode = ref('copy'); // 'copy' (browse by copy) | 'list' (flat sortable)
const sortBy = ref('theme');
const catFilter = ref('All');
const selectedCopyKey = ref(null);
const playing = ref(null);
const editingName = ref(false);
const editName = ref('');

const sortOptions = [
  { value: 'theme', label: 'Theme (set)' },
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'format', label: 'Format' },
];
const FORMAT_ORDER = ['16:9', '1:1', '9:16', '4:5'];
const fmtRank = (f) => { const i = FORMAT_ORDER.indexOf(f); return i === -1 ? 99 : i; };

const fmtSize = (b) => {
  if (!b) return '';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
};
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');

// ── Legal review gate ────────────────────────────────────────────
// A clip is downloadable only when approved. Leads can preview only approved
// clips; admins (manage) can preview any (to check the file). The decline reason
// is only present in the payload for admins — never shown to leads.
const canDownload = (c) => c.review_status === 'approved';
const canPreview = (c) => c.review_status === 'approved' || props.manage;
const setDownloadable = (arr) => arr.some(canDownload);
function reviewPill(c) {
  if (c.review_status === 'pending') return { label: 'Pending legal review', c: 'var(--warning)', b: 'rgba(246,198,66,0.15)' };
  if (c.review_status === 'declined') return { label: 'Declined', c: 'var(--danger)', b: 'var(--danger-soft)' };
  return null; // approved → no badge in rows
}

const copyOf = (c) => c.copy_full || c.copy || '';
const copySlugUnderscore = (c) => (c.copy || '').trim().replace(/\s+/g, '_');
// One message/set: brand + lang + copy + actor (all designs & formats).
const setName = (c) => [c.brand, c.lang, copySlugUnderscore(c), c.actor].filter(Boolean).join('_');
const catOf = (c) => c.category || 'Other';
const copyKeyOf = (c) => c.copy_key || ('slug:' + (c.copy || c.id));
const copyLabelOf = (c) => copyOf(c) || '—';

// ── By copy ──────────────────────────────────────────────────────
const categories = computed(() => {
  const s = new Set(props.clips.map(catOf));
  return [...s].sort((a, b) => (a === 'Other') - (b === 'Other') || a.localeCompare(b));
});
const copyGroups = computed(() => {
  const map = new Map();
  for (const c of props.clips) {
    if (catFilter.value !== 'All' && catOf(c) !== catFilter.value) continue;
    const k = copyKeyOf(c);
    if (!map.has(k)) map.set(k, { key: k, label: copyLabelOf(c), category: catOf(c), clips: [], slateSet: new Set() });
    const e = map.get(k);
    e.clips.push(c);
    if (c.slate) e.slateSet.add(c.slate);
  }
  return [...map.values()]
    .map((g) => ({ ...g, slates: [...g.slateSet].sort() }))
    .sort((a, b) => a.label.localeCompare(b.label));
});
const selectedCopy = computed(() => {
  if (!selectedCopyKey.value) return null;
  const items = props.clips.filter((c) => copyKeyOf(c) === selectedCopyKey.value);
  if (!items.length) return null;
  return { key: selectedCopyKey.value, label: copyLabelOf(items[0]), category: catOf(items[0]), clips: items };
});

function setsOf(clipsArr) {
  const map = new Map();
  for (const c of clipsArr) {
    const k = setName(c) || ('clip-' + c.id);
    if (!map.has(k)) map.set(k, { name: k, actor: c.actor, items: [] });
    map.get(k).items.push(c);
  }
  return [...map.values()]
    .map((s) => ({ ...s, items: s.items.slice().sort((a, b) => (a.design || '').localeCompare(b.design || '') || fmtRank(a.format) - fmtRank(b.format) || (a.name || '').localeCompare(b.name || '')) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
const selectedSets = computed(() => (selectedCopy.value ? setsOf(selectedCopy.value.clips) : []));

// ── List (theme / flat) ──────────────────────────────────────────
const groups = computed(() => {
  const map = new Map();
  for (const c of props.clips) {
    const k = setName(c) || ('clip-' + c.id);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(c);
  }
  const arr = [...map.entries()].map(([name, items]) => ({
    name,
    copy: copyOf(items[0]),
    items: items.slice().sort((a, b) => (a.design || '').localeCompare(b.design || '') || fmtRank(a.format) - fmtRank(b.format) || (a.name || '').localeCompare(b.name || '')),
  }));
  arr.sort((a, b) => a.name.localeCompare(b.name));
  return arr;
});
const flat = computed(() => {
  const list = props.clips.slice();
  if (sortBy.value === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  else if (sortBy.value === 'format') list.sort((a, b) => fmtRank(a.format) - fmtRank(b.format) || (a.name || '').localeCompare(b.name || ''));
  else list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return list;
});
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
function rowMeta(c) {
  if (viewMode.value === 'list' && sortBy.value === 'theme') return [c.design, c.lang].filter(Boolean).join(' · ');
  if (viewMode.value === 'copy') return [c.design, c.lang].filter(Boolean).join(' · ');
  return [c.slate, c.actor, c.design, c.lang].filter(Boolean).join(' · ');
}

// ── Downloads ────────────────────────────────────────────────────
function downloadIds(ids) {
  if (!ids.length) return;
  const a = document.createElement('a');
  a.href = '/api/delivered-clips/set?ids=' + encodeURIComponent(ids.join(','));
  document.body.appendChild(a);
  a.click();
  a.remove();
}
// Only approved clips are ever zipped (the server enforces this too).
const downloadSet = (s) => downloadIds(s.items.filter(canDownload).map((c) => c.id));
const downloadCopy = (g) => downloadIds(g.clips.filter(canDownload).map((c) => c.id));

// ── Navigation / player ──────────────────────────────────────────
function openCopy(g) { selectedCopyKey.value = g.key; }
function backToCopies() { selectedCopyKey.value = null; }
watch(catFilter, () => { selectedCopyKey.value = null; });
watch(viewMode, () => { selectedCopyKey.value = null; });

function play(c) {
  // Open the details drawer for any clip — leads can see status, who reviewed it
  // and the decline reason even when the video itself isn't previewable (the
  // player stays gated below: unapproved video is never streamed to leads).
  playing.value = c;
  editingName.value = false;
}
function startRename() { editName.value = playing.value?.name || ''; editingName.value = true; }
function doReplaceFile() { if (playing.value) emit('replace-file', playing.value); }

// Drawer detail rows. Leads see a publish-oriented set (message + delivery
// specs), message first; the production internals (slate/actor/design, uploader)
// are admin-only. Decline reason is appended separately (highlighted).
const detailRows = computed(() => {
  const c = playing.value;
  if (!c) return [];
  const copy = c.copy_full || c.copy || '—';
  const review = [c.review_status, c.reviewer, c.reviewed_at ? fmtDate(c.reviewed_at) : null].filter(Boolean).join(' · ') || '—';
  if (props.manage) {
    return [
      ['Copy', copy],
      ['Format', c.format || '—'],
      ['Language', c.lang || '—'],
      ['Category', c.category || '—'],
      ['Slate', c.slate || '—'],
      ['Actor', c.actor || '—'],
      ['Design', c.design || '—'],
      ['Size', fmtSize(c.file_size) || '—'],
      ['Delivered', fmtDate(c.created_at) + (c.uploaded_by ? ' · ' + c.uploaded_by : '')],
      ['Review', review],
    ];
  }
  return [
    ['Copy', copy],
    ['Format', c.format || '—'],
    ['Language', c.lang || '—'],
    ['Category', c.category || '—'],
    ['Size', fmtSize(c.file_size) || '—'],
    ['Delivered', fmtDate(c.created_at)],
    ['Review', review],
  ];
});
function saveRename() {
  const n = editName.value.trim();
  editingName.value = false;
  if (n && playing.value && n !== playing.value.name) emit('rename', { clip: playing.value, name: n });
}
function doThumb() { if (playing.value) emit('replace-thumb', playing.value); }
function doDelete() { const c = playing.value; if (c) { emit('delete', c); playing.value = null; } }

const rowStyle = { display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px', borderTop: '1px solid var(--divider)' };
</script>

<template>
  <div :style="{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
    <!-- View toggle + (list) sort -->
    <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }">
      <div :style="{ display: 'flex', gap: '8px' }">
        <Tag :active="viewMode === 'copy'" @click="viewMode = 'copy'">By copy</Tag>
        <Tag :active="viewMode === 'list'" @click="viewMode = 'list'">List</Tag>
      </div>
      <div v-if="viewMode === 'list' && clips.length" :style="{ display: 'flex', alignItems: 'center', gap: '8px' }">
        <span :style="{ fontSize: '13px', color: 'var(--text-3)' }">Sort</span>
        <div :style="{ width: '170px' }"><Select v-model="sortBy" :options="sortOptions" /></div>
      </div>
    </div>

    <Card v-if="!clips.length"><EmptyState icon="inbox" title="No delivered clips yet" sub="Finished videos for this market will appear here." /></Card>

    <!-- ── BY COPY ─────────────────────────────────────────── -->
    <template v-else-if="viewMode === 'copy'">
      <!-- Step 1: category tabs + copy cards -->
      <template v-if="!selectedCopy">
        <div v-if="categories.length > 1" :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap' }">
          <Tag :active="catFilter === 'All'" @click="catFilter = 'All'">All</Tag>
          <Tag v-for="c in categories" :key="c" :active="catFilter === c" @click="catFilter = c">{{ c }}</Tag>
        </div>
        <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--gap)' }">
          <Card v-for="g in copyGroups" :key="g.key" hover clickable @click="openCopy(g)">
            <div :style="{ fontSize: '15px', fontWeight: 700, lineHeight: 1.35 }">{{ g.label }}</div>
            <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px', alignItems: 'center' }">
              <Tag v-for="s in g.slates" :key="s" :clickable="false">{{ s }}</Tag>
              <span :style="{ fontSize: '12px', color: 'var(--text-3)' }">{{ g.clips.length }} clip{{ g.clips.length === 1 ? '' : 's' }}</span>
            </div>
          </Card>
        </div>
      </template>

      <!-- Step 2: one copy's delivered sets -->
      <template v-else>
        <button @click="backToCopies" :style="{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '13.5px', fontFamily: 'inherit' }">
          <Icon name="arrowleft" :size="16" /> Copies
        </button>
        <Card :style="{ background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }">
          <div :style="{ minWidth: 0 }">
            <div :style="{ fontSize: '16px', fontWeight: 800 }">{{ selectedCopy.label }}</div>
            <div :style="{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '3px' }">{{ selectedCopy.category }} · {{ selectedCopy.clips.length }} clips</div>
          </div>
          <Button size="sm" icon="download" :disabled="!setDownloadable(selectedCopy.clips)" @click="downloadCopy(selectedCopy)">Download all</Button>
        </Card>

        <Card v-for="s in selectedSets" :key="s.name" :pad="false" :style="{ overflow: 'hidden' }">
          <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '12px 14px', background: 'var(--surface-2)' }">
            <div :style="{ fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-mono, ui-monospace, monospace)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="s.name">{{ s.name }}</div>
            <Button size="sm" icon="download" :disabled="!setDownloadable(s.items)" @click="downloadSet(s)">Download set</Button>
          </div>
          <div v-for="c in s.items" :key="c.id" :style="rowStyle">
            <div @click="play(c)" :style="{ position: 'relative', flex: '0 0 auto', width: '78px', height: '44px', borderRadius: '7px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer' }">
              <img v-if="c.thumbnail_url" :src="c.thumbnail_url" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
              <Icon v-else name="film" :size="16" :style="{ color: 'var(--text-3)' }" />
              <div :style="{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.15)' }"><Icon :name="canPreview(c) ? 'play' : 'eye'" :size="16" :style="{ color: '#fff' }" /></div>
            </div>
            <Tag :clickable="false" v-if="c.format" :style="{ flex: '0 0 auto' }">{{ c.format }}</Tag>
            <div :style="{ flex: '1 1 auto', minWidth: 0 }">
              <div :style="{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="c.name">{{ c.name }}</div>
              <div v-if="rowMeta(c)" :style="{ fontSize: '12px', color: 'var(--text-3)' }">{{ rowMeta(c) }}</div>
            </div>
            <span v-if="reviewPill(c)" :style="{ flex: '0 0 auto', fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: 'var(--r-pill)', color: reviewPill(c).c, background: reviewPill(c).b, whiteSpace: 'nowrap' }">{{ reviewPill(c).label }}</span>
            <span :style="{ flex: '0 0 auto', fontSize: '12px', color: 'var(--text-3)', minWidth: '54px', textAlign: 'right' }">{{ fmtSize(c.file_size) }}</span>
            <Button size="sm" variant="ghost" :icon="canPreview(c) ? 'play' : 'eye'" @click="play(c)">{{ canPreview(c) ? 'Preview' : 'Details' }}</Button>
            <a v-if="canDownload(c)" :href="c.download_url" :style="{ textDecoration: 'none', flex: '0 0 auto' }"><Button size="sm" variant="secondary" icon="download">Download</Button></a>
            <Button v-else size="sm" variant="secondary" icon="download" disabled :style="{ flex: '0 0 auto' }">Download</Button>
          </div>
        </Card>
      </template>
    </template>

    <!-- ── LIST ────────────────────────────────────────────── -->
    <Card v-else :pad="false" :style="{ overflow: 'hidden' }">
      <template v-for="r in rows" :key="r.key">
        <div v-if="r.type === 'header'" :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '12px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--divider)' }">
          <div :style="{ minWidth: 0 }">
            <div :style="{ fontSize: '13.5px', fontWeight: 800, fontFamily: 'var(--font-mono, ui-monospace, monospace)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="r.group.name">{{ r.group.name }}</div>
            <div v-if="r.group.copy" :style="{ fontSize: '12.5px', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ r.group.copy }} · {{ r.group.items.length }} clips</div>
          </div>
          <Button size="sm" icon="download" :disabled="!setDownloadable(r.group.items)" @click="downloadSet(r.group)">Download set</Button>
        </div>
        <div v-else :style="rowStyle">
          <div @click="play(r.clip)" :style="{ position: 'relative', flex: '0 0 auto', width: '78px', height: '44px', borderRadius: '7px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer' }">
            <img v-if="r.clip.thumbnail_url" :src="r.clip.thumbnail_url" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
            <Icon v-else name="film" :size="16" :style="{ color: 'var(--text-3)' }" />
            <div :style="{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.15)' }"><Icon :name="canPreview(r.clip) ? 'play' : 'eye'" :size="16" :style="{ color: '#fff' }" /></div>
          </div>
          <Tag :clickable="false" v-if="r.clip.format" :style="{ flex: '0 0 auto' }">{{ r.clip.format }}</Tag>
          <div :style="{ flex: '1 1 auto', minWidth: 0 }">
            <div :style="{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="r.clip.name">{{ r.clip.name }}</div>
            <div v-if="rowMeta(r.clip)" :style="{ fontSize: '12px', color: 'var(--text-3)' }">{{ rowMeta(r.clip) }}</div>
          </div>
          <span v-if="reviewPill(r.clip)" :style="{ flex: '0 0 auto', fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: 'var(--r-pill)', color: reviewPill(r.clip).c, background: reviewPill(r.clip).b, whiteSpace: 'nowrap' }">{{ reviewPill(r.clip).label }}</span>
          <span :style="{ flex: '0 0 auto', fontSize: '12px', color: 'var(--text-3)', minWidth: '54px', textAlign: 'right' }">{{ fmtSize(r.clip.file_size) }}</span>
          <Button size="sm" variant="ghost" :icon="canPreview(r.clip) ? 'play' : 'eye'" @click="play(r.clip)">{{ canPreview(r.clip) ? 'Preview' : 'Details' }}</Button>
          <a v-if="canDownload(r.clip)" :href="r.clip.download_url" :style="{ textDecoration: 'none', flex: '0 0 auto' }"><Button size="sm" variant="secondary" icon="download">Download</Button></a>
          <Button v-else size="sm" variant="secondary" icon="download" disabled :style="{ flex: '0 0 auto' }">Download</Button>
        </div>
      </template>
    </Card>

    <!-- Player drawer -->
    <Drawer :open="!!playing" :title="playing ? (playing.name || 'Clip') : ''" :width="520" @close="playing = null">
      <div v-if="playing">
        <video v-if="canPreview(playing)" :src="playing.stream_url" controls autoplay preload="metadata" :poster="playing.thumbnail_url || undefined"
          :style="{ width: '100%', borderRadius: '12px', background: '#000', maxHeight: '60vh' }" />
        <div v-else :style="{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', border: '1px solid var(--border)', minHeight: '180px', display: 'grid', placeItems: 'center' }">
          <img v-if="playing.thumbnail_url" :src="playing.thumbnail_url" alt="" :style="{ width: '100%', maxHeight: '72vh', objectFit: 'contain', display: 'block' }" />
          <Icon v-else name="film" :size="28" :style="{ color: 'var(--text-3)' }" />
          <div :style="{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '10px 14px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }">
            <Icon name="eye" :size="15" /> {{ playing.review_status === 'declined' ? 'Declined — not available to play. See the reason below.' : 'Awaiting legal review — preview once approved.' }}
          </div>
        </div>

        <div v-if="manage && editingName" :style="{ marginTop: '14px', display: 'flex', gap: '8px' }">
          <input v-model="editName" :style="{ flex: 1, height: 'var(--ctrl-h)', padding: '0 12px', borderRadius: 'var(--r-input)', background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '14px', fontFamily: 'inherit' }" @keydown.enter="saveRename" />
          <Button size="sm" @click="saveRename">Save</Button>
          <Button size="sm" variant="ghost" @click="editingName = false">Cancel</Button>
        </div>

        <SectionLabel :style="{ marginTop: '18px' }">Details</SectionLabel>
        <div :style="{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: '13px' }">
          <template v-for="row in detailRows" :key="row[0]">
            <span :style="{ color: 'var(--text-3)' }">{{ row[0] }}</span><span>{{ row[1] }}</span>
          </template>
          <template v-if="playing.decline_reason">
            <span :style="{ color: 'var(--text-3)' }">Decline reason</span><span :style="{ color: 'var(--danger)' }">{{ playing.decline_reason }}</span>
          </template>
        </div>
      </div>
      <template #footer>
        <div v-if="playing" :style="{ display: 'flex', flexDirection: 'column', gap: '8px' }">
          <a v-if="canDownload(playing)" :href="playing.download_url" :style="{ textDecoration: 'none' }"><Button full icon="download">Download</Button></a>
          <Button v-else full icon="download" disabled>{{ playing.review_status === 'declined' ? 'Declined — not downloadable' : 'Pending legal review' }}</Button>
          <div v-if="manage" :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap' }">
            <Button size="sm" variant="ghost" icon="edit" @click="startRename">Rename</Button>
            <Button size="sm" variant="ghost" icon="upload" @click="doReplaceFile">Replace video</Button>
            <Button size="sm" variant="ghost" icon="sparkles" @click="doThumb">Thumbnail</Button>
            <Button size="sm" variant="danger" icon="trash" @click="doDelete">Delete</Button>
          </div>
        </div>
      </template>
    </Drawer>
  </div>
</template>
