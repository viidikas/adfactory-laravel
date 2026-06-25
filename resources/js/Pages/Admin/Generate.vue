<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Tag from '../../Components/Tag.vue';
import SectionLabel from '../../Components/SectionLabel.vue';
import EmptyState from '../../Components/EmptyState.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';
import {
  buildTemplaterState, buildRows, estimateRows, rowsToCsv, slatesByCategory,
  ALL_CATEGORIES, ALL_LANGS, defaultFilters, DEFAULT_VISIBLE_COLS,
} from '../../lib/templater.js';
import { saveRows, saveFilters, saveVisibleCols } from '../../lib/genStore.js';

defineProps({ theme: { type: String, default: null }, density: { type: String, default: null } });

const markets = ref([]);          // active markets only — what you can generate from
const selectedMarketId = ref(null);
const config = ref({});
const clips = ref([]);            // clips with copy scoped to the selected market
const tstate = ref(null);
const loading = ref(true);
const switching = ref(false);
const error = ref('');
const toast = ref('');
const building = ref(false);
const rows = ref([]);

const filters = reactive(defaultFilters());

function flash(msg) { toast.value = msg; setTimeout(() => { if (toast.value === msg) toast.value = ''; }, 3000); }

const selectedMarket = computed(() => markets.value.find((m) => m.id === selectedMarketId.value) || null);

onMounted(async () => {
  try {
    const [m, cfg] = await Promise.all([api.get('/api/markets'), api.get('/api/config')]);
    markets.value = (Array.isArray(m) ? m : []).filter((x) => x.active);
    config.value = cfg || {};
    if (markets.value.length) await selectMarket(markets.value[0].id);
  } catch (e) {
    error.value = e.message || 'Failed to load.';
  } finally {
    loading.value = false;
  }
});

// The languages this market actually carries copy for (non-empty across its copy).
const marketLangs = computed(() => {
  const present = new Set();
  for (const c of clips.value) {
    for (const row of (c.copy || [])) {
      for (const l of ALL_LANGS) {
        if (String(row[l.toLowerCase()] || '').trim()) present.add(l);
      }
    }
  }
  const langs = ALL_LANGS.filter((l) => present.has(l));
  return langs.length ? langs : ['EN'];
});

async function selectMarket(id) {
  if (switching.value) return;
  switching.value = true;
  rows.value = [];
  try {
    selectedMarketId.value = id;
    const c = await api.get('/api/clips?market_id=' + id);
    clips.value = Array.isArray(c) ? c : [];
    tstate.value = buildTemplaterState(config.value, clips.value);
    // Default: everything selected so a build yields rows; user narrows down.
    filters.design = tstate.value.designs.map((d) => d.key);
    filters.fmt = tstate.value.formats.map((f) => f.key);
    // Brand + languages are determined by the market.
    filters.brand = selectedMarket.value ? [selectedMarket.value.brand] : [];
    filters.lang = [...marketLangs.value];
  } catch (e) {
    flash(e.message || 'Failed to load market.');
  } finally {
    switching.value = false;
  }
}

const designKeys = computed(() => tstate.value?.designs.map((d) => d.key) || []);
const formatKeys = computed(() => tstate.value?.formats.map((f) => f.key) || []);
const slateList = computed(() => {
  if (!clips.value.length) return [];
  const byCat = slatesByCategory(clips.value);
  return Object.keys(byCat).filter((s) => filters.cat.includes(byCat[s])).sort();
});

function toggle(arr, val) {
  const i = filters[arr].indexOf(val);
  if (i === -1) filters[arr].push(val); else filters[arr].splice(i, 1);
}
const isOn = (arr, val) => filters[arr].includes(val);

const estimate = computed(() => (tstate.value ? estimateRows(clips.value, filters, tstate.value) : { clips: 0, fmtCount: 0, total: 0 }));

