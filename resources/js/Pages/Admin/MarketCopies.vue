<script setup>
import { ref, computed, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Tag from '../../Components/Tag.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';

const props = defineProps({
  code: { type: String, required: true },
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

const detail = ref(null);
const loading = ref(true);
const error = ref('');
const busy = ref(false);
const syncing = ref(false);
const filter = ref('all'); // all | enabled | disabled
const toast = ref('');

function flash(msg) {
  toast.value = msg;
  setTimeout(() => { if (toast.value === msg) toast.value = ''; }, 3000);
}

async function resolveAndLoad() {
  const markets = await api.get('/api/markets');
  const m = (markets || []).find((x) => String(x.code).toLowerCase() === String(props.code).toLowerCase());
  if (!m) throw new Error(`Market "${props.code}" not found.`);
  detail.value = await api.get('/api/markets/' + m.id + '/copies');
}

onMounted(async () => {
  try {
    await resolveAndLoad();
  } catch (e) {
    error.value = e.message || 'Failed to load market.';
  } finally {
    loading.value = false;
  }
});

const langs = computed(() => detail.value?.languages || []);
const visible = computed(() => {
  const copies = detail.value?.copies || [];
  if (filter.value === 'enabled') return copies.filter((c) => c.enabled);
  if (filter.value === 'disabled') return copies.filter((c) => !c.enabled);
  return copies;
});

async function toggleCopy(c) {
  busy.value = true;
  try {
    detail.value = await api.put(`/api/markets/${detail.value.id}/copies/${c.id}`, { enabled: !c.enabled });
  } catch (e) {
    flash(e.message || 'Could not update copy.');
  } finally {
    busy.value = false;
  }
}

async function toggleMarket() {
  busy.value = true;
  try {
    await api.put('/api/markets/' + detail.value.id + (detail.value.active ? '/disable' : '/enable'));
    await resolveAndLoad();
  } catch (e) {
    flash(e.message || 'Could not change market state.');
  } finally {
    busy.value = false;
  }
}

async function syncThis() {
  syncing.value = true;
  try {
    const res = await api.post('/api/markets/' + detail.value.id + '/sync');
    await resolveAndLoad();
    const issues = (res?.issues || []).length;
    flash(`Synced ${res?.copy_count ?? detail.value.copy_count} copies${issues ? ` · ${issues} issue${issues === 1 ? '' : 's'}` : ''}.`);
  } catch (e) {
    flash(e.message || 'Sync failed.');
  } finally {
    syncing.value = false;
  }
}

const upper = (l) => String(l).toUpperCase();
const thBase = { textAlign: 'left', fontWeight: 700, padding: '11px 14px', whiteSpace: 'nowrap', background: 'var(--surface-2)', fontSize: '12px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const tdBase = { padding: '11px 14px', verticalAlign: 'top', fontSize: '13px' };
</script>

<template>
  <AppLayout active="markets" workspace="admin" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <button @click="router.visit('/markets')" :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '13.5px', fontFamily: 'inherit', alignSelf: 'flex-start' }">
        <Icon name="arrowleft" :size="16" /> All markets
      </button>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>
      <div v-else-if="loading" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>

      <template v-else-if="detail">
        <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }">
          <div>
            <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">{{ detail.code }} · {{ detail.name }}</h1>
            <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">
              {{ detail.brand }} ·
              <span :style="{ color: detail.enabled_count ? 'var(--accent)' : 'var(--text-3)', fontWeight: 600 }">{{ detail.enabled_count }}</span> / {{ detail.copy_count }} copies enabled
            </p>
          </div>
          <div :style="{ display: 'flex', gap: '10px', alignItems: 'center' }">
            <Button variant="secondary" icon="refresh" :disabled="syncing" @click="syncThis">{{ syncing ? 'Syncing…' : 'Sync this market' }}</Button>
            <Button :variant="detail.active ? 'soft' : 'primary'" :disabled="busy || (!detail.active && !detail.can_enable)" @click="toggleMarket">
              {{ detail.active ? 'Disable market' : 'Enable market' }}
            </Button>
          </div>
        </div>

        <div :style="{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }">
          <Tag v-for="f in ['all', 'enabled', 'disabled']" :key="f" :active="filter === f" @click="filter = f">
            {{ f === 'all' ? 'All copies' : f.charAt(0).toUpperCase() + f.slice(1) }}
          </Tag>
          <span :style="{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: detail.active ? 'var(--success)' : 'var(--text-3)' }">
            <span :style="{ width: '7px', height: '7px', borderRadius: '999px', background: 'currentColor' }" />{{ detail.active ? 'Active' : 'Inactive' }}
          </span>
        </div>

        <Card :pad="false" :style="{ overflow: 'hidden' }">
          <div :style="{ overflowX: 'auto' }">
            <table :style="{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }">
              <thead>
                <tr>
                  <th :style="{ ...thBase, width: '52px', textAlign: 'center', position: 'sticky', left: 0, zIndex: 3 }">On</th>
                  <th :style="{ ...thBase, position: 'sticky', left: '52px', zIndex: 3 }">Copy</th>
                  <th :style="thBase">Category</th>
                  <th :style="thBase">Shot</th>
                  <th v-for="l in langs" :key="l" :style="thBase">{{ upper(l) }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!visible.length"><td :colspan="4 + langs.length" :style="{ ...tdBase, color: 'var(--text-3)', padding: '24px 14px' }">No copies in this view.</td></tr>
                <tr v-for="c in visible" :key="c.id" :style="{ borderTop: '1px solid var(--divider)' }" :class="{ 'row-hover': true }">
                  <td :style="{ ...tdBase, textAlign: 'center', position: 'sticky', left: 0, background: 'var(--surface-2)', borderRight: '1px solid var(--divider)' }">
                    <input type="checkbox" :checked="c.enabled" :disabled="busy" @change="toggleCopy(c)"
                      :style="{ width: '17px', height: '17px', accentColor: 'var(--accent)', cursor: 'pointer' }" />
                  </td>
                  <td :style="{ ...tdBase, position: 'sticky', left: '52px', background: 'var(--surface-2)', borderRight: '1px solid var(--divider)' }">
                    <div :style="{ fontWeight: 600 }">{{ c.copy_key }}</div>
                    <div v-if="c.enabled && c.enabled_by" :style="{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }">by {{ c.enabled_by }}</div>
                  </td>
                  <td :style="{ ...tdBase, color: 'var(--text-2)', whiteSpace: 'nowrap' }">{{ c.category || '—' }}</td>
                  <td :style="{ ...tdBase, color: 'var(--text-2)' }" class="mono">{{ c.shot || '—' }}</td>
                  <td v-for="l in langs" :key="l" :style="{ ...tdBase, color: 'var(--text-1)', maxWidth: '280px' }">{{ (c.copy_text || {})[l] || '' }}</td>
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
