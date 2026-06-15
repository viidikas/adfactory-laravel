<script setup>
import { ref, computed, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Input from '../../Components/Input.vue';
import Tag from '../../Components/Tag.vue';
import SectionLabel from '../../Components/SectionLabel.vue';
import EmptyState from '../../Components/EmptyState.vue';
import Icon from '../../Components/Icon.vue';
import { PREVIEW_ALL_COLS, DEFAULT_VISIBLE_COLS, rowsToCsv } from '../../lib/templater.js';
import { loadRows, loadVisibleCols, saveVisibleCols } from '../../lib/genStore.js';

defineProps({ theme: { type: String, default: null }, density: { type: String, default: null } });

const rows = ref([]);
const visibleKeys = ref([...DEFAULT_VISIBLE_COLS]);
const q = ref('');
const page = ref(1);
const showCols = ref(false);
const toast = ref('');
const PAGE_SIZE = 50;

function flash(msg) { toast.value = msg; setTimeout(() => { if (toast.value === msg) toast.value = ''; }, 3000); }

onMounted(() => {
  rows.value = loadRows();
  const saved = loadVisibleCols();
  if (saved?.length) visibleKeys.value = saved;
});

const cols = computed(() => PREVIEW_ALL_COLS.filter((c) => visibleKeys.value.includes(c.key)));
const filtered = computed(() => {
  if (!q.value) return rows.value;
  const s = q.value.toLowerCase();
  return rows.value.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(s)));
});
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)));
const pageRows = computed(() => {
  const p = Math.min(page.value, pages.value);
  return filtered.value.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
});

function toggleCol(key) {
  if (visibleKeys.value.includes(key)) {
    visibleKeys.value = visibleKeys.value.filter((k) => k !== key);
  } else {
    const order = PREVIEW_ALL_COLS.map((c) => c.key);
    visibleKeys.value = order.filter((k) => visibleKeys.value.includes(k) || k === key);
  }
  saveVisibleCols(visibleKeys.value);
}

function exportCsv() {
  const data = filtered.value.length ? filtered.value : rows.value;
  if (!data.length) { flash('Nothing to export.'); return; }
  const csv = rowsToCsv(data, visibleKeys.value);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `adfactory_preview_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  flash(`Downloaded ${data.length} rows (${visibleKeys.value.length} cols).`);
}
async function exportGSheets() {
  const data = filtered.value.length ? filtered.value : rows.value;
  if (!data.length) { flash('Nothing to export.'); return; }
  const csv = rowsToCsv(data, visibleKeys.value);
  try { await navigator.clipboard.writeText(csv); window.open('https://sheets.new', '_blank'); flash('CSV copied — paste into A1 (⌘V).'); }
  catch { exportCsv(); }
}

const MONO = new Set(['target', 'aef_output_name', 'filename', 'output', 'ae_output_path', 'aef_footage']);
</script>

<template>
  <AppLayout active="preview" workspace="admin" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }">
        <div>
          <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Preview &amp; export</h1>
          <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">{{ rows.length }} generated rows · the exact rows the Templater consumes.</p>
        </div>
        <div :style="{ display: 'flex', gap: '10px' }">
          <Button variant="secondary" icon="sliders" @click="showCols = !showCols">Columns</Button>
          <Button variant="secondary" icon="download" :disabled="!rows.length" @click="exportCsv">CSV</Button>
          <Button icon="external" :disabled="!rows.length" @click="exportGSheets">Sheets</Button>
        </div>
      </div>

      <Card v-if="!rows.length">
        <EmptyState icon="zap" title="Nothing generated yet" sub="Build the sheet on the Generate screen first.">
          <template #action><Button icon="zap" @click="router.visit('/generate')">Go to Generate</Button></template>
        </EmptyState>
      </Card>

      <template v-else>
        <Card v-if="showCols">
          <SectionLabel>Visible columns</SectionLabel>
          <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }">
            <Tag v-for="c in PREVIEW_ALL_COLS" :key="c.key" :active="visibleKeys.includes(c.key)" @click="toggleCol(c.key)">{{ c.label }}</Tag>
          </div>
        </Card>

        <div :style="{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }">
          <div :style="{ flex: '1 1 280px', minWidth: '220px' }"><Input v-model="q" placeholder="Search rows…" icon="search" /></div>
          <span :style="{ fontSize: '13px', color: 'var(--text-3)' }">{{ filtered.length }} / {{ rows.length }} rows</span>
        </div>

        <Card :pad="false" :style="{ overflow: 'hidden' }">
          <div :style="{ overflowX: 'auto' }">
            <table :style="{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }">
              <thead>
                <tr :style="{ textAlign: 'left', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }">
                  <th v-for="c in cols" :key="c.key" :style="{ padding: '9px 12px', background: 'var(--surface-2)', whiteSpace: 'nowrap' }">{{ c.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in pageRows" :key="r.line_nr" class="row-hover" :style="{ borderTop: '1px solid var(--divider)' }">
                  <td v-for="c in cols" :key="c.key"
                    :class="{ mono: MONO.has(c.key) }"
                    :style="{ padding: '8px 12px', color: c.key === 'headline' ? 'var(--text-1)' : 'var(--text-2)', whiteSpace: 'nowrap', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis' }"
                    :title="String(r[c.key] ?? '')">{{ r[c.key] ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <div v-if="pages > 1" :style="{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }">
          <Button size="sm" variant="ghost" :disabled="page <= 1" @click="page--">‹ Prev</Button>
          <span :style="{ fontSize: '13px', color: 'var(--text-2)' }">Page {{ Math.min(page, pages) }} / {{ pages }}</span>
          <Button size="sm" variant="ghost" :disabled="page >= pages" @click="page++">Next ›</Button>
        </div>
      </template>
    </div>

    <div v-if="toast" :style="{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-pop)', fontSize: '14px', fontWeight: 600 }">
      <Icon name="check_circle" :size="18" :style="{ color: 'var(--accent)' }" /> {{ toast }}
    </div>
  </AppLayout>
</template>
