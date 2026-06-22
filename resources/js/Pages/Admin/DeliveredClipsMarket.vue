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
import EmptyState from '../../Components/EmptyState.vue';
import Icon from '../../Components/Icon.vue';
import { api, upload } from '../../lib/api.js';

const props = defineProps({
  code: { type: String, required: true },
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

const FORMATS = ['16:9', '1:1', '9:16', '4:5'];

const market = ref(null);
const clips = ref([]);
const orders = ref([]);
const loading = ref(true);
const error = ref('');
const toast = ref('');

// upload form
const nf = ref({ name: '', format: '', order_id: '' });
const file = ref(null);
const fileInput = ref(null);
const uploading = ref(false);

// inline rename
const editingId = ref(null);
const editName = ref('');

function flash(msg) { toast.value = msg; setTimeout(() => { if (toast.value === msg) toast.value = ''; }, 3000); }

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

const formatOptions = computed(() => [{ value: '', label: '— format —' }, ...FORMATS.map((f) => ({ value: f, label: f }))]);
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

function onFile(e) { file.value = e.target.files?.[0] || null; if (!nf.value.name && file.value) nf.value.name = file.value.name.replace(/\.[^.]+$/, ''); }

async function uploadClip() {
  if (!market.value) return;
  if (!nf.value.name.trim()) { flash('Enter a name.'); return; }
  if (!file.value) { flash('Choose a video file.'); return; }
  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append('market_id', market.value.id);
    fd.append('name', nf.value.name.trim());
    fd.append('file', file.value);
    if (nf.value.format) fd.append('format', nf.value.format);
    if (nf.value.order_id) fd.append('order_id', nf.value.order_id);
    const clip = await upload('/api/delivered-clips', fd);
    clips.value.unshift(clip);
    nf.value = { name: '', format: '', order_id: '' };
    file.value = null;
    if (fileInput.value) fileInput.value.value = '';
    flash(clip.has_thumbnail ? 'Uploaded.' : 'Uploaded (no thumbnail generated).');
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

async function changeFormat(c, format) {
  try { const updated = await api.put('/api/delivered-clips/' + c.id, { format: format || null }); Object.assign(c, updated); }
  catch (e) { flash(e.message || 'Could not update format.'); }
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
    flash('Deleted.');
  } catch (e) { flash(e.message || 'Delete failed.'); }
}

const thumbSrc = (c) => (c.thumbnail_url ? c.thumbnail_url + (c._bust ? '?t=' + c._bust : '') : null);
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

        <!-- Upload -->
        <Card>
          <div :style="{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }">Upload a clip</div>
          <div :style="{ display: 'grid', gridTemplateColumns: '1.4fr 0.7fr 1fr', gap: '12px', alignItems: 'end' }">
            <Field label="Name"><Input v-model="nf.name" placeholder="e.g. Q3 Hero 16:9" /></Field>
            <Field label="Format"><Select v-model="nf.format" :options="formatOptions" /></Field>
            <Field label="Linked order (optional)"><Select v-model="nf.order_id" :options="orderOptions" /></Field>
          </div>
          <div :style="{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }">
            <input ref="fileInput" type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" @change="onFile"
              :style="{ fontSize: '13px', color: 'var(--text-2)' }" />
            <Button icon="upload" :disabled="uploading || !file || !nf.name.trim()" @click="uploadClip">{{ uploading ? 'Uploading…' : 'Upload clip' }}</Button>
          </div>
          <p :style="{ color: 'var(--text-3)', fontSize: '12px', margin: '10px 0 0' }">MP4, MOV or WEBM · up to 500 MB. A poster frame is generated automatically when possible.</p>
        </Card>

        <!-- Grid -->
        <Card v-if="!clips.length"><EmptyState icon="inbox" title="No delivered clips yet" sub="Upload the final rendered creative for this market above." /></Card>
        <div v-else :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--gap)' }">
          <Card v-for="c in clips" :key="c.id">
            <div :style="{ aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', marginBottom: '12px' }">
              <img v-if="thumbSrc(c)" :src="thumbSrc(c)" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
              <Icon v-else name="film" :size="22" :style="{ color: 'var(--text-3)' }" />
            </div>

            <div v-if="editingId === c.id">
              <Input v-model="editName" autofocus @keydown="(e) => e.key === 'Enter' && saveRename(c)" />
              <div :style="{ display: 'flex', gap: '8px', marginTop: '8px' }">
                <Button size="sm" @click="saveRename(c)">Save</Button>
                <Button size="sm" variant="ghost" @click="editingId = null">Cancel</Button>
              </div>
            </div>
            <template v-else>
              <div :style="{ fontSize: '14.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ c.name }}</div>
              <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', margin: '8px 0' }">
                <Tag :clickable="false" v-if="c.format">{{ c.format }}</Tag>
                <Tag :clickable="false">{{ fmtSize(c.file_size) }}</Tag>
                <Tag :clickable="false" v-if="c.order_short">order {{ c.order_short }}</Tag>
              </div>
              <div :style="{ fontSize: '12px', color: 'var(--text-3)' }">{{ fmtDate(c.created_at) }}{{ c.uploaded_by ? ' · ' + c.uploaded_by : '' }}</div>
              <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }">
                <a :href="c.download_url" :style="{ textDecoration: 'none' }"><Button size="sm" variant="secondary" icon="download">Download</Button></a>
                <Button size="sm" variant="ghost" icon="edit" @click="startRename(c)">Rename</Button>
                <Button size="sm" variant="ghost" icon="sparkles" @click="pickThumb(c)">Thumbnail</Button>
                <Button size="sm" variant="danger" icon="trash" @click="removeClip(c)">Delete</Button>
              </div>
            </template>
          </Card>
        </div>
      </template>
    </div>

    <div v-if="toast" :style="{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-pop)', fontSize: '14px', fontWeight: 600 }">
      <Icon name="check_circle" :size="18" :style="{ color: 'var(--accent)' }" /> {{ toast }}
    </div>
  </AppLayout>
</template>
