<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Tag from '../../Components/Tag.vue';
import Select from '../../Components/Select.vue';
import Input from '../../Components/Input.vue';
import IconButton from '../../Components/IconButton.vue';
import SectionLabel from '../../Components/SectionLabel.vue';
import StatusPill from '../../Components/StatusPill.vue';
import EmptyState from '../../Components/EmptyState.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';
import { legalState, setPendingCount, refreshPendingCount } from '../../lib/legalStore.js';
import { fmtSize, fmtDateTime as fmtDate } from '../../lib/format.js';

defineProps({ theme: { type: String, default: null }, density: { type: String, default: null } });

const tab = ref('pending'); // 'pending' | 'approved' | 'declined'
const groupByCreative = ref(false);
const loading = ref(false);
const error = ref('');
const toast = ref('');
const counts = reactive({ pending: 0, approved: 0, declined: 0 });

// review modal
const reviewing = ref(null);
const declineMode = ref(false);
const declineReason = ref('');
const busy = ref(false);

const blank = () => ({ market: '', format: '', category: '', language: '', brand: '', search: '', creative: '', batch: '', sort: 'walk', page: 1 });
const filters = reactive({ pending: blank(), approved: { ...blank(), sort: 'recent' }, declined: { ...blank(), sort: 'recent' } });
const result = reactive({
  pending: { data: [], total: 0, last_page: 1, options: {} },
  approved: { data: [], total: 0, last_page: 1, options: {} },
  declined: { data: [], total: 0, last_page: 1, options: {} },
});

const SKEY = 'legal_review_state_v2';
function persist() {
  try { sessionStorage.setItem(SKEY, JSON.stringify({ tab: tab.value, groupByCreative: groupByCreative.value, filters })); } catch { /* ignore */ }
}
function restore() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SKEY) || 'null');
    if (!s) return;
    if (['pending', 'approved', 'declined'].includes(s.tab)) tab.value = s.tab;
    groupByCreative.value = !!s.groupByCreative;
    for (const k of ['pending', 'approved', 'declined']) Object.assign(filters[k], s.filters?.[k] || {});
  } catch { /* ignore */ }
}

function queryFor(section) {
  const f = filters[section];
  const p = new URLSearchParams();
  p.set('status', section);
  for (const k of ['market', 'format', 'category', 'language', 'brand', 'search', 'creative', 'batch']) if (f[k]) p.set(k, f[k]);
  if (groupByCreative.value) p.set('group', '1');
  else if (section === 'pending') p.set('sort', f.sort);
  p.set('page', String(f.page));
  return p.toString();
}

