<script setup>
import { ref, computed, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Input from '../../Components/Input.vue';
import Field from '../../Components/Field.vue';
import Select from '../../Components/Select.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';

defineProps({
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

const markets = ref([]);
const sheetUrl = ref('');
const loading = ref(true);
const error = ref('');
const syncing = ref(false);
const savingUrl = ref(false);
const toast = ref('');

const nm = ref({ code: '', name: '', brand: 'Creditstar' });
const adding = ref(false);

const brandOptions = ['Creditstar', 'Monefit'];

function flash(msg) {
  toast.value = msg;
  setTimeout(() => { if (toast.value === msg) toast.value = ''; }, 3000);
}

async function loadMarkets() {
  const data = await api.get('/api/markets');
  markets.value = Array.isArray(data) ? data : [];
}

onMounted(async () => {
  try {
    const [cfg] = await Promise.all([api.get('/api/config'), loadMarkets()]);
    sheetUrl.value = cfg?.sheet_url || '';
  } catch (e) {
    error.value = e.message || 'Failed to load markets.';
  } finally {
    loading.value = false;
  }
});

async function saveUrl() {
  savingUrl.value = true;
  try {
    await api.post('/api/config', { sheet_url: sheetUrl.value.trim() });
    flash('Sheet URL saved.');
  } catch (e) {
    flash(e.message || 'Could not save URL.');
  } finally {
    savingUrl.value = false;
  }
}

async function syncAll() {
  syncing.value = true;
  try {
    const res = await api.post('/api/markets/sync-all');
    await loadMarkets();
    const synced = res?.synced ?? (Array.isArray(res?.markets) ? res.markets.length : 0);
    const issues = (res?.issues || []).length;
    flash(`Synced ${synced} market${synced === 1 ? '' : 's'}${issues ? ` · ${issues} issue${issues === 1 ? '' : 's'}` : ''}.`);
  } catch (e) {
    flash(e.message || 'Sync failed.');
  } finally {
    syncing.value = false;
  }
}

async function toggleActive(m) {
  try {
    await api.put('/api/markets/' + m.id + (m.active ? '/disable' : '/enable'));
    await loadMarkets();
  } catch (e) {
    flash(e.message || 'Could not change market state.');
  }
}

async function addMarket() {
  if (!nm.value.code.trim() || !nm.value.name.trim()) { flash('Code and name are required.'); return; }
  adding.value = true;
  try {
    await api.post('/api/markets', { code: nm.value.code.trim(), name: nm.value.name.trim(), brand: nm.value.brand });
    nm.value = { code: '', name: '', brand: 'Creditstar' };
    await loadMarkets();
    flash('Market created (inactive).');
  } catch (e) {
    flash(e.message || 'Could not create market.');
  } finally {
    adding.value = false;
  }
}

const openMarket = (m) => router.visit('/markets/' + encodeURIComponent(m.code));
const syncedAgo = (iso) => (iso ? new Date(iso).toLocaleString() : 'never');
</script>

<template>
  <AppLayout active="markets" workspace="admin" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div>
        <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Markets</h1>
        <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">One Google Sheet, one tab per market. Sync, then enable the copies a market should expose to growth leads.</p>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>

      <!-- Copy spreadsheet -->
      <Card>
        <div :style="{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }">Copy spreadsheet</div>
        <p :style="{ color: 'var(--text-2)', fontSize: '13.5px', margin: '0 0 14px' }">Tab name = market code. “Sync all” pulls every market’s tab.</p>
        <div :style="{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }">
          <div :style="{ flex: '1 1 320px', minWidth: '240px' }">
            <Input v-model="sheetUrl" placeholder="https://docs.google.com/spreadsheets/d/…" icon="spreadsheet" />
          </div>
          <Button variant="secondary" :disabled="savingUrl" @click="saveUrl">Save URL</Button>
          <Button icon="refresh" :disabled="syncing" @click="syncAll">{{ syncing ? 'Syncing…' : 'Sync all' }}</Button>
        </div>
      </Card>

      <!-- Markets list -->
      <Card :pad="false">
        <div :style="{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 1fr 1.1fr 0.9fr', gap: '14px', padding: '12px var(--pad-card)', fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }">
          <div>Market</div><div>Brand</div><div>Copies</div><div>Last synced</div><div :style="{ textAlign: 'right' }">State</div>
        </div>
        <div v-if="loading" :style="{ padding: '28px var(--pad-card)', color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>
        <div v-else-if="!markets.length" :style="{ padding: '28px var(--pad-card)', color: 'var(--text-3)', fontSize: '14px' }">No markets yet — set the sheet URL above and Sync all.</div>
        <div
          v-for="m in markets" :key="m.id"
          class="row-hover"
          :style="{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 1fr 1.1fr 0.9fr', gap: '14px', alignItems: 'center', padding: '13px var(--pad-card)', borderTop: '1px solid var(--divider)', cursor: 'pointer' }"
          @click="openMarket(m)"
        >
          <div>
            <div :style="{ fontSize: '14px', fontWeight: 700 }">{{ m.code }} <span :style="{ color: 'var(--text-3)', fontWeight: 400 }">· {{ m.name }}</span></div>
          </div>
          <div :style="{ fontSize: '13px', color: 'var(--text-2)' }">{{ m.brand }}</div>
          <div :style="{ fontSize: '13px', color: 'var(--text-2)' }">
            <span :style="{ color: m.enabled_count ? 'var(--accent)' : 'var(--text-3)', fontWeight: 600 }">{{ m.enabled_count }}</span> / {{ m.copy_count }} enabled
          </div>
          <div :style="{ fontSize: '12.5px', color: 'var(--text-3)' }">{{ syncedAgo(m.last_synced_at) }}</div>
          <div :style="{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }" @click.stop>
            <span :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: m.active ? 'var(--success)' : 'var(--text-3)' }">
              <span :style="{ width: '7px', height: '7px', borderRadius: '999px', background: 'currentColor' }" />{{ m.active ? 'Active' : 'Inactive' }}
            </span>
            <Button size="sm" :variant="m.active ? 'soft' : 'primary'" :disabled="!m.active && !m.can_enable" @click="toggleActive(m)">
              {{ m.active ? 'Disable' : 'Enable' }}
            </Button>
          </div>
        </div>
      </Card>

      <!-- Add market -->
      <Card>
        <div :style="{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }">Add a market</div>
        <p :style="{ color: 'var(--text-2)', fontSize: '13.5px', margin: '0 0 14px' }">Created inactive. Code is the sheet tab name (e.g. <span class="mono">NO</span>).</p>
        <div :style="{ display: 'grid', gridTemplateColumns: '160px 1fr 180px auto', gap: '12px', alignItems: 'end' }">
          <Field label="Code"><Input v-model="nm.code" placeholder="NO" /></Field>
          <Field label="Name"><Input v-model="nm.name" placeholder="Norway" /></Field>
          <Field label="Brand"><Select v-model="nm.brand" :options="brandOptions" /></Field>
          <Button icon="plus" :disabled="adding" @click="addMarket">Add</Button>
        </div>
      </Card>
    </div>

    <div v-if="toast" :style="{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-pop)', fontSize: '14px', fontWeight: 600 }">
      <Icon name="check_circle" :size="18" :style="{ color: 'var(--accent)' }" /> {{ toast }}
    </div>
  </AppLayout>
</template>
