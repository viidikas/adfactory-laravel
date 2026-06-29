<script setup>
import { ref, computed, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Field from '../../Components/Field.vue';
import Select from '../../Components/Select.vue';
import Icon from '../../Components/Icon.vue';
import DeliveredClipsBrowser from '../../Components/DeliveredClipsBrowser.vue';
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

// ── management (emitted by the browser's player drawer) ──────────
async function onRename({ clip, name }) {
  try { const updated = await api.put('/api/delivered-clips/' + clip.id, { name }); Object.assign(clip, updated); flash('Renamed.'); }
  catch (e) { flash(e.message || 'Rename failed.'); }
}
function onThumb(clip) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      const fd = new FormData();
      fd.append('image', f);
      const updated = await upload('/api/delivered-clips/' + clip.id + '/thumbnail', fd);
      Object.assign(clip, updated);
      // Bust the cached <img> (the URL is stable across replacements).
      if (clip.thumbnail_url) clip.thumbnail_url = clip.thumbnail_url.split('?')[0] + '?t=' + Date.now();
      flash('Thumbnail updated.');
    } catch (e) { flash(e.message || 'Thumbnail upload failed.'); }
  };
  input.click();
}
async function onDelete(clip) {
  if (!confirm(`Delete "${clip.name}"? This removes the file and its thumbnail from disk.`)) return;
  try {
    await api.del('/api/delivered-clips/' + clip.id);
    clips.value = clips.value.filter((x) => x.id !== clip.id);
    flash('Deleted.');
  } catch (e) { flash(e.message || 'Delete failed.'); }
}
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

        <DeliveredClipsBrowser :clips="clips" manage @rename="onRename" @replace-thumb="onThumb" @delete="onDelete" />
      </template>
    </div>

    <div v-if="toast" :style="{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-pop)', fontSize: '14px', fontWeight: 600 }">
      <Icon name="check_circle" :size="18" :style="{ color: 'var(--accent)' }" /> {{ toast }}
    </div>
  </AppLayout>
</template>