async function load(section = tab.value) {
  loading.value = true;
  error.value = '';
  try {
    const r = await api.get('/api/legal/delivered-clips?' + queryFor(section));
    result[section].data = r.data || [];
    result[section].total = r.total || 0;
    result[section].last_page = r.last_page || 1;
    result[section].options = r.filters || {};
    if (r.counts) Object.assign(counts, r.counts);
    if (typeof r.pending_count === 'number') setPendingCount(r.pending_count);
  } catch (e) {
    error.value = e.message || 'Failed to load clips.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => { restore(); load(tab.value); refreshPendingCount(); });

function switchTab(t) { if (t === tab.value) return; tab.value = t; persist(); load(t); }
function setFilter(field, v) { const f = filters[tab.value]; f[field] = v; f.page = 1; persist(); load(tab.value); }
function toggleGroup() { groupByCreative.value = !groupByCreative.value; filters[tab.value].page = 1; persist(); load(tab.value); }
let searchTimer;
function onSearch(v) {
  filters[tab.value].search = v;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { filters[tab.value].page = 1; persist(); load(tab.value); }, 300);
}
function goPage(n) { filters[tab.value].page = n; persist(); load(tab.value); }
function resetFilters() { const keepSort = filters[tab.value].sort; Object.assign(filters[tab.value], blank(), { sort: keepSort }); persist(); load(tab.value); }

const metaLine = (c) => [c.category, c.slate, c.actor, c.design, c.lang].filter(Boolean).join(' · ');

const cur = computed(() => result[tab.value]);
const curFilters = computed(() => filters[tab.value]);
const hasActiveFilters = computed(() => {
  const f = filters[tab.value];
  return !!(f.market || f.format || f.category || f.language || f.brand || f.search || f.creative || f.batch);
});
const opt = (list, allLabel) => [{ value: '', label: allLabel }, ...(list || []).map((x) => ({ value: x, label: x }))];
const batchOpt = (list) => [{ value: '', label: 'All batches' }, ...(list || []).map((b) => ({ value: b.id, label: b.label }))];

// Contiguous grouping of the current page by creative_key (data arrives ordered).
function creativeGroups(data) {
  const out = [];
  let g = null;
  for (const c of data) {
    const k = c.creative_key || c.name;
    if (!g || g.key !== k) { g = { key: k, clips: [] }; out.push(g); }
    g.clips.push(c);
  }
  return out;
}
// Pending non-grouped: keep the market walk-through grouping.
const pendingMarketGroups = computed(() => {
  const out = [];
  let g = null;
  for (const c of result.pending.data) {
    const code = c.market?.code || '—';
    if (!g || g.code !== code) { g = { code, name: c.market?.name, clips: [] }; out.push(g); }
    g.clips.push(c);
  }
  return out;
});

function flash(msg) { toast.value = msg; setTimeout(() => { if (toast.value === msg) toast.value = ''; }, 3500); }
function openReview(c) { reviewing.value = c; declineMode.value = false; declineReason.value = ''; }

async function afterDecision(msg) {
  reviewing.value = null;
  flash(msg);
  await load(tab.value);
  await refreshPendingCount();
}
async function approve(c) {
  busy.value = true;
  try { await api.post(`/api/legal/delivered-clips/${c.id}/approve`, {}); await afterDecision('Approved.'); }
  catch (e) { flash(e.message || 'Approve failed.'); }
  finally { busy.value = false; }
}
async function decline(c) {
  const reason = declineReason.value.trim();
  if (!reason) { flash('A reason is required to decline.'); return; }
  busy.value = true;
  try { await api.post(`/api/legal/delivered-clips/${c.id}/decline`, { reason }); await afterDecision('Declined.'); }
  catch (e) { flash(e.message || 'Decline failed.'); }
  finally { busy.value = false; }
}

const sortOptions = [
  { value: 'walk', label: 'Walk-through' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'newest', label: 'Newest first' },
];
</script>

<template>
  <AppLayout active="review" workspace="legal" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div>
        <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Clip review</h1>
        <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">
          <template v-if="legalState.pendingCount">{{ legalState.pendingCount }} clip{{ legalState.pendingCount === 1 ? '' : 's' }} awaiting review.</template>
          <template v-else>Nothing awaiting review.</template>
          Only approved clips become downloadable.
        </p>
      </div>

      <!-- Tabs -->
      <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap' }">
        <Tag :active="tab === 'pending'" @click="switchTab('pending')">Pending queue ({{ counts.pending }})</Tag>
        <Tag :active="tab === 'approved'" @click="switchTab('approved')">Approved ({{ counts.approved }})</Tag>
        <Tag :active="tab === 'declined'" @click="switchTab('declined')">Declined ({{ counts.declined }})</Tag>
      </div>

      <!-- Filter bar -->
      <Card :style="{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }">
        <div :style="{ flex: '1 1 180px', minWidth: '150px' }"><Input :model-value="curFilters.search" placeholder="Search name…" icon="search" @update:model-value="onSearch" /></div>
        <div :style="{ width: '120px' }"><Select :model-value="curFilters.market" :options="opt(cur.options.markets, 'All markets')" @update:model-value="(v) => setFilter('market', v)" /></div>
        <div :style="{ width: '135px' }"><Select :model-value="curFilters.category" :options="opt(cur.options.categories, 'All categories')" @update:model-value="(v) => setFilter('category', v)" /></div>
        <div :style="{ width: '105px' }"><Select :model-value="curFilters.format" :options="opt(cur.options.formats, 'All formats')" @update:model-value="(v) => setFilter('format', v)" /></div>
        <div :style="{ width: '115px' }"><Select :model-value="curFilters.language" :options="opt(cur.options.languages, 'All langs')" @update:model-value="(v) => setFilter('language', v)" /></div>
        <div :style="{ width: '120px' }"><Select :model-value="curFilters.brand" :options="opt(cur.options.brands, 'All brands')" @update:model-value="(v) => setFilter('brand', v)" /></div>
        <div :style="{ width: '190px' }"><Select :model-value="curFilters.creative" :options="opt(cur.options.creatives, 'All creatives')" @update:model-value="(v) => setFilter('creative', v)" /></div>
        <div v-if="(cur.options.batches || []).length" :style="{ width: '160px' }"><Select :model-value="curFilters.batch" :options="batchOpt(cur.options.batches)" @update:model-value="(v) => setFilter('batch', v)" /></div>
        <div v-if="tab === 'pending' && !groupByCreative" :style="{ width: '140px' }"><Select :model-value="curFilters.sort" :options="sortOptions" @update:model-value="(v) => setFilter('sort', v)" /></div>
        <Tag :active="groupByCreative" @click="toggleGroup">Group by creative</Tag>
        <Button v-if="hasActiveFilters" size="sm" variant="ghost" icon="x" @click="resetFilters">Clear</Button>
      </Card>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>
      <div v-else-if="loading" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>

      <!-- ── PENDING (cards) ───────────────────────────────────── -->
      <template v-else-if="tab === 'pending'">
        <Card v-if="!cur.data.length"><EmptyState icon="check_circle" title="Nothing to review" :sub="hasActiveFilters ? 'No pending clips match these filters.' : 'No clips are awaiting review.'" /></Card>
        <template v-else>
          <!-- Grouped by creative -->
          <template v-if="groupByCreative">
            <div v-for="g in creativeGroups(cur.data)" :key="g.key" :style="{ display: 'flex', flexDirection: 'column', gap: '10px' }">
              <SectionLabel><span :style="{ fontFamily: 'var(--font-mono, ui-monospace, monospace)' }">{{ g.key }}</span></SectionLabel>
              <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--gap)' }">
                <Card v-for="c in g.clips" :key="c.id">
                  <div @click="openReview(c)" :style="{ position: 'relative', aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', marginBottom: '12px', cursor: 'pointer' }">
                    <img v-if="c.thumbnail_url" :src="c.thumbnail_url" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
                    <Icon v-else name="film" :size="22" :style="{ color: 'var(--text-3)' }" />
                    <div :style="{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.18)' }"><div :style="{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center' }"><Icon name="play" :size="20" :style="{ color: '#fff' }" /></div></div>
                  </div>
                  <div :style="{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="c.name">{{ c.format || c.name }}</div>
                  <div v-if="metaLine(c)" :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ metaLine(c) }}</div>
                  <Button full size="sm" icon="eye" :style="{ marginTop: '12px' }" @click="openReview(c)">Review</Button>
                </Card>
              </div>
            </div>
          </template>
          <!-- Grouped by market (walk-through) -->
          <template v-else>
            <div v-for="g in pendingMarketGroups" :key="g.code" :style="{ display: 'flex', flexDirection: 'column', gap: '10px' }">
              <SectionLabel>{{ g.code }} <span :style="{ color: 'var(--text-3)', fontWeight: 400 }">· {{ g.name }}</span></SectionLabel>
              <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--gap)' }">
                <Card v-for="c in g.clips" :key="c.id">
                  <div @click="openReview(c)" :style="{ position: 'relative', aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', marginBottom: '12px', cursor: 'pointer' }">
                    <img v-if="c.thumbnail_url" :src="c.thumbnail_url" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
                    <Icon v-else name="film" :size="22" :style="{ color: 'var(--text-3)' }" />
                    <div :style="{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.18)' }"><div :style="{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center' }"><Icon name="play" :size="20" :style="{ color: '#fff' }" /></div></div>
                  </div>
                  <div :style="{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="c.name">{{ c.name }}</div>
                  <div v-if="metaLine(c)" :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ metaLine(c) }}</div>
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
        </template>
      </template>

      <!-- ── APPROVED / DECLINED (rows) ────────────────────────── -->
      <template v-else>
        <Card v-if="!cur.data.length"><EmptyState icon="inbox" :title="tab === 'approved' ? 'No approved clips' : 'No declined clips'" :sub="hasActiveFilters ? 'No clips match these filters.' : 'Reviewed clips will appear here.'" /></Card>
        <template v-else-if="groupByCreative">
          <Card v-for="g in creativeGroups(cur.data)" :key="g.key" :pad="false" :style="{ overflow: 'hidden' }">
            <div :style="{ padding: '10px 14px', background: 'var(--surface-2)', fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-mono, ui-monospace, monospace)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="g.key">{{ g.key }}</div>
            <div v-for="c in g.clips" :key="c.id" :style="{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderTop: '1px solid var(--divider)' }">
              <div @click="openReview(c)" :style="{ flex: '0 0 auto', width: '78px', height: '44px', borderRadius: '7px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer' }">
                <img v-if="c.thumbnail_url" :src="c.thumbnail_url" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
                <Icon v-else name="film" :size="16" :style="{ color: 'var(--text-3)' }" />
              </div>
              <div :style="{ flex: '1 1 auto', minWidth: 0 }">
                <div :style="{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="c.name">{{ c.format || c.name }}</div>
                <div :style="{ fontSize: '12px', color: 'var(--text-3)' }">{{ c.market?.code }} · {{ c.reviewer || '—' }} · {{ fmtDate(c.reviewed_at) }}</div>
                <div v-if="c.decline_reason" :style="{ fontSize: '12px', color: 'var(--danger)', marginTop: '2px' }">“{{ c.decline_reason }}”</div>
              </div>
              <Button size="sm" variant="ghost" icon="eye" @click="openReview(c)">View</Button>
            </div>
          </Card>
        </template>
        <Card v-else :pad="false" :style="{ overflow: 'hidden' }">
          <div v-for="(c, i) in cur.data" :key="c.id" :style="{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderTop: i ? '1px solid var(--divider)' : 'none' }">
            <div @click="openReview(c)" :style="{ flex: '0 0 auto', width: '78px', height: '44px', borderRadius: '7px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer' }">
              <img v-if="c.thumbnail_url" :src="c.thumbnail_url" alt="" loading="lazy" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
              <Icon v-else name="film" :size="16" :style="{ color: 'var(--text-3)' }" />
            </div>
            <div :style="{ flex: '1 1 auto', minWidth: 0 }">
              <div :style="{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="c.name">{{ c.name }}</div>
              <div :style="{ fontSize: '12px', color: 'var(--text-3)' }">{{ c.market?.code }} · {{ c.reviewer || '—' }} · {{ fmtDate(c.reviewed_at) }}</div>
              <div v-if="c.decline_reason" :style="{ fontSize: '12.5px', color: 'var(--danger)', marginTop: '2px', fontWeight: 600 }">“{{ c.decline_reason }}”</div>
            </div>
            <StatusPill :status="c.review_status" />
            <Button size="sm" variant="ghost" icon="eye" @click="openReview(c)">View</Button>
          </div>
        </Card>
      </template>

      <!-- Pagination -->
      <div v-if="!loading && cur.last_page > 1" :style="{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }">
        <Button size="sm" variant="ghost" :disabled="curFilters.page <= 1" @click="goPage(curFilters.page - 1)">‹ Prev</Button>
        <span :style="{ fontSize: '13px', color: 'var(--text-2)' }">Page {{ curFilters.page }} / {{ cur.last_page }}</span>
        <Button size="sm" variant="ghost" :disabled="curFilters.page >= cur.last_page" @click="goPage(curFilters.page + 1)">Next ›</Button>
      </div>
    </div>

    <!-- Review modal -->
    <div v-if="reviewing" @click="reviewing = null" :style="{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center', padding: '28px' }">
      <div @click.stop :style="{ width: 'min(1080px, 95vw)', maxHeight: '90vh', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-pop)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }">
        <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '16px 20px', borderBottom: '1px solid var(--border)' }">
          <div :style="{ minWidth: 0 }">
            <div :style="{ fontSize: '16px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }" :title="reviewing.name">{{ reviewing.name }}</div>
            <div :style="{ fontSize: '12.5px', color: 'var(--text-3)' }">{{ reviewing.market?.code }} · {{ reviewing.market?.name }}</div>
          </div>
          <IconButton name="x" @click="reviewing = null" />
        </div>

        <div :style="{ display: 'flex', gap: '20px', padding: '20px', overflowY: 'auto', flexWrap: 'wrap' }">
          <div :style="{ flex: '1 1 460px', minWidth: '300px' }">
            <video :src="reviewing.stream_url" controls autoplay muted preload="metadata" @loadstart="$event.target.muted = true" :poster="reviewing.thumbnail_url || undefined"
              :style="{ width: '100%', borderRadius: '12px', background: '#000', maxHeight: '72vh' }" />
          </div>

          <div :style="{ flex: '1 1 320px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '14px' }">
            <div>
              <SectionLabel>Details</SectionLabel>
              <div :style="{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: '13px' }">
                <span :style="{ color: 'var(--text-3)' }">Format</span><span>{{ reviewing.format || '—' }}</span>
                <span :style="{ color: 'var(--text-3)' }">Category</span><span>{{ reviewing.category || '—' }}</span>
                <span :style="{ color: 'var(--text-3)' }">Slate · Actor</span><span>{{ [reviewing.slate, reviewing.actor].filter(Boolean).join(' · ') || '—' }}</span>
                <span :style="{ color: 'var(--text-3)' }">Design · Lang</span><span>{{ [reviewing.design, reviewing.lang].filter(Boolean).join(' · ') || '—' }}</span>
                <template v-if="reviewing.creative_key"><span :style="{ color: 'var(--text-3)' }">Creative</span><span :style="{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '12px' }">{{ reviewing.creative_key }}</span></template>
                <template v-if="reviewing.copy_full || reviewing.copy"><span :style="{ color: 'var(--text-3)' }">Copy</span><span>{{ reviewing.copy_full || reviewing.copy }}</span></template>
                <span :style="{ color: 'var(--text-3)' }">Ad title</span><span :style="{ color: reviewing.ad_title ? 'var(--text-1)' : 'var(--text-3)' }">{{ reviewing.ad_title || '— none provided —' }}</span>
                <span :style="{ color: 'var(--text-3)' }">Ad description</span><span :style="{ whiteSpace: 'pre-wrap', color: reviewing.ad_description ? 'var(--text-1)' : 'var(--text-3)' }">{{ reviewing.ad_description || '— none provided —' }}</span>
                <span :style="{ color: 'var(--text-3)' }">Uploaded</span><span>{{ fmtDate(reviewing.created_at) }}{{ reviewing.uploaded_by ? ' · ' + reviewing.uploaded_by : '' }}</span>
                <span :style="{ color: 'var(--text-3)' }">Status</span><span>{{ reviewing.review_status }}{{ reviewing.reviewer ? ' · ' + reviewing.reviewer : '' }}{{ reviewing.reviewed_at ? ' · ' + fmtDate(reviewing.reviewed_at) : '' }}</span>
              </div>
            </div>

            <div v-if="reviewing.decline_reason" :style="{ padding: '10px 12px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: '10px', fontSize: '13px' }">
              Decline reason: {{ reviewing.decline_reason }}
            </div>

            <div v-if="declineMode">
              <SectionLabel>Reason for declining (required)</SectionLabel>
              <textarea v-model="declineReason" rows="4" placeholder="Why is this clip declined?"
                :style="{ width: '100%', padding: '10px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13.5px', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }" />
            </div>

            <div :style="{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '6px' }">
              <template v-if="declineMode">
                <Button variant="ghost" :disabled="busy" @click="declineMode = false">Cancel</Button>
                <Button full variant="danger" icon="x" :disabled="busy || !declineReason.trim()" @click="decline(reviewing)">{{ busy ? 'Saving…' : (reviewing.review_status === 'declined' ? 'Save reason' : 'Confirm decline') }}</Button>
              </template>
              <template v-else>
                <!-- Decline only when not already declined; Edit reason for a declined clip. -->
                <Button v-if="reviewing.review_status !== 'declined'" variant="danger" icon="x" :disabled="busy" @click="declineMode = true; declineReason = ''">Decline</Button>
                <Button v-else variant="ghost" icon="edit" :disabled="busy" @click="declineMode = true; declineReason = reviewing.decline_reason || ''">Edit reason</Button>
                <!-- Approve unless it's already approved. -->
                <Button v-if="reviewing.review_status !== 'approved'" full icon="check_circle" :disabled="busy" @click="approve(reviewing)">{{ busy ? 'Saving…' : 'Approve' }}</Button>
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
