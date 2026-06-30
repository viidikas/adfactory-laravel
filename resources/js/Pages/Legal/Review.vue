<script setup>
import { ref, computed, onMounted } from 'vue';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Tag from '../../Components/Tag.vue';
import IconButton from '../../Components/IconButton.vue';
import SectionLabel from '../../Components/SectionLabel.vue';
import StatusPill from '../../Components/StatusPill.vue';
import EmptyState from '../../Components/EmptyState.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';

defineProps({ theme: { type: String, default: null }, density: { type: String, default: null } });

const clips = ref([]);
const loading = ref(true);
const error = ref('');
const toast = ref('');
const tab = ref('queue');

// review drawer
const reviewing = ref(null);
const declineMode = ref(false);
const declineReason = ref('');
const busy = ref(false);

function flash(msg) { toast.value = msg; setTimeout(() => { if (toast.value === msg) toast.value = ''; }, 3500); }

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await api.get('/api/legal/delivered-clips');
    clips.value = Array.isArray(data) ? data : [];
  } catch (e) {
    error.value = e.message || 'Failed to load clips.';
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const fmtSize = (b) => (!b ? '' : b < 1024 * 1024 ? (b / 1024).toFixed(0) + ' KB' : (b / 1024 / 1024).toFixed(1) + ' MB');
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');
const metaLine = (c) => [c.slate, c.actor, c.design, c.lang].filter(Boolean).join(' · ');

const pending = computed(() => clips.value.filter((c) => c.review_status === 'pending'));
const reviewed = computed(() => clips.value.filter((c) => c.review_status !== 'pending'));

// Pending queue grouped by market, oldest first (FIFO review order).
const queueByMarket = computed(() => {
  const map = new Map();
  for (const c of pending.value) {
    const k = c.market?.code || '—';
    if (!map.has(k)) map.set(k, { market: c.market, clips: [] });
    map.get(k).clips.push(c);
  }
  for (const g of map.values()) g.clips.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  return [...map.values()].sort((a, b) => (a.market?.code || '').localeCompare(b.market?.code || ''));
});

const reviewedSorted = computed(() => reviewed.value.slice().sort((a, b) => new Date(b.reviewed_at || 0) - new Date(a.reviewed_at || 0)));

function openReview(c) { reviewing.value = c; declineMode.value = false; declineReason.value = ''; }

function applyUpdate(updated) {
  const i = clips.value.findIndex((c) => c.id === updated.id);
  if (i !== -1) clips.value[i] = updated;
}

async function approve(c) {
  busy.value = true;
  try {
    const updated = await api.post(`/api/legal/delivered-clips/${c.id}/approve`, {});
    applyUpdate(updated);
    reviewing.value = null;
    flash('Approved.');
  } catch (e) { flash(e.message || 'Approve failed.'); }
  finally { busy.value = false; }
}

async function decline(c) {
  const reason = declineReason.value.trim();
  if (!reason) { flash('A reason is required to decline.'); return; }
  busy.value = true;
  try {
    const updated = await api.post(`/api/legal/delivered-clips/${c.id}/decline`, { reason });
    applyUpdate(updated);
    reviewing.value = null;
    flash('Declined.');
  } catch (e) { flash(e.message || 'Decline failed.'); }
  finally { busy.value = false; }
}

</script>

<template>
  <AppLayout active="review" workspace="legal" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div>
        <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Clip review</h1>
        <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">Watch each delivered clip and approve or decline it. Only approved clips become downloadable.</p>
      </div>

      <div :style="{ display: 'flex', gap: '8px' }">
        <Tag :active="tab === 'queue'" @click="tab = 'queue'">Queue ({{ pending.length }})</Tag>
        <Tag :active="tab === 'reviewed'" @click="tab = 'reviewed'">Reviewed ({{ reviewed.length }})</Tag>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>
      <div v-else-if="loading" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>

      <!-- Queue -->
      <template v-else-if="tab === 'queue'">
        <Card v-if="!pending.length"><EmptyState icon="check_circle" title="Nothing to review" sub="No clips are awaiting review." /></Card>
        <div v-for="g in queueByMarket" :key="g.market?.code || 'none'" :style="{ display: 'flex', flexDirection: 'column', gap: '10px' }">
          <SectionLabel>{{ g.market?.code }} <span :style="{ color: 'var(--text-3)', fontWeight: 400 }">· {{ g.market?.name }}</span></SectionLabel>
          <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--gap)' }">
            <Card v-for="c in g.clips" :key="c.id">
              <div @click="openReview(c)" :style="{ position: 'relative', aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', marginBottom: '12px', cursor: 'pointer' }">
                <img v-if="c.thumbnail_url" :src="c.thumbnail_url" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
                <Icon v-else name="film" :size="22" :style="{ color: 'var(--text-3)' }" />
                <div :style="{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.18)' }"><div :style="{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center' }"><Icon name="play" :size="20" :style="{ color: '#fff' }" /></div></div>
              </div>
              <div :style="{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="c.name">{{ c.name }}</div>
              <div v-if="metaLine(c)" :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '3px' }">{{ metaLine(c) }}</div>
              <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', margin: '8px 0' }">
                <Tag v-if="c.format" :clickable="false">{{ c.format }}</Tag>
                <Tag :clickable="false">{{ fmtSize(c.file_size) }}</Tag>
              </div>
              <div :style="{ fontSize: '11.5px', color: 'var(--text-3)' }">{{ fmtDate(c.created_at) }}{{ c.uploaded_by ? ' · ' + c.uploaded_by : '' }}</div>
              <Button full size="sm" icon="eye" :style="{ marginTop: '12px' }" @click="openReview(c)">Review</Button>
            </Card>
          </div>
        </div>
      </template>

      <!-- Reviewed (read-only history) -->
      <template v-else>
        <Card v-if="!reviewed.length"><EmptyState icon="inbox" title="No reviewed clips yet" sub="Approved and declined clips will appear here." /></Card>
        <Card v-else :pad="false" :style="{ overflow: 'hidden' }">
          <div v-for="(c, i) in reviewedSorted" :key="c.id" :style="{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderTop: i ? '1px solid var(--divider)' : 'none' }">
            <div @click="openReview(c)" :style="{ flex: '0 0 auto', width: '78px', height: '44px', borderRadius: '7px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer' }">
              <img v-if="c.thumbnail_url" :src="c.thumbnail_url" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
              <Icon v-else name="film" :size="16" :style="{ color: 'var(--text-3)' }" />
            </div>
            <div :style="{ flex: '1 1 auto', minWidth: 0 }">
              <div :style="{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="c.name">{{ c.name }}</div>
              <div :style="{ fontSize: '12px', color: 'var(--text-3)' }">{{ c.market?.code }} · {{ c.reviewer || '—' }} · {{ fmtDate(c.reviewed_at) }}</div>
              <div v-if="c.decline_reason" :style="{ fontSize: '12px', color: 'var(--danger)', marginTop: '2px' }">“{{ c.decline_reason }}”</div>
            </div>
            <StatusPill :status="c.review_status" />
            <Button size="sm" variant="ghost" icon="eye" @click="openReview(c)">View</Button>
          </div>
        </Card>
      </template>
    </div>

    <!-- Review modal: centered, video on the left, data + decision on the right. -->
    <div v-if="reviewing" @click="reviewing = null" :style="{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center', padding: '28px' }">
      <div @click.stop :style="{ width: 'min(1080px, 95vw)', maxHeight: '90vh', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-pop)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }">
        <!-- header -->
        <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '16px 20px', borderBottom: '1px solid var(--border)' }">
          <div :style="{ minWidth: 0 }">
            <div :style="{ fontSize: '16px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="reviewing.name">{{ reviewing.name }}</div>
            <div :style="{ fontSize: '12.5px', color: 'var(--text-3)' }">{{ reviewing.market?.code }} · {{ reviewing.market?.name }}</div>
          </div>
          <IconButton name="x" @click="reviewing = null" />
        </div>

        <!-- body: video left, data + inputs right -->
        <div :style="{ display: 'flex', gap: '20px', padding: '20px', overflowY: 'auto', flexWrap: 'wrap' }">
          <div :style="{ flex: '1 1 460px', minWidth: '300px' }">
            <video :src="reviewing.stream_url" controls autoplay preload="metadata" :poster="reviewing.thumbnail_url || undefined"
              :style="{ width: '100%', borderRadius: '12px', background: '#000', maxHeight: '72vh' }" />
          </div>

          <div :style="{ flex: '1 1 320px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '14px' }">
            <div>
              <SectionLabel>Details</SectionLabel>
              <div :style="{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: '13px' }">
                <span :style="{ color: 'var(--text-3)' }">Format</span><span>{{ reviewing.format || '—' }}</span>
                <span :style="{ color: 'var(--text-3)' }">Slate · Actor</span><span>{{ [reviewing.slate, reviewing.actor].filter(Boolean).join(' · ') || '—' }}</span>
                <span :style="{ color: 'var(--text-3)' }">Design · Lang</span><span>{{ [reviewing.design, reviewing.lang].filter(Boolean).join(' · ') || '—' }}</span>
                <template v-if="reviewing.copy"><span :style="{ color: 'var(--text-3)' }">Copy</span><span>{{ reviewing.copy }}</span></template>
                <span :style="{ color: 'var(--text-3)' }">Uploaded</span><span>{{ fmtDate(reviewing.created_at) }}{{ reviewing.uploaded_by ? ' · ' + reviewing.uploaded_by : '' }}</span>
                <span :style="{ color: 'var(--text-3)' }">Status</span><span>{{ reviewing.review_status }}{{ reviewing.reviewer ? ' · ' + reviewing.reviewer : '' }}{{ reviewing.reviewed_at ? ' · ' + fmtDate(reviewing.reviewed_at) : '' }}</span>
              </div>
            </div>

            <div v-if="reviewing.decline_reason" :style="{ padding: '10px 12px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: '10px', fontSize: '13px' }">
              Previous decline reason: {{ reviewing.decline_reason }}
            </div>

            <div v-if="declineMode">
              <SectionLabel>Reason for declining (required)</SectionLabel>
              <textarea v-model="declineReason" rows="4" placeholder="Why is this clip declined?"
                :style="{ width: '100%', padding: '10px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13.5px', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }" />
            </div>

            <div :style="{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '6px' }">
              <template v-if="!declineMode">
                <Button variant="danger" icon="x" :disabled="busy" @click="declineMode = true">Decline</Button>
                <Button full icon="check_circle" :disabled="busy" @click="approve(reviewing)">{{ busy ? 'Saving…' : 'Approve' }}</Button>
              </template>
              <template v-else>
                <Button variant="ghost" :disabled="busy" @click="declineMode = false">Cancel</Button>
                <Button full variant="danger" icon="x" :disabled="busy || !declineReason.trim()" @click="decline(reviewing)">{{ busy ? 'Saving…' : 'Confirm decline' }}</Button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="toast" :style="{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-pop)', fontSize: '14px', fontWeight: 600 }">
      <Icon name="check_circle" :size="18" :style="{ color: 'var(--accent)' }" /> {{ toast }}
    </div>
  </AppLayout>
</template>
