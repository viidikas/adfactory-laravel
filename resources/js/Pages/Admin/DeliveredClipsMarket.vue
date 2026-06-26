<script setup>
import { ref, computed, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Input from '../../Components/Input.vue';
import Field from '../../Components/Field.vue';
import Select from '../../Components/Select.vue';
import Tag from '../../Components/Tag.vue';
import Drawer from '../../Components/Drawer.vue';
import SectionLabel from '../../Components/SectionLabel.vue';
import EmptyState from '../../Components/EmptyState.vue';
import Icon from '../../Components/Icon.vue';
import { api, upload } from '../../lib/api.js';

const props = defineProps({
  code: { type: String, required: true },
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

const market = ref(null);
const clips = ref([]);
const orders = ref([]);
const loading = ref(true);
const error = ref('');
const toast = ref('');

// batch upload
const orderId = ref('');
const files = ref([]);
const fileInput = ref(null);
const uploading = ref(false);

// inline rename
const editingId = ref(null);
const editName = ref('');

// player drawer
const playing = ref(null);

function flash(msg) { toast.value = msg; setTimeout(() => { if (toast.value === msg) toast.value = ''; }, 3500); }

async function resolveAndLoad() {
  const markets = await api.get('/api/markets');
  const m = (markets || []).find((x) => String(x.code).toLowerCase() === String(props.code).toLowerCase());
  if (!m) throw new Error(`Market "${props.code}" not found.`);
  market.value = m;
  const [cl, ord] = await Promise.all([
    api.get('/api/delivered-clips?market_id=' + m.id),
    api.get('/api/orders').catch(() => []),
  ]);
  clips.value = Array.isArray(cl) ? cl : [];
  orders.value = (Array.isArray(ord) ? ord : []).filter((o) => o.market_id === m.id);
}

onMounted(async () => {
  try { await resolveAndLoad(); }
  catch (e) { error.value = e.message || 'Failed to load.'; }
  finally { loading.value = false; }
});

const orderOptions = computed(() => [
  { value: '', label: '— no order —' },
  ...orders.value.map((o) => ({ value: String(o.id), label: `${String(o.id).slice(0, 8)} · ${o.user_name || 'Order'}` })),
]);

const fmtSize = (b) => {
  if (!b) return '—';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
};
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');

function onFiles(e) { files.value = Array.from(e.target.files || []); }
function clearFiles() { files.value = []; if (fileInput.value) fileInput.value.value = ''; }

async function uploadBatch() {
  if (!market.value || !files.value.length) return;
  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append('market_id', market.value.id);
    if (orderId.value) fd.append('order_id', orderId.value);
    files.value.forEach((f) => fd.append('files[]', f));
    const res = await upload('/api/delivered-clips/batch', fd);
    const created = res?.clips || [];
    clips.value = [...created, ...clips.value];
    clearFiles();
    orderId.value = '';
    const failed = res?.errors?.length || 0;
    flash(`Uploaded ${created.length} clip${created.length === 1 ? '' : 's'}` + (failed ? ` · ${failed} failed` : '. Format & metadata read from each file.'));
  } catch (e) {
    flash(e.message || 'Upload failed.');
  } finally {
    uploading.value = false;
  }
}

function startRename(c) { editingId.value = c.id; editName.value = c.name; }
async function saveRename(c) {
  const name = editName.value.trim();
  editingId.value = null;
  if (!name || name === c.name) return;
  try {
    const updated = await api.put('/api/delivered-clips/' + c.id, { name });
    Object.assign(c, updated);
  } catch (e) { flash(e.message || 'Rename failed.'); }
}

function pickThumb(c) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      const fd = new FormData();
      fd.append('image', f);
      const updated = await upload('/api/delivered-clips/' + c.id + '/thumbnail', fd);
      Object.assign(c, updated, { _bust: Date.now() });
      flash('Thumbnail updated.');
    } catch (e) { flash(e.message || 'Thumbnail upload failed.'); }
  };
  input.click();
}

async function removeClip(c) {
  if (!confirm(`Delete "${c.name}"? This removes the file and its thumbnail from disk.`)) return;
  try {
    await api.del('/api/delivered-clips/' + c.id);
    clips.value = clips.value.filter((x) => x.id !== c.id);
    if (playing.value?.id === c.id) playing.value = null;
    flash('Deleted.');
  } catch (e) { flash(e.message || 'Delete failed.'); }
}

const thumbSrc = (c) => (c.thumbnail_url ? c.thumbnail_url + (c._bust ? '?t=' + c._bust : '') : null);
// Sub-line of parsed metadata, e.g. "PU8 · Kemal · design1".
const metaLine = (c) => [c.slate, c.actor, c.design, c.lang].filter(Boolean).join(' · ');
</script>