function build() {
  if (!tstate.value || !selectedMarket.value) return;
  building.value = true;
  try {
    rows.value = buildRows({ clips: clips.value, filters: JSON.parse(JSON.stringify(filters)), tstate: tstate.value });
    saveRows(rows.value);
    saveFilters(JSON.parse(JSON.stringify(filters)));
    saveVisibleCols(DEFAULT_VISIBLE_COLS);
    flash(`Generated ${rows.value.length} rows for ${selectedMarket.value.code}.`);
  } catch (e) {
    flash(e.message || 'Generation failed.');
  } finally {
    building.value = false;
  }
}

function exportCsv() {
  if (!rows.value.length) { flash('Build the sheet first.'); return; }
  const csv = rowsToCsv(rows.value, DEFAULT_VISIBLE_COLS);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `adfactory_${selectedMarket.value?.code || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  flash(`Downloaded ${rows.value.length} rows.`);
}
async function exportGSheets() {
  if (!rows.value.length) { flash('Build the sheet first.'); return; }
  const csv = rowsToCsv(rows.value, DEFAULT_VISIBLE_COLS);
  try {
    await navigator.clipboard.writeText(csv);
    window.open('https://sheets.new', '_blank');
    flash('CSV copied — paste into A1 of the new sheet (⌘V).');
  } catch {
    exportCsv();
  }
}

const previewRows = computed(() => rows.value.slice(0, 50));
</script>

<template>
  <AppLayout active="generate" workspace="admin" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }">
        <div>
          <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Generate</h1>
          <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">Build the Templater CSV for a market — clips × designs × formats × languages, only where that market has approved copy.</p>
        </div>
        <Button variant="ghost" icon-right="arrowright" :disabled="!rows.length" @click="router.visit('/preview')">Full preview & export</Button>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>
      <div v-else-if="loading" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>
      <Card v-else-if="!markets.length"><EmptyState icon="globe" title="No active markets" sub="Enable a market in the Markets tab to generate from it." /></Card>

      <template v-else>
        <Card>
          <div :style="{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }">
            <div>
              <SectionLabel>Market</SectionLabel>
              <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }">
                <Tag v-for="m in markets" :key="m.id" :active="selectedMarketId === m.id" @click="selectMarket(m.id)">{{ m.code }} · {{ m.name }}</Tag>
              </div>
              <div :style="{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }">
                <template v-if="selectedMarket">Brand <span :style="{ color: 'var(--text-2)', fontWeight: 600 }">{{ selectedMarket.brand }}</span> · copy from this market only.</template>
                <template v-else>Pick a market to generate from.</template>
              </div>

              <SectionLabel>Language</SectionLabel>
              <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }">
                <Tag v-for="l in marketLangs" :key="l" :active="isOn('lang', l)" @click="toggle('lang', l)">{{ l }}</Tag>
              </div>
              <SectionLabel>Design</SectionLabel>
              <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }">
                <Tag v-for="d in designKeys" :key="d" :active="isOn('design', d)" @click="toggle('design', d)">{{ d }}</Tag>
              </div>
              <SectionLabel>Format</SectionLabel>
              <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap' }">
                <Tag v-for="ft in formatKeys" :key="ft" :active="isOn('fmt', ft)" @click="toggle('fmt', ft)">{{ ft }}</Tag>
              </div>
            </div>
            <div>
              <SectionLabel>Category</SectionLabel>
              <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }">
                <Tag v-for="c in ALL_CATEGORIES" :key="c" :active="isOn('cat', c)" @click="toggle('cat', c)">{{ c }}</Tag>
              </div>
              <SectionLabel>
                Slates
                <template #right>
                  <span :style="{ display: 'flex', gap: '6px' }">
                    <button @click="filters.slate = [...slateList]" :style="{ background: 'none', border: 'none', color: 'var(--link)', cursor: 'pointer', fontSize: '11.5px', fontFamily: 'inherit' }">All</button>
                    <button @click="filters.slate = []" :style="{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '11.5px', fontFamily: 'inherit' }">None</button>
                  </span>
                </template>
              </SectionLabel>
              <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '180px', overflowY: 'auto' }">
                <span v-if="!slateList.length" :style="{ fontSize: '13px', color: 'var(--text-3)' }">No slates in the selected categories.</span>
                <Tag v-for="s in slateList" :key="s" :active="isOn('slate', s)" @click="toggle('slate', s)">{{ s }}</Tag>
              </div>
              <div :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px' }">Leave slates empty to include all in the chosen categories.</div>
            </div>
          </div>
        </Card>

        <Card>
          <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }">
            <div :style="{ fontSize: '14px', color: 'var(--text-2)' }">
              <span :style="{ color: 'var(--accent)', fontWeight: 700 }">{{ selectedMarket?.code || '—' }}</span> ·
              <span :style="{ color: 'var(--text-1)', fontWeight: 700 }">{{ estimate.clips }}</span> clips ×
              <span :style="{ color: 'var(--text-1)', fontWeight: 700 }">{{ estimate.fmtCount }}</span> variants ×
              <span :style="{ color: 'var(--text-1)', fontWeight: 700 }">{{ filters.lang.length }}</span> lang ≈
              <span :style="{ color: 'var(--accent)', fontWeight: 800 }">{{ estimate.total }}</span> rows
            </div>
            <div :style="{ display: 'flex', gap: '10px' }">
              <Button icon="zap" :disabled="building || switching || !selectedMarket" @click="build">{{ building ? 'Building…' : 'Generate' }}</Button>
              <Button variant="secondary" icon="download" :disabled="!rows.length" @click="exportCsv">CSV</Button>
              <Button variant="secondary" icon="external" :disabled="!rows.length" @click="exportGSheets">Sheets</Button>
            </div>
          </div>
        </Card>

        <Card v-if="rows.length" :pad="false" :style="{ overflow: 'hidden' }">
          <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px var(--pad-card)' }">
            <div :style="{ fontSize: '14px', fontWeight: 700 }">Preview <span :style="{ color: 'var(--text-3)', fontWeight: 400 }">· first {{ previewRows.length }} of {{ rows.length }}</span></div>
            <button @click="router.visit('/preview')" :style="{ background: 'none', border: 'none', color: 'var(--link)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }">Full table →</button>
          </div>
          <div :style="{ overflowX: 'auto' }">
            <table :style="{ width: '100%', borderCollapse: 'collapse', minWidth: '900px', fontSize: '12px' }">
              <thead>
                <tr :style="{ textAlign: 'left', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }">
                  <th :style="{ padding: '8px 12px', background: 'var(--surface-2)' }">Target</th>
                  <th :style="{ padding: '8px 12px', background: 'var(--surface-2)' }">Footage</th>
                  <th :style="{ padding: '8px 12px', background: 'var(--surface-2)' }">D/F</th>
                  <th :style="{ padding: '8px 12px', background: 'var(--surface-2)' }">Lang</th>
                  <th :style="{ padding: '8px 12px', background: 'var(--surface-2)' }">Copy</th>
                  <th :style="{ padding: '8px 12px', background: 'var(--surface-2)' }">Filename</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in previewRows" :key="r.line_nr" :style="{ borderTop: '1px solid var(--divider)' }">
                  <td class="mono" :style="{ padding: '8px 12px', color: 'var(--text-2)' }">{{ r.target }}</td>
                  <td class="mono" :style="{ padding: '8px 12px', color: 'var(--link)' }">{{ r.aef_footage }}</td>
                  <td :style="{ padding: '8px 12px', color: 'var(--text-3)' }">{{ r.design }}/{{ r.format }}</td>
                  <td :style="{ padding: '8px 12px', color: 'var(--text-2)' }">{{ r.lang }}</td>
                  <td :style="{ padding: '8px 12px', color: 'var(--text-1)' }">{{ r.headline }}</td>
                  <td class="mono" :style="{ padding: '8px 12px', color: 'var(--text-3)' }">{{ r.filename }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </template>
    </div>

    <div v-if="toast" :style="{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-pop)', fontSize: '14px', fontWeight: 600 }">
      <Icon name="check_circle" :size="18" :style="{ color: 'var(--accent)' }" /> {{ toast }}
    </div>
  </AppLayout>
</template>
