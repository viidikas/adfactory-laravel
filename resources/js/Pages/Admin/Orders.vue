<script setup>
import { ref, computed, onMounted } from 'vue';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Input from '../../Components/Input.vue';
import Select from '../../Components/Select.vue';
import Tag from '../../Components/Tag.vue';
import StatusPill from '../../Components/StatusPill.vue';
import Drawer from '../../Components/Drawer.vue';
import SectionLabel from '../../Components/SectionLabel.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';
import { ALL_LANGS } from '../../lib/templater.js';

const props = defineProps({
  openId: { type: String, default: null },
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

const orders = ref([]);
const loading = ref(true);
const error = ref('');
const tab = ref('all');
const detailId = ref(props.openId || null);
const busy = ref(false);
const readyMode = ref(false);     // showing the per-item rendered-path form
const renderedPaths = ref({});    // item index -> path string

// Modify / delete state
const editMode = ref(false);
const editItems = ref([]);        // working copy of items while editing
const editNote = ref('');
const editLoading = ref(false);
const adding = ref(false);        // clip-picker panel open
const clipQuery = ref('');
const mktCopies = ref([]);        // enabled copies of the order's market
const allClips = ref([]);
const projDesigns = ref([]);
const confirmDelete = ref(false);

// Order flow statuses (the pending -> processing -> ready timeline). `rejected`
// is a separate terminal state, surfaced as its own tab/pill, not on the line.
const STATUS_TABS = ['pending', 'processing', 'ready', 'rejected'];

async function load() {
  loading.value = true;
  try {
    const data = await api.get('/api/orders');
    orders.value = Array.isArray(data) ? data : [];
    error.value = '';
  } catch (e) {
    error.value = e.message || 'Failed to load orders.';
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const counts = computed(() => Object.fromEntries(STATUS_TABS.map((s) => [s, orders.value.filter((o) => o.status === s).length])));
const tabs = computed(() => ['all', ...STATUS_TABS]);
const filtered = computed(() => orders.value.filter((o) => tab.value === 'all' || o.status === tab.value));
const detail = computed(() => orders.value.find((o) => o.id === detailId.value) || null);

const timeline = ['pending', 'processing', 'ready'];
const curIdx = computed(() => (detail.value ? timeline.indexOf(detail.value.status) : -1));

const shortId = (id) => String(id || '').slice(0, 8);
const fmtDate = (unix) => (unix ? new Date(unix * 1000).toLocaleString() : '—');
const TAB_LABEL = { all: 'All', pending: 'Pending', processing: 'Processing', ready: 'Ready', rejected: 'Rejected' };

const canEdit = computed(() => detail.value && detail.value.status !== 'ready');
const canReject = computed(() => detail.value && ['pending', 'processing'].includes(detail.value.status));

function resetDrawerState() {
  readyMode.value = false;
  editMode.value = false;
  adding.value = false;
  confirmDelete.value = false;
  clipQuery.value = '';
}
function openDetail(o) {
  detailId.value = o.id;
  resetDrawerState();
}
function closeDetail() {
  detailId.value = null;
  resetDrawerState();
}

async function setStatus(status, extra = {}) {
  if (!detail.value) return;
  busy.value = true;
  try {
    const updated = await api.put('/api/orders/' + detail.value.id, { status, ...extra });
    // Merge the fresh order back into the list.
    const idx = orders.value.findIndex((o) => o.id === detail.value.id);
    if (idx !== -1) orders.value[idx] = normalize(updated);
  } catch (e) {
    alert(e.message || 'Update failed.');
  } finally {
    busy.value = false;
  }
}

// /api/orders/{id} update returns the raw model (snake_case + items relation),
// which differs from the index shape — normalize to the index shape.
function normalize(o) {
  if (!o) return o;
  if (Array.isArray(o.items) && o.items.length && o.items[0].clip_id !== undefined) {
    o = {
      ...o,
      created: o.created ?? (o.created_at ? Math.floor(new Date(o.created_at).getTime() / 1000) : 0),
      items: o.items.map((it) => ({
        clipId: it.clip_id, clipName: it.clip_name, slate: it.slate, category: it.category,
        actor: it.actor, copyKey: it.copy_key, copyText: it.copy_text,
        requiresDisclaimer: it.requires_disclaimer, langs: it.langs, designs: it.designs,
      })),
    };
  }
  return o;
}

function startReady() {
  readyMode.value = true;
  renderedPaths.value = {};
}
async function confirmReady() {
  const items = detail.value.items || [];
  const rendered_clips = items
    .map((it, i) => ({ idx: i, it, path: (renderedPaths.value[i] || '').trim() }))
    .filter((r) => r.path)
    .map((r) => ({
      item_index: r.idx,
      clip_name: r.it.clipName,
      filename: r.path.split('/').pop(),
      url: '/api/rendered-video?path=' + encodeURIComponent(r.path),
    }));
  await setStatus('ready', { rendered_clips });
  readyMode.value = false;
}

// ── Reject / delete ─────────────────────────────────────────────
async function deleteOrder() {
  if (!detail.value) return;
  const id = detail.value.id;
  busy.value = true;
  try {
    await api.del('/api/orders/' + id);
    orders.value = orders.value.filter((o) => o.id !== id);
    closeDetail();
  } catch (e) {
    alert(e.message || 'Delete failed.');
  } finally {
    busy.value = false;
  }
}

// ── Full order editor ───────────────────────────────────────────
async function startEdit() {
  if (!detail.value) return;
  editItems.value = (detail.value.items || []).map((it) => ({
    clipId: it.clipId, clipName: it.clipName, slate: it.slate, category: it.category,
    actor: it.actor || '', copyKey: it.copyKey || '', langs: [...(it.langs || ['EN'])], designs: [...(it.designs || [])],
  }));
  editNote.value = detail.value.note || '';
  editMode.value = true;
  adding.value = false;
  await loadEditorData();
}
function cancelEdit() {
  editMode.value = false;
  adding.value = false;
  clipQuery.value = '';
}
async function loadEditorData() {
  editLoading.value = true;
  try {
    const [clips, copies, projects] = await Promise.all([
      api.get('/api/clips'),
      detail.value.market_id ? api.get('/api/copies?market_id=' + detail.value.market_id) : Promise.resolve([]),
      api.get('/api/projects').catch(() => []),
    ]);
    allClips.value = Array.isArray(clips) ? clips : [];
    mktCopies.value = Array.isArray(copies) ? copies : [];
    const active = (projects || []).find((p) => p.is_active);
    const designs = active?.designs || [];
    projDesigns.value = detail.value.brand ? designs.filter((d) => !d.brand || d.brand === detail.value.brand) : designs;
  } catch (e) {
    alert(e.message || 'Failed to load editor data.');
  } finally {
    editLoading.value = false;
  }
}

const copyByKey = (key) => mktCopies.value.find((c) => c.key === key) || null;
const localOrEn = (c) => {
  const ct = c?.copy_text || {};
  const k = Object.keys(ct).find((x) => x !== 'en' && String(ct[x] || '').trim());
  return (k ? ct[k] : '') || c?.en || '';
};
function copyOptionsFor(item) {
  const opts = mktCopies.value.map((c) => ({ value: c.key, label: `${c.key} · ${localOrEn(c)}`.slice(0, 60) }));
  if (item.copyKey && !mktCopies.value.some((c) => c.key === item.copyKey)) {
    opts.unshift({ value: item.copyKey, label: `${item.copyKey} (current)` });
  }
  return opts.length ? opts : [{ value: '', label: 'No enabled copies for this market' }];
}
function langsForCopy(c) {
  if (!c) return ['EN'];
  const present = ALL_LANGS.filter((l) => (c.copy_text?.[l.toLowerCase()] || c[l.toLowerCase()] || '').trim());
  return present.includes('EN') ? present : ['EN', ...present];
}
function setItemCopy(item, key) {
  item.copyKey = key;
  const avail = langsForCopy(copyByKey(key));
  item.langs = (item.langs || []).filter((l) => avail.includes(l));
  if (!item.langs.length) item.langs = ['EN'];
}
function toggleItemLang(item, l) {
  const i = item.langs.indexOf(l);
  if (i === -1) item.langs.push(l);
  else if (item.langs.length > 1) item.langs.splice(i, 1);
}
function toggleItemDesign(item, k) {
  if (!Array.isArray(item.designs)) item.designs = [];
  const i = item.designs.indexOf(k);
  if (i === -1) item.designs.push(k); else item.designs.splice(i, 1);
}
function removeItem(i) { editItems.value.splice(i, 1); }

const addableClips = computed(() => {
  const q = clipQuery.value.toLowerCase().trim();
  const list = q
    ? allClips.value.filter((c) => [c.nameNoExt, c.name, c.slate, c.actor].some((f) => String(f || '').toLowerCase().includes(q)))
    : allClips.value;
  return list.slice(0, 80);
});
function addClip(c) {
  const slate = (c.slate || '').toUpperCase();
  const match = mktCopies.value.find((mc) => (mc.shot || '').toUpperCase().split(/[\s,;]+/).filter(Boolean).includes(slate));
  const copyKey = (match || mktCopies.value[0] || {}).key || '';
  editItems.value.push({
    clipId: c.id, clipName: c.nameNoExt || c.name, slate: c.slate, category: c.category,
    actor: c.actor || '', copyKey, langs: ['EN'],
    designs: projDesigns.value.length === 1 ? [projDesigns.value[0].key] : [],
  });
  adding.value = false;
  clipQuery.value = '';
}

const canSave = computed(() =>
  editItems.value.length > 0 &&
  editItems.value.every((it) => it.copyKey && (it.langs || []).length > 0));
async function saveEdit() {
  if (!detail.value || !canSave.value) return;
  busy.value = true;
  try {
    const items = editItems.value.map((it) => ({
      clipId: it.clipId, clipName: it.clipName, slate: it.slate, category: it.category,
      actor: it.actor || '', copyKey: it.copyKey, langs: it.langs, designs: it.designs || [],
    }));
    const updated = await api.put('/api/orders/' + detail.value.id, { items, note: editNote.value });
    const idx = orders.value.findIndex((o) => o.id === detail.value.id);
    if (idx !== -1) orders.value[idx] = normalize(updated);
    editMode.value = false;
    adding.value = false;
  } catch (e) {
    alert(e.message || 'Save failed.');
  } finally {
    busy.value = false;
  }
}

function exportItemsCsv() {
  const o = detail.value;
  if (!o) return;
  const header = ['order', 'clip', 'slate', 'category', 'actor', 'copy_key', 'langs', 'designs'];
  const rows = (o.items || []).map((it) => [
    shortId(o.id), it.clipName, it.slate, it.category, it.actor, it.copyKey,
    (it.langs || []).join('|'), (it.designs || []).join('|'),
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `order_${shortId(o.id)}_items.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const itemRowStyle = { padding: '12px 0', borderTop: '1px solid var(--divider)' };
const editCardStyle = { padding: '14px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)', marginBottom: '12px' };
</script>

<template>
  <AppLayout active="orders" workspace="admin" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }">
        <div>
          <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Orders</h1>
          <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">{{ orders.length }} orders from growth leads</p>
        </div>
        <Button variant="secondary" icon="refresh" @click="load">Refresh</Button>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>

      <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap' }">
        <Tag v-for="t in tabs" :key="t" :active="tab === t" @click="tab = t">
          {{ TAB_LABEL[t] }}<span v-if="t !== 'all' && counts[t]" :style="{ opacity: 0.6, marginLeft: '4px' }">{{ counts[t] }}</span>
        </Tag>
      </div>

      <Card :pad="false">
        <div :style="{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 0.7fr 1fr 0.9fr', gap: '14px', padding: '12px var(--pad-card)', fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }">
          <div>Order</div><div>Brand · market</div><div>Clips</div><div>Created</div><div :style="{ textAlign: 'right' }">Status</div>
        </div>
        <div v-if="loading" :style="{ padding: '28px var(--pad-card)', color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>
        <div v-else-if="!filtered.length" :style="{ padding: '28px var(--pad-card)', color: 'var(--text-3)', fontSize: '14px' }">No orders in this view.</div>
        <div
          v-for="o in filtered" :key="o.id"
          @click="openDetail(o)" class="row-hover"
          :style="{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 0.7fr 1fr 0.9fr', gap: '14px', alignItems: 'center', padding: '13px var(--pad-card)', borderTop: '1px solid var(--divider)', cursor: 'pointer' }"
        >
          <div :style="{ minWidth: 0 }">
            <div :style="{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ o.user_name || 'Order' }}</div>
            <div class="mono" :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '3px' }">{{ shortId(o.id) }}</div>
          </div>
          <div :style="{ fontSize: '13px', color: 'var(--text-2)' }">{{ o.brand }} · {{ o.market || '—' }}</div>
          <div :style="{ fontSize: '13px', color: 'var(--text-2)' }">{{ (o.items || []).length }}</div>
          <div :style="{ fontSize: '12.5px', color: 'var(--text-3)' }">{{ fmtDate(o.created) }}</div>
          <div :style="{ display: 'flex', justifyContent: 'flex-end' }"><StatusPill :status="o.status" /></div>
        </div>
      </Card>
    </div>

    <!-- Order detail drawer -->
    <Drawer :open="!!detail" :title="detail ? shortId(detail.id) : ''" :width="520" @close="closeDetail">
      <div v-if="detail">
        <StatusPill :status="detail.status" />
        <h2 :style="{ fontSize: '21px', fontWeight: 800, letterSpacing: '-0.02em', margin: '12px 0 4px' }">{{ detail.user_name || 'Order' }}</h2>
        <div :style="{ fontSize: '13.5px', color: 'var(--text-2)' }">{{ detail.brand }} · {{ detail.market || '—' }} · {{ fmtDate(detail.created) }}</div>

        <!-- rejected banner, else the pending→ready timeline -->
        <div v-if="detail.status === 'rejected'" :style="{ display: 'flex', alignItems: 'center', gap: '8px', margin: '22px 0', padding: '12px 14px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '13.5px', fontWeight: 600 }">
          <Icon name="x" :size="16" :stroke="2.5" /> This order was rejected.
        </div>
        <div v-else :style="{ display: 'flex', alignItems: 'center', gap: '8px', margin: '22px 0' }">
          <template v-for="(s, i) in timeline" :key="s">
            <div :style="{ textAlign: 'center', flex: 1 }">
              <div :style="{ width: '20px', height: '20px', borderRadius: '999px', margin: '0 auto 6px', background: i <= curIdx ? 'var(--accent)' : 'var(--surface-3)', display: 'grid', placeItems: 'center' }">
                <Icon v-if="i < curIdx" name="check" :size="12" :stroke="3" :style="{ color: 'var(--text-on-accent)' }" />
              </div>
              <div :style="{ color: i <= curIdx ? 'var(--text-1)' : 'var(--text-3)', fontWeight: i === curIdx ? 700 : 400, fontSize: '11px', textTransform: 'capitalize' }">{{ s }}</div>
            </div>
            <div v-if="i < timeline.length - 1" :style="{ height: '2px', flex: 0.5, background: i < curIdx ? 'var(--accent)' : 'var(--surface-3)', marginBottom: '20px' }" />
          </template>
        </div>

        <!-- ════════ EDIT MODE ════════ -->
        <template v-if="editMode">
          <SectionLabel>Note</SectionLabel>
          <textarea v-model="editNote" rows="2" placeholder="Internal note…"
            :style="{ width: '100%', marginBottom: '6px', padding: '10px 12px', borderRadius: '10px', background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13.5px', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }" />

          <SectionLabel :style="{ marginTop: '14px' }">
            Items ({{ editItems.length }})
            <template #right>
              <Button size="sm" :variant="adding ? 'primary' : 'secondary'" icon="plus" @click="adding = !adding">Add clip</Button>
            </template>
          </SectionLabel>

          <!-- clip picker -->
          <div v-if="adding" :style="{ marginBottom: '12px', padding: '12px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)' }">
            <Input v-model="clipQuery" placeholder="Search clips…" icon="search" />
            <div :style="{ maxHeight: '220px', overflowY: 'auto', marginTop: '10px' }">
              <div v-if="editLoading" :style="{ color: 'var(--text-3)', fontSize: '13px', padding: '8px 0' }">Loading clips…</div>
              <div v-for="c in addableClips" :key="c.id" @click="addClip(c)" class="row-hover"
                :style="{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 6px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }">
                <Icon name="film" :size="14" :style="{ color: 'var(--text-3)' }" />
                <span class="mono" :style="{ color: 'var(--text-2)' }">{{ c.slate || '—' }}</span>
                <span :style="{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ c.nameNoExt || c.name }}</span>
                <span :style="{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: '12px' }">{{ c.actor || '' }}</span>
              </div>
              <div v-if="!editLoading && !addableClips.length" :style="{ color: 'var(--text-3)', fontSize: '13px', padding: '8px 0' }">No clips match.</div>
            </div>
          </div>

          <!-- editable item cards -->
          <div :style="{ marginBottom: '20px' }">
            <div v-for="(it, i) in editItems" :key="i" :style="editCardStyle">
              <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }">
                <Icon name="film" :size="15" :style="{ color: 'var(--text-3)' }" />
                <span :style="{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ it.clipName }}</span>
                <button @click="removeItem(i)" :title="'Remove'"
                  :style="{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '2px', display: 'inline-flex' }"><Icon name="trash" :size="16" /></button>
              </div>
              <div :style="{ fontSize: '12px', color: 'var(--text-3)', margin: '3px 0 10px' }">{{ it.slate || '—' }} · {{ it.category || '—' }} · {{ it.actor || '—' }}</div>

              <SectionLabel>Copy</SectionLabel>
              <Select :model-value="it.copyKey" :options="copyOptionsFor(it)" @update:model-value="(v) => setItemCopy(it, v)" />

              <SectionLabel :style="{ marginTop: '12px' }">Languages</SectionLabel>
              <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap' }">
                <Tag v-for="l in langsForCopy(copyByKey(it.copyKey))" :key="l" :active="it.langs.includes(l)" @click="toggleItemLang(it, l)">{{ l }}</Tag>
              </div>

              <template v-if="projDesigns.length">
                <SectionLabel :style="{ marginTop: '12px' }">Designs</SectionLabel>
                <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap' }">
                  <Tag v-for="d in projDesigns" :key="d.key" :active="(it.designs || []).includes(d.key)" @click="toggleItemDesign(it, d.key)">{{ d.label || d.key }}</Tag>
                </div>
              </template>
            </div>
            <div v-if="!editItems.length" :style="{ color: 'var(--text-3)', fontSize: '13.5px', padding: '8px 0' }">No items — add a clip to this order.</div>
          </div>
        </template>

        <!-- ════════ READ-ONLY MODE ════════ -->
        <template v-else>
          <div v-if="detail.note" :style="{ padding: '12px 14px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '13.5px', color: 'var(--text-2)', marginBottom: '18px' }">
            <span :style="{ color: 'var(--text-3)' }">Note: </span>{{ detail.note }}
          </div>

          <SectionLabel>
            Items ({{ (detail.items || []).length }})
            <template #right>
              <Button size="sm" variant="secondary" icon="download" :disabled="!(detail.items || []).length" @click="exportItemsCsv">Review CSV</Button>
            </template>
          </SectionLabel>
          <div :style="{ marginTop: '8px', marginBottom: '20px' }">
            <div v-for="(it, i) in detail.items" :key="i" :style="itemRowStyle">
              <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }">
                <Icon name="film" :size="15" :style="{ color: 'var(--text-3)' }" /> {{ it.clipName }}
              </div>
              <div :style="{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '4px' }">{{ it.slate }} · {{ it.category }} · {{ it.actor || '—' }} · copy: {{ it.copyKey }}</div>
              <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '7px' }">
                <Tag v-for="l in it.langs" :key="l" :clickable="false">{{ String(l).toUpperCase() }}</Tag>
                <Tag v-for="d in (it.designs || [])" :key="d" :clickable="false">{{ d }}</Tag>
              </div>

              <!-- per-item rendered path input when readying -->
              <input v-if="readyMode" v-model="renderedPaths[i]" type="text" placeholder="rendered file path (relative to exports)"
                class="mono"
                :style="{ width: '100%', marginTop: '8px', padding: '8px 10px', borderRadius: '8px', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', color: 'var(--text-1)', fontSize: '12px', outline: 'none' }" />
            </div>
          </div>

          <!-- rendered variants (when ready) -->
          <template v-if="(detail.rendered_clips || []).length">
            <SectionLabel>Rendered files</SectionLabel>
            <div :style="{ marginTop: '6px', marginBottom: '8px' }">
              <div v-for="(rc, i) in detail.rendered_clips" :key="i" :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: '1px solid var(--divider)' }">
                <div :style="{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }">
                  <Icon name="film" :size="16" :style="{ color: 'var(--text-3)' }" />
                  <span class="mono" :style="{ fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ rc.filename || rc.url }}</span>
                </div>
                <a :href="rc.url" :style="{ textDecoration: 'none' }"><Button size="sm" variant="ghost" icon="download">Get</Button></a>
              </div>
            </div>
          </template>
        </template>
      </div>

      <template #footer>
        <div v-if="detail" :style="{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }">
          <!-- EDIT MODE footer -->
          <template v-if="editMode">
            <div :style="{ display: 'flex', gap: '10px' }">
              <Button :disabled="busy" variant="secondary" icon="arrowleft" @click="cancelEdit">Cancel</Button>
              <Button :disabled="busy || !canSave" icon="check" full @click="saveEdit">Save changes</Button>
            </div>
          </template>

          <!-- DELETE confirmation footer -->
          <template v-else-if="confirmDelete">
            <div :style="{ fontSize: '13px', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }">
              <Icon name="alert" :size="15" /> Delete this order permanently? This can't be undone.
            </div>
            <div :style="{ display: 'flex', gap: '10px' }">
              <Button :disabled="busy" variant="secondary" @click="confirmDelete = false">Cancel</Button>
              <Button :disabled="busy" variant="danger" icon="trash" full @click="deleteOrder">Delete order</Button>
            </div>
          </template>

          <!-- NORMAL footer -->
          <template v-else>
            <div :style="{ display: 'flex', gap: '10px' }">
              <template v-if="detail.status === 'pending'">
                <Button :disabled="busy" icon="wand" full @click="setStatus('processing')">Mark processing</Button>
              </template>
              <template v-else-if="detail.status === 'processing'">
                <Button v-if="!readyMode" :disabled="busy" variant="secondary" icon="arrowleft" @click="setStatus('pending')">Back</Button>
                <Button v-if="!readyMode" :disabled="busy" icon="check_circle" full @click="startReady">Mark ready…</Button>
                <Button v-else :disabled="busy" icon="check" full @click="confirmReady">Confirm ready</Button>
              </template>
              <template v-else-if="detail.status === 'rejected'">
                <Button :disabled="busy" icon="refresh" full @click="setStatus('pending')">Reopen</Button>
              </template>
              <template v-else>
                <Button :disabled="busy" variant="ghost" icon="refresh" full @click="setStatus('processing')">Reopen</Button>
              </template>
            </div>
            <!-- manage actions -->
            <div v-if="!readyMode" :style="{ display: 'flex', gap: '8px' }">
              <Button v-if="canEdit" size="sm" variant="secondary" icon="edit" @click="startEdit">Edit</Button>
              <Button v-if="canReject" :disabled="busy" size="sm" variant="secondary" icon="x" @click="setStatus('rejected')">Reject</Button>
              <Button size="sm" variant="danger" icon="trash" @click="confirmDelete = true">Delete</Button>
            </div>
          </template>
        </div>
      </template>
    </Drawer>
  </AppLayout>
</template>