<template>
  <AppLayout active="delivered" workspace="admin" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <button @click="router.visit('/delivered')" :style="{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '13.5px', fontFamily: 'inherit' }">
        <Icon name="arrowleft" :size="16" /> Delivered clips
      </button>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>
      <div v-else-if="loading" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>

      <template v-else-if="market">
        <div>
          <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">{{ market.code }} <span :style="{ color: 'var(--text-3)', fontWeight: 400 }">· {{ market.name }}</span></h1>
          <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">{{ clips.length }} delivered clip{{ clips.length === 1 ? '' : 's' }} · {{ market.brand }}</p>
        </div>

        <!-- Batch upload -->
        <Card>
          <div :style="{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }">Upload clips</div>
          <p :style="{ color: 'var(--text-3)', fontSize: '12.5px', margin: '0 0 14px' }">
            Drop in as many rendered videos as you like — format, actor, copy, design &amp; language are read from each file automatically.
          </p>
          <div :style="{ display: 'flex', gap: '12px', alignItems: 'end', flexWrap: 'wrap' }">
            <div :style="{ flex: '1 1 260px', minWidth: '220px' }">
              <Field label="Linked order (optional, applies to the whole batch)"><Select v-model="orderId" :options="orderOptions" /></Field>
            </div>
            <input ref="fileInput" type="file" multiple accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" @change="onFiles"
              :style="{ fontSize: '13px', color: 'var(--text-2)', flex: '1 1 260px' }" />
          </div>

          <div v-if="files.length" :style="{ marginTop: '12px', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '10px', fontSize: '12.5px', color: 'var(--text-2)' }">
            <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }">
              <span :style="{ fontWeight: 600 }">{{ files.length }} file{{ files.length === 1 ? '' : 's' }} selected</span>
              <button @click="clearFiles" :style="{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }">Clear</button>
            </div>
            <div :style="{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }">
              <div v-for="(f, i) in files" :key="i" :style="{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ f.name }}</div>
            </div>
          </div>

          <div :style="{ marginTop: '14px' }">
            <Button icon="upload" :disabled="uploading || !files.length" @click="uploadBatch">{{ uploading ? 'Uploading…' : (files.length ? `Upload ${files.length} clip${files.length === 1 ? '' : 's'}` : 'Upload clips') }}</Button>
          </div>
          <p :style="{ color: 'var(--text-3)', fontSize: '12px', margin: '10px 0 0' }">MP4, MOV or WEBM · up to 500 MB each. Poster frames are generated automatically when possible.</p>
        </Card>

        <!-- Grid -->
        <Card v-if="!clips.length"><EmptyState icon="inbox" title="No delivered clips yet" sub="Upload the final rendered creative for this market above." /></Card>
        <div v-else :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--gap)' }">
          <Card v-for="c in clips" :key="c.id">
            <div @click="playing = c" :style="{ position: 'relative', aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', marginBottom: '12px', cursor: 'pointer' }">
              <img v-if="thumbSrc(c)" :src="thumbSrc(c)" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
              <Icon v-else name="film" :size="22" :style="{ color: 'var(--text-3)' }" />
              <div :style="{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.18)' }">
                <div :style="{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center' }"><Icon name="play" :size="20" :style="{ color: '#fff' }" /></div>
              </div>
            </div>

            <div v-if="editingId === c.id">
              <Input v-model="editName" autofocus @keydown="(e) => e.key === 'Enter' && saveRename(c)" />
              <div :style="{ display: 'flex', gap: '8px', marginTop: '8px' }">
                <Button size="sm" @click="saveRename(c)">Save</Button>
                <Button size="sm" variant="ghost" @click="editingId = null">Cancel</Button>
              </div>
            </div>
            <template v-else>
              <div :style="{ fontSize: '14.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="c.name">{{ c.name }}</div>
              <div v-if="metaLine(c)" :style="{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ metaLine(c) }}</div>
              <div v-if="c.copy_full || c.copy" :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="c.copy_full || c.copy">“{{ c.copy_full || c.copy }}”</div>
              <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', margin: '8px 0' }">
                <Tag :clickable="false" v-if="c.format">{{ c.format }}</Tag>
                <Tag :clickable="false">{{ fmtSize(c.file_size) }}</Tag>
                <Tag :clickable="false" v-if="c.order_short">order {{ c.order_short }}</Tag>
              </div>
              <div :style="{ fontSize: '12px', color: 'var(--text-3)' }">{{ fmtDate(c.created_at) }}{{ c.uploaded_by ? ' · ' + c.uploaded_by : '' }}</div>
              <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }">
                <Button size="sm" variant="secondary" icon="play" @click="playing = c">Play</Button>
                <a :href="c.download_url" :style="{ textDecoration: 'none' }"><Button size="sm" variant="ghost" icon="download">Download</Button></a>
                <Button size="sm" variant="ghost" icon="edit" @click="startRename(c)">Rename</Button>
                <Button size="sm" variant="ghost" icon="sparkles" @click="pickThumb(c)">Thumbnail</Button>
                <Button size="sm" variant="danger" icon="trash" @click="removeClip(c)">Delete</Button>
              </div>
            </template>
          </Card>
        </div>
      </template>
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
          <span :style="{ color: 'var(--text-3)' }">Brand</span><span>{{ playing.brand || market?.brand || '—' }}</span>
          <span :style="{ color: 'var(--text-3)' }">Copy</span><span>{{ playing.copy_full || playing.copy || '—' }}</span>
          <span :style="{ color: 'var(--text-3)' }">Size</span><span>{{ fmtSize(playing.file_size) }}</span>
          <span :style="{ color: 'var(--text-3)' }">Order</span><span>{{ playing.order_short || '—' }}</span>
          <span :style="{ color: 'var(--text-3)' }">Uploaded</span><span>{{ fmtDate(playing.created_at) }}{{ playing.uploaded_by ? ' · ' + playing.uploaded_by : '' }}</span>
        </div>
      </div>
      <template #footer>
        <a v-if="playing" :href="playing.download_url" :style="{ textDecoration: 'none' }"><Button full icon="download">Download</Button></a>
      </template>
    </Drawer>

    <div v-if="toast" :style="{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-pop)', fontSize: '14px', fontWeight: 600 }">
      <Icon name="check_circle" :size="18" :style="{ color: 'var(--accent)' }" /> {{ toast }}
    </div>
  </AppLayout>
</template>
