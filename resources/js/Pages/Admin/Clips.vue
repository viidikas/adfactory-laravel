<script setup>
import { ref, computed, onMounted } from 'vue';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Input from '../../Components/Input.vue';
import Select from '../../Components/Select.vue';
import Segmented from '../../Components/Segmented.vue';
import Tag from '../../Components/Tag.vue';
import Thumb from '../../Components/Thumb.vue';
import Drawer from '../../Components/Drawer.vue';
import EmptyState from '../../Components/EmptyState.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';

defineProps({
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

const clips = ref([]);
const assignments = ref({}); // clipId -> copyKey (slate_assignments)
const meta = ref({ active_project: null });
const loading = ref(true);
const error = ref('');
const scanning = ref(false);
const savingCopy = ref(false);
const toast = ref('');

const q = ref('');
const cat = ref('All');
const status = ref('');
const view = ref('grid');
const preview = ref(null);

function flash(msg) {
  toast.value = msg;
  setTimeout(() => { if (toast.value === msg) toast.value = ''; }, 3000);
}

async function load() {
  const [c, cfg, m] = await Promise.all([
    api.get('/api/clips'),
    api.get('/api/config'),
    api.get('/api/clips-meta'),
  ]);
  clips.value = Array.isArray(c) ? c : [];
  assignments.value = cfg?.slate_assignments && typeof cfg.slate_assignments === 'object' ? { ...cfg.slate_assignments } : {};
  meta.value = m || meta.value;
}

onMounted(async () => {
  try { await load(); } catch (e) { error.value = e.message || 'Failed to load clips.'; }
  finally { loading.value = false; }
});

const thumbUrl = (c) => '/api/thumb?path=' + encodeURIComponent(c.relativePath || '');
const videoUrl = (c) => '/api/video?path=' + encodeURIComponent(c.relativePath || '');
const withPoster = (c) => ({ ...c, poster: thumbUrl(c), aspect: undefined, duration: null });

const categories = computed(() => {
  const set = new Set();
  clips.value.forEach((c) => { if (c.category) set.add(c.category); });
  return [...set].sort();
});

function statusOf(c) {
  if (!c.slate) return 'unmatched';
  if (assignments.value[c.id]) return 'matched';
  return 'partial';
}
const STATUS_META = {
  matched: { label: 'Matched', c: 'var(--success)', b: 'var(--accent-soft)' },
  partial: { label: 'No copy', c: 'var(--warning)', b: 'rgba(246,198,66,0.15)' },
  unmatched: { label: 'Unmatched', c: 'var(--danger)', b: 'var(--danger-soft)' },
};

const counts = computed(() => {
  const r = { matched: 0, partial: 0, unmatched: 0 };
  clips.value.forEach((c) => { r[statusOf(c)]++; });
  return r;
});

const filtered = computed(() => clips.value.filter((c) => {
  if (cat.value !== 'All' && c.category !== cat.value) return false;
  if (status.value && statusOf(c) !== status.value) return false;
  if (q.value) {
    const s = q.value.toLowerCase();
    if (!(c.name || '').toLowerCase().includes(s) && !(c.actor || '').toLowerCase().includes(s) && !(c.slate || '').toLowerCase().includes(s)) return false;
  }
  return true;
}));

const statusOptions = [
  { value: '', label: 'All clips' },
  { value: 'matched', label: 'Matched' },
  { value: 'partial', label: 'No copy' },
  { value: 'unmatched', label: 'Unmatched' },
];
const viewOptions = [{ value: 'grid', icon: 'grid' }, { value: 'list', icon: 'sliders' }];

// Copy options for a clip's slate — normalized from slate_data copy entries
// (objects with a key + translations, or bare strings).
function copyOptions(c) {
  const opts = [{ value: '', label: '— no copy —' }];
  (c.copy || []).forEach((o) => {
    if (o == null) return;
    if (typeof o === 'string') { opts.push({ value: o, label: o }); return; }
    const value = o.key ?? o.copy_key ?? o.copyKey ?? o.en ?? '';
    const label = (o.key ?? o.copy_key ?? o.copyKey ?? '') + (o.en ? ` · ${o.en}` : '') || value;
    if (value) opts.push({ value, label });
  });
  return opts;
}

async function assignCopy(c, key) {
  const next = { ...assignments.value };
  if (key) next[c.id] = key; else delete next[c.id];
  assignments.value = next;
  savingCopy.value = true;
  try {
    await api.post('/api/config', { slate_assignments: next });
    flash(key ? 'Copy assigned.' : 'Copy cleared.');
  } catch (e) {
    flash(e.message || 'Could not save copy assignment.');
  } finally {
    savingCopy.value = false;
  }
}

async function scan() {
  const pid = meta.value.active_project?.id;
  if (!pid) { flash('No active project — activate one in Projects first.'); return; }
  scanning.value = true;
  try {
    const res = await api.post('/api/projects/' + pid + '/scan');
    await load();
    flash(`Scanned ${res?.count ?? 0} clips.`);
  } catch (e) { flash(e.message || 'Scan failed.'); }
  finally { scanning.value = false; }
}

function clearFilters() { q.value = ''; cat.value = 'All'; status.value = ''; }
</script>

<template>
  <AppLayout active="clips" workspace="admin" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }">
        <div>
          <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Clip library</h1>
          <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">
            {{ filtered.length }} of {{ clips.length }} clips<span v-if="meta.active_project"> · {{ meta.active_project.name }}</span>
          </p>
        </div>
        <Button variant="secondary" icon="foldersearch" :disabled="scanning" @click="scan">{{ scanning ? 'Scanning…' : 'Scan / rescan' }}</Button>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>

      <!-- status summary -->
      <div :style="{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-2)' }">
        <span :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px' }"><span :style="{ width: '8px', height: '8px', borderRadius: '999px', background: 'var(--success)' }" />{{ counts.matched }} matched</span>
        <span :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px' }"><span :style="{ width: '8px', height: '8px', borderRadius: '999px', background: 'var(--warning)' }" />{{ counts.partial }} no copy</span>
        <span :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px' }"><span :style="{ width: '8px', height: '8px', borderRadius: '999px', background: 'var(--danger)' }" />{{ counts.unmatched }} unmatched</span>
      </div>

      <!-- toolbar -->
      <div :style="{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }">
        <div :style="{ flex: '1 1 280px', minWidth: '220px' }"><Input v-model="q" placeholder="Search name, actor, slate…" icon="search" /></div>
        <Select v-model="status" :options="statusOptions" :style="{ width: '160px' }" />
        <Segmented v-model="view" :options="viewOptions" size="sm" />
      </div>

      <!-- category chips -->
      <div v-if="categories.length" :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap' }">
        <Tag v-for="c in ['All', ...categories]" :key="c" :active="cat === c" @click="cat = c">{{ c }}</Tag>
      </div>

      <div v-if="loading" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>

      <Card v-else-if="!filtered.length">
        <EmptyState icon="film" title="No clips match" sub="Try clearing filters, or scan the active project.">
          <template #action><Button variant="soft" @click="clearFilters">Clear filters</Button></template>
        </EmptyState>
      </Card>

      <!-- grid -->
      <div v-else-if="view === 'grid'" :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))', gap: 'var(--gap)' }">
        <div v-for="c in filtered" :key="c.id">
          <Thumb :clip="withPoster(c)" @click="preview = c" />
          <div :style="{ padding: '10px 2px 0' }">
            <div :style="{ fontSize: '13.5px', fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ c.nameNoExt || c.name }}</div>
            <div :style="{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '6px', fontSize: '11.5px' }">
              <span :style="{ padding: '2px 7px', borderRadius: '999px', fontWeight: 600, color: STATUS_META[statusOf(c)].c, background: STATUS_META[statusOf(c)].b }">{{ STATUS_META[statusOf(c)].label }}</span>
              <span :style="{ color: 'var(--text-3)' }">{{ c.slate || '—' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- list -->
      <Card v-else :pad="false">
        <div
          v-for="(c, i) in filtered" :key="c.id" class="row-hover" @click="preview = c"
          :style="{ display: 'grid', gridTemplateColumns: '46px 1fr 130px 120px', gap: '14px', alignItems: 'center', padding: '10px var(--pad-card)', borderTop: i ? '1px solid var(--divider)' : 'none', cursor: 'pointer' }"
        >
          <div :style="{ width: '46px' }"><Thumb :clip="withPoster(c)" :show-play="false" /></div>
          <div :style="{ minWidth: 0 }">
            <div :style="{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ c.nameNoExt || c.name }}</div>
            <div :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }">{{ c.slate || '—' }} · {{ c.category || '—' }} · {{ c.actor || '—' }}</div>
          </div>
          <div><span :style="{ fontSize: '11.5px', padding: '2px 8px', borderRadius: '999px', fontWeight: 600, color: STATUS_META[statusOf(c)].c, background: STATUS_META[statusOf(c)].b }">{{ STATUS_META[statusOf(c)].label }}</span></div>
          <div :style="{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'right' }">{{ assignments[c.id] || 'no copy' }}</div>
        </div>
      </Card>
    </div>

    <!-- preview drawer -->
    <Drawer :open="!!preview" :title="preview ? (preview.slate || 'Clip') : ''" :width="520" @close="preview = null">
      <div v-if="preview">
        <video :src="videoUrl(preview)" controls preload="metadata" :poster="thumbUrl(preview)"
          :style="{ width: '100%', borderRadius: '12px', background: '#000', maxHeight: '360px' }" />
        <h2 :style="{ fontSize: '19px', fontWeight: 800, letterSpacing: '-0.02em', margin: '16px 0 6px' }">{{ preview.nameNoExt || preview.name }}</h2>
        <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }">
          <Tag :clickable="false">{{ preview.category || '—' }}</Tag>
          <Tag :clickable="false">{{ preview.slate || '—' }}</Tag>
          <Tag v-if="preview.actor" :clickable="false">{{ preview.actor }}</Tag>
          <span :style="{ fontSize: '11.5px', padding: '3px 9px', borderRadius: '999px', fontWeight: 600, color: STATUS_META[statusOf(preview)].c, background: STATUS_META[statusOf(preview)].b }">{{ STATUS_META[statusOf(preview)].label }}</span>
        </div>

        <p v-if="preview.description" :style="{ fontSize: '13.5px', color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 16px' }">{{ preview.description }}</p>

        <div :style="{ marginBottom: '6px', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }">Assigned copy</div>
        <Select :model-value="assignments[preview.id] || ''" :options="copyOptions(preview)" @update:model-value="assignCopy(preview, $event)" />
        <div :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px' }">Maps this clip to a copy line for the Templater export.</div>

        <div class="mono" :style="{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '18px', wordBreak: 'break-all' }">{{ preview.relativePath }}</div>
      </div>
    </Drawer>

    <div v-if="toast" :style="{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-pop)', fontSize: '14px', fontWeight: 600 }">
      <Icon name="check_circle" :size="18" :style="{ color: 'var(--accent)' }" /> {{ toast }}
    </div>
  </AppLayout>
</template>
