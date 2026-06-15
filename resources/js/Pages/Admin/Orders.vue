<script setup>
import { ref, computed, onMounted } from 'vue';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Tag from '../../Components/Tag.vue';
import StatusPill from '../../Components/StatusPill.vue';
import Drawer from '../../Components/Drawer.vue';
import SectionLabel from '../../Components/SectionLabel.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';

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

const STATUSES = ['pending', 'processing', 'ready'];

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

const counts = computed(() => Object.fromEntries(STATUSES.map((s) => [s, orders.value.filter((o) => o.status === s).length])));
const tabs = computed(() => ['all', ...STATUSES]);
const filtered = computed(() => orders.value.filter((o) => tab.value === 'all' || o.status === tab.value));
const detail = computed(() => orders.value.find((o) => o.id === detailId.value) || null);

const timeline = ['pending', 'processing', 'ready'];
const curIdx = computed(() => (detail.value ? timeline.indexOf(detail.value.status) : -1));

const shortId = (id) => String(id || '').slice(0, 8);
const fmtDate = (unix) => (unix ? new Date(unix * 1000).toLocaleString() : '—');
const TAB_LABEL = { all: 'All', pending: 'Pending', processing: 'Processing', ready: 'Ready' };

function openDetail(o) {
  detailId.value = o.id;
  readyMode.value = false;
}
function closeDetail() {
  detailId.value = null;
  readyMode.value = false;
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

        <!-- timeline -->
        <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', margin: '22px 0' }">
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

        <div v-if="detail.note" :style="{ padding: '12px 14px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '13.5px', color: 'var(--text-2)', marginBottom: '18px' }">
          <span :style="{ color: 'var(--text-3)' }">Note: </span>{{ detail.note }}
        </div>

        <SectionLabel>Items ({{ (detail.items || []).length }})</SectionLabel>
        <div :style="{ marginTop: '8px', marginBottom: '20px' }">
          <div v-for="(it, i) in detail.items" :key="i" :style="{ padding: '12px 0', borderTop: '1px solid var(--divider)' }">
            <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }">
              <Icon name="film" :size="15" :style="{ color: 'var(--text-3)' }" /> {{ it.clipName }}
              <span v-if="it.requiresDisclaimer" :style="{ fontSize: '11px', color: 'var(--warning)', fontWeight: 600 }">· disclaimer</span>
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
      </div>

      <template #footer>
        <template v-if="detail">
          <Button v-if="detail.status === 'pending'" :disabled="busy" icon="wand" full @click="setStatus('processing')">Mark processing</Button>

          <template v-else-if="detail.status === 'processing'">
            <Button v-if="!readyMode" :disabled="busy" variant="secondary" icon="arrowleft" @click="setStatus('pending')">Back</Button>
            <Button v-if="!readyMode" :disabled="busy" icon="check_circle" full @click="startReady">Mark ready…</Button>
            <Button v-else :disabled="busy" icon="check" full @click="confirmReady">Confirm ready</Button>
          </template>

          <template v-else>
            <Button :disabled="busy" variant="secondary" icon="download" @click="exportItemsCsv">CSV</Button>
            <Button :disabled="busy" variant="ghost" icon="refresh" full @click="setStatus('processing')">Reopen</Button>
          </template>
        </template>
      </template>
    </Drawer>
  </AppLayout>
</template>
